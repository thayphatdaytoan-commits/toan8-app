/* eslint-disable */
import React, { useMemo } from 'react';
import { mixedMathContentToHtml, escapeHtml } from '../mathKatexMixed';

/** Render nội dung hỏi đáp: LaTeX $...$ + đậm/nghiêng + ảnh markdown */
export default function CommunityRichText({ text, className = '' }) {
  const html = useMemo(() => {
    const raw = String(text || '');
    if (!raw.trim()) return '';
    const imgs = [];
    const withTokens = raw.replace(/!\[([^\]]*)\]\(\s*([^)\s]+)\s*\)/g, (full, alt, url) => {
      const u = String(url).trim();
      if (!/^https?:\/\//i.test(u) && !u.startsWith('/')) return full;
      const i = imgs.length;
      imgs.push({ alt: String(alt || ''), url: u });
      return `\uE000IMG${i}\uE001`;
    });
    let out = mixedMathContentToHtml(withTokens).replace(/\n/g, '<br/>');
    imgs.forEach((img, i) => {
      const token = escapeHtml(`\uE000IMG${i}\uE001`);
      const tag = `<img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.alt)}" class="my-2 max-w-full rounded-xl border border-slate-200" loading="lazy" />`;
      out = out.split(token).join(tag);
      // mixedMath may leave private-use chars unescaped
      out = out.split(`\uE000IMG${i}\uE001`).join(tag);
    });
    return out;
  }, [text]);

  if (!text?.trim()) return null;
  return (
    <div
      className={`leading-relaxed break-words [&_.katex]:text-[1.05em] [&_img]:max-w-full ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
