/* eslint-disable */

import { parseFillBlanksCorrectRaw } from './practiceQuestionTypes';

/**
 * Chuẩn import TXT / Word (text trích xuất) bài giảng — thân thiện SEO & AI.
 *
 * Metadata:
 * - Các dòng @key: value ở đầu (value có thể để trống sau dấu :).
 * - Hoặc dòng tiếng Việt: Chương: 1 | Bài: 2 | Tiêu đề: ... | Link PDF: https://...
 * - Dòng ghi chú (không đưa vào nội dung): bắt đầu bằng //
 * - Dòng bắt đầu bằng "# " (markdown) trong phần lý thuyết = tiêu đề lớn trong khung lý thuyết (trên web map sang thẻ H2;
 *   H1 trang học sinh là Tiêu đề bài @title / form Admin).
 *
 * Khóa @ hay dùng:
 * @grade / @grade_level  @chapter  @lesson / @lesson_no  @title
 * @video_url  @video_material_url  @pdf_url
 * @seo_description  @focus_keyword  @keywords (phân tách bằng , ; hoặc |)
 * @theory_core (một dòng ngắn; lý thuyết dài nên viết khối văn sau meta hoặc sửa ô trên Admin)
 *
 * Phần nội dung (sau meta):
 * - Lý thuyết trọng tâm (ô “Lý thuyết trọng tâm” trên web): một trong các cách
 *     • @theory_core: ... hoặc @ly_thuyet: ... (một dòng meta)
 *     • Dòng tiếng Việt: Lý thuyết trọng tâm: ... (một dòng)
 *     • Đoạn văn / công thức viết TRƯỚC dòng đầu tiên “Dạng 1:” hoặc “Ví dụ 1:” (không có Câu a
 *       trong khối đó) → parser gom vào theory_core, không đẩy xuống “Các dạng toán”.
 * - Các dạng toán + ví dụ: Dạng 1:, … rồi Ví dụ 1:, Câu a … Câu z (hoặc Câu 1, Câu 2, …), Lời giải: …
 * - Tiêu đề dòng đơn: BÀI TẬP TỰ LUYỆN / Bài tập tự luyện → toàn bộ phía sau (đến mục Tài liệu) → tab Bài tập.
 * - Tiêu đề: TÀI LIỆU PDF / LINK PDF → dòng URL kế tiếp (hoặc cùng dòng sau :) → @pdf_url nếu chưa có.
 *
 * Bài tập (MCQ): Câu 1: ... / A. ... / B. ... / Đáp án: A / (tuỳ chọn) Gợi ý hướng dẫn: ... / Lời giải: ...
 * Bài tập (nhập đáp án): có Đáp án: nhưng không có A/B/C/D → type input.
 * Còn lại → type text (hiển thị + công thức $...$).
 *
 * JSON sau import có thể thêm thủ công khóa "theory_core" (chuỗi, có $...$) → mục “Lý thuyết trọng tâm”
 * trên tab học sinh; nếu không có thì dùng ô Tóm tắt / @seo_description trên Admin.
 */

const PRACTICE_HEADER =
  /^(BÀI\s*TẬP\s*(TỰ\s*LUYỆN|LUYỆN\s*TẬP)|BÀI\s*TẬP\s*TL|PHẦN\s*BÀI\s*TẬP|BÀI\s*TẬP\s*ỨNG\s*DỤNG)(\s*[:：]?\s*.*)?$/i;

const EXAMPLES_HEADER =
  /^(CÁC\s*DẠNG\s*TOÁN(\s*&\s*VÍ\s*DỤ)?|DẠNG\s*TOÁN(\s*&\s*VÍ\s*DỤ)?|DẠNG\s*TOÁN\s*VÀ\s*VÍ\s*DỤ)(\s*[:：]?\s*.*)?$/i;

const THEORY_HEADER =
  /^(LÝ\s*THUYẾT\s*TRỌNG\s*TÂM|LÝ\s*THUYẾT|KIẾN\s*THỨC\s*TRỌNG\s*TÂM)(\s*[:：]?\s*.*)?$/i;

