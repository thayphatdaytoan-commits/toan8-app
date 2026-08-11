/* eslint-disable */

import math11KnowledgeRaw from './assets/math11-knowledge.txt?raw';
import mathCurriculumGdpt2018Raw from './assets/math-curriculum-gdpt2018.txt?raw';
import {
  parseMathKnowledgeTxt,
  parseMathKnowledgeTxtForGrade,
  normalizeKnowledgeTopicKey,
} from './knowledgeTags';

/**
 * Import đề thi từ TXT/DOCX (text).
 *
 * Meta (đầu file):
 *   @grade_level: 11  @chapter: 1  @lesson_no: 1  @title: ...
 *   @duration: 15  @exam_type: lesson|midterm|...
 *   @category: dang1
 *
 * Hoặc dòng tiếng Việt (sau khối @):
 *   Chương: 1  |  Bài: 2  |  Tiêu đề: Đề giữa kỳ  |  Tên đề: ...
 *
 * Dạng toán (kiến thức CT): một dòng `Dạng toán: ...` — nếu nhiều tag thì chỉ tách bằng `;` hoặc `|`
 * (không tách theo dấu phẩy, vì tên kiến thức chính thức có dấu phẩy trong nội dung).
 *
 * Định dạng câu hỏi — chọn một:
 *
 * (A) Cổ điển:
 *   Câu 1: ... (có thể chèn ảnh; trong đề được phép có dòng a) b) c) chữ thường — không dùng làm phương án)
 *   Câu 1: [Mức độ 1] ...  → Nhận biết | [Mức độ 2] Thông hiểu | [Mức độ 3] Vận dụng | [Mức độ 4] Vận dụng cao
 *   Phương án trắc nghiệm phải bắt đầu bằng chữ HOA: A. / B. / C. / D. (không dùng a. cho TN)
 *   A. ... B. ... C. ... D. ...
 *   Đáp án: B
 *   Lời giải: ...
 *
 *   Ảnh trong đề / phương án / mệnh đề / lời giải:
 *   ![mô tả](https://example.com/hinh.png)
 *   hoặc: <img src="https://example.com/hinh.png" alt="Đồ thị" />
 *   (URL phải https, hoặc đường dẫn /..., hoặc data:image/...)
 *
 * (B) Tag @q / @opts / @exp (một hoặc nhiều dòng):
 *   @q Nội dung câu hỏi
 *   @opts
 *   [x] Đáp án đúng
 *   [] Đáp án sai
 *   [] ...
 *   [] ...
 *   @exp Lời giải
 *
 *   Hoặc gắn nhãn A–D:
 *   @opts
 *   [A] ...
 *   [B] ...
 *   [C] ...
 *   [D] ...
 *   Đáp án: C
 *
 *   [F] trong @opts (một dòng): phương án sai (False), giống [].
 *
 * (C) Trắc nghiệm Đúng / Sai (nhiều mệnh đề a–d):
 *   Câu 1: Đề bài chung...
 *   Loại: đúng sai   (chỉ dùng nhãn "Loại:" cho kiểu câu — không dùng "Dạng:" để tránh lẫn "Dạng toán:")
 *   a) Mệnh đề a
 *   Đáp án: Đúng
 *   b) Mệnh đề b
 *   Đáp án: Sai
 *   (hoặc: Đáp án a: Đúng)
 *   Lời giải: ...
 *
 * (D) Trả lời ngắn:
 *   Câu 2: ...
 *   Loại: trả lời ngắn   (hoặc tiêu đề Phần 3 … trả lời ngắn)
 *   Đáp án: 12 | 12.0 | mười hai
 *   Placeholder: ...  hoặc  Gợi ý: ...  (chú thích ô nhập)
 *   Lời giải: ...
 *
 *   Hoặc định dạng đề Word phổ biến:
 *   Lời giải
 *   Trả lời: 3
 *   (các bước giải tiếp theo → explanation)
 *
 * (E) Tự luận (nộp ảnh):
 *   Câu 3: ...
 *   Loại: tự luận
 *   Lời giải: ...
 */

const VI_QUIZ_META = [
  [/^(chương|chapter)\s*[:：]\s*(.+)$/i, 'chapter'],
  [/^(bài|bài\s*số|lesson|lesson_no)\s*[:：]\s*(.+)$/i, 'lesson_no'],
  [/^(chuyên\s*đề|chuyen\s*de|topic)\s*[:：]\s*(.+)$/i, 'topic_name'],
  [/^(bài\s*chuyên\s*đề\s*id|bai\s*chuyen\s*de\s*id|topic_lesson_id)\s*[:：]\s*(.+)$/i, 'topic_lesson_id'],
  [/^(bài\s*chuyên\s*đề|bai\s*chuyen\s*de|topic_lesson_title)\s*[:：]\s*(.+)$/i, 'topic_lesson_title'],
  [/^(tiêu đề|tên\s*đề|title)\s*[:：]\s*(.+)$/i, 'title'],
  [/^(lớp|khối|grade|grade_level)\s*[:：]\s*(.+)$/i, 'grade_level'],
  [/^(thời\s*gian|duration)\s*[:：]\s*(.+)$/i, 'duration'],
];

const MATH11_KNOWLEDGE = parseMathKnowledgeTxt(math11KnowledgeRaw);

const IMPORT_KNOWLEDGE_CACHE = new Map();
function getKnowledgeForImport(grade) {
  const g = String(grade || '11').trim();
  if (!IMPORT_KNOWLEDGE_CACHE.has(g)) {
    let k = parseMathKnowledgeTxtForGrade(mathCurriculumGdpt2018Raw, g);
    if (!k.chapters?.length) k = MATH11_KNOWLEDGE;
    IMPORT_KNOWLEDGE_CACHE.set(g, k);
  }
  return IMPORT_KNOWLEDGE_CACHE.get(g);
}

/** Theo @grade_level / meta — mặc định khối 11 (fallback math11-knowledge). */
let _activeImportKnowledge = MATH11_KNOWLEDGE;

// ---- Per-question labels (nhãn theo từng câu) ----
const MUC_DO_TO_COG = {
  1: 'recognize',
  2: 'understand',
  3: 'apply',
  4: 'apply_high',
};

/**
 * NB/TH/VD/VDC hoặc "Mức độ 1"…"Mức độ 4" (đề Word hay ghi [Mức độ 1] ngay sau Câu N:).
 * 1 → Nhận biết, 2 → Thông hiểu, 3 → Vận dụng, 4 → Vận dụng cao.
 */
