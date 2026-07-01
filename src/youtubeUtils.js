/**
 * Trích ID video YouTube 11 ký tự từ URL (watch, youtu.be, shorts, embed, live).
 */
export function extractYouTubeID(url) {
  if (!url || typeof url !== 'string') return null;
  const s = url.trim();
  let m = s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})(?:\?|#|$|\/)/);
  if (m) return m[1];
  m = s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (m) return m[1];
  m = s.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})(?:\?|#|$|\/)/);
  if (m) return m[1];
  m = s.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(?:\?|#|$)/);
  if (m) return m[1];
  m = s.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})(?:\?|#|$|\/)/);
  if (m) return m[1];
  m = s.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (m) return m[1];
  m = s.match(/\/v\/([a-zA-Z0-9_-]{11})(?:\?|#|$|\/)/);
  if (m) return m[1];
  return null;
}

/** URL nhúng chuẩn (query giúp một số trình duyệt / policy hiển thị ổn định hơn). */
export function buildYouTubeEmbedUrl(videoId) {
  if (!videoId) return '';
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? `&origin=${encodeURIComponent(window.location.origin)}`
      : '';
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?rel=0&modestbranding=1&playsinline=1${origin}`;
}

export function buildYouTubeWatchUrl(videoId) {
  if (!videoId) return '';
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}
