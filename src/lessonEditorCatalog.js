/** Gom danh sách chương / bài từ SGK + lessonsList cho form Admin. */

import {
  findSgkLessonTitle,
  formatSgkChapterHeading,
  formatSgkLessonHeading,
  getSgkChapters,
  getSgkLessons,
  sortCatalogEntries,
} from './sgkToc';

function parseNumSortKey(v) {
  const n = parseFloat(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
}

export function buildChapterOptions(lessons) {
  const set = new Set();
  (lessons || []).forEach((l) => {
    const ch = String(l?.chapter ?? '').trim();
    if (ch) set.add(ch);
  });
  return Array.from(set).sort((a, b) => {
    const na = parseNumSortKey(a);
    const nb = parseNumSortKey(b);
    if (na !== null && nb !== null && na !== nb) return na - nb;
    return a.localeCompare(b, 'vi');
  });
}

/**
 * Chương cho dropdown: ưu tiên SGK theo lớp, gộp thêm chương đã có trên web.
 * @returns {{ no: string, label: string }[]}
 */
export function buildMergedChapterOptions(lessons, grade) {
  const map = new Map();
  getSgkChapters(grade).forEach((ch) => {
    map.set(ch.no, { no: ch.no, label: ch.label });
  });
  buildChapterOptions(lessons).forEach((no) => {
    if (!map.has(no)) {
      map.set(no, { no, label: `Chương ${no}` });
    }
  });
  return sortCatalogEntries(Array.from(map.values()), 'no');
}

/** Các số bài đã có trong chương (kèm nhãn tham khảo). */
export function buildLessonNoOptions(lessons, chapter, currentLessonId) {
  const ch = String(chapter ?? '').trim();
  if (!ch) return [];
  const map = new Map();
  (lessons || []).forEach((l) => {
    if (String(l?.chapter ?? '').trim() !== ch) return;
    const no = String(l?.lesson_no ?? '').trim();
    if (!no) return;
    const isCurrent = currentLessonId && l.id === currentLessonId;
    const title = String(l?.title ?? '').trim();
    const label = title ? `Bài ${no} — ${title}` : `Bài ${no}`;
    map.set(no, { no, label: isCurrent ? `${label} (đang sửa)` : label });
  });
  return Array.from(map.values()).sort((a, b) => {
    const na = parseNumSortKey(a.no);
    const nb = parseNumSortKey(b.no);
    if (na !== null && nb !== null && na !== nb) return na - nb;
    return a.no.localeCompare(b.no, 'vi');
  });
}

/**
 * Bài cho dropdown: SGK theo lớp + chương, gộp bài đã có trên web.
 * @returns {{ no: string, label: string, title?: string }[]}
 */
export function buildMergedLessonNoOptions(lessons, chapter, currentLessonId, grade) {
  const ch = String(chapter ?? '').trim();
  if (!ch) return [];
  const map = new Map();
  getSgkLessons(grade, ch).forEach((ls) => {
    map.set(ls.no, { no: ls.no, label: ls.label, title: ls.title });
  });
  buildLessonNoOptions(lessons, ch, currentLessonId).forEach((row) => {
    if (!map.has(row.no)) map.set(row.no, row);
  });
  return sortCatalogEntries(Array.from(map.values()), 'no');
}

export { findSgkLessonTitle };

const ADMIN_GRADES = ['6', '7', '8', '9', '10', '11', '12'];

function sortLessonsInChapter(lessons) {
  return sortCatalogEntries(
    (lessons || []).map((l) => ({ lesson: l, no: String(l?.lesson_no ?? '').trim() })),
    'no'
  ).map((row) => row.lesson);
}

/**
 * Cây thư mục Kho Bài Giảng: Toán 6–12 → Chương SGK → Bài đã lưu.
 */
export function buildAdminLessonRepositoryTree(lessonsList, grades = ADMIN_GRADES) {
  const all = (lessonsList || []).filter((l) => l && !l.is_topic);
  return grades.map((grade) => {
    const gradeLessons = all.filter((l) => String(l.grade_level || '8') === grade);
    const byChapter = new Map();
    gradeLessons.forEach((l) => {
      const ch = String(l.chapter ?? '').trim();
      const key = ch || '_none';
      if (!byChapter.has(key)) byChapter.set(key, []);
      byChapter.get(key).push(l);
    });

    const chapterMap = new Map();
    getSgkChapters(grade).forEach((ch) => {
      chapterMap.set(ch.no, {
        no: ch.no,
        label: formatSgkChapterHeading(grade, ch.no),
        lessons: sortLessonsInChapter(byChapter.get(ch.no) || []),
      });
    });
    byChapter.forEach((lessons, chKey) => {
      if (chKey === '_none') return;
      if (!chapterMap.has(chKey)) {
        chapterMap.set(chKey, {
          no: chKey,
          label: formatSgkChapterHeading(grade, chKey),
          lessons: sortLessonsInChapter(lessons),
        });
      }
    });

    const chapters = sortCatalogEntries(Array.from(chapterMap.values()), 'no');
    const unassigned = sortLessonsInChapter(byChapter.get('_none') || []);

    return {
      grade,
      label: `Toán ${grade}`,
      chapters,
      unassigned,
      totalLessons: gradeLessons.length,
    };
  });
}

export function getAdminLessonCardLabel(lesson) {
  const grade = lesson?.grade_level;
  const chapter = lesson?.chapter;
  const no = String(lesson?.lesson_no ?? '').trim();
  const title = String(lesson?.title ?? '').trim();
  if (grade && chapter && no) {
    return formatSgkLessonHeading(grade, chapter, no, title);
  }
  return title || 'Bài giảng';
}

export function deriveLessonTitleFromSections(sections, fallback = '') {
  if (!Array.isArray(sections) || sections.length === 0) {
    return String(fallback ?? '').trim();
  }
  const first = sections.find((s) => String(s?.title ?? '').trim()) || sections[0];
  return String(first?.title ?? fallback ?? '').trim();
}
