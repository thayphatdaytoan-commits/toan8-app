/* eslint-disable */
import SeoHead from './seo/SeoHead.jsx';
import React, { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from'react';

function lazyWithRetry(factory, name) {
  return lazy(async () => {
    const key = `chunkRetry:${name}`;
    try {
      const mod = await factory();
      try { sessionStorage.removeItem(key); } catch {}
      return mod;
    } catch (err) {
      const msg = String(err && (err.message || err));
      const isChunkErr = /Failed to fetch dynamically imported module|Loading chunk|Importing a module script failed|MIME type/.test(msg);
      if (!isChunkErr) throw err;
      let already = false;
      try { already = sessionStorage.getItem(key) === '1'; } catch {}
      if (already) throw err;
      try { sessionStorage.setItem(key, '1'); } catch {}
      try {
        if (typeof window !== 'undefined' && 'caches' in window) {
          const names = await window.caches.keys();
          await Promise.all(names.map((n) => window.caches.delete(n)));
        }
      } catch {}
      try { window.location.reload(); } catch {}
      return new Promise(() => {});
    }
  });
}

const PublicLandingScreen = lazyWithRetry(() => import('./PublicLandingScreen'), 'PublicLandingScreen');
const StudentDashboardScreen = lazyWithRetry(() => import('./StudentDashboardScreen'), 'StudentDashboardScreen');
const StudentLessonViewer = lazyWithRetry(() => import('./StudentLessonViewer'), 'StudentLessonViewer');
import { getSiteOrigin } from './seo/siteConfig';
import { parseLessonsFromText, lessonFieldsFromImportMeta } from'./LessonParser';
import {
  parseLessonContentObject,
  mergeLessonContentString,
  emptyPracticeTemplate,
  DEFAULT_LESSON_MATERIALS_JSON,
} from './lessonContentAdminUtils';
import {
  parseQuestionsFromText,
  groupQuizImportErrors,
  validateQuizQuestionsAdmin,
} from './quizImportParser';
import { RichMathContent } from './RichMathContent';
import { User, Lock, Award, ListOrdered, CheckCircle, XCircle, ArrowRight, ShieldCheck, AlertTriangle, Settings, Users, FileText, LogOut, Plus, Trash2, Edit2, Save, Camera, Image as ImageIcon, Eye, Upload, Lightbulb, ArrowLeft, Clock, PlayCircle, BookOpen, Filter, FileEdit, Video, Play, BookText, Home, Trophy, Sparkles, Star, Target, Heart, Link2, Network, Map as MapIcon } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, onSnapshot, addDoc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  auth,
  db,
  storage,
  COLLECTION_SCORES,
  COLLECTION_STUDENTS,
  COLLECTION_QUIZZES,
  COLLECTION_LESSONS,
  ensureAnonymousAuth,
} from './firebaseClient';
import {
  readLessonDeepLinkFromLocation,
  findLessonInList,
  fetchLessonForDeepLink,
} from './lessonDeepLink';
import mammoth from'mammoth';
import { compressImageFileToJpegBlob, applyAdminSnippetByKey } from './adminImageUpload';
import { LessonFormattingToolbar } from './LessonFormattingToolbar';
import { computeAutoGradedScore, DEFAULT_PART_POINTS, formatScoreForDisplay, normalizePartPoints } from './quizScoring';
import { slugifyVi, buildLessonSlug, ensureUniqueLessonSlug } from './lessonSlug';
import LessonSeoAdminPanel from './LessonSeoAdminPanel';
import { listExistingTopics, slugifyTopicId } from './topics';
import BackButton from './BackButton';
import { clearStudentSession, readStudentSession, touchStudentSession, writeStudentSession } from './studentSession';
import {
  COLLECTION_QUESTION_BANK,
  COG_LEVEL,
  COG_LEVEL_LABEL,
  QUESTION_TYPE,
  QUESTION_TYPE_LABEL,
  emptyBankQuestionDraft,
  normalizeTopicTags,
} from './questionBank';
import { bankQuestionToQuizQuestion } from './questionBank';
import { pickQuestionsByRows, randomizeOrder } from './matrixGenerator';
import MatrixModal from './components/MatrixModal';
import MindMapAdminTab from './mindMap/MindMapAdminTab';
import { COLLECTION_MINDMAP_G9 } from './mindMap/mindMapConstants';
import { COLLECTION_REVIEW_COURSES, COLLECTION_REVIEW_PROGRESS } from './chuyenDeOnTap/chuyenDeOnTapConstants';
import {
  reviewProgressDocId,
  sanitizeReviewProgressPayload,
} from './chuyenDeOnTap/chuyenDeOnTapProgressFirestore';
import ChuyenDeOnTapAdminPanel from './chuyenDeOnTap/ChuyenDeOnTapAdminPanel';
import math11KnowledgeRaw from './assets/math11-knowledge.txt?raw';
import mathCurriculumGdpt2018Raw from './assets/math-curriculum-gdpt2018.txt?raw';
import { parseMathKnowledgeTxt, parseMathKnowledgeTxtForGrade, knowledgeTopicMatches } from './knowledgeTags';

/** Trang chủ nội bộ theo khối đang xem (menu Trang chủ trên trang bài học). */
function publicGradeHomeUrl(grade) {
  const g = String(grade ?? '11').trim() || '11';
  return `${getSiteOrigin()}/?grade=${encodeURIComponent(g)}`;
}

/** LaTeX ($...$) + ảnh: ![alt](url) hoặc <img src="..." /> */
function MathContent({ text, className, inlineImage = false }) {
  return <RichMathContent text={text} className={className} inlineImage={inlineImage} />;
}

function normalizeShortAnswerText(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/,/g, '.');
}

function shortAnswerIsCorrect(userInput, shortCorrect) {
  const u = normalizeShortAnswerText(userInput);
  if (!u) return false;
  const variants = String(shortCorrect || '')
    .split('|')
    .map((x) => normalizeShortAnswerText(x))
    .filter(Boolean);
  return variants.some((v) => u === v);
}

function tfAnswersComplete(q, value) {
  const items = q.tfItems || [];
  if (!items.length) return false;
  const obj = value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  if (!obj) return false;
  return items.every((it) => typeof obj[it.key] === 'boolean');
}

function isQuizQuestionAnswered(q, answers, essayImages) {
  const t = q.type || 'multiple_choice';
  if (t === 'multiple_choice') return answers[q.id] !== undefined;
  if (t === 'true_false_group') return tfAnswersComplete(q, answers[q.id]);
  if (t === 'short_answer') return String(answers[q.id] || '').trim().length > 0;
  if (t === 'essay') return !!essayImages[q.id];
  return false;
}

// DANH SÁCH ĐỀ THI MẪU (Dùng để khởi tạo dữ liệu ban đầu)
const SAMPLE_QUIZZES = [
  {
    title: 'BÀI TEST PHƯƠNG TRÌNH (CƠ BẢN)',
    duration: 15,
    questions: [
{ id:'q1', type: 'multiple_choice', question: "Bài 1: Một người đi xe đạp trong hai ngày đã đi được tổng cộng 70 km. Biết rằng ngày thứ hai người đó đi được nhiều hơn ngày thứ nhất là 10 km. Hỏi người đó đã đi được bao nhiêu km trong ngày thứ nhất?", options: ["20 km", "30 km", "40 km", "50 km"], correctAnswer: 1, explanation: "Gọi quãng đường ngày 1 là x. Ta có phương trình: x + (x + 10) = 70 ⇔ 2x = 60 ⇔ x = 30." }
    ]
  }
];

function normalizeAppPathname(pathname) {
  const raw = String(pathname || '/');
  return raw.replace(/\/+$/, '') || '/';
}

function isAdminLoginUrlPath(pathname) {
  const p = normalizeAppPathname(pathname);
  return p === '/admin' || p === '/admin/login';
}

const ADMIN_SESSION_KEY = 'thayphat_admin_session_v2';
const ADMIN_IDLE_MS = 60 * 60 * 1000;
const ADMIN_MAX_MS = 12 * 60 * 60 * 1000;

