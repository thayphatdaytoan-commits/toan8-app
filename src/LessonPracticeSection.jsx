import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, ChevronLeft, ChevronRight, Lightbulb, Target } from 'lucide-react';
import { TextWithMath, TextWithMathWithLoiGiai } from './Math11Template';
import PracticeAnswerInput from './PracticeAnswerInput';
import {
  PracticeTrueFalse,
  PracticeTrueFalseResult,
  PracticeOrdering,
  PracticeOrderingResult,
  PracticeDragDrop,
  PracticeDragDropResult,
  PracticeFillBlanks,
  PracticeFillBlanksResult,
} from './PracticeInteractiveQuestions';
import { isInteractivePracticeType, scorePracticeQuestion } from './practiceQuestionTypes';

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
    <div className="mt-5 rounded-xl border border-slate-200 bg-indigo-50/30 px-5 py-5 md:px-6 md:py-6">
      <p className="text-xs font-bold uppercase tracking-widest text-indigo-800 mb-3 flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0" />
        Đáp án và lời giải
      </p>
      {q.type === 'mcq' && Array.isArray(q.options) && q.correctAnswer != null ? (
        <div className="text-slate-800 font-semibold mb-2">
          <span className="text-teal-700">Đáp án đúng: </span>
          <span className="font-black text-emerald-800">{String.fromCharCode(65 + Number(q.correctAnswer))}.</span>{' '}
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
      {q.type === 'true_false' ? (
        <div className="text-slate-800 font-semibold mb-2">
          <span className="text-teal-700">Đáp án đúng: </span>
          <PracticeTrueFalseResult q={q} />
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
        <div className="mt-3 pt-3 border-t border-teal-200/80 text-slate-700 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
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

function PracticeQuestionCard({
  q,
  index,
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
    <div className="p-6 md:p-7 rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <h4 className="font-bold text-slate-800 mb-4 flex gap-3 flex-wrap items-start text-base md:text-lg leading-relaxed">
        <span className="text-indigo-600 shrink-0">Câu {index + 1}:</span>
        {q.type === 'text' ? (
          <span className="text-left font-normal text-slate-800 min-w-0 flex-1">
            <TextWithMathWithLoiGiai text={q.question || ''} />
          </span>
        ) : q.type === 'fill_blanks' && !(q.question || '').trim() ? (
          <span className="min-w-0 flex-1 text-left font-normal text-slate-700">
            Điền các chỗ trống trong đoạn văn dưới đây.
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
            let btnClass = 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 bg-white';
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
        <PracticeHintPanel hint={q.hint} open={Boolean(practiceHintsOpen[q.id])} onToggle={() => onToggleHint(q.id)} />
      ) : null}
      {showResult && isInteractive ? <PracticeAnswerResult q={q} /> : null}
    </div>
  );
}

function PracticeStepDots({ total, current, stepStates, onSelect }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 md:gap-2.5 pt-2">
      {Array.from({ length: total }, (_, i) => {
        const st = stepStates[i];
        const isCurrent = i === current;
        let cls =
          'w-10 h-10 md:w-11 md:h-11 rounded-full text-sm font-black border-2 transition-all flex items-center justify-center';
        if (isCurrent) cls += ' bg-indigo-600 border-indigo-500 text-white scale-110 shadow-md shadow-indigo-300/40';
        else if (st?.checked && st.correct) cls += ' bg-emerald-500 border-emerald-400 text-white';
        else if (st?.checked && !st.correct) cls += ' bg-rose-500 border-rose-400 text-white';
        else if (st?.visited) cls += ' bg-white border-slate-300 text-slate-600 hover:border-indigo-300';
        else cls += ' bg-slate-100 border-slate-200 text-slate-400 hover:border-slate-300';
        return (
          <button key={i} type="button" onClick={() => onSelect(i)} className={cls} aria-label={`Câu ${i + 1}`}>
            {i + 1}
          </button>
        );
      })}
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
          className="bg-indigo-600 text-white px-8 py-3.5 rounded-full font-black text-sm md:text-base hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 inline-flex items-center gap-2 min-w-[220px] justify-center"
        >
          <Target className="w-5 h-5 shrink-0" />
          Nộp bài — xem đáp án
        </button>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Chỉ sau khi <strong className="text-slate-700">nộp bài</strong> mới hiện đáp án đúng và lời giải phía dưới từng câu.
        </p>
      </>
    );
  }
  return (
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
        <p className="text-xs text-slate-500 mb-4">Đăng nhập bằng tên trong lớp để lưu điểm, EXP và thanh tiến trình.</p>
      )}
      <button
        type="button"
        onClick={onReset}
        className="bg-white border-2 border-slate-200 text-slate-600 px-5 py-2 rounded-xl font-bold hover:bg-slate-100 transition-colors text-sm"
      >
        Làm lại (đổi thứ tự câu và đáp án)
      </button>
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
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [stepChecked, setStepChecked] = useState({});
  const [stepVisited, setStepVisited] = useState({ 0: true });
  const [stepFinished, setStepFinished] = useState(false);

  const total = shuffledPractice.length;
  const currentQ = shuffledPractice[stepIndex] || null;
  const currentChecked = currentQ ? stepChecked[currentQ.id] : null;

  useEffect(() => {
    setStepIndex(0);
    setStepChecked({});
    setStepVisited({ 0: true });
    setStepFinished(false);
  }, [resetKey]);

  useEffect(() => {
    setStepVisited((prev) => ({ ...prev, [stepIndex]: true }));
  }, [stepIndex]);

  const stepStates = useMemo(() => {
    return shuffledPractice.map((q, i) => ({
      checked: Boolean(stepChecked[q.id]?.checked),
      correct: Boolean(stepChecked[q.id]?.correct),
      visited: Boolean(stepVisited[i]),
    }));
  }, [shuffledPractice, stepChecked, stepVisited]);

  const handleStepCheck = useCallback(() => {
    if (!currentQ || !isInteractivePracticeType(currentQ.type)) return;
    const correct = scorePracticeQuestion(currentQ, quizAnswers[currentQ.id]);
    setStepChecked((prev) => ({ ...prev, [currentQ.id]: { checked: true, correct } }));
  }, [currentQ, quizAnswers]);

  const goStep = (idx) => {
    if (idx < 0 || idx >= total) return;
    setStepIndex(idx);
  };

  const handleStepNext = () => {
    if (stepIndex < total - 1) goStep(stepIndex + 1);
    else {
      setStepFinished(true);
      onSubmitQuiz();
    }
  };

  if (displayMode === 'step') {
    const isInteractive = currentQ && isInteractivePracticeType(currentQ.type);
    const canCheck = isInteractive && !currentChecked?.checked;
    const canNext = currentQ && (!isInteractive ? true : currentChecked?.checked);

    return (
      <div className="w-full max-w-none">
        {total === 0 ? null : (
          <>
            {currentQ ? (
              <PracticeQuestionCard
                q={currentQ}
                index={stepIndex}
                quizAnswers={quizAnswers}
                onAnswerChange={onAnswerChange}
                locked={Boolean(currentChecked?.checked)}
                showResult={Boolean(currentChecked?.checked)}
                practiceHintsOpen={practiceHintsOpen}
                onToggleHint={onToggleHint}
                highlightMcqResult={Boolean(currentChecked?.checked)}
              />
            ) : null}

            {currentChecked?.checked ? (
              <div
                className={`mt-4 rounded-2xl px-5 py-4 border-2 text-center font-bold text-base md:text-lg ${
                  currentChecked.correct
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {getFeedbackMessage(currentChecked.correct, stepIndex)}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col items-center gap-4 border-t border-slate-100 pt-6">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => goStep(stepIndex - 1)}
                  disabled={stepIndex <= 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-slate-600 font-bold text-sm disabled:opacity-40 hover:bg-slate-50"
                >
                  <ChevronLeft className="w-4 h-4" /> Câu trước
                </button>
                {canCheck ? (
                  <button
                    type="button"
                    onClick={handleStepCheck}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-indigo-600 text-white font-black text-sm md:text-base hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
                  >
                    <Target className="w-5 h-5" />
                    Kiểm tra đáp án
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleStepNext}
                  disabled={!canNext}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-teal-500 bg-teal-600 text-white font-bold text-sm disabled:opacity-40 hover:bg-teal-700"
                >
                  {stepIndex >= total - 1 ? 'Hoàn thành' : 'Câu tiếp theo'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <PracticeStepDots total={total} current={stepIndex} stepStates={stepStates} onSelect={goStep} />

              {stepFinished || quizSubmitted ? (
                <PracticeListFooter
                  interactivePractice={interactivePractice}
                  quizSubmitted
                  quizScore={quizScore}
                  studentName={studentName}
                  onSubmit={onSubmitQuiz}
                  onReset={onResetQuiz}
                />
              ) : null}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-none">
      <div className="space-y-6 md:space-y-8">
        {shuffledPractice.map((q, index) => (
          <PracticeQuestionCard
            key={`${q.id}-${index}`}
            q={q}
            index={index}
            quizAnswers={quizAnswers}
            onAnswerChange={onAnswerChange}
            locked={quizSubmitted}
            showResult={quizSubmitted && isInteractivePracticeType(q.type)}
            practiceHintsOpen={practiceHintsOpen}
            onToggleHint={onToggleHint}
            highlightMcqResult={quizSubmitted}
          />
        ))}
      </div>
      <div className="mt-8 text-center border-t border-slate-100 pt-6 space-y-4">
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