function normalizeCognitiveLevelVi(raw) {
  let v = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^[\[\【「]\s*|\s*[\]\】」]$/g, '')
    .trim();
  if (!v) return null;

  const mNum =
    v.match(/^(?:mức\s*độ|muc\s*do|level|độ|do)\s*([1-4])(?:\s*[:.\-–—].*)?$/i) ||
    v.match(/^([1-4])$/);
  if (mNum) {
    const n = Number(mNum[1]);
    return MUC_DO_TO_COG[n] || null;
  }

  if (/^(nb|nhận\s*biết|nhan\s*biet|recognize|recognise)$/.test(v)) return 'recognize';
  if (/^(th|thông\s*hiểu|thong\s*hieu|understand)$/.test(v)) return 'understand';
  // "vận dụng cao" trước "vận dụng" để không khớp nhầm
  if (/^(vdc|vận\s*dụng\s*cao|van\s*dung\s*cao|apply[_\s-]*high)$/.test(v)) return 'apply_high';
  if (/^(vd|vận\s*dụng|van\s*dung|apply)$/.test(v)) return 'apply';
  return null;
}

/** Gỡ tag [Mức độ N] / 【Mức độ N】 khỏi đề và gán cognitive_level. */
function stripInlineMucDoTag(stem, cur) {
  let s = String(stem || '');
  if (!s.trim()) return s;
  const reBracket = /[\[\【「]\s*mức\s*độ\s*([1-4])\s*[\]\】」]/gi;
  let hit = null;
  s = s.replace(reBracket, (_, n) => {
    if (!hit) hit = n;
    return ' ';
  });
  if (!hit) {
    const rePrefix = /^\s*mức\s*độ\s*([1-4])\s*[:.\-–—]?\s*/i;
    const m = s.match(rePrefix);
    if (m) {
      hit = m[1];
      s = s.replace(rePrefix, '').trim();
    }
  }
  if (hit && cur) {
    const mapped = normalizeCognitiveLevelVi(hit);
    if (mapped) cur.cognitive_level = mapped;
  }
  return s.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Tách nhiều tag "Dạng toán" do người nhập — CHỈ theo `;` hoặc `|`.
 * Không tách theo dấu phẩy: trong CT 2018 tên kiến thức có dấu phẩy trong (...), hoặc liệt kê "a, b, c"
 * (vd. đạo hàm … lượng giác, mũ, lôgarit) — tách theo `,` sẽ làm vỡ chuỗi và khớp nhầm → "Các dạng toán khác".
 */
function splitImportedKnowledgeTags(raw) {
  const s = String(raw || '').trim();
  if (!s) return [];
  if (/[|;]/.test(s)) {
    return [...new Set(s.split(/[|;]/g).map((x) => x.trim()).filter(Boolean))];
  }
  return [s];
}

/** Word hay thêm tiền tố "1." / "I)" / bullet — bỏ để nhận "Chương:", "Dạng toán:", "Câu n:" ổn định. */
function stripLeadingQuizEnumPrefix(line) {
  let s = String(line || '').trim();
  s = s.replace(/^[\u2022•\-–—]+\s*/g, '');
  s = s.replace(/^(?:\(?\d{1,2}\)?|[ivxlcdm]{1,8})\s*[\).:\-]\s*/i, '');
  return s.trim();
}

function matchCauLine(line) {
  const L0 = String(line || '').trim();
  let m = L0.match(/^câu\s*(\d+)\s*[:.)-]?\s*(.*)$/i);
  if (m) return { m, rest: L0 };
  const L1 = stripLeadingQuizEnumPrefix(L0);
  if (L1 !== L0) {
    m = L1.match(/^câu\s*(\d+)\s*[:.)-]?\s*(.*)$/i);
    if (m) return { m, rest: L1 };
  }
  return null;
}

/** Lấy số chương từ "8", "8: ...", "Chương 8", v.v. */
function normalizeImportedChapterNo(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const mNum = s.match(/^(\d{1,2})\b/);
  if (mNum) return mNum[1];
  const mVi = s.match(/chương\s*(\d{1,2})/i);
  if (mVi) return mVi[1];
  return s;
}

function resolveTopicAgainstList(tag, topicList) {
  const raw = String(tag || '').trim();
  if (!raw) return null;
  if (topicList.includes(raw)) return raw;
  const n1 = normalizeKnowledgeTopicKey(raw);
  const hit = topicList.find((t) => normalizeKnowledgeTopicKey(t) === n1);
  if (hit) return hit;
  return null;
}

function normalizeTopicTagsStrict({ tags, chapter }) {
  const K = _activeImportKnowledge || MATH11_KNOWLEDGE;
  const list = Array.isArray(tags) ? tags : [];
  const ch = normalizeImportedChapterNo(chapter);
  const allowedInChapter = ch ? (K.topicsByChapter?.get?.(ch) || []) : null;
  const fallbackAll = Array.isArray(K.allTopics) ? K.allTopics : [];
  const topicList = allowedInChapter && allowedInChapter.length ? allowedInChapter : fallbackAll;

  const picked = [];
  for (const t of list) {
    const s = String(t || '').trim();
    if (!s) continue;
    const resolved = resolveTopicAgainstList(s, topicList);
    if (resolved) picked.push(resolved);
    else picked.push('Các dạng toán khác');
  }
  const uniq = [...new Set(picked)].filter(Boolean);
  return uniq.length > 0 ? uniq : ['Các dạng toán khác'];
}

function tryConsumeQuestionLabelLine(line, cur) {
  const L = stripLeadingQuizEnumPrefix(String(line || '').trim());
  if (!L || !cur) return false;

  // Mức độ / độ nhận thức — "Mức độ: NB" | "[Mức độ 1]" | "Mức độ 2"
  const mCogBracket = L.match(/^[\[\【「]\s*mức\s*độ\s*([1-4])\s*[\]\】」]\s*$/i);
  if (mCogBracket) {
    const v = normalizeCognitiveLevelVi(mCogBracket[1]);
    if (v) cur.cognitive_level = v;
    return true;
  }
  const mCogBare = L.match(/^mức\s*độ\s*([1-4])\s*$/i);
  if (mCogBare) {
    const v = normalizeCognitiveLevelVi(mCogBare[1]);
    if (v) cur.cognitive_level = v;
    return true;
  }
  const mCog =
    L.match(/^(mức\s*độ|nhận\s*thức|độ\s*nhận\s*thức|cognitive|level)\s*[:：\-]\s*(.+)$/i) ||
    L.match(/^@cog(nitive)?\s*[:：]\s*(.+)$/i) ||
    L.match(/^@level\s*[:：]\s*(.+)$/i);
  if (mCog) {
    const v = normalizeCognitiveLevelVi(mCog[2] ?? mCog[1]);
    if (v) cur.cognitive_level = v;
    return true;
  }

  // Chương
  const mCh = L.match(/^(chương|chapter)\s*[:：\-]\s*(.+)$/i) || L.match(/^@chapter\s*[:：]\s*(.+)$/i);
  if (mCh) {
    cur.chapter = normalizeImportedChapterNo((mCh[2] ?? mCh[1] ?? '').toString().trim());
    return true;
  }

  // Bài
  const mBn = L.match(/^(bài|lesson|lesson_no)\s*[:：\-]\s*(.+)$/i) || L.match(/^@lesson_no\s*[:：]\s*(.+)$/i);
  if (mBn) {
    cur.lesson_no = (mBn[2] ?? mBn[1] ?? '').toString().trim();
    return true;
  }

  // Dạng (category dang1..dang5)
  const mCat = L.match(/^(dạng|dang|category)\s*[:：\-]\s*(.+)$/i) || L.match(/^@category\s*[:：]\s*(.+)$/i);
  if (mCat) {
    cur.category = (mCat[2] ?? mCat[1] ?? '').toString().trim();
    return true;
  }

  // Tags / dạng toán nhỏ
  const mTag =
    L.match(/^(dạng\s*toán|dang\s*toan|tag|tags|topic|chủ\s*đề|chu\s*de)\s*[:：\-]\s*(.+)$/i) ||
    L.match(/^@tags?\s*[:：]\s*(.+)$/i) ||
    L.match(/^@topic\s*[:：]\s*(.+)$/i);
  if (mTag) {
    const tags = splitImportedKnowledgeTags(mTag[2] ?? mTag[1]);
    cur.topic_tags = [...new Set([...(cur.topic_tags || []), ...tags])];
    return true;
  }

  return false;
}

