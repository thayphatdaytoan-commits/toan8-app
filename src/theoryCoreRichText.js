/* eslint-disable */
import { LOI_GIAI_BLOCK_REGEX, LOI_GIAI_LINE_REGEX } from './loiGiaiSegments';
import { sanitizeSvgString, SVG_FENCE_REGEX } from './svgEmbed';

/**
 * Chuyển nội dung lý thuyết trọng tâm (plain text / nhẹ markdown) → HTML an toàn + KaTeX.
 *
 * Hỗ trợ:
 * - # / ## / ### / #### — tiêu đề (H2–H5 trong khung lý thuyết, tốt cho SEO)
 * - **in đậm** · *in nghiêng* · __gạch chân__
 * - [nhãn](https://url) — liên kết (http/https hoặc đường dẫn /...)
 * - {{#mãhex}}đoạn màu{{/}} — màu chữ (ví dụ {{#b91c1c}}...{{/}})
 * - Bảng markdown: | c1 | c2 | + dòng |---|
 * - Gạch đầu dòng: - hoặc • hoặc *
 * - Dòng số mục: "1. Tiêu đề phần" (không chứa dấu =) → tiêu đề nổi bật
 * - Dòng IN HOA NGẮN (nhãn kiểu HÀM LƯỢNG GIÁC) → tiêu đề nhỏ
 * - Tự bọc $...$ cho dòng có dạng công thức (= và ^_{} hoặc \frac...) nếu chưa có $
 * - Khối \\{ Lời giải: ... \\} — khung đóng/mở (details) (ưu tiên)
 * - (tương thích) Dòng \\Lời giải: hoặc Lời giải: — khung đóng/mở theo heuristics cũ
 */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeHtmlAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

/** Icon + màu khối lý thuyết (Định nghĩa / Ghi nhớ / Phương pháp / Ví dụ) — khớp UI mẫu. */
const THEORY_ICON_QUOTE = `<span class="lesson-theory-icon lesson-theory-icon--quote" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5H3v14z"/><path d="M14 21c3 0 7-1 7-8V5h-7v14z"/></svg></span>`;
const THEORY_ICON_PIN = `<span class="lesson-theory-icon lesson-theory-icon--pin" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4.76z"/></svg></span>`;
const THEORY_ICON_LAYERS = `<span class="lesson-theory-icon lesson-theory-icon--layers" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg></span>`;
const THEORY_ICON_EXAMPLE = `<span class="lesson-theory-icon lesson-theory-icon--example" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg></span>`;

function getTheoryBlockStyle(label) {
  if (/ví\s*dụ/i.test(label)) {
    return {
      blockClass: 'lesson-theory-block--example',
      shell: 'lesson-vidu-card-shell',
      title: 'text-slate-900',
      badgeHtml: THEORY_ICON_EXAMPLE,
    };
  }
  if (/định\s*nghĩa/i.test(label)) {
    return {
      blockClass: 'lesson-theory-block--def',
      shell: 'bg-blue-50 border border-blue-200/90',
      title: 'text-blue-700',
      badgeHtml: THEORY_ICON_QUOTE,
    };
  }
  if (/ghi\s*nhớ/i.test(label)) {
    return {
      blockClass: 'lesson-theory-block--remember',
      shell: 'bg-emerald-50 border-[3px] border-emerald-600',
      title: 'text-emerald-700',
      badgeHtml: THEORY_ICON_PIN,
    };
  }
  return {
    blockClass: 'lesson-theory-block--method',
    shell: 'bg-violet-50 border border-violet-200/90',
    title: 'text-violet-700',
    badgeHtml: THEORY_ICON_LAYERS,
  };
}

