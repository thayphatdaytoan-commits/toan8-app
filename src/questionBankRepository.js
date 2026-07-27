import { formatSgkChapterHeading, getSgkChapters, sortCatalogEntries } from './sgkToc';
import { EXAM_TYPE } from './quizExamTypes';

export const BANK_SECTION_GIFTED = 'gifted';
export const BANK_FILTER_GIFTED = '_gifted';
export const BANK_TOPIC_NONE = '_none';

export function getBankQuestionSection(q) {
  if (String(q?.bank_section || '').trim() === BANK_SECTION_GIFTED) return BANK_SECTION_GIFTED;
  if (String(q?.source_exam_type || '').trim() === EXAM_TYPE.gifted) return BANK_SECTION_GIFTED;
  return 'chapter';
}

export function getBankQuestionTopicKey(q) {
  const tags = q?.topic_tags || [];
  const t = String(tags[0] || '').trim();
  return t || BANK_TOPIC_NONE;
}

export function getBankQuestionTopicLabel(q) {
  const key = getBankQuestionTopicKey(q);
  return key === BANK_TOPIC_NONE ? 'Chưa phân dạng toán' : key;
}

function sortQuestions(list) {
  return [...(list || [])].sort((a, b) => {
    const ta = (a?.question || '').localeCompare(b?.question || '', 'vi');
    if (ta !== 0) return ta;
    return (b?.updated_at || 0) - (a?.updated_at || 0);
  });
}

function buildTopicFolders(questions) {
  const byTopic = new Map();
  (questions || []).forEach((q) => {
    const topic = getBankQuestionTopicKey(q);
    if (!byTopic.has(topic)) byTopic.set(topic, []);
    byTopic.get(topic).push(q);
  });

  const folders = Array.from(byTopic.entries())
    .map(([topic, qs]) => ({
      topic,
      label: topic === BANK_TOPIC_NONE ? 'Chưa phân dạng toán' : topic,
      questions: sortQuestions(qs),
    }))
    .filter((f) => f.questions.length > 0);

  folders.sort((a, b) => {
    if (a.topic === BANK_TOPIC_NONE) return 1;
    if (b.topic === BANK_TOPIC_NONE) return -1;
    return a.label.localeCompare(b.label, 'vi');
  });

  return folders;
}

function resolveRepoGrade(activeGrade, fallback = '11') {
  if (activeGrade && activeGrade !== 'ALL') return String(activeGrade);
  return fallback;
}

/**
 * Cây Ngân hàng câu hỏi: Chương SGK → Dạng toán → Câu hỏi (+ thư mục HSG).
 */
export function buildAdminQuestionBankTree(questions, { activeGrade } = {}) {
  const list = Array.isArray(questions) ? questions : [];
  const giftedQs = [];
  const byChapter = new Map();

  list.forEach((q) => {
    if (getBankQuestionSection(q) === BANK_SECTION_GIFTED) {
      giftedQs.push(q);
      return;
    }
    const ch = String(q?.chapter ?? '').trim() || BANK_TOPIC_NONE;
    if (!byChapter.has(ch)) byChapter.set(ch, []);
    byChapter.get(ch).push(q);
  });

  const gradeForSgk = resolveRepoGrade(activeGrade, list[0]?.grade_level || '11');
  const chapterMap = new Map();

  if (activeGrade && activeGrade !== 'ALL') {
    getSgkChapters(gradeForSgk).forEach((ch) => {
      const qs = byChapter.get(ch.no) || [];
      if (qs.length === 0) return;
      chapterMap.set(ch.no, {
        no: ch.no,
        label: formatSgkChapterHeading(gradeForSgk, ch.no),
        topicFolders: buildTopicFolders(qs),
        totalQuestions: qs.length,
      });
    });
    byChapter.forEach((qs, chKey) => {
      if (chKey === BANK_TOPIC_NONE || qs.length === 0) return;
      if (!chapterMap.has(chKey)) {
        chapterMap.set(chKey, {
          no: chKey,
          label: formatSgkChapterHeading(gradeForSgk, chKey),
          topicFolders: buildTopicFolders(qs),
          totalQuestions: qs.length,
        });
      }
    });
  } else {
    const gradeSet = new Set(list.map((q) => String(q?.grade_level || '8')));
    gradeSet.forEach((gl) => {
      getSgkChapters(gl).forEach((ch) => {
        const key = `${gl}::${ch.no}`;
        const qs = (byChapter.get(ch.no) || []).filter((q) => String(q?.grade_level || '8') === gl);
        if (qs.length > 0) {
          chapterMap.set(key, {
            no: key,
            label: `Toán ${gl} · ${formatSgkChapterHeading(gl, ch.no)}`,
            topicFolders: buildTopicFolders(qs),
            totalQuestions: qs.length,
          });
        }
      });
    });
    byChapter.forEach((qs, chKey) => {
      if (chKey === BANK_TOPIC_NONE) return;
      const byGrade = new Map();
      qs.forEach((q) => {
        const gl = String(q?.grade_level || '8');
        if (!byGrade.has(gl)) byGrade.set(gl, []);
        byGrade.get(gl).push(q);
      });
      byGrade.forEach((items, gl) => {
        const key = `${gl}::${chKey}`;
        if (items.length === 0 || chapterMap.has(key)) return;
        chapterMap.set(key, {
          no: key,
          label: `Toán ${gl} · ${formatSgkChapterHeading(gl, chKey)}`,
          topicFolders: buildTopicFolders(items),
          totalQuestions: items.length,
        });
      });
    });
  }

  const unassigned = buildTopicFolders(byChapter.get(BANK_TOPIC_NONE) || []);
  const chapters = sortCatalogEntries(Array.from(chapterMap.values()), 'no');

  return {
    chapters,
    giftedFolder: {
      id: BANK_SECTION_GIFTED,
      label: 'HỌC SINH GIỎI',
      topicFolders: buildTopicFolders(giftedQs),
      totalQuestions: giftedQs.length,
    },
    unassigned,
    totalQuestions: list.length,
  };
}

