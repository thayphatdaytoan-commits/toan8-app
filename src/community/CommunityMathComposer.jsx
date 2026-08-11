/* eslint-disable */
import React, { useMemo, useRef, useState } from 'react';
import katex from 'katex';
import { Bold, Italic, Underline, Image as ImageIcon, Paperclip } from 'lucide-react';
import { mixedMathContentToHtml } from '../mathKatexMixed';
import {
  HOIDAP_MATH_KEYS,
  HOIDAP_TEMPLATE_KEYS,
  insertAtSelection,
  wrapSelection,
} from './mathPalette';

function katexSafe(tex) {
  try {
    return katex.renderToString(tex, { throwOnError: false, displayMode: false, strict: false });
  } catch {
    return tex;
  }
}

function MathPadKey({ tex, onClick }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="h-11 sm:h-12 px-1 rounded-lg bg-white border border-slate-200 hover:border-sky-400 hover:bg-sky-50 active:bg-sky-100 transition-colors flex items-center justify-center shadow-sm"
    >
      <span
        className="[&_.katex]:text-[0.95em] sm:[&_.katex]:text-[1.05em] pointer-events-none"
        dangerouslySetInnerHTML={{ __html: katexSafe(tex) }}
      />
    </button>
  );
}

function countMarkdownImages(text) {
  const m = String(text || '').match(/!\[[^\]]*\]\(\s*[^)\s]+\s*\)/g);
  return m ? m.length : 0;
}

/**
 * Soạn thảo kiểu Hoidap247:
 * Toolbar (B/I/U + π + ảnh) → Xem trước → Bàn phím toán → Ô gõ.
 * Blog: bật enableFileUpload + onUploadImage để tải ảnh từ máy.
 */
