/** Cấu hình SEO — override bằng biến môi trường VITE_SITE_URL khi deploy (URL gốc, không dấu / cuối). */

export const SITE_NAME_SLUG = 'thayphatdaytoan';

export const SITE_NAME_FULL = 'Thầy Phát dạy toán — thayphatdaytoan';

export const DEFAULT_DESCRIPTION =
  'Học Toán tư duy THCS & THPT (lớp 6–12), bám GDPT 2018: bài giảng, luyện đề, phòng thi online. Ôn thi vào 10, THPT Quốc gia.';

export const TWITTER_HANDLE = '@thayphatdaytoan';

/** Fallback khi chưa set VITE_SITE_URL (Firebase Hosting mặc định của project). */
const FALLBACK_ORIGIN = 'https://thayphatdaytoan-7832c.web.app';

/**
 * URL gốc của site (https://domain.com), dùng cho canonical, OG, JSON-LD.
 */
export function getSiteOrigin() {
  try {
    const envUrl = import.meta.env?.VITE_SITE_URL;
    if (envUrl && String(envUrl).trim()) {
      return String(envUrl).trim().replace(/\/$/, '');
    }
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return FALLBACK_ORIGIN;
}

