/* eslint-disable */

import { parseFillBlanksCorrectRaw, extractPracticeKeyAnswerFromText } from './practiceQuestionTypes';
import { parseLessonSummaryImportText } from './lessonMindMap';

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
 * - Tiêu đề: TÓM TẮT BÀI HỌC / TÓM TẮT BÀI GIẢNG → sơ đồ tóm tắt (TITLE:/ROOT:/danh sách thụt đầu dòng) → content.mindMap.
 * - Tiêu đề: TÀI LIỆU PDF / LINK PDF → dòng URL kế tiếp (hoặc cùng dòng sau :) → @pdf_url nếu chưa có.
 *
 * Bài tập (MCQ): Câu 1: ... / A–D (mỗi dòng hoặc cả 4 cùng một hàng) / Đáp án: B  hoặc  Lời giải → "Chọn B"  hoặc phương án đúng gạch chân (__A.__ / Word underline).
 * Bài tập (nhập đáp án): có Đáp án: nhưng không có A/B/C/D → type input.
 * Bài tập đúng/sai nhóm: a) … b) … + Lời giải dạng "a) Đúng: …" / "b) Sai: …" → true_false_group.
 * Không còn dạng tự luận (text) — mọi câu cần Đáp án / Chọn A–D / gạch chân / [đúng sai] / [sắp xếp] / [kéo thả] / [điền chỗ trống].
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

const SUMMARY_HEADER =
  /^(TÓM\s*TẮT\s*BÀI\s*HỌC|TÓM\s*TẮT\s*BÀI\s*GIẢNG|SƠ\s*ĐỒ\s*TÓM\s*TẮT|SƠ\s*ĐỒ\s*TƯ\s*DUY)(\s*[:：]?\s*.*)?$/i;

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
    const L = String(lines[0] || '').trim();
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
    const L = String(lines[0] || '').trim();
    if (meta.pdf_url && String(meta.pdf_url).trim()) break;
    if (/^https?:\/\/\S+$/i.test(L)) {
      const u = L;
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
  let hasSummaryHeader = false;
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
    if (SUMMARY_HEADER.test(L)) {
      hits.push({ k: 's', i });
      hasSummaryHeader = true;
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
  const summary = [];
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
      else if (kind === 's') mode = 'summary';
      else if (kind === 'd') mode = 'pdf';
      continue;
    }
    if (mode === 'theory') theory.push(lines[idx]);
    else if (mode === 'examples') examples.push(lines[idx]);
    else if (mode === 'practice') practice.push(lines[idx]);
    else if (mode === 'summary') summary.push(lines[idx]);
    else pdfSection.push(lines[idx]);
  }

  return {
    theory,
    examples,
    practice,
    summary,
    pdfSection,
    hasTheoryHeader,
    hasExamplesHeader,
    hasPracticeHeader,
    hasSummaryHeader,
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
    if (line.match(/^((?:Dạng|Dang)\s*\d*|Ví\s*dụ(?:\s*\d+(?:\.\d+)*)?|Bài\s*mới)\s*[:.\-—]?\s*(.*)$/i)) {
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
    } else if (line.match(/^(Hướng dẫn|Lời giải|Giải)\s*[:.\-—]?\s*(.*)$/i)) {
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

const PRACTICE_QUESTION_START = /^Câu\s*\d+\s*[:：\.]/i;

function splitPracticeBlocks(lines) {
  const blocks = [];
  let cur = [];
  for (const line of lines) {
    const t = String(line || '').trim();
    const isSeparator = /^(-{3,}|={3,}|\*{3,})$/.test(t);
    const isNewQ = /^§/.test(t) || PRACTICE_QUESTION_START.test(t);
    const isMetaOnlyCur =
      cur.length > 0 && cur.every((x) => /^(?:ID|Id|id)\s*[:：]/.test(String(x || '').trim()));

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
/** "Lời giải" / "Lời giải:" / "Lời giải Chọn B" — Word thường bỏ dấu : */
const PRACTICE_EXPL_LINE_RE =
  /^(lời\s*giải|loi\s*giai|giải\s*thích|giai\s*thich|hướng\s*dẫn\s*giải|huong\s*dan\s*giai)(?:\s*[:：\-–—\.]\s*|\s+)(.*)$/i;
const PRACTICE_EXPL_BARE_RE =
  /^(lời\s*giải|loi\s*giai|giải\s*thích|giai\s*thich)$/i;
const PRACTICE_CHOOSE_ANS_RE = /(?:^|\n)\s*chọn\s*([A-D])\b/i;

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
    if (PRACTICE_EXPL_BARE_RE.test(t)) {
      mode = 'explanation';
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
  if (
    /\[đúng\s*sai\s*(nhóm|a[\-–—]?d|a\s*[-–—]\s*d)\]|loại\s*[:：]\s*đúng\s*sai\s*(nhóm|a[\-–—]?d)/.test(s) ||
    /true\s*false\s*group/.test(s)
  ) {
    return 'true_false_group';
  }
  if (/\[đúng\s*sai\]|loại\s*[:：]\s*đúng\s*sai|true\s*false/.test(s)) return 'true_false';
  if (/\[sắp\s*xếp\]|loại\s*[:：]\s*sắp\s*xếp|ordering/.test(s)) return 'ordering';
  if (/\[kéo\s*thả\]|loại\s*[:：]\s*kéo\s*thả|drag\s*drop/.test(s)) return 'drag_drop';
  if (/\[điền\s*chỗ\s*trống\]|\[điền\]|\[cloze\]|loại\s*[:：]\s*điền\s*chỗ\s*trống|fill\s*blank/.test(s))
    return 'fill_blanks';
  return null;
}

function optionIndexByLetter(letter) {
  return { A: 0, B: 1, C: 2, D: 3 }[String(letter || '').toUpperCase()] ?? null;
}

function parseBoolishPractice(s) {
  const t = String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (/^(dung|true|t|yes|1|co|d)$/.test(t)) return true;
  if (/^(sai|false|f|no|0|khong|ko|s)$/.test(t)) return false;
  return null;
}

/**
 * Vị trí nhãn A–D trên một dòng (mỗi phương án 1 dòng hoặc cả 4 cùng hàng).
 * Nhận gạch chân Word: __C.__ / __C__. / __C.__
 */
function findMcqOptionStarts(line) {
  const s = String(line ?? '');
  const starts = [];
  // Sau đầu dòng / khoảng trắng / kết thúc công thức $ ) ] }
  const re =
    /(?:^|(?<=[\s\t])|(?<=[\$\)\]\}]))(?:__\s*([A-D])\s*[\.\)]\s*__|__\s*([A-D])\s*__\s*[\.\)]|__\s*([A-D])\s*[\.\)]|([A-D])\s*[\.\)])/gi;
  let m;
  while ((m = re.exec(s)) !== null) {
    const letter = String(m[1] || m[2] || m[3] || m[4] || '').toUpperCase();
    if (!letter) continue;
    const underlined = Boolean(m[1] || m[2] || m[3]);
    starts.push({
      index: m.index,
      endLabel: m.index + m[0].length,
      letter,
      underlined,
    });
  }
  return starts;
}

