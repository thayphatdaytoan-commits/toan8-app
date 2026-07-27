import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/** Cấu hình lấy từ Firebase Console → Project settings → Your apps → Config */
const firebaseConfig = {
  apiKey: 'AIzaSyBdQ11EDhwa46SdlrAHK71_7wEPja7ZqIM',
  authDomain: 'thayphatdaytoan-7832c.firebaseapp.com',
  databaseURL: 'https://thayphatdaytoan-7832c-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'thayphatdaytoan-7832c',
  storageBucket: 'thayphatdaytoan-7832c.firebasestorage.app',
  messagingSenderId: '249059029216',
  appId: '1:249059029216:web:2228f7c78483628e0ba085',
  measurementId: 'G-M1XZTB1SEY',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

export const COLLECTION_SCORES = 'math_quiz_scores_v2';
export const COLLECTION_STUDENTS = 'allowed_students_v2';
export const COLLECTION_QUIZZES = 'math_quizzes_v2';
export const COLLECTION_LESSONS = 'math_lessons_v2';
export const COLLECTION_CUSTOM_MATH_TOPICS = 'custom_math_topics_v1';
export const COLLECTION_CLASSES = 'school_classes_v1';
/** Đăng ký học thử từ form trang chủ */
export const COLLECTION_TRIAL_REGISTRATIONS = 'trial_registrations_v1';
/** CMS nội dung trang chủ (document id: main) */
export const COLLECTION_SITE_HOMEPAGE = 'site_homepage_v1';
/** Hỏi đáp cộng đồng */
export const COLLECTION_COMMUNITY_QUESTIONS = 'community_questions_v1';
/** Đố vui mỗi tuần */
export const COLLECTION_WEEKLY_CONTESTS = 'weekly_contests_v1';
/** Bài làm đố vui */
export const COLLECTION_CONTEST_SUBMISSIONS = 'contest_submissions_v1';
/** Tin tức / blog liên quan đố vui */
export const COLLECTION_CONTEST_NEWS = 'contest_news_v1';
/** Blog Toán học */
export const COLLECTION_BLOG_POSTS = 'math_blog_posts_v1';
/** Tài liệu (link nhúng theo thư mục) */
export const COLLECTION_SITE_DOCUMENTS = 'math_site_documents_v1';
/** Ngưỡng Level học sinh theo EXP (doc id: main) */
export const COLLECTION_STUDENT_LEVEL_CONFIG = 'student_level_config_v1';
/** Điểm danh theo lớp / ngày / buổi */
export const COLLECTION_CLASS_ATTENDANCE = 'class_attendance_v1';
/** Thời khóa biểu theo tuần */
export const COLLECTION_CLASS_TIMETABLE = 'class_timetable_v1';
/** Phiếu học phí theo tháng */
export const COLLECTION_CLASS_TUITION = 'class_tuition_v1';
/** Cài đặt học phí (QR ngân hàng…) */
export const COLLECTION_CLASS_TUITION_SETTINGS = 'class_tuition_settings_v1';
/** Phiếu nhận xét tuần/tháng */
export const COLLECTION_CLASS_FEEDBACK = 'class_feedback_v1';
/** Bài tập về nhà theo lớp */
export const COLLECTION_CLASS_HOMEWORK = 'class_homework_v1';
/** Thông báo gửi đến học sinh */
export const COLLECTION_STUDENT_NOTIFICATIONS = 'student_notifications_v1';
/** Tài khoản admin / giáo viên */
export const COLLECTION_ADMIN_STAFF = 'admin_staff_v1';
export { HOMEPAGE_DOC_ID } from './homepage/defaultHomepageContent';
export { LEVEL_CONFIG_DOC_ID } from './studentLevelConfig';

let localPersistenceReady = null;
let authReadyPromise = null;

/** Persistence lâu dài — bắt buộc để Google/Email còn phiên sau F5 / redirect. */
export function ensureLocalAuthPersistence() {
  if (!localPersistenceReady) {
    localPersistenceReady = setPersistence(auth, browserLocalPersistence).catch((err) => {
      localPersistenceReady = null;
      throw err;
    });
  }
  return localPersistenceReady;
}

/**
 * Đảm bảo có request.auth để đọc Firestore (khách).
 * Không ghi đè nếu đã đăng nhập Google/Email.
 */
export function ensureAnonymousAuth() {
  if (!authReadyPromise) {
    authReadyPromise = (async () => {
      await ensureLocalAuthPersistence();
      const u = auth.currentUser;
      if (u) return u;
      await signInAnonymously(auth);
      return auth.currentUser;
    })().catch((err) => {
      authReadyPromise = null;
      throw err;
    });
  }
  return authReadyPromise;
}
