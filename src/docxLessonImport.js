/* eslint-disable */
/**
 * Import lesson from .docx: extract text + embedded images.
 * Images are JPEG-compressed, uploaded to Firebase Storage, and inserted as ![anh](url).
 */
import mammoth from 'mammoth';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImageFileToJpegBlob } from './adminImageUpload';

function decodeHtmlEntities(s) {
  const str = String(s || '');
  if (typeof document !== 'undefined') {
    const el = document.createElement('textarea');
    el.innerHTML = str;
    return el.value;
  }
  return str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

/** mammoth HTML -> import text (newlines + markdown images). Giữ gạch chân dạng __...__ để nhận đáp án TN. */
export function htmlToLessonImportText(html) {
  let s = String(html || '');
  s = s.replace(/<img[^>]*\ssrc=["']([^"']+)["'][^>]*>/gi, (_, src) => `\n![ảnh](${src})\n`);
  s = s.replace(/<\/(p|div|h[1-6]|li|tr|table|blockquote)>/gi, '\n');
  s = s.replace(/<(br|hr)\s*\/?>/gi, '\n');
  // Gạch chân Word (<u> / text-decoration:underline) → __...__ (parser practice nhận đáp án đúng)
  s = s.replace(/<u\b[^>]*>([\s\S]*?)<\/u>/gi, (_, inner) => `__${inner}__`);
  s = s.replace(
    /<(span|strong|em|b|i)\b[^>]*style=["'][^"']*text-decoration\s*:\s*underline[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi,
    (_, _tag, inner) => `__${inner}__`
  );
  s = s.replace(/<\/?(ul|ol|thead|tbody|tfoot|td|th|span|a|strong|em|b|i|u)[^>]*>/gi, '');
  s = s.replace(/<[^>]+>/g, '');
  s = decodeHtmlEntities(s);
  s = s.replace(/\u00a0/g, ' ');
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  s = s.replace(/[ \t]+\n/g, '\n');
  s = s.replace(/\n{3,}/g, '\n\n');
  // Gỡ $ bọc quanh ảnh (Word hay để $ trước/sau hình → hiện 2 dấu $ thừa)
  s = s.replace(/\$\s*(!\[[^\]]*\]\(\s*[^)]+?\s*\))\s*\$/g, '$1');
  s = s.replace(/(^|\n)[ \t]*\$[ \t]*\n([ \t]*!\[[^\]]*\]\(\s*[^)]+?\s*\)[ \t]*)\n[ \t]*\$[ \t]*(?=\n|$)/g, '$1$2');
  s = s.replace(/(^|\n)[ \t]*\$[ \t]*\n(?=[ \t]*!\[[^\]]*\]\()/g, '$1');
  s = s.replace(/(!\[[^\]]*\]\(\s*[^)]+?\s*\))\n[ \t]*\$[ \t]*(?=\n|$)/g, '$1');
  return s.trim();
}

/**
 * Mammoth đọc được `run.isUnderline` nhưng mặc định không xuất gạch chân ra HTML.
 * Đánh dấu trực tiếp text của run bằng `__...__` trước khi chuyển đổi để parser
 * đề thi/bài luyện nhận được đáp án đúng gạch chân trong Word.
 */
export function markUnderlinedDocxRuns(documentNode) {
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    const children = Array.isArray(node.children) ? node.children : [];
    if (node.type === 'run' && node.isUnderline) {
      const textChildren = children.filter((child) => child?.type === 'text' && typeof child.value === 'string');
      if (textChildren.length > 0) {
        const first = textChildren[0];
        const last = textChildren[textChildren.length - 1];
        first.value = `__${first.value}`;
        last.value = `${last.value}__`;
      }
    }
    children.forEach(visit);
  };
  visit(documentNode);
  return documentNode;
}

function toArrayBuffer(bytes) {
  if (bytes instanceof ArrayBuffer) return bytes;
  if (bytes?.buffer instanceof ArrayBuffer) {
    return bytes.buffer.slice(bytes.byteOffset || 0, (bytes.byteOffset || 0) + (bytes.byteLength || 0));
  }
  return null;
}

