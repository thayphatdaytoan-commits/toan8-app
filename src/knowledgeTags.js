/**
 * Chuẩn hóa tên kiến thức để so khớp (import Word/TXT ↔ danh sách trong app).
 * Giữ nguyên chuỗi gốc trong UI; chỉ dùng key này khi so sánh.
 */
export function normalizeKnowledgeTopicKey(s) {
  let t = String(s || '')
    .replace(/\uFEFF/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’‹›]/g, "'")
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .trim();
  t = t.replace(/\s+/g, ' ').normalize('NFC');
  // SGK/CT hay viết "định lí" vs "định lý" — gom một phía để khớp ổn định
  t = t.replace(/định\s*lý/giu, 'định lí');
  t = t.replace(/\.+$/u, '').trim();
  return t;
}

/** Có tồn tại trong danh sách (khớp nguyên văn hoặc sau chuẩn hóa). */
export function knowledgeTopicMatches(list, tag) {
  const raw = String(tag || '').trim();
  if (!raw || !Array.isArray(list)) return false;
  if (list.includes(raw)) return true;
  const n = normalizeKnowledgeTopicKey(raw);
  return list.some((x) => normalizeKnowledgeTopicKey(x) === n);
}

export function parseMathKnowledgeTxt(raw) {
  const text = String(raw || '').replace(/\r\n/g, '\n');
  const lines = text.split('\n').map((l) => l.trim());

  const chapters = [];
  const topicsByChapter = new Map(); // chapterNo -> string[]
  let curChapter = null;

  for (const line of lines) {
    if (!line) continue;
    const m = line.match(/^Chương\s+(\d+)\s*:\s*(.+)$/i);
    if (m) {
      curChapter = String(m[1]);
      const title = String(m[2] || '').trim();
      chapters.push({ chapterNo: curChapter, title });
      if (!topicsByChapter.has(curChapter)) topicsByChapter.set(curChapter, []);
      continue;
    }
    if (/^HỌC\s*KÌ/i.test(line)) continue;
    if (/^TOÁN\s+LỚP/i.test(line)) continue;

    if (!curChapter) continue;

    // Dòng nội dung trong chương -> coi như 1 “dạng toán/kiến thức”
    const list = topicsByChapter.get(curChapter) || [];
    list.push(line);
    topicsByChapter.set(curChapter, list);
  }

  // Dedup + cleanup
  topicsByChapter.forEach((arr, k) => {
    const uniq = [...new Set(arr.map((x) => String(x || '').trim()).filter(Boolean))];
    topicsByChapter.set(k, uniq);
  });

  const allTopics = [...new Set([...(topicsByChapter.values() || [])].flat())];
  allTopics.sort((a, b) => a.localeCompare(b, 'vi'));

  return { chapters, topicsByChapter, allTopics };
}

/**
 * Cắt phần "TOÁN LỚP {n}" trong file tổng hợp (6–12), rồi parse như math11-knowledge.
 * @param {string} raw — toàn bộ hoặc một khối lớp
 * @param {string|number} gradeNum — 6…12
 */
export function parseMathKnowledgeTxtForGrade(raw, gradeNum) {
  const g = String(gradeNum ?? '11').trim();
  const text = String(raw || '').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  let inSection = false;
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const gm = trimmed.match(/^TOÁN\s+LỚP\s+(\d+)\s*$/i);
    if (gm) {
      inSection = String(gm[1]) === g;
      continue;
    }
    if (inSection) out.push(lines[i]);
  }
  const joined = out.join('\n').trim();
  if (!joined) {
    return { chapters: [], topicsByChapter: new Map(), allTopics: [] };
  }
  return parseMathKnowledgeTxt(joined);
}

