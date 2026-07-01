/**
 * Firestore giới hạn độ lồng nhau tối đa 20 cấp cho toàn bộ document.
 * Cấu trúc của document đã chiếm 5 cấp:
 *   exercises(array=1) → ex(map=2) → logicTrees(array=3) → tree(map=4) → root(map=5)
 * Mỗi cặp children(array)+node(map) thêm 2 cấp.
 * Để an toàn (dừng ở depth 17 từ document root = còn 3 cấp dự phòng):
 *   MAX_TREE_DEPTH = 6  (5 overhead + 6 tree levels = 17 < 20)
 *
 * Khi cây vượt giới hạn, các nút con bị CẮT (không ném lỗi) để vẫn lưu được.
 * Sơ đồ hiển thị sẽ bị cụt ở phần rất sâu, nhưng dữ liệu lưu được.
 */
const MAX_TREE_DEPTH = 6;

function deepNormalizeFirestoreValue(value, depth = 0) {
  if (depth > 60) return null;
  if (value === undefined) return null;
  if (value === null) return null;
  const t = typeof value;
  if (t === 'string' || t === 'boolean') return value;
  if (t === 'number') return Number.isFinite(value) ? value : null;
  if (t === 'bigint' || t === 'function' || t === 'symbol') return null;
  if (Array.isArray(value)) {
    // Firestore không cho array chứa array → flatten triệt để
    const flat = value.flat(Infinity);
    return flat.map((v) => deepNormalizeFirestoreValue(v, depth + 1)).filter((v) => v !== undefined);
  }
  if (t === 'object') {
    // Chỉ giữ plain object; object lạ (Date/Map/Set/...) → stringify fallback
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      try {
        return String(value);
      } catch {
        return null;
      }
    }
    const out = {};
    for (const k of Object.keys(value)) {
      const v = deepNormalizeFirestoreValue(value[k], depth + 1);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  return null;
}

function sanitizeTreeNodeObject(node, level) {
  if (node == null) return null;
  if (typeof node !== 'object' || Array.isArray(node)) return null;

  // Khi vượt giới hạn: trả về nút không có children (cắt cây, không ném lỗi)
  if (level > MAX_TREE_DEPTH) {
    return {
      id: String(node.id ?? ''),
      type: String(node.type ?? 'given'),
      text: typeof node.text === 'string' ? node.text : String(node.text ?? ''),
      hiddenDefault: node.hiddenDefault === false ? false : true,
      children: [],
    };
  }

  const childrenRaw = node.children;
  const childrenArr = Array.isArray(childrenRaw) ? childrenRaw : [];

  const children = childrenArr.flatMap((ch) => sanitizeTreeNodeOrList(ch, level + 1));

  return {
    id: String(node.id ?? ''),
    type: String(node.type ?? 'given'),
    text: typeof node.text === 'string' ? node.text : String(node.text ?? ''),
    hiddenDefault: node.hiddenDefault === false ? false : true,
    children,
  };
}

/**
 * Một số file import/biến đổi UI có thể tạo `children` dạng `[[node]]` hoặc mảng lồng nhiều lớp.
 * Firestore không cho mảng chứa mảng, nên ta flatten + chuẩn hoá thành danh sách nút.
 */
function sanitizeTreeNodeOrList(raw, level) {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.flatMap((x) => sanitizeTreeNodeOrList(x, level));
  }
  const n = sanitizeTreeNodeObject(raw, level);
  return n ? [n] : [];
}

function sanitizeTreeNodeInner(raw, level) {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    // root bị bọc mảng → lấy node đầu tiên hợp lệ
    const list = sanitizeTreeNodeOrList(raw, level);
    return list.length ? list[0] : null;
  }
  return sanitizeTreeNodeObject(raw, level);
}

function sanitizeMindMapTreeRoot(root) {
  return sanitizeTreeNodeInner(root, 0);
}

function sanitizeLogicTree(tree, exerciseIndex, treeIndex) {
  const root =
    tree?.root === undefined || tree?.root === null ? null : sanitizeMindMapTreeRoot(tree.root);

  return {
    id: String(tree?.id ?? `tree_${exerciseIndex}_${treeIndex}`),
    title: String(tree?.title ?? ''),
    imageUrl: tree?.imageUrl == null || tree?.imageUrl === '' ? null : String(tree.imageUrl),
    useOwnFigure: tree?.useOwnFigure === true,
    imageCaption: typeof tree?.imageCaption === 'string' ? tree.imageCaption : String(tree?.imageCaption ?? ''),
    horizontalSpacing: Math.min(150, Math.max(2, Number(tree?.horizontalSpacing) || 16)),
    solutionText:
      typeof tree?.solutionText === 'string' ? tree.solutionText : String(tree?.solutionText ?? ''),
    root,
  };
}

function sanitizeExercise(ex, exerciseIndex) {
  const ltIn = Array.isArray(ex?.logicTrees) ? ex.logicTrees : [];
  const logicTrees = ltIn.map((t, ti) => sanitizeLogicTree(t, exerciseIndex, ti));

  const pr = ex?.problem && typeof ex.problem === 'object' ? ex.problem : {};
  const problem = {
    title: typeof pr.title === 'string' ? pr.title : String(pr.title ?? ''),
    content: typeof pr.content === 'string' ? pr.content : String(pr.content ?? ''),
    imageUrl:
      pr.imageUrl == null || pr.imageUrl === ''
        ? null
        : typeof pr.imageUrl === 'string'
          ? pr.imageUrl
          : String(pr.imageUrl),
  };

  return {
    id: String(ex?.id ?? `ex_${exerciseIndex}`),
    title: String(ex?.title ?? ''),
    sharedMindMapImageUrl:
      ex?.sharedMindMapImageUrl == null || ex?.sharedMindMapImageUrl === ''
        ? null
        : String(ex.sharedMindMapImageUrl),
    problem,
    logicTrees,
  };
}

export function sanitizeMindMapExercisesForFirestore(exercises) {
  if (!Array.isArray(exercises)) return [];
  let cloned;
  try {
    cloned = JSON.parse(JSON.stringify(exercises));
  } catch (e) {
    throw new Error(`Không chuẩn hoá được dữ liệu (JSON): ${e?.message || e}`);
  }

  const sanitized = cloned.map((ex, i) => sanitizeExercise(ex, i));
  // Chuẩn hóa thêm một lớp cuối để chắc chắn không còn mảng lồng mảng / giá trị lạ.
  return deepNormalizeFirestoreValue(sanitized);
}
