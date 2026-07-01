/* eslint-disable */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import renderMathInElement from 'katex/contrib/auto-render';
import {
  Menu,
  X,
  Calculator,
  Bell,
  Compass,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Pencil,
  FileText,
  Play,
  Clock,
  UserCircle,
  CheckCircle2,
  XCircle,
  Target,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  ExternalLink,
  LogIn,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Lightbulb,
} from 'lucide-react';

const DEFAULT_EXTERNAL_HOME =
  'https://sites.google.com/view/hoctoanthayphat/trang-ch%E1%BB%A7';
import { TextWithMath, TextWithMathWithLoiGiai } from './Math11Template';
import { stripLoiGiaiPrefix } from './loiGiaiSegments';
import { isAllowedImageUrl } from './RichMathContent';
import { embedSanitizedSvgIntoHtmlString } from './svgEmbed';
import { extractYouTubeID, buildYouTubeEmbedUrl, buildYouTubeWatchUrl } from './youtubeUtils';
import {
  theoryCorePlainToHtml,
  splitPhuongPhapBlocks,
  wrapPhuongPhapBlock,
  parseExamplesCoreStructure,
} from './theoryCoreRichText';
import { buildShuffledPracticeOrder, computeLessonStudyProgress } from './lessonProgress';
import BackButton from './BackButton';
import PracticeAnswerInput from './PracticeAnswerInput';

/** Thứ tự tab nội dung bài: lý thuyết → tự luyện → đề luyện → PDF */
const LESSON_TAB_SEQUENCE = ['theory', 'practice', 'papers', 'pdf'];

function lessonNoSortKey(raw) {
  const m = String(raw ?? '').match(/(\d+(?:[.,]\d+)?)/);
  return m ? parseFloat(m[1].replace(',', '.')) : Number.MAX_SAFE_INTEGER;
}

function lessonTabLabel(tabId) {
  switch (tabId) {
    case 'theory':
      return 'Lý thuyết & ví dụ';
    case 'practice':
      return 'Bài tập tự luyện';
    case 'papers':
      return 'Đề luyện tập';
    case 'pdf':
      return 'Tài liệu PDF';
    default:
      return tabId;
  }
}

function escapeHtmlAttr(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/** Trong HTML lý thuyết: chuyển ![alt](url) → <img> (cùng quy tắc URL với RichMathContent). */
function markdownImagesToHtmlInString(s) {
  return (s || '').replace(/!\[([^\]]*)\]\(\s*([^)]+?)\s*\)/g, (full, alt, src) => {
    const u = String(src).trim();
    if (!isAllowedImageUrl(u)) return full;
    return `<img src="${escapeHtmlAttr(u)}" alt="${escapeHtmlAttr(alt)}" class="max-w-full h-auto rounded-lg my-3 border border-slate-200 shadow-sm block mx-auto" loading="lazy" decoding="async" />`;
  });
}

function HtmlWithMath({ html, className }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const withSvg = embedSanitizedSvgIntoHtmlString(html || '');
    const withImg = markdownImagesToHtmlInString(withSvg);
    const safe = withImg.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    ref.current.innerHTML = safe;
    try {
      renderMathInElement(ref.current, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
        ],
        throwOnError: false,
        strict: false,
      });
    } catch {
      // ignore
    }
  }, [html]);
  return <div ref={ref} className={className} />;
}

function normalizeLessonContentForUI(rawContent) {
  const fallback = {
    theory: { rules: [{ title: 'Nội dung', content: 'Chưa có nội dung lý thuyết cho bài này.', note: [] }] },
    mathTypes: [],
    practice: [],
  };

  if (!rawContent) return fallback;

  if (typeof rawContent === 'string') {
    try {
      const parsed = JSON.parse(rawContent);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.examples)) {
        const html = parsed.examples
          .map((ex) => {
            const exTitle = (ex?.title || '').toString();
            const exDesc = (ex?.desc || '').toString();
            const items = Array.isArray(ex?.items) ? ex.items : [];
            const itemsHtml = items
              .map((it, idx) => {
                const q = (it?.q || '').toString();
                const steps = Array.isArray(it?.steps) ? it.steps : [];
                const stepsHtml = steps.map((s) => `<div>${(s || '').toString()}</div>`).join('');
                return `<div style="margin-top:12px"><div><strong>${String.fromCharCode(97 + (idx % 26))})</strong> ${q}</div><div style="margin-top:6px">${stepsHtml}</div></div>`;
              })
              .join('');
            return `<div><div style="font-weight:900; margin-bottom:6px">${exTitle}</div>${exDesc ? `<div style="margin-bottom:10px">${exDesc}</div>` : ''}${itemsHtml}</div>`;
          })
          .join('<hr style="margin:16px 0; border:none; border-top:1px dashed #e2e8f0" />');

        const rawPractice = Array.isArray(parsed.practice) ? parsed.practice : [];
        const practice = rawPractice.map((p, i) => ({
          id: p.id || `pr_${i}`,
          type: p.type === 'mcq' || p.type === 'input' || p.type === 'text' ? p.type : 'text',
          question: (p.question ?? p.content ?? '').toString(),
          options: Array.isArray(p.options) ? p.options : [],
          correctAnswer: p.correctAnswer,
          hint: (p.hint ?? p.guidance ?? '').toString().trim(),
          explanation: (p.explanation ?? '').toString().trim(),
        }));

        return {
          theory: { rules: [{ title: parsed.title || 'Bài giảng', content: html || 'Chưa có nội dung.', note: [] }] },
          mathTypes: [],
          practice,
        };
      }
    } catch {
      // ignore
    }

    return {
      theory: { rules: [{ title: 'Lý thuyết', content: rawContent, note: [] }] },
      mathTypes: [],
      practice: [],
    };
  }

  const normalized = { ...rawContent };
  if (!normalized.theory) normalized.theory = { rules: [] };
  if (!Array.isArray(normalized.theory.rules)) normalized.theory.rules = [];
  if (!Array.isArray(normalized.mathTypes)) normalized.mathTypes = [];
  if (!Array.isArray(normalized.practice)) normalized.practice = [];
  normalized.practice = normalized.practice.map((p, i) => ({
    id: p.id || `pr_${i}`,
    type: p.type === 'mcq' || p.type === 'input' || p.type === 'text' ? p.type : 'text',
    question: (p.question ?? p.content ?? '').toString(),
    options: Array.isArray(p.options) ? p.options : [],
    correctAnswer: p.correctAnswer,
    answerPlaceholder: (p.answerPlaceholder ?? '').toString(),
    hint: (p.hint ?? p.guidance ?? '').toString().trim(),
    explanation: (p.explanation ?? '').toString().trim(),
  }));
  normalized.theory.rules = normalized.theory.rules.map((r) => ({
    ...r,
    note: Array.isArray(r.note) ? r.note : [],
  }));
  if (normalized.theory.rules.length === 0) normalized.theory.rules = fallback.theory.rules;
  return normalized;
}

function parseLessonJson(content) {
  if (content == null) return null;
  if (typeof content === 'string') {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  if (typeof content === 'object') return content;
  return null;
}

function isPlaceholderItemQ(q) {
  const s = (q ?? '').toString().trim();
  if (!s) return true;
  if (/^yêu\s*cầu$/i.test(s)) return true;
  if (/^yêu\s*cầu\s*[.:：]?\s*$/i.test(s)) return true;
  return false;
}

function isDangExampleTitle(title) {
  return /^dạng\s*\d+/i.test((title || '').toString().trim());
}

/** Gom "Ví dụ 1,2..." ngay sau mỗi "Dạng n" cho đến Dạng kế tiếp. */
function groupExamplesByDang(examples) {
  const list = Array.isArray(examples) ? examples : [];
  const groups = [];
  let i = 0;
  while (i < list.length) {
    const ex = list[i];
    const t = (ex?.title || '').toString().trim();
    if (isDangExampleTitle(t)) {
      const dang = ex;
      const vidus = [];
      i += 1;
      while (i < list.length) {
        const t2 = (list[i]?.title || '').toString().trim();
        if (isDangExampleTitle(t2)) break;
        vidus.push(list[i]);
        i += 1;
      }
      groups.push({ kind: 'dangGroup', dang, vidus });
    } else {
      groups.push({ kind: 'loose', ex });
      i += 1;
    }
  }
  return groups;
}

function theoryCoreSource(lesson, contentJson) {
  const fromJson = (contentJson?.theory_core ?? '').toString().trim();
  if (fromJson) return fromJson;
  return (lesson?.description ?? '').toString().trim();
}

/**
 * Khi đã có examples_core: bỏ phần trong theory_core từ tiêu đề "Các dạng toán & ví dụ"
 * (thường do gõ nhầm cả vào tab Lý thuyết) để không lặp với khối examples_core.
 */
function stripTheoryCoreFromDangSectionHeading(raw) {
  const s = String(raw ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  if (!s.trim()) return s;
  const lines = s.split('\n');
  const re = /^#{1,6}\s*.*(các\s*dạng\s*toán|dạng\s*toán\s*và\s*ví\s*dụ|dạng\s*&\s*ví\s*dụ|dạng\s*toán\s*\+\s*ví\s*dụ)/i;
  let cut = -1;
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i].trim())) {
      cut = i;
      break;
    }
  }
  if (cut === -1) return s;
  return lines.slice(0, cut).join('\n').trimEnd();
}

