/* eslint-disable */

/** Các loại câu hỏi tương tác trong tab Bài tập luyện tập */
export const PRACTICE_DISPLAY_MODES = {
  list: 'list',
  step: 'step',
};

export function resolvePracticeDisplayMode(raw) {
  const m = String(raw ?? 'list').trim().toLowerCase();
  return m === 'step' ? 'step' : 'list';
}

export const PRACTICE_INTERACTIVE_TYPES = [
  'mcq',
  'input',
  'true_false',
  'true_false_group',
  'ordering',
  'drag_drop',
  'fill_blanks',
];

export const PRACTICE_TYPE_LABELS = {
  mcq: 'Trắc nghiệm',
  input: 'Nhập đáp án',
  true_false: 'Đúng / Sai',
  true_false_group: 'Đúng / Sai (a–d)',
  ordering: 'Sắp xếp',
  drag_drop: 'Kéo thả',
  fill_blanks: 'Điền chỗ trống',
};

export function isInteractivePracticeType(type) {
  return PRACTICE_INTERACTIVE_TYPES.includes(String(type || '').trim());
}

export function normalizeTrueFalseAnswer(raw) {
  if (raw === true || raw === false) return raw;
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (['dung', 'true', '1', 'd'].includes(s)) return true;
  if (['sai', 'false', '0', 's'].includes(s)) return false;
  return null;
}

export function parseOrderingItems(raw) {
  if (Array.isArray(raw)) return raw.map((x) => String(x ?? '').trim()).filter(Boolean);
  return String(raw || '')
    .split('\n')
    .map((l) => l.replace(/^\s*\d+[\.\)]\s*/, '').trim())
    .filter(Boolean);
}

export function parseOrderingCorrectOrder(raw, itemCount) {
  if (Array.isArray(raw)) {
    const nums = raw.map((x) => Number(x)).filter((n) => Number.isFinite(n));
    if (nums.length === itemCount) return nums;
  }
  const s = String(raw ?? '').trim();
  if (!s) return Array.from({ length: itemCount }, (_, i) => i);
  const parts = s.split(/[,;|]/g).map((x) => Number(x.trim()) - 1);
  if (parts.every((n) => Number.isFinite(n) && n >= 0 && n < itemCount)) return parts;
  return Array.from({ length: itemCount }, (_, i) => i);
}

export function shuffleIndices(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Trả về hoán vị ban đầu (khác thứ tự đúng nếu có thể) */
export function initialOrderingPermutation(correctOrder) {
  const n = correctOrder.length;
  if (n <= 1) return [...correctOrder];
  for (let attempt = 0; attempt < 12; attempt++) {
    const perm = shuffleIndices(n).map((i) => correctOrder[i]);
    if (perm.some((v, i) => v !== correctOrder[i])) return perm;
  }
  const rotated = [...correctOrder.slice(1), correctOrder[0]];
  return rotated;
}

export function orderingAnswerOk(correctOrder, userOrder) {
  if (!Array.isArray(correctOrder) || !Array.isArray(userOrder)) return false;
  if (correctOrder.length !== userOrder.length) return false;
  return correctOrder.every((v, i) => userOrder[i] === v);
}

export function parseDragSlots(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s, i) => {
      if (s && typeof s === 'object') {
        const id = String(s.id || `slot${i + 1}`).trim();
        const label = String(s.label ?? s.title ?? '').trim();
        return label ? { id, label } : null;
      }
      const label = String(s ?? '').trim();
      return label ? { id: `slot${i + 1}`, label } : null;
    })
    .filter(Boolean);
}

export function parseDragChoices(raw) {
  if (Array.isArray(raw)) return raw.map((x) => String(x ?? '').trim()).filter(Boolean);
  return String(raw || '')
    .split(/[|;\n]/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function normalizeDragAnswerMap(raw, slots) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const slot of slots) {
    const v = raw[slot.id];
    if (v != null && String(v).trim()) out[slot.id] = String(v).trim();
  }
  return out;
}

export function dragDropAnswerOk(correctAnswer, userAnswer, slots) {
  const correct = normalizeDragAnswerMap(correctAnswer, slots);
  const user = normalizeDragAnswerMap(userAnswer, slots);
  const keys = slots.map((s) => s.id);
  return keys.every((k) => (correct[k] || '') === (user[k] || ''));
}

