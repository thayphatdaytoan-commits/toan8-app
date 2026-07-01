/* eslint-disable */

/**
 * Nén ảnh → JPEG (canvas) và chèn snippet vào chuỗi ô nhập.
 */

export function spliceString(value, start, end, insert) {
  const v = value == null ? '' : String(value);
  const s = Math.max(0, Math.min(Number(start) || 0, v.length));
  const e = Math.max(s, Math.min(Number(end) ?? s, v.length));
  const piece = insert == null ? '' : String(insert);
  const next = v.slice(0, s) + piece + v.slice(e);
  const caret = s + piece.length;
  return { next, caret };
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được ảnh'));
    };
    img.src = url;
  });
}

/**
 * @param {File} file
 * @param {{ maxEdge?: number, quality?: number }} [opts]
 * @returns {Promise<Blob>}
 */
function isProbablyImageFile(file) {
  if (!file) return false;
  const t = String(file.type || '').toLowerCase();
  if (t.startsWith('image/')) return true;
  return /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i.test(String(file.name || ''));
}

export async function compressImageFileToJpegBlob(file, opts = {}) {
  if (!isProbablyImageFile(file)) {
    throw new Error('Chọn file ảnh (jpg, png, webp...)');
  }
  const maxEdge = opts.maxEdge ?? 1680;
  const quality = opts.quality ?? 0.82;
  const img = await loadImageFromFile(file);
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (!w || !h) throw new Error('Kích thước ảnh không hợp lệ');
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  w = Math.max(1, Math.round(w * scale));
  h = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không vẽ được canvas');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const blobTimeoutMs = opts.blobTimeoutMs ?? 45000;
  return new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error('Nén ảnh quá lâu — thử ảnh nhỏ hơn hoặc đổi trình duyệt')), blobTimeoutMs);
    canvas.toBlob(
      (blob) => {
        clearTimeout(to);
        if (blob) resolve(blob);
        else reject(new Error('Không nén được ảnh'));
      },
      'image/jpeg',
      quality
    );
  });
}

export function scheduleTextareaCaret(textarea, caret) {
  const el = textarea;
  const c = Math.max(0, caret);
  setTimeout(() => {
    if (!el || !document.body.contains(el)) return;
    try {
      el.focus();
      el.setSelectionRange(c, c);
    } catch {
      /* ignore */
    }
  }, 60);
}

/**
 * Chèn markdown ảnh vào state theo data-admin-snippet trên ô đang focus.
 * key ví dụ: lesson-theory, lesson-ex-desc:0, quiz-q:2, quiz-opt:1:3, import-quiz
 * @returns {boolean} đã cập nhật state
 */