const PDF_SECTION_HEADER =
  /^(TÀI\s*LIỆU\s*PDF|LINK\s*PDF|TÀI\s*LIỆU\s*THAM\s*KHẢO|TÀI\s*LIỆU)(\s*[:：]?\s*.*)?$/i;

const VI_META_PATTERNS = [
  [/^(chương|chapter)\s*[:：]\s*(.+)$/i, 'chapter'],
  [/^(bài|bài\s*số|lesson|lesson_no)\s*[:：]\s*(.+)$/i, 'lesson_no'],
  [/^(tiêu đề|title)\s*[:：]\s*(.+)$/i, 'title'],
  [/^(lớp|khối|grade|grade_level)\s*[:：]\s*(.+)$/i, 'grade_level'],
  [/^(link\s*pdf|pdf|tài\s*liệu\s*pdf)\s*[:：]\s*(.+)$/i, 'pdf'],
  [/^(youtube|video|link\s*video)\s*[:：]\s*(.+)$/i, 'youtube'],
  [/^(mô\s*tả|seo|seo_description|meta\s*description)\s*[:：]\s*(.+)$/i, 'seo_description'],
  [
    /^(lý\s*thuyết\s*trọng\s*tâm|ly\s*thuyet\s*trong\s*tam|ly_thuyet_trong_tam)\s*[:：]\s*(.+)$/i,
    'theory_core',
  ],
  [/^(từ\s*khóa\s*chính|focus\s*keyword|primary\s*keyword|keyword\s*chính)\s*[:：]\s*(.+)$/i, 'focus_keyword'],
  [/^(từ\s*khóa\s*phụ|keywords|secondary\s*keywords|từ\s*khóa\s*liên\s*quan)\s*[:：]\s*(.+)$/i, 'keywords'],
  [/^(từ\s*khóa)\s*[:：]\s*(.+)$/i, 'keywords'],
];

function consumeVietnameseMetaLines(lines, meta) {
  let changed = true;
  while (changed && lines.length > 0) {
    changed = false;
    const L = lines[0];
    for (const [re, key] of VI_META_PATTERNS) {
      const m = L.match(re);
      if (m) {
        const v = (m[2] ?? '').trim();
        if (v) meta[key] = v;
        lines.shift();
        changed = true;
        break;
      }
    }
  }
}

function scoopLeadingStandalonePdfUrl(lines, meta) {
  while (lines.length > 0) {
    const L = lines[0];
    if (meta.pdf_url && String(meta.pdf_url).trim()) break;
    if (/^https?:\/\/\S+$/i.test(L)) {
      const u = L.trim();
      if (/\.pdf(\?|$)/i.test(u) || /drive\.google\.com|docs\.google\.com|dropbox\.com/i.test(u)) {
        meta.pdf_url = u;
        lines.shift();
        continue;
      }
    }
    break;
  }
}

