/* eslint-disable */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, ChevronRight, Lock, Target, Trophy } from 'lucide-react';
import { TextWithMath, TextWithMathWithLoiGiai } from './Math11Template';
import {
  parseExamplesCoreStructure,
  theoryCorePlainToHtml,
  wrapPhuongPhapBlock,
  normalizeDoubleBackslashInMath,
  extractDangNumber,
} from './theoryCoreRichText';
import {
  buildAutoExamplesForDang,
  dangTabLabel,
  findLessonDangProgress,
  LESSON_DANG_COMPLETE_EXP,
} from './lessonDangExamples';
import { isInteractivePracticeType, scorePracticeQuestion, normalizeMcqCorrectIndex } from './practiceQuestionTypes';
import PracticeAnswerInput from './PracticeAnswerInput';
import {
  PracticeTrueFalse,
  PracticeTrueFalseResult,
  PracticeTrueFalseGroup,
  PracticeTrueFalseGroupResult,
  PracticeOrdering,
  PracticeOrderingResult,
  PracticeDragDrop,
  PracticeDragDropResult,
  PracticeFillBlanks,
  PracticeFillBlanksResult,
} from './PracticeInteractiveQuestions';
import renderMathInElement from 'katex/contrib/auto-render';
import { embedSanitizedSvgIntoHtmlString } from './svgEmbed';
import { isAllowedImageUrl, stripDollarWrappersAroundImages } from './RichMathContent';

function escapeHtmlAttr(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function markdownImagesToHtmlInString(s) {
  let t = stripDollarWrappersAroundImages(s || '');
  t = t.replace(/!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?\s*\)/g, (full, alt, src) => {
    const u = String(src)
      .trim()
      .replace(/&amp;/gi, '&');
    if (!u || !isAllowedImageUrl(u)) return full;
    return (
      '<img src="' +
      escapeHtmlAttr(u) +
      '" alt="' +
      escapeHtmlAttr(alt) +
      '" class="max-w-full h-auto rounded-lg my-3 border border-slate-200 shadow-sm block mx-auto" loading="lazy" decoding="async" data-lesson-img="1" />'
    );
  });
  return stripDollarWrappersAroundImages(t);
}

function HtmlWithMath({ html, className }) {
  const ref = React.useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const withSvg = embedSanitizedSvgIntoHtmlString(html || '');
    const withImg = markdownImagesToHtmlInString(withSvg);
    const safe = withImg.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    ref.current.innerHTML = normalizeDoubleBackslashInMath(safe);
    ref.current.querySelectorAll('img').forEach((img) => {
      const src = String(img.getAttribute('src') || '');
      if (/&amp;/i.test(src)) img.setAttribute('src', src.replace(/&amp;/gi, '&'));
      img.addEventListener('error', () => {
        if (!img.isConnected) return;
        img.outerHTML =
          '<div class="lesson-img-broken my-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">Không tải được ảnh — link có thể đã hỏng hoặc file bị xóa. Admin hãy Upload lại PNG/JPG.</div>';
      });
    });
    try {
      renderMathInElement(ref.current, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
        ],
        throwOnError: false,
      });
    } catch {
      /* ignore */
    }
  }, [html]);
  return <div ref={ref} className={className} />;
}

function PhuongPhapBlocks({ bodies }) {
  if (!Array.isArray(bodies) || bodies.length === 0) return null;
  return (
    <>
      {bodies.map((body, i) => (
        <HtmlWithMath
          key={'pp-' + i}
          html={theoryCorePlainToHtml(wrapPhuongPhapBlock(body))}
          className="theory-core-rich block max-w-full lesson-math-content [&_p]:text-left [&_ul]:text-left"
        />
      ))}
    </>
  );
}

function LessonSectionHeading({ num, title }) {
  return (
    <h2 className="flex items-center gap-3 mb-6 md:mb-8">
      <span className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-base md:text-lg font-black shrink-0 shadow-sm">
        {num}
      </span>
      <span className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">{title}</span>
    </h2>
  );
}