function LessonSectionHeading({ num, title }) {
  return (
    <h3 className="font-display text-xl md:text-2xl font-black text-slate-900 mb-6 md:mb-8 flex flex-wrap items-center gap-3 justify-center md:justify-start">
      <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-base font-black shadow-sm shrink-0">
        {num}
      </span>
      <span className="text-center md:text-left uppercase tracking-tight text-slate-800">{title}</span>
    </h3>
  );
}

function TheoryCorePanel({ source }) {
  const s = (source || '').trim();
  if (!s) return null;
  const html = theoryCorePlainToHtml(s);
  return (
    <section className="mb-12 md:mb-16">
      <div className="max-w-4xl mx-auto px-2 md:px-4">
        <LessonSectionHeading num={1} title="Lý thuyết trọng tâm" />
        <div className="lesson-theory-content-frame rounded-2xl border-2 border-slate-300/80 bg-white px-5 py-6 md:px-8 md:py-8">
          <div className="w-full max-w-full text-left text-slate-800 text-base md:text-lg leading-loose lesson-math-content [&_p]:text-left [&_ul]:text-left [&_table]:text-left">
            <HtmlWithMath html={html} className="theory-core-rich block max-w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}

function PhuongPhapBlocks({ bodies }) {
  if (!Array.isArray(bodies) || bodies.length === 0) return null;
  return (
    <>
      {bodies.map((body, i) => (
        <HtmlWithMath
          key={`pp-${i}`}
          html={theoryCorePlainToHtml(wrapPhuongPhapBlock(body))}
          className="theory-core-rich block max-w-full lesson-math-content [&_p]:text-left [&_ul]:text-left"
        />
      ))}
    </>
  );
}

function ExamplesCorePanel({ examplesCoreText, phuongPhapFromTheory = [] }) {
  const hasExamples = Boolean((examplesCoreText || '').trim());
  const hasTheoryPp = Array.isArray(phuongPhapFromTheory) && phuongPhapFromTheory.length > 0;

  const parsed = useMemo(() => {
    if (!hasExamples) {
      return { dangBody: null, remainder: '', phuongPhapFromExamples: [], examplesHtml: '' };
    }
    const structure = parseExamplesCoreStructure(examplesCoreText);
    return {
      ...structure,
      examplesHtml: structure.remainder ? theoryCorePlainToHtml(structure.remainder) : '',
    };
  }, [examplesCoreText, hasExamples]);

  const allPhuongPhap = useMemo(
    () => [...(phuongPhapFromTheory || []), ...(parsed.phuongPhapFromExamples || [])],
    [phuongPhapFromTheory, parsed.phuongPhapFromExamples]
  );

  if (!hasExamples && !hasTheoryPp) return null;

  const showDangFrame = Boolean(parsed.dangBody) || allPhuongPhap.length > 0;

  return (
    <section className="mb-12 md:mb-16">
      <div className="max-w-4xl mx-auto px-2 md:px-4">
        <LessonSectionHeading num={2} title="Các dạng toán và ví dụ" />
        {showDangFrame ? (
          <div className="lesson-dang-method-frame rounded-2xl border border-indigo-200/70 bg-white px-5 py-6 md:px-8 md:py-7 mb-8 md:mb-10">
            {parsed.dangBody ? (
              <div className="lesson-dang-highlight mb-5 md:mb-6 pb-5 md:pb-6 border-b border-indigo-200/60">
                <span className="inline-flex items-center rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white mb-3">
                  Dạng
                </span>
                <p className="text-lg md:text-xl font-black text-slate-900 leading-snug">
                  <TextWithMathWithLoiGiai text={parsed.dangBody} />
                </p>
              </div>
            ) : null}
            <PhuongPhapBlocks bodies={allPhuongPhap} />
          </div>
        ) : null}
        {parsed.examplesHtml ? (
          <div className="w-full max-w-full text-left text-slate-800 text-base md:text-lg leading-loose lesson-math-content [&_.katex-display]:block [&_.katex-display]:mx-auto [&_.katex-display]:my-5 [&_p]:text-left [&_ul]:text-left [&_table]:text-left">
            <HtmlWithMath html={parsed.examplesHtml} className="theory-core-rich block max-w-full" />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PracticeHintPanel({ hint, open, onToggle }) {
  const text = (hint || '').toString().trim();
  if (!text) return null;
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-2 rounded-xl border border-amber-300/90 bg-amber-50/80 px-4 py-2.5 text-sm font-bold text-amber-900 hover:bg-amber-100/90 transition-colors"
      >
        <Lightbulb className="w-4 h-4 shrink-0 text-amber-600" />
        {open ? 'Ẩn gợi ý hướng dẫn' : 'Xem gợi ý hướng dẫn'}
      </button>
      {open ? (
        <div className="mt-3 rounded-xl border border-amber-200/90 bg-amber-50/40 px-5 py-4 text-slate-800 text-sm md:text-base leading-relaxed lesson-math-content">
          <TextWithMath text={text} />
        </div>
      ) : null}
    </div>
  );
}

function ExampleSolutionDetails({ steps }) {
  const list = Array.isArray(steps) ? steps.filter((x) => (x || '').toString().trim()) : [];
  if (!list.length) return null;
  return (
    <details className="group lesson-loi-giai-details mt-5 border-t border-slate-200 pt-4 bg-transparent shadow-none open:shadow-none">
      <summary className="cursor-pointer select-none list-none py-2 font-semibold text-indigo-800 hover:text-indigo-900 flex items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2.5">
          <span className="text-lg leading-none" aria-hidden="true">
            💡
          </span>
          <span>Xem lời giải chi tiết</span>
        </span>
        <span
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-xs transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        >
          ▲
        </span>
      </summary>
      <div className="pb-2 pt-3 space-y-4 text-slate-700 text-base md:text-lg leading-loose lesson-math-content">
        {list.map((step, sIdx) => (
          <div key={sIdx} className="pl-0">
            <TextWithMath text={stripLoiGiaiPrefix(step)} />
          </div>
        ))}
      </div>
    </details>
  );
}

function parseViduTitle(titleText) {
  const raw = (titleText || '').toString().trim();
  const m = raw.match(/^(Ví dụ\s*\d+)\s*(?:[:\.\-—]\s*)?(.*)$/i);
  if (m) {
    return { badge: m[1], body: (m[2] || '').trim() };
  }
  return { badge: raw || 'Ví dụ', body: '' };
}

function Math11ViduCard({ ex, index }) {
  const items = Array.isArray(ex?.items) ? ex.items : [];
  const realItems = items.filter((it) => !isPlaceholderItemQ(it?.q));
  const stepsOnly = items.length > 0 && realItems.length === 0;
  const allSteps = stepsOnly ? items.flatMap((it) => it.steps || []) : [];

  const titleText = (ex?.title || `Ví dụ ${index + 1}`).toString();
  const { badge, body: titleBody } = parseViduTitle(titleText);

  return (
    <div className="lesson-vidu-card rounded-xl border border-slate-200 bg-white px-5 py-5 md:px-7 md:py-6">
      <span className="lesson-vidu-badge inline-block rounded-md border-2 border-slate-800 bg-transparent px-3 py-1 text-sm font-black text-slate-900 mb-4">
        {badge}
      </span>

      {titleBody ? (
        <div className="text-base md:text-[1.05rem] font-medium text-slate-800 leading-relaxed mb-2">
          <TextWithMathWithLoiGiai text={titleBody} />
        </div>
      ) : null}

      {stepsOnly ? (
        <ExampleSolutionDetails steps={allSteps} />
      ) : (
        <div className="space-y-5">
          {realItems.map((item, i) => (
            <div key={i}>
              {realItems.length > 1 && (
                <div className="flex items-start gap-2 mb-2">
                  <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                    {String.fromCharCode(97 + i)}
                  </span>
                  <div className="text-slate-800 font-medium pt-0.5 min-w-0">
                    <TextWithMath text={item.q || ''} />
                  </div>
                </div>
              )}
              {realItems.length === 1 && (
                <div className="text-slate-800 font-medium mb-1">
                  <TextWithMath text={item.q || ''} />
                </div>
              )}
              <ExampleSolutionDetails steps={item.steps} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Tab mặc định: ưu tiên nội dung chính (chỉ bài tập / chỉ PDF khi không có ví dụ). */
function getInitialLessonTab(lesson) {
  const json = parseLessonJson(lesson?.content);
  const hasExamples =
    (Array.isArray(json?.examples) && json.examples.length > 0) || String(json?.examples_core || '').trim().length > 0;
  const practiceLen = Array.isArray(json?.practice) ? json.practice.length : 0;
  const pdfUrl = (lesson?.pdfUrl || lesson?.pdf_url || '').toString().trim();
  if (!hasExamples && practiceLen > 0) return 'practice';
  if (!hasExamples && practiceLen === 0 && pdfUrl) return 'pdf';
  return 'theory';
}

const CHAPTER_THEME_KEYS = ['blue', 'purple', 'orange'];
const CHAPTER_GRADIENT = {
  blue: 'from-blue-500 to-cyan-400',
  purple: 'from-purple-500 to-fuchsia-500',
  orange: 'from-orange-500 to-amber-500',
};

const parseNum = (v) => {
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

const normName = (s) => (s || '').trim().toLowerCase();

/** Đề gắn bài: (A) cùng chương + bài; hoặc (B) gắn theo chuyên đề: topic_lesson_id = lesson.id. */
function matchesLessonPaperQuiz(lesson, q) {
  const et = (q?.exam_type || 'lesson').toString().trim();
  if (et !== 'lesson') return false;
  const lg = String(lesson?.grade_level ?? '').trim();
  const qg = String(q?.grade_level ?? '').trim();
  if (lg && qg && qg !== lg) return false;
  const ltId = String(lesson?.id ?? '').trim();
  const lTopicId = String(lesson?.topic_id ?? '').trim();
  const qTopicLessonId = String(q?.topic_lesson_id ?? '').trim();
  if (ltId && qTopicLessonId && qTopicLessonId === ltId) return true;
  // Fallback: nếu cùng topic_id và trùng title (trường hợp import chỉ có title, chưa resolve id).
  const qTopicId = String(q?.topic_id ?? '').trim();
  const qTopicLessonTitle = String(q?.topic_lesson_title ?? '').trim().toLowerCase();
  const lTitle = String(lesson?.title ?? '').trim().toLowerCase();
  if (lTopicId && qTopicId && lTopicId === qTopicId && lTitle && qTopicLessonTitle && lTitle === qTopicLessonTitle) return true;
  const qc = (q?.chapter ?? '').toString().trim();
  const ql = (q?.lesson_no ?? '').toString().trim();
  const ch = (lesson?.chapter ?? '').toString().trim();
  const ln = (lesson?.lesson_no ?? '').toString().trim();
  return qc === ch && ql === ln;
}

export default function StudentLessonViewer({
  lesson,
  lessonsList = [],
  quizzesList = [],
  scoresList = [],
  studentName = '',
  studentClass = '',
  rosterGrade = '11',
  onBack,
  onBackToOverview,
  onOpenExamsRoom,
  onSelectLesson,
  onStartQuiz,
  onRequestLoginForPapers,
  resumePapersTabRef: resumePapersTabRefProp,
  externalHomeUrl = DEFAULT_EXTERNAL_HOME,
  onRecordLessonPracticeScore,
  /** Chỉ hiển thị cột nội dung (ẩn header/sidebar) — dùng xem nháp trong Admin. */
  previewEmbed = false,
  /** Khi preview: đồng bộ tab với panel sửa ('theory' | 'practice' | 'pdf' | 'papers'). */
  previewSyncedTab = null,
}) {
  const defaultResumePapersRef = useRef(false);
  const resumePapersTabRef = resumePapersTabRefProp ?? defaultResumePapersRef;
  const prevLessonIdForPracticeRef = useRef(undefined);
  const goOverview = onBackToOverview || onBack;
  const goBack = onBack || onBackToOverview;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState([]);
  const [activeTab, setActiveTab] = useState('theory');
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [practiceShuffleVersion, setPracticeShuffleVersion] = useState(0);
  const [practiceHintsOpen, setPracticeHintsOpen] = useState({});

  const lessonsEnriched = useMemo(() => {
    const me = normName(studentName);
    const g = String(rosterGrade || '').trim();
    const myScores = (scoresList || []).filter((s) => {
      if (normName(s?.name) !== me) return false;
      const sg = String(s?.grade_level ?? '').trim();
      if (sg && g && sg !== g) return false;
      return true;
    });

    return (lessonsList || [])
      .map((l) => {
        const chapter = (l?.chapter ?? '').toString().trim();
        const lesson_no = (l?.lesson_no ?? '').toString().trim();
        const lessonQuizzes = (quizzesList || []).filter((q) =>
          matchesLessonPaperQuiz({ ...l, chapter, lesson_no, grade_level: l.grade_level }, q)
        );
        const progress = computeLessonStudyProgress(l, lessonQuizzes, myScores);

        const qIds = new Set(lessonQuizzes.map((q) => q.id));
        const lessonScores = myScores
          .filter((s) => qIds.has(s.quizId))
          .map((s) => Number(s.score))
          .filter((n) => Number.isFinite(n));
        const avgScore = lessonScores.length
          ? lessonScores.reduce((acc, n) => acc + n, 0) / lessonScores.length
          : null;
        const weak = avgScore != null && avgScore < 5;

        return { ...l, _progress: progress, _weak: weak, _avgScore: avgScore, chapter, lesson_no };
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
  }, [lessonsList, quizzesList, scoresList, studentName, rosterGrade]);

  const currentTopicId = (lesson?.topic_id || '').toString().trim();
  const currentTopicName = (lesson?.topic_name || '').toString().trim();

  const dynamicChapters = useMemo(() => {
    // Khi đang học bài thuộc Chuyên đề ôn thi → sidebar gom theo chuyên đề (1 nhóm) thay vì theo chương.
    if (currentTopicId) {
      const lessons = lessonsEnriched.filter(
        (l) => (l.topic_id || '').toString().trim() === currentTopicId,
      );
      return [
        {
          id: `t_${currentTopicId}`,
          chapterNo: 'CĐ',
          theme: CHAPTER_THEME_KEYS[0],
          title: currentTopicName || 'Chuyên đề ôn thi',
          lessons,
        },
      ];
    }

    const grouped = new Map();
    lessonsEnriched.forEach((l) => {
      const tid = (l.topic_id || '').toString().trim();
      const tname = (l.topic_name || '').toString().trim();
      const chRaw = (l.chapter || '').toString().trim();
      // Nếu bài thuộc chuyên đề nhưng không gán Chương → gom thành một "chương riêng" mang tên chuyên đề.
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
      return {
        id: `c_${ch}`,
        chapterNo: String(ch).startsWith('topic:') ? 'CĐ' : ch,
        theme: CHAPTER_THEME_KEYS[idx % CHAPTER_THEME_KEYS.length],
        title: String(ch).startsWith('topic:') ? (row.title || 'Chuyên đề ôn thi') : `Chương ${ch}`,
        lessons,
      };
    });
  }, [lessonsEnriched, currentTopicId, currentTopicName]);

  useEffect(() => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
    setPracticeHintsOpen({});
    const cur = lesson?.id;
    if (prevLessonIdForPracticeRef.current !== undefined && prevLessonIdForPracticeRef.current !== cur) {
      setPracticeShuffleVersion((v) => v + 1);
    }
    prevLessonIdForPracticeRef.current = cur;
  }, [lesson?.id]);

  useLayoutEffect(() => {
    const goPapers = resumePapersTabRef.current;
    if (goPapers) resumePapersTabRef.current = false;
    if (previewEmbed) {
      if (goPapers) setActiveTab('papers');
      return;
    }
    setActiveTab(goPapers ? 'papers' : getInitialLessonTab(lesson));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ reset tab khi đổi bài (id), không khi cùng id đổi reference/content
  }, [lesson?.id, resumePapersTabRef, previewEmbed]);

  useEffect(() => {
    if (!previewEmbed) return;
    if (!previewSyncedTab) return;
    const allowed = ['theory', 'practice', 'papers', 'pdf'];
    if (!allowed.includes(previewSyncedTab)) return;
    setActiveTab(previewSyncedTab);
  }, [previewEmbed, previewSyncedTab, lesson?.content]);

  useEffect(() => {
    try {
      const el = document.getElementById('lesson-scroll-main');
      if (el) el.scrollTop = 0;
    } catch {
      /* ignore */
    }
  }, [lesson?.id]);

  useEffect(() => {
    if (previewEmbed) return;
    const cur = dynamicChapters.find((c) => c.lessons.some((l) => l.id === lesson?.id));
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (cur) next.add(cur.id);
      if (dynamicChapters[0]) next.add(dynamicChapters[0].id);
      return Array.from(next);
    });
  }, [lesson?.id, dynamicChapters, previewEmbed]);

  const contentJson = useMemo(() => parseLessonJson(lesson?.content), [lesson?.content]);
  const theoryCoreText = useMemo(
    () => theoryCoreSource(lesson, contentJson),
    [lesson?.description, lesson?.content, contentJson]
  );
  const examplesCoreText = useMemo(() => (contentJson?.examples_core ?? '').toString().trim(), [contentJson?.examples_core]);
  const exampleGroups = useMemo(() => groupExamplesByDang(contentJson?.examples), [contentJson?.examples]);
  const hasNewExamplesCore = Boolean(examplesCoreText && examplesCoreText.trim());
  const theoryCoreForPanel = useMemo(() => {
    if (!hasNewExamplesCore) return theoryCoreText;
    return stripTheoryCoreFromDangSectionHeading(theoryCoreText);
  }, [theoryCoreText, hasNewExamplesCore]);
  const theoryPanelSplit = useMemo(() => splitPhuongPhapBlocks(theoryCoreForPanel), [theoryCoreForPanel]);
  const theoryForPanel = theoryPanelSplit.text;
  const phuongPhapFromTheory = theoryPanelSplit.phuongPhapBodies;
  // Nếu đã có nội dung mới (examples_core), bỏ qua render kiểu cũ (examples mảng) để tránh lặp.
  const hasMath11Examples = !hasNewExamplesCore && Array.isArray(contentJson?.examples) && contentJson.examples.length > 0;
  const lessonData = useMemo(() => normalizeLessonContentForUI(lesson?.content), [lesson?.content]);
  const shuffledPractice = useMemo(
    () => buildShuffledPracticeOrder(lessonData.practice || []),
    [lesson?.id, lesson?.content, practiceShuffleVersion]
  );
  const interactivePractice = useMemo(
    () => shuffledPractice.filter((q) => q.type === 'mcq' || q.type === 'input'),
    [shuffledPractice]
  );

  const inputAnswerOk = useCallback((rawCorrect, rawUser) => {
    const u0 = (rawUser ?? '').toString().trim();
    if (!u0) return false;

    const normalizeLoose = (s) => {
      // Normalize common punctuation differences from Word/AI: spaces, fullwidth ; , parentheses.
      return (s ?? '')
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
        .replace(/[，]/g, ',')
        .replace(/[；]/g, ';')
        .replace(/\s+/g, '')
        .replace(/^[\(\[\{]+/, '')
        .replace(/[\)\]\}]+$/, '')
        .replace(/,+/g, ',')
        .replace(/;+?/g, ';');
    };

    const u = normalizeLoose(u0);
    const parts = (rawCorrect ?? '')
      .toString()
      .split(/[|;]/g)
      .map((x) => x.trim())
      .filter(Boolean);
    if (!parts.length) return false;
    const uNum = Number(u0.replace(',', '.'));
    const uIsNum = Number.isFinite(uNum);
    for (const p of parts) {
      const p0 = p.toString().trim();
      if (!p0) continue;
      if (normalizeLoose(p0) === u) return true;
      const pNum = Number(p0.replace(',', '.'));
      if (uIsNum && Number.isFinite(pNum) && Math.abs(uNum - pNum) <= 1e-9) return true;
    }
    return false;
  }, []);

  const handleQuizChange = (qId, value) => {
    if (quizSubmitted) return;
    setQuizAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const submitQuiz = () => {
    let score = 0;
    interactivePractice.forEach((q) => {
      if (q.type === 'mcq' && quizAnswers[q.id] === q.correctAnswer) score++;
      if (q.type === 'input' && inputAnswerOk(q.correctAnswer, quizAnswers[q.id])) score++;
    });
    setQuizScore(score);
    setQuizSubmitted(true);
    if (typeof onRecordLessonPracticeScore === 'function' && (studentName || '').trim() && interactivePractice.length > 0) {
      onRecordLessonPracticeScore({
        lessonId: lesson.id,
        lessonTitle: (lesson.title || '').toString(),
        score,
        total: interactivePractice.length,
        gradeLevel: (rosterGrade || '8').toString(),
      });
    }
  };

  const resetQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
    setPracticeHintsOpen({});
    setPracticeShuffleVersion((v) => v + 1);
  };

  const togglePracticeHint = useCallback((qid) => {
    setPracticeHintsOpen((prev) => ({ ...prev, [qid]: !prev[qid] }));
  }, []);

  const toggleChapter = (chapterId) => {
    setExpandedChapters((prev) =>
      prev.includes(chapterId) ? prev.filter((id) => id !== chapterId) : [...prev, chapterId]
    );
  };

  const videoId = extractYouTubeID(lesson?.videoUrl || '');
  const embedUrl = videoId ? buildYouTubeEmbedUrl(videoId) : '';
  const youtubeWatchUrl = videoId ? buildYouTubeWatchUrl(videoId) : (lesson?.videoUrl || '').trim();

  const videoMaterialRaw = (lesson?.videoMaterialUrl || lesson?.video_material_url || '').toString().trim();
  const videoMaterialId = extractYouTubeID(videoMaterialRaw);
  const embedMaterialUrl = videoMaterialId ? buildYouTubeEmbedUrl(videoMaterialId) : '';
  const youtubeMaterialWatchUrl = videoMaterialId
    ? buildYouTubeWatchUrl(videoMaterialId)
    : videoMaterialRaw;
  const durationMins = Number(lesson?.duration);
  const durationLabel = Number.isFinite(durationMins) && durationMins > 0 ? `${durationMins} phút` : '45 phút';

  const chapterNo = (lesson?.chapter ?? '').toString().trim() || '—';
  const lessonNo = (lesson?.lesson_no ?? '').toString().trim() || '—';
  const pdfUrl = (lesson?.pdfUrl || lesson?.pdf_url || '').toString().trim();

  const practiceCount = lessonData.practice?.length || 0;

  const lessonPapersQuizzes = useMemo(() => {
    return (quizzesList || [])
      .filter((q) => matchesLessonPaperQuiz(lesson, q))
      .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'vi'));
  }, [quizzesList, lesson]);

  const materialLinks = useMemo(() => {
    const raw = contentJson?.materials;
    const list = Array.isArray(raw)
      ? raw
          .filter((x) => x && typeof x === 'object')
          .map((x) => ({
            title: String(x.title ?? '').trim(),
            url: String(x.url ?? '').trim(),
          }))
          .filter((x) => x.url)
      : [];
    return list;
  }, [contentJson?.materials]);

  const papersQuizCount = lessonPapersQuizzes.length;
  const isLessonStudentLoggedIn = Boolean((studentName || '').trim());

  const lessonChainNav = useMemo(() => {
    const g = String(lesson?.grade_level ?? '').trim();
    const ch = String(lesson?.chapter ?? '').trim();
    const id = lesson?.id;
    const pool = (lessonsList || []).filter((l) => {
      if (!l?.id) return false;
      if (g && String(l.grade_level || '').trim() !== g) return false;
      if (ch && String(l.chapter || '').trim() !== ch) return false;
      return true;
    });
    const sorted = [...pool].sort((a, b) => {
      const ka = lessonNoSortKey(a.lesson_no);
      const kb = lessonNoSortKey(b.lesson_no);
      if (ka !== kb) return ka - kb;
      return String(a.title || '').localeCompare(String(b.title || ''), 'vi');
    });
    const idx = id ? sorted.findIndex((l) => l.id === id) : -1;
    return {
      prevLesson: idx > 0 ? sorted[idx - 1] : null,
      nextLesson: idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null,
    };
  }, [lessonsList, lesson?.id, lesson?.grade_level, lesson?.chapter]);

  const goNextTabOrLesson = useCallback(() => {
    const i = LESSON_TAB_SEQUENCE.indexOf(activeTab);
    const pos = i === -1 ? 0 : i;
    if (pos < LESSON_TAB_SEQUENCE.length - 1) {
      setActiveTab(LESSON_TAB_SEQUENCE[pos + 1]);
      return;
    }
    if (lessonChainNav.nextLesson && typeof onSelectLesson === 'function') {
      onSelectLesson(lessonChainNav.nextLesson.id);
      setActiveTab('theory');
    }
  }, [activeTab, lessonChainNav.nextLesson, onSelectLesson]);

  const goPrevTabOrLesson = useCallback(() => {
    const i = LESSON_TAB_SEQUENCE.indexOf(activeTab);
    const pos = i === -1 ? 0 : i;
    if (pos > 0) {
      setActiveTab(LESSON_TAB_SEQUENCE[pos - 1]);
      return;
    }
    if (lessonChainNav.prevLesson && typeof onSelectLesson === 'function') {
      onSelectLesson(lessonChainNav.prevLesson.id);
      setActiveTab('pdf');
    }
  }, [activeTab, lessonChainNav.prevLesson, onSelectLesson]);

  const navPos = LESSON_TAB_SEQUENCE.indexOf(activeTab);
  const navIndex = navPos === -1 ? 0 : navPos;
  const nextTabId = navIndex < LESSON_TAB_SEQUENCE.length - 1 ? LESSON_TAB_SEQUENCE[navIndex + 1] : null;
  const prevTabId = navIndex > 0 ? LESSON_TAB_SEQUENCE[navIndex - 1] : null;
  const canNext =
    nextTabId != null || (lessonChainNav.nextLesson != null && typeof onSelectLesson === 'function');
  const canPrev =
    prevTabId != null || (lessonChainNav.prevLesson != null && typeof onSelectLesson === 'function');

  const papersAttemptedIds = useMemo(() => {
    const me = normName(studentName);
    const g = String(rosterGrade || '').trim();
    const ids = new Set();
    (scoresList || []).forEach((s) => {
      if (normName(s?.name) !== me) return;
      const sg = String(s?.grade_level ?? '').trim();
      if (sg && g && sg !== g) return;
      if (s?.quizId) ids.add(s.quizId);
    });
    return ids;
  }, [scoresList, studentName, rosterGrade]);

  const chapterProgress = (ch) => {
    if (!ch.lessons.length) return { avg: 0, done: 0 };
    const avg = Math.round(ch.lessons.reduce((acc, x) => acc + (x._progress || 0), 0) / ch.lessons.length);
    const done = ch.lessons.filter((x) => (x._progress || 0) >= 100).length;
    return { avg, done };
  };

  const tabBtn = (id, label, Icon, extra) => {
    const active = activeTab === id;
    return (
      <button
        type="button"
        onClick={() => setActiveTab(id)}
        className={`relative inline-flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-bold whitespace-nowrap rounded-full transition flex-shrink-0 ${
          active
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'bg-transparent text-slate-500 hover:text-indigo-600 hover:bg-white'
        }`}
      >
        <Icon className={`w-4 h-4 md:w-5 md:h-5 flex-shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
        {label}
        {extra}
      </button>
    );
  };

  return (
    <div className="lesson-viewer lesson-sky-canvas flex flex-col flex-1 min-h-0 overflow-hidden font-sans leading-relaxed">
      {!previewEmbed ? (
      <header className="bg-white text-slate-800 shrink-0 border-b border-slate-200 z-20">
        <div className="flex h-14 items-center justify-between px-4 md:px-6 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="md:hidden text-slate-500 hover:text-indigo-600 p-1 shrink-0"
              onClick={() => setMobileOpen(true)}
              aria-label="Mở menu"
            >
              <Menu className="w-7 h-7" />
            </button>
            <button
              type="button"
              className="hidden md:inline-flex text-slate-500 hover:text-indigo-600 p-1 shrink-0"
              onClick={() => setFocusMode((v) => !v)}
              aria-label={focusMode ? 'Mở sidebar' : 'Chế độ tập trung'}
              title={focusMode ? 'Mở sidebar' : 'Chế độ tập trung (ẩn sidebar)'}
            >
              {focusMode ? <PanelLeftOpen className="w-6 h-6" /> : <PanelLeftClose className="w-6 h-6" />}
            </button>
            <div className="flex items-center gap-2 font-black text-base md:text-xl tracking-tight truncate min-w-0">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-200 shrink-0">
                <Calculator className="w-5 h-5 md:w-5 md:h-5" />
              </div>
              <span className="truncate text-slate-900">thayphatdaytoan</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-5 lg:gap-7 text-sm font-bold text-slate-600 shrink-0">
            <a
              href={externalHomeUrl}
              className="hover:text-indigo-600 transition-colors whitespace-nowrap"
            >
              Trang chủ
            </a>
            <button
              type="button"
              onClick={() => goOverview?.()}
              className="text-indigo-600 transition-colors border-b-2 border-indigo-500 pb-0.5 whitespace-nowrap"
            >
              Trang cá nhân
            </button>
            <button
              type="button"
              onClick={() => onOpenExamsRoom?.()}
              className="hover:text-indigo-600 transition-colors tracking-wide text-xs lg:text-sm whitespace-nowrap"
            >
              PHÒNG THI ONLINE
            </button>
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenExamsRoom ? (
              <button
                type="button"
                onClick={onOpenExamsRoom}
                title="Vào phòng thi"
                aria-label="Vào phòng thi"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-colors shrink-0"
              >
                <ClipboardList className="w-4 h-4" />
              </button>
            ) : null}
            <button
              type="button"
              className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200 hover:text-indigo-600 hover:border-indigo-200 transition"
              aria-label="Thông báo"
            >
              <Bell className="w-4 h-4" />
            </button>
            <div
              className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-xs cursor-default border border-indigo-200"
              title={studentName}
            >
              {(studentName || 'H').charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
        <nav className="md:hidden flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-3 py-2.5 border-t border-slate-200 text-xs font-black tracking-wide text-slate-600">
          <a href={externalHomeUrl} className="hover:text-indigo-600 transition-colors">
            Trang chủ
          </a>
          <button type="button" onClick={() => goOverview?.()} className="text-indigo-600">
            Trang cá nhân
          </button>
          <button type="button" onClick={() => onOpenExamsRoom?.()} className="hover:text-indigo-600 transition-colors">
            PHÒNG THI ONLINE
          </button>
        </nav>
      </header>
      ) : null}

      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {!previewEmbed && mobileOpen && (
          <button
            type="button"
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            aria-label="Đóng menu"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {!previewEmbed ? (
        <aside
          className={`absolute md:static inset-y-0 left-0 w-[300px] md:w-[320px] bg-white border-r border-slate-200 flex flex-col shrink-0 z-30 transition-transform duration-300 overflow-y-auto ${
            mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
          } ${focusMode ? 'md:hidden' : ''}`}
        >
          <div className="p-4 md:p-5 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm shadow-indigo-200">
                <Compass className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-slate-900 text-lg md:text-xl tracking-tight truncate">
                  {currentTopicId ? 'Chuyên đề ôn thi' : 'Lộ trình học'}
                </h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wide truncate">
                  {currentTopicId
                    ? currentTopicName || 'Chuyên đề'
                    : `Toán ${rosterGrade}${studentClass ? ` · ${studentClass}` : ''}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="hidden md:inline-flex text-slate-400 hover:text-indigo-600 p-1"
                onClick={() => setFocusMode(true)}
                aria-label="Chế độ tập trung"
                title="Thu gọn sidebar (Focus)"
              >
                <PanelLeftClose className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="md:hidden text-slate-400 hover:text-slate-600 p-1"
                onClick={() => setMobileOpen(false)}
                aria-label="Đóng"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-3 md:p-4 pt-2 space-y-3 pb-8">
            {dynamicChapters.map((ch) => {
              const open = expandedChapters.includes(ch.id);
              const { avg, done } = chapterProgress(ch);
              return (
                <div key={ch.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => toggleChapter(ch.id)}
                    className="w-full text-left bg-white hover:bg-slate-50 p-4 md:p-5 text-slate-800 flex justify-between items-start gap-2 transition-colors"
                  >
                    <div className="pr-2 min-w-0">
                      <span className="text-xs font-black uppercase tracking-widest text-indigo-600 block">
                        Chương {ch.chapterNo}
                      </span>
                      <h3 className="font-black text-base md:text-lg mt-1 leading-tight text-slate-900">{ch.title}</h3>
                      <div className="mt-3 bg-slate-100 rounded-full h-1.5 w-full overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${avg}%` }} />
                      </div>
                      <p className="text-xs font-semibold mt-2 text-slate-500">
                        {done}/{ch.lessons.length} bài đạt 100% tiến độ
                      </p>
                    </div>
                    <div className="bg-slate-100 p-1.5 rounded-lg shrink-0 mt-1 text-slate-500">
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>

                  {open && (
                    <div className="bg-white p-2 space-y-1.5 border-t border-slate-100">
                      {ch.lessons.map((l) => {
                        const isCurrent = l.id === lesson?.id;
                        const p = l._progress || 0;
                        const doneLesson = p >= 100;
                        const isWeak = !!l._weak && !doneLesson;
                        return (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => {
                              onSelectLesson?.(l.id);
                              setMobileOpen(false);
                            }}
                            className={`w-full text-left rounded-xl p-3 transition border ${
                              isCurrent
                                ? 'border-indigo-200 bg-indigo-50 relative overflow-hidden'
                                : 'border-transparent hover:bg-slate-50'
                            } ${doneLesson && !isCurrent ? 'opacity-80 hover:opacity-100' : ''}`}
                          >
                            {isCurrent && <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-xl" />}
                            <div className={`flex items-center gap-3 ${isCurrent ? 'pl-1' : ''}`}>
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                  doneLesson
                                    ? 'bg-slate-100 text-slate-400'
                                    : isCurrent
                                      ? 'bg-indigo-100 text-indigo-600'
                                      : isWeak
                                        ? 'bg-rose-50 text-rose-600'
                                        : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {doneLesson ? (
                                  <CheckCircle className="w-5 h-5" />
                                ) : isCurrent ? (
                                  <Play className="w-5 h-5 ml-0.5" />
                                ) : (
                                  <BookOpen className="w-5 h-5" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className={`font-semibold text-sm leading-snug line-clamp-2 ${isCurrent ? 'text-indigo-900' : 'text-slate-800'}`}>
                                    {l.lesson_no ? `Bài ${l.lesson_no}: ` : ''}
                                    {l.title || 'Bài học'}
                                  </h4>
                                  {isWeak && (
                                    <span
                                      className="inline-flex items-center gap-1 text-xs font-black px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 border border-rose-200"
                                      title={l._avgScore != null ? `Điểm TB ${l._avgScore.toFixed(1)}/10 — cần ôn lại` : 'Bài đang yếu — cần ôn lại'}
                                    >
                                      <AlertTriangle className="w-3 h-3" /> Yếu
                                    </span>
                                  )}
                                </div>
                                <p className={`text-xs font-bold mt-1 uppercase tracking-wider ${isCurrent ? 'text-indigo-500' : 'text-slate-400'}`}>
                                  {doneLesson
                                    ? 'Đã hoàn thành'
                                    : isCurrent
                                      ? `Bạn đang học · ${p}%`
                                      : `Tiến độ · ${p}%`}
                                </p>
                                <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${isCurrent ? 'bg-indigo-500' : isWeak ? 'bg-rose-400' : 'bg-slate-300'}`}
                                    style={{ width: `${p}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
        ) : null}

        <main id="lesson-scroll-main" className="lesson-sky-canvas flex-1 overflow-y-auto min-w-0 scroll-smooth relative">
          {focusMode && !previewEmbed ? (
            <button
              type="button"
              onClick={() => setFocusMode(false)}
              title="Mở lại lộ trình học"
              className="hidden md:inline-flex fixed top-20 left-4 z-20 items-center gap-2 px-3 py-2 rounded-full bg-white text-indigo-700 border border-indigo-200 shadow-md hover:bg-indigo-50 text-xs font-bold"
            >
              <PanelLeftOpen className="w-4 h-4" /> Lộ trình học
            </button>
          ) : null}
          <div className="max-w-5xl mx-auto p-5 md:p-8 lg:p-10 pb-16 md:pb-12">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 md:mb-5 min-w-0">
              {!previewEmbed ? (
                <BackButton
                  variant="icon"
                  title="Quay lại"
                  className="shrink-0"
                  onBack={() => goBack?.()}
                />
              ) : null}
              <nav className="text-xs md:text-xs font-black text-slate-400 flex flex-wrap items-center gap-2 uppercase tracking-widest min-w-0">
              <button type="button" onClick={goOverview} className="hover:text-indigo-600 transition">
                Toán {rosterGrade}
              </button>
              <span className="text-slate-300">›</span>
              {currentTopicId ? (
                <span className="hover:text-indigo-600">Chuyên đề · {currentTopicName || 'Ôn thi'}</span>
              ) : (
                <span className="hover:text-indigo-600">Chương {chapterNo}</span>
              )}
              <span className="text-slate-300">›</span>
              <span className="text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded-md border border-indigo-100">
                {currentTopicId ? (lesson?.title ? (lesson.title.length > 24 ? `${lesson.title.slice(0, 24)}…` : lesson.title) : 'Bài học') : `Bài ${lessonNo}`}
              </span>
              </nav>
            </div>

            <div className="mb-6">
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                {lesson?.title || 'Bài học'}
              </h1>
              <p className="text-slate-500 mt-3 md:mt-4 text-sm font-semibold flex flex-wrap items-center gap-4 md:gap-5">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-5 h-5 text-teal-600" />
                  {durationLabel}
                </span>
                <span className="flex items-center gap-1.5">
                  <UserCircle className="w-5 h-5 text-teal-600" />
                  Thầy Phát
                </span>
              </p>
            </div>

            <div className="w-full bg-slate-900 rounded-3xl aspect-video shadow-2xl relative overflow-hidden mb-2 md:mb-3 border border-slate-800">
              {lesson?.videoUrl && videoId ? (
                <iframe
                  title={lesson.title}
                  src={embedUrl}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : lesson?.videoUrl && !videoId ? (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm px-4 text-center">
                  Link video không hỗ trợ nhúng. Mở trực tiếp từ URL đã nhập.
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-transparent to-slate-900/80">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-teal-500 rounded-full flex items-center justify-center text-white mb-3 md:mb-4 border-4 border-white/20 shadow-lg shadow-teal-500/30">
                    <Play className="w-8 h-8 md:w-9 md:h-9 ml-1" />
                  </div>
                  <p className="text-white font-bold tracking-wide text-sm md:text-base text-center px-4">
                    Video bài giảng sẽ hiển thị khi giáo viên thêm link YouTube
                  </p>
                </div>
              )}
            </div>
            {lesson?.videoUrl && videoId && youtubeWatchUrl ? (
              <p className="mb-6 md:mb-8 text-center">
                <a
                  href={youtubeWatchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm md:text-base font-bold text-teal-700 hover:text-teal-900 hover:underline"
                >
                  <ExternalLink className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                  Mở video trên YouTube (nếu bị chặn nhúng)
                </a>
              </p>
            ) : null}

            {videoMaterialRaw && videoMaterialId ? (
              <>
                <h2 className="text-lg md:text-xl font-black text-slate-800 mb-2 mt-2">Video tài liệu / ôn tập</h2>
                <div className="w-full bg-slate-900 rounded-3xl aspect-video shadow-xl relative overflow-hidden mb-2 md:mb-3 border border-slate-700">
                  <iframe
                    title={`${lesson?.title || 'Bài học'} — tài liệu`}
                    src={embedMaterialUrl}
                    className="absolute inset-0 w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
                {youtubeMaterialWatchUrl ? (
                  <p className="mb-6 md:mb-8 text-center">
                    <a
                      href={youtubeMaterialWatchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm md:text-base font-bold text-indigo-700 hover:text-indigo-900 hover:underline"
                    >
                      <ExternalLink className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                      Mở video tài liệu trên YouTube
                    </a>
                  </p>
                ) : null}
              </>
            ) : videoMaterialRaw && !videoMaterialId ? (
              <p className="mb-6 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                Có link video tài liệu nhưng không nhận dạng được YouTube. Hãy dùng dạng youtube.com/watch?v=... hoặc youtu.be/...
              </p>
            ) : null}

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-10 md:mb-12">
              <div className="flex items-center gap-2 p-2 md:p-2.5 bg-slate-50/90 border-b border-slate-200 overflow-x-auto">
                {tabBtn('theory', 'LÝ THUYẾT & VÍ DỤ', BookOpen)}
                {tabBtn(
                  'practice',
                  'BÀI TẬP TỰ LUYỆN',
                  Pencil,
                  practiceCount > 0 ? (
                    <span className="ml-0.5 w-2 h-2 bg-red-500 rounded-full" />
                  ) : null
                )}
                {tabBtn(
                  'papers',
                  'ĐỀ LUYỆN TẬP',
                  ClipboardList,
                  papersQuizCount > 0 ? (
                    <span className="ml-0.5 w-2 h-2 bg-amber-500 rounded-full" />
                  ) : null
                )}
                {tabBtn('pdf', 'TÀI LIỆU PDF', FileText)}
              </div>

              {activeTab === 'theory' && (
                <div className="p-6 md:p-10 lg:p-12 animate-in fade-in duration-200">
                  {!hasMath11Examples && (
                    <>
                      <TheoryCorePanel source={theoryForPanel} />
                      <ExamplesCorePanel
                        examplesCoreText={examplesCoreText}
                        phuongPhapFromTheory={phuongPhapFromTheory}
                      />
                      {!hasNewExamplesCore &&
                        lessonData.theory.rules.map((rule, idx) => (
                        <div
                          key={idx}
                          className="mb-10 rounded-2xl border border-slate-200 bg-slate-50/50 p-6 md:p-8 shadow-sm"
                        >
                          <h3 className="text-lg md:text-xl font-black text-teal-900 mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-teal-200 text-teal-900 flex items-center justify-center text-sm font-black">
                              {idx + 1}
                            </span>
                            {rule.title}
                          </h3>
                          <HtmlWithMath html={rule.content} className="text-slate-800 text-base leading-relaxed" />
                          {Array.isArray(rule.note) && rule.note.length > 0 && (
                            <div className="mt-5 bg-white/70 border border-teal-100 rounded-xl p-4">
                              <h4 className="font-bold text-teal-700 mb-2 flex items-center gap-2 text-xs uppercase">
                                <AlertCircle className="w-4 h-4" /> Ghi nhớ
                              </h4>
                              <ul className="list-disc list-inside space-y-1 text-slate-700 text-sm">
                                {rule.note.map((n, i) => (
                                  <li key={i}>{n}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        ))}
                    </>
                  )}

                  {hasMath11Examples && (
                    <>
                      <TheoryCorePanel source={theoryForPanel} />
                      <section className="mb-12 md:mb-16">
                        <div className="max-w-4xl mx-auto px-2 md:px-4">
                          <LessonSectionHeading num={2} title="Các dạng toán và ví dụ" />
                          <div className="space-y-10 md:space-y-12">
                        {exampleGroups.map((g, gi) => {
                          if (g.kind === 'loose') {
                            const ex = g.ex;
                            const t = (ex?.title || '').toString().trim();
                            const hasItems = Array.isArray(ex?.items) && ex.items.length > 0;
                            const looksVidu = /^ví\s*dụ/i.test(t) || hasItems;
                            if (!looksVidu) {
                              return (
                                <div
                                  key={`loose-${ex?.id ?? gi}`}
                                  className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm mb-6"
                                >
                                  <h4 className="font-black text-slate-800 mb-3 text-base md:text-lg">
                                    <TextWithMathWithLoiGiai text={t || 'Nội dung'} />
                                  </h4>
                                  {(ex?.desc || '').toString().trim() ? (
                                    <div className="text-slate-700 text-sm md:text-base leading-relaxed">
                                      <TextWithMathWithLoiGiai text={ex.desc.trim()} />
                                    </div>
                                  ) : null}
                                </div>
                              );
                            }
                            return (
                              <div key={`loose-${ex?.id ?? gi}`} className="mb-2">
                                <Math11ViduCard ex={ex} index={gi} />
                              </div>
                            );
                          }
                          const { dang, vidus } = g;
                          const isFirstDang =
                            exampleGroups.findIndex((item) => item.kind === 'dangGroup') === gi;
                          const theoryPpForDang = isFirstDang ? phuongPhapFromTheory : [];
                          return (
                            <div key={`dang-${dang?.id ?? gi}`} className="space-y-6">
                              <div className="lesson-dang-method-frame rounded-2xl border border-indigo-200/70 bg-white px-5 py-6 md:px-8 md:py-7">
                                <div className="lesson-dang-highlight mb-5 md:mb-6 pb-5 md:pb-6 border-b border-indigo-200/60">
                                  <span className="inline-flex items-center rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white mb-3">
                                    Dạng
                                  </span>
                                  <p className="text-lg md:text-xl font-black text-slate-900 leading-snug">
                                    <TextWithMathWithLoiGiai text={(dang?.title || '').toString()} />
                                  </p>
                                </div>
                                <PhuongPhapBlocks bodies={theoryPpForDang} />
                                {(dang?.desc || '').toString().trim() ? (
                                  <div className="rounded-xl border border-violet-200/80 bg-white/70 px-5 py-5 md:px-7 md:py-6">
                                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-violet-800 mb-3">
                                      Phương pháp / Tóm tắt
                                    </p>
                                    <div className="text-slate-800 text-sm md:text-base leading-relaxed">
                                      <TextWithMathWithLoiGiai text={dang.desc.trim()} />
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                              <div className="space-y-5">
                                {vidus.length === 0 ? (
                                  <p className="text-sm text-slate-500 italic py-2">
                                    (Chưa gắn ví dụ minh họa sau dạng này — có thể thêm dòng Ví dụ 1: ... trong file import.)
                                  </p>
                                ) : (
                                  vidus.map((v, vi) => (
                                    <Math11ViduCard key={v?.id ?? `${gi}-v-${vi}`} ex={v} index={vi} />
                                  ))
                                )}
                              </div>
                            </div>
                          );
                        })}
                          </div>
                        </div>
                      </section>
                    </>
                  )}

                  {!hasMath11Examples &&
                    !theoryForPanel.trim() &&
                    !examplesCoreText &&
                    !phuongPhapFromTheory.length &&
                    (hasNewExamplesCore || lessonData.theory.rules.length === 0) && (
                    <p className="text-slate-500 text-center py-8">Nội dung đang được cập nhật.</p>
                  )}
                </div>
              )}

              {activeTab === 'practice' && (
                <div className="p-6 md:p-10 lg:p-12 animate-in fade-in duration-200">
                  {lessonData.practice.length === 0 ? (
                    <div className="text-center py-12 text-slate-600">
                      <p className="font-semibold">Chưa có bài tập tự luyện trong nội dung bài này.</p>
                      <p className="text-sm mt-2">Có thể import từ file (mục BÀI TẬP TỰ LUYỆN) hoặc làm đề trong Phòng thi.</p>
                    </div>
                  ) : (
                    <div className="w-full max-w-none">
                      <div className="text-center mb-8 md:mb-10 pb-6 md:pb-8 border-b border-slate-200/80">
                        <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-1">Bài tập tự luyện</h2>
                        <p className="text-slate-600 text-sm">
                          {interactivePractice.length > 0
                            ? 'Hoàn thành các câu hỏi để kiểm tra kiến thức'
                            : 'Ôn tập — công thức có thể gõ dạng LaTeX trong $...$'}
                        </p>
                      </div>
                      <div className="space-y-6 md:space-y-8">
                        {shuffledPractice.map((q, index) => (
                          <div key={`${q.id}-${index}`} className="p-6 md:p-7 rounded-2xl border border-slate-200/90 bg-white shadow-sm">
                            <h4 className="font-bold text-slate-800 mb-4 flex gap-3 flex-wrap items-start text-base md:text-lg leading-relaxed">
                              <span className="text-indigo-600 shrink-0">Câu {index + 1}:</span>
                              {q.type === 'text' ? (
                                <span className="text-left font-normal text-slate-800 min-w-0 flex-1">
                                  <TextWithMathWithLoiGiai text={q.question || ''} />
                                </span>
                              ) : (
                                <span className="min-w-0 flex-1 text-left font-normal">
                                  <TextWithMathWithLoiGiai text={q.question || ''} />
                                </span>
                              )}
                            </h4>
                            {q.type === 'text' ? null : q.type === 'mcq' ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(q.options || []).map((opt, oIdx) => {
                                  const isSelected = quizAnswers[q.id] === oIdx;
                                  const isCorrect = q.correctAnswer === oIdx;
                                  let btnClass =
                                    'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 bg-white';
                                  if (quizSubmitted) {
                                    if (isCorrect) btnClass = 'border-emerald-500 bg-emerald-50 text-emerald-800';
                                    else if (isSelected && !isCorrect)
                                      btnClass = 'border-red-500 bg-red-50 text-red-800';
                                    else btnClass = 'border-slate-200 bg-white opacity-50';
                                  } else if (isSelected) {
                                    btnClass = 'border-indigo-500 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500';
                                  }
                                  return (
                                    <button
                                      key={oIdx}
                                      type="button"
                                      onClick={() => handleQuizChange(q.id, oIdx)}
                                      disabled={quizSubmitted}
                                      className={`p-3 md:p-4 rounded-xl border-2 text-left font-medium transition-all flex items-center gap-3 ${btnClass}`}
                                    >
                                      <span
                                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                          isSelected || (quizSubmitted && isCorrect)
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 text-slate-500'
                                        }`}
                                      >
                                        {String.fromCharCode(65 + oIdx)}
                                      </span>
                                      <TextWithMathWithLoiGiai text={String(opt ?? '')} inlineImage />
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null}
                            {q.type === 'input' ? (
                              <PracticeAnswerInput
                                q={q}
                                value={quizAnswers[q.id] || ''}
                                disabled={quizSubmitted}
                                onChange={(val) => handleQuizChange(q.id, val)}
                              />
                            ) : null}
                            <PracticeHintPanel
                              hint={q.hint}
                              open={Boolean(practiceHintsOpen[q.id])}
                              onToggle={() => togglePracticeHint(q.id)}
                            />
                            {quizSubmitted && (q.type === 'mcq' || q.type === 'input') ? (
                              <div className="mt-5 rounded-xl border border-slate-200 bg-indigo-50/30 px-5 py-5 md:px-6 md:py-6">
                                <p className="text-xs font-bold uppercase tracking-widest text-indigo-800 mb-3 flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                                  Đáp án và lời giải
                                </p>
                                {q.type === 'mcq' && Array.isArray(q.options) && q.correctAnswer != null ? (
                                  <div className="text-slate-800 font-semibold mb-2">
                                    <span className="text-teal-700">Đáp án đúng: </span>
                                    <span className="font-black text-emerald-800">
                                      {String.fromCharCode(65 + Number(q.correctAnswer))}.
                                    </span>{' '}
                                    <span className="font-medium">
                                      <TextWithMathWithLoiGiai text={String(q.options[q.correctAnswer] ?? '')} inlineImage />
                                    </span>
                                  </div>
                                ) : null}
                                {q.type === 'input' ? (
                                  <div className="text-slate-800 font-semibold mb-2">
                                    <span className="text-teal-700">Đáp án đúng: </span>
                                    <span className="font-black text-emerald-800">
                                      <TextWithMathWithLoiGiai text={String(q.correctAnswer ?? '')} />
                                    </span>
                                  </div>
                                ) : null}
                                {(q.explanation || '').toString().trim() ? (
                                  <div className="mt-3 pt-3 border-t border-teal-200/80 text-slate-700 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                                      Lời giải chi tiết
                                    </p>
                                    <TextWithMathWithLoiGiai text={(q.explanation || '').toString().trim()} />
                                  </div>
                                ) : (
                                  <p className="text-sm text-slate-500 italic mt-1">
                                    Chưa có lời giải chi tiết trong nội dung bài — chỉ hiển thị đáp án đúng.
                                  </p>
                                )}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      <div className="mt-8 text-center border-t border-slate-100 pt-6 space-y-4">
                        {interactivePractice.length > 0 ? (
                          <>
                            {!quizSubmitted ? (
                              <button
                                type="button"
                                onClick={submitQuiz}
                                className="bg-indigo-600 text-white px-8 py-3.5 rounded-full font-black text-sm md:text-base hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 inline-flex items-center gap-2 min-w-[220px] justify-center"
                              >
                                <Target className="w-5 h-5 shrink-0" />
                                Nộp bài — xem đáp án
                              </button>
                            ) : null}
                            {quizSubmitted ? (
                              <div className="space-y-4">
                                <div className="bg-slate-50 p-5 rounded-2xl inline-block min-w-[260px] border border-slate-200/80">
                                  <h3 className="text-base font-bold text-slate-600 mb-2">Kết quả</h3>
                                  <p className="text-4xl font-black text-teal-600 mb-1">
                                    {quizScore} / {interactivePractice.length}
                                  </p>
                                  {(studentName || '').trim() ? (
                                    <p className="text-xs text-amber-800 font-semibold mb-4">
                                      +{Math.round(quizScore * 15)} EXP (điểm × 15) — đã ghi vào tiến trình bài học
                                    </p>
                                  ) : (
                                    <p className="text-xs text-slate-500 mb-4">
                                      Đăng nhập bằng tên trong lớp để lưu điểm, EXP và thanh tiến trình.
                                    </p>
                                  )}
                                  <button
                                    type="button"
                                    onClick={resetQuiz}
                                    className="bg-white border-2 border-slate-200 text-slate-600 px-5 py-2 rounded-xl font-bold hover:bg-slate-100 transition-colors text-sm"
                                  >
                                    Làm lại (đổi thứ tự câu và đáp án)
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500 max-w-md mx-auto">
                                Chỉ sau khi <strong className="text-slate-700">nộp bài</strong> mới hiện đáp án đúng và lời
                                giải phía dưới từng câu.
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-slate-500 max-w-lg mx-auto">
                            Phần trên là bài tự luyện dạng tự giải. Đáp án chi tiết xem trong lời giải phần lý thuyết hoặc tài liệu PDF.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'papers' && (
                <div className="p-5 md:p-10 animate-in fade-in duration-200">
                  {!isLessonStudentLoggedIn ? (
                    <div className="rounded-2xl border-2 border-teal-200 bg-gradient-to-b from-teal-50/80 to-white p-8 md:p-10 text-center max-w-lg mx-auto shadow-sm">
                      <ClipboardList className="w-14 h-14 mx-auto mb-4 text-teal-600" />
                      <p className="font-black text-slate-900 text-lg mb-2">Đề luyện tập theo bài</p>
                      <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-6">
                        Đăng nhập bằng tên trong danh sách lớp để xem và làm các đề thi gắn với{' '}
                        <strong>
                          Chương {chapterNo} — Bài {lessonNo}
                        </strong>
                        .
                      </p>
                      <button
                        type="button"
                        onClick={() => onRequestLoginForPapers?.()}
                        className="inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-black px-8 py-3.5 rounded-xl shadow-lg transition-colors"
                      >
                        <LogIn className="w-5 h-5" />
                        Đăng nhập
                      </button>
                    </div>
                  ) : lessonPapersQuizzes.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <ClipboardList className="w-14 h-14 mx-auto mb-3 opacity-30 text-slate-400" />
                      <p className="font-semibold text-slate-700">Chưa có đề luyện tập cho bài này.</p>
                      <p className="text-sm mt-2 max-w-md mx-auto">
                        Giáo viên thêm đề trong Admin: loại <strong className="text-slate-700">theo bài</strong> (
                        <code className="bg-slate-100 px-1 rounded text-xs">exam_type: lesson</code>), cùng{' '}
                        <strong className="text-slate-700">Chương</strong> và <strong className="text-slate-700">Bài</strong> với bài giảng, và cùng{' '}
                        <strong className="text-slate-700">khối lớp</strong> nếu đề có ghi lớp.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-w-2xl mx-auto">
                      <p className="text-sm text-slate-500 font-semibold text-center md:text-left mb-2">
                        Đề theo bài · Chương {chapterNo} — Bài {lessonNo} ({papersQuizCount} đề)
                      </p>
                      {lessonPapersQuizzes.map((q) => {
                        const done = papersAttemptedIds.has(q.id);
                        const dur = Number(q.duration);
                        const durLabel = Number.isFinite(dur) && dur > 0 ? `${dur} phút` : null;
                        return (
                          <div
                            key={q.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-teal-300 transition-colors"
                          >
                            <div className="min-w-0 text-left">
                              <h4 className="font-bold text-slate-900 leading-snug">{q.title || 'Đề thi'}</h4>
                              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
                                {durLabel ? <span>{durLabel}</span> : null}
                                {durLabel ? <span>·</span> : null}
                                <span className="uppercase tracking-wide">Đề luyện</span>
                                {done ? (
                                  <>
                                    <span>·</span>
                                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                                      <CheckCircle className="w-3.5 h-3.5" /> Đã làm
                                    </span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onStartQuiz?.(q.id)}
                              className="shrink-0 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl transition-colors"
                            >
                              {done ? 'Làm lại' : 'Làm bài'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'pdf' && (
                <div className="p-8 md:p-10 animate-in fade-in duration-200">
                  {materialLinks.length > 0 ? (
                    <div className="max-w-xl mx-auto space-y-4">
                      <p className="text-sm text-slate-600 text-center font-semibold mb-2">Tài liệu đính kèm (JSON nội dung bài)</p>
                      <ul className="space-y-3">
                        {materialLinks.map((m, i) => (
                          <li key={`${m.url}-${i}`}>
                            <a
                              href={m.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between gap-3 w-full rounded-2xl border-2 border-teal-200 bg-white px-5 py-4 text-left font-bold text-teal-900 hover:bg-teal-50/90 hover:border-teal-400 transition shadow-sm"
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                <FileText className="w-5 h-5 shrink-0 text-teal-600" />
                                <span className="truncate">{m.title || 'Tài liệu'}</span>
                              </span>
                              <ExternalLink className="w-4 h-4 shrink-0 text-teal-600" />
                            </a>
                          </li>
                        ))}
                      </ul>
                      {pdfUrl ? (
                        <p className="text-center text-xs text-slate-500 pt-2">
                          Có thêm link PDF trên bài giảng (trường riêng) —{' '}
                          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-teal-700 font-bold underline">
                            mở tại đây
                          </a>
                        </p>
                      ) : null}
                    </div>
                  ) : pdfUrl ? (
                    <div className="text-center">
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-teal-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-teal-700 transition"
                      >
                        <FileText className="w-5 h-5" />
                        Mở / tải PDF
                      </a>
                    </div>
                  ) : (
                    <div className="text-slate-500 text-center max-w-md mx-auto">
                      <FileText className="w-14 h-14 mx-auto mb-3 opacity-30" />
                      <p className="font-semibold">Chưa có tài liệu.</p>
                      <p className="text-sm mt-2 leading-relaxed">
                        Giáo viên thêm link trong Admin → tab <strong className="text-slate-700">Tài liệu (JSON)</strong> (mảng{' '}
                        <code className="bg-slate-100 px-1 rounded text-xs">materials</code>) hoặc điền link PDF ở trường riêng của bài giảng.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!previewEmbed ? (
              <div className="mt-8 mb-2 max-w-5xl mx-auto px-0">
                {canNext ? (
                  <div className="mb-2 flex justify-center sm:justify-end">
                    <span className="inline-flex items-center gap-1.5 text-xs md:text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Hoàn thành bài này nhận <span className="text-amber-800 font-black">+50 EXP</span>
                    </span>
                  </div>
                ) : null}
                <div className="rounded-3xl border-2 border-white/80 bg-gradient-to-br from-slate-100/95 via-white to-indigo-50/40 p-3 md:p-4 shadow-xl shadow-slate-900/10 ring-1 ring-slate-200/90">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <button
                      type="button"
                      onClick={goPrevTabOrLesson}
                      disabled={!canPrev}
                      title={!canPrev ? 'Đã ở đầu lộ trình trong chương' : undefined}
                      className={`group flex-1 min-h-[3.75rem] md:min-h-[4.25rem] rounded-2xl px-4 md:px-6 py-3 md:py-4 font-black text-base md:text-lg text-white flex items-center justify-center gap-3 transition-all border-2 ${
                        canPrev
                          ? 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-600 border-fuchsia-300/50 shadow-lg hover:brightness-110 hover:scale-[1.01] active:scale-[0.99]'
                          : 'bg-slate-400 border-slate-300/60 opacity-60 cursor-not-allowed shadow-none'
                      }`}
                    >
                      <ChevronLeft className="w-7 h-7 md:w-8 md:h-8 shrink-0 opacity-90 group-hover:-translate-x-0.5 transition-transform" />
                      <span className="flex flex-col items-start min-w-0 text-left leading-tight">
                        <span>Quay lại</span>
                        <span className="text-xs md:text-sm font-bold opacity-90 truncate max-w-[14rem] md:max-w-[18rem]">
                          {prevTabId
                            ? `← ${lessonTabLabel(prevTabId)}`
                            : lessonChainNav.prevLesson
                              ? `← Bài trước: ${lessonChainNav.prevLesson.lesson_no ? `Bài ${lessonChainNav.prevLesson.lesson_no} · ` : ''}${(lessonChainNav.prevLesson.title || '').slice(0, 42)}${(lessonChainNav.prevLesson.title || '').length > 42 ? '…' : ''}`
                              : canPrev
                                ? '—'
                                : 'Đã đầu chương / lộ trình'}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={goNextTabOrLesson}
                      disabled={!canNext}
                      title={!canNext ? 'Đã ở cuối chương (không có bài sau)' : undefined}
                      className={`group flex-1 min-h-[3.75rem] md:min-h-[4.25rem] rounded-2xl px-4 md:px-6 py-3 md:py-4 font-black text-base md:text-lg text-white flex items-center justify-center gap-3 transition-all border-2 ${
                        canNext
                          ? 'bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 border-teal-200/80 shadow-lg hover:brightness-110 hover:scale-[1.01] active:scale-[0.99]'
                          : 'bg-slate-400 border-slate-300/60 opacity-60 cursor-not-allowed shadow-none'
                      }`}
                    >
                      <span className="flex flex-col items-end min-w-0 text-right leading-tight">
                        <span>Tiếp theo</span>
                        <span className="text-xs md:text-sm font-bold opacity-90 truncate max-w-[14rem] md:max-w-[18rem]">
                          {nextTabId
                            ? `${lessonTabLabel(nextTabId)} →`
                            : lessonChainNav.nextLesson
                              ? `Bài sau: ${lessonChainNav.nextLesson.lesson_no ? `Bài ${lessonChainNav.nextLesson.lesson_no} · ` : ''}${(lessonChainNav.nextLesson.title || '').slice(0, 42)}${(lessonChainNav.nextLesson.title || '').length > 42 ? '…' : ''} →`
                              : canNext
                                ? '—'
                                : 'Đã cuối chương'}
                        </span>
                      </span>
                      <ChevronRight className="w-7 h-7 md:w-8 md:h-8 shrink-0 opacity-90 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {!previewEmbed ? (
            <button
              type="button"
              onClick={() => goOverview?.()}
              className="mb-6 flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-teal-600 transition-colors bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm"
            >
              ← Quay lại lộ trình / bảng điều khiển
            </button>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
