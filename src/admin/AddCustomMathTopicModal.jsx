import React, { useEffect, useState } from 'react';
import { Plus, XCircle } from 'lucide-react';

export default function AddCustomMathTopicModal({
  open,
  chapterLabel,
  gradeLevel,
  initialLabel = '',
  saving = false,
  onClose,
  onSave,
}) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (open) setLabel(initialLabel || '');
  }, [open, initialLabel]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave?.(label);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50">
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-custom-topic-title"
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50">
          <div className="min-w-0">
            <h3 id="add-custom-topic-title" className="font-black text-slate-800 text-base flex items-center gap-2">
              <Plus size={18} className="text-indigo-600 shrink-0" />
              Thêm dạng toán mới
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Toán {gradeLevel}
              {chapterLabel ? ` · ${chapterLabel}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-red-500 shrink-0" aria-label="Đóng">
            <XCircle size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label htmlFor="custom-topic-label" className="block text-xs font-bold text-slate-600 mb-1">
              Tên dạng toán
            </label>
            <input
              id="custom-topic-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ví dụ: Giải bài toán bằng cách lập hệ phương trình..."
              className="w-full p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none"
              autoFocus
              disabled={saving}
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              Dạng toán sẽ được lưu vào hệ thống và hiện trong dropdown cho cùng khối + chương này.
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving || !label.trim()}
              className="flex-1 py-2 rounded-lg bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Đang lưu…' : 'Lưu dạng toán'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