function mergeQuestionLabelDraft(from, to) {
  if (!from || !to) return;
  if ((from.chapter || '').toString().trim()) to.chapter = from.chapter;
  if ((from.lesson_no || '').toString().trim()) to.lesson_no = from.lesson_no;
  if ((from.cognitive_level || '').toString().trim()) to.cognitive_level = from.cognitive_level;
  if ((from.category || '').toString().trim()) to.category = from.category;
  const ft = Array.isArray(from.topic_tags) ? from.topic_tags : [];
  if (ft.length) {
    to.topic_tags = [...new Set([...(to.topic_tags || []), ...ft])];
  }
}

function resetQuestionLabelDraft(d) {
  if (!d) return;
  d.chapter = '';
  d.lesson_no = '';
  d.cognitive_level = '';
  d.category = '';
  d.topic_tags = [];
}

function consumeVietnameseQuizMeta(lines, meta) {
  let changed = true;
  while (changed && lines.length > 0) {
    changed = false;
    const L = lines[0];
    for (const [re, key] of VI_QUIZ_META) {
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

function normalizeQuizMeta(meta) {
  if (!meta || typeof meta !== 'object') return;
  if (meta.lesson && !meta.lesson_no) meta.lesson_no = meta.lesson;
  if (meta.grade && !meta.grade_level) meta.grade_level = meta.grade;
  if (meta.type && !meta.exam_type) meta.exam_type = meta.type;
  if (!meta.exam_type) meta.exam_type = 'lesson';
  if (meta.chapter != null && String(meta.chapter).trim()) {
    meta.chapter = normalizeImportedChapterNo(meta.chapter);
  }
  if (meta.topic && !meta.topic_name) meta.topic_name = meta.topic;
  if (meta.topicid && !meta.topic_id) meta.topic_id = meta.topicid;
  if (meta.topic_name != null) meta.topic_name = String(meta.topic_name).trim();
  if (meta.topic_id != null) meta.topic_id = String(meta.topic_id).trim();
  if (meta.topic_lesson_id != null) meta.topic_lesson_id = String(meta.topic_lesson_id).trim();
  if (meta.topic_lesson_title != null) meta.topic_lesson_title = String(meta.topic_lesson_title).trim();
}

function optionIndexByLetter(letter) {
  return { A: 0, B: 1, C: 2, D: 3 }[String(letter || '').toUpperCase()] ?? null;
}

/**
 * Tách phương án A–D khi Word đặt nhiều đáp án trên cùng một dòng.
 * Dấu `__...__` do bộ đọc DOCX tạo ra từ chữ gạch chân; phương án có
 * nhãn hoặc nội dung gạch chân được xem là đáp án đúng.
 */
function extractInlineMcqOptions(line) {
  const source = String(line || '');
  const starts = [];
  const re =
    /(?:^|(?<=[\s\t])|(?<=[\$\)\]\}]))(?:__\s*([A-D])\s*[\.\):\-]\s*__|__\s*([A-D])\s*__\s*[\.\):\-]|__\s*([A-D])\s*[\.\):\-]|([A-D])\s*[\.\):\-])/g;
  let match;
  while ((match = re.exec(source)) !== null) {
    const letter = String(match[1] || match[2] || match[3] || match[4] || '').toUpperCase();
    if (!letter) continue;
    starts.push({
      index: match.index,
      endLabel: match.index + match[0].length,
      letter,
      labelUnderlined: Boolean(match[1] || match[2] || match[3]),
    });
  }
  if (!starts.length || starts[0].index !== 0) return [];

  return starts.map((start, index) => {
    const end = index + 1 < starts.length ? starts[index + 1].index : source.length;
    const rawText = source.slice(start.endLabel, end).trim();
    const underlined = start.labelUnderlined || /__[\s\S]*?__/.test(rawText);
    const text = rawText.replace(/__/g, '').trim();
    return {
      index: optionIndexByLetter(start.letter),
      text,
      underlined,
    };
  });
}

function newQuestion() {
  return {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: 'multiple_choice',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    cognitive_level: '',
    chapter: '',
    lesson_no: '',
    category: '',
    topic_tags: [],
  };
}

