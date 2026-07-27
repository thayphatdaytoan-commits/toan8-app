/**
 * Nhúng Google Slides / file PPT(X) trên Drive / URL PPT công khai.
 */

function trimUrl(url) {
  return String(url || '').trim();
}

/** Lấy ID presentation từ link Google Slides. */
export function extractGoogleSlidesId(url) {
  const s = trimUrl(url);
  if (!s) return null;
  // /presentation/d/e/2PACX-.../ (published)
  let m = s.match(/\/presentation\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (m) return { kind: 'published', id: m[1] };
  // /presentation/d/ID/
  m = s.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return { kind: 'file', id: m[1] };
  return null;
}

/** Lấy ID file Google Drive. */
export function extractGoogleDriveFileId(url) {
  const s = trimUrl(url);
  if (!s) return null;
  let m = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m && /drive\.google\.com/i.test(s)) return m[1];
  return null;
}

export function isDirectOfficeFileUrl(url) {
  const s = trimUrl(url);
  if (!s) return false;
  return /\.(ppt|pptx|pps|ppsx)(\?|#|$)/i.test(s);
}

/**
 * @returns {{ embedUrl: string, openUrl: string, provider: 'google_slides'|'google_drive'|'office_online'|'iframe'|'' } | null}
 */
export function resolveSlidesEmbed(url) {
  const s = trimUrl(url);
  if (!s) return null;

  // Đã là URL nhúng sẵn
  if (/\/presentation\/d\/(?:e\/)?[^/]+\/embed/i.test(s) || /\/pubembed/i.test(s)) {
    return { embedUrl: s, openUrl: s, provider: 'google_slides' };
  }
  if (/drive\.google\.com\/file\/d\/[^/]+\/preview/i.test(s)) {
    return { embedUrl: s, openUrl: s.replace(/\/preview.*/, '/view'), provider: 'google_drive' };
  }

  const slides = extractGoogleSlidesId(s);
  if (slides) {
    if (slides.kind === 'published') {
      const embedUrl = `https://docs.google.com/presentation/d/e/${encodeURIComponent(slides.id)}/embed?start=false&loop=false&delayms=5000`;
      const openUrl = `https://docs.google.com/presentation/d/e/${encodeURIComponent(slides.id)}/pub?start=false&loop=false&delayms=5000`;
      return { embedUrl, openUrl, provider: 'google_slides' };
    }
    const embedUrl = `https://docs.google.com/presentation/d/${encodeURIComponent(slides.id)}/embed?start=false&loop=false&delayms=5000`;
    const openUrl = `https://docs.google.com/presentation/d/${encodeURIComponent(slides.id)}/edit`;
    return { embedUrl, openUrl, provider: 'google_slides' };
  }

  const driveId = extractGoogleDriveFileId(s);
  if (driveId) {
    const embedUrl = `https://drive.google.com/file/d/${encodeURIComponent(driveId)}/preview`;
    const openUrl = `https://drive.google.com/file/d/${encodeURIComponent(driveId)}/view`;
    return { embedUrl, openUrl, provider: 'google_drive' };
  }

  if (isDirectOfficeFileUrl(s) || /\.(ppt|pptx)(\?|#|$)/i.test(s)) {
    const embedUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(s)}`;
    return { embedUrl, openUrl: s, provider: 'office_online' };
  }

  // iframe generic (OneDrive embed, etc.)
  if (/^https?:\/\//i.test(s) && /embed|viewer|onedrive|sharepoint/i.test(s)) {
    return { embedUrl: s, openUrl: s, provider: 'iframe' };
  }

  return null;
}

export function canEmbedSlides(url) {
  return Boolean(resolveSlidesEmbed(url)?.embedUrl);
}
