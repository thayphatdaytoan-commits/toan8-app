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

/** EXP: điểm × 15; ôn tập / điều chỉnh admin dùng exp_points (có thể âm). */
export function expPointsFromScoreRow(s) {
  if (s && Object.prototype.hasOwnProperty.call(s, 'exp_points')) {
    const ep = Number(s.exp_points);
    if (Number.isFinite(ep)) return Math.round(ep);
  }
  const n = Number(s?.score);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 15);
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
    .map((s) => Number(s?.score))
    .filter((n) => Number.isFinite(n));
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}
