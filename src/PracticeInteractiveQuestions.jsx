import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GripVertical, Check, X } from 'lucide-react';
import { TextWithMath, TextWithMathWithLoiGiai } from './Math11Template';
import {
  initialOrderingPermutation,
  normalizeTrueFalseAnswer,
  normalizeFillBlanksQuestion,
  parseDragChoices,
  parseDragSlots,
  parseOrderingItems,
  parseOrderingCorrectOrder,
  splitPassageBlankParts,
} from './practiceQuestionTypes';

export function PracticeTrueFalse({ q, value, disabled, onChange }) {
  const selected = value === true || value === false ? value : null;

  const pick = (v) => {
    if (disabled) return;
    onChange(v);
  };

  const btnBase =
    'flex-1 min-h-[3rem] rounded-xl border-2 font-bold text-base transition-all flex items-center justify-center gap-2';

  return (
    <div className="mt-4 grid grid-cols-2 gap-3 max-w-md">
      <button
        type="button"
        disabled={disabled}
        onClick={() => pick(true)}
        className={`${btnBase} ${
          selected === true
            ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-400'
            : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/60'
        } ${disabled && selected !== true ? 'opacity-50' : ''}`}
      >
        <Check className="w-5 h-5" />
        Đúng
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => pick(false)}
        className={`${btnBase} ${
          selected === false
            ? 'border-rose-500 bg-rose-50 text-rose-800 ring-1 ring-rose-400'
            : 'border-slate-200 bg-white text-slate-700 hover:border-rose-300 hover:bg-rose-50/60'
        } ${disabled && selected !== false ? 'opacity-50' : ''}`}
      >
        <X className="w-5 h-5" />
        Sai
      </button>
    </div>
  );
}

export function PracticeTrueFalseResult({ q }) {
  const ok = normalizeTrueFalseAnswer(q.correctAnswer);
  return (
    <span className="font-black text-emerald-800">{ok ? 'Đúng' : 'Sai'}</span>
  );
}