/** Đoạn văn có chỗ trống — dùng {{1}}, {{2}} hoặc ___1___ */
export function splitPassageBlankParts(passage) {
  const text = String(passage ?? '');
  const parts = [];
  const re = /\{\{(\d+)\}\}|___(\d+)___/g;
  let last = 0;
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ kind: 'text', value: text.slice(last, match.index) });
    }
    parts.push({ kind: 'blank', id: String(match[1] || match[2]) });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ kind: 'text', value: text.slice(last) });
  return parts;
}

export function extractBlankIdsFromPassage(passage) {
  const ids = [];
  for (const p of splitPassageBlankParts(passage)) {
    if (p.kind === 'blank' && !ids.includes(p.id)) ids.push(p.id);
  }
  return ids;
}

export function parseFillBlanksSpec(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((b, i) => {
        if (b && typeof b === 'object') {
          return {
            id: String(b.id ?? i + 1).trim(),
            correctAnswer: String(b.correctAnswer ?? b.answer ?? '').trim(),
          };
        }
        return { id: String(i + 1), correctAnswer: String(b ?? '').trim() };
      })
      .filter((b) => b.id);
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([id, ans]) => ({
      id: String(id).trim(),
      correctAnswer: String(ans ?? '').trim(),
    }));
  }
  return [];
}

export function parseFillBlanksCorrectRaw(raw) {
  const out = [];
  const s = String(raw ?? '').trim();
  if (!s) return out;
  const parts = s.split(/[;；]/g).map((x) => x.trim()).filter(Boolean);
  for (const p of parts) {
    const m = p.match(/^(\d+)\s*=\s*(.+)$/);
    if (m) out.push({ id: m[1], correctAnswer: m[2].trim() });
  }
  return out;
}

/** Textarea hiển thị đáp án điền chỗ trống (mỗi dòng 1=…). */
export function formatFillBlanksAnswersText(blanks) {
  return (Array.isArray(blanks) ? blanks : [])
    .map((b) =>
      typeof b === 'object'
        ? `${b.id}=${b.correctAnswer ?? b.answer ?? ''}`
        : String(b ?? '')
    )
    .join('\n');
}

/**
 * Parse ô đáp án điền chỗ trống khi đang gõ.
 * Giữ dòng trống / dòng chưa đủ dạng id=… trong bản nháp (để Enter xuống dòng được).
 */
export function parseFillBlanksAnswersText(raw) {
  const blanksText = String(raw ?? '');
  const blanks = blanksText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(\d+)\s*=\s*(.+)$/);
      if (m) return { id: m[1], correctAnswer: m[2].trim() };
      const m2 = l.match(/^([^=]+)=\s*(.+)$/);
      if (m2) return { id: m2[1].trim(), correctAnswer: m2[2].trim() };
      return null;
    })
    .filter(Boolean);
  return { blanks, blanksText };
}

export function normalizeFillBlanksQuestion(p) {
  const passage = (p?.passage ?? '').toString().trim();
  const question = (p?.question ?? p?.content ?? '').toString().trim();
  const passageText = passage || (/\{\{\d+\}\}|___\d+___/.test(question) ? question : '');
  const intro = passage && question && question !== passage ? question : '';
  let blanks = parseFillBlanksSpec(p?.blanks);
  if (!blanks.length && p?.correctAnswer && typeof p.correctAnswer === 'object' && !Array.isArray(p.correctAnswer)) {
    blanks = parseFillBlanksSpec(p.correctAnswer);
  }
  const ids = extractBlankIdsFromPassage(passageText);
  if (ids.length) {
    const byId = Object.fromEntries(blanks.map((b) => [b.id, b.correctAnswer]));
    blanks = ids.map((id) => ({ id, correctAnswer: byId[id] || '' }));
  }
  return { passage: passageText, question: intro, blanks };
}

export function fillBlanksAnswerOk(blanks, userAnswer) {
  const list = Array.isArray(blanks) ? blanks : [];
  if (!list.length) return false;
  const user = userAnswer && typeof userAnswer === 'object' ? userAnswer : {};
  return list.every((b) => {
    const u = String(user[b.id] ?? '').trim();
    if (!u) return false;
    return inputAnswerLooseOk(b.correctAnswer, u);
  });
}

