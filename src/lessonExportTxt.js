/* eslint-disable */
/**
 * Export bài giảng (form Admin + JSON content) → TXT theo format import mau-import-bai-giang.
 */
import { parseLessonContentObject } from './lessonContentAdminUtils';
import { normalizeLessonMindMap } from './lessonMindMap';
import { normalizeLessonSections, sortLessonSections } from './lessonSections';
import {
  formatFillBlanksAnswersText,
  normalizeFillBlanksQuestion,
  normalizePracticeList,
  normalizeTrueFalseAnswer,
  parseOrderingItems,
} from './practiceQuestionTypes';
import { slugifyVi } from './lessonSlug';

function metaLine(key, value) {
  const v = String(value ?? '').trim();
  return `@${key}: ${v}`;
}

function examplesArrayToCoreText(arr) {
  const list = Array.isArray(arr) ? arr : [];
  const out = [];
  for (const ex of list) {
    const title = (ex?.title ?? '').toString().trim();
    const desc = (ex?.desc ?? '').toString().trim();
    const items = Array.isArray(ex?.items) ? ex.items : [];
    if (title) out.push(title);
    if (desc) out.push(`Phương pháp:\n${desc}`);
    for (const it of items) {
      const q = (it?.q ?? '').toString().trim();
      const steps = Array.isArray(it?.steps)
        ? it.steps.map((s) => String(s ?? '').trim()).filter(Boolean)
        : [];
      if (q) out.push(`Ví dụ:\n${q}`);
      if (steps.length) out.push(`Lời giải:\n${steps.join('\n')}`);
    }
    out.push('');
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function resolveExamplesCore(block) {
  const core = String(block?.examples_core ?? '').trim();
  if (core) return core;
  return examplesArrayToCoreText(block?.examples);
}

function mcqLetter(correctAnswer, options) {
  if (typeof correctAnswer === 'string' && /^[A-Da-d]$/.test(correctAnswer.trim())) {
    return correctAnswer.trim().toUpperCase();
  }
  const idx = Number(correctAnswer);
  if (Number.isFinite(idx) && idx >= 0 && idx < 26) {
    return String.fromCharCode(65 + idx);
  }
  const opts = Array.isArray(options) ? options : [];
  const i = opts.findIndex((o) => String(o ?? '').trim() === String(correctAnswer ?? '').trim());
  if (i >= 0) return String.fromCharCode(65 + i);
  return 'A';
}

function serializePracticeQuestion(p, index) {
  const n = index + 1;
  const type = String(p?.type || 'mcq').trim();
  const lines = [];
  const q = String(p?.question ?? p?.content ?? '').trim();

  if (type === 'true_false_group') {
    lines.push(`Câu ${n}. [đúng sai nhóm]`);
    if (q) lines.push(q);
    const items = Array.isArray(p?.tfItems) ? p.tfItems : [];
    items.forEach((it, i) => {
      const key = String(it?.key || String.fromCharCode(97 + i)).trim() || String.fromCharCode(97 + i);
      lines.push(`${key}) ${String(it?.text ?? '').trim()}`);
    });
    lines.push('Lời giải');
    items.forEach((it, i) => {
      const key = String(it?.key || String.fromCharCode(97 + i)).trim() || String.fromCharCode(97 + i);
      const ok = normalizeTrueFalseAnswer(it?.correct) === true;
      const note = String(it?.explanation ?? it?.note ?? '').trim();
      lines.push(`${key}) ${ok ? 'Đúng' : 'Sai'}${note ? `: ${note}` : ''}`);
    });
  } else if (type === 'true_false') {
    lines.push(`Câu ${n}. [đúng sai]`);
    if (q) lines.push(q);
    const ok = normalizeTrueFalseAnswer(p?.correctAnswer) === true;
    lines.push(`Đáp án: ${ok ? 'Đúng' : 'Sai'}`);
  } else if (type === 'ordering') {
    lines.push(`Câu ${n}. [sắp xếp]`);
    if (q) lines.push(q);
    const items = parseOrderingItems(p?.items);
    items.forEach((it, i) => lines.push(`${i + 1}. ${it}`));
    const order = Array.isArray(p?.correctOrder)
      ? p.correctOrder.map((x) => Number(x) + 1).filter((x) => Number.isFinite(x))
      : items.map((_, i) => i + 1);
    lines.push(`Đáp án: ${order.join(',')}`);
  } else if (type === 'drag_drop') {
    lines.push(`Câu ${n}. [kéo thả]`);
    if (q) lines.push(q);
    const slots = Array.isArray(p?.slots) ? p.slots : [];
    slots.forEach((s, i) => {
      const label = String(s?.label ?? s?.id ?? `Ô ${i + 1}`).trim();
      lines.push(`Ô ${i + 1}: ${label}`);
    });
    const choices = Array.isArray(p?.choices) ? p.choices.map((c) => String(c ?? '').trim()).filter(Boolean) : [];
    if (choices.length) lines.push(`Lựa chọn: ${choices.join(' | ')}`);
    const ans = p?.correctAnswer && typeof p.correctAnswer === 'object' ? p.correctAnswer : {};
    const ansParts = slots.map((s, i) => {
      const id = String(s?.id || `slot${i + 1}`);
      const val = String(ans[id] ?? '').trim();
      return `Ô${i + 1}=${val}`;
    });
    if (ansParts.length) lines.push(`Đáp án: ${ansParts.join('; ')}`);
  } else if (type === 'fill_blanks') {
    lines.push(`Câu ${n}. [điền chỗ trống]`);
    const fb = normalizeFillBlanksQuestion(p);
    if (fb.question) lines.push(fb.question);
    if (fb.passage) lines.push(`Đoạn: ${fb.passage}`);
    const blanksText =
      p?.blanksText != null && String(p.blanksText).trim()
        ? String(p.blanksText).trim()
        : formatFillBlanksAnswersText(fb.blanks);
    if (blanksText) {
      lines.push('Đáp án:');
      lines.push(blanksText);
    }
  } else if (type === 'input') {
    lines.push(`Câu ${n}. ${q || '(đề trống)'}`);
    const parts = Array.isArray(p?.answerParts) ? p.answerParts : [];
    let answer = '';
    let placeholder = '';
    if (parts.length) {
      answer = parts
        .map((x) => String(x?.correctAnswer ?? '').trim())
        .filter(Boolean)
        .join(' | ');
      placeholder = String(parts[0]?.placeholder ?? '').trim();
    }
    if (!answer) answer = String(p?.correctAnswer ?? '').trim();
    if (!placeholder) placeholder = String(p?.answerPlaceholder ?? p?.placeholder ?? '').trim();
    lines.push(`Đáp án: ${answer}`);
    if (placeholder) lines.push(`Placeholder: ${placeholder}`);
  } else {
    // mcq (default)
    lines.push(`Câu ${n}. ${q || '(đề trống)'}`);
    const opts = Array.isArray(p?.options) ? p.options : [];
    opts.forEach((opt, i) => {
      const letter = String.fromCharCode(65 + i);
      lines.push(`${letter}. ${String(opt ?? '').trim()}`);
    });
    lines.push(`Đáp án: ${mcqLetter(p?.correctAnswer, opts)}`);
  }

  const hint = String(p?.hint ?? '').trim();
  if (hint) lines.push(`Gợi ý hướng dẫn: ${hint}`);
  const hintVideo = String(p?.hintVideoUrl ?? p?.hint_video_url ?? '').trim();
  if (hintVideo) lines.push(`Video gợi ý: ${hintVideo}`);
  const explanation = String(p?.explanation ?? '').trim();
  if (explanation && type !== 'true_false_group') {
    lines.push(`Lời giải: ${explanation}`);
  }

  return lines.join('\n');
}

function serializeMindMap(mindMap) {
  const mm = normalizeLessonMindMap(mindMap);
  if (!mm?.summaryRoot?.text && !mm?.summaryTitle) return '';
  const lines = ['TÓM TẮT BÀI HỌC'];
  if (mm.summaryTitle) lines.push(`TITLE: ${mm.summaryTitle}`);
  const root = mm.summaryRoot;
  if (root?.text) lines.push(`ROOT: ${root.text}`);

  const walk = (node, depth) => {
    const children = Array.isArray(node?.children) ? node.children : [];
    for (const ch of children) {
      const t = String(ch?.text ?? '').trim();
      if (!t) continue;
      lines.push(`${'  '.repeat(depth)}- ${t}`);
      walk(ch, depth + 1);
    }
  };
  if (root) walk(root, 0);
  if (mm.mode === 'image' && mm.imageUrl) {
    lines.push(`![tóm tắt](${mm.imageUrl})`);
  }
  return lines.join('\n');
}

function serializeMaterials(materials, pdfUrl) {
  const list = Array.isArray(materials) ? materials.filter((m) => String(m?.url || '').trim()) : [];
  const lines = [];
  if (pdfUrl || list.length) {
    lines.push('TÀI LIỆU PDF');
    if (pdfUrl) lines.push(pdfUrl);
    list.forEach((m) => {
      const title = String(m.title || '').trim();
      const url = String(m.url || '').trim();
      if (title) lines.push(`// ${title}`);
      if (url && url !== pdfUrl) lines.push(url);
    });
  }
  return lines.join('\n');
}

function serializeContentBlock(block, { sectionLabel } = {}) {
  const parts = [];
  if (sectionLabel) {
    parts.push(`// ===== ${sectionLabel} =====`);
    parts.push('');
  }

  const theory = String(block?.theory_core ?? '').trim();
  if (theory) {
    parts.push('LÝ THUYẾT TRỌNG TÂM');
    parts.push(theory);
    parts.push('');
  }

  const examples = resolveExamplesCore(block);
  if (examples) {
    parts.push('CÁC DẠNG TOÁN & VÍ DỤ');
    parts.push(examples);
    parts.push('');
  }

  const practice = normalizePracticeList(block?.practice || []);
  if (practice.length) {
    parts.push('BÀI TẬP LUYỆN TẬP');
    practice.forEach((p, i) => {
      parts.push(serializePracticeQuestion(p, i));
      parts.push('---');
    });
    parts.push('');
  }

  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * @param {object} lesson — editingLesson từ Admin (title, grade_level, content, …)
 * @returns {{ text: string, fileName: string }}
 */
export function exportLessonToImportTxt(lesson) {
  const L = lesson || {};
  const { obj, error } = parseLessonContentObject(L.content);
  if (error || !obj) {
    throw new Error(error || 'Không đọc được JSON nội dung bài giảng.');
  }

  const meta = [];
  meta.push(metaLine('grade_level', L.grade_level || obj?.meta?.grade_level || ''));
  meta.push(metaLine('chapter', L.chapter || obj?.meta?.chapter || ''));
  meta.push(metaLine('lesson_no', L.lesson_no || obj?.meta?.lesson_no || ''));
  meta.push(metaLine('title', L.title || obj?.title || obj?.meta?.title || ''));
  meta.push(metaLine('video_url', L.videoUrl || obj?.meta?.video_url || ''));
  meta.push(metaLine('video_material_url', L.videoMaterialUrl || obj?.meta?.video_material_url || ''));
  if (L.slidesUrl) meta.push(metaLine('slides_url', L.slidesUrl));
  meta.push(metaLine('pdf_url', L.pdfUrl || obj?.meta?.pdf_url || ''));
  meta.push(metaLine('seo_description', L.description || obj?.seo?.description || ''));
  const focus = String(obj?.seo?.focus_keyword || '').trim();
  const keywords = Array.isArray(obj?.seo?.keywords) ? obj.seo.keywords.filter(Boolean) : [];
  if (focus) meta.push(metaLine('focus_keyword', focus));
  if (keywords.length) meta.push(metaLine('keywords', keywords.join(', ')));

  const bodyParts = [];
  const sections = sortLessonSections(normalizeLessonSections(obj.sections));

  if (sections.length > 0) {
    sections.forEach((sec, i) => {
      const label = `Mục ${sec.section_no || i + 1}${sec.title ? `: ${sec.title}` : ''}`;
      const block = serializeContentBlock(sec, { sectionLabel: label });
      if (block) bodyParts.push(block);
      if (sec.videoUrl) bodyParts.push(`// video mục: ${sec.videoUrl}`);
      if (sec.slidesUrl) bodyParts.push(`// slides mục: ${sec.slidesUrl}`);
    });
  } else {
    const block = serializeContentBlock(obj);
    if (block) bodyParts.push(block);
  }

  const mind = serializeMindMap(obj.mindMap);
  if (mind) bodyParts.push(mind);

  const mats = serializeMaterials(obj.materials, L.pdfUrl || '');
  if (mats) bodyParts.push(mats);

  const header = [
    '// Export từ Admin — Thầy Phát dạy toán',
    `// Ngày: ${new Date().toISOString().slice(0, 10)}`,
    '// Có thể Import TXT lại vào form soạn bài (meta + tiêu đề mục được nhận).',
    '',
  ].join('\n');

  const text = `${header}${meta.join('\n')}\n\n${bodyParts.join('\n\n')}\n`.replace(/\n{4,}/g, '\n\n\n');

  const base =
    slugifyVi(L.title || `bai-giang-${L.grade_level || ''}-${L.lesson_no || ''}`) || 'bai-giang';
  const fileName = `${base}.txt`;

  return { text, fileName };
}

/** Tải file TXT xuống máy. */
export function downloadTextFile(text, fileName) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'bai-giang.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
