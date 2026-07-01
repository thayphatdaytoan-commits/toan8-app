/** Slug & URL helpers for bài giảng (SEO). */

export function slugifyVi(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildLessonSlug({ grade_level, chapter, lesson_no, title }) {
  const g = String(grade_level || '').trim();
  const ch = slugifyVi(chapter);
  const bn = slugifyVi(lesson_no);
  const tt = slugifyVi(title);
  const core = [g ? `toan-${g}` : 'toan', ch ? `chuong-${ch}` : null, bn ? `bai-${bn}` : null, tt || null]
    .filter(Boolean)
    .join('-');
  return core || `bai-giang-${Date.now()}`;
}

/**
 * Giữ slug đã lưu; chỉ khi tạo slug mới: nếu trùng slug khác → thêm -2, -3… hoặc hậu tố id ngắn.
 * @param {string} baseSlug
 * @param {string|null|undefined} currentId  id Firestore của bài đang sửa (bỏ qua khi đếm trùng)
 * @param {{ id?: string, slug?: string }[]} lessonsList
 */
export function ensureUniqueLessonSlug(baseSlug, currentId, lessonsList) {
  const norm = (s) => String(s || '').trim().toLowerCase();
  const base = norm(baseSlug);
  if (!base) return `bai-giang-${Date.now()}`;
  const others = (lessonsList || []).filter((l) => l && l.id && l.id !== currentId);
  const taken = new Set(others.map((l) => norm(l.slug)));
  if (!taken.has(base)) return String(baseSlug).trim();

  let n = 2;
  while (n < 500) {
    const candidate = `${baseSlug}-${n}`;
    if (!taken.has(norm(candidate))) return candidate;
    n += 1;
  }
  const tail = String(currentId || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-8);
  const fallback = tail ? `${baseSlug}-${tail}` : `${baseSlug}-${Date.now().toString(36)}`;
  return taken.has(norm(fallback)) ? `${fallback}-x` : fallback;
}