function InteractiveViduBody({ q, answer, onAnswerChange, locked, showResult }) {
  if (!q) return null;
  if (q.type === 'reveal') {
    return (
      <div className="space-y-3">
        <div className="text-slate-800 text-base md:text-lg leading-relaxed">
          <TextWithMathWithLoiGiai text={q.question || ''} />
        </div>
        {showResult && (q.explanation || '').trim() ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm md:text-base text-slate-800">
            <p className="font-black text-emerald-800 text-xs uppercase tracking-wide mb-2">Lời giải</p>
            <TextWithMathWithLoiGiai text={q.explanation} />
          </div>
        ) : null}
      </div>
    );
  }
  const t = String(q.type || 'mcq');
  return (
    <div className="space-y-3">
      <div className="text-slate-800 text-base md:text-lg leading-relaxed">
        <TextWithMathWithLoiGiai text={q.question || ''} />
      </div>
      {t === 'mcq' || t === 'multiple_choice' ? (
        <div className="grid grid-cols-1 gap-2">
          {(q.options || []).map((opt, oIdx) => {
            const selected = normalizeMcqCorrectIndex(answer, (q.options || []).length) === oIdx;
            const isCorrect = showResult && normalizeMcqCorrectIndex(q.correctAnswer, (q.options || []).length) === oIdx;
            const isWrong = showResult && selected && !isCorrect;
            return (
              <button
                key={oIdx}
                type="button"
                disabled={locked}
                onClick={() => onAnswerChange(oIdx)}
                className={
                  'text-left px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ' +
                  (isCorrect
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                    : isWrong
                      ? 'border-rose-400 bg-rose-50 text-rose-900'
                      : selected
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 bg-white hover:border-indigo-300')
                }
              >
                <span className="font-black mr-1">{String.fromCharCode(65 + oIdx)}.</span>
                <TextWithMath text={opt || ''} />
              </button>
            );
          })}
        </div>
      ) : null}
      {t === 'input' || t === 'short_answer' ? (
        <PracticeAnswerInput q={q} value={answer || ''} disabled={locked} onChange={onAnswerChange} />
      ) : null}
      {t === 'true_false' ? (
        <PracticeTrueFalse q={q} value={answer} disabled={locked} onChange={onAnswerChange} />
      ) : null}
      {t === 'true_false_group' ? (
        <PracticeTrueFalseGroup q={q} value={answer} disabled={locked} onChange={onAnswerChange} />
      ) : null}
      {t === 'ordering' ? (
        <PracticeOrdering q={q} value={answer} disabled={locked} onChange={onAnswerChange} />
      ) : null}
      {t === 'drag_drop' ? (
        <PracticeDragDrop q={q} value={answer} disabled={locked} onChange={onAnswerChange} />
      ) : null}
      {t === 'fill_blanks' ? (
        <PracticeFillBlanks q={q} value={answer} disabled={locked} onChange={onAnswerChange} />
      ) : null}
      {showResult && (q.explanation || '').trim() ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm md:text-base text-slate-800">
          <p className="font-black text-emerald-800 text-xs uppercase tracking-wide mb-2">Lời giải</p>
          <TextWithMathWithLoiGiai text={q.explanation} />
        </div>
      ) : null}
      {showResult && t === 'true_false' ? <PracticeTrueFalseResult q={q} value={answer} /> : null}
      {showResult && t === 'true_false_group' ? <PracticeTrueFalseGroupResult q={q} value={answer} /> : null}
      {showResult && t === 'ordering' ? <PracticeOrderingResult q={q} value={answer} /> : null}
      {showResult && t === 'drag_drop' ? <PracticeDragDropResult q={q} value={answer} /> : null}
      {showResult && t === 'fill_blanks' ? <PracticeFillBlanksResult q={q} value={answer} /> : null}
    </div>
  );
}

