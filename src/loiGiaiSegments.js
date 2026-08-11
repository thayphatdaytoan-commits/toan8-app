/* eslint-disable */

/** Khối lời giải có dạng: \{ Lời giải: ... \} (có thể nhiều dòng). */
export const LOI_GIAI_BLOCK_REGEX = /\\\{\s*Lời\s*giải\s*:\s*([\s\S]*?)\\\}/gi;

/** (Giữ tương thích) Dòng bắt đầu lời giải: Lời giải / Lời giải: / \Lời giải: */
export const LOI_GIAI_LINE_REGEX = /^\s*\\?Lời\s*giải(?:\s*[:.\-—]\s*(.*))?$/i;

/** Bỏ dòng nhãn "Lời giải:" thừa (tránh khung lồng nhau). */
export function stripLoiGiaiPrefix(text) {
  return String(text ?? '')
    .replace(/^\s*\\?Lời\s*giải\s*[:.\-—]?\s*/i, '')
    .trim();
}

/**
 * Tách chuỗi thành các đoạn: plain hoặc loigiai.
 * - Ưu tiên cú pháp mới: \{ Lời giải: ... \}
 * - Nếu không có, vẫn nhận cú pháp cũ theo dòng để tránh hỏng bài cũ.
 */
export function parseLoiGiaiSegments(raw) {
  const s = String(raw ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!s.trim()) return [{ type: 'plain', text: s }];

  // Syntax mới: \{ Lời giải: ... \}
  const blocks = [];
  let hasBlock = false;
  const replaced = s.replace(LOI_GIAI_BLOCK_REGEX, (_full, inner) => {
    hasBlock = true;
    const idx = blocks.length;
    blocks.push(String(inner ?? '').trim());
    return `\n\x00LOI_GIAI_BLOCK_${idx}\x00\n`;
  });
  if (hasBlock) {
    const out = [];
    const parts = replaced.split(/\x00LOI_GIAI_BLOCK_(\d+)\x00/);
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        const t = parts[i];
        if (t && t.trim()) out.push({ type: 'plain', text: t });
      } else {
        const bi = Number(parts[i]);
        const body = blocks[bi] ?? '';
        out.push({ type: 'loigiai', text: body });
      }
    }
    return out.length ? out : [{ type: 'plain', text: s }];
  }

  // Fallback syntax cũ: \Lời giải:
  const lines = s.split('\n');
  const segments = [];
  const plain = [];
  let i = 0;

  const flushPlain = () => {
    const t = plain.join('\n');
    plain.length = 0;
    if (t.trim()) segments.push({ type: 'plain', text: t });
  };

  while (i < lines.length) {
    const ln = lines[i];
    const m = ln.match(LOI_GIAI_LINE_REGEX);
    if (m) {
      flushPlain();
      const firstRest = m[1] || '';
      const body = [];
      if (firstRest.trim()) body.push(firstRest);
      i += 1;
      while (i < lines.length) {
        const L = lines[i];
        const T = L.trim();
        if (T === '') break;
        if (LOI_GIAI_LINE_REGEX.test(L)) break;
        body.push(L);
        i += 1;
      }
      segments.push({ type: 'loigiai', text: body.join('\n') });
      continue;
    }
    plain.push(ln);
    i += 1;
  }
  flushPlain();

  return segments.length ? segments : [{ type: 'plain', text: s }];
}
