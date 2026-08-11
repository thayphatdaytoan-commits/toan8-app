/**
 * Ảnh sơ đồ Hình 9: nén JPEG + upload Firebase Storage → chỉ lưu URL trong Firestore.
 */
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImageFileToJpegBlob } from '../adminImageUpload';

const DEFAULT_MAX_EDGE = 1600;
const DEFAULT_QUALITY = 0.78;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sau uploadBytes đôi khi getDownloadURL lỗi tạm (mạng / propagation). Thử lại vài lần.
 * @param {import('firebase/storage').StorageReference} storageRef
 */
async function getDownloadURLWithRetry(storageRef, attempts = 6) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await getDownloadURL(storageRef);
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await delay(220 * 2 ** i);
    }
  }
  throw lastErr;
}

/** Tránh ký tự không hợp lệ trong path Storage */
export function sanitizeMindMapPathSegment(s) {
  return String(s || 'id')
    .replace(/[/\\[\]#?*]+/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 120);
}

/**
 * @param {File} file
 * @param {import('firebase/storage').FirebaseStorage} storage
 * @param {string} storagePath — đường dẫn đầy đủ trong bucket
 * @param {{ maxEdge?: number, quality?: number }} [compressOpts]
 * @returns {Promise<string>} download URL
 */
export async function uploadMindMapJpegToStorage(file, storage, storagePath, compressOpts = {}) {
  const blob = await compressImageFileToJpegBlob(file, {
    maxEdge: compressOpts.maxEdge ?? DEFAULT_MAX_EDGE,
    quality: compressOpts.quality ?? DEFAULT_QUALITY,
    blobTimeoutMs: compressOpts.blobTimeoutMs ?? 60000,
  });
  const r = ref(storage, storagePath);
  await uploadBytes(r, blob, { contentType: 'image/jpeg' });
  return getDownloadURLWithRetry(r);
}

function mindMapStorageRoot(gradeLevel) {
  const g = String(gradeLevel || '9').trim();
  return g === '9' ? 'mindmap_geometry9' : `mindmap_g${g}`;
}

export function buildTreeImageStoragePath(categoryId, exerciseId, treeId, gradeLevel = '9') {
  const c = sanitizeMindMapPathSegment(categoryId);
  const e = sanitizeMindMapPathSegment(exerciseId);
  const t = sanitizeMindMapPathSegment(treeId);
  const ts = Date.now();
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${mindMapStorageRoot(gradeLevel)}/${c}/${e}/tree_${t}_${ts}_${rnd}.jpg`;
}

export function buildProblemImageStoragePath(categoryId, exerciseId, gradeLevel = '9') {
  const c = sanitizeMindMapPathSegment(categoryId);
  const e = sanitizeMindMapPathSegment(exerciseId);
  const ts = Date.now();
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${mindMapStorageRoot(gradeLevel)}/${c}/${e}/problem_${ts}_${rnd}.jpg`;
}

/** Một file cố định / bài — ghi đè khi tải lại, dùng chung cho nhiều ý (tiết kiệm Storage). */
export function buildSharedMindMapImageStoragePath(categoryId, exerciseId, gradeLevel = '9') {
  const c = sanitizeMindMapPathSegment(categoryId);
  const e = sanitizeMindMapPathSegment(exerciseId);
  return `${mindMapStorageRoot(gradeLevel)}/${c}/${e}/shared_mindmap.jpg`;
}
