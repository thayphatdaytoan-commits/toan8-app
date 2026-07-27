import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  linkWithPopup,
} from 'firebase/auth';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { auth, db, COLLECTION_STUDENTS, ensureLocalAuthPersistence, ensureAnonymousAuth } from './firebaseClient';
import { CLASS_OTHER_ID, normStudentName } from './classroomConstants';

/** Tên đăng nhập: viết liền, không khoảng trắng; so sánh không phân biệt hoa thường. */
export function normalizeUsername(raw) {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, '');
}

export function usernameKey(raw) {
  return normalizeUsername(raw).toLowerCase();
}

/**
 * Kiểm tra tên đăng nhập hợp lệ (nếu có nhập).
 * Cho phép chữ, số, @ . _ -
 */
export function validateUsernameFormat(raw) {
  const u = normalizeUsername(raw);
  if (!u) return { ok: true, username: '' };
  if (/\s/.test(String(raw || '').trim()) || String(raw || '').includes(' ')) {
    return { ok: false, error: 'Tên đăng nhập phải viết liền nhau, không có khoảng trắng (vd: Phat@xyz).' };
  }
  if (u.length < 3) return { ok: false, error: 'Tên đăng nhập tối thiểu 3 ký tự.' };
  if (u.length > 40) return { ok: false, error: 'Tên đăng nhập tối đa 40 ký tự.' };
  if (!/^[a-zA-Z0-9@._-]+$/.test(u)) {
    return { ok: false, error: 'Tên đăng nhập chỉ gồm chữ, số và ký tự @ . _ -' };
  }
  return { ok: true, username: u };
}

export function findStudentByUsername(allowedStudents, username) {
  const key = usernameKey(username);
  if (!key) return null;
  const list = Array.isArray(allowedStudents) ? allowedStudents : [];
  return (
    list.find((s) => usernameKey(s?.username) === key) ||
    list.find((s) => usernameKey(s?.email) === key) ||
    null
  );
}

/** Đăng nhập bằng tên đăng nhập hoặc Gmail → trả về email Firebase Auth. */
export function resolveLoginEmail(loginId, allowedStudents = []) {
  const id = String(loginId || '').trim();
  if (!id) return '';
  if (id.includes('@')) return id.toLowerCase();
  const row = findStudentByUsername(allowedStudents, id);
  if (row?.email) return String(row.email).trim().toLowerCase();
  return '';
}

function mapAuthError(err) {
  const code = String(err?.code || '');
  if (code === 'auth/popup-closed-by-user') return 'Bạn đã đóng cửa sổ đăng nhập.';
  if (code === 'auth/cancelled-popup-request') return 'Vui lòng thử lại sau khi cửa sổ đăng nhập đóng.';
  if (code === 'auth/popup-blocked') {
    return 'Trình duyệt chặn cửa sổ đăng nhập. Hãy cho phép popup hoặc thử lại (sẽ chuyển sang đăng nhập Google toàn trang).';
  }
  if (code === 'auth/email-already-in-use') return 'Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.';
  if (code === 'auth/weak-password') return 'Mật khẩu quá yếu (tối thiểu 6 ký tự).';
  if (code === 'auth/invalid-email') return 'Email không hợp lệ.';
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/user-not-found') {
    return 'Sai tên đăng nhập/email hoặc mật khẩu. Kiểm tra lại hoặc đăng ký tài khoản mới.';
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return 'Email đã dùng với phương thức đăng nhập khác. Hãy thử đăng nhập bằng Google.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Phương thức đăng nhập chưa được bật trên Firebase (Sign-in method).';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Domain chưa được phép trong Firebase Authentication → Settings → Authorized domains.';
  }
  if (code === 'auth/internal-error') {
    return 'Lỗi nội bộ Firebase Auth. Kiểm tra: (1) Google đã Enable + Save, (2) Authorized domains có thayphatdaytoan-7832c.web.app, (3) tắt chặn popup, hoặc thử đăng nhập lại.';
  }
  return err?.message || 'Không đăng ký/đăng nhập được. Vui lòng thử lại.';
}

function googleProvider() {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  p.addScope('email');
  p.addScope('profile');
  return p;
}

/**
 * Google: thoát anonymous trước → popup; nếu bị chặn thì redirect.
 */