export function applyAdminSnippetByKey(key, ta, markdown, ctx) {
  if (!key || !ta) return false;
  const start = typeof ta.selectionStart === 'number' ? ta.selectionStart : 0;
  const end = typeof ta.selectionEnd === 'number' ? ta.selectionEnd : start;
  const val = ta.value ?? '';
  const { next, caret } = spliceString(val, start, end, markdown);
  const parts = key.split(':');
  const kind = parts[0];

  const {
    setEditingLesson,
    setEditingQuiz,
    setImportText,
    onAfterImportQuizText,
    parseLessonContentObject,
    mergeLessonContentString,
  } = ctx;

  try {
    switch (kind) {
      case 'lesson-desc':
        setEditingLesson((el) => (el ? { ...el, description: next } : el));
        break;
      case 'lesson-theory':
        setEditingLesson((el) => {
          if (!el) return el;
          return { ...el, content: mergeLessonContentString(el.content, { theory_core: next }) };
        });
        break;
      case 'lesson-ex-desc': {
        const idx = Number(parts[1]);
        setEditingLesson((el) => {
          if (!el) return el;
          const { obj, error } = parseLessonContentObject(el.content);
          if (error || !obj) return el;
          const examples = [...(obj.examples || [])];
          if (!examples[idx]) return el;
          examples[idx] = { ...examples[idx], desc: next };
          return { ...el, content: JSON.stringify({ ...obj, examples }) };
        });
        break;
      }
      case 'lesson-ex-title': {
        const idx = Number(parts[1]);
        setEditingLesson((el) => {
          if (!el) return el;
          const { obj, error } = parseLessonContentObject(el.content);
          if (error || !obj) return el;
          const examples = [...(obj.examples || [])];
          if (!examples[idx]) return el;
          examples[idx] = { ...examples[idx], title: next };
          return { ...el, content: JSON.stringify({ ...obj, examples }) };
        });
        break;
      }
      case 'lesson-practice-q': {
        const idx = Number(parts[1]);
        setEditingLesson((el) => {
          if (!el) return el;
          const { obj, error } = parseLessonContentObject(el.content);
          if (error || !obj) return el;
          const practice = [...(obj.practice || [])];
          if (!practice[idx]) return el;
          practice[idx] = { ...practice[idx], question: next };
          return { ...el, content: JSON.stringify({ ...obj, practice }) };
        });
        break;
      }
      case 'lesson-practice-ex': {
        const idx = Number(parts[1]);
        setEditingLesson((el) => {
          if (!el) return el;
          const { obj, error } = parseLessonContentObject(el.content);
          if (error || !obj) return el;
          const practice = [...(obj.practice || [])];
          if (!practice[idx]) return el;
          practice[idx] = { ...practice[idx], explanation: next };
          return { ...el, content: JSON.stringify({ ...obj, practice }) };
        });
        break;
      }
      case 'lesson-practice-opt': {
        const idx = Number(parts[1]);
        const oi = Number(parts[2]);
        setEditingLesson((el) => {
          if (!el) return el;
          const { obj, error } = parseLessonContentObject(el.content);
          if (error || !obj) return el;
          const practice = [...(obj.practice || [])];
          if (!practice[idx]) return el;
          const opts = [...(practice[idx].options || ['', '', '', ''])];
          opts[oi] = next;
          practice[idx] = { ...practice[idx], options: opts };
          return { ...el, content: JSON.stringify({ ...obj, practice }) };
        });
        break;
      }
      case 'lesson-raw':
        setEditingLesson((el) => (el ? { ...el, content: next } : el));
        break;
      case 'quiz-q': {
        const qIdx = Number(parts[1]);
        setEditingQuiz((eq) => {
          if (!eq || !eq.questions[qIdx]) return eq;
          const nq = [...eq.questions];
          nq[qIdx] = { ...nq[qIdx], question: next };
          return { ...eq, questions: nq };
        });
        break;
      }
      case 'quiz-opt': {
        const qIdx = Number(parts[1]);
        const oIdx = Number(parts[2]);
        setEditingQuiz((eq) => {
          if (!eq || !eq.questions[qIdx]) return eq;
          const nq = [...eq.questions];
          const opts = [...(nq[qIdx].options || ['', '', '', ''])];
          opts[oIdx] = next;
          nq[qIdx] = { ...nq[qIdx], options: opts };
          return { ...eq, questions: nq };
        });
        break;
      }
      case 'quiz-exp': {
        const qIdx = Number(parts[1]);
        setEditingQuiz((eq) => {
          if (!eq || !eq.questions[qIdx]) return eq;
          const nq = [...eq.questions];
          nq[qIdx] = { ...nq[qIdx], explanation: next };
          return { ...eq, questions: nq };
        });
        break;
      }
      case 'quiz-tf': {
        const qIdx = Number(parts[1]);
        const ti = Number(parts[2]);
        setEditingQuiz((eq) => {
          if (!eq || !eq.questions[qIdx]) return eq;
          const nq = [...eq.questions];
          const items = [...(nq[qIdx].tfItems || [])];
          if (!items[ti]) return eq;
          items[ti] = { ...items[ti], text: next };
          nq[qIdx] = { ...nq[qIdx], tfItems: items };
          return { ...eq, questions: nq };
        });
        break;
      }
      case 'quiz-sc': {
        const qIdx = Number(parts[1]);
        setEditingQuiz((eq) => {
          if (!eq || !eq.questions[qIdx]) return eq;
          const nq = [...eq.questions];
          nq[qIdx] = { ...nq[qIdx], shortCorrect: next };
          return { ...eq, questions: nq };
        });
        break;
      }
      case 'quiz-ph': {
        const qIdx = Number(parts[1]);
        setEditingQuiz((eq) => {
          if (!eq || !eq.questions[qIdx]) return eq;
          const nq = [...eq.questions];
          nq[qIdx] = { ...nq[qIdx], answerPlaceholder: next };
          return { ...eq, questions: nq };
        });
        break;
      }
      case 'import-quiz':
        setImportText(next);
        if (typeof onAfterImportQuizText === 'function') onAfterImportQuizText(next);
        break;
      default:
        return false;
    }
  } catch (e) {
    console.error(e);
    return false;
  }
  scheduleTextareaCaret(ta, caret);
  return true;
}