/** Parse @opts blob: [x] / [] lines, hoặc [A]–[D] + Đáp án: */
function parseOptsBlob(optsBlob) {
  const errors = [];
  let lines = optsBlob
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 1 && /\[[^\]]+\]/.test(lines[0]) && !lines[0].includes('@')) {
    const single = lines[0];
    const options = [];
    let correct = -1;
    let i = 0;
    while (i < single.length) {
      const rest = single.slice(i);
      const m = rest.match(/^\[\s*([xX✓]?)\s*\]\s*/);
      if (!m) {
        const m2 = rest.match(/^\[([A-D])\]\s*/i);
        if (m2) {
          i += m2[0].length;
          const next = single.indexOf('[', i);
          const text = (next === -1 ? single.slice(i) : single.slice(i, next)).trim();
          const idx = optionIndexByLetter(m2[1]);
          if (idx !== null) options[idx] = text;
          i = next === -1 ? single.length : next;
          continue;
        }
        // Một dòng kiểu Word/AI: [F] = phương án sai (False), tương đương []
        const mFalse = rest.match(/^\[\s*F\s*\]\s*/i);
        if (mFalse) {
          i += mFalse[0].length;
          const next = single.indexOf('[', i);
          const text = (next === -1 ? single.slice(i) : single.slice(i, next)).trim();
          options.push(text);
          i = next === -1 ? single.length : next;
          continue;
        }
        break;
      }
      const isCorrect = m[1] && (m[1].toLowerCase() === 'x' || m[1] === '✓');
      i += m[0].length;
      const next = single.indexOf('[', i);
      const text = (next === -1 ? single.slice(i) : single.slice(i, next)).trim();
      if (isCorrect) correct = options.length;
      options.push(text);
      i = next === -1 ? single.length : next;
    }
    while (options.length < 4) options.push('');
    const four = options.slice(0, 4);
    if (four.every((o) => o && String(o).trim())) {
      const da = single.match(/(?:đáp\s*án|dap\s*an)\s*[:：]\s*([ABCD1-4])/i);
      let c = correct >= 0 ? correct : 0;
      if (da) {
        const v = da[1].toUpperCase();
        c = /^[1-4]$/.test(v) ? parseInt(v, 10) - 1 : optionIndexByLetter(v) ?? c;
      } else if (correct < 0) {
        errors.push('Thiếu [x] hoặc Đáp án: A');
      }
      return { options: four, correctAnswer: Math.min(3, Math.max(0, c)), errors };
    }
    if (four.filter(Boolean).length >= 2 && correct >= 0) {
      return { options: four, correctAnswer: Math.min(3, Math.max(0, correct)), errors };
    }
    lines = [single];
  }

  let correctFromDa = -1;
  const daIdx = lines.findIndex((l) => /^(đáp\s*án|dap\s*an)\s*[:：]\s*([ABCD1-4])\s*$/i.test(l));
  if (daIdx >= 0) {
    const m = lines[daIdx].match(/^(đáp\s*án|dap\s*an)\s*[:：]\s*([ABCD1-4])\s*$/i);
    const v = m[2].toUpperCase();
    correctFromDa = /^[1-4]$/.test(v) ? parseInt(v, 10) - 1 : optionIndexByLetter(v) ?? 0;
    lines = lines.filter((_, j) => j !== daIdx);
  }

  const byLetter = ['', '', '', ''];
  let letterMode = false;
  for (const l of lines) {
    const lm = l.match(/^\[([A-D])\]\s*(.*)$/i);
    if (lm) {
      letterMode = true;
      const idx = optionIndexByLetter(lm[1]);
      if (idx !== null) byLetter[idx] = (lm[2] || '').trim();
    }
  }

  if (letterMode && byLetter.every((o) => o && String(o).trim())) {
    const c = correctFromDa >= 0 ? correctFromDa : 0;
    return { options: byLetter, correctAnswer: Math.min(3, Math.max(0, c)), errors: [] };
  }

  const options = [];
  let marked = -1;
  for (const l of lines) {
    const isX =
      /^\[\s*x\s*\]/i.test(l) ||
      /^\[x\]/i.test(l) ||
      /^\[X\]\s/.test(l) ||
      /^\[✓\]/i.test(l);
    const isEmpty = /^\[\s*\]\s*/.test(l) || /^\[\]\s*/.test(l);
    const text = l.replace(/^\[[^\]]*\]\s*/, '').trim();
    if (isX) {
      marked = options.length;
      options.push(text);
    } else if (isEmpty || l.startsWith('[')) {
      options.push(text);
    } else {
      options.push(l);
    }
  }

  while (options.length < 4) options.push('');
  const four = options.slice(0, 4);
  let correctAnswer = marked >= 0 ? marked : correctFromDa >= 0 ? correctFromDa : 0;
  if (marked < 0 && correctFromDa < 0) {
    errors.push('Thiếu đáp án đúng: một dòng [x] ... hoặc Đáp án: A');
  }
  return { options: four, correctAnswer: Math.min(3, Math.max(0, correctAnswer)), errors };
}