export async function signInWithGoogleProvider() {
  await ensureLocalAuthPersistence();
  try {
    if (auth.currentUser?.isAnonymous) {
      await signOut(auth);
    }
    return await signInWithPopup(auth, googleProvider());
  } catch (err) {
    const code = String(err?.code || '');
    // Popup bị chặn / lỗi nội bộ → thử redirect (hoạt động tốt hơn khi nhúng iframe)
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/internal-error' ||
      code === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(auth, googleProvider());
      return null;
    }
    // Anonymous đã có session: thử link
    if (auth.currentUser?.isAnonymous && code === 'auth/credential-already-in-use') {
      try {
        return await linkWithPopup(auth.currentUser, googleProvider());
      } catch (e2) {
        throw new Error(mapAuthError(e2));
      }
    }
    throw new Error(mapAuthError(err));
  }
}

/** Gọi khi vào trang đăng ký/đăng nhập — lấy kết quả nếu vừa redirect từ Google. */
export async function consumeAuthRedirectResult() {
  await ensureLocalAuthPersistence();
  try {
    return await getRedirectResult(auth);
  } catch (err) {
    throw new Error(mapAuthError(err));
  }
}

export async function registerWithEmailPassword({ email, password, displayName }) {
  await ensureLocalAuthPersistence();
  try {
    if (auth.currentUser?.isAnonymous) {
      await signOut(auth);
    }
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const name = String(displayName || '').trim();
    if (name) await updateProfile(cred.user, { displayName: name });
    return cred;
  } catch (err) {
    throw new Error(mapAuthError(err));
  }
}

export async function loginWithEmailPassword({ email, password }) {
  await ensureLocalAuthPersistence();
  try {
    if (auth.currentUser?.isAnonymous) {
      await signOut(auth);
    }
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    throw new Error(mapAuthError(err));
  }
}

/**
 * Đăng nhập bằng tên đăng nhập hoặc Gmail + mật khẩu.
 * Nếu giáo viên đã đặt login_password trên hồ sơ → mật khẩu đó là chuẩn để đăng nhập.
 */
export async function loginWithStudentCredentials({ loginId, password, allowedStudents = [] }) {
  await ensureLocalAuthPersistence();
  const id = String(loginId || '').trim();
  const pwd = String(password || '');
  if (!id) throw new Error('Nhập tên đăng nhập hoặc Gmail để đăng nhập.');
  if (!pwd) throw new Error('Nhập mật khẩu.');

  const list = Array.isArray(allowedStudents) ? allowedStudents : [];
  let student = null;
  if (id.includes('@')) {
    const emailKey = id.toLowerCase();
    student =
      list.find((s) => String(s.email || '').trim().toLowerCase() === emailKey) ||
      findStudentByUsername(list, id);
  } else {
    student = findStudentByUsername(list, id);
  }

  const email = student?.email
    ? String(student.email).trim().toLowerCase()
    : id.includes('@')
      ? id.toLowerCase()
      : '';

  const rosterPassword =
    student && student.login_password != null && String(student.login_password) !== ''
      ? String(student.login_password)
      : null;

  const sessionFromStudent = (row) => ({
    name: row.name,
    className: row.class_label || '',
    gradeLevel: String(row.grade_level || '8').trim(),
  });

  // Giáo viên đã đặt/sửa mật khẩu trên hồ sơ → dùng mật khẩu này để đăng nhập
  if (student && rosterPassword != null) {
    if (rosterPassword !== pwd) {
      throw new Error('Sai tên đăng nhập/email hoặc mật khẩu. Kiểm tra lại với giáo viên.');
    }
    if (email) {
      try {
        if (auth.currentUser?.isAnonymous) await signOut(auth);
        const cred = await signInWithEmailAndPassword(auth, email, pwd);
        return { cred, session: sessionFromStudent(student) };
      } catch {
        // Firebase Auth chưa khớp mật khẩu mới — vẫn cho đăng nhập theo hồ sơ lớp
      }
    }
    await ensureAnonymousAuth();
    return { cred: { user: auth.currentUser }, session: sessionFromStudent(student) };
  }

  // Chưa có mật khẩu do giáo viên quản lý → đăng nhập Firebase Auth như cũ
  if (!email) {
    throw new Error('Không tìm thấy tài khoản với tên đăng nhập này. Thử Gmail hoặc đăng ký mới.');
  }
  try {
    if (auth.currentUser?.isAnonymous) await signOut(auth);
    const cred = await signInWithEmailAndPassword(auth, email, pwd);
    return {
      cred,
      session: resolveStudentSessionFromAllowedStudents(cred.user, list),
    };
  } catch (err) {
    throw new Error(mapAuthError(err));
  }
}