/** Tách theo tiêu đề mục; mọi thứ tự (PDF trước / sau bài tập) đều được. Dòng tiêu đề không đưa vào nội dung. */
function splitLessonBodySections(lines) {
  const normalizeHeaderLine = (line) => {
    let s = String(line || '').trim();
    // Word hay có prefix dạng "1. ..." / "I) ..." / "- ..." / "• ..."
    // → bỏ prefix để match tiêu đề mục ổn định hơn.
    s = s.replace(/^[\u2022•\-–—]+\s*/g, '');
    s = s.replace(/^(?:\(?\d{1,2}\)?|[ivxlcdm]{1,6})\s*[\).:\-]\s*/i, '');
    return s.trim();
  };

  const hits = [];
  let hasTheoryHeader = false;
  let hasExamplesHeader = false;
  let hasPracticeHeader = false;
  let hasPdfHeader = false;
  for (let i = 0; i < lines.length; i++) {
    const L = normalizeHeaderLine(lines[i]);
    if (THEORY_HEADER.test(L)) {
      hits.push({ k: 't', i });
      hasTheoryHeader = true;
    }
    if (EXAMPLES_HEADER.test(L)) {
      hits.push({ k: 'e', i });
      hasExamplesHeader = true;
    }
    if (PRACTICE_HEADER.test(L)) {
      hits.push({ k: 'p', i });
      hasPracticeHeader = true;
    }
    if (PDF_SECTION_HEADER.test(L)) {
      hits.push({ k: 'd', i });
      hasPdfHeader = true;
    }
  }
  hits.sort((a, b) => a.i - b.i);

  const theory = [];
  const examples = [];
  const practice = [];
  const pdfSection = [];
  let mode = 'theory';
  let hi = 0;

  for (let idx = 0; idx < lines.length; idx++) {
    if (hi < hits.length && hits[hi].i === idx) {
      const kind = hits[hi].k;
      hi += 1;
      if (kind === 't') mode = 'theory';
      else if (kind === 'e') mode = 'examples';
      else if (kind === 'p') mode = 'practice';
      else if (kind === 'd') mode = 'pdf';
      continue;
    }
    if (mode === 'theory') theory.push(lines[idx]);
    else if (mode === 'examples') examples.push(lines[idx]);
    else if (mode === 'practice') practice.push(lines[idx]);
    else pdfSection.push(lines[idx]);
  }

  return {
    theory,
    examples,
    practice,
    pdfSection,
    hasTheoryHeader,
    hasExamplesHeader,
    hasPracticeHeader,
    hasPdfHeader,
  };
}

function extractPdfUrlFromSection(pdfSection, meta) {
  if (!pdfSection.length || (meta.pdf_url && String(meta.pdf_url).trim())) return;
  for (let i = 0; i < pdfSection.length; i++) {
    const L = pdfSection[i];
    const sameLine = L.match(/^(?:TÀI\s*LIỆU|LINK\s*PDF)[^:]*[:：]\s*(https?:\/\/\S+)/i);
    if (sameLine) {
      meta.pdf_url = sameLine[1].trim();
      return;
    }
    const urlOnly = L.match(/^(https?:\/\/\S+)$/i);
    if (urlOnly && i > 0) {
      meta.pdf_url = urlOnly[1].trim();
      return;
    }
  }
  const joined = pdfSection.join('\n');
  const m = joined.match(/https?:\/\/[^\s)]+/i);
  if (m) meta.pdf_url = m[0].trim();
}

function parseTheoryExamples(theoryLines) {
  const examples = [];
  let curEx = null;
  let curItem = null;

  for (const line of theoryLines) {
    if (line.match(/^(Dạng\s*\d+|Ví\s*dụ\s*\d+|Bài\s*mới)[:\-]?\s*(.*)$/i)) {
      if (curItem && curEx) curEx.items.push(curItem);
      if (curEx) examples.push(curEx);
      curEx = {
        id: `ex_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: line,
        desc: '',
        items: [],
      };
      curItem = null;
    } else if (line.match(/^(Cách làm|Ghi chú|Lời khuyên|Phương pháp)[:\-]?\s*(.*)$/i)) {
      if (curEx) curEx.desc += `\n${line}`;
    } else if (line.match(/^(Câu\s*\d+|Câu\s*[a-z]|Bài\s*\d+|Hỏi)[:\-]?\s*(.*)$/i)) {
      if (curItem && curEx) curEx.items.push(curItem);
      curItem = { q: line, steps: [] };
    } else if (line.match(/^(Hướng dẫn|Lời giải|Giải)[:\-]?\s*(.*)$/i)) {
      if (!curItem && curEx) curItem = { q: '', steps: [] };
      if (curItem) curItem.steps.push(line);
    } else {
      if (curItem && curItem.steps.length > 0) {
        curItem.steps.push(line);
      } else if (curItem) {
        curItem.q += `\n${line}`;
      } else if (curEx) {
        curEx.desc += `\n${line}`;
      } else {
        if (!curEx) {
          curEx = {
            id: `ex_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            title: 'Nội dung',
            desc: line,
            items: [],
          };
        } else {
          curEx.desc += `\n${line}`;
        }
      }
    }
  }
  if (curItem && curEx) curEx.items.push(curItem);
  if (curEx) examples.push(curEx);
  return examples;
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
      const steps = Array.isArray(it?.steps) ? it.steps.map((s) => String(s ?? '').trim()).filter(Boolean) : [];
      if (q) out.push(`Ví dụ:\n${q}`);
      if (steps.length) out.push(`Lời giải:\n${steps.join('\n')}`);
    }
    out.push('');
  }
  const s = out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return s ? s + '\n' : '';
}

