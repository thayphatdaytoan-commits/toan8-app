import React, { useMemo } from 'react';

const MATH_KEYS = ['(', ')', ';', '/', '²', '√', 'π', 'x', 'y', '-'];

function inferInputMode(q) {
  const ph = (q?.answerPlaceholder || '').toLowerCase();
  const question = (q?.question || '').toLowerCase();
  const ans = String(q?.correctAnswer ?? '');
  if (q?.inputMode === 'coordinate') return 'coordinate';
  if (/tọa độ|toa do|hoành|hoanh|tung độ|tung do|\(\s*x\s*[;,]/.test(`${question} ${ph}`)) {
    return 'coordinate';
  }
  if (/^\s*[\(\[]?\s*-?\d[\d.,]*\s*[;,]\s*-?\d[\d.,]*\s*[\)\]]?\s*$/.test(ans)) {
    return 'coordinate';
  }
  return 'text';
}

function inferPlaceholder(q, mode) {
  const custom = (q?.answerPlaceholder || '').trim();
  if (custom && custom !== 'Nhập đáp án...' && custom !== 'Ví dụ: 12') return custom;
  if (mode === 'coordinate') return 'Nhập tọa độ dạng (x; y) — ví dụ: 2; -3';
  const question = (q?.question || '').toLowerCase();
  if (/phân số|frac|\//.test(question)) return 'Ví dụ: 1/2 hoặc 3/4';
  if (/căn|sqrt|√/.test(question)) return 'Ví dụ: 2√3 hoặc √5';
  if (/bình phương|\^2|x²/.test(question)) return 'Ví dụ: 4 hoặc -2';
  return 'Ví dụ: 12 hoặc -3,5';
}

function parseCoordinateValue(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return { x: '', y: '' };
  const m = s.match(/^\s*[\(\[]?\s*([^;,]+?)\s*[;,]\s*([^)\]]+?)\s*[\)\]]?\s*$/);
  if (m) return { x: m[1].trim(), y: m[2].trim() };
  return { x: s, y: '' };
}

function joinCoordinate(x, y) {
  const a = String(x ?? '').trim();
  const b = String(y ?? '').trim();
  if (!a && !b) return '';
  if (!b) return a;
  return `${a}; ${b}`;
}

export default function PracticeAnswerInput({ q, value, disabled, onChange }) {
  const mode = useMemo(() => inferInputMode(q), [q]);
  const placeholder = useMemo(() => inferPlaceholder(q, mode), [q, mode]);
  const coord = useMemo(() => parseCoordinateValue(value), [value]);

  const appendKey = (key) => {
    if (disabled) return;
    const next = `${String(value ?? '')}${key}`;
    onChange(next);
  };

  const inputClass =
    'w-full bg-white outline-none font-semibold text-slate-800 text-base md:text-lg placeholder:text-slate-400 placeholder:font-normal';

  return (
    <div className="mt-4 space-y-3">
      {mode === 'coordinate' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5 block">
              Hoành độ (x)
            </span>
            <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-xl border border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <input
                type="text"
                inputMode="decimal"
                value={coord.x}
                disabled={disabled}
                placeholder="Ví dụ: 2"
                onChange={(e) => onChange(joinCoordinate(e.target.value, coord.y))}
                className={inputClass}
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5 block">
              Tung độ (y)
            </span>
            <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-xl border border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <input
                type="text"
                inputMode="decimal"
                value={coord.y}
                disabled={disabled}
                placeholder="Ví dụ: -3"
                onChange={(e) => onChange(joinCoordinate(coord.x, e.target.value))}
                className={inputClass}
              />
            </div>
          </label>
          <p className="sm:col-span-2 text-xs text-slate-500 leading-relaxed">
            Gộp thành dạng <strong className="font-semibold text-slate-700">(x; y)</strong> — có thể dùng dấu phẩy hoặc chấm phẩy.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-white px-4 py-3.5 rounded-xl border border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all w-full max-w-lg">
          <input
            type="text"
            value={value || ''}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={`flex-1 ${inputClass}`}
          />
        </div>
      )}

      {!disabled ? (
        <div className="flex flex-wrap gap-1.5 max-w-lg" role="group" aria-label="Phím toán nhanh">
          {MATH_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => appendKey(key)}
              className="min-w-[2.25rem] h-9 px-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-sm font-bold hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-800 transition-colors"
            >
              {key}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
