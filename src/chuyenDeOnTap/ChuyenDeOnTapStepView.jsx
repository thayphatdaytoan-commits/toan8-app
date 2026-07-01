/* eslint-disable */
import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle, ChevronRight, Eye, EyeOff, Lightbulb, PenLine, RotateCcw, X, Zap } from 'lucide-react';
import { RichMathContent } from '../RichMathContent';
import { extractYouTubeID, buildYouTubeEmbedUrl } from '../youtubeUtils';
import { EXP_REVIEW_EXAMPLE_DONE, EXP_REVIEW_QUESTION_CORRECT } from './chuyenDeOnTapConstants';
import { ensureReviewAudioReady, playReviewFeedback } from './chuyenDeOnTapReviewSound';
import { shortAnswerIsCorrect } from './chuyenDeOnTapAnswerMatch';
import ChuyenDeOnTapKooBitsShell from './ChuyenDeOnTapKooBitsShell';
import ChuyenDeOnTapFireworks from './ChuyenDeOnTapFireworks';

const CORRECT_CELEBRATE_MSG = 'Tuyệt vời quá! Tiếp tục phát huy nhé';

function questionHasSolution(q) {
  if (!q) return false;
  if (!!String(q.explanation || '').trim()) return true;
  if (q.questionType !== 'trac_nghiem' && !!String(q.shortAnswer || '').trim()) return true;
  if (q.questionType === 'trac_nghiem' && (q.options || []).some((o) => o.correct)) return true;
  return false;
}

function CorrectAnswerPanel({ q, immersive = false }) {
  if (!q || !questionHasSolution(q)) return null;

  return (
    <div
      className={
        immersive
          ? 'mt-5 rounded-2xl border-[3px] border-[#22c55e] bg-gradient-to-b from-[#ecfdf5] to-[#d1fae5] p-5 sm:p-6 shadow-[0_8px_24px_rgba(34,197,94,0.2)]'
          : 'mt-4 rounded-2xl border-2 border-emerald-300 bg-gradient-to-b from-emerald-50 to-green-100 p-5 shadow-md'
      }
    >
      <p
        className={
          immersive
            ? 'text-center text-xl sm:text-2xl md:text-3xl font-black text-[#15803d] leading-snug mb-4 drop-shadow-sm'
            : 'text-center text-lg sm:text-xl font-black text-emerald-800 leading-snug mb-3'
        }
      >
        {CORRECT_CELEBRATE_MSG}
      </p>
      <div
        className={
          immersive
            ? 'rounded-xl border-2 border-green-200 bg-white/90 p-4 text-ontap-base sm:text-ontap-lg'
            : 'rounded-xl border border-green-200 bg-white/80 p-4 text-sm'
        }
      >
        <p className="font-black text-green-800 mb-2 uppercase text-ontap-sm tracking-wider">Đáp án &amp; lời giải</p>
        {!!String(q.explanation || '').trim() && (
          <RichMathContent text={q.explanation} className="text-slate-800 leading-relaxed" />
        )}
        {q.questionType === 'trac_nghiem' && (q.options || []).some((o) => o.correct) && (
          <div className={String(q.explanation || '').trim() ? 'mt-3 space-y-1' : 'space-y-1'}>
            <span className="font-bold text-green-900">Đáp án đúng: </span>
            {(q.options || [])
              .filter((o) => o.correct)
              .map((o) => (
                <p key={o.key} className="text-slate-800">
                  <strong>{o.key}.</strong>{' '}
                  <RichMathContent text={o.text || '—'} className="inline" />
                </p>
              ))}
          </div>
        )}
        {q.questionType !== 'trac_nghiem' && !!String(q.shortAnswer || '').trim() && (
          <p className={String(q.explanation || '').trim() ? 'mt-3' : ''}>
            <span className="font-bold text-green-900">Đáp án: </span>
            <RichMathContent text={q.shortAnswer} className="inline font-semibold text-green-800" />
          </p>
        )}
      </div>
    </div>
  );
}

