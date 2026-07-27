/* eslint-disable */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  COLLECTION_CLASS_ATTENDANCE,
  COLLECTION_CLASS_FEEDBACK,
  db,
  ensureAnonymousAuth,
} from '../firebaseClient';
import { weekStartMonday, addDaysYmd, parseYmd, toYmd } from './classroomTimetableStore';
import { currentMonthKey } from './receiptDownload';
import { normStudentName } from '../classroomConstants';

async function ready() {
  try {
    await ensureAnonymousAuth();
  } catch {
    /* ignore */
  }
}

export const FEEDBACK_TEMPLATES = [
  'Tháng này con có cố gắng, cần phát huy thêm.',
  'Con học đều, thái độ tốt — tiếp tục duy trì nhé!',
  'Con cần cố gắng hơn, dành thêm thời gian ôn bài ở nhà.',
  'Con tiến bộ rõ rệt so với tuần trước, thầy/cô rất vui.',
  'Con tham gia lớp tích cực nhưng cần cẩn thận hơn khi làm bài.',
  'Con nghỉ hơi nhiều, cần đi học đều để theo kịp lớp.',
  'Điểm kiểm tra online ổn, hãy luyện thêm dạng bài còn yếu.',
  'Con làm bài cẩn thận, cần tự tin hơn khi trình bày lời giải.',
];

export function feedbackPeriodKey(periodType, date = new Date()) {
  if (periodType === 'week') return weekStartMonday(date);
  return currentMonthKey(date);
}

export function feedbackPeriodId(periodType, periodKey) {
  const t = periodType === 'week' ? 'week' : 'month';
  return `${t}_${String(periodKey || '').trim()}`;
}

export function feedbackDocId(studentId, periodType, periodKey) {
  const s = String(studentId || 'x').replace(/[^\w.-]/g, '_');
  return `${s}_${feedbackPeriodId(periodType, periodKey)}`;
}

export function formatPeriodLabel(periodType, periodKey) {
  if (periodType === 'week') {
    const mon = parseYmd(periodKey);
    const sun = new Date(mon);
    sun.setDate(sun.getDate() + 6);
    const f = (d) =>
      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    return `Tuần ${f(mon)} – ${f(sun)}`;
  }
  const m = String(periodKey || '').match(/^(\d{4})-(\d{2})$/);
  if (!m) return periodKey || '';
  return `Tháng ${Number(m[2])}/${m[1]}`;
}

export function subscribeFeedbackPeriod(periodType, periodKey, onData, onError) {
  const periodId = feedbackPeriodId(periodType, periodKey);
  const q = query(collection(db, COLLECTION_CLASS_FEEDBACK), where('period_id', '==', periodId));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
      rows.sort((a, b) => String(a.student_name || '').localeCompare(String(b.student_name || ''), 'vi'));
      onData(rows);
    },
    (err) => {
      console.error(err);
      onError?.(err);
      onData([]);
    }
  );
}

export async function saveFeedback(payload, existingId = '') {
  await ready();
  const periodType = payload.period_type === 'week' ? 'week' : 'month';
  const periodKey = String(payload.period_key || '').trim();
  const data = {
    student_id: String(payload.student_id || '').trim(),
    student_name: String(payload.student_name || '').trim(),
    class_id: String(payload.class_id || '').trim() || 'other',
    grade_level: String(payload.grade_level || '').trim(),
    period_type: periodType,
    period_key: periodKey,
    period_id: feedbackPeriodId(periodType, periodKey),
    comment: String(payload.comment || '').trim(),
    attendance_summary: String(payload.attendance_summary || '').trim(),
    online_score_summary: String(payload.online_score_summary || '').trim(),
    lesson_progress_summary: String(payload.lesson_progress_summary || '').trim(),
    updated_at: Date.now(),
  };
  const id = existingId || feedbackDocId(data.student_id, periodType, periodKey);
  await setDoc(doc(db, COLLECTION_CLASS_FEEDBACK, id), data, { merge: true });
  return { id, ...data };
}

export async function deleteFeedback(id) {
  if (!id) return;
  await ready();
  await deleteDoc(doc(db, COLLECTION_CLASS_FEEDBACK, id));
}

