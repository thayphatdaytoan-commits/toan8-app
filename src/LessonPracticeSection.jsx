import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Divide,
  Lightbulb,
  Minus,
  Percent,
  Pi,
  Plus,
  Sigma,
  Sparkles,
  Target,
} from 'lucide-react';

/** EXP mỗi câu đúng ở chế độ từng câu (tương đương 1 điểm × 15). */
export const PRACTICE_STEP_CORRECT_EXP = 10;
import { TextWithMath, TextWithMathWithLoiGiai } from './Math11Template';
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
import { isInteractivePracticeType, scorePracticeQuestion, normalizeInputAnswerParts, normalizeMcqCorrectIndex } from './practiceQuestionTypes';
import ChuyenDeOnTapFireworks from './chuyenDeOnTap/ChuyenDeOnTapFireworks';
import { extractYouTubeID, buildYouTubeEmbedUrl, buildYouTubeWatchUrl } from './youtubeUtils';

const DECOR_ICONS = [
  { Icon: Sigma, cls: 'lesson-practice-decor-icon', style: { top: '6%', left: '3%', transform: 'rotate(-12deg)' }, size: 28 },
  { Icon: Pi, cls: 'lesson-practice-decor-icon lesson-practice-decor-icon--violet', style: { top: '14%', right: '5%', transform: 'rotate(8deg)' }, size: 32 },
  { Icon: Percent, cls: 'lesson-practice-decor-icon lesson-practice-decor-icon--teal', style: { bottom: '18%', left: '4%', transform: 'rotate(6deg)' }, size: 26 },
  { Icon: Divide, cls: 'lesson-practice-decor-icon', style: { bottom: '10%', right: '6%', transform: 'rotate(-6deg)' }, size: 24 },
  { Icon: Plus, cls: 'lesson-practice-decor-icon lesson-practice-decor-icon--violet', style: { top: '42%', left: '2%', transform: 'rotate(15deg)' }, size: 22 },
  { Icon: Minus, cls: 'lesson-practice-decor-icon lesson-practice-decor-icon--teal', style: { top: '55%', right: '3%', transform: 'rotate(-10deg)' }, size: 20 },
  { Icon: Sparkles, cls: 'lesson-practice-decor-icon lesson-practice-decor-icon--violet', style: { top: '28%', right: '12%', transform: 'rotate(4deg)' }, size: 18 },
];

function PracticeFrameDecor() {
  return (
    <div className="lesson-practice-decor" aria-hidden="true">
      {DECOR_ICONS.map(({ Icon, cls, style, size }, i) => (
        <Icon key={i} className={cls} style={style} size={size} strokeWidth={2.2} />
      ))}
    </div>
  );
}

