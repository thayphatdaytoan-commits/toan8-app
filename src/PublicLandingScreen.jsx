/* eslint-disable */
import React, { useState, useRef, useEffect } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
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
  ArrowRight,
  GraduationCap,
  Phone,
  Star,
  Sparkles,
  PlayCircle,
  Award,
  Map as MapIcon,
  LogOut,
  Settings,
  Gift,
  Wallet,
  Play,
  ClipboardList,
  Tag,
  TrendingUp,
  Circle,
  Crown,
  MousePointerClick,
  Rocket,
  Bell,
} from 'lucide-react';
import StudentNotificationBell, { useStudentUnreadCount } from './StudentNotificationBell';
import StudentProfileDropdown from './StudentProfileDropdown';
import { normalizeExamType, examTypeLabel as quizExamTypeLabel, EXAM_TYPE } from './quizExamTypes';
import { addDoc, collection, doc, onSnapshot } from 'firebase/firestore';
import { db, COLLECTION_TRIAL_REGISTRATIONS, COLLECTION_SITE_HOMEPAGE, HOMEPAGE_DOC_ID, ensureAnonymousAuth } from './firebaseClient';
import SiteFooter from './components/SiteFooter';
import MathEduLogo from './components/MathEduLogo';
import PromoSlider from './components/PromoSlider';
import CommunityHubCards from './components/CommunityHubCards';
import BlogDocsHomeSection from './components/BlogDocsHomeSection';
import CompetitionBannerSection from './components/CompetitionBannerSection';
import HomeSidebarLeaderboard from './components/HomeSidebarLeaderboard';
import {
  createDefaultHomepageContent,
  normalizeHomepageContent,
  resolveColorPreset,
} from './homepage/defaultHomepageContent';
import { findSgkChapter } from './sgkToc';
import {
  getLessonDisplayLabel,
  getSectionDisplayLabel,
  getSidebarLessonTitle,
  isSgkRoadmapLesson,
  mergeLessonsByLessonNo,
  normalizeLessonSections,
  roadmapChapterKey,
  sortLessonSections,
} from './lessonSections';

const TRIAL_ICON_MAP = {
  GraduationCap,
  ClipboardList,
  Tag,
  TrendingUp,
  Gift,
  Award,
};

const GRADE_MENU_ICON_MAP = {
  lessons: BookOpen,
  topics: MapIcon,
  exams: FileText,
  gifted: Award,
};

/** Khối công khai: 6 → 12 (bỏ lớp 5) */
const PUBLIC_GRADES = ['6', '7', '8', '9', '10', '11', '12'];

const MARKETING_SIDEBAR_GRADES = [
  { label: '2K9 ÔN LUYỆN', grade: '9', accent: true },
  { label: 'LỚP 12', grade: '12' },
  { label: 'LỚP 11', grade: '11' },
  { label: 'LỚP 10', grade: '10' },
  { label: 'LỚP 9', grade: '9' },
  { label: 'LỚP 8', grade: '8' },
  { label: 'LỚP 7', grade: '7' },
  { label: 'LỚP 6', grade: '6' },
];

function parseLessonContentJson(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      return p && typeof p === 'object' ? p : {};
    } catch {
      return {};
    }
  }
  return {};
}

function formatChapterTitleOnce(grade, chapterNo) {
  const no = String(chapterNo ?? '').trim();
  if (!no || no === '0') return 'Chương khác';
  const sgk = findSgkChapter(grade, no);
  if (sgk?.title) return `Chương ${no}: ${sgk.title}`;
  return `Chương ${no}`;
}

function resolveLessonDisplaySections(lesson) {
  if (Array.isArray(lesson?._displaySections)) return lesson._displaySections;
  const content = parseLessonContentJson(lesson?.content);
  return sortLessonSections(normalizeLessonSections(content?.sections));
}

const THCS_GRADE_CARDS = [
  {
    grade: '6',
    headerBg: 'bg-gradient-to-br from-[#fb7185] via-[#f43f5e] to-[#e11d48]',
    hoverRow: 'hover:bg-rose-50',
  },
  {
    grade: '7',
    headerBg: 'bg-gradient-to-br from-[#fbbf24] via-[#f59e0b] to-[#d97706]',
    hoverRow: 'hover:bg-amber-50',
  },
  {
    grade: '8',
    headerBg: 'bg-gradient-to-br from-[#34d399] via-[#10b981] to-[#059669]',
    hoverRow: 'hover:bg-emerald-50',
  },
  {
    grade: '9',
    headerBg: 'bg-gradient-to-br from-[#38bdf8] via-[#0ea5e9] to-[#0284c7]',
    hoverRow: 'hover:bg-sky-50',
  },
];

const THPT_GRADE_CARDS = [
  {
    grade: '10',
    headerBg: 'bg-gradient-to-br from-[#93c5fd] via-[#60a5fa] to-[#3b82f6]',
    hoverRow: 'hover:bg-blue-50',
  },
  {
    grade: '11',
    headerBg: 'bg-gradient-to-br from-[#fb7185] via-[#f43f5e] to-[#be123c]',
    hoverRow: 'hover:bg-rose-50',
  },
  {
    grade: '12',
    headerBg: 'bg-gradient-to-br from-[#a78bfa] via-[#8b5cf6] to-[#6d28d9]',
    hoverRow: 'hover:bg-violet-50',
  },
];

const GRADE_MENU_ITEMS = [
  { id: 'lessons', label: 'Bài giảng', shortLabel: 'Bài giảng', icon: BookOpen, badge: 'Miễn phí', badgeClass: 'bg-emerald-100 text-emerald-700' },
  { id: 'topics', label: 'Chuyên đề ôn tập', shortLabel: 'Chuyên đề', icon: MapIcon, badge: 'Đăng nhập', badgeClass: 'bg-amber-100 text-amber-800' },
  { id: 'exams', label: 'Đề kiểm tra', shortLabel: 'Đề KT', icon: FileText, badge: 'Đăng nhập', badgeClass: 'bg-amber-100 text-amber-800' },
  { id: 'gifted', label: 'Học sinh giỏi', shortLabel: 'HS giỏi', icon: Award, badge: 'Sắp ra', badgeClass: 'bg-slate-100 text-slate-500' },
];

const TUTOR_PACKAGES = [
  {
    id: 'weak',
    title: 'KÈM HỌC SINH YẾU/MẤT GỐC',
    items: [
      { type: 'target', text: 'Đối tượng: Học sinh muốn tìm lộ trình ngắn nhất để cải thiện điểm số.' },
      { type: 'star', text: 'Nội dung khóa học:' },
      { type: 'dot', text: 'Đánh giá kiến thức nền tảng, xác định lỗ hổng kiến thức.' },
      { type: 'dot', text: 'Củng cố kiến thức cơ bản theo chuẩn Bộ GD&ĐT.' },
      { type: 'dot', text: 'Sơ đồ tư duy giúp ghi nhớ lâu dài.' },
      { type: 'dot', text: 'Luyện đề theo lộ trình tăng dần độ khó.' },
      { type: 'dot', text: 'Phương pháp tự học hiệu quả tại nhà.' },
    ],
  },
  {
    id: 'gifted',
    title: 'BỒI DƯỠNG HỌC SINH GIỎI',
    items: [
      { type: 'target', text: 'Đối tượng: Học sinh lớp 6–12 muốn đạt điểm cao / học sinh giỏi.' },
      { type: 'star', text: 'Nội dung khóa học:' },
      { type: 'dot', text: 'Kiến thức chuyên sâu, mở rộng ngoài chương trình.' },
      { type: 'dot', text: 'Luyện đề dạng nâng cao, tư duy phản biện.' },
      { type: 'dot', text: 'Sơ đồ tư duy & tài liệu chuyên biệt.' },
      { type: 'dot', text: 'Kỹ năng quản lý thời gian làm bài.' },
      { type: 'dot', text: 'Giáo viên giàu kinh nghiệm bồi dưỡng HSG.' },
    ],
  },
  {
    id: 'grade10',
    title: 'GIA SƯ LUYỆN THI VÀO LỚP 10',
    items: [
      { type: 'target', text: 'Đối tượng: Học sinh lớp 9 ôn thi vào trường công lập / chuyên.' },
      { type: 'star', text: 'Nội dung khóa học:' },
      { type: 'dot', text: 'Toán: công thức trọng tâm, luyện đề nâng cao.' },
      { type: 'dot', text: 'Văn: kỹ năng viết, phân tích đề.' },
      { type: 'dot', text: 'Anh: phát âm, ngữ pháp, nghe hiểu.' },
      { type: 'dot', text: 'Thi thử định kỳ & mẹo làm bài thi.' },
      { type: 'dot', text: 'Lộ trình cá nhân hóa theo mục tiêu trường.' },
    ],
  },
];

const TRIAL_BENEFITS = [
  {
    id: 'free',
    title: 'MIỄN PHÍ HỌC THỬ',
    desc: 'Học thử miễn phí trị giá 300.000đ với giáo viên trường chuyên.',
    icon: GraduationCap,
    border: 'border-emerald-400',
    iconBg: 'bg-emerald-50 text-emerald-700',
  },
  {
    id: 'test',
    title: 'KIỂM TRA NĂNG LỰC HỌC TẬP',
    desc: 'Được giáo viên đánh giá hoặc làm bài kiểm tra miễn phí.',
    icon: ClipboardList,
    border: 'border-sky-400',
    iconBg: 'bg-sky-50 text-sky-700',
  },
  {
    id: 'scholarship',
    title: 'TẶNG HỌC BỔNG ĐẾN 50%',
    desc: 'Nhận voucher giảm học phí đến 50% sau buổi học thử.',
    icon: Tag,
    border: 'border-teal-600',
    iconBg: 'bg-teal-50 text-teal-800',
  },
  {
    id: 'path',
    title: 'NHẬN LỘ TRÌNH HỌC ĐẠT ĐIỂM CAO',
    desc: 'Nhận lộ trình tối ưu để đạt điểm 8–9 theo mục tiêu.',
    icon: TrendingUp,
    border: 'border-cyan-500',
    iconBg: 'bg-cyan-50 text-cyan-700',
  },
];

