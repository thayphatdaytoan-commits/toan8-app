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
import { COLLECTION_CLASS_HOMEWORK, db, ensureAnonymousAuth } from '../firebaseClient';

async function ready() {
  try {
    await ensureAnonymousAuth();
  } catch {
    /* ignore */
  }
}

function sanitizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((it) => ({
      kind: ['lesson', 'quiz', 'link'].includes(it.kind) ? it.kind : 'link',
      label: String(it.label || '').trim(),
      link_url: String(it.link_url || '').trim(),
      resource_id: String(it.resource_id || '').trim(),
    }))
    .filter((it) => it.link_url || it.label);
}

function sanitizeHomework(payload) {
  return {
    class_id: String(payload.class_id || '').trim() || 'other',
    grade_level: String(payload.grade_level || '').trim(),
    title: String(payload.title || '').trim() || 'Bài tập về nhà',
    description: String(payload.description || '').trim(),
    due_date: String(payload.due_date || '').trim(),
    items: sanitizeItems(payload.items),
    updated_at: Date.now(),
  };
}

/** Đăng ký BTVN theo khối (lọc class_id phía client nếu cần). */
export function subscribeHomeworkByGrade(gradeLevel, onData, onError) {
  const g = String(gradeLevel || '').trim();
  const col = collection(db, COLLECTION_CLASS_HOMEWORK);
  const q = g && g !== 'ALL' ? query(col, where('grade_level', '==', g)) : col;

  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
      rows.sort((a, b) => (Number(b.updated_at) || 0) - (Number(a.updated_at) || 0));
      onData(rows);
    },
    (err) => {
      console.error(err);
      onError?.(err);
      onData([]);
    }
  );
}

export async function saveHomeworkAssignment(payload, existingId = '') {
  await ready();
  const data = sanitizeHomework(payload);
  if (existingId) {
    await setDoc(doc(db, COLLECTION_CLASS_HOMEWORK, existingId), data, { merge: true });
    return { id: existingId, ...data };
  }
  const ref = await addDoc(collection(db, COLLECTION_CLASS_HOMEWORK), {
    ...data,
    created_at: Date.now(),
  });
  return { id: ref.id, ...data };
}

export async function deleteHomeworkAssignment(id) {
  if (!id) return;
  await ready();
  await deleteDoc(doc(db, COLLECTION_CLASS_HOMEWORK, id));
}