export function inputAnswerLooseOk(rawCorrect, rawUser) {
  const u0 = (rawUser ?? '').toString().trim();
  if (!u0) return false;

  const normalizeLoose = (s) =>
    (s ?? '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
      .replace(/[，]/g, ',')
      .replace(/[；]/g, ';')
      .replace(/\s+/g, '')
      .replace(/^[\(\[\{]+/, '')
      .replace(/[\)\]\}]+$/, '')
      .replace(/,+/g, ',')
      .replace(/;+?/g, ';');

  const u = normalizeLoose(u0);
  const parts = (rawCorrect ?? '')
    .toString()
    .split(/[|;]/g)
    .map((x) => x.trim())
    .filter(Boolean);
  if (!parts.length) return false;
  const uNum = Number(u0.replace(',', '.'));
  const uIsNum = Number.isFinite(uNum);
  for (const p of parts) {
    const p0 = p.toString().trim();
    if (!p0) continue;
    if (normalizeLoose(p0) === u) return true;
    const pNum = Number(p0.replace(',', '.'));
    if (uIsNum && Number.isFinite(pNum) && Math.abs(uNum - pNum) <= 1e-9) return true;
  }
  return false;
}

/**
 * Nhiều ô nhập cho loại input (vd. hệ PT: x và y).
 * Mỗi phần: { id, placeholder, correctAnswer } — correctAnswer có thể dùng | hoặc ; cho biến thể.
 * Tương thích cũ: chỉ có correctAnswer (+ answerPlaceholder) → 1 ô.
 */
export function normalizeInputAnswerParts(p) {
  if (Array.isArray(p?.answerParts) && p.answerParts.length > 0) {
    return p.answerParts
      .map((part, i) => {
        if (!part || typeof part !== 'object') {
          const s = String(part ?? '').trim();
          return s ? { id: String(i + 1), placeholder: '', correctAnswer: s } : null;
        }
        const id = String(part.id ?? i + 1).trim() || String(i + 1);
        return {
          id,
          placeholder: String(part.placeholder ?? part.label ?? '').trim(),
          correctAnswer: String(part.correctAnswer ?? part.answer ?? '').trim(),
        };
      })
      .filter(Boolean);
  }
  const correct = String(p?.correctAnswer ?? p?.shortCorrect ?? '').trim();
  const ph = String(p?.answerPlaceholder ?? '').trim();
  return [{ id: '1', placeholder: ph, correctAnswer: correct }];
}

export function formatInputCorrectAnswerDisplay(q) {
  const parts = normalizeInputAnswerParts(q);
  const firstVariant = (s) =>
    String(s || '')
      .split(/[|;]/g)
      .map((x) => x.trim())
      .filter(Boolean)[0] || String(s || '').trim();

  if (parts.length <= 1) {
    return firstVariant(parts[0]?.correctAnswer || q?.correctAnswer || '');
  }
  return parts
    .map((part) => {
      const label = (part.placeholder || part.id || '').replace(/\s*[?=…·.]+$/u, '').trim() || part.id;
      return `${label} ${firstVariant(part.correctAnswer)}`.trim();
    })
    .join('; ');
}

/** Lấy giá trị từng ô từ answer (string cũ hoặc object { id: value }). */
export function resolveInputPartValues(parts, userAnswer) {
  const list = Array.isArray(parts) ? parts : [];
  const out = {};
  if (userAnswer && typeof userAnswer === 'object' && !Array.isArray(userAnswer)) {
    for (const part of list) {
      out[part.id] = String(userAnswer[part.id] ?? '').trim();
    }
    return out;
  }
  const s = String(userAnswer ?? '');
  if (list.length === 1) {
    out[list[0].id] = s;
    return out;
  }
  // Chuỗi cũ "a; b" → gán lần lượt
  const chunks = s.split(/[;|]/g).map((x) => x.trim());
  list.forEach((part, i) => {
    out[part.id] = chunks[i] ?? '';
  });
  return out;
}

export function inputPartsAnswerOk(parts, userAnswer) {
  const list = Array.isArray(parts) ? parts : [];
  if (!list.length) return false;
  const values = resolveInputPartValues(list, userAnswer);
  return list.every((part) => inputAnswerLooseOk(part.correctAnswer, values[part.id]));
}

/**
 * Chuẩn hóa đáp án TN về chỉ số 0–3.
 * Firestore/import hay lưu "3" hoặc "D" trong khi UI lưu số 3 → so sánh === bị sai.
 */
export function normalizeMcqCorrectIndex(raw, optionsLength = 4) {
  const len = Math.max(0, Number(optionsLength) || 0);
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const n = Math.trunc(raw);
    if (n >= 0 && (len === 0 || n < len)) return n;
    return -1;
  }
  const s = String(raw ?? '')
    .trim()
    .replace(/^__\s*|\s*__$/g, '');
  if (!s) return -1;
  const letter = s.match(/^([A-D])(?:\s*[).\:]?\s*)?$/i);
  if (letter) {
    const idx = letter[1].toUpperCase().charCodeAt(0) - 65;
    if (len === 0 || idx < len) return idx;
    return -1;
  }
  const asNum = Number(s);
  if (Number.isInteger(asNum) && asNum >= 0 && (len === 0 || asNum < len)) return asNum;
  return -1;
}

