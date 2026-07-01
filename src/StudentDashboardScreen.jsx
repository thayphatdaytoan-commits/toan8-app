import React, { useState, useMemo, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { computeLessonStudyProgress } from './lessonProgress';
import ChuyenDeOnTapStudentFlow from './chuyenDeOnTap/ChuyenDeOnTapStudentFlow';
import BackButton from './BackButton';
import StudentMindMapFlow from './mindMap/StudentMindMapFlow';
import {
  BookOpen,
  LayoutDashboard,
  FileText,
  Trophy,
  Settings,
  Bell,
  Search,
  PlayCircle,
  Clock,
  Calendar,
  ListOrdered,
  Star,
  LogOut,
  ChevronRight,
  Sparkles,
  Medal,
  TrendingUp,
  Crown,
  Compass,
  PlaySquare,
  BookMarked,
  Gem,
  Menu,
  X,
  BrainCircuit,
} from 'lucide-react';

const CHAPTER_THEMES = {
  blue: {
    gradient: 'from-blue-500 to-cyan-400',
    shadow: 'shadow-blue-200',
    hoverLesson: 'hover:bg-blue-50 text-slate-600 hover:text-blue-700',
    iconBg: 'bg-blue-100 text-blue-500 group-hover/btn:bg-blue-500 group-hover/btn:text-white',
    arrow: 'text-blue-500',
  },
  purple: {
    gradient: 'from-purple-500 to-fuchsia-500',
    shadow: 'shadow-purple-200',
    hoverLesson: 'hover:bg-purple-50 text-slate-600 hover:text-purple-700',
    iconBg: 'bg-purple-100 text-purple-500 group-hover/btn:bg-purple-500 group-hover/btn:text-white',
    arrow: 'text-purple-500',
  },
  orange: {
    gradient: 'from-orange-500 to-amber-500',
    shadow: 'shadow-orange-200',
    hoverLesson: 'hover:bg-orange-50 text-slate-600 hover:text-orange-700',
    iconBg: 'bg-orange-100 text-orange-500 group-hover/btn:bg-orange-500 group-hover/btn:text-white',
    arrow: 'text-orange-500',
  },
};

function normName(s) {
  return (s || '').trim().toLowerCase();
}

/** EXP: điểm bài × 15; riêng ôn tập chuyên đề dùng trường exp_points (điểm EXP tuyệt đối). */
function expPointsFromRow(s) {
  const ep = Number(s?.exp_points);
  if (Number.isFinite(ep) && ep >= 0) return Math.round(ep);
  return scoreToExp(s?.score);
}

function scoreToExp(score) {
  const n = Number(score);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 15);
}