export function PracticeOrdering({ q, value, disabled, onChange }) {
  const items = useMemo(() => parseOrderingItems(q.items), [q.items]);
  const correctOrder = useMemo(
    () => parseOrderingCorrectOrder(q.correctOrder ?? q.correctAnswer, items.length),
    [q.correctOrder, q.correctAnswer, items.length]
  );

  const [order, setOrder] = useState(() => {
    if (Array.isArray(value) && value.length === items.length) return value;
    return initialOrderingPermutation(correctOrder);
  });

  useEffect(() => {
    if (Array.isArray(value) && value.length === items.length) {
      setOrder(value);
    }
  }, [value, items.length]);

  useEffect(() => {
    if ((!Array.isArray(value) || value.length !== items.length) && items.length > 0) {
      const init = initialOrderingPermutation(correctOrder);
      onChange(init);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.id, items.length]);

  const move = useCallback(
    (from, to) => {
      if (disabled || from === to) return;
      const next = [...order];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      setOrder(next);
      onChange(next);
    },
    [disabled, onChange, order]
  );

  const onDragStart = (e, idx) => {
    e.dataTransfer.setData('text/plain', String(idx));
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = (e, toIdx) => {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData('text/plain'));
    if (Number.isFinite(from)) move(from, toIdx);
  };

  if (!items.length) {
    return <p className="mt-4 text-sm text-slate-500 italic">Chưa có mục sắp xếp.</p>;
  }

  return (
    <div className="mt-4 space-y-2 max-w-xl">
      <p className="text-xs text-slate-500 font-semibold">Kéo thả hoặc dùng mũi tên để sắp xếp đúng thứ tự</p>
      {order.map((itemIdx, pos) => (
        <div
          key={`${itemIdx}-${pos}`}
          draggable={!disabled}
          onDragStart={(e) => onDragStart(e, pos)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => onDrop(e, pos)}
          className={`flex items-center gap-2 p-3 md:p-3.5 rounded-xl border-2 bg-white transition-all ${
            disabled ? 'border-slate-200 opacity-80' : 'border-slate-200 hover:border-indigo-300 cursor-grab active:cursor-grabbing'
          }`}
        >
          <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center shrink-0">
            {pos + 1}
          </span>
          <span className="flex-1 text-slate-800 font-medium text-sm md:text-base min-w-0">
            <TextWithMathWithLoiGiai text={items[itemIdx] || ''} inlineImage />
          </span>
          {!disabled ? (
            <div className="flex flex-col gap-0.5 shrink-0">
              <button
                type="button"
                disabled={pos === 0}
                onClick={() => move(pos, pos - 1)}
                className="text-xs px-1.5 py-0.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-30"
                aria-label="Lên"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={pos === order.length - 1}
                onClick={() => move(pos, pos + 1)}
                className="text-xs px-1.5 py-0.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-30"
                aria-label="Xuống"
              >
                ↓
              </button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function PracticeOrderingResult({ q }) {
  const items = parseOrderingItems(q.items);
  const correctOrder = parseOrderingCorrectOrder(q.correctOrder ?? q.correctAnswer, items.length);
  return (
    <ol className="list-decimal list-inside space-y-1 text-slate-800 font-medium">
      {correctOrder.map((idx, i) => (
        <li key={i}>
          <TextWithMathWithLoiGiai text={items[idx] || ''} inlineImage />
        </li>
      ))}
    </ol>
  );
}

export function PracticeDragDrop({ q, value, disabled, onChange }) {
  const slots = useMemo(() => parseDragSlots(q.slots), [q.slots]);
  const choices = useMemo(() => parseDragChoices(q.choices), [q.choices]);
  const assignment = value && typeof value === 'object' ? value : {};

  const usedInSlots = useMemo(() => new Set(Object.values(assignment).filter(Boolean)), [assignment]);
  const pool = choices.filter((c) => !usedInSlots.has(c));

  const assign = (slotId, choice) => {
    if (disabled) return;
    const next = { ...assignment };
    if (!choice) delete next[slotId];
    else next[slotId] = choice;
    onChange(next);
  };

  const onDragStart = (e, choice) => {
    e.dataTransfer.setData('text/plain', choice);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDropSlot = (e, slotId) => {
    e.preventDefault();
    const choice = e.dataTransfer.getData('text/plain');
    if (choice) assign(slotId, choice);
  };

  const clearSlot = (slotId) => assign(slotId, null);

  if (!slots.length || !choices.length) {
    return <p className="mt-4 text-sm text-slate-500 italic">Chưa cấu hình ô kéo thả.</p>;
  }

  return (
    <div className="mt-4 space-y-4 max-w-2xl">
      {!disabled && pool.length > 0 ? (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Kéo đáp án vào ô</p>
          <div className="flex flex-wrap gap-2">
            {pool.map((c) => (
              <div
                key={c}
                draggable
                onDragStart={(e) => onDragStart(e, c)}
                className="px-3 py-2 rounded-xl border-2 border-indigo-200 bg-indigo-50 text-indigo-900 text-sm font-semibold cursor-grab active:cursor-grabbing shadow-sm"
              >
                <TextWithMathWithLoiGiai text={c} inlineImage />
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="space-y-3">
        {slots.map((slot) => {
          const filled = assignment[slot.id] || '';
          return (
            <div
              key={slot.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDropSlot(e, slot.id)}
              className={`rounded-xl border-2 border-dashed p-3 md:p-4 transition-colors ${
                filled
                  ? 'border-indigo-300 bg-indigo-50/40'
                  : 'border-slate-300 bg-slate-50/50 min-h-[3.5rem]'
              }`}
            >
              <p className="text-xs font-bold text-slate-500 mb-2">{slot.label}</p>
              {filled ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800 text-sm md:text-base">
                    <TextWithMathWithLoiGiai text={filled} inlineImage />
                  </span>
                  {!disabled ? (
                    <button
                      type="button"
                      onClick={() => clearSlot(slot.id)}
                      className="text-xs font-bold text-slate-500 hover:text-rose-600 px-2 py-1 rounded border border-slate-200 bg-white"
                    >
                      Gỡ
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">Thả đáp án vào đây</p>
              )}
              {!disabled ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {choices.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => assign(slot.id, c)}
                      className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 font-medium text-slate-600"
                    >
                      {c.length > 18 ? `${c.slice(0, 18)}…` : c}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PracticeDragDropResult({ q }) {
  const slots = parseDragSlots(q.slots);
  const correct = q.correctAnswer && typeof q.correctAnswer === 'object' ? q.correctAnswer : {};
  return (
    <ul className="space-y-2 text-slate-800 font-medium">
      {slots.map((slot) => (
        <li key={slot.id}>
          <span className="text-teal-700 font-semibold">{slot.label}: </span>
          <span className="font-black text-emerald-800">
            <TextWithMathWithLoiGiai text={String(correct[slot.id] ?? '—')} inlineImage />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PracticeFillBlanks({ q, value, disabled, onChange }) {
  const { passage, blanks } = useMemo(() => normalizeFillBlanksQuestion(q), [q]);
  const parts = useMemo(() => splitPassageBlankParts(passage), [passage]);
  const answers = value && typeof value === 'object' ? value : {};

  const setBlank = (id, val) => {
    if (disabled) return;
    onChange({ ...answers, [id]: val });
  };

  if (!passage) {
    return <p className="mt-4 text-sm text-slate-500 italic">Chưa có đoạn văn — dùng {'{{1}}'}, {'{{2}}'}… để đánh dấu chỗ trống.</p>;
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-4 md:px-6 md:py-5 text-slate-800 text-base md:text-lg leading-relaxed lesson-math-content">
      {parts.map((part, idx) => {
        if (part.kind === 'text') {
          const t = part.value || '';
          if (!t.trim()) return null;
          return (
            <span key={`t-${idx}`} className="inline">
              <TextWithMath text={t} inlineImage />
            </span>
          );
        }
        const blankMeta = blanks.find((b) => b.id === part.id);
        const ph = blankMeta?.correctAnswer
          ? `Chỗ trống ${part.id}`
          : `Chỗ trống ${part.id}`;
        return (
          <span key={`b-${part.id}-${idx}`} className="inline-flex items-center align-baseline mx-0.5 my-1">
            <input
              type="text"
              disabled={disabled}
              value={answers[part.id] || ''}
              onChange={(e) => setBlank(part.id, e.target.value)}
              placeholder={ph}
              aria-label={`Chỗ trống ${part.id}`}
              className="inline-block min-w-[5.5rem] max-w-[12rem] px-2.5 py-1.5 rounded-lg border-2 border-indigo-200 bg-white text-slate-800 font-semibold text-sm md:text-base focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none disabled:opacity-70"
            />
          </span>
        );
      })}
    </div>
  );
}

export function PracticeFillBlanksResult({ q }) {
  const { passage, blanks } = normalizeFillBlanksQuestion(q);
  const parts = splitPassageBlankParts(passage);
  const byId = Object.fromEntries(blanks.map((b) => [b.id, b.correctAnswer]));

  return (
    <div className="text-slate-800 font-medium leading-relaxed lesson-math-content">
      {parts.map((part, idx) => {
        if (part.kind === 'text') {
          const t = part.value || '';
          if (!t.trim()) return null;
          return (
            <span key={`rt-${idx}`} className="inline">
              <TextWithMath text={t} inlineImage />
            </span>
          );
        }
        return (
          <span
            key={`rb-${part.id}-${idx}`}
            className="inline-block mx-0.5 px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-900 font-black text-sm md:text-base"
          >
            <TextWithMath text={String(byId[part.id] ?? '—')} inlineImage />
          </span>
        );
      })}
    </div>
  );
}
