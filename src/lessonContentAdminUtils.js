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
        sections: [],
        practice_display_mode: 'list',
        seo: { focus_keyword: '', keywords: [] },
        mindMap: { enabled: false, mode: 'image', imageUrl: '', summaryTitle: '', summaryRoot: null, logicTrees: [] },
        simulation: { enabled: false, mode: 'geogebra', title: '', geogebraUrl: '', htmlCode: '', guideText: '', height: 560 },
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
          mindMap: { enabled: false, mode: 'image', imageUrl: '', summaryTitle: '', summaryRoot: null, logicTrees: [] },
          simulation: { enabled: false, mode: 'geogebra', title: '', geogebraUrl: '', htmlCode: '', guideText: '', height: 560 },
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

export function emptyPracticeTemplate(index, type = 'mcq') {
  const id = `pr_${Date.now()}_${index}`;
  const base = { id, question: '', hint: '', hintVideoUrl: '', explanation: '' };
  switch (type) {
    case 'input':
      return {
        ...base,
        type: 'input',
        correctAnswer: '',
        answerParts: [
          { id: '1', placeholder: 'x = …', correctAnswer: '' },
        ],
      };
    case 'true_false':
      return { ...base, type: 'true_false', correctAnswer: true };
    case 'true_false_group':
      return {
        ...base,
        type: 'true_false_group',
        question: 'Xét các khẳng định sau:',
        tfItems: [
          { key: 'a', text: 'Mệnh đề a', correct: true },
          { key: 'b', text: 'Mệnh đề b', correct: false },
          { key: 'c', text: 'Mệnh đề c', correct: true },
          { key: 'd', text: 'Mệnh đề d', correct: true },
        ],
      };
    case 'ordering':
      return { ...base, type: 'ordering', items: ['Bước 1', 'Bước 2', 'Bước 3'], correctOrder: [0, 1, 2] };
    case 'drag_drop':
      return {
        ...base,
        type: 'drag_drop',
        slots: [
          { id: 'slot1', label: 'Ô 1' },
          { id: 'slot2', label: 'Ô 2' },
        ],
        choices: ['Đáp án A', 'Đáp án B'],
        correctAnswer: { slot1: 'Đáp án A', slot2: 'Đáp án B' },
      };
    case 'fill_blanks':
      return {
        ...base,
        type: 'fill_blanks',
        question: 'Điền các chỗ trống trong đoạn văn sau:',
        passage: 'Parabol $y=ax^2$ ($a \\neq 0$) có đỉnh tại {{1}} và trục đối xứng là đường thẳng {{2}}.',
        blanks: [
          { id: '1', correctAnswer: '(0; 0)' },
          { id: '2', correctAnswer: 'x = 0' },
        ],
        blanksText: '1=(0; 0)\n2=x = 0',
      };
    case 'mcq':
    default:
      return {
        ...base,
        type: 'mcq',
        options: ['', '', '', ''],
        correctAnswer: 0,
      };
  }
}

/** Mẫu JSON tab Tài liệu (link rỗng — điền url sau). */
export const DEFAULT_LESSON_MATERIALS_JSON = `[
  { "title": "Tài liệu PDF", "url": "" },
  { "title": "Phiếu bài tập / bổ sung", "url": "" }
]`;
