/**
 * Chuẩn hóa payload Firestore: chỉ chuỗi / số / bool / mảng object phẳng.
 * @param {object} course — từ parseChuyenDeOnTapImportText().course
 */
export function sanitizeReviewCourseForFirestore(course, { updatedAt = Date.now() } = {}) {
  const str = (v) => (v == null ? '' : String(v));
  const bool = (v) => !!v;
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const options = (arr) =>
    (Array.isArray(arr) ? arr : []).map((o) => ({
      key: str(o?.key).toUpperCase().slice(0, 1) || 'A',
      text: str(o?.text),
      correct: bool(o?.correct),
    }));

  const questions = (arr) =>
    (Array.isArray(arr) ? arr : []).map((q) => ({
      id: str(q?.id) || `q_${Math.random().toString(36).slice(2)}`,
      label: str(q?.label),
      stem: str(q?.stem),
      hint: str(q?.hint),
      shortAnswer: str(q?.shortAnswer),
      explanation: str(q?.explanation),
      videoUrl: str(q?.videoUrl),
      questionType: str(q?.questionType) === 'trac_nghiem' ? 'trac_nghiem' : 'dien',
      options: options(q?.options),
      level: str(q?.level) || 'nen_tang',
    }));

  const examples = (arr) =>
    (Array.isArray(arr) ? arr : []).map((ex, i) => ({
      id: str(ex?.id) || `vd_${i}_${Math.random().toString(36).slice(2)}`,
      order: num(ex?.order) || i + 1,
      label: str(ex?.label),
      stem: str(ex?.stem),
      answer: str(ex?.answer),
      hint: str(ex?.hint),
    }));

  const topics = (Array.isArray(course?.topics) ? course.topics : []).map((t) => ({
    id: str(t?.id) || `tp_${Math.random().toString(36).slice(2)}`,
    title: str(t?.title),
    description: str(t?.description),
    videoUrl: str(t?.videoUrl),
    summary: str(t?.summary),
    example: str(t?.example),
    examples: examples(t?.examples),
    showVideoTopic: bool(t?.showVideoTopic),
    showSummaryTopic: bool(t?.showSummaryTopic),
    showExampleTopic: bool(t?.showExampleTopic),
    questions: questions(t?.questions),
  }));

  return {
    title: str(course?.title).trim() || 'Khóa ôn tập',
    description: str(course?.description),
    grade_level: str(course?.grade_level || '11').trim() || '11',
    sort_order: num(course?.sort_order),
    intro: {
      videoUrl: str(course?.intro?.videoUrl),
      summary: str(course?.intro?.summary),
      showVideo: bool(course?.intro?.showVideo),
      showSummary: bool(course?.intro?.showSummary),
    },
    final_exam_quiz_id: str(course?.final_exam_quiz_id),
    topics,
    updated_at: updatedAt,
  };
}
