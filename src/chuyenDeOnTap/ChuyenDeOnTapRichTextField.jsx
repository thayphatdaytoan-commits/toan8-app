/* eslint-disable */
import React, { useCallback, useRef, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { LessonFormattingToolbar } from '../LessonFormattingToolbar';
import { RichMathContent } from '../RichMathContent';
import { compressImageFileToJpegBlob, spliceString, scheduleTextareaCaret } from '../adminImageUpload';

/**
 * Ô soạn nội dung chuyên đề ôn tập: in đậm/nghiêng/màu, công thức $...$, upload ảnh.
 */
export default function ChuyenDeOnTapRichTextField({
  label,
  value = '',
  onChange,
  rows = 5,
  disabled = false,
  storage,
  user,
  gradeLevel = '11',
  showHeadings = true,
  showPreview = true,
  className = '',
  textareaClassName = '',
  placeholder = '',
}) {
  const taRef = useRef(null);
  const fileRef = useRef(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  const applyText = useCallback(
    (next, selStart, selEnd) => {
      onChange(next);
      requestAnimationFrame(() => {
        const el = taRef.current;
        if (!el) return;
        try {
          el.focus();
          el.setSelectionRange(selStart, selEnd);
        } catch {
          /* ignore */
        }
      });
    },
    [onChange]
  );

  const handleImageUpload = useCallback(
    async (file) => {
      if (!storage) {
        alert('Firebase Storage chưa khởi tạo.');
        return;
      }
      if (!user) {
        alert('Cần đăng nhập để tải ảnh.');
        return;
      }
      const mime = String(file?.type || '').toLowerCase();
      const looksImage =
        mime.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i.test(String(file?.name || ''));
      if (!looksImage) {
        alert('Chọn file ảnh (jpg, png, webp...).');
        return;
      }
      setUploadBusy(true);
      try {
        try {
          await user.getIdToken(true);
        } catch {
          /* vẫn thử upload */
        }
        const blob = await compressImageFileToJpegBlob(file, { maxEdge: 1680, quality: 0.82 });
        if (blob.size > 4 * 1024 * 1024) {
          throw new Error('Ảnh sau nén vẫn lớn hơn 4MB — chọn ảnh nhỏ hơn.');
        }
        const fname = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.jpg`;
        const r = storageRef(storage, `site-content/${fname}`);
        await uploadBytes(r, blob, { contentType: 'image/jpeg' });
        const url = await getDownloadURL(r);
        const ta = taRef.current;
        const start = typeof ta?.selectionStart === 'number' ? ta.selectionStart : value.length;
        const end = typeof ta?.selectionEnd === 'number' ? ta.selectionEnd : start;
        const md = `\n![](${url})\n`;
        const { next, caret } = spliceString(value, start, end, md);
        onChange(next);
        scheduleTextareaCaret(ta, caret);
      } catch (e) {
        console.error(e);
        alert('Upload ảnh thất bại: ' + (e?.message || String(e)));
      } finally {
        setUploadBusy(false);
      }
    },
    [storage, user, value, onChange]
  );

  return (
    <div className={`space-y-2 ${className}`}>
      {label ? <span className="block text-xs font-semibold text-slate-600">{label}</span> : null}

      <LessonFormattingToolbar
        textareaRef={taRef}
        value={value}
        disabled={disabled || uploadBusy}
        gradeLevel={gradeLevel}
        showHeadings={showHeadings}
        showInternalLink={false}
        onApply={applyText}
      />

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void handleImageUpload(f);
          }}
        />
        <button
          type="button"
          disabled={disabled || uploadBusy || !user || !storage}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          title="Nén JPEG, tải Firebase Storage, chèn ![](url) vào vị trí con trỏ"
        >
          <ImageIcon size={14} className="shrink-0" />
          {uploadBusy ? 'Đang tải ảnh…' : 'Upload ảnh'}
        </button>
        <span className="text-[10px] text-slate-500">
          **đậm** · *nghiêng* · __gạch chân__ · $công thức$ · ![](url)
        </span>
      </div>

      <textarea
        ref={taRef}
        value={value}
        disabled={disabled || uploadBusy}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        spellCheck={false}
        placeholder={placeholder}
        className={
          textareaClassName ||
          'w-full font-mono text-sm p-3 border-2 border-slate-200 rounded-xl bg-white min-h-[100px] disabled:opacity-50'
        }
      />

      {showPreview && String(value || '').trim() ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Xem trước</p>
          <RichMathContent text={value} className="text-sm text-slate-800 leading-relaxed" />
        </div>
      ) : null}
    </div>
  );
}
