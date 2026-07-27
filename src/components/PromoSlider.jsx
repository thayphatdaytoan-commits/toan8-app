/* eslint-disable */
import React, { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Khung quảng cáo trượt tự động — slides: { id, imageUrl, linkUrl, alt }
 */
export default function PromoSlider({ block, onRegister }) {
  const slides = (block?.items || []).filter((s) => s && (s.imageUrl || '').trim());
  const intervalMs = Math.max(2500, Number(block?.fields?.intervalMs) || 5000);
  const [idx, setIdx] = useState(0);
  const pauseRef = useRef(false);
  const touchX = useRef(null);

  useEffect(() => {
    setIdx(0);
  }, [slides.map((s) => s.id || s.imageUrl).join('|')]);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const t = window.setInterval(() => {
      if (pauseRef.current) return;
      setIdx((i) => (i + 1) % slides.length);
    }, intervalMs);
    return () => window.clearInterval(t);
  }, [slides.length, intervalMs]);

  if (!slides.length) return null;

  const go = (dir) => {
    setIdx((i) => (i + dir + slides.length) % slides.length);
  };

  const current = slides[idx] || slides[0];
  const link = (current.linkUrl || '').trim();

  const openSlide = () => {
    if (!link) {
      if (onRegister) onRegister();
      return;
    }
    if (link.startsWith('#hoc-thu') || link === 'trial') {
      const el = document.getElementById('hoc-thu');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (link.startsWith('http') || link.startsWith('/')) {
      window.open(link, link.startsWith('http') ? '_blank' : '_self', 'noopener,noreferrer');
    }
  };

  return (
    <section
      className="mb-10 md:mb-12 scroll-mt-24 min-w-0"
      onMouseEnter={() => { pauseRef.current = true; }}
      onMouseLeave={() => { pauseRef.current = false; }}
    >
      <div
        className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-lg bg-slate-100 aspect-[21/7] sm:aspect-[3/1] min-h-[140px] max-h-[320px]"
        onTouchStart={(e) => {
          touchX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchX.current;
          const end = e.changedTouches[0]?.clientX;
          touchX.current = null;
          if (start == null || end == null) return;
          const d = end - start;
          if (Math.abs(d) < 40) return;
          go(d < 0 ? 1 : -1);
        }}
      >
        {slides.map((slide, i) => (
          <button
            key={slide.id || `${slide.imageUrl}-${i}`}
            type="button"
            onClick={openSlide}
            className={`absolute inset-0 transition-opacity duration-500 ease-out ${
              i === idx ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
            aria-hidden={i !== idx}
            tabIndex={i === idx ? 0 : -1}
          >
            <img
              src={slide.imageUrl}
              alt={slide.alt || `Quảng cáo ${i + 1}`}
              className="w-full h-full object-cover object-center"
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
            />
          </button>
        ))}

        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); go(-1); }}
              className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/35 hover:bg-black/50 text-white flex items-center justify-center backdrop-blur-sm"
              aria-label="Slide trước"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); go(1); }}
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/35 hover:bg-black/50 text-white flex items-center justify-center backdrop-blur-sm"
              aria-label="Slide sau"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-2">
              {slides.map((s, i) => (
                <button
                  key={`dot-${s.id || i}`}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                  className={`h-2.5 rounded-full transition-all ${
                    i === idx ? 'w-6 bg-white' : 'w-2.5 bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
