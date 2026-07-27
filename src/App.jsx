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
const CommunityQaScreen = lazyWithRetry(() => import('./CommunityQaScreen'), 'CommunityQaScreen');
const WeeklyContestScreen = lazyWithRetry(() => import('./WeeklyContestScreen'), 'WeeklyContestScreen');
const BlogPostScreen = lazyWithRetry(() => import('./BlogPostScreen'), 'BlogPostScreen');
const DocumentsBrowseScreen = lazyWithRetry(() => import('./DocumentsBrowseScreen'), 'DocumentsBrowseScreen');
const DocumentViewerScreen = lazyWithRetry(() => import('./DocumentViewerScreen'), 'DocumentViewerScreen');
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
  emptyLessonSectionTemplate,
  getLessonDisplayLabel,
  getSectionDisplayLabel,
  normalizeLessonSections,
  sortLessonSections,
} from './lessonSections';
import {
  buildMergedChapterOptions,
  buildMergedLessonNoOptions,
  deriveLessonTitleFromSections,
  findSgkLessonTitle,
} from './lessonEditorCatalog';
import {
  parseQuestionsFromText,
  groupQuizImportErrors,
  validateQuizQuestionsAdmin,
} from './quizImportParser';
import { sortQuizQuestions, normalizeImportedQuizQuestion } from './quizQuestionOrder';
import LessonRepositoryPanel from './admin/LessonRepositoryPanel';
import QuizRepositoryPanel from './admin/QuizRepositoryPanel';
import { getQuizExamTypeOptions, EXAM_TYPE, normalizeExamType } from './quizExamTypes';
import { RichMathContent } from './RichMathContent';
import { PracticeFillBlanks, PracticeFillBlanksResult } from './PracticeInteractiveQuestions';
import { fillBlanksAnswerOk, normalizeFillBlanksQuestion } from './practiceQuestionTypes';
import { User, Lock, Award, ListOrdered, CheckCircle, XCircle, ArrowRight, ShieldCheck, AlertTriangle, Settings, Users, FileText, LogOut, Plus, Trash2, Edit2, Save, Camera, Image as ImageIcon, Eye, EyeOff, Upload, Lightbulb, ArrowLeft, Clock, PlayCircle, BookOpen, Filter, FileEdit, Video, Play, BookText, Home, Trophy, Sparkles, Star, Target, Heart, Link2, Network, Map as MapIcon, LayoutTemplate, MessageCircle, FolderOpen, UserCog } from 'lucide-react';
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
  COLLECTION_CUSTOM_MATH_TOPICS,
  COLLECTION_CLASSES,
  COLLECTION_TRIAL_REGISTRATIONS,
  ensureAnonymousAuth,
  ensureLocalAuthPersistence,
} from './firebaseClient';
import {
  mergeTopicOptionLists,
  getCustomTopicsForChapter,
  topicExistsInLists,
  buildCustomTopicPayload,
} from './customMathTopics';
import AddCustomMathTopicModal from './admin/AddCustomMathTopicModal';
import QuestionRepositoryPanel from './admin/QuestionRepositoryPanel';
import ClassroomManagementPanel from './admin/ClassroomManagementPanel';
import AdminTeachersPanel from './admin/AdminTeachersPanel';
import HomepageCmsAdminPanel from './admin/HomepageCmsAdminPanel';
import AdminCommunityQuestionsPanel from './admin/AdminCommunityQuestionsPanel';
import AdminWeeklyContestPanel from './admin/AdminWeeklyContestPanel';
import AdminBlogPanel from './admin/AdminBlogPanel';
import AdminDocumentsPanel from './admin/AdminDocumentsPanel';
import { authenticateStaff, STAFF_ROLE, ALL_GRADE_OPTIONS, normUsername } from './admin/adminStaffStore';
import {
  canAccessAdminTab,
  canAccessGrade,
  defaultGradeForStaff,
  isSuperAdmin,
  allowedGradesForStaff,
} from './admin/adminPermissions';
import {
  filterBankQuestions,
  buildBankChapterFilterOptions,
  buildBankTopicFilterOptions,
  BANK_SECTION_GIFTED,
} from './questionBankRepository';
import {
  readLessonDeepLinkFromLocation,
  findLessonInList,
  fetchLessonForDeepLink,
} from './lessonDeepLink';
import mammoth from'mammoth';
import { compressImageFileToJpegBlob, applyAdminSnippetByKey } from './adminImageUpload';
import { LessonFormattingToolbar } from './LessonFormattingToolbar';
import { computeAutoGradedScore, DEFAULT_PART_POINTS, formatScoreForDisplay, normalizePartPoints, shortAnswerIsCorrect } from './quizScoring';
import { slugifyVi, buildLessonSlug, ensureUniqueLessonSlug } from './lessonSlug';
import LessonSeoAdminPanel from './LessonSeoAdminPanel';
import { listExistingTopics, slugifyTopicId } from './topics';
import BackButton from './BackButton';
import { clearStudentSession, readStudentSession, touchStudentSession, writeStudentSession } from './studentSession';
import {
  consumeAuthRedirectResult,
  loginWithStudentCredentials,
  resolveStudentSessionFromAllowedStudents,
  signInWithGoogleProvider,
  upsertSelfRegisteredStudent,
} from './studentAuth';
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
import StudentRegisterScreen from './StudentRegisterScreen';
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
  if (t === 'fill_blanks') {
    const { blanks } = normalizeFillBlanksQuestion(q);
    const obj = answers[q.id];
    if (!obj || typeof obj !== 'object') return false;
    return blanks.length > 0 && blanks.every((b) => String(obj[b.id] || '').trim().length > 0);
  }
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

function isRegisterUrlPath(pathname) {
  const p = normalizeAppPathname(pathname);
  return p === '/dang-ky' || p === '/register';
}

