import React, { useMemo, useRef, useState } from 'react';
import { Sigma } from 'lucide-react';

const MATH_KEYS = ['(', ')', ';', '/', '²', '√', 'π', 'x', 'y', '-'];

function inferPlaceholder(q) {
  const custom = (q?.answerPlaceholder || '').trim();
  if (custom && custom !== 'Nhập đáp án...' && custom !== 'Ví dụ: 12') return custom;
  const question = (q?.question || '').toLowerCase();
  if (/tọa độ|toa do|hoành|hoanh|tung độ|tung do|\(\s*x\s*[;,]/.test(question)) {
    return 'Ví dụ: 2; -3 hoặc (2; -3)';
  }
  if (/phân số|frac|\//.test(question)) return 'Ví dụ: 1/2 hoặc 3/4';
  if (/căn|sqrt|√/.test(question)) return 'Ví dụ: 2√3 hoặc √5';
  if (/bình phương|\^2|x²/.test(question)) return 'Ví dụ: 4 hoặc -2';
  return 'Ví dụ: 12 hoặc -3,5';
}

export default function PracticeAnswerInput({ q, value, disabled, onChange }) {
  const [mathOpen, setMathOpen] = useState(false);
  const inputRef = useRef(null);
  const placeholder = useMemo(() => inferPlaceholder(q), [q]);

  const appendKey = (key) => {
    if (disabled) return;
    const el = inputRef.current;
    const cur = String(value ?? '');
    if (el && typeof el.selectionStart === 'number') {
      const start = el.selectionStart;
      const end = el.selectionEnd ?? start;
      const next = cur.slice(0, start) + key + cur.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + key.length;
        el.setSelectionRange(pos, pos);
      });
      return;
    }
    onChange(`${cur}${key}`);
  };

  const inputClass =
    'w-full bg-transparent outline-none font-semibold text-slate-800 text-base md:text-lg placeholder:text-slate-400 placeholder:font-normal';

  return (
    <div className="mt-4 max-w-lg">
      <div className="flex items-stretch gap-2">
        <div className="flex-1 flex items-center gap-2 bg-white px-4 py-3.5 rounded-xl border border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={value || ''}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          />
        </div>
        {!disabled ? (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMathOpen((v) => !v)}
              title="Ký hiệu toán học"
              aria-label="Ký hiệu toán học"
              aria-expanded={mathOpen}
              className={`h-full min-h-[3.25rem] px-3.5 rounded-xl border-2 font-black text-lg transition-all flex items-center justify-center ${
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
    </div>
  );
}
