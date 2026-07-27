/** Thư mục tài liệu + chuyên mục blog */

export const DOC_FOLDERS = [
  { id: 'grade_6', label: 'Toán 6', short: 'TÀI LIỆU TOÁN 6' },
  { id: 'grade_7', label: 'Toán 7', short: 'TÀI LIỆU TOÁN 7' },
  { id: 'grade_8', label: 'Toán 8', short: 'TÀI LIỆU TOÁN 8' },
  { id: 'grade_9', label: 'Toán 9', short: 'TÀI LIỆU TOÁN 9' },
  { id: 'grade_10', label: 'Toán 10', short: 'TÀI LIỆU TOÁN 10' },
  { id: 'grade_11', label: 'Toán 11', short: 'TÀI LIỆU TOÁN 11' },
  { id: 'grade_12', label: 'Toán 12', short: 'TÀI LIỆU TOÁN 12' },
  { id: 'tuyen_sinh_10', label: 'Thi tuyển sinh 10', short: 'TUYỂN SINH 10' },
  { id: 'thpt', label: 'Thi THPT', short: 'THI THPT' },
  { id: 'hsg', label: 'Học sinh giỏi', short: 'HỌC SINH GIỎI' },
  { id: 'other', label: 'Khác', short: 'KHÁC' },
];

export const BLOG_CATEGORIES = [
  { id: 'blog_toan', label: 'Blog Toán Học', tag: 'BLOG TOÁN HỌC' },
  { id: 'bai_viet', label: 'Bài viết khác', tag: 'BÀI VIẾT KHÁC' },
  { id: 'thi_cu', label: 'Thi cử', tag: 'THI CỬ' },
  { id: 'huong_dan', label: 'Hướng dẫn', tag: 'HƯỚNG DẪN' },
];

export const COMPETITION_LOGOS = [
  'TIMO', 'HKIMO', 'BBB', 'FMO', 'IKMC', 'ITMC',
  'SASMO', 'SEAMO', 'ASMO', 'IMAS', 'IMC', 'AMC',
];

export function folderLabel(id) {
  return DOC_FOLDERS.find((f) => f.id === id)?.label || id;
}

export function folderShort(id) {
  return DOC_FOLDERS.find((f) => f.id === id)?.short || id;
}

export function blogCategoryMeta(id) {
  return BLOG_CATEGORIES.find((c) => c.id === id) || BLOG_CATEGORIES[0];
}

export function slugifyContent(title) {
  return String(title || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || `bai-${Date.now().toString(36)}`;
}

export function formatDocDate(isoOrMs) {
  try {
    const d = typeof isoOrMs === 'number' ? new Date(isoOrMs) : new Date(isoOrMs);
    if (Number.isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  } catch {
    return '';
  }
}

export function formatBlogMonth(isoOrMs) {
  try {
    const d = typeof isoOrMs === 'number' ? new Date(isoOrMs) : new Date(isoOrMs);
    if (Number.isNaN(d.getTime())) return '';
    return `tháng ${d.getMonth() + 1}`;
  } catch {
    return '';
  }
}

/** Ảnh đầu tiên trong markdown ![alt](url) */
export function firstMarkdownImageUrl(text) {
  const m = String(text || '').match(/!\[[^\]]*\]\(\s*([^)\s]+)\s*\)/);
  return m?.[1] ? String(m[1]).trim() : '';
}

const PLACEHOLDER_THUMBS = new Set([
  '',
  '/contest-thumb-1.svg',
  '/contest-thumb-2.svg',
  '/contest-thumb-3.svg',
]);

/** Thumbnail bài blog: ảnh tải lên → ảnh trong nội dung → logo MathEdu */
export function resolveBlogThumbnail(post) {
  const t = String(post?.thumbnail || '').trim();
  if (t && !PLACEHOLDER_THUMBS.has(t)) return t;
  const fromContent = firstMarkdownImageUrl(post?.content || '');
  if (fromContent) return fromContent;
  return '/mathedu-logo.png';
}
