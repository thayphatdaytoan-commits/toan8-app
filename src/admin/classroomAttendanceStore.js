/* eslint-disable */
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import {
  COLLECTION_CLASS_ATTENDANCE,
  db,
  ensureAnonymousAuth,
} from '../firebaseClient';

export const ATTENDANCE_STATUS = {
  present: 'present',
  late: 'late',
  excused: 'excused',
  absent: 'absent',
};

export const ATTENDANCE_STATUS_LABELS = {
  present: 'Đi học',
  late: 'Đi muộn',
  excused: 'Nghỉ có phép',
  absent: 'Nghỉ không phép',
};

export function attendanceDocId(classId, dateYmd, session) {
  const c = String(classId || 'other').replace(/[^\w.-]/g, '_');
  const d = String(dateYmd || '').trim();
  const s = session === 'morning' ? 'morning' : 'afternoon';
  return `${c}_${d}_${s}`;
}

export function todayYmd(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatYmdVi(ymd) {
  const m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return ymd || '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function defaultAttendanceTitle({ grade, classLabel, dateYmd }) {
  const g = grade && grade !== 'ALL' ? grade : '';
  const label = String(classLabel || 'Lớp').trim();
  return `ĐĐ ${g ? `${g}-` : ''}${label} (${dateYmd || todayYmd()})`;
}

async function ready() {
  try {
    await ensureAnonymousAuth();
  } catch {
    /* ignore */
  }
}

export function subscribeAttendanceSession(docId, onData, onError) {
  if (!docId) {
    onData(null);
    return () => {};
  }
  const ref = doc(db, COLLECTION_CLASS_ATTENDANCE, docId);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData({ id: snap.id, ...(snap.data() || {}) });
    },
    (err) => {
      console.error(err);
      onError?.(err);
      onData(null);
    }
  );
}

export async function saveAttendanceSession(payload) {
  await ready();
  const classId = String(payload.class_id || '').trim() || 'other';
  const date = String(payload.date || todayYmd()).trim();
  const session = payload.session === 'morning' ? 'morning' : 'afternoon';
  const id = attendanceDocId(classId, date, session);
  const records =
    payload.records && typeof payload.records === 'object' ? payload.records : {};
  const cleanRecords = {};
  Object.entries(records).forEach(([sid, st]) => {
    if (ATTENDANCE_STATUS[st]) cleanRecords[sid] = st;
  });
  const data = {
    class_id: classId,
    grade_level: String(payload.grade_level || '').trim(),
    session,
    date,
    title: String(payload.title || '').trim(),
    records: cleanRecords,
    updated_at: Date.now(),
  };
  await setDoc(doc(db, COLLECTION_CLASS_ATTENDANCE, id), data, { merge: true });
  return { id, ...data };
}

export function summarizeAttendance(students, records) {
  const list = Array.isArray(students) ? students : [];
  const rec = records && typeof records === 'object' ? records : {};
  const counts = {
    total: list.length,
    present: 0,
    late: 0,
    excused: 0,
    absent: 0,
    unset: 0,
  };
  list.forEach((s) => {
    const st = rec[s.id];
    if (st === 'present') counts.present += 1;
    else if (st === 'late') counts.late += 1;
    else if (st === 'excused') counts.excused += 1;
    else if (st === 'absent') counts.absent += 1;
    else counts.unset += 1;
  });
  return counts;
}