function YouTubeEmbed({ url, title }) {
  const id = extractYouTubeID(url);
  if (!id) return null;
  const src = buildYouTubeEmbedUrl(id);
  return (
    <div className="rounded-2xl overflow-hidden border border-sky-200 bg-black aspect-video w-full shadow-sm">
      <iframe
        title={title || 'Video'}
        src={src}
        className="w-full h-full min-h-[180px]"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}

/**
 * Một màn hình = một bước (lý thuyết / ví dụ / câu hỏi / video / mở đầu).
 */
export default function ChuyenDeOnTapStepView({
  courseTitle = '',
  topicTitle = '',
  step,
  stepIndex = 0,
  totalSteps = 1,
  steps = [],
  completedStepIds = [],
  maxReachableIdx = 0,
  onGoToStep,
  onStepComplete,
  onClose,
  onPrev,
  onNext,
  variant = 'student',
  /** Khi đăng nhập: cộng EXP (Firestore) — idempotent theo refId + part */
  enableExp = false,
  onAwardExp,
  /** Toàn màn hình: chữ lớn, màu nổi (học sinh đang trong chủ đề). */
  immersive = false,
  /** Khôi phục trạng thái câu/bước từ Firestore */
  initialStepState = null,
  onStepStateChange,
}) {
  const progressPct = totalSteps > 0 ? Math.round(((stepIndex + 1) / totalSteps) * 100) : 0;

  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [fillAnswer, setFillAnswer] = useState('');
  const [mcqPick, setMcqPick] = useState(null);
  const [checked, setChecked] = useState(false);
  const [wasCorrect, setWasCorrect] = useState(false);
  /** Số lần bấm Kiểm tra mà trả lời sai (trên cùng một câu). */
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [showExampleAnswer, setShowExampleAnswer] = useState(false);
  const [exampleExpDone, setExampleExpDone] = useState(false);
  const questionExpAwardedRef = useRef(false);
  const [fireworksBurstKey, setFireworksBurstKey] = useState(0);

  const emitStepState = (patch) => {
    if (!onStepStateChange || !step?.id) return;
    onStepStateChange({
      checked,
      was_correct: wasCorrect,
      wrong_attempts: wrongAttempts,
      fill_answer: fillAnswer,
      mcq_pick: mcqPick == null ? '' : String(mcqPick),
      show_solution: showSolution,
      show_example_answer: showExampleAnswer,
      ...patch,
    });
  };

  useEffect(() => {
    const s = initialStepState || {};
    const isQ = step?.kind === 'question';
    const qq = isQ ? step.question : null;
    const hasSol = questionHasSolution(qq);
    const wasDone =
      !!s.was_correct || (isQ && step?.id && completedStepIds.includes(step.id));

    setShowHint(false);
    setFillAnswer(String(s.fill_answer ?? ''));
    setMcqPick(s.mcq_pick ? String(s.mcq_pick) : null);
    setWrongAttempts(Math.max(0, Number(s.wrong_attempts) || 0));
    setShowExampleAnswer(!!s.show_example_answer);

    if (wasDone && isQ) {
      setChecked(true);
      setWasCorrect(true);
      setShowSolution(hasSol || !!s.show_solution);
      setExampleExpDone(true);
      questionExpAwardedRef.current = true;
    } else {
      setShowSolution(!!s.show_solution);
      setChecked(!!s.checked);
      setWasCorrect(!!s.was_correct);
      setExampleExpDone(!!s.was_correct || completedStepIds.includes(step?.id));
      questionExpAwardedRef.current = !!s.was_correct;
    }
    // Chỉ khôi phục khi đổi bước — tránh ghi đè khi parent cập nhật step_states.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id]);

  if (!step) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 text-sm">
        Chưa có bước nào trong chủ đề này.
      </div>
    );
  }

  const q = step.kind === 'question' ? step.question : null;
  const ex = step.kind === 'example_item' ? step.example : null;
  const hasExampleAnswer = !!(ex && String(ex.answer || '').trim());

  const goCheck = async () => {
    if (!q) return;
    await ensureReviewAudioReady();
    let ok = false;
    if (q.questionType === 'trac_nghiem') {
      const right = (q.options || []).find((o) => o.correct);
      ok = !!(right && mcqPick === right.key);
    } else {
      ok = shortAnswerIsCorrect(fillAnswer, q.shortAnswer);
    }
    setWasCorrect(ok);
    setChecked(true);
    if (ok) {
      const showAns = questionHasSolution(q);
      setShowSolution(showAns);
      setFireworksBurstKey((k) => k + 1);
    } else {
      setWrongAttempts((n) => n + 1);
      setShowSolution(false);
    }
    const nextWrong = ok ? wrongAttempts : wrongAttempts + 1;
    emitStepState({
      checked: true,
      was_correct: ok,
      wrong_attempts: nextWrong,
      show_solution: ok ? questionHasSolution(q) : false,
    });
    void playReviewFeedback(ok ? 'correct' : 'wrong');
    if (ok && onStepComplete && step?.id) {
      onStepComplete(step.id);
    }
    if (
      ok &&
      enableExp &&
      variant === 'student' &&
      onAwardExp &&
      !questionExpAwardedRef.current
    ) {
      questionExpAwardedRef.current = true;
      try {
        await onAwardExp({
          expPoints: EXP_REVIEW_QUESTION_CORRECT,
          part: 'question',
          refId: String(q.id || step.id),
          label: String(q.label || 'Câu hỏi'),
        });
      } catch {
        /* ignore */
      }
    }
  };

  const handleRetryWrong = () => {
    setChecked(false);
    setWasCorrect(false);
    setShowSolution(false);
    setFillAnswer('');
    setMcqPick(null);
    setShowHint(false);
    emitStepState({
      checked: false,
      was_correct: false,
      show_solution: false,
      fill_answer: '',
      mcq_pick: '',
    });
  };

  const hasQuestionSolution = questionHasSolution(q);

  const canRevealAnswer = wrongAttempts >= 2 && checked && !wasCorrect && hasQuestionSolution;

  const handleExampleContinue = async () => {
    if (hasExampleAnswer && !showExampleAnswer) return;
    if (enableExp && variant === 'student' && onAwardExp && !exampleExpDone) {
      setExampleExpDone(true);
      try {
        await onAwardExp({
          expPoints: EXP_REVIEW_EXAMPLE_DONE,
          part: 'example',
          refId: String(ex?.id || step.id),
          label: String(ex?.label || step.title || 'Ví dụ'),
        });
      } catch {
        /* ignore */
      }
    }
    onNext?.();
  };

  const isQuestion = step.kind === 'question';
  const isExampleItem = step.kind === 'example_item';
  const isContent = ['intro', 'theory'].includes(step.kind);
  const isVideo = step.kind === 'video';

  const textMain = immersive
    ? 'text-slate-100 text-lg sm:text-xl font-bold leading-relaxed'
    : 'text-slate-900 text-base md:text-lg font-semibold leading-relaxed';
  const textQ = immersive
    ? 'text-white text-lg sm:text-xl font-extrabold leading-relaxed'
    : 'text-slate-900 text-base md:text-lg font-bold leading-relaxed';

  const videoHintUrl = isQuestion && q?.videoUrl ? q.videoUrl : '';

  if (immersive && variant === 'student') {
    const feedbackBanner =
      isQuestion && checked ? (
        <div
          className={`mx-5 sm:mx-8 -mt-1 mb-1 px-4 py-3 text-center text-ontap-base sm:text-ontap-lg font-black text-white ${
            wasCorrect ? 'bg-[#22c55e]' : 'bg-[#ef4444]'
          }`}
        >
          {wasCorrect ? '✓ Trả lời đúng!' : 'Rất tiếc, câu trả lời chưa đúng.'}
        </div>
      ) : null;

    const inputBorder =
      checked && wasCorrect
        ? 'border-[#22c55e] bg-green-50 ring-2 ring-green-200'
        : checked && !wasCorrect
          ? 'border-[#ef4444] bg-red-50 ring-2 ring-red-200'
          : 'border-slate-300 bg-white focus:border-[#3b9ec9] focus:ring-2 focus:ring-sky-200';

    return (
      <>
        <ChuyenDeOnTapFireworks burstKey={fireworksBurstKey} />
        <ChuyenDeOnTapKooBitsShell
        courseTitle={courseTitle}
        topicTitle={topicTitle}
        steps={steps}
        stepIndex={stepIndex}
        completedStepIds={completedStepIds}
        maxReachableIdx={maxReachableIdx}
        onClose={onClose}
        onGoToStep={onGoToStep}
        stepTitle={step.title}
        stepKind={step.kind}
        feedbackBanner={feedbackBanner}
        videoHintUrl={isQuestion && q?.videoUrl ? q.videoUrl : ''}
        footerLeft={
          isQuestion && canRevealAnswer ? (
            <button
              type="button"
              onClick={() => {
                const next = !showSolution;
                setShowSolution(next);
                emitStepState({ show_solution: next });
              }}
              className="text-ontap-base font-bold text-slate-600 hover:text-[#3b9ec9] underline underline-offset-2"
            >
              {showSolution ? 'Ẩn đáp án' : 'Xem đáp án'}
            </button>
          ) : null
        }
        footerCenter={
          isQuestion && checked && !wasCorrect ? (
            <button
              type="button"
              onClick={handleRetryWrong}
              className="px-10 sm:px-14 py-3.5 rounded-full bg-gradient-to-b from-[#fb923c] to-[#ea580c] text-white font-black text-ontap-base sm:text-ontap-lg shadow-[0_4px_0_#c2410c] hover:brightness-105 active:translate-y-0.5 active:shadow-none transition-all"
            >
              Làm lại
            </button>
          ) : isExampleItem ? (
            <button
              type="button"
              onClick={handleExampleContinue}
              disabled={hasExampleAnswer && !showExampleAnswer}
              className="px-10 py-3.5 rounded-full bg-gradient-to-b from-[#fb923c] to-[#ea580c] text-white font-black text-ontap-base shadow-[0_4px_0_#c2410c] disabled:opacity-45 disabled:shadow-none"
            >
              Đã hiểu — tiếp tục
            </button>
          ) : !isQuestion ? (
            <button
              type="button"
              onClick={onNext}
              className="px-10 py-3.5 rounded-full bg-gradient-to-b from-[#3b9ec9] to-[#2563eb] text-white font-black text-ontap-base shadow-[0_4px_0_#1d4ed8]"
            >
              {stepIndex >= totalSteps - 1 ? 'Hoàn thành' : 'Tiếp tục'}
            </button>
          ) : null
        }
        footerRight={
          isQuestion ? (
            <button
              type="button"
              onClick={onNext}
              disabled={!checked || !wasCorrect}
              className={`inline-flex items-center gap-1 text-ontap-base font-bold ${
                checked && wasCorrect
                  ? 'text-[#2563eb] hover:underline'
                  : 'text-slate-400 cursor-not-allowed'
              }`}
            >
              Câu tiếp theo
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : null
        }
      >
        {(isContent || isVideo) && (
          <div className="text-slate-800 text-ontap-lg sm:text-ontap-xl leading-relaxed font-semibold">
            {isVideo && step.videoUrl && <YouTubeEmbed url={step.videoUrl} title={step.title} />}
            {(isContent || (isVideo && !step.videoUrl)) && step.body && (
              <RichMathContent text={step.body} className="text-slate-800 text-ontap-lg sm:text-ontap-xl leading-relaxed" />
            )}
          </div>
        )}

        {isExampleItem && ex && (
          <>
            <RichMathContent text={ex.stem || '—'} className="font-display text-slate-900 text-ontap-xl sm:text-ontap-2xl font-bold leading-relaxed" />
            {ex.hint && (
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="inline-flex items-center gap-2 text-sm font-bold text-[#ea580c]"
              >
                <Lightbulb className="w-4 h-4" /> {showHint ? 'Ẩn gợi ý' : 'Cần gợi ý?'}
              </button>
            )}
            {showHint && ex.hint && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm">
                <RichMathContent text={ex.hint} />
              </div>
            )}
            {hasExampleAnswer && (
              <button
                type="button"
                onClick={() => {
                  const next = !showExampleAnswer;
                  setShowExampleAnswer(next);
                  emitStepState({ show_example_answer: next });
                }}
                className="text-sm font-bold text-[#2563eb] underline"
              >
                {showExampleAnswer ? 'Ẩn lời giải' : 'Hiện lời giải'}
              </button>
            )}
            {showExampleAnswer && ex.answer && (
              <div className="p-4 rounded-xl border-2 border-green-200 bg-green-50">
                <RichMathContent text={ex.answer} className="text-sm" />
              </div>
            )}
          </>
        )}

        {isQuestion && q && (
          <>
            <RichMathContent text={q.stem || '—'} className="font-display text-slate-900 text-ontap-xl sm:text-ontap-2xl font-bold leading-relaxed mb-4" />

            {q.questionType === 'trac_nghiem' && (
              <div className="space-y-2">
                {(q.options || []).map((o) => {
                  const picked = mcqPick === o.key;
                  const showResult = checked && picked;
                  return (
                    <label
                      key={o.key}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-colors ${
                        showResult && wasCorrect
                          ? 'border-[#22c55e] bg-green-50'
                          : showResult && !wasCorrect
                            ? 'border-[#ef4444] bg-red-50'
                            : picked
                              ? 'border-[#3b9ec9] bg-sky-50'
                              : 'border-slate-200 bg-white hover:border-sky-300'
                      }`}
                    >
                      <input
                        type="radio"
                        className="mt-1 accent-sky-600"
                        name={`mcq-kb-${step.id}`}
                        checked={picked}
                        onChange={() => {
                          setMcqPick(o.key);
                          setChecked(false);
                          setShowSolution(false);
                          emitStepState({
                            mcq_pick: o.key,
                            checked: false,
                            show_solution: false,
                          });
                        }}
                      />
                      <span className="text-ontap-base flex-1">
                        <strong className="mr-2">{o.key}.</strong>
                        <RichMathContent text={o.text} className="inline-block align-top text-ontap-base" />
                      </span>
                      {showResult && (
                        <span className={`text-lg font-black ${wasCorrect ? 'text-green-600' : 'text-red-500'}`}>
                          {wasCorrect ? '✓' : '✗'}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}

            {q.questionType !== 'trac_nghiem' && (
              <div className="relative max-w-md">
                <PenLine className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={fillAnswer}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFillAnswer(v);
                    setChecked(false);
                    setShowSolution(false);
                    emitStepState({
                      fill_answer: v,
                      checked: false,
                      show_solution: false,
                    });
                  }}
                  className={`w-full pl-11 pr-12 py-3.5 rounded-xl border-2 text-ontap-lg font-semibold outline-none transition-colors ${inputBorder}`}
                  placeholder="Nhập đáp án..."
                  autoComplete="off"
                />
                {checked && (
                  <span
                    className={`absolute right-4 top-1/2 -translate-y-1/2 text-xl font-black ${
                      wasCorrect ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    {wasCorrect ? '✓' : '✗'}
                  </span>
                )}
              </div>
            )}

            {q.hint && (
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="inline-flex items-center gap-2 text-sm font-bold text-[#ea580c]"
              >
                <Lightbulb className="w-4 h-4" /> {showHint ? 'Ẩn gợi ý' : 'Cần gợi ý?'}
              </button>
            )}
            {showHint && q.hint && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm">
                <RichMathContent text={q.hint} />
              </div>
            )}

            {!checked && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={goCheck}
                  className="px-12 py-3 rounded-full bg-gradient-to-b from-[#38bdf8] to-[#0284c7] text-white font-black text-base shadow-[0_4px_0_#0369a1] hover:brightness-105"
                >
                  Kiểm tra
                </button>
              </div>
            )}

            {checked && wasCorrect && <CorrectAnswerPanel q={q} immersive />}

            {checked && !wasCorrect && wrongAttempts === 1 && (
              <p className="text-center text-xs text-slate-500">Sai lần nữa sẽ có nút xem đáp án ở dưới.</p>
            )}

            {showSolution && hasQuestionSolution && !wasCorrect && (
              <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 text-sm">
                <p className="font-black text-green-800 mb-2 uppercase text-xs">Lời giải</p>
                {!!String(q.explanation || '').trim() && <RichMathContent text={q.explanation} />}
                {q.questionType !== 'trac_nghiem' && !!String(q.shortAnswer || '').trim() && (
                  <p className="mt-2">
                    <span className="font-bold">Đáp án:</span>{' '}
                    <RichMathContent text={q.shortAnswer} className="inline" />
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </ChuyenDeOnTapKooBitsShell>
      </>
    );
  }

  return (
    <>
      <ChuyenDeOnTapFireworks burstKey={fireworksBurstKey} />
      <div
      className={
        immersive
          ? 'flex flex-col min-h-[min(100dvh,100%)] w-full max-w-3xl mx-auto flex-1 rounded-3xl border border-violet-400/35 shadow-[0_0_48px_rgba(139,92,246,0.25)] overflow-hidden bg-gradient-to-b from-slate-900/95 via-indigo-950/98 to-violet-950/95'
          : 'flex flex-col min-h-[420px] max-w-lg mx-auto w-full bg-slate-50/90 rounded-[1.75rem] border border-slate-200/80 shadow-lg overflow-hidden'
      }
    >
      {/* Header — X, progress, lightning */}
      <header
        className={
          immersive
            ? 'flex items-center gap-3 px-4 sm:px-6 py-4 bg-violet-950/80 border-b border-fuchsia-500/30 shrink-0'
            : 'flex items-center gap-3 px-4 py-3.5 bg-white border-b border-slate-100 shrink-0'
        }
      >
        <button
          type="button"
          onClick={onClose}
          className={
            immersive
              ? 'w-11 h-11 rounded-full flex items-center justify-center text-fuchsia-100 hover:bg-white/10 hover:text-white transition-colors'
              : 'w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors'
          }
          aria-label="Đóng"
        >
          <X className="w-5 h-5" strokeWidth={2.25} />
        </button>
        <div className="flex-1 min-w-0">
          <div className={immersive ? 'h-2.5 bg-slate-700 rounded-full overflow-hidden' : 'h-2 bg-slate-200 rounded-full overflow-hidden'}>
            <div
              className={
                immersive
                  ? 'h-full bg-gradient-to-r from-amber-400 via-fuchsia-500 to-cyan-400 rounded-full transition-[width] duration-300 ease-out'
                  : 'h-full bg-emerald-500 rounded-full transition-[width] duration-300 ease-out'
              }
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p
            className={
              immersive
                ? 'text-xs font-bold text-fuchsia-200/90 mt-1.5 text-center truncate'
                : 'text-xs font-bold text-slate-400 mt-1 text-center truncate'
            }
          >
            {courseTitle && <span className={immersive ? 'text-cyan-100' : 'text-slate-500'}>{courseTitle}</span>}
            {courseTitle && topicTitle && ' · '}
            {topicTitle}
          </p>
        </div>
        <div
          className={
            immersive
              ? 'w-11 h-11 rounded-full bg-amber-400/20 flex items-center justify-center shrink-0 border border-amber-300/50'
              : 'w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100'
          }
        >
          <Zap className={immersive ? 'w-6 h-6 text-amber-300 fill-amber-200/40' : 'w-5 h-5 text-amber-500 fill-amber-400/30'} />
        </div>
      </header>

      {/* Step label */}
      <div className={immersive ? 'px-4 sm:px-6 pt-4 pb-2' : 'px-4 pt-3 pb-1'}>
        <p
          className={
            immersive
              ? 'text-sm font-black uppercase tracking-widest text-cyan-300'
              : 'text-xs font-black uppercase tracking-widest text-sky-700/90'
          }
        >
          {step.title}
          <span className={immersive ? 'text-fuchsia-200/80 font-bold normal-case ml-2' : 'text-slate-400 font-bold normal-case ml-2'}>
            ({stepIndex + 1}/{totalSteps})
          </span>
        </p>
      </div>

      <div className={`flex-1 overflow-y-auto space-y-4 ${immersive ? 'px-4 sm:px-6 pb-6' : 'px-4 pb-4'}`}>
        {/* Main sky card */}
        <div
          className={
            immersive
              ? 'rounded-3xl bg-white/10 border border-cyan-400/25 p-5 sm:p-6 shadow-inner backdrop-blur-sm'
              : 'rounded-3xl bg-sky-50 border border-sky-100/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]'
          }
        >
          {(isContent || isVideo) && (
            <>
              {isVideo && step.videoUrl && <YouTubeEmbed url={step.videoUrl} title={step.title} />}
              {(isContent || (isVideo && !step.videoUrl)) && step.body && (
                <RichMathContent text={step.body} className={textMain} />
              )}
              {isVideo && !step.videoUrl && !step.body && (
                <p className={immersive ? 'text-base text-fuchsia-200' : 'text-sm text-slate-500'}>Chưa có URL video.</p>
              )}
            </>
          )}

          {isQuestion && q && (
            <>
              <RichMathContent text={q.stem || '—'} className={textQ} />
              {q.videoUrl && (
                <div className="mt-4">
                  <YouTubeEmbed url={q.videoUrl} title="Video bài" />
                </div>
              )}
            </>
          )}

          {isExampleItem && ex && <RichMathContent text={ex.stem || '—'} className={textQ} />}
        </div>

        {isExampleItem && ex?.hint && (
          <div>
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              className={
                immersive
                  ? 'inline-flex items-center gap-2 text-base font-bold text-amber-300 hover:text-amber-200'
                  : 'inline-flex items-center gap-2 text-sm font-bold text-amber-600 hover:text-amber-700'
              }
            >
              <Lightbulb className="w-4 h-4 shrink-0" />
              {showHint ? 'Ẩn gợi ý' : 'Cần gợi ý?'}
            </button>
            {showHint && (
              <div
                className={
                  immersive
                    ? 'mt-2 p-4 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-base'
                    : 'mt-2 p-4 rounded-2xl bg-amber-50 border border-amber-100 text-sm'
                }
              >
                <RichMathContent text={ex.hint} className={immersive ? 'text-amber-50' : 'text-slate-800'} />
              </div>
            )}
          </div>
        )}

        {isExampleItem && ex && hasExampleAnswer && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                const next = !showExampleAnswer;
                setShowExampleAnswer(next);
                emitStepState({ show_example_answer: next });
              }}
              className={
                immersive
                  ? 'inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-cyan-400/50 bg-cyan-500/20 text-base font-bold text-cyan-100 hover:bg-cyan-500/30 shadow-lg'
                  : 'inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm'
              }
            >
              {showExampleAnswer ? (
                <>
                  <EyeOff className="w-4 h-4" /> Ẩn đáp án
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" /> Hiện đáp án
                </>
              )}
            </button>
            {showExampleAnswer && (
              <div
                className={
                  immersive
                    ? 'rounded-2xl border border-emerald-400/40 bg-emerald-950/50 p-4 shadow-lg'
                    : 'rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm'
                }
              >
                <p
                  className={
                    immersive
                      ? 'text-xs font-black text-emerald-300 mb-2 uppercase tracking-wider'
                      : 'text-xs font-black text-emerald-800 mb-2 uppercase tracking-wider'
                  }
                >
                  Đáp án
                </p>
                <RichMathContent
                  text={ex.answer}
                  className={immersive ? 'text-emerald-50 text-base leading-relaxed' : 'text-slate-800 text-sm leading-relaxed'}
                />
              </div>
            )}
          </div>
        )}
        {isExampleItem && ex && hasExampleAnswer && !showExampleAnswer && (
          <p className={immersive ? 'text-sm text-fuchsia-200/90 px-0.5' : 'text-xs text-slate-500 px-0.5'}>
            Hãy bấm <strong>Hiện đáp án</strong> để xem lời giải, sau đó mới có thể tiếp tục (và nhận EXP khi đã đăng nhập).
          </p>
        )}

        {/* Question: MCQ */}
        {isQuestion && q && q.questionType === 'trac_nghiem' && (
          <div className="space-y-2">
            {(q.options || []).map((o) => (
              <label
                key={o.key}
                className={
                  immersive
                    ? `flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${
                        mcqPick === o.key
                          ? 'border-fuchsia-400 ring-2 ring-fuchsia-500/40 bg-fuchsia-500/15'
                          : 'border-white/20 bg-white/5 hover:bg-white/10'
                      }`
                    : `flex items-start gap-3 p-3.5 rounded-2xl border bg-white cursor-pointer transition-colors ${
                        mcqPick === o.key ? 'border-sky-500 ring-1 ring-sky-200 bg-sky-50/50' : 'border-slate-200 hover:bg-white'
                      }`
                }
              >
                <input
                  type="radio"
                  className={immersive ? 'mt-1 accent-fuchsia-500' : 'mt-1 accent-sky-600'}
                  name={`mcq-${step.id}`}
                  checked={mcqPick === o.key}
                  onChange={() => {
                    setMcqPick(o.key);
                    setChecked(false);
                    setShowSolution(false);
                    emitStepState({
                      mcq_pick: o.key,
                      checked: false,
                      show_solution: false,
                    });
                  }}
                />
                <span className={immersive ? 'text-base flex-1 min-w-0 pt-0.5 text-slate-100' : 'text-sm flex-1 min-w-0 pt-0.5'}>
                  <strong className={immersive ? 'text-cyan-200 mr-2' : 'text-slate-700 mr-2'}>{o.key}.</strong>
                  <RichMathContent
                    text={o.text}
                    className={
                      immersive ? 'text-slate-100 text-base inline-block align-top' : 'text-slate-800 text-sm inline-block align-top'
                    }
                  />
                </span>
              </label>
            ))}
          </div>
        )}

        {/* Question: short answer input — giống ảnh mẫu */}
        {isQuestion && q && q.questionType !== 'trac_nghiem' && (
          <div className="relative">
            <PenLine
              className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${immersive ? 'text-cyan-300/80' : 'text-slate-400'}`}
            />
            <input
              value={fillAnswer}
              onChange={(e) => {
                const v = e.target.value;
                setFillAnswer(v);
                setChecked(false);
                setShowSolution(false);
                emitStepState({
                  fill_answer: v,
                  checked: false,
                  show_solution: false,
                });
              }}
              className={
                immersive
                  ? 'w-full pl-11 pr-4 py-4 rounded-2xl border border-cyan-400/35 bg-slate-900/60 text-lg text-white placeholder:text-fuchsia-200/50 shadow-inner focus:outline-none focus:ring-2 focus:ring-fuchsia-400/50 focus:border-fuchsia-400/60'
                  : 'w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400/60 focus:border-sky-300'
              }
              placeholder="Nhập câu trả lời của bạn..."
              autoComplete="off"
            />
          </div>
        )}

        {/* Hint link — cam, dưới ô nhập */}
        {isQuestion && q && q.hint && (
          <div>
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              className={
                immersive
                  ? 'inline-flex items-center gap-2 text-base font-bold text-amber-300 hover:text-amber-200'
                  : 'inline-flex items-center gap-2 text-sm font-bold text-amber-600 hover:text-amber-700'
              }
            >
              <Lightbulb className="w-4 h-4 shrink-0" />
              {showHint ? 'Ẩn gợi ý' : 'Cần gợi ý?'}
            </button>
            {showHint && (
              <div
                className={
                  immersive
                    ? 'mt-2 p-4 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-base'
                    : 'mt-2 p-4 rounded-2xl bg-amber-50 border border-amber-100 text-sm'
                }
              >
                <RichMathContent text={q.hint} className={immersive ? 'text-amber-50' : 'text-slate-800'} />
              </div>
            )}
          </div>
        )}

        {isQuestion && q && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={goCheck}
              className={
                immersive
                  ? 'px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white font-black text-base hover:brightness-110 shadow-lg'
                  : 'px-6 py-3 rounded-2xl bg-sky-600 text-white font-bold text-sm hover:bg-sky-700 shadow-sm'
              }
            >
              Kiểm tra
            </button>
            {checked && (
              <span
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold ${
                  immersive ? 'text-base' : 'text-sm'
                } ${
                  wasCorrect
                    ? immersive
                      ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40'
                      : 'bg-emerald-100 text-emerald-800'
                    : immersive
                      ? 'bg-rose-500/25 text-rose-200 border border-rose-400/40'
                      : 'bg-rose-100 text-rose-800'
                }`}
              >
                <CheckCircle className="w-4 h-4 shrink-0" />
                {wasCorrect ? 'Đúng!' : 'Chưa đúng'}
              </span>
            )}
          </div>
        )}

        {isQuestion && q && checked && wasCorrect && variant === 'student' && (
          <CorrectAnswerPanel q={q} immersive={immersive} />
        )}

        {isQuestion && q && checked && !wasCorrect && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRetryWrong}
              className={
                immersive
                  ? 'inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-rose-400/50 bg-rose-500/20 text-rose-100 font-bold text-base hover:bg-rose-500/30'
                  : 'inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-rose-200 bg-rose-50 text-rose-800 font-bold text-sm hover:bg-rose-100'
              }
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              Làm lại
            </button>
            {canRevealAnswer && (
              <button
                type="button"
                onClick={() => {
                const next = !showSolution;
                setShowSolution(next);
                emitStepState({ show_solution: next });
              }}
                className={
                  immersive
                    ? 'inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-amber-400/50 bg-amber-500/20 text-amber-100 font-bold text-base hover:bg-amber-500/30'
                    : 'inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 font-bold text-sm hover:bg-amber-100'
                }
              >
                {showSolution ? (
                  <>
                    <EyeOff className="w-4 h-4 shrink-0" /> Ẩn đáp án
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 shrink-0" /> Xem đáp án
                  </>
                )}
              </button>
            )}
            {checked && !wasCorrect && wrongAttempts === 1 && variant === 'student' && (
              <p className={immersive ? 'text-sm text-fuchsia-200/80 w-full' : 'text-xs text-slate-500 w-full'}>
                Sai lần nữa sẽ có nút xem đáp án.
              </p>
            )}
          </div>
        )}

        {isQuestion && q && showSolution && hasQuestionSolution && !wasCorrect && (
          <div
            className={
              immersive
                ? 'rounded-2xl border border-emerald-400/35 bg-emerald-950/40 p-4 sm:p-5'
                : 'rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4'
            }
          >
            <p
              className={
                immersive
                  ? 'text-xs font-black text-emerald-300 mb-2 uppercase tracking-wider'
                  : 'text-xs font-black text-emerald-800 mb-2 uppercase tracking-wider'
              }
            >
              Lời giải
            </p>
            {!!String(q.explanation || '').trim() && (
              <RichMathContent
                text={q.explanation}
                className={immersive ? 'text-emerald-50 text-base leading-relaxed' : 'text-slate-800 text-sm leading-relaxed'}
              />
            )}
            {q.questionType !== 'trac_nghiem' && !!String(q.shortAnswer || '').trim() && (
              <p className={immersive ? 'mt-3 text-sm text-emerald-100/90' : 'mt-3 text-xs text-slate-600'}>
                <span className="font-bold">Đáp án:</span>{' '}
                <RichMathContent text={q.shortAnswer} className="inline" />
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer nav — Trước | Tiếp tục (giữa) | Sau */}
      <footer
        className={
          immersive
            ? 'px-4 sm:px-6 py-4 bg-violet-950/90 border-t border-fuchsia-500/25 grid grid-cols-3 items-center gap-2 shrink-0'
            : 'px-4 py-3 bg-white border-t border-slate-100 grid grid-cols-3 items-center gap-2 shrink-0'
        }
      >
        <button
          type="button"
          onClick={onPrev}
          className={
            immersive
              ? 'text-base font-bold text-fuchsia-200 hover:text-white px-2 py-2 rounded-xl hover:bg-white/10 justify-self-start'
              : 'text-sm font-bold text-slate-500 hover:text-slate-800 px-2 py-2 rounded-xl hover:bg-slate-50 justify-self-start'
          }
        >
          ← Trước
        </button>
        <div className="flex justify-center min-w-0">
          {isExampleItem && (
            <button
              type="button"
              onClick={handleExampleContinue}
              disabled={hasExampleAnswer && !showExampleAnswer}
              title={hasExampleAnswer && !showExampleAnswer ? 'Cần hiện đáp án trước' : ''}
              className={
                immersive
                  ? 'w-full max-w-[min(100%,320px)] py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-base hover:brightness-110 shadow-lg disabled:opacity-45 disabled:cursor-not-allowed'
                  : 'w-full max-w-[280px] py-3.5 rounded-2xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-sm disabled:opacity-45 disabled:cursor-not-allowed'
              }
            >
              Đã hiểu và tiếp tục
            </button>
          )}
          {!isQuestion && !isExampleItem && (
            <button
              type="button"
              onClick={onNext}
              className={
                immersive
                  ? 'w-full max-w-[min(100%,280px)] py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-black text-base hover:brightness-110 shadow-lg'
                  : 'w-full max-w-[220px] py-3 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 shadow-sm'
              }
            >
              {stepIndex >= totalSteps - 1 ? 'Hoàn thành' : 'Tiếp tục'}
            </button>
          )}
        </div>
        {isQuestion ? (
          <button
            type="button"
            onClick={onNext}
            disabled={variant === 'student' && (!checked || !wasCorrect)}
            title={
              variant === 'student' && (!checked || !wasCorrect)
                ? 'Cần trả lời đúng mới sang câu sau'
                : undefined
            }
            className={
              variant === 'student' && (!checked || !wasCorrect)
                ? immersive
                  ? 'text-base font-bold text-slate-500 px-2 py-2 rounded-xl justify-self-end cursor-not-allowed opacity-45'
                  : 'text-sm font-bold text-slate-400 px-2 py-2 rounded-xl justify-self-end cursor-not-allowed opacity-45'
                : immersive
                  ? 'text-base font-bold text-cyan-300 hover:text-cyan-100 px-2 py-2 rounded-xl hover:bg-white/10 justify-self-end'
                  : 'text-sm font-bold text-sky-600 hover:text-sky-800 px-2 py-2 rounded-xl hover:bg-sky-50 justify-self-end'
            }
          >
            {stepIndex >= totalSteps - 1 ? 'Xong →' : 'Sau →'}
          </button>
        ) : (
          <span className="justify-self-end w-8" aria-hidden />
        )}
      </footer>
      {variant === 'preview' && (
        <p className={immersive ? 'text-xs text-fuchsia-200/70 text-center px-4 pb-2' : 'text-xs text-slate-400 text-center px-4 pb-2 bg-white'}>
          Chế độ xem trước — giống học sinh
        </p>
      )}
    </div>
    </>
  );
}
