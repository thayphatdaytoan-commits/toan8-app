/** Bốn cấp độ trên bản đồ tiến độ (KooBits-style). */
export const REVIEW_LEVELS = [
  {
    id: 'nen_tang',
    label: 'Nền tảng',
    shortLabel: 'Nền tảng',
    emoji: '🌱',
    accent: '#22c55e',
    ring: '#86efac',
    bg: 'from-emerald-400 to-green-600',
  },
  {
    id: 'luyen_tap',
    label: 'Luyện tập',
    shortLabel: 'Luyện tập',
    emoji: '💪',
    accent: '#f59e0b',
    ring: '#fcd34d',
    bg: 'from-amber-400 to-orange-500',
  },
  {
    id: 'nang_cao',
    label: 'Nâng cao',
    shortLabel: 'Nâng cao',
    emoji: '🚀',
    accent: '#8b5cf6',
    ring: '#c4b5fd',
    bg: 'from-violet-400 to-purple-600',
  },
  {
    id: 'thu_thach',
    label: 'Thử thách',
    shortLabel: 'Thử thách',
    emoji: '👑',
    accent: '#ef4444',
    ring: '#fca5a5',
    bg: 'from-rose-400 to-red-600',
  },
];

const LEVEL_ALIASES = {
  nen_tang: ['nen tang', 'nền tảng', 'de', 'dễ', 'do', 'dễ', 'foundation', 'basic', '1'],
  luyen_tap: ['luyen tap', 'luyện tập', 'tb', 'trung bình', 'intermediate', 'practice', '2'],
  nang_cao: ['nang cao', 'nâng cao', 'kho', 'khó', 'advanced', '3'],
  thu_thach: ['thu thach', 'thử thách', 'rat kho', 'rất khó', 'master', 'challenge', '4'],
};

function normLevelText(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/** Chuẩn hóa giá trị CẤP_ĐỘ từ TXT → id cấp độ. */
export function parseReviewLevelId(raw) {
  const x = normLevelText(raw);
  if (!x) return 'nen_tang';
  for (const lv of REVIEW_LEVELS) {
    const aliases = LEVEL_ALIASES[lv.id] || [];
    if (aliases.some((a) => x === normLevelText(a) || x.includes(normLevelText(a)))) {
      return lv.id;
    }
  }
  if (x.includes('thu') || x.includes('challenge') || x.includes('master')) return 'thu_thach';
  if (x.includes('nang') || x.includes('advanced') || x.includes('kho')) return 'nang_cao';
  if (x.includes('luyen') || x.includes('practice') || x.includes('tb')) return 'luyen_tap';
  return 'nen_tang';
}

/** Câu không ghi CẤP_ĐỘ trong TXT → mặc định Nền tảng (hiện hết trên lộ trình cấp 1). */
export function defaultLevelForQuestionIndex(_qi) {
  return 'nen_tang';
}

/** Lấy tất cả bước câu hỏi của chủ đề, sắp theo thứ tự câu. */
export function getAllQuestionStepNodes(steps, topic) {
  const qs = Array.isArray(topic?.questions) ? topic.questions : [];
  const nodes = [];
  (steps || []).forEach((step, stepIndex) => {
    if (step?.kind !== 'question') return;
    const qi = step.questionIndex ?? 0;
    const q = qs[qi] || step.question || {};
    const levelId = q.level ? parseReviewLevelId(q.level) : defaultLevelForQuestionIndex(qi);
    nodes.push({
      stepIndex,
      stepId: step.id,
      label: step.title || q.label || `Câu ${qi + 1}`,
      questionIndex: qi,
      levelId,
      displayNum: qi + 1,
    });
  });
  return nodes.sort((a, b) => a.questionIndex - b.questionIndex);
}

export function getLevelMeta(levelId) {
  return REVIEW_LEVELS.find((l) => l.id === levelId) || REVIEW_LEVELS[0];
}

/**
 * Gom các bước câu hỏi theo cấp độ.
 * @returns {Record<string, Array<{ stepIndex: number, stepId: string, label: string, questionIndex: number }>>}
 */
export function groupQuestionStepsByLevel(steps, topic) {
  const buckets = Object.fromEntries(REVIEW_LEVELS.map((l) => [l.id, []]));
  const qs = Array.isArray(topic?.questions) ? topic.questions : [];

  (steps || []).forEach((step, stepIndex) => {
    if (step?.kind !== 'question') return;
    const qi = step.questionIndex ?? 0;
    const q = qs[qi] || step.question || {};
    const levelId = q.level ? parseReviewLevelId(q.level) : defaultLevelForQuestionIndex(qi);
    buckets[levelId].push({
      stepIndex,
      stepId: step.id,
      label: step.title || `Câu ${qi + 1}`,
      questionIndex: qi,
    });
  });

  return buckets;
}

/** Cấp trước đã hoàn thành hết câu hỏi chưa (để mở khóa). */
export function isReviewLevelUnlocked(levelId, levelBuckets, completedStepIds) {
  const idx = REVIEW_LEVELS.findIndex((l) => l.id === levelId);
  if (idx <= 0) return true;
  for (let i = 0; i < idx; i += 1) {
    const prev = REVIEW_LEVELS[i].id;
    const nodes = levelBuckets[prev] || [];
    if (nodes.length === 0) continue;
    const allDone = nodes.every((n) => completedStepIds.includes(n.stepId));
    if (!allDone) return false;
  }
  return true;
}