function isAllowedLinkUrl(url) {
  const u = String(url || '').trim();
  if (!u || /^\s*javascript:/i.test(u)) return false;
  if (/^https?:\/\//i.test(u)) return true;
  if (u.startsWith('/') && !u.startsWith('//')) return true;
  if (u.startsWith('./') || u.startsWith('../')) return true;
  return false;
}

/**
 * Đoạn văn bản (không chứa khối $...$) → HTML inline: **đậm**, *nghiêng*, __gạch chân__, [nhãn](url), {{#mã}}màu{{/}}
 */
export function inlineRichTextToHtml(s) {
  return richTextToHtml(s);
}

function richTextToHtml(s) {
  const colors = [];
  let t = String(s);
  t = t.replace(/\{\{#([#a-fA-F0-9]{3,8})\}\}([\s\S]*?)\{\{\/\}\}/g, (full, col, inner) => {
    const i = colors.length;
    colors.push({ col, inner });
    return `\x00COL${i}\x00`;
  });
  const links = [];
  t = t.replace(/\[([^\]]*)\]\(\s*([^)\s]+)\s*\)/g, (full, label, url) => {
    const u = String(url).trim();
    if (!isAllowedLinkUrl(u)) return full;
    const i = links.length;
    links.push({ label, url: u });
    return `\x00LNK${i}\x00`;
  });
  t = escapeHtml(t);
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-teal-900">$1</strong>');
  t = t.replace(/__(.+?)__/g, '<u class="underline decoration-2 underline-offset-2 decoration-teal-600">$1</u>');
  t = t.replace(/\*(?!\*)([^*\n]+?)\*(?!\*)/g, '<em class="italic text-slate-800">$1</em>');
  for (let i = colors.length - 1; i >= 0; i--) {
    const { col, inner } = colors[i];
    const safe = /^#[0-9a-fA-F]{3,8}$/.test(col) ? col : '#0f766e';
    const innerHtml = escapeHtml(inner);
    t = t.split(`\x00COL${i}\x00`).join(`<span style="color:${safe}">${innerHtml}</span>`);
  }
  for (let i = links.length - 1; i >= 0; i--) {
    const { label, url } = links[i];
    const href = escapeHtmlAttr(url);
    const lab = escapeHtml(label);
    t = t.split(`\x00LNK${i}\x00`).join(
      `<a href="${href}" class="text-teal-700 font-semibold underline underline-offset-2 hover:text-teal-900 break-words" target="_blank" rel="noopener noreferrer">${lab}</a>`
    );
  }
  return t;
}

function splitMathSegments(s) {
  const out = [];
  const re = /(\$\$[\s\S]*?\$\$|\$[^$\n]*\$)/g;
  let last = 0;
  let m;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) out.push({ type: 'text', v: s.slice(last, m.index) });
    out.push({ type: 'math', v: m[0] });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ type: 'text', v: s.slice(last) });
  if (out.length === 0) out.push({ type: 'text', v: s });
  return out;
}

function autoDelimitMathLine(line) {
  const t = line.trim();
  if (!t || /\$/.test(t)) return line;
  if (/=/.test(t) && (/[\^_{}]/.test(t) || /\\[a-zA-Z]+/.test(t) || /\)\s*'/.test(t) || /'\s*=/.test(t))) {
    return `$${t}$`;
  }
  return line;
}

function inlineFormatLine(line) {
  const withMath = autoDelimitMathLine(line);
  return splitMathSegments(withMath)
    .map((seg) => (seg.type === 'math' ? seg.v : richTextToHtml(seg.v)))
    .join('');
}

function isTableRow(line) {
  const t = line.trim();
  if (!t.startsWith('|') || !t.endsWith('|')) return false;
  const cells = t.split('|').filter((c, i, arr) => !(i === 0 && c === '') && !(i === arr.length - 1 && c === ''));
  return cells.length >= 2;
}

function isTableSeparator(line) {
  const t = line.trim();
  if (!t.includes('|') || !/-/.test(t)) return false;
  const inner = t.replace(/\|/g, '').trim();
  return /^[\s\-:]+$/.test(inner) && inner.length > 0;
}

function parseTableRow(line) {
  return line
    .trim()
    .slice(1, -1)
    .split('|')
    .map((c) => c.trim());
}

