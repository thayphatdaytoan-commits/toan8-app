/**
 * Nhúng SVG an toàn (bài giảng / đề / luyện tập).
 * Hỗ trợ: khối ```svg ... ``` hoặc thẻ <svg>...</svg> dán trực tiếp.
 * Loại bỏ script, foreignObject, sự kiện on*, href javascript:...
 */

const SVG_TAG_ALLOW = new Set([
  'svg',
  'g',
  'defs',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'lineargradient',
  'radialgradient',
  'stop',
  'clippath',
  'mask',
  'pattern',
  'marker',
  'use',
  'title',
  'desc',
  'symbol',
  'view',
  'image',
  'filter',
  'fegaussianblur',
  'feoffset',
  'femerge',
  'femergenode',
  'fecolormatrix',
  'feflood',
  'fecomposite',
  'feblend',
  'feimage',
  'fediffuselighting',
  'fespecularlighting',
  'fedistantlight',
  'fepointlight',
  'fespotlight',
  'textpath',
  'animate',
  'animatetransform',
  'set',
  'mpath',
]);

function attrLooksSafe(name, value) {
  const n = String(name || '').toLowerCase();
  const v = String(value ?? '');
  if (n.startsWith('on')) return false;
  if (n === 'style' && /(javascript:|@import|expression\s*\(|url\s*\(\s*["']?\s*javascript:)/i.test(v)) return false;
  if ((n === 'href' || n === 'xlink:href') && /^\s*javascript:/i.test(v)) return false;
  if ((n === 'href' || n === 'xlink:href') && /^\s*data:text\/html/i.test(v)) return false;
  return true;
}

/**
 * Làm sạch một cây DOM SVG (đã parse).
 * @param {Element} root
 */
export function sanitizeSvgDom(root) {
  if (!root || root.nodeType !== 1) return;
  const all = [root, ...root.querySelectorAll('*')];
  all.reverse().forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (tag === 'script' || tag === 'foreignobject' || tag === 'iframe' || tag === 'embed' || tag === 'object') {
      el.remove();
      return;
    }
    if (tag === 'style') {
      el.remove();
      return;
    }
    if (!SVG_TAG_ALLOW.has(tag)) {
      el.remove();
      return;
    }
    [...el.attributes].forEach((a) => {
      if (!attrLooksSafe(a.name, a.value)) el.removeAttribute(a.name);
    });
  });
}

/**
 * @param {string} raw — toàn bộ chuỗi <svg>...</svg> hoặc nội dung trong ```svg
 * @returns {string} — markup đã làm sạch, hoặc ''
 */
export function sanitizeSvgString(raw) {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return '';
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  let doc;
  try {
    doc = new DOMParser().parseFromString(trimmed, 'text/html');
  } catch {
    return '';
  }
  const svgEl = doc.body.querySelector('svg');
  if (!svgEl) return '';
  sanitizeSvgDom(svgEl);
  try {
    return new XMLSerializer().serializeToString(svgEl);
  } catch {
    return '';
  }
}

/** Khối ```svg ... ``` (nhãn svg không phân biệt hoa thường) */
export const SVG_FENCE_REGEX = /```\s*svg\s*\n?([\s\S]*?)```/gi;

/**
 * Tách chuỗi: trước hết các khối ```svg, sau đó <svg>...</svg> trong phần text còn lại.
 * @returns {{ type: 'text', value: string } | { type: 'svg', value: string }}[]
 */
export function splitTextBySvgEmbeds(raw) {
  const full = String(raw ?? '');
  const chunks = [];
  let last = 0;
  let m;
  const re = new RegExp(SVG_FENCE_REGEX.source, SVG_FENCE_REGEX.flags);
  while ((m = re.exec(full)) !== null) {
    if (m.index > last) chunks.push({ type: 'text', value: full.slice(last, m.index) });
    chunks.push({ type: 'svg', value: m[1].trim() });
    last = m.index + m[0].length;
  }
  if (last < full.length) chunks.push({ type: 'text', value: full.slice(last) });
  if (chunks.length === 0) chunks.push({ type: 'text', value: full });

  const out = [];
  for (const ch of chunks) {
    if (ch.type === 'svg') {
      out.push(ch);
      continue;
    }
    const inner = splitInlineSvgFromText(ch.value);
    out.push(...inner);
  }
  return out;
}

function splitInlineSvgFromText(s) {
  const str = String(s);
  const out = [];
  const re = /<svg\b[^>]*>[\s\S]*?<\/svg>/gi;
  let last = 0;
  let m;
  while ((m = re.exec(str)) !== null) {
    if (m.index > last) out.push({ type: 'text', value: str.slice(last, m.index) });
    out.push({ type: 'svg', value: m[0].trim() });
    last = m.index + m[0].length;
  }
  if (last < str.length) out.push({ type: 'text', value: str.slice(last) });
  return out.length ? out : [{ type: 'text', value: str }];
}

/**
 * Chuỗi HTML: thay khối ```svg ... ``` và mọi <svg>...</svg> bằng bản đã sanitize (bọc div).
 */
export function embedSanitizedSvgIntoHtmlString(html) {
  let t = String(html ?? '');
  t = t.replace(SVG_FENCE_REGEX, (_, inner) => {
    const s = sanitizeSvgString(inner);
    if (!s) return '';
    return `<div class="svg-embed-wrap my-4 flex w-full justify-center overflow-x-auto">${s}</div>`;
  });
  t = t.replace(/<svg\b[\s\S]*?<\/svg>/gi, (match) => {
    const s = sanitizeSvgString(match);
    if (!s) return '';
    return `<div class="svg-embed-wrap my-4 flex w-full justify-center overflow-x-auto">${s}</div>`;
  });
  return t;
}
