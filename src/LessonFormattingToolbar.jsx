/* eslint-disable */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Link,
  Palette,
  Home,
  RotateCcw,
  VectorSquare,
  Type,
  ChevronDown,
} from 'lucide-react';
import { getSiteOrigin } from './seo/siteConfig';

function wrapSelection(value, start, end, before, after) {
  const inner = value.slice(start, end);
  const next = value.slice(0, start) + before + inner + after + value.slice(end);
  const pos = start + before.length + inner.length + after.length;
  return { next, start: pos, end: pos };
}

/** Gắn tiền tố heading cho dòng chứa con trỏ (hoặc bắt đầu vùng chọn). */
function setLineHeadingPrefix(value, cursorStart, cursorEnd, prefix) {
  const pos = Math.min(cursorStart, cursorEnd);
  const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
  const lineEndIdx = value.indexOf('\n', pos);
  const lineEnd = lineEndIdx < 0 ? value.length : lineEndIdx;
  let line = value.slice(lineStart, lineEnd);
  line = line.replace(/^#{1,4}\s+/, '');
  const newLine = prefix + line;
  const next = value.slice(0, lineStart) + newLine + value.slice(lineEnd);
  const caret = lineStart + newLine.length;
  return { next, start: caret, end: caret };
}

const BTN =
  'inline-flex items-center justify-center gap-0.5 px-1.5 py-1 rounded-md text-[10px] font-bold border border-slate-200 bg-white text-slate-700 hover:bg-teal-50 hover:border-teal-300 disabled:opacity-40 disabled:pointer-events-none shrink-0';

/** Khớp svgEmbed.js — chèn khối ```svg … ``` */
const SVG_BLOCK_MARKER = '  <!-- Vẽ tại đây (path, circle, text, …) -->';
const SVG_BLOCK_TEMPLATE = ['```svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">', SVG_BLOCK_MARKER, '</svg>', '```', ''].join('\n');

const COLOR_PRESETS = [
  { hex: '#0f766e', label: 'Teal' },
  { hex: '#b91c1c', label: 'Đỏ' },
  { hex: '#1d4ed8', label: 'Xanh' },
  { hex: '#a16207', label: 'Vàng' },
  { hex: '#6d28d9', label: 'Tím' },
  { hex: '#0f172a', label: 'Đen' },
];

const FONT_SIZE_PX_OPTIONS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32];
/**
 * Thanh công cụ chèn cú pháp markdown nhẹ (khớp theoryCorePlainToHtml).
 * @param {{
 *  textareaRef: React.RefObject<HTMLTextAreaElement|null>,
 *  value: string,
 *  onApply: (next: string, selStart: number, selEnd: number) => void,
 *  disabled?: boolean,
 *  gradeLevel?: string,
 *  showHeadings?: boolean,
 *  showInternalLink?: boolean,
 *  canUndo?: boolean,
 *  onUndo?: () => void,
 * }} props
 */
