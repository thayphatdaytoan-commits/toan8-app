import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Download, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { TextWithMath } from './Math11Template';

function collectExpandableIds(node, out = []) {
  if (!node) return out;
  if (Array.isArray(node.children) && node.children.length > 0) {
    out.push(node.id);
    node.children.forEach((c) => collectExpandableIds(c, out));
  }
  return out;
}

function lineColor(depth) {
  if (depth === 0) return '#7c3aed';
  if (depth === 1) return '#0284c7';
  return '#059669';
}

function NodeBox({ node, depth, hasKids, isOpen, onToggle }) {
  const palette =
    depth === 0
      ? 'bg-violet-100 border-violet-400 text-violet-950 shadow-md shadow-violet-200/70'
      : depth === 1
        ? 'bg-sky-100 border-sky-400 text-sky-950 shadow-md shadow-sky-200/60'
        : 'bg-emerald-100 border-emerald-400 text-emerald-950 shadow-md shadow-emerald-200/60';

  return (
    <div className={`relative z-[1] max-w-[15rem] md:max-w-[17rem] rounded-xl border-2 px-3 py-2.5 ${palette}`}>
      <div className="flex items-start gap-1.5">
        {hasKids ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            className="mt-0.5 shrink-0 w-5 h-5 rounded-md bg-white/80 border border-black/10 flex items-center justify-center text-slate-600 hover:bg-white"
            aria-label={isOpen ? 'Thu gọn' : 'Mở rộng'}
          >
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : null}
        <div className="min-w-0 font-bold leading-snug break-words">
          <TextWithMath text={node.text} />
        </div>
      </div>
    </div>
  );
}

function ArrowHead({ color }) {
  return (
    <div
      className="shrink-0"
      style={{
        width: 0,
        height: 0,
        borderTop: '6px solid transparent',
        borderBottom: '6px solid transparent',
        borderLeft: `9px solid ${color}`,
      }}
      aria-hidden
    />
  );
}

function SummaryNodeCard({ node, depth, collapsed, onToggle, scale }) {
  const hasKids = Array.isArray(node.children) && node.children.length > 0;
  const isOpen = hasKids && !collapsed.has(node.id);
  const color = lineColor(depth);
  const kids = hasKids ? node.children : [];
  const kidCount = kids.length;
  const gapHalf = '0.375rem'; // nửa gap-3

  return (
    <div
      className="lesson-summary-branch flex items-center"
      style={{ fontSize: `${Math.max(0.78, 0.92 * scale)}rem` }}
    >
      <NodeBox node={node} depth={depth} hasKids={hasKids} isOpen={isOpen} onToggle={onToggle} />

      {hasKids && isOpen ? (
        <div className="flex items-center self-stretch">
          {/* Nối ngang từ ô cha tới trục / nhánh */}
          <div className="relative shrink-0 self-center" style={{ width: '0.85rem' }} aria-hidden>
            <div
              className="absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded-full"
              style={{ height: 3, background: color }}
            />
          </div>

          <div className="flex flex-col justify-center gap-3">
            {kids.map((child, index) => (
              <div key={child.id} className="relative flex items-center">
                {/* Trục dọc liền giữa các nhánh */}
                {kidCount > 1 && index > 0 ? (
                  <div
                    className="absolute left-0 w-[3px] rounded-full"
                    style={{
                      background: color,
                      bottom: '50%',
                      height: `calc(50% + ${gapHalf})`,
                    }}
                    aria-hidden
                  />
                ) : null}
                {kidCount > 1 && index < kidCount - 1 ? (
                  <div
                    className="absolute left-0 w-[3px] rounded-full"
                    style={{
                      background: color,
                      top: '50%',
                      height: `calc(50% + ${gapHalf})`,
                    }}
                    aria-hidden
                  />
                ) : null}

                {/* Nhánh ngang + mũi tên */}
                <div className="relative z-[1] flex items-center shrink-0" style={{ width: '1.65rem' }} aria-hidden>
                  <div className="flex-1 rounded-full" style={{ height: 3, background: color }} />
                  <ArrowHead color={color} />
                </div>

                <SummaryNodeCard
                  node={child}
                  depth={depth + 1}
                  collapsed={collapsed}
                  onToggle={onToggle}
                  scale={scale}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Sơ đồ tóm tắt bài học — layout ngang, đường nối liền nét + mũi tên.
 */
export default function LessonSummaryTree({
  root,
  title = 'Tóm tắt bài học',
  className = '',
}) {
  const reactId = useId();
  const exportId = `lesson-summary-export-${String(reactId).replace(/:/g, '')}`;
  const expandableIds = useMemo(() => collectExpandableIds(root), [root]);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setCollapsed(new Set());
    setScale(1);
  }, [root?.id, root?.text]);

  const toggle = useCallback((id) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => setCollapsed(new Set(expandableIds));

  const handleZoom = (delta) => {
    if (delta === 0) {
      setScale(1);
      return;
    }
    setScale((s) => Math.max(0.7, Math.min(1.6, parseFloat((s + delta).toFixed(2)))));
  };

  const downloadImage = async () => {
    const element = document.getElementById(exportId);
    if (!element) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f8fafc',
      });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `tom-tat-${String(title || 'bai-hoc').replace(/[^\w\-]+/g, '_').slice(0, 40)}.png`;
      a.click();
    } catch (err) {
      alert(`Không tải được ảnh: ${err?.message || err}`);
    }
  };

  if (!root?.text) {
    return (
      <p className="text-sm text-slate-500 italic p-6 text-center">Chưa có nội dung sơ đồ tóm tắt.</p>
    );
  }

  return (
    <div className={`lesson-summary-tree rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 overflow-hidden shadow-sm ${className}`.trim()}>
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-200 bg-white/90">
        <h3 className="text-sm font-black text-slate-800 truncate min-w-0 flex-1">{title}</h3>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={expandAll} title="Mở tất cả" className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
            <Maximize2 className="w-4 h-4" />
          </button>
          <button type="button" onClick={collapseAll} title="Thu gọn tất cả" className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
            <Minimize2 className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => handleZoom(0.1)} title="Phóng to" className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => handleZoom(-0.1)} title="Thu nhỏ" className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => handleZoom(0)} title="Đặt lại zoom" className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:bg-slate-50">
            {Math.round(scale * 100)}%
          </button>
          <button type="button" onClick={downloadImage} title="Tải ảnh PNG" className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-auto p-5 md:p-8 min-h-[280px] max-h-[min(78vh,820px)]">
        <div id={exportId} className="inline-flex min-w-full items-center py-3 px-1 bg-slate-50">
          <SummaryNodeCard node={root} depth={0} collapsed={collapsed} onToggle={toggle} scale={scale} />
        </div>
      </div>
    </div>
  );
}
