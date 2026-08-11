/* eslint-disable */
import { LOI_GIAI_BLOCK_REGEX, LOI_GIAI_LINE_REGEX } from './loiGiaiSegments';
import { sanitizeSvgString, SVG_FENCE_REGEX } from './svgEmbed';

/**
 * Chuyển nội dung lý thuyết trọng tâm (plain text / nhẹ markdown) → HTML an toàn + KaTeX.
 *
 * Hỗ trợ:
 * - # / ## — tiêu đề mục (nếu dạng "1. Tiêu đề" thì hiện badge tròn số như mục khái niệm)
 * - **in đậm** · *in nghiêng* · __gạch chân__
 * - [nhãn](https://url) — liên kết (http/https hoặc đường dẫn /...)
 * - {{#mãhex}}đoạn màu{{/}} — màu chữ (ví dụ {{#b91c1c}}...{{/}})
 * - {{@xs|sm|base|lg|xl|2xl}}đoạn{{/}} hoặc {{@18px}} — cỡ chữ hiển thị
 * - Bảng markdown: | c1 | c2 | + dòng |---|
 * - Gạch đầu dòng: - hoặc • hoặc *
 * - Dòng số mục: "1. Tiêu đề phần" (không chứa dấu =) → tiêu đề badge tròn
 * - Dòng IN HOA NGẮN (nhãn kiểu HÀM LƯỢNG GIÁC) → tiêu đề nhỏ
 * - Tự bọc $...$ cho dòng có dạng công thức (= và ^_{} hoặc \frac...) nếu chưa có $
 * - Khối display: $$...$$ hoặc \[...\] (kể cả nhiều dòng); inline: $...$ hoặc \(...\)
 * - Khối Chú ý: ... --- → đóng khung đỏ (chỉ lý thuyết trọng tâm)
 * - Trong lý thuyết trọng tâm: "Ví dụ:" là chữ thường (không đóng khung như mục Các dạng toán)
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

/** Icon + màu khối lý thuyết (Định nghĩa / Định lí / Ghi nhớ / Phương pháp / Ví dụ) — khớp UI mẫu. */
const THEORY_ICON_QUOTE = `<span class="lesson-theory-icon lesson-theory-icon--quote" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5H3v14z"/><path d="M14 21c3 0 7-1 7-8V5h-7v14z"/></svg></span>`;
const THEORY_ICON_PIN = `<span class="lesson-theory-icon lesson-theory-icon--pin" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4.76z"/></svg></span>`;
const THEORY_ICON_LAYERS = `<span class="lesson-theory-icon lesson-theory-icon--layers" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg></span>`;
const THEORY_ICON_EXAMPLE = `<span class="lesson-theory-icon lesson-theory-icon--example" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg></span>`;
const THEORY_ICON_THEOREM = `<span class="lesson-theory-icon lesson-theory-icon--theorem" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M8 7h6"/><path d="M8 11h8"/></svg></span>`;
const THEORY_ICON_NOTE = `<span class="lesson-theory-icon lesson-theory-icon--note" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-3.6-3.6"/><path d="M11 8v1.5"/><circle cx="11" cy="13.2" r="1.1" fill="currentColor" stroke="none"/></svg></span>`;

/**
 * Import hay ghi \\le, \\frac như JSON — trong $...$ KaTeX hiểu \\ là xuống dòng → hiện "le0".
 * Chuẩn hoá \\lệnh → \lệnh trong các khối $ / $$ / \[ \] / \( \).
 * Đồng thời align → aligned (KaTeX).
 * Tách tạm thẻ <img> để không đụng URL ảnh khi xử lý công thức.
 */
