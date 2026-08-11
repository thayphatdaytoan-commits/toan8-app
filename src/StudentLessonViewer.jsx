/* eslint-disable */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import renderMathInElement from 'katex/contrib/auto-render';
import {
  Menu,
  X,
  Calculator,
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
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  ExternalLink,
  LogIn,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Presentation,
  BookMarked,
  Atom,
  Lock,
  GraduationCap,
} from 'lucide-react';

const DEFAULT_EXTERNAL_HOME =
  'https://sites.google.com/view/hoctoanthayphat/trang-ch%E1%BB%A7';
import { TextWithMath, TextWithMathWithLoiGiai } from './Math11Template';
import { stripLoiGiaiPrefix } from './loiGiaiSegments';
import { isAllowedImageUrl, stripDollarWrappersAroundImages } from './RichMathContent';
import { embedSanitizedSvgIntoHtmlString } from './svgEmbed';
import { extractYouTubeID } from './youtubeUtils';
import LessonYouTubePlayer from './LessonYouTubePlayer';
import LessonSlidesEmbed from './LessonSlidesEmbed';
import LessonMindMapPanel from './LessonMindMapPanel';
import { parseLessonMindMapFromContent, lessonMindMapIsVisible } from './lessonMindMap';
import LessonSimulationPanel from './LessonSimulationPanel';
import { parseLessonSimulationFromContent, lessonSimulationIsVisible } from './lessonSimulation';
import {
  theoryCorePlainToHtml,
  splitPhuongPhapBlocks,
  wrapPhuongPhapBlock,
  parseExamplesCoreStructure,
  normalizeDoubleBackslashInMath,
  extractDangNumber,
} from './theoryCoreRichText';
import { buildShuffledPracticeOrder, computeLessonStudyProgress } from './lessonProgress';
import LessonDangExamplesPanel from './LessonDangExamplesPanel';
import {
  resolveExamplesDisplayMode,
  findLessonDangProgress,
  hasLessonPracticeAttempt,
  hasLessonDangCompleteOnce,
  getLessonPathGates,
} from './lessonDangExamples';
import BackButton from './BackButton';
import LessonPracticeSection from './LessonPracticeSection';
import StudentNotificationBell, { useStudentUnreadCount } from './StudentNotificationBell';
import StudentProfileDropdown from './StudentProfileDropdown';
import { isInteractivePracticeType, normalizePracticeList, resolvePracticeDisplayMode, scorePracticeQuestion } from './practiceQuestionTypes';
import {
  getLessonDisplayLabel,
  getSidebarLessonTitle,
  getSectionDisplayLabel,
  normalizeLessonSections,
  resolveActiveLessonSlice,
  sortLessonSections,
  mergeLessonsByLessonNo,
  lessonBelongsToGroup,
  isSgkRoadmapLesson,
  roadmapChapterKey,
} from './lessonSections';
import { formatSgkChapterHeading, formatSgkLessonHeading } from './sgkToc';

/** Thứ tự tab nội dung bài: lý thuyết → các dạng toán → sơ đồ → mô phỏng → luyện tập → đề luyện → PDF */
const LESSON_TAB_SEQUENCE = ['theory', 'dang', 'mindmap', 'simulation', 'practice', 'papers', 'pdf'];

function lessonNoSortKey(raw) {
  const m = String(raw ?? '').match(/(\d+(?:[.,]\d+)?)/);
  return m ? parseFloat(m[1].replace(',', '.')) : Number.MAX_SAFE_INTEGER;
}

function isChapterReviewLesson(lesson) {
  const title = String(lesson?.title || '').trim();
  const no = String(lesson?.lesson_no || '').trim();
  if (/^OT\d*/i.test(no)) return true;
  // Khớp dù title có tiền tố "Bài X." hay không
  if (/ôn\s*tập/i.test(title)) return true;
  return false;
}

function titleLessonSortKey(lesson) {
  const title = String(lesson?.title || '').trim();
  const m = title.match(/\bbài\s*(\d+(?:[.,]\d+)?)/i);
  return m ? parseFloat(m[1].replace(',', '.')) : Number.MAX_SAFE_INTEGER;
}

