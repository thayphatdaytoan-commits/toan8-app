/* eslint-disable */
import {
  addDoc,
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
  COLLECTION_ADMIN_STAFF,
  db,
  ensureAnonymousAuth,
} from '../firebaseClient';

export const STAFF_ROLE = {
  SUPER_ADMIN: 'super_admin',
  TEACHER: 'teacher',
};

export const ALL_GRADE_OPTIONS = ['6', '7', '8', '9', '10', '11', '12'];

async function ready() {
  try {
    await ensureAnonymousAuth();
  } catch {
    /* ignore */
  }
}

export function normUsername(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function sanitizeStaff(payload) {
  const role = payload.role === STAFF_ROLE.SUPER_ADMIN ? STAFF_ROLE.SUPER_ADMIN : STAFF_ROLE.TEACHER;
  const grades = Array.isArray(payload.grade_levels)
    ? [...new Set(payload.grade_levels.map((g) => String(g).trim()).filter(Boolean))]
    : [];
  const classIds = Array.isArray(payload.class_ids)
    ? [...new Set(payload.class_ids.map((c) => String(c).trim()).filter(Boolean))]
    : [];
  return {
    username: normUsername(payload.username),
    password: String(payload.password || '').trim(),
    name: String(payload.name || '').trim() || 'Giáo viên',
    role,
    grade_levels: role === STAFF_ROLE.SUPER_ADMIN ? ALL_GRADE_OPTIONS.slice() : grades,
    class_ids: role === STAFF_ROLE.SUPER_ADMIN ? [] : classIds,
    active: payload.active === false ? false : true,
    updated_at: Date.now(),
  };
}

export function subscribeAdminStaff(onData, onError) {
  return onSnapshot(
    collection(db, COLLECTION_ADMIN_STAFF),
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
      rows.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'vi'));
      onData(rows);
    },
    (err) => {
      console.error(err);
      onError?.(err);
      onData([]);
    }
  );
}

export async function saveAdminStaff(payload, existingId = '') {
  await ready();
  const data = sanitizeStaff(payload);
  if (!data.username) throw new Error('Thiếu tên đăng nhập.');
  if (!data.password) throw new Error('Thiếu mật khẩu.');
  if (data.role === STAFF_ROLE.TEACHER && data.grade_levels.length === 0) {
    throw new Error('Giáo viên cần được gán ít nhất một khối lớp.');
  }

  // Kiểm tra trùng username
  const q = query(collection(db, COLLECTION_ADMIN_STAFF), where('username', '==', data.username));
  const snap = await getDocs(q);
  const conflict = snap.docs.find((d) => d.id !== existingId);
  if (conflict) throw new Error('Tên đăng nhập đã tồn tại.');

  if (existingId) {
    await setDoc(doc(db, COLLECTION_ADMIN_STAFF, existingId), data, { merge: true });
    return { id: existingId, ...data };
  }
  const ref = await addDoc(collection(db, COLLECTION_ADMIN_STAFF), {
    ...data,
    created_at: Date.now(),
  });
  return { id: ref.id, ...data };
}

export async function deleteAdminStaff(id) {
  if (!id) return;
  await ready();
  await deleteDoc(doc(db, COLLECTION_ADMIN_STAFF, id));
}

/** Đăng nhập giáo viên theo username/password trong Firestore. */
export async function authenticateStaff(username, password) {
  await ready();
  const u = normUsername(username);
  const p = String(password || '').trim();
  if (!u || !p) throw new Error('Nhập tên đăng nhập và mật khẩu.');

  const q = query(collection(db, COLLECTION_ADMIN_STAFF), where('username', '==', u));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('Tài khoản không tồn tại.');
  const docSnap = snap.docs[0];
  const data = docSnap.data() || {};
  if (data.active === false) throw new Error('Tài khoản đã bị khóa.');
  if (String(data.password || '') !== p) throw new Error('Mật khẩu không chính xác.');

  return {
    id: docSnap.id,
    username: data.username || u,
    name: data.name || 'Giáo viên',
    role: data.role === STAFF_ROLE.SUPER_ADMIN ? STAFF_ROLE.SUPER_ADMIN : STAFF_ROLE.TEACHER,
    grade_levels: Array.isArray(data.grade_levels) ? data.grade_levels.map(String) : [],
    class_ids: Array.isArray(data.class_ids) ? data.class_ids.map(String) : [],
  };
}
