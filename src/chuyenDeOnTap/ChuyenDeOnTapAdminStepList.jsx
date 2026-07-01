/* eslint-disable */
import React, { useMemo, useState } from 'react';
import { GripVertical } from 'lucide-react';

function findStepIndex(steps, kind, arrayIndex) {
  return steps.findIndex(
    (s) => s.kind === kind && (kind === 'example_item' ? s.exampleIndex === arrayIndex : s.questionIndex === arrayIndex)
  );
}

function DraggableSection({ title, hint, items, selectedKey, onSelect, onReorder }) {
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  if (!items.length) return null;

  const handleDrop = (toIdx) => {
    if (dragIdx == null || dragIdx === toIdx) return;
    onReorder(dragIdx, toIdx);
    setDragIdx(null);
    setOverIdx(null);
  };

  return (
    <div className="space-y-1.5">
      <div>
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">{title}</p>
        {hint ? <p className="text-[10px] text-slate-400 leading-snug mt-0.5">{hint}</p> : null}
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => {
          const isSelected = selectedKey === item.key;
          const isDragging = dragIdx === i;
          const isOver = overIdx === i && dragIdx != null && dragIdx !== i;
          return (
            <li key={item.key}>
              <button
                type="button"
                draggable
                onDragStart={() => setDragIdx(i)}
                onDragEnd={() => {
                  setDragIdx(null);
                  setOverIdx(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverIdx(i);
                }}
                onDragLeave={() => setOverIdx((v) => (v === i ? null : v))}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(i);
                }}
                onClick={() => onSelect(item.stepIndex)}
                className={`w-full flex items-center gap-2 rounded-xl border-2 px-2 py-2 text-left transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                    : isOver
                      ? 'border-cyan-400 bg-cyan-50/80'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                } ${isDragging ? 'opacity-40 scale-[0.98]' : ''}`}
              >
                <span
                  className="shrink-0 text-slate-400 cursor-grab active:cursor-grabbing touch-none"
                  aria-hidden
                >
                  <GripVertical className="w-4 h-4" />
                </span>
                <span
                  className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                    isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.num}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-slate-800 truncate">{item.label}</span>
                  {item.sub ? (
                    <span className="block text-[10px] text-slate-500 truncate">{item.sub}</span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Sidebar admin: danh sách ví dụ + câu hỏi, kéo thả để sắp xếp.
 */
export default function ChuyenDeOnTapAdminStepList({
  topic,
  steps = [],
  previewStepIndex = 0,
  onSelectStep,
  onReorderExamples,
  onReorderQuestions,
}) {
  const currentStep = steps[previewStepIndex] || null;
  const selectedKey = currentStep
    ? currentStep.kind === 'example_item'
      ? `ex-${currentStep.exampleIndex}`
      : currentStep.kind === 'question'
        ? `q-${currentStep.questionIndex}`
        : `step-${previewStepIndex}`
    : null;

  const exampleItems = useMemo(() => {
    const exs = Array.isArray(topic?.examples) ? topic.examples : [];
    return exs.map((ex, i) => ({
      key: `ex-${i}`,
      num: i + 1,
      label: ex.label || `Ví dụ ${i + 1}`,
      sub: (ex.stem || '').replace(/\s+/g, ' ').slice(0, 48) || 'Chưa có đề',
      stepIndex: findStepIndex(steps, 'example_item', i),
      arrayIndex: i,
    }));
  }, [topic?.examples, steps]);

  const questionItems = useMemo(() => {
    const qs = Array.isArray(topic?.questions) ? topic.questions : [];
    return qs.map((q, i) => ({
      key: `q-${i}`,
      num: i + 1,
      label: q.label || `Câu ${i + 1}`,
      sub: (q.stem || '').replace(/\s+/g, ' ').slice(0, 48) || 'Chưa có đề',
      stepIndex: findStepIndex(steps, 'question', i),
      arrayIndex: i,
    }));
  }, [topic?.questions, steps]);

  const hasLegacyExample =
    topic?.showExampleTopic !== false &&
    String(topic?.example || '').trim() &&
    (!topic?.examples || topic.examples.length === 0);

  return (
    <aside className="w-full lg:w-[240px] xl:w-[260px] shrink-0 rounded-2xl border-2 border-slate-200 bg-slate-50/90 p-3 flex flex-col gap-4 max-h-[min(72dvh,720px)] overflow-y-auto">
      <div>
        <p className="text-xs font-black text-slate-800">Danh sách slide &amp; câu hỏi</p>
        <p className="text-[10px] text-slate-500 mt-1 leading-snug">
          Bấm để xem trước · kéo biểu tượng ≡ để đổi thứ tự trong từng nhóm.
        </p>
      </div>

      {hasLegacyExample ? (
        <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
          Chủ đề đang dùng một khối ví dụ cũ — thêm ví dụ (slide) để quản lý danh sách.
        </p>
      ) : null}

      {!exampleItems.length && !questionItems.length ? (
        <p className="text-xs text-slate-500 italic py-4 text-center">
          Chưa có ví dụ hay câu hỏi — bấm + Ví dụ hoặc + Câu hỏi phía trên.
        </p>
      ) : null}

      <DraggableSection
        title="Ví dụ (slide)"
        hint="Thứ tự hiển thị trước các câu hỏi"
        items={exampleItems}
        selectedKey={selectedKey}
        onSelect={onSelectStep}
        onReorder={onReorderExamples}
      />

      <DraggableSection
        title="Câu hỏi"
        hint="Thứ tự trên lộ trình ôn tập"
        items={questionItems}
        selectedKey={selectedKey}
        onSelect={onSelectStep}
        onReorder={onReorderQuestions}
      />
    </aside>
  );
}