const TRIAL_COURSE_OPTIONS = [
  'Học thử gia sư môn Toán',
  'Kèm học sinh yếu / mất gốc',
  'Bồi dưỡng học sinh giỏi',
  'Luyện thi vào lớp 10',
  'Luyện thi tốt nghiệp THPT',
];

function SectionTitleDecor({ title, color }) {
  return (
    <div className="text-center mb-8 sm:mb-10">
      <h2
        className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-wide"
        style={{ color: color || '#1a5c45' }}
      >
        {title}
      </h2>
      <div className="mt-3 flex items-center justify-center gap-2">
        <span className="h-0.5 w-10 sm:w-16 bg-orange-400 rounded-full" />
        <span className="w-2 h-2 rotate-45 bg-orange-400" />
        <span className="w-2.5 h-2.5 rotate-45 bg-orange-500" />
        <span className="w-2 h-2 rotate-45 bg-orange-400" />
        <span className="h-0.5 w-10 sm:w-16 bg-orange-400 rounded-full" />
      </div>
    </div>
  );
}

function TutorPackageCard({ title, items, onRegister, headerBg = '#1a5c45', ctaBg = '#f97316', ctaLabel = 'Đăng ký học thử' }) {
  return (
    <div className="flex flex-col bg-white rounded-2xl border border-emerald-200/80 shadow-md overflow-hidden h-full min-w-0">
      <div
        className="text-white text-center px-3 py-3.5 font-black text-xs sm:text-sm uppercase tracking-wide leading-snug"
        style={{ backgroundColor: headerBg }}
      >
        {title}
      </div>
      <div className="flex-1 p-4 sm:p-5 space-y-2.5 text-sm text-slate-700">
        {(items || []).map((item, idx) => (
          <div key={idx} className="flex gap-2.5 items-start">
            {item.type === 'target' && <Target className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />}
            {item.type === 'star' && <Star className="w-4 h-4 shrink-0 text-amber-500 fill-amber-400 mt-0.5" />}
            {item.type === 'dot' && <Circle className="w-2.5 h-2.5 shrink-0 text-orange-400 fill-orange-400 mt-1.5 ml-0.5" />}
            <p className={`leading-relaxed ${item.type === 'star' || item.type === 'target' ? 'font-semibold text-slate-800' : ''}`}>
              {item.text}
            </p>
          </div>
        ))}
      </div>
      <div className="px-4 pb-5 pt-1">
        <button
          type="button"
          onClick={onRegister}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-full text-white font-black text-sm uppercase tracking-wide shadow-md transition-colors"
          style={{ backgroundColor: ctaBg }}
        >
          <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <Play className="w-3.5 h-3.5 fill-white" />
          </span>
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

function TutorPackagesSection({ onRegisterTrial, block }) {
  const scrollerRef = useRef(null);
  const scrollByCard = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.min(340, el.clientWidth * 0.85);
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };
  const packages = block?.items || [];
  const title = block?.fields?.title || 'Gia sư luyện thi đặc biệt';
  const headerBg = block?.colors?.headerBg || '#1a5c45';
  const ctaBg = block?.colors?.ctaBg || '#f97316';
  const ctaLabel = block?.fields?.ctaLabel || 'Đăng ký học thử';

  return (
    <section
      id="gia-su"
      className="relative mb-10 scroll-mt-24 rounded-3xl overflow-hidden px-4 sm:px-8 py-10 sm:py-12"
      style={{
        background: 'linear-gradient(160deg, #fff7ed 0%, #ffedd5 40%, #fffbeb 100%)',
      }}
    >
      <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-orange-200/40 blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full bg-amber-200/50 blur-3xl pointer-events-none" />
      <div className="relative z-10">
        <SectionTitleDecor title={title} color={block?.colors?.titleColor} />
        <div className="relative">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-red-500 text-white items-center justify-center shadow-lg hover:bg-red-600"
            aria-label="Trước"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-red-500 text-white items-center justify-center shadow-lg hover:bg-red-600"
            aria-label="Sau"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div
            ref={scrollerRef}
            className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-1 scrollbar-thin"
          >
            {packages.map((pkg) => (
              <div key={pkg.id} className="snap-center min-w-0">
                <TutorPackageCard
                  title={pkg.title}
                  items={pkg.lines || pkg.items || []}
                  onRegister={onRegisterTrial}
                  headerBg={headerBg}
                  ctaBg={ctaBg}
                  ctaLabel={ctaLabel}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HotlineConsultBar({ block }) {
  const f = block?.fields || {};
  const c = block?.colors || {};
  const phoneTel = f.phoneTel || '0968526800';
  const phoneDisplay = f.phoneDisplay || '0968 526 800';
  return (
    <div
      className="mb-10 rounded-2xl text-white px-5 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg"
      style={{ backgroundColor: c.barBg || '#0b1f3a' }}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center shrink-0 shadow-md">
          <Phone className="w-6 h-6 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-300">
            {f.label || 'Hotline tư vấn 24/7'}
          </p>
          <a href={`tel:${phoneTel}`} className="text-2xl sm:text-3xl font-black tracking-tight hover:text-sky-300 transition-colors">
            {phoneDisplay}
          </a>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
        <a
          href={`tel:${phoneTel}`}
          className="px-5 py-2.5 rounded-xl border border-white/80 text-white font-bold text-sm hover:bg-white/10 transition-colors"
        >
          {f.consultLabel || 'Nhận tư vấn ngay'}
        </a>
        <a
          href={f.zaloUrl || 'https://zalo.me/0968526800'}
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-colors inline-flex items-center gap-2"
          style={{ backgroundColor: c.zaloBg || '#0068FF' }}
        >
          <span className="w-5 h-5 rounded bg-white text-[#0068FF] text-[10px] font-black flex items-center justify-center">Z</span>
          {f.zaloLabel || 'Chat Zalo'}
        </a>
      </div>
    </div>
  );
}

function TrialProgramSection({ block }) {
  const f = block?.fields || {};
  const c = block?.colors || {};
  const courseOptions = f.courseOptions?.length ? f.courseOptions : TRIAL_COURSE_OPTIONS;
  const benefits = block?.items?.length ? block.items : TRIAL_BENEFITS;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [course, setCourse] = useState(courseOptions[0]);
  const [phoneError, setPhoneError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (courseOptions[0] && !courseOptions.includes(course)) {
      setCourse(courseOptions[0]);
    }
  }, [courseOptions.join('|')]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const phoneDigits = phone.replace(/\D/g, '');
    if (!phoneDigits || phoneDigits.length < 9) {
      setPhoneError('Vui lòng hoàn thành trường bắt buộc này.');
      return;
    }
    setPhoneError('');
    setSubmitError('');
    setSubmitting(true);
    try {
      await ensureAnonymousAuth();
      await addDoc(collection(db, COLLECTION_TRIAL_REGISTRATIONS), {
        student_name: (name || '').trim(),
        phone: phoneDigits,
        email: (email || '').trim(),
        course: course || courseOptions[0],
        status: 'new',
        source: 'landing_trial_form',
        created_at: Date.now(),
      });
      setSubmitted(true);
      setName('');
      setPhone('');
      setEmail('');
      setCourse(courseOptions[0]);
    } catch (err) {
      console.error('Lỗi lưu đăng ký học thử:', err);
      setSubmitError('Không gửi được đăng ký. Vui lòng thử lại hoặc gọi 0968 526 800.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="hoc-thu" className="mb-12 scroll-mt-24 min-w-0">
      <SectionTitleDecor title={f.title || 'Chương trình học thử'} color={c.titleColor} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start min-w-0">
        <div className="space-y-3 sm:space-y-4 min-w-0">
          {benefits.map((b) => {
            const Icon = typeof b.icon === 'string' ? TRIAL_ICON_MAP[b.icon] || Gift : b.icon || Gift;
            return (
              <div
                key={b.id}
                className={`flex gap-3 sm:gap-4 items-center bg-white rounded-2xl border-2 ${b.border || 'border-emerald-400'} px-3 sm:px-4 py-3.5 shadow-sm min-w-0`}
              >
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl ${b.iconBg || 'bg-emerald-50 text-emerald-700'} flex items-center justify-center shrink-0`}>
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-sm sm:text-base text-slate-900 uppercase tracking-wide">{b.title}</p>
                  <p className="text-sm text-slate-600 mt-0.5 leading-snug">{b.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl text-white p-5 sm:p-7 shadow-xl min-w-0 w-full"
          style={{ backgroundColor: c.formBg || '#1a5c45' }}
        >
          <h3 className="text-center text-lg sm:text-xl font-black uppercase tracking-wide mb-6">
            {f.formHeadline || 'Chỉ còn'}{' '}
            <span className="text-orange-400">{f.formHighlight || '5 suất'}</span>{' '}
            {f.formHeadlineAfter || 'học thử'}
          </h3>
          {submitted && (
            <div className="mb-4 rounded-xl bg-emerald-500/20 border border-emerald-300/40 px-4 py-3 text-sm font-semibold text-emerald-100">
              Đã gửi đăng ký thành công! Giáo viên sẽ liên hệ sớm qua số điện thoại bạn đã để lại.
            </div>
          )}
          {submitError && (
            <div className="mb-4 rounded-xl bg-red-500/20 border border-red-300/40 px-4 py-3 text-sm font-semibold text-red-100">
              {submitError}
            </div>
          )}
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-white/90">Họ và tên học sinh</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nguyễn Văn An"
                className="mt-1.5 w-full rounded-lg bg-white text-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white/90">Số điện thoại</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (phoneError) setPhoneError('');
                }}
                placeholder="Nhập số điện thoại của bạn vào đây (10 số)"
                className={`mt-1.5 w-full rounded-lg bg-white text-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 ${
                  phoneError ? 'ring-2 ring-red-400' : ''
                }`}
              />
              {phoneError && <p className="mt-1 text-xs text-red-300 font-semibold">{phoneError}</p>}
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white/90">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@gmail.com"
                className="mt-1.5 w-full rounded-lg bg-white text-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white/90">Chọn khóa học</span>
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="mt-1.5 w-full rounded-lg bg-white text-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
              >
                {courseOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-6 flex justify-center">
            <button
              type="submit"
              disabled={submitting}
              className="px-10 py-2.5 rounded-lg bg-white text-orange-600 font-black text-base hover:bg-orange-50 shadow-md transition-colors disabled:opacity-60"
            >
              {submitting ? 'Đang gửi...' : 'Đăng ký'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function GradeHeaderDecor() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      <div className="absolute -top-6 -left-4 w-20 h-20 rounded-full bg-white/10" />
      <div className="absolute -bottom-8 -right-6 w-24 h-24 rounded-full bg-white/10" />
      <span className="absolute bottom-2 left-3 text-white/25 text-3xl sm:text-4xl font-black select-none leading-none">
        π
      </span>
      <span className="absolute bottom-2 right-3 text-white/20 text-2xl sm:text-3xl font-black select-none leading-none">
        ∑
      </span>
      <span className="absolute top-8 left-4 text-white/15 text-lg font-bold select-none">√</span>
      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/[0.07] text-6xl font-black select-none">
        ∞
      </span>
    </div>
  );
}

function GradeLevelCard({
  grade,
  headerBg,
  hoverRow,
  onMenuAction,
  menuItems,
  moreLabel = 'Xem thêm →',
  labelColor = '#ffffff',
  numberColor = '#fde047',
  labelFontSize = 14,
  numberFontSize = 64,
}) {
  const rows = menuItems?.length ? menuItems : GRADE_MENU_ITEMS;
  return (
    <div className="group flex flex-col min-w-0 bg-white rounded-2xl sm:rounded-3xl border border-slate-100/80 shadow-[0_10px_28px_rgba(15,23,42,0.10)] hover:shadow-[0_16px_40px_rgba(15,23,42,0.16)] hover:-translate-y-1 transition-all duration-300 overflow-hidden">
      <div
        className={`relative ${headerBg} min-h-[7.5rem] sm:min-h-[11rem] flex flex-col items-center justify-center overflow-hidden`}
      >
        <GradeHeaderDecor />
        <div className="absolute top-2 right-2 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/25 backdrop-blur-sm border border-white/40 flex items-center justify-center shadow-sm">
          <MousePointerClick className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
        </div>
        <span
          className="relative z-10 font-black uppercase tracking-[0.2em] drop-shadow"
          style={{ color: labelColor, fontSize: `${Number(labelFontSize) || 14}px` }}
        >
          TOÁN
        </span>
        <span
          className="relative z-10 font-black leading-none mt-0.5 sm:mt-1"
          style={{
            color: numberColor,
            fontSize: `${Number(numberFontSize) || 64}px`,
            textShadow:
              '0 4px 0 rgba(0,0,0,0.2), 0 8px 20px rgba(0,0,0,0.18), 0 0 24px rgba(255,255,255,0.25)',
          }}
        >
          {grade}
        </span>
      </div>

      <div className="flex-1 flex flex-col min-w-0 px-0.5 sm:px-1 pt-1 pb-1 bg-white">
        <div className="divide-y divide-slate-100">
          {rows.map((item) => {
            const Icon = GRADE_MENU_ICON_MAP[item.id] || item.icon || BookOpen;
            const disabled = item.disabled || item.id === 'gifted';
            return (
              <button
                key={item.id}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && onMenuAction?.(item.id)}
                className={`w-full min-w-0 text-left px-1.5 sm:px-3 py-2 sm:py-2.5 flex items-center gap-1 sm:gap-2 transition-colors ${
                  disabled ? 'opacity-50 cursor-not-allowed' : `${hoverRow} cursor-pointer`
                }`}
              >
                <span className="hidden xs:flex w-6 h-6 rounded-md bg-slate-50 border border-slate-100 items-center justify-center shrink-0 text-slate-500 sm:flex">
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="flex-1 min-w-0 font-semibold text-slate-800 text-[11px] sm:text-[13px] leading-tight truncate">
                  <span className="sm:hidden">{item.shortLabel || item.label}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </span>
                <span className={`shrink-0 text-[8px] sm:text-[9px] font-black uppercase px-1 sm:px-1.5 py-0.5 rounded-full whitespace-nowrap ${item.badgeClass || 'bg-slate-100 text-slate-600'}`}>
                  {item.badge}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => onMenuAction?.('lessons')}
          className="mt-1 mx-1 sm:mx-2 mb-2 py-1.5 sm:py-2 text-center text-xs sm:text-sm font-bold text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
        >
          {moreLabel}
        </button>
      </div>
    </div>
  );
}

function LuyenThiCard({ onEnterExam, onSelectGrade12 }) {
  return (
    <div className="group flex flex-col min-w-0 bg-white rounded-2xl sm:rounded-3xl border border-slate-100/80 shadow-[0_10px_28px_rgba(15,23,42,0.10)] hover:shadow-[0_16px_40px_rgba(15,23,42,0.16)] hover:-translate-y-1 transition-all duration-300 overflow-hidden">
      <div className="relative bg-gradient-to-br from-[#fbbf24] via-[#f59e0b] to-[#ea580c] min-h-[7.5rem] sm:min-h-[11rem] flex flex-col items-center justify-center overflow-hidden px-2 sm:px-3">
        <GradeHeaderDecor />
        <div className="absolute top-2 right-2 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/25 backdrop-blur-sm border border-white/40 flex items-center justify-center shadow-sm">
          <MousePointerClick className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
        </div>
        <span className="relative z-10 text-[10px] sm:text-sm font-black uppercase tracking-[0.2em] text-white drop-shadow">
          TOÁN
        </span>
        <span
          className="relative z-10 text-base sm:text-2xl font-black leading-tight mt-1 text-center text-white"
          style={{ textShadow: '0 3px 0 rgba(0,0,0,0.2)' }}
        >
          LUYỆN THI
          <br />
          THPT QG
        </span>
      </div>
      <div className="flex-1 flex flex-col min-w-0 px-0.5 sm:px-1 pt-1 pb-1 bg-white">
        <div className="divide-y divide-slate-100 text-[11px] sm:text-sm">
          <button
            type="button"
            onClick={onSelectGrade12}
            className="w-full min-w-0 text-left px-1.5 sm:px-3 py-2 sm:py-2.5 font-semibold text-slate-800 hover:bg-orange-50 hover:text-orange-700 flex items-center justify-between gap-1"
          >
            <span className="min-w-0 truncate">Thi thử TN THPT</span>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </button>
          <button
            type="button"
            onClick={onEnterExam}
            className="w-full min-w-0 text-left px-1.5 sm:px-3 py-2 sm:py-2.5 font-semibold text-slate-800 hover:bg-orange-50 hover:text-orange-700 flex items-center justify-between gap-1"
          >
            <span className="min-w-0 truncate">Đề sưu tầm</span>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </button>
          <button
            type="button"
            onClick={onEnterExam}
            className="w-full min-w-0 text-left px-1.5 sm:px-3 py-2 sm:py-2.5 font-semibold text-slate-800 hover:bg-orange-50 hover:text-orange-700 flex items-center justify-between gap-1"
          >
            <span className="min-w-0 truncate">Kho đề KT</span>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </button>
        </div>
        <button
          type="button"
          onClick={onEnterExam}
          className="mt-1 mx-1 sm:mx-2 mb-2 py-1.5 sm:py-2 text-center text-xs sm:text-sm font-bold text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
        >
          Xem thêm →
        </button>
      </div>
    </div>
  );
}

function FeaturedCourseIcon({ variant }) {
  const v = variant || 'book';
  if (v === 'gate') {
    return (
      <svg viewBox="0 0 72 64" className="w-14 h-12 sm:w-16 sm:h-14 drop-shadow-md" aria-hidden>
        <defs>
          <linearGradient id="fcGate" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <rect x="9" y="10" width="54" height="10" rx="2" fill="url(#fcGate)" stroke="#d97706" strokeWidth="1.6" />
        <rect x="12" y="20" width="7" height="31" rx="1.5" fill="#fff7ed" stroke="#d97706" strokeWidth="1.6" />
        <rect x="53" y="20" width="7" height="31" rx="1.5" fill="#fff7ed" stroke="#d97706" strokeWidth="1.6" />
        <path d="M24 50V34c0-11 7-18 12-18s12 7 12 18v16" fill="#fff7ed" stroke="#d97706" strokeWidth="2.6" strokeLinecap="round" />
        <text x="36" y="44" textAnchor="middle" fontSize="18" fontWeight="900" fill="#d97706">10</text>
      </svg>
    );
  }
  if (v === 'think') {
    return (
      <svg viewBox="0 0 72 64" className="w-14 h-12 sm:w-16 sm:h-14 drop-shadow-md" aria-hidden>
        <path d="M19 20l7-5 7 5v19l-7 5-7-5V20z" fill="#c084fc" stroke="#7c3aed" strokeWidth="1.8" />
        <path d="M26 16l6-4 6 4v21l-6 4-6-4" fill="#d8b4fe" stroke="#7c3aed" strokeWidth="1.8" />
        <path d="M15 27c0-7 5-12 12-12v5c-4 0-7 3-7 7s3 7 7 7v5c-7 0-12-5-12-12zm23-12c7 0 12 5 12 12s-5 12-12 12v-5c4 0 7-3 7-7s-3-7-7-7v-5z" fill="#8b5cf6" />
        <circle cx="32" cy="27" r="5.5" fill="#f5d0fe" stroke="#6d28d9" strokeWidth="1.4" />
        <path d="M49 11c-8 0-13 5-13 12 0 4 2 7 5 9v4h10v-4c3-2 5-5 5-9 0-7-5-12-13-12z" fill="#f5f3ff" stroke="#8b5cf6" strokeWidth="1.8" />
        <path d="M44 39h10M45 42h8" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M47 18c1-2 3-3 5-3" stroke="#8b5cf6" strokeWidth="1.6" strokeLinecap="round" />
        <text x="48.5" y="21" textAnchor="middle" fontSize="5.5" fontStyle="italic" fill="#6d28d9">Eureka!</text>
        <circle cx="57" cy="38" r="6.5" fill="#d8b4fe" stroke="#8b5cf6" strokeWidth="1.5" />
        <path d="M57 34.5v7M53.5 38h7" stroke="#6d28d9" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (v === 'medal') {
    return (
      <svg viewBox="0 0 72 64" className="w-14 h-12 sm:w-16 sm:h-14 drop-shadow-md" aria-hidden>
        <path d="M24 48l-7 12-3-16 10 4zm24 0l7 12 3-16-10 4z" fill="#f59e0b" stroke="#d97706" strokeWidth="1.4" />
        <circle cx="36" cy="29" r="20" fill="#fde68a" stroke="#e0a11b" strokeWidth="2.4" />
        <circle cx="36" cy="29" r="15" fill="#fff7ed" stroke="#f3c34a" strokeWidth="1.8" />
        <path d="M36 13l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2-4.5-4.4 6.2-.9L36 13z" fill="#fbbf24" />
        <text x="36" y="35.5" textAnchor="middle" fontSize="17" fontWeight="900" fill="#3f3f46">Σ</text>
        <text x="36" y="44.5" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#18181b">∞</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 72 64" className="w-14 h-12 sm:w-16 sm:h-14 drop-shadow-md" aria-hidden>
      <path d="M12 16c0-2 1.5-3.5 3.5-3.5H35c3.5 0 6 1.2 8 3.4 2-2.2 4.5-3.4 8-3.4h5.5c2 0 3.5 1.5 3.5 3.5v30c0 2-1.5 3.5-3.5 3.5H51c-3.7 0-6.6-1.4-8-3.6-1.4 2.2-4.3 3.6-8 3.6H15.5c-2 0-3.5-1.5-3.5-3.5V16z" fill="#fff7ed" stroke="#e76f61" strokeWidth="2" />
      <path d="M17 18h17c3.1 0 5 1 7 3.1V46c-1.8-1.8-3.8-2.6-7-2.6H17V18z" fill="#dc2626" />
      <path d="M55 18H38c-3.2 0-5.2.8-7 2.9V46c1.8-1.8 3.8-2.6 7-2.6h17V18z" fill="#fff" />
      <path d="M41 23l2 4.5 5 .4-3.8 3 1.2 4.8-4.4-2.5-4.4 2.5 1.2-4.8-3.8-3 5-.4 2-4.5z" fill="#facc15" />
      <path d="M47 27c4 0 7 2 9 4v4.5c-2-1.9-5-3.8-9-4.2V27z" fill="#fee2e2" />
      <path d="M47 27c-4 0-7 2-9 4v4.5c2-1.9 5-3.8 9-4.2V27z" fill="#fff7ed" opacity="0.95" />
      <path d="M47 28.8l1.7 2.3h2.8l-2.2 1.7.8 2.7-3.1-1.6-3.1 1.6.8-2.7-2.2-1.7h2.8l1.7-2.3z" fill="#ef4444" />
    </svg>
  );
}

function FeaturedCourseCard({
  banner,
  title,
  description,
  gradient,
  imageUrl = '',
  onClick,
  featured = false,
  bannerColor = '#ffffff',
  bannerFontSize = 18,
  iconVariant = 'book',
}) {
  const pillLabel = title || '';
  const fontSize = Math.min(Math.max(Number(bannerFontSize) || 18, 14), 22);
  const heroImage = String(imageUrl || '').trim();
  const hasHeroImage = Boolean(heroImage);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group text-left w-full min-w-0 rounded-2xl bg-white shadow-[0_10px_28px_rgba(15,23,42,0.1)] hover:shadow-[0_18px_40px_rgba(15,23,42,0.16)] hover:-translate-y-1 transition-all duration-300 overflow-hidden border ${
        featured ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200/80 hover:border-slate-300'
      }`}
    >
      <div
        className={`relative min-h-[9.5rem] sm:min-h-[10.5rem] overflow-hidden flex flex-col items-center justify-end text-center ${
          hasHeroImage ? 'bg-slate-100' : `bg-gradient-to-br ${gradient} px-4 pt-5 pb-4 justify-center`
        }`}
      >
        {hasHeroImage ? (
          <>
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} aria-hidden />
            <img
              src={heroImage}
              alt={banner || title || 'Khóa học tiêu biểu'}
              className="absolute inset-0 w-full h-full object-contain object-center p-1.5 sm:p-2 scale-100 group-hover:scale-[1.02] transition-transform duration-500"
              loading="lazy"
              decoding="async"
            />
          </>
        ) : (
          <>
            <span className="pointer-events-none absolute inset-0 select-none overflow-hidden" aria-hidden>
              <span className="absolute top-3 left-3 text-white/20 text-2xl font-serif">Σ</span>
              <span className="absolute top-8 right-4 text-white/25 text-xl font-serif">π</span>
              <span className="absolute bottom-6 left-5 text-white/20 text-lg font-serif">∫</span>
              <span className="absolute bottom-4 right-8 text-white/15 text-base font-serif">∞</span>
              <span className="absolute top-1/2 left-1/4 text-white/10 text-3xl font-serif -translate-y-1/2">√</span>
            </span>
            <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/20 blur-2xl" />
            <div className="absolute -bottom-10 -left-6 w-24 h-24 rounded-full bg-black/10 blur-xl" />
            <div className="relative z-10 mb-2.5 sm:mb-3 transition-transform duration-300 group-hover:scale-105">
              <FeaturedCourseIcon variant={iconVariant} />
            </div>
            <p
              className="relative z-10 font-black uppercase leading-tight tracking-wide max-w-[95%] drop-shadow-sm"
              style={{
                color: bannerColor,
                fontSize: `${fontSize}px`,
                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }}
            >
              {banner}
            </p>
          </>
        )}
      </div>
      <div className="px-4 py-4 bg-white">
        {pillLabel ? (
          <span className="inline-block mb-2.5 px-3 py-1 rounded-full bg-slate-950 text-white text-[11px] sm:text-xs font-black tracking-wide">
            {pillLabel}
          </span>
        ) : null}
        <p className="text-sm text-slate-700 leading-relaxed line-clamp-2">{description}</p>
      </div>
    </button>
  );
}

// ==========================================
// 1. CẤU TRÚC DATABASE MẪU (Dễ dàng thay thế bằng API fetch)
// ==========================================

export default function PublicLandingScreen({
  lessonsList = [],
  quizzesList = [],
  publicGrade: publicGradeProp,
  onPublicGradeChange,
  studentName = '',
  studentClass = '',
  rosterGrade = '',
  studentProfile = null,
  onRequestLogin,
  onRequestRegister,
  onSelectLesson,
  onSelectQuiz,
  onEnterExam,
  onRequestTopics,
  onEnterStudentPortal,
  onLogout,
  onOpenCommunityQa,
  onOpenWeeklyContest,
  onOpenBlogPost,
  onOpenDocuments,
  onOpenDocument,
  scoresList = [],
  studentsList = [],
}) {
  
  const publicGrade = publicGradeProp || lessonsList[0]?.grade_level || '11';
  const CHAPTER_THEME_KEYS = ['blue', 'purple', 'orange'];
  const parseNum = (v) => {
    const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  // Group lessons by chapter (bỏ chuyên đề cũ khỏi lộ trình chính)
  const grouped = new Map();
  (lessonsList || []).forEach((l) => {
    if (!isSgkRoadmapLesson(l)) return;
    const key = roadmapChapterKey(l);
    if (!key) return;
    if (!grouped.has(key)) grouped.set(key, { key, lessons: [] });
    grouped.get(key).lessons.push(l);
  });

  const chapterKeys = Array.from(grouped.keys()).sort((a, b) => {
    const na = parseNum(a); const nb = parseNum(b);
    if (na !== null && nb !== null) return na - nb;
    return String(a).localeCompare(String(b), 'vi');
  });

  const dynamicChapters = chapterKeys.map((ch, idx) => {
    const row = grouped.get(ch) || { key: ch, lessons: [] };
    const lessons = mergeLessonsByLessonNo(row.lessons || [], parseNum);
    return {
      id: `c_${ch}`,
      chapterNo: ch,
      theme: CHAPTER_THEME_KEYS[idx % CHAPTER_THEME_KEYS.length],
      title: formatChapterTitleOnce(publicGrade, ch),
      lessons,
    };
  });

  const examTypeLabel = (t, gradeLevel) => quizExamTypeLabel(t, gradeLevel);

  const normalizedQuizzes = (quizzesList || []).map(q => ({
    id: q.id,
    title: q.title || 'Đề thi',
    duration: q.duration ? `${q.duration} phút` : 'Không giới hạn',
    exam_type: normalizeExamType(q?.exam_type, q?.grade_level),
    grade_level: (q?.grade_level ?? '').toString().trim(),
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
  const [expandedLessons, setExpandedLessons] = useState([]);

  /** Khi dữ liệu bài học tải xong (trước đó rỗng), mở chương đầu */
  React.useEffect(() => {
    const firstId = dynamicChapters[0]?.id;
    if (!firstId) return;
    setExpandedChapters((prev) => (prev.length === 0 ? [firstId] : prev));
  }, [lessonsList.length]);

  const toggleLessonExpand = (lessonId) => {
    setExpandedLessons((prev) =>
      prev.includes(lessonId) ? prev.filter((id) => id !== lessonId) : [...prev, lessonId]
    );
  };

  // Trạng thái cho bài kiểm tra
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  const [courseCarouselIdx, setCourseCarouselIdx] = useState(0);

  /** Menu THCS / THPT trên navbar */
  const [navMenu, setNavMenu] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const navRef = useRef(null);
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const unreadNotif = useStudentUnreadCount(studentProfile?.id, studentName);
  const contentScrollRef = useRef(null);
  const [homepageContent, setHomepageContent] = useState(() => createDefaultHomepageContent());

  useEffect(() => {
    const ref = doc(db, COLLECTION_SITE_HOMEPAGE, HOMEPAGE_DOC_ID);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) setHomepageContent(normalizeHomepageContent(snap.data()));
        else setHomepageContent(createDefaultHomepageContent());
      },
      () => setHomepageContent(createDefaultHomepageContent())
    );
    return () => unsub();
  }, []);

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
    setProfileMenuOpen(false);
    try {
      sessionStorage.setItem('landingMode', 'marketing');
    } catch {
      // ignore
    }
    setLandingMode('marketing');
    window.setTimeout(() => {
      try {
        contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        /* ignore */
      }
    }, 50);
  };

  /** Bấm logo: về trang chủ và load lại trang */
  const reloadHomeFromLogo = () => {
    try {
      sessionStorage.setItem('landingMode', 'marketing');
    } catch {
      // ignore
    }
    try {
      const path = String(window.location.pathname || '/');
      const search = String(window.location.search || '');
      if (path !== '/' || search) {
        window.location.assign('/');
      } else {
        window.location.reload();
      }
    } catch {
      goToMarketingHome();
    }
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
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileMenuOpen(false);
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

  const runCmsAction = (action) => {
    const a = String(action || '');
    if (a === 'exam') {
      if (onEnterExam) onEnterExam();
      else if (onRequestLogin) onRequestLogin();
      return;
    }
    const m = a.match(/^grade:(\d{1,2})$/);
    if (m) selectPublicGrade(m[1]);
  };

  const featuredBlock = homepageContent.blocks.find((b) => b.type === 'featured_courses');
  const gradeBlock = homepageContent.blocks.find((b) => b.type === 'grade_grid');
  const heroBlock = homepageContent.blocks.find((b) => b.type === 'hero');
  const tutorBlock = homepageContent.blocks.find((b) => b.type === 'tutor_packages');
  const hotlineBlock = homepageContent.blocks.find((b) => b.type === 'hotline');
  const trialBlock = homepageContent.blocks.find((b) => b.type === 'trial_program');
  const footerBlock = homepageContent.blocks.find((b) => b.type === 'footer');
  const sidebarGuideBlock = homepageContent.blocks.find((b) => b.type === 'sidebar_guide');
  const sidebarGuide = sidebarGuideBlock?.fields || {};
  const sidebarVideoUrl = String(sidebarGuide.videoUrl || '').trim();
  const sidebarFacebookUrl = String(sidebarGuide.facebookUrl || '').trim() || 'https://www.facebook.com/';
  const sidebarYoutubeUrl = String(sidebarGuide.youtubeUrl || '').trim() || 'https://www.youtube.com/';
  const sidebarSectionTitle = String(sidebarGuide.sectionTitle || '').trim() || 'Video hướng dẫn học trực tuyến';
  const sidebarVideoTitle = String(sidebarGuide.videoTitle || '').trim() || 'Hướng dẫn sử dụng MathEdu';
  const sidebarCopyright =
    String(sidebarGuide.copyrightNote || '').trim() || '© MathEdu — Nền tảng học Toán trực tuyến';
  const showSidebarGuide = sidebarGuideBlock?.enabled !== false;

  const featuredIconByPreset = {
    amber: 'gate',
    orange: 'gate',
    violet: 'think',
    rose: 'book',
    sky: 'medal',
    blue: 'medal',
    emerald: 'book',
  };
  const featuredIconById = {
    g9: 'gate',
    dg: 'think',
    thpt: 'book',
    exam: 'medal',
    hsg: 'medal',
  };
  const featuredCourses = (featuredBlock?.items || []).map((item) => {
    const preset = resolveColorPreset(item.colorPreset, 'blue');
    return {
      id: item.id,
      banner: item.banner,
      title: item.title,
      description: item.description,
      gradient: preset.gradient,
      imageUrl: item.imageUrl || '',
      featured: Boolean(item.featured),
      bannerColor: item.bannerColor || '#ffffff',
      bannerFontSize: item.bannerFontSize ?? 17,
      iconVariant: item.icon || featuredIconById[item.id] || featuredIconByPreset[item.colorPreset] || 'book',
      onClick: () => runCmsAction(item.action),
    };
  });

  const coursePageCount = Math.max(1, Math.ceil(Math.max(featuredCourses.length, 1) / 2));

  const gradeMenuItems = gradeBlock?.menuItems || GRADE_MENU_ITEMS;
  const moreLabel = gradeBlock?.fields?.moreLabel || 'Xem thêm →';
  const thcsCards = (gradeBlock?.thcsItems || THCS_GRADE_CARDS.map((c) => ({
    id: `g${c.grade}`,
    grade: c.grade,
    colorPreset: 'blue',
    enabled: true,
    headerBg: c.headerBg,
    hoverRow: c.hoverRow,
  }))).filter((c) => c.enabled !== false).map((c) => {
    const preset = c.headerBg ? null : resolveColorPreset(c.colorPreset, 'blue');
    return {
      ...c,
      headerBg: c.headerBg || preset.headerBg,
      hoverRow: c.hoverRow || preset.hoverRow,
      labelColor: c.labelColor || '#ffffff',
      numberColor: c.numberColor || '#fde047',
      labelFontSize: c.labelFontSize ?? 14,
      numberFontSize: c.numberFontSize ?? 64,
    };
  });
  const thptCards = (gradeBlock?.thptItems || THPT_GRADE_CARDS.map((c) => ({
    id: `g${c.grade}`,
    grade: c.grade,
    colorPreset: 'violet',
    enabled: true,
    headerBg: c.headerBg,
    hoverRow: c.hoverRow,
  }))).filter((c) => c.enabled !== false).map((c) => {
    const preset = c.headerBg ? null : resolveColorPreset(c.colorPreset, 'violet');
    return {
      ...c,
      headerBg: c.headerBg || preset.headerBg,
      hoverRow: c.hoverRow || preset.hoverRow,
      labelColor: c.labelColor || '#ffffff',
      numberColor: c.numberColor || '#fde047',
      labelFontSize: c.labelFontSize ?? 14,
      numberFontSize: c.numberFontSize ?? 64,
    };
  });

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

  const scrollToKhoiHoc = () => {
    const el = document.getElementById('khoi-hoc');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleGradeMenuAction = (grade, actionId) => {
    const g = String(grade);
    if (!PUBLIC_GRADES.includes(g)) return;
    if (onPublicGradeChange) onPublicGradeChange(g);

    if (actionId === 'lessons') {
      if (studentName && onEnterStudentPortal) {
        onEnterStudentPortal('lessons');
        return;
      }
      selectPublicGrade(g);
      window.setTimeout(() => scrollToLoTrinh(), 120);
      return;
    }
    if (actionId === 'topics') {
      if (studentName && onEnterStudentPortal) {
        onEnterStudentPortal('topics');
        return;
      }
      if (onRequestTopics) onRequestTopics();
      else if (onRequestLogin) onRequestLogin();
      return;
    }
    if (actionId === 'exams') {
      if (studentName && onEnterStudentPortal) {
        onEnterStudentPortal('exams');
        return;
      }
      if (onEnterExam) onEnterExam();
      else if (onRequestLogin) onRequestLogin();
    }
  };

  const marketingSidebar = (
    <div className="flex flex-col h-full min-h-0 bg-white overflow-y-auto">
      <div className="p-3 border-b border-slate-100 shrink-0">
        <button type="button" onClick={reloadHomeFromLogo} className="w-full text-left rounded-lg p-2 hover:bg-slate-50">
          <MathEduLogo className="h-14" />
          <p className="text-[11px] text-slate-500 mt-1.5 font-semibold">Học trực tuyến — Toán 6–12</p>
        </button>
      </div>

      <nav className="py-2 border-b border-slate-100">
        {MARKETING_SIDEBAR_GRADES.map((item) => (
          <button
            key={`sb-${item.label}`}
            type="button"
            onClick={() => selectPublicGrade(item.grade)}
            className={`w-full text-left px-4 py-2 text-sm font-bold transition-colors ${
              item.accent
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : publicGrade === item.grade
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-3 border-b border-slate-100 space-y-2">
        <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Hỗ trợ — Hướng dẫn</p>
        <p className="text-xs text-slate-600 leading-relaxed">
          <span className="font-bold text-slate-800">Hotline:</span>{' '}
          <a href="tel:0968526800" className="text-blue-600 hover:underline">0968 526 800</a>
        </p>
        <p className="text-xs text-slate-600 leading-relaxed">
          <span className="font-bold text-slate-800">Email:</span>{' '}
          <a href="mailto:thayphatdaytoan@gmail.com" className="text-blue-600 hover:underline break-all">thayphatdaytoan@gmail.com</a>
        </p>
        {studentName ? (
          <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{studentName}</p>
                <p className="text-[11px] text-slate-500">Lớp {studentClass || '—'} · Khối {rosterGrade}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onEnterStudentPortal && onEnterStudentPortal('dashboard')}
              className="w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700"
            >
              Vào khu học tập
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onRequestLogin && onRequestLogin()}
              className="w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700"
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => onRequestRegister && onRequestRegister()}
              className="w-full py-2 rounded-lg bg-blue-500 text-white text-sm font-bold hover:bg-blue-600"
            >
              Đăng ký tài khoản
            </button>
          </>
        )}
      </div>

      {/* Luôn gắn trực tiếp — Thành viên tiêu biểu tuần qua (mọi khối) */}
      <div className="shrink-0 min-h-[280px]" data-block="weekly-featured">
        <HomeSidebarLeaderboard
          scoresList={scoresList}
          studentsList={studentsList}
          grade=""
          studentName={studentName}
          mode="weekly"
        />
      </div>

      {showSidebarGuide ? (
        <>
          <div className="p-3 border-b border-slate-100">
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">
              {sidebarSectionTitle}
            </p>
            {sidebarVideoUrl ? (
              <a
                href={sidebarVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg overflow-hidden border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center relative group block hover:opacity-95 transition-opacity"
                title={sidebarVideoTitle}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 to-indigo-900/90" />
                <PlayCircle className="w-12 h-12 text-white/90 relative z-10 group-hover:scale-110 transition-transform" />
                <p className="absolute bottom-2 left-2 right-2 text-[10px] text-white/80 font-semibold z-10 line-clamp-2">
                  {sidebarVideoTitle}
                </p>
              </a>
            ) : (
              <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 to-indigo-900/90" />
                <PlayCircle className="w-12 h-12 text-white/90 relative z-10" />
                <p className="absolute bottom-2 left-2 right-2 text-[10px] text-white/80 font-semibold z-10 line-clamp-2">
                  {sidebarVideoTitle}
                </p>
              </div>
            )}
          </div>

          <div className="p-3 space-y-2">
            <div className="flex gap-2">
              <a
                href={sidebarFacebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#1877F2] text-white text-xs font-bold hover:opacity-90"
              >
                <span className="font-black text-sm">f</span> Facebook
              </a>
              <a
                href={sidebarYoutubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:opacity-90"
              >
                <PlayCircle className="w-4 h-4" /> Youtube
              </a>
            </div>
            <p className="text-[10px] text-slate-400 text-center leading-snug">{sidebarCopyright}</p>
          </div>
        </>
      ) : null}
    </div>
  );

  const courseSidebar = (
    <div className="flex flex-col h-full min-h-0 bg-white overflow-y-auto">
      <div className="p-4 border-b border-slate-100 shrink-0">
        <button
          type="button"
          onClick={reloadHomeFromLogo}
          className="w-full text-left rounded-xl p-2 -m-2 hover:bg-slate-50 transition-colors"
        >
          <MathEduLogo className="h-14" />
          <p className="text-xs text-slate-500 mt-1.5">
            Đang xem: <span className="font-bold text-blue-600">Toán {publicGrade}</span>
          </p>
        </button>
      </div>

      <div className="flex-1 py-3 min-h-0">
        {dynamicChapters.map((chapter) => (
          <div key={chapter.id} className="mb-1">
            <button
              type="button"
              onClick={() => toggleChapter(chapter.id)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-indigo-50/60 transition-colors text-left rounded-lg"
            >
              <span className="font-black text-sm text-indigo-800 leading-snug pr-2">
                {chapter.title}
              </span>
              {expandedChapters.includes(chapter.id) ? (
                <ChevronDown className="w-4 h-4 text-indigo-500 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-indigo-400 shrink-0" />
              )}
            </button>
            {expandedChapters.includes(chapter.id) && (
              <div className="bg-slate-50/80 py-1 mx-2 rounded-lg">
                {chapter.lessons.map((lesson) => {
                  const sections = resolveLessonDisplaySections(lesson);
                  const lessonOpen = expandedLessons.includes(lesson.id);
                  const lessonLabel = getSidebarLessonTitle(lesson, sections);
                  return (
                    <div key={lesson.id} className="mb-0.5">
                      <div className="flex items-stretch gap-0.5">
                        <button
                          type="button"
                          onClick={() => openLesson(lesson.id)}
                          className={`flex-1 text-left px-3 py-2 pl-5 text-sm border-l-2 transition-colors rounded-r-lg ${
                            activeLessonId === lesson.id
                              ? 'border-blue-600 bg-blue-50 text-blue-900 font-extrabold'
                              : 'border-transparent text-slate-800 hover:bg-white hover:text-slate-950 font-bold'
                          }`}
                        >
                          {lessonLabel}
                        </button>
                        {sections.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => toggleLessonExpand(lesson.id)}
                            className="px-2 text-slate-400 hover:text-slate-700 shrink-0"
                            aria-label={lessonOpen ? 'Thu gọn mục' : 'Mở rộng mục'}
                          >
                            {lessonOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        ) : null}
                      </div>
                      {lessonOpen && sections.length > 0 ? (
                        <div className="ml-4 pl-3 border-l border-indigo-100 py-1 space-y-0.5">
                          {sections.map((sec) => (
                            <button
                              key={sec.id}
                              type="button"
                              onClick={() => openLesson(sec._sourceLessonId || lesson.id)}
                              className="w-full text-left px-2 py-1.5 text-xs font-medium text-slate-500 hover:text-blue-700 hover:bg-white rounded-md"
                            >
                              {getSectionDisplayLabel(sec)}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-slate-100 mt-auto" data-block="grade-leaderboard">
        <HomeSidebarLeaderboard
          scoresList={scoresList}
          studentsList={studentsList}
          grade={rosterGrade || publicGrade}
          studentName={studentName}
          mode="grade"
        />
      </div>
    </div>
  );

  const sidebarNav = landingMode === 'marketing' && !activeLessonId ? marketingSidebar : courseSidebar;

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] w-full max-w-[100vw] min-w-0 overflow-x-hidden bg-white text-slate-800">
      <header
        ref={navRef}
        className="sticky top-0 z-50 shrink-0 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-sm w-full min-w-0"
      >
        <div className="max-w-[1400px] mx-auto px-2.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-2 min-w-0">
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
              onClick={reloadHomeFromLogo}
              className="flex items-center min-w-0 shrink"
              aria-label="MathEdu — Trang chủ"
            >
              <MathEduLogo className="h-11 sm:h-14" />
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

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {studentName ? (
              <>
                <div className="relative" ref={notifRef}>
                  <StudentNotificationBell
                    studentId={studentProfile?.id}
                    studentName={studentName}
                    open={notifOpen}
                    onOpenChange={(v) => {
                      setNotifOpen(v);
                      if (v) setProfileMenuOpen(false);
                    }}
                    onOpenLink={(n) => {
                      if (n.link_type === 'lesson' && n.link_id) {
                        onSelectLesson?.(n.link_id);
                        return;
                      }
                      if (n.link_type === 'quiz' && n.link_id) {
                        onSelectQuiz?.(n.link_id);
                        return;
                      }
                      if (n.link_url) window.open(n.link_url, '_blank');
                    }}
                  />
                </div>
                <div className="relative" ref={profileRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen((v) => !v);
                      setNotifOpen(false);
                    }}
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200/60 hover:bg-blue-700 transition-colors ring-2 ring-white"
                    aria-label="Tài khoản"
                    aria-expanded={profileMenuOpen}
                  >
                    <User className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                  {profileMenuOpen && (
                    <StudentProfileDropdown
                      studentName={studentName}
                      studentClass={studentClass}
                      rosterGrade={rosterGrade}
                      studentProfile={studentProfile}
                      onEnterStudentPortal={onEnterStudentPortal}
                      onLogout={onLogout}
                      onClose={() => setProfileMenuOpen(false)}
                      unreadCount={unreadNotif}
                      onOpenNotifications={() => {
                        setProfileMenuOpen(false);
                        setNotifOpen(true);
                      }}
                    />
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onRequestRegister && onRequestRegister()}
                  className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl border-2 border-orange-500 bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white text-xs sm:text-sm font-black shadow-sm shadow-orange-100 transition-colors"
                >
                  Đăng ký
                </button>
                <button
                  type="button"
                  onClick={() => onRequestLogin && onRequestLogin()}
                  className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl border-2 border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:border-blue-700 text-xs sm:text-sm font-black shadow-md shadow-blue-200/50 transition-colors"
                >
                  Đăng nhập
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden w-full">
        <aside className="hidden md:flex w-64 lg:w-72 flex-col shrink-0 overflow-hidden border-r border-slate-200 bg-white">
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

        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 min-w-0 w-full max-w-full">
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
        <div ref={contentScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 lg:p-8 bg-slate-50 min-w-0">
          {!activeLessonId ? (
            <div className="max-w-[1280px] mx-auto animate-in fade-in duration-500 w-full min-w-0">
              {landingMode === 'marketing' && (
                <>
              {homepageContent.blocks.filter((b) => b.enabled !== false).map((block) => {
                if (block.type === 'hero') {
                  const hf = block.fields || {};
                  const hc = block.colors || {};
                  return (
              <section key={block.id} className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center mb-10 md:mb-14 pt-1 sm:pt-2 min-w-0">
                <div className="min-w-0">
                  <span className="inline-block max-w-full px-2.5 sm:px-3 py-1.5 rounded-full text-[9px] sm:text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 mb-4 tracking-wide uppercase break-words">
                    {hf.eyebrow}
                  </span>
                  <h1 className="text-2xl sm:text-4xl md:text-[2.75rem] font-black text-slate-900 leading-tight tracking-tight mb-4">
                    {hf.headlineBefore}{' '}
                    <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">{hf.headlineBrand}</span>
                  </h1>
                  <p className="text-slate-600 text-sm sm:text-lg max-w-xl leading-relaxed mb-6">
                    {hf.subtitle}
                  </p>
                  <div className="flex flex-wrap gap-2.5 sm:gap-3 mb-8">
                    <button
                      type="button"
                      onClick={() => {
                        scrollToKhoiHoc();
                        setNavMenu(null);
                      }}
                      className="inline-flex items-center gap-2 text-white font-bold px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl shadow-lg transition-all text-sm sm:text-base"
                      style={{ backgroundColor: hc.ctaPrimaryBg || '#2563eb' }}
                    >
                      {hf.ctaPrimary} <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestRegister && onRequestRegister()}
                      className="inline-flex items-center gap-2 text-white font-bold px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl shadow-lg transition-all text-sm sm:text-base"
                      style={{ backgroundColor: hc.ctaSecondaryBg || '#f97316' }}
                    >
                      {hf.ctaSecondary}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-6 sm:gap-10 text-sm font-black text-slate-800">
                    <div>
                      <span className="block text-xl sm:text-2xl text-blue-600 tabular-nums">{hf.stat1Value}</span>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wide">{hf.stat1Label}</span>
                    </div>
                    <div>
                      <span className="block text-xl sm:text-2xl text-violet-600 tabular-nums">{hf.stat2Value}</span>
                      <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wide">{hf.stat2Label}</span>
                    </div>
                  </div>
                </div>
                <div className={`relative min-h-[220px] sm:min-h-[320px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl shadow-indigo-200/40 bg-gradient-to-b ${hc.panelGradient || 'from-cyan-400 via-blue-600 to-violet-800'} p-5 sm:p-8 flex flex-col justify-between min-w-0`}>
                  <span className="inline-flex self-start px-3 py-1 rounded-full bg-amber-300/90 text-amber-950 text-xs font-black uppercase tracking-wide">
                    {hf.panelBadge}
                  </span>
                  <div className="relative z-10 mt-4">
                    <p className="text-white/90 text-xs font-bold uppercase tracking-widest mb-2">{hf.panelKicker}</p>
                    <p className="text-2xl sm:text-3xl font-black text-white leading-tight mb-3">{hf.panelTitle}</p>
                    <p className="text-white/85 text-sm max-w-sm leading-relaxed">
                      {hf.panelDesc}
                    </p>
                  </div>
                  <GraduationCap className="absolute bottom-2 right-2 w-28 h-28 sm:w-40 sm:h-40 text-white/15 pointer-events-none" strokeWidth={1} />
                </div>
              </section>
                  );
                }
                if (block.type === 'promo_slider') {
                  return (
                    <PromoSlider
                      key={block.id}
                      block={block}
                      onRegister={() => {
                        const el = document.getElementById('hoc-thu');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        else if (onRequestRegister) onRequestRegister();
                      }}
                    />
                  );
                }
                if (block.type === 'featured_courses') {
                  return (
              <section key={block.id} className="relative mb-12 rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-b from-slate-50 via-white to-sky-50/40 border border-slate-200/80 px-3 sm:px-8 py-8 sm:py-11 min-w-0 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
                <div className="relative text-center mb-9 sm:mb-10">
                  <h2 className="text-3xl sm:text-4xl md:text-[2.65rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-600 tracking-tight mb-2.5">
                    {block.fields?.title || 'Khóa học tiêu biểu'}
                  </h2>
                  <p className="text-sm sm:text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">
                    {block.fields?.subtitle}
                  </p>
                </div>
                <div className="relative">
                  <div className="flex md:hidden gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 scrollbar-thin">
                    {featuredCourses.map((course) => (
                      <div key={course.id} className="snap-center shrink-0 w-[min(82vw,280px)]">
                        <FeaturedCourseCard {...course} />
                      </div>
                    ))}
                  </div>
                  <div className="hidden md:grid lg:hidden grid-cols-2 gap-5 px-6">
                    {featuredCourses
                      .slice(courseCarouselIdx * 2, courseCarouselIdx * 2 + 2)
                      .map((course) => (
                        <FeaturedCourseCard key={course.id} {...course} />
                      ))}
                  </div>
                  <div className="hidden lg:grid grid-cols-4 gap-5">
                    {featuredCourses.map((course) => (
                      <FeaturedCourseCard key={course.id} {...course} />
                    ))}
                  </div>
                </div>
              </section>
                  );
                }
                if (block.type === 'grade_grid') {
                  return (
              <section key={block.id} id="khoi-hoc" className="mb-12 scroll-mt-24 space-y-8 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-3 mb-4 px-1">
                    <h2 className="flex items-center gap-2 text-lg sm:text-2xl font-black text-blue-600 min-w-0">
                      <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 fill-blue-400/30 shrink-0" />
                      {block.fields?.thcsTitle || 'Khối THCS'}
                    </h2>
                    <button type="button" onClick={scrollToKhoiHoc} className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-blue-600 shrink-0">
                      {block.fields?.seeAllLabel || 'Xem tất cả →'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5 min-w-0">
                    {thcsCards.map((card) => (
                      <GradeLevelCard
                        key={card.id || card.grade}
                        grade={card.grade}
                        headerBg={card.headerBg}
                        hoverRow={card.hoverRow}
                        menuItems={gradeMenuItems}
                        moreLabel={moreLabel}
                        labelColor={card.labelColor}
                        numberColor={card.numberColor}
                        labelFontSize={card.labelFontSize}
                        numberFontSize={card.numberFontSize}
                        onMenuAction={(actionId) => handleGradeMenuAction(card.grade, actionId)}
                      />
                    ))}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-3 mb-4 px-1">
                    <h2 className="flex items-center gap-2 text-lg sm:text-2xl font-black text-blue-600 min-w-0">
                      <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 fill-blue-400/30 shrink-0" />
                      {block.fields?.thptTitle || 'Khối THPT'}
                    </h2>
                    <button type="button" onClick={scrollToKhoiHoc} className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-blue-600 shrink-0">
                      {block.fields?.seeAllLabel || 'Xem tất cả →'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5 min-w-0">
                    {thptCards.map((card) => (
                      <GradeLevelCard
                        key={card.id || card.grade}
                        grade={card.grade}
                        headerBg={card.headerBg}
                        hoverRow={card.hoverRow}
                        menuItems={gradeMenuItems}
                        moreLabel={moreLabel}
                        labelColor={card.labelColor}
                        numberColor={card.numberColor}
                        labelFontSize={card.labelFontSize}
                        numberFontSize={card.numberFontSize}
                        onMenuAction={(actionId) => handleGradeMenuAction(card.grade, actionId)}
                      />
                    ))}
                    {(block.luyenThi?.enabled !== false) && (
                      <LuyenThiCard
                        onEnterExam={() => runCmsAction('exam')}
                        onSelectGrade12={() => selectPublicGrade('12')}
                      />
                    )}
                  </div>
                </div>
              </section>
                  );
                }
                if (block.type === 'tutor_packages') {
                  return (
                    <TutorPackagesSection
                      key={block.id}
                      block={block}
                      onRegisterTrial={() => {
                        const el = document.getElementById('hoc-thu');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    />
                  );
                }
                if (block.type === 'hotline') {
                  return <HotlineConsultBar key={block.id} block={block} />;
                }
                if (block.type === 'trial_program') {
                  return <TrialProgramSection key={block.id} block={block} />;
                }
                if (block.type === 'community_hub') {
                  return (
                    <CommunityHubCards
                      key={block.id}
                      block={block}
                      onOpenQa={onOpenCommunityQa}
                      onOpenContest={onOpenWeeklyContest}
                    />
                  );
                }
                if (block.type === 'blog_docs') {
                  return (
                    <BlogDocsHomeSection
                      key={block.id}
                      onOpenBlogPost={onOpenBlogPost}
                      onOpenDocuments={onOpenDocuments}
                      onOpenDocument={onOpenDocument}
                    />
                  );
                }
                if (block.type === 'competition_banner') {
                  return <CompetitionBannerSection key={block.id} block={block} />;
                }
                return null;
              })}
                </>
              )}

              {landingMode === 'grade' && (
                <>
              {/* LỘ TRÌNH HỌC TẬP - DANH SÁCH CHƯƠNG */}
              <div id="lo-trinh" className="flex items-center gap-3 mb-8 scroll-mt-24">
                <Compass className="w-8 h-8 text-orange-500 shrink-0" />
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tight">Lộ trình học tập — Toán {publicGrade}</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {dynamicChapters.map((chapter) => {
                  const theme = CHAPTER_THEMES[chapter.theme] || CHAPTER_THEMES.blue;

                  return (
                  <div key={chapter.id} className={`bg-white rounded-3xl shadow-lg hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col border border-slate-100 ${theme.shadow}`}>

                    <div className={`relative p-7 bg-gradient-to-br ${theme.gradient} flex items-start justify-between gap-4 overflow-hidden`}>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl translate-y-1/2 -translate-x-1/4"></div>

                      <div className="relative z-10 flex-1 min-w-0">
                        <h3 className="text-xl sm:text-2xl font-black text-white leading-snug drop-shadow-md">
                          {chapter.title}
                        </h3>
                      </div>
                      <div className="relative z-10 w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shrink-0 shadow-sm">
                        <BookMarked className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="p-3 sm:p-4 flex-1 flex flex-col justify-start bg-white z-10 space-y-1">
                      {chapter.lessons.map((lesson) => {
                        const sections = resolveLessonDisplaySections(lesson);
                        const lessonOpen = expandedLessons.includes(lesson.id);
                        const lessonLabel = getSidebarLessonTitle(lesson, sections);
                        return (
                          <div key={lesson.id} className="rounded-2xl overflow-hidden">
                            <div className={`flex items-stretch ${theme.hoverLesson} rounded-2xl`}>
                              <button
                                type="button"
                                onClick={() => openLesson(lesson.id)}
                                className="flex-1 text-left px-3 sm:px-4 py-3 text-sm font-bold transition-all flex items-center gap-3 group/btn min-w-0"
                              >
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shrink-0 shadow-sm ${theme.iconBg}`}>
                                  <PlaySquare className="w-4 h-4 ml-0.5" />
                                </div>
                                <span className="line-clamp-2 leading-relaxed flex-1">{lessonLabel}</span>
                              </button>
                              {sections.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => toggleLessonExpand(lesson.id)}
                                  className={`px-3 shrink-0 flex items-center ${theme.arrow || 'text-slate-400'}`}
                                  aria-label={lessonOpen ? 'Thu gọn mục' : 'Mở rộng mục'}
                                >
                                  {lessonOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                </button>
                              ) : (
                                <div className={`px-3 flex items-center opacity-40 ${theme.arrow || 'text-slate-400'}`}>
                                  <ChevronRight className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                            {lessonOpen && sections.length > 0 ? (
                              <div className="ml-8 sm:ml-12 mr-2 mb-2 pl-3 border-l-2 border-slate-200 space-y-0.5">
                                {sections.map((sec) => (
                                  <button
                                    key={sec.id}
                                    type="button"
                                    onClick={() => openLesson(sec._sourceLessonId || lesson.id)}
                                    className="w-full text-left px-2.5 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-blue-700 hover:bg-slate-50 rounded-xl transition-colors"
                                  >
                                    {getSectionDisplayLabel(sec)}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )})}
              </div>

              {/* KHU VỰC THI ĐẤU / PHÒNG THI */}
              <div className="mt-14 mb-16 md:mb-24">
                <section className="relative bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-[0_8px_30px_rgba(15,23,42,0.06)] overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500" aria-hidden />
                  <div className="p-5 sm:p-7 md:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-7">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200/50 shrink-0">
                          <Rocket className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase">
                            Khu vực thi đấu
                          </h2>
                          <p className="text-sm text-slate-500 mt-0.5">
                            Sẵn sàng chinh phục các thử thách!
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onEnterExam && onEnterExam()}
                        className="inline-flex items-center justify-center gap-2 self-start sm:self-auto bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-5 sm:px-6 py-2.5 rounded-full font-bold text-sm shadow-lg shadow-blue-200/50 transition-all hover:-translate-y-0.5"
                      >
                        Vào phòng thi <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                      <button
                        type="button"
                        onClick={() => onEnterExam && onEnterExam()}
                        className="text-left bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-200 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <p className="text-[11px] font-black uppercase tracking-wider text-blue-600">
                            Luyện tập
                          </p>
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <BookOpen className="w-5 h-5" />
                          </div>
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 mb-1.5 leading-snug">
                          Đề theo chương
                        </h3>
                        <p className="text-sm text-slate-500 leading-relaxed mb-5">
                          Luyện tập theo Chương/Bài (và đề tổng hợp).
                        </p>
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                            {(practiceGroups.length + (combinedQuizzes?.length || 0))} nhóm /{' '}
                            {((practiceGroups || []).reduce((s, g) => s + (g?.quizzes?.length || 0), 0) +
                              (combinedQuizzes?.length || 0))}{' '}
                            đề
                          </span>
                          <span className="inline-flex items-center gap-1 text-blue-600 font-bold text-sm">
                            Xem chi tiết <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onEnterExam && onEnterExam()}
                        className="text-left bg-white rounded-2xl border border-slate-200 p-5 hover:border-amber-200 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <p className="text-[11px] font-black uppercase tracking-wider text-amber-600">
                            Kiểm tra
                          </p>
                          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                            <FileText className="w-5 h-5" />
                          </div>
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900 mb-1.5 leading-snug">
                          Đề thi giữa kì
                        </h3>
                        <p className="text-sm text-slate-500 leading-relaxed mb-5">
                          Tổng hợp kiến thức theo học kì.
                        </p>
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                            {midtermQuizzes.length} đề
                          </span>
                          <span className="inline-flex items-center gap-1 text-amber-600 font-bold text-sm">
                            Xem chi tiết <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onEnterExam && onEnterExam()}
                        className="text-left bg-white rounded-2xl border-2 border-emerald-200/80 p-5 hover:border-emerald-300 hover:shadow-md transition-all group relative overflow-hidden"
                      >
                        <div
                          className="absolute -right-6 -bottom-8 w-28 h-28 rounded-full bg-emerald-50 pointer-events-none"
                          aria-hidden
                        />
                        <div className="relative flex items-start justify-between gap-3 mb-3">
                          <p className="text-[11px] font-black uppercase tracking-wider text-emerald-600">
                            Thi học kì
                          </p>
                          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:bg-emerald-600 transition-colors">
                            <Trophy className="w-5 h-5" />
                          </div>
                        </div>
                        <h3 className="relative text-base sm:text-lg font-black text-emerald-800 mb-1.5 leading-snug">
                          Đề thi cuối kì
                        </h3>
                        <p className="relative text-sm text-slate-500 leading-relaxed mb-5">
                          Đề ôn tập và đề thi học kì.
                        </p>
                        <div className="relative flex items-center justify-between gap-2 pt-1">
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                            {finalQuizzes.length} đề
                          </span>
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-sm">
                            Xem chi tiết <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>
                </section>
              </div>
                </>
              )}

              {landingMode === 'grade' && (() => {
                const hub = homepageContent.blocks.find((b) => b.type === 'community_hub' && b.enabled !== false);
                const blog = homepageContent.blocks.find((b) => b.type === 'blog_docs' && b.enabled !== false);
                const banner = homepageContent.blocks.find(
                  (b) => b.type === 'competition_banner' && b.enabled !== false
                );
                return (
                  <>
                    {hub ? (
                      <CommunityHubCards
                        block={hub}
                        onOpenQa={onOpenCommunityQa}
                        onOpenContest={onOpenWeeklyContest}
                      />
                    ) : null}
                    {blog ? (
                      <BlogDocsHomeSection
                        onOpenBlogPost={onOpenBlogPost}
                        onOpenDocuments={onOpenDocuments}
                        onOpenDocument={onOpenDocument}
                      />
                    ) : null}
                    {banner ? <CompetitionBannerSection block={banner} /> : null}
                  </>
                );
              })()}

              {(footerBlock?.enabled !== false) && (
              <SiteFooter
                scrollParentRef={contentScrollRef}
                content={footerBlock}
                onGoHome={goToMarketingHome}
                onRequestLogin={onRequestLogin}
                onRequestRegister={onRequestRegister}
                onEnterExam={() => {
                  if (onEnterExam) onEnterExam();
                  else if (onRequestLogin) onRequestLogin();
                }}
                onSelectThcs={() => {
                  selectPublicGrade('9');
                  window.setTimeout(scrollToKhoiHoc, 100);
                }}
                onSelectThpt={() => {
                  selectPublicGrade('12');
                  window.setTimeout(scrollToKhoiHoc, 100);
                }}
                onScrollTo={(id) => {
                  const el = document.getElementById(id);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              />
              )}
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
                        <div className="bg-slate-50 p-4 sm:p-6 rounded-2xl inline-block w-full max-w-full min-w-0 sm:min-w-[280px]">
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