function splitPracticeBlocks(lines) {
  const blocks = [];
  let cur = [];
  for (const line of lines) {
    // Quy tắc mới: không bắt buộc "Câu 1,2,3". Chỉ cần 1 dòng bắt đầu câu:
    // - Marker ký tự đặc biệt "§" ở đầu dòng (không hiển thị ra nội dung)
    // - hoặc marker "===" / "---" để ngăn câu
    const t = String(line || '').trim();
    const isSeparator = /^(-{3,}|={3,}|\*{3,})$/.test(t);
    const isNewQ = /^§/.test(t);
    const isMetaOnlyCur =
      cur.length > 0 && cur.every((x) => /^(?:ID|Id|id)\s*[:：]/.test(String(x || '').trim()));

    // Nếu block hiện tại chỉ có "ID: ..." và dòng hiện tại là bắt đầu câu → KHÔNG tách block,
    // mà gắn ID vào cùng câu để tránh tạo "câu rỗng" chỉ có ID.
    if (isNewQ && isMetaOnlyCur) {
      cur.push(line);
      continue;
    }

    if ((isSeparator || isNewQ) && cur.length) {
      blocks.push(cur);
      cur = isSeparator ? [] : [line];
    } else {
      cur.push(line);
    }
  }
  if (cur.length) blocks.push(cur);
  return blocks;
}

function extractPracticeExplanation(remainder) {
  const r = (remainder || '').trim();
  if (!r) return '';
  const em = r.match(/^(lời\s*giải|loi\s*giai|giải\s*thích|giai\s*thich|giải|giai)\s*[:\-]\s*([\s\S]*)$/i);
  return (em ? em[2] : r).trim();
}

const PRACTICE_HINT_LINE_RE =
  /^(gợi\s*ý(?:\s*hướng\s*dẫn)?|hướng\s*dẫn(?:\s*gợi\s*ý)?|huong\s*dan(?:\s*goi\s*y)?|goi\s*y(?:\s*huong\s*dan)?)\s*[:\-]\s*(.*)$/i;
const PRACTICE_EXPL_LINE_RE =
  /^(lời\s*giải|loi\s*giai|giải\s*thích|giai\s*thich|giải|giai)\s*[:\-]\s*(.*)$/i;

/** Tách placeholder / gợi ý (trước nộp) / lời giải (sau nộp) phía sau dòng Đáp án. */
function parsePracticeMetaAfterAnswer(afterLines) {
  let answerPlaceholder = '';
  const hintLines = [];
  const explLines = [];
  let mode = null;

  for (const ln of afterLines) {
    const t = String(ln ?? '').trim();
    if (!t) {
      if (mode === 'hint') hintLines.push('');
      else if (mode === 'explanation') explLines.push('');
      continue;
    }

    const phMatch =
      t.match(/^placeholder\s*[:：\-]\s*(.+)$/i) ||
      t.match(/^(chú\s*thích|chu\s*thich)\s*[:：\-]\s*(.+)$/i);
    if (phMatch && !answerPlaceholder) {
      answerPlaceholder = (phMatch[2] ?? phMatch[1] ?? '').toString().trim();
      mode = null;
      continue;
    }

    const hm = t.match(PRACTICE_HINT_LINE_RE);
    if (hm) {
      mode = 'hint';
      if ((hm[2] || '').trim()) hintLines.push(hm[2]);
      continue;
    }
    const em = t.match(PRACTICE_EXPL_LINE_RE);
    if (em) {
      mode = 'explanation';
      if ((em[2] || '').trim()) explLines.push(em[2]);
      continue;
    }

    if (mode === 'hint') hintLines.push(ln);
    else if (mode === 'explanation') explLines.push(ln);
    else {
      mode = 'explanation';
      explLines.push(ln);
    }
  }

  const joinTrim = (arr) => arr.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return {
    answerPlaceholder,
    hint: joinTrim(hintLines),
    explanation: joinTrim(explLines),
  };
}

