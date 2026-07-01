import { IMPORT_BLOCK_KEYS } from './chuyenDeOnTapConstants';
import { parseReviewLevelId } from './chuyenDeOnTapLevels';

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const SORTED_KEYS = [...IMPORT_BLOCK_KEYS].sort((a, b) => b.length - a.length);
const KEY_LINE_RE = new RegExp(
  `^(${SORTED_KEYS.map(escapeRegExp).join('|')}):\\s*(.*)$`
);

/** Tách dòng đầu làm tiêu đề ngắn; phần còn lại (nếu có) ghép vào mô tả phụ. */
function splitTitleBody(content) {
  const t = String(content || '').trim();
  if (!t) return { title: '', body: '' };
  const nl = t.indexOf('\n');
  if (nl === -1) return { title: t, body: '' };
  return { title: t.slice(0, nl).trim(), body: t.slice(nl + 1).trim() };
}

function firstYoutubeLine(text) {
  const lines = String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const urlLine = lines.find((l) => /^https?:\/\//i.test(l) || l.includes('youtube.com') || l.includes('youtu.be'));
  return urlLine || '';
}

function stripCommentLines(text) {
  return String(text || '')
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .join('\n')
    .trim();
}

function parseCoKhong(s) {
  const x = String(s || '')
    .trim()
    .toLowerCase();
  if (!x) return true;
  if (x.startsWith('không') || x === 'no' || x === '0' || x === 'false') return false;
  return true;
}

function parseMcqBlock(content) {
  const lines = String(content || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const options = [];
  for (const line of lines) {
    const m = line.match(/^([A-Da-d])\.\s*(.+)$/);
    if (!m) continue;
    const key = m[1].toUpperCase();
    let rest = m[2].trim();
    let correct = false;
    const pipe = rest.split(/\|\s*đúng\s*$/i);
    if (pipe.length > 1) {
      correct = true;
      rest = pipe[0].trim();
    }
    options.push({ key, text: rest, correct });
  }
  return options;
}

function splitIntoBlocks(text) {
  const raw = String(text || '').replace(/\r\n/g, '\n');
  const lines = raw.split('\n');
  const blocks = [];
  let currentKey = null;
  let currentLines = [];

  const flush = () => {
    if (!currentKey) return;
    const content = currentLines.join('\n').trim();
    blocks.push({ key: currentKey, content });
    currentKey = null;
    currentLines = [];
  };

  for (const line of lines) {
    const trimmedStart = line.replace(/^\s+/, '');
    const m = trimmedStart.match(KEY_LINE_RE);
    if (m) {
      flush();
      currentKey = m[1];
      const rest = m[2] || '';
      currentLines = rest ? [rest] : [];
    } else {
      if (currentKey) currentLines.push(line);
    }
  }
  flush();
  return blocks;
}

/** Tách khối con trong một VÍ_DỤ_N (ĐỀ_VÍ_DỤ / ĐÁP_ÁN_VÍ_DỤ / GỢI_Ý_VÍ_DỤ). */
function splitIntoBlocksWithKeys(text, keyList) {
  const sorted = [...keyList].sort((a, b) => b.length - a.length);
  const re = new RegExp(`^(${sorted.map(escapeRegExp).join('|')}):\\s*(.*)$`);
  const raw = String(text || '').replace(/\r\n/g, '\n');
  const lines = raw.split('\n');
  const blocks = [];
  let currentKey = null;
  let currentLines = [];

  const flush = () => {
    if (!currentKey) return;
    const content = currentLines.join('\n').trim();
    blocks.push({ key: currentKey, content });
    currentKey = null;
    currentLines = [];
  };

  for (const line of lines) {
    const trimmedStart = line.replace(/^\s+/, '');
    const m = trimmedStart.match(re);
    if (m) {
      flush();
      currentKey = m[1];
      const rest = m[2] || '';
      currentLines = rest ? [rest] : [];
    } else {
      if (currentKey) currentLines.push(line);
    }
  }
  flush();
  return blocks;
}

const EXAMPLE_INNER_KEYS = ['ĐÁP_ÁN_VÍ_DỤ', 'GỢI_Ý_VÍ_DỤ', 'ĐỀ_VÍ_DỤ'];

function parseExampleInner(content) {
  const c = String(content || '').trim();
  if (!c) return { label: '', stem: '', answer: '', hint: '' };
  const blocks = splitIntoBlocksWithKeys(c, EXAMPLE_INNER_KEYS);
  if (!blocks.length) {
    const { title, body } = splitTitleBody(c);
    return {
      label: title || '',
      stem: (body || title || '').trim(),
      answer: '',
      hint: '',
    };
  }
  let stem = '';
  let answer = '';
  let hint = '';
  for (const b of blocks) {
    if (b.key === 'ĐỀ_VÍ_DỤ') stem = b.content.trim();
    if (b.key === 'ĐÁP_ÁN_VÍ_DỤ') answer = b.content.trim();
    if (b.key === 'GỢI_Ý_VÍ_DỤ') hint = b.content.trim();
  }
  return { label: '', stem, answer, hint };
}

export function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyTopic(title) {
  return {
    id: makeId('tp'),
    title: title || 'Chủ đề',
    description: '',
    videoUrl: '',
    summary: '',
    example: '',
    examples: [],
    showVideoTopic: true,
    showSummaryTopic: true,
    showExampleTopic: true,
    questions: [],
  };
}

export function emptyQuestion(label) {
  return {
    id: makeId('q'),
    label: label || 'Bài tập',
    stem: '',
    hint: '',
    shortAnswer: '',
    explanation: '',
    videoUrl: '',
    questionType: 'dien',
    options: [],
    level: 'nen_tang',
  };
}

/** Một ví dụ = một slide (giống một bài tập). */
export function emptyExample(order = 1) {
  const o = Number(order);
  const n = Number.isFinite(o) && o > 0 ? o : 1;
  return {
    id: makeId('vd'),
    order: n,
    label: `Ví dụ ${n}`,
    stem: '',
    answer: '',
    hint: '',
  };
}

/**
 * @returns {{ ok: boolean, errors?: string[], detect?: string, course?: object }}
 */
export function parseChuyenDeOnTapImportText(text) {
  const errors = [];
  const blocks = splitIntoBlocks(text);
  if (!blocks.length) {
    return { ok: false, errors: ['File trống hoặc không có khối tiêu đề hợp lệ (VD: KHÓA_HỌC:, CHỦ_ĐỀ:, BÀI_TẬP:).'] };
  }

  const hasKhoaHoc = blocks.some((b) => b.key === 'KHÓA_HỌC');
  const hasChuDe = blocks.some((b) => b.key === 'CHỦ_ĐỀ');

  let detect = 'course';
  if (!hasKhoaHoc && hasChuDe) detect = 'topic';
  if (!hasKhoaHoc && !hasChuDe) detect = 'question';

  const course = {
    title: '',
    description: '',
    grade_level: '11',
    sort_order: 0,
    intro: {
      videoUrl: '',
      summary: '',
      showVideo: true,
      showSummary: true,
    },
    final_exam_quiz_id: '',
    topics: [],
  };

  const topics = [];
  let topicIdx = -1;
  let qIdx = -1;

  const ensureTopic = () => {
    if (topicIdx >= 0) return;
    topics.push(emptyTopic('Ôn tập'));
    topicIdx = topics.length - 1;
    qIdx = -1;
  };

  const ensureQuestion = () => {
    ensureTopic();
    const t = topics[topicIdx];
    if (qIdx >= 0 && qIdx < t.questions.length) return;
    t.questions.push(emptyQuestion(`Bài ${t.questions.length + 1}`));
    qIdx = t.questions.length - 1;
  };

  for (const { key, content } of blocks) {
    const c = content;
    switch (key) {
      case 'KHÓA_HỌC': {
        const { title, body } = splitTitleBody(c);
        course.title = title || course.title;
        if (body) course.description = [course.description, body].filter(Boolean).join('\n\n').trim();
        break;
      }
      case 'MÔ_TẢ':
        course.description = c.trim();
        break;
      case 'KHỐI_LỚP': {
        const m = String(c).match(/\d+/);
        course.grade_level = m ? m[0] : course.grade_level;
        break;
      }
      case 'THỨ_TỰ':
        course.sort_order = parseInt(String(c).replace(/\D/g, ''), 10) || 0;
        break;
      case 'VIDEO_MỞ_ĐẦU':
        course.intro.videoUrl = firstYoutubeLine(c);
        break;
      case 'TÓM_TẮT_MỞ_ĐẦU':
        course.intro.summary = c.trim();
        break;
      case 'HIỂN_THỊ_VIDEO_MỞ_ĐẦU':
        course.intro.showVideo = parseCoKhong(c);
        break;
      case 'HIỂN_THỊ_TÓM_TẮT_MỞ_ĐẦU':
        course.intro.showSummary = parseCoKhong(c);
        break;
      case 'ĐỀ_KIỂM_TRA_CUỐI':
        course.final_exam_quiz_id = stripCommentLines(c).split('\n')[0]?.trim() || '';
        break;
      case 'CHỦ_ĐỀ': {
        const { title, body } = splitTitleBody(c);
        topics.push(emptyTopic(title || 'Chủ đề'));
        topicIdx = topics.length - 1;
        qIdx = -1;
        if (body) topics[topicIdx].description = body;
        break;
      }
      case 'MÔ_TẢ_CHỦ_ĐỀ':
        ensureTopic();
        topics[topicIdx].description = c.trim();
        break;
      case 'VIDEO_CHỦ_ĐỀ':
        ensureTopic();
        topics[topicIdx].videoUrl = firstYoutubeLine(c);
        break;
      case 'TÓM_TẮT_CHỦ_ĐỀ':
        ensureTopic();
        topics[topicIdx].summary = c.trim();
        break;
      case 'VÍ_DỤ_CHỦ_ĐỀ':
        ensureTopic();
        topics[topicIdx].example = c.trim();
        if (!Array.isArray(topics[topicIdx].examples)) topics[topicIdx].examples = [];
        if (topics[topicIdx].examples.length === 0 && c.trim()) {
          topics[topicIdx].examples.push({
            id: makeId('vd'),
            order: 1,
            label: 'Ví dụ',
            stem: c.trim(),
            answer: '',
            hint: '',
          });
        }
        break;
      case 'HIỂN_THỊ_VIDEO_CHỦ_ĐỀ':
        ensureTopic();
        topics[topicIdx].showVideoTopic = parseCoKhong(c);
        break;
      case 'HIỂN_THỊ_TÓM_TẮT_CHỦ_ĐỀ':
        ensureTopic();
        topics[topicIdx].showSummaryTopic = parseCoKhong(c);
        break;
      case 'HIỂN_THỊ_VÍ_DỤ_CHỦ_ĐỀ':
        ensureTopic();
        topics[topicIdx].showExampleTopic = parseCoKhong(c);
        break;
      case 'BÀI_TẬP': {
        ensureTopic();
        const { title: label, body } = splitTitleBody(c);
        const q = emptyQuestion(label || `Bài ${topics[topicIdx].questions.length + 1}`);
        if (body) q.stem = body;
        topics[topicIdx].questions.push(q);
        qIdx = topics[topicIdx].questions.length - 1;
        break;
      }
      case 'ĐỀ_BÀI':
        ensureTopic();
        if (qIdx < 0) {
          topics[topicIdx].questions.push(emptyQuestion(`Bài ${topics[topicIdx].questions.length + 1}`));
          qIdx = topics[topicIdx].questions.length - 1;
        }
        topics[topicIdx].questions[qIdx].stem = c.trim();
        break;
      case 'GỢI_Ý':
        ensureTopic();
        if (qIdx < 0) ensureQuestion();
        topics[topicIdx].questions[qIdx].hint = c.trim();
        break;
      case 'ĐÁP_ÁN':
        ensureTopic();
        if (qIdx < 0) ensureQuestion();
        topics[topicIdx].questions[qIdx].shortAnswer = c.trim();
        break;
      case 'LỜI_GIẢI_CHI_TIẾT':
        ensureTopic();
        if (qIdx < 0) ensureQuestion();
        topics[topicIdx].questions[qIdx].explanation = c.trim();
        break;
      case 'VIDEO_BÀI':
        ensureTopic();
        if (qIdx < 0) ensureQuestion();
        topics[topicIdx].questions[qIdx].videoUrl = firstYoutubeLine(c);
        break;
      case 'LOẠI_CÂU': {
        ensureTopic();
        if (qIdx < 0) ensureQuestion();
        const x = String(c)
          .trim()
          .toLowerCase();
        topics[topicIdx].questions[qIdx].questionType = x.includes('trắc') || x.includes('trac') ? 'trac_nghiem' : 'dien';
        break;
      }
      case 'CẤP_ĐỘ': {
        ensureTopic();
        if (qIdx < 0) ensureQuestion();
        topics[topicIdx].questions[qIdx].level = parseReviewLevelId(c);
        break;
      }
      case 'TRẮC_NGHIỆM': {
        ensureTopic();
        if (qIdx < 0) ensureQuestion();
        topics[topicIdx].questions[qIdx].questionType = 'trac_nghiem';
        topics[topicIdx].questions[qIdx].options = parseMcqBlock(c);
        break;
      }
      default: {
        const vm = key.match(/^VÍ_DỤ_(\d+)$/);
        if (vm) {
          const n = parseInt(vm[1], 10);
          if (n >= 1 && n <= 99) {
            ensureTopic();
            const t = topics[topicIdx];
            if (!Array.isArray(t.examples)) t.examples = [];
            while (t.examples.length < n) {
              const o = t.examples.length + 1;
              t.examples.push({
                id: makeId('vd'),
                order: o,
                label: `Ví dụ ${o}`,
                stem: '',
                answer: '',
                hint: '',
              });
            }
            const ex = t.examples[n - 1];
            ex.order = n;
            ex.label = `Ví dụ ${n}`;
            const inner = parseExampleInner(c);
            if (inner.label) ex.label = inner.label;
            if (inner.stem) ex.stem = inner.stem;
            if (inner.answer) ex.answer = inner.answer;
            if (inner.hint) ex.hint = inner.hint;
            if (!inner.stem && c.trim()) {
              const { title, body } = splitTitleBody(c);
              if (title) ex.label = title;
              ex.stem = (body || title || '').trim();
            }
          }
        }
        break;
      }
    }
  }

  course.topics = topics.filter(
    (t) =>
      t &&
      ((t.title && String(t.title).trim()) ||
        (t.questions && t.questions.length) ||
        (t.examples && t.examples.length))
  );

  if (detect === 'topic' && course.topics.length && !course.title) {
    course.title = course.topics[0].title || 'Chuyên đề';
    course.description = course.topics[0].description || course.description;
  }

  if (detect === 'question') {
    ensureTopic();
    course.title = 'Bài ôn tập';
    course.description = '';
  }

  if (!course.title.trim()) {
    errors.push('Thiếu tên khóa (KHÓA_HỌC:) hoặc chủ đề (CHỦ_ĐỀ:).');
  }

  const totalQ = course.topics.reduce((a, t) => a + (t.questions?.length || 0), 0);
  const totalEx = course.topics.reduce((a, t) => a + (t.examples?.length || 0), 0);
  if (totalQ === 0 && totalEx === 0) {
    errors.push('Chưa có câu hỏi hay ví dụ — cần ít nhất BÀI_TẬP / ĐỀ_BÀI hoặc VÍ_DỤ_1 / VÍ_DỤ_CHỦ_ĐỀ.');
  }

  course.topics.forEach((t, ti) => {
    t.questions.forEach((q, qi) => {
      if (q.questionType === 'trac_nghiem') {
        const correct = q.options.filter((o) => o.correct);
        if (correct.length !== 1) {
          errors.push(`Chủ đề “${t.title}”, câu ${qi + 1}: trắc nghiệm cần đúng 1 phương án (| đúng).`);
        }
      }
    });
  });

  return {
    ok: errors.length === 0,
    errors,
    detect,
    course,
  };
}

const QUESTION_IMPORT_KEYS = new Set([
  'BÀI_TẬP',
  'ĐỀ_BÀI',
  'GỢI_Ý',
  'ĐÁP_ÁN',
  'LỜI_GIẢI_CHI_TIẾT',
  'VIDEO_BÀI',
  'LOẠI_CÂU',
  'CẤP_ĐỘ',
  'TRẮC_NGHIỆM',
]);

function validateParsedQuestions(questions, labelPrefix = '') {
  const errors = [];
  questions.forEach((q, qi) => {
    const tag = labelPrefix ? `${labelPrefix}, câu ${qi + 1}` : `Câu ${qi + 1}`;
    if (!String(q.stem || '').trim()) {
      errors.push(`${tag}: thiếu đề (ĐỀ_BÀI:).`);
    }
    if (q.questionType === 'trac_nghiem') {
      const correct = (q.options || []).filter((o) => o.correct);
      if (correct.length !== 1) {
        errors.push(`${tag}: trắc nghiệm cần đúng 1 phương án (| đúng).`);
      }
    }
  });
  return errors;
}

function parseQuestionsFromBlocks(blocks) {
  const questions = [];
  let qIdx = -1;

  const ensureQuestion = () => {
    if (qIdx >= 0 && qIdx < questions.length) return;
    questions.push(emptyQuestion(`Câu ${questions.length + 1}`));
    qIdx = questions.length - 1;
  };

  for (const { key, content } of blocks) {
    const c = content;
    switch (key) {
      case 'BÀI_TẬP': {
        const { title: label, body } = splitTitleBody(c);
        const q = emptyQuestion(label || `Câu ${questions.length + 1}`);
        if (body) q.stem = body;
        questions.push(q);
        qIdx = questions.length - 1;
        break;
      }
      case 'ĐỀ_BÀI':
        if (qIdx < 0) ensureQuestion();
        questions[qIdx].stem = c.trim();
        break;
      case 'GỢI_Ý':
        if (qIdx < 0) ensureQuestion();
        questions[qIdx].hint = c.trim();
        break;
      case 'ĐÁP_ÁN':
        if (qIdx < 0) ensureQuestion();
        questions[qIdx].shortAnswer = c.trim();
        break;
      case 'LỜI_GIẢI_CHI_TIẾT':
        if (qIdx < 0) ensureQuestion();
        questions[qIdx].explanation = c.trim();
        break;
      case 'VIDEO_BÀI':
        if (qIdx < 0) ensureQuestion();
        questions[qIdx].videoUrl = firstYoutubeLine(c);
        break;
      case 'LOẠI_CÂU': {
        if (qIdx < 0) ensureQuestion();
        const x = String(c).trim().toLowerCase();
        questions[qIdx].questionType = x.includes('trắc') || x.includes('trac') ? 'trac_nghiem' : 'dien';
        break;
      }
      case 'CẤP_ĐỘ':
        if (qIdx < 0) ensureQuestion();
        questions[qIdx].level = parseReviewLevelId(c);
        break;
      case 'TRẮC_NGHIỆM':
        if (qIdx < 0) ensureQuestion();
        questions[qIdx].questionType = 'trac_nghiem';
        questions[qIdx].options = parseMcqBlock(c);
        break;
      default:
        break;
    }
  }

  questions.forEach((q, i) => {
    if (!String(q.label || '').trim()) {
      q.label = `Câu ${i + 1}`;
    }
  });

  return questions;
}

/**
 * Import chỉ câu hỏi — bỏ qua KHÓA_HỌC, CHỦ_ĐỀ, VÍ_DỤ, lý thuyết…
 * @returns {{ ok: boolean, errors?: string[], questions?: object[], skippedBlocks?: number }}
 */
export function parseChuyenDeOnTapQuestionsOnlyImportText(text) {
  const allBlocks = splitIntoBlocks(text);
  const blocks = allBlocks.filter((b) => QUESTION_IMPORT_KEYS.has(b.key));
  const skippedBlocks = allBlocks.length - blocks.length;

  if (!blocks.length) {
    return {
      ok: false,
      errors: [
        'Không có khối câu hỏi hợp lệ (BÀI_TẬP:, ĐỀ_BÀI:, TRẮC_NGHIỆM:, …).',
        'Lý thuyết và ví dụ trong file sẽ bị bỏ qua — dùng nút Import câu hỏi riêng.',
      ],
      skippedBlocks,
    };
  }

  const questions = parseQuestionsFromBlocks(blocks);
  if (!questions.length) {
    return { ok: false, errors: ['Không parse được câu hỏi nào từ file.'], skippedBlocks };
  }

  const errors = validateParsedQuestions(questions);
  return {
    ok: errors.length === 0,
    errors,
    questions,
    skippedBlocks,
  };
}
