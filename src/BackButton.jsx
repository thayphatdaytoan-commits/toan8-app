/* eslint-disable */
import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';

/**
 * Nút "quay lại thao tác trước đó" dùng chung cho mọi trang.
 * - Mặc định gọi window.history.back(); nếu truyền `onBack` sẽ ưu tiên callback đó.
 * - Tự ẩn khi không có lịch sử để quay lại (history.length <= 1) và không truyền `onBack`.
 */
export default function BackButton({
  onBack,
  className = '',
  label = 'Quay lại',
  variant = 'default',
  title,
}) {
  const [hasHistory, setHasHistory] = useState(true);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        setHasHistory(window.history.length > 1);
      }
    } catch {
      setHasHistory(true);
    }
  }, []);

  if (!onBack && !hasHistory) return null;

  const handleClick = () => {
    if (typeof onBack === 'function') {
      onBack();
      return;
    }
    try {
      window.history.back();
    } catch {
      /* ignore */
    }
  };

  const base =
    'inline-flex items-center gap-1.5 font-bold transition-all active:scale-[0.98] select-none';
  const variants = {
    default:
      'h-10 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50 shadow-sm text-sm md:text-base',
    ghost:
      'h-9 px-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 text-sm md:text-base',
    solid:
      'h-10 px-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm text-sm md:text-base',
    icon:
      'w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50 shadow-sm justify-center',
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={title || label}
      aria-label={title || label}
      className={`${base} ${variants[variant] || variants.default} ${className}`}
    >
      <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
      {variant !== 'icon' ? <span className="whitespace-nowrap">{label}</span> : null}
    </button>
  );
}