function buildTable(rows) {
  if (rows.length === 0) return '';
  const useHead = rows.length >= 2;
  let header = useHead;
  let html =
    '<div class="my-4 overflow-x-auto rounded-xl border-2 border-teal-200/90 bg-white/90 shadow-sm"><table class="w-full min-w-[280px] border-collapse text-sm md:text-base">';
  for (const row of rows) {
    html += '<tr class="border-b border-teal-100/90 last:border-0">';
    for (const cell of row) {
      const tag = header ? 'th' : 'td';
      const cls = header
        ? 'bg-gradient-to-r from-teal-600 to-cyan-600 px-3 py-2.5 text-left font-bold text-white first:rounded-tl-xl last:rounded-tr-xl'
        : 'px-3 py-2.5 text-slate-800 align-top even:bg-slate-50/80';
      html += `<${tag} class="${cls}">${inlineFormatLine(cell)}</${tag}>`;
    }
    html += '</tr>';
    if (header) header = false;
  }
  html += '</table></div>';
  return html;
}

function extractViduHeading(bodyLines) {
  const lines = [...bodyLines];
  if (!lines.length) return { badge: 'Ví dụ', lines };
  const first = String(lines[0] || '').trim();
  const m = first.match(/^Ví dụ\s*(\d+)\s*(?:[:\.\-—]\s*)?(.*)$/i);
  if (m) {
    const badge = `Ví dụ ${m[1]}`;
    if (m[2]) lines[0] = m[2];
    else lines.shift();
    return { badge, lines };
  }
  return { badge: 'Ví dụ', lines };
}

const LOI_GIAI_DETAILS_OPEN =
  '<details class="group lesson-loi-giai-details my-5 md:my-6 border-t border-slate-200 pt-4 bg-transparent shadow-none open:shadow-none"><summary class="cursor-pointer select-none list-none py-2 font-semibold text-indigo-800 hover:text-indigo-900 flex items-center justify-between gap-3 [&::-webkit-details-marker]:hidden"><span class="inline-flex items-center gap-2.5"><span class="text-lg leading-none" aria-hidden="true">💡</span><span>Xem lời giải chi tiết</span></span><span class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-sm transition-transform duration-200 group-open:rotate-180" aria-hidden="true">▲</span></summary><div class="pb-2 pt-3 text-slate-700 text-base md:text-lg leading-loose lesson-math-content">';
const LOI_GIAI_DETAILS_CLOSE = '</div></details>';

function stripLoiGiaiLeadLines(bodyLines) {
  const lines = [...bodyLines];
  while (lines.length) {
    const t = String(lines[0] || '').trim();
    if (!t) {
      lines.shift();
      continue;
    }
    const m = lines[0].match(LOI_GIAI_LINE_REGEX);
    if (m && !(m[1] || '').trim()) {
      lines.shift();
      continue;
    }
    if (/^\\?Lời\s*giải\s*:?\s*$/i.test(t) || /^LỜI\s*GIẢI\s*:?\s*$/i.test(t)) {
      lines.shift();
      continue;
    }
    break;
  }
  return lines;
}

function formatBodyLinesToHtml(bodyLines, svgBlocks) {
  const svgTokenRe = /^(?:__)?SVG_EMBED_(\d+)(?:__)?$/;
  return bodyLines
    .map((ln) => {
      const t = String(ln || '').trim();
      if (!t) return '';
      const sm = t.match(svgTokenRe);
      if (sm) {
        const rawSvg = svgBlocks[Number(sm[1])] || '';
        const clean = sanitizeSvgString(rawSvg);
        if (!clean) return '';
        return `<div class="svg-embed-wrap my-4 flex w-full justify-center overflow-x-auto rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm [&_svg]:max-w-full [&_svg]:h-auto">${clean}</div>`;
      }
      return inlineFormatLine(ln);
    })
    .filter((x) => x !== '')
    .join('<br/>');
}