function readAdminSession() {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') return null;
    const loginAt = Number(obj.loginAt || 0);
    const lastActiveAt = Number(obj.lastActiveAt || 0);
    if (!loginAt || !lastActiveAt) return null;
    return { loginAt, lastActiveAt };
  } catch {
    return null;
  }
}
function isAdminSessionValid(s, now = Date.now()) {
  if (!s) return false;
  if (now - s.loginAt > ADMIN_MAX_MS) return false;
  if (now - s.lastActiveAt > ADMIN_IDLE_MS) return false;
  return true;
}
function readAdminSessionFlag() {
  const s = readAdminSession();
  if (!isAdminSessionValid(s)) {
    if (s) clearAdminSession();
    return false;
  }
  return true;
}
function writeAdminSessionLogin() {
  try {
    if (typeof window === 'undefined') return;
    const now = Date.now();
    window.localStorage.setItem(
      ADMIN_SESSION_KEY,
      JSON.stringify({ loginAt: now, lastActiveAt: now }),
    );
  } catch {
    /* ignore */
  }
}
function touchAdminSession() {
  try {
    if (typeof window === 'undefined') return false;
    const s = readAdminSession();
    if (!isAdminSessionValid(s)) return false;
    window.localStorage.setItem(
      ADMIN_SESSION_KEY,
      JSON.stringify({ loginAt: s.loginAt, lastActiveAt: Date.now() }),
    );
    return true;
  } catch {
    return false;
  }
}
function clearAdminSession() {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
function writeAdminSessionFlag(on) {
  if (on) writeAdminSessionLogin();
  else clearAdminSession();
}

/** Đọc deep link bài giảng từ URL (path /bai-giang/... hoặc ?lessonId=). */
function LessonDeepLinkSplash() {
  return (
    <div className="w-full max-w-lg mx-auto my-8 md:my-16 flex flex-col items-center justify-center py-16 px-6 text-slate-600 gap-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
      <span className="inline-block w-11 h-11 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      <div className="text-center">
        <p className="text-base font-bold text-slate-800">Đang mở bài giảng…</p>
        <p className="text-sm text-slate-500 mt-1">Vui lòng đợi trong giây lát</p>
      </div>
    </div>
  );
}

export default function App() {
  const [appState, setAppState] = useState(() => {
    try {
      if (typeof window !== 'undefined' && readAdminSessionFlag()) return 'admin';
      if (typeof window !== 'undefined' && isAdminLoginUrlPath(window.location.pathname)) return 'login';
    } catch {
      /* ignore */
    }
    return 'dashboard';
  });
  const [locationKey, setLocationKey] = useState(0);
const VALID_PUBLIC_GRADES = new Set(['6', '7', '8', '9', '10', '11', '12']);
function normStudentName(s) {
  return (s || '').trim().toLowerCase();
}
const [publicGrade, setPublicGrade] = useState(() => {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('grade');
  if (fromUrl && VALID_PUBLIC_GRADES.has(fromUrl)) return fromUrl;
  try {
    const fromStorage = localStorage.getItem('publicGrade');
    if (fromStorage && VALID_PUBLIC_GRADES.has(fromStorage)) return fromStorage;
  } catch {
    // ignore
  }
  return '11';
});
  const [pendingQuizId, setPendingQuizId] = useState(null);
const [studentName, setStudentName] = useState(() => readStudentSession()?.name || '');
const [studentClass, setStudentClass] = useState(() => readStudentSession()?.className || '');
  const [postLoginTab, setPostLoginTab] = useState(null);
  const [teacherDefaultGrade, setTeacherDefaultGrade] = useState(null);

  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null); // Trạng thái xem bài giảng
const [pendingOpen, setPendingOpen] = useState(null); // { quizId?: string } | { category: string }
  const initialLessonDeepLink = (() => {
    try {
      return readLessonDeepLinkFromLocation(window.location);
    } catch {
      return { lessonId: null, slug: null, active: false };
    }
  })();
  const [pendingLessonId, setPendingLessonId] = useState(initialLessonDeepLink.lessonId);
  const [pendingLessonSlug, setPendingLessonSlug] = useState(initialLessonDeepLink.slug);
  const [lessonDeepLinkLoading, setLessonDeepLinkLoading] = useState(initialLessonDeepLink.active);
  /** Khi mở link bài giảng: chỉ tải bài đó trước, hoãn các collection nặng khác. */
  const [deferBulkFirestore, setDeferBulkFirestore] = useState(initialLessonDeepLink.active);
  const resumeLessonPapersTabRef = useRef(false);
  const dashboardNavRef = useRef(null);
  const appNavStackRef = useRef([]);
// States chứa dữ liệu từ Server
  const [scoresList, setScoresList] = useState([]);
  const [allowedStudents, setAllowedStudents] = useState([]);
  const [quizzesList, setQuizzesList] = useState([]);
  const [lessonsList, setLessonsList] = useState([]); // Danh sách bài giảng
  const [questionBank, setQuestionBank] = useState([]);
  const [mindMapCategories, setMindMapCategories] = useState([]);
  const [reviewCoursesList, setReviewCoursesList] = useState([]);
  const [reviewProgressList, setReviewProgressList] = useState([]);

  const rosterGrade = useMemo(() => {
    if (!studentName) return '8';
    const row = allowedStudents.find((s) => normStudentName(s?.name) === normStudentName(studentName));
    if (row?.grade_level && VALID_PUBLIC_GRADES.has(String(row.grade_level).trim())) return String(row.grade_level).trim();
    if (typeof window !== 'undefined' && window.currentStudentGrade && VALID_PUBLIC_GRADES.has(String(window.currentStudentGrade).trim())) {
      return String(window.currentStudentGrade).trim();
    }
    return '8';
  }, [allowedStudents, studentName]);

  const studentQuizzesFiltered = useMemo(
    () => quizzesList.filter((q) => q.grade_level === rosterGrade || !q.grade_level),
    [quizzesList, rosterGrade]
  );
  const sortedStudentQuizzes = useMemo(
    () => [...studentQuizzesFiltered].sort((a, b) => (a.title || '').localeCompare(b.title || '', 'vi')),
    [studentQuizzesFiltered]
  );
  const studentLessonsFiltered = useMemo(
    () => lessonsList.filter((l) => l.grade_level === rosterGrade || !l.grade_level),
    [lessonsList, rosterGrade]
  );

  const activeQuiz = quizzesList.find(q => q.id === selectedQuizId);

  const [currentScore, setCurrentScore] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState({});
  const [studentEssayImages, setStudentEssayImages] = useState({});

  const [user, setUser] = useState(null);
  const ADMIN_PASSWORD = 'Phat@210196';

  const setUrlParamSafe = useCallback((patch, mode = 'push') => {
    try {
      const u = new URL(window.location.href);
      Object.entries(patch || {}).forEach(([k, v]) => {
        if (v === undefined || v === null || String(v).trim() === '') u.searchParams.delete(k);
        else u.searchParams.set(k, String(v));
      });
      if (mode === 'replace') window.history.replaceState({}, '', u.toString());
      else window.history.pushState({}, '', u.toString());
      setLocationKey((k) => k + 1);
    } catch {
      // ignore
    }
  }, []);

  const setUrlPathSafe = useCallback((pathname, mode = 'push') => {
    try {
      const u = new URL(window.location.href);
      const nextPath = pathname && String(pathname).startsWith('/') ? String(pathname) : '/';
      u.pathname = nextPath;
      if (mode === 'replace') window.history.replaceState({}, '', u.toString());
      else window.history.pushState({}, '', u.toString());
      setLocationKey((k) => k + 1);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const onPop = () => setLocationKey((k) => k + 1);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    const dl = readLessonDeepLinkFromLocation(window.location);
    setPendingLessonId(dl.lessonId);
    setPendingLessonSlug(dl.slug);
    setLessonDeepLinkLoading(dl.active);
  }, [locationKey]);

  useEffect(() => {
    const s = readStudentSession();
    if (s?.gradeLevel) window.currentStudentGrade = s.gradeLevel;
    if (!s?.name) return;
    touchStudentSession();
    setAppState((prev) => {
      if (prev === 'admin') return prev;
      if (prev === 'login' && !isAdminLoginUrlPath(window.location.pathname)) return 'dashboard';
      return prev;
    });
  }, []);

  useEffect(() => {
    if (!studentName || allowedStudents.length === 0) return;
    const ok = allowedStudents.some((s) => normStudentName(s?.name) === normStudentName(studentName));
    if (!ok) {
      clearStudentSession();
      setStudentName('');
      setStudentClass('');
      try {
        delete window.currentStudentGrade;
      } catch {
        /* ignore */
      }
    }
  }, [allowedStudents, studentName]);

  useEffect(() => {
    if (appState !== 'admin') return;
    let lastTouchAt = 0;
    const touch = () => {
      const now = Date.now();
      if (now - lastTouchAt < 30 * 1000) return;
      lastTouchAt = now;
      const ok = touchAdminSession();
      if (!ok) {
        clearAdminSession();
        setAppState('login');
      }
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'visibilitychange'];
    events.forEach((ev) => window.addEventListener(ev, touch, { passive: true }));
    const tick = setInterval(() => {
      const s = readAdminSession();
      if (!isAdminSessionValid(s)) {
        clearAdminSession();
        setAppState('login');
      }
    }, 60 * 1000);
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, touch));
      clearInterval(tick);
    };
  }, [appState]);

  const catalogRoute = useMemo(() => {
    try {
      const p = String(window.location.pathname || '/');
      const m = p.match(/^\/lop\/(\d{1,2})(?:\/chuong\/([^\/?#]+)(?:\/bai\/([^\/?#]+))?)?\/?$/i);
      if (!m) return null;
      return {
        grade: m[1],
        chapterSlug: m[2] ? decodeURIComponent(m[2]) : '',
        lessonNoSlug: m[3] ? decodeURIComponent(m[3]) : '',
      };
    } catch {
      return null;
    }
  }, [locationKey]);

  /** URL cố định: /admin/login (hoặc /admin) → màn đăng nhập + mở sẵn khu giáo viên */
  const adminLoginRouteActive = useMemo(() => {
    try {
      return typeof window !== 'undefined' && isAdminLoginUrlPath(window.location.pathname);
    } catch {
      return false;
    }
  }, [locationKey]);

  useEffect(() => {
    try {
      if (!adminLoginRouteActive) return;
      setAppState((prev) => (prev === 'admin' ? prev : 'login'));
    } catch {
      /* ignore */
    }
  }, [adminLoginRouteActive, locationKey]);

  /** Chuẩn hoá URL: /admin → /admin/login (một đường dẫn để lưu / chia sẻ) */
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (normalizeAppPathname(window.location.pathname) === '/admin') setUrlPathSafe('/admin/login', 'replace');
    } catch {
      /* ignore */
    }
  }, [locationKey, setUrlPathSafe]);

  useEffect(() => {
    if (!catalogRoute?.grade) return;
    // Đồng bộ grade dropdown với trang danh mục
    if (catalogRoute.grade !== publicGrade) setPublicGrade(catalogRoute.grade);
  }, [catalogRoute?.grade]);

  const openCatalog = useCallback(
    ({ grade, chapterSlug, lessonNoSlug }, mode = 'push') => {
      const g = String(grade || publicGrade || '11').trim();
      const ch = (chapterSlug || '').trim();
      const bn = (lessonNoSlug || '').trim();
      const path = bn
        ? `/lop/${g}/chuong/${encodeURIComponent(ch)}/bai/${encodeURIComponent(bn)}`
        : ch
          ? `/lop/${g}/chuong/${encodeURIComponent(ch)}`
          : `/lop/${g}`;
      setUrlPathSafe(path, mode);
      setUrlParamSafe({ grade: g }, 'replace');
    },
    [publicGrade, setUrlParamSafe, setUrlPathSafe]
  );

  function CatalogScreen({ route }) {
    const g = String(route?.grade || publicGrade || '11').trim();
    const chSlug = String(route?.chapterSlug || '').trim();
    const bnSlug = String(route?.lessonNoSlug || '').trim();

    const lessons = (lessonsList || []).filter((l) => {
      if (String(l.grade_level || '').trim() !== g) return false;
      if (chSlug && slugifyVi(l.chapter) !== chSlug) return false;
      if (bnSlug && slugifyVi(l.lesson_no) !== bnSlug) return false;
      return true;
    });

    const quizzes = (quizzesList || []).filter((q) => {
      if (String(q.grade_level || '').trim() !== g) return false;
      const qc = slugifyVi(q.chapter);
      const qn = slugifyVi(q.lesson_no);
      if (chSlug && qc !== chSlug) return false;
      if (bnSlug && qn !== bnSlug) return false;
      return true;
    });

    const label = bnSlug
      ? `Toán ${g} · Chương ${chSlug} · Bài ${bnSlug}`
      : chSlug
        ? `Toán ${g} · Chương ${chSlug}`
        : `Toán ${g}`;

    return (
      <div className="w-full max-w-6xl my-4 md:my-8 animate-in fade-in">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Danh mục</p>
            <h2 className="font-display text-xl md:text-2xl font-black text-slate-900 truncate">{label}</h2>
              <p className="text-sm text-slate-600 mt-1">
                Tổng hợp <strong>{lessons.length}</strong> bài giảng và <strong>{quizzes.length}</strong> đề liên quan để Google dễ index theo cụm chủ đề.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => openCatalog({ grade: g }, 'push')}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-sm"
              >
                /lop/{g}
              </button>
              {chSlug ? (
                <button
                  type="button"
                  onClick={() => openCatalog({ grade: g, chapterSlug: chSlug }, 'push')}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-sm"
                >
                  /chuong/{chSlug}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => openCatalog({ grade: g }, 'push')}
                className="px-3 py-2 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 font-black text-sm text-blue-700"
              >
                Đổi khối
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
            <h3 className="font-black text-slate-900 mb-3 flex items-center gap-2">
              <BookOpen className="text-teal-600" size={20} /> Bài giảng
            </h3>
            {lessons.length === 0 ? (
              <p className="text-sm text-slate-500 italic">Chưa có bài giảng phù hợp.</p>
            ) : (
              <div className="space-y-2">
                {lessons
                  .slice()
                  .sort((a, b) => String(a.lesson_no || '').localeCompare(String(b.lesson_no || ''), 'vi'))
                  .map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => openLessonById(l.id, 'push')}
                      className="w-full text-left rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/60 px-4 py-3 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-500">
                            Chương {l.chapter} · Bài {l.lesson_no}
                          </p>
                          <p className="font-bold text-slate-900 truncate">{l.title}</p>
                          {(l.description || '').toString().trim() ? (
                            <p className="text-xs text-slate-600 line-clamp-2 mt-1">{String(l.description).trim()}</p>
                          ) : null}
                        </div>
                        <span className="text-xs font-black text-teal-700 bg-teal-100 px-2 py-1 rounded-lg shrink-0">
                          /bai-giang/{l.slug || buildLessonSlug(l)}
                        </span>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
            <h3 className="font-black text-slate-900 mb-3 flex items-center gap-2">
              <FileText className="text-indigo-600" size={20} /> Đề liên quan
            </h3>
            {quizzes.length === 0 ? (
              <p className="text-sm text-slate-500 italic">Chưa có đề thi phù hợp.</p>
            ) : (
              <div className="space-y-2">
                {quizzes
                  .slice()
                  .sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'vi'))
                  .map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => openQuizById(q.id)}
                      className="w-full text-left rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/60 px-4 py-3 transition-colors"
                    >
                      <p className="text-xs font-bold text-slate-500">
                        {q.exam_type ? String(q.exam_type).toUpperCase() : 'ĐỀ'} · {q.duration || 15} phút · {q.questions?.length || 0} câu
                      </p>
                      <p className="font-bold text-slate-900">{q.title}</p>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const pushAppNav = useCallback(() => {
    appNavStackRef.current.push({
      appState,
      selectedLessonId: selectedLesson?.id ?? null,
      selectedQuizId,
      postLoginTab,
      dashboard: dashboardNavRef.current?.getSnapshot?.() ?? null,
    });
  }, [appState, selectedLesson, selectedQuizId, postLoginTab]);

  const restoreAppNav = useCallback(
    (prev) => {
      if (!prev) {
        handleBackToDashboard();
        return;
      }
      dashboardNavRef.current?.restore?.(prev.dashboard);
      setPostLoginTab(prev.postLoginTab ?? null);
      if (prev.appState === 'lesson_viewer' && prev.selectedLessonId) {
        const found = lessonsList.find((l) => l.id === prev.selectedLessonId);
        setSelectedLesson(found || null);
        setSelectedQuizId(null);
        setAppState(found ? 'lesson_viewer' : 'dashboard');
      } else if (prev.appState === 'quiz' && prev.selectedQuizId) {
        setSelectedQuizId(prev.selectedQuizId);
        setSelectedLesson(null);
        setAppState('quiz');
      } else {
        setSelectedLesson(null);
        setSelectedQuizId(null);
        setAppState('dashboard');
      }
    },
    [lessonsList]
  );

  const handleBackToDashboard = () => {
    setCurrentScore(0);
    setStudentAnswers({});
    setStudentEssayImages({});
    setSelectedQuizId(null);
    setSelectedLesson(null);
    setAppState('dashboard');
    setUrlParamSafe({ lessonId: null, quizId: null, category: null, level: null }, 'replace');
    setUrlPathSafe('/', 'replace');
  };

  const handleStudentGoBack = useCallback(() => {
    if (appState === 'result') {
      appNavStackRef.current = [];
      setPostLoginTab('exams');
      handleBackToDashboard();
      return;
    }
    if (appState === 'dashboard') {
      dashboardNavRef.current?.goBack?.();
      return;
    }
    const prev = appNavStackRef.current.pop();
    if (prev) {
      restoreAppNav(prev);
      return;
    }
    handleBackToDashboard();
  }, [appState, restoreAppNav]);

  const openLessonById = useCallback(
    (lessonId, mode = 'push', { pushNav = true } = {}) => {
      if (!lessonId) return;
      const found = lessonsList.find((l) => l.id === lessonId);
      if (found) {
        if (pushNav) pushAppNav();
        setSelectedLesson(found);
        setSelectedQuizId(null);
        setAppState('lesson_viewer');
        const slug = found.slug || buildLessonSlug(found);
        setUrlPathSafe(`/bai-giang/${slug}`, mode);
        setUrlParamSafe({ lessonId }, 'replace'); // giữ tương thích
      } else {
        if (pushNav) pushAppNav();
        setPendingLessonId(lessonId);
        setUrlParamSafe({ lessonId }, mode);
      }
    },
    [lessonsList, setUrlParamSafe, setUrlPathSafe, pushAppNav]
  );

  const openQuizById = useCallback(
    (id, { pushNav = true } = {}) => {
      if (pushNav) pushAppNav();
      setSelectedQuizId(id);
      setSelectedLesson(null);
      setAppState('quiz');
    },
    [pushAppNav]
  );

  useEffect(() => {
    // Mở đề theo URL: ?quizId=... hoặc ?category=dang2
    try {
      const params = new URLSearchParams(window.location.search);
      const quizId = params.get('quizId');
      const category = params.get('category');
      if (quizId) setPendingOpen({ quizId });
      else if (category) setPendingOpen({ category });
    } catch {
      // ignore
    }
  }, [locationKey]);

  useEffect(() => {
    try {
      localStorage.setItem('publicGrade', publicGrade);
    } catch {
      // ignore
    }
  }, [publicGrade]);

  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      if (u.searchParams.get('grade') === publicGrade) return;
      u.searchParams.set('grade', publicGrade);
      window.history.replaceState({}, '', u.toString());
    } catch {
      // ignore
    }
  }, [publicGrade]);

  useEffect(() => {
    ensureAnonymousAuth().catch((error) => {
      console.error('Lỗi xác thực Firebase:', error);
    });
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubs = [];

    const subscribeLessons = () =>
      onSnapshot(
        collection(db, COLLECTION_LESSONS),
        (snapshot) => {
          setLessonsList(
            snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.timestamp - a.timestamp)
          );
        },
        (err) => {
          console.error('Lỗi tải bài giảng (Firestore):', err);
        }
      );

    const subscribeQuizzes = () =>
      onSnapshot(
        collection(db, COLLECTION_QUIZZES),
        (snapshot) => {
          setQuizzesList(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.title.localeCompare(b.title)));
        },
        (err) => {
          console.error('Lỗi tải đề thi (Firestore):', err);
        }
      );

    if (deferBulkFirestore) {
      return () => {};
    }

    unsubs.push(
        onSnapshot(
          collection(db, COLLECTION_SCORES),
          (snapshot) => {
            setScoresList(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.score - a.score));
          },
          (err) => {
            console.error('Lỗi tải điểm (Firestore):', err);
          }
        )
      );

      unsubs.push(
        onSnapshot(
          collection(db, COLLECTION_STUDENTS),
          (snapshot) => {
            setAllowedStudents(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name)));
          },
          (err) => {
            console.error('Lỗi tải danh sách HS (Firestore):', err);
          }
        )
      );

      unsubs.push(subscribeQuizzes());
      unsubs.push(subscribeLessons());

      unsubs.push(
        onSnapshot(
          collection(db, COLLECTION_QUESTION_BANK),
          (snapshot) => {
            const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            setQuestionBank(list.sort((a, b) => (a.updated_at || 0) - (b.updated_at || 0)).reverse());
          },
          (err) => {
            console.error('Lỗi tải ngân hàng câu hỏi (Firestore):', err);
          }
        )
      );

      unsubs.push(
        onSnapshot(
          collection(db, COLLECTION_MINDMAP_G9),
          (snapshot) => {
            setMindMapCategories(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
          },
          (err) => {
            console.error('Lỗi tải sơ đồ Hình 9 (Firestore):', err);
          }
        )
      );

      unsubs.push(
        onSnapshot(
          collection(db, COLLECTION_REVIEW_COURSES),
          (snapshot) => {
            setReviewCoursesList(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
          },
          (err) => {
            console.error('Lỗi tải khóa ôn tập (Firestore):', err);
          }
        )
      );

      unsubs.push(
        onSnapshot(
          collection(db, COLLECTION_REVIEW_PROGRESS),
          (snapshot) => {
            setReviewProgressList(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
          },
          (err) => {
            console.error('Lỗi tải tiến độ ôn tập (Firestore):', err);
          }
        )
      );

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [user, deferBulkFirestore]);

  useEffect(() => {
    if (!pendingOpen) return;
    if (appState !== 'dashboard') return;
    if (quizzesList.length === 0) return;

    let match = null;
    if (pendingOpen.quizId) {
      match = quizzesList.find(q => q.id === pendingOpen.quizId);
    } else if (pendingOpen.category) {
      match = quizzesList.find((q) => String(q.category || '') === String(pendingOpen.category));
    }

    if (match) {
      setPendingOpen(null);
      openQuizById(match.id);
    }
  }, [pendingOpen, appState, quizzesList]);

  const openLessonFromDeepLink = useCallback((found) => {
    if (!found?.id) return;
    setLessonsList((prev) => (prev.some((l) => l.id === found.id) ? prev : [found, ...prev]));
    setPendingLessonId(null);
    setPendingLessonSlug(null);
    setLessonDeepLinkLoading(false);
    setDeferBulkFirestore(false);
    setSelectedLesson(found);
    setSelectedQuizId(null);
    setAppState('lesson_viewer');
  }, []);

  useEffect(() => {
    if (appState !== 'dashboard') return;
    if (!pendingLessonId && !pendingLessonSlug) {
      if (lessonDeepLinkLoading) setLessonDeepLinkLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const found = await fetchLessonForDeepLink({
          lessonId: pendingLessonId,
          slug: pendingLessonSlug,
          lessonsList,
        });
        if (cancelled) return;
        if (found) {
          openLessonFromDeepLink(found);
          return;
        }
        if (user && lessonsList.length > 0) {
          const fallback = findLessonInList(lessonsList, {
            lessonId: pendingLessonId,
            slug: pendingLessonSlug,
          });
          if (fallback) openLessonFromDeepLink(fallback);
          else {
            setPendingLessonId(null);
            setPendingLessonSlug(null);
            setLessonDeepLinkLoading(false);
            setDeferBulkFirestore(false);
          }
        }
      } catch (err) {
        console.error('Lỗi mở bài giảng từ link:', err);
        if (!cancelled) {
          setLessonDeepLinkLoading(false);
          setDeferBulkFirestore(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    pendingLessonId,
    pendingLessonSlug,
    appState,
    lessonsList,
    user,
    lessonDeepLinkLoading,
    openLessonFromDeepLink,
  ]);

  useEffect(() => {
    if (!deferBulkFirestore) return;
    const t = setTimeout(() => setDeferBulkFirestore(false), 10000);
    return () => clearTimeout(t);
  }, [deferBulkFirestore]);

  useEffect(() => {
    if (appState === 'lesson_viewer' && deferBulkFirestore) {
      setDeferBulkFirestore(false);
    }
  }, [appState, deferBulkFirestore]);

  useEffect(() => {
    if (appState !== 'dashboard' || !studentName || !selectedLesson?.id) return;
    if (!resumeLessonPapersTabRef.current) return;
    setAppState('lesson_viewer');
  }, [appState, studentName, selectedLesson?.id]);

  const handleLogin = (name, className, gradeLevel) => {
    const grade = gradeLevel || '8';
    setStudentName(name);
    setStudentClass(className);
    setAppState('dashboard');
    window.currentStudentGrade = grade;
    writeStudentSession({ name, className, gradeLevel: grade });
    setTimeout(() => setPostLoginTab(null), 0);
  };

  const handleFinishQuiz = async (score, timeStr, essayImages, answers) => {
setCurrentScore(score); setStudentAnswers(answers); setStudentEssayImages(essayImages); setAppState('result');
    if (!user || !activeQuiz) return;
    try {
      const docId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      await setDoc(doc(db, COLLECTION_SCORES, docId), {
        name: studentName, className: studentClass, quizId: activeQuiz.id, grade_level: window.currentStudentGrade || '8', quizTitle: activeQuiz.title,
        score: score, time: timeStr, essayImages: essayImages || {}, answers: answers || {}, timestamp: Date.now()
      });
    } catch (error) { console.error("Lỗi lưu điểm:", error); }
  };

  const handleLessonPracticeScore = async ({ lessonId, lessonTitle, score, total, gradeLevel }) => {
    if (!user || !studentName || !lessonId) return;
    try {
      const docId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      await setDoc(doc(db, COLLECTION_SCORES, docId), {
        name: studentName,
        className: studentClass,
        quizId: `lesson_practice_${lessonId}`,
        grade_level: gradeLevel || window.currentStudentGrade || '8',
        quizTitle: `Bài tập tự luyện — ${lessonTitle || 'Bài giảng'}`,
        score,
        time: `${score}/${total}`,
        essayImages: {},
        answers: {},
        timestamp: Date.now(),
        kind: 'lesson_practice',
        practiceTotal: total,
      });
    } catch (e) {
      console.error('Lỗi lưu điểm bài tập tự luyện:', e);
    }
  };

  const handleReviewOnTapProgressSave = async (payload) => {
    if (!user || !studentName || !payload?.course_id || !payload?.topic_id) return;
    const grade = window.currentStudentGrade || rosterGrade || '8';
    const docId = reviewProgressDocId(studentName, payload.course_id, payload.topic_id);
    try {
      await setDoc(
        doc(db, COLLECTION_REVIEW_PROGRESS, docId),
        sanitizeReviewProgressPayload(
          {
            ...payload,
            name: studentName,
            grade_level: grade,
          },
          { updatedAt: Date.now() }
        ),
        { merge: true }
      );
    } catch (e) {
      console.error('Lỗi lưu tiến độ ôn tập chuyên đề:', e);
    }
  };

  const handleReviewOnTapExp = async ({ courseId, topicId, expPoints, part, refId, label }) => {
    if (!user || !studentName || !courseId || !topicId) return;
    const grade = window.currentStudentGrade || rosterGrade || '8';
    const safeName = normStudentName(studentName).replace(/[^a-z0-9_]/gi, '_').slice(0, 48);
    const safeRef = String(refId || 'x').replace(/[/\\]/g, '_').slice(0, 64);
    const safePart = String(part || 'x').replace(/[^a-z0-9_]/gi, '_').slice(0, 24);
    const cid = String(courseId).replace(/[/\\]/g, '_').slice(0, 48);
    const tid = String(topicId).replace(/[/\\]/g, '_').slice(0, 48);
    const docId = `rev_exp_${safeName}_${cid}_${tid}_${safePart}_${safeRef}`.slice(0, 750);
    try {
      const ref = doc(db, COLLECTION_SCORES, docId);
      const snap = await getDoc(ref);
      if (snap.exists()) return;
      const pts = Math.round(Number(expPoints) || 0);
      await setDoc(ref, {
        name: studentName,
        className: studentClass,
        quizId: docId,
        quizTitle: `Ôn tập chuyên đề — ${label || part}`,
        grade_level: grade,
        score: 0,
        exp_points: pts,
        time: String(part || ''),
        essayImages: {},
        answers: {},
        timestamp: Date.now(),
        kind: 'review_on_tap',
      });
    } catch (e) {
      console.error('Lỗi lưu EXP ôn tập chuyên đề:', e);
    }
  };

  const backToStudentOverview = () => {
    appNavStackRef.current = [];
    setPostLoginTab('dashboard');
    handleBackToDashboard();
  };

  const backToStudentExams = () => {
    appNavStackRef.current = [];
    setPostLoginTab('exams');
    handleBackToDashboard();
  };

  const isImmersiveLessonView = appState === 'lesson_viewer' && selectedLesson;
  const publicLessonsFiltered = useMemo(
    () => lessonsList.filter((l) => l.grade_level === publicGrade || !l.grade_level),
    [lessonsList, publicGrade]
  );
  const publicQuizzesFiltered = useMemo(
    () => quizzesList.filter((q) => q.grade_level === publicGrade || !q.grade_level),
    [quizzesList, publicGrade]
  );

  const isStudentExperience = appState !== 'admin';
  const isStudentDashboard = Boolean(studentName && appState === 'dashboard');
  const showGlobalHeader = !isImmersiveLessonView && !isStudentDashboard;
  const showLessonDeepLinkSplash =
    lessonDeepLinkLoading &&
    appState === 'dashboard' &&
    Boolean(pendingLessonId || pendingLessonSlug);

  return (
    <div className={`min-h-screen bg-slate-100 flex flex-col font-sans selection:bg-blue-200 ${isStudentExperience ? 'student-ui' : ''}`}>
      <SeoHead
        appState={appState}
        publicGrade={publicGrade}
        studentName={studentName}
        studentRosterGrade={rosterGrade}
        selectedLesson={selectedLesson}
        activeQuiz={activeQuiz}
      />
{showGlobalHeader && (
<header className="bg-blue-700 text-white shadow-md py-4 px-6 flex justify-between items-center z-10">
<div className="flex items-center gap-3 min-w-0">
  <button
    type="button"
    onClick={() => {
      if (studentName) {
        handleStudentGoBack();
        return;
      }
      if (!studentName) {
        try {
          window.history.back();
        } catch {
          /* ignore */
        }
      }
    }}
    title="Quay lại thao tác trước"
    aria-label="Quay lại"
    className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-800/80 hover:bg-blue-900 text-white border border-white/10"
  >
    <ArrowLeft size={18} />
  </button>
  <h1 className="font-display text-xl md:text-2xl font-bold flex items-center gap-2 truncate">
    <BookText size={24} /> Lớp Học Toán Thầy Phát
  </h1>
</div>
        {appState === 'admin' && (
<button onClick={() => { writeAdminSessionFlag(false); setAppState('login'); }} className="flex items-center gap-2 bg-blue-800 hover:bg-blue-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <LogOut size={16} /> Đăng xuất Admin
</button>
        )}
      </header>
)}
<main
        className={`flex-1 flex min-h-0 ${
          isImmersiveLessonView
            ? 'flex-col p-0 overflow-hidden'
            : appState === 'admin'
              ? 'w-full flex-col items-stretch justify-start p-2 md:p-3 lg:px-4 min-h-0'
              : 'items-start justify-center p-2 md:p-4'
        }`}
      >
        <Suspense
          fallback={
            <div className="w-full flex flex-col items-center justify-center py-20 text-slate-600 gap-2">
              <span className="inline-block w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-sm font-semibold">Đang tải giao diện…</span>
            </div>
          }
        >
        {appState === 'login' && (
          <LoginScreen
            onLogin={handleLogin}
            allowedStudents={allowedStudents}
            adminPassword={ADMIN_PASSWORD}
            openTeacherGate={adminLoginRouteActive}
            onAdminAccess={() => {
              setTeacherDefaultGrade(publicGrade);
              writeAdminSessionFlag(true);
              setAppState('admin');
              try {
                if (isAdminLoginUrlPath(window.location.pathname)) setUrlPathSafe('/', 'replace');
              } catch {
                /* ignore */
              }
            }}
          />
        )}
{showLessonDeepLinkSplash ? (
        <LessonDeepLinkSplash />
        ) : null}
{!showLessonDeepLinkSplash && appState ==='dashboard' && catalogRoute && !studentName && (
        <CatalogScreen route={catalogRoute} />
        )}
{!showLessonDeepLinkSplash && appState ==='dashboard' && !catalogRoute && !studentName && (
        <PublicLandingScreen
          key={publicGrade}
          publicGrade={publicGrade}
          onPublicGradeChange={setPublicGrade}
          quizzesList={quizzesList.filter(q => q.grade_level === publicGrade || !q.grade_level)}
          lessonsList={lessonsList.filter(l => l.grade_level === publicGrade || !l.grade_level)}
          onRequestLogin={() => setAppState('login')}
          onEnterExam={() => { setPostLoginTab('exams'); setAppState('login'); }}
          onSelectQuiz={(id) => {
            setPendingOpen({ quizId: id });
setAppState('login');
          }}
          onSelectLesson={(lessonId) => {
            openLessonById(lessonId);
          }}
        />
        )}
{!showLessonDeepLinkSplash && appState ==='dashboard' && studentName && (
        <StudentDashboardScreen
          ref={dashboardNavRef}
          key={studentName}
          studentName={studentName}
          studentClass={studentClass}
          rosterGrade={rosterGrade}
          scoresList={scoresList}
          quizzesList={studentQuizzesFiltered}
          lessonsList={studentLessonsFiltered}
          mindMapCategories={mindMapCategories}
          reviewCoursesList={reviewCoursesList}
          reviewProgressList={reviewProgressList}
          initialTab={postLoginTab || 'dashboard'}
          onSelectQuiz={(id) => {
            setPendingOpen({ quizId: id });
          }}
          onSelectLesson={(lessonId) => {
            openLessonById(lessonId);
          }}
          onReviewOnTapExp={handleReviewOnTapExp}
          onSaveReviewProgress={handleReviewOnTapProgressSave}
          onLogout={() => {
            appNavStackRef.current = [];
            clearStudentSession();
            setStudentName('');
            setStudentClass('');
            try {
              delete window.currentStudentGrade;
            } catch {
              /* ignore */
            }
          }}
        />
        )}
{appState ==='lesson_viewer' && selectedLesson && (
          <StudentLessonViewer
            lesson={selectedLesson}
            lessonsList={studentName ? studentLessonsFiltered : publicLessonsFiltered}
            quizzesList={studentName ? studentQuizzesFiltered : publicQuizzesFiltered}
            scoresList={studentName ? scoresList : []}
            studentName={studentName || ''}
            studentClass={studentClass || ''}
            rosterGrade={studentName ? rosterGrade : publicGrade}
            externalHomeUrl={publicGradeHomeUrl(studentName ? rosterGrade : publicGrade)}
            onBack={handleStudentGoBack}
            onBackToOverview={backToStudentOverview}
            onOpenExamsRoom={
              studentName
                ? backToStudentExams
                : () => {
                    setPostLoginTab('exams');
                    setAppState('login');
                  }
            }
            onStartQuiz={openQuizById}
            onRequestLoginForPapers={() => {
              resumeLessonPapersTabRef.current = true;
              setAppState('login');
            }}
            resumePapersTabRef={resumeLessonPapersTabRef}
            onSelectLesson={(id) => openLessonById(id)}
            onRecordLessonPracticeScore={studentName ? handleLessonPracticeScore : undefined}
          />
        )}
{appState ==='quiz' && activeQuiz && (
          <QuizScreen
            studentName={studentName}
            quiz={activeQuiz}
            onFinish={handleFinishQuiz}
            onBack={handleStudentGoBack}
          />
        )}
{appState ==='result' && activeQuiz && (
          <ResultScreen
            studentName={studentName}
            quiz={activeQuiz}
            score={currentScore}
            answers={studentAnswers}
            essayImages={studentEssayImages}
            sortedQuizList={sortedStudentQuizzes}
            onBack={handleStudentGoBack}
            onNextQuiz={(id) => {
              setStudentAnswers({});
              setStudentEssayImages({});
              setCurrentScore(0);
              openQuizById(id);
            }}
          />
        )}
{appState ==='admin' && (
          <AdminScreen
            allowedStudents={allowedStudents}
            scoresList={scoresList}
            quizzesList={quizzesList}
            lessonsList={lessonsList}
            questionBank={questionBank}
            mindMapCategories={mindMapCategories}
            reviewCoursesList={reviewCoursesList}
            adminPassword={ADMIN_PASSWORD}
            db={db}
            storage={storage}
            user={user}
            defaultGrade={teacherDefaultGrade || publicGrade}
          />
        )}
        </Suspense>
</main>
    </div>
  );
}

function LoginScreen({ onLogin, allowedStudents, adminPassword, onAdminAccess, openTeacherGate }) {
  const [name, setName] = useState(''); const [className, setClassName] = useState(''); const [error, setError] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(!!openTeacherGate);
  const [adminPwd, setAdminPwd] = useState('');
  const [adminError, setAdminError] = useState('');

  useEffect(() => {
    if (openTeacherGate) setShowAdminModal(true);
  }, [openTeacherGate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !className.trim()) return setError("Vui lòng nhập đầy đủ Họ tên và Lớp!");
if (allowedStudents.length === 0) return setError("Danh sách lớp trống. Vui lòng báo Giáo viên!");
    const normalizedInputName = name.trim().toLowerCase();
    const isAllowed = allowedStudents.some(s => (s?.name || '').trim().toLowerCase() === normalizedInputName);
    if (!isAllowed) return setError("Tên học sinh không có trong danh sách được phép thi!");
setError('');
const exactName = allowedStudents.find(s => (s?.name ||'').trim().toLowerCase() === normalizedInputName).name;
onLogin(exactName, className.trim(), allowedStudents.find(s => (s?.name ||'').trim().toLowerCase() === normalizedInputName).grade_level || '8');
  };

  const handleAdminSubmit = () => {
    if (adminPwd === adminPassword) { onAdminAccess(); setShowAdminModal(false); } else { setAdminError("Mật khẩu không chính xác!"); }
  };

  return (
<div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full border border-slate-200 mt-10">
<div className="flex justify-center mb-6"><div className="bg-blue-100 p-4 rounded-full text-blue-600"><User size={48} /></div></div>
<h2 className="font-display text-2xl font-bold text-center text-slate-800 mb-2">Đăng nhập tài khoản</h2>
<p className="text-center text-slate-500 text-base mb-8">Hệ thống cần lưu lại thông tin để chấm điểm bài thi của bạn.</p>
<form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-6">
        <div>
<label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên học sinh:</label>
<input type="text" value={name} onChange={(e) => { setName(e.target.value); setError(''); }} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="VD: Nguyễn Văn A" autoFocus />
        </div>
        <div>
<label className="block text-sm font-medium text-slate-700 mb-1">Lớp:</label>
<input type="text" value={className} onChange={(e) => { setClassName(e.target.value); setError(''); }} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="VD: 8A1" />
        </div>
{error && <p className="text-sm text-red-500 flex items-center gap-1"><XCircle size={14} /> {error}</p>}
<button type="button" onClick={() => window.location.reload()} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-xl transition-colors mt-2 mb-2">Hủy / Quay lại</button>
<button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors mt-2">Đăng nhập</button>
      </form>
<div className="text-center border-t border-slate-100 pt-4">
<button onClick={() => setShowAdminModal(true)} className="text-sm text-slate-400 hover:text-blue-600 flex items-center justify-center gap-1 mx-auto transition-colors"><Settings size={14} /> Khu vực Giáo viên</button>
</div>

      {showAdminModal && (
<div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
<div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm animate-in zoom-in">
<h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><ShieldCheck size={20} className="text-blue-600" /> Xác nhận Giáo viên</h3>
<input type="password" value={adminPwd} onChange={(e) => { setAdminPwd(e.target.value); setAdminError(''); }} placeholder="Nhập mật khẩu..." className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 mb-2" onKeyDown={(e) => e.key === 'Enter' && handleAdminSubmit()} autoFocus />
{adminError && <p className="text-xs text-red-500 mb-4">{adminError}</p>}
<div className="flex gap-2 mt-4">
<button onClick={() => setShowAdminModal(false)} className="flex-1 py-2 bg-slate-100 rounded-lg font-semibold">Hủy</button>
<button onClick={handleAdminSubmit} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold">Vào</button>
            </div>
</div>
        </div>
      )}
    </div>
  );
}

function DashboardScreen({ publicGrade, studentName, studentClass, quizzesList, lessonsList, onSelectQuiz, onSelectLesson, onLogout, onRequestLogin }) {
  const normalizedQuizzes = (quizzesList || []).map((q) => ({ ...q, level: 'test' }));

  return (
    <div className="max-w-6xl w-full my-4 md:my-8 animate-in fade-in duration-300">
      
      {/* Khối Banner Mới */}
<div className="w-full bg-gradient-to-r from-blue-700 to-indigo-600 rounded-3xl p-8 md:p-12 text-white mb-10 shadow-xl relative overflow-hidden">
<div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
<div className="text-center md:text-left">
<h1 className="text-3xl md:text-5xl font-black mb-3">Kho Học Liệu Môn Toán {publicGrade}</h1>
<p className="text-blue-100 text-lg">Hệ thống bài giảng và bài tập trắc nghiệm trực tuyến</p>
          </div>
          {studentName ? (
<div className="bg-white/20 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/30 flex items-center gap-4">
<div className="w-12 h-12 rounded-full bg-white text-blue-700 flex items-center justify-center font-bold text-xl">{studentName.charAt(0)}</div>
              <div>
<div className="font-bold text-lg">{studentName}</div>
<div className="text-blue-200 text-sm">Lớp {studentClass}</div>
              </div>
<button onClick={onLogout} title="Đăng xuất" className="ml-2 hover:bg-white/20 p-2 rounded-full transition-colors"><LogOut size={20}/></button>
</div>
          ) : (
<button onClick={onRequestLogin} className="bg-white text-blue-700 hover:bg-blue-50 px-8 py-3 rounded-full font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-2">
              <User size={20} /> Đăng nhập
</button>
          )}
        </div>
</div>

      {/* Box Bài Giảng */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
<div className="col-span-full mb-2 flex items-center gap-3">
<span className="p-3 bg-indigo-100 text-indigo-700 rounded-xl"><Video size={24}/></span>
<h2 className="text-2xl font-black text-slate-800">Bài Giảng & Lý Thuyết</h2>
        </div>
        
        {(!lessonsList || lessonsList.length === 0) ? (
<div className="col-span-full bg-slate-50 p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center text-slate-500">
            Hệ thống đang cập nhật bài giảng.
          </div>
        ) : (
          lessonsList.map(l => (
<div key={l.id} onClick={() => onSelectLesson(l)} className="bg-white rounded-3xl border border-indigo-50 shadow-sm p-6 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col">
<div className="h-40 bg-indigo-50 rounded-2xl mb-4 flex items-center justify-center text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Video size={48} />
</div>
<h4 className="font-bold text-lg text-slate-800 leading-snug mb-2 line-clamp-2">{l.title}</h4>
<p className="text-sm text-slate-500 mt-auto font-medium bg-slate-100 w-fit px-3 py-1 rounded-lg">Toán {publicGrade}</p>
            </div>
          ))
        )}
      </div>
{/* Box Bài Thi */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
<div className="col-span-full mb-2 flex flex-col md:flex-row items-start md:items-center gap-3">
<div className="flex items-center gap-3">
<span className="p-3 bg-blue-100 text-blue-700 rounded-xl"><FileText size={24}/></span>
<h2 className="text-2xl font-black text-slate-800">Kho Đề Thi & Khảo Sát</h2>
          </div>
<span className="md:ml-4 text-sm font-semibold text-orange-600 bg-orange-100 px-3 py-1.5 rounded-lg border border-orange-200 shadow-sm flex items-center gap-1">
            <ShieldCheck size={16}/> Yêu cầu đăng nhập khi làm bài
</span>
        </div>

        {(!normalizedQuizzes || normalizedQuizzes.length === 0) ? (
<div className="col-span-full bg-slate-50 p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center text-slate-500">
            Giáo viên chưa mở phòng thi nào.
          </div>
        ) : (
          normalizedQuizzes.map(quiz => (
<div key={quiz.id} className="bg-white rounded-3xl border border-blue-50 shadow-sm p-6 hover:shadow-xl transition-all flex flex-col relative overflow-hidden">
<div className="absolute top-0 right-0 p-4">
                 <span className="text-xs font-extrabold px-3 py-1.5 rounded-full bg-red-100 text-red-700">
ĐỀ CHÍNH THỨC
                 </span>
</div>
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
                <BookOpen size={28} />
</div>
<h4 className="font-bold text-xl text-slate-800 leading-snug mb-4 pr-16">{quiz.title}</h4>
<div className="flex flex-col gap-2 mb-6">
<div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2.5 rounded-xl">
<ListOrdered size={16} className="text-blue-500" /> <span className="font-medium">Cấu trúc:</span> {quiz.questions?.length || 0} câu
</div>
<div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2.5 rounded-xl">
<Clock size={16} className="text-orange-500" /> <span className="font-medium">Thời gian:</span> {quiz.duration} phút
</div>
              </div>
<button onClick={() => onSelectQuiz(quiz.id)} className="mt-auto w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-md hover:shadow-lg flex justify-center items-center gap-2">
                Bắt đầu làm bài
              </button>
</div>
          ))
        )}
      </div>
</div>
  );
}


function QuizScreen({ studentName, quiz, onFinish, onBack }) {
  const [answers, setAnswers] = useState({});
  const [essayImages, setEssayImages] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  const [timeLeft, setTimeLeft] = useState(quiz.duration * 60);
  const answersRef = useRef(answers);
  const essayImagesRef = useRef(essayImages);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { essayImagesRef.current = essayImages; }, [essayImages]);

  useEffect(() => {
    const timerId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerId); calculateAndSubmit(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60); const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleImageUpload = (questionId, e) => {
    const file = e.target.files[0]; if (!file) return;
    setIsCompressing(true);
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image(); img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scaleSize = img.width > 800 ? 800 / img.width : 1;
        canvas.width = img.width * scaleSize; canvas.height = img.height * scaleSize;
canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
setEssayImages({ ...essayImages, [questionId]: canvas.toDataURL('image/jpeg', 0.7) });
        setIsCompressing(false);
      };
    };
  };

  const calculateAndSubmit = (isAutoSubmit = false) => {
    const finalScore = computeAutoGradedScore(quiz, answersRef.current);

    let timeStr = "";
    if (isAutoSubmit) { timeStr = `${quiz.duration.toString().padStart(2, '0')}:00`; }
    else {
      const timeTakenSecs = (quiz.duration * 60) - timeLeft;
timeStr = `${Math.floor(timeTakenSecs / 60).toString().padStart(2,'0')}:${(timeTakenSecs % 60).toString().padStart(2, '0')}`;
    }
    onFinish(finalScore, timeStr, essayImagesRef.current, answersRef.current);
  };

  const handleManualSubmit = () => {
    const isDone = quiz.questions.every((q) => isQuizQuestionAnswered(q, answers, essayImages));
    if (!isDone) return setShowConfirm(true);
    calculateAndSubmit(false);
  };

  const isWarningTime = timeLeft < 60;

  return (
    <div className="bg-white p-4 md:p-8 rounded-2xl shadow-lg max-w-4xl w-full border border-slate-200 relative mt-4 md:mt-8">
<div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-4 mb-6 gap-4 sticky top-0 bg-white/95 backdrop-blur z-20 py-2">
<div className="flex items-start gap-3 flex-1 min-w-0">
        {typeof onBack === 'function' && (
          <button
            type="button"
            onClick={onBack}
            title="Quay lại"
            aria-label="Quay lại"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 shrink-0 mt-0.5"
          >
            <ArrowLeft size={20} />
          </button>
        )}
<div className="flex-1 min-w-0">
<p className="text-sm font-semibold text-slate-500 uppercase">Thí sinh: {studentName}</p>
<h2 className="font-display font-black text-xl md:text-2xl text-blue-800 leading-tight">{quiz.title}</h2>
        </div>
        </div>
<div className="flex items-center gap-4 w-full md:w-auto">
<div className="text-right hidden md:block">
<p className="text-sm text-slate-500">Đã làm</p>
<p className="font-bold text-slate-700">{quiz.questions.filter((q) => isQuizQuestionAnswered(q, answers, essayImages)).length} / {quiz.questions.length}</p>
</div>
          <div className={`flex items-center gap-2 font-mono text-2xl md:text-3xl font-bold px-4 py-2 rounded-xl border-2 ${isWarningTime ? 'text-red-600 border-red-300 bg-red-50' : 'text-slate-700 border-slate-200 bg-slate-50'}`}>
<Clock size={28} className={isWarningTime ?'animate-pulse text-red-500' : 'text-slate-400'} /> {formatTime(timeLeft)}
</div>
        </div>
</div>

      <div className="space-y-6">
        {quiz.questions.map((q, index) => (
<div key={q.id} className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm">
{q.cognitive_level && (
  <div className="flex flex-wrap items-center gap-2 mb-3">
    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-violet-100 text-violet-800 border border-violet-200">
      {COG_LEVEL_LABEL[String(q.cognitive_level || COG_LEVEL.recognize)] || 'Nhận biết'}
    </span>
  </div>
)}
<h3 className="font-semibold text-slate-800 mb-4 text-lg md:text-xl leading-relaxed">
<span className="text-blue-600 mr-2">Câu {index + 1}:</span> <MathContent text={q.question} />
</h3>
            {q.type === 'multiple_choice' ? (
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {q.options.map((opt, optIdx) => (
                  <button key={optIdx} onClick={() => setAnswers({ ...answers, [q.id]: optIdx })} className={`text-left px-4 py-3 rounded-lg border-2 transition-all ${answers[q.id] === optIdx ? 'border-blue-500 bg-blue-100 text-blue-900 font-bold shadow-sm' : 'border-slate-300 bg-white hover:border-blue-300 text-slate-700'}`}>
<span className="inline-block w-6 h-6 rounded-full border border-slate-300 text-center leading-5 mr-3 text-sm bg-white font-normal">{['A', 'B', 'C', 'D'][optIdx]}</span><MathContent text={opt} inlineImage />
</button>
                ))}
              </div>
            ) : q.type === 'true_false_group' ? (
              <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="text-left p-3 font-bold text-slate-700">Mệnh đề</th>
                      <th className="p-3 text-center font-bold text-emerald-700 w-24">ĐÚNG</th>
                      <th className="p-3 text-center font-bold text-red-600 w-24">SAI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(q.tfItems || []).map((it) => {
                      const sel = answers[q.id] && typeof answers[q.id] === 'object' ? answers[q.id][it.key] : undefined;
                      const setTf = (v) => {
                        const prev = answers[q.id];
                        const base = prev && typeof prev === 'object' && !Array.isArray(prev) ? { ...prev } : {};
                        setAnswers({ ...answers, [q.id]: { ...base, [it.key]: v } });
                      };
                      return (
                        <tr key={it.key} className="border-b border-slate-100">
                          <td className="p-3 align-top">
                            <span className="font-bold text-blue-600 mr-1">{it.key})</span>
                            <MathContent text={it.text} />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              aria-label={`${it.key} đúng`}
                              onClick={() => setTf(true)}
                              className={`h-9 w-9 rounded-full border-2 mx-auto transition-all ${sel === true ? 'border-emerald-600 bg-emerald-100 ring-2 ring-emerald-300' : 'border-slate-300 bg-white hover:border-emerald-400'}`}
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              aria-label={`${it.key} sai`}
                              onClick={() => setTf(false)}
                              className={`h-9 w-9 rounded-full border-2 mx-auto transition-all ${sel === false ? 'border-red-600 bg-red-50 ring-2 ring-red-200' : 'border-slate-300 bg-white hover:border-red-400'}`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : q.type === 'short_answer' ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-100/80 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="text-sm font-bold text-slate-700 shrink-0">KẾT QUẢ CỦA BẠN:</span>
                <input
                  type="text"
                  value={typeof answers[q.id] === 'string' ? answers[q.id] : ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  placeholder={(q.answerPlaceholder || 'Nhập đáp án...').toString()}
                  className="flex-1 min-w-0 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            ) : (
<div className="mt-4">
<label className="cursor-pointer bg-white border-2 border-dashed border-blue-300 hover:border-blue-500 text-blue-600 px-6 py-4 rounded-lg flex flex-col items-center gap-2 w-full sm:w-1/2">
<Camera size={24} /> <span className="font-medium text-sm">Chụp/Tải ảnh tự luận</span>
<input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(q.id, e)} />
</label>
{isCompressing && <span className="text-slate-500 text-sm mt-2 block">Đang xử lý ảnh...</span>}
{essayImages[q.id] && <img src={essayImages[q.id]} alt="Bài làm" className="mt-4 max-h-48 rounded border shadow-sm" />}
              </div>
            )}
          </div>
        ))}
      </div>
<div className="mt-8 pt-6 border-t flex justify-end">
<button onClick={handleManualSubmit} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 shadow-lg"><CheckCircle size={20} /> Nộp bài</button>
</div>

      {showConfirm && (
<div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
<div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center">
<AlertTriangle size={48} className="text-amber-500 mx-auto mb-4" />
<h3 className="text-xl font-bold mb-2">Chưa hoàn thành</h3>
<p className="text-slate-600 mb-6">Bạn chưa làm xong tất cả các câu. Vẫn nộp bài?</p>
<div className="flex gap-3">
<button onClick={() => setShowConfirm(false)} className="flex-1 py-2 bg-slate-100 rounded-lg font-semibold">Tiếp tục làm</button>
<button onClick={() => calculateAndSubmit(false)} className="flex-1 py-2 bg-green-600 text-white font-bold rounded-lg">Nộp luôn</button>
            </div>
</div>
        </div>
      )}
    </div>
  );
}

function QuizReviewQuestionsList({ quiz, answers, essayImages }) {
  return (
    <div className="space-y-6">
      {(quiz.questions || []).map((q, idx) => {
        const t = q.type || 'multiple_choice';
        const sChoice = answers[q.id];
        const isMC = t === 'multiple_choice';
        const mcCorrect = isMC && sChoice === q.correctAnswer;

        let badge = null;
        if (t === 'multiple_choice') {
          badge =
            sChoice === undefined ? (
              <span className="bg-slate-200 px-2 py-1 rounded text-xs font-bold">Chưa làm</span>
            ) : mcCorrect ? (
              <span className="bg-green-200 text-green-800 px-2 py-1 rounded text-xs font-bold">Đúng</span>
            ) : (
              <span className="bg-red-200 text-red-800 px-2 py-1 rounded text-xs font-bold">Sai</span>
            );
        } else if (t === 'true_false_group') {
          const items = q.tfItems || [];
          const obj = sChoice && typeof sChoice === 'object' && !Array.isArray(sChoice) ? sChoice : {};
          const done = tfAnswersComplete(q, sChoice);
          let ok = 0;
          items.forEach((it) => {
            if (obj[it.key] === it.correct) ok += 1;
          });
          badge = !done ? (
            <span className="bg-slate-200 px-2 py-1 rounded text-xs font-bold">Chưa làm</span>
          ) : ok === items.length ? (
            <span className="bg-green-200 text-green-800 px-2 py-1 rounded text-xs font-bold">Đúng hết</span>
          ) : (
            <span className="bg-amber-200 text-amber-900 px-2 py-1 rounded text-xs font-bold">
              Đúng {ok}/{items.length}
            </span>
          );
        } else if (t === 'short_answer') {
          const has = String(sChoice || '').trim();
          const ok = shortAnswerIsCorrect(sChoice, q.shortCorrect);
          badge = !has ? (
            <span className="bg-slate-200 px-2 py-1 rounded text-xs font-bold">Chưa làm</span>
          ) : ok ? (
            <span className="bg-green-200 text-green-800 px-2 py-1 rounded text-xs font-bold">Đúng</span>
          ) : (
            <span className="bg-red-200 text-red-800 px-2 py-1 rounded text-xs font-bold">Sai</span>
          );
        }

        return (
          <div key={q.id} className="p-5 border border-slate-200 rounded-xl shadow-sm bg-slate-50">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 min-w-0">
                {q.cognitive_level && (
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs font-black px-2.5 py-1 rounded-full bg-violet-100 text-violet-800 border border-violet-200">
                      {COG_LEVEL_LABEL[String(q.cognitive_level || COG_LEVEL.recognize)] || 'Nhận biết'}
                    </span>
                  </div>
                )}
                <h3 className="font-semibold text-slate-800">
                  <span className="text-blue-600">Câu {idx + 1}:</span> <MathContent text={q.question} />
                </h3>
              </div>
              {t !== 'essay' && <div className="ml-4 shrink-0">{badge}</div>}
            </div>

            {t === 'multiple_choice' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                {q.options.map((opt, oIdx) => {
                  let style = 'bg-white border-slate-200 opacity-60';
                  if (oIdx === q.correctAnswer) style = 'bg-green-100 border-green-500 font-bold ring-1 ring-green-500 opacity-100';
                  else if (oIdx === sChoice) style = 'bg-red-50 border-red-400 font-bold opacity-100 text-red-800';
                  return (
                    <div key={oIdx} className={`p-3 border-2 rounded-lg flex items-center ${style}`}>
                      <span className="w-6 h-6 rounded-full border bg-white flex items-center justify-center mr-2 text-xs">
                        {['A', 'B', 'C', 'D'][oIdx]}
                      </span>
                      <MathContent text={opt} inlineImage />
                    </div>
                  );
                })}
              </div>
            ) : t === 'true_false_group' ? (
              <div className="mb-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="text-left p-2">Mệnh đề</th>
                      <th className="p-2 text-center w-28">Bạn chọn</th>
                      <th className="p-2 text-center w-28">Đáp án</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(q.tfItems || []).map((it) => {
                      const obj = sChoice && typeof sChoice === 'object' && !Array.isArray(sChoice) ? sChoice : {};
                      const picked = obj[it.key];
                      const ok = picked === it.correct;
                      return (
                        <tr key={it.key} className="border-t border-slate-100">
                          <td className="p-2">
                            <span className="font-bold text-blue-600 mr-1">{it.key})</span>
                            <MathContent text={it.text} />
                          </td>
                          <td className="p-2 text-center text-xs font-bold">
                            {picked === true ? (
                              <span className="text-emerald-700">Đúng</span>
                            ) : picked === false ? (
                              <span className="text-red-600">Sai</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="p-2 text-center text-xs font-bold">
                            <span className={ok ? 'text-emerald-700' : 'text-red-700'}>{it.correct ? 'Đúng' : 'Sai'}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : t === 'short_answer' ? (
              <div className="mb-4 space-y-2 text-sm">
                <p>
                  <span className="font-bold text-slate-700">Bạn nhập: </span>
                  <span className="text-slate-900">{String(sChoice || '').trim() || '—'}</span>
                </p>
                <p>
                  <span className="font-bold text-slate-700">Đáp án chấp nhận: </span>
                  <span className="text-emerald-800 font-mono text-xs">{(q.shortCorrect || '').toString()}</span>
                </p>
              </div>
            ) : (
              <div className="mb-4">
                {essayImages[q.id] ? (
                  <img src={essayImages[q.id]} className="max-h-64 rounded border shadow-sm" alt="Bài làm" />
                ) : (
                  <span className="italic text-slate-400">Không có ảnh</span>
                )}
              </div>
            )}
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <p className="font-bold text-amber-800 flex items-center gap-1 mb-1">
                <Lightbulb size={16} /> Lời giải chi tiết:
              </p>
              <p className="text-amber-900 text-sm whitespace-pre-line">
                <MathContent text={q.explanation || 'Chưa có lời giải chi tiết.'} />
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ResultScreen({ studentName, quiz, score, answers, essayImages, sortedQuizList, onBack, onNextQuiz }) {
  const sNum = Number(score);
  const ratio = Number.isFinite(sNum) ? Math.min(1, Math.max(0, sNum / 10)) : 0;
  const scoreStr = formatScoreForDisplay(score);

  const idx = sortedQuizList.findIndex((q) => q.id === quiz.id);
  const nextQuiz = idx >= 0 && idx < sortedQuizList.length - 1 ? sortedQuizList[idx + 1] : null;

  let Icon = Star;
  let accent = 'from-violet-500 to-indigo-600';
  let ring = 'ring-violet-200';
  let title = 'Đã nộp bài!';
  let subtitle = 'Xem đáp án chi tiết bên dưới và tiếp tục luyện tập nhé.';

  if (ratio >= 0.9) {
    Icon = Trophy;
    accent = 'from-amber-400 via-orange-500 to-rose-500';
    ring = 'ring-amber-200';
    title = 'Xuất sắc!';
    subtitle = 'Bạn làm rất tốt — giữ vững phong độ này!';
  } else if (ratio >= 0.7) {
    Icon = Sparkles;
    accent = 'from-emerald-400 to-teal-600';
    ring = 'ring-emerald-200';
    title = 'Làm tốt lắm!';
    subtitle = 'Kiến thức đã vững — thử thách thêm vài đề nữa nhé.';
  } else if (ratio >= 0.5) {
    Icon = CheckCircle;
    accent = 'from-sky-400 to-blue-600';
    ring = 'ring-sky-200';
    title = 'Đạt yêu cầu!';
    subtitle = 'Đọc lại phần sai để chắc kiến thức hơn nhé.';
  } else if (ratio > 0) {
    Icon = Target;
    accent = 'from-slate-500 to-slate-700';
    ring = 'ring-slate-200';
    title = 'Cố gắng thêm!';
    subtitle = 'Mỗi lần làm đề là một bước tiến — đừng nản lòng!';
  } else {
    Icon = Heart;
    accent = 'from-rose-400 to-pink-600';
    ring = 'ring-rose-200';
    title = 'Bắt đầu lại từ đây!';
    subtitle = 'Hãy xem đáp án và ôn lại phần chưa rõ — bạn sẽ tiến bộ nhanh thôi!';
  }

  return (
    <div className="w-full max-w-4xl my-4 md:my-8 px-2 md:px-0 animate-in fade-in duration-300">
      <div
        className={`rounded-3xl shadow-xl border border-white/20 bg-gradient-to-br ${accent} text-white p-6 md:p-10 relative overflow-hidden`}
      >
        <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-10 bottom-0 w-40 h-40 rounded-full bg-black/10 blur-2xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <div
            className={`shrink-0 w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-white/95 flex items-center justify-center shadow-lg ring-4 ${ring} text-slate-800`}
          >
            <Icon size={48} strokeWidth={1.75} className="text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/90 text-sm font-semibold uppercase tracking-wide">Kết quả • {studentName}</p>
            <h2 className="font-display text-2xl md:text-3xl font-black leading-tight mt-1 drop-shadow-sm">{title}</h2>
            <p className="text-white/95 text-base md:text-lg mt-2 max-w-xl">{subtitle}</p>
            <p className="mt-3 text-sm text-white/80 font-medium line-clamp-2">{quiz.title}</p>
          </div>
          <div className="shrink-0 text-center md:text-right">
            <p className="text-xs uppercase font-bold text-white/80 tracking-wider">Điểm</p>
            <p className="text-5xl md:text-6xl font-black tabular-nums drop-shadow-md">
              {scoreStr}
              <span className="text-2xl md:text-3xl font-bold text-white/70">/10</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-2xl shadow-lg border border-slate-200 p-4 md:p-8">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
          <ListOrdered className="text-blue-600 shrink-0" size={22} />
          <h3 className="font-display text-xl font-bold text-slate-800">Đáp án & chi tiết bài làm</h3>
        </div>
        <QuizReviewQuestionsList quiz={quiz} answers={answers || {}} essayImages={essayImages || {}} />
      </div>

      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
        >
          ← Quay về
        </button>
        {nextQuiz ? (
          <button
            type="button"
            onClick={() => onNextQuiz(nextQuiz.id)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-md transition-colors flex items-center justify-center gap-2"
          >
            Làm đề tiếp theo
            <ArrowRight size={18} />
          </button>
        ) : (
          <p className="text-center sm:text-right text-sm text-slate-500 italic w-full sm:w-auto">
            Đây là đề cuối trong danh sách của bạn.
          </p>
        )}
      </div>
    </div>
  );
}

function AdminImageUploadControl({ storage, user, busy, onFile }) {
  const inputRef = useRef(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) onFile(f);
        }}
      />
      <button
        type="button"
        disabled={busy || !user || !storage}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        title="Nén JPEG, tải lên Firebase Storage, chèn ![](url) vào ô đang trỏ chuột"
      >
        <ImageIcon size={14} className="shrink-0" />
        {busy ? 'Đang nén & tải...' : 'Upload ảnh → Storage'}
      </button>
    </>
  );
}

function AdminExampleItemsJsonEditor({ items, onCommit, disabled }) {
  const [text, setText] = useState(() => JSON.stringify(items ?? [], null, 2));
  useEffect(() => {
    setText(JSON.stringify(items ?? [], null, 2));
  }, [items]);
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold text-slate-600">JSON nâng cao (mỗi phần tử có q, steps)</label>
      <textarea
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          try {
            const parsed = JSON.parse(text || '[]');
            if (!Array.isArray(parsed)) return;
            onCommit(parsed);
          } catch {
            /* giữ nội dung để sửa tiếp */
          }
        }}
        spellCheck={false}
        className="w-full font-mono text-xs p-2 border border-slate-300 rounded-lg min-h-[120px] bg-white disabled:opacity-50"
      />
    </div>
  );
}

function AdminScreen({
  allowedStudents,
  scoresList,
  quizzesList,
  lessonsList,
  questionBank,
  mindMapCategories,
  reviewCoursesList,
  adminPassword,
  db,
  storage,
  user,
  defaultGrade,
}) {
  const [activeTab, setActiveTab] = useState('lessons');
  const [activeGrade, setActiveGrade] = useState(defaultGrade || "ALL"); //'lessons' | 'quizzes' | 'scores' | 'students' | 'bank'
  const [editingBankQuestion, setEditingBankQuestion] = useState(null);
  const [bankSearch, setBankSearch] = useState('');
  const [showMatrixModal, setShowMatrixModal] = useState(false);
  const [matrixDraft, setMatrixDraft] = useState(null);
  // Bank import removed per request

  useEffect(() => {
    if (defaultGrade) setActiveGrade(defaultGrade);
  }, [defaultGrade]);

  const [editingLesson, setEditingLesson] = useState(null);
  const [lessonAdminPane, setLessonAdminPane] = useState('theory');
  const [lessonMaterialsDraft, setLessonMaterialsDraft] = useState(DEFAULT_LESSON_MATERIALS_JSON);
  const newLessonDraftIdRef = useRef(null);
  const lessonTheoryTextareaRef = useRef(null);
  const lessonExamplesTextareaRef = useRef(null);
  const theoryUndoStackRef = useRef([]);
  const theoryLastSnapRef = useRef('');
  const theoryLastAtRef = useRef(0);
  const examplesUndoStackRef = useRef([]);
  const examplesLastSnapRef = useRef('');
  const examplesLastAtRef = useRef(0);

  useEffect(() => {
    if (editingLesson) setLessonAdminPane('theory');
  }, [editingLesson?.id, editingLesson?.isNew]);

  useEffect(() => {
    if (!editingLesson) {
      setLessonMaterialsDraft(DEFAULT_LESSON_MATERIALS_JSON);
      return;
    }
    const { obj, error } = parseLessonContentObject(editingLesson.content);
    if (error || !obj) {
      setLessonMaterialsDraft(DEFAULT_LESSON_MATERIALS_JSON);
      return;
    }
    const m = obj.materials;
    if (Array.isArray(m) && m.length > 0) {
      setLessonMaterialsDraft(JSON.stringify(m, null, 2));
    } else {
      setLessonMaterialsDraft(DEFAULT_LESSON_MATERIALS_JSON);
    }
  }, [editingLesson?.id]);

  useEffect(() => {
    if (!editingLesson) newLessonDraftIdRef.current = null;
  }, [editingLesson]);

  const draftLessonForPreview = useMemo(() => {
    if (!editingLesson) return null;
    const gl = (editingLesson.grade_level || (activeGrade !== 'ALL' ? activeGrade : '') || '11').toString();
    if (editingLesson.id) return { ...editingLesson, grade_level: gl };
    if (!newLessonDraftIdRef.current) newLessonDraftIdRef.current = `draft_new_${Date.now()}`;
    return { ...editingLesson, id: newLessonDraftIdRef.current, grade_level: gl };
  }, [editingLesson, activeGrade]);

  const lessonContentParse = useMemo(
    () => (editingLesson ? parseLessonContentObject(editingLesson.content) : { obj: null, error: null }),
    [editingLesson?.content, editingLesson]
  );

  const [editingQuiz, setEditingQuiz] = useState(null);
const [filterQuizId, setFilterQuizId] = useState('ALL');
  const [viewingImage, setViewingImage] = useState(null);
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);

  const filteredLessons = (activeGrade === 'ALL')
    ? lessonsList
    : lessonsList.filter(l => (l.grade_level || '8') === activeGrade);

  const filteredQuizzes = (activeGrade === 'ALL')
    ? quizzesList
    : quizzesList.filter(q => (q.grade_level || '8') === activeGrade);

  const filteredBankQuestions = useMemo(() => {
    const base =
      activeGrade === 'ALL'
        ? (questionBank || [])
        : (questionBank || []).filter((q) => (q.grade_level || '8') === activeGrade);
    const q = (bankSearch || '').trim().toLowerCase();
    if (!q) return base;
    return base.filter((x) => {
      const hay =
        `${x.question || ''} ${x.explanation || ''} ${x.chapter || ''} ${x.lesson_no || ''} ${(x.topic_tags || []).join(' ')} ${(x.category || '')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [questionBank, activeGrade, bankSearch]);

  /** Chương trình GDPT 2018 theo từng khối (6–12), fallback math11 nếu thiếu dữ liệu */
  const knowledgeByGrade = useMemo(() => {
    const map = new Map();
    const fallback11 = parseMathKnowledgeTxt(math11KnowledgeRaw);
    for (const g of ['6', '7', '8', '9', '10', '11', '12']) {
      let k = parseMathKnowledgeTxtForGrade(mathCurriculumGdpt2018Raw, g);
      if (!k.chapters?.length) k = fallback11;
      map.set(g, k);
    }
    return map;
  }, []);

  const resolveKnowledgeForGrade = useCallback(
    (grade) => {
      const g = String(grade || '11').trim();
      return knowledgeByGrade.get(g) || knowledgeByGrade.get('11');
    },
    [knowledgeByGrade]
  );

  /** Khối áp dụng cho đề đang sửa: ưu tiên meta đề, sau đó bộ lọc admin */
  const quizCurriculumGrade = (
    editingQuiz?.grade_level ||
    (activeGrade !== 'ALL' ? activeGrade : '') ||
    '11'
  )
    .toString()
    .trim();

  const chapterOptions = useMemo(() => {
    const k = resolveKnowledgeForGrade(quizCurriculumGrade);
    return (k.chapters || []).map((c) => ({
      value: String(c.chapterNo),
      label: `Chương ${c.chapterNo}: ${c.title}`,
    }));
  }, [resolveKnowledgeForGrade, quizCurriculumGrade]);

  const getChapterOptionsForGrade = useCallback(
    (grade) => {
      const k = resolveKnowledgeForGrade(grade);
      return (k.chapters || []).map((c) => ({
        value: String(c.chapterNo),
        label: `Chương ${c.chapterNo}: ${c.title}`,
      }));
    },
    [resolveKnowledgeForGrade]
  );

  const getTopicOptionsForChapterAndGrade = useCallback(
    (grade, chapterNo) => {
      const k = resolveKnowledgeForGrade(grade);
      const ch = String(chapterNo || '').trim();
      const all = k.allTopics || [];
      if (!ch) return all.slice(0, 600);
      const list = k.topicsByChapter?.get?.(ch);
      if (Array.isArray(list) && list.length > 0) return list;
      return all.slice(0, 600);
    },
    [resolveKnowledgeForGrade]
  );

  const topicOptionsByChapter = useCallback(
    (chapterNo) => getTopicOptionsForChapterAndGrade(quizCurriculumGrade, chapterNo),
    [getTopicOptionsForChapterAndGrade, quizCurriculumGrade]
  );

  const defaultCogLevelForQuizQuestion = useCallback(
    (q, idx, total) => {
      const t = String(q?.type || 'multiple_choice').trim();
      if (t === 'multiple_choice') {
        const half = Math.ceil((total || 0) / 2);
        return idx < half ? COG_LEVEL.recognize : COG_LEVEL.understand;
      }
      if (t === 'true_false_group') return COG_LEVEL.understand;
      if (t === 'short_answer') return COG_LEVEL.apply;
      if (t === 'essay') return COG_LEVEL.apply_high;
      return COG_LEVEL.recognize;
    },
    []
  );

  useEffect(() => {
    if (!editingQuiz?.questions || editingQuiz.questions.length === 0) return;
    const n = editingQuiz.questions.length;
    let changed = false;
    const nextQs = editingQuiz.questions.map((q, idx) => {
      const out = { ...q };
      if (!out.cognitive_level) {
        out.cognitive_level = defaultCogLevelForQuizQuestion(out, idx, n);
        changed = true;
      }
      if (!out.chapter && editingQuiz.chapter) {
        out.chapter = String(editingQuiz.chapter || '').trim();
        changed = true;
      }
      if (!out.lesson_no && editingQuiz.lesson_no) {
        out.lesson_no = String(editingQuiz.lesson_no || '').trim();
        changed = true;
      }
      if (!out.topic_tags) out.topic_tags = [];
      return out;
    });
    if (changed) setEditingQuiz({ ...editingQuiz, questions: nextQs });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingQuiz?.id, editingQuiz?.isNew]);

  const withTimeout = useCallback(async (promise, ms, message) => {
    let t;
    const timeoutPromise = new Promise((_, reject) => {
      t = setTimeout(() => reject(new Error(message || `Timeout after ${ms}ms`)), ms);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(t);
    }
  }, []);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importErrors, setImportErrors] = useState([]);
  const [importPreview, setImportPreview] = useState([]);
  const importFileRef = useRef(null);
  const adminTextTargetRef = useRef(null);
  const runParseImportRef = useRef((/* text */) => {});
  const [imageUploadBusy, setImageUploadBusy] = useState(false);

  const captureAdminTextFocus = useCallback((e) => {
    const t = e.target;
    if (t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && t.type === 'text'))) {
      adminTextTargetRef.current = t;
    }
  }, []);

  const handleAdminImageUpload = useCallback(
    async (file) => {
      if (!storage) {
        alert('Firebase Storage chưa khởi tạo.');
        return;
      }
      if (!user) {
        alert('Đang kết nối Firebase — thử lại sau vài giây.');
        return;
      }
      const mime = String(file?.type || '').toLowerCase();
      const looksImage =
        mime.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i.test(String(file?.name || ''));
      if (!looksImage) {
        alert('Chọn file ảnh (jpg, png, webp...).');
        return;
      }
      setImageUploadBusy(true);
      try {
        const url = await withTimeout(
          (async () => {
            try {
              await user.getIdToken(true);
            } catch {
              /* vẫn thử upload */
            }
            const blob = await compressImageFileToJpegBlob(file, {
              maxEdge: 1680,
              quality: 0.8,
              blobTimeoutMs: 45000,
            });
            if (blob.size > 4 * 1024 * 1024) {
              throw new Error(
                'Ảnh sau khi nén vẫn lớn hơn 4MB (giới hạn trong Storage Rules). Hãy chọn ảnh nhỏ hơn.'
              );
            }
            const fname = `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.jpg`;
            const r = storageRef(storage, `site-content/${fname}`);
            await uploadBytes(r, blob, { contentType: 'image/jpeg' });
            return getDownloadURL(r);
          })(),
          90000,
          'Tải lên quá lâu (hết thời gian 90s). Kiểm tra mạng/VPN; trên Firebase Console bật Storage và deploy rules (firebase deploy --only storage).'
        );
        const markdown = `\n![](${url})\n`;
        const ta = adminTextTargetRef.current;
        if (ta && document.body.contains(ta) && ta.dataset.adminSnippet) {
          const ok = applyAdminSnippetByKey(ta.dataset.adminSnippet, ta, markdown, {
            setEditingLesson,
            setEditingQuiz,
            setImportText,
            onAfterImportQuizText: (t) => runParseImportRef.current(t),
            parseLessonContentObject,
            mergeLessonContentString,
          });
          if (ok) return;
        }
        try {
          await navigator.clipboard?.writeText(markdown.trim());
        } catch {
          /* clipboard có thể bị chặn (iframe) */
        }
        alert('Đã upload. Markdown ảnh đã copy — dán (Ctrl+V) vào ô cần dùng (hoặc dán thủ công nếu trình duyệt chặn clipboard).');
      } catch (err) {
        console.error(err);
        let extra = err?.message || String(err);
        const code = err?.code;
        if (code === 'storage/unauthorized' || String(extra).toLowerCase().includes('unauthorized')) {
          extra +=
            ' Gợi ý: Firebase Console → Storage → Rules — cho phép ghi site-content/ khi request.auth != null, rồi chạy: firebase deploy --only storage';
        }
        alert('Upload ảnh thất bại: ' + extra);
      } finally {
        setImageUploadBusy(false);
      }
    },
    [storage, user, withTimeout]
  );

  const [newStudentName, setNewStudentName] = useState('');
const [bulkText, setBulkText] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  const handleSaveLesson = async () => {
    if (!editingLesson.title) return alert("Cần nhập tiêu đề bài giảng!");
    const isTopicLesson = !!editingLesson.is_topic;
    const chapter = (editingLesson.chapter ?? '').toString().trim();
    const lessonNo = (editingLesson.lesson_no ?? '').toString().trim();
    if (isTopicLesson) {
      const tid = (editingLesson.topic_id || '').toString().trim();
      const tname = (editingLesson.topic_name || '').toString().trim();
      if (!tid || !tname) {
        return alert('Đã tích “Chuyên đề ôn thi” — vui lòng chọn chuyên đề có sẵn hoặc bấm “+ Tạo chuyên đề mới”.');
      }
    } else if (!chapter || !lessonNo) {
      return alert('Cần chọn đầy đủ: Chương và Bài (hoặc tích “Chuyên đề ôn thi”).');
    }
    const gradeForLesson = (editingLesson.grade_level || activeGrade || '8').toString();
    const existingSlug = String(editingLesson.slug || '').trim();
    const slug = existingSlug
      ? existingSlug
      : ensureUniqueLessonSlug(
          buildLessonSlug({
            grade_level: gradeForLesson,
            chapter: isTopicLesson ? (editingLesson.topic_id || 'cd') : chapter,
            lesson_no: isTopicLesson ? (Date.now().toString().slice(-4)) : lessonNo,
            title: editingLesson.title,
          }),
          editingLesson.id,
          lessonsList
        );
    const dataToSave = {
      ...editingLesson,
      grade_level: gradeForLesson,
      chapter,
      lesson_no: lessonNo,
      videoUrl: (editingLesson.videoUrl ?? '').toString().trim(),
      videoMaterialUrl: (editingLesson.videoMaterialUrl ?? '').toString().trim(),
      pdfUrl: (editingLesson.pdfUrl ?? '').toString().trim(),
      is_topic: isTopicLesson,
      topic_id: isTopicLesson ? (editingLesson.topic_id || '').toString().trim() : '',
      topic_name: isTopicLesson ? (editingLesson.topic_name || '').toString().trim() : '',
      slug,
    };
    delete dataToSave.isNew;
    delete dataToSave.id;
    try {
      if (editingLesson.isNew) { dataToSave.timestamp = Date.now(); await addDoc(collection(db, COLLECTION_LESSONS), dataToSave); }
      else await updateDoc(doc(db, COLLECTION_LESSONS, editingLesson.id), dataToSave);
      setEditingLesson(null);
    } catch { alert("Lỗi lưu bài giảng"); }
  };

  const handleDeleteLesson = async (id) => {
if (window.confirm("Xóa bài giảng này?")) await deleteDoc(doc(db, COLLECTION_LESSONS, id));
  };

  const handleImportLesson = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    let t = '';
    try {
      if (ext === 'docx') {
        const buf = await file.arrayBuffer();
        const res = await mammoth.extractRawText({ arrayBuffer: buf });
        t = (res.value || '').trim();
      } else {
        t = (await file.text()).trim();
      }
    } catch {
      alert('Đọc file thất bại. Thử lại với .txt hoặc .docx.');
      e.target.value = '';
      return;
    }
    if (!t) {
      alert('File không có nội dung text.');
      e.target.value = '';
      return;
    }
    const parsed = parseLessonsFromText(t);
    const meta = parsed?.meta || {};
    const fromMeta = lessonFieldsFromImportMeta(meta);
    const nEx = parsed.examples?.length ?? 0;
    const nPr = parsed.practice?.length ?? 0;
    const fk = String(parsed?.seo?.focus_keyword || '').trim();
    const nk = Array.isArray(parsed?.seo?.keywords) ? parsed.seo.keywords.length : 0;
    setEditingLesson({
      ...editingLesson,
      title: fromMeta.title || editingLesson?.title,
      grade_level: fromMeta.grade_level || editingLesson?.grade_level,
      chapter: fromMeta.chapter || editingLesson?.chapter,
      lesson_no: fromMeta.lesson_no || editingLesson?.lesson_no,
      videoUrl: fromMeta.videoUrl || editingLesson?.videoUrl || '',
      videoMaterialUrl: fromMeta.videoMaterialUrl || editingLesson?.videoMaterialUrl || '',
      pdfUrl: fromMeta.pdfUrl || editingLesson?.pdfUrl || '',
      description: fromMeta.description || editingLesson?.description || '',
      content: JSON.stringify(parsed),
    });
    alert(
      `Đã import: ${nEx} mục lý thuyết/ví dụ${nPr ? `, ${nPr} phần bài tập tự luyện` : ''}${fromMeta.pdfUrl ? ', đã nhận link PDF' : ''}${fk || nk ? ` — SEO: ${fk ? `TK chính «${fk}»` : ''}${fk && nk ? ', ' : ''}${nk ? `${nk} từ khóa phụ` : ''}` : ''}. Kiểm tra Chương/Bài/Tiêu đề rồi Lưu.`
    );
    e.target.value = '';
  };

  const renderLessonEditor = () => {
    const examplesArrayToCoreText = (arr) => {
      const list = Array.isArray(arr) ? arr : [];
      const out = [];
      for (const ex of list) {
        const title = (ex?.title ?? '').toString().trim();
        const desc = (ex?.desc ?? '').toString().trim();
        const items = Array.isArray(ex?.items) ? ex.items : [];
        if (title) out.push(title);
        if (desc) out.push(`Phương pháp:\n${desc}`);
        for (const it of items) {
          const q = (it?.q ?? '').toString().trim();
          const steps = Array.isArray(it?.steps) ? it.steps.map((s) => String(s ?? '').trim()).filter(Boolean) : [];
          if (q) out.push(`Ví dụ:\n${q}`);
          if (steps.length) out.push(`Lời giải:\n${steps.join('\n')}`);
        }
        out.push('');
      }
      const s = out.join('\n').replace(/\\n{3,}/g, '\\n\\n').trim();
      return s ? s + '\\n' : '';
    };

    const patchLessonContent = (patch) => {
      setEditingLesson((el) => {
        if (!el) return el;
        return { ...el, content: mergeLessonContentString(el.content, patch) };
      });
    };
    const cObj = lessonContentParse.obj;
    const jsonBroken = Boolean(lessonContentParse.error);
    const examples = jsonBroken ? [] : (cObj?.examples ?? []);
    const practiceList = jsonBroken ? [] : (cObj?.practice ?? []);
    const theoryCoreVal = jsonBroken ? '' : (cObj?.theory_core ?? '').toString();
    const examplesCoreVal = jsonBroken ? '' : (cObj?.examples_core ?? '').toString();
    if (theoryLastSnapRef.current === '' && theoryCoreVal) {
      theoryLastSnapRef.current = theoryCoreVal;
      theoryLastAtRef.current = Date.now();
    }
    if (examplesLastSnapRef.current === '' && examplesCoreVal) {
      examplesLastSnapRef.current = examplesCoreVal;
      examplesLastAtRef.current = Date.now();
    }
    const canUndoTheory = theoryUndoStackRef.current.length > 0;
    const recordTheorySnapshot = (nextVal) => {
      const now = Date.now();
      const prev = theoryLastSnapRef.current;
      if (nextVal === prev) return;
      if (now - theoryLastAtRef.current < 900) return;
      theoryUndoStackRef.current.push(prev);
      if (theoryUndoStackRef.current.length > 120) theoryUndoStackRef.current.shift();
      theoryLastSnapRef.current = nextVal;
      theoryLastAtRef.current = now;
    };
    const canUndoExamples = examplesUndoStackRef.current.length > 0;
    const recordExamplesSnapshot = (nextVal) => {
      const now = Date.now();
      const prev = examplesLastSnapRef.current;
      if (nextVal === prev) return;
      if (now - examplesLastAtRef.current < 900) return;
      examplesUndoStackRef.current.push(prev);
      if (examplesUndoStackRef.current.length > 120) examplesUndoStackRef.current.shift();
      examplesLastSnapRef.current = nextVal;
      examplesLastAtRef.current = now;
    };
    const undoTheory = () => {
      const prev = theoryUndoStackRef.current.pop();
      if (prev === undefined) return;
      patchLessonContent({ theory_core: prev });
      theoryLastSnapRef.current = prev;
      theoryLastAtRef.current = Date.now();
      requestAnimationFrame(() => {
        const el = lessonTheoryTextareaRef.current;
        if (!el) return;
        try {
          el.focus();
          const p = prev.length;
          el.setSelectionRange(p, p);
        } catch {
          /* ignore */
        }
      });
    };
    const undoExamples = () => {
      const prev = examplesUndoStackRef.current.pop();
      if (prev === undefined) return;
      patchLessonContent({ examples_core: prev });
      examplesLastSnapRef.current = prev;
      examplesLastAtRef.current = Date.now();
      requestAnimationFrame(() => {
        const el = lessonExamplesTextareaRef.current;
        if (!el) return;
        try {
          el.focus();
          const p = prev.length;
          el.setSelectionRange(p, p);
        } catch {
          /* ignore */
        }
      });
    };
    const previewTab =
      lessonAdminPane === 'practice'
        ? 'practice'
        : lessonAdminPane === 'examples_core'
          ? 'theory'
        : lessonAdminPane === 'materials'
          ? 'pdf'
          : lessonAdminPane === 'raw'
            ? undefined
            : 'theory';

    return (
      <div className="flex flex-col xl:flex-row xl:items-stretch gap-3 animate-in fade-in min-w-0">
        <div
          className="w-full xl:flex-[7] xl:min-w-0 min-w-0 flex flex-col gap-2 bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm xl:max-h-[calc(100dvh-5.25rem)] xl:overflow-y-auto"
          onFocusCapture={captureAdminTextFocus}
        >
          <div className="flex justify-between items-center shrink-0 gap-2">
            <h3 className="font-bold text-base md:text-lg text-indigo-800 flex items-center gap-2 min-w-0 truncate">
              <Video size={18} className="shrink-0" />{' '}
              <span className="truncate">{editingLesson.isNew ? 'Thêm Bài Giảng Mới' : 'Sửa Bài Giảng'}</span>
            </h3>
            <button type="button" onClick={() => setEditingLesson(null)} className="text-slate-400 hover:text-red-500 shrink-0">
              <XCircle size={22} />
            </button>
          </div>
          <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <input
              type="text"
              value={editingLesson.title}
              onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
              placeholder="Tiêu đề bài giảng"
              className="sm:col-span-1 lg:col-span-2 w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-indigo-500 font-bold"
            />
            <select
              value={(editingLesson.grade_level || (activeGrade !== 'ALL' ? activeGrade : '') || '11').toString()}
              onChange={(e) => setEditingLesson({ ...editingLesson, grade_level: e.target.value })}
              className="w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 bg-white"
            >
              <option value="6">Toán 6</option>
              <option value="7">Toán 7</option>
              <option value="8">Toán 8</option>
              <option value="9">Toán 9</option>
              <option value="10">Toán 10</option>
              <option value="11">Toán 11</option>
              <option value="12">Toán 12</option>
            </select>
            <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1">
              <input
                type="text"
                value={(editingLesson.chapter || '')}
                onChange={(e) => setEditingLesson({ ...editingLesson, chapter: e.target.value })}
                placeholder={editingLesson.is_topic ? 'Chương (tuỳ chọn)' : 'Chương'}
                title={editingLesson.is_topic ? 'Bài thuộc Chuyên đề: có thể chọn chương để hiển thị (không bắt buộc)' : undefined}
                className={`w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-indigo-500 font-semibold text-center ${
                  editingLesson.is_topic ? 'bg-indigo-50/40 border-indigo-200' : ''
                }`}
              />
              <input
                type="text"
                value={(editingLesson.lesson_no || '')}
                onChange={(e) => setEditingLesson({ ...editingLesson, lesson_no: e.target.value })}
                placeholder={editingLesson.is_topic ? 'Bài (tuỳ chọn)' : 'Bài'}
                title={editingLesson.is_topic ? 'Bài thuộc Chuyên đề: có thể đặt số thứ tự để sắp xếp trong chương (không bắt buộc)' : undefined}
                className={`w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-indigo-500 font-semibold text-center ${
                  editingLesson.is_topic ? 'bg-indigo-50/40 border-indigo-200' : ''
                }`}
              />
            </div>
          </div>
          <div className="shrink-0 grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              type="url"
              value={editingLesson.videoUrl || ''}
              onChange={(e) => setEditingLesson({ ...editingLesson, videoUrl: e.target.value })}
              placeholder="YouTube (youtu.be / youtube.com/...)"
              className="w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="url"
              value={editingLesson.pdfUrl || ''}
              onChange={(e) => setEditingLesson({ ...editingLesson, pdfUrl: e.target.value })}
              placeholder="Link PDF"
              className="w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <p className="shrink-0 text-[11px] leading-snug text-slate-500 -mt-0.5">
            YouTube nhúng chính; PDF mở tab Tài liệu (Drive: quyền xem theo link).
          </p>
          <div className="relative border rounded-md focus-within:ring-2 ring-indigo-500 shrink-0">
            <textarea
              data-admin-snippet="lesson-desc"
              value={editingLesson.description || ''}
              onChange={(e) => setEditingLesson({ ...editingLesson, description: e.target.value })}
              placeholder="Tóm tắt / SEO ngắn (@seo_description khi import)…"
              className="w-full p-2 border-0 h-[4.25rem] resize-y text-sm bg-transparent min-h-[3.25rem]"
            />
          </div>

          {(() => {
            const existingTopics = listExistingTopics(lessonsList, {
              grade: editingLesson.grade_level || (activeGrade !== 'ALL' ? activeGrade : null),
            });
            const isTopic = !!editingLesson.is_topic;
            const topicId = (editingLesson.topic_id || '').toString();
            return (
              <div className="shrink-0 rounded-lg border border-indigo-100 bg-indigo-50/40 p-2.5 space-y-2">
                <label className="flex items-center gap-2 text-[12px] font-bold text-indigo-900 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isTopic}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setEditingLesson({
                        ...editingLesson,
                        is_topic: on,
                        topic_id: on ? editingLesson.topic_id || '' : '',
                        topic_name: on ? editingLesson.topic_name || '' : '',
                      });
                    }}
                    className="w-4 h-4 accent-indigo-600"
                  />
                  Bài giảng thuộc <span className="underline decoration-indigo-300">Chuyên đề ôn thi</span>
                  <span className="text-[10px] font-semibold text-slate-500 ml-1">(gom riêng trong tab Chuyên đề cho học sinh)</span>
                </label>
                {isTopic && (
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                    <select
                      value={topicId && existingTopics.some((t) => t.id === topicId) ? topicId : ''}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (!id) return;
                        const hit = existingTopics.find((t) => t.id === id);
                        setEditingLesson({
                          ...editingLesson,
                          is_topic: true,
                          topic_id: id,
                          topic_name: hit?.name || editingLesson.topic_name || '',
                        });
                      }}
                      className="w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="">— Chọn chuyên đề đã có —</option>
                      {existingTopics.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const name = window.prompt('Tên chuyên đề mới:', editingLesson.topic_name || '');
                        if (!name || !name.trim()) return;
                        const nm = name.trim();
                        const existed = existingTopics.find((t) => t.name.toLowerCase() === nm.toLowerCase());
                        const id = existed ? existed.id : slugifyTopicId(nm);
                        setEditingLesson({
                          ...editingLesson,
                          is_topic: true,
                          topic_id: id,
                          topic_name: nm,
                        });
                      }}
                      className="px-3 py-2 text-xs font-bold rounded-md bg-indigo-600 hover:bg-indigo-700 text-white whitespace-nowrap"
                    >
                      + Tạo chuyên đề mới
                    </button>
                  </div>
                )}
                {isTopic && (
                  <input
                    type="text"
                    value={editingLesson.topic_name || ''}
                    onChange={(e) => setEditingLesson({ ...editingLesson, topic_name: e.target.value })}
                    placeholder="Tên chuyên đề hiển thị cho học sinh"
                    className="w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                )}
                {isTopic && !topicId && (
                  <p className="text-[11px] text-rose-600 font-semibold">
                    Chưa có ID chuyên đề — hãy chọn “chuyên đề đã có” hoặc bấm “+ Tạo chuyên đề mới” để lưu tên mới.
                  </p>
                )}
              </div>
            );
          })()}

          <LessonSeoAdminPanel lesson={editingLesson} theoryCore={theoryCoreVal} lessonsList={lessonsList} />

          {jsonBroken ? (
            <div className="shrink-0 rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-xs p-2 font-semibold">
              JSON lỗi: {lessonContentParse.error}. Sửa tab <strong>JSON nâng cao</strong>.
            </div>
          ) : null}

          <div className="bg-slate-50 p-2 border border-slate-200 rounded-lg flex-1 min-h-[min(58vh,640px)] flex flex-col gap-2 min-w-0">
            <div className="shrink-0 flex flex-wrap justify-between items-center gap-2">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 min-w-0">
                <span>🛠</span>
                <span className="truncate">Nội dung · import / sửa</span>
              </h4>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <AdminImageUploadControl
                  storage={storage}
                  user={user}
                  busy={imageUploadBusy}
                  onFile={handleAdminImageUpload}
                />
                <span className="text-[10px] text-slate-500 max-w-[200px] leading-tight hidden sm:inline">
                  Click vào ô nhập trước, rồi Upload — chèn <code className="bg-slate-200/80 px-0.5 rounded">![](url)</code>
                </span>
                <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded-md text-[11px] font-bold cursor-pointer inline-flex items-center gap-1.5 shrink-0">
                  Import TXT/Word
                  <input type="file" accept=".txt,.docx" onChange={handleImportLesson} className="hidden" />
                </label>
                <a
                  href="/mau-import-bai-giang.txt"
                  download
                  className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline decoration-indigo-300 shrink-0"
                  title="Tải mẫu import bài giảng"
                >
                  mau-import-bai-giang.txt
                </a>
              </div>
            </div>
            <div className="shrink-0 flex flex-wrap gap-1 border-b border-slate-200 pb-1.5">
              {[
                { id: 'theory', label: 'Lý thuyết', Icon: BookOpen },
                { id: 'examples_core', label: 'Các dạng toán & ví dụ', Icon: FileEdit },
                { id: 'practice', label: 'Bài tập tự luyện', Icon: ListOrdered },
                { id: 'materials', label: 'Tài liệu (JSON)', Icon: Link2 },
                { id: 'raw', label: 'JSON nâng cao', Icon: FileText },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setLessonAdminPane(id)}
                  className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-bold transition-colors ${
                    lessonAdminPane === id
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={12} className="shrink-0" /> {label}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
            {lessonAdminPane === 'theory' && (
              <div className="animate-in fade-in flex-1 min-h-0 flex flex-col gap-2">
                <p className="text-[11px] text-slate-600 shrink-0 leading-snug">
                  <code className="bg-slate-200/80 px-1 rounded">theory_core</code> — LaTeX{' '}
                  <code className="bg-slate-200/80 px-0.5 rounded">$...$</code> / <code className="bg-slate-200/80 px-0.5 rounded">$$...$$</code>
                  {' '}· Thẻ khối: <code className="bg-slate-200/80 px-1 rounded">{`#[Phương pháp: ...]#`}</code>{' '}
                  <code className="bg-slate-200/80 px-1 rounded">{`#[Ví dụ: ...]#`}</code>{' '}
                  <code className="bg-slate-200/80 px-1 rounded">{`#[Định nghĩa: ...]#`}</code>{' '}
                  <code className="bg-slate-200/80 px-1 rounded">{`#[Ghi nhớ: ...]#`}</code>{' '}
                  <code className="bg-slate-200/80 px-1 rounded">{`#[Lời giải: ...]#`}</code> (vẫn tương thích <code className="bg-slate-200/80 px-1 rounded">{`{...}`}</code>).
                </p>
                <LessonFormattingToolbar
                  textareaRef={lessonTheoryTextareaRef}
                  value={theoryCoreVal}
                  disabled={jsonBroken}
                  canUndo={canUndoTheory}
                  onUndo={undoTheory}
                  gradeLevel={(
                    editingLesson.grade_level ||
                    (activeGrade !== 'ALL' ? activeGrade : '') ||
                    '11'
                  ).toString()}
                  onApply={(next, selStart, selEnd) => {
                    theoryUndoStackRef.current.push(theoryCoreVal);
                    if (theoryUndoStackRef.current.length > 120) theoryUndoStackRef.current.shift();
                    theoryLastSnapRef.current = next;
                    theoryLastAtRef.current = Date.now();
                    patchLessonContent({ theory_core: next });
                    requestAnimationFrame(() => {
                      requestAnimationFrame(() => {
                        const el = lessonTheoryTextareaRef.current;
                        if (el) {
                          try {
                            el.focus();
                            el.setSelectionRange(selStart, selEnd);
                          } catch {
                            /* ignore */
                          }
                        }
                      });
                    });
                  }}
                />
                <textarea
                  ref={lessonTheoryTextareaRef}
                  data-admin-snippet="lesson-theory"
                  value={theoryCoreVal}
                  disabled={jsonBroken}
                  onChange={(e) => {
                    const next = e.target.value;
                    patchLessonContent({ theory_core: next });
                    recordTheorySnapshot(next);
                  }}
                  placeholder="Công thức, định nghĩa, lưu ý trọng tâm…"
                  className="w-full flex-1 min-h-[min(52vh,620px)] p-3 border border-slate-300 rounded-lg text-sm font-sans disabled:opacity-50 resize-y"
                />
              </div>
            )}

            {lessonAdminPane === 'examples_core' && (
              <div className="animate-in fade-in flex-1 min-h-0 flex flex-col gap-2">
                <p className="text-[11px] text-slate-600 shrink-0 leading-snug">
                  <code className="bg-slate-200/80 px-1 rounded">examples_core</code> — nhập nội dung “Các dạng toán & ví dụ” theo cùng cú pháp như Lý thuyết (có thẻ khối).
                </p>
                {!examplesCoreVal.trim() && Array.isArray(examples) && examples.length > 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11px] text-amber-900 flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0">
                      Preview đang hiện từ dữ liệu cũ <code className="bg-amber-100 px-1 rounded">examples</code>. Bấm nút để tự chuyển sang{' '}
                      <code className="bg-amber-100 px-1 rounded">examples_core</code> rồi sửa bằng ô này.
                    </span>
                    <button
                      type="button"
                      disabled={jsonBroken}
                      onClick={() => {
                        const text = examplesArrayToCoreText(examples);
                        patchLessonContent({ examples_core: text });
                        examplesUndoStackRef.current.push(examplesCoreVal);
                        examplesLastSnapRef.current = text;
                        examplesLastAtRef.current = Date.now();
                        requestAnimationFrame(() => lessonExamplesTextareaRef.current?.focus?.());
                      }}
                      className="shrink-0 px-2.5 py-1.5 rounded-md bg-amber-200 text-amber-900 border border-amber-300 text-[11px] font-black hover:bg-amber-300 disabled:opacity-40"
                      title="Chuyển dữ liệu cũ (examples) thành nội dung text"
                    >
                      Tự chuyển nội dung cũ → ô này
                    </button>
                  </div>
                ) : null}
                <LessonFormattingToolbar
                  textareaRef={lessonExamplesTextareaRef}
                  value={examplesCoreVal}
                  disabled={jsonBroken}
                  canUndo={canUndoExamples}
                  onUndo={undoExamples}
                  gradeLevel={(
                    editingLesson.grade_level ||
                    (activeGrade !== 'ALL' ? activeGrade : '') ||
                    '11'
                  ).toString()}
                  onApply={(next, selStart, selEnd) => {
                    examplesUndoStackRef.current.push(examplesCoreVal);
                    if (examplesUndoStackRef.current.length > 120) examplesUndoStackRef.current.shift();
                    examplesLastSnapRef.current = next;
                    examplesLastAtRef.current = Date.now();
                    patchLessonContent({ examples_core: next });
                    requestAnimationFrame(() => {
                      requestAnimationFrame(() => {
                        const el = lessonExamplesTextareaRef.current;
                        if (el) {
                          try {
                            el.focus();
                            el.setSelectionRange(selStart, selEnd);
                          } catch {
                            /* ignore */
                          }
                        }
                      });
                    });
                  }}
                />
                <textarea
                  ref={lessonExamplesTextareaRef}
                  data-admin-snippet="lesson-examples-core"
                  value={examplesCoreVal}
                  disabled={jsonBroken}
                  onChange={(e) => {
                    const next = e.target.value;
                    patchLessonContent({ examples_core: next });
                    recordExamplesSnapshot(next);
                  }}
                  placeholder="Dạng 1..., {Ví dụ: ...}, {Lời giải: ...}..."
                  className="w-full flex-1 min-h-[min(52vh,620px)] p-3 border border-slate-300 rounded-lg text-sm font-sans disabled:opacity-50 resize-y"
                />
                {Array.isArray(examples) && examples.length > 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-[11px] text-amber-900">
                    Lưu ý: bài này đang có dữ liệu cũ trong <code className="bg-amber-100 px-1 rounded">examples</code> (mảng). Nếu bạn dùng{' '}
                    <code className="bg-amber-100 px-1 rounded">examples_core</code> thì phần hiển thị sẽ ưu tiên nội dung mới.
                  </div>
                ) : null}
              </div>
            )}

            {lessonAdminPane === 'practice' && (
              <div className="space-y-3 animate-in fade-in flex-1 min-h-0 overflow-y-auto pr-0.5">
                <p className="text-xs text-slate-600">
                  Mảng <code className="bg-slate-200/80 px-1 rounded">practice</code> — tab “Bài tập” của học sinh. Loại: mcq / input / text.
                  Import TXT: sau <code className="bg-slate-200/80 px-1 rounded">Đáp án:</code> có thể thêm{' '}
                  <code className="bg-slate-200/80 px-1 rounded">Gợi ý hướng dẫn:</code> (hiện trước khi nộp) và{' '}
                  <code className="bg-slate-200/80 px-1 rounded">Lời giải:</code> (hiện sau khi nộp).
                </p>
                <button
                  type="button"
                  disabled={jsonBroken}
                  onClick={() =>
                    patchLessonContent({ practice: [...practiceList, emptyPracticeTemplate(practiceList.length)] })
                  }
                  className="text-sm font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-40"
                >
                  + Thêm câu
                </button>
                {practiceList.map((p, idx) => (
                  <div key={p.id || idx} className="border border-slate-200 rounded-lg p-3 bg-white space-y-2">
                    <div className="flex flex-wrap justify-between gap-2 items-center">
                      <select
                        disabled={jsonBroken}
                        value={(p.type || 'text').toString()}
                        onChange={(e) => {
                          const t = e.target.value;
                          const next = practiceList.map((x, j) =>
                            j === idx
                              ? {
                                  ...x,
                                  type: t,
                                  options: t === 'mcq' ? (x.options?.length ? x.options : ['', '', '', '']) : x.options,
                                }
                              : x
                          );
                          patchLessonContent({ practice: next });
                        }}
                        className="p-2 border rounded text-sm font-bold disabled:opacity-50"
                      >
                        <option value="mcq">Trắc nghiệm (mcq)</option>
                        <option value="input">Nhập số / đáp án (input)</option>
                        <option value="text">Tự luận (text)</option>
                      </select>
                      <button
                        type="button"
                        disabled={jsonBroken}
                        onClick={() => patchLessonContent({ practice: practiceList.filter((_, j) => j !== idx) })}
                        className="text-xs font-bold text-red-600 hover:underline disabled:opacity-40"
                      >
                        Xóa câu
                      </button>
                    </div>
                    <textarea
                      data-admin-snippet={`lesson-practice-q:${idx}`}
                      disabled={jsonBroken}
                      value={(p.question ?? p.content ?? '').toString()}
                      onChange={(e) => {
                        const next = practiceList.map((x, j) =>
                          j === idx ? { ...x, question: e.target.value } : x
                        );
                        patchLessonContent({ practice: next });
                      }}
                      placeholder="Đề bài / nội dung câu"
                      className="w-full p-2 border rounded text-sm min-h-[64px] disabled:opacity-50"
                    />
                    {(p.type || 'text') === 'mcq' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(Array.isArray(p.options) && p.options.length ? p.options : ['', '', '', '']).map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 w-5">{String.fromCharCode(65 + oi)}.</span>
                            <input
                              data-admin-snippet={`lesson-practice-opt:${idx}:${oi}`}
                              disabled={jsonBroken}
                              value={(opt ?? '').toString()}
                              onChange={(e) => {
                                const opts = [...(Array.isArray(p.options) && p.options.length ? p.options : ['', '', '', ''])];
                                opts[oi] = e.target.value;
                                const next = practiceList.map((x, j) => (j === idx ? { ...x, options: opts } : x));
                                patchLessonContent({ practice: next });
                              }}
                              className="flex-1 p-2 border rounded text-sm disabled:opacity-50"
                              placeholder={`Phương án ${String.fromCharCode(65 + oi)}`}
                            />
                          </div>
                        ))}
                        <label className="sm:col-span-2 flex items-center gap-2 text-sm">
                          <span className="font-semibold text-slate-600 shrink-0">Đáp án đúng (0–3 hoặc A–D):</span>
                          <input
                            disabled={jsonBroken}
                            value={
                              typeof p.correctAnswer === 'number'
                                ? String(p.correctAnswer)
                                : (p.correctAnswer ?? '').toString()
                            }
                            onChange={(e) => {
                              const raw = e.target.value.trim();
                              let ca = raw;
                              if (/^\d+$/.test(raw)) ca = Number(raw);
                              else if (/^[A-Da-d]$/.test(raw)) ca = raw.toUpperCase().charCodeAt(0) - 65;
                              const next = practiceList.map((x, j) => (j === idx ? { ...x, correctAnswer: ca } : x));
                              patchLessonContent({ practice: next });
                            }}
                            className="w-24 p-2 border rounded font-mono disabled:opacity-50"
                          />
                        </label>
                      </div>
                    ) : null}
                    {(p.type || 'text') === 'input' ? (
                      <input
                        disabled={jsonBroken}
                        value={(p.correctAnswer ?? '').toString()}
                        onChange={(e) => {
                          const next = practiceList.map((x, j) =>
                            j === idx ? { ...x, correctAnswer: e.target.value } : x
                          );
                          patchLessonContent({ practice: next });
                        }}
                        placeholder="Đáp án đúng (chuỗi so khớp)"
                        className="w-full p-2 border rounded text-sm disabled:opacity-50"
                      />
                    ) : null}
                    <textarea
                      data-admin-snippet={`lesson-practice-hint:${idx}`}
                      disabled={jsonBroken}
                      value={(p.hint ?? '').toString()}
                      onChange={(e) => {
                        const next = practiceList.map((x, j) =>
                          j === idx ? { ...x, hint: e.target.value } : x
                        );
                        patchLessonContent({ practice: next });
                      }}
                      placeholder="Gợi ý hướng dẫn (tùy chọn — học sinh bấm xem trước khi nộp bài)"
                      className="w-full p-2 border rounded text-xs min-h-[56px] disabled:opacity-50 border-amber-200/80 bg-amber-50/30"
                    />
                    <textarea
                      data-admin-snippet={`lesson-practice-ex:${idx}`}
                      disabled={jsonBroken}
                      value={(p.explanation ?? '').toString()}
                      onChange={(e) => {
                        const next = practiceList.map((x, j) =>
                          j === idx ? { ...x, explanation: e.target.value } : x
                        );
                        patchLessonContent({ practice: next });
                      }}
                      placeholder="Lời giải chi tiết (hiện sau khi học sinh nộp bài)"
                      className="w-full p-2 border rounded text-xs min-h-[56px] disabled:opacity-50"
                    />
                  </div>
                ))}
                {practiceList.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">Chưa có bài tập tự luyện — thêm câu hoặc import.</p>
                ) : null}
              </div>
            )}

            {lessonAdminPane === 'materials' && (
              <div className="animate-in fade-in flex-1 min-h-0 flex flex-col gap-2">
                <p className="text-[11px] text-slate-600 shrink-0 leading-snug">
                  Khóa <code className="bg-slate-200/80 px-1 rounded">materials</code> — mảng tài liệu hiển thị ở tab{' '}
                  <strong className="text-slate-700">TÀI LIỆU PDF</strong> của học sinh (chỉ hiện mục có <code className="bg-slate-200/80 px-0.5 rounded">url</code>{' '}
                  không rỗng). Trường <code className="bg-slate-200/80 px-0.5 rounded">pdfUrl</code> trên bài giảng vẫn dùng được song song.
                </p>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={jsonBroken}
                    onClick={() => {
                      const { obj, error } = parseLessonContentObject(editingLesson.content);
                      if (error || !obj) {
                        setLessonMaterialsDraft(DEFAULT_LESSON_MATERIALS_JSON);
                        return;
                      }
                      const m = obj.materials;
                      if (Array.isArray(m) && m.length > 0) {
                        setLessonMaterialsDraft(JSON.stringify(m, null, 2));
                      } else {
                        setLessonMaterialsDraft(DEFAULT_LESSON_MATERIALS_JSON);
                      }
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-40 px-2 py-1 border border-indigo-200 rounded-md bg-indigo-50/80"
                  >
                    Đọc lại từ JSON hiện tại
                  </button>
                  <button
                    type="button"
                    disabled={jsonBroken}
                    onClick={() => setLessonMaterialsDraft(DEFAULT_LESSON_MATERIALS_JSON)}
                    className="text-xs font-bold text-slate-600 hover:text-slate-800 disabled:opacity-40 px-2 py-1 border border-slate-200 rounded-md bg-slate-50"
                  >
                    Chèn mẫu link rỗng
                  </button>
                </div>
                <textarea
                  data-admin-snippet="lesson-materials"
                  disabled={jsonBroken}
                  value={lessonMaterialsDraft}
                  onChange={(e) => setLessonMaterialsDraft(e.target.value)}
                  onBlur={() => {
                    if (jsonBroken) return;
                    try {
                      const p = JSON.parse(lessonMaterialsDraft);
                      if (!Array.isArray(p)) return;
                      const cleaned = p
                        .filter((x) => x && typeof x === 'object')
                        .map((x) => ({
                          title: String(x.title ?? '').trim(),
                          url: String(x.url ?? '').trim(),
                        }));
                      patchLessonContent({ materials: cleaned });
                    } catch {
                      /* giữ draft, không ghi nếu JSON lỗi */
                    }
                  }}
                  spellCheck={false}
                  className="w-full flex-1 min-h-[min(40vh,480px)] text-xs font-mono p-3 border border-slate-300 rounded-lg bg-white resize-y disabled:opacity-50"
                />
                <p className="text-[10px] text-slate-500 shrink-0">
                  Rời khỏi ô (blur) để lưu vào nội dung bài. Tab JSON nâng cao cũng có thể sửa trực tiếp khóa <code className="bg-slate-100 px-0.5 rounded">materials</code>.
                </p>
              </div>
            )}

            {lessonAdminPane === 'raw' && (
              <div className="space-y-1 animate-in fade-in flex-1 min-h-0 flex flex-col">
                <p className="text-[11px] text-slate-600 shrink-0">JSON đầy đủ (Firestore). Tab khác merge khi JSON hợp lệ.</p>
                <textarea
                  data-admin-snippet="lesson-raw"
                  value={editingLesson.content || ''}
                  onChange={(e) => setEditingLesson({ ...editingLesson, content: e.target.value })}
                  spellCheck={false}
                  className="w-full flex-1 min-h-[min(48vh,560px)] text-xs font-mono p-2 border border-slate-300 rounded-lg bg-white resize-y"
                />
              </div>
            )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveLesson}
            className="shrink-0 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2"
          >
            <Save size={18} /> Lưu Bài Giảng Lên Hệ Thống
          </button>
        </div>

        <div className="w-full xl:flex-[3] xl:min-w-0 min-w-0 xl:sticky xl:top-2 flex flex-col gap-1.5 min-h-[45vh] xl:min-h-0 xl:max-h-[calc(100dvh-5.25rem)]">
          <div className="shrink-0 flex items-start gap-1.5 text-[11px] font-bold text-teal-900 bg-teal-50 border border-teal-200 rounded-md px-2 py-1.5 leading-snug">
            <Eye size={14} className="shrink-0 text-teal-700 mt-0.5" />
            <span>Xem trước (~30%) · chưa lưu · đồng bộ tab Lý thuyết / Bài tập</span>
          </div>
          <div className="flex-1 min-h-0 rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm flex flex-col [contain:inline-size]">
            {draftLessonForPreview ? (
              <StudentLessonViewer
                previewEmbed
                previewSyncedTab={previewTab}
                lesson={draftLessonForPreview}
                lessonsList={[draftLessonForPreview]}
                quizzesList={[]}
                scoresList={[]}
                studentName=""
                rosterGrade={String(draftLessonForPreview.grade_level || '11')}
                onBack={() => {}}
                onBackToOverview={() => {}}
                onOpenExamsRoom={undefined}
                onSelectLesson={() => {}}
                onStartQuiz={() => {}}
                onRequestLoginForPapers={() => {}}
              />
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const handleSaveQuiz = async () => {
    if (!editingQuiz) return;
    if (!user) {
alert("Hệ thống chưa kết nối (chưa đăng nhập). Vui lòng đợi 3-5 giây rồi thử lại.");
      return;
    }
if (!(editingQuiz.title || '').toString().trim() || editingQuiz.questions.length === 0) return alert("Kiểm tra lại tên đề và câu hỏi!");
    const examType = (editingQuiz.exam_type || 'lesson').toString().trim();
    const gradeForQuiz = (editingQuiz.grade_level || activeGrade || '8').toString().trim();
    if (examType === 'mock' && !(gradeForQuiz === '9' || gradeForQuiz === '12')) {
      return alert("Đề thi thử (mock) chỉ áp dụng cho Lớp 9 và Lớp 12.");
    }
    const chapter = (editingQuiz.chapter ?? '').toString().trim();
    const lessonNo = (editingQuiz.lesson_no ?? '').toString().trim();
    const topicLessonId = (editingQuiz.topic_lesson_id || '').toString().trim();
    const topicId = (editingQuiz.topic_id || '').toString().trim();
    if (examType === 'lesson' && (!chapter || !lessonNo) && !topicLessonId) {
      return alert("Đề theo bài cần chọn đầy đủ: Chương và Bài (hoặc gán theo Chuyên đề bằng topic_lesson_id).");
    }
    const pp = normalizePartPoints(editingQuiz);
    const stars = Math.min(5, Math.max(1, Math.round(Number(editingQuiz.difficulty_stars)) || 3));
    const now = Date.now();
    const dataToSave = {
      ...editingQuiz,
      level: 'test',
      grade_level: gradeForQuiz,
      exam_type: examType,
      points_mc: pp.points_mc,
      points_tf: pp.points_tf,
      points_short: pp.points_short,
      points_essay: pp.points_essay,
      difficulty_stars: stars,
      updated_at: now,
      ...(editingQuiz.isNew ? { created_at: now } : {}),
    };
    // Firestore updateDoc không nhận field = undefined. Với đề không "theo bài", Chương/Bài là tuỳ chọn.
    if (examType === 'lesson') {
      dataToSave.chapter = chapter;
      dataToSave.lesson_no = lessonNo;
      dataToSave.topic_id = topicLessonId ? topicId : '';
      dataToSave.topic_name = topicLessonId ? (editingQuiz.topic_name || '').toString().trim() : '';
      dataToSave.topic_lesson_id = topicLessonId || '';
      dataToSave.topic_lesson_title = topicLessonId ? (editingQuiz.topic_lesson_title || '').toString().trim() : '';
    } else {
      if (chapter) dataToSave.chapter = chapter;
      else delete dataToSave.chapter;
      if (lessonNo) dataToSave.lesson_no = lessonNo;
      else delete dataToSave.lesson_no;
      delete dataToSave.topic_id;
      delete dataToSave.topic_name;
      delete dataToSave.topic_lesson_id;
      delete dataToSave.topic_lesson_title;
    }
    delete dataToSave.isNew;
    try {
      setIsSavingQuiz(true);
      if (editingQuiz.isNew) await withTimeout(addDoc(collection(db, COLLECTION_QUIZZES), dataToSave), 20000, "Lưu đề thi quá lâu (timeout).");
else await withTimeout(updateDoc(doc(db, COLLECTION_QUIZZES, editingQuiz.id), dataToSave), 20000,"Cập nhật đề thi quá lâu (timeout).");
      setEditingQuiz(null);
alert("Đã lưu đề thi thành công!");
    } catch (e) {
console.error("Lỗi lưu đề thi:", e);
      const msg = e?.message ? `

Chi tiết: ${e.message}` : '';
alert("Lỗi lưu đề thi." + msg);
    } finally {
      setIsSavingQuiz(false);
    }
  };

  const handleSaveBankQuestion = async () => {
    if (!editingBankQuestion) return;
    if (!user) {
      alert('Hệ thống chưa kết nối (chưa đăng nhập). Vui lòng đợi vài giây rồi thử lại.');
      return;
    }
    const now = Date.now();
    const gl = (editingBankQuestion.grade_level || activeGrade || '8').toString().trim();
    const payload = {
      ...editingBankQuestion,
      grade_level: gl,
      chapter: (editingBankQuestion.chapter ?? '').toString().trim(),
      lesson_no: (editingBankQuestion.lesson_no ?? '').toString().trim(),
      category: (editingBankQuestion.category ?? '').toString().trim(),
      topic_tags: normalizeTopicTags(editingBankQuestion.topic_tags),
      cognitive_level: String(editingBankQuestion.cognitive_level || COG_LEVEL.recognize),
      q_type: String(editingBankQuestion.q_type || QUESTION_TYPE.multiple_choice),
      question: (editingBankQuestion.question ?? '').toString(),
      explanation: (editingBankQuestion.explanation ?? '').toString(),
      updated_at: now,
      ...(editingBankQuestion.isNew ? { created_at: now } : {}),
    };
    delete payload.isNew;
    try {
      if (editingBankQuestion.isNew) {
        await withTimeout(addDoc(collection(db, COLLECTION_QUESTION_BANK), payload), 20000, 'Lưu câu hỏi quá lâu (timeout).');
      } else {
        await withTimeout(updateDoc(doc(db, COLLECTION_QUESTION_BANK, editingBankQuestion.id), payload), 20000, 'Cập nhật câu hỏi quá lâu (timeout).');
      }
      setEditingBankQuestion(null);
      alert('Đã lưu câu hỏi vào ngân hàng.');
    } catch (e) {
      console.error('Lỗi lưu ngân hàng câu hỏi:', e);
      alert('Lỗi lưu câu hỏi.');
    }
  };

  const handleDeleteBankQuestion = async (id) => {
    if (!id) return;
    if (!window.confirm('Xóa câu hỏi này khỏi ngân hàng?')) return;
    try {
      await deleteDoc(doc(db, COLLECTION_QUESTION_BANK, id));
    } catch (e) {
      console.error(e);
      alert('Xóa thất bại.');
    }
  };

  const handleMigrateEditingQuizToBank = async () => {
    if (!editingQuiz) return;
    if (!user) {
      alert('Đang kết nối Firebase — thử lại sau vài giây.');
      return;
    }
    if (!Array.isArray(editingQuiz.questions) || editingQuiz.questions.length === 0) {
      alert('Đề hiện tại chưa có câu hỏi nào để đưa vào ngân hàng.');
      return;
    }
    if (!window.confirm(`Đưa ${editingQuiz.questions.length} câu của đề hiện tại vào Ngân hàng câu hỏi?`)) return;
    const now = Date.now();
    const gl = (editingQuiz.grade_level || activeGrade || '8').toString().trim();
    const baseMeta = {
      grade_level: gl,
      chapter: (editingQuiz.chapter ?? '').toString().trim(),
      lesson_no: (editingQuiz.lesson_no ?? '').toString().trim(),
      category: (editingQuiz.category ?? '').toString().trim(),
    };
    const adds = (editingQuiz.questions || []).map((q) => {
      const q_type = (q?.type || 'multiple_choice').toString().trim();
      const common = {
        ...baseMeta,
        q_type,
        question: (q?.question ?? '').toString(),
        topic_tags: normalizeTopicTags(q?.topic_tags),
        cognitive_level: q?.cognitive_level || COG_LEVEL.recognize,
        chapter: (q?.chapter ?? baseMeta.chapter ?? '').toString().trim(),
        lesson_no: (q?.lesson_no ?? baseMeta.lesson_no ?? '').toString().trim(),
        category: (q?.category ?? baseMeta.category ?? '').toString().trim(),
        explanation: (q?.explanation ?? '').toString(),
        created_at: now,
        updated_at: now,
      };
      // Firestore does NOT allow undefined values. Only include fields relevant to question type.
      let bankDoc = { ...common };
      if (q_type === 'multiple_choice') {
        bankDoc = {
          ...bankDoc,
          options: Array.isArray(q?.options) ? q.options.map((x) => String(x ?? '')) : ['', '', '', ''],
          correctAnswer: Number.isInteger(q?.correctAnswer) ? q.correctAnswer : 0,
        };
      } else if (q_type === 'true_false_group') {
        bankDoc = {
          ...bankDoc,
          tfItems: Array.isArray(q?.tfItems) ? q.tfItems : [],
        };
      } else if (q_type === 'short_answer') {
        bankDoc = {
          ...bankDoc,
          shortCorrect: (q?.shortCorrect ?? '').toString(),
          answerPlaceholder: (q?.answerPlaceholder ?? 'Nhập đáp án...').toString(),
        };
      } else if (q_type === 'essay') {
        // no extra fields
      }
      return addDoc(collection(db, COLLECTION_QUESTION_BANK), bankDoc);
    });
    try {
      await withTimeout(Promise.all(adds), 20000, 'Nạp câu hỏi vào ngân hàng quá lâu (timeout).');
      alert('Đã đưa câu hỏi vào ngân hàng.');
      setActiveTab('bank');
      setEditingBankQuestion(null);
      setBankSearch('');
    } catch (e) {
      console.error(e);
      const msg = (e && e.message) ? `\n\nChi tiết: ${e.message}` : '';
      alert('Đưa vào ngân hàng thất bại.' + msg);
    }
  };

  // Bank import removed per request

  const runParseImport = (text) => {
    const { questions, errors, meta } = parseQuestionsFromText(text);
    setImportPreview(questions);
    setImportErrors(errors);
    return { questions, errors, meta };
  };
  runParseImportRef.current = runParseImport;

  const applyParsedQuestionsToEditingQuiz = (questions, errors, meta) => {
    if (!editingQuiz) return false;
    if (questions.length === 0) {
      alert('Không tìm thấy câu hỏi nào.');
      return false;
    }
    if (errors.length > 0) {
      const ok = window.confirm(
        `Còn ${errors.length} lỗi nhận diện. Vẫn nhập ${questions.length} câu vào đề để sửa trực quan từng câu?`
      );
      if (!ok) return false;
    }
    const t0 = Date.now();
    const withIds = questions.map((q, i) => ({
      ...q,
      id: `q_${t0}_${i}_${Math.random().toString(36).slice(2, 8)}`,
    }));
    const ALLOW_EXAM = new Set(['lesson', 'combined', 'midterm', 'final', 'mock', 'entrance']);
    const etRaw = (meta?.exam_type || meta?.type || editingQuiz.exam_type || 'lesson').toString().trim().toLowerCase();
    const examType = ALLOW_EXAM.has(etRaw) ? etRaw : (editingQuiz.exam_type || 'lesson');

    // Chuyên đề: cho phép gán đề theo bài (lesson) bằng topic_id + topic_lesson_id (ưu tiên) hoặc resolve theo title.
    const metaTopicId = (meta?.topic_id || '').toString().trim();
    const metaTopicName = (meta?.topic_name || '').toString().trim();
    const metaTopicLessonId = (meta?.topic_lesson_id || '').toString().trim();
    const metaTopicLessonTitle = (meta?.topic_lesson_title || '').toString().trim();
    let resolvedLessonId = metaTopicLessonId;
    if (!resolvedLessonId && metaTopicId && metaTopicLessonTitle) {
      const want = metaTopicLessonTitle.toLowerCase();
      const hit = (lessonsList || []).find(
        (l) =>
          String(l?.topic_id || '').trim() === metaTopicId &&
          (l?.title || '').toString().trim().toLowerCase() === want
      );
      if (hit?.id) resolvedLessonId = hit.id;
    }
    setEditingQuiz({
      ...editingQuiz,
      title: (meta?.title || '').toString().trim() || editingQuiz.title,
      duration: meta?.duration ? Number(meta.duration) : editingQuiz.duration,
      level: 'test',
      category: meta?.category || editingQuiz.category,
      grade_level: meta?.grade_level || editingQuiz.grade_level,
      chapter: meta?.chapter || editingQuiz.chapter,
      lesson_no: meta?.lesson_no || editingQuiz.lesson_no,
      topic_id: metaTopicId || editingQuiz.topic_id || '',
      topic_name: metaTopicName || editingQuiz.topic_name || '',
      topic_lesson_id: resolvedLessonId || editingQuiz.topic_lesson_id || '',
      topic_lesson_title: metaTopicLessonTitle || editingQuiz.topic_lesson_title || '',
      exam_type: examType,
      questions: withIds,
    });
    setImportErrors([]);
    return true;
  };

  const handleImportApply = () => {
    const { questions, errors, meta } = runParseImport(importText);
    if (applyParsedQuestionsToEditingQuiz(questions, errors, meta)) setShowImportModal(false);
  };

  const handleApplyImportTextInline = () => {
    const t = (importText || '').trim();
    if (!t) {
      alert('Chưa có nội dung. Chọn file .txt/.docx hoặc mở “Dán nội dung”.');
      return;
    }
    const { questions, errors, meta } = parseQuestionsFromText(t);
    runParseImport(t);
    applyParsedQuestionsToEditingQuiz(questions, errors, meta);
  };

  const importModalErrByQuestion = useMemo(() => groupQuizImportErrors(importErrors), [importErrors]);

  const quizEditorErrorGroups = useMemo(() => {
    if (!editingQuiz?.questions) return { byQuestion: new Map(), global: [] };
    const nQ = editingQuiz.questions.length;
    const fromParse = groupQuizImportErrors(importErrors);
    const fromLive = groupQuizImportErrors(validateQuizQuestionsAdmin(editingQuiz.questions));
    const byQuestion = new Map(fromParse.byQuestion);
    fromLive.byQuestion.forEach((msgs, k) => {
      byQuestion.set(k, [...(byQuestion.get(k) || []), ...msgs]);
    });
    byQuestion.forEach((msgs, k) => {
      byQuestion.set(k, [...new Set(msgs)]);
    });
    const global = [...new Set([...fromParse.global, ...fromLive.global])];
    [...byQuestion.keys()].forEach((k) => {
      if (k > nQ) {
        (byQuestion.get(k) || []).forEach((m) => global.push(m));
        byQuestion.delete(k);
      }
    });
    return { byQuestion, global: [...new Set(global)] };
  }, [editingQuiz?.questions, importErrors]);

  const handleImportFile = async (file) => {
    if (!file) return;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    try {
if (ext ==='txt') {
        const t = await file.text();
        setImportText(t);
        runParseImport(t);
        return;
      }
if (ext ==='docx') {
        const buf = await file.arrayBuffer();
        const res = await mammoth.extractRawText({ arrayBuffer: buf });
const t = res.value ||'';
        setImportText(t);
        runParseImport(t);
        return;
      }
      alert("Chỉ hỗ trợ .txt hoặc .docx");
    } catch (e) {
      console.error(e);
alert("Đọc file thất bại.");
    }
  };

  const handleBulkImport = async () => {
    if (!bulkText.trim()) return;
    const names = bulkText.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    const uniqueNames = [...new Set(names)].filter(name => !allowedStudents.some(s => s.name.toLowerCase() === name.toLowerCase()));
    await Promise.all(uniqueNames.map(name => addDoc(collection(db, COLLECTION_STUDENTS), { name, grade_level: activeGrade === 'ALL' ? '8' : activeGrade })));
setShowBulkModal(false); setBulkText('');
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg w-full min-w-0 max-w-full border border-slate-200 overflow-hidden my-2 md:my-4 flex flex-col flex-1 min-h-0">
<div className="flex flex-col md:flex-row justify-between items-center bg-slate-800 p-2 border-b border-slate-700">
<div className="flex flex-wrap gap-2 text-slate-300">
          <button onClick={() => { setActiveTab('lessons'); setEditingLesson(null); }} className={`min-w-[120px] py-2 px-4 rounded font-bold flex justify-center items-center gap-2 transition-colors ${activeTab === 'lessons' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-700 hover:text-white'}`}><Video size={18} /> Bài Giảng</button>
<button onClick={() => { setActiveTab('quizzes'); setEditingQuiz(null); }} className={`min-w-[120px] py-2 px-4 rounded font-bold flex justify-center items-center gap-2 transition-colors ${activeTab === 'quizzes' ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 hover:text-white'}`}><BookOpen size={18} /> Đề Thi</button>
<button onClick={() => { setActiveTab('bank'); setEditingBankQuestion(null); }} className={`min-w-[140px] py-2 px-4 rounded font-bold flex justify-center items-center gap-2 transition-colors ${activeTab === 'bank' ? 'bg-violet-600 text-white' : 'hover:bg-slate-700 hover:text-white'}`}><Sparkles size={18} /> Ngân hàng câu</button>
<button onClick={() => setActiveTab('mindmap')} className={`min-w-[120px] py-2 px-4 rounded font-bold flex justify-center items-center gap-2 transition-colors ${activeTab === 'mindmap' ? 'bg-fuchsia-600 text-white' : 'hover:bg-slate-700 hover:text-white'}`}><Network size={18} /> Sơ đồ</button>
<button onClick={() => setActiveTab('review_map')} className={`min-w-[140px] py-2 px-4 rounded font-bold flex justify-center items-center gap-2 transition-colors ${activeTab === 'review_map' ? 'bg-cyan-600 text-white' : 'hover:bg-slate-700 hover:text-white'}`}><MapIcon size={18} /> Ôn tập map</button>
<button onClick={() => setActiveTab('scores')} className={`min-w-[120px] py-2 px-4 rounded font-bold flex justify-center items-center gap-2 transition-colors ${activeTab === 'scores' ? 'bg-teal-600 text-white' : 'hover:bg-slate-700 hover:text-white'}`}><FileText size={18} /> Bảng Điểm</button>
<button onClick={() => setActiveTab('students')} className={`min-w-[120px] py-2 px-4 rounded font-bold flex justify-center items-center gap-2 transition-colors ${activeTab === 'students' ? 'bg-orange-600 text-white' : 'hover:bg-slate-700 hover:text-white'}`}><Users size={18} /> Danh sách</button>
</div>
        <div className="mt-3 md:mt-0 flex items-center gap-2 text-white bg-slate-700 px-3 py-2 rounded-lg font-bold">
           Khối Lớp: 
<select value={activeGrade} onChange={e => setActiveGrade(e.target.value)} className="bg-slate-900 border border-slate-600 rounded p-1 text-yellow-400">
<option value="ALL">Toàn Trường (All)</option>
<option value="6">Toán 6</option>
<option value="7">Toán 7</option>
<option value="8">Toán 8</option>
<option value="9">Toán 9</option>
<option value="10">Toán 10</option>
<option value="11">Toán 11</option>
<option value="12">Toán 12</option>
           </select>
</div>
      </div>
<div className={`bg-slate-50 min-h-[600px] flex flex-col flex-1 min-h-0 ${editingLesson ? 'p-2 md:p-3' : 'p-4 md:p-6'}`}>
        <MatrixModal
          open={showMatrixModal}
          onClose={() => setShowMatrixModal(false)}
          bankQuestions={filteredBankQuestions}
          initialFilters={{ grade_level: activeGrade === 'ALL' ? '' : activeGrade }}
          chapterOptions={chapterOptions}
          getChapterOptionsForGrade={getChapterOptionsForGrade}
          getTopicOptionsByChapter={topicOptionsByChapter}
          getTopicOptionsForChapterAndGrade={getTopicOptionsForChapterAndGrade}
          onGenerate={({ rows, duration }) => {
            const { picked, missing } = pickQuestionsByRows({ bankQuestions: questionBank || [], rows });
            if (missing.length > 0) {
              const msg = missing
                .map((m) => `Dòng ${m.row}: ${COG_LEVEL_LABEL[m.cognitive_level]} × ${QUESTION_TYPE_LABEL[m.q_type]}: cần ${m.need}, có ${m.got}`)
                .join('\n');
              alert(`Không đủ câu theo ma trận:\n${msg}`);
              return;
            }
            const qs = randomizeOrder(picked).map((bq) => bankQuestionToQuizQuestion(bq));
            setEditingQuiz({
              isNew: true,
              title: 'Đề tạo từ ma trận',
              duration: Number(duration || 45),
              level: 'test',
              category: '',
              grade_level: (activeGrade === 'ALL' ? '8' : activeGrade),
              chapter: '',
              lesson_no: '',
              exam_type: 'lesson',
              difficulty_stars: 3,
              questions: qs,
              ...DEFAULT_PART_POINTS,
            });
            setActiveTab('quizzes');
            setShowMatrixModal(false);
          }}
        />
        {activeTab === 'lessons' && (
          editingLesson ? renderLessonEditor() : (
<div className="space-y-4">
<div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
<div><h2 className="font-bold text-lg text-slate-800">Kho Bài Giảng</h2><p className="text-sm text-slate-500">Đăng video YouTube và lý thuyết.</p></div>
<button onClick={() => setEditingLesson({ isNew: true, title: '', videoUrl: '', videoMaterialUrl: '', pdfUrl: '', description: '', content: '', chapter: '', lesson_no: '', grade_level: activeGrade !== 'ALL' ? activeGrade : '' })} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Plus size={16} /> Đăng Bài Mới</button>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredLessons.map(l => (
<div key={l.id} className="bg-white p-4 rounded-xl border shadow-sm flex flex-col">
<h3 className="font-bold text-slate-800 line-clamp-1 mb-2"><Video size={16} className="inline mr-1 text-indigo-500" />{l.title}</h3>
<p className="text-xs text-slate-500 line-clamp-2 flex-1 mb-4">{l.description}</p>
<div className="flex gap-2">
<button onClick={() => setEditingLesson(l)} className="flex-1 bg-indigo-50 text-indigo-600 py-1.5 rounded font-semibold text-sm">Sửa</button>
<button onClick={() => handleDeleteLesson(l.id)} className="px-3 bg-red-50 text-red-600 rounded"><Trash2 size={16} /></button>
</div>
                  </div>
                ))}
              </div>
</div>
          )
        )}

        {activeTab === 'quizzes' && (
          editingQuiz ? (
            <div className="min-w-0 bg-slate-50 p-2 md:p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 xl:overflow-hidden xl:h-[calc(100dvh-6rem)] xl:max-h-[calc(100dvh-6rem)]">
              <div className="flex flex-col xl:flex-row xl:items-stretch gap-3 min-w-0 flex-1 min-h-0 xl:overflow-hidden">
                <div
                  className="w-full xl:flex-[7] xl:min-w-0 flex flex-col gap-2 min-w-0 min-h-0 xl:overflow-hidden"
                  onFocusCapture={captureAdminTextFocus}
                >
                    <div className="bg-white rounded-lg border border-slate-200 p-2 shadow-sm shrink-0">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-1.5 mb-1.5 gap-2">
                      <h3 className="font-bold text-base text-blue-800 flex gap-2 items-center min-w-0">
                        <BookOpen size={18} className="shrink-0" /> <span className="truncate">Tạo/Sửa Đề Kiểm Tra</span>
                      </h3>
                      <button type="button" onClick={() => setEditingQuiz(null)} className="text-slate-400 hover:text-red-500 shrink-0">
                        <XCircle size={22} />
                      </button>
                    </div>
                    {!user && (
                      <div className="p-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs font-semibold mb-2">
                        Đang kết nối Firebase... vui lòng đợi vài giây rồi thao tác lưu.
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                      <input
                        type="text"
                        value={editingQuiz.title}
                        onChange={(e) => setEditingQuiz({ ...editingQuiz, title: e.target.value })}
                        placeholder="Tên đề thi..."
                        className="lg:col-span-2 p-2 text-sm border rounded-md font-bold"
                      />
                      <select
                        value={(editingQuiz.grade_level || activeGrade || '8').toString()}
                        onChange={(e) => {
                          const ng = e.target.value;
                          const k = resolveKnowledgeForGrade(ng);
                          const validNos = new Set((k.chapters || []).map((c) => c.chapterNo));
                          setEditingQuiz({
                            ...editingQuiz,
                            grade_level: ng,
                            questions: (editingQuiz.questions || []).map((qq) => {
                              const ch = String(qq.chapter || '').trim();
                              const next = { ...qq };
                              if (ch && !validNos.has(ch)) next.chapter = '';
                              const tags = qq.topic_tags || [];
                              const list = ch && validNos.has(ch) ? k.topicsByChapter?.get?.(ch) : null;
                              if (tags[0] && Array.isArray(list) && list.length && !knowledgeTopicMatches(list, tags[0])) {
                                next.topic_tags = ['Các dạng toán khác'];
                              }
                              return next;
                            }),
                          });
                        }}
                        className="p-2 text-sm border rounded-md font-black text-slate-800 bg-amber-50 border-amber-200"
                        title="Khối lớp — danh sách Chương / Dạng toán theo CT 2018"
                      >
                        {['6', '7', '8', '9', '10', '11', '12'].map((g) => (
                          <option key={g} value={g}>
                            Lớp {g}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={editingQuiz.duration}
                        onChange={(e) => setEditingQuiz({ ...editingQuiz, duration: Number(e.target.value) })}
                        className="p-2 text-sm border rounded-md text-center"
                        title="Thời gian (phút)"
                      />
                      <select
                        value={String(Math.min(5, Math.max(1, Number(editingQuiz.difficulty_stars) || 3)))}
                        onChange={(e) =>
                          setEditingQuiz({ ...editingQuiz, difficulty_stars: Number(e.target.value) })
                        }
                        className="p-2 text-sm border rounded-md font-bold text-amber-800 bg-amber-50"
                        title="Độ khó (1–5 sao) — hiển thị cho học sinh"
                      >
                        <option value="1">Độ khó: 1 sao (dễ)</option>
                        <option value="2">Độ khó: 2 sao</option>
                        <option value="3">Độ khó: 3 sao (vừa)</option>
                        <option value="4">Độ khó: 4 sao</option>
                        <option value="5">Độ khó: 5 sao (khó)</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      <select
                        value={editingQuiz.exam_type || 'lesson'}
                        onChange={(e) => setEditingQuiz({ ...editingQuiz, exam_type: e.target.value })}
                        className="p-2 text-sm border rounded-md font-bold text-slate-700 bg-slate-50"
                      >
                        <option value="lesson">Đề theo Bài</option>
                        <option value="combined">Tổng hợp</option>
                        <option value="midterm">Giữa kỳ</option>
                        <option value="final">Cuối kỳ</option>
                        <option value="mock">Thi thử</option>
                        <option value="entrance">Tuyển sinh</option>
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editingQuiz.topic_lesson_id ? '' : (editingQuiz.chapter || '')}
                          onChange={(e) => setEditingQuiz({ ...editingQuiz, chapter: e.target.value })}
                          disabled={!!editingQuiz.topic_lesson_id}
                          placeholder={editingQuiz.topic_lesson_id ? 'Không cần' : 'Chương'}
                          className={`p-2 text-sm border rounded-md font-semibold text-center ${editingQuiz.topic_lesson_id ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
                        />
                        <input
                          type="text"
                          value={editingQuiz.topic_lesson_id ? '' : (editingQuiz.lesson_no || '')}
                          onChange={(e) => setEditingQuiz({ ...editingQuiz, lesson_no: e.target.value })}
                          disabled={!!editingQuiz.topic_lesson_id}
                          placeholder={editingQuiz.topic_lesson_id ? 'Không cần' : 'Bài'}
                          className={`p-2 text-sm border rounded-md font-semibold text-center ${editingQuiz.topic_lesson_id ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
                        />
                      </div>
                    </div>

                    {/* Gán đề theo chuyên đề: topic_id + topic_lesson_id (để hiện trong tab Đề luyện tập của bài chuyên đề) */}
                    {(() => {
                      const isLessonExam = (editingQuiz.exam_type || 'lesson') === 'lesson';
                      const grade = (editingQuiz.grade_level || activeGrade || '8').toString().trim();
                      const topicLessons = (lessonsList || []).filter((l) => {
                        if (!l) return false;
                        if (!String(l.topic_id || '').trim()) return false;
                        const gl = String(l.grade_level || '').trim();
                        if (gl && grade && gl !== grade) return false;
                        return true;
                      });
                      const topics = Array.from(
                        new Map(
                          topicLessons.map((l) => [String(l.topic_id || '').trim(), String(l.topic_name || '').trim() || 'Chuyên đề'])
                        ).entries()
                      ).map(([id, name]) => ({ id, name }));
                      topics.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));

                      const curTopicId = String(editingQuiz.topic_id || '').trim();
                      const curTopicLessonId = String(editingQuiz.topic_lesson_id || '').trim();
                      const enabled = isLessonExam && topics.length > 0;
                      const checked = !!curTopicLessonId || (!!curTopicId && !!String(editingQuiz.topic_name || '').trim());
                      const lessonOptions = curTopicId
                        ? topicLessons
                            .filter((l) => String(l.topic_id || '').trim() === curTopicId)
                            .sort((a, b) => (String(a.title || '')).localeCompare(String(b.title || ''), 'vi'))
                        : [];

                      return (
                        <div className={`mt-2 p-2 rounded-md border ${enabled ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-200 bg-slate-50'}`}>
                          <label className={`flex items-center gap-2 text-[12px] font-bold ${enabled ? 'text-indigo-900' : 'text-slate-400'} cursor-pointer select-none`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!enabled}
                              onChange={(e) => {
                                const on = e.target.checked;
                                if (!on) {
                                  setEditingQuiz({
                                    ...editingQuiz,
                                    topic_id: '',
                                    topic_name: '',
                                    topic_lesson_id: '',
                                    topic_lesson_title: '',
                                  });
                                  return;
                                }
                                const first = topics[0];
                                const nextTopicId = first?.id || '';
                                const nextTopicName = first?.name || '';
                                setEditingQuiz({
                                  ...editingQuiz,
                                  chapter: '',
                                  lesson_no: '',
                                  topic_id: nextTopicId,
                                  topic_name: nextTopicName,
                                  topic_lesson_id: '',
                                  topic_lesson_title: '',
                                });
                              }}
                              className="w-4 h-4 accent-indigo-600"
                            />
                            Đề thuộc Chuyên đề
                            <span className="text-[10px] font-semibold text-slate-500">(tự hiện trong tab “Đề luyện tập” của bài chuyên đề)</span>
                          </label>

                          {checked && enabled ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                              <select
                                value={curTopicId}
                                onChange={(e) => {
                                  const id = e.target.value;
                                  const hit = topics.find((t) => t.id === id);
                                  setEditingQuiz({
                                    ...editingQuiz,
                                    chapter: '',
                                    lesson_no: '',
                                    topic_id: id,
                                    topic_name: hit?.name || '',
                                    topic_lesson_id: '',
                                    topic_lesson_title: '',
                                  });
                                }}
                                className="p-2 text-sm border rounded-md font-semibold bg-white"
                              >
                                {topics.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                  </option>
                                ))}
                              </select>

                              <select
                                value={curTopicLessonId}
                                onChange={(e) => {
                                  const id = e.target.value;
                                  const hit = lessonOptions.find((l) => String(l.id) === String(id));
                                  setEditingQuiz({
                                    ...editingQuiz,
                                    chapter: '',
                                    lesson_no: '',
                                    topic_lesson_id: id,
                                    topic_lesson_title: (hit?.title || '').toString(),
                                  });
                                }}
                                className="p-2 text-sm border rounded-md font-semibold bg-white"
                              >
                                <option value="">— Chọn bài trong chuyên đề —</option>
                                {lessonOptions.map((l) => (
                                  <option key={l.id} value={l.id}>
                                    {String(l.title || 'Bài học')}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : null}

                          {!enabled ? (
                            <p className="text-[11px] text-slate-400 font-semibold mt-1">
                              Bật “Đề theo Bài” và cần có ít nhất 1 bài giảng đã được gán chuyên đề để dùng tính năng này.
                            </p>
                          ) : null}
                        </div>
                      );
                    })()}
                    <div className="mt-2 p-2 rounded-md border border-indigo-200 bg-indigo-50/50">
                      <p className="text-[10px] font-bold text-indigo-900 leading-tight mb-1.5">
                        Chia điểm (thang 10)
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        <label className="flex flex-col gap-0 text-[10px] font-semibold text-slate-700 leading-tight">
                          TN 4 đáp án
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step={0.5}
                            value={editingQuiz.points_mc ?? DEFAULT_PART_POINTS.points_mc}
                            onChange={(e) =>
                              setEditingQuiz({ ...editingQuiz, points_mc: Number(e.target.value) })
                            }
                            className="p-1.5 text-sm border rounded bg-white font-bold text-center"
                          />
                        </label>
                        <label className="flex flex-col gap-0 text-[10px] font-semibold text-slate-700 leading-tight">
                          Đúng / Sai
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step={0.5}
                            value={editingQuiz.points_tf ?? DEFAULT_PART_POINTS.points_tf}
                            onChange={(e) =>
                              setEditingQuiz({ ...editingQuiz, points_tf: Number(e.target.value) })
                            }
                            className="p-1.5 text-sm border rounded bg-white font-bold text-center"
                          />
                        </label>
                        <label className="flex flex-col gap-0 text-[10px] font-semibold text-slate-700 leading-tight">
                          TL ngắn
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step={0.5}
                            value={editingQuiz.points_short ?? DEFAULT_PART_POINTS.points_short}
                            onChange={(e) =>
                              setEditingQuiz({ ...editingQuiz, points_short: Number(e.target.value) })
                            }
                            className="p-1.5 text-sm border rounded bg-white font-bold text-center"
                          />
                        </label>
                        <label className="flex flex-col gap-0 text-[10px] font-semibold text-slate-700 leading-tight">
                          Tự luận (max)
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step={0.5}
                            value={editingQuiz.points_essay ?? DEFAULT_PART_POINTS.points_essay}
                            onChange={(e) =>
                              setEditingQuiz({ ...editingQuiz, points_essay: Number(e.target.value) })
                            }
                            className="p-1.5 text-sm border rounded bg-white font-bold text-center"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg border border-dashed border-slate-300 bg-white shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <p
                        className="font-bold text-slate-800 text-sm shrink-0"
                        title="Định dạng mẫu: tải mau-import-de-thi.txt (thư mục public)"
                      >
                        Import Word/TXT
                      </p>
                      <div className="flex flex-wrap gap-2 shrink-0 items-center sm:justify-end">
                        <AdminImageUploadControl
                          storage={storage}
                          user={user}
                          busy={imageUploadBusy}
                          onFile={handleAdminImageUpload}
                        />
                            <button
                              type="button"
                              onClick={handleMigrateEditingQuizToBank}
                              className="px-3 py-1.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 text-xs font-black hover:bg-amber-200"
                              title="Lưu toàn bộ câu của đề hiện tại vào Ngân hàng câu hỏi"
                            >
                              <Upload size={14} className="inline mr-1" />
                              Lưu đề vào ngân hàng
                            </button>
                        <input ref={importFileRef} type="file" accept=".txt,.docx" className="hidden" onChange={(e) => handleImportFile(e.target.files?.[0])} />
                        <button
                          type="button"
                          onClick={() => importFileRef.current?.click()}
                          className="px-3 py-1.5 rounded-md bg-white border text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Chọn file
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowImportModal(true);
                            if ((importText || '').trim()) runParseImport(importText);
                          }}
                          className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                        >
                          Dán nội dung
                        </button>
                        <button
                          type="button"
                          onClick={handleApplyImportTextInline}
                          className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
                        >
                          Nhập vào đề
                        </button>
                      </div>
                    </div>
                  </div>

                  {(quizEditorErrorGroups.global.length > 0 || quizEditorErrorGroups.byQuestion.size > 0) && (
                    <div className="shrink-0 text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                      <span className="font-bold">Tổng quan lỗi:</span>{' '}
                      {quizEditorErrorGroups.byQuestion.size > 0
                        ? `${quizEditorErrorGroups.byQuestion.size} câu có ghi chú đỏ bên dưới. `
                        : ''}
                      {quizEditorErrorGroups.global.length > 0
                        ? `${quizEditorErrorGroups.global.length} lỗi chung (xem danh sách).`
                        : ''}
                      {quizEditorErrorGroups.global.length > 0 && (
                        <ul className="list-disc pl-4 mt-1 space-y-0.5 text-amber-950">
                          {quizEditorErrorGroups.global.slice(0, 12).map((g, gi) => (
                            <li key={gi}>{g}</li>
                          ))}
                          {quizEditorErrorGroups.global.length > 12 ? <li>…</li> : null}
                        </ul>
                      )}
                    </div>
                  )}

                  <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden space-y-2 pb-2 pr-0.5">
                    {editingQuiz.questions.map((q, qIdx) => {
                      const qErrs = quizEditorErrorGroups.byQuestion.get(qIdx + 1);
                      return (
                        <div key={q.id || qIdx} className="p-2.5 border rounded-lg bg-white border-slate-200 relative shadow-sm">
                          <button
                            type="button"
                            onClick={() => {
                              const nq = [...editingQuiz.questions];
                              nq.splice(qIdx, 1);
                              setEditingQuiz({ ...editingQuiz, questions: nq });
                            }}
                            className="absolute top-2 right-2 text-red-400 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                          <div className="flex flex-col lg:flex-row lg:items-center gap-2 mb-2 pr-8">
                            <p className="font-bold text-sm text-blue-700">Câu {qIdx + 1}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={q.cognitive_level || defaultCogLevelForQuizQuestion(q, qIdx, editingQuiz.questions.length)}
                                onChange={(e) => {
                                  const nq = [...editingQuiz.questions];
                                  nq[qIdx].cognitive_level = e.target.value;
                                  setEditingQuiz({ ...editingQuiz, questions: nq });
                                }}
                                className="text-[11px] font-black rounded-lg border px-2 py-1.5 bg-violet-50 text-violet-900 border-violet-200"
                                title="Độ nhận thức"
                              >
                                {Object.values(COG_LEVEL).map((k) => (
                                  <option key={k} value={k}>{COG_LEVEL_LABEL[k]}</option>
                                ))}
                              </select>

                              <select
                                value={(q.chapter ?? editingQuiz.chapter ?? '').toString()}
                                onChange={(e) => {
                                  const nextCh = e.target.value;
                                  const nq = [...editingQuiz.questions];
                                  nq[qIdx].chapter = nextCh;
                                  const list = topicOptionsByChapter(nextCh);
                                  const curTag = (nq[qIdx].topic_tags && nq[qIdx].topic_tags[0]) || '';
                                  if (curTag && Array.isArray(list) && list.length && !knowledgeTopicMatches(list, curTag)) {
                                    nq[qIdx].topic_tags = ['Các dạng toán khác'];
                                  }
                                  setEditingQuiz({ ...editingQuiz, questions: nq });
                                }}
                                className="text-[11px] font-bold rounded-lg border px-2 py-1.5 bg-white text-slate-700 border-slate-200"
                                title="Chương"
                              >
                                <option value="">-- Chương --</option>
                                {chapterOptions.map((c) => (
                                  <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                              </select>

                              <select
                                value={String((q.topic_tags && q.topic_tags[0]) || '')}
                                onChange={(e) => {
                                  const nq = [...editingQuiz.questions];
                                  const v = e.target.value;
                                  nq[qIdx].topic_tags = v ? [v] : [];
                                  setEditingQuiz({ ...editingQuiz, questions: nq });
                                }}
                                className="text-[11px] font-semibold rounded-lg border px-2 py-1.5 bg-white text-slate-700 border-slate-200 min-w-[260px]"
                                title="Dạng toán (chỉ chọn trong danh sách)"
                              >
                                <option value="">-- Dạng toán --</option>
                                {(() => {
                                  const chSel = (q.chapter ?? editingQuiz.chapter ?? '').toString().trim();
                                  const base = topicOptionsByChapter(chSel);
                                  const curT = (q.topic_tags && q.topic_tags[0]) || '';
                                  const opts =
                                    curT && Array.isArray(base) && !knowledgeTopicMatches(base, curT)
                                      ? [curT, ...base]
                                      : base;
                                  return opts.map((t) => (
                                    <option key={t} value={t}>
                                      {t}
                                    </option>
                                  ));
                                })()}
                              </select>
                            </div>
                          </div>
                          {qErrs && qErrs.length > 0 ? (
                            <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-900">
                              <p className="font-bold text-red-800 mb-0.5">Cần chỉnh:</p>
                              <ul className="list-disc pl-4 space-y-0.5">
                                {qErrs.map((er, ei) => (
                                  <li key={ei}>{er}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                          <textarea
                            data-admin-snippet={`quiz-q:${qIdx}`}
                            value={q.question}
                            onChange={(e) => {
                              const nq = [...editingQuiz.questions];
                              nq[qIdx].question = e.target.value;
                              setEditingQuiz({ ...editingQuiz, questions: nq });
                            }}
                            className="w-full p-2.5 border rounded-md text-sm mb-2 min-h-[8rem] resize-y"
                            placeholder="Nội dung câu hỏi..."
                          />
                          <select
                            value={q.type}
                            onChange={(e) => {
                              const nq = [...editingQuiz.questions];
                              const typ = e.target.value;
                              nq[qIdx].type = typ;
                              if (typ === 'true_false_group') {
                                if (!Array.isArray(nq[qIdx].tfItems) || nq[qIdx].tfItems.length === 0) {
                                  nq[qIdx].tfItems = [
                                    { key: 'a', text: '', correct: true },
                                    { key: 'b', text: '', correct: false },
                                    { key: 'c', text: '', correct: true },
                                    { key: 'd', text: '', correct: false },
                                  ];
                                }
                              }
                              if (typ === 'short_answer') {
                                if (nq[qIdx].shortCorrect == null) nq[qIdx].shortCorrect = '';
                                if (nq[qIdx].answerPlaceholder == null) nq[qIdx].answerPlaceholder = 'Nhập đáp án...';
                              }
                              setEditingQuiz({ ...editingQuiz, questions: nq });
                            }}
                            className="mb-2 p-1.5 border rounded-md text-xs w-full font-bold text-slate-600"
                          >
                            <option value="multiple_choice">Trắc nghiệm A–D</option>
                            <option value="true_false_group">Đúng / Sai (a–d)</option>
                            <option value="short_answer">Trả lời ngắn</option>
                            <option value="essay">Tự luận (nộp ảnh)</option>
                          </select>
                          {q.type === 'multiple_choice' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                              {q.options.map((opt, oIdx) => (
                                <div key={oIdx} className="flex gap-1 items-center">
                                  <input
                                    type="radio"
                                    checked={q.correctAnswer === oIdx}
                                    onChange={() => {
                                      const nq = [...editingQuiz.questions];
                                      nq[qIdx].correctAnswer = oIdx;
                                      setEditingQuiz({ ...editingQuiz, questions: nq });
                                    }}
                                  />
                                  <input
                                    type="text"
                                    data-admin-snippet={`quiz-opt:${qIdx}:${oIdx}`}
                                    value={opt}
                                    onChange={(e) => {
                                      const nq = [...editingQuiz.questions];
                                      nq[qIdx].options[oIdx] = e.target.value;
                                      setEditingQuiz({ ...editingQuiz, questions: nq });
                                    }}
                                    className="w-full text-sm border rounded px-2 py-1 bg-slate-50/80"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          {q.type === 'true_false_group' && (
                            <div className="mb-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-2">
                              <p className="text-[11px] font-bold text-slate-600">Mệnh đề (a–d) — chọn đúng/sai đúng với đề</p>
                              {(q.tfItems || []).map((it, ti) => (
                                <div key={it.key || ti} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                                  <span className="text-xs font-bold text-blue-700 w-6 shrink-0 pt-2">{it.key})</span>
                                  <textarea
                                    data-admin-snippet={`quiz-tf:${qIdx}:${ti}`}
                                    value={it.text}
                                    onChange={(e) => {
                                      const nq = [...editingQuiz.questions];
                                      const items = [...(nq[qIdx].tfItems || [])];
                                      items[ti] = { ...items[ti], text: e.target.value };
                                      nq[qIdx].tfItems = items;
                                      setEditingQuiz({ ...editingQuiz, questions: nq });
                                    }}
                                    rows={2}
                                    className="flex-1 min-w-0 text-xs border rounded p-2 bg-white"
                                    placeholder="Nội dung mệnh đề..."
                                  />
                                  <select
                                    value={it.correct === true ? 'true' : 'false'}
                                    onChange={(e) => {
                                      const nq = [...editingQuiz.questions];
                                      const items = [...(nq[qIdx].tfItems || [])];
                                      items[ti] = { ...items[ti], correct: e.target.value === 'true' };
                                      nq[qIdx].tfItems = items;
                                      setEditingQuiz({ ...editingQuiz, questions: nq });
                                    }}
                                    className="text-xs font-bold border rounded p-2 bg-white shrink-0"
                                  >
                                    <option value="true">Đúng</option>
                                    <option value="false">Sai</option>
                                  </select>
                                </div>
                              ))}
                            </div>
                          )}
                          {q.type === 'short_answer' && (
                            <div className="mb-2 space-y-2">
                              <div>
                                <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Đáp án (dùng | để nhiều cách viết)</label>
                                <input
                                  type="text"
                                  data-admin-snippet={`quiz-sc:${qIdx}`}
                                  value={q.shortCorrect || ''}
                                  onChange={(e) => {
                                    const nq = [...editingQuiz.questions];
                                    nq[qIdx].shortCorrect = e.target.value;
                                    setEditingQuiz({ ...editingQuiz, questions: nq });
                                  }}
                                  className="w-full text-sm border rounded px-2 py-1.5"
                                  placeholder="12 | mười hai"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Placeholder ô nhập (học sinh)</label>
                                <input
                                  type="text"
                                  data-admin-snippet={`quiz-ph:${qIdx}`}
                                  value={q.answerPlaceholder || ''}
                                  onChange={(e) => {
                                    const nq = [...editingQuiz.questions];
                                    nq[qIdx].answerPlaceholder = e.target.value;
                                    setEditingQuiz({ ...editingQuiz, questions: nq });
                                  }}
                                  className="w-full text-sm border rounded px-2 py-1.5"
                                  placeholder="Nhập đáp án..."
                                />
                              </div>
                            </div>
                          )}
                          <textarea
                            data-admin-snippet={`quiz-exp:${qIdx}`}
                            value={q.explanation || ''}
                            onChange={(e) => {
                              const nq = [...editingQuiz.questions];
                              nq[qIdx].explanation = e.target.value;
                              setEditingQuiz({ ...editingQuiz, questions: nq });
                            }}
                            className="w-full p-2.5 border border-amber-200 bg-amber-50/80 rounded-md text-sm min-h-[5.5rem] resize-y"
                            placeholder="Lời giải..."
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="shrink-0 z-10 space-y-2 pt-1 pb-0.5 bg-slate-50 rounded-b-lg border-t border-slate-200/90 shadow-[0_-4px_12px_rgba(15,23,42,0.06)]">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingQuiz({
                          ...editingQuiz,
                          questions: [
                            ...editingQuiz.questions,
                            {
                              id: `q${Date.now()}`,
                              type: 'multiple_choice',
                              question: '',
                              options: ['', '', '', ''],
                              correctAnswer: 0,
                              explanation: '',
                            },
                          ],
                        });
                      }}
                      className="w-full border-2 border-dashed border-blue-400 text-blue-600 py-2.5 rounded-lg text-sm font-bold flex justify-center items-center gap-2 bg-white"
                    >
                      <Plus size={18} /> Thêm câu
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveQuiz}
                      disabled={isSavingQuiz}
                      className={`w-full font-bold py-3 rounded-xl flex justify-center items-center gap-2 text-sm shadow-md ${
                        isSavingQuiz ? 'bg-blue-300 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      <Save size={18} /> {isSavingQuiz ? 'Đang lưu...' : 'Lưu Đề Thi Lên Hệ Thống'}
                    </button>
                  </div>
                </div>

                <div className="w-full xl:flex-[3] xl:min-w-0 min-w-0 flex flex-col gap-1.5 xl:sticky xl:top-2 min-h-0 xl:overflow-hidden xl:max-h-full">
                  <div className="shrink-0 flex items-start gap-1.5 text-[11px] font-bold text-slate-700 bg-slate-200/80 border border-slate-300 rounded-md px-2 py-1.5">
                    <Eye size={14} className="shrink-0 mt-0.5" />
                    <span>
                      Xem trước toàn đề ({editingQuiz.questions.length} câu) — giống học sinh, chỉ đọc. Cột ~30%.
                    </span>
                  </div>
                  <div className="flex-1 min-h-0 rounded-lg border border-slate-200 bg-white overflow-y-auto p-2 space-y-2 shadow-sm">
                    {editingQuiz.questions.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">Chưa có câu — import hoặc thêm câu.</p>
                    ) : (
                      editingQuiz.questions.map((q, qIdx) => {
                        const prevErrs = quizEditorErrorGroups.byQuestion.get(qIdx + 1);
                        return (
                          <div
                            key={`pv-${q.id || qIdx}`}
                            className={`rounded-md border p-2 text-[11px] leading-snug ${prevErrs?.length ? 'border-red-300 bg-red-50/50' : 'border-slate-100 bg-slate-50/80'}`}
                          >
                            {prevErrs?.length ? (
                              <p className="font-bold text-red-700 mb-1">Câu {qIdx + 1} — có lỗi cần sửa</p>
                            ) : (
                              <p className="font-bold text-slate-700 mb-1">Câu {qIdx + 1}</p>
                            )}
                            <div className="text-slate-800 font-medium mb-1">
                              <MathContent text={q.question || '…'} className="text-[11px]" />
                            </div>
                            {q.type === 'essay' ? (
                              <p className="text-slate-500 italic">Tự luận (nộp ảnh)</p>
                            ) : q.type === 'short_answer' ? (
                              <div className="text-[11px] text-slate-600 space-y-1">
                                <p>
                                  <span className="font-bold">Đáp án:</span> <span className="font-mono">{String(q.shortCorrect || '')}</span>
                                </p>
                                <p className="text-slate-500 italic border border-dashed border-slate-300 rounded px-2 py-1 bg-white">
                                  Ô nhập: {String(q.answerPlaceholder || 'Nhập đáp án...')}
                                </p>
                              </div>
                            ) : q.type === 'true_false_group' ? (
                              <ul className="text-[11px] space-y-1">
                                {(q.tfItems || []).map((it) => (
                                  <li key={it.key}>
                                    <span className="font-bold text-blue-700">{it.key})</span>{' '}
                                    <MathContent text={String(it.text || '')} className="text-[11px]" />
                                    <span className={`ml-1 font-bold ${it.correct ? 'text-emerald-700' : 'text-red-600'}`}>
                                      ({it.correct ? 'Đ' : 'S'})
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="grid grid-cols-1 gap-1">
                                {(q.options || []).map((o, oi) => (
                                  <div
                                    key={oi}
                                    className={`rounded px-1.5 py-0.5 border ${q.correctAnswer === oi ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'}`}
                                  >
                                    <span className="font-bold mr-1">{['A', 'B', 'C', 'D'][oi]}.</span>
                                    <MathContent text={String(o || '')} className="text-[11px]" inlineImage />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
<div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm"><div><h2 className="font-bold text-lg text-slate-800">Kho Đề Thi</h2></div>
<div className="flex gap-2">
{filteredQuizzes.length === 0 && <button onClick={() => Promise.all(SAMPLE_QUIZZES.map(q => addDoc(collection(db, COLLECTION_QUIZZES), { ...q, grade_level: activeGrade === 'ALL' ? '8' : activeGrade })))} className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded font-bold text-sm">Nạp Đề Mẫu</button>}
<button
                  onClick={() =>
                    setEditingQuiz({
                      isNew: true,
                      title: '',
                      duration: 15,
                      level: 'test',
                      category: '',
                      grade_level: activeGrade === 'ALL' ? '8' : activeGrade,
                      exam_type: 'lesson',
                      questions: [],
                      difficulty_stars: 3,
                      ...DEFAULT_PART_POINTS,
                    })
                  }
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                >
                  <Plus size={16} /> Tạo đề mới
                </button>
</div>
              </div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredQuizzes.map(q => (
<div key={q.id} className="bg-white p-4 rounded-xl border shadow-sm flex flex-col justify-between">
<div><h3 className="font-bold text-blue-800 mb-2">{q.title}</h3><p className="text-sm text-slate-500 mb-4">{q.questions?.length} câu • {q.duration} phút • độ khó {Math.min(5, Math.max(1, Number(q.difficulty_stars) || 3))}★</p></div>
<div className="flex gap-2"><button onClick={() => setEditingQuiz({ ...q, level: 'test' })} className="flex-1 bg-blue-50 text-blue-600 py-1.5 rounded font-bold text-sm">Sửa Đề</button><button onClick={() => window.confirm("Xóa?") && deleteDoc(doc(db, COLLECTION_QUIZZES, q.id))} className="px-3 bg-red-50 text-red-600 rounded"><Trash2 size={16} /></button></div>
</div>
                ))}
              </div>
</div>
          )
        )}

        {activeTab === 'bank' && (
          editingBankQuestion ? (
            <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2 border-b pb-2">
                <h2 className="font-bold text-lg text-violet-800 flex items-center gap-2 min-w-0">
                  <Sparkles size={18} className="shrink-0" />
                  <span className="truncate">{editingBankQuestion.isNew ? 'Tạo câu hỏi (Ngân hàng)' : 'Sửa câu hỏi (Ngân hàng)'}</span>
                </h2>
                <button type="button" onClick={() => setEditingBankQuestion(null)} className="text-slate-400 hover:text-red-500">
                  <XCircle size={22} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-2">
                <select
                  value={editingBankQuestion.cognitive_level || COG_LEVEL.recognize}
                  onChange={(e) => setEditingBankQuestion({ ...editingBankQuestion, cognitive_level: e.target.value })}
                  className="p-2 text-sm border rounded-md font-bold bg-violet-50 text-violet-900"
                  title="Độ nhận thức"
                >
                  {Object.values(COG_LEVEL).map((k) => (
                    <option key={k} value={k}>{COG_LEVEL_LABEL[k]}</option>
                  ))}
                </select>
                <select
                  value={editingBankQuestion.q_type || QUESTION_TYPE.multiple_choice}
                  onChange={(e) => setEditingBankQuestion({ ...editingBankQuestion, q_type: e.target.value })}
                  className="p-2 text-sm border rounded-md font-bold bg-slate-50 text-slate-800"
                  title="Loại câu"
                >
                  {Object.values(QUESTION_TYPE).map((k) => (
                    <option key={k} value={k}>{QUESTION_TYPE_LABEL[k]}</option>
                  ))}
                </select>
                <select
                  value={(editingBankQuestion.grade_level || activeGrade || '8').toString()}
                  onChange={(e) =>
                    setEditingBankQuestion({
                      ...editingBankQuestion,
                      grade_level: e.target.value,
                      chapter: '',
                      topic_tags: [],
                    })
                  }
                  className="p-2 text-sm border rounded-md font-black bg-amber-50 text-amber-950 border-amber-200"
                  title="Khối — Chương / Dạng theo CT 2018"
                >
                  {['6', '7', '8', '9', '10', '11', '12'].map((g) => (
                    <option key={g} value={g}>
                      Lớp {g}
                    </option>
                  ))}
                </select>
                <select
                  value={String(editingBankQuestion.chapter || '')}
                  onChange={(e) => {
                    const nextCh = e.target.value;
                    const gl = (editingBankQuestion.grade_level || activeGrade || '8').toString();
                    const list = getTopicOptionsForChapterAndGrade(gl, nextCh);
                    const cur = (editingBankQuestion.topic_tags || [])[0] || '';
                    let tags = editingBankQuestion.topic_tags || [];
                    if (cur && Array.isArray(list) && list.length && !knowledgeTopicMatches(list, cur))
                      tags = ['Các dạng toán khác'];
                    setEditingBankQuestion({ ...editingBankQuestion, chapter: nextCh, topic_tags: tags });
                  }}
                  className="p-2 text-sm border rounded-md font-semibold lg:col-span-2"
                  title="Chương"
                >
                  <option value="">-- Chương --</option>
                  {getChapterOptionsForGrade((editingBankQuestion.grade_level || activeGrade || '8').toString()).map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <input
                  value={editingBankQuestion.lesson_no || ''}
                  onChange={(e) => setEditingBankQuestion({ ...editingBankQuestion, lesson_no: e.target.value })}
                  placeholder="Bài"
                  className="p-2 text-sm border rounded-md font-semibold text-center"
                />
                <select
                  value={editingBankQuestion.category || ''}
                  onChange={(e) => setEditingBankQuestion({ ...editingBankQuestion, category: e.target.value })}
                  className="p-2 text-sm border rounded-md font-bold bg-slate-50 text-slate-800"
                  title="Dạng (dang1..dang5)"
                >
                  <option value="">-- Dạng --</option>
                  <option value="dang1">Dạng 1: Hàm số</option>
                  <option value="dang2">Dạng 2: Phương trình</option>
                  <option value="dang3">Dạng 3: Thực tế HH</option>
                  <option value="dang4">Dạng 4: Thực tế HS</option>
                  <option value="dang5">Dạng 5: Hình học</option>
                </select>
                <select
                  value={String((editingBankQuestion.topic_tags || [])[0] || '')}
                  onChange={(e) =>
                    setEditingBankQuestion({
                      ...editingBankQuestion,
                      topic_tags: e.target.value ? [e.target.value] : [],
                    })
                  }
                  className="p-2 text-sm border rounded-md font-semibold lg:col-span-2 min-w-0"
                  title="Dạng toán (kiến thức)"
                >
                  <option value="">-- Dạng toán --</option>
                  {getTopicOptionsForChapterAndGrade(
                    (editingBankQuestion.grade_level || activeGrade || '8').toString(),
                    String(editingBankQuestion.chapter || '')
                  ).map((t) => (
                    <option key={t} value={t}>
                      {t.length > 120 ? `${t.slice(0, 118)}…` : t}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                value={editingBankQuestion.question || ''}
                onChange={(e) => setEditingBankQuestion({ ...editingBankQuestion, question: e.target.value })}
                className="w-full p-3 border rounded-lg text-sm min-h-[120px]"
                placeholder="Nội dung câu hỏi..."
              />

              {String(editingBankQuestion.q_type || '') === QUESTION_TYPE.multiple_choice && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Array.isArray(editingBankQuestion.options) ? editingBankQuestion.options : ['', '', '', '']).map((opt, oi) => (
                    <div key={oi} className="flex gap-2 items-center">
                      <input
                        type="radio"
                        checked={Number(editingBankQuestion.correctAnswer || 0) === oi}
                        onChange={() => setEditingBankQuestion({ ...editingBankQuestion, correctAnswer: oi })}
                      />
                      <input
                        value={String(opt ?? '')}
                        onChange={(e) => {
                          const opts = Array.isArray(editingBankQuestion.options) ? [...editingBankQuestion.options] : ['', '', '', ''];
                          opts[oi] = e.target.value;
                          setEditingBankQuestion({ ...editingBankQuestion, options: opts });
                        }}
                        className="w-full p-2 border rounded-md text-sm bg-slate-50/70"
                        placeholder={`Phương án ${['A','B','C','D'][oi]}`}
                      />
                    </div>
                  ))}
                </div>
              )}

              {String(editingBankQuestion.q_type || '') === QUESTION_TYPE.true_false_group && (
                <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] font-bold text-slate-600">Mệnh đề (a–d)</p>
                  {(editingBankQuestion.tfItems || []).map((it, ti) => (
                    <div key={it.key || ti} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-1 text-xs font-bold text-blue-700">{it.key})</div>
                      <textarea
                        value={it.text || ''}
                        onChange={(e) => {
                          const items = [...(editingBankQuestion.tfItems || [])];
                          items[ti] = { ...items[ti], text: e.target.value };
                          setEditingBankQuestion({ ...editingBankQuestion, tfItems: items });
                        }}
                        rows={2}
                        className="sm:col-span-9 p-2 border rounded-md text-xs bg-white"
                        placeholder="Nội dung mệnh đề..."
                      />
                      <select
                        value={it.correct === true ? 'true' : 'false'}
                        onChange={(e) => {
                          const items = [...(editingBankQuestion.tfItems || [])];
                          items[ti] = { ...items[ti], correct: e.target.value === 'true' };
                          setEditingBankQuestion({ ...editingBankQuestion, tfItems: items });
                        }}
                        className="sm:col-span-2 p-2 border rounded-md text-xs font-bold bg-white"
                      >
                        <option value="true">Đúng</option>
                        <option value="false">Sai</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}

              {String(editingBankQuestion.q_type || '') === QUESTION_TYPE.short_answer && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    value={editingBankQuestion.shortCorrect || ''}
                    onChange={(e) => setEditingBankQuestion({ ...editingBankQuestion, shortCorrect: e.target.value })}
                    className="p-2 border rounded-md text-sm"
                    placeholder="Đáp án (dùng | để nhiều cách)"
                  />
                  <input
                    value={editingBankQuestion.answerPlaceholder || ''}
                    onChange={(e) => setEditingBankQuestion({ ...editingBankQuestion, answerPlaceholder: e.target.value })}
                    className="p-2 border rounded-md text-sm"
                    placeholder="Placeholder ô nhập"
                  />
                </div>
              )}

              <textarea
                value={editingBankQuestion.explanation || ''}
                onChange={(e) => setEditingBankQuestion({ ...editingBankQuestion, explanation: e.target.value })}
                className="w-full p-3 border border-amber-200 bg-amber-50/80 rounded-lg text-sm min-h-[90px]"
                placeholder="Lời giải..."
              />

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleSaveBankQuestion}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl"
                >
                  <Save size={18} className="inline mr-2" /> Lưu vào ngân hàng
                </button>
                <button
                  type="button"
                  onClick={() => setEditingBankQuestion(null)}
                  className="sm:w-48 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl"
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border shadow-sm">
                <div className="min-w-0">
                  <h2 className="font-bold text-lg text-violet-800">Ngân hàng câu hỏi</h2>
                  <p className="text-xs text-slate-500">Gán nhãn (độ nhận thức, loại câu, chương/bài/dạng) để tạo đề theo ma trận.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMatrixModal(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                  >
                    <Target size={16} /> Tạo đề theo ma trận
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingBankQuestion(emptyBankQuestionDraft({ grade_level: activeGrade === 'ALL' ? '' : activeGrade }))}
                    className="bg-violet-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
                  >
                    <Plus size={16} /> Tạo câu mới
                  </button>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-2 md:items-center">
                <div className="flex-1 min-w-0">
                  <input
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                    placeholder="Tìm trong câu hỏi / lời giải / tags..."
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleMigrateEditingQuizToBank}
                  disabled={!editingQuiz}
                  className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${editingQuiz ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                  title="Đưa câu hỏi của đề đang mở (Tạo/Sửa Đề) vào ngân hàng"
                >
                  <Upload size={16} /> Lấy từ đề đang sửa
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredBankQuestions.length === 0 ? (
                  <div className="col-span-full bg-slate-50 p-10 rounded-2xl border-2 border-dashed border-slate-200 text-center text-slate-500">
                    Chưa có câu hỏi trong ngân hàng (hoặc bộ lọc rỗng).
                  </div>
                ) : (
                  filteredBankQuestions.map((q) => (
                    <div key={q.id} className="bg-white p-4 rounded-xl border shadow-sm flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-slate-500">
                            {q.chapter ? `Chương ${q.chapter}` : '—'} {q.lesson_no ? `· Bài ${q.lesson_no}` : ''} {q.category ? `· ${q.category}` : ''}
                          </p>
                          <p className="text-xs font-bold text-violet-800 mt-0.5">
                            {COG_LEVEL_LABEL[String(q.cognitive_level || COG_LEVEL.recognize)]} · {QUESTION_TYPE_LABEL[String(q.q_type || QUESTION_TYPE.multiple_choice)]}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteBankQuestion(q.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="text-sm text-slate-800 line-clamp-3">
                        <MathContent text={String(q.question || '—')} />
                      </div>
                      {(q.topic_tags || []).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(q.topic_tags || []).slice(0, 4).map((t) => (
                            <span key={t} className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              {t}
                            </span>
                          ))}
                          {(q.topic_tags || []).length > 4 && (
                            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              +{(q.topic_tags || []).length - 4}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingBankQuestion({ ...q, topic_tags: q.topic_tags || [] })}
                          className="flex-1 bg-violet-50 text-violet-700 py-2 rounded-lg font-bold text-sm hover:bg-violet-100"
                        >
                          <Edit2 size={16} className="inline mr-1" /> Sửa
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        )}

        {activeTab === 'mindmap' && (
          <MindMapAdminTab
            db={db}
            user={user}
            activeGrade={activeGrade}
            mindMapCategories={mindMapCategories || []}
            storage={storage}
          />
        )}

        {activeTab === 'review_map' && (
          <ChuyenDeOnTapAdminPanel
            db={db}
            user={user}
            storage={storage}
            activeGrade={activeGrade}
            reviewCoursesList={reviewCoursesList || []}
          />
        )}

        {activeTab === 'scores' && (
<div className="bg-white p-4 rounded-xl border shadow-sm h-full">
<div className="flex justify-between items-center mb-4">
<h2 className="font-bold text-lg text-teal-800">Bảng Điểm</h2>
<select className="border p-2 rounded text-sm font-bold bg-slate-50" value={filterQuizId} onChange={e => setFilterQuizId(e.target.value)}><option value="ALL">Tất cả đề thi</option>{filteredQuizzes.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}</select>
</div>
<div className="overflow-auto max-h-[450px]">
<table className="w-full text-left text-sm"><thead className="bg-slate-100 sticky top-0"><tr><th className="p-2">Tên</th><th className="p-2">Đề thi</th><th className="p-2 text-center">Điểm</th><th className="p-2 text-center">Tự luận</th><th className="p-2"></th></tr></thead><tbody>
                {(filterQuizId === 'ALL' ? scoresList : scoresList.filter(s => s.quizId === filterQuizId)).filter(s => activeGrade === 'ALL' || s.grade_level === activeGrade).map(s => (
                  <tr key={s.id} className="border-b"><td className="p-2 font-bold">{s.name}</td><td className="p-2 text-slate-500 truncate max-w-[150px]">{s.quizTitle}</td><td className="p-2 text-center font-bold text-blue-600">{s.score}</td><td className="p-2 text-center">{s.essayImages && Object.keys(s.essayImages).length > 0 ? <button onClick={() => setViewingImage({ name: s.name, img: Object.values(s.essayImages)[0] })} className="bg-teal-50 text-teal-700 px-2 py-1 rounded text-xs font-bold">Xem ảnh</button> : '-'}</td><td className="p-2 text-right"><button onClick={() => window.confirm('Xóa kết quả này?') && deleteDoc(doc(db, COLLECTION_SCORES, s.id))} className="text-red-400"><Trash2 size={14} /></button></td></tr>
                ))}
              </tbody></table>
</div>
          </div>
        )}

        {activeTab === 'students' && (
<div className="bg-white p-4 rounded-xl border shadow-sm">
<div className="flex justify-between items-center mb-4"><h2 className="font-bold text-lg text-orange-800">Quản lý Học Sinh ({(activeGrade === 'ALL' ? allowedStudents : allowedStudents.filter(s => s.grade_level === activeGrade)).length})</h2> <button onClick={() => setShowBulkModal(true)} className="bg-orange-100 text-orange-700 px-3 py-1.5 rounded font-bold text-sm flex items-center gap-1"><Upload size={14} /> Nhập từ Excel</button></div>
<form onSubmit={e => { e.preventDefault(); if (newStudentName.trim()) addDoc(collection(db, COLLECTION_STUDENTS), { name: newStudentName, grade_level: activeGrade === 'ALL' ? '8' : activeGrade }); setNewStudentName(''); }} className="flex gap-2 mb-4"><input value={newStudentName} onChange={e => setNewStudentName(e.target.value)} placeholder="Thêm học sinh mới..." className="flex-1 p-2 border rounded focus:ring-2 ring-orange-400" /><button className="bg-orange-600 text-white px-4 py-2 rounded font-bold">Thêm</button></form>
<div className="grid grid-cols-2 md:grid-cols-3 gap-2">{(activeGrade === 'ALL' ? allowedStudents : allowedStudents.filter(s => s.grade_level === activeGrade)).map(s => <div key={s.id} className="flex justify-between items-center bg-slate-50 border p-2 rounded"><span className="font-medium text-sm">{s.name}</span><button onClick={() => deleteDoc(doc(db, COLLECTION_STUDENTS, s.id))} className="text-red-400 p-1"><XCircle size={16} /></button></div>)}</div>
</div>
        )}
      </div>

      {showBulkModal && (
<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"><div className="bg-white p-6 rounded-xl w-full max-w-md"><h3 className="font-bold mb-2">Nhập tên từ Excel (Mỗi tên 1 dòng)</h3><textarea value={bulkText} onChange={e => setBulkText(e.target.value)} className="w-full h-48 border rounded p-2 mb-4 text-sm" /><div className="flex gap-2"><button onClick={() => setShowBulkModal(false)} className="flex-1 bg-slate-100 py-2 rounded font-bold">Hủy</button><button onClick={handleBulkImport} className="flex-1 bg-orange-600 text-white py-2 rounded font-bold">Xác nhận nạp</button></div></div></div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-2 md:p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[min(1200px,98vw)] max-h-[92vh] overflow-hidden flex flex-col">
            <div className="p-3 border-b flex items-center justify-between bg-slate-50 shrink-0 gap-2">
              <div className="min-w-0">
                <p className="font-extrabold text-slate-800 text-sm md:text-base">Dán nội dung đề (TXT/Word)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  LaTeX <span className="font-mono">$...$</span> · Lỗi hiển thị kèm từng câu bên phải · Có thể nhập dù còn lỗi rồi sửa trên form.
                </p>
              </div>
              <button type="button" onClick={() => setShowImportModal(false)} className="text-slate-500 hover:text-red-600 shrink-0">
                <XCircle size={26} />
              </button>
            </div>
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-slate-200">
              <div className="p-3 flex flex-col min-h-0 min-w-0" onFocusCapture={captureAdminTextFocus}>
                <div className="flex flex-wrap items-center gap-2 mb-2 shrink-0">
                  <AdminImageUploadControl
                    storage={storage}
                    user={user}
                    busy={imageUploadBusy}
                    onFile={handleAdminImageUpload}
                  />
                  <span className="text-[10px] text-slate-500">Focus vào ô dưới rồi upload để chèn ảnh vào import.</span>
                </div>
                <textarea
                  data-admin-snippet="import-quiz"
                  value={importText}
                  onChange={(e) => {
                    setImportText(e.target.value);
                    runParseImport(e.target.value);
                  }}
                  placeholder={
                    'Câu 1: Giải phương trình $2x+3=7$\nA. $x=1$\nB. $x=2$\nC. $x=3$\nD. $x=4$\nĐáp án: B\nLời giải: $2x=4 \\Rightarrow x=2$'
                  }
                  className="w-full flex-1 min-h-[240px] lg:min-h-[min(520px,55vh)] border rounded-xl p-3 font-mono text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
                />
                <div className="flex flex-wrap gap-2 items-center justify-between mt-2 shrink-0">
                  <span className="text-xs text-slate-600 font-semibold">Đã nhận: {importPreview.length} câu</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowImportModal(false)} className="px-3 py-2 rounded-lg bg-slate-100 text-sm font-bold">
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleImportApply}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-extrabold hover:bg-blue-700"
                    >
                      Nhập vào đề
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-3 flex flex-col min-h-0 min-w-0 bg-slate-50/80">
                <p className="text-xs font-bold text-slate-700 mb-2 shrink-0">Xem trước toàn bộ ({importPreview.length} câu)</p>
                <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                  {importPreview.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">Dán nội dung bên trái để xem preview.</p>
                  ) : (
                    importPreview.map((q, i) => {
                      const mErrs = importModalErrByQuestion.byQuestion.get(i + 1);
                      return (
                        <div
                          key={i}
                          className={`rounded-lg border p-2 text-[11px] ${mErrs?.length ? 'border-red-300 bg-red-50/60' : 'border-slate-200 bg-white'}`}
                        >
                          <p className="font-bold text-slate-800 mb-1">Câu {i + 1}</p>
                          {mErrs?.length ? (
                            <ul className="list-disc pl-4 mb-1 text-red-800 space-y-0.5">
                              {mErrs.map((er, ei) => (
                                <li key={ei}>{er}</li>
                              ))}
                            </ul>
                          ) : null}
                          <div className="text-slate-800 mb-1">
                            <MathContent text={q.question || '…'} className="text-[11px]" />
                          </div>
                          {q.type === 'essay' ? (
                            <p className="text-slate-500 italic">Tự luận (nộp ảnh)</p>
                          ) : q.type === 'short_answer' ? (
                            <div className="text-[11px] text-slate-600 space-y-1">
                              <p>
                                <span className="font-bold">Đáp án:</span>{' '}
                                <span className="font-mono">{String(q.shortCorrect || '')}</span>
                              </p>
                              <p className="text-slate-500 italic border border-dashed rounded px-2 py-1 bg-white">
                                Placeholder: {String(q.answerPlaceholder || 'Nhập đáp án...')}
                              </p>
                            </div>
                          ) : q.type === 'true_false_group' ? (
                            <ul className="text-[11px] space-y-1">
                              {(q.tfItems || []).map((it) => (
                                <li key={it.key}>
                                  <span className="font-bold text-blue-700">{it.key})</span>{' '}
                                  <MathContent text={String(it.text || '')} className="text-[11px]" />
                                  <span className={`ml-1 font-bold ${it.correct ? 'text-emerald-700' : 'text-red-600'}`}>
                                    ({it.correct ? 'Đ' : 'S'})
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="grid grid-cols-1 gap-1">
                              {(q.options || []).map((o, oi) => (
                                <div
                                  key={oi}
                                  className={`rounded px-1.5 py-0.5 border text-[11px] ${
                                    q.correctAnswer === oi ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white'
                                  }`}
                                >
                                  <span className="font-bold mr-1">{['A', 'B', 'C', 'D'][oi]}.</span>
                                  <MathContent text={String(o || '')} className="text-[11px]" inlineImage />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  {importModalErrByQuestion.global.length > 0 ? (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-950">
                      <p className="font-bold mb-1">Lỗi chung (không gắn số câu)</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {importModalErrByQuestion.global.map((er, i) => (
                          <li key={i}>{er}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bank import removed per request */}

      {viewingImage && (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4"><div className="bg-white rounded-xl overflow-hidden max-w-2xl w-full"><div className="flex justify-between items-center p-4 border-b"><strong>Ảnh bài làm: {viewingImage.name}</strong><button onClick={() => setViewingImage(null)}><XCircle size={24} /></button></div><img src={viewingImage.img} className="w-full h-auto" alt="Bài làm" /></div></div>
      )}
    </div>
  );
}
