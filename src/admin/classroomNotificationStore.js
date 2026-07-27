/* eslint-disable */
import { addDoc, collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { COLLECTION_STUDENT_NOTIFICATIONS, db, ensureAnonymousAuth } from '../firebaseClient';

export const NOTIFICATION_CATEGORIES = {
  homework: { label: 'BTVN', color: 'indigo' },
  attendance: { label: 'Điểm danh', color: 'blue' },
  timetable: { label: 'Thời khóa biểu', color: 'teal' },
  tuition: { label: 'Học phí', color: 'violet' },
  feedback: { label: 'Nhận xét', color: 'fuchsia' },
};

function normNameKey(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

async function ready() {
  try {
    await ensureAnonymousAuth();
  } catch {
    /* ignore */
  }
}

function sortNotifs(rows) {
  rows.sort((a, b) => (Number(b.created_at) || 0) - (Number(a.created_at) || 0));
  return rows;
}

/**
 * Đăng ký inbox: theo student_id và/hoặc student_name_key (gộp kết quả).
 */
export function subscribeStudentNotifications(studentIdOrOpts, onData, onError) {
  let studentId = '';
  let studentName = '';
  if (studentIdOrOpts && typeof studentIdOrOpts === 'object') {
    studentId = String(studentIdOrOpts.studentId || '').trim();
    studentName = String(studentIdOrOpts.studentName || '').trim();
  } else {
    studentId = String(studentIdOrOpts || '').trim();
  }

  const nameKey = normNameKey(studentName);
  if (!studentId && !nameKey) {
    onData([]);
    return () => {};
  }

  const byId = new Map();
  let idRows = null;
  let nameRows = null;

  const emit = () => {
    if (studentId && nameKey) {
      if (idRows == null || nameRows == null) return;
      const map = new Map();
      [...idRows, ...nameRows].forEach((r) => map.set(r.id, r));
      onData(sortNotifs([...map.values()]));
      return;
    }
    if (studentId && idRows) onData(sortNotifs([...idRows]));
    else if (nameKey && nameRows) onData(sortNotifs([...nameRows]));
  };

  const unsubs = [];

  if (studentId) {
    const q = query(
      collection(db, COLLECTION_STUDENT_NOTIFICATIONS),
      where('student_id', '==', studentId)
    );
    unsubs.push(
      onSnapshot(
        q,
        (snap) => {
          idRows = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
          emit();
        },
        (err) => {
          console.error(err);
          onError?.(err);
          idRows = [];
          emit();
        }
      )
    );
  }

  if (nameKey) {
    const q = query(
      collection(db, COLLECTION_STUDENT_NOTIFICATIONS),
      where('student_name_key', '==', nameKey)
    );
    unsubs.push(
      onSnapshot(
        q,
        (snap) => {
          nameRows = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
          emit();
        },
        (err) => {
          console.error(err);
          onError?.(err);
          nameRows = [];
          emit();
        }
      )
    );
  }

  return () => unsubs.forEach((u) => u());
}

export async function markNotificationRead(notificationId) {
  if (!notificationId) return;
  await ready();
  await setDoc(
    doc(db, COLLECTION_STUDENT_NOTIFICATIONS, notificationId),
    { read: true, read_at: Date.now() },
    { merge: true }
  );
}

export async function markAllNotificationsRead({ studentId = '', studentName = '' } = {}) {
  await ready();
  return new Promise((resolve, reject) => {
    const unsub = subscribeStudentNotifications(
      { studentId, studentName },
      async (rows) => {
        unsub();
        try {
          const unread = rows.filter((r) => !r.read);
          await Promise.all(unread.map((r) => markNotificationRead(r.id)));
          resolve(unread.length);
        } catch (e) {
          reject(e);
        }
      },
      reject
    );
  });
}

/** Gửi thông báo đến danh sách học sinh. */
export async function sendStudentNotifications({
  students = [],
  category = 'homework',
  title = '',
  body = '',
  link_type = '',
  link_id = '',
  link_url = '',
}) {
  await ready();
  const list = Array.isArray(students) ? students.filter((s) => s?.id || s?.name) : [];
  if (list.length === 0) throw new Error('Không có học sinh để gửi thông báo.');

  const cat = NOTIFICATION_CATEGORIES[category] ? category : 'homework';
  const now = Date.now();
  const payloadBase = {
    category: cat,
    title: String(title || '').trim() || NOTIFICATION_CATEGORIES[cat].label,
    body: String(body || '').trim(),
    link_type: String(link_type || '').trim(),
    link_id: String(link_id || '').trim(),
    link_url: String(link_url || '').trim(),
    read: false,
    created_at: now,
  };

  let sent = 0;
  for (const s of list) {
    const name = String(s.name || '').trim();
    await addDoc(collection(db, COLLECTION_STUDENT_NOTIFICATIONS), {
      ...payloadBase,
      student_id: String(s.id || '').trim(),
      student_name: name,
      student_name_key: normNameKey(name),
      class_id: String(s.class_id || '').trim(),
      grade_level: String(s.grade_level || '').trim(),
    });
    sent += 1;
  }
  return sent;
}
