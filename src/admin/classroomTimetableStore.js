/* eslint-disable */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  COLLECTION_CLASS_TIMETABLE,
  db,
  ensureAnonymousAuth,
} from '../firebaseClient';

async function ready() {
  try {
    await ensureAnonymousAuth();
  } catch {
    /* ignore */
  }
}

/** Thứ 2 của tuần chứa `date` (local), YYYY-MM-DD */
export function weekStartMonday(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 CN … 6 T7
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toYmd(d);
}

export function toYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseYmd(ymd) {
  const m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return new Date();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function addDaysYmd(ymd, days) {
  const d = parseYmd(ymd);
  d.setDate(d.getDate() + days);
  return toYmd(d);
}

export function formatWeekRangeVi(weekStart) {
  const mon = parseYmd(weekStart);
  const sun = new Date(mon);
  sun.setDate(sun.getDate() + 6);
  const f = (d) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `Tuần ${f(mon)} – ${f(sun)}`;
}

export const DAY_LABELS = [
  { dow: 1, short: 'Thứ 2' },
  { dow: 2, short: 'Thứ 3' },
  { dow: 3, short: 'Thứ 4' },
  { dow: 4, short: 'Thứ 5' },
  { dow: 5, short: 'Thứ 6' },
  { dow: 6, short: 'Thứ 7' },
  { dow: 7, short: 'Chủ nhật' },
];

export const HOUR_SLOTS = Array.from({ length: 16 }, (_, i) => 6 + i); // 06..21

export function timeToMinutes(hhmm) {
  const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function subscribeTimetableWeek(weekStart, onData, onError) {
  const ws = String(weekStart || weekStartMonday()).trim();
  const q = query(collection(db, COLLECTION_CLASS_TIMETABLE), where('week_start', '==', ws));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
      rows.sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) return (a.day_of_week || 0) - (b.day_of_week || 0);
        return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
      });
      onData(rows);
    },
    (err) => {
      console.error(err);
      onError?.(err);
      onData([]);
    }
  );
}

function sanitizeEntry(payload) {
  return {
    class_id: String(payload.class_id || '').trim() || 'other',
    grade_level: String(payload.grade_level || '').trim(),
    subject: String(payload.subject || '').trim() || 'Toán',
    teacher: String(payload.teacher || '').trim(),
    day_of_week: Math.min(7, Math.max(1, Number(payload.day_of_week) || 1)),
    start_time: String(payload.start_time || '18:00').trim(),
    end_time: String(payload.end_time || '20:00').trim(),
    fee: Number(payload.fee) || 0,
    week_start: String(payload.week_start || weekStartMonday()).trim(),
    color: String(payload.color || 'blue').trim() || 'blue',
    updated_at: Date.now(),
  };
}

export async function saveTimetableEntry(payload, existingId = '') {
  await ready();
  const data = sanitizeEntry(payload);
  if (existingId) {
    await setDoc(doc(db, COLLECTION_CLASS_TIMETABLE, existingId), data, { merge: true });
    return { id: existingId, ...data };
  }
  const ref = await addDoc(collection(db, COLLECTION_CLASS_TIMETABLE), data);
  return { id: ref.id, ...data };
}

export async function deleteTimetableEntry(id) {
  if (!id) return;
  await ready();
  await deleteDoc(doc(db, COLLECTION_CLASS_TIMETABLE, id));
}

export async function copyTimetableWeek(fromWeekStart, toWeekStart) {
  await ready();
  const from = String(fromWeekStart || '').trim();
  const to = String(toWeekStart || '').trim();
  if (!from || !to || from === to) return 0;

  return new Promise((resolve, reject) => {
    const unsub = subscribeTimetableWeek(
      from,
      async (rows) => {
        unsub();
        try {
          let n = 0;
          for (const row of rows) {
            await saveTimetableEntry({ ...row, week_start: to });
            n += 1;
          }
          resolve(n);
        } catch (e) {
          reject(e);
        }
      },
      reject
    );
  });
}

export function formatFee(fee) {
  const n = Number(fee) || 0;
  return `${n.toLocaleString('vi-VN')}đ`;
}