function buildLoiGiaiDetailsFromLines(bodyLines, svgBlocks) {
  const cleaned = stripLoiGiaiLeadLines(bodyLines);
  const inner = formatBodyLinesToHtml(cleaned, svgBlocks);
  if (!inner.trim()) return '';
  return `${LOI_GIAI_DETAILS_OPEN}${inner}${LOI_GIAI_DETAILS_CLOSE}`;
}

function renderBlockBodyHtml(bodyLines, boxBlocks, svgBlocks) {
  const lines = [...bodyLines];
  let out = '';
  let i = 0;
  let para = [];

  const flushPara = () => {
    if (!para.length) return;
    out += `<p class="mb-3 last:mb-0 leading-relaxed text-slate-800">${para.map((ln) => inlineFormatLine(ln)).join('<br/>')}</p>`;
    para = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = String(line || '').trim();
    if (!trimmed) {
      flushPara();
      i += 1;
      continue;
    }

    const boxM = trimmed.match(/^__BOX_BLOCK_(\d+)__$/);
    if (boxM) {
      flushPara();
      const b = boxBlocks[Number(boxM[1])] || { label: '', body: '' };
      const lbl = String(b.label || '').trim().toLowerCase();
      if (/lời\s*giải/i.test(lbl)) {
        out += buildLoiGiaiDetailsFromLines(String(b.body || '').split('\n'), svgBlocks);
      } else {
        out += formatBodyLinesToHtml(String(b.body || '').split('\n'), svgBlocks);
      }
      i += 1;
      continue;
    }

    const loiM = line.match(LOI_GIAI_LINE_REGEX);
    if (loiM) {
      flushPara();
      const chunk = [];
      if ((loiM[1] || '').trim()) chunk.push(loiM[1]);
      i += 1;
      while (i < lines.length) {
        const L = lines[i];
        const T = String(L || '').trim();
        if (!T) break;
        if (LOI_GIAI_LINE_REGEX.test(L)) break;
        if (/^__BOX_BLOCK_\d+__$/.test(T)) break;
        chunk.push(L);
        i += 1;
      }
      out += buildLoiGiaiDetailsFromLines(chunk, svgBlocks);
      continue;
    }

    para.push(line);
    i += 1;
  }

  flushPara();
  return out;
}

function collectTrailingLoiGiaiHtml(lines, startIdx, boxBlocks, svgBlocks, consumedBoxIndices) {
  let tailHtml = '';
  let j = startIdx;
  while (j < lines.length) {
    const t = String(lines[j] || '').trim();
    if (!t) {
      j += 1;
      continue;
    }
    const nb = t.match(/^__BOX_BLOCK_(\d+)__$/);
    if (nb) {
      const bi = Number(nb[1]);
      const bl = boxBlocks[bi] || { label: '', body: '' };
      if (/lời\s*giải/i.test(String(bl.label || ''))) {
        consumedBoxIndices.add(bi);
        tailHtml += buildLoiGiaiDetailsFromLines(String(bl.body || '').split('\n'), svgBlocks);
        j += 1;
        continue;
      }
      break;
    }
    const loiM = lines[j].match(LOI_GIAI_LINE_REGEX);
    if (loiM) {
      const chunk = [];
      if ((loiM[1] || '').trim()) chunk.push(loiM[1]);
      j += 1;
      while (j < lines.length) {
        const L = lines[j];
        const T = String(L || '').trim();
        if (!T) break;
        if (LOI_GIAI_LINE_REGEX.test(L)) break;
        const innerBox = T.match(/^__BOX_BLOCK_(\d+)__$/);
        if (innerBox) break;
        chunk.push(L);
        j += 1;
      }
      tailHtml += buildLoiGiaiDetailsFromLines(chunk, svgBlocks);
      continue;
    }
    break;
  }
  return { tailHtml, nextIdx: j };
}

function isAllCapsHeading(line) {
  const t = line.trim();
  if (t.length < 6 || t.length > 72) return false;
  if (/[a-z]/.test(t)) return false;
  if (!/[A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬĐEÈÉẺẼẸÊỀẾỂỄỆIÌÍỈĨỊOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢUÙÚỦŨỤƯỪỨỬỮỰYỲÝỶỸỴ]/.test(t)) return false;
  return true;
}

