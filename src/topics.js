/* eslint-disable */

export function slugifyTopicId(name) {
  const s = String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const base = s || 'chuyen-de';
  const salt = Math.random().toString(36).slice(2, 6);
  return `${base}-${salt}`;
}

export function lessonNumKey(raw) {
  const m = String(raw ?? '').match(/(\d+(?:[.,]\d+)?)/);
  return m ? parseFloat(m[1].replace(',', '.')) : Number.MAX_SAFE_INTEGER;
}

/**
 * Gom các bài giảng theo chuyên đề dựa trên trường topic_id / topic_name.
 * Tuỳ chọn: lọc theo grade (nếu truyền vào).
 * Trả về mảng: [{ id, name, grade_level, lessons: [...] }]
 */
export function deriveTopicsFromLessons(lessons, { grade = null } = {}) {
  const grouped = new Map();
  for (const l of lessons || []) {
    const tid = (l?.topic_id || '').toString().trim();
    if (!tid) continue;
    if (grade != null && String(l?.grade_level || '').trim() && String(l.grade_level).trim() !== String(grade).trim())
      continue;
    if (!grouped.has(tid)) {
      grouped.set(tid, {
        id: tid,
        name: (l.topic_name || tid).toString(),
        grade_level: (l.grade_level || '').toString(),
        lessons: [],
      });
    }
    grouped.get(tid).lessons.push(l);
  }
  const arr = Array.from(grouped.values());
  arr.forEach((t) => {
    t.lessons.sort((a, b) => {
      const ka = lessonNumKey(a.lesson_no);
      const kb = lessonNumKey(b.lesson_no);
      if (ka !== kb) return ka - kb;
      return String(a.title || '').localeCompare(String(b.title || ''), 'vi');
    });
  });
  arr.sort((a, b) => String(a.name).localeCompare(String(b.name), 'vi'));
  return arr;
}

/** Danh sách topic hiện có (unique) — dùng cho select trong admin. */
export function listExistingTopics(lessons, { grade = null } = {}) {
  const map = new Map();
  for (const l of lessons || []) {
    const tid = (l?.topic_id || '').toString().trim();
    if (!tid) continue;
    if (grade != null && String(l?.grade_level || '').trim() && String(l.grade_level).trim() !== String(grade).trim())
      continue;
    if (!map.has(tid)) {
      map.set(tid, { id: tid, name: (l.topic_name || tid).toString(), grade_level: (l.grade_level || '').toString() });
    }
  }
  return Array.from(map.values()).sort((a, b) => String(a.name).localeCompare(String(b.name), 'vi'));
}

/** Icon màu gợi ý theo chuyên đề (ổn định theo id). */
export function pickTopicTheme(id) {
  const list = ['blue', 'indigo', 'purple', 'emerald', 'orange', 'rose', 'cyan'];
  const s = String(id || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}

export const TOPIC_COLOR_THEMES = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-100' },
};
