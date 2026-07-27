/* eslint-disable */

import { preparePracticeQuestion } from './practiceQuestionTypes';

/** quizId tổng hợp cho bài tập luyện tập nhúng trong bài giảng (Firestore scores). */
export function lessonPracticeQuizId(lessonId) {
  return `lesson_practice_${lessonId}`;
}

export function lessonHasInteractivePractice(content) {
  if (content == null) return false;
  try {
    const raw = typeof content === 'string' ? JSON.parse(content) : content;
    const p = raw?.practice;
    if (!Array.isArray(p)) return false;
    return p.some(
      (q) =>
        q?.type === 'mcq' ||
        q?.type === 'input' ||
        q?.type === 'true_false' ||
        q?.type === 'ordering' ||
        q?.type === 'drag_drop' ||
        q?.type === 'fill_blanks'
    );
  } catch {
    return false;
  }
}

/**
 * Tiến độ bài học: đề theo bài (cùng chương/bài) + (nếu có) một mục bài tập tự luyện nhúng.
 * myScores: đã lọc theo học sinh + khối (cùng logic chỗ gọi).
 */
export function computeLessonStudyProgress(lesson, lessonQuizzes, myScores) {
  const totalQ = lessonQuizzes.length;
  const qIds = new Set(lessonQuizzes.map((q) => q.id));
  const doneIds = new Set(myScores.filter((s) => qIds.has(s.quizId)).map((s) => s.quizId));
  const hasP = lessonHasInteractivePractice(lesson?.content);
  const pqId = lesson?.id ? lessonPracticeQuizId(lesson.id) : '';
  const practiceDone = pqId && myScores.some((s) => s.quizId === pqId);
  const denom = totalQ + (hasP ? 1 : 0);
  let progress = 0;
  if (denom > 0) {
    const numer = doneIds.size + (practiceDone && hasP ? 1 : 0);
    progress = Math.min(100, Math.round((numer / denom) * 100));
  } else if (myScores.length > 0) {
    progress = Math.min(12, 4 + myScores.length * 2);
  }
  return progress;
}

function shuffleIndices(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function shuffleMcqOptions(q) {
  if (q.type !== 'mcq' || !Array.isArray(q.options) || q.options.length < 2) return { ...q };
  const n = q.options.length;
  const order = shuffleIndices(n);
  const newOptions = order.map((i) => q.options[i]);
  const oldCorrect = Number(q.correctAnswer);
  const newCorrect = order.indexOf(oldCorrect);
  return {
    ...q,
    options: newOptions,
    correctAnswer: newCorrect >= 0 ? newCorrect : q.correctAnswer,
  };
}

export function buildShuffledPracticeOrder(practice) {
  const list = Array.isArray(practice) ? practice : [];
  return list.map((q) => preparePracticeQuestion({ ...q }));
}