export function scorePracticeQuestion(q, userAnswer) {
  const t = q?.type;
  if (t === 'mcq' || t === 'multiple_choice') {
    const optsLen = Array.isArray(q?.options) ? q.options.length : 4;
    const expected = normalizeMcqCorrectIndex(q?.correctAnswer, optsLen);
    const got = normalizeMcqCorrectIndex(userAnswer, optsLen);
    return expected >= 0 && got >= 0 && expected === got;
  }
  if (t === 'input' || t === 'short_answer') {
    const parts = normalizeInputAnswerParts({
      ...q,
      correctAnswer: q?.correctAnswer ?? q?.shortCorrect,
    });
    return inputPartsAnswerOk(parts, userAnswer);
  }
  if (t === 'true_false') {
    const expected = normalizeTrueFalseAnswer(q.correctAnswer);
    const got = normalizeTrueFalseAnswer(userAnswer);
    return expected != null && got === expected;
  }
  if (t === 'true_false_group') {
    const items = Array.isArray(q?.tfItems) ? q.tfItems : [];
    if (!items.length) return false;
    const obj = userAnswer && typeof userAnswer === 'object' && !Array.isArray(userAnswer) ? userAnswer : null;
    if (!obj) return false;
    return items.every((it) => {
      const key = String(it?.key || '').toLowerCase();
      const expected = normalizeTrueFalseAnswer(it?.correct);
      if (expected == null) return false;
      return obj[key] === expected;
    });
  }
  if (t === 'ordering') {
    const items = parseOrderingItems(q.items);
    const correctOrder = parseOrderingCorrectOrder(q.correctOrder ?? q.correctAnswer, items.length);
    return orderingAnswerOk(correctOrder, userAnswer);
  }
  if (t === 'drag_drop') {
    const slots = parseDragSlots(q.slots);
    return dragDropAnswerOk(q.correctAnswer, userAnswer, slots);
  }
  if (t === 'fill_blanks') {
    const { blanks } = normalizeFillBlanksQuestion(q);
    return fillBlanksAnswerOk(blanks, userAnswer);
  }
  return false;
}

export function preparePracticeQuestion(q) {
  const type = q?.type;
  if (type === 'mcq' || type === 'multiple_choice') {
    const opts = Array.isArray(q?.options) ? q.options : [];
    const idx = normalizeMcqCorrectIndex(q?.correctAnswer, opts.length || 4);
    return { ...q, type: 'mcq', options: opts, correctAnswer: idx >= 0 ? idx : 0 };
  }
  if (type === 'true_false_group') {
    return { ...q, tfItems: normalizePracticeTfItems(q?.tfItems) };
  }
  if (type === 'ordering') {
    const items = parseOrderingItems(q.items);
    const correctOrder = parseOrderingCorrectOrder(q.correctOrder ?? q.correctAnswer, items.length);
    return { ...q, items, correctOrder };
  }
  if (type === 'drag_drop') {
    const slots = parseDragSlots(q.slots);
    const choices = parseDragChoices(q.choices);
    return { ...q, slots, choices };
  }
  if (type === 'fill_blanks') {
    const fb = normalizeFillBlanksQuestion(q);
    return { ...q, ...fb };
  }
  if (type === 'input' || type === 'short_answer') {
    return {
      ...q,
      type: 'input',
      correctAnswer: q.correctAnswer ?? q.shortCorrect,
      answerParts: normalizeInputAnswerParts({
        ...q,
        correctAnswer: q.correctAnswer ?? q.shortCorrect,
      }),
    };
  }
  return { ...q };
}

