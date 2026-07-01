import { buildLessonSlug } from './lessonSlug';
import { getSiteOrigin } from './seo/siteConfig';

function stripMathNoise(s) {
  return String(s || '')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^$]*\$/g, ' ')
    .replace(/\\[()[\]]/g, ' ');
}

export function parseLessonNumberSortKey(raw) {
  const s = String(raw || '').trim();
  const m = s.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return { n: Number.MAX_SAFE_INTEGER, raw: s };
  return { n: parseFloat(m[1].replace(',', '.')), raw: s };
}

/** Đếm heading markdown (# … ####) trong lý thuyết. */
export function countTheoryHeadings(theoryCore) {
  const t = String(theoryCore || '');
  const re = /(^|\n)#{1,4}\s+\S/g;
  const m = t.match(re);
  return m ? m.length : 0;
}

/** Link nội bộ dạng [text](/...) hoặc (bai-giang/...) trong nội dung. */
export function countInternalLinkHints(text) {
  const s = String(text || '');
  const md = (s.match(/\]\(\/[^)]+\)/g) || []).length;
  const plain = /(^|[^\w])\/(bai-giang|lop)\//i.test(s) ? 1 : 0;
  return md + plain;
}

export function getLessonChainNeighbors(lesson, lessonsList) {
  const g = String(lesson?.grade_level || '').trim();
  const ch = String(lesson?.chapter || '').trim();
  if (!g || !ch) return { prev: null, next: null, sameChapter: [] };

  const chain = (lessonsList || [])
    .filter((l) => String(l.grade_level || '').trim() === g && String(l.chapter || '').trim() === ch)
    .sort((a, b) => {
      const ka = parseLessonNumberSortKey(a.lesson_no);
      const kb = parseLessonNumberSortKey(b.lesson_no);
      if (ka.n !== kb.n) return ka.n - kb.n;
      return String(a.title || '').localeCompare(String(b.title || ''), 'vi');
    });

  const id = lesson?.id;
  const idx = id ? chain.findIndex((l) => l.id === id) : -1;
  let prev = null;
  let next = null;
  if (idx >= 0) {
    prev = idx > 0 ? chain[idx - 1] : null;
    next = idx < chain.length - 1 ? chain[idx + 1] : null;
  } else if (lesson?.lesson_no) {
    const k = parseLessonNumberSortKey(lesson.lesson_no);
    let insert = chain.findIndex((l) => parseLessonNumberSortKey(l.lesson_no).n >= k.n);
    if (insert === -1) insert = chain.length;
    prev = insert > 0 ? chain[insert - 1] : null;
    next = insert < chain.length ? chain[insert] : null;
  }

  return {
    prev,
    next,
    sameChapter: chain.filter((l) => !id || l.id !== id).slice(0, 8),
  };
}

function lessonPublicPath(l) {
  const origin = getSiteOrigin();
  const slug = String(l?.slug || '').trim() || buildLessonSlug(l);
  return `${origin}/bai-giang/${encodeURI(slug)}`;
}

/**
 * Phân tích SEO nhanh cho form admin (điểm + checklist + gợi ý).
 */