function extractPracticePlaceholder(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const m =
    s.match(/^placeholder\s*[:：\-]\s*(.+)$/i) ||
    s.match(/^(chú\s*thích|chu\s*thich)\s*[:：\-]\s*(.+)$/i);
  return (m ? (m[2] ?? m[1] ?? '') : '').toString().trim();
}

function detectPracticeBlockType(text) {
  const s = String(text || '').toLowerCase();
  if (/\[đúng\s*sai\]|loại\s*[:：]\s*đúng\s*sai|true\s*false/.test(s)) return 'true_false';
  if (/\[sắp\s*xếp\]|loại\s*[:：]\s*sắp\s*xếp|ordering/.test(s)) return 'ordering';
  if (/\[kéo\s*thả\]|loại\s*[:：]\s*kéo\s*thả|drag\s*drop/.test(s)) return 'drag_drop';
  if (/\[điền\s*chỗ\s*trống\]|\[điền\]|\[cloze\]|loại\s*[:：]\s*điền\s*chỗ\s*trống|fill\s*blank/.test(s))
    return 'fill_blanks';
  return null;
}

function parseOrderingItemsFromStem(lines) {
  const items = [];
  for (const l of lines) {
    const t = String(l ?? '').trim();
    const m = t.match(/^(?:\d+[\.\)]|[-•*])\s+(.+)$/);
    if (m) items.push(m[1].trim());
  }
  return items;
}

function parseDragDropFromStem(lines) {
  const slots = [];
  const choices = [];
  for (const l of lines) {
    const t = String(l ?? '').trim();
    const slotM = t.match(/^(?:Ô|O|Slot)\s*(\d+)\s*[:：\-]\s*(.+)$/i);
    if (slotM) {
      slots.push({ id: `slot${slotM[1]}`, label: slotM[2].trim() });
      continue;
    }
    const choiceM = t.match(/^(?:Lựa\s*chọn|Lua\s*chon|Choices?)\s*[:：\-]\s*(.+)$/i);
    if (choiceM) {
      choices.push(
        ...choiceM[1]
          .split(/[|；]/)
          .map((x) => x.trim())
          .filter(Boolean)
      );
    }
  }
  return { slots, choices };
}

function parseDragDropCorrect(raw, slots) {
  const out = {};
  const s = String(raw || '').trim();
  if (!s) return out;
  const parts = s.split(/[;；]/g).map((x) => x.trim()).filter(Boolean);
  for (const p of parts) {
    const m = p.match(/^(?:Ô|O|Slot)\s*(\d+)\s*=\s*(.+)$/i);
    if (m) out[`slot${m[1]}`] = m[2].trim();
  }
  if (!Object.keys(out).length && slots.length === 1) out[slots[0].id] = s;
  return out;
}

