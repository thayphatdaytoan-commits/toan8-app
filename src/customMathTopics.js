import { normalizeKnowledgeTopicKey, knowledgeTopicMatches } from './knowledgeTags';

/** Gộp danh sách dạng toán (SGK + tùy chỉnh), bỏ trùng. */
export function mergeTopicOptionLists(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    for (const item of list || []) {
      const raw = String(item || '').trim();
      if (!raw) continue;
      const key = normalizeKnowledgeTopicKey(raw);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(raw);
    }
  }
  return out.sort((a, b) => a.localeCompare(b, 'vi'));
}

/** Lọc dạng toán tùy chỉnh theo khối + chương. */
export function getCustomTopicsForChapter(customTopics, gradeLevel, chapterNo) {
  const gl = String(gradeLevel || '').trim();
  const ch = String(chapterNo || '').trim();
  if (!gl || !ch) return [];
  return mergeTopicOptionLists(
    (customTopics || [])
      .filter(
        (row) =>
          String(row?.grade_level || '').trim() === gl &&
          String(row?.chapter || '').trim() === ch
      )
      .map((row) => row?.label)
  );
}

export function findCustomTopicRow(customTopics, gradeLevel, chapterNo, label) {
  const gl = String(gradeLevel || '').trim();
  const ch = String(chapterNo || '').trim();
  const key = normalizeKnowledgeTopicKey(label);
  if (!gl || !ch || !key) return null;
  return (
    (customTopics || []).find(
      (row) =>
        String(row?.grade_level || '').trim() === gl &&
        String(row?.chapter || '').trim() === ch &&
        normalizeKnowledgeTopicKey(row?.label) === key
    ) || null
  );
}

/** Kiểm tra tên đã có trong SGK hoặc danh sách tùy chỉnh. */
export function topicExistsInLists(label, curriculumList, customTopics, gradeLevel, chapterNo) {
  const trimmed = String(label || '').trim();
  if (!trimmed) return false;
  if (knowledgeTopicMatches(curriculumList, trimmed)) return true;
  return Boolean(findCustomTopicRow(customTopics, gradeLevel, chapterNo, trimmed));
}

export function buildCustomTopicPayload({ label, gradeLevel, chapterNo }) {
  const trimmed = String(label || '').trim();
  return {
    label: trimmed,
    grade_level: String(gradeLevel || '').trim(),
    chapter: String(chapterNo || '').trim(),
    normalized_key: normalizeKnowledgeTopicKey(trimmed),
    created_at: Date.now(),
  };
}
