import { normalizePracticeList } from './practiceQuestionTypes';
import { formatSgkLessonHeading } from './sgkToc';

/** Mẫu một mục con trong bài giảng (JSON content.sections[]). */
export function emptyLessonSectionTemplate(index = 0) {
  return {
    id: `sec_${Date.now()}_${index}`,
    section_no: String(index + 1),
    title: '',
    theory_core: '',
    examples_core: '',
    practice: [],
    videoUrl: '',
    slidesUrl: '',
    materials: [],
  };
}

export function normalizeLessonSections(raw, { keepEmpty = false } = {}) {
  if (!Array.isArray(raw)) return [];
  const mapped = raw.map((s, i) => {
    const practiceRaw = Array.isArray(s?.practice) ? s.practice : [];
    const materialsRaw = Array.isArray(s?.materials) ? s.materials : [];
    return {
      id: String(s?.id || `sec_${i}`),
      section_no: String(s?.section_no ?? s?.no ?? i + 1).trim(),
      title: String(s?.title ?? ''),
      theory_core: String(s?.theory_core ?? '').toString(),
      examples_core: String(s?.examples_core ?? '').toString(),
      practice: normalizePracticeList(practiceRaw),
      videoUrl: String(s?.videoUrl ?? s?.video_url ?? '').trim(),
      slidesUrl: String(s?.slidesUrl ?? s?.slides_url ?? s?.presentationUrl ?? '').trim(),
      materials: materialsRaw
        .filter((x) => x && typeof x === 'object')
        .map((x) => ({
          title: String(x.title ?? '').trim(),
          url: String(x.url ?? '').trim(),
        })),
    };
  });
  if (keepEmpty) return mapped;
  return mapped.filter(
    (s) =>
      s.title.trim() ||
      s.theory_core.trim() ||
      s.examples_core.trim() ||
      s.practice.length > 0 ||
      s.videoUrl ||
      s.slidesUrl
  );
}

export function lessonHasSections(contentJson) {
  return normalizeLessonSections(contentJson?.sections).length > 0;
}

export function getLessonDisplayLabel(lesson) {
  const no = (lesson?.lesson_no ?? '').toString().trim();
  const title = (lesson?.title ?? 'Bài học').toString().trim();
  const grade = lesson?.grade_level;
  const chapter = lesson?.chapter;
  if (grade && chapter && no) {
    return formatSgkLessonHeading(grade, chapter, no, title);
  }
  return no ? `Bài ${no}. ${title}` : title;
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Sidebar: chỉ tên bài, không lẫn tên các mục con. */
export function getSidebarLessonTitle(lesson, sections = []) {
  const no = (lesson?.lesson_no ?? '').toString().trim();
  const grade = lesson?.grade_level;
  const chapter = lesson?.chapter;

  if (grade && chapter && no) {
    const sgkLabel = formatSgkLessonHeading(grade, chapter, no, lesson?.title);
    if (sgkLabel && !/^Bài \d+$/.test(sgkLabel)) return sgkLabel;
  }

  let title = (lesson?.title ?? '').toString().trim();
  const secList = Array.isArray(sections) ? sections : [];

  title = title
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^bài học$/i.test(line))
    .join(' ')
    .trim();

  if (secList.length > 0) {
    if (title.includes('..')) {
      title = title.split('..')[0].trim();
    }
    secList.forEach((sec) => {
      const st = String(sec?.title ?? '').trim();
      if (!st) return;
      const re = new RegExp(`[\\s.,;:\\-–—]*${escapeRegExp(st)}\\s*$`, 'i');
      title = title.replace(re, '').trim();
    });
    title = title.replace(/\.+$/g, '').replace(/\s*bài học\s*$/i, '').trim();
  }

  if (!title) return no ? `Bài ${no}` : 'Bài học';
  return no ? `Bài ${no}. ${title}` : title;
}

export function getSectionDisplayLabel(section) {
  if (!section) return 'Mục bài';
  const no = (section.section_no ?? '').toString().trim();
  const title = (section.title ?? 'Mục bài').toString().trim();
  return no ? `${no}. ${title}` : title;
}

/** Khóa sắp xếp mục: section_no, fallback số đầu tiêu đề. */
export function sectionSortKey(sec) {
  const rawNo = String(sec?.section_no ?? '').trim();
  const fromNo = Number(rawNo.replace(/[^\d.-]/g, ''));
  if (Number.isFinite(fromNo)) return fromNo;
  const fromTitle = String(sec?.title ?? '').trim().match(/^(\d+(?:[.,]\d+)?)/);
  if (fromTitle) {
    const n = Number(fromTitle[1].replace(',', '.'));
    if (Number.isFinite(n)) return n;
  }
  return Number.MAX_SAFE_INTEGER;
}

/** Sắp mục 1 → 2 → 3… */
export function sortLessonSections(sections) {
  return [...(Array.isArray(sections) ? sections : [])].sort((a, b) => {
    const na = sectionSortKey(a);
    const nb = sectionSortKey(b);
    if (na !== nb) return na - nb;
    return String(a?.title || '').localeCompare(String(b?.title || ''), 'vi');
  });
}

function isChapterReviewLesson(lesson) {
  const title = String(lesson?.title || '').trim();
  const no = String(lesson?.lesson_no || '').trim();
  // lesson_no = "OT1", "OT2", ... (chuẩn sgkTocData)
  if (/^OT\d*/i.test(no)) return true;
  // Tiêu đề chứa "ôn tập" ở bất kỳ vị trí nào (kể cả "Bài 4. Ôn tập chương I")
  if (/ôn\s*tập/i.test(title)) return true;
  return false;
}

function titleLessonSortKey(lesson) {
  const title = String(lesson?.title || '').trim();
  const match = title.match(/\bbài\s*(\d+(?:[.,]\d+)?)/i);
  return match ? Number(match[1].replace(',', '.')) : null;
}

