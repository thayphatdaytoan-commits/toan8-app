import React, { useMemo, useRef, useState } from 'react';
import { Sigma } from 'lucide-react';
import {
  normalizeInputAnswerParts,
  resolveInputPartValues,
} from './practiceQuestionTypes';

const MATH_KEYS = ['(', ')', ';', '/', '²', '√', 'π', 'x', 'y', '-'];

function inferSinglePlaceholder(q, part) {
  const custom = (part?.placeholder || q?.answerPlaceholder || '').trim();
  if (custom && custom !== 'Nhập đáp án...' && custom !== 'Ví dụ: 12') return custom;
  const question = (q?.question || '').toLowerCase();
  if (/tọa độ|toa do|hoành|hoanh|tung độ|tung do|\(\s*x\s*[;,]/.test(question)) {
    return 'Ví dụ: 2; -3';
  }
  if (/phân số|frac|\//.test(question)) return 'Ví dụ: 1/2';
  if (/căn|sqrt|√/.test(question)) return 'Ví dụ: 2√3';
  if (/bình phương|\^2|x²/.test(question)) return 'Ví dụ: 4';
  return 'Ví dụ: 12';
}

/** Độ rộng ô — rộng hơn để chữ Việt + khoảng trắng không bị dính/cắt. */
function inputMinWidthPx(placeholder) {
  const len = String(placeholder || '').length;
  // ~0.65rem/ký tự + padding; tối thiểu 7.5rem, tối đa 14rem
  const rem = Math.max(7.5, Math.min(14, len * 0.72 + 2.2));
  return `${rem}rem`;
}

export default function PracticeAnswerInput({ q, value, disabled, onChange }) {
  const [mathOpen, setMathOpen] = useState(false);
  const [activePartId, setActivePartId] = useState(null);
  const inputRefs = useRef({});

  const parts = useMemo(() => normalizeInputAnswerParts(q), [q]);
  const multi = parts.length > 1;
  const values = useMemo(() => resolveInputPartValues(parts, value), [parts, value]);

  const emitChange = (partId, nextText) => {
    if (!multi) {
      onChange(nextText);
      return;
    }
    onChange({ ...values, [partId]: nextText });
  };

  const appendKey = (key) => {
    if (disabled) return;
    const partId = activePartId || parts[0]?.id;
    if (!partId) return;
    const el = inputRefs.current[partId];
    const cur = String(values[partId] ?? '');
    if (el && typeof el.selectionStart === 'number') {
      const start = el.selectionStart;
      const end = el.selectionEnd ?? start;
      const next = cur.slice(0, start) + key + cur.slice(end);
      emitChange(partId, next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + key.length;
        el.setSelectionRange(pos, pos);
      });
      return;
    }
    emitChange(partId, `${cur}${key}`);
  };

  const fieldClass =
    'lesson-practice-answer-field bg-transparent outline-none font-semibold text-slate-800 text-base md:text-lg text-center w-full';

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-end gap-3">
        {parts.map((part, idx) => {
          const ph = multi
            ? part.placeholder || `Ô ${idx + 1}`
            : inferSinglePlaceholder(q, part);
          const minW = multi ? inputMinWidthPx(ph) : undefined;
          return (
            <div
              key={part.id}
              className={`flex flex-col gap-1.5 ${multi ? 'shrink-0' : 'flex-1 min-w-0 max-w-lg'}`}
              style={multi ? { minWidth: minW, maxWidth: '16rem' } : undefined}
            >
              {multi && ph ? (
                <span className="lesson-practice-answer-label text-xs md:text-sm font-bold text-slate-600 px-0.5 whitespace-pre-wrap tracking-wide">
                  {ph}
                </span>
              ) : null}
              <div className="flex items-center bg-white px-3.5 py-3 md:px-4 md:py-3.5 rounded-xl border border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                <input
                  ref={(el) => {
                    if (el) inputRefs.current[part.id] = el;
                  }}
                  type="text"
                  value={values[part.id] || ''}
                  disabled={disabled}
                  placeholder={multi ? '…' : ph}
                  aria-label={ph || `Đáp án ${idx + 1}`}
                  onFocus={() => setActivePartId(part.id)}
                  onChange={(e) => emitChange(part.id, e.target.value)}
                  className={fieldClass}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </div>
          );
        })}
        {!disabled ? (
          <div className="relative shrink-0 self-end">
            <button
              type="button"
              onClick={() => setMathOpen((v) => !v)}
              title="Ký hiệu toán học"
              aria-label="Ký hiệu toán học"
              aria-expanded={mathOpen}
              className={`h-[3.25rem] px-3.5 rounded-xl border-2 font-black text-lg transition-all flex items-center justify-center ${
                mathOpen
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/60'
              }`}
            >
              <Sigma className="w-5 h-5" />
            </button>
            {mathOpen ? (
              <div
                className="absolute right-0 top-full mt-1.5 z-30 p-2 rounded-xl border border-slate-200 bg-white shadow-lg grid grid-cols-5 gap-1 min-w-[11rem]"
                role="group"
                aria-label="Phím toán nhanh"
              >
                {MATH_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => appendKey(key)}
                    className="min-w-[2rem] h-9 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-sm font-bold hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-800 transition-colors"
                  >
                    {key}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {multi ? (
        <p className="mt-2 text-xs text-slate-500">Điền lần lượt từng ô — ví dụ hệ phương trình: x rồi y.</p>
      ) : null}
    </div>
  );
}
