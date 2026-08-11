/**
 * Tóm tắt bài học (tab bài giảng).
 * mode = 'image' → ảnh full khung (zoom)
 * mode = 'tree'  → sơ đồ hệ thống ngang (root → nhánh)
 */

export function emptySummaryNode(text = '', children = []) {
  return {
    id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    text: String(text || '').trim(),
    children: Array.isArray(children) ? children : [],
  };
}

export function emptyLessonMindMap() {
  return {
    enabled: false,
    mode: 'image',
    imageUrl: '',
    summaryTitle: '',
    summaryRoot: null,
    // legacy (sơ đồ tư duy ngược) — vẫn đọc được nếu còn trong JSON cũ
    sharedMindMapImageUrl: null,
    logicTrees: [],
  };
}

function normalizeSummaryNode(raw, depth = 0) {
  if (!raw || typeof raw !== 'object') return null;
  const text = String(raw.text ?? raw.title ?? raw.label ?? '').trim();
  const kidsRaw = Array.isArray(raw.children) ? raw.children : [];
  const children = kidsRaw
    .map((c) => normalizeSummaryNode(c, depth + 1))
    .filter(Boolean);
  if (!text && children.length === 0) return null;
  return {
    id: String(raw.id || `n_${depth}_${Math.random().toString(36).slice(2, 8)}`),
    text: text || 'Mục',
    children,
  };
}

/** Chuyển cây GOAL/NEED/GIVEN cũ → summary tree (fallback). */
function logicTreeToSummaryRoot(logicTrees) {
  const trees = Array.isArray(logicTrees) ? logicTrees : [];
  if (!trees.length) return null;
  const walk = (node) => {
    if (!node || typeof node !== 'object') return null;
    const text = String(node.text || '').trim();
    const children = (Array.isArray(node.children) ? node.children : [])
      .map(walk)
      .filter(Boolean);
    if (!text && !children.length) return null;
    return emptySummaryNode(text || node.type || 'Mục', children);
  };
  if (trees.length === 1) {
    const root = walk(trees[0].root);
    if (root && String(trees[0].title || '').trim() && root.text !== trees[0].title) {
      return emptySummaryNode(String(trees[0].title).trim(), root.children?.length ? [root] : []);
    }
    return root;
  }
  return emptySummaryNode(
    'Tóm tắt bài học',
    trees.map((t) => {
      const inner = walk(t.root);
      return emptySummaryNode(String(t.title || 'Mục').trim(), inner ? [inner] : []);
    })
  );
}

export function normalizeLessonMindMap(raw) {
  const base = emptyLessonMindMap();
  if (!raw || typeof raw !== 'object') return base;
  const mode = String(raw.mode || '').trim() === 'tree' ? 'tree' : 'image';
  const imageUrl = String(raw.imageUrl ?? raw.image_url ?? '').trim();
  const summaryTitle = String(raw.summaryTitle ?? raw.summary_title ?? '').trim();
  let summaryRoot = normalizeSummaryNode(raw.summaryRoot ?? raw.summary_root ?? raw.root);
  const logicTrees = Array.isArray(raw.logicTrees)
    ? raw.logicTrees.filter((t) => t && typeof t === 'object')
    : [];
  if (!summaryRoot && logicTrees.length) {
    summaryRoot = logicTreeToSummaryRoot(logicTrees);
  }
  const hasContent =
    (mode === 'image' && Boolean(imageUrl)) || (mode === 'tree' && Boolean(summaryRoot?.text));
  const enabledExplicit = raw.enabled;
  const enabled =
    enabledExplicit === true || enabledExplicit === false
      ? Boolean(enabledExplicit)
      : hasContent;
  return {
    enabled,
    mode,
    imageUrl,
    summaryTitle,
    summaryRoot,
    sharedMindMapImageUrl: String(raw.sharedMindMapImageUrl ?? '').trim() || null,
    logicTrees,
  };
}

export function lessonMindMapIsVisible(raw) {
  const mm = normalizeLessonMindMap(raw);
  if (!mm.enabled) return false;
  if (mm.mode === 'image') return Boolean(mm.imageUrl);
  return Boolean(mm.summaryRoot?.text);
}

export function parseLessonMindMapFromContent(content) {
  let obj = content;
  if (typeof content === 'string') {
    try {
      obj = JSON.parse(content || '{}');
    } catch {
      return emptyLessonMindMap();
    }
  }
  if (!obj || typeof obj !== 'object') return emptyLessonMindMap();
  return normalizeLessonMindMap(obj.mindMap ?? obj.mind_map);
}

/**
 * Import TXT tóm tắt bài học (thụt đầu dòng bằng khoảng trắng / tab, hoặc "- " / "* ").
 *
 * TITLE: Tứ giác Sơ đồ
 * ROOT: Ôn tập Chương I: Tứ giác
 * - Mục tiêu bài dạy
 * - Hệ thống các loại hình
 *   - Hình bình hành
 *   - Hình chữ nhật
 * - Tiến trình dạy học
 */
export const DEFAULT_LESSON_SUMMARY_IMPORT = `TITLE: Tứ giác Sơ đồ
ROOT: Ôn tập Chương I: Tứ giác
- Mục tiêu bài dạy
- Hệ thống các loại hình
  - Hình bình hành
  - Hình chữ nhật
  - Hình thoi
  - Hình vuông: Kết hợp Hình chữ nhật & Hình thoi
- Tiến trình dạy học
- Công tác chuẩn bị
- Đánh giá & Giải thưởng`;

export function parseLessonSummaryImportText(raw) {
  const lines = String(raw || '').split(/\r?\n/);
  let summaryTitle = '';
  let rootText = '';
  const items = []; // { indent, text }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const titleM = trimmed.match(/^TITLE:\s*(.+)$/i);
    if (titleM) {
      summaryTitle = titleM[1].trim();
      continue;
    }
    const rootM = trimmed.match(/^ROOT:\s*(.+)$/i);
    if (rootM) {
      rootText = rootM[1].trim();
      continue;
    }
    // indent = leading spaces/tabs before content
    const m = line.match(/^([ \t]*)(?:[-*•]|\d+[.)])?\s*(.+)$/);
    if (!m) continue;
    const indentChars = m[1] || '';
    const text = String(m[2] || '').trim();
    if (!text) continue;
    // skip meta-looking leftovers
    if (/^(TITLE|ROOT):/i.test(text)) continue;
    const indent = indentChars.replace(/\t/g, '  ').length;
    items.push({ indent, text });
  }

  if (!rootText && items.length) {
    // Dòng đầu không thụt = root
    const minIndent = Math.min(...items.map((x) => x.indent));
    const first = items.find((x) => x.indent === minIndent);
    if (first) {
      rootText = first.text;
      items.splice(items.indexOf(first), 1);
    }
  }
  if (!rootText) rootText = summaryTitle || 'Tóm tắt bài học';
  if (!summaryTitle) summaryTitle = rootText;

  const root = emptySummaryNode(rootText, []);
  const stack = [{ indent: -1, node: root }];

  for (const item of items) {
    while (stack.length > 1 && item.indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].node;
    const node = emptySummaryNode(item.text, []);
    parent.children.push(node);
    stack.push({ indent: item.indent, node });
  }

  return { summaryTitle, summaryRoot: root };
}