/** Gợi ý chương cho dropdown lọc. */
export function buildBankChapterFilterOptions(activeGrade, questions) {
  const opts = [{ value: '', label: 'Tất cả chương' }];
  const gl = resolveRepoGrade(activeGrade, questions[0]?.grade_level || '11');

  if (activeGrade && activeGrade !== 'ALL') {
    getSgkChapters(gl).forEach((ch) => {
      opts.push({ value: ch.no, label: formatSgkChapterHeading(gl, ch.no) });
    });
    const seen = new Set(opts.map((o) => o.value));
    (questions || []).forEach((q) => {
      if (getBankQuestionSection(q) === BANK_SECTION_GIFTED) return;
      const ch = String(q?.chapter ?? '').trim();
      if (ch && !seen.has(ch)) {
        seen.add(ch);
        opts.push({ value: ch, label: formatSgkChapterHeading(gl, ch) });
      }
    });
  } else {
    const byKey = new Map();
    (questions || []).forEach((q) => {
      if (getBankQuestionSection(q) === BANK_SECTION_GIFTED) return;
      const ch = String(q?.chapter ?? '').trim();
      const g = String(q?.grade_level || '8');
      if (!ch) return;
      const key = `${g}::${ch}`;
      if (!byKey.has(key)) {
        byKey.set(key, { value: key, label: `Toán ${g} · ${formatSgkChapterHeading(g, ch)}` });
      }
    });
    Array.from(byKey.values())
      .sort((a, b) => a.label.localeCompare(b.label, 'vi'))
      .forEach((o) => opts.push(o));
  }

  opts.push({ value: BANK_FILTER_GIFTED, label: 'Học sinh giỏi' });
  return opts;
}

/** Gợi ý dạng toán cho dropdown lọc (theo chương đang chọn). */
export function buildBankTopicFilterOptions(questions, { chapterFilter } = {}) {
  const opts = [{ value: '', label: 'Tất cả dạng toán' }];
  const seen = new Set();

  let pool = questions || [];
  if (chapterFilter === BANK_FILTER_GIFTED) {
    pool = pool.filter((q) => getBankQuestionSection(q) === BANK_SECTION_GIFTED);
  } else if (chapterFilter) {
    pool = pool.filter((q) => {
      if (getBankQuestionSection(q) === BANK_SECTION_GIFTED) return false;
      const ch = String(q?.chapter ?? '').trim();
      if (String(chapterFilter).includes('::')) {
        const [gl, cn] = chapterFilter.split('::');
        return String(q?.grade_level || '8') === gl && ch === cn;
      }
      return ch === chapterFilter;
    });
  }

  pool.forEach((q) => {
    const key = getBankQuestionTopicKey(q);
    if (seen.has(key)) return;
    seen.add(key);
    opts.push({
      value: key,
      label: key === BANK_TOPIC_NONE ? 'Chưa phân dạng toán' : key,
    });
  });

  return opts.sort((a, b) => {
    if (!a.value) return -1;
    if (!b.value) return 1;
    if (a.value === BANK_TOPIC_NONE) return 1;
    if (b.value === BANK_TOPIC_NONE) return -1;
    return a.label.localeCompare(b.label, 'vi');
  });
}

export function filterBankQuestions(questions, filters = {}) {
  const {
    activeGrade,
    chapter = '',
    topic = '',
    qType = '',
    cogLevel = '',
    search = '',
  } = filters;

  let list = Array.isArray(questions) ? questions : [];
  if (activeGrade && activeGrade !== 'ALL') {
    list = list.filter((q) => String(q?.grade_level || '8') === String(activeGrade));
  }

  if (chapter === BANK_FILTER_GIFTED) {
    list = list.filter((q) => getBankQuestionSection(q) === BANK_SECTION_GIFTED);
  } else if (chapter) {
    list = list.filter((q) => {
      if (getBankQuestionSection(q) === BANK_SECTION_GIFTED) return false;
      const ch = String(q?.chapter ?? '').trim();
      if (String(chapter).includes('::')) {
        const [gl, cn] = chapter.split('::');
        return String(q?.grade_level || '8') === gl && ch === cn;
      }
      return ch === chapter;
    });
  }

  if (topic) {
    list = list.filter((q) => getBankQuestionTopicKey(q) === topic);
  }
  if (qType) {
    list = list.filter((q) => String(q?.q_type || '') === qType);
  }
  if (cogLevel) {
    list = list.filter((q) => String(q?.cognitive_level || '') === cogLevel);
  }

  const q = String(search || '').trim().toLowerCase();
  if (q) {
    list = list.filter((x) => {
      const hay =
        `${x.question || ''} ${x.explanation || ''} ${x.chapter || ''} ${x.lesson_no || ''} ${(x.topic_tags || []).join(' ')} ${(x.category || '')}`.toLowerCase();
      return hay.includes(q);
    });
  }

  return list;
}