export function analyzeLessonSeo({
  lesson,
  theoryCore = '',
  lessonsList = [],
}) {
  const title = String(lesson?.title || '').trim();
  const description = String(lesson?.description || '').trim();
  const g = String(lesson?.grade_level || '11').trim() || '11';
  const chapter = String(lesson?.chapter || '').trim();
  const lessonNo = String(lesson?.lesson_no || '').trim();

  const fullText = [
    theoryCore,
    description,
    title,
  ].join('\n');

  const checks = [];
  let score = 0;
  const max = 100;

  const titleLen = title.length;
  if (titleLen >= 25 && titleLen <= 62) {
    score += 18;
    checks.push({ ok: true, text: 'Độ dài tiêu đề hợp lý cho SERP (~25–62 ký tự).' });
  } else if (titleLen > 0) {
    checks.push({
      ok: titleLen <= 70,
      text:
        titleLen < 25
          ? 'Tiêu đề hơi ngắn — nên bổ sung từ khoá (ví dụ dạng bài, chương).'
          : 'Tiêu đề khá dài — Google có thể cắt bớt trên điện thoại.',
    });
    score += titleLen <= 70 ? 10 : 6;
  } else {
    checks.push({ ok: false, text: 'Thiếu tiêu đề.' });
  }

  const descLen = description.length;
  if (descLen >= 110 && descLen <= 165) {
    score += 22;
    checks.push({ ok: true, text: 'Meta mô tả (ô tóm tắt) trong khoảng ~110–165 ký tự — phù hợp snippet.' });
  } else if (descLen > 0) {
    score += 8;
    checks.push({
      ok: descLen >= 50,
      text:
        descLen < 50
          ? 'Mô tả quá ngắn — nên viết 1–2 câu giới thiệu + lợi ích cho học sinh.'
          : descLen > 165
            ? 'Mô tả dài — cân nhắc rút còn ~158 ký tự để Google hiển thị trọn vẹn.'
            : 'Đã có mô tả — có thể tinh chỉnh độ dài.',
    });
  } else {
    checks.push({ ok: false, text: 'Thiếu mô tả SEO (ô tóm tắt) — Google sẽ tự trích nội dung.' });
  }

  const headings = countTheoryHeadings(theoryCore);
  if (headings >= 2) {
    score += 18;
    checks.push({ ok: true, text: `Có ${headings} tiêu đề phụ (# …) trong lý thuyết — cấu trúc tốt.` });
  } else if (headings === 1) {
    score += 8;
    checks.push({ ok: true, text: 'Có 1 heading — nên thêm H2/H3 cho các mục lớn.' });
  } else {
    checks.push({ ok: false, text: 'Chưa thấy heading (# …) trong lý thuyết — nên thêm H2/H3.' });
  }

  const internalN = countInternalLinkHints(fullText);
  if (internalN >= 1) {
    score += 16;
    checks.push({ ok: true, text: `Gợi ý link nội bộ: đã có khoảng ${internalN} dấu hiệu [text](/...) hoặc /bai-giang/...` });
  } else {
    checks.push({ ok: false, text: 'Chưa có link nội bộ — nên chèn tới bài trước/sau hoặc chủ đề liên quan.' });
  }

  if (chapter && lessonNo) {
    score += 14;
    checks.push({ ok: true, text: 'Đã chọn Chương + Bài — URL & breadcrumb chuẩn.' });
  } else {
    checks.push({ ok: false, text: 'Thiếu Chương hoặc Bài — slug và danh mục SEO kém ổn định.' });
  }

  const video = String(lesson?.videoUrl || '').trim();
  if (video) {
    score += 12;
    checks.push({ ok: true, text: 'Có link video — có thể hiển thị rich result Video (YouTube).' });
  } else {
    score += 4;
    checks.push({ ok: true, text: 'Chưa có video — không bắt buộc; có thể bổ sung sau.' });
  }

  score = Math.min(max, Math.round(score));

  const { prev, next, sameChapter } = getLessonChainNeighbors(lesson, lessonsList);

  const suggestedTitle =
    title ||
    (chapter && lessonNo ? `Toán ${g} — Chương ${chapter} — Bài ${lessonNo}` : `Bài giảng Toán ${g}`);

  const suggestedDesc =
    description ||
    (title
      ? `Lý thuyết trọng tâm và ví dụ: ${title}. Ôn Toán ${g}${chapter ? `, chương ${chapter}` : ''}${lessonNo ? `, bài ${lessonNo}` : ''}.`
      : `Ôn tập Toán lớp ${g}: lý thuyết, ví dụ và bài tập có lời giải.`);

  const warnings = checks.filter((c) => !c.ok).map((c) => c.text);
  const internalSuggestions = [];
  if (prev) internalSuggestions.push({ label: 'Bài trước (cùng chương)', url: lessonPublicPath(prev), title: prev.title });
  if (next) internalSuggestions.push({ label: 'Bài sau (cùng chương)', url: lessonPublicPath(next), title: next.title });
  for (const o of sameChapter.slice(0, 4)) {
    internalSuggestions.push({ label: 'Cùng chương', url: lessonPublicPath(o), title: o.title });
  }

  return {
    score,
    maxScore: max,
    checks,
    warnings,
    suggestedTitle,
    suggestedDesc,
    internalSuggestions,
    neighbors: { prev, next },
  };
}
