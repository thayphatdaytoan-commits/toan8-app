import { SGK_TOC_BY_GRADE } from './sgkTocData.js';

function parseNumSortKey(v) {
  const s = String(v ?? '').trim();
  if (/^OT\d+$/i.test(s)) {
    const n = parseInt(s.slice(2), 10);
    return Number.isFinite(n) ? n + 0.5 : null;
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function normalizeGrade(grade) {
  return String(grade ?? '').trim();
}

/** Danh sách chương SGK của một lớp (6–12). */
export function getSgkChapters(grade) {
  const g = normalizeGrade(grade);
  const block = SGK_TOC_BY_GRADE[g];
  if (!block?.chapters?.length) return [];
  return block.chapters.map((ch) => ({
    no: ch.no,
    roman: ch.roman,
    title: ch.title,
    label: `Chương ${ch.roman} — ${ch.title}`,
  }));
}

/** Danh sách bài SGK trong một chương. */
export function getSgkLessons(grade, chapterNo) {
  const g = normalizeGrade(grade);
  const ch = String(chapterNo ?? '').trim();
  if (!ch) return [];
  const block = SGK_TOC_BY_GRADE[g];
  const chapter = block?.chapters?.find((c) => String(c.no) === ch);
  if (!chapter?.lessons?.length) return [];
  return chapter.lessons.map((ls) => {
    const isReview = Boolean(ls.isReview);
    const label = isReview
      ? ls.title
      : `Bài ${ls.no}. ${ls.title}`;
    return {
      no: ls.no,
      title: ls.title,
      label,
      isReview,
    };
  });
}

/** Tìm metadata chương SGK. */
export function findSgkChapter(grade, chapterNo) {
  const g = normalizeGrade(grade);
  const ch = String(chapterNo ?? '').trim();
  if (!ch || ch === '—') return null;
  const block = SGK_TOC_BY_GRADE[g];
  return block?.chapters?.find((c) => String(c.no) === ch) || null;
}

/** Nhãn chương đầy đủ: "CHƯƠNG II. TIÊU ĐỀ" (fallback: "Chương 2"). */
export function formatSgkChapterHeading(grade, chapterNo) {
  const ch = findSgkChapter(grade, chapterNo);
  if (ch) return `CHƯƠNG ${ch.roman}. ${ch.title}`;
  const no = String(chapterNo ?? '').trim();
  return no && no !== '—' ? `Chương ${no}` : '—';
}

/** Nhãn bài đầy đủ: "Bài 4. Tiêu đề" (ưu tiên SGK, rồi fallbackTitle). */
export function formatSgkLessonHeading(grade, chapterNo, lessonNo, fallbackTitle = '') {
  const no = String(lessonNo ?? '').trim();
  if (!no || no === '—') return String(fallbackTitle || '').trim() || 'Bài học';

  const list = getSgkLessons(grade, chapterNo);
  const hit = list.find((l) => l.no === no);
  if (hit) {
    if (hit.isReview) return hit.title;
    return `Bài ${hit.no}. ${hit.title}`;
  }

  const fb = String(fallbackTitle || '').trim();
  if (fb) return `Bài ${no}. ${fb}`;
  return `Bài ${no}`;
}

/** Tìm tiêu đề bài SGK (dùng gợi ý mục đầu tiên). */
export function findSgkLessonTitle(grade, chapterNo, lessonNo) {
  const no = String(lessonNo ?? '').trim();
  if (!no) return '';
  const list = getSgkLessons(grade, chapterNo);
  const hit = list.find((l) => l.no === no);
  return hit?.title || '';
}

export function sortCatalogEntries(entries, key = 'no') {
  return [...entries].sort((a, b) => {
    const na = parseNumSortKey(a[key]);
    const nb = parseNumSortKey(b[key]);
    if (na !== null && nb !== null && na !== nb) return na - nb;
    return String(a[key]).localeCompare(String(b[key]), 'vi');
  });
}
