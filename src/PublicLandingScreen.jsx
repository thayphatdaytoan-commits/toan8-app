/* eslint-disable */
import React, { useState, useRef, useEffect } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Menu,
  Search,
  Lightbulb,
  Target,
  CheckCircle2,
  XCircle,
  PlaySquare,
  FileText,
  Trophy,
  User,
  Info,
  Home,
  ArrowLeft,
  BookMarked,
  Compass,
  Calculator,
  ArrowRight,
  GraduationCap,
  Phone,
  MonitorPlay,
} from 'lucide-react';

/** Khối công khai: 6 → 12 (bỏ lớp 5) */
const PUBLIC_GRADES = ['6', '7', '8', '9', '10', '11', '12'];
/** Khối nhấn mạnh (ôn thi): 9, 12 */
const GRADE_FOCUS = new Set(['9', '12']);

// ==========================================
// 1. CẤU TRÚC DATABASE MẪU (Dễ dàng thay thế bằng API fetch)
// ==========================================

export default function PublicLandingScreen({
  lessonsList = [],
  quizzesList = [],
  publicGrade: publicGradeProp,
  onPublicGradeChange,
  onRequestLogin,
  onSelectLesson,
  onSelectQuiz,
  onEnterExam,
}) {
  
  const publicGrade = publicGradeProp || lessonsList[0]?.grade_level || '11';
  const CHAPTER_THEME_KEYS = ['blue', 'purple', 'orange'];
  const parseNum = (v) => {
    const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  // Group lessons by chapter, sort by lesson_no
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
    const na = parseNum(a); const nb = parseNum(b);
    if (na !== null && nb !== null) return na - nb;
    return a.localeCompare(b);
  });

  const dynamicChapters = chapterKeys.map((ch, idx) => {
    const row = grouped.get(ch) || { key: ch, title: '', lessons: [] };
    const lessons = row.lessons || [];
    lessons.sort((a, b) => {
      const na = parseNum(a?.lesson_no); const nb = parseNum(b?.lesson_no);
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

  const examTypeLabel = (t) => ({
    lesson: 'Đề theo bài',
    combined: 'Đề tổng hợp',
    midterm: 'Giữa kỳ',
    final: 'Cuối kỳ',
    mock: 'Thi thử',
    entrance: 'Tuyển sinh',
  }[t] || 'Đề thi');

  const normalizedQuizzes = (quizzesList || []).map(q => ({
    id: q.id,
    title: q.title || 'Đề thi',
    duration: q.duration ? `${q.duration} phút` : 'Không giới hạn',
    exam_type: (q?.exam_type || 'lesson').toString().trim(),
    chapter: (q?.chapter ?? '').toString().trim(),
    lesson_no: (q?.lesson_no ?? '').toString().trim(),
  })).sort((a, b) => {
    if (a.exam_type !== b.exam_type) return (a.exam_type || '').localeCompare(b.exam_type || '');
    const ca = parseNum(a.chapter); const cb = parseNum(b.chapter);
    if (ca !== null && cb !== null && ca !== cb) return ca - cb;
    if (a.chapter !== b.chapter) return (a.chapter || '').localeCompare(b.chapter || '');
    const la = parseNum(a.lesson_no); const lb = parseNum(b.lesson_no);
    if (la !== null && lb !== null && la !== lb) return la - lb;
    if (a.lesson_no !== b.lesson_no) return (a.lesson_no || '').localeCompare(b.lesson_no || '');
    return (a.title || '').localeCompare(b.title || '');
  });

  const combinedQuizzes = React.useMemo(
    () => normalizedQuizzes.filter(q => q.exam_type === 'combined'),
    [normalizedQuizzes]
  );

  const practiceGroups = React.useMemo(() => {
    // Only lesson-type quizzes are grouped by Chapter/Bài
    const map = new Map();
    for (const q of normalizedQuizzes.filter(q => q.exam_type === 'lesson')) {
      const ch = (q?.chapter || '').trim() || '0';
      const le = (q?.lesson_no || '').trim() || '0';
      const key = `${ch}|||${le}`;
      if (!map.has(key)) map.set(key, { chapter: ch, lesson_no: le, quizzes: [] });
      map.get(key).quizzes.push(q);
    }
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      const ca = parseNum(a.chapter); const cb = parseNum(b.chapter);
      if (ca !== null && cb !== null && ca !== cb) return ca - cb;
      if (a.chapter !== b.chapter) return (a.chapter || '').localeCompare(b.chapter || '');
      const la = parseNum(a.lesson_no); const lb = parseNum(b.lesson_no);
      if (la !== null && lb !== null && la !== lb) return la - lb;
      if (a.lesson_no !== b.lesson_no) return (a.lesson_no || '').localeCompare(b.lesson_no || '');
      return 0;
    });
    return arr;
  }, [normalizedQuizzes]);

  const midtermQuizzes = React.useMemo(
    () => normalizedQuizzes.filter(q => q.exam_type === 'midterm'),
    [normalizedQuizzes]
  );

  const finalQuizzes = React.useMemo(
    () => normalizedQuizzes.filter(q => q.exam_type === 'final'),
    [normalizedQuizzes]
  );

  const [activeLessonId, setActiveLessonId] = useState(null);
  const [activeTab, setActiveTab] = useState("theory"); // 'theory', 'mathTypes', 'practice'
  const [expandedChapters, setExpandedChapters] = useState(() => (dynamicChapters[0]?.id ? [dynamicChapters[0].id] : []));

  /** Khi dữ liệu bài học tải xong (trước đó rỗng), mở chương đầu */
  React.useEffect(() => {
    const firstId = dynamicChapters[0]?.id;
    if (!firstId) return;
    setExpandedChapters((prev) => (prev.length === 0 ? [firstId] : prev));
  }, [lessonsList.length]);
  
  // Trạng thái cho bài kiểm tra
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  /** Menu THCS / THPT trên navbar */
  const [navMenu, setNavMenu] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const navRef = useRef(null);

  /**
   * marketing: hero + thẻ dịch vụ + hotline (trang giới thiệu).
   * grade: chỉ lộ trình bài giảng + phòng thi — gọn khi đã chọn khối (vd. Toán 11).
   */
  const [landingMode, setLandingMode] = useState(() => {
    try {
      const v = sessionStorage.getItem('landingMode');
      if (v === 'grade' || v === 'marketing') return v;
    } catch {
      // ignore
    }
    return 'marketing';
  });

  const goToMarketingHome = () => {
    setActiveLessonId(null);
    setNavMenu(null);
    setMobileSidebarOpen(false);
    try {
      sessionStorage.setItem('landingMode', 'marketing');
    } catch {
      // ignore
    }
    setLandingMode('marketing');
  };

  const enterGradeContentMode = () => {
    try {
      sessionStorage.setItem('landingMode', 'grade');
    } catch {
      // ignore
    }
    setLandingMode('grade');
  };

  useEffect(() => {
    const onDoc = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setNavMenu(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const toggleChapter = (chapterId) => {
    setExpandedChapters(prev => 
      prev.includes(chapterId) ? prev.filter(id => id !== chapterId) : [...prev, chapterId]
    );
  };

  const normalizeLessonContentForUI = (rawContent) => {
    const fallback = {
      theory: { rules: [{ title: "Nội dung", content: "Chưa có nội dung lý thuyết cho bài này." }] },
      mathTypes: [],
      practice: [],
    };

    if (!rawContent) return fallback;

    if (typeof rawContent === 'string') {
      try {
        const parsed = JSON.parse(rawContent);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.examples)) {
          const html = parsed.examples.map((ex) => {
            const exTitle = (ex?.title || '').toString();
            const exDesc = (ex?.desc || '').toString();
            const items = Array.isArray(ex?.items) ? ex.items : [];
            const itemsHtml = items.map((it, idx) => {
              const q = (it?.q || '').toString();
              const steps = Array.isArray(it?.steps) ? it.steps : [];
              const stepsHtml = steps.map(s => `<div>${(s || '').toString()}</div>`).join('');
              return `<div style="margin-top:12px"><div><strong>${String.fromCharCode(97 + (idx % 26))})</strong> ${q}</div><div style="margin-top:6px">${stepsHtml}</div></div>`;
            }).join('');
            return `<div><div style="font-weight:900; margin-bottom:6px">${exTitle}</div>${exDesc ? `<div style="margin-bottom:10px">${exDesc}</div>` : ''}${itemsHtml}</div>`;
          }).join('<hr style="margin:16px 0; border:none; border-top:1px dashed #e2e8f0" />');

          return {
            theory: { rules: [{ title: parsed.title || "Bài giảng", content: html || "Chưa có nội dung." }] },
            mathTypes: [],
            practice: [],
          };
        }
      } catch {
        // ignore JSON parse errors
      }

      return {
        theory: { rules: [{ title: "Lý thuyết", content: rawContent }] },
        mathTypes: [],
        practice: [],
      };
    }

    const normalized = { ...rawContent };
    if (!normalized.theory) normalized.theory = { rules: [] };
    if (!Array.isArray(normalized.theory.rules)) normalized.theory.rules = [];
    if (!Array.isArray(normalized.mathTypes)) normalized.mathTypes = [];
    if (!Array.isArray(normalized.practice)) normalized.practice = [];
    if (normalized.theory.rules.length === 0) normalized.theory.rules = fallback.theory.rules;
    return normalized;
  };
  
  
  // Lấy dữ liệu bài học hiện tại an toàn
  let currentLessonData = null;
  dynamicChapters.forEach(c => {
    const lesson = c.lessons.find(l => l.id === activeLessonId);
    if (lesson) {
        currentLessonData = normalizeLessonContentForUI(lesson.content);
    }
  });


  const handleQuizChange = (qId, value) => {
    if(quizSubmitted) return;
    setQuizAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const submitQuiz = () => {
    let score = 0;
    currentLessonData.practice.forEach(q => {
      if (q.type === 'mcq' && quizAnswers[q.id] === q.correctAnswer) score++;
      if (q.type === 'input' && quizAnswers[q.id]?.toString().trim() === q.correctAnswer) score++;
    });
    setQuizScore(score);
    setQuizSubmitted(true);
  };

  const resetQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
  };

  // Cấu hình bảng màu giao diện cho từng chương
  const selectPublicGrade = (g) => {
    const s = String(g);
    if (!PUBLIC_GRADES.includes(s) || !onPublicGradeChange) return;
    onPublicGradeChange(s);
    setNavMenu(null);
    setMobileSidebarOpen(false);
    enterGradeContentMode();
  };

  const scrollToLoTrinh = () => {
    const el = document.getElementById('lo-trinh');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const CHAPTER_THEMES = {
    blue: {
      gradient: "from-blue-500 to-cyan-400",
      shadow: "shadow-blue-200",
      hoverLesson: "hover:bg-blue-50 text-slate-600 hover:text-blue-700",
      iconBg: "bg-blue-100 text-blue-500 group-hover/btn:bg-blue-500 group-hover/btn:text-white",
      arrow: "text-blue-500"
    },
    purple: {
      gradient: "from-purple-500 to-fuchsia-500",
      shadow: "shadow-purple-200",
      hoverLesson: "hover:bg-purple-50 text-slate-600 hover:text-purple-700",
      iconBg: "bg-purple-100 text-purple-500 group-hover/btn:bg-purple-500 group-hover/btn:text-white",
      arrow: "text-purple-500"
    },
    orange: {
      gradient: "from-orange-500 to-amber-500",
      shadow: "shadow-orange-200",
      hoverLesson: "hover:bg-orange-50 text-slate-600 hover:text-orange-700",
      iconBg: "bg-orange-100 text-orange-500 group-hover/btn:bg-orange-500 group-hover/btn:text-white",
      arrow: "text-orange-500"
    }
  };

  const openLesson = (lessonId) => {
    if (onSelectLesson) return onSelectLesson(lessonId);
    setActiveLessonId(lessonId);
    setActiveTab('theory');
    setMobileSidebarOpen(false);
  };

  const sidebarNav = (
    <div className="flex flex-col h-full min-h-0 bg-white">
      <div className="p-4 border-b border-slate-100 shrink-0">
        <button
          type="button"
          onClick={() => {
            goToMarketingHome();
          }}
          className="w-full text-left rounded-xl p-2 -m-2 hover:bg-slate-50 transition-colors"
        >
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Lớp Toán Thầy Phát</h1>
          <p className="text-xs text-slate-500 mt-1">
            Đang xem: <span className="font-bold text-blue-600">Toán {publicGrade}</span>
          </p>
        </button>
        <p className="text-xs text-slate-400 mt-3 px-1">Chọn khối trên menu Toán THCS / THPT (lớp 6–12)</p>
        {GRADE_FOCUS.has(publicGrade) && (
          <p className="text-xs text-amber-700/90 mt-2 px-1 leading-snug">
            Khối {publicGrade}: lộ trình ôn thi được nhấn mạnh.
          </p>
        )}
      </div>
      <div className="flex-1 py-3 overflow-y-auto">
        {dynamicChapters.map((chapter) => (
          <div key={chapter.id} className="mb-1">
            <button
              type="button"
              onClick={() => toggleChapter(chapter.id)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors text-left rounded-lg"
            >
              <span className="font-semibold text-sm text-slate-800 uppercase tracking-wide">{chapter.title}</span>
              {expandedChapters.includes(chapter.id) ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>
            {expandedChapters.includes(chapter.id) && (
              <div className="bg-slate-50/80 py-1 mx-2 rounded-lg">
                {chapter.lessons.map((lesson) => (
                  <div key={lesson.id}>
                    <button
                      type="button"
                      onClick={() => openLesson(lesson.id)}
                      className={`w-full text-left px-4 py-2 pl-6 text-sm border-l-2 transition-colors rounded-r-lg ${
                        activeLessonId === lesson.id
                          ? 'border-blue-600 bg-blue-50 text-blue-800 font-semibold'
                          : 'border-transparent text-slate-600 hover:bg-white hover:text-slate-900'
                      }`}
                    >
                      {lesson.title}
                    </button>
                    {activeLessonId === lesson.id && currentLessonData && (
                      <div className="pl-10 pr-4 py-2 space-y-1">
                        <button type="button" onClick={() => setActiveTab('theory')} className={`block w-full text-left text-sm py-1.5 flex items-center gap-2 ${activeTab === 'theory' ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'}`}>
                          <BookOpen className="w-3.5 h-3.5" /> Lý thuyết & Ví dụ
                        </button>
                        <button type="button" onClick={() => setActiveTab('mathTypes')} className={`block w-full text-left text-sm py-1.5 flex items-center gap-2 ${activeTab === 'mathTypes' ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'}`}>
                          <Target className="w-3.5 h-3.5" /> Các dạng toán cơ bản
                        </button>
                        <button type="button" onClick={() => setActiveTab('practice')} className={`block w-full text-left text-sm py-1.5 flex items-center gap-2 ${activeTab === 'practice' ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'}`}>
                          <FileText className="w-3.5 h-3.5" /> Đề luyện tập
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-white text-slate-800">
      <header
        ref={navRef}
        className="sticky top-0 z-50 shrink-0 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-sm"
      >
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 -ml-1"
              aria-label="Mở danh sách chương"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => { try { window.history.back(); } catch { /* ignore */ } }}
              title="Quay lại thao tác trước"
              aria-label="Quay lại"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={goToMarketingHome}
              className="flex items-center gap-2 min-w-0 shrink"
            >
              <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-200/50 shrink-0">
                <Calculator className="w-5 h-5 sm:w-6 sm:h-6" />
              </span>
              <span className="font-display font-black text-slate-900 text-base sm:text-lg tracking-tight truncate">thayphatdaytoan</span>
            </button>
          </div>

          <nav className="hidden lg:flex items-center gap-0.5 relative">
            <button
              type="button"
              onClick={goToMarketingHome}
              className={`px-3 py-2 text-sm font-bold rounded-lg ${
                landingMode === 'marketing' ? 'text-blue-600' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Trang chủ
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setNavMenu(navMenu === 'thcs' ? null : 'thcs')}
                className={`px-3 py-2 text-sm font-semibold rounded-lg flex items-center gap-1 ${
                  navMenu === 'thcs' ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Toán THCS <ChevronDown className="w-4 h-4 opacity-70" />
              </button>
              {navMenu === 'thcs' && (
                <div className="absolute left-0 top-full mt-1.5 w-56 rounded-xl bg-white shadow-xl border border-slate-200 py-2 z-[60]">
                  <button
                    type="button"
                    onClick={() => selectPublicGrade('9')}
                    className="w-full text-left px-4 py-2.5 text-sm font-bold text-blue-900 hover:bg-blue-50"
                  >
                    Lớp 9 & Ôn thi 10
                  </button>
                  {['6', '7', '8'].map((g) => (
                    <button
                      key={`thcs-${g}`}
                      type="button"
                      onClick={() => selectPublicGrade(g)}
                      className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      Toán Lớp {g}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setNavMenu(navMenu === 'thpt' ? null : 'thpt')}
                className={`px-3 py-2 text-sm font-semibold rounded-lg flex items-center gap-1 ${
                  navMenu === 'thpt' ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Toán THPT <ChevronDown className="w-4 h-4 opacity-70" />
              </button>
              {navMenu === 'thpt' && (
                <div className="absolute left-0 top-full mt-1.5 w-52 rounded-xl bg-white shadow-xl border border-slate-200 py-2 z-[60]">
                  {['10', '11', '12'].map((g) => (
                    <button
                      key={`thpt-${g}`}
                      type="button"
                      onClick={() => selectPublicGrade(g)}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Toán Lớp {g}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setNavMenu(null);
                if (onEnterExam) onEnterExam();
                else if (onRequestLogin) onRequestLogin();
              }}
              className="px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              Phòng thi Online
            </button>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onRequestLogin && onRequestLogin()}
              className="hidden sm:inline text-sm font-semibold text-slate-600 hover:text-blue-600 px-2"
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => onRequestLogin && onRequestLogin()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] sm:text-xs font-black px-3 sm:px-5 py-2 sm:py-2.5 rounded-full uppercase tracking-wide shadow-md shadow-blue-200/40"
            >
              VÀO HỌC NGAY
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <aside className="hidden md:flex w-72 flex-col shrink-0 overflow-hidden border-r border-slate-200 bg-white">
          {sidebarNav}
        </aside>

        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Đóng"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <aside className="absolute left-0 top-0 bottom-0 w-[min(100%,20rem)] shadow-2xl flex flex-col overflow-hidden">
              {sidebarNav}
            </aside>
          </div>
        )}

        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 min-w-0">
          {activeLessonId && (
            <div className="h-12 sm:h-14 border-b border-slate-200 flex items-center justify-between px-3 sm:px-6 bg-white shrink-0 gap-2">
              <div className="flex items-center gap-2 sm:gap-3 text-slate-500 text-xs sm:text-sm min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveLessonId(null)}
                  className="flex items-center gap-1.5 hover:text-blue-600 transition-colors font-semibold shrink-0"
                >
                  <Home className="w-4 h-4" /> <span className="hidden xs:inline">Trang chủ</span>
                </button>
                <span className="text-slate-300 shrink-0">/</span>
                <span className="font-semibold text-slate-800 line-clamp-1">
                  {dynamicChapters.flatMap((c) => c.lessons).find((l) => l.id === activeLessonId)?.title || 'Chưa chọn bài'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onEnterExam) return onEnterExam();
                  if (onRequestLogin) return onRequestLogin();
                }}
                className="text-slate-600 font-semibold text-xs sm:text-sm border border-slate-300 px-3 py-1.5 rounded-full hover:bg-slate-50 flex items-center gap-1.5 shrink-0"
              >
                <FileText className="w-4 h-4" /> <span className="hidden sm:inline">Phòng thi</span>
              </button>
            </div>
          )}

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 lg:px-20 bg-slate-50">
          {!activeLessonId ? (
            <div className="max-w-6xl mx-auto animate-in fade-in duration-500 px-3 sm:px-0">
              {landingMode === 'marketing' && (
                <>
              {/* HERO — EdTech gradient */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-10 md:mb-14 pt-2">
                <div>
                  <span className="inline-block px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 mb-4 tracking-wide uppercase">
                    CẬP NHẬT GDPT 2018 | TOÁN 9 - 11 - 12
                  </span>
                  <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] font-black text-slate-900 leading-tight tracking-tight mb-4">
                    Học Toán tư duy cùng{' '}
                    <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">thayphatdaytoan</span>
                  </h1>
                  <p className="text-slate-600 text-base sm:text-lg max-w-xl leading-relaxed mb-6">
                    Phát triển năng lực, nắm vững kiến thức cốt lõi và chuẩn bị tốt cho kỳ thi tuyển sinh 10, thi THPT Quốc gia — lộ trình cá nhân hóa theo từng khối (6–12).
                  </p>
                  <div className="flex flex-wrap gap-3 mb-8">
                    <button
                      type="button"
                      onClick={() => {
                        scrollToLoTrinh();
                        setNavMenu(null);
                      }}
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-blue-200/60 transition-all text-sm sm:text-base"
                    >
                      Khám phá khóa học <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (onEnterExam) onEnterExam();
                        else if (onRequestLogin) onRequestLogin();
                      }}
                      className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-800 font-bold px-5 py-3 rounded-2xl hover:bg-slate-50 transition-colors text-sm sm:text-base"
                    >
                      Đề thi mẫu Online
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-6 sm:gap-10 text-sm font-black text-slate-800">
                    <div>
                      <span className="block text-xl sm:text-2xl text-blue-600 tabular-nums">5.000+</span>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wide">Học sinh đã đăng ký</span>
                    </div>
                    <div>
                      <span className="block text-xl sm:text-2xl text-violet-600 tabular-nums">98%</span>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wide">Đạt mục tiêu kỳ thi</span>
                    </div>
                  </div>
                </div>
                <div className="relative min-h-[260px] sm:min-h-[320px] rounded-3xl overflow-hidden shadow-2xl shadow-indigo-200/40 bg-gradient-to-b from-cyan-400 via-blue-600 to-violet-800 p-6 sm:p-8 flex flex-col justify-between">
                  <span className="inline-flex self-start px-3 py-1 rounded-full bg-amber-300/90 text-amber-950 text-xs font-black uppercase tracking-wide">
                    Phương pháp mới
                  </span>
                  <div className="relative z-10 mt-4">
                    <p className="text-white/90 text-xs font-bold uppercase tracking-widest mb-2">TOÁN HỌC</p>
                    <p className="text-2xl sm:text-3xl font-black text-white leading-tight mb-3">thayphatdaytoan</p>
                    <p className="text-white/85 text-sm max-w-sm leading-relaxed">
                      Ôn thi vào 10 & THPT QG: lộ trình theo năng lực, bám sát đề minh họa và phân dạng bài tập.
                    </p>
                  </div>
                  <GraduationCap className="absolute bottom-2 right-2 w-32 h-32 sm:w-40 sm:h-40 text-white/15 pointer-events-none" strokeWidth={1} />
                </div>
              </section>

              {/* 4 thẻ dịch vụ */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                <button
                  type="button"
                  onClick={() => selectPublicGrade('9')}
                  className="text-left rounded-2xl border border-slate-100 bg-slate-50/80 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                    <BookMarked className="w-5 h-5" />
                  </div>
                  <h3 className="font-black text-slate-900 mb-1">Lớp 9 & Ôn thi 10</h3>
                  <p className="text-sm text-slate-600 leading-snug">Nền tảng kiến thức và luyện thi vào 10.</p>
                </button>
                <button
                  type="button"
                  onClick={() => selectPublicGrade('12')}
                  className="text-left rounded-2xl border border-slate-100 bg-slate-50/80 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <h3 className="font-black text-slate-900 mb-1">Luyện thi ĐGNL & Tư duy</h3>
                  <p className="text-sm text-slate-600 leading-snug">Rèn luyện tư duy và dạng bài nâng cao.</p>
                </button>
                <button
                  type="button"
                  onClick={() => selectPublicGrade('12')}
                  className="text-left rounded-2xl border border-slate-100 bg-slate-50/80 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <h3 className="font-black text-slate-900 mb-1">Ôn Thi THPT QG</h3>
                  <p className="text-sm text-slate-600 leading-snug">Ôn luyện theo chương trình và đề thi thử.</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onEnterExam) onEnterExam();
                    else if (onRequestLogin) onRequestLogin();
                  }}
                  className="text-left rounded-2xl bg-blue-600 text-white p-5 hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5 transition-all shadow-lg shadow-blue-200/50"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                    <MonitorPlay className="w-5 h-5" />
                  </div>
                  <h3 className="font-black mb-1">Phòng Thi Online</h3>
                  <p className="text-sm text-white/90 leading-snug">Làm đề có thời gian, chấm và xem lại kết quả.</p>
                </button>
              </section>

              {/* Hotline */}
              <section className="rounded-2xl bg-slate-900 text-white px-4 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Hotline tư vấn 24/7</p>
                    <p className="text-lg sm:text-xl font-black tabular-nums">0968 526 800</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <a
                    href="tel:0968526800"
                    className="inline-flex items-center justify-center rounded-full bg-white text-slate-900 font-bold px-5 py-2.5 text-sm hover:bg-slate-100"
                  >
                    Nhận tư vấn ngay
                  </a>
                  <button
                    type="button"
                    onClick={() => window.open('https://zalo.me/0968526800', '_blank', 'noopener,noreferrer')}
                    className="inline-flex items-center justify-center rounded-full bg-blue-600 text-white font-bold px-5 py-2.5 text-sm border border-blue-500 hover:bg-blue-500"
                  >
                    Chat Zalo
                  </button>
                </div>
              </section>
                </>
              )}

              {/* LỘ TRÌNH HỌC TẬP - DANH SÁCH CHƯƠNG */}
              <div id="lo-trinh" className="flex items-center gap-3 mb-8 scroll-mt-24">
                <Compass className="w-8 h-8 text-orange-500 shrink-0" />
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">Lộ trình học tập — Toán {publicGrade}</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {dynamicChapters.map((chapter, idx) => {
                  // Lấy theme đã định nghĩa, nếu không có lấy mặc định là blue
                  const theme = CHAPTER_THEMES[chapter.theme] || CHAPTER_THEMES.blue;
                  
                  return (
                  <div key={chapter.id} className={`bg-white rounded-3xl shadow-lg hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col border border-slate-100 ${theme.shadow}`}>
                    
                    {/* Header của thẻ Card - Đổ màu gradient nghệ thuật */}
                    <div className={`relative p-7 bg-gradient-to-br ${theme.gradient} flex items-start justify-between gap-4 overflow-hidden`}>
                      {/* Hiệu ứng đốm sáng trang trí */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl translate-y-1/2 -translate-x-1/4"></div>
                      
                      <div className="relative z-10 flex-1">
                        <span className="text-sm font-black text-white/90 uppercase tracking-widest mb-2 block drop-shadow-sm">
                          Chương {chapter.chapterNo}
                        </span>
                        <h3 className="text-2xl font-black text-white leading-snug drop-shadow-md">
                          {chapter.title}
                        </h3>
                      </div>
                      <div className="relative z-10 w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shrink-0 shadow-sm">
                        <BookMarked className="w-6 h-6" />
                      </div>
                    </div>
                    
                    {/* Danh sách bài học */}
                    <div className="p-4 flex-1 flex flex-col justify-start bg-white z-10">
                      {chapter.lessons.map(lesson => (
                        <button
                          key={lesson.id}
                          onClick={() => {
                            if (onSelectLesson) return onSelectLesson(lesson.id);
                            setActiveLessonId(lesson.id);
                            setActiveTab('theory');
                          }}
                          className={`w-full text-left px-4 py-3.5 text-sm font-bold rounded-2xl transition-all flex items-center gap-4 group/btn ${theme.hoverLesson}`}
                        >
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0 shadow-sm ${theme.iconBg}`}>
                            <PlaySquare className="w-4 h-4 ml-0.5" />
                          </div>
                          <span className="line-clamp-2 leading-relaxed flex-1">{lesson.title}</span>
                          <ChevronRight className={`w-5 h-5 ml-auto opacity-0 -translate-x-4 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-300 shrink-0 ${theme.arrow}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                )})}
              </div>

              {/* PHÒNG THI (CHỈ HIỂN THỊ ĐỀ MỤC) */}
              <div className="mt-14">
                <div className="flex items-center justify-between gap-4 mb-8">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Phòng thi</h2>
                  </div>
                  <button
                    onClick={() => onEnterExam && onEnterExam()}
                    className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-7 py-3 rounded-full font-black shadow-lg shadow-blue-200/60 transition-all hover:-translate-y-0.5"
                  >
                    Vào phòng thi
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Đề mục 1 */}
                  <button
                    onClick={() => onEnterExam && onEnterExam()}
                    className="text-left bg-white rounded-3xl border border-slate-100 shadow-sm p-7 hover:shadow-xl hover:-translate-y-1 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Luyện tập</p>
                        <h3 className="text-xl font-black text-slate-900 mb-2">Đề theo chương</h3>
                        <p className="text-sm text-slate-500">Luyện tập theo Chương/Bài (và đề tổng hợp).</p>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <BookOpen className="w-7 h-7" />
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                        {(practiceGroups.length + (combinedQuizzes?.length || 0))} nhóm / {((practiceGroups || []).reduce((s, g) => s + (g?.quizzes?.length || 0), 0) + (combinedQuizzes?.length || 0))} đề
                      </span>
                      <span className="inline-flex items-center gap-2 text-blue-700 font-black text-sm">
                        Xem trong phòng thi <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </button>

                  {/* Đề mục 2 */}
                  <button
                    onClick={() => onEnterExam && onEnterExam()}
                    className="text-left bg-white rounded-3xl border border-slate-100 shadow-sm p-7 hover:shadow-xl hover:-translate-y-1 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Kiểm tra</p>
                        <h3 className="text-xl font-black text-slate-900 mb-2">Đề thi giữa kì</h3>
                        <p className="text-sm text-slate-500">Tổng hợp kiến thức theo học kì.</p>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                        <FileText className="w-7 h-7" />
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                        {midtermQuizzes.length} đề
                      </span>
                      <span className="inline-flex items-center gap-2 text-blue-700 font-black text-sm">
                        Xem trong phòng thi <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </button>

                  {/* Đề mục 3 */}
                  <button
                    onClick={() => onEnterExam && onEnterExam()}
                    className="text-left bg-white rounded-3xl border border-slate-100 shadow-sm p-7 hover:shadow-xl hover:-translate-y-1 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Thi học kì</p>
                        <h3 className="text-xl font-black text-slate-900 mb-2">Đề thi cuối kì</h3>
                        <p className="text-sm text-slate-500">Đề ôn tập và đề thi học kì.</p>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <Trophy className="w-7 h-7" />
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                        {finalQuizzes.length} đề
                      </span>
                      <span className="inline-flex items-center gap-2 text-blue-700 font-black text-sm">
                        Xem trong phòng thi <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ) : currentLessonData ? (
            <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
              
              {/* NÚT QUAY LẠI TRANG CHỦ */}
              <button 
                onClick={() => setActiveLessonId(null)}
                className="mb-8 flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-teal-600 transition-colors bg-white px-5 py-2.5 rounded-full border border-slate-200 shadow-sm hover:shadow-md w-fit"
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại lộ trình học
              </button>

              {/* TABS NAVIGATION */}
              <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-xl mb-8">
                <button 
                  onClick={() => setActiveTab('theory')}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'theory' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Lý thuyết & Ví dụ
                </button>
                <button 
                  onClick={() => setActiveTab('mathTypes')}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'mathTypes' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Các dạng toán cơ bản
                </button>
                <button 
                  onClick={() => setActiveTab('practice')}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'practice' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Đề luyện tập
                </button>
              </div>

              {/* TAB 1: LÝ THUYẾT */}
              {activeTab === 'theory' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  {currentLessonData.theory.rules.map((rule, idx) => (
                    <div key={idx} className="bg-white rounded-2xl border-l-4 border-l-orange-500 border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-6">
                        <h3 className="text-xl font-black text-orange-700 mb-4 flex items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-lg">+</span> 
                          {rule.title}
                        </h3>
                        <p className="text-slate-700 text-lg leading-relaxed mb-6" dangerouslySetInnerHTML={{__html: rule.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}}></p>
                        
                        <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-5">
                          <h4 className="font-bold text-orange-600 mb-2 flex items-center gap-2 text-sm uppercase">
                            <Lightbulb className="w-4 h-4"/> Mở rộng & Dấu hiệu:
                          </h4>
                          <ul className="list-disc list-inside space-y-2 text-slate-700">
                            {rule.note.map((n, i) => <li key={i}>{n}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="pt-4">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">VÍ DỤ MINH HỌA</h3>
                    {currentLessonData.theory.examples.map(ex => (
                      <ToggleSolutionCard 
                        key={ex.id} 
                        title={ex.title} 
                        question={ex.question} 
                        solution={ex.solution} 
                        colorScheme="orange"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: CÁC DẠNG TOÁN */}
              {activeTab === 'mathTypes' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <Target className="w-8 h-8 text-teal-600" />
                    <h2 className="text-2xl font-black text-teal-700 uppercase">Các Dạng Toán Cơ Bản</h2>
                  </div>

                  {currentLessonData.mathTypes.map((type) => (
                    <div key={type.id} className="bg-teal-50/30 rounded-2xl border border-teal-100 p-6">
                      <div className="mb-6">
                        <h3 className="text-xl font-bold text-teal-800">{type.title}</h3>
                        <p className="text-teal-600 font-medium flex items-center gap-2 mt-1 text-sm">
                          <Info className="w-4 h-4" /> {type.description}
                        </p>
                      </div>
                      
                      <div className="space-y-4">
                        {type.problems.map(prob => (
                          <ToggleSolutionCard 
                            key={prob.id} 
                            question={prob.question} 
                            solution={prob.solution} 
                            colorScheme="teal"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: ĐỀ LUYỆN TẬP */}
              {activeTab === 'practice' && (
                <div className="animate-in fade-in duration-300">
                  <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                    <div className="text-center mb-8 border-b pb-6">
                      <h2 className="text-2xl font-black text-slate-800 mb-2">ĐỀ LUYỆN TẬP SGK</h2>
                      <p className="text-slate-500">Hoàn thành các câu hỏi dưới đây để kiểm tra kiến thức</p>
                    </div>

                    <div className="space-y-8">
                      {currentLessonData.practice.map((q, index) => (
                        <div key={q.id} className="p-6 rounded-2xl border border-slate-100 bg-slate-50/50">
                          <h4 className="font-bold text-slate-800 mb-4 flex gap-2">
                            <span className="text-blue-600">Câu {index + 1}:</span> {q.question}
                          </h4>
                          
                          {/* Multiple Choice */}
                          {q.type === 'mcq' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {q.options.map((opt, oIdx) => {
                                const isSelected = quizAnswers[q.id] === oIdx;
                                const isCorrect = q.correctAnswer === oIdx;
                                
                                let btnClass = "border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-700 bg-white";
                                
                                if (quizSubmitted) {
                                  if (isCorrect) btnClass = "border-emerald-500 bg-emerald-50 text-emerald-800";
                                  else if (isSelected && !isCorrect) btnClass = "border-red-500 bg-red-50 text-red-800";
                                  else btnClass = "border-slate-200 bg-white opacity-50";
                                } else if (isSelected) {
                                  btnClass = "border-blue-500 bg-blue-50 text-blue-800 ring-1 ring-blue-500";
                                }

                                return (
                                  <button
                                    key={oIdx}
                                    onClick={() => handleQuizChange(q.id, oIdx)}
                                    disabled={quizSubmitted}
                                    className={`p-4 rounded-xl border-2 text-left font-medium transition-all flex items-center gap-3 ${btnClass}`}
                                  >
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isSelected || (quizSubmitted && isCorrect) ? 'bg-current text-white' : 'bg-slate-100 text-slate-500'}`}>
                                      {String.fromCharCode(65 + oIdx)}
                                    </span>
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Input Type */}
                          {q.type === 'input' && (
                            <div className="mt-4">
                              <div className="flex items-center gap-4 bg-white p-2 rounded-xl border-2 focus-within:border-blue-500 transition-colors w-full max-w-sm">
                                <span className="text-slate-500 font-medium pl-2">Nhập đáp án:</span>
                                <input 
                                  type="text" 
                                  value={quizAnswers[q.id] || ''}
                                  onChange={(e) => handleQuizChange(q.id, e.target.value)}
                                  disabled={quizSubmitted}
                                  placeholder="Ví dụ: 12"
                                  className="flex-1 bg-transparent outline-none font-bold text-slate-800"
                                />
                              </div>
                              {quizSubmitted && (
                                <div className={`mt-3 flex items-center gap-2 font-medium ${quizAnswers[q.id]?.toString().trim() === q.correctAnswer ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {quizAnswers[q.id]?.toString().trim() === q.correctAnswer ? <CheckCircle2 className="w-5 h-5"/> : <XCircle className="w-5 h-5"/>}
                                  <span>Đáp án đúng: {q.correctAnswer}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Submit Section */}
                    <div className="mt-10 text-center border-t pt-8">
                      {!quizSubmitted ? (
                        <button 
                          onClick={submitQuiz}
                          disabled={Object.keys(quizAnswers).length === 0}
                          className="bg-teal-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-teal-700 hover:shadow-lg hover:shadow-teal-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
                        >
                          <Target className="w-5 h-5"/> NỘP BÀI THI
                        </button>
                      ) : (
                        <div className="bg-slate-50 p-6 rounded-2xl inline-block min-w-[300px]">
                          <h3 className="text-lg font-bold text-slate-600 mb-2">Kết quả của bạn</h3>
                          <p className="text-5xl font-black text-teal-600 mb-6">{quizScore} / {currentLessonData.practice.length}</p>
                          <button 
                            onClick={resetQuiz}
                            className="bg-white border-2 border-slate-200 text-slate-600 px-6 py-2 rounded-xl font-bold hover:bg-slate-100 transition-colors"
                          >
                            Làm lại bài
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[40vh] text-slate-400 animate-in fade-in px-4">
              <BookOpen className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium text-slate-500 text-center">Nội dung bài học này đang được cập nhật...</p>
              <button 
                type="button"
                onClick={() => setActiveLessonId(null)}
                className="mt-6 text-blue-600 font-bold hover:underline"
              >
                Quay lại trang chủ
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  </div>
);
}