/**
 * @param {string} source
 * @returns {string} HTML (chỉ thẻ hạn chế; nội dung đã escape trừ thẻ strong và công thức $)
 */
export function theoryCorePlainToHtml(source) {
  const raw0 = (source || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const svgBlocks = [];
  let rawWithSvg = raw0.replace(SVG_FENCE_REGEX, (full, inner) => {
    svgBlocks.push(String(inner ?? '').trim());
    return `\n__SVG_EMBED_${svgBlocks.length - 1}__\n`;
  });
  rawWithSvg = rawWithSvg.replace(/<svg\b[\s\S]*?<\/svg>/gi, (full) => {
    svgBlocks.push(String(full).trim());
    return `\n__SVG_EMBED_${svgBlocks.length - 1}__\n`;
  });

  // Syntax thẻ khối:
  // - #[Phương pháp: ...]# (mới)
  // - #[Ví dụ: ...]#
  // - #[Lời giải: ...]#  (render dạng đóng/mở)
  // - #[Định nghĩa: ...]#
  // - #[Ghi nhớ: ...]#
  // - \{ Lời giải: ... \} (cũ) hoặc {Lời giải: ...} (mới)
  // - {Phương pháp: ...} / {Ví dụ: ...} (có thể có dấu \ trước { } để dễ gõ)
  //
  // → sentinel line để parser chèn khung tương ứng.
  const boxBlocks = []; // { label, body }
  const BOX_LABEL_GROUP = '(Phương\\s*pháp|Ví\\s*dụ|Lời\\s*giải|Định\\s*nghĩa|Ghi\\s*nhớ)';
  // Format mới: #[Label: ...]# (cho phép xuống dòng). Ngoài ra bắt thêm biến thể lỗi gõ: #[Label: ...#]
  const BOX_BLOCK_HASH_REGEX = new RegExp(`#\\[\\s*${BOX_LABEL_GROUP}\\s*:\\s*([\\s\\S]*?)\\]#`, 'gi');
  const BOX_BLOCK_HASH_TYPO_REGEX = new RegExp(`#\\[\\s*${BOX_LABEL_GROUP}\\s*:\\s*([\\s\\S]*?)#\\]`, 'gi');
  // Format cũ: {Label: ...} hoặc \{...\}
  const BOX_BLOCK_BRACE_REGEX = new RegExp(`\\\\?\\{\\s*${BOX_LABEL_GROUP}\\s*:\\s*([\\s\\S]*?)\\\\?\\}`, 'gi');

  let withBoxes = rawWithSvg.replace(BOX_BLOCK_HASH_REGEX, (_full, label, inner) => {
    const idx = boxBlocks.length;
    boxBlocks.push({ label: String(label || '').trim(), body: String(inner ?? '').trim() });
    return `\n__BOX_BLOCK_${idx}__\n`;
  });
  withBoxes = withBoxes.replace(BOX_BLOCK_HASH_TYPO_REGEX, (_full, label, inner) => {
    const idx = boxBlocks.length;
    boxBlocks.push({ label: String(label || '').trim(), body: String(inner ?? '').trim() });
    return `\n__BOX_BLOCK_${idx}__\n`;
  });
  withBoxes = withBoxes.replace(BOX_BLOCK_BRACE_REGEX, (_full, label, inner) => {
    const idx = boxBlocks.length;
    boxBlocks.push({ label: String(label || '').trim(), body: String(inner ?? '').trim() });
    return `\n__BOX_BLOCK_${idx}__\n`;
  });

  // Giữ tương thích khối lời giải cũ: \{ Lời giải: ... \}
  const raw = withBoxes.replace(LOI_GIAI_BLOCK_REGEX, (_full, inner) => {
    const idx = boxBlocks.length;
    boxBlocks.push({ label: 'Lời giải', body: String(inner ?? '').trim() });
    return `\n__BOX_BLOCK_${idx}__\n`;
  });
  const lines = raw.split('\n');
  let html = '';
  let para = [];
  let tableBuffer = [];
  const consumedBoxIndices = new Set();

  const flushPara = () => {
    if (!para.length) return;
    const body = para.map((ln) => inlineFormatLine(ln)).join('<br/>');
    html += `<p class="mb-3 last:mb-0 leading-relaxed text-slate-800">${body}</p>`;
    para = [];
  };

  const flushTable = () => {
    if (tableBuffer.length === 0) return;
    html += buildTable(tableBuffer);
    tableBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') {
      flushTable();
      flushPara();
      continue;
    }

    // Word/Markdown đôi khi làm rơi dấu _ (đặc biệt khi copy/paste) khiến token __SVG_EMBED_i__ thành SVG_EMBED_i.
    // Chấp nhận cả 2 dạng để tránh hiện chữ "SVG_EMBED_0" ra giao diện.
    const svgM = trimmed.match(/^(?:__)?SVG_EMBED_(\d+)(?:__)?$/);
    if (svgM) {
      flushTable();
      flushPara();
      const bi = Number(svgM[1]);
      const rawSvg = svgBlocks[bi] || '';
      const clean = sanitizeSvgString(rawSvg);
      if (clean) {
        html += `<div class="svg-embed-wrap my-4 flex w-full justify-center overflow-x-auto rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm [&_svg]:max-w-full [&_svg]:h-auto">${clean}</div>`;
      }
      continue;
    }

    // Sentinel block: {Phương pháp: ...} / {Ví dụ: ...} / {Lời giải: ...}
    const boxM = trimmed.match(/^__BOX_BLOCK_(\d+)__$/);
    if (boxM) {
      flushTable();
      flushPara();
      const bi = Number(boxM[1]);
      if (consumedBoxIndices.has(bi)) continue;
      const b = boxBlocks[bi] || { label: '', body: '' };
      const labelRaw = String(b.label || '').trim();
      const label = labelRaw.toLowerCase();
      let bodyLines = String(b.body || '').split('\n');
      let viduBadge = null;
      if (/ví\s*dụ/i.test(label)) {
        const extracted = extractViduHeading(bodyLines);
        viduBadge = extracted.badge;
        bodyLines = extracted.lines;
      }

      if (/lời\s*giải/i.test(label)) {
        html += buildLoiGiaiDetailsFromLines(bodyLines, svgBlocks);
        continue;
      }

      const style = getTheoryBlockStyle(label);
      const isVidu = /ví\s*dụ/i.test(label);
      const inner = renderBlockBodyHtml(bodyLines, boxBlocks, svgBlocks);
      if (isVidu) {
        const { tailHtml, nextIdx } = collectTrailingLoiGiaiHtml(
          lines,
          i + 1,
          boxBlocks,
          svgBlocks,
          consumedBoxIndices
        );
        i = nextIdx - 1;
        const badge = escapeHtml(viduBadge || 'Ví dụ');
        html += `<div class="lesson-theory-block ${style.blockClass} my-6 md:my-8 rounded-xl ${style.shell} px-5 py-5 md:px-7 md:py-6"><span class="lesson-vidu-badge inline-block rounded-md border-2 border-slate-800 bg-transparent px-3 py-1 text-sm font-black text-slate-900 mb-4">${badge}</span><div class="text-slate-800 text-base md:text-lg leading-loose lesson-math-content">${inner}${tailHtml}</div></div>`;
      } else {
        html += `<div class="lesson-theory-block ${style.blockClass} my-6 md:my-8 rounded-xl ${style.shell} px-6 py-6 md:px-8 md:py-7"><div class="flex items-center gap-3 mb-4 md:mb-5">${style.badgeHtml}<div class="font-bold ${style.title} uppercase tracking-wide text-sm md:text-base">${escapeHtml(/ví\s*dụ/i.test(label) ? 'Ví dụ' : /phương\s*pháp/i.test(label) ? 'Phương pháp' : /định\s*nghĩa/i.test(label) ? 'Định nghĩa' : /ghi\s*nhớ/i.test(label) ? 'Ghi nhớ' : labelRaw)}</div></div><div class="text-slate-800 text-base md:text-lg leading-loose lesson-math-content">${inner}</div></div>`;
      }
      continue;
    }

    if (isTableRow(line)) {
      flushPara();
      if (isTableSeparator(trimmed)) continue;
      tableBuffer.push(parseTableRow(line));
      continue;
    }
    if (tableBuffer.length) {
      flushTable();
    }

    if (/^####\s+/.test(trimmed)) {
      flushPara();
      const inner = trimmed.replace(/^####\s+/, '');
      html += `<h5 class="mt-3 mb-2 text-sm font-bold text-slate-800 tracking-tight">${inlineFormatLine(inner)}</h5>`;
      continue;
    }
    if (/^###\s+/.test(trimmed)) {
      flushPara();
      const inner = trimmed.replace(/^###\s+/, '');
      html += `<h4 class="mt-4 mb-2 text-sm md:text-base font-bold text-cyan-900 border-l-4 border-cyan-500 pl-3">${inlineFormatLine(inner)}</h4>`;
      continue;
    }
    if (/^##\s+/.test(trimmed)) {
      flushPara();
      const inner = trimmed.replace(/^##\s+/, '');
      html += `<h3 class="mt-6 first:mt-0 mb-3 pb-2 border-b-2 border-teal-500/70 text-base md:text-lg font-black text-teal-900 tracking-tight">${inlineFormatLine(inner)}</h3>`;
      continue;
    }
    if (/^#\s+/.test(trimmed)) {
      flushPara();
      const inner = trimmed.replace(/^#\s+/, '');
      html += `<h2 class="mt-7 first:mt-0 mb-3 text-lg md:text-2xl font-black text-slate-900 leading-tight border-b border-teal-400/60 pb-2">${inlineFormatLine(inner)}</h2>`;
      continue;
    }

    if (/^\d{1,2}\.\s+/.test(trimmed) && !trimmed.includes('=')) {
      flushPara();
      const m = trimmed.match(/^(\d{1,2})\.\s+(.+)$/);
      const num = m ? m[1] : '';
      const title = m ? m[2] : trimmed.replace(/^\d{1,2}\.\s+/, '');
      html += `<h4 class="mt-5 mb-2 flex flex-wrap items-baseline gap-2 text-base md:text-lg font-black text-slate-900"><span class="inline-flex h-8 min-w-[2rem] shrink-0 items-center justify-center rounded-lg bg-teal-600 px-2 text-sm font-black text-white shadow-sm">${escapeHtml(num)}</span><span class="min-w-0 leading-snug">${inlineFormatLine(title)}</span></h4>`;
      continue;
    }

    if (isAllCapsHeading(trimmed) && !/^LỜI\s*GIẢI\s*:?\s*$/i.test(trimmed)) {
      flushPara();
      html += `<h5 class="mt-4 mb-2 text-xs md:text-sm font-black uppercase tracking-widest text-indigo-800 bg-indigo-50/95 border border-indigo-200/80 rounded-lg px-3 py-2">${escapeHtml(trimmed)}</h5>`;
      continue;
    }

    // Fallback syntax cũ: \Lời giải:
    const loiM = trimmed.match(LOI_GIAI_LINE_REGEX);
    if (loiM) {
      flushPara();
      flushTable();
      const bodyLines = [];
      if ((loiM[1] || '').trim()) bodyLines.push(loiM[1]);
      i += 1;
      while (i < lines.length) {
        const L = lines[i];
        const T = L.trim();
        if (T === '') break;
        if (LOI_GIAI_LINE_REGEX.test(L)) {
          i -= 1;
          break;
        }
        if (/^#{1,4}\s+/.test(T)) {
          i -= 1;
          break;
        }
        if (/^\d{1,2}\.\s+/.test(T) && !T.includes('=')) {
          i -= 1;
          break;
        }
        if (isAllCapsHeading(T)) {
          i -= 1;
          break;
        }
        if (/^\s*[-*•]\s+/.test(L)) {
          i -= 1;
          break;
        }
        if (isTableRow(L)) {
          i -= 1;
          break;
        }
        bodyLines.push(L);
        i += 1;
      }
      html += buildLoiGiaiDetailsFromLines(bodyLines, svgBlocks);
      continue;
    }

    if (/^\s*[-*•]\s+/.test(line)) {
      flushPara();
      const items = [];
      while (i < lines.length) {
        const L = lines[i];
        const tr = L.trim();
        if (!/^\s*[-*•]\s+/.test(L)) break;
        items.push(tr.replace(/^\s*[-*•]\s+/, ''));
        i += 1;
      }
      i -= 1;
      html +=
        '<ul class="my-3 ml-1 list-none space-y-2.5 border-l-[3px] border-teal-300/80 pl-4">' +
        items
          .map(
            (it) =>
              `<li class="relative pl-1 leading-relaxed before:absolute before:-left-3 before:top-2.5 before:h-1.5 before:w-1.5 before:rounded-full before:bg-teal-500">${inlineFormatLine(it)}</li>`
          )
          .join('') +
        '</ul>';
      continue;
    }

    para.push(line);
  }

  flushTable();
  flushPara();

  const out = html.trim();
  return out || `<p class="leading-relaxed text-slate-800">${inlineFormatLine(raw)}</p>`;
}

const PHUONG_PHAP_LABEL = 'Phương\\s*pháp';
const PHUONG_PHAP_BOX_REGEXES = [
  new RegExp(`#\\[\\s*${PHUONG_PHAP_LABEL}\\s*:\\s*([\\s\\S]*?)\\]#`, 'gi'),
  new RegExp(`#\\[\\s*${PHUONG_PHAP_LABEL}\\s*:\\s*([\\s\\S]*?)#\\]`, 'gi'),
  new RegExp(`\\\\?\\{\\s*${PHUONG_PHAP_LABEL}\\s*:\\s*([\\s\\S]*?)\\\\?\\}`, 'gi'),
];

/**
 * Tách các khối Phương pháp khỏi nguồn plain text (để hiển thị ở mục Các dạng toán).
 * @param {string} source
 * @returns {{ text: string, phuongPhapBodies: string[] }}
 */
export function splitPhuongPhapBlocks(source) {
  const raw = String(source ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const phuongPhapBodies = [];
  let text = raw;
  for (const re of PHUONG_PHAP_BOX_REGEXES) {
    text = text.replace(re, (_full, inner) => {
      const body = String(inner ?? '').trim();
      if (body) phuongPhapBodies.push(body);
      return '\n';
    });
  }
  return {
    text: text.replace(/\n{3,}/g, '\n\n').trim(),
    phuongPhapBodies,
  };
}

/** @param {string} body */
export function wrapPhuongPhapBlock(body) {
  return `#[Phương pháp: ${body}]#`;
}

/**
 * Tách dòng "Dạng:" / "Dạng 1:" và các khối Phương pháp còn lại trong examples_core.
 * @param {string} raw
 */
export function parseExamplesCoreStructure(raw) {
  const text = String(raw ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  if (!text) {
    return { dangBody: null, remainder: '', phuongPhapFromExamples: [] };
  }

  const lines = text.split('\n');
  const dangRe = /^(#{1,6}\s*)?(Dạng\s*\d*)\s*[:\-—]\s*(.*)$/i;
  let cutIdx = -1;
  let dangBody = null;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].trim().match(dangRe);
    if (m) {
      cutIdx = i;
      dangBody = (m[3] || '').trim();
      break;
    }
  }

  let remainder = cutIdx >= 0 ? lines.slice(cutIdx + 1).join('\n').trim() : text;
  const { text: withoutPp, phuongPhapBodies } = splitPhuongPhapBlocks(remainder);
  return {
    dangBody,
    remainder: withoutPp,
    phuongPhapFromExamples: phuongPhapBodies,
  };
}
