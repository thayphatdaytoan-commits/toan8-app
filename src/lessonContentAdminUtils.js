/**
 * Parse / merge JSON nội dung bài giảng (theory_core, examples_core, examples, practice) cho Admin.
 */

export function parseLessonContentObject(contentStr) {
  const raw = (contentStr ?? '').toString().trim();
  if (!raw) {
    return {
      obj: {
        theory_core: '',
        examples_core: '',
        examples: [],
        practice: [],
        materials: [],
        seo: { focus_keyword: '', keywords: [] },
      },
      error: null,
    };
  }
  try {
    const o = JSON.parse(raw);
    if (typeof o !== 'object' || o === null) {
      return {
        obj: {
          theory_core: '',
          examples_core: '',
          examples: [],
          practice: [],
          materials: [],
          seo: { focus_keyword: '', keywords: [] },
        },
        error: null,
      };
    }
    const seo =
      o.seo && typeof o.seo === 'object'
        ? {
            focus_keyword: String(o.seo.focus_keyword ?? '').trim(),
            keywords: Array.isArray(o.seo.keywords) ? o.seo.keywords.map((x) => String(x || '').trim()).filter(Boolean) : [],
          }
        : { focus_keyword: '', keywords: [] };
    const materialsRaw = Array.isArray(o.materials) ? o.materials : [];
    const materials = materialsRaw
      .filter((x) => x && typeof x === 'object')
      .map((x) => ({
        title: String(x.title ?? '').trim(),
        url: String(x.url ?? '').trim(),
      }));
    return {
      obj: {
        ...o,
        theory_core: (o.theory_core ?? '').toString(),
        examples_core: (o.examples_core ?? '').toString(),
        examples: Array.isArray(o.examples) ? o.examples : [],
        practice: Array.isArray(o.practice) ? o.practice : [],
        materials,
        seo,
      },
      error: null,
    };
  } catch (e) {
    return { obj: null, error: e?.message || 'JSON không hợp lệ' };
  }
}

export function stringifyLessonContent(obj) {
  return JSON.stringify(obj, null, 2);
}

/** Gộp patch vào object đã parse từ contentStr (giữ các khóa khác nếu parse được). Nếu JSON lỗi — giữ nguyên chuỗi. */
export function mergeLessonContentString(contentStr, patch) {
  let base = {};
  try {
    const p = JSON.parse((contentStr ?? '').toString() || '{}');
    if (p && typeof p === 'object') base = p;
    else base = {};
  } catch {
    return (contentStr ?? '').toString();
  }
  const next = { ...base, ...patch };
  return stringifyLessonContent(next);
}

export function emptyExampleTemplate() {
  return { title: 'Dạng mới', desc: '', items: [{ q: '', steps: [] }] };
}

export function emptyPracticeTemplate(index) {
  return {
    id: `pr_${Date.now()}_${index}`,
    type: 'mcq',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    hint: '',
    explanation: '',
  };
}

/** Mẫu JSON tab Tài liệu (link rỗng — điền url sau). */
export const DEFAULT_LESSON_MATERIALS_JSON = `[
  { "title": "Tài liệu PDF", "url": "" },
  { "title": "Phiếu bài tập / bổ sung", "url": "" }
]`;
