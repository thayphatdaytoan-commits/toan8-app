/* eslint-disable */
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import {
  COLLECTION_BLOG_POSTS,
  COLLECTION_SITE_DOCUMENTS,
  db,
  ensureAnonymousAuth,
} from '../firebaseClient';
import { blogCategoryMeta, slugifyContent } from './contentTaxonomy';

async function ready() {
  try {
    await ensureAnonymousAuth();
  } catch {
    /* ignore */
  }
}

function mapBlog(id, d) {
  const cat = blogCategoryMeta(d.category_id || 'blog_toan');
  return {
    id,
    title: d.title || '',
    slug: d.slug || id,
    excerpt: d.excerpt || '',
    content: d.content || '',
    thumbnail: d.thumbnail || '/contest-thumb-1.svg',
    categoryId: d.category_id || 'blog_toan',
    categoryTag: d.category_tag || cat.tag,
    tags: Array.isArray(d.tags) ? d.tags : [],
    author: d.author || 'Thầy Phát',
    seoTitle: d.seo_title || d.title || '',
    seoDescription: d.seo_description || d.excerpt || '',
    publishedAt: d.published_at || new Date().toISOString(),
    enabled: d.enabled !== false,
    createdAt: Number(d.created_at || 0),
    updatedAt: Number(d.updated_at || 0),
  };
}

function mapDoc(id, d) {
  return {
    id,
    title: d.title || '',
    folderId: d.folder_id || 'other',
    thumbnail: d.thumbnail || '/contest-thumb-2.svg',
    embedUrl: d.embed_url || d.embedUrl || '',
    downloadUrl: d.download_url || d.downloadUrl || d.embed_url || '',
    tocText: d.toc_text || '',
    publishedAt: d.published_at || new Date().toISOString(),
    enabled: d.enabled !== false,
    createdAt: Number(d.created_at || 0),
    updatedAt: Number(d.updated_at || 0),
  };
}

export function subscribeBlogPosts(onData, onError) {
  const q = query(collection(db, COLLECTION_BLOG_POSTS), orderBy('published_at', 'desc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((x) => mapBlog(x.id, x.data() || {}))),
    (err) => {
      console.error(err);
      onError?.(err);
      onData([]);
    }
  );
}

export async function saveBlogPostFs(post) {
  await ready();
  const id = post.id || `blog_${Date.now().toString(36)}`;
  const slug = post.slug || slugifyContent(post.title);
  const cat = blogCategoryMeta(post.categoryId || 'blog_toan');
  const payload = {
    title: String(post.title || '').trim() || 'Bài viết mới',
    slug,
    excerpt: String(post.excerpt || ''),
    content: String(post.content || ''),
    thumbnail: post.thumbnail || '/contest-thumb-1.svg',
    category_id: post.categoryId || 'blog_toan',
    category_tag: post.categoryTag || cat.tag,
    tags: Array.isArray(post.tags) ? post.tags : [],
    author: post.author || 'Thầy Phát',
    seo_title: post.seoTitle || post.title || '',
    seo_description: post.seoDescription || post.excerpt || '',
    published_at: post.publishedAt || new Date().toISOString(),
    enabled: post.enabled !== false,
    updated_at: Date.now(),
    created_at: post.createdAt || Date.now(),
  };
  await setDoc(doc(db, COLLECTION_BLOG_POSTS, id), payload, { merge: true });
  return mapBlog(id, payload);
}

export async function deleteBlogPostFs(id) {
  await ready();
  await deleteDoc(doc(db, COLLECTION_BLOG_POSTS, id));
}

export function subscribeSiteDocuments(onData, onError) {
  const q = query(collection(db, COLLECTION_SITE_DOCUMENTS), orderBy('published_at', 'desc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((x) => mapDoc(x.id, x.data() || {}))),
    (err) => {
      console.error(err);
      onError?.(err);
      onData([]);
    }
  );
}

export async function saveSiteDocumentFs(item) {
  await ready();
  const id = item.id || `doc_${Date.now().toString(36)}`;
  const payload = {
    title: String(item.title || '').trim() || 'Tài liệu mới',
    folder_id: item.folderId || 'other',
    thumbnail: item.thumbnail || '/contest-thumb-2.svg',
    embed_url: String(item.embedUrl || '').trim(),
    download_url: String(item.downloadUrl || item.embedUrl || '').trim(),
    toc_text: String(item.tocText || ''),
    published_at: item.publishedAt || new Date().toISOString(),
    enabled: item.enabled !== false,
    updated_at: Date.now(),
    created_at: item.createdAt || Date.now(),
  };
  await setDoc(doc(db, COLLECTION_SITE_DOCUMENTS, id), payload, { merge: true });
  return mapDoc(id, payload);
}

export async function deleteSiteDocumentFs(id) {
  await ready();
  await deleteDoc(doc(db, COLLECTION_SITE_DOCUMENTS, id));
}

/** Google Drive / PDF → URL xem nhúng */
export function toEmbeddableUrl(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  // drive.google.com/file/d/ID/view
  const m = u.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  if (/docs\.google\.com\/document\/d\//i.test(u) && !/\/preview/.test(u)) {
    return u.replace(/\/edit.*$/, '') + '/preview';
  }
  return u;
}
