import { normalizeCognitiveLevel, normalizeQuestionType, normalizeTopicTags } from './questionBank';

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export function matchesSelectedTags(bankQuestion, selectedTags) {
  const want = normalizeTopicTags(selectedTags);
  if (want.length === 0) return true;
  const have = normalizeTopicTags(bankQuestion?.topic_tags);
  return want.every((t) => have.includes(t));
}

export function groupBankQuestions(bankQuestions) {
  const m = new Map();
  (bankQuestions || []).forEach((q) => {
    const key = `${normalizeCognitiveLevel(q?.cognitive_level)}::${normalizeQuestionType(q?.q_type)}`;
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(q);
  });
  return m;
}

export function computeAvailabilityByCell(bankQuestions, selectedTags) {
  const filtered = (bankQuestions || []).filter((q) => matchesSelectedTags(q, selectedTags));
  const g = groupBankQuestions(filtered);
  const out = new Map();
  g.forEach((arr, key) => out.set(key, arr.length));
  return out;
}

/**
 * matrixCounts: { [cogLevel]: { [qType]: number } }
 * filters: { grade_level?, chapter?, lesson_no?, category? }
 */
export function pickQuestionsByMatrix({ bankQuestions, matrixCounts, selectedTags, filters }) {
  const f = filters || {};
  const filtered = (bankQuestions || []).filter((q) => {
    if (f.grade_level && String(q.grade_level || '').trim() !== String(f.grade_level).trim()) return false;
    if (f.chapter && String(q.chapter || '').trim() !== String(f.chapter).trim()) return false;
    if (f.lesson_no && String(q.lesson_no || '').trim() !== String(f.lesson_no).trim()) return false;
    if (f.category && String(q.category || '').trim() !== String(f.category).trim()) return false;
    if (!matchesSelectedTags(q, selectedTags)) return false;
    return true;
  });

  const g = groupBankQuestions(filtered);
  const used = new Set();
  const picked = [];
  const missing = [];

  Object.entries(matrixCounts || {}).forEach(([cog, cols]) => {
    Object.entries(cols || {}).forEach(([qt, nRaw]) => {
      const need = Math.max(0, Number(nRaw) || 0);
      if (!need) return;
      const key = `${normalizeCognitiveLevel(cog)}::${normalizeQuestionType(qt)}`;
      const pool = (g.get(key) || []).filter((x) => !used.has(x.id));
      shuffleInPlace(pool);
      const got = pool.slice(0, need);
      got.forEach((x) => used.add(x.id));
      picked.push(...got);
      if (got.length < need) {
        missing.push({ cognitive_level: normalizeCognitiveLevel(cog), q_type: normalizeQuestionType(qt), need, got: got.length });
      }
    });
  });

  return { picked, missing };
}

export function randomizeOrder(arr) {
  return shuffleInPlace([...(arr || [])]);
}

/**
 * rows: [{ grade_level, chapter, topic, cells: { [cog]: { count, q_type } } }]
 */
export function pickQuestionsByRows({ bankQuestions, rows }) {
  const used = new Set();
  const picked = [];
  const missing = [];

  const list = Array.isArray(bankQuestions) ? bankQuestions : [];
  const rowList = Array.isArray(rows) ? rows : [];

  const filterRowPool = (row) => {
    const gl = String(row?.grade_level || '').trim();
    const ch = String(row?.chapter || '').trim();
    const tp = String(row?.topic || '').trim();
    return list.filter((q) => {
      if (gl && String(q.grade_level || '').trim() !== gl) return false;
      if (ch && String(q.chapter || '').trim() !== ch) return false;
      if (tp) {
        const tags = normalizeTopicTags(q?.topic_tags);
        if (!tags.includes(tp)) return false;
      }
      return true;
    });
  };

  rowList.forEach((row, rowIdx) => {
    const pool = filterRowPool(row);
    const cells = row?.cells || {};
    Object.entries(cells).forEach(([cogRaw, cell]) => {
      const need = Math.max(0, Number(cell?.count) || 0);
      if (!need) return;
      const cog = normalizeCognitiveLevel(cogRaw);
      const qt = normalizeQuestionType(cell?.q_type);
      const candidates = pool.filter((q) => normalizeCognitiveLevel(q?.cognitive_level) === cog && normalizeQuestionType(q?.q_type) === qt);
      const avail = candidates.filter((q) => !used.has(q.id));
      shuffleInPlace(avail);
      const got = avail.slice(0, need);
      got.forEach((q) => used.add(q.id));
      picked.push(...got);
      if (got.length < need) {
        missing.push({ row: rowIdx + 1, cognitive_level: cog, q_type: qt, need, got: got.length });
      }
    });
  });

  return { picked, missing };
}

