/** Loại đề thi — dùng chung Admin, học sinh, import. */

import { formatSgkChapterHeading, getSgkChapters, sortCatalogEntries } from './sgkToc';

export const EXAM_TYPE = {
  lesson: 'lesson',
  midterm: 'midterm',
  final: 'final',
  gifted: 'gifted',
  combined: 'combined',
  entrance_10: 'entrance_10',
  entrance_univ: 'entrance_univ',
};

export const EXAM_TYPE_LABEL = {
  [EXAM_TYPE.lesson]: 'Đề ôn theo bài học',
  [EXAM_TYPE.midterm]: 'Giữa kỳ',
  [EXAM_TYPE.final]: 'Cuối kỳ',
  [EXAM_TYPE.gifted]: 'Học sinh giỏi',
  [EXAM_TYPE.combined]: 'Tổng hợp',
  [EXAM_TYPE.entrance_10]: 'Thi thử tuyển sinh 10',
  [EXAM_TYPE.entrance_univ]: 'Thi thử đại học',
  mock: 'Thi thử',
  entrance: 'Tuyển sinh',
};

/** Thư mục lớn trong Kho Đề Thi (Admin). */
export const QUIZ_REPO_FOLDERS = [
  { id: EXAM_TYPE.lesson, label: 'ĐỀ ÔN THEO BÀI HỌC', hasChapters: true },
  { id: EXAM_TYPE.midterm, label: 'ĐỀ GIỮA KÌ' },
  { id: EXAM_TYPE.final, label: 'ĐỀ CUỐI KÌ' },
  { id: EXAM_TYPE.gifted, label: 'ĐỀ HỌC SINH GIỎI' },
  { id: EXAM_TYPE.combined, label: 'ĐỀ TỔNG HỢP' },
  { id: EXAM_TYPE.entrance_10, label: 'ĐỀ THI THỬ TUYỂN SINH 10', grades: ['9'] },
  { id: EXAM_TYPE.entrance_univ, label: 'ĐỀ THI THỬ ĐẠI HỌC', grades: ['12'] },
];

const ALLOWED_EXAM_TYPES = new Set(Object.values(EXAM_TYPE));

/** Chuẩn hóa loại đề cũ (mock, entrance) sang loại mới. */
export function normalizeExamType(examType, gradeLevel) {
  const et = String(examType || EXAM_TYPE.lesson).trim();
  const gl = String(gradeLevel || '8').trim();
  if (et === 'mock') {
    if (gl === '9') return EXAM_TYPE.entrance_10;
    if (gl === '12') return EXAM_TYPE.entrance_univ;
    return EXAM_TYPE.combined;
  }
  if (et === 'entrance') {
    if (gl === '9') return EXAM_TYPE.entrance_10;
    if (gl === '12') return EXAM_TYPE.entrance_univ;
    return EXAM_TYPE.combined;
  }
  if (ALLOWED_EXAM_TYPES.has(et)) return et;
  return EXAM_TYPE.lesson;
}

export function examTypeLabel(examType, gradeLevel) {
  const t = normalizeExamType(examType, gradeLevel);
  return EXAM_TYPE_LABEL[t] || EXAM_TYPE_LABEL[EXAM_TYPE.lesson];
}

/** Dropdown loại đề khi soạn — theo khối lớp. */
export function getQuizExamTypeOptions(gradeLevel) {
  const gl = String(gradeLevel || '8').trim();
  const opts = [
    { value: EXAM_TYPE.lesson, label: 'Đề ôn theo bài học' },
    { value: EXAM_TYPE.midterm, label: 'Giữa kỳ' },
    { value: EXAM_TYPE.final, label: 'Cuối kỳ' },
    { value: EXAM_TYPE.gifted, label: 'Học sinh giỏi' },
    { value: EXAM_TYPE.combined, label: 'Tổng hợp' },
  ];
  if (gl === '9') opts.push({ value: EXAM_TYPE.entrance_10, label: 'Thi thử tuyển sinh 10' });
  if (gl === '12') opts.push({ value: EXAM_TYPE.entrance_univ, label: 'Thi thử đại học' });
  return opts;
}

function sortQuizzes(list) {
  return [...(list || [])].sort((a, b) => {
    const ta = (a?.title || '').localeCompare(b?.title || '', 'vi');
    if (ta !== 0) return ta;
    return (b?.updated_at || 0) - (a?.updated_at || 0);
  });
}

function resolveRepoGrade(activeGrade, fallback = '11') {
  if (activeGrade && activeGrade !== 'ALL') return String(activeGrade);
  return fallback;
}