function parsePracticeBlock(blockLines, blockIndex) {
  const full = blockLines.join('\n').trim();
  if (!full) return null;

  // ID ổn định (không phụ thuộc thứ tự) để xáo câu không ảnh hưởng "key"
  const idMatch = full.match(/^(?:ID|Id|id)\s*[:：]\s*([^\n]+)\s*$/m);
  const idRaw = idMatch ? idMatch[1].trim() : '';
  const id = idRaw ? `pr_${idRaw}` : `p_${Date.now()}_${blockIndex}_${Math.random().toString(36).slice(2, 6)}`;

  const daMatch = full.match(
    /^(?:đáp\s*án|dap\s*an|đáp\s*số|dap\s*so|kết\s*quả|ket\s*qua|trả\s*lời|tra\s*loi)\s*[:：]\s*([^\n]+)/im
  );
  let stem = full;
  let correctRaw = null;
  let explanation = '';
  let hint = '';
  let answerPlaceholder = '';
  if (daMatch) {
    correctRaw = daMatch[1].trim();
    stem = full.slice(0, daMatch.index).trim();
    const afterDa = full.slice(daMatch.index + daMatch[0].length).trim();
    const afterLines = afterDa.split('\n');
    const meta = parsePracticeMetaAfterAnswer(afterLines);
    answerPlaceholder = meta.answerPlaceholder;
    hint = meta.hint;
    explanation = meta.explanation;
  }

  const stemLines = stem.split('\n');
  const cleanedStemLines = stemLines
    .map((l) => {
      const t = String(l ?? '');
      if (/^\s*§/.test(t)) return t.replace(/^\s*§+\s*/, '');
      return t;
    })
    .filter((l) => String(l ?? '').trim().length > 0);
  const options = [];
  for (const l of cleanedStemLines) {
    const m = l.match(/^([A-D])[\.\)]\s*(.+)$/i);
    if (m) options.push(m[2].trim());
  }

  const questionLines = cleanedStemLines.filter(
    (l) => {
      const t = l.trim();
      return (
        !/^[A-D][\.\)]\s*\S/i.test(t) &&
        !/^(?:ID|Id|id)\s*[:：]/.test(t) &&
        !/^\[(đúng\s*sai|sắp\s*xếp|kéo\s*thả|điền\s*chỗ\s*trống|điền)\]/i.test(t) &&
        !/^loại\s*[:：]/i.test(t) &&
        !/^(?:đoạn|doan)\s*[:：]/i.test(t) &&
        !/^(?:Ô|O|Slot)\s*\d+\s*[:：\-]/i.test(t) &&
        !/^(?:Lựa\s*chọn|Lua\s*chon|Choices?)\s*[:：\-]/i.test(t) &&
        !/^(?:\d+[\.\)]|[-•*])\s+/.test(t)
      );
    }
  );
  const question = questionLines.join('\n').trim() || cleanedStemLines.join('\n').trim() || stem;

  const explicitType = detectPracticeBlockType(full);

  if (explicitType === 'true_false' && correctRaw) {
    const tf = /^(sai|false|0|s)$/i.test(correctRaw.trim())
      ? false
      : /^(đúng|dung|true|1|d)$/i.test(correctRaw.trim())
        ? true
        : true;
    return { id, type: 'true_false', question, correctAnswer: tf, hint, explanation };
  }

  if (explicitType === 'ordering') {
    const items = parseOrderingItemsFromStem(cleanedStemLines.filter((l) => !/^(?:ID|Id|id)\s*[:：]/.test(l)));
    const orderRaw = correctRaw || items.map((_, i) => i + 1).join(',');
    const nums = orderRaw.split(/[,;|]/g).map((x) => Number(x.trim()) - 1);
    const correctOrder =
      nums.length === items.length && nums.every((n) => Number.isFinite(n) && n >= 0 && n < items.length)
        ? nums
        : items.map((_, i) => i);
    return { id, type: 'ordering', question, items, correctOrder, hint, explanation };
  }

  if (explicitType === 'drag_drop') {
    const { slots, choices } = parseDragDropFromStem(cleanedStemLines);
    const correctAnswer = parseDragDropCorrect(correctRaw, slots);
    return { id, type: 'drag_drop', question, slots, choices, correctAnswer, hint, explanation };
  }

  if (explicitType === 'fill_blanks') {
    const passageLine = cleanedStemLines.find((l) => /^(?:đoạn|doan)\s*[:：\-]/i.test(String(l).trim()));
    let passage = passageLine
      ? String(passageLine).replace(/^(?:đoạn|doan)\s*[:：\-]\s*/i, '').trim()
      : '';
    if (!passage) {
      const withBlanks = questionLines.find((l) => /\{\{\d+\}\}|___\d+___/.test(l));
      passage = withBlanks ? withBlanks.trim() : question;
    }
    const intro = passageLine
      ? questionLines
          .filter((l) => !/^(?:đoạn|doan)\s*[:：\-]/i.test(l.trim()) && !/\{\{\d+\}\}|___\d+___/.test(l))
          .join('\n')
          .trim()
      : questionLines
          .filter((l) => !/\{\{\d+\}\}|___\d+___/.test(l))
          .join('\n')
          .trim();
    const blanks = parseFillBlanksCorrectRaw(correctRaw);
    return {
      id,
      type: 'fill_blanks',
      question: intro && intro !== passage ? intro : '',
      passage,
      blanks,
      hint,
      explanation,
    };
  }

  if (options.length >= 2 && correctRaw) {
    const letter = correctRaw.match(/^([A-D])/i);
    const idxAns = letter ? letter[1].toUpperCase().charCodeAt(0) - 65 : -1;
    if (idxAns >= 0 && idxAns < options.length) {
      return { id, type: 'mcq', question, options, correctAnswer: idxAns, hint, explanation };
    }
  }

  if (correctRaw && options.length === 0) {
    return { id, type: 'input', question, correctAnswer: correctRaw, answerPlaceholder, hint, explanation };
  }

  return { id, type: 'text', question: full, explanation: '' };
}