function parseTaggedQuizQuestions(bodyLines) {
  const body = bodyLines.join('\n').trim();
  if (!/@q\b/i.test(body)) return { questions: [], errors: [] };

  const chunks = body
    .split(/\s*@q\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const questions = [];
  const errors = [];

  chunks.forEach((chunk, idx) => {
    let explanation = '';
    let main = chunk;
    const expSplit = main.split(/\s*@exp\s+/i);
    if (expSplit.length > 1) {
      main = expSplit[0].trim();
      explanation = expSplit.slice(1).join('@exp').trim();
      const cutNextQ = explanation.search(/\s*@q\s+/i);
      if (cutNextQ >= 0) explanation = explanation.slice(0, cutNextQ).trim();
    }

    const optSplit = main.split(/\s*@opts\s+/i);
    const stemRaw = (optSplit[0] || '').trim();
    const optsBlob = (optSplit[1] || '').trim();

    if (!stemRaw) {
      errors.push(`Khối ${idx + 1}: thiếu nội dung sau @q`);
      return;
    }
    if (!optsBlob) {
      errors.push(`Khối ${idx + 1}: thiếu @opts`);
      return;
    }

    const { options, correctAnswer, errors: oe } = parseOptsBlob(optsBlob);
    errors.push(...oe.map((e) => `Câu ${idx + 1}: ${e}`));

    const q = newQuestion();
    // Consume label lines at top of stem (optional)
    const stemLines = stemRaw.split('\n').map((l) => l.trim()).filter(Boolean);
    while (stemLines.length > 0 && tryConsumeQuestionLabelLine(stemLines[0], q)) stemLines.shift();
    q.question = stemLines.join('\n').trim();
    q.topic_tags = normalizeTopicTagsStrict({ tags: q.topic_tags, chapter: q.chapter || '' });
    q.options = options;
    q.correctAnswer = correctAnswer;
    q.explanation = explanation;
    questions.push(q);
  });

  return { questions, errors };
}

function parseLoaiLine(line) {
  // Chỉ "Loại:" — tránh nhầm với "Dạng toán: ..." (kiến thức) hoặc "Dạng: dang1" (category).
  const m = line.match(/^loại\s*[:：]\s*(.+)$/i);
  if (!m) return null;
  const v = (m[1] || '').trim().toLowerCase();
  if (/đúng\s*sai|tn\s*đúng|^ds$|true\s*false|đ\s*\/\s*s|trắc\s*nghiệm\s*đúng/.test(v)) return 'true_false_group';
  if (/trả\s*lời\s*ngắn|^tln$|^tl$|short|điền\s*đáp|điền\s*số/.test(v)) return 'short_answer';
  if (/tự\s*luận|^essay$|nộp\s*ảnh|chụp\s*bài/.test(v)) return 'essay';
  // Trắc nghiệm 4 phương án — ghi rõ để đồng bộ với UI (mặc định cũng là TN)
  if (/trắc\s*nghiệm(\s|$)|(^|\s)tn(\s|$)|^mc$|multiple\s*choice|phương\s*án\s*a[\s\-]*d/i.test(v)) {
    return 'multiple_choice';
  }
  return null;
}

/** Nhận loại câu từ tiêu đề "Phần 1/2/3..." thường dùng trong đề Word. */
function parseQuestionKindFromSectionHeading(line) {
  const raw = stripLeadingQuizEnumPrefix(String(line || '').trim());
  if (!/^phần\s*(?:\d+|[ivxlcdm]+)\b/i.test(raw)) return null;
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

  // Kiểm tra đúng/sai trước vì tiêu đề cũng thường chứa chữ "lựa chọn".
  if (/dung\s*[-/–—]?\s*sai|lua\s*chon\s*dung\s*sai|trac\s*nghiem\s*dung\s*sai/.test(normalized)) {
    return 'true_false_group';
  }
  if (/tra\s*loi\s*ngan|dap\s*an\s*ngan/.test(normalized)) return 'short_answer';
  if (/tu\s*luan|nop\s*anh/.test(normalized)) return 'essay';
  if (/nhieu\s*phuong\s*an|trac\s*nghiem|lua\s*chon/.test(normalized)) return 'multiple_choice';
  return null;
}

function parseBoolish(s) {
  const t = (s || '').toString().trim().toLowerCase();
  if (/^(đúng|dung|đ|d|true|t|yes|1|có|v|x|\*)$/.test(t)) return true;
  if (/^(sai|s|false|f|no|0|không|ko)$/.test(t)) return false;
  return null;
}

function matchExplanationLine(line) {
  let L = String(line || '').replace(/^[\uFEFF\u200B\u200C\u200D]+/g, '').trim();
  if (!L) return null;

  // Word/bullets sometimes prefix "1." / "I)" / "•" before the header
  const L2 = stripLeadingQuizEnumPrefix(L);
  if (L2 && L2.length < L.length) L = L2;

  // Accept common variants for explanation headers, including cases without ':' (Word often mangles punctuation).
  // IMPORTANT: avoid matching "Giải phương trình..." (part of the question stem).
  const m1 = L.match(
    /^(lời\s*giải|loi\s*giai|giải\s*thích|giai\s*thich|hướng\s*dẫn\s*giải|huong\s*dan\s*giai)\s*(?:[:：\-–—\.])?\s*(.*)$/i,
  );
  if (m1) return { rest: (m1[2] || '').trim() };

  // Short headers must have a delimiter, otherwise it will collide with normal Vietnamese text.
  const m2 = L.match(/^(giải|giai)\s*[:：\-–—]\s*(.*)$/i);
  if (m2) return { rest: (m2[2] || '').trim() };

  return null;
}

function stripPunct(s) {
  return String(s || '')
    .trim()
    .replace(/^[\s\-–—:：;,，.。]+/g, '')
    .replace(/[\s\-–—:：;,，.。]+$/g, '')
    .trim();
}

function applyTfAnswerForKey(cur, key, boolVal) {
  if (!cur) return false;
  const kk = String(key || '').toLowerCase();
  if (!/^[a-d]$/.test(kk)) return false;
  if (cur.tfDraft && cur.tfDraft.key === kk) {
    cur.tfDraft.correct = boolVal;
    return true;
  }
  const hit = (cur.tfItems || []).find((x) => x && x.key === kk);
  if (hit) {
    hit.correct = boolVal;
    return true;
  }
  if (cur.tfDraft) {
    cur.tfDraft.correct = boolVal;
    return true;
  }
  return false;
}

function flushTfDraft(cur) {
  if (!cur || !cur.tfDraft) return;
  if (!Array.isArray(cur.tfItems)) cur.tfItems = [];
  cur.tfItems.push(cur.tfDraft);
  cur.tfDraft = null;
}

function parseTfAnswerPairsFromText(raw) {
  const s0 = String(raw || '').trim();
  if (!s0) return [];
  // Bảng đáp án Word thường thành một dòng:
  // "a) Sai   b) Đúng   c) Sai   d) Đúng".
  const inlinePairs = [];
  const inlineRe =
    /(?:^|[\s|;,])([a-d])\s*[\).:\-]?\s*(đúng|dung|sai|true|false|t|f|đ|d|s)(?=\s|$|[|;,])/gi;
  let inlineMatch;
  while ((inlineMatch = inlineRe.exec(s0)) !== null) {
    const boolVal = parseBoolish(inlineMatch[2]);
    if (boolVal !== null) {
      inlinePairs.push({ key: inlineMatch[1].toLowerCase(), boolVal, tail: '' });
    }
  }
  if (inlinePairs.length > 1) return inlinePairs;

  // Normalize separators a bit: "a.Đ b.S" -> "a:Đ; b:S"
  const s = s0
    .replace(/[，]/g, ',')
    .replace(/\b([a-d])\s*[\).]/gi, '$1:')
    .replace(/\s*[:：]\s*/g, ':')
    .replace(/\s*[,;|]\s*/g, ';')
    .trim();

  const pairs = [];
  const parts = s.split(';').map((x) => x.trim()).filter(Boolean);
  for (const part of parts) {
    const m = part.match(/^([a-d])\s*[:\-]\s*(.+)$/i) || part.match(/^([a-d])\s+(.+)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const rhs = stripPunct(m[2] || '');
    // Only accept rhs if it begins with a boolish token
    const token = stripPunct(rhs.split(/\s+/)[0] || '');
    const b = parseBoolish(token);
    if (b === null) continue;
    pairs.push({ key, boolVal: b, tail: stripPunct(rhs.slice(token.length)) });
  }
  return pairs;
}

