/**
 * Âm thanh vui, không lời — đúng / sai (chuyên đề ôn tập).
 * Dùng một AudioContext dùng chung và resume sau thao tác người dùng (chính sách trình duyệt).
 */

let sharedCtx = null;

function getContext() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new AC();
  }
  return sharedCtx;
}

/** Gọi khi người dùng bấm Kiểm tra / tương tác — mở khóa âm thanh. */
export async function ensureReviewAudioReady() {
  const ctx = getContext();
  if (!ctx) return false;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }
  return ctx.state === 'running';
}

function playTone(ctx, freqHz, t0, durationMs, type = 'sine', gain = 0.14) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freqHz;
  const end = t0 + durationMs / 1000;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.02);
  g.gain.linearRampToValueAtTime(0.0001, end);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(end + 0.03);
}

function playCorrect(ctx, t0) {
  // Ding vui — 4 nốt lên (C major)
  playTone(ctx, 523.25, t0, 80, 'sine', 0.16);
  playTone(ctx, 659.25, t0 + 0.07, 80, 'sine', 0.15);
  playTone(ctx, 783.99, t0 + 0.14, 100, 'sine', 0.17);
  playTone(ctx, 1046.5, t0 + 0.22, 140, 'triangle', 0.14);
  // Tiếng “bling” nhẹ
  playTone(ctx, 1318.5, t0 + 0.32, 90, 'sine', 0.08);
}

function playWrong(ctx, t0) {
  // “Womp” mềm — hai nốt xuống
  playTone(ctx, 392, t0, 120, 'triangle', 0.12);
  playTone(ctx, 311.13, t0 + 0.1, 160, 'sine', 0.11);
  playTone(ctx, 246.94, t0 + 0.22, 200, 'triangle', 0.09);
}

/** @param {'correct' | 'wrong'} kind */
export async function playReviewFeedback(kind) {
  try {
    const ready = await ensureReviewAudioReady();
    const ctx = getContext();
    if (!ready || !ctx) return;
    const t0 = ctx.currentTime;
    if (kind === 'correct') {
      playCorrect(ctx, t0);
    } else {
      playWrong(ctx, t0);
    }
  } catch {
    /* ignore */
  }
}
