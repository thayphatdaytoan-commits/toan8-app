/* eslint-disable */
import React, { useMemo } from 'react';
import { splitTextBySvgEmbeds, sanitizeSvgString } from './svgEmbed';
import { mixedMathContentToHtml } from './mathKatexMixed';

/**
 * Ảnh / SVG trong nội dung (bài giảng / đề thi), kèm LaTeX $...$:
 *
 * 1) Markdown:  ![mô tả](https://example.com/hinh.png)
 * 2) HTML:       <img src="https://example.com/hinh.png" alt="Đồ thị" />
 * 3) SVG:        khối ```svg ... ``` hoặc dán nguyên thẻ <svg>...</svg> (đã sanitize)
 *
 * Chỉ chấp nhận URL ảnh an toàn (http/https, đường dẫn /..., data:image/...).
 */

export function isAllowedImageUrl(url) {
  const u = String(url || '').trim();
  if (!u) return false;
  if (/^\s*javascript:/i.test(u)) return false;
  if (/^\s*data:(?!image\/)/i.test(u)) return false;
  if (/^https?:\/\//i.test(u)) return true;
  if (u.startsWith('/')) return true;
  if (u.startsWith('./') || u.startsWith('../')) return true;
  if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml);/i.test(u)) return true;
  return false;
}

function extractImgFromTag(tag) {
  const srcM = tag.match(/\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const altM = tag.match(/\balt\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const src = (srcM && (srcM[2] || srcM[3] || srcM[4] || '')).trim();
  const alt = (altM && (altM[2] || altM[3] || altM[4] || '')).trim();
  return { src, alt };
}

/** @returns {{ type: 'text', value: string } | { type: 'image', src: string, alt: string }}[] */
export function splitTextAndImages(raw) {
  const s = raw == null ? '' : String(raw);
  const segments = [];
  let i = 0;

  while (i < s.length) {
    const mdIdx = s.indexOf('![', i);
    const imgIdx = s.toLowerCase().indexOf('<img', i);
    let next = -1;
    let kind = null;
    if (mdIdx >= 0 && (imgIdx < 0 || mdIdx <= imgIdx)) {
      next = mdIdx;
      kind = 'md';
    } else if (imgIdx >= 0) {
      next = imgIdx;
      kind = 'img';
    }

    if (next < 0) {
      if (i < s.length) segments.push({ type: 'text', value: s.slice(i) });
      break;
    }
    if (next > i) segments.push({ type: 'text', value: s.slice(i, next) });

    if (kind === 'md') {
      const rest = s.slice(next);
      const m = rest.match(/^!\[([^\]]*)\]\(\s*([^)\s]+)\s*\)/);
      if (m) {
        const src = m[2].trim();
        const alt = (m[1] || '').trim();
        if (isAllowedImageUrl(src)) segments.push({ type: 'image', src, alt });
        else segments.push({ type: 'text', value: m[0] });
        i = next + m[0].length;
      } else {
        segments.push({ type: 'text', value: '!' });
        i = next + 1;
      }
    } else {
      const end = s.indexOf('>', next);
      if (end < 0) {
        segments.push({ type: 'text', value: s.slice(next) });
        break;
      }
      const tag = s.slice(next, end + 1);
      const { src, alt } = extractImgFromTag(tag);
      if (src && isAllowedImageUrl(src)) segments.push({ type: 'image', src, alt });
      else segments.push({ type: 'text', value: tag });
      i = end + 1;
    }
  }

  return segments.length ? segments : [{ type: 'text', value: s }];
}

/** @returns {{ type: 'text', value: string } | { type: 'color', color: string, value: string } | { type: 'image', src: string, alt: string } | { type: 'svg', value: string }}[] */
export function splitTextImagesAndColors(raw) {
  const svgParts = splitTextBySvgEmbeds(raw);
  const out = [];
  for (const sp of svgParts) {
    if (sp.type === 'svg') {
      out.push(sp);
      continue;
    }
    const parts = splitTextAndImages(sp.value);
    for (const p of parts) {
      if (p.type !== 'text') {
        out.push(p);
        continue;
      }
      const s = String(p.value || '');
      const re = /\{\{#([0-9a-fA-F]{3,8})\}\}([\s\S]*?)\{\{\/\}\}/g;
      let last = 0;
      let m;
      while ((m = re.exec(s)) !== null) {
        if (m.index > last) out.push({ type: 'text', value: s.slice(last, m.index) });
        const color = String(m[1] || '').trim();
        const value = String(m[2] || '');
        out.push({ type: 'color', color, value });
        last = m.index + m[0].length;
      }
      if (last < s.length) out.push({ type: 'text', value: s.slice(last) });
    }
  }
  return out.length ? out : [{ type: 'text', value: String(raw ?? '') }];
}

function MathSpan({ text, className }) {
  const html = useMemo(() => mixedMathContentToHtml(text ?? ''), [text]);
  // Giữ xuống dòng trong đề bài / phương án (textarea lưu \n; HTML mặc định bỏ qua).
  const cls = ['whitespace-pre-line', 'break-words', className].filter(Boolean).join(' ');
  return <span className={cls} dangerouslySetInnerHTML={{ __html: html }} />;
}

const defaultImgClass =
  'max-w-full h-auto rounded-lg my-2 border border-slate-200 shadow-sm block mx-auto';

function SvgFigure({ markup, inline }) {
  const html = useMemo(() => sanitizeSvgString(markup), [markup]);
  if (!html) return null;
  const cls = inline
    ? 'inline-block max-w-[min(100%,280px)] align-middle mx-1 overflow-x-auto rounded border border-slate-200 bg-white p-1 shadow-sm [&_svg]:max-w-full [&_svg]:h-auto'
    : 'block w-full max-w-full my-3 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm [&_svg]:mx-auto [&_svg]:max-w-full [&_svg]:h-auto';
  return <span className={cls} dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * @param {string} text
 * @param {string} [className] — wrapper
 * @param {string} [imageClassName] — thẻ img
 * @param {boolean} [inlineImage] — ảnh / SVG inline (đáp án ngắn), mặc định block
 */
export function RichMathContent({ text, className, imageClassName, inlineImage = false }) {
  const parts = useMemo(() => splitTextImagesAndColors(text), [text]);
  const imgCls = imageClassName || (inlineImage ? 'max-h-24 max-w-[min(100%,280px)] rounded border border-slate-200 align-middle mx-1' : defaultImgClass);

  return (
    <span className={className}>
      {parts.map((p, idx) =>
        p.type === 'text' ? (
          <MathSpan key={idx} text={p.value} />
        ) : p.type === 'color' ? (
          <span key={idx} style={{ color: `#${String(p.color || '').replace(/^#/, '')}` }}>
            <MathSpan text={p.value} />
          </span>
        ) : p.type === 'svg' ? (
          <SvgFigure key={idx} markup={p.value} inline={inlineImage} />
        ) : (
          <img key={idx} src={p.src} alt={p.alt || 'Hình minh họa'} className={imgCls} loading="lazy" decoding="async" />
        )
      )}
    </span>
  );
}