export function LessonFormattingToolbar({
  textareaRef,
  value,
  onApply,
  disabled,
  gradeLevel = '11',
  showHeadings = true,
  showInternalLink = true,
  canUndo = false,
  onUndo,
}) {
  const [fontMenuOpen, setFontMenuOpen] = useState(false);

  useEffect(() => {
    if (!fontMenuOpen) return undefined;
    const close = () => setFontMenuOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [fontMenuOpen]);

  const run = useCallback(
    (fn) => {
      if (disabled) return;
      const ta = textareaRef?.current;
      if (!ta) return;
      const s = ta.selectionStart;
      const e = ta.selectionEnd;
      const v = value;
      const { next, start, end } = fn(v, s, e);
      onApply(next, start, end);
    },
    [disabled, onApply, textareaRef, value]
  );

  const insertInternalLink = useCallback(() => {
    if (disabled) return;
    const ta = textareaRef?.current;
    if (!ta) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : getSiteOrigin();
    const defaultUrl = `${origin}/?grade=${encodeURIComponent(String(gradeLevel))}`;
    const url = window.prompt(
      'URL (https://… hoặc /đường-dẫn). Gợi ý link bài giảng: /bai-giang/<slug> · Enter = trang chủ khối đang soạn:',
      defaultUrl
    );
    if (url === null) return;
    const u = (url || '').trim() || defaultUrl;
    const label = window.prompt('Nhãn hiển thị (SEO / người đọc):', 'Xem thêm') ?? 'Liên kết';
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const inner = value.slice(s, e).trim();
    const text = inner || label;
    const md = `[${text}](${u})`;
    const next = value.slice(0, s) + md + value.slice(e);
    const pos = s + md.length;
    onApply(next, pos, pos);
  }, [disabled, gradeLevel, onApply, textareaRef, value]);

  const insertColor = useCallback(
    (hex) => {
      run((v, s, e) => {
        const inner = v.slice(s, e) || 'nội dung';
        const md = `{{#${hex}}}${inner}{{/}}`;
        const next = v.slice(0, s) + md + v.slice(e);
        const pos = s + md.length;
        return { next, start: pos, end: pos };
      });
    },
    [run]
  );

  const insertFontSize = useCallback(
    (sizeKey) => {
      run((v, s, e) => {
        const inner = v.slice(s, e) || 'nội dung';
        const md = `{{@${sizeKey}}}${inner}{{/}}`;
        const next = v.slice(0, s) + md + v.slice(e);
        const pos = s + md.length;
        return { next, start: pos, end: pos };
      });
    },
    [run]
  );

  const customColor = useCallback(() => {
    if (disabled) return;
    const hex = window.prompt('Mã màu dạng #rrggbb (ví dụ #c2410c):', '#0f766e');
    if (hex === null) return;
    const h = hex.trim().startsWith('#') ? hex.trim() : `#${hex.trim()}`;
    if (!/^#[0-9a-fA-F]{3,8}$/.test(h)) {
      window.alert('Mã màu không hợp lệ.');
      return;
    }
    insertColor(h.replace(/^#/, ''));
  }, [disabled, insertColor]);

  const insertSvgBlock = useCallback(() => {
    run((v, s, e) => {
      const block = SVG_BLOCK_TEMPLATE;
      const next = v.slice(0, s) + block + v.slice(e);
      const rel = block.indexOf(SVG_BLOCK_MARKER);
      const start = s + rel;
      const end = start + SVG_BLOCK_MARKER.length;
      return { next, start, end };
    });
  }, [run]);

  return (
    <div className="rounded-lg border border-teal-200/80 bg-gradient-to-b from-teal-50/90 to-white px-2 py-2 space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[10px] font-black text-teal-900 uppercase tracking-wide mr-1 w-full sm:w-auto">Soạn nhanh</span>
        {showHeadings ? (
          <>
            <button type="button" className={BTN} title="Tiêu đề lớn (H2 SEO — một dòng: # )" onClick={() => run((v, s, e) => setLineHeadingPrefix(v, s, e, '# '))}>
              <Heading1 size={13} /> H2
            </button>
            <button type="button" className={BTN} title="Tiêu đề (## )" onClick={() => run((v, s, e) => setLineHeadingPrefix(v, s, e, '## '))}>
              <Heading2 size={13} /> H3
            </button>
            <button type="button" className={BTN} title="Tiêu đề phụ (### )" onClick={() => run((v, s, e) => setLineHeadingPrefix(v, s, e, '### '))}>
              <Heading3 size={13} /> H4
            </button>
            <button type="button" className={BTN} title="Tiêu đề nhỏ (#### )" onClick={() => run((v, s, e) => setLineHeadingPrefix(v, s, e, '#### '))}>
              <Heading4 size={13} /> H5
            </button>
          </>
        ) : null}
        <span className="hidden sm:inline w-px h-5 bg-slate-200 mx-0.5" aria-hidden />
        <button type="button" className={BTN} title="In đậm ** **" onClick={() => run((v, s, e) => wrapSelection(v, s, e, '**', '**'))}>
          <Bold size={13} />
        </button>
        <button type="button" className={BTN} title="In nghiêng * *" onClick={() => run((v, s, e) => wrapSelection(v, s, e, '*', '*'))}>
          <Italic size={13} />
        </button>
        <button type="button" className={BTN} title="Gạch chân __ __" onClick={() => run((v, s, e) => wrapSelection(v, s, e, '__', '__'))}>
          <Underline size={13} />
        </button>
        <div className="relative shrink-0">
          <button
            type="button"
            className={BTN}
            title="Chọn cỡ chữ hiển thị (px)"
            disabled={disabled}
            aria-expanded={fontMenuOpen}
            aria-haspopup="listbox"
            onClick={(e) => {
              e.stopPropagation();
              setFontMenuOpen((open) => !open);
            }}
          >
            <Type size={13} />
            <span>Cỡ chữ</span>
            <ChevronDown size={11} />
          </button>
          {fontMenuOpen ? (
            <div
              role="listbox"
              aria-label="Cỡ chữ"
              className="absolute left-0 top-full z-50 mt-1 max-h-52 w-[4.75rem] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {FONT_SIZE_PX_OPTIONS.map((px) => (
                <button
                  key={px}
                  type="button"
                  role="option"
                  className="block w-full px-3 py-1.5 text-left text-[11px] font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-900"
                  onClick={() => {
                    insertFontSize(`${px}px`);
                    setFontMenuOpen(false);
                  }}
                >
                  {px}px
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button type="button" className={BTN} title="Chèn khối SVG (```svg … ```)" onClick={insertSvgBlock}>
          <VectorSquare size={13} /> SVG
        </button>
        <button type="button" className={BTN} title="Chèn liên kết [nhãn](url)" onClick={() => run((v, s, e) => wrapSelection(v, s, e, '[', '](https://)'))}>
          <Link size={13} />
        </button>
        {showInternalLink ? (
          <button type="button" className={BTN} title="Liên kết nội bộ — trang chủ theo khối" onClick={insertInternalLink}>
            <Home size={13} />
          </button>
        ) : null}
        <button
          type="button"
          className={BTN}
          title="Hoàn tác (Undo)"
          disabled={disabled || !canUndo || typeof onUndo !== 'function'}
          onClick={() => onUndo?.()}
        >
          <RotateCcw size={13} />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-teal-100">
        <span className="text-[10px] font-bold text-slate-600 flex items-center gap-0.5 mr-1">
          <Palette size={12} /> Màu chữ
        </span>
        {COLOR_PRESETS.map(({ hex, label }) => (
          <button
            key={hex}
            type="button"
            className={`${BTN} !px-2`}
            style={{ borderColor: hex, color: hex }}
            title={`Bọc vùng chọn: {{#...}}...{{/}} — ${label}`}
            onClick={() => insertColor(hex.replace(/^#/, ''))}
          >
            ●
          </button>
        ))}
        <button type="button" className={BTN} title="Mã màu tùy chọn" onClick={customColor}>
          #…
        </button>
      </div>
      <p className="text-[10px] text-slate-500 leading-snug">
        Một dòng bắt đầu bằng <code className="bg-slate-100 px-0.5 rounded"># </code> → tiêu đề H2 (trong khung lý thuyết; trang vẫn có cấu trúc SEO tổng thể). Công thức:{' '}
        <code className="bg-slate-100 px-0.5 rounded">$...$</code> · cỡ chữ:{' '}
        <code className="bg-slate-100 px-0.5 rounded">{`{{@16px}}...{{/}}`}</code> · ảnh: <code className="bg-slate-100 px-0.5 rounded">![](url)</code> · SVG: nút <strong>SVG</strong> hoặc khối{' '}
        <code className="bg-slate-100 px-0.5 rounded">```svg</code> · danh sách: <code className="bg-slate-100 px-0.5 rounded">- mục</code>.
      </p>
    </div>
  );
}