export function parsePracticeLines(practiceLines) {
  const lines = (practiceLines || []).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const blocks = splitPracticeBlocks(lines);
  const out = [];
  blocks.forEach((bl, i) => {
    const p = parsePracticeBlock(bl, i);
    if (p) out.push(p);
  });
  return out;
}

function splitKeywordsCsv(s) {
  return String(s || '')
    .split(/[,;|]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function parseLessonsFromText(rawText) {
  let lines = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^\s*\/\//.test(l));

  const meta = {};

  while (lines.length > 0) {
    const m = lines[0].match(/^@(\w+)\s*:\s*(.*)$/i);
    if (!m) break;
    const key = m[1].toLowerCase();
    const value = (m[2] ?? '').trim();
    meta[key] = value;
    lines.shift();
  }

  consumeVietnameseMetaLines(lines, meta);
  scoopLeadingStandalonePdfUrl(lines, meta);
  normalizeLessonImportMeta(meta);

  const { theory, examples: examplesLines, practice, pdfSection, hasTheoryHeader, hasExamplesHeader } = splitLessonBodySections(lines);
  extractPdfUrlFromSection(pdfSection, meta);
  normalizeLessonImportMeta(meta);

  // Nội dung "Các dạng toán & ví dụ" ưu tiên lấy từ section rõ ràng.
  const examples_core = (examplesLines || []).join('\n').trim();
  const theoryJoined = (theory || []).join('\n').trim();

  // Giữ tương thích parser cũ: nếu KHÔNG có tiêu đề mục rõ ràng, thử parse dạng cũ từ phần theory.
  // Nếu có tiêu đề "LÝ THUYẾT ..." rõ ràng thì ưu tiên coi khối đó là theory_core (đúng như ý người soạn).
  let examples = examples_core ? [] : !hasTheoryHeader && !hasExamplesHeader ? parseTheoryExamples(theory) : [];
  const practiceItems = parsePracticeLines(practice);

  const title = (meta.title || '').trim() || 'Bài Giảng Tổng Hợp';

  let theory_core = (meta.theory_core || meta.ly_thuyet || '').toString().trim();

  // Nếu người soạn có tiêu đề "LÝ THUYẾT ..." rõ ràng nhưng không có @theory_core,
  // mặc định lấy toàn bộ khối đó làm theory_core.
  // Chỉ làm việc này khi KHÔNG có section ví dụ riêng; nếu có, đoạn merge phía dưới sẽ xử lý.
  if (hasTheoryHeader && theoryJoined && !theory_core && !examples_core) {
    theory_core = theoryJoined;
  }

  // Khi có tiêu đề "LÝ THUYẾT TRỌNG TÂM" + mục "CÁC DẠNG TOÁN & VÍ DỤ" tách riêng:
  // toàn bộ khối lý thuyết phải vào theory_core (trước đây bị bỏ qua → mất trên web).
  if (examples_core && theoryJoined) {
    theory_core = theory_core ? `${theory_core}\n\n${theoryJoined}` : theoryJoined;
  }

  /** Khối “Nội dung” chỉ có đoạn mở (desc), không có Câu/Ví dụ cấu trúc → đưa lên Lý thuyết trọng tâm. */
  if (!examples_core && examples.length > 0) {
    const first = examples[0];
    const t = (first?.title || '').toString().trim();
    const items = Array.isArray(first?.items) ? first.items : [];
    const hasStructuredItems = items.some((it) => (it?.q || '').toString().trim() || (it?.steps || []).length > 0);
    if (t === 'Nội dung' && !hasStructuredItems) {
      const pre = (first.desc || '').toString().trim();
      if (pre) theory_core = theory_core ? `${theory_core}\n\n${pre}` : pre;
      examples = examples.slice(1);
    }
  }

  const seo = {
    focus_keyword: String(meta.focus_keyword || '').trim(),
    keywords: splitKeywordsCsv(meta.keywords),
  };

  const examples_core_fallback = examples_core ? examples_core : examplesArrayToCoreText(examples);
  return { meta, title, examples_core: examples_core_fallback, examples, practice: practiceItems, theory_core, seo };
}

/** Chuẩn hóa meta sau khi đọc @ (alias → tên nội bộ). */
export function normalizeLessonImportMeta(meta) {
  if (!meta || typeof meta !== 'object') return;
  if (meta.lesson && !meta.lesson_no) meta.lesson_no = meta.lesson;
  if (meta.grade && !meta.grade_level) meta.grade_level = meta.grade;
  if (meta.ly_thuyet_trong_tam && !meta.theory_core) meta.theory_core = meta.ly_thuyet_trong_tam;

  if (!meta.video_url) {
    meta.video_url = [meta.youtube, meta.youtubelink, meta.videourl, meta.video].find((v) => v && String(v).trim()) || '';
  }
  if (!meta.video_material_url) {
    meta.video_material_url =
      [meta.video_tai_lieu, meta.document_video_url, meta.material_video, meta.video_tailieu].find(
        (v) => v && String(v).trim()
      ) || '';
  }
  if (!meta.pdf_url) {
    meta.pdf_url = [meta.pdf, meta.tai_lieu_pdf, meta.link_pdf].find((v) => v && String(v).trim()) || '';
  }
  if (!meta.seo_description) {
    meta.seo_description =
      [meta.meta_description, meta.description_short, meta.mo_ta_seo, meta.og_description].find(
        (v) => v && String(v).trim()
      ) || '';
  }
  if (!meta.focus_keyword) {
    meta.focus_keyword =
      [meta.tu_khoa_chinh, meta.primary_keyword, meta.main_keyword, meta.focus_key].find((v) => v && String(v).trim()) ||
      '';
  }
  if (!meta.keywords) {
    meta.keywords =
      [meta.seo_keywords, meta.tu_khoa_phu, meta.keyword_list, meta.secondary_keywords].find(
        (v) => v && String(v).trim()
      ) || '';
  }
}

/** Lấy các trường form admin / Firestore từ meta đã normalize. */
export function lessonFieldsFromImportMeta(meta) {
  if (!meta || typeof meta !== 'object') return {};
  const ch = (meta.chapter || '').toString().trim();
  const ln = (meta.lesson_no || meta.lesson || '').toString().trim();
  const stripChapterLessonLabel = (s) => {
    let x = String(s || '').trim();
    if (/^chương\s*/i.test(x)) x = x.replace(/^chương\s*/i, '').trim();
    if (/^bài\s*/i.test(x)) x = x.replace(/^bài\s*/i, '').trim();
    const m = x.match(/^(\d{1,2})\b/);
    if (m) return m[1];
    return x;
  };
  return {
    grade_level: (meta.grade_level || meta.grade || '').toString().trim(),
    chapter: stripChapterLessonLabel(ch) || ch,
    lesson_no: stripChapterLessonLabel(ln) || ln,
    title: (meta.title || '').toString().trim(),
    videoUrl: (meta.video_url || '').toString().trim(),
    videoMaterialUrl: (meta.video_material_url || '').toString().trim(),
    pdfUrl: (meta.pdf_url || '').toString().trim(),
    description: (meta.seo_description || '').toString().trim(),
  };
}
