import React, { useMemo } from 'react';
import { buildYouTubeEmbedUrl } from './youtubeUtils';

export default function LessonYouTubePlayer({
  videoId,
  title = 'Video bài học',
  wrapClassName = '',
  frameClassName = '',
}) {
  const embedUrl = useMemo(() => buildYouTubeEmbedUrl(videoId), [videoId]);

  if (!videoId || !embedUrl) return null;

  return (
    <div className={`lesson-video-wrap ${wrapClassName}`.trim()}>
      <div
        className={`lesson-video-frame w-full bg-slate-900 shadow-2xl relative overflow-hidden ${frameClassName}`.trim()}
      >
        <iframe
          key={videoId}
          src={embedUrl}
          title={title}
          className="lesson-video-iframe"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>
  );
}