/** Nhận diện định dạng ảnh từ magic bytes (Word hay gửi EMF/WMF mà trình duyệt không mở được). */
function sniffImageKind(arrayBuffer, declaredMime) {
  const u8 = new Uint8Array(arrayBuffer || []);
  const mime = String(declaredMime || '')
    .split(';')[0]
    .trim()
    .toLowerCase();

  if (u8.length >= 3 && u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff) {
    return { kind: 'jpeg', mime: 'image/jpeg', ext: 'jpg', browserOk: true };
  }
  if (u8.length >= 8 && u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47) {
    return { kind: 'png', mime: 'image/png', ext: 'png', browserOk: true };
  }
  if (u8.length >= 6 && u8[0] === 0x47 && u8[1] === 0x49 && u8[2] === 0x46) {
    return { kind: 'gif', mime: 'image/gif', ext: 'gif', browserOk: true };
  }
  if (
    u8.length >= 12 &&
    u8[0] === 0x52 &&
    u8[1] === 0x49 &&
    u8[2] === 0x46 &&
    u8[3] === 0x46 &&
    u8[8] === 0x57 &&
    u8[9] === 0x45 &&
    u8[10] === 0x42 &&
    u8[11] === 0x50
  ) {
    return { kind: 'webp', mime: 'image/webp', ext: 'webp', browserOk: true };
  }
  if (u8.length >= 2 && ((u8[0] === 0x42 && u8[1] === 0x4d) || mime.includes('bmp'))) {
    return { kind: 'bmp', mime: 'image/bmp', ext: 'bmp', browserOk: true };
  }
  // TIFF
  if (
    u8.length >= 4 &&
    ((u8[0] === 0x49 && u8[1] === 0x49 && u8[2] === 0x2a && u8[3] === 0x00) ||
      (u8[0] === 0x4d && u8[1] === 0x4d && u8[2] === 0x00 && u8[3] === 0x2a))
  ) {
    return { kind: 'tiff', mime: 'image/tiff', ext: 'tif', browserOk: false };
  }
  // Placeable WMF
  if (u8.length >= 4 && u8[0] === 0xd7 && u8[1] === 0xcd && u8[2] === 0xc6 && u8[3] === 0x9a) {
    return { kind: 'wmf', mime: 'image/x-wmf', ext: 'wmf', browserOk: false };
  }
  // EMF: header size 0x40 little-endian + " EMF" at offset 40
  if (
    u8.length >= 44 &&
    u8[0] === 0x01 &&
    u8[1] === 0x00 &&
    u8[2] === 0x00 &&
    u8[3] === 0x00 &&
    u8[40] === 0x20 &&
    u8[41] === 0x45 &&
    u8[42] === 0x4d &&
    u8[43] === 0x46
  ) {
    return { kind: 'emf', mime: 'image/x-emf', ext: 'emf', browserOk: false };
  }
  if (/emf/i.test(mime)) return { kind: 'emf', mime: mime || 'image/x-emf', ext: 'emf', browserOk: false };
  if (/wmf/i.test(mime)) return { kind: 'wmf', mime: mime || 'image/x-wmf', ext: 'wmf', browserOk: false };
  if (/tiff/i.test(mime)) return { kind: 'tiff', mime: mime || 'image/tiff', ext: 'tif', browserOk: false };

  if (mime.startsWith('image/')) {
    const ext = mime.includes('png')
      ? 'png'
      : mime.includes('gif')
        ? 'gif'
        : mime.includes('webp')
          ? 'webp'
          : mime.includes('bmp')
            ? 'bmp'
            : 'jpg';
    return { kind: 'declared', mime, ext, browserOk: true };
  }

  return { kind: 'unknown', mime: mime || 'application/octet-stream', ext: 'bin', browserOk: false };
}

function unsupportedWordImageMessage(kind) {
  if (kind === 'emf' || kind === 'wmf') {
    return 'định dạng EMF/WMF (đồ thị/shape Word) — trình duyệt không đọc được. Trong Word: chuột phải ảnh → Lưu dưới dạng ảnh (PNG) rồi chèn lại, hoặc Copy → Dán đặc biệt → Ảnh.';
  }
  if (kind === 'tiff') {
    return 'định dạng TIFF — hãy chuyển sang PNG/JPG trong Word rồi import lại.';
  }
  return 'trình duyệt không đọc được dữ liệu ảnh — hãy chuyển sang PNG/JPG rồi import lại.';
}

async function uploadLessonImportImage(arrayBuffer, contentType, storage, user) {
  const bytes = toArrayBuffer(arrayBuffer);
  if (!bytes || bytes.byteLength < 24) {
    throw new Error('file ảnh trống hoặc quá ngắn');
  }
  const sniffed = sniffImageKind(bytes, contentType);
  if (!sniffed.browserOk) {
    throw new Error(unsupportedWordImageMessage(sniffed.kind));
  }

  const file = new File([bytes], `docx_img.${sniffed.ext}`, { type: sniffed.mime });
  let blob;
  try {
    blob = await compressImageFileToJpegBlob(file, {
      maxEdge: 1680,
      quality: 0.82,
      blobTimeoutMs: 45000,
    });
  } catch (err) {
    const msg = String(err?.message || err || '');
    // Fallback: upload nguyên bản nếu là jpeg/png/gif/webp (canvas không nén được nhưng file vẫn hợp lệ)
    if (/jpeg|jpg|png|gif|webp/i.test(sniffed.kind) || /jpeg|jpg|png|gif|webp/i.test(sniffed.mime)) {
      blob = new Blob([bytes], { type: sniffed.mime });
    } else {
      throw new Error(
        msg.includes('Không đọc được ảnh')
          ? unsupportedWordImageMessage(sniffed.kind)
          : msg
      );
    }
  }

  if (blob.size > 4 * 1024 * 1024) {
    throw new Error('Ảnh trong Word sau nén vẫn > 4MB — hãy giảm kích thước ảnh trong file.');
  }
  try {
    await user.getIdToken(true);
  } catch {
    /* still try upload */
  }
  const isJpeg = String(blob.type || '').includes('jpeg') || String(blob.type || '').includes('jpg');
  const fname = `lesson_docx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${isJpeg ? 'jpg' : sniffed.ext}`;
  const r = storageRef(storage, `site-content/${fname}`);
  await uploadBytes(r, blob, { contentType: blob.type || (isJpeg ? 'image/jpeg' : sniffed.mime) });
  return getDownloadURL(r);
}