export function resolveStudentSessionFromAllowedStudents(firebaseUser, allowedStudents = []) {
  const uid = firebaseUser?.uid || '';
  const email = String(firebaseUser?.email || '').trim().toLowerCase();
  const displayName = String(firebaseUser?.displayName || '').trim();
  const list = Array.isArray(allowedStudents) ? allowedStudents : [];

  const byUid = uid ? list.find((s) => s.firebase_uid === uid) : null;
  const byEmail = email ? list.find((s) => String(s.email || '').trim().toLowerCase() === email) : null;
  const byName = displayName ? list.find((s) => normStudentName(s.name) === normStudentName(displayName)) : null;
  const existing = byUid || byEmail || byName;

  if (existing) {
    return {
      name: existing.name,
      className: existing.class_label || '',
      gradeLevel: String(existing.grade_level || '8').trim(),
    };
  }
  return { name: displayName || (email ? email.split('@')[0] : 'Học sinh'), className: '', gradeLevel: '8' };
}

/**
 * Tạo hoặc cập nhật hồ sơ học sinh tự đăng ký trong allowed_students_v2.
 * @returns {{ name: string, className: string, gradeLevel: string }}
 */
export async function upsertSelfRegisteredStudent({ firebaseUser, profile, allowedStudents = [] }) {
  const email = String(profile.email || firebaseUser?.email || '').trim().toLowerCase();
  const uid = firebaseUser?.uid || '';
  const name = String(profile.fullName || firebaseUser?.displayName || '').trim();
  const phone = String(profile.phone || '').trim();
  const school = String(profile.school || '').trim();
  const gradeLevel = String(profile.gradeLevel || '8').trim();
  const classLabel = String(profile.classLabel || '').trim();
  const loginPassword = profile.loginPassword != null ? String(profile.loginPassword) : '';

  if (!name) throw new Error('Nhập họ và tên.');

  const formatCheck = validateUsernameFormat(profile.username);
  if (!formatCheck.ok) throw new Error(formatCheck.error);

  // Mặc định tên đăng nhập = Gmail nếu không nhập
  let username = formatCheck.username || (email ? email : '');
  if (!username) throw new Error('Cần tên đăng nhập hoặc email.');

  const list = Array.isArray(allowedStudents) ? allowedStudents : [];
  const byUid = uid ? list.find((s) => s.firebase_uid === uid) : null;
  const byEmail = email
    ? list.find((s) => String(s.email || '').trim().toLowerCase() === email)
    : null;
  const byName = list.find((s) => normStudentName(s.name) === normStudentName(name));
  const existing = byUid || byEmail || byName;

  const taken = findStudentByUsername(list, username);
  if (taken && (!existing || taken.id !== existing.id)) {
    throw new Error('Tên đăng nhập đã được sử dụng. Hãy chọn tên khác.');
  }

  const providerId = firebaseUser?.providerData?.[0]?.providerId || 'password';

  if (existing?.id) {
    const patch = {
      email: email || existing.email || '',
      phone: phone || existing.phone || '',
      username: username || existing.username || existing.email || '',
      school: school || existing.school || '',
      firebase_uid: uid || existing.firebase_uid || '',
      auth_provider: providerId,
      grade_level: existing.grade_level || gradeLevel,
      class_label: existing.class_label || classLabel || '',
      self_registered: true,
      updated_at: Date.now(),
    };
    if (loginPassword) patch.login_password = loginPassword;
    if (existing.account_type == null && existing.is_vip == null) {
      patch.account_type = 'free';
      patch.is_vip = false;
    }
    await updateDoc(doc(db, COLLECTION_STUDENTS, existing.id), patch);
    return {
      name: existing.name,
      className: existing.class_label || classLabel || '',
      gradeLevel: String(existing.grade_level || gradeLevel).trim(),
    };
  }

  const docPayload = {
    name,
    email,
    phone,
    username,
    school,
    firebase_uid: uid,
    auth_provider: providerId,
    grade_level: gradeLevel,
    class_id: CLASS_OTHER_ID,
    class_label: classLabel,
    account_type: 'free',
    is_vip: false,
    self_registered: true,
    created_at: Date.now(),
    updated_at: Date.now(),
  };
  if (loginPassword) docPayload.login_password = loginPassword;

  await addDoc(collection(db, COLLECTION_STUDENTS), docPayload);

  return { name, className: classLabel, gradeLevel };
}