/** Tách mọi phương án A–D trên một dòng (hỗ trợ 4 đáp án cùng hàng). */
function extractMcqOptionsFromLine(line) {
  const s = String(line ?? '');
  const starts = findMcqOptionStarts(s);
  if (!starts.length) return [];

  const out = [];
  for (let i = 0; i < starts.length; i += 1) {
    const cur = starts[i];
    const nextStart = i + 1 < starts.length ? starts[i + 1].index : s.length;
    let text = s.slice(cur.endLabel, nextStart).trim();
    text = text.replace(/^__\s*/, '').replace(/\s*__$/, '').trim();
    out.push({
      letter: cur.letter,
      text,
      underlined: cur.underlined,
      index: optionIndexByLetter(cur.letter),
    });
  }
  return out;
}

/** Dòng chỉ gồm phương án A–D (1 dòng hoặc cả hàng A–D). */
function isMcqOptionsLine(line) {
  const t = String(line ?? '').trim();
  if (!t) return false;
  const starts = findMcqOptionStarts(t);
  if (!starts.length) return false;
  return starts[0].index === 0;
}

/** Dòng phương án A–D đơn (tương thích cũ); nhận gạch chân (__A.__ / __A. nội dung__). */
function parseMcqOptionLine(line) {
  const opts = extractMcqOptionsFromLine(line);
  if (opts.length === 1 && isMcqOptionsLine(line)) return opts[0];
  // Nhiều phương án trên 1 dòng → không coi là “một” option line (dùng extractMcqOptionsFromLine)
  if (opts.length > 1 && isMcqOptionsLine(line)) return opts[0];
  return null;
}

function detectChooseLetter(text) {
  const m = String(text || '').match(PRACTICE_CHOOSE_ANS_RE);
  if (!m) return null;
  return optionIndexByLetter(m[1]);
}

