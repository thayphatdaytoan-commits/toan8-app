import React, { useMemo } from 'react';
import { BookMarked } from 'lucide-react';
import MindMapImagePanZoom from './mindMap/MindMapImagePanZoom';
import LessonSummaryTree from './LessonSummaryTree';
import { lessonMindMapIsVisible, normalizeLessonMindMap } from './lessonMindMap';

/**
 * Tab Tóm tắt bài học — ảnh zoom hoặc sơ đồ hệ thống ngang.
 */
export default function LessonMindMapPanel({ mindMap, title = 'Tóm tắt bài học' }) {
  const mm = useMemo(() => normalizeLessonMindMap(mindMap), [mindMap]);
  const visible = lessonMindMapIsVisible(mm);
  const displayTitle = mm.summaryTitle || title;

  if (!visible) {
    return (
      <div className="p-8 md:p-12 text-center text-slate-500">
        <BookMarked className="w-10 h-10 mx-auto mb-3 text-slate-300" />
        <p className="font-semibold">Chưa có tóm tắt bài học.</p>
      </div>
    );
  }

  if (mm.mode === 'image' && mm.imageUrl) {
    return (
      <div className="lesson-mindmap-panel animate-in fade-in duration-200 p-3 md:p-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 border-b border-slate-200 bg-white flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-indigo-600 shrink-0" />
            <h3 className="text-sm font-black text-slate-800">{displayTitle}</h3>
            <span className="text-[11px] text-slate-400 ml-auto">Vuốt / nút để phóng to · thu nhỏ</span>
          </div>
          <div className="w-full h-[min(78vh,820px)] min-h-[320px] bg-slate-100">
            <MindMapImagePanZoom imageUrl={mm.imageUrl} title={displayTitle} allowPan={false} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lesson-mindmap-panel animate-in fade-in duration-200 p-3 md:p-5">
      <LessonSummaryTree root={mm.summaryRoot} title={displayTitle} />
    </div>
  );
}
