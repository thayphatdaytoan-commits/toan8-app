import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { buildLessonSlug } from './lessonSlug';
import { COLLECTION_LESSONS, db, ensureAnonymousAuth } from './firebaseClient';

/** Đọc deep link bài giảng từ URL (path /bai-giang/... hoặc ?lessonId=). */
export function readLessonDeepLinkFromLocation(loc = typeof window !== 'undefined' ? window.location : null) {
  if (!loc) return { lessonId: null, slug: null, active: false };
  try {
    const params = new URLSearchParams(loc.search || '');
    const lessonId = String(params.get('lessonId') || '').trim() || null;
    const path = String(loc.pathname || '/');
    const m = path.match(/^\/bai-giang\/([^/?#]+)\/?$/i);
    const slug = m && m[1] ? decodeURIComponent(m[1]).trim() : null;
    return { lessonId, slug, active: !!(lessonId || slug) };
  } catch {
    return { lessonId: null, slug: null, active: false };
  }
}

export function isLessonDeepLinkLocation(loc = typeof window !== 'undefined' ? window.location : null) {
  return readLessonDeepLinkFromLocation(loc).active;
}

export function findLessonInList(list, { lessonId, slug } = {}) {
  if (!Array.isArray(list) || !list.length) return null;
  if (lessonId) {
    const byId = list.find((l) => l.id === lessonId);
    if (byId) return byId;
  }
  if (slug) {
    const slugKey = String(slug).trim().toLowerCase();
    return (
      list.find((l) => String(l.slug || '').trim().toLowerCase() === slugKey) ||
      list.find((l) => buildLessonSlug(l).toLowerCase() === slugKey) ||
      null
    );
  }
  return null;
}

/**
 * Tải nhanh một bài giảng (1 request) thay vì chờ cả collection.
 * Ưu tiên ?lessonId= → getDoc; không có thì thử truy vấn slug.
 */
export async function fetchLessonForDeepLink({ lessonId, slug, lessonsList = [] } = {}) {
  await ensureAnonymousAuth();

  const fromList = findLessonInList(lessonsList, { lessonId, slug });
  if (fromList) return fromList;

  if (lessonId) {
    const snap = await getDoc(doc(db, COLLECTION_LESSONS, lessonId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
  }

  if (slug) {
    const slugRaw = String(slug).trim();
    try {
      const q = query(collection(db, COLLECTION_LESSONS), where('slug', '==', slugRaw), limit(1));
      const qs = await getDocs(q);
      if (!qs.empty) {
        const d = qs.docs[0];
        return { id: d.id, ...d.data() };
      }
    } catch {
      /* slug index có thể chưa có — bỏ qua */
    }
  }

  return null;
}