function formatDate(ts) {
  if (!ts) return '—';
  try {
    const d = typeof ts === 'number' ? new Date(ts) : new Date(Number(ts));
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
}

/** Gợi ý bài học từ lần làm gần nhất (đề theo bài / bài tập nhúng). */
function clampDifficultyStars(n) {
  const x = Math.round(Number(n));
  if (!Number.isFinite(x)) return 3;
  return Math.min(5, Math.max(1, x));
}

function DifficultyStarsRow({ value, compact }) {
  const n = clampDifficultyStars(value);
  return (
    <span className="inline-flex items-center gap-0.5" title={`Độ khó: ${n}/5 sao`} aria-label={`Độ khó ${n} trên 5 sao`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 shrink-0 ${
            i < n
              ? compact
                ? 'text-amber-300 fill-amber-400/90'
                : 'text-amber-500 fill-amber-400'
              : compact
                ? 'text-white/25'
                : 'text-slate-300'
          }`}
        />
      ))}
    </span>
  );
}

function resolveLessonFromLastScore(lastScore, lessonsEnriched, quizzesList) {
  if (!lastScore) return null;
  const qid = String(lastScore.quizId || '');
  if (qid.startsWith('lesson_practice_')) {
    const lid = qid.slice('lesson_practice_'.length);
    return lessonsEnriched.find((l) => l.id === lid) || null;
  }
  const quiz = (quizzesList || []).find((q) => q.id === qid);
  if (!quiz) return null;
  const et = String(quiz?.exam_type || 'lesson').trim();
  if (et !== 'lesson') return null;
  const ch = String(quiz.chapter ?? '').trim();
  const ln = String(quiz.lesson_no ?? '').trim();
  if (!ch && !ln) return null;
  return lessonsEnriched.find((l) => l.chapter === ch && l.lesson_no === ln) || null;
}

const StudentDashboardScreen = forwardRef(function StudentDashboardScreen(
  {
    studentName,
    studentClass,
    rosterGrade = '8',
    scoresList = [],
    quizzesList = [],
    lessonsList = [],
    mindMapCategories = [],
    reviewCoursesList = [],
    reviewProgressList = [],
    onLogout,
    onSelectQuiz,
    onSelectLesson,
    onReviewOnTapExp,
    onSaveReviewProgress,
    initialTab = 'dashboard',
  },
  ref
) {
  const [activeTab, setActiveTab] = useState(initialTab || 'dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [examTypeFilter, setExamTypeFilter] = useState('all');
  /** Trong mục Đề thi: khám phá đề hoặc lịch sử (gộp menu cũ "Lịch sử thi"). */
  const [examPanelView, setExamPanelView] = useState('browse');
  /** Sắp xếp danh sách đề (theo thời gian cập nhật hoặc độ khó sao). */
  const [examSortBy, setExamSortBy] = useState('newest');
  /** Lọc theo độ khó (admin gán 1–5 sao). */
  const [examDifficultyFilter, setExamDifficultyFilter] = useState('all');
  /** Drawer menu khi không có sidebar (màn hình nhỏ hơn md). */
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  /** Học sinh đang trong chủ đề ôn tập (slide): ẩn sidebar + block phía dưới. */
  const [reviewOnTapImmersive, setReviewOnTapImmersive] = useState(false);
  const navStackRef = useRef([]);
  const isNavRestoringRef = useRef(false);
  const topicsNavBridgeRef = useRef(null);
  const mindmapNavBridgeRef = useRef(null);
  const [navCanGoBack, setNavCanGoBack] = useState(() => (initialTab || 'dashboard') !== 'dashboard');

  const syncNavCanGoBack = useCallback((snap) => {
    const tab = snap?.tab ?? activeTab;
    const topics = snap?.topics ?? topicsNavBridgeRef.current?.getState?.() ?? null;
    const atRoot = tab === 'dashboard' && navStackRef.current.length === 0 && !topics?.topicId;
    setNavCanGoBack(!atRoot);
  }, [activeTab]);

  const captureNavSnapshot = useCallback(
    () => ({
      tab: activeTab,
      examPanelView,
      topics: topicsNavBridgeRef.current?.getState?.() ?? null,
      mindmap: mindmapNavBridgeRef.current?.getState?.() ?? null,
    }),
    [activeTab, examPanelView]
  );

  const restoreNavSnapshot = useCallback(
    (snap) => {
      if (!snap) return;
      isNavRestoringRef.current = true;
      setActiveTab(snap.tab || 'dashboard');
      setExamPanelView(snap.examPanelView || 'browse');
      topicsNavBridgeRef.current?.restore?.(snap.topics);
      mindmapNavBridgeRef.current?.restore?.(snap.mindmap);
      isNavRestoringRef.current = false;
      syncNavCanGoBack(snap);
    },
    [syncNavCanGoBack]
  );

  const pushNavHistory = useCallback(() => {
    if (isNavRestoringRef.current) return;
    navStackRef.current.push(captureNavSnapshot());
    setNavCanGoBack(true);
  }, [captureNavSnapshot]);

  const goToTab = useCallback(
    (tab, { examPanelView: nextExamView } = {}) => {
      const sameTab = tab === activeTab;
      const sameExam =
        tab !== 'exams' || !nextExamView || nextExamView === examPanelView;
      if (sameTab && sameExam) return;
      pushNavHistory();
      setActiveTab(tab);
      if (tab === 'exams') {
        setExamPanelView(nextExamView || 'browse');
      }
    },
    [activeTab, examPanelView, pushNavHistory]
  );

  const goToExamPanelView = useCallback(
    (view) => {
      if (view === examPanelView) return;
      pushNavHistory();
      setExamPanelView(view);
    },
    [examPanelView, pushNavHistory]
  );

  const handleDashboardBack = useCallback(() => {
    const stack = navStackRef.current;
    if (stack.length > 0) {
      const prev = stack.pop();
      restoreNavSnapshot(prev);
      syncNavCanGoBack(prev);
      return true;
    }
    if (activeTab !== 'dashboard') {
      setActiveTab('dashboard');
      setNavCanGoBack(false);
      return true;
    }
    return false;
  }, [activeTab, restoreNavSnapshot, syncNavCanGoBack]);

  useImperativeHandle(
    ref,
    () => ({
      getSnapshot: captureNavSnapshot,
      restore: restoreNavSnapshot,
      goBack: handleDashboardBack,
    }),
    [captureNavSnapshot, restoreNavSnapshot, handleDashboardBack]
  );

  useEffect(() => {
    if (!initialTab || typeof initialTab !== 'string') return;
    if (initialTab === 'history') {
      setActiveTab('exams');
      setExamPanelView('history');
    } else {
      setActiveTab(initialTab);
      if (initialTab === 'exams') setExamPanelView('browse');
    }
  }, [initialTab]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileNavOpen]);

  useEffect(() => {
    if (activeTab !== 'topics') setReviewOnTapImmersive(false);
  }, [activeTab]);

  const parseNum = (v) => {
    const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  const myScores = useMemo(() => {
    const me = normName(studentName);
    const g = String(rosterGrade || '').trim();
    if (!me || !Array.isArray(scoresList)) return [];
    return scoresList
      .filter((s) => {
        if (normName(s?.name) !== me) return false;
        const sg = String(s?.grade_level ?? '').trim();
        if (sg && g && sg !== g) return false;
        return true;
      })
      .map((s) => ({
        ...s,
        _exp: expPointsFromRow(s),
        _ts: Number(s?.timestamp) || 0,
      }))
      .sort((a, b) => b._ts - a._ts);
  }, [scoresList, studentName, rosterGrade]);

  const totalExp = useMemo(() => myScores.reduce((acc, s) => acc + (s._exp || 0), 0), [myScores]);

  const avgScore = useMemo(() => {
    if (!myScores.length) return null;
    const nums = myScores
      .filter((s) => String(s?.kind) !== 'review_on_tap')
      .map((s) => Number(s.score))
      .filter((n) => Number.isFinite(n));
    if (!nums.length) return null;
    const sum = nums.reduce((a, b) => a + b, 0);
    return (sum / nums.length).toFixed(1);
  }, [myScores]);

  const leaderboard = useMemo(() => {
    const g = String(rosterGrade || '').trim();
    if (!Array.isArray(scoresList)) return [];
    const byName = new Map();
    for (const s of scoresList) {
      const sg = String(s?.grade_level ?? '').trim();
      if (g && sg && sg !== g) continue;
      const name = (s?.name || '').trim();
      if (!name) continue;
      const exp = expPointsFromRow(s);
      if (!byName.has(name)) byName.set(name, { name, totalExp: 0, attempts: 0 });
      const row = byName.get(name);
      row.totalExp += exp;
      row.attempts += 1;
    }
    const arr = Array.from(byName.values()).sort((a, b) => b.totalExp - a.totalExp);
    return arr.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [scoresList, rosterGrade]);

  const myRank = useMemo(() => {
    const me = (studentName || '').trim();
    const row = leaderboard.find((r) => r.name === me);
    return row ? row.rank : null;
  }, [leaderboard, studentName]);

  const activeExams = useMemo(() => {
    if (!quizzesList.length) return [];
    return quizzesList.map((q) => {
      const rawType = (q?.exam_type || 'lesson').toString().trim();
      const isCombined = rawType === 'combined';
      const updatedAt = Number(q?.updated_at) || Number(q?.created_at) || 0;
      return {
        id: q.id,
        title: q.title || 'Bài thi',
        exam_type: isCombined ? 'lesson' : rawType,
        chapter: isCombined ? 'Tổng hợp' : (q?.chapter ?? '').toString().trim(),
        lesson_no: isCombined ? '' : (q?.lesson_no ?? '').toString().trim(),
        date: 'Chưa có',
        duration: q.duration ? `${q.duration} phút` : 'Không giới hạn',
        durationMins: q.duration != null ? Number(q.duration) : null,
        questionCount: Array.isArray(q?.questions) ? q.questions.length : 0,
        status: 'Bắt đầu',
        type: 'Luyện tập',
        statusColor: 'bg-blue-100 text-blue-700',
        difficultyStars: clampDifficultyStars(q?.difficulty_stars),
        updatedAt,
      };
    });
  }, [quizzesList]);

  const qLower = searchQuery.trim().toLowerCase();
  const examsFiltered = useMemo(() => {
    let list = activeExams;
    if (examTypeFilter !== 'all') {
      list = list.filter((e) => (e.exam_type || 'lesson') === examTypeFilter);
    }
    if (examDifficultyFilter !== 'all') {
      const want = Number(examDifficultyFilter);
      list = list.filter((e) => e.difficultyStars === want);
    }
    if (qLower) {
      list = list.filter(
        (e) =>
          (e.title || '').toLowerCase().includes(qLower) ||
          (e.chapter || '').toLowerCase().includes(qLower) ||
          (e.lesson_no || '').toLowerCase().includes(qLower)
      );
    }
    const vi = 'vi';
    const byTitle = (a, b) => (a.title || '').localeCompare(b.title || '', vi);
    const sorted = [...list].sort((a, b) => {
      if (examSortBy === 'newest') return (b.updatedAt - a.updatedAt || b.id.localeCompare(a.id)) || byTitle(a, b);
      if (examSortBy === 'oldest') return (a.updatedAt - b.updatedAt || a.id.localeCompare(b.id)) || byTitle(a, b);
      if (examSortBy === 'easy_hard') return (a.difficultyStars - b.difficultyStars || byTitle(a, b));
      return byTitle(a, b);
    });
    return sorted;
  }, [activeExams, examTypeFilter, examDifficultyFilter, qLower, examSortBy]);

  const groupedExams = useMemo(() => {
    if (!Array.isArray(examsFiltered) || !examsFiltered.length) return [];
    const map = new Map();
    for (const ex of examsFiltered) {
      const t = (ex?.exam_type || 'lesson').trim() || 'lesson';
      const ch = (ex?.chapter || '').trim() || '0';
      const le = (ex?.lesson_no || '').trim() || '0';
      const key = `${t}|||${ch}|||${le}`;
      if (!map.has(key)) map.set(key, { exam_type: t, chapter: ch, lesson_no: le, exams: [] });
      map.get(key).exams.push(ex);
    }
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      if (a.exam_type !== b.exam_type) return (a.exam_type || '').localeCompare(b.exam_type || '');
      const ca = parseNum(a.chapter);
      const cb = parseNum(b.chapter);
      if (ca !== null && cb !== null && ca !== cb) return ca - cb;
      if (a.chapter !== b.chapter) return (a.chapter || '').localeCompare(b.chapter || '');
      const la = parseNum(a.lesson_no);
      const lb = parseNum(b.lesson_no);
      if (la !== null && lb !== null && la !== lb) return la - lb;
      if (a.lesson_no !== b.lesson_no) return (a.lesson_no || '').localeCompare(b.lesson_no || '');
      return 0;
    });
    return arr;
  }, [examsFiltered]);

  const examTypeLabel = (t) =>
    ({
      lesson: 'Đề theo bài',
      midterm: 'Giữa kỳ',
      final: 'Cuối kỳ',
      mock: 'Thi thử',
      entrance: 'Tuyển sinh',
    }[t] || 'Đề thi');

  const examDifficultyPill = (examType) => {
    const t = examType || 'lesson';
    if (t === 'final') return { text: 'Cuối kỳ · Tổng hợp', className: 'bg-rose-50 text-rose-700 border border-rose-100' };
    if (t === 'midterm') return { text: 'Giữa kỳ', className: 'bg-amber-50 text-amber-800 border border-amber-100' };
    if (t === 'mock') return { text: 'Thi thử', className: 'bg-violet-50 text-violet-700 border border-violet-100' };
    if (t === 'combined') return { text: 'Đề tổng hợp', className: 'bg-cyan-50 text-cyan-800 border border-cyan-100' };
    return { text: 'Theo bài · Luyện tập', className: 'bg-slate-50 text-slate-700 border border-slate-200' };
  };

  const examSubtitle = (exam) => {
    const et = examTypeLabel(exam.exam_type);
    if (exam.exam_type === 'lesson' && exam.chapter && exam.chapter !== 'Tổng hợp') {
      return `${et} · Chương ${exam.chapter}${exam.lesson_no ? ` · Bài ${exam.lesson_no}` : ''}`;
    }
    return et;
  };

  /** Bài học + tiến độ: theo số đề theo bài (cùng chương/bài) đã hoàn thành / tổng đề. */
  const lessonsEnriched = useMemo(() => {
    const list = lessonsList || [];
    return list
      .map((l) => {
        const chapter = (l?.chapter ?? '').toString().trim();
        const lesson_no = (l?.lesson_no ?? '').toString().trim();
        const lessonQuizzes = (quizzesList || []).filter((q) => {
          const et = (q?.exam_type || 'lesson').toString().trim();
          if (et !== 'lesson') return false;
          const qc = (q?.chapter ?? '').toString().trim();
          const ql = (q?.lesson_no ?? '').toString().trim();
          return qc === chapter && ql === lesson_no;
        });
        const progress = computeLessonStudyProgress(l, lessonQuizzes, myScores);

        return {
          id: l.id,
          title: l.title || 'Bài học',
          subject: 'Toán',
          chapter,
          lesson_no,
          chapterLabel: chapter || '—',
          progress,
          totalMins: 45,
          color: 'bg-emerald-100 text-emerald-600',
        };
      })
      .sort((a, b) => {
        const ca = parseNum(a.chapter);
        const cb = parseNum(b.chapter);
        if (ca !== null && cb !== null && ca !== cb) return ca - cb;
        if (a.chapter !== b.chapter) return (a.chapter || '').localeCompare(b.chapter || '');
        const la = parseNum(a.lesson_no);
        const lb = parseNum(b.lesson_no);
        if (la !== null && lb !== null && la !== lb) return la - lb;
        return (a.lesson_no || '').localeCompare(b.lesson_no || '');
      });
  }, [lessonsList, quizzesList, myScores]);

  /** Banner tổng quan: nhiệm vụ gợi ý theo lịch sử làm bài + tiến độ bài học. */
  const todayLearningMission = useMemo(() => {
    const lessons = lessonsEnriched;
    if (!lessons.length) {
      return {
        kind: 'empty',
        badge: 'Nhiệm vụ học tập hôm nay',
        headline: 'Sẵn sàng khám phá',
        chapterLine: `Khối ${rosterGrade}`,
        ctaLabel: 'Mở Bài học',
        ctaSecondaryLabel: null,
        onPrimary: () => goToTab('lessons'),
        onSecondary: null,
        focusLessonId: null,
        progressPercent: 0,
        punchLine: null,
      };
    }

    const last = myScores[0];
    const fromActivity = last ? resolveLessonFromLastScore(last, lessons, quizzesList) : null;
    const firstIncomplete = lessons.find((l) => l.progress < 100);

    let focus = null;
    if (fromActivity && fromActivity.progress < 100) focus = fromActivity;
    else if (firstIncomplete) focus = firstIncomplete;
    else focus = fromActivity || lessons[lessons.length - 1];

    const p = focus.progress;
    const ch = focus.chapterLabel;
    const ln = focus.lesson_no;
    const chapterLine = ln ? `Chương ${ch} · Bài ${ln}` : `Chương ${ch}`;
    const shortTitle = (focus.title || 'Bài học').trim();

    const ctaLabel = p >= 100 ? 'Bài tiếp theo' : p === 0 ? 'Bắt đầu' : 'Tiếp tục';

    const punchLine =
      p < 100
        ? 'Hôm nay: đẩy tiến độ lên 100% · EXP đang chờ bạn!'
        : 'Làm thêm đề — cộng EXP mỗi lần nộp bài.';

    return {
      kind: 'lesson',
      badge: 'Nhiệm vụ học tập hôm nay',
      headline: shortTitle,
      chapterLine,
      ctaLabel,
      ctaSecondaryLabel: 'Danh sách bài học',
      onPrimary: () => {
        if (onSelectLesson && focus.id) onSelectLesson(focus.id);
        else goToTab('lessons');
      },
      onSecondary: () => goToTab('lessons'),
      focusLessonId: focus.id,
      progressPercent: Math.min(100, Math.max(0, Math.round(p))),
      punchLine,
    };
  }, [lessonsEnriched, myScores, quizzesList, rosterGrade, onSelectLesson]);

  const roadmapChapters = useMemo(() => {
    const map = new Map();
    for (const l of lessonsEnriched) {
      const key = l.chapter || 'Khác';
      if (!map.has(key)) map.set(key, { chapter: key, lessons: [] });
      map.get(key).lessons.push(l);
    }
    const rows = Array.from(map.values()).map((row) => {
      const avg =
        row.lessons.length === 0
          ? 0
          : Math.round(row.lessons.reduce((acc, x) => acc + x.progress, 0) / row.lessons.length);
      const done = row.lessons.filter((x) => x.progress >= 100).length;
      return {
        chapter: row.chapter,
        progress: avg,
        total: row.lessons.length,
        done,
      };
    });
    rows.sort((a, b) => {
      const na = parseNum(a.chapter);
      const nb = parseNum(b.chapter);
      if (na !== null && nb !== null && na !== nb) return na - nb;
      return (a.chapter || '').localeCompare(b.chapter || '');
    });
    return rows;
  }, [lessonsEnriched]);

  const currentLessons = useMemo(() => {
    const incomplete = lessonsEnriched.filter((l) => l.progress < 100);
    return incomplete.slice(0, 2);
  }, [lessonsEnriched]);

  const currentFiltered = useMemo(() => {
    if (!qLower) return currentLessons;
    return currentLessons.filter((l) => (l.title || '').toLowerCase().includes(qLower));
  }, [currentLessons, qLower]);

  const statCardsRow = useMemo(
    () => [
      {
        label: 'EXP (kinh nghiệm)',
        value: totalExp.toLocaleString('vi-VN'),
        icon: Sparkles,
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
      },
      {
        label: 'Đề đã làm',
        value: String(myScores.length),
        icon: FileText,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100',
      },
      {
        label: 'Điểm TB (lần làm)',
        value: avgScore != null ? avgScore : '—',
        icon: Trophy,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
      },
      {
        label: 'Vị trí xếp hạng',
        value: myRank != null ? `#${myRank}` : '—',
        icon: TrendingUp,
        color: 'text-violet-600',
        bgColor: 'bg-violet-100',
      },
    ],
    [totalExp, myScores.length, avgScore, myRank]
  );

  const filterChips = [
    { id: 'all', label: 'Tất cả' },
    { id: 'lesson', label: 'Theo bài' },
    { id: 'midterm', label: 'Giữa kỳ' },
    { id: 'final', label: 'Cuối kỳ' },
  ];

  const topFive = useMemo(() => leaderboard.slice(0, 5), [leaderboard]);

  const CHAPTER_THEME_KEYS = ['blue', 'purple', 'orange'];
  const dynamicChapters = useMemo(() => {
    const grouped = new Map();
    (lessonsList || []).forEach((l) => {
      const tid = (l?.topic_id || '').toString().trim();
      const tname = (l?.topic_name || '').toString().trim();
      const chRaw = (l?.chapter ?? '').toString().trim();
      // Bài thuộc chuyên đề nhưng không thuộc chương nào → hiển thị như "một chương riêng" lấy tên chuyên đề.
      const key = tid && !chRaw ? `topic:${tid}` : (chRaw || '0');
      if (!grouped.has(key)) grouped.set(key, { key, title: tid && !chRaw ? (tname || 'Chuyên đề ôn thi') : '', lessons: [] });
      grouped.get(key).lessons.push(l);
    });
    const chapterKeys = Array.from(grouped.keys()).sort((a, b) => {
      const at = String(a).startsWith('topic:');
      const bt = String(b).startsWith('topic:');
      if (at !== bt) return at ? 1 : -1; // chương chuyên đề luôn xuống cuối
      const na = parseNum(a);
      const nb = parseNum(b);
      if (na !== null && nb !== null) return na - nb;
      return a.localeCompare(b);
    });
    return chapterKeys.map((ch, idx) => {
      const row = grouped.get(ch) || { key: ch, title: '', lessons: [] };
      const lessons = row.lessons || [];
      lessons.sort((a, b) => {
        const na = parseNum(a?.lesson_no);
        const nb = parseNum(b?.lesson_no);
        if (na !== null && nb !== null) return na - nb;
        return (a?.title || '').localeCompare(b?.title || '');
      });
      return {
        id: `c_${ch}`,
        chapterNo: String(ch).startsWith('topic:') ? 'CĐ' : ch,
        theme: CHAPTER_THEME_KEYS[idx % CHAPTER_THEME_KEYS.length],
        title: String(ch).startsWith('topic:') ? (row.title || 'Chuyên đề ôn thi') : `Chương ${ch}`,
        lessons,
      };
    });
  }, [lessonsList]);

  const dynamicChaptersFiltered = useMemo(() => {
    if (!qLower) return dynamicChapters;
    return dynamicChapters
      .map((ch) => ({
        ...ch,
        lessons: (ch.lessons || []).filter((l) => (l.title || '').toLowerCase().includes(qLower)),
      }))
      .filter((ch) => ch.lessons.length > 0);
  }, [dynamicChapters, qLower]);

  const progressByLessonId = useMemo(() => {
    const m = new Map();
    lessonsEnriched.forEach((l) => m.set(l.id, l.progress));
    return m;
  }, [lessonsEnriched]);

  const highlightLessonId = currentFiltered[0]?.id || currentLessons[0]?.id || null;

  const roadmapChapterByKey = useMemo(() => {
    const m = new Map();
    roadmapChapters.forEach((r) => m.set(String(r.chapter), r));
    return m;
  }, [roadmapChapters]);

  const renderUnifiedChapters = () => (
    <div className="mt-2">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-900 text-white flex items-center justify-center shadow-lg shadow-teal-900/20 shrink-0">
            <Compass className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Lộ trình theo chương</h2>
            <p className="text-slate-600 text-sm mt-1 max-w-2xl leading-relaxed">
              Mỗi thẻ là một chương: tiến độ chương (trung bình các bài), số bài đã đạt 100%, rồi đến từng bài — bài đang được ưu tiên có viền teal.
            </p>
          </div>
        </div>
      </div>
      {dynamicChaptersFiltered.length === 0 ? (
        <p className="text-slate-500 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center">
          Chưa có bài học hoặc không khớp tìm kiếm.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {dynamicChaptersFiltered.map((chapter) => {
            const theme = CHAPTER_THEMES[chapter.theme] || CHAPTER_THEMES.blue;
            const rm = roadmapChapterByKey.get(String(chapter.chapterNo)) || {
              progress: 0,
              total: chapter.lessons.length,
              done: 0,
            };
            return (
              <div
                key={chapter.id}
                className={`bg-white rounded-3xl shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col border border-slate-200/80 ${theme.shadow}`}
              >
                <div className={`relative p-7 md:p-8 bg-gradient-to-br ${theme.gradient} flex items-start justify-between gap-4 overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                  <div className="absolute bottom-0 left-0 w-28 h-28 bg-black/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4" />
                  <div className="relative z-10 flex-1 min-w-0">
                    <span className="text-xs font-black text-white/85 uppercase tracking-[0.2em] mb-2 block">
                      Chương {chapter.chapterNo}
                    </span>
                    <h3 className="text-2xl md:text-[1.65rem] font-black text-white leading-tight drop-shadow-md">
                      {chapter.title}
                    </h3>
                    <p className="text-white/85 text-sm mt-2 font-medium">
                      {rm.done}/{rm.total} bài đạt 100% tiến độ
                    </p>
                  </div>
                  <div className="relative z-10 w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/35 flex items-center justify-center text-white shrink-0 shadow-md">
                    <BookMarked className="w-7 h-7" />
                  </div>
                </div>

                <div className="px-5 py-4 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-2">
                    <span>Tiến độ chương (trung bình)</span>
                    <span className="tabular-nums text-teal-700">{rm.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-2.5 rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-400 transition-all"
                      style={{ width: `${rm.progress}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-start bg-white">
                  {chapter.lessons.map((lesson) => {
                    const prog = progressByLessonId.get(lesson.id) ?? 0;
                    const isHi = lesson.id === highlightLessonId;
                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => onSelectLesson && onSelectLesson(lesson.id)}
                        className={`w-full text-left px-4 py-3.5 text-sm font-bold rounded-2xl transition-all flex flex-col gap-2 group/btn mb-2 last:mb-0 ${theme.hoverLesson} ${
                          isHi
                            ? 'ring-2 ring-teal-500 ring-offset-2 bg-teal-50/80 text-teal-900'
                            : ''
                        }`}
                      >
                        <div className="flex items-center gap-4 w-full">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0 shadow-sm ${theme.iconBg}`}
                          >
                            <PlaySquare className="w-4 h-4 ml-0.5" />
                          </div>
                          <span className="line-clamp-2 leading-relaxed flex-1">{lesson.title}</span>
                          <ChevronRight
                            className={`w-5 h-5 ml-auto opacity-0 -translate-x-4 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-300 shrink-0 ${theme.arrow}`}
                          />
                        </div>
                        <div className="pl-[52px] pr-2 w-full">
                          <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 mb-0.5">
                            <span>{isHi ? 'Bạn đang học' : 'Tiến độ'}</span>
                            <span>{prog}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                            <div
                              className={`h-1 rounded-full ${prog >= 100 ? 'bg-emerald-500' : 'bg-teal-500'}`}
                              style={{ width: `${prog}%` }}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderHistoryTableContent = () => (
    <div className="max-w-full min-w-0 overflow-x-auto">
      <table className="w-full min-w-0 text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-slate-600">
            <th className="p-4 font-semibold">Ngày</th>
            <th className="p-4 font-semibold">Đề</th>
            <th className="p-4 font-semibold">Điểm</th>
            <th className="p-4 font-semibold">EXP</th>
          </tr>
        </thead>
        <tbody>
          {myScores.length === 0 ? (
            <tr>
              <td colSpan={4} className="p-8 text-center text-slate-500">
                Chưa có lần làm bài nào. Hãy chọn một đề ở tab Khám phá đề.
              </td>
            </tr>
          ) : (
            myScores.map((row, i) => (
              <tr key={`${row._ts}-${i}`} className="border-t border-slate-100 hover:bg-slate-50/80">
                <td className="p-4 text-slate-600 whitespace-nowrap">{formatDate(row.timestamp)}</td>
                <td className="p-4 font-medium text-slate-900 break-words max-w-[min(100%,28rem)]">{row.quizTitle || '—'}</td>
                <td className="p-4">{row.score != null ? String(row.score) : '—'}</td>
                <td className="p-4 font-semibold text-amber-700">+{row._exp}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const examTabBtn = (active, onClick, label, compact) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
        active
          ? compact
            ? 'bg-white/20 text-white shadow-md'
            : 'bg-white text-indigo-700 shadow-md'
          : compact
            ? 'text-violet-100/85 hover:bg-white/15'
            : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {label}
    </button>
  );

  const renderExamCardPremium = (exam) => {
    const diff = examDifficultyPill(exam.exam_type);
    return (
      <div
        className="bg-white rounded-2xl border border-slate-100 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 p-6 flex flex-col h-full"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-700">Toán học</span>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 max-w-[50%] text-right truncate">
            {examTypeLabel(exam.exam_type)}
          </span>
        </div>
        <h3 className="font-bold text-lg text-slate-900 leading-snug mb-2 line-clamp-2">{exam.title}</h3>
        <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-1">{examSubtitle(exam)}</p>
        <div className="flex flex-wrap gap-4 text-xs text-slate-600 mb-5">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            {exam.duration}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ListOrdered className="w-3.5 h-3.5 text-indigo-500" />
            {exam.questionCount || 0} câu
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            Khối {rosterGrade}
          </span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3 mt-auto pt-2 border-t border-slate-100">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${diff.className}`}>{diff.text}</span>
          <button
            type="button"
            onClick={() => onSelectQuiz && onSelectQuiz(exam.id)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors shadow-md"
          >
            <PlayCircle className="w-4 h-4" />
            Bắt đầu thi
          </button>
        </div>
      </div>
    );
  };

  const renderExamsRoom = () => (
    <div className="space-y-8 pb-8">
      <div className="relative rounded-[2rem] overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-900 text-white p-8 md:p-10 shadow-2xl shadow-indigo-900/25">
        <div className="absolute inset-0 opacity-[0.12] bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
        <div className="relative z-10">
          <p className="text-indigo-200 text-xs font-black uppercase tracking-[0.2em] mb-2">Phòng thi · Đang xem khối {rosterGrade}</p>
          <h1 className="font-display text-3xl md:text-4xl font-black mb-3 tracking-tight">Sẵn sàng chinh phục bài thi tiếp theo?</h1>
          <p className="text-indigo-100/95 max-w-2xl leading-relaxed">
            Luyện đề theo chương, giữa kỳ, cuối kỳ — theo dõi lịch sử và EXP ngay trong mục này.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mt-8">
            <div className="rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">Đã hoàn thành</p>
              <p className="text-3xl font-black mt-1 tabular-nums">
                {myScores.length} <span className="text-lg font-bold text-indigo-100">đề thi</span>
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">Điểm trung bình</p>
              <p className="text-3xl font-black mt-1 tabular-nums">
                {avgScore != null ? `${avgScore}` : '—'}
                {avgScore != null && <span className="text-lg font-bold text-indigo-100"> / 10</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 w-fit">
          {examTabBtn(examPanelView === 'browse', () => goToExamPanelView('browse'), 'Khám phá đề', false)}
          {examTabBtn(
            examPanelView === 'history',
            () => goToExamPanelView('history'),
            'Lịch sử làm bài',
            false
          )}
        </div>
        {examPanelView === 'browse' && (
          <div className="flex flex-wrap gap-2">
            {filterChips.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setExamTypeFilter(c.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                  examTypeFilter === c.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {examPanelView === 'browse' && (
        <>
          {examsFiltered.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 p-12 text-center text-slate-600">
              <p className="font-bold text-slate-800 mb-1">Không có đề phù hợp</p>
              <p className="text-sm">Đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {examsFiltered.map((exam) => (
                <div key={exam.id}>{renderExamCardPremium(exam)}</div>
              ))}
            </div>
          )}
        </>
      )}

      {examPanelView === 'history' && (
        <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/40 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h2 className="text-xl font-black text-slate-900">Lịch sử làm bài</h2>
            <p className="text-sm text-slate-500 mt-1">EXP = điểm × 15 mỗi lần nộp</p>
          </div>
          {renderHistoryTableContent()}
        </div>
      )}
    </div>
  );

  const renderExamPanel = (compact = false, mainColumn = false) => (
    <div
      className={`rounded-3xl border shadow-sm overflow-hidden ${
        compact
          ? 'bg-gradient-to-br from-indigo-600 via-violet-700 to-purple-800 text-white border-white/20 shadow-violet-900/30'
          : 'bg-white border-slate-100'
      }`}
    >
      <div className={`p-4 sm:p-5 ${compact ? '' : 'border-b border-slate-100'}`}>
        {compact && (
          <p className="flex items-center gap-2 text-[11px] sm:text-xs font-black uppercase tracking-wide text-amber-300/95 mb-3">
            <Trophy className="w-5 h-5 text-amber-400 shrink-0 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
            Cùng thử sức với các đề thi và kiểm tra!
          </p>
        )}
        <div className="mb-3">
          <h3 className={`text-lg font-bold ${compact ? 'text-white' : 'text-slate-900'}`}>Đề thi & Kiểm tra</h3>
          <p className={`text-sm mt-1 ${compact ? 'text-indigo-200/90' : 'text-slate-500'}`}>
            Đề mới và lịch sử — lọc theo độ khó (sao) do giáo viên gán
          </p>
        </div>
        <div className={`flex rounded-xl p-1 gap-1 mb-3 ${compact ? 'bg-indigo-950/40' : 'bg-slate-100'}`}>
          {examTabBtn(examPanelView === 'browse', () => goToExamPanelView('browse'), 'Đề thi', compact)}
          {examTabBtn(examPanelView === 'history', () => goToExamPanelView('history'), 'Lịch sử', compact)}
        </div>
        {examPanelView === 'browse' && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {filterChips.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setExamTypeFilter(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    examTypeFilter === c.id
                      ? compact
                        ? 'bg-amber-400 text-slate-900 shadow-md shadow-amber-500/20'
                        : 'bg-blue-600 text-white'
                      : compact
                        ? 'bg-white/10 text-indigo-100 hover:bg-white/15'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:items-center sm:justify-end">
              <label className={`flex items-center gap-2 text-[11px] font-bold ${compact ? 'text-indigo-200' : 'text-slate-600'}`}>
                <span className="shrink-0">Sắp xếp:</span>
                <select
                  value={examSortBy}
                  onChange={(e) => setExamSortBy(e.target.value)}
                  className={`text-xs font-bold rounded-xl px-2.5 py-2 border min-w-[200px] ${
                    compact
                      ? 'border-white/25 bg-indigo-950/45 text-white'
                      : 'border-slate-200 bg-white text-slate-800'
                  }`}
                >
                  <option value="newest">Mới nhất (cập nhật gần đây)</option>
                  <option value="oldest">Cũ nhất</option>
                  <option value="easy_hard">Dễ → khó (theo sao)</option>
                </select>
              </label>
              <label className={`flex items-center gap-2 text-[11px] font-bold ${compact ? 'text-indigo-200' : 'text-slate-600'}`}>
                <span className="shrink-0">Độ khó:</span>
                <select
                  value={examDifficultyFilter}
                  onChange={(e) => setExamDifficultyFilter(e.target.value)}
                  className={`text-xs font-bold rounded-xl px-2.5 py-2 border min-w-[160px] ${
                    compact
                      ? 'border-white/25 bg-indigo-950/45 text-white'
                      : 'border-slate-200 bg-white text-slate-800'
                  }`}
                >
                  <option value="all">Tất cả</option>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <option key={s} value={String(s)}>
                      {s} sao
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        )}
      </div>
      <div
        className={`p-4 sm:p-5 pt-0 ${
          compact
            ? mainColumn
              ? 'max-h-[min(340px,46vh)] lg:max-h-[min(520px,58vh)] bg-violet-950/25'
              : 'max-h-[min(320px,40vh)] lg:max-h-[min(380px,48vh)] bg-violet-950/25'
            : 'max-h-[480px]'
        } overflow-y-auto`}
      >
        {examPanelView === 'history' ? (
          <div className={`rounded-xl overflow-hidden ${compact ? 'bg-white/5 border border-white/10' : 'border border-slate-100'}`}>
            <table className="w-full text-xs">
              <thead>
                <tr className={`${compact ? 'bg-white/10 text-indigo-200' : 'bg-slate-50 text-slate-600'}`}>
                  <th className="p-2 text-left font-semibold">Ngày</th>
                  <th className="p-2 text-left font-semibold">Đề</th>
                  <th className="p-2 font-semibold">Điểm</th>
                </tr>
              </thead>
              <tbody>
                {myScores.length === 0 ? (
                  <tr>
                    <td colSpan={3} className={`p-4 text-center ${compact ? 'text-indigo-200' : 'text-slate-500'}`}>
                      Chưa có dữ liệu
                    </td>
                  </tr>
                ) : (
                  myScores.slice(0, 6).map((row, i) => (
                    <tr key={`${row._ts}-${i}`} className={`border-t ${compact ? 'border-white/10' : 'border-slate-100'}`}>
                      <td className={`p-2 whitespace-nowrap ${compact ? 'text-indigo-100' : 'text-slate-600'}`}>
                        {formatDate(row.timestamp)}
                      </td>
                      <td className={`p-2 font-medium truncate max-w-[120px] ${compact ? 'text-white' : 'text-slate-900'}`}>
                        {row.quizTitle || '—'}
                      </td>
                      <td className={`p-2 font-bold ${compact ? 'text-amber-300' : 'text-amber-700'}`}>
                        {row.score != null ? String(row.score) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : groupedExams.length === 0 ? (
          <div
            className={`p-4 rounded-2xl border border-dashed ${compact ? 'border-white/20 text-indigo-100' : 'border-slate-200 bg-slate-50 text-slate-600'}`}
          >
            <p className="font-bold mb-1">Không có đề phù hợp</p>
            <p className="text-sm opacity-90">Đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
          </div>
        ) : (
          groupedExams.map((group) => (
            <div key={`${group.exam_type}-${group.chapter}-${group.lesson_no}`} className="space-y-3 mb-4 last:mb-0">
              <div className="flex items-center justify-between">
                <p className={`text-[10px] font-black uppercase tracking-wider ${compact ? 'text-indigo-200' : 'text-slate-500'}`}>
                  {examTypeLabel(group.exam_type)}
                  {group.exam_type === 'lesson' && group.chapter === 'Tổng hợp' ? ' • Đề tổng hợp' : ''}
                  {group.exam_type === 'lesson' && group.chapter !== 'Tổng hợp'
                    ? ` • Chương ${group.chapter} • Bài ${group.lesson_no}`
                    : ''}
                </p>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${compact ? 'bg-white/10 text-indigo-100' : 'text-slate-400 bg-slate-100'}`}
                >
                  {group.exams.length} đề
                </span>
              </div>
              {group.exams.map((exam) => (
                <div
                  key={exam.id}
                  className={`p-4 rounded-2xl border transition-colors ${
                    compact
                      ? 'border-white/10 bg-white/5 hover:border-amber-400/30'
                      : 'border-slate-100 hover:border-blue-200 bg-white hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/40'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-md shrink-0 ${exam.statusColor}`}>{exam.status}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold uppercase ${compact ? 'text-indigo-300/90' : 'text-slate-400'}`}>
                        Độ khó
                      </span>
                      <DifficultyStarsRow value={exam.difficultyStars} compact={compact} />
                      {compact && <Gem className="w-4 h-4 text-rose-400/85 shrink-0" aria-hidden />}
                    </div>
                  </div>
                  <h4 className={`font-bold mb-3 uppercase tracking-tight ${compact ? 'text-white' : 'text-slate-900'}`}>{exam.title}</h4>
                  <div
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${compact ? 'text-indigo-200' : 'text-slate-500'}`}
                  >
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 shrink-0" /> {exam.duration}
                      </span>
                      {exam.questionCount > 0 && (
                        <span className="flex items-center gap-1.5">
                          <ListOrdered className="w-4 h-4 shrink-0" /> {exam.questionCount} câu
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectQuiz && onSelectQuiz(exam.id)}
                      className={`shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                        compact
                          ? 'bg-amber-400 text-slate-900 hover:bg-amber-300 shadow-md'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                      }`}
                    >
                      <PlayCircle className="w-4 h-4" />
                      Bắt đầu làm bài
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
      <div className={`p-4 ${compact ? 'bg-indigo-950/40 border-t border-white/15' : 'border-t border-slate-100'}`}>
        <button
          type="button"
          onClick={() => {
            setExamTypeFilter('all');
            goToTab('exams', { examPanelView: 'browse' });
          }}
          className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
            compact
              ? 'border border-dashed border-white/25 text-indigo-100 hover:border-amber-400/60 hover:text-white'
              : 'border-2 border-dashed border-slate-200 text-slate-500 hover:border-blue-500 hover:text-blue-600'
          }`}
        >
          <Search className="w-4 h-4" />
          Mở phòng thi đầy đủ
        </button>
      </div>
    </div>
  );

  const rankStyle = (rank) => {
    if (rank === 1) return 'from-amber-400 to-orange-500 text-white shadow-amber-500/30';
    if (rank === 2) return 'from-slate-300 to-slate-400 text-white shadow-slate-400/30';
    if (rank === 3) return 'from-amber-600 to-amber-800 text-amber-100 shadow-amber-900/20';
    return 'from-slate-100 to-slate-200 text-slate-700';
  };

  const renderLeaderboardFeatured = () => (
    <div className="flex flex-col flex-1 min-h-[420px] rounded-3xl overflow-hidden border border-amber-200/60 shadow-xl shadow-amber-900/5 bg-gradient-to-b from-amber-50/90 via-white to-slate-50">
      <div className="relative px-6 pt-6 pb-4 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shrink-0">
        <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.35\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/80">Top 5 học sinh</p>
            <h3 className="text-2xl font-black mt-1 flex items-center gap-2">
              <Crown className="w-7 h-7 text-amber-200" />
              Bảng xếp hạng
            </h3>
            <p className="text-sm text-white/90 mt-1">Khối {rosterGrade} · theo tổng EXP</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-white/80">Vị trí của bạn</p>
            <p className="text-3xl font-black">{myRank ? `#${myRank}` : '—'}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-4 py-5 gap-3 min-h-0">
        {topFive.length === 0 ? (
          <div className="flex-1 flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/80 p-8 text-center text-slate-500 text-sm">
            Chưa có dữ liệu EXP. Làm đề để xuất hiện trên bảng.
          </div>
        ) : (
          Array.from({ length: 5 }).map((_, slot) => {
            const r = topFive[slot];
            if (!r) {
              return (
                <div
                  key={`slot-${slot}`}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3.5 border border-dashed border-slate-200/80 bg-slate-50/50 text-slate-400"
                >
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 bg-slate-100">
                    {slot + 1}
                  </div>
                  <div className="flex-1 text-sm font-medium italic">Chờ thêm học sinh</div>
                  <div className="text-right text-xs">—</div>
                </div>
              );
            }
            const isMe = r.name === (studentName || '').trim();
            return (
              <div
                key={r.name}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 border transition-all ${
                  isMe
                    ? 'bg-gradient-to-r from-amber-100/90 to-orange-50 border-amber-400 ring-2 ring-amber-400/40 shadow-md'
                    : 'bg-white border-slate-100 hover:border-amber-200/80 hover:shadow-md'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 bg-gradient-to-br shadow-lg ${rankStyle(r.rank)}`}
                >
                  {r.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold truncate ${isMe ? 'text-amber-950' : 'text-slate-900'}`}>
                    {r.name}
                    {isMe && (
                      <span className="ml-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white">
                        Bạn
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">{r.attempts} lần làm bài</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-black text-amber-700 tabular-nums">{r.totalExp.toLocaleString('vi-VN')}</p>
                  <p className="text-[10px] font-bold uppercase text-slate-400">EXP</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="px-4 pb-4 shrink-0">
        <button
          type="button"
          onClick={() => goToTab('reports')}
          className="w-full py-3 rounded-2xl font-semibold text-sm bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
        >
          <Medal className="w-4 h-4" />
          Xem chi tiết và báo cáo EXP
        </button>
      </div>
    </div>
  );

  const renderLeaderboard = () => (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Medal className="w-6 h-6 text-amber-500" />
        <h3 className="text-lg font-bold text-slate-900">Bảng xếp hạng (EXP)</h3>
      </div>
      <p className="text-sm text-slate-500 mb-4">Khối {rosterGrade} — tổng EXP từ mọi lần làm bài</p>
      <ul className="space-y-2 max-h-72 overflow-y-auto">
        {leaderboard.length === 0 ? (
          <li className="text-slate-500 text-sm">Chưa có dữ liệu xếp hạng.</li>
        ) : (
          leaderboard.slice(0, 15).map((r) => (
            <li
              key={r.name}
              className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                r.name === (studentName || '').trim() ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="font-black text-slate-400 w-6">#{r.rank}</span>
                <span className="font-medium text-slate-900">{r.name}</span>
              </span>
              <span className="font-bold text-amber-700">{r.totalExp.toLocaleString('vi-VN')} EXP</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );

  const closeMobileNav = () => setMobileNavOpen(false);

  const topicsImmersive = activeTab === 'topics' && reviewOnTapImmersive;

  return (
    <div className="flex h-screen w-full min-w-0 max-w-[100vw] overflow-x-hidden bg-slate-50 font-sans text-slate-800 leading-relaxed">
      {mobileNavOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="Menu điều hướng">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
            aria-label="Đóng menu"
            onClick={closeMobileNav}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-[min(17rem,88vw)] bg-white shadow-2xl flex flex-col border-r border-slate-200 animate-[slideIn_0.2s_ease-out]">
            <style>{`@keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>
            <div className="p-4 flex items-center justify-between border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shrink-0">
                  T
                </div>
                <span className="font-bold text-lg text-slate-900 truncate">Lớp Toán</span>
              </div>
              <button
                type="button"
                onClick={closeMobileNav}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Đóng"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              <NavItem
                icon={LayoutDashboard}
                label="Tổng quan"
                active={activeTab === 'dashboard'}
                onClick={() => {
                  goToTab('dashboard');
                  closeMobileNav();
                }}
              />
              <NavItem
                icon={BookOpen}
                label="Bài học"
                active={activeTab === 'lessons'}
                onClick={() => {
                  goToTab('lessons');
                  closeMobileNav();
                }}
              />
              <NavItem
                icon={BookMarked}
                label="Chuyên đề ôn thi"
                active={activeTab === 'topics'}
                onClick={() => {
                  goToTab('topics');
                  closeMobileNav();
                }}
              />
              {String(rosterGrade || '').trim() === '9' && (
                <NavItem
                  icon={BrainCircuit}
                  label="Sơ đồ Hình 9"
                  active={activeTab === 'mindmap'}
                  onClick={() => {
                    goToTab('mindmap');
                    closeMobileNav();
                  }}
                />
              )}
              <NavItem
                icon={FileText}
                label="Đề thi & Kiểm tra"
                active={activeTab === 'exams'}
                onClick={() => {
                  goToTab('exams');
                  closeMobileNav();
                }}
              />
              <NavItem
                icon={Trophy}
                label="Bảng xếp hạng"
                active={activeTab === 'reports'}
                onClick={() => {
                  goToTab('reports');
                  closeMobileNav();
                }}
              />
            </nav>
            <div className="p-3 border-t border-slate-200 shrink-0 space-y-1">
              <NavItem
                icon={Settings}
                label="Cài đặt"
                active={activeTab === 'settings'}
                onClick={() => {
                  goToTab('settings');
                  closeMobileNav();
                }}
              />
              <NavItem
                icon={LogOut}
                label="Đăng xuất"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => {
                  closeMobileNav();
                  onLogout();
                }}
              />
            </div>
          </aside>
        </div>
      )}

      <aside className={`w-64 bg-white border-r border-slate-200 ${topicsImmersive ? 'hidden' : 'hidden md:flex'} flex-col`}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
            T
          </div>
          <span className="font-bold text-xl text-slate-900">Lớp Toán</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 pt-4">
          <NavItem icon={LayoutDashboard} label="Tổng quan" active={activeTab === 'dashboard'} onClick={() => goToTab('dashboard')} />
          <NavItem icon={BookOpen} label="Bài học" active={activeTab === 'lessons'} onClick={() => goToTab('lessons')} />
          <NavItem icon={BookMarked} label="Chuyên đề ôn thi" active={activeTab === 'topics'} onClick={() => goToTab('topics')} />
          {String(rosterGrade || '').trim() === '9' && (
            <NavItem
              icon={BrainCircuit}
              label="Sơ đồ Hình 9"
              active={activeTab === 'mindmap'}
              onClick={() => goToTab('mindmap')}
            />
          )}
          <NavItem
            icon={FileText}
            label="Đề thi & Kiểm tra"
            active={activeTab === 'exams'}
            onClick={() => goToTab('exams')}
          />
          <NavItem icon={Trophy} label="Bảng xếp hạng" active={activeTab === 'reports'} onClick={() => goToTab('reports')} />
        </nav>

        <div className="p-4 border-t border-slate-200">
          <NavItem icon={Settings} label="Cài đặt" onClick={() => goToTab('settings')} active={activeTab === 'settings'} />
          <NavItem icon={LogOut} label="Đăng xuất" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={onLogout} />
        </div>
      </aside>

      <main
        className={`flex-1 flex flex-col min-w-0 overflow-hidden ${
          topicsImmersive ? 'bg-[#256b78]' : ''
        }`}
      >
        <header className={`${topicsImmersive ? 'hidden' : 'h-20'} bg-white border-b border-slate-200 shrink-0`}>
          <div className="h-full w-full max-w-7xl mx-auto px-3 sm:px-6 md:px-8 flex items-center justify-between gap-2 sm:gap-4">
            <button
              type="button"
              className="md:hidden shrink-0 p-2.5 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200/80"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Mở menu điều hướng"
              aria-expanded={mobileNavOpen}
            >
              <Menu className="w-6 h-6" />
            </button>
            <BackButton
              variant="icon"
              title="Quay lại"
              className={`shrink-0 ${navCanGoBack ? '' : 'invisible pointer-events-none'}`}
              onBack={handleDashboardBack}
            />
            <div className="flex items-center flex-1 min-w-0 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm bài học, tên đề thi..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-lg focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-6 shrink-0">
              <button type="button" className="relative p-2 text-slate-500 hover:text-slate-700 transition-colors" aria-label="Thông báo">
                <Bell className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-2 sm:gap-3 border-l border-slate-200 pl-3 sm:pl-6">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-slate-900">{studentName || 'Học sinh'}</p>
                  <p className="text-xs text-slate-500">
                    Lớp {studentClass || '—'} · Khối học {rosterGrade}
                  </p>
                </div>
                <img
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(studentName || 'hs')}`}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Giống header: một khung max-w-7xl, padding nằm TRONG — không padding ngoài để độ rộng cột khớp mọi tab */}
        <div
          className={`flex-1 min-h-0 min-w-0 overflow-x-hidden [scrollbar-gutter:stable] ${
            topicsImmersive ? 'overflow-hidden py-0 flex flex-col' : 'overflow-y-auto py-6 md:py-8'
          }`}
        >
          <div
            className={`w-full min-w-0 box-border ${
              topicsImmersive
                ? 'max-w-none mx-0 h-full min-h-0 flex flex-col px-3 sm:px-4 md:px-6'
                : 'max-w-7xl mx-auto px-4 sm:px-6 md:px-8'
            }`}
          >
          {activeTab === 'settings' && (
            <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Cài đặt</h2>
              <p className="text-slate-600 text-sm mb-6">Phiên bản đơn giản: tài khoản lấy từ danh sách lớp. Liên hệ giáo viên nếu cần đổi tên hoặc khối.</p>
              <button
                type="button"
                onClick={() => goToTab('dashboard')}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
              >
                Về tổng quan
              </button>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <>
              <div className="mb-8">
                <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900 mb-1">Chào {studentName}! 👋</h1>
                <p className="text-slate-500 text-sm">Nhiệm vụ · đề luyện · bảng xếp hạng — một trang.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                {statCardsRow.map((stat, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow min-h-[110px]"
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${stat.bgColor} ${stat.color}`}>
                      <stat.icon className="w-7 h-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{stat.value}</p>
                      {idx === 3 && (
                        <p className="text-[11px] text-slate-400 mt-1">Theo EXP · Khối {rosterGrade}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {String(rosterGrade || '').trim() === '9' && (
                <button
                  type="button"
                  onClick={() => goToTab('mindmap')}
                  className="group mb-8 w-full text-left rounded-3xl overflow-hidden shadow-2xl shadow-cyan-500/20 border border-cyan-400/40 bg-gradient-to-r from-slate-900 via-cyan-900 to-emerald-900 p-1 transition-transform hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/60"
                >
                  <div className="rounded-[1.35rem] bg-gradient-to-br from-cyan-500/90 via-teal-600/95 to-emerald-700/95 px-6 py-7 sm:px-8 sm:py-9 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 relative">
                    <div className="absolute inset-0 opacity-25 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,white,transparent_45%),radial-gradient(circle_at_80%_60%,#a7f3d0,transparent_40%)]" />
                    <div className="relative z-10 min-w-0 flex-1">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100/90 mb-2">Toán 9 · Hình học</p>
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight drop-shadow-md">
                        Luyện trí thông minh hình học với sơ đồ tư duy ngược
                      </h2>
                      <p className="mt-3 text-sm text-cyan-50/95 max-w-2xl leading-relaxed">
                        Ẩn/hiện từng nhánh — kéo thả và thu phóng sơ đồ — ôn chủ động như Active Recall.
                      </p>
                    </div>
                    <div className="relative z-10 shrink-0 flex items-center gap-3">
                      <span className="hidden sm:flex h-14 w-14 rounded-2xl bg-white/15 border border-white/30 items-center justify-center backdrop-blur-sm">
                        <BrainCircuit className="w-8 h-8 text-white" aria-hidden />
                      </span>
                      <span className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-teal-900 font-black text-sm shadow-lg group-hover:bg-cyan-50 transition-colors">
                        Vào luyện tập
                        <ChevronRight className="w-5 h-5" />
                      </span>
                    </div>
                  </div>
                </button>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                <div className="lg:col-span-8 xl:col-span-9 space-y-6 lg:space-y-8 min-w-0">
                  <div className="rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-600 p-6 sm:p-8 md:p-9 text-white shadow-xl shadow-violet-500/35 relative overflow-hidden border border-white/25">
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-fuchsia-400/20" />
                    <div
                      className="pointer-events-none absolute inset-0 opacity-[0.35]"
                      style={{
                        backgroundImage:
                          'radial-gradient(1.5px 1.5px at 12px 18px, rgba(255,255,255,0.55), transparent), radial-gradient(1px 1px at 40px 72px, rgba(221,214,254,0.65), transparent), radial-gradient(1px 1px at 88px 32px, rgba(255,255,255,0.35), transparent)',
                        backgroundSize: '72px 88px',
                      }}
                    />
                    <div className="absolute top-0 right-0 w-[28rem] h-[28rem] bg-fuchsia-300/25 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-400/22 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />
                    <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-8">
                      <div className="min-w-0 flex-1 lg:order-1">
                        <h2 className="font-black text-2xl sm:text-3xl lg:text-[1.85rem] xl:text-4xl leading-[1.12] mb-3">
                          <span className="bg-gradient-to-r from-amber-200 via-white to-cyan-200 bg-clip-text text-transparent [filter:drop-shadow(0_0_20px_rgba(251,191,36,0.35))]">
                            Nhiệm vụ học tập{' '}
                          </span>
                          <span className="bg-gradient-to-r from-cyan-200 to-sky-300 bg-clip-text text-transparent [filter:drop-shadow(0_0_18px_rgba(34,211,238,0.45))]">
                            hôm nay
                          </span>
                        </h2>
                        <h3 className="text-base sm:text-lg md:text-xl font-black text-white/95 mb-1.5 line-clamp-2 leading-snug">
                          {todayLearningMission.headline}
                        </h3>
                        <p className="text-indigo-100/90 text-xs sm:text-sm font-medium mb-2">{todayLearningMission.chapterLine}</p>
                        {todayLearningMission.punchLine && (
                          <p className="text-sm font-bold text-white mb-3 leading-snug max-w-xl [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
                            {/^Hôm nay/i.test(todayLearningMission.punchLine) ? (
                              <>
                                <span className="text-amber-300">Hôm nay: </span>
                                {todayLearningMission.punchLine.replace(/^Hôm nay:\s*/i, '')}
                              </>
                            ) : (
                              todayLearningMission.punchLine
                            )}
                          </p>
                        )}
                        {todayLearningMission.kind === 'lesson' && todayLearningMission.progressPercent < 100 && (
                          <div className="mb-3 max-w-md">
                            <div className="flex justify-between text-[10px] font-bold text-cyan-100/90 mb-1">
                              <span>Tiến độ</span>
                              <span>{todayLearningMission.progressPercent}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-indigo-950/40 border border-white/25 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 shadow-[0_0_10px_rgba(251,191,36,0.55)] transition-all duration-500"
                                style={{ width: `${todayLearningMission.progressPercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                        <div className="mt-5 flex flex-col sm:flex-row flex-wrap gap-2.5">
                          <button
                            type="button"
                            onClick={todayLearningMission.onPrimary}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-black text-slate-900 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:via-orange-400 hover:to-rose-400 shadow-[0_4px_20px_rgba(249,115,22,0.35)] border-t border-white/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                          >
                            <Gem className="w-5 h-5 shrink-0" />
                            {todayLearningMission.ctaLabel}
                            <ChevronRight className="w-4 h-4 shrink-0 opacity-90" />
                          </button>
                          {todayLearningMission.ctaSecondaryLabel && todayLearningMission.onSecondary && (
                            <button
                              type="button"
                              onClick={todayLearningMission.onSecondary}
                              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold border border-cyan-400/45 text-cyan-100 hover:bg-cyan-500/10 transition-colors"
                            >
                              <BookOpen className="w-4 h-4" />
                              {todayLearningMission.ctaSecondaryLabel}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="hidden lg:flex justify-center lg:justify-end shrink-0 w-full lg:w-auto lg:max-w-[min(42%,280px)] lg:order-2">
                        <div className="relative w-[min(100%,240px)] sm:w-[min(100%,260px)] lg:w-[220px] xl:w-[260px]">
                          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-fuchsia-400/35 via-indigo-400/22 to-violet-600/28 blur-2xl scale-110 opacity-90" aria-hidden />
                          <picture>
                            <source srcSet="/images/anh-phi-hanh-gia-banner.webp" type="image/webp" />
                            <img
                              src={`/images/${encodeURIComponent('anh phi hành gia.png')}`}
                              alt=""
                              className="relative w-full h-auto object-contain drop-shadow-[0_10px_36px_rgba(139,92,246,0.35)]"
                              width={260}
                              height={228}
                              decoding="async"
                              fetchPriority="high"
                            />
                          </picture>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0">{renderExamPanel(true, true)}</div>
                </div>

                <aside className="lg:col-span-4 xl:col-span-3 min-w-0 lg:sticky lg:top-24 lg:self-start">
                  {renderLeaderboardFeatured()}
                </aside>
              </div>
            </>
          )}

          {activeTab === 'lessons' && (
            <div className="text-slate-800">
              <div>
                <div className="bg-gradient-to-br from-teal-600 to-teal-900 rounded-3xl p-8 md:p-10 text-white shadow-xl shadow-teal-900/15 mb-10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                  <div className="relative z-10">
                    <span className="inline-block px-4 py-1.5 bg-white/10 rounded-full text-xs font-black mb-4 backdrop-blur-md border border-white/20 uppercase tracking-widest text-teal-100">
                      Khóa học · Khối {rosterGrade}
                    </span>
                    <h1 className="font-display text-3xl md:text-4xl font-black mb-3 tracking-tight">Bài học theo chương</h1>
                    <p className="text-teal-50/95 text-base max-w-2xl leading-relaxed">
                      Tiến độ chương và từng bài nằm trong cùng một thẻ — bài đang học có viền teal.
                    </p>
                  </div>
                </div>

                {renderUnifiedChapters()}
              </div>
            </div>
          )}

          <div className={activeTab === 'topics' ? (topicsImmersive ? 'flex flex-col flex-1 min-h-0' : '') : 'hidden'}>
              <ChuyenDeOnTapStudentFlow
                reviewCoursesList={reviewCoursesList}
                reviewProgressList={reviewProgressList}
                rosterGrade={rosterGrade}
                studentName={studentName}
                onReviewOnTapExp={onReviewOnTapExp}
                onSaveReviewProgress={onSaveReviewProgress}
                onSelectQuiz={onSelectQuiz}
                onImmersiveChange={setReviewOnTapImmersive}
                onBeforeNavigate={pushNavHistory}
                navBridgeRef={topicsNavBridgeRef}
              />
          </div>

          <div className={activeTab === 'mindmap' ? '' : 'hidden'}>
            <StudentMindMapFlow
              mindMapCategories={mindMapCategories}
              rosterGrade={rosterGrade}
              onExitToDashboard={() => goToTab('dashboard')}
              onBeforeNavigate={pushNavHistory}
              navBridgeRef={mindmapNavBridgeRef}
            />
          </div>

          {activeTab === 'exams' && renderExamsRoom()}

          {activeTab === 'reports' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                <h2 className="text-xl font-bold text-slate-900 mb-2">Tóm tắt EXP</h2>
                <p className="text-slate-600 text-sm mb-4">
                  EXP = điểm mỗi lần làm × 15 (làm nhiều đề, EXP càng cao — vui lòng cạnh tranh lành mạnh).
                </p>
                <p className="text-4xl font-black text-amber-600">{totalExp.toLocaleString('vi-VN')}</p>
                <p className="text-sm text-slate-500 mt-2">Tổng từ {myScores.length} lần nộp bài</p>
                <button
                  type="button"
                  onClick={() => goToTab('exams', { examPanelView: 'history' })}
                  className="mt-6 text-blue-600 font-semibold hover:underline flex items-center gap-1"
                >
                  Xem lịch sử chi tiết <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              {renderLeaderboard()}
            </div>
          )}
          </div>
        </div>
      </main>
    </div>
  );
});

export default StudentDashboardScreen;

function NavItem({ icon: Icon, label, active, onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
        active ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      } ${className}`}
    >
      <Icon className={`w-5 h-5 ${active ? 'text-blue-600' : ''}`} />
      {label}
    </button>
  );
}
