import { useRef, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

export default function MindMapTreeContainer({ children, treeId }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const onMouseDown = (e) => {
    if (e.target.closest('button') || e.target.closest('textarea') || e.target.closest('select') || e.target.closest('input'))
      return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y };
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPos({ x: dragStart.current.posX + dx, y: dragStart.current.posY + dy });
  };

  const onMouseUp = () => setIsDragging(false);

  const onTouchStart = (e) => {
    if (e.target.closest('button') || e.target.closest('textarea') || e.target.closest('select') || e.target.closest('input'))
      return;
    setIsDragging(true);
    dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, posX: pos.x, posY: pos.y };
  };

  const onTouchMove = (e) => {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - dragStart.current.x;
    const dy = e.touches[0].clientY - dragStart.current.y;
    setPos({ x: dragStart.current.posX + dx, y: dragStart.current.posY + dy });
  };

  const handleZoom = (delta) => {
    if (delta === 0) {
      setScale(1);
      setPos({ x: 0, y: 0 });
      return;
    }
    setScale((prev) => {
      let newScale = prev + delta;
      if (newScale < 0.4) newScale = 0.4;
      if (newScale > 3) newScale = 3;
      return parseFloat(newScale.toFixed(2));
    });
  };

  return (
    <div
      className={`relative w-full h-[500px] lg:h-full lg:min-h-[600px] flex flex-col bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-200 overflow-hidden touch-pan-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onMouseUp}
    >
      <div
        className="absolute inset-0 opacity-50 pointer-events-none bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] bg-[length:20px_20px]"
        aria-hidden
      />

      <div className="flex-1 relative w-full h-full">
        <div
          id={`tree-render-${treeId}`}
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transformOrigin: 'top center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            width: 'max-content',
            margin: '0 auto',
            padding: '3rem 2rem',
          }}
          className="flex flex-col items-center"
        >
          {children}
        </div>
      </div>

      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-white/90 backdrop-blur shadow-md p-1.5 rounded-xl border border-slate-200 z-50 opacity-80 hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => handleZoom(-0.2)}
          className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
          title="Thu nhỏ sơ đồ"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => handleZoom(0)}
          className="px-2 hover:bg-slate-200 rounded-lg text-slate-800 text-xs font-bold transition-colors text-center"
          title="Đặt lại (100%)"
          style={{ minWidth: '50px' }}
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          type="button"
          onClick={() => handleZoom(0.2)}
          className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
          title="Phóng to sơ đồ"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