function lessonTabLabel(tabId) {
  switch (tabId) {
    case 'theory':
      return 'Lý thuyết';
    case 'dang':
      return 'Các dạng toán';
    case 'mindmap':
      return 'Tóm tắt bài học';
    case 'simulation':
      return 'Mô phỏng';
    case 'practice':
      return 'Bài tập luyện tập';
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

function decodeBasicHtmlEntities(s) {
  return String(s || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function brokenLessonImagePlaceholder(alt, srcHint = '') {
  const raw = String(alt || '').trim();
  const showLabel = raw && !/^(ảnh|anh|hình minh họa|hinh minh hoa)$/i.test(raw);
  const safeLabel = showLabel
    ? raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    : '';
  const src = String(srcHint || '').trim();
  const looksFirebase = /firebasestorage\.googleapis\.com|googleapis\.com.*\/o\//i.test(src);
  const looksEmpty = !src || src === '#' || /^javascript:/i.test(src);
  let tip =
    'Link ảnh trong bài đang không mở được (file có thể đã mất trên Storage, URL sai, hoặc bị cắt khi lưu).';
  if (looksEmpty) {
    tip = 'Ô ảnh không có URL — thường do lúc import/upload ảnh thất bại. Admin hãy Upload lại PNG/JPG.';
  } else if (looksFirebase) {
    tip =
      'Ảnh từng lưu trên Firebase nhưng link hiện không tải được (file bị xóa/đổi hoặc URL hỏng). Admin mở bài giảng → Upload lại PNG/JPG.';
  } else if (/^data:image\//i.test(src)) {
    tip = 'Ảnh nhúng data:URL có thể bị cắt vì quá dài. Nên Upload PNG/JPG lên Storage thay vì dán base64.';
  }
  return (
    `<div class="lesson-img-broken my-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="img" aria-label="Ảnh không tải được">` +
    `<p class="font-bold mb-0.5">Không tải được ảnh${safeLabel ? `: ${safeLabel}` : ''}</p>` +
    `<p class="text-xs text-amber-800/90 mb-0">${tip}</p>` +
    `</div>`
  );
}

/** Trong HTML lý thuyết: chuyển ![alt](url) → <img> (cùng quy tắc URL với RichMathContent). */
function markdownImagesToHtmlInString(s) {
  let t = stripDollarWrappersAroundImages(s || '');
  t = t.replace(/!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?\s*\)/g, (full, alt, src) => {
    const u = decodeBasicHtmlEntities(String(src).trim());
    if (!u || !isAllowedImageUrl(u)) return full;
    return `<img src="${escapeHtmlAttr(u)}" alt="${escapeHtmlAttr(alt)}" class="max-w-full h-auto rounded-lg my-3 border border-slate-200 shadow-sm block mx-auto" loading="lazy" decoding="async" data-lesson-img="1" />`;
  });
  // Sửa src đã bị double-encode &amp;amp;
  t = t.replace(/(<img\b[^>]*\bsrc=")([^"]+)(")/gi, (full, pre, src, post) => {
    let u = src;
    for (let i = 0; i < 3; i += 1) {
      const next = decodeBasicHtmlEntities(u);
      if (next === u) break;
      u = next;
    }
    return `${pre}${escapeHtmlAttr(u)}${post}`;
  });
  return stripDollarWrappersAroundImages(t);
}

function attachLessonImageFallbacks(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  root.querySelectorAll('img').forEach((img) => {
    if (img.dataset.fallbackBound === '1') return;
    img.dataset.fallbackBound = '1';
    let src = String(img.getAttribute('src') || '').trim();
    if (!src) {
      img.outerHTML = brokenLessonImagePlaceholder(img.getAttribute('alt'), '');
      return;
    }
    // Decode &amp; còn sót trong attribute (getAttribute đôi khi vẫn giữ entity)
    if (/&amp;/i.test(src) || /%26amp%3B/i.test(src)) {
      src = decodeBasicHtmlEntities(src);
      img.setAttribute('src', src);
    }
    // Ảnh đã cache/load xong thì thôi
    if (img.complete && img.naturalWidth > 0) return;
    img.addEventListener('error', () => {
      if (!img.isConnected) return;
      const failedSrc = String(img.currentSrc || img.getAttribute('src') || src);
      img.outerHTML = brokenLessonImagePlaceholder(img.getAttribute('alt'), failedSrc);
    });
  });
}

function HtmlWithMath({ html, className }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const withSvg = embedSanitizedSvgIntoHtmlString(html || '');
    const withImg = markdownImagesToHtmlInString(withSvg);
    const safe = withImg.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    ref.current.innerHTML = normalizeDoubleBackslashInMath(safe);
    attachLessonImageFallbacks(ref.current);
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
    attachLessonImageFallbacks(ref.current);
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
        const practice = normalizePracticeList(rawPractice);

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
  normalized.practice = normalizePracticeList(normalized.practice);
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
  return /^(?:dạng|dang)\s*\d+/i.test((title || '').toString().trim());
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
      return {
        groups: [],
        preface: '',
        dangBody: null,
        remainder: '',
        phuongPhapFromExamples: [],
      };
    }
    return parseExamplesCoreStructure(examplesCoreText);
  }, [examplesCoreText, hasExamples]);

  const groups = Array.isArray(parsed.groups) ? parsed.groups : [];
  const hasDangGroups = groups.some((g) => g.dangTitle || g.dangBody);

  const numberedHtml = useMemo(() => {
    const gs = Array.isArray(parsed.groups) ? parsed.groups : [];
    const prefaceHtml = parsed.preface
      ? theoryCorePlainToHtml(parsed.preface, { viduAsFrame: true, viduCounter: { n: 0 } })
      : '';
    const groupHtmls = gs.map((g, gi) => {
      if (!g.content) return '';
      const dangNo = extractDangNumber(g.dangLabel || g.dangTitle, gi);
      return theoryCorePlainToHtml(g.content, {
        viduAsFrame: true,
        viduCounter: { dang: dangNo, n: 0 },
      });
    });
    return { prefaceHtml, groupHtmls };
  }, [parsed]);

  if (!hasExamples && !hasTheoryPp) return null;

  return (
    <section className="mb-12 md:mb-16">
      <div className="max-w-4xl mx-auto px-2 md:px-4">
        <LessonSectionHeading num={2} title="Các dạng toán và ví dụ" />

        {numberedHtml.prefaceHtml ? (
          <div className="w-full max-w-full text-left text-slate-800 text-base md:text-lg leading-loose lesson-math-content mb-8 [&_p]:text-left [&_ul]:text-left">
            <HtmlWithMath html={numberedHtml.prefaceHtml} className="theory-core-rich block max-w-full" />
          </div>
        ) : null}

        {hasDangGroups || groups.length > 0
          ? groups.map((g, gi) => {
              const pps =
                gi === 0
                  ? [...(phuongPhapFromTheory || []), ...(g.phuongPhapBodies || [])]
                  : g.phuongPhapBodies || [];
              const dangText = (g.dangBody || g.dangTitle || '').toString().trim();
              const showFrame = Boolean(dangText) || pps.length > 0;
              const contentHtml = numberedHtml.groupHtmls[gi] || '';
              return (
                <div key={`dang-group-${gi}`} className="mb-10 md:mb-12 last:mb-0">
                  {showFrame ? (
                    <div className="lesson-dang-method-frame rounded-2xl border border-indigo-200/70 bg-white px-5 py-6 md:px-8 md:py-7 mb-6 md:mb-8">
                      {dangText ? (
                        <div className="lesson-dang-highlight mb-5 md:mb-6 pb-5 md:pb-6 border-b border-indigo-200/60">
                          <span className="inline-flex items-center rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white mb-3">
                            {g.dangLabel || 'Dạng'}
                          </span>
                          <p className="text-lg md:text-xl font-black text-slate-900 leading-snug">
                            <TextWithMathWithLoiGiai text={dangText} />
                          </p>
                        </div>
                      ) : null}
                      <PhuongPhapBlocks bodies={pps} />
                    </div>
                  ) : null}
                  {contentHtml ? (
                    <div className="w-full max-w-full text-left text-slate-800 text-base md:text-lg leading-loose lesson-math-content [&_.katex-display]:block [&_.katex-display]:mx-auto [&_.katex-display]:my-5 [&_p]:text-left [&_ul]:text-left [&_table]:text-left">
                      <HtmlWithMath html={contentHtml} className="theory-core-rich block max-w-full" />
                    </div>
                  ) : null}
                </div>
              );
            })
          : null}

        {!hasDangGroups && groups.length === 0 && hasTheoryPp ? (
          <div className="lesson-dang-method-frame rounded-2xl border border-indigo-200/70 bg-white px-5 py-6 md:px-8 md:py-7 mb-8">
            <PhuongPhapBlocks bodies={phuongPhapFromTheory} />
          </div>
        ) : null}
      </div>
    </section>
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

function parseViduTitle(titleText, index = 0, dangNumber = null) {
  const raw = (titleText || '').toString().trim();
  const dang = Number(dangNumber);
  const hasDang = Number.isFinite(dang) && dang > 0;
  if (hasDang) {
    return { badge: `Ví dụ ${dang}.${index + 1}`, body: '' };
  }
  const m = raw.match(/^(Ví dụ\s*\d+(?:\.\d+)*)\s*(?:[:\.\-—]\s*)?(.*)$/i);
  if (m) {
    return { badge: m[1], body: (m[2] || '').trim() };
  }
  if (!raw || /^Ví\s*dụ\s*:?\s*$/i.test(raw)) {
    return { badge: `Ví dụ ${index + 1}`, body: '' };
  }
  return { badge: raw, body: '' };
}

function Math11ViduCard({ ex, index, dangNumber = null }) {
  const items = Array.isArray(ex?.items) ? ex.items : [];
  const realItems = items.filter((it) => !isPlaceholderItemQ(it?.q));
  const stepsOnly = items.length > 0 && realItems.length === 0;
  const allSteps = stepsOnly ? items.flatMap((it) => it.steps || []) : [];

  const titleText = (ex?.title || `Ví dụ ${index + 1}`).toString();
  const { badge, body: titleBody } = parseViduTitle(titleText, index, dangNumber);

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

/** Đề gắn bài: (A) cùng chương + bài (+ mục nếu đề gắn mục); hoặc (B) gắn theo chuyên đề. */
function matchesLessonPaperQuiz(lesson, q, activeSection = null) {
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
  if (qc !== ch || ql !== ln) return false;
  const qSec = String(q?.section_no ?? q?.sectionNo ?? '').trim();
  if (!qSec) return true;
  // Đề gắn mục: chỉ hiện khi đang xem đúng mục đó
  if (!activeSection) return true;
  const aSec = String(activeSection.section_no ?? activeSection.no ?? '').trim();
  return Boolean(aSec) && aSec === qSec;
}

function LessonSkyClouds() {
  return (
    <div className="lesson-sky-clouds" aria-hidden="true">
      <div className="lesson-sky-cloud lesson-sky-cloud--lg lesson-sky-cloud--l1" />
      <div className="lesson-sky-cloud lesson-sky-cloud--md lesson-sky-cloud--l2" />
      <div className="lesson-sky-cloud lesson-sky-cloud--sm lesson-sky-cloud--l3 lesson-sky-cloud--far" />
      <div className="lesson-sky-cloud lesson-sky-cloud--md lesson-sky-cloud--l4" />
      <div className="lesson-sky-cloud lesson-sky-cloud--lg lesson-sky-cloud--l5" />
      <div className="lesson-sky-cloud lesson-sky-cloud--sm lesson-sky-cloud--l6 lesson-sky-cloud--far" />
      <div className="lesson-sky-cloud lesson-sky-cloud--md lesson-sky-cloud--r1" />
      <div className="lesson-sky-cloud lesson-sky-cloud--lg lesson-sky-cloud--r2" />
      <div className="lesson-sky-cloud lesson-sky-cloud--sm lesson-sky-cloud--r3 lesson-sky-cloud--far" />
      <div className="lesson-sky-cloud lesson-sky-cloud--lg lesson-sky-cloud--r4" />
      <div className="lesson-sky-cloud lesson-sky-cloud--md lesson-sky-cloud--r5" />
      <div className="lesson-sky-cloud lesson-sky-cloud--sm lesson-sky-cloud--r6 lesson-sky-cloud--far" />
    </div>
  );
}

function LessonVideoPlaceholder({ wrapClassName = '', frameClassName = '', children }) {
  return (
    <div className={`lesson-video-wrap ${wrapClassName}`.trim()}>
      <div
        className={`lesson-video-frame w-full bg-slate-900 shadow-2xl relative overflow-hidden ${frameClassName}`.trim()}
      >
        {children}
      </div>
    </div>
  );
}

export default function StudentLessonViewer({
  lesson,
  lessonsList = [],
  quizzesList = [],
  scoresList = [],
  studentName = '',
  studentClass = '',
  studentProfile = null,
  rosterGrade = '11',
  /** Khối tài khoản học sinh (có thể khác khối bài đang xem). */
  studentRosterGrade = '',
  onBack,
  onBackToOverview,
  onOpenExamsRoom,
  onEnterLearningMode,
  onOpenAccount,
  onEnterStudentPortal,
  onLogout,
  onRequestLogin,
  onRequestRegister,
  onSelectLesson,
  onStartQuiz,
  onSelectQuiz,
  onRequestLoginForPapers,
  resumePapersTabRef: resumePapersTabRefProp,
  externalHomeUrl = DEFAULT_EXTERNAL_HOME,
  onRecordLessonPracticeScore,
  onRecordLessonPracticeStepExp,
  onSaveLessonDangProgress,
  onCompleteLessonDangExp,
  /** Chỉ hiển thị cột nội dung (ẩn header/sidebar) — dùng xem nháp trong Admin. */
  previewEmbed = false,
  /** Khi preview: đồng bộ tab với panel sửa ('theory' | 'practice' | 'pdf' | 'papers'). */
  previewSyncedTab = null,
  /** Khi preview: mục con đang soạn trong Admin. */
  previewSectionIndex = null,
}) {
  const defaultResumePapersRef = useRef(false);
  const resumePapersTabRef = resumePapersTabRefProp ?? defaultResumePapersRef;
  const goOverview = onBackToOverview || onBack;
  const goBack = onBack || onBackToOverview;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const unreadNotif = useStudentUnreadCount(studentProfile?.id, studentName);
  const [expandedChapters, setExpandedChapters] = useState([]);
  const [expandedLessonRows, setExpandedLessonRows] = useState([]);
  const [activeTab, setActiveTab] = useState('theory');
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [practiceHintsOpen, setPracticeHintsOpen] = useState({});
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [lessonMediaTab, setLessonMediaTab] = useState('video');
  const [pathLockHint, setPathLockHint] = useState('');
  const [dangActiveIndex, setDangActiveIndex] = useState(0);
  const [dangNav, setDangNav] = useState(null);

  const handleDangNavStateChange = useCallback((nav) => {
    setDangNav(nav);
  }, []);

  /** Nhấn lần đầu vẫn chạy khi iframe video đang chiếm focus. */
  const activateHeaderAction = useCallback((fn) => (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    fn?.();
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) return undefined;
    const onDoc = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
    };
  }, [profileMenuOpen]);

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

        const parsedContent = parseLessonJson(l.content);
        const _sections = sortLessonSections(normalizeLessonSections(parsedContent?.sections));

        return { ...l, _progress: progress, _weak: weak, _avgScore: avgScore, chapter, lesson_no, _sections };
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

  const dynamicChapters = useMemo(() => {
    const grouped = new Map();
    lessonsEnriched.forEach((l) => {
      // Ẩn chuyên đề cũ / bài không thuộc chương SGK sạch
      if (!isSgkRoadmapLesson(l)) return;
      const key = roadmapChapterKey(l);
      if (!key) return;
      if (!grouped.has(key)) grouped.set(key, { key, lessons: [] });
      grouped.get(key).lessons.push(l);
    });
    const chapterKeys = Array.from(grouped.keys()).sort((a, b) => {
      const na = parseNum(a);
      const nb = parseNum(b);
      if (na !== null && nb !== null) return na - nb;
      return a.localeCompare(b);
    });
    return chapterKeys.map((ch, idx) => {
      const row = grouped.get(ch) || { key: ch, lessons: [] };
      const merged = mergeLessonsByLessonNo(row.lessons || [], parseNum);
      return {
        id: `c_${ch}`,
        chapterNo: ch,
        theme: CHAPTER_THEME_KEYS[idx % CHAPTER_THEME_KEYS.length],
        lessons: merged,
      };
    });
  }, [lessonsEnriched]);

  useEffect(() => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
    setPracticeHintsOpen({});
    setActiveSectionIndex(0);
  }, [lesson?.id]);

  useEffect(() => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
    setPracticeHintsOpen({});
  }, [activeSectionIndex]);

  useEffect(() => {
    if (!previewEmbed) return;
    if (previewSectionIndex == null) return;
    setActiveSectionIndex(Math.max(0, Number(previewSectionIndex) || 0));
  }, [previewEmbed, previewSectionIndex, lesson?.content]);

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
    const allowed = ['theory', 'dang', 'mindmap', 'simulation', 'practice', 'papers', 'pdf'];
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
  }, [lesson?.id, activeSectionIndex]);

  useEffect(() => {
    if (previewEmbed) return;
    const cur = dynamicChapters.find((c) => c.lessons.some((l) => lessonBelongsToGroup(l, lesson?.id)));
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (cur) next.add(cur.id);
      if (dynamicChapters[0]) next.add(dynamicChapters[0].id);
      return Array.from(next);
    });
  }, [lesson?.id, dynamicChapters, previewEmbed]);

  useEffect(() => {
    if (previewEmbed) return;
    const cur = dynamicChapters.find((c) => c.lessons.some((l) => lessonBelongsToGroup(l, lesson?.id)));
    const currentRow = cur?.lessons.find((l) => lessonBelongsToGroup(l, lesson?.id));
    if (!currentRow) return;
    const sections = Array.isArray(currentRow._displaySections)
      ? currentRow._displaySections
      : sortLessonSections(currentRow._sections || []);
    if (sections.length === 0) return;
    setExpandedLessonRows((prev) => (prev.includes(currentRow.id) ? prev : [...prev, currentRow.id]));
  }, [lesson?.id, dynamicChapters, previewEmbed]);

  const contentJson = useMemo(() => parseLessonJson(lesson?.content), [lesson?.content]);
  const activeSlice = useMemo(
    () => resolveActiveLessonSlice(contentJson, activeSectionIndex),
    [contentJson, activeSectionIndex]
  );
  const theoryCoreText = useMemo(() => {
    const fromSlice = (activeSlice.theory_core ?? '').toString().trim();
    if (fromSlice) return fromSlice;
    return (lesson?.description ?? '').toString().trim();
  }, [activeSlice.theory_core, lesson?.description]);
  const examplesCoreText = useMemo(() => (activeSlice.examples_core ?? '').toString().trim(), [activeSlice.examples_core]);
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
  const lessonData = useMemo(() => {
    const base = normalizeLessonContentForUI(lesson?.content);
    return { ...base, practice: normalizePracticeList(activeSlice.practice || []) };
  }, [lesson?.content, activeSlice.practice]);
  const practiceDisplayMode = useMemo(
    () => resolvePracticeDisplayMode(contentJson?.practice_display_mode ?? contentJson?.practiceDisplayMode),
    [contentJson]
  );
  const examplesDisplayMode = useMemo(() => {
    const fromSection =
      Array.isArray(contentJson?.sections) && contentJson.sections[activeSectionIndex]
        ? contentJson.sections[activeSectionIndex].examples_display_mode ??
          contentJson.sections[activeSectionIndex].examplesDisplayMode
        : null;
    return resolveExamplesDisplayMode(
      fromSection ?? contentJson?.examples_display_mode ?? contentJson?.examplesDisplayMode
    );
  }, [contentJson, activeSectionIndex]);
  const dangSectionKey = useMemo(() => {
    const secs = Array.isArray(contentJson?.sections) ? contentJson.sections : [];
    if (secs.length > 0) {
      const sec = secs[activeSectionIndex];
      return String(sec?.id || sec?.section_no || activeSectionIndex);
    }
    return '0';
  }, [contentJson, activeSectionIndex]);

  useEffect(() => {
    setDangActiveIndex(0);
    setDangNav(null);
  }, [lesson?.id, dangSectionKey]);
  const shuffledPractice = useMemo(
    () => buildShuffledPracticeOrder(lessonData.practice || []),
    [lessonData.practice]
  );
  const interactivePractice = useMemo(
    () => shuffledPractice.filter((q) => isInteractivePracticeType(q.type)),
    [shuffledPractice]
  );

  const handleQuizChange = (qId, value) => {
    if (quizSubmitted) return;
    setQuizAnswers((prev) => ({ ...prev, [qId]: value }));
  };

  const submitQuiz = (opts) => {
    const skipExp = Boolean(opts && typeof opts === 'object' && opts.skipExp);
    let score = 0;
    interactivePractice.forEach((q) => {
      if (scorePracticeQuestion(q, quizAnswers[q.id])) score++;
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
        skipExp,
      });
    }
  };

  const handlePracticeStepExp = useCallback(
    ({ questionId, expPoints }) => {
      if (typeof onRecordLessonPracticeStepExp !== 'function') return;
      if (!(studentName || '').trim() || !lesson?.id || !questionId) return;
      onRecordLessonPracticeStepExp({
        lessonId: lesson.id,
        lessonTitle: (lesson.title || '').toString(),
        questionId,
        expPoints,
        gradeLevel: (rosterGrade || '8').toString(),
      });
    },
    [onRecordLessonPracticeStepExp, studentName, lesson?.id, lesson?.title, rosterGrade]
  );

  const resetQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
    setPracticeHintsOpen({});
  };

  const togglePracticeHint = useCallback((qid) => {
    setPracticeHintsOpen((prev) => ({ ...prev, [qid]: !prev[qid] }));
  }, []);

  const toggleChapter = (chapterId) => {
    setExpandedChapters((prev) =>
      prev.includes(chapterId) ? prev.filter((id) => id !== chapterId) : [...prev, chapterId]
    );
  };

  const effectiveVideoUrl = (activeSlice.videoUrl || lesson?.videoUrl || '').toString().trim();
  const videoId = extractYouTubeID(effectiveVideoUrl);
  const effectiveSlidesUrl = (activeSlice.slidesUrl || lesson?.slidesUrl || lesson?.slides_url || '').toString().trim();
  const hasSlides = Boolean(effectiveSlidesUrl);
  const hasVideo = Boolean(effectiveVideoUrl && videoId);
  const hasMediaChoice = hasVideo && hasSlides;

  useEffect(() => {
    if (hasVideo) setLessonMediaTab('video');
    else if (hasSlides) setLessonMediaTab('slides');
  }, [lesson?.id, activeSlice.activeSectionIndex, hasVideo, hasSlides]);

  const videoMaterialRaw = (lesson?.videoMaterialUrl || lesson?.video_material_url || '').toString().trim();
  const videoMaterialId = extractYouTubeID(videoMaterialRaw);
  const durationMins = Number(lesson?.duration);
  const durationLabel = Number.isFinite(durationMins) && durationMins > 0 ? `${durationMins} phút` : '45 phút';

  const chapterNo = (lesson?.chapter ?? '').toString().trim() || '—';
  const lessonNo = (lesson?.lesson_no ?? '').toString().trim() || '—';
  const displayGrade = String(lesson?.grade_level ?? rosterGrade ?? '').trim();
  const accountGrade = String(studentRosterGrade || rosterGrade || '').trim();
  const sameGradeAsAccount = Boolean(displayGrade) && displayGrade === accountGrade;
  const chapterHeading = useMemo(
    () => formatSgkChapterHeading(displayGrade, chapterNo),
    [displayGrade, chapterNo]
  );
  const lessonHeading = useMemo(
    () => formatSgkLessonHeading(displayGrade, chapterNo, lessonNo, lesson?.title),
    [displayGrade, chapterNo, lessonNo, lesson?.title]
  );
  const pdfUrl = (lesson?.pdfUrl || lesson?.pdf_url || '').toString().trim();

  const lessonMindMap = useMemo(
    () => parseLessonMindMapFromContent(contentJson),
    [contentJson]
  );
  const showMindMapTab = lessonMindMapIsVisible(lessonMindMap);

  const lessonSimulation = useMemo(
    () => parseLessonSimulationFromContent(contentJson),
    [contentJson]
  );
  const showSimulationTab = lessonSimulationIsVisible(lessonSimulation);

  useEffect(() => {
    if (activeTab === 'mindmap' && !showMindMapTab) setActiveTab('theory');
  }, [activeTab, showMindMapTab]);

  useEffect(() => {
    if (activeTab === 'simulation' && !showSimulationTab) setActiveTab('theory');
  }, [activeTab, showSimulationTab]);

  const practiceCount = lessonData.practice?.length || 0;

  const dangProgress = useMemo(
    () => findLessonDangProgress(scoresList, studentName, lesson?.id || '', dangSectionKey),
    [scoresList, studentName, lesson?.id, dangSectionKey]
  );
  const practiceDone = useMemo(
    () => hasLessonPracticeAttempt(scoresList, studentName, lesson?.id || ''),
    [scoresList, studentName, lesson?.id]
  );
  const lessonDangCompleteOnce = useMemo(
    () => hasLessonDangCompleteOnce(scoresList, studentName, lesson?.id || ''),
    [scoresList, studentName, lesson?.id]
  );
  const pathGates = useMemo(
    () =>
      getLessonPathGates({
        studentName,
        previewEmbed,
        hasDangContent: hasNewExamplesCore,
        dangAllComplete: Boolean(dangProgress?.allComplete),
        lessonDangCompleteOnce,
        practiceCount,
        practiceDone,
      }),
    [
      studentName,
      previewEmbed,
      hasNewExamplesCore,
      dangProgress?.allComplete,
      lessonDangCompleteOnce,
      practiceCount,
      practiceDone,
    ]
  );

  const isLessonTabLocked = useCallback(
    (tabId) => {
      if (tabId === 'practice') return Boolean(pathGates.practiceLocked);
      if (tabId === 'papers') return Boolean(pathGates.papersLocked);
      return false;
    },
    [pathGates.practiceLocked, pathGates.papersLocked]
  );

  const requestLessonTab = useCallback(
    (tabId) => {
      if (tabId === 'practice' && pathGates.practiceLocked) {
        setPathLockHint(pathGates.practiceLockReason || 'Hoàn thành các dạng toán trước.');
        return;
      }
      if (tabId === 'papers' && pathGates.papersLocked) {
        setPathLockHint(pathGates.papersLockReason || 'Hoàn thành lộ trình học trước.');
        return;
      }
      setPathLockHint('');
      setActiveTab(tabId);
    },
    [pathGates.practiceLocked, pathGates.papersLocked, pathGates.practiceLockReason, pathGates.papersLockReason]
  );

  useEffect(() => {
    if (!pathLockHint) return undefined;
    const t = window.setTimeout(() => setPathLockHint(''), 5200);
    return () => window.clearTimeout(t);
  }, [pathLockHint]);

  useEffect(() => {
    if (previewEmbed) return;
    if (activeTab === 'practice' && pathGates.practiceLocked) {
      setActiveTab(hasNewExamplesCore ? 'dang' : 'theory');
      return;
    }
    if (activeTab === 'papers' && pathGates.papersLocked) {
      setActiveTab(practiceCount > 0 && !pathGates.practiceLocked ? 'practice' : hasNewExamplesCore ? 'dang' : 'theory');
    }
  }, [
    previewEmbed,
    activeTab,
    pathGates.practiceLocked,
    pathGates.papersLocked,
    hasNewExamplesCore,
    practiceCount,
  ]);

  const lessonPapersQuizzes = useMemo(() => {
    return (quizzesList || [])
      .filter((q) => matchesLessonPaperQuiz(lesson, q, activeSlice.activeSection))
      .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'vi'));
  }, [quizzesList, lesson, activeSlice.activeSection]);

  const materialLinks = useMemo(() => {
    const raw = activeSlice.materials;
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
  }, [activeSlice.materials]);

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
      const aReview = isChapterReviewLesson(a);
      const bReview = isChapterReviewLesson(b);
      if (aReview !== bReview) return aReview ? 1 : -1;
      const ka = Number.isFinite(lessonNoSortKey(a.lesson_no)) ? lessonNoSortKey(a.lesson_no) : titleLessonSortKey(a);
      const kb = Number.isFinite(lessonNoSortKey(b.lesson_no)) ? lessonNoSortKey(b.lesson_no) : titleLessonSortKey(b);
      if (ka !== kb) return ka - kb;
      return String(a.title || '').localeCompare(String(b.title || ''), 'vi');
    });
    const idx = id ? sorted.findIndex((l) => l.id === id) : -1;
    return {
      prevLesson: idx > 0 ? sorted[idx - 1] : null,
      nextLesson: idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null,
    };
  }, [lessonsList, lesson?.id, lesson?.grade_level, lesson?.chapter]);

  const visibleLessonTabs = useMemo(() => {
    return LESSON_TAB_SEQUENCE.filter((t) => {
      if (t === 'mindmap') return showMindMapTab;
      if (t === 'simulation') return showSimulationTab;
      return true;
    });
  }, [showMindMapTab, showSimulationTab]);

  const goNextTabOrLesson = useCallback(() => {
    // Trong tab dạng toán: nhảy Dạng 1 → 2 → … trước khi sang tab sau
    if (activeTab === 'dang' && dangNav && dangNav.count >= 1) {
      if (dangNav.count > 1 && dangNav.active < dangNav.count - 1) {
        if (dangNav.nextDangLocked) {
          setPathLockHint('Hoàn thành dạng hiện tại (đánh dấu đã học ví dụ) để mở dạng tiếp theo.');
          return;
        }
        setDangActiveIndex(dangNav.active + 1);
        setPathLockHint('');
        try {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch {
          /* ignore */
        }
        return;
      }
      // Dạng cuối (hoặc chỉ 1 dạng) → ưu tiên Bài tập luyện tập → Đề luyện tập
      const preferredAfterDang = ['practice', 'papers'];
      let blockedAfterDang = '';
      for (const nextId of preferredAfterDang) {
        if (!visibleLessonTabs.includes(nextId)) continue;
        if (isLessonTabLocked(nextId)) {
          if (!blockedAfterDang) {
            blockedAfterDang =
              nextId === 'practice'
                ? pathGates.practiceLockReason || 'Hoàn thành các dạng toán trước.'
                : pathGates.papersLockReason || 'Hoàn thành lộ trình học trước.';
          }
          continue;
        }
        setActiveTab(nextId);
        setPathLockHint('');
        return;
      }
      if (blockedAfterDang) {
        setPathLockHint(blockedAfterDang);
        return;
      }
    }

    const i = visibleLessonTabs.indexOf(activeTab);
    const pos = i === -1 ? 0 : i;
    let blockedReason = '';
    for (let j = pos + 1; j < visibleLessonTabs.length; j += 1) {
      const nextId = visibleLessonTabs[j];
      if (isLessonTabLocked(nextId)) {
        if (!blockedReason) {
          if (nextId === 'practice') {
            blockedReason = pathGates.practiceLockReason || 'Hoàn thành các dạng toán trước.';
          } else if (nextId === 'papers') {
            blockedReason = pathGates.papersLockReason || 'Hoàn thành lộ trình học trước.';
          }
        }
        continue;
      }
      setActiveTab(nextId);
      setPathLockHint('');
      if (nextId === 'dang') setDangActiveIndex(0);
      return;
    }
    if (blockedReason) {
      setPathLockHint(blockedReason);
      return;
    }
    const sectionCount = activeSlice.sections.length;
    if (sectionCount > 0 && activeSectionIndex < sectionCount - 1) {
      setActiveSectionIndex((idx) => idx + 1);
      setActiveTab('theory');
      setDangActiveIndex(0);
      return;
    }
    if (lessonChainNav.nextLesson && typeof onSelectLesson === 'function') {
      onSelectLesson(lessonChainNav.nextLesson.id);
      setActiveTab('theory');
      setDangActiveIndex(0);
    }
  }, [
    activeTab,
    dangNav,
    activeSectionIndex,
    activeSlice.sections.length,
    lessonChainNav.nextLesson,
    onSelectLesson,
    visibleLessonTabs,
    isLessonTabLocked,
    pathGates.practiceLockReason,
    pathGates.papersLockReason,
  ]);

  const goPrevTabOrLesson = useCallback(() => {
    if (activeTab === 'dang' && dangNav && dangNav.count > 1 && dangNav.active > 0) {
      setDangActiveIndex(dangNav.active - 1);
      setPathLockHint('');
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        /* ignore */
      }
      return;
    }

    const i = visibleLessonTabs.indexOf(activeTab);
    const pos = i === -1 ? 0 : i;
    for (let j = pos - 1; j >= 0; j -= 1) {
      const prevId = visibleLessonTabs[j];
      if (isLessonTabLocked(prevId)) continue;
      setActiveTab(prevId);
      setPathLockHint('');
      if (prevId === 'dang' && dangNav?.count > 0) {
        setDangActiveIndex(Math.max(0, (dangNav.count || 1) - 1));
      }
      return;
    }
    const lastUnlocked =
      [...visibleLessonTabs].reverse().find((t) => !isLessonTabLocked(t)) || 'pdf';
    if (activeSlice.sections.length > 0 && activeSectionIndex > 0) {
      setActiveSectionIndex((idx) => idx - 1);
      setActiveTab(lastUnlocked);
      return;
    }
    if (lessonChainNav.prevLesson && typeof onSelectLesson === 'function') {
      onSelectLesson(lessonChainNav.prevLesson.id);
      setActiveTab(lastUnlocked);
    }
  }, [
    activeTab,
    dangNav,
    activeSectionIndex,
    activeSlice.sections.length,
    lessonChainNav.prevLesson,
    onSelectLesson,
    visibleLessonTabs,
    isLessonTabLocked,
  ]);

  const navPos = visibleLessonTabs.indexOf(activeTab);
  const navIndex = navPos === -1 ? 0 : navPos;
  const nextTabId = navIndex < visibleLessonTabs.length - 1 ? visibleLessonTabs[navIndex + 1] : null;
  const prevTabId = navIndex > 0 ? visibleLessonTabs[navIndex - 1] : null;
  const dangStepNext =
    activeTab === 'dang' && dangNav && dangNav.count > 1 && dangNav.active < dangNav.count - 1;
  const dangStepPrev = activeTab === 'dang' && dangNav && dangNav.count > 1 && dangNav.active > 0;
  const canNext =
    dangStepNext ||
    nextTabId != null ||
    (activeSlice.sections.length > 0 && activeSectionIndex < activeSlice.sections.length - 1) ||
    (lessonChainNav.nextLesson != null && typeof onSelectLesson === 'function');
  const canPrev =
    dangStepPrev ||
    prevTabId != null ||
    (activeSlice.sections.length > 0 && activeSectionIndex > 0) ||
    (lessonChainNav.prevLesson != null && typeof onSelectLesson === 'function');

  const nextButtonHint = dangStepNext
    ? `${dangNav.nextLabel || `Dạng ${dangNav.active + 2}`} →`
    : activeTab === 'dang' && dangNav && (dangNav.count <= 1 || dangNav.active >= dangNav.count - 1)
      ? visibleLessonTabs.includes('practice') && !isLessonTabLocked('practice')
        ? `${lessonTabLabel('practice')} →`
        : visibleLessonTabs.includes('papers') && !isLessonTabLocked('papers')
          ? `${lessonTabLabel('papers')} →`
          : nextTabId
            ? `${lessonTabLabel(nextTabId)} →`
            : lessonChainNav.nextLesson
              ? `Bài sau: ${lessonChainNav.nextLesson.lesson_no ? `Bài ${lessonChainNav.nextLesson.lesson_no} · ` : ''}${(lessonChainNav.nextLesson.title || '').slice(0, 42)}${(lessonChainNav.nextLesson.title || '').length > 42 ? '…' : ''} →`
              : canNext
                ? '—'
                : 'Đã cuối chương'
      : nextTabId
        ? `${lessonTabLabel(nextTabId)} →`
        : lessonChainNav.nextLesson
          ? `Bài sau: ${lessonChainNav.nextLesson.lesson_no ? `Bài ${lessonChainNav.nextLesson.lesson_no} · ` : ''}${(lessonChainNav.nextLesson.title || '').slice(0, 42)}${(lessonChainNav.nextLesson.title || '').length > 42 ? '…' : ''} →`
          : canNext
            ? '—'
            : 'Đã cuối chương';

  const prevButtonHint = dangStepPrev
    ? `← ${dangNav.prevLabel || `Dạng ${dangNav.active}`}`
    : prevTabId
      ? `← ${lessonTabLabel(prevTabId)}`
      : lessonChainNav.prevLesson
        ? `← Bài trước: ${lessonChainNav.prevLesson.lesson_no ? `Bài ${lessonChainNav.prevLesson.lesson_no} · ` : ''}${(lessonChainNav.prevLesson.title || '').slice(0, 42)}${(lessonChainNav.prevLesson.title || '').length > 42 ? '…' : ''}`
        : canPrev
          ? '—'
          : 'Đã đầu chương / lộ trình';

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

  const selectLessonSection = useCallback(
    (lessonId, sectionIndex = 0) => {
      if (lessonId && lessonId !== lesson?.id) onSelectLesson?.(lessonId);
      setActiveSectionIndex(Math.max(0, sectionIndex));
      setActiveTab('theory');
      setMobileOpen(false);
    },
    [lesson?.id, onSelectLesson]
  );

  const renderSidebarLessonRow = (l) => {
    const isCurrentLesson = lessonBelongsToGroup(l, lesson?.id);
    const p = l._progress || 0;
    const doneLesson = p >= 100;
    const isWeak = !!l._weak && !doneLesson;
    const sections = Array.isArray(l._displaySections)
      ? l._displaySections
      : sortLessonSections(l._sections || []);
    const hasSections = sections.length > 0;
    const isExpanded = expandedLessonRows.includes(l.id);

    const rowIcon = (active, compact = false) => (
      <div
        className={`${compact ? 'w-7 h-7' : 'w-9 h-9'} rounded-xl flex items-center justify-center shrink-0 ${
          doneLesson
            ? 'bg-slate-100 text-slate-400'
            : active
              ? 'bg-indigo-100 text-indigo-600'
              : isWeak
                ? 'bg-rose-50 text-rose-600'
                : 'bg-slate-100 text-slate-500'
        }`}
      >
        {doneLesson ? (
          <CheckCircle className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
        ) : active ? (
          <Play className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} ml-0.5`} />
        ) : (
          <BookOpen className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
        )}
      </div>
    );

    return (
      <div key={l.id} className="space-y-1.5">
        <button
          type="button"
          onClick={() => {
            if (hasSections) {
              setExpandedLessonRows((prev) =>
                prev.includes(l.id) ? prev.filter((id) => id !== l.id) : [...prev, l.id]
              );
            }
            selectLessonSection(l.id, 0);
          }}
          className={`w-full text-left rounded-xl p-3 transition border ${
            isCurrentLesson
              ? 'border-indigo-200 bg-indigo-50 relative overflow-hidden'
              : 'border-transparent hover:bg-slate-50'
          } ${doneLesson && !isCurrentLesson ? 'opacity-80 hover:opacity-100' : ''}`}
        >
          {isCurrentLesson && <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-xl" />}
          <div className={`flex items-start gap-3 ${isCurrentLesson ? 'pl-1' : ''}`}>
            {rowIcon(isCurrentLesson)}
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-1.5 flex-wrap">
                <h4 className={`font-semibold text-sm leading-snug ${isCurrentLesson ? 'text-indigo-900' : 'text-slate-800'}`}>
                  {hasSections ? getSidebarLessonTitle(l, sections) : getLessonDisplayLabel(l)}
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
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className={`text-xs font-bold uppercase tracking-wider ${isCurrentLesson ? 'text-indigo-500' : 'text-slate-400'}`}>
                  {doneLesson ? 'Đã hoàn thành' : isCurrentLesson ? `Bạn đang học · ${p}%` : `Tiến độ · ${p}%`}
                </p>
                {hasSections ? (
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-transform ${isExpanded ? 'rotate-180 text-indigo-500' : 'text-slate-400'}`}
                  />
                ) : null}
              </div>
              <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${isCurrentLesson ? 'bg-indigo-500' : isWeak ? 'bg-rose-400' : 'bg-slate-300'}`}
                  style={{ width: `${p}%` }}
                />
              </div>
            </div>
          </div>
        </button>

        {hasSections && isExpanded ? (
          <div className="ml-3 md:ml-4 pl-2 md:pl-3 border-l-2 border-indigo-100 space-y-1.5">
            {sections.map((sec, si) => {
              const sourceId = sec._sourceLessonId || l.id;
              const sourceIdx = sec._sourceSectionIndex ?? si;
              const isCurrentSection =
                lesson?.id === sourceId && Number(activeSectionIndex) === Number(sourceIdx);
              return (
                <button
                  key={sec.id || `${sourceId}-${sourceIdx}`}
                  type="button"
                  onClick={() => selectLessonSection(sourceId, sourceIdx)}
                  className={`w-full text-left rounded-xl p-2.5 md:p-3 transition border ${
                    isCurrentSection
                      ? 'border-indigo-200 bg-indigo-50 relative overflow-hidden'
                      : 'border-transparent hover:bg-slate-50'
                  } ${doneLesson && !isCurrentSection ? 'opacity-80 hover:opacity-100' : ''}`}
                >
                  {isCurrentSection && <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-xl" />}
                  <div className={`flex items-center gap-2.5 ${isCurrentSection ? 'pl-1' : ''}`}>
                    <div className="min-w-0 flex-1">
                      <h4 className={`font-semibold text-xs md:text-sm leading-snug ${isCurrentSection ? 'text-indigo-900' : 'text-slate-700'}`}>
                        {getSectionDisplayLabel(sec)}
                      </h4>
                      <p className={`text-[10px] font-bold mt-0.5 uppercase tracking-wider ${isCurrentSection ? 'text-indigo-500' : 'text-slate-400'}`}>
                        {isCurrentSection ? 'Đang học' : 'Mục con'}
                      </p>
                    </div>
                    {rowIcon(isCurrentSection, true)}
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  };

  const chapterProgress = (ch) => {
    if (!ch.lessons.length) return { avg: 0, done: 0 };
    const avg = Math.round(ch.lessons.reduce((acc, x) => acc + (x._progress || 0), 0) / ch.lessons.length);
    const done = ch.lessons.filter((x) => (x._progress || 0) >= 100).length;
    return { avg, done };
  };

  const tabBtn = (id, label, Icon, extra) => {
    const active = activeTab === id;
    const locked = isLessonTabLocked(id);
    const lockTitle =
      id === 'practice'
        ? pathGates.practiceLockReason
        : id === 'papers'
          ? pathGates.papersLockReason
          : '';
    return (
      <button
        type="button"
        onClick={() => requestLessonTab(id)}
        title={locked ? lockTitle : undefined}
        aria-disabled={locked}
        className={`relative inline-flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-bold whitespace-nowrap rounded-full transition flex-shrink-0 ${
          active
            ? 'bg-indigo-600 text-white shadow-sm'
            : locked
              ? 'bg-transparent text-slate-400 cursor-not-allowed opacity-80'
              : 'bg-transparent text-slate-500 hover:text-indigo-600 hover:bg-white'
        }`}
      >
        {locked ? (
          <Lock className={`w-4 h-4 md:w-5 md:h-5 flex-shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
        ) : (
          <Icon className={`w-4 h-4 md:w-5 md:h-5 flex-shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
        )}
        {label}
        {extra}
      </button>
    );
  };

  return (
    <div className="lesson-viewer lesson-sky-canvas flex flex-col flex-1 min-h-0 overflow-hidden font-sans leading-relaxed">
      {!previewEmbed ? (
      <header className="bg-white text-slate-800 shrink-0 border-b border-slate-200 relative z-40">
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
              onPointerDown={activateHeaderAction(() => goOverview?.())}
              className="text-indigo-600 transition-colors border-b-2 border-indigo-500 pb-0.5 whitespace-nowrap"
            >
              Trang cá nhân
            </button>
            <button
              type="button"
              onPointerDown={activateHeaderAction(() => onOpenExamsRoom?.())}
              className="hover:text-indigo-600 transition-colors tracking-wide text-xs lg:text-sm whitespace-nowrap"
            >
              PHÒNG THI ONLINE
            </button>
          </nav>
          <div className="flex items-center gap-2 shrink-0 relative z-50">
            {studentName ? (
              <>
                <button
                  type="button"
                  onPointerDown={activateHeaderAction(() => {
                    setProfileMenuOpen(false);
                    setNotifOpen(false);
                    (onEnterLearningMode || goOverview)?.();
                  })}
                  title="Vào chế độ học tập"
                  aria-label="Vào chế độ học tập"
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-violet-200 bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-indigo-200/60 hover:from-violet-600 hover:to-indigo-700 active:scale-95 transition shrink-0"
                >
                  <GraduationCap className="w-5 h-5" strokeWidth={2.25} />
                </button>
                <StudentNotificationBell
                  size="sm"
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
                      (onSelectQuiz || onStartQuiz)?.(n.link_id);
                      return;
                    }
                    if (n.link_url) window.open(n.link_url, '_blank');
                  }}
                />
                <div className="relative" ref={profileMenuRef}>
                  <button
                    type="button"
                    onPointerDown={activateHeaderAction(() => {
                      setNotifOpen(false);
                      setProfileMenuOpen((v) => !v);
                    })}
                    className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm border-2 border-indigo-200 hover:bg-indigo-200 active:scale-95 transition shadow-sm"
                    title="Tài khoản"
                    aria-label="Mở menu tài khoản"
                    aria-expanded={profileMenuOpen}
                  >
                    {(studentName || 'H').charAt(0).toUpperCase()}
                  </button>
                  {profileMenuOpen ? (
                    <StudentProfileDropdown
                      studentName={studentName}
                      studentClass={studentClass}
                      rosterGrade={studentRosterGrade || rosterGrade}
                      studentProfile={studentProfile}
                      onEnterStudentPortal={(tab) => {
                        setProfileMenuOpen(false);
                        if (onEnterStudentPortal) onEnterStudentPortal(tab);
                        else if (tab === 'settings' && onOpenAccount) onOpenAccount();
                        else goOverview?.();
                      }}
                      onLogout={() => {
                        setProfileMenuOpen(false);
                        onLogout?.();
                      }}
                      onClose={() => setProfileMenuOpen(false)}
                      unreadCount={unreadNotif}
                      onOpenNotifications={() => {
                        setProfileMenuOpen(false);
                        setNotifOpen(true);
                      }}
                    />
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onPointerDown={activateHeaderAction(() => onRequestRegister?.())}
                  className="px-3 py-1.5 rounded-full border-2 border-orange-500 bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white text-xs font-black shadow-sm transition-colors"
                >
                  Đăng ký
                </button>
                <button
                  type="button"
                  onPointerDown={activateHeaderAction(() => onRequestLogin?.())}
                  className="login-cta-blink px-3 py-1.5 rounded-full border-2 border-blue-600 bg-blue-600 text-white hover:bg-blue-700 text-xs font-black shadow-md shadow-blue-200/60"
                >
                  Đăng nhập
                </button>
              </>
            )}
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
          className={`absolute md:static inset-y-0 left-0 w-[340px] md:w-[380px] bg-white border-r border-slate-200 flex flex-col shrink-0 z-30 transition-transform duration-300 overflow-y-auto ${
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
                  Lộ trình học
                </h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wide truncate">
                  {`Toán ${displayGrade || rosterGrade}${
                    sameGradeAsAccount && studentClass ? ` · ${studentClass}` : ''
                  }`}
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
                      <span className="text-xs md:text-sm font-black text-indigo-900 leading-snug block">
                        {formatSgkChapterHeading(
                          String(ch.lessons[0]?.grade_level ?? rosterGrade ?? '').trim(),
                          ch.chapterNo
                        )}
                      </span>
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
                      {ch.lessons.map((l) => renderSidebarLessonRow(l))}
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
          <div className="lesson-sky-stage relative min-h-full">
            <LessonSkyClouds />
            <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-6 lg:p-8 pb-16 md:pb-12">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 md:mb-5 min-w-0">
              {!previewEmbed ? (
                <BackButton
                  variant="icon"
                  title="Quay lại"
                  className="shrink-0"
                  onBack={() => goBack?.()}
                />
              ) : null}
              <nav className="text-[11px] md:text-xs font-bold text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 leading-snug">
              <button type="button" onClick={goOverview} className="hover:text-indigo-600 transition shrink-0">
                Toán {displayGrade || rosterGrade}
              </button>
              <span className="text-slate-300 shrink-0">›</span>
              <span className="hover:text-indigo-600 text-slate-600 min-w-0">{chapterHeading}</span>
              {lessonNo && lessonNo !== '—' ? (
                <>
                  <span className="text-slate-300 shrink-0">›</span>
                  <span className="hover:text-indigo-600 text-indigo-800 min-w-0">{lessonHeading}</span>
                </>
              ) : null}
              </nav>
            </div>

            <div className="mb-4 md:mb-6">
              <h1 className="inline-flex max-w-full items-center rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-2 md:px-6 md:py-3 text-xl md:text-4xl lg:text-5xl font-black text-indigo-700 tracking-tight leading-tight">
                {activeSlice.activeSection
                  ? getSectionDisplayLabel(activeSlice.activeSection)
                  : getLessonDisplayLabel(lesson)}
              </h1>
              <p className="text-slate-500 mt-2 md:mt-4 text-xs md:text-sm font-semibold flex flex-wrap items-center gap-3 md:gap-5">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 md:w-5 md:h-5 text-teal-600" />
                  {durationLabel}
                </span>
                <span className="flex items-center gap-1.5">
                  <UserCircle className="w-4 h-4 md:w-5 md:h-5 text-teal-600" />
                  Thầy Phát
                </span>
              </p>
            </div>

            {hasMediaChoice ? (
              <div className="-mx-4 md:mx-0 mb-3 md:mb-4 flex flex-wrap gap-2 px-4 md:px-0">
                <button
                  type="button"
                  onClick={() => setLessonMediaTab('video')}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition border ${
                    lessonMediaTab === 'video'
                      ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300 hover:bg-teal-50'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  Video bài giảng
                </button>
                <button
                  type="button"
                  onClick={() => setLessonMediaTab('slides')}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition border ${
                    lessonMediaTab === 'slides'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                  }`}
                >
                  <Presentation className="w-4 h-4" />
                  Slide trình chiếu
                </button>
              </div>
            ) : null}

            {(hasVideo && (!hasMediaChoice || lessonMediaTab === 'video')) ||
            (!hasVideo && !hasSlides) ? (
              hasVideo ? (
                <LessonYouTubePlayer
                  videoId={videoId}
                  title={activeSlice.activeSection ? getSectionDisplayLabel(activeSlice.activeSection) : lesson.title}
                  wrapClassName="-mx-4 md:mx-0 mb-4 md:mb-8"
                  frameClassName="lesson-video-frame--hero rounded-none md:rounded-3xl border-0 md:border md:border-slate-800"
                />
              ) : (
                <LessonVideoPlaceholder
                  wrapClassName="-mx-4 md:mx-0 mb-4 md:mb-8"
                  frameClassName="lesson-video-frame--hero rounded-none md:rounded-3xl border-0 md:border md:border-slate-800"
                >
                  {effectiveVideoUrl && !videoId ? (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm px-4 text-center aspect-video">
                      Link video không hỗ trợ nhúng. Mở trực tiếp từ URL đã nhập.
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-transparent to-slate-900/80 aspect-video min-h-[220px]">
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-teal-500 rounded-full flex items-center justify-center text-white mb-3 md:mb-4 border-4 border-white/20 shadow-lg shadow-teal-500/30">
                        <Play className="w-8 h-8 md:w-9 md:h-9 ml-1" />
                      </div>
                      <p className="text-white font-bold tracking-wide text-sm md:text-base text-center px-4">
                        Video / slide bài giảng sẽ hiển thị khi giáo viên thêm link
                      </p>
                    </div>
                  )}
                </LessonVideoPlaceholder>
              )
            ) : null}

            {hasSlides && (!hasMediaChoice || lessonMediaTab === 'slides') ? (
              <div className="-mx-4 md:mx-0 mb-4 md:mb-8 px-0 md:px-0">
                {!hasMediaChoice ? (
                  <h2 className="text-lg md:text-xl font-black text-slate-800 mb-2 mt-1 px-4 md:px-0 flex items-center gap-2">
                    <Presentation className="w-5 h-5 text-indigo-600" />
                    Slide trình chiếu
                  </h2>
                ) : null}
                <LessonSlidesEmbed
                  url={effectiveSlidesUrl}
                  title={
                    activeSlice.activeSection
                      ? `${getSectionDisplayLabel(activeSlice.activeSection)} — slide`
                      : `${lesson?.title || 'Bài học'} — slide`
                  }
                  wrapClassName="px-4 md:px-0"
                  frameClassName="rounded-none md:rounded-3xl border-0 md:border md:border-slate-200"
                />
              </div>
            ) : null}

            {videoMaterialRaw && videoMaterialId ? (
              <>
                <h2 className="text-lg md:text-xl font-black text-slate-800 mb-2 mt-2">Video tài liệu / ôn tập</h2>
                <LessonYouTubePlayer
                  videoId={videoMaterialId}
                  title={`${lesson?.title || 'Bài học'} — tài liệu`}
                  wrapClassName="mb-6 md:mb-8"
                  frameClassName="rounded-2xl md:rounded-3xl aspect-video border border-slate-700 shadow-xl"
                />
              </>
            ) : videoMaterialRaw && !videoMaterialId ? (
              <p className="mb-6 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                Có link video tài liệu nhưng không nhận dạng được YouTube. Hãy dùng dạng youtube.com/watch?v=... hoặc youtu.be/...
              </p>
            ) : null}

            <div className="lesson-tabs-shell bg-white rounded-none md:rounded-3xl shadow-sm border-y border-slate-200 md:border border-slate-200 overflow-hidden mb-10 md:mb-12 -mx-4 md:mx-0">
              <div className="flex items-center gap-2 p-2 md:p-2.5 bg-slate-50/90 border-b border-slate-200 overflow-x-auto">
                {tabBtn('theory', 'LÝ THUYẾT', BookOpen)}
                {tabBtn('dang', 'CÁC DẠNG TOÁN', Sparkles)}
                {showMindMapTab ? tabBtn('mindmap', 'TÓM TẮT BÀI HỌC', BookMarked) : null}
                {showSimulationTab ? tabBtn('simulation', 'MÔ PHỎNG', Atom) : null}
                {tabBtn(
                  'practice',
                  'BÀI TẬP LUYỆN TẬP',
                  Pencil,
                  practiceCount > 0 && !pathGates.practiceLocked ? (
                    <span className="ml-0.5 w-2 h-2 bg-red-500 rounded-full" />
                  ) : null
                )}
                {tabBtn(
                  'papers',
                  'ĐỀ LUYỆN TẬP',
                  ClipboardList,
                  papersQuizCount > 0 && !pathGates.papersLocked ? (
                    <span className="ml-0.5 w-2 h-2 bg-amber-500 rounded-full" />
                  ) : null
                )}
                {tabBtn('pdf', 'TÀI LIỆU PDF', FileText)}
              </div>
              {pathLockHint ? (
                <div className="px-4 md:px-6 py-3 bg-amber-50 border-b border-amber-200 text-sm text-amber-900 font-semibold flex items-start gap-2">
                  <Lock className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                  <span>{pathLockHint}</span>
                </div>
              ) : null}
              {pathGates.enforce && !pathGates.freeRoam ? (
                <div className="px-4 md:px-6 py-2.5 bg-indigo-50/80 border-b border-indigo-100 text-xs md:text-sm text-indigo-900 font-medium">
                  Lần học đầu: hoàn thành từng dạng toán (đánh dấu đã học ví dụ) → bài tập luyện tập → đề luyện tập. Sau khi xong một lượt, các phần sẽ mở tự do.
                </div>
              ) : null}

              {activeTab === 'theory' && (
                <div className="lesson-tab-panel lesson-tab-panel--theory p-4 md:p-10 lg:p-12 animate-in fade-in duration-200">
                  <TheoryCorePanel source={theoryForPanel} />
                  {!hasNewExamplesCore &&
                    !hasMath11Examples &&
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
                  {!String(theoryForPanel || '').trim() &&
                  !(lessonData.theory.rules || []).length &&
                  !hasMath11Examples ? (
                    <p className="text-slate-500 text-center py-8">Chưa có nội dung lý thuyết trong bài này.</p>
                  ) : null}
                </div>
              )}

              {activeTab === 'dang' && (
                <div className="lesson-tab-panel lesson-tab-panel--dang p-4 md:p-10 lg:p-12 animate-in fade-in duration-200">
                  {hasNewExamplesCore ? (
                    <LessonDangExamplesPanel
                      examplesCoreText={examplesCoreText}
                      phuongPhapFromTheory={phuongPhapFromTheory}
                      displayMode={examplesDisplayMode}
                      studentName={studentName}
                      lessonId={lesson?.id || ''}
                      sectionKey={dangSectionKey}
                      scoresList={scoresList || []}
                      onSaveDangProgress={onSaveLessonDangProgress}
                      onCompleteDangExp={onCompleteLessonDangExp}
                      previewEmbed={previewEmbed}
                      unlockAllDang={pathGates.unlockAllDang}
                      activeDangIndex={dangActiveIndex}
                      onActiveDangChange={setDangActiveIndex}
                      onNavStateChange={handleDangNavStateChange}
                    />
                  ) : hasMath11Examples ? (
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
                                    key={'loose-' + (ex?.id ?? gi)}
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
                                <div key={'loose-v-' + (ex?.id ?? gi)} className="mb-2">
                                  <Math11ViduCard ex={ex} index={gi} />
                                </div>
                              );
                            }
                            const { dang, vidus } = g;
                            const isFirstDang =
                              exampleGroups.findIndex((item) => item.kind === 'dangGroup') === gi;
                            const theoryPpForDang = isFirstDang ? phuongPhapFromTheory : [];
                            return (
                              <div key={'dang-' + (dang?.id ?? gi)} className="space-y-6">
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
                                  {(vidus || []).map((v, vi) => {
                                    const dangNo = extractDangNumber(dang?.title, gi);
                                    return (
                                      <Math11ViduCard
                                        key={v?.id ?? gi + '-v-' + vi}
                                        ex={v}
                                        index={vi}
                                        dangNumber={dangNo}
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </section>
                  ) : (
                    <p className="text-slate-500 text-center py-8">Chưa có nội dung các dạng toán trong bài này.</p>
                  )}
                </div>
              )}

              {activeTab === 'mindmap' && showMindMapTab ? (
                <LessonMindMapPanel
                  mindMap={lessonMindMap}
                  title={`Tóm tắt · ${lesson?.title || 'Bài học'}`}
                />
              ) : null}

              {activeTab === 'simulation' && showSimulationTab ? (
                <LessonSimulationPanel
                  simulation={lessonSimulation}
                  title={lessonSimulation.title || `Mô phỏng · ${lesson?.title || 'Bài học'}`}
                />
              ) : null}

              {activeTab === 'practice' && (
                <div className="lesson-practice-tab animate-in fade-in duration-200">
                  {pathGates.practiceLocked ? (
                    <div className="text-center py-12 px-6 md:px-10 text-slate-600">
                      <Lock className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                      <p className="font-semibold text-slate-800">Bài tập luyện tập đang khóa</p>
                      <p className="text-sm mt-2 max-w-md mx-auto">
                        {pathGates.practiceLockReason ||
                          'Hãy hoàn thành tất cả các dạng toán trước khi làm bài tập luyện tập.'}
                      </p>
                      {hasNewExamplesCore ? (
                        <button
                          type="button"
                          onClick={() => requestLessonTab('dang')}
                          className="mt-5 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl"
                        >
                          Vào các dạng toán
                        </button>
                      ) : null}
                    </div>
                  ) : lessonData.practice.length === 0 ? (
                    <div className="text-center py-12 px-6 md:px-10 text-slate-600">
                      <p className="font-semibold">Chưa có bài tập luyện tập trong nội dung bài này.</p>
                      <p className="text-sm mt-2">Có thể import từ file (mục BÀI TẬP LUYỆN TẬP) hoặc làm đề trong Phòng thi.</p>
                    </div>
                  ) : (
                    <LessonPracticeSection
                      shuffledPractice={shuffledPractice}
                      interactivePractice={interactivePractice}
                      displayMode={practiceDisplayMode}
                      quizAnswers={quizAnswers}
                      onAnswerChange={handleQuizChange}
                      quizSubmitted={quizSubmitted}
                      onSubmitQuiz={submitQuiz}
                      quizScore={quizScore}
                      onResetQuiz={resetQuiz}
                      practiceHintsOpen={practiceHintsOpen}
                      onToggleHint={togglePracticeHint}
                      studentName={studentName}
                      resetKey={`${lesson?.id || ''}-${activeSectionIndex}`}
                      onRecordStepExp={handlePracticeStepExp}
                    />
                  )}
                </div>
              )}

              {activeTab === 'papers' && (
                <div className="p-5 md:p-10 animate-in fade-in duration-200">
                  {pathGates.papersLocked ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 md:p-10 text-center max-w-lg mx-auto">
                      <Lock className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                      <p className="font-black text-slate-900 text-lg mb-2">Đề luyện tập đang khóa</p>
                      <p className="text-slate-600 text-sm md:text-base leading-relaxed">
                        {pathGates.papersLockReason ||
                          'Hoàn thành các dạng toán và nộp bài tập luyện tập để mở đề luyện tập.'}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          requestLessonTab(
                            pathGates.practiceLocked && hasNewExamplesCore
                              ? 'dang'
                              : practiceCount > 0
                                ? 'practice'
                                : 'dang'
                          )
                        }
                        className="mt-5 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl"
                      >
                        {pathGates.practiceLocked ? 'Học các dạng toán' : 'Làm bài tập luyện tập'}
                      </button>
                    </div>
                  ) : !isLessonStudentLoggedIn ? (
                    <div className="rounded-2xl border-2 border-teal-200 bg-gradient-to-b from-teal-50/80 to-white p-8 md:p-10 text-center max-w-lg mx-auto shadow-sm">
                      <ClipboardList className="w-14 h-14 mx-auto mb-4 text-teal-600" />
                      <p className="font-black text-slate-900 text-lg mb-2">Đề luyện tập theo bài</p>
                      <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-6">
                        Đăng nhập bằng tên trong danh sách lớp để xem và làm các đề thi gắn với{' '}
                        <strong>
                          {chapterHeading} — {lessonHeading}
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
                        Đề theo bài · {lessonHeading} ({papersQuizCount} đề)
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
              <div className="relative z-10 mt-8 mb-2 max-w-7xl mx-auto px-0">
                {canNext && activeTab !== 'practice' ? (
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
                          {prevButtonHint}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={goNextTabOrLesson}
                      disabled={!canNext}
                      title={
                        dangNav?.nextDangLocked
                          ? 'Hoàn thành dạng hiện tại để mở dạng tiếp theo'
                          : !canNext
                            ? 'Đã ở cuối chương (không có bài sau)'
                            : undefined
                      }
                      className={`group flex-1 min-h-[3.75rem] md:min-h-[4.25rem] rounded-2xl px-4 md:px-6 py-3 md:py-4 font-black text-base md:text-lg text-white flex items-center justify-center gap-3 transition-all border-2 ${
                        canNext
                          ? 'bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 border-teal-200/80 shadow-lg hover:brightness-110 hover:scale-[1.01] active:scale-[0.99]'
                          : 'bg-slate-400 border-slate-300/60 opacity-60 cursor-not-allowed shadow-none'
                      }`}
                    >
                      <span className="flex flex-col items-end min-w-0 text-right leading-tight">
                        <span>Tiếp theo</span>
                        <span className="text-xs md:text-sm font-bold opacity-90 truncate max-w-[14rem] md:max-w-[18rem]">
                          {nextButtonHint}
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
          </div>
        </main>
      </div>
    </div>
  );
}
