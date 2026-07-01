import { useRef, useState } from 'react';
import { Pin, PinOff, ZoomIn, ZoomOut } from 'lucide-react';

/**
 * Ảnh kèm zoom; tùy chọn pan cho giáo viên.
 * - Học sinh: allowPan=false → chỉ zoom, ảnh luôn ở giữa
 * - Giáo viên: allowPan=true + có nút ghim (pin) để khóa ảnh về giữa
 */
export default function MindMapImagePanZoom({ imageUrl, title, allowPan = false }) {
  const [scale, setScale] = useState(1);
  const [pinned, setPinned] = useState(!allowPan);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const canPan = allowPan && !pinned;

  const onMouseDown = (e) => {
    if (!canPan) return;
    if (e.target.closest('button')) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y };
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPos({ x: dragStart.current.posX + dx, y: dragStart.current.posY + dy });
  };

  const onMouseUp = () => setIsDragging(false);

  const onTouchStart = (e) => {
    if (!canPan) return;
    if (e.target.closest('button')) return;
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
      if (allowPan) setPinned(true);
      return;
    }
    setScale((prev) => {
      let newScale = prev + delta;
      if (newScale < 0.5) newScale = 0.5;
      if (newScale > 5) newScale = 5;
      return parseFloat(newScale.toFixed(2));
    });
  };

  return (
    <div
      className={`relative w-full h-full flex-1 overflow-hidden touch-pan-none ${
        canPan ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default'
      }`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onMouseUp}
    >
      <div className="w-full h-full flex items-center justify-center pointer-events-none">
        <img
          src={imageUrl}
          alt={`Hình vẽ ${title}`}
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transition: canPan && isDragging ? 'none' : 'transform 0.12s ease-out',
          }}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur shadow-md p-1.5 rounded-xl border border-slate-200 z-10 opacity-70 hover:opacity-100 transition-opacity">
        {allowPan && (
          <button
            type="button"
            onClick={() => {
              setPinned((v) => {
                const next = !v;
                if (next) setPos({ x: 0, y: 0 });
                return next;
              });
            }}
            className="p-1 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
            title={pinned ? 'Bỏ ghim (cho phép kéo)' : 'Ghim giữa (khóa kéo)'}
          >
            {pinned ? <Pin className="w-5 h-5" /> : <PinOff className="w-5 h-5" />}
          </button>
        )}
        <button
          type="button"
          onClick={() => handleZoom(-0.05)}
          className="p-1 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
          title="Thu nhỏ"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => handleZoom(0.05)}
          className="p-1 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
          title="Phóng to"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