function isLikelyTfAnswerOnlyLine(rest) {
  const s = stripPunct(rest || '');
  if (!s) return false;
  const firstTok = stripPunct(s.split(/\s+/)[0] || '');
  const b = parseBoolish(firstTok);
  if (b === null) return false;
  const tail = stripPunct(s.slice(firstTok.length));
  // If there's extra text, only treat as "answer line" when it's short and looks like justification.
  // This avoids misreading a real proposition starting with "Đúng là ...".
  if (!tail) return true;
  if (s.length > 60) return false;
  if (/^[,.;:：\-–—\(\[]/.test(s.slice(firstTok.length).trim())) return true;
  if (/^(vì|do|bởi|boi|suy\s*ra|nên|nen|=>|→)/i.test(tail)) return true;
  return false;
}

function newLineQuestionDraft() {
  return {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    qKind: 'multiple_choice',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    lastMcqOptionIndex: null,
    explanation: '',
    tfItems: [],
    tfDraft: null,
    shortCorrect: '',
    answerPlaceholder: '',
    cognitive_level: '',
    chapter: '',
    lesson_no: '',
    category: '',
    topic_tags: [],
  };
}

function finalizeLineQuestionDraft(raw, ctx = {}) {
  if (!raw) return null;
  // Phòng trường hợp tag [Mức độ N] dính vào đề (xuống dòng / Word)
  raw.question = stripInlineMucDoTag(raw.question || '', raw);
  const stem = (raw.question || '').trim();
  if (!stem && raw.qKind !== 'essay') return null;
  const meta = ctx.meta || {};
  const effectiveChapter =
    normalizeImportedChapterNo(raw.chapter || '') ||
    normalizeImportedChapterNo(ctx.lastChapter || '') ||
    normalizeImportedChapterNo(meta.chapter || '');
  const effectiveLesson =
    String(raw.lesson_no || '').trim() ||
    String(ctx.lastLessonNo || '').trim() ||
    String(meta.lesson_no || '').trim();
  const extra = {
    cognitive_level: raw.cognitive_level || '',
    chapter: effectiveChapter || '',
    lesson_no: effectiveLesson || '',
    category: raw.category || '',
    topic_tags: normalizeTopicTagsStrict({
      tags: raw.topic_tags,
      chapter: effectiveChapter || '',
    }),
  };

  if (raw.qKind === 'true_false_group') {
    const items = [...(raw.tfItems || [])];
    if (raw.tfDraft) items.push(raw.tfDraft);
    const tfItems = items
      .filter((it) => it && ((it.text || '').trim() || typeof it.correct === 'boolean'))
      .map((it) => ({
        key: (it.key || 'a').toLowerCase(),
        text: (it.text || '').trim(),
        correct: typeof it.correct === 'boolean' ? it.correct : null,
      }))
      .sort((a, b) => String(a.key).localeCompare(String(b.key), 'en'));
    return {
      id: raw.id,
      type: 'true_false_group',
      question: stem,
      tfItems,
      explanation: (raw.explanation || '').trim(),
      options: ['', '', '', ''],
      correctAnswer: 0,
      ...extra,
    };
  }

  if (raw.qKind === 'short_answer') {
    return {
      id: raw.id,
      type: 'short_answer',
      question: stem,
      shortCorrect: (raw.shortCorrect || '').trim(),
      answerPlaceholder: (raw.answerPlaceholder || '').trim() || 'Nhập đáp án...',
      explanation: (raw.explanation || '').trim(),
      options: ['', '', '', ''],
      correctAnswer: 0,
      ...extra,
    };
  }

  if (raw.qKind === 'essay') {
    return {
      id: raw.id,
      type: 'essay',
      question: stem,
      explanation: (raw.explanation || '').trim(),
      options: ['', '', '', ''],
      correctAnswer: 0,
      ...extra,
    };
  }

  return {
    id: raw.id,
    type: 'multiple_choice',
    question: stem,
    options: raw.options && raw.options.length === 4 ? raw.options.map((o) => (o || '').trim()) : ['', '', '', ''],
    correctAnswer: Number.isInteger(raw.correctAnswer) ? raw.correctAnswer : 0,
    explanation: (raw.explanation || '').trim(),
    ...extra,
  };
}

function validateLineQuestion(q, idx, errors) {
  const n = idx + 1;
  if (q.type === 'essay') {
    if (!q.question) errors.push(`Câu ${n}: thiếu nội dung`);
    return;
  }
  if (q.type === 'short_answer') {
    if (!q.question) errors.push(`Câu ${n}: thiếu nội dung`);
    if (!(q.shortCorrect || '').trim()) errors.push(`Câu ${n}: thiếu Đáp án (trả lời ngắn)`);
    return;
  }
  if (q.type === 'true_false_group') {
    if (!q.question) errors.push(`Câu ${n}: thiếu nội dung`);
    if (!q.tfItems || q.tfItems.length === 0) errors.push(`Câu ${n}: thiếu mệnh đề a) b)… (đúng/sai)`);
    (q.tfItems || []).forEach((it, j) => {
      if (!(it.text || '').trim()) errors.push(`Câu ${n}: mệnh đề (${it.key}) trống`);
      if (typeof it.correct !== 'boolean') errors.push(`Câu ${n}: thiếu Đáp án cho mệnh đề (${it.key})`);
    });
    return;
  }
  const missing = q.options
    .map((o, i) => ({ o, i }))
    .filter((x) => !x.o || x.o.trim().length === 0)
    .map((x) => x.i);
  if (missing.length > 0)
    errors.push(`Câu ${n}: thiếu đáp án ${missing.map((i) => ['A', 'B', 'C', 'D'][i]).join(', ')}`);
  if (q.correctAnswer < 0 || q.correctAnswer > 3) errors.push(`Câu ${n}: đáp án đúng không hợp lệ`);
}

function parseLineFormatQuestions(lines, meta = {}) {
  const questions = [];
  const errors = [];
  let cur = null;
  let inExplanation = false;
  let currentSectionKind = 'multiple_choice';

  /** Nhãn trước dòng "Câu 1:" (Word hay để Chương / Dạng toán phía trên) — tránh bị bỏ khi finalize câu "ma". */
  const preDraft = newLineQuestionDraft();
  let sawAnyQuestion = false;

  let lastChapter = normalizeImportedChapterNo(meta.chapter || '') || '';
  let lastLessonNo = String(meta.lesson_no || '').trim();

  const pushCur = () => {
    if (!cur) return;
    const q = finalizeLineQuestionDraft(cur, { meta, lastChapter, lastLessonNo });
    if (q) {
      questions.push(q);
      validateLineQuestion(q, questions.length - 1, errors);
      const cq = normalizeImportedChapterNo(q.chapter || '');
      if (cq) lastChapter = cq;
      if (String(q.lesson_no || '').trim()) lastLessonNo = String(q.lesson_no || '').trim();
    }
    cur = null;
    inExplanation = false;
  };

  const ensureCur = () => {
    if (!cur) cur = newLineQuestionDraft();
  };

  for (const line of lines) {
    const sectionKind = parseQuestionKindFromSectionHeading(line);
    if (sectionKind) {
      currentSectionKind = sectionKind;
      continue;
    }
    if (/^phần\s+[ivxlcdm\d]/i.test(line) || /^part\s+[ivx\d]/i.test(line)) continue;

    const cauHit = matchCauLine(line);
    if (cauHit) {
      const mQ = cauHit.m;
      pushCur();
      ensureCur();
      if (!sawAnyQuestion) {
        mergeQuestionLabelDraft(preDraft, cur);
        resetQuestionLabelDraft(preDraft);
        sawAnyQuestion = true;
      }
      cur.qKind = currentSectionKind;
      cur.question = stripInlineMucDoTag((mQ[2] || '').trim(), cur);
      continue;
    }

    if (!sawAnyQuestion) {
      if (parseLoaiLine(line)) continue;
      if (tryConsumeQuestionLabelLine(line, preDraft)) continue;
      continue;
    }

    const loai = parseLoaiLine(line);
    if (loai) {
      ensureCur();
      cur.qKind = loai;
      inExplanation = false;
      continue;
    }

    ensureCur();

    // Optional per-question labels (can appear right after "Câu n:" or anywhere before options)
    if (tryConsumeQuestionLabelLine(line, cur)) continue;

    const explHit = matchExplanationLine(line);
    if (explHit) {
      if (cur.qKind === 'true_false_group') flushTfDraft(cur);
      cur.explanation = (explHit.rest || '').trim();
      inExplanation = true;
      continue;
    }

    if (cur.qKind === 'essay') {
      if (inExplanation) cur.explanation = (cur.explanation ? `${cur.explanation}\n` : '') + line;
      else cur.question = (cur.question ? `${cur.question}\n` : '') + line;
      continue;
    }

    if (cur.qKind === 'short_answer') {
      const mPh =
        line.match(/^placeholder\s*[:\-]\s*(.+)$/i) ||
        line.match(/^(gợi\s*ý|goi\s*y|chú\s*thích|chu\s*thich)\s*[:\-：]\s*(.+)$/i);
      if (mPh) {
        cur.answerPlaceholder = (mPh[2] != null ? mPh[2] : mPh[1] || '').trim();
        continue;
      }
      // "Trả lời: …" / "Đáp án: …" — kể cả còn sót ** hoặc __ từ Word.
      const answerLine = String(line || '')
        .replace(/^[\s*_]+/, '')
        .replace(/\*\*|__/g, '');
      const mDa = answerLine.match(
        /^(?:đáp\s*án|dap\s*an|đáp\s*số|dap\s*so|trả\s*lời|tra\s*loi)\s*[:：\-]\s*(.+)$/i
      );
      if (mDa) {
        cur.shortCorrect = (mDa[1] || '').trim().replace(/\*\*|__/g, '').trim();
        // Định dạng Word: Lời giải → Trả lời: … → các bước giải.
        // Giữ/bật inExplanation để không ghi các bước vào phần đề bài.
        inExplanation = true;
        continue;
      }
      if (inExplanation) cur.explanation = (cur.explanation ? `${cur.explanation}\n` : '') + line;
      else cur.question = (cur.question ? `${cur.question}\n` : '') + line;
      continue;
    }

    if (cur.qKind === 'true_false_group') {
      const inlineTfAnswers = parseTfAnswerPairsFromText(line);
      if (inlineTfAnswers.length > 1) {
        inlineTfAnswers.forEach((pair) => applyTfAnswerForKey(cur, pair.key, pair.boolVal));
        if (inExplanation) {
          cur.explanation = (cur.explanation ? `${cur.explanation}\n` : '') + line;
        }
        continue;
      }
      const mTfSub = line.match(/^([a-d])\s*[\).:\-]\s*(.*)$/i);
      if (mTfSub) {
        const key = mTfSub[1].toLowerCase();
        const restRaw = (mTfSub[2] || '').trim();
        const rest = stripPunct(restRaw);

        // Đang ở phần lời giải: KHÔNG tạo mệnh đề mới, mọi dòng "a) ..." dồn vào lời giải.
        // (Trường hợp điển hình: sau "Lời giải:" Word xuất a) b) c) d) kèm chứng minh dài.)
        if (inExplanation) {
          // Nếu đoạn đầu là "Đúng"/"Sai" thì tranh thủ gán đáp án cho mệnh đề cùng key (an toàn, không ghi đè text).
          const firstTok = stripPunct(rest.split(/\s+/)[0] || '');
          const b = parseBoolish(firstTok);
          if (b !== null) applyTfAnswerForKey(cur, key, b);
          cur.explanation = (cur.explanation ? `${cur.explanation}\n` : '') + line;
          continue;
        }

        // If the line is actually an answer/explanation line like:
        // "a) Đúng" or "a) Sai, vì ..." -> do NOT start a new proposition.
        if (isLikelyTfAnswerOnlyLine(rest)) {
          const firstTok = stripPunct(rest.split(/\s+/)[0] || '');
          const b = parseBoolish(firstTok);
          if (b !== null) applyTfAnswerForKey(cur, key, b);
          const tail = stripPunct(rest.slice(firstTok.length));
          if (tail) {
            cur.explanation = (cur.explanation ? `${cur.explanation}\n` : '') + `${key}) ${tail}`;
            inExplanation = true;
          }
          continue;
        }

        // Nếu mệnh đề cùng key đã tồn tại (đã có text) mà gặp lại "a) ..." thì coi đây là lời giải,
        // KHÔNG ghi đè text mệnh đề gốc.
        const existed = (cur.tfItems || []).find((x) => x && x.key === key && (x.text || '').trim());
        const existedDraft = cur.tfDraft && cur.tfDraft.key === key && (cur.tfDraft.text || '').trim();
        if (existed || existedDraft) {
          const firstTok = stripPunct(rest.split(/\s+/)[0] || '');
          const b = parseBoolish(firstTok);
          if (b !== null) applyTfAnswerForKey(cur, key, b);
          cur.explanation = (cur.explanation ? `${cur.explanation}\n` : '') + line;
          inExplanation = true;
          continue;
        }

        if (cur.tfDraft) cur.tfItems.push(cur.tfDraft);
        cur.tfDraft = { key, text: restRaw.trim(), correct: null };
        inExplanation = false;
        continue;
      }
      const mTfAnsKey = line.match(/^đáp\s*án\s*([a-d])\s*[:\-]\s*(.+)$/i);
      if (mTfAnsKey) {
        const kk = mTfAnsKey[1].toLowerCase();
        const tr = parseBoolish(mTfAnsKey[2]);
        if (tr === null) errors.push(`Không hiểu Đáp án ${kk}: ${mTfAnsKey[2]}`);
        else {
          applyTfAnswerForKey(cur, kk, tr);
        }
        continue;
      }
      const mTfAnsBare = line.match(/^đáp\s*án\s*[:\-]\s*(.+)$/i);
      if (mTfAnsBare) {
        const rhs = (mTfAnsBare[1] || '').trim();
        // Support: "Đáp án: a Đ; b S; c Đ; d S"
        const pairs = parseTfAnswerPairsFromText(rhs);
        if (pairs.length > 0) {
          pairs.forEach((p) => {
            applyTfAnswerForKey(cur, p.key, p.boolVal);
            if (p.tail) {
              cur.explanation = (cur.explanation ? `${cur.explanation}\n` : '') + `${p.key}) ${p.tail}`;
              inExplanation = true;
            }
          });
          continue;
        }
        // Fallback: bare answer for the current draft only
        if (cur.tfDraft) {
          const tr = parseBoolish(rhs);
          if (tr !== null) cur.tfDraft.correct = tr;
          continue;
        }
      }
      if (inExplanation) {
        cur.explanation = (cur.explanation ? `${cur.explanation}\n` : '') + line;
        continue;
      }
      if (cur.tfDraft) cur.tfDraft.text = `${cur.tfDraft.text}\n${line}`.trim();
      else cur.question = (cur.question ? `${cur.question}\n` : '') + line;
      continue;
    }

    // Phương án TN: nhận mỗi đáp án một dòng hoặc A/B/C/D cùng một dòng.
    // Chỉ chữ HOA để tránh nhầm mệnh đề a) b) c) trong đề bài.
    const inlineOpts = extractInlineMcqOptions(line);
    if (inlineOpts.length > 0) {
      inlineOpts.forEach((opt) => {
        if (opt.index === null) return;
        cur.options[opt.index] = opt.text;
        cur.lastMcqOptionIndex = opt.index;
        if (opt.underlined) cur.correctAnswer = opt.index;
      });
      inExplanation = false;
      continue;
    }

    const mAns = line.match(/^(đáp\s*án|dap\s*an)\s*[:\-]\s*([ABCD]|[1-4])\s*[\.\):）]?\s*$/i);
    if (mAns) {
      const v = mAns[2].toUpperCase();
      const idx = /^[1-4]$/.test(v) ? parseInt(v, 10) - 1 : optionIndexByLetter(v);
      if (idx !== null) cur.correctAnswer = idx;
      inExplanation = false;
      continue;
    }

    const hasAnyOption = cur.options.some((o) => (o || '').trim().length > 0);
    if (!hasAnyOption) {
      if (Number.isInteger(cur.lastMcqOptionIndex)) {
        const idx = cur.lastMcqOptionIndex;
        cur.options[idx] = (cur.options[idx] ? `${cur.options[idx]}\n` : '') + line;
      } else {
        cur.question = (cur.question ? `${cur.question}\n` : '') + line;
      }
    } else if (inExplanation) {
      cur.explanation = (cur.explanation ? `${cur.explanation}\n` : '') + line;
    } else if (Number.isInteger(cur.lastMcqOptionIndex)) {
      const idx = cur.lastMcqOptionIndex;
      cur.options[idx] = (cur.options[idx] ? `${cur.options[idx]}\n` : '') + line;
    } else {
      cur.question = (cur.question ? `${cur.question}\n` : '') + line;
    }
  }
  pushCur();

  return { questions, errors };
}