function isLikelyTfAnswerOnlyRest(rest) {
  const r = String(rest || '').trim();
  if (!r) return true;
  const first = r.split(/[\s,:：\-–—]+/)[0] || '';
  return parseBoolishPractice(first) !== null;
}

/** Tách mệnh đề a–d từ đề + đáp án a) Đúng: / Sai: trong lời giải. */
function parsePracticeTfGroup(cleanedStemLines, explanationText, correctRaw) {
  const items = [];
  const byKey = {};
  const stemKeep = [];

  for (const l of cleanedStemLines) {
    const t = String(l ?? '').trim();
    if (/^\[(đúng\s*sai|đúng\s*sai\s*(nhóm|a[\-–—]?d))\]/i.test(t) || /^loại\s*[:：]/i.test(t)) continue;
    const m = t.match(/^([a-d])\s*[\).:\-]\s*(.*)$/i);
    if (m) {
      const key = m[1].toLowerCase();
      const rest = (m[2] || '').trim();
      if (isLikelyTfAnswerOnlyRest(rest) && !byKey[key]) {
        const first = rest.split(/[\s,:：\-–—]+/)[0] || '';
        const b = parseBoolishPractice(first);
        if (b !== null) byKey[key] = { key, text: '', correct: b };
        continue;
      }
      if (!byKey[key] || !(byKey[key].text || '').trim()) {
        byKey[key] = { key, text: rest, correct: byKey[key]?.correct ?? null };
        items.push(byKey[key]);
      }
      continue;
    }
    stemKeep.push(l);
  }

  const expl = String(explanationText || '');
  const explLines = expl.split('\n');
  const explKeep = [];
  for (const ln of explLines) {
    const t = String(ln ?? '').trim();
    const m = t.match(/^([a-d])\s*[\).:\-]\s*(.*)$/i);
    if (m) {
      const key = m[1].toLowerCase();
      const rest = (m[2] || '').trim();
      const firstTok = rest.split(/[\s,:：\-–—]+/)[0] || '';
      const b = parseBoolishPractice(firstTok);
      if (b !== null) {
        if (!byKey[key]) {
          byKey[key] = { key, text: '', correct: b };
          items.push(byKey[key]);
        } else {
          byKey[key].correct = b;
        }
        explKeep.push(ln);
        continue;
      }
    }
    explKeep.push(ln);
  }

  // Đáp án: a Đ; b S; c Đ; d S
  if (correctRaw) {
    const pairs = String(correctRaw)
      .replace(/[，]/g, ',')
      .replace(/\b([a-d])\s*[\).]/gi, '$1:')
      .split(/[;|]/g)
      .map((x) => x.trim())
      .filter(Boolean);
    for (const part of pairs) {
      const m = part.match(/^([a-d])\s*[:\-]\s*(.+)$/i) || part.match(/^([a-d])\s+(.+)$/i);
      if (!m) continue;
      const key = m[1].toLowerCase();
      const b = parseBoolishPractice((m[2] || '').trim().split(/\s+/)[0]);
      if (b === null) continue;
      if (!byKey[key]) {
        byKey[key] = { key, text: '', correct: b };
        items.push(byKey[key]);
      } else byKey[key].correct = b;
    }
  }

  const tfItems = items
    .filter((it) => it && ((it.text || '').trim() || typeof it.correct === 'boolean'))
    .map((it) => ({
      key: it.key,
      text: (it.text || '').trim(),
      correct: typeof it.correct === 'boolean' ? it.correct : true,
    }))
    .sort((a, b) => String(a.key).localeCompare(String(b.key), 'en'));

  return {
    question: stemKeep.join('\n').trim(),
    tfItems,
    explanation: explKeep.join('\n').replace(/\n{3,}/g, '\n\n').trim() || expl.trim(),
  };
}

