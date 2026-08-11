/* eslint-disable */
/** Cấu hình Level học sinh theo tổng EXP */

export const LEVEL_CONFIG_DOC_ID = 'main';

/** Mặc định: Level 1…10 */
export const DEFAULT_LEVEL_THRESHOLDS = [
  { level: 1, minExp: 0 },
  { level: 2, minExp: 50 },
  { level: 3, minExp: 150 },
  { level: 4, minExp: 300 },
  { level: 5, minExp: 500 },
  { level: 6, minExp: 800 },
  { level: 7, minExp: 1200 },
  { level: 8, minExp: 1800 },
  { level: 9, minExp: 2500 },
  { level: 10, minExp: 3500 },
];

export function normalizeLevelThresholds(raw) {
  const list = Array.isArray(raw) ? raw : DEFAULT_LEVEL_THRESHOLDS;
  const cleaned = list
    .map((t, i) => ({
      level: Math.max(1, Math.round(Number(t?.level) || i + 1)),
      minExp: Math.max(0, Math.round(Number(t?.minExp) || 0)),
    }))
    .sort((a, b) => a.level - b.level || a.minExp - b.minExp);
  if (!cleaned.length) return DEFAULT_LEVEL_THRESHOLDS.map((x) => ({ ...x }));
  // Đảm bảo Level 1 = 0
  cleaned[0] = { ...cleaned[0], level: 1, minExp: 0 };
  return cleaned.map((t, i) => ({ ...t, level: i + 1 }));
}

/** Level từ tổng EXP (thresholds đã sort tăng dần) */
export function levelFromExp(totalExp, thresholds = DEFAULT_LEVEL_THRESHOLDS) {
  const list = normalizeLevelThresholds(thresholds);
  const exp = Math.max(0, Math.round(Number(totalExp) || 0));
  let lvl = list[0]?.level || 1;
  for (const t of list) {
    if (exp >= t.minExp) lvl = t.level;
    else break;
  }
  return lvl;
}

export function thresholdForLevel(level, thresholds = DEFAULT_LEVEL_THRESHOLDS) {
  const list = normalizeLevelThresholds(thresholds);
  return list.find((t) => t.level === level) || list[0];
}

export function maxLevel(thresholds = DEFAULT_LEVEL_THRESHOLDS) {
  const list = normalizeLevelThresholds(thresholds);
  return list[list.length - 1]?.level || 1;
}

/**
 * Delta EXP để đưa tổng hiện tại về đúng ngưỡng Level đích.
 * (Lên/xuống Level admin)
 */
export function expDeltaToTargetLevel(totalExp, targetLevel, thresholds = DEFAULT_LEVEL_THRESHOLDS) {
  const t = thresholdForLevel(targetLevel, thresholds);
  if (!t) return 0;
  return Math.round(t.minExp - (Number(totalExp) || 0));
}

/** Đầu tuần (Thứ 2 00:00 local) */
export function startOfWeekMs(now = Date.now()) {
  const d = new Date(now);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d.getTime();
}