export function parseQuestionsFromText(rawText) {
  const text = (rawText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  let lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^\s*#/.test(l) && !/^\s*\/\//.test(l));

  const meta = {};
  while (lines.length > 0) {
    const m = lines[0].match(/^@(\w+)\s*:\s*(.*)$/i);
    if (!m) break;
    const key = m[1].toLowerCase();
    const value = (m[2] ?? '').trim();
    meta[key] = value;
    lines.shift();
  }

  consumeVietnameseQuizMeta(lines, meta);
  normalizeQuizMeta(meta);

  const gradeFromMeta = String(meta.grade_level || '11').trim();
  _activeImportKnowledge = getKnowledgeForImport(gradeFromMeta);
  try {
    const tagged = parseTaggedQuizQuestions(lines);
    if (tagged.questions.length > 0) {
      const errors = [...tagged.errors];
      tagged.questions.forEach((q, idx) => {
        const missing = q.options
          .map((o, i) => ({ o, i }))
          .filter((x) => !x.o || x.o.trim().length === 0)
          .map((x) => x.i);
        if (missing.length > 0) errors.push(`Câu ${idx + 1}: thiếu đáp án ${missing.map((i) => ['A', 'B', 'C', 'D'][i]).join(', ')}`);
        if (q.correctAnswer < 0 || q.correctAnswer > 3) errors.push(`Câu ${idx + 1}: đáp án đúng không hợp lệ`);
      });
      return { questions: tagged.questions, errors, meta };
    }

    return { ...parseLineFormatQuestions(lines, meta), meta };
  } finally {
    _activeImportKnowledge = MATH11_KNOWLEDGE;
  }
}

/** Gom lỗi dạng "Câu 5: ..." / "Khối 3: ..." theo số thứ tự (1-based). */
export function groupQuizImportErrors(errors) {
  const byQuestion = new Map();
  const global = [];
  if (!Array.isArray(errors)) return { byQuestion, global };
  const reCau = /^Câu\s*(\d+)\s*:\s*(.*)$/i;
  const reKhoi = /^Khối\s*(\d+)\s*:\s*(.*)$/i;
  for (const er of errors) {
    const s = String(er || '').trim();
    if (!s) continue;
    let m = s.match(reCau);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > 0) {
        if (!byQuestion.has(n)) byQuestion.set(n, []);
        byQuestion.get(n).push(s);
        continue;
      }
    }
    m = s.match(reKhoi);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n > 0) {
        if (!byQuestion.has(n)) byQuestion.set(n, []);
        byQuestion.get(n).push(s);
        continue;
      }
    }
    global.push(s);
  }
  return { byQuestion, global };
}

