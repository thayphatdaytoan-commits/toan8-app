/* eslint-disable */
/**
 * Theo dõi URL ảnh upload trong phiên soạn admin và xóa ảnh mồ côi
 * khi hủy / đóng form không lưu (hoặc upload thừa sau khi lưu).
 */
import { ref as storageRef, deleteObject } from 'firebase/storage';

export function isSiteContentStorageUrl(url) {
  const u = String(url || '');
  if (!/^https?:\/\//i.test(u)) return false;
  const hasSiteContent = /site-content(%2F|\/)/i.test(u);
  if (!hasSiteContent) return false;
  return (
    /firebasestorage\.googleapis\.com/i.test(u) ||
    /firebasestorage\.app/i.test(u) ||
    /\.appspot\.com/i.test(u)
  );
}

/** Lấy mọi URL site-content trong chuỗi / JSON. */
export function extractSiteContentUrlsFromText(text) {
  const s = String(text || '');
  const out = new Set();
  const re = /https?:\/\/[^\s)\]"'<>]+/gi;
  let m;
  while ((m = re.exec(s)) !== null) {
    let url = m[0].replace(/[.,;:!?]+$/g, '');
    if (url.endsWith(')') && !url.includes('(')) url = url.slice(0, -1);
    if (isSiteContentStorageUrl(url)) out.add(url);
  }
  return out;
}

export function filterOrphanSessionUrls(sessionUrls, keptText) {
  const kept = extractSiteContentUrlsFromText(keptText);
  return [...sessionUrls].filter((u) => u && !kept.has(u));
}

export async function deleteStorageDownloadUrls(storage, urls) {
  if (!storage) return { deleted: 0, failed: 0 };
  const list = [...new Set([...urls].map((u) => String(u || '').trim()).filter(Boolean))];
  let deleted = 0;
  let failed = 0;
  await Promise.all(
    list.map(async (url) => {
      if (!isSiteContentStorageUrl(url)) return;
      try {
        await deleteObject(storageRef(storage, url));
        deleted += 1;
      } catch (err) {
        const code = String(err?.code || '');
        if (code === 'storage/object-not-found') return;
        failed += 1;
        console.warn('[adminSessionStorageCleanup] delete failed', url, err);
      }
    })
  );
  return { deleted, failed };
}

/**
 * @param {Set<string>} sessionSet
 * @param {import('firebase/storage').FirebaseStorage} storage
 * @param {{ keptText?: string | null }} [opts] — null/undefined = xóa hết session; string = chỉ orphan
 */
export async function flushSessionUploads(sessionSet, storage, opts = {}) {
  if (!sessionSet || sessionSet.size === 0) return { deleted: 0, failed: 0 };
  const all = [...sessionSet];
  sessionSet.clear();
  const keptText = opts.keptText;
  const toDelete =
    keptText == null || keptText === undefined ? all : filterOrphanSessionUrls(all, keptText);
  if (!toDelete.length) return { deleted: 0, failed: 0 };
  return deleteStorageDownloadUrls(storage, toDelete);
}
