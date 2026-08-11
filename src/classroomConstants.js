/** Lớp mặc định cho học sinh chưa phân lớp / dữ liệu cũ. */
export const CLASS_OTHER_ID = 'other';
export const CLASS_OTHER_LABEL = 'Khác';

export function normalizeStudentClassId(student) {
  const id = String(student?.class_id ?? '').trim();
  return id || CLASS_OTHER_ID;
}

export function normStudentName(s) {
  return String(s || '').trim().toLowerCase();
}

/** Số lần làm tối đa được cộng điểm/EXP (bài tập tự luyện + đề ôn theo bài). */
export const MAX_AWARDED_ATTEMPTS = 2;

/** Đếm số lần HS đã nộp bài cho cùng quizId (mọi lần, kể cả không cộng điểm). */
export function countStudentQuizAttempts(scoresList, studentName, quizId) {
  const name = normStudentName(studentName);
  const qid = String(quizId || '');
  if (!name || !qid) return 0;
  return (scoresList || []).filter(
    (s) => normStudentName(s?.name) === name && String(s?.quizId || '') === qid
  ).length;
}

/** true nếu lần nộp hiện tại (sau `priorCount` lần trước) vẫn được cộng điểm/EXP. */
export function isAttemptAwardEligible(priorCount, maxAttempts = MAX_AWARDED_ATTEMPTS) {
  const prior = Math.max(0, Math.floor(Number(priorCount) || 0));
  const max = Math.max(0, Math.floor(Number(maxAttempts) || 0));
  return prior < max;
}

/** EXP: điểm × 15; ôn tập / điều chỉnh admin dùng exp_points (có thể âm). */
export function expPointsFromScoreRow(s) {
  if (s && s.award_eligible === false) return 0;
  if (s && Object.prototype.hasOwnProperty.call(s, 'exp_points')) {
    const ep = Number(s.exp_points);
    if (Number.isFinite(ep)) return Math.round(ep);
  }
  const n = Number(s?.score);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 15);
}

/**
 * Điểm TB chỉ lấy từ đề thi / bài kiểm tra — không tính bài tập luyện tập, EXP từng câu, dạng toán, điều chỉnh…
 * Từ lần thứ 3 trở đi (award_eligible: false) cũng không tính vào điểm TB.
 */
export function countsTowardAverageScore(row) {
  if (row?.award_eligible === false) return false;
  const kind = String(row?.kind || '')
    .trim()
    .toLowerCase();
  if (
    [
      'lesson_practice',
      'lesson_practice_step',
      'lesson_dang_progress',
      'lesson_dang_complete',
      'review_on_tap',
      'exp_adjust',
      'weekly_contest',
    ].includes(kind)
  ) {
    return false;
  }
  const qid = String(row?.quizId || '');
  if (qid.startsWith('lesson_practice_')) return false;
  if (qid.startsWith('lesson_prac_step_')) return false;
  if (qid.startsWith('lesson_dang_')) return false;
  if (qid.startsWith('exp_adjust_')) return false;
  const n = Number(row?.score);
  return Number.isFinite(n);
}

export function formatScoreTimestamp(ts) {
  if (!ts) return '—';
  try {
    const d = typeof ts === 'number' ? new Date(ts) : new Date(Number(ts));
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function averageNumericScore(rows) {
  const nums = (rows || [])
    .filter((s) => countsTowardAverageScore(s))
    .map((s) => Number(s?.score))
    .filter((n) => Number.isFinite(n));
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}