function parseCommunityRoute(pathname) {
  const p = normalizeAppPathname(pathname);
  if (p === '/hoi-dap' || p === '/cong-dong') return { kind: 'qa' };
  if (p === '/cuoc-thi') return { kind: 'contest', slug: '' };
  const m = p.match(/^\/cuoc-thi\/([^/?#]+)\/?$/i);
  if (m) return { kind: 'contest', slug: decodeURIComponent(m[1]) };
  if (p === '/blog') return { kind: 'blog_list' };
  const blog = p.match(/^\/blog\/([^/?#]+)\/?$/i);
  if (blog) return { kind: 'blog', slug: decodeURIComponent(blog[1]) };
  if (p === '/tai-lieu') return { kind: 'docs', folderId: '' };
  const docsFolder = p.match(/^\/tai-lieu\/thu-muc\/([^/?#]+)\/?$/i);
  if (docsFolder) return { kind: 'docs', folderId: decodeURIComponent(docsFolder[1]) };
  const doc = p.match(/^\/tai-lieu\/([^/?#]+)\/?$/i);
  if (doc && doc[1].toLowerCase() !== 'thu-muc') {
    return { kind: 'doc_view', docId: decodeURIComponent(doc[1]) };
  }
  return null;
}

const ADMIN_SESSION_KEY = 'thayphat_admin_session_v2';
const ADMIN_IDLE_MS = 60 * 60 * 1000;
const ADMIN_MAX_MS = 12 * 60 * 60 * 1000;

function staffFromSession(s) {
  if (!s) return null;
  return {
    id: s.staffId || null,
    username: s.username || '',
    name: s.name || 'Admin',
    role: s.role === STAFF_ROLE.TEACHER ? STAFF_ROLE.TEACHER : STAFF_ROLE.SUPER_ADMIN,
    grade_levels: Array.isArray(s.grade_levels) ? s.grade_levels.map(String) : [],
    class_ids: Array.isArray(s.class_ids) ? s.class_ids.map(String) : [],
  };
}

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
    return {
      loginAt,
      lastActiveAt,
      staffId: obj.staffId || null,
      username: obj.username || '',
      name: obj.name || '',
      // Session cũ không có role → coi như admin tổng (tương thích ngược)
      role: obj.role === STAFF_ROLE.TEACHER ? STAFF_ROLE.TEACHER : STAFF_ROLE.SUPER_ADMIN,
      grade_levels: Array.isArray(obj.grade_levels) ? obj.grade_levels.map(String) : [],
      class_ids: Array.isArray(obj.class_ids) ? obj.class_ids.map(String) : [],
    };
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
function writeAdminSessionLogin(staff = null) {
  try {
    if (typeof window === 'undefined') return;
    const now = Date.now();
    const role =
      staff?.role === STAFF_ROLE.TEACHER ? STAFF_ROLE.TEACHER : STAFF_ROLE.SUPER_ADMIN;
    window.localStorage.setItem(
      ADMIN_SESSION_KEY,
      JSON.stringify({
        loginAt: now,
        lastActiveAt: now,
        staffId: staff?.id || null,
        username: staff?.username || (role === STAFF_ROLE.SUPER_ADMIN ? 'admin' : ''),
        name: staff?.name || (role === STAFF_ROLE.SUPER_ADMIN ? 'Admin tổng' : 'Giáo viên'),
        role,
        grade_levels: Array.isArray(staff?.grade_levels) ? staff.grade_levels.map(String) : [],
        class_ids: Array.isArray(staff?.class_ids) ? staff.class_ids.map(String) : [],
      }),
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
      JSON.stringify({ ...s, lastActiveAt: Date.now() }),
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
function writeAdminSessionFlag(on, staff = null) {
  if (on) writeAdminSessionLogin(staff);
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
      if (typeof window !== 'undefined' && isRegisterUrlPath(window.location.pathname)) return 'register';
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
  const [studentPortalOpen, setStudentPortalOpen] = useState(false);
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
  const [classesList, setClassesList] = useState([]);
  const [trialRegistrations, setTrialRegistrations] = useState([]);
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

  const studentProfile = useMemo(() => {
    if (!studentName) return null;
    const byName = allowedStudents.find((s) => normStudentName(s?.name) === normStudentName(studentName));
    if (byName) return byName;
    const uid = auth.currentUser?.uid;
    if (uid) {
      const byUid = allowedStudents.find((s) => s.firebase_uid === uid);
      if (byUid) return byUid;
    }
    const email = String(auth.currentUser?.email || '').trim().toLowerCase();
    if (email) {
      return allowedStudents.find((s) => String(s.email || '').trim().toLowerCase() === email) || null;
    }
    return null;
  }, [allowedStudents, studentName]);

  const handleSaveStudentProfile = useCallback(
    async (patch) => {
      const row = studentProfile;
      if (!row?.id) {
        throw new Error('Không tìm thấy hồ sơ học sinh trên hệ thống. Liên hệ giáo viên.');
      }
      const nextClass = String(patch.class_label ?? row.class_label ?? '').trim();
      const nextGrade = String(patch.grade_level ?? row.grade_level ?? rosterGrade ?? '8').trim();
      await updateDoc(doc(db, COLLECTION_STUDENTS, row.id), {
        phone: String(patch.phone ?? row.phone ?? '').trim(),
        school: String(patch.school ?? row.school ?? '').trim(),
        class_label: nextClass,
        grade_level: nextGrade,
        province: String(patch.province ?? row.province ?? '').trim(),
        ward: String(patch.ward ?? row.ward ?? '').trim(),
        address: String(patch.address ?? row.address ?? '').trim(),
        notify_zalo: Boolean(patch.notify_zalo),
        notify_email: Boolean(patch.notify_email),
        updated_at: Date.now(),
      });
      setStudentClass(nextClass);
      if (VALID_PUBLIC_GRADES.has(nextGrade)) {
        window.currentStudentGrade = nextGrade;
        writeStudentSession({
          name: studentName,
          className: nextClass,
          gradeLevel: nextGrade,
        });
      }
    },
    [studentProfile, rosterGrade, studentName]
  );

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
  const [adminStaff, setAdminStaff] = useState(() => {
    const s = readAdminSession();
    return isAdminSessionValid(s) ? staffFromSession(s) : null;
  });

  const logoutAdmin = useCallback(() => {
    writeAdminSessionFlag(false);
    setAdminStaff(null);
    setAppState('login');
  }, []);

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
        setAdminStaff(null);
        setAppState('login');
      }
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'visibilitychange'];
    events.forEach((ev) => window.addEventListener(ev, touch, { passive: true }));
    const tick = setInterval(() => {
      const s = readAdminSession();
      if (!isAdminSessionValid(s)) {
        clearAdminSession();
        setAdminStaff(null);
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

  const communityRoute = useMemo(() => {
    try {
      return typeof window !== 'undefined' ? parseCommunityRoute(window.location.pathname) : null;
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

  const registerRouteActive = useMemo(() => {
    try {
      return typeof window !== 'undefined' && isRegisterUrlPath(window.location.pathname);
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

  useEffect(() => {
    try {
      if (!registerRouteActive) return;
      setAppState((prev) => (prev === 'admin' ? prev : 'register'));
    } catch {
      /* ignore */
    }
  }, [registerRouteActive, locationKey]);

  const openRegister = useCallback(() => {
    setUrlPathSafe('/dang-ky', 'push');
    setAppState('register');
  }, [setUrlPathSafe]);

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
    ensureLocalAuthPersistence()
      .then(() => ensureAnonymousAuth())
      .catch((error) => {
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
          collection(db, COLLECTION_CLASSES),
          (snapshot) => {
            setClassesList(
              snapshot.docs
                .map((d) => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'))
            );
          },
          (err) => {
            console.error('Lỗi tải danh sách lớp (Firestore):', err);
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

      unsubs.push(
        onSnapshot(
          collection(db, COLLECTION_TRIAL_REGISTRATIONS),
          (snapshot) => {
            setTrialRegistrations(
              snapshot.docs
                .map((d) => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
            );
          },
          (err) => {
            console.error('Lỗi tải đăng ký học thử (Firestore):', err);
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
            console.error('Lỗi tải sơ đồ tư duy ngược (Firestore):', err);
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
    const portalTab = postLoginTab;
    if (portalTab === 'topics' || portalTab === 'exams' || portalTab === 'lessons') {
      setStudentPortalOpen(true);
    } else {
      setStudentPortalOpen(false);
      setPostLoginTab(null);
      // Giữ URL /hoi-dap hoặc /cuoc-thi nếu đang ở đó
      try {
        const p = normalizeAppPathname(window.location.pathname);
        if (p === '/hoi-dap' || p === '/cong-dong' || p === '/cuoc-thi' || p.startsWith('/cuoc-thi/')) {
          /* stay on community page */
        }
      } catch {
        /* ignore */
      }
    }
  };

  const openStudentPortal = useCallback((tab = 'dashboard') => {
    setPostLoginTab(tab);
    setStudentPortalOpen(true);
  }, []);

  const closeStudentPortal = useCallback(() => {
    setStudentPortalOpen(false);
    setPostLoginTab(null);
  }, []);

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
        quizTitle: `Bài tập luyện tập — ${lessonTitle || 'Bài giảng'}`,
        score,
        time: `${score}/${total}`,
        essayImages: {},
        answers: {},
        timestamp: Date.now(),
        kind: 'lesson_practice',
        practiceTotal: total,
      });
    } catch (e) {
      console.error('Lỗi lưu điểm bài tập luyện tập:', e);
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
  const showLessonDeepLinkSplash =
    lessonDeepLinkLoading &&
    appState === 'dashboard' &&
    Boolean(pendingLessonId || pendingLessonSlug);
  const isPublicLandingView =
    !showLessonDeepLinkSplash &&
    appState === 'dashboard' &&
    !catalogRoute &&
    !communityRoute &&
    !studentPortalOpen;
  const isCommunityView =
    !showLessonDeepLinkSplash && appState === 'dashboard' && !!communityRoute && !studentPortalOpen;
  const publicLessonsFiltered = useMemo(
    () => lessonsList.filter((l) => l.grade_level === publicGrade || !l.grade_level),
    [lessonsList, publicGrade]
  );
  const publicQuizzesFiltered = useMemo(
    () => quizzesList.filter((q) => q.grade_level === publicGrade || !q.grade_level),
    [quizzesList, publicGrade]
  );

  const isStudentExperience = appState !== 'admin';
  const isStudentDashboard = Boolean(studentName && appState === 'dashboard' && studentPortalOpen);
  const showGlobalHeader =
    !isImmersiveLessonView && !isStudentDashboard && !isPublicLandingView && !isCommunityView;

  return (
    <div className={`min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-slate-100 flex flex-col font-sans selection:bg-blue-200 ${isStudentExperience ? 'student-ui' : ''}`}>
      <SeoHead
        appState={appState}
        publicGrade={publicGrade}
        studentName={studentName}
        studentRosterGrade={rosterGrade}
        selectedLesson={selectedLesson}
        activeQuiz={activeQuiz}
      />
{showGlobalHeader && (
<header className="bg-blue-700 text-white shadow-md py-4 px-4 sm:px-6 flex justify-between items-center z-10 min-w-0">
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
    className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-blue-800/80 hover:bg-blue-900 text-white border border-white/10 shrink-0"
  >
    <ArrowLeft size={18} />
  </button>
  <h1 className="font-display text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-2 truncate">
    <BookText size={24} className="shrink-0" /> Lớp Học Toán Thầy Phát
  </h1>
</div>
        {appState === 'admin' && (
<button onClick={logoutAdmin} className="flex items-center gap-2 bg-blue-800 hover:bg-blue-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0">
            <LogOut size={16} /> Đăng xuất {adminStaff?.role === STAFF_ROLE.TEACHER ? 'GV' : 'Admin'}
</button>
        )}
      </header>
)}
<main
        className={`flex-1 flex min-h-0 min-w-0 ${
          isImmersiveLessonView || isPublicLandingView || isCommunityView || isStudentDashboard
            ? 'w-full flex-col p-0 overflow-x-hidden overflow-y-hidden'
            : appState === 'admin'
              ? 'w-full flex-col items-stretch justify-start p-2 md:p-3 lg:px-4 min-h-0'
              : 'w-full items-start justify-center p-2 md:p-4 overflow-x-hidden'
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
            onRequestRegister={openRegister}
            onAdminAccess={(staff) => {
              const next = staff || {
                id: null,
                username: 'admin',
                name: 'Admin tổng',
                role: STAFF_ROLE.SUPER_ADMIN,
                grade_levels: [],
                class_ids: [],
              };
              writeAdminSessionLogin(next);
              setAdminStaff(staffFromSession(readAdminSession()) || {
                id: next.id || null,
                username: next.username || '',
                name: next.name || 'Admin',
                role: next.role === STAFF_ROLE.TEACHER ? STAFF_ROLE.TEACHER : STAFF_ROLE.SUPER_ADMIN,
                grade_levels: Array.isArray(next.grade_levels) ? next.grade_levels.map(String) : [],
                class_ids: Array.isArray(next.class_ids) ? next.class_ids.map(String) : [],
              });
              setTeacherDefaultGrade(defaultGradeForStaff(next, publicGrade || '8'));
              setAppState('admin');
              try {
                if (isAdminLoginUrlPath(window.location.pathname)) setUrlPathSafe('/', 'replace');
              } catch {
                /* ignore */
              }
            }}
          />
        )}
        {appState === 'register' && (
          <StudentRegisterScreen
            publicGrade={publicGrade}
            allowedStudents={allowedStudents}
            onSuccess={(name, className, gradeLevel) => {
              setAllowedStudents((prev) => {
                const exists = prev.some((s) => normStudentName(s?.name) === normStudentName(name));
                if (exists) return prev;
                return [
                  ...prev,
                  {
                    id: `local_${Date.now()}`,
                    name,
                    class_label: className,
                    grade_level: gradeLevel,
                    self_registered: true,
                  },
                ];
              });
              handleLogin(name, className, gradeLevel);
              try {
                if (isRegisterUrlPath(window.location.pathname)) setUrlPathSafe('/', 'replace');
              } catch {
                /* ignore */
              }
            }}
            onGoLogin={() => {
              setUrlPathSafe('/', 'replace');
              setAppState('login');
            }}
            onGoHome={() => {
              setUrlPathSafe('/', 'replace');
              setAppState('dashboard');
            }}
          />
        )}
{showLessonDeepLinkSplash ? (
        <LessonDeepLinkSplash />
        ) : null}
{!showLessonDeepLinkSplash && appState ==='dashboard' && catalogRoute && !studentName && (
        <CatalogScreen route={catalogRoute} />
        )}
{!showLessonDeepLinkSplash && appState === 'dashboard' && communityRoute?.kind === 'qa' && !studentPortalOpen && (
        <div className="w-full h-full min-h-0 overflow-y-auto overflow-x-hidden">
          <CommunityQaScreen
            studentName={studentName}
            studentClass={studentClass}
            onRequestLogin={() => {
              setPostLoginTab(null);
              setUrlPathSafe('/hoi-dap', 'replace');
              setAppState('login');
            }}
            onGoHome={() => {
              setUrlPathSafe('/', 'push');
              setAppState('dashboard');
            }}
          />
        </div>
        )}
{!showLessonDeepLinkSplash && appState === 'dashboard' && communityRoute?.kind === 'contest' && !studentPortalOpen && (
        <div className="w-full h-full min-h-0 overflow-y-auto overflow-x-hidden">
          <WeeklyContestScreen
            slug={communityRoute.slug || ''}
            studentName={studentName}
            studentClass={studentClass}
            studentGrade={rosterGrade || publicGrade || ''}
            onRequestLogin={() => {
              setPostLoginTab(null);
              setUrlPathSafe('/cuoc-thi', 'replace');
              setAppState('login');
            }}
            onGoHome={() => {
              setUrlPathSafe('/', 'push');
              setAppState('dashboard');
            }}
            onOpenList={() => setUrlPathSafe('/cuoc-thi', 'push')}
            onOpenDetail={(s) => setUrlPathSafe(`/cuoc-thi/${s}`, 'push')}
            onOpenBlogPost={(s) => setUrlPathSafe(`/blog/${s}`, 'push')}
          />
        </div>
        )}
{!showLessonDeepLinkSplash && appState === 'dashboard' && (communityRoute?.kind === 'blog' || communityRoute?.kind === 'blog_list') && !studentPortalOpen && (
        <div className="w-full h-full min-h-0 overflow-y-auto overflow-x-hidden">
          <BlogPostScreen
            slug={communityRoute.kind === 'blog' ? communityRoute.slug || '' : ''}
            onGoHome={() => {
              setUrlPathSafe('/', 'push');
              setAppState('dashboard');
            }}
            onOpenPost={(s) => setUrlPathSafe(`/blog/${s}`, 'push')}
          />
        </div>
        )}
{!showLessonDeepLinkSplash && appState === 'dashboard' && communityRoute?.kind === 'docs' && !studentPortalOpen && (
        <div className="w-full h-full min-h-0 overflow-y-auto overflow-x-hidden">
          <DocumentsBrowseScreen
            folderId={communityRoute.folderId || ''}
            onGoHome={() => {
              setUrlPathSafe('/', 'push');
              setAppState('dashboard');
            }}
            onOpenDocument={(id) => setUrlPathSafe(`/tai-lieu/${id}`, 'push')}
            onOpenFolder={(fid) => setUrlPathSafe(`/tai-lieu/thu-muc/${fid}`, 'push')}
            onOpenAll={() => setUrlPathSafe('/tai-lieu', 'push')}
          />
        </div>
        )}
{!showLessonDeepLinkSplash && appState === 'dashboard' && communityRoute?.kind === 'doc_view' && !studentPortalOpen && (
        <div className="w-full h-full min-h-0 overflow-y-auto overflow-x-hidden">
          <DocumentViewerScreen
            docId={communityRoute.docId || ''}
            onGoHome={() => {
              setUrlPathSafe('/', 'push');
              setAppState('dashboard');
            }}
            onOpenDocuments={() => setUrlPathSafe('/tai-lieu', 'push')}
            onOpenExplore={(fid) => setUrlPathSafe(`/tai-lieu/thu-muc/${fid || 'hsg'}`, 'push')}
          />
        </div>
        )}
{!showLessonDeepLinkSplash && appState ==='dashboard' && !catalogRoute && !communityRoute && !studentPortalOpen && (
        <PublicLandingScreen
          key={publicGrade}
          publicGrade={publicGrade}
          studentName={studentName}
          studentClass={studentClass}
          rosterGrade={rosterGrade}
          studentProfile={studentProfile}
          onPublicGradeChange={setPublicGrade}
          quizzesList={quizzesList.filter(q => q.grade_level === publicGrade || !q.grade_level)}
          lessonsList={lessonsList.filter(l => l.grade_level === publicGrade || !l.grade_level)}
          onRequestLogin={() => setAppState('login')}
          onRequestRegister={openRegister}
          onOpenCommunityQa={() => setUrlPathSafe('/hoi-dap', 'push')}
          onOpenWeeklyContest={() => setUrlPathSafe('/cuoc-thi', 'push')}
          onOpenBlogPost={(slug) => setUrlPathSafe(`/blog/${slug}`, 'push')}
          onOpenDocuments={() => setUrlPathSafe('/tai-lieu', 'push')}
          onOpenDocument={(id) => setUrlPathSafe(`/tai-lieu/${id}`, 'push')}
          scoresList={scoresList}
          studentsList={allowedStudents}
          onEnterExam={() => {
            if (studentName) openStudentPortal('exams');
            else {
              setPostLoginTab('exams');
              setAppState('login');
            }
          }}
          onRequestTopics={() => {
            if (studentName) openStudentPortal('topics');
            else {
              setPostLoginTab('topics');
              setAppState('login');
            }
          }}
          onEnterStudentPortal={openStudentPortal}
          onLogout={() => {
            appNavStackRef.current = [];
            clearStudentSession();
            setStudentName('');
            setStudentClass('');
            setStudentPortalOpen(false);
            setPostLoginTab(null);
            try {
              delete window.currentStudentGrade;
            } catch {
              /* ignore */
            }
          }}
          onSelectQuiz={(id) => {
            setPendingOpen({ quizId: id });
            if (studentName) openStudentPortal('exams');
            else setAppState('login');
          }}
          onSelectLesson={(lessonId) => {
            openLessonById(lessonId);
          }}
        />
        )}
{!showLessonDeepLinkSplash && appState ==='dashboard' && studentPortalOpen && studentName && (
        <StudentDashboardScreen
          ref={dashboardNavRef}
          key={`${studentName}-${postLoginTab || 'dashboard'}`}
          studentName={studentName}
          studentClass={studentClass}
          rosterGrade={rosterGrade}
          studentProfile={studentProfile}
          onSaveStudentProfile={handleSaveStudentProfile}
          scoresList={scoresList}
          quizzesList={studentQuizzesFiltered}
          lessonsList={studentLessonsFiltered}
          mindMapCategories={mindMapCategories}
          reviewCoursesList={reviewCoursesList}
          reviewProgressList={reviewProgressList}
          initialTab={postLoginTab || 'dashboard'}
          onGoHome={closeStudentPortal}
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
            setStudentPortalOpen(false);
            setPostLoginTab(null);
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
            studentProfile={studentProfile}
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
            onSelectQuiz={openQuizById}
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
            classesList={classesList}
            scoresList={scoresList}
            quizzesList={quizzesList}
            lessonsList={lessonsList}
            questionBank={questionBank}
            mindMapCategories={mindMapCategories}
            reviewCoursesList={reviewCoursesList}
            trialRegistrations={trialRegistrations}
            adminPassword={ADMIN_PASSWORD}
            db={db}
            storage={storage}
            user={user}
            defaultGrade={teacherDefaultGrade || publicGrade}
            staffSession={adminStaff}
          />
        )}
        </Suspense>
</main>
    </div>
  );
}

function LoginScreen({ onLogin, allowedStudents, adminPassword, onAdminAccess, openTeacherGate, onRequestRegister }) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(!!openTeacherGate);
  const [adminUser, setAdminUser] = useState('');
  const [adminPwd, setAdminPwd] = useState('');
  const [showAdminPwd, setShowAdminPwd] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminBusy, setAdminBusy] = useState(false);

  useEffect(() => {
    if (openTeacherGate) setShowAdminModal(true);
  }, [openTeacherGate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await consumeAuthRedirectResult();
        if (cancelled || !result?.user) return;
        const session = await upsertSelfRegisteredStudent({
          firebaseUser: result.user,
          profile: {
            fullName: result.user.displayName || '',
            email: result.user.email || '',
            gradeLevel: '8',
          },
          allowedStudents,
        });
        onLogin(session.name, session.className, session.gradeLevel);
      } catch (err) {
        if (!cancelled) setError(err?.message || String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishGoogleLogin = async () => {
    setError('');
    setBusy(true);
    try {
      const cred = await signInWithGoogleProvider();
      if (!cred?.user) return;
      const session = await upsertSelfRegisteredStudent({
        firebaseUser: cred.user,
        profile: {
          fullName: cred.user.displayName || '',
          email: cred.user.email || '',
          gradeLevel: '8',
        },
        allowedStudents,
      });
      onLogin(session.name, session.className, session.gradeLevel);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const id = String(loginId || '').trim();
    if (!id) return setError('Nhập tên đăng nhập hoặc Gmail để đăng nhập.');
    if (!password) return setError('Nhập mật khẩu.');
    setBusy(true);
    try {
      const { session } = await loginWithStudentCredentials({
        loginId: id,
        password,
        allowedStudents,
      });
      onLogin(session.name, session.className, session.gradeLevel);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleAdminSubmit = async () => {
    setAdminError('');
    const u = String(adminUser || '').trim();
    const p = String(adminPwd || '');
    if (!p) {
      setAdminError('Nhập mật khẩu.');
      return;
    }
    setAdminBusy(true);
    try {
      const uNorm = normUsername(u);
      // Admin tổng: để trống / "admin" + mật khẩu master (tương thích cũ)
      if (p === adminPassword && (!uNorm || uNorm === 'admin')) {
        onAdminAccess({
          id: null,
          username: 'admin',
          name: 'Admin tổng',
          role: STAFF_ROLE.SUPER_ADMIN,
          grade_levels: [],
          class_ids: [],
        });
        setShowAdminModal(false);
        setAdminPwd('');
        setAdminUser('');
        return;
      }
      if (!uNorm) {
        setAdminError('Nhập tên đăng nhập giáo viên (hoặc để trống + mật khẩu admin tổng).');
        return;
      }
      const staff = await authenticateStaff(u, p);
      onAdminAccess(staff);
      setShowAdminModal(false);
      setAdminPwd('');
      setAdminUser('');
    } catch (err) {
      setAdminError(err?.message || 'Đăng nhập thất bại.');
    } finally {
      setAdminBusy(false);
    }
  };

  return (
<div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full border border-slate-200 mt-10">
<div className="flex justify-center mb-6"><div className="bg-blue-100 p-4 rounded-full text-blue-600"><User size={48} /></div></div>
<h2 className="font-display text-2xl font-bold text-center text-slate-800 mb-2">Đăng nhập tài khoản</h2>
<p className="text-center text-slate-500 text-base mb-8">Hệ thống cần lưu lại thông tin để chấm điểm bài thi của bạn.</p>
<form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-6">
        <div>
<label className="block text-sm font-medium text-slate-700 mb-1">Tên đăng nhập hoặc Gmail:</label>
<input type="text" value={loginId} onChange={(e) => { setLoginId(e.target.value); setError(''); }} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Phat@xyz hoặc abc@gmail.com" autoFocus autoComplete="username" />
        </div>
        <div>
<label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu:</label>
<div className="relative">
<input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nhập mật khẩu" autoComplete="current-password" />
<button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
</button>
</div>
        </div>
{error && <p className="text-sm text-red-500 flex items-center gap-1"><XCircle size={14} /> {error}</p>}
<button type="button" onClick={() => window.location.reload()} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-xl transition-colors mt-2 mb-2">Hủy / Quay lại</button>
<button type="submit" disabled={busy} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors mt-2">{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
      </form>
      <div className="flex items-center gap-3 text-slate-400 text-sm mb-4">
        <div className="flex-1 h-px bg-slate-200" />
        <span>hoặc</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={finishGoogleLogin}
        className="w-full mb-4 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 disabled:opacity-60"
      >
        <span className="inline-flex w-5 h-5 items-center justify-center text-[#EA4335] font-black text-sm">G</span>
        Tiếp tục bằng Google
      </button>
      <p className="text-center text-sm text-slate-600 mb-4">
        Chưa có tài khoản?{' '}
        <button
          type="button"
          onClick={() => onRequestRegister?.()}
          className="font-bold text-blue-600 hover:underline"
        >
          Đăng ký ngay
        </button>
      </p>
<div className="text-center border-t border-slate-100 pt-4">
<button onClick={() => setShowAdminModal(true)} className="text-sm text-slate-400 hover:text-blue-600 flex items-center justify-center gap-1 mx-auto transition-colors"><Settings size={14} /> Khu vực Giáo viên</button>
</div>

      {showAdminModal && (
<div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
<div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm animate-in zoom-in">
<h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2"><ShieldCheck size={20} className="text-blue-600" /> Đăng nhập Giáo viên / Admin</h3>
<p className="text-xs text-slate-500 mb-4">Admin tổng: để trống tên đăng nhập + mật khẩu master. Giáo viên: tài khoản được cấp.</p>
<label className="block text-xs font-bold text-slate-600 mb-1">Tên đăng nhập</label>
<input
  type="text"
  value={adminUser}
  onChange={(e) => { setAdminUser(e.target.value); setAdminError(''); }}
  placeholder="Để trống = admin tổng"
  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 mb-3"
  autoComplete="username"
/>
<label className="block text-xs font-bold text-slate-600 mb-1">Mật khẩu</label>
<div className="relative mb-2">
<input type={showAdminPwd ? 'text' : 'password'} value={adminPwd} onChange={(e) => { setAdminPwd(e.target.value); setAdminError(''); }} placeholder="Nhập mật khẩu..." className="w-full px-4 py-2 pr-11 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500" onKeyDown={(e) => e.key === 'Enter' && !adminBusy && handleAdminSubmit()} autoFocus autoComplete="current-password" />
<button type="button" onClick={() => setShowAdminPwd((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700" aria-label={showAdminPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
{showAdminPwd ? <EyeOff size={18} /> : <Eye size={18} />}
</button>
</div>
{adminError && <p className="text-xs text-red-500 mb-4">{adminError}</p>}
<div className="flex gap-2 mt-4">
<button onClick={() => setShowAdminModal(false)} className="flex-1 py-2 bg-slate-100 rounded-lg font-semibold" disabled={adminBusy}>Hủy</button>
<button onClick={handleAdminSubmit} disabled={adminBusy} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold disabled:opacity-60">{adminBusy ? '…' : 'Vào'}</button>
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
            ) : q.type === 'fill_blanks' ? (
              <PracticeFillBlanks
                q={q}
                value={answers[q.id]}
                disabled={false}
                onChange={(val) => setAnswers({ ...answers, [q.id]: val })}
              />
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
        } else if (t === 'fill_blanks') {
          const { blanks } = normalizeFillBlanksQuestion(q);
          const obj = sChoice && typeof sChoice === 'object' ? sChoice : {};
          const done = blanks.length > 0 && blanks.every((b) => String(obj[b.id] || '').trim().length > 0);
          const ok = fillBlanksAnswerOk(blanks, obj);
          badge = !done ? (
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
            ) : t === 'fill_blanks' ? (
              <div className="mb-4">
                <PracticeFillBlanksResult q={q} />
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
  classesList,
  scoresList,
  quizzesList,
  lessonsList,
  questionBank,
  mindMapCategories,
  reviewCoursesList,
  trialRegistrations = [],
  adminPassword,
  db,
  storage,
  user,
  defaultGrade,
  staffSession = null,
}) {
  const staff = staffSession || { role: STAFF_ROLE.SUPER_ADMIN, grade_levels: [], class_ids: [] };
  const staffIsSuper = isSuperAdmin(staff);
  const staffGrades = allowedGradesForStaff(staff); // null = all
  const [activeTab, setActiveTab] = useState('lessons');
  const [activeGrade, setActiveGrade] = useState(() => defaultGradeForStaff(staff, defaultGrade || '8'));
  const [editingBankQuestion, setEditingBankQuestion] = useState(null);
  const [bankSearch, setBankSearch] = useState('');
  const [bankFilterChapter, setBankFilterChapter] = useState('');
  const [bankFilterTopic, setBankFilterTopic] = useState('');
  const [bankFilterQType, setBankFilterQType] = useState('');
  const [bankFilterCogLevel, setBankFilterCogLevel] = useState('');
  const [showMatrixModal, setShowMatrixModal] = useState(false);
  const [matrixDraft, setMatrixDraft] = useState(null);
  // Bank import removed per request

  useEffect(() => {
    const next = defaultGradeForStaff(staff, defaultGrade || '8');
    if (next) setActiveGrade(next);
  }, [defaultGrade, staff?.role, staff?.grade_levels?.join(',')]);

  useEffect(() => {
    if (!canAccessAdminTab(staff, activeTab)) {
      setActiveTab('lessons');
    }
  }, [staff?.role, activeTab]);

  useEffect(() => {
    if (staffIsSuper) return;
    if (activeGrade === 'ALL' || !canAccessGrade(staff, activeGrade)) {
      setActiveGrade(defaultGradeForStaff(staff, '8'));
    }
  }, [staffIsSuper, staff?.grade_levels?.join(','), activeGrade]);

  const goTab = (tabId) => {
    if (!canAccessAdminTab(staff, tabId)) return;
    setActiveTab(tabId);
    if (tabId === 'lessons') setEditingLesson(null);
    if (tabId === 'quizzes') setEditingQuiz(null);
    if (tabId === 'bank') setEditingBankQuestion(null);
  };

  const [editingLesson, setEditingLesson] = useState(null);
  const [lessonAdminPane, setLessonAdminPane] = useState('sections');
  const [editingSectionIndex, setEditingSectionIndex] = useState(0);
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
    if (editingLesson) {
      setLessonAdminPane('sections');
      setEditingSectionIndex(0);
    }
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
  const [customMathTopics, setCustomMathTopics] = useState([]);
  const [customTopicModal, setCustomTopicModal] = useState(null);
  const [savingCustomTopic, setSavingCustomTopic] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);

  const filteredLessons = (activeGrade === 'ALL')
    ? lessonsList
    : lessonsList.filter(l => (l.grade_level || '8') === activeGrade);

  const quizEditorGrade = (editingQuiz?.grade_level || activeGrade || '8').toString().trim();
  const quizCatalogLessons = useMemo(
    () =>
      lessonsList.filter(
        (l) => String(l.grade_level || '8') === quizEditorGrade && !l.is_topic
      ),
    [lessonsList, quizEditorGrade]
  );
  const quizChapterOptions = useMemo(
    () => buildMergedChapterOptions(quizCatalogLessons, quizEditorGrade),
    [quizCatalogLessons, quizEditorGrade]
  );
  const quizLessonNoOptions = useMemo(
    () =>
      buildMergedLessonNoOptions(
        quizCatalogLessons,
        editingQuiz?.chapter,
        null,
        quizEditorGrade
      ),
    [quizCatalogLessons, editingQuiz?.chapter, quizEditorGrade]
  );

  const quizSectionOptions = useMemo(() => {
    const ch = String(editingQuiz?.chapter || '').trim();
    const ln = String(editingQuiz?.lesson_no || '').trim();
    if (!ch || !ln) return [];
    const group = quizCatalogLessons.filter(
      (l) => String(l.chapter || '').trim() === ch && String(l.lesson_no || '').trim() === ln
    );
    const seen = new Set();
    const opts = [];
    for (const l of group) {
      let contentObj = {};
      const raw = l?.content;
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) contentObj = raw;
      else if (typeof raw === 'string' && raw.trim()) {
        try {
          const p = JSON.parse(raw);
          if (p && typeof p === 'object') contentObj = p;
        } catch {
          contentObj = {};
        }
      }
      const secs = sortLessonSections(normalizeLessonSections(contentObj?.sections));
      secs.forEach((sec) => {
        const no = String(sec.section_no || '').trim();
        if (!no || seen.has(no)) return;
        seen.add(no);
        opts.push({ no, label: getSectionDisplayLabel(sec) });
      });
    }
    opts.sort((a, b) => {
      const na = Number(String(a.no).replace(/[^\d.-]/g, ''));
      const nb = Number(String(b.no).replace(/[^\d.-]/g, ''));
      if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
      return String(a.no).localeCompare(String(b.no), 'vi');
    });
    return opts;
  }, [quizCatalogLessons, editingQuiz?.chapter, editingQuiz?.lesson_no]);

  const filteredQuizzes = (activeGrade === 'ALL')
    ? quizzesList
    : quizzesList.filter(q => (q.grade_level || '8') === activeGrade);

  useEffect(() => {
    setBankFilterChapter('');
    setBankFilterTopic('');
    setBankFilterQType('');
    setBankFilterCogLevel('');
  }, [activeGrade]);

  const gradeFilteredBankQuestions = useMemo(() => {
    if (activeGrade === 'ALL') return questionBank || [];
    return (questionBank || []).filter((q) => (q.grade_level || '8') === activeGrade);
  }, [questionBank, activeGrade]);

  const bankChapterFilterOptions = useMemo(
    () => buildBankChapterFilterOptions(activeGrade, gradeFilteredBankQuestions),
    [activeGrade, gradeFilteredBankQuestions]
  );

  const bankTopicFilterOptions = useMemo(
    () =>
      buildBankTopicFilterOptions(gradeFilteredBankQuestions, {
        chapterFilter: bankFilterChapter,
      }),
    [gradeFilteredBankQuestions, bankFilterChapter]
  );

  const filteredBankQuestions = useMemo(
    () =>
      filterBankQuestions(questionBank || [], {
        activeGrade,
        chapter: bankFilterChapter,
        topic: bankFilterTopic,
        qType: bankFilterQType,
        cogLevel: bankFilterCogLevel,
        search: bankSearch,
      }),
    [
      questionBank,
      activeGrade,
      bankFilterChapter,
      bankFilterTopic,
      bankFilterQType,
      bankFilterCogLevel,
      bankSearch,
    ]
  );

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

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      collection(db, COLLECTION_CUSTOM_MATH_TOPICS),
      (snapshot) => {
        setCustomMathTopics(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.error('Lỗi tải dạng toán tùy chỉnh (Firestore):', err);
      }
    );
    return () => unsub();
  }, [user, db]);

  const getTopicOptionsForChapterAndGrade = useCallback(
    (grade, chapterNo) => {
      const k = resolveKnowledgeForGrade(grade);
      const ch = String(chapterNo || '').trim();
      const all = k.allTopics || [];
      let curriculum = [];
      if (!ch) curriculum = all.slice(0, 600);
      else {
        const list = k.topicsByChapter?.get?.(ch);
        curriculum = Array.isArray(list) && list.length > 0 ? list : all.slice(0, 600);
      }
      const custom = getCustomTopicsForChapter(customMathTopics, grade, ch);
      return mergeTopicOptionLists(curriculum, custom);
    },
    [resolveKnowledgeForGrade, customMathTopics]
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
      if (t === 'short_answer' || t === 'fill_blanks') return COG_LEVEL.apply;
      if (t === 'essay') return COG_LEVEL.apply_high;
      return COG_LEVEL.recognize;
    },
    []
  );

  const commitQuizQuestions = useCallback((updater) => {
    setEditingQuiz((prev) => {
      if (!prev) return prev;
      const next = typeof updater === 'function' ? updater(prev.questions || []) : updater;
      return { ...prev, questions: sortQuizQuestions(next) };
    });
  }, []);

  const handleSaveCustomMathTopic = async (label) => {
    if (!customTopicModal) return;
    const trimmed = String(label || '').trim();
    if (!trimmed) return alert('Nhập tên dạng toán.');
    const { qIdx, chapter, grade, context } = customTopicModal;
    const ch = String(chapter || '').trim();
    const gl = String(
      grade ||
        (context === 'bank' ? editingBankQuestion?.grade_level : quizCurriculumGrade) ||
        '8'
    ).trim();
    if (!ch) return alert('Chọn chương trước khi thêm dạng toán.');
    const k = resolveKnowledgeForGrade(gl);
    const chList = k.topicsByChapter?.get?.(ch);
    const curriculum =
      Array.isArray(chList) && chList.length > 0 ? chList : (k.allTopics || []).slice(0, 600);
    setSavingCustomTopic(true);
    try {
      if (!topicExistsInLists(trimmed, curriculum, customMathTopics, gl, ch)) {
        await addDoc(
          collection(db, COLLECTION_CUSTOM_MATH_TOPICS),
          buildCustomTopicPayload({ label: trimmed, gradeLevel: gl, chapterNo: ch })
        );
      }
      if (context === 'bank') {
        if (!editingBankQuestion) return;
        setEditingBankQuestion({
          ...editingBankQuestion,
          chapter: ch,
          topic_tags: [trimmed],
        });
        setCustomTopicModal(null);
        return;
      }
      if (!editingQuiz) return;
      const nq = [...(editingQuiz.questions || [])];
      if (!nq[qIdx]) return;
      if (!nq[qIdx].chapter) nq[qIdx].chapter = ch;
      nq[qIdx].topic_tags = [trimmed];
      commitQuizQuestions(nq);
      setCustomTopicModal(null);
    } catch (err) {
      console.error(err);
      alert('Không lưu được dạng toán. Thử lại sau vài giây.');
    } finally {
      setSavingCustomTopic(false);
    }
  };

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
    if (changed) commitQuizQuestions(nextQs);
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


  const handleSaveLesson = async () => {
    const chapter = (editingLesson.chapter ?? '').toString().trim();
    const lessonNo = (editingLesson.lesson_no ?? '').toString().trim();
    if (!chapter || !lessonNo) {
      return alert('Cần chọn Chương và Bài (dropdown phía trên).');
    }
    const { obj: saveContentObj } = parseLessonContentObject(editingLesson.content);
    const saveSections = normalizeLessonSections(saveContentObj?.sections, { keepEmpty: true });
    const finalTitle = deriveLessonTitleFromSections(saveSections, editingLesson.title);
    if (!finalTitle) {
      return alert('Cần nhập tên mục ở tab Mục bài — tiêu đề bài giảng lấy từ tên mục đầu tiên.');
    }
    const gradeForLesson = (editingLesson.grade_level || activeGrade || '8').toString();
    const isTopicLesson = !!editingLesson.is_topic;
    const existingSlug = String(editingLesson.slug || '').trim();
    const slug = existingSlug
      ? existingSlug
      : ensureUniqueLessonSlug(
          buildLessonSlug({
            grade_level: gradeForLesson,
            chapter: isTopicLesson && !(chapter && lessonNo) ? (editingLesson.topic_id || 'cd') : chapter,
            lesson_no: isTopicLesson && !(chapter && lessonNo) ? (Date.now().toString().slice(-4)) : lessonNo,
            title: editingLesson.title,
          }),
          editingLesson.id,
          lessonsList
        );
    const dataToSave = {
      ...editingLesson,
      title: finalTitle,
      grade_level: gradeForLesson,
      chapter,
      lesson_no: lessonNo,
      videoUrl: (editingLesson.videoUrl ?? '').toString().trim(),
      slidesUrl: (editingLesson.slidesUrl ?? '').toString().trim(),
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
      `Đã import: ${nEx} mục lý thuyết/ví dụ${nPr ? `, ${nPr} phần bài tập luyện tập` : ''}${fromMeta.pdfUrl ? ', đã nhận link PDF' : ''}${fk || nk ? ` — SEO: ${fk ? `TK chính «${fk}»` : ''}${fk && nk ? ', ' : ''}${nk ? `${nk} từ khóa phụ` : ''}` : ''}. Kiểm tra Chương/Bài/Tiêu đề rồi Lưu.`
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
    const sectionsList = jsonBroken ? [] : normalizeLessonSections(cObj?.sections, { keepEmpty: true });
    const hasSections = sectionsList.length > 0;
    const activeSectionIdx = hasSections
      ? Math.min(Math.max(0, editingSectionIndex), sectionsList.length - 1)
      : 0;
    const patchSections = (nextSections) => patchLessonContent({ sections: nextSections });
    const patchSectionAt = (idx, patch) => {
      const next = sectionsList.map((s, i) => (i === idx ? { ...s, ...patch } : s));
      patchSections(next);
      if (patch.title !== undefined && idx === 0) {
        setEditingLesson((el) => (el ? { ...el, title: String(patch.title) } : el));
      }
    };
    const editorGrade = (editingLesson.grade_level || (activeGrade !== 'ALL' ? activeGrade : '') || '11').toString();
    const catalogLessons = lessonsList.filter(
      (l) => String(l.grade_level || '8') === editorGrade && !l.is_topic
    );
    const chapterOptions = buildMergedChapterOptions(catalogLessons, editorGrade);
    const lessonNoOptions = buildMergedLessonNoOptions(
      catalogLessons,
      editingLesson.chapter,
      editingLesson.id,
      editorGrade
    );
    const derivedTitle = deriveLessonTitleFromSections(sectionsList, editingLesson.title);
    const handleAddChapter = () => {
      const v = window.prompt('Nhập số / tên chương mới:', editingLesson.chapter || '');
      if (v == null || !String(v).trim()) return;
      setEditingLesson({ ...editingLesson, chapter: String(v).trim(), lesson_no: '' });
    };
    const handleAddLessonNo = () => {
      if (!(editingLesson.chapter || '').toString().trim()) {
        alert('Hãy chọn chương trước.');
        return;
      }
      const v = window.prompt('Số bài mới (vd. 1, 2, 3):', editingLesson.lesson_no || '');
      if (v == null || !String(v).trim()) return;
      setEditingLesson({ ...editingLesson, lesson_no: String(v).trim() });
    };
    const patchTheoryCore = (val) => {
      if (hasSections) patchSectionAt(activeSectionIdx, { theory_core: val });
      else patchLessonContent({ theory_core: val });
    };
    const patchExamplesCore = (val) => {
      if (hasSections) patchSectionAt(activeSectionIdx, { examples_core: val });
      else patchLessonContent({ examples_core: val });
    };
    const patchPracticeList = (next) => {
      if (hasSections) patchSectionAt(activeSectionIdx, { practice: next });
      else patchLessonContent({ practice: next });
    };
    const sectionEditorBanner =
      hasSections && lessonAdminPane !== 'sections' ? (
        <div className="shrink-0 flex flex-wrap items-center gap-2 text-xs font-semibold text-indigo-900 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-2">
          <span>Đang soạn mục:</span>
          <select
            value={activeSectionIdx}
            disabled={jsonBroken}
            onChange={(e) => setEditingSectionIndex(Number(e.target.value))}
            className="p-1.5 border rounded text-sm font-bold min-w-[14rem] disabled:opacity-50"
          >
            {sectionsList.map((s, i) => (
              <option key={s.id || i} value={i}>
                {getSectionDisplayLabel(s) || `Mục ${i + 1}`}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => setLessonAdminPane('sections')} className="text-indigo-700 hover:underline font-bold">
            Quản lý mục bài
          </button>
        </div>
      ) : null;
    const noSectionsContentBanner =
      !hasSections && !['sections', 'raw', 'materials'].includes(lessonAdminPane) ? (
        <div className="shrink-0 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900 leading-relaxed">
          <strong>Một khối duy nhất.</strong> Lý thuyết / ví dụ / bài tập dưới đây dùng chung cho cả bài. Muốn chia thành nhiều phần học (vd.{' '}
          <em>1. Hàm số…</em>, <em>2. Đồ thị…</em>), mở tab{' '}
          <button type="button" onClick={() => setLessonAdminPane('sections')} className="font-bold text-indigo-700 underline">
            Mục bài
          </button>{' '}
          → <strong>Thêm mục con</strong>.
        </div>
      ) : null;
    const theoryCoreVal = jsonBroken
      ? ''
      : hasSections
        ? (sectionsList[activeSectionIdx]?.theory_core ?? '').toString()
        : (cObj?.theory_core ?? '').toString();
    const examplesCoreVal = jsonBroken
      ? ''
      : hasSections
        ? (sectionsList[activeSectionIdx]?.examples_core ?? '').toString()
        : (cObj?.examples_core ?? '').toString();
    const practiceList = jsonBroken
      ? []
      : hasSections
        ? (sectionsList[activeSectionIdx]?.practice ?? [])
        : (cObj?.practice ?? []);
    const examples = jsonBroken ? [] : (cObj?.examples ?? []);
    const practiceDisplayMode = jsonBroken
      ? 'list'
      : (cObj?.practice_display_mode ?? cObj?.practiceDisplayMode ?? 'list');
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
      patchTheoryCore(prev);
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
      patchExamplesCore(prev);
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
            <select
              value={editorGrade}
              onChange={(e) =>
                setEditingLesson({
                  ...editingLesson,
                  grade_level: e.target.value,
                  chapter: '',
                  lesson_no: '',
                })
              }
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
            <div className="flex gap-1.5 min-w-0">
              <select
                value={(editingLesson.chapter || '').toString()}
                onChange={(e) =>
                  setEditingLesson({
                    ...editingLesson,
                    chapter: e.target.value,
                    lesson_no: '',
                  })
                }
                className="flex-1 min-w-0 p-2 text-sm border rounded-md focus:ring-2 focus:ring-indigo-500 font-semibold bg-white"
              >
                <option value="">— Chọn chương —</option>
                {chapterOptions.map(({ no, label }) => (
                  <option key={no} value={no}>
                    {label}
                  </option>
                ))}
                {(editingLesson.chapter || '').toString().trim() &&
                !chapterOptions.some((o) => o.no === (editingLesson.chapter || '').toString().trim()) ? (
                  <option value={(editingLesson.chapter || '').toString().trim()}>
                    Chương {editingLesson.chapter}
                  </option>
                ) : null}
              </select>
              <button
                type="button"
                onClick={handleAddChapter}
                className="shrink-0 px-2 py-2 text-[11px] font-bold rounded-md border border-indigo-200 text-indigo-700 hover:bg-indigo-50 whitespace-nowrap"
                title="Thêm chương mới"
              >
                + Chương
              </button>
            </div>
            <div className="flex gap-1.5 min-w-0 sm:col-span-2 lg:col-span-2">
              <select
                value={(editingLesson.lesson_no || '').toString()}
                disabled={!(editingLesson.chapter || '').toString().trim()}
                onChange={(e) => {
                  const lessonNo = e.target.value;
                  const sgkTitle = findSgkLessonTitle(editorGrade, editingLesson.chapter, lessonNo);
                  if (sgkTitle) {
                    if (hasSections && sectionsList.length > 0) {
                      const first = sectionsList[0];
                      if (!String(first?.title ?? '').trim()) {
                        patchSectionAt(0, { title: sgkTitle });
                      }
                    } else if (!jsonBroken) {
                      const nextSec = emptyLessonSectionTemplate(0);
                      nextSec.title = sgkTitle;
                      if (cObj) {
                        nextSec.theory_core = (cObj.theory_core ?? '').toString();
                        nextSec.examples_core = (cObj.examples_core ?? '').toString();
                        nextSec.practice = Array.isArray(cObj.practice) ? cObj.practice : [];
                      }
                      patchSections([nextSec]);
                      setEditingSectionIndex(0);
                    }
                  }
                  setEditingLesson({ ...editingLesson, lesson_no: lessonNo });
                }}
                className="flex-1 min-w-0 p-2 text-sm border rounded-md focus:ring-2 focus:ring-indigo-500 font-semibold bg-white disabled:opacity-50"
              >
                <option value="">— Chọn bài —</option>
                {lessonNoOptions.map(({ no, label }) => (
                  <option key={no} value={no}>
                    {label}
                  </option>
                ))}
                {(editingLesson.lesson_no || '').toString().trim() &&
                !lessonNoOptions.some((o) => o.no === (editingLesson.lesson_no || '').toString().trim()) ? (
                  <option value={(editingLesson.lesson_no || '').toString().trim()}>
                    Bài {editingLesson.lesson_no}
                  </option>
                ) : null}
              </select>
              <button
                type="button"
                onClick={handleAddLessonNo}
                disabled={!(editingLesson.chapter || '').toString().trim()}
                className="shrink-0 px-2 py-2 text-[11px] font-bold rounded-md border border-teal-200 text-teal-800 hover:bg-teal-50 disabled:opacity-40 whitespace-nowrap"
                title="Thêm số bài mới trong chương"
              >
                + Bài
              </button>
            </div>
          </div>
          <div className="shrink-0 rounded-lg border border-sky-100 bg-sky-50/70 px-3 py-2 text-xs text-sky-900 space-y-1">
            <p>
              <span className="font-bold">Tiêu đề bài giảng</span> = tên <strong>mục đầu tiên</strong> (tab Mục bài) — không gõ riêng.
            </p>
            <p>
              <span className="font-bold">Học sinh thấy:</span>{' '}
              <span className="font-black text-indigo-800">
                {getLessonDisplayLabel({
                  lesson_no: editingLesson.lesson_no,
                  title: derivedTitle || '…',
                })}
              </span>
              {hasSections ? (
                <span className="text-sky-700"> · {sectionsList.length} mục con</span>
              ) : (
                <span className="text-amber-700"> · chưa có mục — thêm ở tab Mục bài</span>
              )}
            </p>
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
              value={editingLesson.slidesUrl || ''}
              onChange={(e) => setEditingLesson({ ...editingLesson, slidesUrl: e.target.value })}
              placeholder="Google Slides / PPT Drive (docs.google.com/presentation/... hoặc drive.google.com/file/...)"
              className="w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="url"
              value={editingLesson.pdfUrl || ''}
              onChange={(e) => setEditingLesson({ ...editingLesson, pdfUrl: e.target.value })}
              placeholder="Link PDF"
              className="w-full p-2 text-sm border rounded-md focus:ring-2 focus:ring-indigo-500 md:col-span-2"
            />
          </div>
          <p className="shrink-0 text-[11px] leading-snug text-slate-500 -mt-0.5">
            YouTube + Google Slides/PPT có thể dùng cùng lúc (học sinh chọn tab Video / Slide). Slides: Chia sẻ → bất kỳ ai có link; PPT: tải lên Drive rồi dán link file.
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

          {jsonBroken ? (
            <div className="shrink-0 rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-xs p-2 font-semibold">
              JSON lỗi: {lessonContentParse.error}. Sửa tab <strong>JSON nâng cao</strong>.
            </div>
          ) : null}

          <div className="bg-slate-50 p-2 border border-slate-200 rounded-lg flex-1 min-h-[min(90vh,1920px)] flex flex-col gap-2 min-w-0">
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
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <a
                    href="/mau-import-bai-giang.txt"
                    download
                    className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline decoration-indigo-300"
                    title="Tải mẫu import bài giảng (.txt)"
                  >
                    mau-import-bai-giang.txt
                  </a>
                  <a
                    href="/mau-import-bai-giang.docx"
                    download
                    className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline decoration-indigo-300"
                    title="Tải mẫu import bài giảng (Word .docx)"
                  >
                    mau-import-bai-giang.docx
                  </a>
                </div>
              </div>
            </div>
            <div className="shrink-0 flex flex-wrap gap-1 border-b border-slate-200 pb-1.5">
              {[
                { id: 'sections', label: 'Mục bài', Icon: BookText },
                { id: 'theory', label: 'Lý thuyết', Icon: BookOpen },
                { id: 'examples_core', label: 'Các dạng toán & ví dụ', Icon: FileEdit },
                { id: 'practice', label: 'Bài tập luyện tập', Icon: ListOrdered },
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

            <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-y-auto">
            {lessonAdminPane === 'sections' && (
              <div className="space-y-3 animate-in fade-in flex-1 min-h-0 overflow-y-auto pr-0.5">
                <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside leading-relaxed bg-white rounded-lg border border-slate-200 px-3 py-2.5">
                  <li>
                    Chọn <strong>Chương</strong> và <strong>Bài</strong> ở dropdown phía trên (+ thêm mới nếu chưa có)
                  </li>
                  <li>
                    Thêm <strong>mục con</strong> — tên mục đầu tiên = tiêu đề bài{' '}
                    <strong>{derivedTitle ? `"${derivedTitle}"` : '(chưa có)'}</strong>
                  </li>
                  <li>Bấm <strong>Soạn nội dung →</strong> từng mục (Lý thuyết, Ví dụ, Bài tập)</li>
                </ol>
                <button
                  type="button"
                  disabled={jsonBroken}
                  onClick={() => {
                    const isFirst = sectionsList.length === 0;
                    const nextSec = emptyLessonSectionTemplate(sectionsList.length);
                    if (isFirst && !jsonBroken && cObj) {
                      nextSec.theory_core = (cObj.theory_core ?? '').toString();
                      nextSec.examples_core = (cObj.examples_core ?? '').toString();
                      nextSec.practice = Array.isArray(cObj.practice) ? cObj.practice : [];
                    }
                    patchSections([...sectionsList, nextSec]);
                    setEditingSectionIndex(sectionsList.length);
                    if (sectionsList.length === 0 && nextSec.title) {
                      setEditingLesson((el) => (el ? { ...el, title: nextSec.title } : el));
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Plus size={14} /> Thêm mục con
                </button>
                {sectionsList.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-4 py-8 text-center">
                    <p className="text-sm text-slate-600 font-semibold">Chưa có mục con</p>
                    <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
                      Bài sẽ hiển thị một khối. Thêm mục để chia nhỏ — nội dung đang có sẽ được copy vào mục đầu tiên.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sectionsList.map((sec, idx) => (
                      <div key={sec.id || idx} className="rounded-xl border border-indigo-100 bg-white p-3 space-y-2 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <p className="text-sm font-black text-indigo-800">
                            {getSectionDisplayLabel(sec) || `Mục ${idx + 1}`}
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-[5rem_1fr] gap-2">
                          <label className="text-xs font-bold text-slate-600">
                            STT
                            <input
                              disabled={jsonBroken}
                              value={sec.section_no}
                              onChange={(e) => patchSectionAt(idx, { section_no: e.target.value })}
                              className="mt-1 block w-full p-2 border rounded text-sm font-bold text-center"
                              placeholder="1"
                            />
                          </label>
                          <label className="text-xs font-bold text-slate-600">
                            Tên mục (hiện sidebar)
                            {idx === 0 ? (
                              <span className="ml-1 font-normal text-indigo-600">— mục 1 = tiêu đề bài giảng</span>
                            ) : null}
                            <input
                              disabled={jsonBroken}
                              value={sec.title}
                              onChange={(e) => patchSectionAt(idx, { title: e.target.value })}
                              className="mt-1 block w-full p-2 border rounded text-sm"
                              placeholder="Hàm số y=ax²"
                            />
                          </label>
                        </div>
                        <label className="block text-xs font-bold text-slate-600">
                          Video riêng (tuỳ chọn)
                          <input
                            disabled={jsonBroken}
                            value={sec.videoUrl || ''}
                            onChange={(e) => patchSectionAt(idx, { videoUrl: e.target.value })}
                            className="mt-1 block w-full p-2 border rounded text-xs"
                            placeholder="Để trống → dùng video chung của bài"
                          />
                        </label>
                        <label className="block text-xs font-bold text-slate-600">
                          Slide / PPT riêng (tuỳ chọn)
                          <input
                            disabled={jsonBroken}
                            value={sec.slidesUrl || ''}
                            onChange={(e) => patchSectionAt(idx, { slidesUrl: e.target.value })}
                            className="mt-1 block w-full p-2 border rounded text-xs"
                            placeholder="Google Slides hoặc file PPT trên Drive — trống → dùng slide chung của bài"
                          />
                        </label>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="button"
                            disabled={jsonBroken}
                            onClick={() => {
                              setEditingSectionIndex(idx);
                              setLessonAdminPane('theory');
                            }}
                            className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
                          >
                            Soạn nội dung →
                          </button>
                          <button
                            type="button"
                            disabled={jsonBroken || sectionsList.length <= 1}
                            onClick={() => {
                              const next = sectionsList.filter((_, j) => j !== idx);
                              patchSections(next);
                              setEditingSectionIndex(Math.max(0, idx - 1));
                            }}
                            className="px-3 py-2 rounded-lg bg-white border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-50 disabled:opacity-40"
                          >
                            <Trash2 size={12} className="inline mr-1" /> Xóa
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {lessonAdminPane === 'theory' && (
              <div className="animate-in fade-in flex flex-col gap-2 pb-4">
                {sectionEditorBanner}
                {noSectionsContentBanner}
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
                    patchTheoryCore(next);
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
                    patchTheoryCore(next);
                    recordTheorySnapshot(next);
                  }}
                  placeholder="Công thức, định nghĩa, lưu ý trọng tâm…"
                  className="w-full min-h-[1860px] h-[1860px] p-3 border border-slate-300 rounded-lg text-sm font-sans disabled:opacity-50 resize-y"
                />
              </div>
            )}

            {lessonAdminPane === 'examples_core' && (
              <div className="animate-in fade-in flex flex-col gap-2 pb-4">
                {sectionEditorBanner}
                {noSectionsContentBanner}
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
                        patchExamplesCore(text);
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
                    patchExamplesCore(next);
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
                    patchExamplesCore(next);
                    recordExamplesSnapshot(next);
                  }}
                  placeholder="Dạng 1..., {Ví dụ: ...}, {Lời giải: ...}..."
                  className="w-full min-h-[1860px] h-[1860px] p-3 border border-slate-300 rounded-lg text-sm font-sans disabled:opacity-50 resize-y"
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
                {sectionEditorBanner}
                {noSectionsContentBanner}
                <p className="text-xs text-slate-600">
                  Mảng <code className="bg-slate-200/80 px-1 rounded">practice</code> — tab “Bài tập luyện tập” của học sinh.
                </p>
                <label className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">
                  <span>Cách hiển thị cho học sinh:</span>
                  <select
                    disabled={jsonBroken}
                    value={practiceDisplayMode === 'step' ? 'step' : 'list'}
                    onChange={(e) => patchLessonContent({ practice_display_mode: e.target.value })}
                    className="p-2 border rounded text-sm font-bold disabled:opacity-50 min-w-[14rem]"
                  >
                    <option value="list">Danh sách — tất cả câu cùng lúc</option>
                    <option value="step">Từng câu — làm xong mới qua câu tiếp</option>
                  </select>
                </label>
                <button
                  type="button"
                  disabled={jsonBroken}
                  onClick={() =>
                    patchPracticeList([...practiceList, emptyPracticeTemplate(practiceList.length)])
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
                                  ...emptyPracticeTemplate(j, t),
                                  id: x.id || `pr_${Date.now()}_${j}`,
                                  question: x.question ?? x.content ?? '',
                                  hint: x.hint ?? '',
                                  hintVideoUrl: x.hintVideoUrl ?? '',
                                  explanation: x.explanation ?? '',
                                }
                              : x
                          );
                          patchPracticeList(next);
                        }}
                        className="p-2 border rounded text-sm font-bold disabled:opacity-50"
                      >
                        <option value="mcq">Trắc nghiệm (mcq)</option>
                        <option value="input">Nhập đáp án (input)</option>
                        <option value="true_false">Đúng / Sai</option>
                        <option value="ordering">Sắp xếp</option>
                        <option value="drag_drop">Kéo thả</option>
                        <option value="fill_blanks">Điền chỗ trống</option>
                        <option value="text">Tự luận (text)</option>
                      </select>
                      <button
                        type="button"
                        disabled={jsonBroken}
                        onClick={() => patchPracticeList(practiceList.filter((_, j) => j !== idx))}
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
                        patchPracticeList(next);
                      }}
                      placeholder={
                        (p.type || 'text') === 'fill_blanks'
                          ? 'Câu dẫn (tuỳ chọn) — ví dụ: Điền các chỗ trống trong đoạn văn sau'
                          : 'Đề bài / nội dung câu'
                      }
                      className="w-full p-2 border rounded text-sm min-h-[192px] disabled:opacity-50 resize-y"
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
                                patchPracticeList(next);
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
                              patchPracticeList(next);
                            }}
                            className="w-24 p-2 border rounded font-mono disabled:opacity-50"
                          />
                        </label>
                      </div>
                    ) : null}
                    {(p.type || 'text') === 'input' ? (
                      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                            Ô đáp án (có thể nhiều ô — vd. x và y)
                          </p>
                          <button
                            type="button"
                            disabled={jsonBroken}
                            onClick={() => {
                              const parts = Array.isArray(p.answerParts) && p.answerParts.length
                                ? [...p.answerParts]
                                : [{ id: '1', placeholder: '', correctAnswer: (p.correctAnswer ?? '').toString() }];
                              const n = parts.length + 1;
                              parts.push({
                                id: String(n),
                                placeholder: n === 2 ? 'y = …' : `Ô ${n}`,
                                correctAnswer: '',
                              });
                              const next = practiceList.map((x, j) =>
                                j === idx
                                  ? {
                                      ...x,
                                      answerParts: parts,
                                      correctAnswer: parts.map((pt) => pt.correctAnswer).filter(Boolean).join('; '),
                                    }
                                  : x
                              );
                              patchPracticeList(next);
                            }}
                            className="text-xs font-bold text-indigo-600 hover:underline disabled:opacity-40"
                          >
                            + Thêm ô
                          </button>
                        </div>
                        {(Array.isArray(p.answerParts) && p.answerParts.length
                          ? p.answerParts
                          : [{ id: '1', placeholder: (p.answerPlaceholder ?? '').toString(), correctAnswer: (p.correctAnswer ?? '').toString() }]
                        ).map((part, pi) => (
                          <div key={part.id || pi} className="flex flex-wrap items-center gap-2">
                            <input
                              disabled={jsonBroken}
                              value={(part.placeholder ?? '').toString()}
                              onChange={(e) => {
                                const parts = (Array.isArray(p.answerParts) && p.answerParts.length
                                  ? p.answerParts
                                  : [{ id: '1', placeholder: (p.answerPlaceholder ?? '').toString(), correctAnswer: (p.correctAnswer ?? '').toString() }]
                                ).map((pt, i) => (i === pi ? { ...pt, placeholder: e.target.value } : pt));
                                const next = practiceList.map((x, j) =>
                                  j === idx
                                    ? {
                                        ...x,
                                        answerParts: parts,
                                        answerPlaceholder: parts.length === 1 ? e.target.value : x.answerPlaceholder,
                                      }
                                    : x
                                );
                                patchPracticeList(next);
                              }}
                              placeholder={pi === 0 ? 'Placeholder: x = …' : pi === 1 ? 'Placeholder: y = …' : `Placeholder ô ${pi + 1}`}
                              className="w-28 sm:w-36 p-2 border rounded text-sm disabled:opacity-50 bg-white"
                            />
                            <input
                              disabled={jsonBroken}
                              value={(part.correctAnswer ?? '').toString()}
                              onChange={(e) => {
                                const parts = (Array.isArray(p.answerParts) && p.answerParts.length
                                  ? p.answerParts
                                  : [{ id: '1', placeholder: (p.answerPlaceholder ?? '').toString(), correctAnswer: (p.correctAnswer ?? '').toString() }]
                                ).map((pt, i) => (i === pi ? { ...pt, id: String(pt.id || i + 1), correctAnswer: e.target.value } : pt));
                                const next = practiceList.map((x, j) =>
                                  j === idx
                                    ? {
                                        ...x,
                                        answerParts: parts,
                                        correctAnswer: parts.map((pt) => pt.correctAnswer).filter(Boolean).join('; '),
                                      }
                                    : x
                                );
                                patchPracticeList(next);
                              }}
                              placeholder="Đáp án đúng (| hoặc ; cho biến thể)"
                              className="flex-1 min-w-[8rem] p-2 border rounded text-sm disabled:opacity-50 bg-white font-mono"
                            />
                            {(Array.isArray(p.answerParts) ? p.answerParts.length : 1) > 1 ? (
                              <button
                                type="button"
                                disabled={jsonBroken}
                                onClick={() => {
                                  const parts = (p.answerParts || []).filter((_, i) => i !== pi);
                                  const next = practiceList.map((x, j) =>
                                    j === idx
                                      ? {
                                          ...x,
                                          answerParts: parts,
                                          correctAnswer: parts.map((pt) => pt.correctAnswer).filter(Boolean).join('; '),
                                        }
                                      : x
                                  );
                                  patchPracticeList(next);
                                }}
                                className="text-xs font-bold text-red-500 hover:underline disabled:opacity-40 px-1"
                              >
                                Xóa
                              </button>
                            ) : null}
                          </div>
                        ))}
                        <p className="text-[11px] text-slate-500 leading-snug">
                          Placeholder hiện chìm trong ô nhập của học sinh. Hệ PT: thêm 2 ô — placeholder <code className="bg-white px-1 rounded">x = …</code> và <code className="bg-white px-1 rounded">y = …</code>.
                        </p>
                      </div>
                    ) : null}
                    {(p.type || 'text') === 'true_false' ? (
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                        <span>Đáp án đúng:</span>
                        <select
                          disabled={jsonBroken}
                          value={p.correctAnswer === false ? 'false' : 'true'}
                          onChange={(e) => {
                            const next = practiceList.map((x, j) =>
                              j === idx ? { ...x, correctAnswer: e.target.value === 'true' } : x
                            );
                            patchPracticeList(next);
                          }}
                          className="p-2 border rounded disabled:opacity-50"
                        >
                          <option value="true">Đúng</option>
                          <option value="false">Sai</option>
                        </select>
                      </label>
                    ) : null}
                    {(p.type || 'text') === 'ordering' ? (
                      <div className="space-y-2">
                        <textarea
                          disabled={jsonBroken}
                          value={(Array.isArray(p.items) ? p.items : []).join('\n')}
                          onChange={(e) => {
                            const items = e.target.value.split('\n').map((l) => l.trim()).filter(Boolean);
                            const next = practiceList.map((x, j) =>
                              j === idx
                                ? {
                                    ...x,
                                    items,
                                    correctOrder: items.map((_, i) => i),
                                  }
                                : x
                            );
                            patchPracticeList(next);
                          }}
                          placeholder="Mỗi dòng một mục cần sắp xếp"
                          className="w-full p-2 border rounded text-sm min-h-[216px] disabled:opacity-50 resize-y"
                        />
                        <input
                          disabled={jsonBroken}
                          value={
                            Array.isArray(p.correctOrder)
                              ? p.correctOrder.map((n) => Number(n) + 1).join(',')
                              : ''
                          }
                          onChange={(e) => {
                            const items = Array.isArray(p.items) ? p.items : [];
                            const nums = e.target.value
                              .split(/[,;|]/g)
                              .map((x) => Number(x.trim()) - 1)
                              .filter((n) => Number.isFinite(n));
                            const next = practiceList.map((x, j) =>
                              j === idx
                                ? {
                                    ...x,
                                    correctOrder:
                                      nums.length === items.length
                                        ? nums
                                        : items.map((_, i) => i),
                                  }
                                : x
                            );
                            patchPracticeList(next);
                          }}
                          placeholder="Thứ tự đúng (số thứ tự mục, ví dụ: 1,2,3)"
                          className="w-full p-2 border rounded text-sm disabled:opacity-50"
                        />
                      </div>
                    ) : null}
                    {(p.type || 'text') === 'drag_drop' ? (
                      <div className="space-y-2">
                        <textarea
                          disabled={jsonBroken}
                          value={(Array.isArray(p.slots) ? p.slots : [])
                            .map((s) => (typeof s === 'object' ? `${s.id}:${s.label}` : String(s)))
                            .join('\n')}
                          onChange={(e) => {
                            const slots = e.target.value
                              .split('\n')
                              .map((l) => l.trim())
                              .filter(Boolean)
                              .map((l, si) => {
                                const m = l.match(/^([^:]+):\s*(.+)$/);
                                if (m) return { id: m[1].trim(), label: m[2].trim() };
                                return { id: `slot${si + 1}`, label: l };
                              });
                            const next = practiceList.map((x, j) => (j === idx ? { ...x, slots } : x));
                            patchPracticeList(next);
                          }}
                          placeholder="Ô kéo thả — mỗi dòng: slot1: Nhãn ô"
                          className="w-full p-2 border rounded text-sm min-h-[168px] disabled:opacity-50 resize-y"
                        />
                        <textarea
                          disabled={jsonBroken}
                          value={(Array.isArray(p.choices) ? p.choices : []).join('\n')}
                          onChange={(e) => {
                            const choices = e.target.value.split('\n').map((l) => l.trim()).filter(Boolean);
                            const next = practiceList.map((x, j) => (j === idx ? { ...x, choices } : x));
                            patchPracticeList(next);
                          }}
                          placeholder="Lựa chọn kéo — mỗi dòng một đáp án"
                          className="w-full p-2 border rounded text-sm min-h-[168px] disabled:opacity-50 resize-y"
                        />
                        <textarea
                          disabled={jsonBroken}
                          value={
                            p.correctAnswer && typeof p.correctAnswer === 'object'
                              ? Object.entries(p.correctAnswer)
                                  .map(([k, v]) => `${k}=${v}`)
                                  .join('\n')
                              : ''
                          }
                          onChange={(e) => {
                            const correctAnswer = {};
                            e.target.value
                              .split('\n')
                              .map((l) => l.trim())
                              .filter(Boolean)
                              .forEach((l) => {
                                const m = l.match(/^([^=]+)=\s*(.+)$/);
                                if (m) correctAnswer[m[1].trim()] = m[2].trim();
                              });
                            const next = practiceList.map((x, j) =>
                              j === idx ? { ...x, correctAnswer } : x
                            );
                            patchPracticeList(next);
                          }}
                          placeholder="Ghép đúng — mỗi dòng: slot1=Đáp án A"
                          className="w-full p-2 border rounded text-sm min-h-[168px] disabled:opacity-50 resize-y"
                        />
                      </div>
                    ) : null}
                    {(p.type || 'text') === 'fill_blanks' ? (
                      <div className="space-y-2">
                        <textarea
                          disabled={jsonBroken}
                          value={(p.passage ?? '').toString()}
                          onChange={(e) => {
                            const next = practiceList.map((x, j) =>
                              j === idx ? { ...x, passage: e.target.value } : x
                            );
                            patchPracticeList(next);
                          }}
                          placeholder="Đoạn văn — dùng {{1}}, {{2}}… để đánh dấu chỗ trống. Ví dụ: Hàm số $y=x^2$ có đỉnh {{1}}."
                          className="w-full p-2 border rounded text-sm min-h-[264px] disabled:opacity-50 font-mono text-[13px] resize-y"
                        />
                        <textarea
                          disabled={jsonBroken}
                          value={(Array.isArray(p.blanks) ? p.blanks : [])
                            .map((b) =>
                              typeof b === 'object'
                                ? `${b.id}=${b.correctAnswer ?? b.answer ?? ''}`
                                : String(b ?? '')
                            )
                            .join('\n')}
                          onChange={(e) => {
                            const blanks = e.target.value
                              .split('\n')
                              .map((l) => l.trim())
                              .filter(Boolean)
                              .map((l) => {
                                const m = l.match(/^(\d+)\s*=\s*(.+)$/);
                                if (m) return { id: m[1], correctAnswer: m[2].trim() };
                                const m2 = l.match(/^([^=]+)=\s*(.+)$/);
                                if (m2) return { id: m2[1].trim(), correctAnswer: m2[2].trim() };
                                return null;
                              })
                              .filter(Boolean);
                            const next = practiceList.map((x, j) => (j === idx ? { ...x, blanks } : x));
                            patchPracticeList(next);
                          }}
                          placeholder="Đáp án từng chỗ trống — mỗi dòng: 1=(0; 0) hoặc 2=x=0"
                          className="w-full p-2 border rounded text-sm min-h-[216px] disabled:opacity-50 resize-y"
                        />
                      </div>
                    ) : null}
                    <textarea
                      data-admin-snippet={`lesson-practice-hint:${idx}`}
                      disabled={jsonBroken}
                      value={(p.hint ?? '').toString()}
                      onChange={(e) => {
                        const next = practiceList.map((x, j) =>
                          j === idx ? { ...x, hint: e.target.value } : x
                        );
                        patchPracticeList(next);
                      }}
                      placeholder="Gợi ý hướng dẫn (tùy chọn — học sinh bấm xem trước khi nộp bài)"
                      className="w-full p-2 border rounded text-xs min-h-[168px] disabled:opacity-50 border-amber-200/80 bg-amber-50/30 resize-y"
                    />
                    <input
                      data-admin-snippet={`lesson-practice-hint-video:${idx}`}
                      disabled={jsonBroken}
                      type="url"
                      value={(p.hintVideoUrl ?? '').toString()}
                      onChange={(e) => {
                        const next = practiceList.map((x, j) =>
                          j === idx ? { ...x, hintVideoUrl: e.target.value } : x
                        );
                        patchPracticeList(next);
                      }}
                      placeholder="Link video YouTube hướng dẫn (tùy chọn) — youtube.com/watch?v=... hoặc youtu.be/..."
                      className="w-full p-2 border rounded text-xs disabled:opacity-50 border-amber-200/80 bg-amber-50/30"
                    />
                    <textarea
                      data-admin-snippet={`lesson-practice-ex:${idx}`}
                      disabled={jsonBroken}
                      value={(p.explanation ?? '').toString()}
                      onChange={(e) => {
                        const next = practiceList.map((x, j) =>
                          j === idx ? { ...x, explanation: e.target.value } : x
                        );
                        patchPracticeList(next);
                      }}
                      placeholder="Lời giải chi tiết (hiện sau khi học sinh nộp bài)"
                      className="w-full p-2 border rounded text-xs min-h-[168px] disabled:opacity-50 resize-y"
                    />
                  </div>
                ))}
                {practiceList.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">Chưa có bài tập luyện tập — thêm câu hoặc import.</p>
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
                  className="w-full flex-1 min-h-[1440px] text-xs font-mono p-3 border border-slate-300 rounded-lg bg-white resize-y disabled:opacity-50"
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
                  className="w-full flex-1 min-h-[1680px] h-[1680px] text-xs font-mono p-2 border border-slate-300 rounded-lg bg-white resize-y"
                />
              </div>
            )}
            </div>
          </div>

          <LessonSeoAdminPanel lesson={editingLesson} theoryCore={theoryCoreVal} lessonsList={lessonsList} />

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
                previewSectionIndex={hasSections ? activeSectionIdx : undefined}
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
    const examType = (editingQuiz.exam_type || EXAM_TYPE.lesson).toString().trim();
    const gradeForQuiz = (editingQuiz.grade_level || activeGrade || '8').toString().trim();
    if (examType === EXAM_TYPE.entrance_10 && gradeForQuiz !== '9') {
      return alert('Đề thi thử tuyển sinh 10 chỉ dành cho khối 9.');
    }
    if (examType === EXAM_TYPE.entrance_univ && gradeForQuiz !== '12') {
      return alert('Đề thi thử đại học chỉ dành cho khối 12.');
    }
    const chapter = (editingQuiz.chapter ?? '').toString().trim();
    const lessonNo = (editingQuiz.lesson_no ?? '').toString().trim();
    const sectionNo = (editingQuiz.section_no ?? '').toString().trim();
    if (examType === 'lesson' && (!chapter || !lessonNo)) {
      return alert('Đề theo bài cần chọn đầy đủ: Chương và Bài.');
    }
    const pp = normalizePartPoints(editingQuiz);
    const stars = Math.min(5, Math.max(1, Math.round(Number(editingQuiz.difficulty_stars)) || 3));
    const now = Date.now();
    const dataToSave = {
      ...editingQuiz,
      level: 'test',
      grade_level: gradeForQuiz,
      exam_type: normalizeExamType(examType, gradeForQuiz),
      points_mc: pp.points_mc,
      points_tf: pp.points_tf,
      points_short: pp.points_short,
      points_essay: pp.points_essay,
      difficulty_stars: stars,
      questions: sortQuizQuestions(editingQuiz.questions || []),
      updated_at: now,
      ...(editingQuiz.isNew ? { created_at: now } : {}),
    };
    // Firestore updateDoc không nhận field = undefined. Với đề không "theo bài", Chương/Bài là tuỳ chọn.
    if (examType === 'lesson') {
      dataToSave.chapter = chapter;
      dataToSave.lesson_no = lessonNo;
      if (sectionNo) dataToSave.section_no = sectionNo;
      else delete dataToSave.section_no;
    } else {
      if (chapter) dataToSave.chapter = chapter;
      else delete dataToSave.chapter;
      if (lessonNo) dataToSave.lesson_no = lessonNo;
      else delete dataToSave.lesson_no;
      delete dataToSave.section_no;
    }
    delete dataToSave.topic_id;
    delete dataToSave.topic_name;
    delete dataToSave.topic_lesson_id;
    delete dataToSave.topic_lesson_title;
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
    const isGiftedExam = normalizeExamType(editingQuiz.exam_type, gl) === EXAM_TYPE.gifted;
    const baseMeta = {
      grade_level: gl,
      chapter: (editingQuiz.chapter ?? '').toString().trim(),
      lesson_no: (editingQuiz.lesson_no ?? '').toString().trim(),
      category: (editingQuiz.category ?? '').toString().trim(),
      ...(isGiftedExam
        ? { bank_section: BANK_SECTION_GIFTED, source_exam_type: EXAM_TYPE.gifted }
        : {}),
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
      ...normalizeImportedQuizQuestion(q, editingQuiz),
      id: `q_${t0}_${i}_${Math.random().toString(36).slice(2, 8)}`,
    }));
    const ALLOW_EXAM = new Set([
      ...Object.values(EXAM_TYPE),
      'mock',
      'entrance',
    ]);
    const etRaw = (meta?.exam_type || meta?.type || editingQuiz.exam_type || EXAM_TYPE.lesson).toString().trim().toLowerCase();
    const parsedType = ALLOW_EXAM.has(etRaw) ? etRaw : (editingQuiz.exam_type || EXAM_TYPE.lesson);
    const importGrade = (meta?.grade_level || editingQuiz.grade_level || activeGrade || '8').toString().trim();
    const examType = normalizeExamType(parsedType, importGrade);

    const existing = Array.isArray(editingQuiz.questions) ? editingQuiz.questions : [];
    const merged = sortQuizQuestions([...existing, ...withIds]);

    setEditingQuiz({
      ...editingQuiz,
      title: (meta?.title || '').toString().trim() || editingQuiz.title,
      duration: meta?.duration ? Number(meta.duration) : editingQuiz.duration,
      level: 'test',
      category: meta?.category || editingQuiz.category,
      grade_level: meta?.grade_level || editingQuiz.grade_level,
      chapter: meta?.chapter || editingQuiz.chapter,
      lesson_no: meta?.lesson_no || editingQuiz.lesson_no,
      exam_type: examType,
      questions: merged,
    });
    setImportErrors([]);
    setImportText('');
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

  return (
    <div className="bg-white rounded-2xl shadow-lg w-full min-w-0 max-w-full border border-slate-200 overflow-hidden my-2 md:my-4 flex flex-col flex-1 min-h-0">
<div className="flex flex-col md:flex-row justify-between items-center bg-slate-800 p-2 border-b border-slate-700">
<div className="flex flex-wrap gap-2 text-slate-300">
          <button onClick={() => goTab('lessons')} className={`min-w-[120px] py-2 px-4 rounded font-bold flex justify-center items-center gap-2 transition-colors ${activeTab === 'lessons' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-700 hover:text-white'}`}><Video size={18} /> Bài Giảng</button>
<button onClick={() => goTab('quizzes')} className={`min-w-[120px] py-2 px-4 rounded font-bold flex justify-center items-center gap-2 transition-colors ${activeTab === 'quizzes' ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 hover:text-white'}`}><BookOpen size={18} /> Đề Thi</button>
<button onClick={() => goTab('bank')} className={`min-w-[140px] py-2 px-4 rounded font-bold flex justify-center items-center gap-2 transition-colors ${activeTab === 'bank' ? 'bg-violet-600 text-white' : 'hover:bg-slate-700 hover:text-white'}`}><Sparkles size={18} /> Ngân hàng câu</button>
<button onClick={() => goTab('mindmap')} className={`min-w-[120px] py-2 px-4 rounded font-bold flex justify-center items-center gap-2 transition-colors ${activeTab === 'mindmap' ? 'bg-fuchsia-600 text-white' : 'hover:bg-slate-700 hover:text-white'}`}><Network size={18} /> Sơ đồ tư duy ngược</button>
<button onClick={() => goTab('review_map')} className={`min-w-[140px] py-2 px-4 rounded font-bold flex justify-center items-center gap-2 transition-colors ${activeTab === 'review_map' ? 'bg-cyan-600 text-white' : 'hover:bg-slate-700 hover:text-white'}`}><MapIcon size={18} /> Ôn tập map</button>
<button onClick={() => goTab('classroom')} className={`min-w-[160px] py-2 px-4 rounded font-bold flex justify-center items-center gap-2 transition-colors ${activeTab === 'classroom' ? 'bg-teal-600 text-white' : 'hover:bg-slate-700 hover:text-white'}`}><Users size={18} /> Quản lí lớp học</button>
{staffIsSuper ? (
  <button onClick={() => goTab('teachers')} className={`min-w-[160px] py-2 px-4 rounded font-bold flex justify-center items-center gap-2 transition-colors ${activeTab === 'teachers' ? 'bg-indigo-500 text-white' : 'hover:bg-slate-700 hover:text-white'}`}><UserCog size={18} /> Quản lí giáo viên</button>
) : null}
{canAccessAdminTab(staff, 'homepage') ? (
<button onClick={() => goTab('homepage')} className={`min-w-[140px] py-2 px-4 rounded font-bold flex justify-center items-center gap-2 transition-colors ${activeTab === 'homepage' ? 'bg-orange-600 text-white' : 'hover:bg-slate-700 hover:text-white'}`}><LayoutTemplate size={18} /> Trang chủ</button>
) : null}
<button onClick={() => goTab('community_qa')} className={`min-w-[140px] py-2 px-4 rounded font-bold flex justify-center items-center gap-2 transition-colors ${activeTab === 'community_qa' ? 'bg-sky-600 text-white' : 'hover:bg-slate-700 hover:text-white'}`}><MessageCircle size={18} /> Câu hỏi</button>
<button onClick={() => goTab('weekly_contest')} className={`min-w-[140px] py-2 px-4 rounded font-bold flex justify-center items-center gap-2 transition-colors ${activeTab === 'weekly_contest' ? 'bg-amber-500 text-white' : 'hover:bg-slate-700 hover:text-white'}`}><Trophy size={18} /> Đố vui</button>
<button onClick={() => goTab('blog')} className={`min-w-[120px] py-2 px-4 rounded font-bold flex justify-center items-center gap-2 transition-colors ${activeTab === 'blog' ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 hover:text-white'}`}><BookOpen size={18} /> Blog</button>
<button onClick={() => goTab('documents')} className={`min-w-[140px] py-2 px-4 rounded font-bold flex justify-center items-center gap-2 transition-colors ${activeTab === 'documents' ? 'bg-rose-600 text-white' : 'hover:bg-slate-700 hover:text-white'}`}><FolderOpen size={18} /> Tài liệu</button>
</div>
        <div className="mt-3 md:mt-0 flex flex-col items-end gap-1 text-white">
          <div className="text-[11px] text-slate-300 font-semibold">
            {staffIsSuper ? 'Admin tổng' : `GV: ${staff.name || staff.username || '—'}`}
          </div>
          <div className="flex items-center gap-2 bg-slate-700 px-3 py-2 rounded-lg font-bold">
           Khối Lớp: 
<select value={activeGrade} onChange={e => setActiveGrade(e.target.value)} className="bg-slate-900 border border-slate-600 rounded p-1 text-yellow-400">
{staffIsSuper ? <option value="ALL">Toàn Trường (All)</option> : null}
{(staffGrades || ALL_GRADE_OPTIONS).map((g) => (
  <option key={g} value={g}>Toán {g}</option>
))}
           </select>
</div>
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
              questions: sortQuizQuestions(qs),
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
<div><h2 className="font-bold text-lg text-slate-800">Kho Bài Giảng</h2><p className="text-sm text-slate-500">Thư mục theo lớp → chương SGK. Bài lưu đúng chương đã chọn khi soạn.</p></div>
<button
  onClick={() =>
    setEditingLesson({
      isNew: true,
      title: '',
      videoUrl: '',
      slidesUrl: '',
      videoMaterialUrl: '',
      pdfUrl: '',
      description: '',
      content: '',
      chapter: '',
      lesson_no: '',
      grade_level: activeGrade !== 'ALL' ? activeGrade : '9',
    })
  }
  className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"
>
  <Plus size={16} /> Đăng Bài Mới
</button>
</div>
<LessonRepositoryPanel
  lessonsList={lessonsList}
  activeGrade={activeGrade}
  onCreateLesson={({ grade_level, chapter, lesson_no }) =>
    setEditingLesson({
      isNew: true,
      title: '',
      videoUrl: '',
      slidesUrl: '',
      videoMaterialUrl: '',
      pdfUrl: '',
      description: '',
      content: '',
      chapter: chapter || '',
      lesson_no: lesson_no || '',
      grade_level: grade_level || (activeGrade !== 'ALL' ? activeGrade : '9'),
    })
  }
  onEditLesson={(l) => setEditingLesson(l)}
  onDeleteLesson={handleDeleteLesson}
/>
</div>
          )
        )}

        {activeTab === 'quizzes' && (
          editingQuiz ? (
            <div className="min-w-0 bg-slate-50 p-2 md:p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 xl:overflow-hidden xl:h-[calc(100dvh-6rem)] xl:max-h-[calc(100dvh-6rem)]">
              <div className="flex flex-col xl:flex-row xl:items-stretch gap-3 min-w-0 flex-1 min-h-0 xl:overflow-hidden">
                <div
                  className="w-full xl:flex-[7] xl:min-w-0 min-w-0 min-h-0 xl:overflow-y-scroll xl:pr-1.5 [scrollbar-gutter:stable] space-y-3"
                  onFocusCapture={captureAdminTextFocus}
                >
                    <div className="bg-white rounded-lg border border-slate-200 p-2 shadow-sm">
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
                          const validTypes = new Set(getQuizExamTypeOptions(ng).map((o) => o.value));
                          let nextExamType = editingQuiz.exam_type || EXAM_TYPE.lesson;
                          if (!validTypes.has(nextExamType)) nextExamType = EXAM_TYPE.lesson;
                          setEditingQuiz({
                            ...editingQuiz,
                            grade_level: ng,
                            exam_type: nextExamType,
                            chapter: '',
                            lesson_no: '',
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
                        value={editingQuiz.exam_type || EXAM_TYPE.lesson}
                        onChange={(e) => setEditingQuiz({ ...editingQuiz, exam_type: e.target.value })}
                        className="p-2 text-sm border rounded-md font-bold text-slate-700 bg-slate-50"
                      >
                        {getQuizExamTypeOptions(editingQuiz.grade_level || activeGrade || '8').map(({ value, label }) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      {(editingQuiz.exam_type || EXAM_TYPE.lesson) === EXAM_TYPE.lesson ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <select
                            value={(editingQuiz.chapter || '').toString()}
                            onChange={(e) =>
                              setEditingQuiz({
                                ...editingQuiz,
                                chapter: e.target.value,
                                lesson_no: '',
                                section_no: '',
                              })
                            }
                            className="p-2 text-sm border rounded-md font-semibold bg-white min-w-0"
                          >
                            <option value="">— Chọn chương —</option>
                            {quizChapterOptions.map(({ no, label }) => (
                              <option key={no} value={no}>
                                {label}
                              </option>
                            ))}
                            {(editingQuiz.chapter || '').toString().trim() &&
                            !quizChapterOptions.some(
                              (o) => o.no === (editingQuiz.chapter || '').toString().trim()
                            ) ? (
                              <option value={(editingQuiz.chapter || '').toString().trim()}>
                                Chương {editingQuiz.chapter}
                              </option>
                            ) : null}
                          </select>
                          <select
                            value={(editingQuiz.lesson_no || '').toString()}
                            disabled={!(editingQuiz.chapter || '').toString().trim()}
                            onChange={(e) =>
                              setEditingQuiz({
                                ...editingQuiz,
                                lesson_no: e.target.value,
                                section_no: '',
                              })
                            }
                            className="p-2 text-sm border rounded-md font-semibold bg-white min-w-0 disabled:opacity-50"
                          >
                            <option value="">— Chọn bài —</option>
                            {quizLessonNoOptions.map(({ no, label }) => (
                              <option key={no} value={no}>
                                {label}
                              </option>
                            ))}
                            {(editingQuiz.lesson_no || '').toString().trim() &&
                            !quizLessonNoOptions.some(
                              (o) => o.no === (editingQuiz.lesson_no || '').toString().trim()
                            ) ? (
                              <option value={(editingQuiz.lesson_no || '').toString().trim()}>
                                Bài {editingQuiz.lesson_no}
                              </option>
                            ) : null}
                          </select>
                          <select
                            value={(editingQuiz.section_no || '').toString()}
                            disabled={!(editingQuiz.lesson_no || '').toString().trim()}
                            onChange={(e) =>
                              setEditingQuiz({ ...editingQuiz, section_no: e.target.value })
                            }
                            className="p-2 text-sm border rounded-md font-semibold bg-white min-w-0 disabled:opacity-50"
                            title="Gắn đề vào một mục con trong bài (tuỳ chọn)"
                          >
                            <option value="">— Toàn bài (không gắn mục) —</option>
                            {quizSectionOptions.map(({ no, label }) => (
                              <option key={no} value={no}>
                                {label}
                              </option>
                            ))}
                            {(editingQuiz.section_no || '').toString().trim() &&
                            !quizSectionOptions.some(
                              (o) => o.no === (editingQuiz.section_no || '').toString().trim()
                            ) ? (
                              <option value={(editingQuiz.section_no || '').toString().trim()}>
                                Mục {editingQuiz.section_no}
                              </option>
                            ) : null}
                          </select>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editingQuiz.chapter || ''}
                            onChange={(e) => setEditingQuiz({ ...editingQuiz, chapter: e.target.value })}
                            placeholder="Chương (tuỳ chọn)"
                            className="p-2 text-sm border rounded-md font-semibold text-center"
                          />
                          <input
                            type="text"
                            value={editingQuiz.lesson_no || ''}
                            onChange={(e) => setEditingQuiz({ ...editingQuiz, lesson_no: e.target.value })}
                            placeholder="Bài (tuỳ chọn)"
                            className="p-2 text-sm border rounded-md font-semibold text-center"
                          />
                        </div>
                      )}
                    </div>

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
                    <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
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

                  <div className="min-w-0 space-y-4 pb-2">
                    {editingQuiz.questions.map((q, qIdx) => {
                      const qErrs = quizEditorErrorGroups.byQuestion.get(qIdx + 1);
                      return (
                        <div key={q.id || qIdx} className="p-3 md:p-4 border rounded-xl bg-white border-slate-200 relative shadow-sm">
                          <button
                            type="button"
                            onClick={() => {
                              const nq = [...editingQuiz.questions];
                              nq.splice(qIdx, 1);
                              commitQuizQuestions(nq);
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
                                  commitQuizQuestions(nq);
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
                                  commitQuizQuestions(nq);
                                }}
                                className="text-[11px] font-bold rounded-lg border px-2 py-1.5 bg-white text-slate-700 border-slate-200"
                                title="Chương"
                              >
                                <option value="">-- Chương --</option>
                                {chapterOptions.map((c) => (
                                  <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                              </select>

                              <div className="flex items-center gap-1">
                                <select
                                  value={String((q.topic_tags && q.topic_tags[0]) || '')}
                                  onChange={(e) => {
                                    const nq = [...editingQuiz.questions];
                                    const v = e.target.value;
                                    nq[qIdx].topic_tags = v ? [v] : [];
                                    commitQuizQuestions(nq);
                                  }}
                                  className="text-[11px] font-semibold rounded-lg border px-2 py-1.5 bg-white text-slate-700 border-slate-200 min-w-[220px] max-w-[320px]"
                                  title="Dạng toán"
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
                                <button
                                  type="button"
                                  onClick={() => {
                                    const chSel = (q.chapter ?? editingQuiz.chapter ?? '').toString().trim();
                                    if (!chSel) {
                                      alert('Chọn chương trước khi thêm dạng toán mới.');
                                      return;
                                    }
                                    const chOpt = chapterOptions.find((c) => c.value === chSel);
                                    setCustomTopicModal({
                                      qIdx,
                                      chapter: chSel,
                                      grade: quizCurriculumGrade,
                                      chapterLabel: chOpt?.label || `Chương ${chSel}`,
                                      initialLabel: (q.topic_tags && q.topic_tags[0]) || '',
                                    });
                                  }}
                                  className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                  title="Thêm dạng toán mới (lưu cho lần sau)"
                                >
                                  <Plus size={16} />
                                </button>
                              </div>
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
                              commitQuizQuestions(nq);
                            }}
                            className="w-full p-3 border rounded-md text-sm mb-2 min-h-[20rem] h-[20rem] resize-y leading-relaxed"
                            placeholder={
                              q.type === 'fill_blanks'
                                ? 'Câu dẫn (tuỳ chọn) — ví dụ: Điền các chỗ trống trong đoạn văn sau'
                                : 'Nội dung câu hỏi...'
                            }
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
                              if (typ === 'fill_blanks') {
                                if (nq[qIdx].passage == null) nq[qIdx].passage = '';
                                if (!Array.isArray(nq[qIdx].blanks)) nq[qIdx].blanks = [];
                              }
                              commitQuizQuestions(nq);
                            }}
                            className="mb-2 p-1.5 border rounded-md text-xs w-full font-bold text-slate-600"
                          >
                            <option value="multiple_choice">Trắc nghiệm A–D</option>
                            <option value="true_false_group">Đúng / Sai (a–d)</option>
                            <option value="short_answer">Trả lời ngắn</option>
                            <option value="fill_blanks">Điền chỗ trống (đoạn văn)</option>
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
                                      commitQuizQuestions(nq);
                                    }}
                                  />
                                  <input
                                    type="text"
                                    data-admin-snippet={`quiz-opt:${qIdx}:${oIdx}`}
                                    value={opt}
                                    onChange={(e) => {
                                      const nq = [...editingQuiz.questions];
                                      nq[qIdx].options[oIdx] = e.target.value;
                                      commitQuizQuestions(nq);
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
                                      commitQuizQuestions(nq);
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
                                      commitQuizQuestions(nq);
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
                                    commitQuizQuestions(nq);
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
                                    commitQuizQuestions(nq);
                                  }}
                                  className="w-full text-sm border rounded px-2 py-1.5"
                                  placeholder="Nhập đáp án..."
                                />
                              </div>
                            </div>
                          )}
                          {q.type === 'fill_blanks' && (
                            <div className="mb-2 space-y-2">
                              <textarea
                                data-admin-snippet={`quiz-fb-passage:${qIdx}`}
                                value={(q.passage ?? '').toString()}
                                onChange={(e) => {
                                  const nq = [...editingQuiz.questions];
                                  nq[qIdx].passage = e.target.value;
                                  commitQuizQuestions(nq);
                                }}
                                placeholder="Đoạn văn — dùng {{1}}, {{2}}… để đánh dấu chỗ trống. Ví dụ: Hàm số $y=x^2$ có đỉnh {{1}}."
                                className="w-full p-2 border rounded text-sm min-h-[16rem] font-mono text-[13px] resize-y"
                              />
                              <textarea
                                data-admin-snippet={`quiz-fb-answers:${qIdx}`}
                                value={(Array.isArray(q.blanks) ? q.blanks : [])
                                  .map((b) =>
                                    typeof b === 'object'
                                      ? `${b.id}=${b.correctAnswer ?? b.answer ?? ''}`
                                      : String(b ?? '')
                                  )
                                  .join('\n')}
                                onChange={(e) => {
                                  const blanks = e.target.value
                                    .split('\n')
                                    .map((l) => l.trim())
                                    .filter(Boolean)
                                    .map((l) => {
                                      const m = l.match(/^(\d+)\s*=\s*(.+)$/);
                                      if (m) return { id: m[1], correctAnswer: m[2].trim() };
                                      const m2 = l.match(/^([^=]+)=\s*(.+)$/);
                                      if (m2) return { id: m2[1].trim(), correctAnswer: m2[2].trim() };
                                      return null;
                                    })
                                    .filter(Boolean);
                                  const nq = [...editingQuiz.questions];
                                  nq[qIdx].blanks = blanks;
                                  commitQuizQuestions(nq);
                                }}
                                placeholder="Đáp án từng chỗ trống — mỗi dòng: 1=(0; 0) hoặc 2=x=0"
                                className="w-full p-2 border rounded text-sm min-h-[12rem] resize-y"
                              />
                            </div>
                          )}
                          <textarea
                            data-admin-snippet={`quiz-exp:${qIdx}`}
                            value={q.explanation || ''}
                            onChange={(e) => {
                              const nq = [...editingQuiz.questions];
                              nq[qIdx].explanation = e.target.value;
                              commitQuizQuestions(nq);
                            }}
                            className="w-full p-3 border border-amber-200 bg-amber-50/80 rounded-md text-sm min-h-[12rem] resize-y leading-relaxed"
                            placeholder="Lời giải..."
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-2 pt-2 pb-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        commitQuizQuestions([
                          ...editingQuiz.questions,
                          {
                            id: `q${Date.now()}`,
                            type: 'multiple_choice',
                            question: '',
                            options: ['', '', '', ''],
                            correctAnswer: 0,
                            explanation: '',
                            cognitive_level: COG_LEVEL.recognize,
                          },
                        ]);
                      }}
                      className="w-full border-2 border-dashed border-blue-400 text-blue-600 py-3 rounded-lg text-sm font-bold flex justify-center items-center gap-2 bg-white"
                    >
                      <Plus size={18} /> Thêm câu
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveQuiz}
                      disabled={isSavingQuiz}
                      className={`w-full font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 text-sm shadow-md ${
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
                            ) : q.type === 'fill_blanks' ? (
                              <div className="text-[11px]">
                                <PracticeFillBlanksResult q={q} />
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
<div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm"><div><h2 className="font-bold text-lg text-slate-800">Kho Đề Thi</h2><p className="text-sm text-slate-500">Thư mục theo loại đề · đề theo bài nằm trong chương SGK đã chọn khi soạn.</p></div>
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
                      exam_type: EXAM_TYPE.lesson,
                      chapter: '',
                      lesson_no: '',
                      section_no: '',
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
<QuizRepositoryPanel
  quizzesList={quizzesList}
  activeGrade={activeGrade}
  onCreateQuiz={({ exam_type, chapter, grade_level }) =>
    setEditingQuiz({
      isNew: true,
      title: '',
      duration: 15,
      level: 'test',
      category: '',
      grade_level: grade_level || (activeGrade !== 'ALL' ? activeGrade : '11'),
      exam_type: exam_type || EXAM_TYPE.lesson,
      chapter: chapter || '',
      lesson_no: '',
      section_no: '',
      questions: [],
      difficulty_stars: 3,
      ...DEFAULT_PART_POINTS,
    })
  }
  onEditQuiz={(q) =>
    setEditingQuiz({
      ...q,
      level: 'test',
      exam_type: normalizeExamType(q.exam_type, q.grade_level),
      questions: sortQuizQuestions(q.questions || []),
    })
  }
  onDeleteQuiz={(id) => window.confirm('Xóa đề này?') && deleteDoc(doc(db, COLLECTION_QUIZZES, id))}
/>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2">
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
                <div className="flex gap-1 lg:col-span-2 min-w-0">
                  <select
                    value={String((editingBankQuestion.topic_tags || [])[0] || '')}
                    onChange={(e) =>
                      setEditingBankQuestion({
                        ...editingBankQuestion,
                        topic_tags: e.target.value ? [e.target.value] : [],
                      })
                    }
                    className="flex-1 p-2 text-sm border rounded-md font-semibold min-w-0"
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
                  <button
                    type="button"
                    onClick={() => {
                      const gl = (editingBankQuestion.grade_level || activeGrade || '8').toString();
                      const chSel = String(editingBankQuestion.chapter || '').trim();
                      if (!chSel) {
                        alert('Chọn chương trước khi thêm dạng toán mới.');
                        return;
                      }
                      const chOpt = getChapterOptionsForGrade(gl).find((c) => c.value === chSel);
                      setCustomTopicModal({
                        context: 'bank',
                        chapter: chSel,
                        grade: gl,
                        chapterLabel: chOpt?.label || `Chương ${chSel}`,
                        initialLabel: (editingBankQuestion.topic_tags && editingBankQuestion.topic_tags[0]) || '',
                      });
                    }}
                    className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                    title="Thêm dạng toán mới (lưu cho lần sau)"
                  >
                    <Plus size={16} />
                  </button>
                </div>
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

              <div className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row gap-2 md:items-center">
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
                    className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shrink-0 ${editingQuiz ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                    title="Đưa câu hỏi của đề đang mở (Tạo/Sửa Đề) vào ngân hàng"
                  >
                    <Upload size={16} /> Lấy từ đề đang sửa
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
                  <select
                    value={bankFilterChapter}
                    onChange={(e) => {
                      setBankFilterChapter(e.target.value);
                      setBankFilterTopic('');
                    }}
                    className="p-2 text-xs font-bold border rounded-lg bg-violet-50 text-violet-900 min-w-0"
                    title="Lọc theo chương"
                  >
                    {bankChapterFilterOptions.map((o) => (
                      <option key={o.value || 'all'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={bankFilterTopic}
                    onChange={(e) => setBankFilterTopic(e.target.value)}
                    className="p-2 text-xs font-semibold border rounded-lg bg-white text-slate-800 min-w-0"
                    title="Lọc theo dạng toán"
                  >
                    {bankTopicFilterOptions.map((o) => (
                      <option key={o.value || 'all-topic'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={bankFilterQType}
                    onChange={(e) => setBankFilterQType(e.target.value)}
                    className="p-2 text-xs font-bold border rounded-lg bg-white text-slate-800 min-w-0"
                    title="Lọc theo loại câu"
                  >
                    <option value="">Tất cả loại câu</option>
                    {Object.values(QUESTION_TYPE).map((k) => (
                      <option key={k} value={k}>
                        {QUESTION_TYPE_LABEL[k]}
                      </option>
                    ))}
                  </select>
                  <select
                    value={bankFilterCogLevel}
                    onChange={(e) => setBankFilterCogLevel(e.target.value)}
                    className="p-2 text-xs font-bold border rounded-lg bg-white text-slate-800 min-w-0"
                    title="Lọc theo mức độ"
                  >
                    <option value="">Tất cả mức độ</option>
                    {Object.values(COG_LEVEL).map((k) => (
                      <option key={k} value={k}>
                        {COG_LEVEL_LABEL[k]}
                      </option>
                    ))}
                  </select>
                </div>

                {(bankFilterChapter || bankFilterTopic || bankFilterQType || bankFilterCogLevel) ? (
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-500 font-semibold">
                      Đang lọc · {filteredBankQuestions.length} câu
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setBankFilterChapter('');
                        setBankFilterTopic('');
                        setBankFilterQType('');
                        setBankFilterCogLevel('');
                      }}
                      className="text-violet-700 font-bold hover:underline shrink-0"
                    >
                      Xóa bộ lọc
                    </button>
                  </div>
                ) : null}
              </div>

              <QuestionRepositoryPanel
                questions={filteredBankQuestions}
                activeGrade={activeGrade}
                onEditQuestion={(q) => setEditingBankQuestion({ ...q, topic_tags: q.topic_tags || [] })}
                onDeleteQuestion={handleDeleteBankQuestion}
              />
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

        {activeTab === 'classroom' && (
          <ClassroomManagementPanel
            db={db}
            activeGrade={activeGrade}
            studentsList={allowedStudents}
            classesList={classesList}
            scoresList={scoresList}
            quizzesList={quizzesList}
            lessonsList={lessonsList}
            trialRegistrations={trialRegistrations}
            onViewEssayImage={setViewingImage}
            staffSession={staff}
          />
        )}

        {activeTab === 'teachers' && staffIsSuper && (
          <AdminTeachersPanel classesList={classesList} />
        )}

        {activeTab === 'homepage' && canAccessAdminTab(staff, 'homepage') && (
          <HomepageCmsAdminPanel db={db} storage={storage} user={user} />
        )}
        {activeTab === 'community_qa' && <AdminCommunityQuestionsPanel />}
        {activeTab === 'weekly_contest' && <AdminWeeklyContestPanel />}
        {activeTab === 'blog' && <AdminBlogPanel />}
        {activeTab === 'documents' && <AdminDocumentsPanel />}
      </div>

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

      <AddCustomMathTopicModal
        open={Boolean(customTopicModal)}
        chapterLabel={customTopicModal?.chapterLabel || ''}
        gradeLevel={
          customTopicModal?.grade ||
          (customTopicModal?.context === 'bank'
            ? editingBankQuestion?.grade_level
            : quizCurriculumGrade)
        }
        initialLabel={customTopicModal?.initialLabel || ''}
        saving={savingCustomTopic}
        onClose={() => !savingCustomTopic && setCustomTopicModal(null)}
        onSave={handleSaveCustomMathTopic}
      />

      {viewingImage && (
        <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4"><div className="bg-white rounded-xl overflow-hidden max-w-2xl w-full"><div className="flex justify-between items-center p-4 border-b"><strong>Ảnh bài làm: {viewingImage.name}</strong><button onClick={() => setViewingImage(null)}><XCircle size={24} /></button></div><img src={viewingImage.img} className="w-full h-auto" alt="Bài làm" /></div></div>
      )}
    </div>
  );
}