export default function CommunityMathComposer({
  value,
  onChange,
  placeholder = 'Nhập nội dung câu hỏi…',
  rows = 5,
  maxImages = 1,
  enableFileUpload = false,
  onUploadImage,
}) {
  const taRef = useRef(null);
  const fileRef = useRef(null);
  const [showMathPad, setShowMathPad] = useState(true);
  const [showAllKeys, setShowAllKeys] = useState(false);
  const [uploading, setUploading] = useState(false);
  const selRef = useRef({ start: 0, end: 0 });

  const previewHtml = useMemo(() => {
    if (!value?.trim()) return '';
    try {
      return mixedMathContentToHtml(value).replace(/\n/g, '<br/>');
    } catch {
      return '';
    }
  }, [value]);

  const imageCount = countMarkdownImages(value);
  const atImageLimit = maxImages > 0 && imageCount >= maxImages;

  const rememberSel = () => {
    const el = taRef.current;
    if (!el) return;
    selRef.current = { start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 };
  };

  const applyEdit = (fn) => {
    const el = taRef.current;
    const start = el?.selectionStart ?? selRef.current.start;
    const end = el?.selectionEnd ?? selRef.current.end;
    const { next, selStart, selEnd } = fn(value || '', start, end);
    onChange(next);
    requestAnimationFrame(() => {
      const box = taRef.current;
      if (!box) return;
      box.focus();
      box.setSelectionRange(selStart, selEnd);
      selRef.current = { start: selStart, end: selEnd };
    });
  };

  const insertChunk = (chunk, cursor = 0) => {
    applyEdit((v, s, e) => insertAtSelection(v, s, e, chunk, cursor));
  };

  const wrap = (pre, suf) => {
    applyEdit((v, s, e) => wrapSelection(v, s, e, pre, suf));
  };

  const insertImageUrl = (url) => {
    insertChunk(`\n![ảnh](${url})\n`, 0);
  };

  const onImageClick = () => {
    if (atImageLimit) {
      window.alert(
        maxImages === 1
          ? 'Mỗi câu hỏi chỉ đính kèm tối đa 1 ảnh. Xóa ảnh cũ trong nội dung rồi thử lại.'
          : `Đã đạt giới hạn ${maxImages} ảnh trong bài viết.`
      );
      return;
    }
    if (enableFileUpload && typeof onUploadImage === 'function') {
      rememberSel();
      fileRef.current?.click();
      return;
    }
    const url = window.prompt('Dán link ảnh (http/https), tối đa 1 ảnh:');
    if (!url?.trim()) return;
    const u = url.trim();
    if (!/^https?:\/\//i.test(u) && !u.startsWith('/')) {
      window.alert('Link ảnh cần bắt đầu bằng http hoặc https.');
      return;
    }
    insertImageUrl(u);
  };

  const onFilePicked = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || typeof onUploadImage !== 'function') return;
    if (atImageLimit) return;
    setUploading(true);
    try {
      const url = await onUploadImage(file);
      if (url) insertImageUrl(url);
    } catch (err) {
      window.alert(err?.message || 'Tải ảnh thất bại');
    } finally {
      setUploading(false);
    }
  };

  const keys = showAllKeys ? HOIDAP_MATH_KEYS : HOIDAP_TEMPLATE_KEYS;

  const toolBtn = (active, extra = '') =>
    `inline-flex items-center justify-center h-9 min-w-9 px-2 rounded-md border text-sm font-bold transition-colors ${
      active
        ? 'bg-sky-100 border-sky-400 text-sky-800'
        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
    } ${extra}`;

  const imageLabel =
    enableFileUpload
      ? uploading
        ? 'Đang tải…'
        : maxImages === 1
          ? 'Ảnh (tải lên)'
          : 'Tải ảnh'
      : 'Ảnh (tối đa 1)';

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFilePicked}
      />

      <div className="flex flex-wrap items-center gap-1 px-2 py-2 border-b border-slate-200 bg-slate-50">
        <button
          type="button"
          title="In đậm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => wrap('**', '**')}
          className={toolBtn(false)}
        >
          <Bold className="w-4 h-4" strokeWidth={2.5} />
        </button>
        <button
          type="button"
          title="In nghiêng"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => wrap('*', '*')}
          className={toolBtn(false)}
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          title="Gạch chân"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => wrap('__', '__')}
          className={toolBtn(false)}
        >
          <Underline className="w-4 h-4" />
        </button>

        <span className="w-px h-6 bg-slate-200 mx-1" />

        <button
          type="button"
          title="Bàn phím toán"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            rememberSel();
            setShowMathPad((v) => !v);
          }}
          className={toolBtn(showMathPad, 'font-black text-base px-2.5')}
        >
          π
        </button>

        <button
          type="button"
          title={enableFileUpload ? 'Tải ảnh từ máy' : 'Ảnh (tối đa 1)'}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onImageClick}
          disabled={uploading}
          className={toolBtn(atImageLimit || uploading, 'gap-1 text-xs font-bold px-2.5')}
        >
          <Paperclip className="w-3.5 h-3.5" />
          <ImageIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{imageLabel}</span>
        </button>
      </div>

      <div className="mx-2 mt-2 mb-1 rounded-lg border border-sky-200 bg-sky-50/90 px-3 py-2.5 min-h-[56px]">
        <p className="text-xs font-bold text-sky-700 mb-1">Xem trước:</p>
        {value?.trim() ? (
          <div
            className="text-[15px] text-slate-800 leading-relaxed break-words [&_.katex]:text-[1.08em] [&_img]:max-w-full [&_img]:rounded-lg"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : (
          <p className="text-sm text-slate-400 italic">Nội dung sẽ hiện ở đây…</p>
        )}
      </div>

      {showMathPad && (
        <div className="mx-2 mb-2 rounded-lg border border-sky-200 bg-[#e8f4fc] p-2">
          <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-1.5">
            {keys.map((it, idx) => (
              <MathPadKey
                key={`${it.tex}-${idx}`}
                tex={it.tex}
                onClick={() => insertChunk(it.insert, it.cursor || 0)}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setShowAllKeys((v) => !v)}
              className="text-xs font-bold text-sky-800 hover:underline px-1"
            >
              {showAllKeys ? 'Thu gọn ký hiệu' : 'Thêm ký hiệu…'}
            </button>
          </div>
        </div>
      )}

      <div className="px-2 pb-2">
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onSelect={rememberSel}
          onKeyUp={rememberSel}
          onClick={rememberSel}
          placeholder={placeholder}
          rows={rows}
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 resize-y min-h-[120px] font-sans leading-relaxed"
        />
      </div>
    </div>
  );
}
