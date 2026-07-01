/* eslint-disable */
import React, { useMemo } from 'react';
import { analyzeLessonSeo } from './lessonSeoAnalyze';
import { SearchCheck, AlertTriangle, Link2, ClipboardCopy } from 'lucide-react';

export default function LessonSeoAdminPanel({ lesson, theoryCore, lessonsList }) {
  const report = useMemo(
    () =>
      analyzeLessonSeo({
        lesson,
        theoryCore: String(theoryCore || ''),
        lessonsList: lessonsList || [],
      }),
    [lesson, theoryCore, lessonsList]
  );

  const pct = report.maxScore ? Math.round((report.score / report.maxScore) * 100) : 0;

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 to-white p-3 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-emerald-900">
          <SearchCheck size={20} className="shrink-0" />
          <span className="font-extrabold text-sm">SEO bài giảng (preview)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
            Điểm: {report.score}/{report.maxScore} ({pct}%)
          </span>
        </div>
      </div>

      <div className="h-2 rounded-full bg-emerald-100 overflow-hidden">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>

      <ul className="space-y-1.5 text-[11px] leading-snug">
        {report.checks.map((c, i) => (
          <li key={i} className={`flex gap-1.5 ${c.ok ? 'text-slate-700' : 'text-amber-900'}`}>
            <span className="shrink-0">{c.ok ? '✓' : '!'}</span>
            <span>{c.text}</span>
          </li>
        ))}
      </ul>

      {report.warnings.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-2 py-1.5 text-[11px] text-amber-950 flex gap-1.5">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold mb-0.5">Cần lưu ý</p>
            <ul className="list-disc pl-3 space-y-0.5">
              {report.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg border border-slate-200 bg-white p-2 space-y-1">
          <p className="font-bold text-slate-800 flex items-center justify-between gap-1">
            Gợi ý tiêu đề (SERP)
            <button
              type="button"
              onClick={() => copy(report.suggestedTitle)}
              className="text-slate-500 hover:text-emerald-700"
              title="Copy"
            >
              <ClipboardCopy size={14} />
            </button>
          </p>
          <p className="text-slate-700 break-words">{report.suggestedTitle}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-2 space-y-1">
          <p className="font-bold text-slate-800 flex items-center justify-between gap-1">
            Gợi ý mô tả (~158 ký tự)
            <button
              type="button"
              onClick={() => copy(report.suggestedDesc.slice(0, 158))}
              className="text-slate-500 hover:text-emerald-700"
              title="Copy"
            >
              <ClipboardCopy size={14} />
            </button>
          </p>
          <p className="text-slate-700 break-words">{report.suggestedDesc.slice(0, 158)}</p>
        </div>
      </div>

      {report.internalSuggestions.length > 0 ? (
        <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-2">
          <p className="text-[11px] font-bold text-blue-900 flex items-center gap-1 mb-1">
            <Link2 size={14} /> Link nội bộ gợi ý (dán vào lý thuyết dạng markdown)
          </p>
          <ul className="space-y-1 text-[10px] text-blue-950">
            {report.internalSuggestions.map((s, i) => (
              <li key={i} className="break-all">
                <span className="font-semibold text-blue-800">{s.label}: </span>
                <span className="font-mono">
                  [{s.title || 'Bài'}]({s.url.replace(/^https?:\/\/[^/]+/, '')})
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[10px] text-slate-500">Thêm Chương/Bài để gợi ý link bài trước/sau.</p>
      )}
    </div>
  );
}