function datesInPeriod(periodType, periodKey) {
  if (periodType === 'week') {
    const out = [];
    for (let i = 0; i < 7; i += 1) out.push(addDaysYmd(periodKey, i));
    return out;
  }
  const m = String(periodKey || '').match(/^(\d{4})-(\d{2})$/);
  if (!m) return [];
  const year = Number(m[1]);
  const month = Number(m[2]);
  const last = new Date(year, month, 0).getDate();
  const out = [];
  for (let d = 1; d <= last; d += 1) {
    out.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return out;
}

/** Tóm tắt chuyên cần từ điểm danh offline. */
export async function buildAttendanceSummary({ classId, studentId, periodType, periodKey }) {
  await ready();
  const cid = String(classId || '').trim();
  const sid = String(studentId || '');
  if (!cid || !sid) return 'Chưa có dữ liệu điểm danh.';

  let snap;
  try {
    const q = query(collection(db, COLLECTION_CLASS_ATTENDANCE), where('class_id', '==', cid));
    snap = await getDocs(q);
  } catch {
    return 'Không tải được điểm danh.';
  }

  const allowed = new Set(datesInPeriod(periodType, periodKey));
  const present = [];
  const absent = [];

  snap.docs.forEach((d) => {
    const data = d.data() || {};
    const date = String(data.date || '');
    if (!allowed.has(date)) return;
    const st = data.records?.[sid];
    const [, mm, dd] = date.split('-');
    const label = mm && dd ? `${dd}/${mm}` : date;
    if (st === 'present' || st === 'late') present.push(label);
    else if (st === 'absent' || st === 'excused') absent.push(label);
  });

  if (present.length === 0 && absent.length === 0) {
    return 'Chưa ghi nhận buổi học trong kỳ này.';
  }
  if (absent.length === 0) return 'Đi học đầy đủ.';
  if (present.length === 0) return `Vắng: ${absent.join(', ')}.`;
  return `Đi học ${present.length} buổi. Vắng: ${absent.join(', ')}.`;
}

/** Điểm TB bài KT online trong kỳ (theo tên HS + timestamp). */
export function buildOnlineScoreSummary(scoresList, studentName, periodType, periodKey) {
  const name = normStudentName(studentName);
  if (!name) return 'Chưa có điểm KT online.';

  const allowed = new Set(datesInPeriod(periodType, periodKey));
  const scores = (scoresList || []).filter((s) => {
    if (normStudentName(s.student_name || s.name) !== name) return false;
    const ts = Number(s.timestamp || s.created_at || 0);
    if (!ts) return true;
    const ymd = toYmd(new Date(ts));
    return allowed.has(ymd);
  });

  if (scores.length === 0) return 'Chưa có điểm KT online trong kỳ này.';
  const nums = scores
    .map((s) => Number(s.score))
    .filter((n) => Number.isFinite(n) && n >= 0);
  if (nums.length === 0) return 'Chưa có điểm KT online trong kỳ này.';
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return `Đạt TB: ${avg.toFixed(1)} điểm (${nums.length} bài).`;
}

/** Tiến độ học online (ước lượng từ số bài đã có điểm / tổng quiz gần đây). */
export function buildLessonProgressSummary(scoresList, quizzesList, studentName, activeGrade) {
  const name = normStudentName(studentName);
  if (!name) return 'Chưa vào học bài nào.';
  const gradeQuizzes = (quizzesList || []).filter((q) => {
    if (!activeGrade || activeGrade === 'ALL') return true;
    return String(q.grade_level || '') === String(activeGrade);
  });
  const done = new Set();
  (scoresList || []).forEach((s) => {
    if (normStudentName(s.student_name || s.name) !== name) return;
    if (s.quizId) done.add(String(s.quizId));
  });
  const total = Math.max(gradeQuizzes.length, 1);
  const pct = Math.round((done.size / total) * 100);
  if (done.size === 0) return 'Chưa vào học bài kiểm tra online.';
  return `Đã làm ${done.size}/${total} bài KT online (≈ ${pct}%).`;
}
