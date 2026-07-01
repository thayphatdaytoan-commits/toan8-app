/**
 * Chấm điểm tự động theo trọng số phần (TN / Đúng–Sai / TL ngắn).
 * Đúng–sai (mỗi câu nhóm): 1 ý đúng 0,1 · 2 ý 0,25 · 3 ý 0,5 · 4 ý 1 · sai hoặc không chọn 0 (theo thang chuẩn 4 mệnh đề).
 */

export const DEFAULT_PART_POINTS = {
  points_mc: 4,
  points_tf: 2,
  points_short: 2,
  points_essay: 2,
};

function normalizeShortAnswerText(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/,/g, '.');
}

function shortAnswerIsCorrect(userInput, shortCorrect) {
  const u = normalizeShortAnswerText(userInput);
  if (!u) return false;
  const variants = String(shortCorrect || '')
    .split('|')
    .map((x) => normalizeShortAnswerText(x))
    .filter(Boolean);
  return variants.some((v) => u === v);
}

/** Điểm thô 0…1 cho một câu đúng/sai (tối đa 1 điểm / câu nhóm khi đủ 4 ý). */
export function tfBlockRawScore(correctCount, totalItems) {
  const n = totalItems || 0;
  const c = Math.min(Math.max(0, Number(correctCount) || 0), n);
  if (n === 0) return 0;
  if (n === 4) {
    const table = { 0: 0, 1: 0.1, 2: 0.25, 3: 0.5, 4: 1 };
    return table[c] ?? 0;
  }
  return (c / n) * 1;
}

export function normalizePartPoints(quiz) {
  const p = quiz || {};
  const n = (x, d) => {
    const v = Number(x);
    return Number.isFinite(v) && v >= 0 ? v : d;
  };
  return {
    points_mc: n(p.points_mc, DEFAULT_PART_POINTS.points_mc),
    points_tf: n(p.points_tf, DEFAULT_PART_POINTS.points_tf),
    points_short: n(p.points_short, DEFAULT_PART_POINTS.points_short),
    points_essay: n(p.points_essay, DEFAULT_PART_POINTS.points_essay),
  };
}

export function quizUsesPartPoints(quiz) {
  if (!quiz || typeof quiz !== 'object') return false;
  return ['points_mc', 'points_tf', 'points_short', 'points_essay'].some((k) => {
    const v = quiz[k];
    return v !== undefined && v !== null && String(v).trim() !== '';
  });
}

/** Cách chấm cũ: mỗi lựa chọn TN / mỗi ý ĐS / mỗi câu TLN cùng trọng số → làm tròn /10. */
function legacyEqualWeightScore(quiz, answers) {
  let earned = 0;
  let weight = 0;
  for (const q of quiz.questions || []) {
    const t = q.type || 'multiple_choice';
    if (t === 'multiple_choice') {
      weight += 1;
      if (answers[q.id] === q.correctAnswer) earned += 1;
    } else if (t === 'short_answer') {
      weight += 1;
      if (shortAnswerIsCorrect(answers[q.id], q.shortCorrect)) earned += 1;
    } else if (t === 'true_false_group') {
      const items = q.tfItems || [];
      const sel = answers[q.id];
      const obj = sel && typeof sel === 'object' && !Array.isArray(sel) ? sel : {};
      items.forEach((it) => {
        weight += 1;
        if (obj[it.key] === it.correct) earned += 1;
      });
    }
  }
  if (weight <= 0) return 10;
  return Math.round((earned / weight) * 10);
}

/**
 * Điểm tự động thang 10 (có thể một chữ số thập phân).
 * Đề đã lưu kèm points_* → dùng trọng số phần; đề cũ không có → giữ chấm legacy.
 */
export function computeAutoGradedScore(quiz, answers) {
  if (!quizUsesPartPoints(quiz)) {
    return legacyEqualWeightScore(quiz, answers);
  }

  const parts = normalizePartPoints(quiz);
  const qs = quiz.questions || [];

  const mcQs = qs.filter((q) => (q.type || 'multiple_choice') === 'multiple_choice');
  const tfQs = qs.filter((q) => q.type === 'true_false_group');
  const shortQs = qs.filter((q) => q.type === 'short_answer');

  const useMc = mcQs.length > 0;
  const useTf = tfQs.length > 0;
  const useShort = shortQs.length > 0;

  const autoMax =
    (useMc ? parts.points_mc : 0) + (useTf ? parts.points_tf : 0) + (useShort ? parts.points_short : 0);

  if (autoMax <= 0) {
    return legacyEqualWeightScore(quiz, answers);
  }

  let mcRaw = 0;
  if (useMc) {
    let mcCorrect = 0;
    for (const q of mcQs) {
      if (answers[q.id] === q.correctAnswer) mcCorrect += 1;
    }
    mcRaw = (mcCorrect / mcQs.length) * parts.points_mc;
  }

  let tfRaw = 0;
  if (useTf) {
    let sumBlocks = 0;
    for (const q of tfQs) {
      const items = q.tfItems || [];
      const sel = answers[q.id];
      const obj = sel && typeof sel === 'object' && !Array.isArray(sel) ? sel : {};
      let ok = 0;
      items.forEach((it) => {
        if (obj[it.key] === it.correct) ok += 1;
      });
      sumBlocks += tfBlockRawScore(ok, items.length);
    }
    tfRaw = (sumBlocks / tfQs.length) * parts.points_tf;
  }

  let shortRaw = 0;
  if (useShort) {
    let shortCorrect = 0;
    for (const q of shortQs) {
      if (shortAnswerIsCorrect(answers[q.id], q.shortCorrect)) shortCorrect += 1;
    }
    shortRaw = (shortCorrect / shortQs.length) * parts.points_short;
  }

  const rawTotal = mcRaw + tfRaw + shortRaw;
  const scaled = (rawTotal / autoMax) * 10;
  return Math.round(scaled * 100) / 100;
}

export function formatScoreForDisplay(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return '0';
  const r = Math.round(n * 100) / 100;
  return String(r);
}
