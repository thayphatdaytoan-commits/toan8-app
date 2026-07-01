const STUDENT_SESSION_KEY = 'thayphat_student_session_v2';
/** Giữ đăng nhập học sinh tối đa 14 ngày (tab máy dùng chung vẫn nên đăng xuất thủ công). */
const STUDENT_MAX_MS = 14 * 24 * 60 * 60 * 1000;

export function readStudentSession() {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(STUDENT_SESSION_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') return null;
    const name = String(obj.name || '').trim();
    const className = String(obj.className || '').trim();
    const gradeLevel = String(obj.gradeLevel || '8').trim();
    const loginAt = Number(obj.loginAt || 0);
    if (!name || !loginAt) return null;
    if (Date.now() - loginAt > STUDENT_MAX_MS) {
      clearStudentSession();
      return null;
    }
    return { name, className, gradeLevel, loginAt };
  } catch {
    return null;
  }
}

export function writeStudentSession({ name, className, gradeLevel }) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      STUDENT_SESSION_KEY,
      JSON.stringify({
        name: String(name || '').trim(),
        className: String(className || '').trim(),
        gradeLevel: String(gradeLevel || '8').trim(),
        loginAt: Date.now(),
      })
    );
  } catch {
    /* ignore */
  }
}

export function clearStudentSession() {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(STUDENT_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function touchStudentSession() {
  const s = readStudentSession();
  if (!s) return;
  writeStudentSession(s);
}