function PracticeHintPanel({ hint, hintVideoUrl, open, onToggle }) {
  const text = (hint || '').toString().trim();
  const videoRaw = (hintVideoUrl || '').toString().trim();
  const videoId = extractYouTubeID(videoRaw);
  const embedUrl = videoId ? buildYouTubeEmbedUrl(videoId) : '';
  const watchUrl = videoId ? buildYouTubeWatchUrl(videoId) : videoRaw;
  if (!text && !embedUrl && !videoRaw) return null;

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
        <div className="mt-3 rounded-xl border border-amber-200/90 bg-amber-50/40 px-5 py-4 text-slate-800 text-sm md:text-base leading-relaxed lesson-math-content space-y-4">
          {text ? <TextWithMath text={text} /> : null}
          {embedUrl ? (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-800/90">Video hướng dẫn</p>
              <div className="relative w-full overflow-hidden rounded-xl border border-amber-200/80 bg-black shadow-sm aspect-video">
                <iframe
                  title="Video gợi ý hướng dẫn"
                  src={embedUrl}
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
              {watchUrl ? (
                <a
                  href={watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex text-xs font-semibold text-amber-800 hover:underline"
                >
                  Mở trên YouTube ↗
                </a>
              ) : null}
            </div>
          ) : videoRaw ? (
            <a
              href={videoRaw}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-sm font-semibold text-amber-800 hover:underline break-all"
            >
              Xem video hướng dẫn ↗
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function getFeedbackMessage(correct, index) {
  if (correct) {
    const msgs = [
      'Tuyệt vời! Bạn làm đúng rồi!',
      'Chính xác! Giỏi lắm!',
      'Xuất sắc! Hãy tiếp tục phát huy!',
      'Đúng rồi — bạn đang tiến bộ rất tốt!',
    ];
    return msgs[index % msgs.length];
  }
  const msgs = [
    'Chưa đúng lần này — xem lời giải và cố gắng câu sau nhé!',
    'Không sao, sai để học! Xem đáp án chi tiết bên dưới.',
    'Cố lên! Đọc lời giải rồi làm tiếp câu kế bên.',
  ];
  return msgs[index % msgs.length];
}

function PracticeAnswerResult({ q }) {
  return (
    <div className="mt-4 rounded-xl bg-sky-50/60 px-4 py-4 md:px-5 md:py-5">
      <p className="text-xs font-bold uppercase tracking-widest text-sky-800 mb-3 flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-sky-600 shrink-0" />
        Đáp án và lời giải
      </p>
      {q.type === 'mcq' && Array.isArray(q.options) && q.correctAnswer != null ? (
        <div className="text-slate-800 font-semibold mb-2">
          <span className="text-teal-700">Đáp án đúng: </span>
          {(() => {
            const ci = normalizeMcqCorrectIndex(q.correctAnswer, q.options.length);
            return (
              <>
                <span className="font-black text-emerald-800">{String.fromCharCode(65 + Math.max(0, ci))}.</span>{' '}
                <span className="font-medium">
                  <TextWithMathWithLoiGiai text={String(q.options[ci] ?? '')} inlineImage />
                </span>
              </>
            );
          })()}
        </div>
      ) : null}
      {q.type === 'input' ? (
        <div className="text-slate-800 font-semibold mb-2 flex flex-wrap items-baseline gap-x-1 gap-y-1">
          <span className="text-teal-700 shrink-0">Đáp án đúng:</span>
          {normalizeInputAnswerParts(q).map((part, i, arr) => {
            const label = (part.placeholder || '').replace(/\s*[?=…·.]+$/u, '').trim();
            const ans = String(part.correctAnswer || '')
              .split(/[|;]/g)
              .map((x) => x.trim())
              .filter(Boolean)[0] || String(part.correctAnswer || '').trim();
            return (
              <span key={part.id || i} className="inline-flex items-baseline gap-1 font-black text-emerald-800">
                {label ? <span className="whitespace-pre-wrap tracking-wide">{label}</span> : null}
                {label ? <span className="font-bold text-teal-700">=</span> : null}
                <span className="whitespace-pre-wrap">
                  <TextWithMathWithLoiGiai text={ans} />
                </span>
                {i < arr.length - 1 ? <span className="text-slate-400 font-bold mr-1">;</span> : null}
              </span>
            );
          })}
        </div>
      ) : null}
      {q.type === 'true_false' ? (
        <div className="text-slate-800 font-semibold mb-2">
          <span className="text-teal-700">Đáp án đúng: </span>
          <PracticeTrueFalseResult q={q} />
        </div>
      ) : null}
      {q.type === 'true_false_group' ? (
        <div className="text-slate-800 font-semibold mb-2">
          <span className="text-teal-700 block mb-2">Đáp án đúng: </span>
          <PracticeTrueFalseGroupResult q={q} />
        </div>
      ) : null}
      {q.type === 'ordering' ? (
        <div className="text-slate-800 font-semibold mb-2">
          <span className="text-teal-700 block mb-2">Thứ tự đúng: </span>
          <PracticeOrderingResult q={q} />
        </div>
      ) : null}
      {q.type === 'drag_drop' ? (
        <div className="text-slate-800 font-semibold mb-2">
          <span className="text-teal-700 block mb-2">Ghép đúng: </span>
          <PracticeDragDropResult q={q} />
        </div>
      ) : null}
      {q.type === 'fill_blanks' ? (
        <div className="text-slate-800 font-semibold mb-2">
          <span className="text-teal-700 block mb-2">Đáp án đúng: </span>
          <PracticeFillBlanksResult q={q} />
        </div>
      ) : null}
      {(q.explanation || '').toString().trim() ? (
        <div className="mt-3 pt-3 text-slate-700 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Lời giải chi tiết</p>
          <TextWithMathWithLoiGiai text={(q.explanation || '').toString().trim()} />
        </div>
      ) : (
        <p className="text-sm text-slate-500 italic mt-1">
          Chưa có lời giải chi tiết trong nội dung bài — chỉ hiển thị đáp án đúng.
        </p>
      )}
    </div>
  );
}

function PracticeQuestionHeader({ q, index }) {
  const questionText =
    q.type === 'fill_blanks' && !(q.question || '').trim()
      ? 'Điền các chỗ trống trong đoạn văn dưới đây.'
      : q.question || '';

  return (
    <div className="lesson-practice-question-header">
      <div className="lesson-practice-q-badge">
        <span className="lesson-practice-q-num">{index + 1}</span>
        <span className="lesson-practice-q-label">Câu hỏi luyện tập</span>
      </div>
      <div className="lesson-practice-q-text lesson-math-content text-slate-800 text-base md:text-lg leading-loose">
        <TextWithMathWithLoiGiai text={questionText} />
      </div>
    </div>
  );
}

function PracticeQuestionBody({
  q,
  quizAnswers,
  onAnswerChange,
  locked,
  showResult,
  practiceHintsOpen,
  onToggleHint,
  highlightMcqResult,
}) {
  const isInteractive = isInteractivePracticeType(q.type);

  return (
    <div className="lesson-practice-body-panel lesson-math-content text-base md:text-lg leading-loose text-slate-800">
      {q.type === 'mcq' ? (
        <div className="grid grid-cols-1 gap-3">
          {(q.options || []).map((opt, oIdx) => {
            const isSelected = normalizeMcqCorrectIndex(quizAnswers[q.id], (q.options || []).length) === oIdx;
            const isCorrect = normalizeMcqCorrectIndex(q.correctAnswer, (q.options || []).length) === oIdx;
            let btnClass = 'border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-700 bg-white';
            if (highlightMcqResult) {
              if (isCorrect) btnClass = 'border-emerald-500 bg-emerald-50 text-emerald-800';
              else if (isSelected && !isCorrect) btnClass = 'border-red-500 bg-red-50 text-red-800';
              else btnClass = 'border-slate-200 bg-white opacity-50';
            } else if (isSelected) {
              btnClass = 'border-indigo-500 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500';
            }
            return (
              <button
                key={oIdx}
                type="button"
                onClick={() => onAnswerChange(q.id, oIdx)}
                disabled={locked}
                className={`p-3 md:p-4 rounded-xl border-2 text-left font-medium transition-all flex items-center gap-3 ${btnClass}`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isSelected || (highlightMcqResult && isCorrect) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
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
        <PracticeAnswerInput q={q} value={quizAnswers[q.id] || ''} disabled={locked} onChange={(val) => onAnswerChange(q.id, val)} />
      ) : null}
      {q.type === 'true_false' ? (
        <PracticeTrueFalse q={q} value={quizAnswers[q.id]} disabled={locked} onChange={(val) => onAnswerChange(q.id, val)} />
      ) : null}
      {q.type === 'true_false_group' ? (
        <PracticeTrueFalseGroup
          q={q}
          value={quizAnswers[q.id]}
          disabled={locked}
          onChange={(val) => onAnswerChange(q.id, val)}
        />
      ) : null}
      {q.type === 'ordering' ? (
        <PracticeOrdering q={q} value={quizAnswers[q.id]} disabled={locked} onChange={(val) => onAnswerChange(q.id, val)} />
      ) : null}
      {q.type === 'drag_drop' ? (
        <PracticeDragDrop q={q} value={quizAnswers[q.id]} disabled={locked} onChange={(val) => onAnswerChange(q.id, val)} />
      ) : null}
      {q.type === 'fill_blanks' ? (
        <PracticeFillBlanks q={q} value={quizAnswers[q.id]} disabled={locked} onChange={(val) => onAnswerChange(q.id, val)} />
      ) : null}
      {isInteractive ? (
        <PracticeHintPanel
          hint={q.hint}
          hintVideoUrl={q.hintVideoUrl}
          open={Boolean(practiceHintsOpen[q.id])}
          onToggle={() => onToggleHint(q.id)}
        />
      ) : null}
      {showResult && isInteractive ? <PracticeAnswerResult q={q} /> : null}
    </div>
  );
}

function PracticeStepDots({ total, current, stepStates, onSelect }) {
  return (
    <div className="lesson-practice-step-dots">
      {Array.from({ length: total }, (_, i) => {
        const st = stepStates[i];
        const isCurrent = i === current;
        let cls = 'lesson-practice-dot';
        if (isCurrent) cls += ' lesson-practice-dot--current';
        else if (st?.checked && st.correct) cls += ' lesson-practice-dot--ok';
        else if (st?.checked && !st.correct) cls += ' lesson-practice-dot--bad';
        else if (st?.visited) cls += ' lesson-practice-dot--visited';
        else cls += ' lesson-practice-dot--idle';
        return (
          <button key={i} type="button" onClick={() => onSelect(i)} className={cls} aria-label={`Câu ${i + 1}`}>
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}

function PracticeStepPager({ total, current, stepStates, onSelect, onPrev, onNext, canGoPrev, canGoNext }) {
  return (
    <div className="lesson-practice-pager">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canGoPrev}
        className="lesson-practice-pager-arrow"
        aria-label="Câu trước"
      >
        <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
      </button>
      <PracticeStepDots total={total} current={current} stepStates={stepStates} onSelect={onSelect} />
      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext}
        className="lesson-practice-pager-arrow"
        aria-label={current >= total - 1 ? 'Hoàn thành' : 'Câu tiếp theo'}
      >
        <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function PracticeListFooter({
  interactivePractice,
  quizSubmitted,
  quizScore,
  studentName,
  onSubmit,
  onReset,
  stepModeExpHint = false,
}) {
  if (interactivePractice.length === 0) {
    return (
      <p className="text-sm text-slate-500 max-w-lg mx-auto text-center">
        Phần trên là bài luyện tập dạng tự giải. Đáp án chi tiết xem trong lời giải phần lý thuyết hoặc tài liệu PDF.
      </p>
    );
  }
  if (!quizSubmitted) {
    return (
      <>
        <button
          type="button"
          onClick={onSubmit}
          className="lesson-practice-btn lesson-practice-btn--check min-w-[220px] justify-center"
        >
          <Target className="w-5 h-5 shrink-0" />
          Nộp bài — xem đáp án
        </button>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-2">
          Chỉ sau khi <strong className="text-slate-700">nộp bài</strong> mới hiện đáp án đúng và lời giải phía dưới từng câu.
        </p>
      </>
    );
  }
  const stepExpTotal = Math.round(Number(quizScore) || 0) * PRACTICE_STEP_CORRECT_EXP;
  return (
    <div className="bg-sky-50/80 p-5 rounded-2xl inline-block min-w-[260px]">
      <h3 className="text-base font-bold text-slate-600 mb-2">Kết quả</h3>
      <p className="text-4xl font-black text-teal-600 mb-1">
        {quizScore} / {interactivePractice.length}
      </p>
      {(studentName || '').trim() ? (
        <p className="text-xs text-sky-800 font-semibold mb-4">
          {stepModeExpHint
            ? `Đã cộng khoảng +${stepExpTotal} EXP (mỗi câu đúng +${PRACTICE_STEP_CORRECT_EXP}) — đã ghi vào tiến trình`
            : `+${Math.round(quizScore * 15)} EXP (điểm × 15) — đã ghi vào tiến trình bài học`}
        </p>
      ) : (
        <p className="text-xs text-slate-500 mb-4">Đăng nhập bằng tên trong lớp để lưu điểm, EXP và thanh tiến trình.</p>
      )}
      <button
        type="button"
        onClick={onReset}
        className="lesson-practice-btn lesson-practice-btn--ghost text-sm"
      >
        Làm lại
      </button>
    </div>
  );
}

function PracticeStepFeedbackBanner({ correct, index, expGained }) {
  const ok = Boolean(correct);
  return (
    <div
      className={`lesson-practice-feedback lesson-practice-feedback--banner ${
        ok ? 'lesson-practice-feedback--ok' : 'lesson-practice-feedback--bad'
      }`}
      role="status"
      aria-live="polite"
    >
      <span className="lesson-practice-feedback-emoji" aria-hidden="true">
        {ok ? '🎉' : '💪'}
      </span>
      <span className="lesson-practice-feedback-text">
        {getFeedbackMessage(ok, index)}
        {ok && expGained > 0 ? (
          <span className="ml-2 inline-flex items-center rounded-full bg-amber-100/95 px-2 py-0.5 text-xs font-black text-amber-800 border border-amber-300/80">
            +{expGained} EXP
          </span>
        ) : null}
      </span>
    </div>
  );
}

function PracticeStageFrame({ children, header, banner }) {
  return (
    <div className="lesson-practice-frame">
      <PracticeFrameDecor />
      <div className="lesson-practice-inner">
        {banner || null}
        {/* Đề + đáp án cùng vùng cuộn — tránh đề/ảnh chiếm khung khiến đáp án bị cắt */}
        <div className="lesson-practice-scroll">
          {header}
          {children}
        </div>
      </div>
    </div>
  );
}

export default function LessonPracticeSection({
  shuffledPractice,
  interactivePractice,
  displayMode = 'list',
  quizAnswers,
  onAnswerChange,
  quizSubmitted,
  onSubmitQuiz,
  quizScore,
  onResetQuiz,
  practiceHintsOpen,
  onToggleHint,
  studentName,
  resetKey,
  onRecordStepExp,
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [stepChecked, setStepChecked] = useState({});
  const [stepVisited, setStepVisited] = useState({ 0: true });
  const [stepFinished, setStepFinished] = useState(false);
  const [fireworksBurstKey, setFireworksBurstKey] = useState(0);
  const [lastStepExp, setLastStepExp] = useState(0);

  const total = shuffledPractice.length;
  const currentQ = shuffledPractice[stepIndex] || null;
  const currentChecked = currentQ ? stepChecked[currentQ.id] : null;

  useEffect(() => {
    setStepIndex(0);
    setStepChecked({});
    setStepVisited({ 0: true });
    setStepFinished(false);
    setLastStepExp(0);
  }, [resetKey]);

  useEffect(() => {
    setStepVisited((prev) => ({ ...prev, [stepIndex]: true }));
  }, [stepIndex]);

  useEffect(() => {
    if (!currentChecked?.checked) return undefined;
    const el = document.querySelector('.lesson-practice-feedback--banner');
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    return undefined;
  }, [currentChecked?.checked, currentQ?.id]);

  const stepStates = useMemo(() => {
    return shuffledPractice.map((q, i) => ({
      checked: Boolean(stepChecked[q.id]?.checked),
      correct: Boolean(stepChecked[q.id]?.correct),
      visited: Boolean(stepVisited[i]),
    }));
  }, [shuffledPractice, stepChecked, stepVisited]);

  const handleStepCheck = useCallback(() => {
    if (!currentQ || !isInteractivePracticeType(currentQ.type)) return;
    if (stepChecked[currentQ.id]?.checked) return;
    const correct = scorePracticeQuestion(currentQ, quizAnswers[currentQ.id]);
    setStepChecked((prev) => ({ ...prev, [currentQ.id]: { checked: true, correct } }));
    if (correct) {
      setFireworksBurstKey((k) => k + 1);
      const canAward =
        typeof onRecordStepExp === 'function' && Boolean(String(studentName || '').trim());
      if (canAward) {
        setLastStepExp(PRACTICE_STEP_CORRECT_EXP);
        void onRecordStepExp({
          questionId: currentQ.id,
          expPoints: PRACTICE_STEP_CORRECT_EXP,
        });
      } else {
        setLastStepExp(0);
      }
    } else {
      setLastStepExp(0);
    }
  }, [currentQ, quizAnswers, stepChecked, onRecordStepExp, studentName]);

  const goStep = (idx) => {
    if (idx < 0 || idx >= total) return;
    setLastStepExp(0);
    setStepIndex(idx);
  };

  const handleStepNext = () => {
    if (stepIndex < total - 1) goStep(stepIndex + 1);
    else {
      setStepFinished(true);
      // Chế độ từng câu: EXP đã cộng theo từng câu đúng → nộp tổng không cộng EXP lần nữa
      onSubmitQuiz({ skipExp: true });
    }
  };

  if (displayMode === 'step') {
    const isInteractive = currentQ && isInteractivePracticeType(currentQ.type);
    const canCheck = isInteractive && !currentChecked?.checked;
    const canNext = currentQ && (!isInteractive ? true : currentChecked?.checked);

    return (
      <div className="lesson-practice-stage">
        <ChuyenDeOnTapFireworks burstKey={fireworksBurstKey} />
        {total === 0 ? null : (
          <>
            {currentQ ? (
              <PracticeStageFrame
                banner={
                  currentChecked?.checked ? (
                    <PracticeStepFeedbackBanner
                      correct={currentChecked.correct}
                      index={stepIndex}
                      expGained={currentChecked.correct ? lastStepExp : 0}
                    />
                  ) : null
                }
                header={<PracticeQuestionHeader q={currentQ} index={stepIndex} />}
              >
                <PracticeQuestionBody
                  q={currentQ}
                  quizAnswers={quizAnswers}
                  onAnswerChange={onAnswerChange}
                  locked={Boolean(currentChecked?.checked)}
                  showResult={Boolean(currentChecked?.checked)}
                  practiceHintsOpen={practiceHintsOpen}
                  onToggleHint={onToggleHint}
                  highlightMcqResult={Boolean(currentChecked?.checked)}
                />
              </PracticeStageFrame>
            ) : null}

            <div className="lesson-practice-nav">
              {canCheck ? (
                <div className="lesson-practice-actions lesson-practice-actions--check-only">
                  <button type="button" onClick={handleStepCheck} className="lesson-practice-btn lesson-practice-btn--check">
                    <Target className="w-5 h-5" />
                    Kiểm tra đáp án
                  </button>
                </div>
              ) : null}

              <PracticeStepPager
                total={total}
                current={stepIndex}
                stepStates={stepStates}
                onSelect={goStep}
                onPrev={() => goStep(stepIndex - 1)}
                onNext={handleStepNext}
                canGoPrev={stepIndex > 0}
                canGoNext={Boolean(canNext)}
              />

              {stepFinished || quizSubmitted ? (
                <div className="lesson-practice-footer-wrap">
                  <PracticeListFooter
                    interactivePractice={interactivePractice}
                    quizSubmitted
                    quizScore={quizScore}
                    studentName={studentName}
                    onSubmit={onSubmitQuiz}
                    onReset={onResetQuiz}
                    stepModeExpHint
                  />
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="lesson-practice-stage">
      <div className="lesson-practice-frame">
        <PracticeFrameDecor />
        <div className="lesson-practice-scroll">
          {shuffledPractice.map((q, index) => (
            <div key={`${q.id}-${index}`} className="lesson-practice-list-item">
              <PracticeQuestionHeader q={q} index={index} />
              <div className="mt-3">
                <PracticeQuestionBody
                  q={q}
                  quizAnswers={quizAnswers}
                  onAnswerChange={onAnswerChange}
                  locked={quizSubmitted}
                  showResult={quizSubmitted && isInteractivePracticeType(q.type)}
                  practiceHintsOpen={practiceHintsOpen}
                  onToggleHint={onToggleHint}
                  highlightMcqResult={quizSubmitted}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="lesson-practice-nav lesson-practice-footer-wrap space-y-3">
        <PracticeListFooter
          interactivePractice={interactivePractice}
          quizSubmitted={quizSubmitted}
          quizScore={quizScore}
          studentName={studentName}
          onSubmit={onSubmitQuiz}
          onReset={onResetQuiz}
        />
      </div>
    </div>
  );
}