export function normalizeDoubleBackslashInMath(text) {
  const s0 = String(text ?? '');
  if (!s0.includes('\\') && !s0.includes('<img')) return s0;

  const imgHold = [];
  let s = s0.replace(/<img\b[^>]*>/gi, (full) => {
    const i = imgHold.length;
    imgHold.push(full);
    return `\x00IMGHOLD${i}\x00`;
  });

  if (s.includes('\\')) {
    // Đưa \[ \] \( \) về $ / $$ trước để cùng một vòng xử lý
    s = s
      .replace(/(^|[^#\\])\\{1,2}\[([\s\S]*?)\\{1,2}\](?!#)/g, (_, pre, inner) => `${pre}$$${inner}$$`)
      .replace(/(^|[^\\])\\{1,2}\(([\s\S]*?)\\{1,2}\)/g, (_, pre, inner) => `${pre}$${inner}$`);

    // Word/MathType: \begin{align} trong $...$ → aligned (KaTeX hỗ trợ)
    s = s.replace(/\\begin\{align\*?\}/gi, '\\begin{aligned}');
    s = s.replace(/\\end\{align\*?\}/gi, '\\end{aligned}');
    s = s.replace(/\\begin\{eqnarray\*?\}/gi, '\\begin{aligned}');
    s = s.replace(/\\end\{eqnarray\*?\}/gi, '\\end{aligned}');
    s = s.replace(/\\right(?=\s*\$)/g, '\\right.');
    s = s.replace(/\\right(\s*)(?=\$\$)/g, '\\right.$1');

    const re = /(\$\$[\s\S]*?\$\$|\$[^$]*\$)/g;
    let out = '';
    let last = 0;
    let m;
    while ((m = re.exec(s)) !== null) {
      out += s.slice(last, m.index);
      const token = m[0];
      if (token.startsWith('$$')) {
        const inner = token.slice(2, -2).replace(/\\\\([a-zA-Z]+)/g, '\\$1');
        out += `$$${inner}$$`;
      } else {
        const inner = token.slice(1, -1).replace(/\\\\([a-zA-Z]+)/g, '\\$1');
        out += `$${inner}$`;
      }
      last = m.index + token.length;
    }
    out += s.slice(last);
    s = out;
  }

  for (let i = imgHold.length - 1; i >= 0; i -= 1) {
    s = s.split(`\x00IMGHOLD${i}\x00`).join(imgHold[i]);
  }
  return s;
}

function getTheoryBlockStyle(label) {
  if (/chú\s*ý/i.test(label)) {
    return {
      blockClass: 'lesson-theory-block--note',
      shell: 'lesson-theory-note-shell',
      title: 'text-white',
      badgeHtml: THEORY_ICON_NOTE,
    };
  }
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
  if (/định\s*lí|định\s*lý/i.test(label)) {
    return {
      blockClass: 'lesson-theory-block--theorem',
      shell: 'bg-amber-50 border-[3px] border-amber-500 shadow-sm shadow-amber-100/80',
      title: 'text-amber-900',
      badgeHtml: THEORY_ICON_THEOREM,
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

/**
 * Format mới (không cần #[...]#):
 *   Định nghĩa: / Định lí: / Ghi nhớ: / Chú ý: / Phương pháp: / Ví dụ … / Lời giải …
 *   ---
 * Chuyển thành #[Label: body]# để dùng chung pipeline render.
 *
 * @param {string} source
 * @param {{ includeVidu?: boolean, includeChuY?: boolean, includeLoiGiai?: boolean }} [opts]
 *   - includeVidu: mặc định true (Các dạng toán). Lý thuyết trọng tâm → false.
 *   - includeChuY: mặc định true.
 *   - includeLoiGiai: mặc định true. Tắt khi tách cấu trúc dạng để giữ plain cho nhận diện tương tác.
 */
function buildPlainBlockLabelRe({ includeChuY = true } = {}) {
  // Nhãn “cứng” — bắt buộc có dấu : (tránh bắt nhầm câu thường)
  const parts = [
    'Định\\s*nghĩa',
    'Định\\s*lí',
    'Định\\s*lý',
    'Ghi\\s*nhớ',
    'Phương\\s*pháp',
  ];
  if (includeChuY) parts.push('Chú\\s*ý');
  return new RegExp(`^(${parts.join('|')})\\s*:\\s*(.*)$`, 'i');
}

/** Ví dụ 3.5. … / Ví dụ 1: … / Ví dụ … — chỉ cần có từ “Ví dụ” đầu dòng */
const VIDU_LINE_RE =
  /^(Ví\s*dụ(?:\s*\d+(?:\.\d+)*)?|Bài(?:\s*\d+(?:\.\d+)*)?)\s*[:.\-—]?\s*(.*)$/i;

/** Lời giải / Lời giải: / Lời giải. — không bắt buộc dấu : (tránh “Lời giải thích”) */
const LOI_GIAI_FLEX_LINE_RE = /^(Lời\s*giải)(?:\s*[:.\-—]\s*(.*))?$/i;

function matchFlexibleBlockLabel(trimmed, { includeVidu = true, includeLoiGiai = true } = {}) {
  if (includeVidu) {
    const mv = String(trimmed || '').match(VIDU_LINE_RE);
    if (mv) return { label: mv[1], rest: mv[2] ?? '' };
  }
  if (includeLoiGiai) {
    const ml = String(trimmed || '').match(LOI_GIAI_FLEX_LINE_RE);
    if (ml) return { label: ml[1], rest: ml[2] ?? '' };
  }
  return null;
}

function canonicalizePlainBlockLabel(rawLabel) {
  const label = String(rawLabel || '').trim();
  if (/chú\s*ý/i.test(label)) return 'Chú ý';
  if (/định\s*lý/i.test(label)) return 'Định lí';
  if (/định\s*lí/i.test(label)) return 'Định lí';
  if (/định\s*nghĩa/i.test(label)) return 'Định nghĩa';
  if (/ghi\s*nhớ/i.test(label)) return 'Ghi nhớ';
  if (/phương\s*pháp/i.test(label)) return 'Phương pháp';
  if (/lời\s*giải/i.test(label)) return 'Lời giải';
  const bai = label.match(/^Bài\s*(\d+(?:\.\d+)*)?$/i);
  if (bai) return bai[1] ? `Ví dụ ${bai[1]}` : 'Ví dụ';
  const vidu = label.match(/^Ví\s*dụ(?:\s*(\d+(?:\.\d+)*))?$/i);
  if (vidu) return vidu[1] ? `Ví dụ ${vidu[1]}` : 'Ví dụ';
  return label;
}

export function expandPlainLabeledBlocks(source, opts = {}) {
  const includeVidu = opts.includeVidu !== false;
  const includeChuY = opts.includeChuY !== false;
  const includeLoiGiai = opts.includeLoiGiai !== false;
  const plainLabelRe = buildPlainBlockLabelRe({ includeChuY });
  const isBlockStart = (t) =>
    Boolean(t.match(plainLabelRe) || matchFlexibleBlockLabel(t, { includeVidu, includeLoiGiai }));

  const raw = String(source ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  if (!raw.trim()) return raw;

  const lines = raw.split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Giữ nguyên khối #[...]# / \{...\} cũ — copy đến hết dòng đóng
    if (
      /^#\[/.test(trimmed) ||
      /^\\?\{\s*(Phương\s*pháp|Ví\s*dụ|Lời\s*giải|Định\s*nghĩa|Định\s*lí|Định\s*lý|Ghi\s*nhớ|Chú\s*ý)\s*:/i.test(
        trimmed
      )
    ) {
      const chunk = [line];
      i += 1;
      const isHash = /^#\[/.test(trimmed);
      while (i < lines.length) {
        chunk.push(lines[i]);
        const t = lines[i].trim();
        if (isHash && (/\]#$/.test(t) || /#\]$/.test(t))) {
          i += 1;
          break;
        }
        if (!isHash && /\\?\}$/.test(t)) {
          i += 1;
          break;
        }
        i += 1;
      }
      out.push(...chunk);
      continue;
    }

    if (/^-{3,}$/.test(trimmed)) {
      out.push('');
      i += 1;
      continue;
    }

    const flex = matchFlexibleBlockLabel(trimmed, { includeVidu, includeLoiGiai });
    const m = flex ? null : trimmed.match(plainLabelRe);
    if (flex || m) {
      const canon = canonicalizePlainBlockLabel(flex ? flex.label : m[1]);
      const bodyLines = [];
      const rest = String(flex ? flex.rest : m[2] ?? '').trim();
      if (rest) bodyLines.push(rest);
      i += 1;
      while (i < lines.length) {
        const t = lines[i].trim();
        if (/^-{3,}$/.test(t)) {
          i += 1;
          break;
        }
        if (isBlockStart(t)) break;
        if (/^#\[/.test(t)) break;
        bodyLines.push(lines[i]);
        i += 1;
      }
      const body = bodyLines.join('\n').replace(/\n+$/g, '').trim();
      out.push(`#[${canon}:`);
      out.push(body);
      out.push(']#');
      out.push('');
      continue;
    }

    out.push(line);
    i += 1;
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function isAllowedLinkUrl(url) {
  const u = String(url || '').trim();
  if (!u || /^\s*javascript:/i.test(u)) return false;
  if (/^https?:\/\//i.test(u)) return true;
  if (u.startsWith('/') && !u.startsWith('//')) return true;
  if (u.startsWith('./') || u.startsWith('../')) return true;
  return false;
}

function isAllowedTheoryImageUrl(url) {
  const u = decodeBasicHtmlEntities(String(url || '').trim());
  if (!u) return false;
  if (/^\s*javascript:/i.test(u)) return false;
  if (/^\s*data:(?!image\/)/i.test(u)) return false;
  if (/^https?:\/\//i.test(u)) return true;
  if (u.startsWith('/') && !u.startsWith('//')) return true;
  if (u.startsWith('./') || u.startsWith('../')) return true;
  if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml);/i.test(u)) return true;
  return false;
}

function decodeBasicHtmlEntities(s) {
  return String(s || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function theoryImageTagHtml(alt, url) {
  const src = decodeBasicHtmlEntities(String(url || '').trim());
  const a = String(alt || 'Hình minh họa').trim() || 'Hình minh họa';
  if (!isAllowedTheoryImageUrl(src)) return '';
  return (
    `<img src="${escapeHtmlAttr(src)}" alt="${escapeHtmlAttr(a)}" ` +
    `class="max-w-full h-auto rounded-lg my-3 border border-slate-200 shadow-sm block mx-auto" ` +
    `loading="lazy" decoding="async" data-lesson-img="1" />`
  );
}

const FONT_SIZE_CLASS = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
};

function fontSizeSpanHtml(sizeKey, innerHtml) {
  const key = String(sizeKey || '').trim().toLowerCase();
  const preset = FONT_SIZE_CLASS[key];
  if (preset) return `<span class="${preset}">${innerHtml}</span>`;
  if (/^\d+(?:\.\d+)?(?:px|rem|em|%)$/.test(key)) {
    return `<span style="font-size:${key}">${innerHtml}</span>`;
  }
  if (/^\d+(?:\.\d+)?$/.test(key)) {
    return `<span style="font-size:${key}px">${innerHtml}</span>`;
  }
  return innerHtml;
}

/**
 * Đoạn văn bản (không chứa khối $...$) → HTML inline: **đậm**, *nghiêng*, __gạch chân__, [nhãn](url), {{#mã}}màu{{/}}, {{@cỡ}}chữ{{/}}
 */
export function inlineRichTextToHtml(s) {
  return richTextToHtml(s);
}

function richTextToHtml(s) {
  const colors = [];
  const fonts = [];
  const images = [];
  let t = String(s);
  // Ảnh markdown TRƯỚC link [text](url) — tránh ![ảnh](url) bị biến thành liên kết «ảnh»
  t = t.replace(/!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?\s*\)/g, (full, alt, url) => {
    const u = decodeBasicHtmlEntities(String(url || '').trim());
    if (!isAllowedTheoryImageUrl(u)) return full;
    const i = images.length;
    images.push({ alt: String(alt || '').trim(), url: u });
    return `\x00IMG${i}\x00`;
  });
  t = t.replace(/\{\{#([#a-fA-F0-9]{3,8})\}\}([\s\S]*?)\{\{\/\}\}/g, (full, col, inner) => {
    const i = colors.length;
    colors.push({ col, inner });
    return `\x00COL${i}\x00`;
  });
  t = t.replace(/\{\{@([a-zA-Z0-9.%]+)\}\}([\s\S]*?)\{\{\/\}\}/g, (full, size, inner) => {
    const i = fonts.length;
    fonts.push({ size, inner });
    return `\x00FNT${i}\x00`;
  });
  const links = [];
  // (?<!\!) — không khớp phần [alt](url) của ảnh markdown
  t = t.replace(/(?<!!)\[([^\]]*)\]\(\s*<?([^)\s>]+)>?\s*\)/g, (full, label, url) => {
    const u = decodeBasicHtmlEntities(String(url || '').trim());
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
  for (let i = fonts.length - 1; i >= 0; i--) {
    const { size, inner } = fonts[i];
    const innerHtml = escapeHtml(inner);
    t = t.split(`\x00FNT${i}\x00`).join(fontSizeSpanHtml(size, innerHtml));
  }
  for (let i = images.length - 1; i >= 0; i--) {
    const { alt, url } = images[i];
    t = t.split(`\x00IMG${i}\x00`).join(theoryImageTagHtml(alt, url));
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
  // $$...$$ (display, có thể nhiều dòng) | \[...\] | \(...\) | $...$ (inline một dòng)
  const re = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$[^$\n]*\$)/g;
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
  if (!t || /\$|\\\[|\\\(/.test(t)) return line;
  if (/=/.test(t) && (/[\^_{}]/.test(t) || /\\[a-zA-Z]+/.test(t) || /\)\s*'/.test(t) || /'\s*=/.test(t))) {
    return `$${t}$`;
  }
  return line;
}

/** Chuẩn hoá \[ \] → $$ và tách khối display thành sentinel (tránh vỡ khi join &lt;br/&gt;). */
function extractDisplayMathPlaceholders(text) {
  let raw = normalizeDoubleBackslashInMath(String(text ?? ''));
  const blocks = [];
  raw = raw.replace(/\$\$([\s\S]*?)\$\$/g, (_full, inner) => {
    const idx = blocks.length;
    blocks.push(String(inner ?? '').trim());
    return `\n__MATH_DISPLAY_${idx}__\n`;
  });
  return { text: raw, blocks };
}

function mathDisplayPlaceholderHtml(trimmed, blocks) {
  const m = String(trimmed || '').match(/^__MATH_DISPLAY_(\d+)__$/);
  if (!m) return null;
  const tex = blocks[Number(m[1])] || '';
  return `<div class="my-4 overflow-x-auto text-center">$$${tex}$$</div>`;
}

function prepareLinesWithDisplayMath(bodyLines) {
  const { text, blocks } = extractDisplayMathPlaceholders(
    (Array.isArray(bodyLines) ? bodyLines : [bodyLines]).map((l) => String(l ?? '')).join('\n')
  );
  return { lines: text.split('\n'), displayMathBlocks: blocks };
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
  const m = first.match(/^Ví dụ\s*(\d+(?:\.\d+)*)\s*(?:[:\.\-—]\s*)?(.*)$/i);
  if (m) {
    const badge = `Ví dụ ${m[1]}`;
    if (m[2]) lines[0] = m[2];
    else lines.shift();
    return { badge, lines };
  }
  return { badge: 'Ví dụ', lines };
}

/**
 * Badge khung Ví dụ theo dạng: Dạng 1 → Ví dụ 1.1, 1.2…; Dạng 2 → 2.1, 2.2…
 * @param {string} rawBadge
 * @param {{ n: number, dang?: number } | null | undefined} viduCounter
 */
function resolveViduDisplayBadge(rawBadge, viduCounter) {
  const raw = String(rawBadge || '').trim() || 'Ví dụ';
  if (!viduCounter) return raw;

  const dang = Number(viduCounter.dang);
  const hasDang = Number.isFinite(dang) && dang > 0;

  // Trong một dạng: luôn đánh số dạng.thứ_tự (1.1, 1.2, …)
  if (hasDang) {
    viduCounter.n += 1;
    return `Ví dụ ${dang}.${viduCounter.n}`;
  }

  // Không thuộc dạng nào (preface): Ví dụ 1, 2, 3…
  const m = raw.match(/^Ví\s*dụ\s*(\d+(?:\.\d+)*)\s*$/i);
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n)) viduCounter.n = Math.max(viduCounter.n, Math.floor(n));
    return `Ví dụ ${m[1]}`;
  }
  if (/^Ví\s*dụ\s*:?\s*$/i.test(raw) || /^Bài\s*:?\s*$/i.test(raw)) {
    viduCounter.n += 1;
    return `Ví dụ ${viduCounter.n}`;
  }
  return raw;
}

/** Lấy số dạng từ nhãn «Dạng 2» / «Dang 1»; fallback = chỉ số thứ tự nhóm (1-based). */
export function extractDangNumber(dangLabel, groupIndex = 0) {
  const m = String(dangLabel || '').match(/(?:Dạng|Dang)\s*(\d+)/i);
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return Math.max(1, (Number(groupIndex) || 0) + 1);
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
  const { lines, displayMathBlocks } = prepareLinesWithDisplayMath(bodyLines);
  return lines
    .map((ln) => {
      const t = String(ln || '').trim();
      if (!t) return '';
      const mathHtml = mathDisplayPlaceholderHtml(t, displayMathBlocks);
      if (mathHtml) return mathHtml;
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
  const prepared = prepareLinesWithDisplayMath(bodyLines);
  const lines = prepared.lines;
  const displayMathBlocks = prepared.displayMathBlocks;
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

    const mathHtml = mathDisplayPlaceholderHtml(trimmed, displayMathBlocks);
    if (mathHtml) {
      flushPara();
      out += mathHtml;
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

/** Tiêu đề mục kiểu "1. Khái niệm..." — badge tròn số (H1/H2 / dòng đánh số). */
function sectionHeadingHtml(rawTitle, tag = 'h2') {
  const t = String(rawTitle || '').trim();
  const m = t.match(/^(\d{1,2})\.\s+(.+)$/);
  if (m) {
    return `<${tag} class="lesson-theory-section-heading mt-6 first:mt-0 mb-3 flex flex-wrap items-center gap-2.5 text-base md:text-lg font-black text-slate-900 leading-snug"><span class="lesson-theory-section-num">${escapeHtml(m[1])}</span><span class="min-w-0 leading-snug">${inlineFormatLine(m[2])}</span></${tag}>`;
  }
  return `<${tag} class="lesson-theory-section-heading mt-6 first:mt-0 mb-3 text-base md:text-lg font-black text-slate-900 leading-snug">${inlineFormatLine(t)}</${tag}>`;
}

/**
 * @param {string} source
 * @param {{ viduAsFrame?: boolean, viduCounter?: { n: number, dang?: number }, forcedViduBadge?: string }} [opts]
 *   - viduAsFrame: true → khung Ví dụ (dùng cho Các dạng toán / examples_core).
 *     Mặc định false: Lý thuyết trọng tâm giữ “Ví dụ” như chữ thường.
 *   - viduCounter: { dang, n } — dang = số dạng → badge «Ví dụ 1.1»; không dang → «Ví dụ 1»
 *   - forcedViduBadge: ép badge (vd. «Ví dụ 1.2») khi render từng ví dụ riêng
 * @returns {string} HTML (chỉ thẻ hạn chế; nội dung đã escape trừ thẻ strong và công thức $)
 */
export function theoryCorePlainToHtml(source, opts = {}) {
  const viduAsFrame = opts.viduAsFrame === true;
  const forcedViduBadge = String(opts.forcedViduBadge || '').trim();
  const viduCounter = viduAsFrame
    ? opts.viduCounter && typeof opts.viduCounter === 'object'
      ? opts.viduCounter
      : { n: 0 }
    : null;
  const raw0 = normalizeDoubleBackslashInMath(
    expandPlainLabeledBlocks((source || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n'), {
      includeVidu: viduAsFrame,
      includeChuY: true,
    })
  );

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
  // Format mới: Định nghĩa: / Định lí: / Ghi nhớ: / Chú ý: / Phương pháp: + ---
  // (Không nhận Ví dụ: thành khung trong lý thuyết — giữ chữ thường)
  // - #[Phương pháp: ...]# (cũ, vẫn hỗ trợ)
  // - #[Lời giải: ...]#  (render dạng đóng/mở)
  // - #[Định nghĩa: ...]# / #[Định lí: ...]# / #[Ghi nhớ: ...]# / #[Chú ý: ...]#
  // - \{ Lời giải: ... \} (cũ) hoặc {Lời giải: ...} (mới)
  //
  // → sentinel line để parser chèn khung tương ứng.
  const boxBlocks = []; // { label, body }
  const BOX_LABEL_GROUP =
    '(Phương\\s*pháp|Lời\\s*giải|Định\\s*nghĩa|Định\\s*lí|Định\\s*lý|Ghi\\s*nhớ|Chú\\s*ý|Ví\\s*dụ(?:\\s*\\d+(?:\\.\\d+)*)?|Bài(?:\\s*\\d+(?:\\.\\d+)*)?)';
  // Format hash: #[Label: ...]# (cho phép xuống dòng). Ngoài ra bắt thêm biến thể lỗi gõ: #[Label: ...#]
  const BOX_BLOCK_HASH_REGEX = new RegExp(`#\\[\\s*${BOX_LABEL_GROUP}\\s*:\\s*([\\s\\S]*?)\\]#`, 'gi');
  const BOX_BLOCK_HASH_TYPO_REGEX = new RegExp(`#\\[\\s*${BOX_LABEL_GROUP}\\s*:\\s*([\\s\\S]*?)#\\]`, 'gi');
  // Format cũ: {Label: ...} hoặc \{...\}
  const BOX_BLOCK_BRACE_REGEX = new RegExp(`\\\\?\\{\\s*${BOX_LABEL_GROUP}\\s*:\\s*([\\s\\S]*?)\\\\?\\}`, 'gi');

  let withBoxes = rawWithSvg.replace(BOX_BLOCK_HASH_REGEX, (_full, label, inner) => {
    const idx = boxBlocks.length;
    boxBlocks.push({
      label: canonicalizePlainBlockLabel(String(label || '').trim()),
      body: String(inner ?? '').trim(),
    });
    return `\n__BOX_BLOCK_${idx}__\n`;
  });
  withBoxes = withBoxes.replace(BOX_BLOCK_HASH_TYPO_REGEX, (_full, label, inner) => {
    const idx = boxBlocks.length;
    boxBlocks.push({
      label: canonicalizePlainBlockLabel(String(label || '').trim()),
      body: String(inner ?? '').trim(),
    });
    return `\n__BOX_BLOCK_${idx}__\n`;
  });
  withBoxes = withBoxes.replace(BOX_BLOCK_BRACE_REGEX, (_full, label, inner) => {
    const idx = boxBlocks.length;
    boxBlocks.push({
      label: canonicalizePlainBlockLabel(String(label || '').trim()),
      body: String(inner ?? '').trim(),
    });
    return `\n__BOX_BLOCK_${idx}__\n`;
  });

  // Giữ tương thích khối lời giải cũ: \{ Lời giải: ... \}
  let raw = withBoxes.replace(LOI_GIAI_BLOCK_REGEX, (_full, inner) => {
    const idx = boxBlocks.length;
    boxBlocks.push({ label: 'Lời giải', body: String(inner ?? '').trim() });
    return `\n__BOX_BLOCK_${idx}__\n`;
  });

  const preparedMain = extractDisplayMathPlaceholders(raw);
  raw = preparedMain.text;
  const displayMathBlocks = preparedMain.blocks;

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

    const mathHtml = mathDisplayPlaceholderHtml(trimmed, displayMathBlocks);
    if (mathHtml) {
      flushTable();
      flushPara();
      html += mathHtml;
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
        // Ưu tiên badge ép từ ngoài (Ví dụ 1.2…); sau đó label có số; rồi mới đọc dòng đầu body.
        if (forcedViduBadge) {
          viduBadge = forcedViduBadge;
        } else {
          const extracted = extractViduHeading(bodyLines);
          const fromBody = extracted.badge;
          const bodyHasNumber = /^Ví\s*dụ\s+\d/i.test(String(fromBody || ''));
          const labelHasNumber = /^Ví\s*dụ\s+\d/i.test(labelRaw);
          if (bodyHasNumber) {
            viduBadge = fromBody;
            bodyLines = extracted.lines;
          } else if (labelHasNumber) {
            viduBadge = labelRaw;
            // Body không chứa dòng tiêu đề Ví dụ — giữ nguyên bodyLines
          } else {
            viduBadge = fromBody || labelRaw || 'Ví dụ';
            bodyLines = extracted.lines;
          }
        }
      }

      if (/lời\s*giải/i.test(label)) {
        html += buildLoiGiaiDetailsFromLines(bodyLines, svgBlocks);
        continue;
      }

      // Lý thuyết trọng tâm: Ví dụ không đóng khung — hiện như chữ thường.
      // Các dạng toán (viduAsFrame): đóng khung Ví dụ + kéo theo Lời giải phía sau.
      if (/ví\s*dụ/i.test(label)) {
        const badge = escapeHtml(
          forcedViduBadge ||
            resolveViduDisplayBadge(viduBadge || labelRaw || 'Ví dụ', viduCounter)
        );
        const inner = renderBlockBodyHtml(bodyLines, boxBlocks, svgBlocks);
        if (!viduAsFrame) {
          html += `<p class="mb-2 mt-4 font-semibold text-slate-800">${badge}</p><div class="text-slate-800 text-base md:text-lg leading-loose lesson-math-content">${inner}</div>`;
          continue;
        }
        const { tailHtml, nextIdx } = collectTrailingLoiGiaiHtml(
          lines,
          i + 1,
          boxBlocks,
          svgBlocks,
          consumedBoxIndices
        );
        i = nextIdx - 1;
        const style = getTheoryBlockStyle(label);
        html += `<div class="lesson-theory-block ${style.blockClass} my-6 md:my-8 rounded-xl ${style.shell} px-5 py-5 md:px-7 md:py-6"><span class="lesson-vidu-badge inline-block rounded-md border-2 border-slate-800 bg-transparent px-3 py-1 text-sm font-black text-slate-900 mb-4">${badge}</span><div class="text-slate-800 text-base md:text-lg leading-loose lesson-math-content">${inner}${tailHtml}</div></div>`;
        continue;
      }

      const style = getTheoryBlockStyle(label);
      const inner = renderBlockBodyHtml(bodyLines, boxBlocks, svgBlocks);

      if (/chú\s*ý/i.test(label)) {
        html += `<div class="lesson-theory-block ${style.blockClass} ${style.shell}"><div class="lesson-theory-note-header">${style.badgeHtml}<span class="lesson-theory-note-badge">Chú ý</span></div><div class="text-slate-800 text-base md:text-lg leading-loose lesson-math-content">${inner}</div></div>`;
        continue;
      }

      const titleLabel = /phương\s*pháp/i.test(label)
        ? 'Phương pháp'
        : /định\s*nghĩa/i.test(label)
          ? 'Định nghĩa'
          : /định\s*lí|định\s*lý/i.test(label)
            ? 'Định lí'
            : /ghi\s*nhớ/i.test(label)
              ? 'Ghi nhớ'
              : labelRaw;
      html += `<div class="lesson-theory-block ${style.blockClass} my-6 md:my-8 rounded-xl ${style.shell} px-6 py-6 md:px-8 md:py-7"><div class="flex items-center gap-3 mb-4 md:mb-5">${style.badgeHtml}<div class="font-bold ${style.title} uppercase tracking-wide text-sm md:text-base">${escapeHtml(titleLabel)}</div></div><div class="text-slate-800 text-base md:text-lg leading-loose lesson-math-content">${inner}</div></div>`;
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
      html += sectionHeadingHtml(trimmed.replace(/^###\s+/, ''), 'h4');
      continue;
    }
    if (/^##\s+/.test(trimmed)) {
      flushPara();
      html += sectionHeadingHtml(trimmed.replace(/^##\s+/, ''), 'h3');
      continue;
    }
    if (/^#\s+/.test(trimmed)) {
      flushPara();
      html += sectionHeadingHtml(trimmed.replace(/^#\s+/, ''), 'h2');
      continue;
    }

    if (/^\d{1,2}\.\s+/.test(trimmed) && !trimmed.includes('=')) {
      flushPara();
      html += sectionHeadingHtml(trimmed, 'h2');
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
  const raw = expandPlainLabeledBlocks(
    String(source ?? '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
  );
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
 * Tách examples_core thành từng Dạng (mỗi dạng giữ Phương pháp + Ví dụ riêng).
 * @param {string} raw
 * @returns {{
 *   groups: Array<{ dangLabel: string|null, dangBody: string|null, dangTitle: string|null, phuongPhapBodies: string[], content: string }>,
 *   preface: string,
 *   dangBody: string|null,
 *   remainder: string,
 *   phuongPhapFromExamples: string[],
 * }}
 */
export function parseExamplesCoreStructure(raw) {
  // Giữ Ví dụ / Lời giải dạng plain để nhận diện tương tác; chỉ bọc các khối khác (Phương pháp…).
  const text = expandPlainLabeledBlocks(
    String(raw ?? '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim(),
    { includeVidu: false, includeLoiGiai: false }
  );
  if (!text) {
    return {
      groups: [],
      preface: '',
      dangBody: null,
      remainder: '',
      phuongPhapFromExamples: [],
    };
  }

  const lines = text.split('\n');
  const dangRe = /^(#{1,6}\s*)?((?:Dạng|Dang)\s*\d*)\s*[:.\-—]?\s*(.*)$/i;
  const dangHits = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].trim().match(dangRe);
    if (!m) continue;
    dangHits.push({
      index: i,
      label: String(m[2] || 'Dạng').trim(),
      body: String(m[3] || '').trim(),
      title: lines[i].trim().replace(/^#{1,6}\s*/, ''),
    });
  }

  if (dangHits.length === 0) {
    const { text: withoutPp, phuongPhapBodies } = splitPhuongPhapBlocks(text);
    return {
      groups: [
        {
          dangLabel: null,
          dangBody: null,
          dangTitle: null,
          phuongPhapBodies,
          content: withoutPp,
        },
      ],
      preface: '',
      dangBody: null,
      remainder: withoutPp,
      phuongPhapFromExamples: phuongPhapBodies,
    };
  }

  const preface = lines.slice(0, dangHits[0].index).join('\n').trim();
  const groups = dangHits.map((hit, gi) => {
    const start = hit.index + 1;
    const end = gi + 1 < dangHits.length ? dangHits[gi + 1].index : lines.length;
    const chunk = lines.slice(start, end).join('\n').trim();
    const { text: content, phuongPhapBodies } = splitPhuongPhapBlocks(chunk);
    return {
      dangLabel: hit.label,
      dangBody: hit.body,
      dangTitle: hit.title,
      phuongPhapBodies,
      content,
    };
  });

  const allPp = groups.flatMap((g) => g.phuongPhapBodies);
  return {
    groups,
    preface,
    // Tương thích UI cũ (chỉ lấy dạng đầu)
    dangBody: groups[0]?.dangBody || null,
    remainder: groups.map((g) => g.content).filter(Boolean).join('\n\n'),
    phuongPhapFromExamples: allPp,
  };
}
