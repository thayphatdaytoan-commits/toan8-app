import { COG_LEVEL } from './questionBank';

/** Thứ tự loại câu: TN → Đ/S → điền đoạn văn → TL ngắn → tự luận. */
export const QUIZ_TYPE_SORT_ORDER = [
  'multiple_choice',
  'true_false_group',
  'fill_blanks',
  'short_answer',
  'essay',
];

/** Thứ tự độ nhận thức trong từng nhóm loại câu. */
export const QUIZ_COG_SORT_ORDER = [
  COG_LEVEL.recognize,
  COG_LEVEL.understand,
  COG_LEVEL.apply,
  COG_LEVEL.apply_high,
];

function typeSortKey(type) {
  const t = String(type || 'multiple_choice').trim();
  const i = QUIZ_TYPE_SORT_ORDER.indexOf(t);
  return i >= 0 ? i : QUIZ_TYPE_SORT_ORDER.length;
}

function cogSortKey(level) {
  const v = String(level || COG_LEVEL.recognize).trim();
  const i = QUIZ_COG_SORT_ORDER.indexOf(v);
  return i >= 0 ? i : QUIZ_COG_SORT_ORDER.length;
}

/** Sắp xếp câu đề: loại câu → mức độ nhận thức → thứ tự gốc. */
export function sortQuizQuestions(questions, { stable = true } = {}) {
  const list = Array.isArray(questions) ? questions : [];
  return list
    .map((q, originalIndex) => ({ q, originalIndex }))
    .sort((a, b) => {
      const ta = typeSortKey(a.q?.type);
      const tb = typeSortKey(b.q?.type);
      if (ta !== tb) return ta - tb;
      const ca = cogSortKey(a.q?.cognitive_level);
      const cb = cogSortKey(b.q?.cognitive_level);
      if (ca !== cb) return ca - cb;
      if (stable) return a.originalIndex - b.originalIndex;
      return 0;
    })
    .map(({ q }) => q);
}

/** Gán giá trị mặc định cho câu import thiếu meta (sửa sau trên form). */
export function normalizeImportedQuizQuestion(q, editingQuiz) {
  const out = { ...(q || {}) };
  if (!out.type) out.type = 'multiple_choice';
  if (!out.cognitive_level) out.cognitive_level = COG_LEVEL.recognize;
  if (!Array.isArray(out.topic_tags)) out.topic_tags = [];
  if (!out.chapter && editingQuiz?.chapter) {
    out.chapter = String(editingQuiz.chapter).trim();
  }
  if (!out.lesson_no && editingQuiz?.lesson_no) {
    out.lesson_no = String(editingQuiz.lesson_no).trim();
  }
  if (out.type === 'multiple_choice' && !Array.isArray(out.options)) {
    out.options = ['', '', '', ''];
  }
  if (out.type === 'fill_blanks') {
    if (out.passage == null) out.passage = '';
    if (!Array.isArray(out.blanks)) out.blanks = [];
  }
  return out;
}