/**
 * @param {ArrayBuffer} arrayBuffer
 * @param {{ storage?: any, user?: any, onProgress?: (msg: string) => void }} [opts]
 * @returns {Promise<{ text: string, imageCount: number, skippedImages: number, warnings: string[], uploadedUrls: string[] }>}
 */
export async function extractLessonTextFromDocx(arrayBuffer, opts = {}) {
  const { storage, user, onProgress, onImageUploaded } = opts;
  const warnings = [];
  const uploadedUrls = [];
  let imageCount = 0;
  let skippedImages = 0;
  let imageIndex = 0;

  const canUpload = Boolean(storage && user);

  if (!canUpload) {
    warnings.push('Chưa đăng nhập / Storage chưa sẵn — ảnh trong Word sẽ bị bỏ qua.');
  }

  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      transformDocument: markUnderlinedDocxRuns,
      convertImage: mammoth.images.imgElement(async (image) => {
        imageIndex += 1;
        if (!canUpload) {
          skippedImages += 1;
          return { src: '' };
        }
        try {
          onProgress?.(`Đang tải ảnh ${imageIndex} từ Word…`);
          // Dùng readAsArrayBuffer — image.read() gọi Buffer.from (chỉ có trên Node),
          // nên trên trình duyệt sẽ lỗi "Buffer is not defined".
          const buf =
            typeof image.readAsArrayBuffer === 'function'
              ? await image.readAsArrayBuffer()
              : await image.read();
          const bytes =
            buf instanceof ArrayBuffer
              ? buf
              : buf?.buffer instanceof ArrayBuffer
                ? buf.buffer.slice(buf.byteOffset || 0, (buf.byteOffset || 0) + (buf.byteLength || 0))
                : buf;
          const url = await uploadLessonImportImage(bytes, image.contentType, storage, user);
          imageCount += 1;
          uploadedUrls.push(url);
          try {
            onImageUploaded?.(url);
          } catch {
            /* ignore tracker errors */
          }
          return { src: url };
        } catch (err) {
          skippedImages += 1;
          warnings.push(`Ảnh #${imageIndex}: ${err?.message || String(err)}`);
          return { src: '' };
        }
      }),
    }
  );

  let html = String(result.value || '');
  html = html.replace(/<img[^>]*\ssrc=["']["'][^>]*>/gi, '');
  html = html.replace(/<img(?![^>]*\ssrc=)[^>]*>/gi, '');

  const text = htmlToLessonImportText(html);
  (result.messages || []).forEach((m) => {
    const msg = String(m?.message || '').trim();
    if (!msg) return;
    // Mammoth luôn báo style Word phổ biến (List Paragraph, …) — không ảnh hưởng nội dung.
    if (/^Unrecognised paragraph style:/i.test(msg)) return;
    if (/^Unrecognised run style:/i.test(msg)) return;
    warnings.push(msg);
  });

  return { text, imageCount, skippedImages, warnings, uploadedUrls };
}

/** Gom cảnh báo ảnh Word cho alert ngắn gọn. */
export function summarizeDocxImageWarnings(warnings) {
  const list = (Array.isArray(warnings) ? warnings : []).map((w) => String(w || '').trim()).filter(Boolean);
  if (!list.length) return '';
  const imgFails = list.filter((w) => /^Ảnh\s*#\d+/i.test(w));
  const other = list.filter((w) => !/^Ảnh\s*#\d+/i.test(w));
  const emfLike = imgFails.filter((w) => /EMF|WMF|TIFF|không đọc được|trình duyệt không đọc/i.test(w));
  const parts = [];
  if (emfLike.length >= 2) {
    parts.push(
      `${emfLike.length} ảnh Word bị bỏ qua (thường EMF/WMF — đồ thị/shape trong Word). Cách xử lý: chuột phải ảnh → «Lưu dưới dạng ảnh» (PNG) rồi chèn lại vào Word.`
    );
    const restImg = imgFails.filter((w) => !emfLike.includes(w));
    if (restImg.length) parts.push(restImg.slice(0, 2).join(' | '));
  } else if (imgFails.length) {
    parts.push(imgFails.slice(0, 4).join(' | ') + (imgFails.length > 4 ? '…' : ''));
  }
  if (other.length) parts.push(other.slice(0, 2).join(' | '));
  return parts.join('\n');
}
