import React, { useMemo } from 'react';
import { ExternalLink, Presentation } from 'lucide-react';
import { resolveSlidesEmbed } from './slidesEmbedUtils';

export default function LessonSlidesEmbed({
  url,
  title = 'Slide bài giảng',
  wrapClassName = '',
  frameClassName = '',
}) {
  const resolved = useMemo(() => resolveSlidesEmbed(url), [url]);

  if (!resolved?.embedUrl) {
    const raw = String(url || '').trim();
    if (!raw) return null;
    return (
      <div className={`mb-4 ${wrapClassName}`.trim()}>
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          Không nhận dạng được link slide/PPT. Dùng link Google Slides (Chia sẻ), file PPT trên Google Drive
          (quyền xem theo link), hoặc URL file .pptx công khai.
          {raw ? (
            <>
              {' '}
              <a href={raw} target="_blank" rel="noopener noreferrer" className="font-bold underline">
                Mở link gốc ↗
              </a>
            </>
          ) : null}
        </p>
      </div>
    );
  }

  return (
    <div className={`lesson-slides-wrap ${wrapClassName}`.trim()}>
      <div
        className={`lesson-slides-frame w-full bg-slate-100 shadow-2xl relative overflow-hidden aspect-video ${frameClassName}`.trim()}
      >
        <iframe
          key={resolved.embedUrl}
          src={resolved.embedUrl}
          title={title}
          className="absolute inset-0 h-full w-full border-0"
          allow="fullscreen; clipboard-write"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-xs text-slate-500 inline-flex items-center gap-1.5">
          <Presentation className="w-3.5 h-3.5 shrink-0" />
          {resolved.provider === 'google_slides'
            ? 'Google Slides'
            : resolved.provider === 'google_drive'
              ? 'File trên Google Drive'
              : resolved.provider === 'office_online'
                ? 'Xem PPT qua Microsoft Office Online'
                : 'Slide nhúng'}
        </p>
        {resolved.openUrl ? (
          <a
            href={resolved.openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:underline"
          >
            Mở toàn màn hình
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : null}
      </div>
    </div>
  );
}