export const PRACTICE_ALL_TYPES = [
  'mcq',
  'input',
  'true_false',
  'true_false_group',
  'ordering',
  'drag_drop',
  'fill_blanks',
];

/** Chuẩn hóa mệnh đề đúng/sai a–d (luôn xếp theo a → b → c → d). */
export function normalizePracticeTfItems(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const mapped = list
    .filter((it) => it && ((it.text || '').toString().trim() || typeof it.correct === 'boolean'))
    .map((it, i) => {
      const key = String(it.key || String.fromCharCode(97 + i))
        .trim()
        .toLowerCase()
        .slice(0, 1);
      const tf = normalizeTrueFalseAnswer(it.correct);
      return {
        key: /^[a-d]$/.test(key) ? key : String.fromCharCode(97 + i),
        text: (it.text || '').toString().trim(),
        correct: tf === false ? false : true,
      };
    });
  const order = { a: 0, b: 1, c: 2, d: 3 };
  return mapped.sort((x, y) => (order[x.key] ?? 99) - (order[y.key] ?? 99));
}

/** Chuẩn hóa một câu practice từ JSON/Firestore — giữ đủ field cho mọi loại tương tác */
export function normalizePracticeQuestion(p, index = 0) {
  let rawType = String(p?.type || 'mcq').trim();
  // Legacy: tự luận (text) → nhập đáp án
  if (rawType === 'text') rawType = 'input';
  const type = PRACTICE_ALL_TYPES.includes(rawType) ? rawType : 'mcq';
  const base = {
    id: p?.id || `pr_${index}`,
    type,
    question: (p?.question ?? p?.content ?? '').toString(),
    hint: (p?.hint ?? p?.guidance ?? '').toString().trim(),
    hintVideoUrl: (p?.hintVideoUrl ?? p?.hint_video_url ?? p?.guidanceVideoUrl ?? '').toString().trim(),
    explanation: (p?.explanation ?? '').toString().trim(),
  };

  if (type === 'mcq') {
    const options = Array.isArray(p?.options) ? p.options : [];
    const idx = normalizeMcqCorrectIndex(p?.correctAnswer, options.length || 4);
    return {
      ...base,
      options,
      correctAnswer: idx >= 0 ? idx : 0,
    };
  }
  if (type === 'input') {
    const answerParts = normalizeInputAnswerParts(p);
    return {
      ...base,
      correctAnswer: p?.correctAnswer,
      answerPlaceholder: (p?.answerPlaceholder ?? '').toString(),
      answerParts,
    };
  }
  if (type === 'true_false') {
    const tf = p?.correctAnswer === false ? false : normalizeTrueFalseAnswer(p?.correctAnswer);
    return { ...base, correctAnswer: tf === false ? false : true };
  }
  if (type === 'true_false_group') {
    return { ...base, tfItems: normalizePracticeTfItems(p?.tfItems) };
  }
  if (type === 'ordering') {
    const items = parseOrderingItems(p?.items);
    return {
      ...base,
      items,
      correctOrder: parseOrderingCorrectOrder(p?.correctOrder ?? p?.correctAnswer, items.length),
    };
  }
  if (type === 'drag_drop') {
    return {
      ...base,
      slots: parseDragSlots(p?.slots),
      choices: parseDragChoices(p?.choices),
      correctAnswer: p?.correctAnswer && typeof p.correctAnswer === 'object' ? p.correctAnswer : {},
    };
  }
  if (type === 'fill_blanks') {
    const fb = normalizeFillBlanksQuestion(p);
    const blanks = fb.blanks;
    const out = {
      ...base,
      question: fb.question || base.question,
      passage: fb.passage,
      blanks,
    };
    // Luôn giữ chuỗi thô đang gõ (Enter / khoảng trắng). Không để undefined.
    out.blanksText =
      p?.blanksText != null ? String(p.blanksText) : formatFillBlanksAnswersText(blanks);
    return out;
  }
  return base;
}

export function normalizePracticeList(practice) {
  const list = Array.isArray(practice) ? practice : [];
  return list.map((p, i) => normalizePracticeQuestion(p, i));
}
