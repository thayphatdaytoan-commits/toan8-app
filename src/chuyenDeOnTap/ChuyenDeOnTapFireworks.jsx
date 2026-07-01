/* eslint-disable */
import React, { useEffect, useRef } from 'react';

const COLORS = ['#fde047', '#f97316', '#22c55e', '#38bdf8', '#f472b6', '#a78bfa', '#ef4444'];

function burst(canvas, ctx, ox, oy) {
  const n = 36 + Math.floor(Math.random() * 20);
  const parts = [];
  for (let i = 0; i < n; i += 1) {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const sp = 2.5 + Math.random() * 5.5;
    parts.push({
      x: ox,
      y: oy,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 1.5,
      life: 1,
      decay: 0.012 + Math.random() * 0.018,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      r: 2 + Math.random() * 3,
    });
  }
  return parts;
}

/**
 * Hiệu ứng pháo hoa khi trả lời đúng — gọi lại bằng cách tăng `burstKey`.
 */
export default function ChuyenDeOnTapFireworks({ burstKey = 0 }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!burstKey) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const w = canvas.width;
    const h = canvas.height;
    let particles = [
      ...burst(canvas, ctx, w * 0.35, h * 0.55),
      ...burst(canvas, ctx, w * 0.65, h * 0.5),
      ...burst(canvas, ctx, w * 0.5, h * 0.45),
    ];

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles = particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.vx *= 0.985;
        p.life -= p.decay;
        if (p.life <= 0) return false;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });
      ctx.globalAlpha = 1;
      if (particles.length > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [burstKey]);

  if (!burstKey) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[9999]"
      aria-hidden
    />
  );
}