function compareLessonRows(a, b, parseNum = defaultParseNum) {
  const aReview = isChapterReviewLesson(a);
  const bReview = isChapterReviewLesson(b);
  if (aReview !== bReview) return aReview ? 1 : -1;

  const na = parseNum(a?.lesson_no) ?? titleLessonSortKey(a);
  const nb = parseNum(b?.lesson_no) ?? titleLessonSortKey(b);
  if (na !== null && nb !== null && na !== nb) return na - nb;
  if (na !== null && nb === null) return -1;
  if (na === null && nb !== null) return 1;
  return String(a?.title || '').localeCompare(String(b?.title || ''), 'vi');
}

/**
 * Gom các doc cùng số bài thành 1 hàng; gộp mục và sắp tăng dần.
 * Mỗi mục mang `_sourceLessonId` + `_sourceSectionIndex` để mở đúng doc nguồn.
 */
export function mergeLessonsByLessonNo(lessons, parseNum = defaultParseNum) {
  const map = new Map();
  for (const l of lessons || []) {
    const no = String(l?.lesson_no ?? '').trim();
    const titleKey = String(l?.title ?? '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
    const key = no ? `no:${no}` : titleKey ? `t:${titleKey}` : `id:${l.id}`;
    if (!map.has(key)) {
      map.set(key, { lessons: [], sections: [] });
    }
    const row = map.get(key);
    row.lessons.push(l);
    const secs = sortLessonSections(
      Array.isArray(l?._sections) ? l._sections : normalizeLessonSections(parseContentSections(l?.content))
    );
    secs.forEach((sec, idx) => {
      row.sections.push({ ...sec, _sourceLessonId: l.id, _sourceSectionIndex: idx });
    });
  }

  return Array.from(map.values())
    .map(({ lessons: group, sections }) => {
      const seen = new Set();
      const merged = [];
      for (const sec of sections) {
        const k = `${String(sec.section_no || '').trim()}|||${String(sec.title || '').trim().toLowerCase()}`;
        if (seen.has(k)) continue;
        seen.add(k);
        merged.push(sec);
      }
      const displaySections = sortLessonSections(merged);

      let primary = group[0];
      let bestCount = sectionCountOf(primary);
      for (const l of group) {
        const c = sectionCountOf(l);
        if (c > bestCount) {
          primary = l;
          bestCount = c;
        }
      }
      return {
        ...primary,
        _displaySections: displaySections,
        _groupLessonIds: group.map((x) => x.id),
        _sections: displaySections,
      };
    })
    .sort((a, b) => compareLessonRows(a, b, parseNum));
}

function defaultParseNum(v) {
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function parseContentSections(content) {
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    return content?.sections;
  }
  if (typeof content === 'string') {
    try {
      const p = JSON.parse(content);
      return p && typeof p === 'object' ? p.sections : [];
    } catch {
      return [];
    }
  }
  return [];
}

function sectionCountOf(lesson) {
  if (Array.isArray(lesson?._sections)) return lesson._sections.length;
  return normalizeLessonSections(parseContentSections(lesson?.content)).length;
}

export function lessonBelongsToGroup(lessonRow, lessonId) {
  if (!lessonId || !lessonRow) return false;
  if (lessonRow.id === lessonId) return true;
  const ids = lessonRow._groupLessonIds;
  return Array.isArray(ids) && ids.includes(lessonId);
}

/**
 * Bài thuộc lộ trình SGK (không phải chuyên đề cũ).
 * - Loại is_topic / có topic_id
 * - Chương phải là số nguyên sạch ("2"), không phải "2. Tiêu đề…" hay slug
 */
export function isSgkRoadmapLesson(lesson) {
  if (!lesson) return false;
  if (lesson.is_topic) return false;
  const tid = String(lesson.topic_id || '').trim();
  if (tid) return false;
  const chRaw = String(lesson.chapter ?? '').trim();
  if (!/^\d+$/.test(chRaw)) return false;
  return true;
}

export function roadmapChapterKey(lesson) {
  if (!isSgkRoadmapLesson(lesson)) return null;
  const n = Number(String(lesson.chapter).trim());
  return Number.isFinite(n) ? String(n) : null;
}

/** Nội dung hiển thị theo mục đang chọn (hoặc gốc nếu không có sections). */
export function resolveActiveLessonSlice(contentJson, sectionIndex = 0) {
  const sections = sortLessonSections(normalizeLessonSections(contentJson?.sections));
  if (sections.length === 0) {
    return {
      sections: [],
      activeSection: null,
      activeSectionIndex: 0,
      theory_core: (contentJson?.theory_core ?? '').toString(),
      examples_core: (contentJson?.examples_core ?? '').toString(),
      practice: Array.isArray(contentJson?.practice) ? contentJson.practice : [],
      examples: Array.isArray(contentJson?.examples) ? contentJson.examples : [],
      videoUrl: '',
      slidesUrl: '',
      materials: Array.isArray(contentJson?.materials) ? contentJson.materials : [],
    };
  }
  const idx = Math.max(0, Math.min(Number(sectionIndex) || 0, sections.length - 1));
  const sec = sections[idx];
  return {
    sections,
    activeSection: sec,
    activeSectionIndex: idx,
    theory_core: sec.theory_core || '',
    examples_core: sec.examples_core || '',
    practice: sec.practice || [],
    examples: Array.isArray(contentJson?.examples) ? contentJson.examples : [],
    videoUrl: sec.videoUrl || '',
    slidesUrl: sec.slidesUrl || '',
    materials: sec.materials?.length ? sec.materials : Array.isArray(contentJson?.materials) ? contentJson.materials : [],
  };
}