function folderVisibleForGrade(folder, activeGrade) {
  if (!folder.grades?.length) return true;
  if (!activeGrade || activeGrade === 'ALL') return true;
  return folder.grades.includes(String(activeGrade));
}

function buildLessonChapterBuckets(lessonQuizzes, activeGrade) {
  const byChapter = new Map();
  lessonQuizzes.forEach((q) => {
    const gl = String(q.grade_level || '8');
    const ch = String(q.chapter ?? '').trim();
    const key = ch || '_none';
    if (!byChapter.has(key)) byChapter.set(key, []);
    byChapter.get(key).push({ ...q, _grade: gl });
  });

  const gradeForSgk = resolveRepoGrade(activeGrade, lessonQuizzes[0]?._grade || lessonQuizzes[0]?.grade_level || '11');
  const chapterMap = new Map();

  if (activeGrade && activeGrade !== 'ALL') {
    getSgkChapters(gradeForSgk).forEach((ch) => {
      chapterMap.set(ch.no, {
        no: ch.no,
        label: formatSgkChapterHeading(gradeForSgk, ch.no),
        quizzes: sortQuizzes(byChapter.get(ch.no) || []),
      });
    });
    byChapter.forEach((items, chKey) => {
      if (chKey === '_none') return;
      if (!chapterMap.has(chKey)) {
        chapterMap.set(chKey, {
          no: chKey,
          label: formatSgkChapterHeading(gradeForSgk, chKey),
          quizzes: sortQuizzes(items),
        });
      }
    });
  } else {
    const gradeSet = new Set(lessonQuizzes.map((q) => String(q.grade_level || '8')));
    gradeSet.forEach((gl) => {
      getSgkChapters(gl).forEach((ch) => {
        const key = `${gl}::${ch.no}`;
        const items = (byChapter.get(ch.no) || []).filter(
          (q) => String(q._grade || q.grade_level || '8') === gl
        );
        chapterMap.set(key, {
          no: key,
          label: `Toán ${gl} · ${formatSgkChapterHeading(gl, ch.no)}`,
          quizzes: sortQuizzes(items),
        });
      });
    });
    byChapter.forEach((items, chKey) => {
      if (chKey === '_none') return;
      const byGrade = new Map();
      items.forEach((q) => {
        const gl = String(q._grade || q.grade_level || '8');
        if (!byGrade.has(gl)) byGrade.set(gl, []);
        byGrade.get(gl).push(q);
      });
      byGrade.forEach((qs, gl) => {
        const key = `${gl}::${chKey}`;
        if (!chapterMap.has(key)) {
          chapterMap.set(key, {
            no: key,
            label: `Toán ${gl} · ${formatSgkChapterHeading(gl, chKey)}`,
            quizzes: sortQuizzes(qs),
          });
        }
      });
    });
  }

  const chapters = sortCatalogEntries(Array.from(chapterMap.values()), 'no');
  const unassigned = sortQuizzes(byChapter.get('_none') || []);
  return { chapters, unassigned };
}

/**
 * Cây thư mục Kho Đề Thi theo loại đề (+ chương SGK cho đề theo bài).
 */
export function buildAdminQuizRepositoryTree(quizzesList, { activeGrade } = {}) {
  let list = (quizzesList || []).filter((q) => q && q.level !== 'survey');
  if (activeGrade && activeGrade !== 'ALL') {
    list = list.filter((q) => String(q.grade_level || '8') === String(activeGrade));
  }

  const normalized = list.map((q) => ({
    ...q,
    exam_type: normalizeExamType(q.exam_type, q.grade_level),
  }));

  const folders = QUIZ_REPO_FOLDERS.filter((f) => folderVisibleForGrade(f, activeGrade)).map((folder) => {
    if (folder.hasChapters) {
      const lessonQuizzes = normalized.filter((q) => q.exam_type === EXAM_TYPE.lesson);
      const { chapters, unassigned } = buildLessonChapterBuckets(lessonQuizzes, activeGrade);
      const totalQuizzes = lessonQuizzes.length;
      return { ...folder, chapters, unassigned, quizzes: [], totalQuizzes };
    }
    const quizzes = sortQuizzes(normalized.filter((q) => q.exam_type === folder.id));
    return { ...folder, chapters: [], unassigned: [], quizzes, totalQuizzes: quizzes.length };
  });

  return folders;
}

export function getQuizCardMeta(quiz) {
  const stars = Math.min(5, Math.max(1, Number(quiz?.difficulty_stars) || 3));
  const n = quiz?.questions?.length || 0;
  const dur = quiz?.duration || 0;
  return `${n} câu · ${dur} phút · độ khó ${stars}★`;
}