function scoreViduQuestion(q, answer) {
  if (!q) return false;
  if (q.type === 'reveal') return true;
  if (isInteractivePracticeType(q.type) || q.type === 'multiple_choice' || q.type === 'short_answer') {
    try {
      return scorePracticeQuestion(q, answer);
    } catch {
      return false;
    }
  }
  return false;
}

﻿/**
 * Tab Các dạng toán: tabs Dạng, khóa tuần tự.
 * Mỗi ví dụ tự nhận: chỉ Lời giải → khung classic; có đáp án/loại câu → tương tác.
 */
export default function LessonDangExamplesPanel({
  examplesCoreText,
  phuongPhapFromTheory = [],
  displayMode: _displayModeIgnored,
  studentName = '',
  lessonId = '',
  sectionKey = '0',
  scoresList = [],
  onSaveDangProgress,
  onCompleteDangExp,
  previewEmbed = false,
  /** Lần sau / đã xong dạng: mở hết tab dạng, không khoá tuần tự. */
  unlockAllDang = false,
  /** Index dạng đang xem (controlled — dùng nút Tiếp theo ở footer). */
  activeDangIndex = null,
  onActiveDangChange,
  /** Báo parent để cập nhật nhãn Quay lại / Tiếp theo. */
  onNavStateChange,
}) {
  const hasExamples = Boolean((examplesCoreText || '').trim());
  const hasTheoryPp = Array.isArray(phuongPhapFromTheory) && phuongPhapFromTheory.length > 0;

  const parsed = useMemo(() => {
    if (!hasExamples) {
      return { groups: [], preface: '', phuongPhapFromExamples: [] };
    }
    return parseExamplesCoreStructure(examplesCoreText);
  }, [examplesCoreText, hasExamples]);

  const groups = Array.isArray(parsed.groups) ? parsed.groups : [];
  const hasDangGroups = groups.some((g) => g.dangTitle || g.dangBody);

  const saved = useMemo(
    () => findLessonDangProgress(scoresList, studentName, lessonId, sectionKey),
    [scoresList, studentName, lessonId, sectionKey]
  );

  const controlled = activeDangIndex != null && typeof onActiveDangChange === 'function';
  const [activeDangInner, setActiveDangInner] = useState(0);
  const activeDang = controlled
    ? Math.min(Math.max(0, Number(activeDangIndex) || 0), Math.max(0, groups.length - 1))
    : activeDangInner;
  const setActiveDang = useCallback(
    (next) => {
      const maxIdx = Math.max(0, groups.length - 1);
      const v = typeof next === 'function' ? next(activeDang) : next;
      const clamped = Math.min(Math.max(0, Number(v) || 0), maxIdx);
      if (controlled) onActiveDangChange(clamped);
      else setActiveDangInner(clamped);
    },
    [controlled, onActiveDangChange, groups.length, activeDang]
  );

  const [unlockedDang, setUnlockedDang] = useState(0);
  const [completedByDang, setCompletedByDang] = useState({});
  const [answers, setAnswers] = useState({});
  const [checked, setChecked] = useState({});
  const [allCompleteToast, setAllCompleteToast] = useState(false);

  // Đồng bộ tiến trình đã lưu (mở khóa / đã học) — không đổi dạng đang xem
  useEffect(() => {
    const maxIdx = Math.max(0, groups.length - 1);
    const free = Boolean(unlockAllDang || saved?.allComplete || previewEmbed);
    const u = free ? maxIdx : Math.min(Math.max(0, saved?.unlockedDangIndex ?? 0), maxIdx);
    setUnlockedDang(u);
    setCompletedByDang(saved?.completedByDang || {});
    // Chỉ kẹp index hợp lệ; không nhảy theo unlocked khi vừa đánh dấu đã học
    setActiveDang((prev) => Math.min(Math.max(0, prev), maxIdx));
  }, [lessonId, sectionKey, groups.length, saved?.updatedAt, saved?.allComplete, unlockAllDang, previewEmbed, saved?.unlockedDangIndex]);

  // Đổi bài / mục: reset câu trả lời; đặt dạng xem ban đầu theo tiến độ đã mở
  useEffect(() => {
    const maxIdx = Math.max(0, groups.length - 1);
    const free = Boolean(unlockAllDang || saved?.allComplete || previewEmbed);
    const u = free ? 0 : Math.min(Math.max(0, saved?.unlockedDangIndex ?? 0), maxIdx);
    setActiveDang(Math.min(Math.max(0, u), maxIdx));
    setAnswers({});
    setChecked({});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ khi đổi bài/mục
  }, [lessonId, sectionKey, groups.length]);

  useEffect(() => {
    if (typeof onNavStateChange !== 'function') return;
    const count = groups.length;
    const labels = groups.map((grp, gi) => dangTabLabel(grp, gi));
    const free = Boolean(unlockAllDang || saved?.allComplete || previewEmbed);
    onNavStateChange({
      count,
      active: activeDang,
      unlocked: unlockedDang,
      freeRoam: free,
      labels,
      nextLabel: activeDang < count - 1 ? labels[activeDang + 1] || `Dạng ${activeDang + 2}` : '',
      prevLabel: activeDang > 0 ? labels[activeDang - 1] || `Dạng ${activeDang}` : '',
      canNextDang: count > 1 && activeDang < count - 1 && (free || activeDang + 1 <= unlockedDang),
      canPrevDang: count > 1 && activeDang > 0,
      nextDangLocked:
        count > 1 && activeDang < count - 1 && !free && activeDang + 1 > unlockedDang,
    });
  }, [
    groups,
    activeDang,
    unlockedDang,
    unlockAllDang,
    saved?.allComplete,
    previewEmbed,
    onNavStateChange,
  ]);

  const persist = useCallback(
    (nextUnlocked, nextCompleted, allDone) => {
      if (previewEmbed || typeof onSaveDangProgress !== 'function') return;
      if (!(studentName || '').trim() || !lessonId) return;
      onSaveDangProgress({
        lessonId,
        sectionKey,
        unlockedDangIndex: nextUnlocked,
        completedByDang: nextCompleted,
        allComplete: Boolean(allDone),
      });
    },
    [previewEmbed, onSaveDangProgress, studentName, lessonId, sectionKey]
  );

  const markExampleDone = useCallback(
    (dangIdx, exampleId) => {
      setCompletedByDang((prev) => {
        const key = String(dangIdx);
        const list = Array.isArray(prev[key]) ? prev[key] : [];
        if (list.includes(exampleId)) return prev;
        const next = { ...prev, [key]: [...list, exampleId] };
        const group = groups[dangIdx];
        const totalEx = Math.max(1, buildAutoExamplesForDang(group, dangIdx).length);
        const doneCount = next[key].length;
        let nextUnlocked = unlockedDang;
        let allDone = false;
        if (doneCount >= totalEx) {
          if (dangIdx >= unlockedDang && dangIdx < groups.length - 1) {
            nextUnlocked = dangIdx + 1;
            setUnlockedDang(nextUnlocked);
            // Không tự nhảy sang dạng tiếp — học sinh bấm Tiếp theo hoặc tab dạng.
          }
          if (dangIdx === groups.length - 1) {
            allDone = true;
            setAllCompleteToast(true);
            if (!previewEmbed && typeof onCompleteDangExp === 'function' && (studentName || '').trim()) {
              onCompleteDangExp({
                lessonId,
                sectionKey,
                expPoints: LESSON_DANG_COMPLETE_EXP,
              });
            }
          }
        }
        persist(nextUnlocked, next, allDone || Boolean(saved?.allComplete));
        return next;
      });
    },
    [
      groups,
      unlockedDang,
      persist,
      previewEmbed,
      onCompleteDangExp,
      studentName,
      lessonId,
      sectionKey,
      saved?.allComplete,
    ]
  );

  const prefaceHtml = useMemo(() => {
    if (!parsed.preface) return '';
    return theoryCorePlainToHtml(parsed.preface, { viduAsFrame: true, viduCounter: { n: 0 } });
  }, [parsed.preface]);

  const g = groups[activeDang] || groups[0] || null;

  const autoExamples = useMemo(() => {
    if (!g) return [];
    return buildAutoExamplesForDang(g, activeDang);
  }, [g, activeDang]);

  if (!hasExamples && !hasTheoryPp) return null;

  const completedSet = new Set(completedByDang[String(activeDang)] || []);

  return (
    <section className="mb-12 md:mb-16">
      <div className="max-w-4xl mx-auto px-2 md:px-4">
        <LessonSectionHeading num={2} title="Các dạng toán và ví dụ" />

        {prefaceHtml ? (
          <div className="w-full max-w-full text-left text-slate-800 text-base md:text-lg leading-loose lesson-math-content mb-8">
            <HtmlWithMath html={prefaceHtml} className="theory-core-rich block max-w-full" />
          </div>
        ) : null}

        {groups.length > 1 || hasDangGroups ? (
          <nav className="lesson-dang-tabs mb-6 md:mb-8" aria-label="Các dạng toán">
            <div className="flex flex-wrap items-center gap-1 md:gap-2">
              {groups.map((grp, gi) => {
                const locked = gi > unlockedDang && !previewEmbed && !unlockAllDang && !saved?.allComplete;
                const active = gi === activeDang;
                const done =
                  Boolean(saved?.allComplete || unlockAllDang) ||
                  ((completedByDang[String(gi)] || []).length > 0 && gi < unlockedDang);
                return (
                  <React.Fragment key={'dang-tab-' + gi}>
                    {gi > 0 ? (
                      <ChevronRight className="w-5 h-5 text-rose-500 shrink-0 mx-0.5" aria-hidden="true" />
                    ) : null}
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => !locked && setActiveDang(gi)}
                      className={
                        'lesson-dang-tab relative px-3 py-2 text-sm md:text-base font-black tracking-wide transition-colors ' +
                        (active
                          ? 'text-indigo-700 border-b-[3px] border-orange-500'
                          : locked
                            ? 'text-slate-400 cursor-not-allowed'
                            : 'text-slate-700 hover:text-indigo-600 border-b-[3px] border-transparent')
                      }
                      title={locked ? 'Hoàn thành dạng trước để mở khóa' : dangTabLabel(grp, gi)}
                    >
                      {locked ? <Lock className="w-3.5 h-3.5 inline mr-1 opacity-70" /> : null}
                      {dangTabLabel(grp, gi).toUpperCase()}
                      {done ? <CheckCircle className="w-3.5 h-3.5 inline ml-1 text-emerald-500" /> : null}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </nav>
        ) : null}

        {g ? (
          <div key={'dang-body-' + activeDang}>
            {(() => {
              const pps =
                activeDang === 0
                  ? [...(phuongPhapFromTheory || []), ...(g.phuongPhapBodies || [])]
                  : g.phuongPhapBodies || [];
              const dangText = (g.dangBody || g.dangTitle || '').toString().trim();
              const showFrame = Boolean(dangText) || pps.length > 0;
              return showFrame ? (
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
              ) : null;
            })()}

            <div className="space-y-5">
              {autoExamples.length === 0 ? (
                <p className="text-sm text-slate-500">Chưa có ví dụ trong dạng này.</p>
              ) : (
                autoExamples.map((item, exIdx) => {
                  const exId = item.id;
                  const isDone = completedSet.has(exId);
                  if (item.kind === 'classic') {
                    const dangNo = extractDangNumber(g.dangLabel || g.dangTitle, activeDang);
                    // Mỗi ví dụ render riêng: truyền dang + chỉ số để ra 1.1, 1.2… / 2.1, 2.2…
                    const html = theoryCorePlainToHtml(item.sourceText || '', {
                      viduAsFrame: true,
                      viduCounter: { dang: dangNo, n: exIdx },
                      forcedViduBadge: item.badge,
                    });
                    return (
                      <div key={exId} className="space-y-3">
                        <div className="w-full max-w-full text-left text-slate-800 text-base md:text-lg leading-loose lesson-math-content">
                          <HtmlWithMath html={html} className="theory-core-rich block max-w-full" />
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={isDone}
                            onClick={() => markExampleDone(activeDang, exId)}
                            className={
                              'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black border ' +
                              (isDone
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700')
                            }
                          >
                            {isDone ? (
                              <>
                                <CheckCircle className="w-4 h-4" /> Đã hoàn thành
                              </>
                            ) : (
                              'Đánh dấu đã học ví dụ này'
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  const q = item.q;
                  const isChecked = Boolean(checked[exId]);
                  const ok = isChecked ? scoreViduQuestion(q, answers[exId]) : false;
                  return (
                    <div
                      key={exId}
                      className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm"
                    >
                      <div className="mb-3">
                        <span className="inline-flex items-center rounded-md bg-indigo-100 text-indigo-800 px-2 py-0.5 text-xs font-black uppercase tracking-wide">
                          {item.badge || q._viduBadge || `Ví dụ ${extractDangNumber(g.dangLabel || g.dangTitle, activeDang)}.${exIdx + 1}`}
                        </span>
                        {isDone ? (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                            <CheckCircle className="w-3.5 h-3.5" /> Đã xong
                          </span>
                        ) : null}
                      </div>
                      <InteractiveViduBody
                        q={q}
                        answer={answers[exId]}
                        locked={isChecked || isDone}
                        showResult={isChecked || isDone}
                        onAnswerChange={(val) => setAnswers((prev) => ({ ...prev, [exId]: val }))}
                      />
                      {!isChecked && !isDone ? (
                        <div className="mt-4 flex justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              setChecked((prev) => ({ ...prev, [exId]: true }));
                              const correct = scoreViduQuestion(q, answers[exId]);
                              if (correct) markExampleDone(activeDang, exId);
                            }}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black shadow"
                          >
                            <Target className="w-4 h-4" />
                            Kiểm tra đáp án
                          </button>
                        </div>
                      ) : null}
                      {isChecked && !ok ? (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-rose-600">Chưa đúng — thử lại nhé.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setChecked((prev) => {
                                const n = { ...prev };
                                delete n[exId];
                                return n;
                              });
                            }}
                            className="text-sm font-bold text-indigo-600 hover:underline"
                          >
                            Làm lại
                          </button>
                        </div>
                      ) : null}
                      {isChecked && ok && !isDone ? (
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => markExampleDone(activeDang, exId)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black bg-emerald-600 text-white"
                          >
                            <CheckCircle className="w-4 h-4" /> Tiếp tục
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : null}

        {!hasDangGroups && groups.length === 0 && hasTheoryPp ? (
          <div className="lesson-dang-method-frame rounded-2xl border border-indigo-200/70 bg-white px-5 py-6 md:px-8 md:py-7 mb-8">
            <PhuongPhapBlocks bodies={phuongPhapFromTheory} />
          </div>
        ) : null}

        {allCompleteToast || saved?.allComplete ? (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-500 shrink-0" />
            <div>
              <p className="font-black text-amber-900">Đã hoàn thành Các dạng toán!</p>
              <p className="text-sm text-amber-800/90">
                {(studentName || '').trim()
                  ? '+' + LESSON_DANG_COMPLETE_EXP + ' EXP đã được ghi nhận (một lần).'
                  : 'Đăng nhập để nhận EXP.'}
              </p>
            </div>
          </div>
        ) : null}

        {!(studentName || '').trim() && !previewEmbed ? (
          <p className="mt-4 text-xs text-slate-500 text-center">
            Đăng nhập bằng tên trong lớp để lưu tiến trình dạng toán và nhận EXP.
          </p>
        ) : null}
      </div>
    </section>
  );
}