function splitPracticeBlockParts(full) {
  const lines = String(full || '').split('\n');
  const stemLines = [];
  const afterLines = [];
  let mode = 'stem';
  let correctRaw = null;

  for (const ln of lines) {
    const t = String(ln ?? '').trim();
    if (mode === 'stem') {
      const da = t.match(
        /^(?:đáp\s*án|dap\s*an|đáp\s*số|dap\s*so|kết\s*quả|ket\s*qua|trả\s*lời|tra\s*loi)\s*[:：]\s*(.+)$/i
      );
      if (da) {
        correctRaw = (da[1] || '').trim();
        mode = 'after';
        continue;
      }
      if (PRACTICE_HINT_LINE_RE.test(t) || PRACTICE_EXPL_BARE_RE.test(t) || PRACTICE_EXPL_LINE_RE.test(t)) {
        mode = 'after';
        afterLines.push(ln);
        continue;
      }
      // "Chọn B" đứng riêng (thường dưới Lời giải) — coi như phần sau đề
      if (
        /^chọn\s*[A-D]\b/i.test(t) &&
        stemLines.some((x) => extractMcqOptionsFromLine(x).length >= 2 || parseMcqOptionLine(x))
      ) {
        mode = 'after';
        afterLines.push(ln);
        continue;
      }
      stemLines.push(ln);
    } else {
      afterLines.push(ln);
    }
  }

  const meta = parsePracticeMetaAfterAnswer(afterLines);
  // Nếu "Chọn B" nằm trong explanation / afterLines mà chưa có Đáp án
  if (!correctRaw) {
    const chooseIdx = detectChooseLetter(afterLines.join('\n')) ?? detectChooseLetter(meta.explanation);
    if (chooseIdx != null) correctRaw = String.fromCharCode(65 + chooseIdx);
  }
  // "Lời giải" đứng trước "Đáp án: -1" → đáp án nằm trong afterLines/explanation
  if (!correctRaw) {
    const fromAfter =
      extractPracticeKeyAnswerFromText(afterLines.join('\n')) ||
      extractPracticeKeyAnswerFromText(meta.explanation);
    if (fromAfter) correctRaw = fromAfter;
  }
  return {
    stem: stemLines.join('\n').trim(),
    correctRaw,
    answerPlaceholder: meta.answerPlaceholder,
    hint: meta.hint,
    explanation: meta.explanation,
  };
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

  // ID từ số thứ tự "Câu N" — giữ thứ tự import, không cần dòng ID: riêng
  const qNumMatch = full.match(/^Câu\s*(\d+)\s*[:：\.]/im);
  const id = qNumMatch ? `q_${qNumMatch[1]}` : `q_${blockIndex + 1}`;

  const parts = splitPracticeBlockParts(full);
  let correctRaw = parts.correctRaw;
  let explanation = parts.explanation;
  let hint = parts.hint;
  let answerPlaceholder = parts.answerPlaceholder;
  let stem = parts.stem || full;

  // Fallback: Chọn A–D ở bất kỳ đâu trong khối (kể cả trước khi tách)
  if (!correctRaw) {
    const chooseIdx = detectChooseLetter(full);
    if (chooseIdx != null) correctRaw = String.fromCharCode(65 + chooseIdx);
  }

  const stemLines = stem.split('\n');
  let strippedQuestionPrefix = false;
  const cleanedStemLines = stemLines
    .map((l) => {
      let t = String(l ?? '');
      if (/^\s*§/.test(t)) t = t.replace(/^\s*§+\s*/, '');
      if (!strippedQuestionPrefix && /^Câu\s*\d+[a-z]?\s*[:：\.]/i.test(t.trim())) {
        strippedQuestionPrefix = true;
        t = t.replace(/^(\s*)Câu\s*\d+[a-z]?\s*[:：\.]\s*/i, '$1');
      }
      return t;
    })
    .filter((l) => {
      const t = String(l ?? '').trim();
      return t.length > 0 && !/^(?:ID|Id|id)\s*[:：]/.test(t);
    });

  const parsedOpts = [];
  let underlinedAns = -1;
  for (const l of cleanedStemLines) {
    const opts = extractMcqOptionsFromLine(l);
    // Chỉ lấy khi dòng là hàng phương án (bắt đầu bằng A–D), tránh dính chữ trong đề
    if (!opts.length || !isMcqOptionsLine(l)) continue;
    for (const opt of opts) {
      if (!opt || opt.index == null) continue;
      while (parsedOpts.length <= opt.index) parsedOpts.push('');
      parsedOpts[opt.index] = opt.text;
      if (opt.underlined) underlinedAns = opt.index;
    }
  }
  // Thu thập phương án A→D theo thứ tự chữ cái đã xuất hiện
  const mcqOptions = [];
  for (let i = 0; i < 4; i += 1) {
    if (typeof parsedOpts[i] === 'string') mcqOptions.push(parsedOpts[i]);
  }

  const questionLines = cleanedStemLines.filter((l) => {
    const t = l.trim();
    return (
      !isMcqOptionsLine(t) &&
      !/^(?:ID|Id|id)\s*[:：]/.test(t) &&
      !/^\[(đúng\s*sai|đúng\s*sai\s*(nhóm|a[\-–—]?d)|sắp\s*xếp|kéo\s*thả|điền\s*chỗ\s*trống|điền)\]/i.test(t) &&
      !/^loại\s*[:：]/i.test(t) &&
      !/^(?:đoạn|doan)\s*[:：]/i.test(t) &&
      !/^(?:Ô|O|Slot)\s*\d+\s*[:：\-]/i.test(t) &&
      !/^(?:Lựa\s*chọn|Lua\s*chon|Choices?)\s*[:：\-]/i.test(t) &&
      !/^(?:\d+[\.\)]|[-•*])\s+/.test(t) &&
      !/^([a-d])\s*[\).:\-]\s*/i.test(t)
    );
  });
  const question = questionLines.join('\n').trim() || cleanedStemLines.join('\n').trim() || stem;

  const explicitType = detectPracticeBlockType(full);

  // Đúng/sai nhóm a–d (ảnh 3: a) Đúng: … / b) Sai: …)
  const tfProbe = parsePracticeTfGroup(cleanedStemLines, explanation, correctRaw);
  const looksLikeTfGroup =
    explicitType === 'true_false_group' ||
    (mcqOptions.length < 2 &&
      tfProbe.tfItems.length >= 2 &&
      (explicitType === 'true_false' ||
        /(?:^|\n)\s*[a-d]\s*[\).:\-]\s*(đúng|sai)\b/i.test(`${explanation}\n${correctRaw || ''}`) ||
        (tfProbe.tfItems.filter((it) => (it.text || '').trim()).length >= 2 &&
          tfProbe.tfItems.some((it) => typeof it.correct === 'boolean'))));

  if (looksLikeTfGroup && tfProbe.tfItems.length >= 2) {
    const qTf = (tfProbe.question || questionLines.join('\n').trim() || question)
      .replace(/^\[(đúng\s*sai(?:\s*(?:nhóm|a[\-–—]?d))?)\]\s*/i, '')
      .trim();
    return {
      id,
      type: 'true_false_group',
      question: qTf,
      tfItems: tfProbe.tfItems,
      hint,
      explanation: tfProbe.explanation || explanation,
    };
  }

  if (explicitType === 'true_false' && (correctRaw || explanation)) {
    let tfRaw = correctRaw;
    if (!tfRaw) {
      const m = String(explanation || '').match(/\b(đúng|sai|true|false)\b/i);
      if (m) tfRaw = m[1];
    }
    const tf = /^(sai|false|0|s)$/i.test(String(tfRaw || '').trim())
      ? false
      : /^(đúng|dung|true|1|d)$/i.test(String(tfRaw || '').trim())
        ? true
        : true;
    return {
      id,
      type: 'true_false',
      question: questionLines.join('\n').trim() || question,
      correctAnswer: tf,
      hint,
      explanation,
    };
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

  if (mcqOptions.length >= 2) {
    let idxAns = -1;
    if (correctRaw) {
      const letter = String(correctRaw).match(/^([A-D])/i);
      idxAns = letter ? letter[1].toUpperCase().charCodeAt(0) - 65 : -1;
    }
    if (idxAns < 0 && underlinedAns >= 0) idxAns = underlinedAns;
    if (idxAns < 0) {
      const chooseIdx = detectChooseLetter(explanation) ?? detectChooseLetter(full);
      if (chooseIdx != null) idxAns = chooseIdx;
    }
    if (idxAns >= 0 && idxAns < mcqOptions.length) {
      // Strip underline markers leftover in option texts
      const cleanOpts = mcqOptions.map((o) =>
        String(o || '')
          .replace(/^__|__$/g, '')
          .trim()
      );
      return {
        id,
        type: 'mcq',
        question: questionLines.join('\n').trim() || question,
        options: cleanOpts,
        correctAnswer: idxAns,
        hint,
        explanation,
      };
    }
  }

  if (correctRaw && mcqOptions.length === 0) {
    return { id, type: 'input', question, correctAnswer: correctRaw, answerPlaceholder, hint, explanation };
  }

  // Không còn type "text" (tự luận): fallback → nhập đáp án (admin/AI nên bổ sung dòng Đáp án:)
  let qOnly = (question || stem || full).trim();
  let expl = explanation;
  if (!expl) {
    const lg = full.match(/(?:^|\n)(?:lời\s*giải|loi\s*giai)\s*[:：]?\s*([\s\S]*)$/i);
    if (lg) {
      expl = String(lg[1] || '').trim();
      qOnly = full
        .slice(0, lg.index)
        .replace(/^Câu\s*\d+\s*[:：.]?\s*/i, '')
        .trim() || qOnly;
    }
  }
  const recovered =
    extractPracticeKeyAnswerFromText(expl) ||
    extractPracticeKeyAnswerFromText(full) ||
    '';
  return {
    id,
    type: 'input',
    question: qOnly,
    correctAnswer: recovered,
    answerPlaceholder,
    hint,
    explanation: expl,
  };
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

/**
 * Import riêng phần bài tập luyện tập (TXT/Word đã trích text).
 * - Có tiêu đề «Bài tập tự luyện» → lấy khối đó
 * - Không có tiêu đề → lấy từ dòng «Câu N» đầu tiên đến hết (sau meta)
 */
export function parsePracticeImportText(rawText) {
  const parsed = parseLessonsFromText(rawText);
  if (Array.isArray(parsed.practice) && parsed.practice.length > 0) {
    return parsed.practice;
  }

  let lines = String(rawText || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => String(l || '').replace(/\s+$/u, ''))
    .filter((l) => {
      const t = l.trim();
      return t.length > 0 && !/^\/\//.test(t);
    });

  const meta = {};
  while (lines.length > 0) {
    const m = String(lines[0] || '')
      .trim()
      .match(/^@(\w+)\s*:\s*(.*)$/i);
    if (!m) break;
    meta[m[1].toLowerCase()] = (m[2] ?? '').trim();
    lines.shift();
  }
  consumeVietnameseMetaLines(lines, meta);
  scoopLeadingStandalonePdfUrl(lines, meta);

  const { theory, examples, practice } = splitLessonBodySections(lines);
  let practiceLines = practice;
  if (!practiceLines.length) {
    const all = [...theory, ...examples];
    const startIdx = all.findIndex((l) => {
      const t = String(l || '').trim();
      return (
        /^Câu\s*\d+/i.test(t) ||
        /^\s*§/.test(t) ||
        /^(?:ID|Id|id)\s*[:：]/.test(t) ||
        /^\[(đúng\s*sai|sắp\s*xếp|kéo\s*thả|điền)/i.test(t)
      );
    });
    practiceLines = startIdx >= 0 ? all.slice(startIdx) : all;
  }
  return parsePracticeLines(practiceLines);
}

function splitKeywordsCsv(s) {
  return String(s || '')
    .split(/[,;|]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function parseLessonsFromText(rawText) {
  // Giữ thụt đầu dòng (cần cho mục Tóm tắt bài học); chỉ bỏ khoảng trắng cuối dòng.
  let lines = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => String(l || '').replace(/\s+$/u, ''))
    .filter((l) => {
      const t = l.trim();
      return t.length > 0 && !/^\/\//.test(t);
    });

  const meta = {};

  while (lines.length > 0) {
    const m = String(lines[0] || '')
      .trim()
      .match(/^@(\w+)\s*:\s*(.*)$/i);
    if (!m) break;
    const key = m[1].toLowerCase();
    const value = (m[2] ?? '').trim();
    meta[key] = value;
    lines.shift();
  }

  consumeVietnameseMetaLines(lines, meta);
  scoopLeadingStandalonePdfUrl(lines, meta);
  normalizeLessonImportMeta(meta);

  const {
    theory,
    examples: examplesLines,
    practice,
    summary: summaryLines,
    pdfSection,
    hasTheoryHeader,
    hasExamplesHeader,
  } = splitLessonBodySections(lines);
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

  let mindMap = undefined;
  const summaryRaw = (summaryLines || []).join('\n').trim();
  if (summaryRaw) {
    const parsedSummary = parseLessonSummaryImportText(summaryRaw);
    if (parsedSummary?.summaryRoot?.text) {
      mindMap = {
        enabled: true,
        mode: 'tree',
        imageUrl: '',
        summaryTitle: parsedSummary.summaryTitle || '',
        summaryRoot: parsedSummary.summaryRoot,
        sharedMindMapImageUrl: null,
        logicTrees: [],
      };
    }
  }

  const examples_core_fallback = examples_core ? examples_core : examplesArrayToCoreText(examples);
  const out = { meta, title, examples_core: examples_core_fallback, examples, practice: practiceItems, theory_core, seo };
  if (mindMap) out.mindMap = mindMap;
  return out;
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