function correctAnswerIndexOk(q) {
  const ca = q?.correctAnswer;
  if (typeof ca === 'number' && Number.isInteger(ca) && ca >= 0 && ca <= 3) return true;
  if (typeof ca === 'string') {
    const u = ca.trim().toUpperCase();
    if (/^[ABCD]$/.test(u)) return true;
    if (/^[1-4]$/.test(u)) return true;
  }
  return false;
}

/** Kiểm tra đề đang soạn (sau import / chỉnh tay), trả về danh sách lỗi cùng format "Câu n: ...". */
export function validateQuizQuestionsAdmin(questions) {
  const errors = [];
  const list = Array.isArray(questions) ? questions : [];
  list.forEach((q, idx) => {
    const n = idx + 1;
    const t = (q?.type || 'multiple_choice').toString();
    if (t === 'essay') {
      if (!(q?.question || '').toString().trim()) errors.push(`Câu ${n}: thiếu nội dung câu hỏi`);
      return;
    }
    if (t === 'short_answer') {
      if (!(q?.question || '').toString().trim()) errors.push(`Câu ${n}: thiếu nội dung câu hỏi`);
      if (!(q?.shortCorrect || '').toString().trim()) errors.push(`Câu ${n}: thiếu đáp án (trả lời ngắn)`);
      return;
    }
    if (t === 'fill_blanks') {
      if (!(q?.passage || '').toString().trim()) errors.push(`Câu ${n}: thiếu đoạn văn (dùng {{1}}, {{2}}…)`);
      const blanks = Array.isArray(q?.blanks) ? q.blanks : [];
      if (blanks.length === 0) errors.push(`Câu ${n}: thiếu đáp án các chỗ trống (mỗi dòng 1=…)`);
      return;
    }
    if (t === 'true_false_group') {
      if (!(q?.question || '').toString().trim()) errors.push(`Câu ${n}: thiếu nội dung câu hỏi`);
      const items = Array.isArray(q?.tfItems) ? q.tfItems : [];
      if (items.length === 0) errors.push(`Câu ${n}: thiếu mệnh đề a) b)… (đúng/sai)`);
      items.forEach((it) => {
        const k = (it?.key || '?').toString();
        if (!(it?.text || '').toString().trim()) errors.push(`Câu ${n}: mệnh đề (${k}) trống`);
        if (it?.correct !== true && it?.correct !== false)
          errors.push(`Câu ${n}: thiếu đúng/sai cho mệnh đề (${k})`);
      });
      return;
    }
    if (!(q?.question || '').toString().trim()) errors.push(`Câu ${n}: thiếu nội dung câu hỏi`);
    const opts = Array.isArray(q?.options) && q.options.length === 4 ? q.options : ['', '', '', ''];
    const missing = opts
      .map((o, i) => ({ o, i }))
      .filter((x) => !x.o || String(x.o).trim().length === 0)
      .map((x) => x.i);
    if (missing.length > 0)
      errors.push(`Câu ${n}: thiếu đáp án ${missing.map((i) => ['A', 'B', 'C', 'D'][i]).join(', ')}`);
    if (!correctAnswerIndexOk(q)) errors.push(`Câu ${n}: đáp án đúng không hợp lệ (chọn A–D)`);
  });
  return errors;
}
