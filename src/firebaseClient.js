import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, setPersistence, inMemoryPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBdQ11EDhwa46SdlrAHK71_7wEPja7ZqIM',
  authDomain: 'thayphatdaytoan-7832c.firebaseapp.com',
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

let authReadyPromise = null;

/** Đăng nhập ẩn danh một lần — gọi sớm từ main.jsx khi mở link bài giảng. */
export function ensureAnonymousAuth() {
  if (!authReadyPromise) {
    authReadyPromise = (async () => {
      await setPersistence(auth, inMemoryPersistence);
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      return auth.currentUser;
    })().catch((err) => {
      authReadyPromise = null;
      throw err;
    });
  }
  return authReadyPromise;
}
