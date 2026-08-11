/**
 * Tạo Toán 8 Chương II (không file nguồn) đúng mẫu import + quy tắc định dạng mới.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDocs,
  query,
  where,
  updateDoc,
} from 'firebase/firestore';

const ROOT = '/workspace';
const BASE = join(ROOT, 'tai-lieu-dang-web/Toán 8/Bài Giảng/CHƯƠNG II. HẰNG ĐẲNG THỨC ĐÁNG NHỚ VÀ ỨNG DỤNG');
const SAMPLE = readFileSync(join(ROOT, 'docs/mau-import-bai-giang-BAT-BUOC.txt'), 'utf8').slice(0, 9000);
const FORMAT_RULES = readFileSync(join(ROOT, 'docs/YEU_CAU_THEM_DINH_DANG_CAU_HOI.txt'), 'utf8').slice(0, 3500);

const LESSONS = [
  {
    key: 'bai6',
    folder: 'Bài 6. Hiệu hai bình phương. Bình phương của một tổng hay một hiệu',
    out: 'Bai-6-import.txt',
    lesson_no: '6',
    title: 'Hiệu hai bình phương. Bình phương của một tổng hay một hiệu',
    minPractice: 12,
    focus: 'hằng đẳng thức hiệu hai bình phương bình phương tổng hiệu',
  },
  {
    key: 'bai7',
    folder: 'Bài 7. Lập phương của một tổng hay một hiệu',
    out: 'Bai-7-import.txt',
    lesson_no: '7',
    title: 'Lập phương của một tổng hay một hiệu',
    minPractice: 12,
    focus: 'lập phương của một tổng lập phương của một hiệu',
  },
  {
    key: 'bai8',
    folder: 'Bài 8. Tổng và hiệu hai lập phương',
    out: 'Bai-8-import.txt',
    lesson_no: '8',
    title: 'Tổng và hiệu hai lập phương',
    minPractice: 12,
    focus: 'tổng hai lập phương hiệu hai lập phương',
  },
  {
    key: 'bai9',
    folder: 'Bài 9. Phân tích đa thức thành nhân tử',
    out: 'Bai-9-import.txt',
    lesson_no: '9',
    title: 'Phân tích đa thức thành nhân tử',
    minPractice: 12,
    focus: 'phân tích đa thức thành nhân tử toán 8',
  },
  {
    key: 'ot',
    folder: 'ÔN TẬP CHƯƠNG II',
    out: 'On-tap-chuong-II-import.txt',
    lesson_no: 'OT2',
    title: 'Ôn tập chương II – Hằng đẳng thức đáng nhớ và ứng dụng',
    minPractice: 20,
    focus: 'ôn tập hằng đẳng thức đáng nhớ toán 8',
  },
];

const KEYS = [process.env.GEMINI_API_KEY_1, process.env.GEMINI_API_KEY_2].filter(Boolean);
if (!KEYS.length) throw new Error('Missing GEMINI_API_KEY_1/2');

async function geminiGenerate(prompt, { temperature = 0.3 } = {}) {
  let lastErr;
  for (const key of KEYS) {
    for (const model of ['gemini-2.5-flash', 'gemini-2.0-flash']) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature,
              maxOutputTokens: 16384,
            },
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          lastErr = new Error(data?.error?.message || res.statusText);
          continue;
        }
        const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
        if (!text.trim()) {
          lastErr = new Error('Empty Gemini response');
          continue;
        }
        return text;
      } catch (e) {
        lastErr = e;
      }
    }
  }
  throw lastErr || new Error('Gemini failed');
}

function stripCodeFence(s) {
  let t = s.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '');
  }
  return t.trim();
}

function postNormalize(text) {
  let t = text.replace(/\r\n/g, '\n');
  // #### Ví dụ 1.1: → Ví dụ 1:
  t = t.replace(/^#{1,6}\s*(Ví dụ\s*[\d.]*)\s*:?\s*$/gim, (_, a) => {
    const m = String(a).match(/(\d+)/);
    const n = m ? m[1] : '1';
    return `Ví dụ ${n}:`;
  });
  t = t.replace(/^#{3,}\s*/gm, '');
  // $[{inner}]$ → $inner$ (brace-depth aware)
  let out = '';
  let i = 0;
  while (i < t.length) {
    if (t.startsWith('$[{', i)) {
      const start = i + 3;
      let j = start;
      let depth = 1;
      let done = false;
      while (j < t.length) {
        if (t[j] === '{') depth += 1;
        else if (t[j] === '}') {
          depth -= 1;
          if (depth === 0 && t.startsWith('}]$', j)) {
            out += `$${t.slice(start, j)}$`;
            i = j + 3;
            done = true;
            break;
          }
        }
        j += 1;
      }
      if (!done) {
        out += t[i];
        i += 1;
      }
      continue;
    }
    out += t[i];
    i += 1;
  }
  t = out;
  // Ensure section headers exist
  if (!/^LÝ THUYẾT TRỌNG TÂM/m.test(t)) {
    t = t.replace(/^(@\S[^\n]*\n)+/m, (m) => `${m}\nLÝ THUYẾT TRỌNG TÂM\n`);
  }
  if (!/^CÁC DẠNG TOÁN/m.test(t)) {
    // leave; model should include
  }
  // Rename practice header to recognized form
  t = t.replace(/^BÀI TẬP TỰ LUYỆN\s*$/im, 'BÀI TẬP LUYỆN TẬP');
  // Drop trailing answer-only section if still present
  t = t.replace(/\nĐÁP ÁN\/HƯỚNG DẪN[\s\S]*$/i, '\n');
  t = t.replace(/\nĐÁP ÁN\s*TỰ\s*LUYỆN[\s\S]*$/i, '\n');
  return t.trim() + '\n';
}

function buildPrompt(lesson) {
  const minP = lesson.minPractice;
  return `Bạn là biên tập viên soạn file IMPORT bài giảng Toán cho website thayphatdaytoan.
Hãy soạn TOÀN BỘ file import TXT cho bài sau (KHÔNG có file tài liệu nguồn — soạn theo SGK Toán 8).

BÀI: Toán 8 — Chương 2 — ${lesson.title} (lesson_no=${lesson.lesson_no})
Chủ đề: hằng đẳng thức đáng nhớ và ứng dụng.

YÊU CẦU BẮT BUỘC:
1) Meta:
@grade_level: 8
@chapter: 2
@lesson_no: ${lesson.lesson_no}
@title: ${lesson.title}
@focus_keyword: ${lesson.focus}
@keywords: hằng đẳng thức, toán 8, chương 2
@seo_description: (1 câu ngắn)

2) Cấu trúc đúng thứ tự, KHÔNG dùng ###/####:
LÝ THUYẾT TRỌNG TÂM
CÁC DẠNG TOÁN & VÍ DỤ
BÀI TẬP LUYỆN TẬP

3) Lý thuyết đủ trọng tâm SGK; có khối Ghi nhớ #[Ghi nhớ: ...]# nếu phù hợp.

4) CÁC DẠNG TOÁN: 4–5 dạng; mỗi dạng ≥ 2–3 ví dụ kèm Lời giải.
Viết "Dạng 1:", "Ví dụ 1:", "Lời giải:" — CẤM #### Ví dụ.

5) BÀI TẬP LUYỆN TẬP ≥ ${minP} câu, ĐA DẠNG:
- ~40% trắc nghiệm A/B/C/D + Đáp án: + Lời giải:
- ~40% điền đáp án (MỖI ý một Câu riêng) + Đáp án: + Lời giải:
- ~20% [đúng sai] + Đáp án: Đúng/Sai + Lời giải:
- CẤM gộp a) b) c) trong một câu điền đáp án
- CẤM mục ĐÁP ÁN riêng ở cuối
- Ngăn câu bằng ---
- Công thức chỉ $...$ hoặc $$...$$ — không $[{...}]$

6) Chỉ xuất TXT thuần, không giải thích, không bọc code fence.

===== QUY TẮC ĐỊNH DẠNG =====
${FORMAT_RULES}

===== MẪU IMPORT =====
${SAMPLE}
`;
}

/* ---- minimal practice/section parser (mirror LessonParser essentials) ---- */
const PRACTICE_HEADER =
  /^(BÀI\s*TẬP\s*(TỰ\s*LUYỆN|LUYỆN\s*TẬP)|BÀI\s*TẬP\s*TL|PHẦN\s*BÀI\s*TẬP)(\s*[:：]?\s*.*)?$/i;
const EXAMPLES_HEADER =
  /^(CÁC\s*DẠNG\s*TOÁN(\s*&\s*VÍ\s*DỤ)?|DẠNG\s*TOÁN(\s*&\s*VÍ\s*DỤ)?|DẠNG\s*TOÁN\s*VÀ\s*VÍ\s*DỤ)(\s*[:：]?\s*.*)?$/i;
const THEORY_HEADER =
  /^(LÝ\s*THUYẾT\s*TRỌNG\s*TÂM|LÝ\s*THUYẾT|KIẾN\s*THỨC\s*TRỌNG\s*TÂM)(\s*[:：]?\s*.*)?$/i;

function splitSections(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const meta = {};
  let i = 0;
  while (i < lines.length) {
    const L = lines[i].trim();
    const m = L.match(/^@([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (m) {
      meta[m[1]] = m[2].trim();
      i++;
      continue;
    }
    if (!L || L.startsWith('//')) {
      i++;
      continue;
    }
    break;
  }
  let mode = 'theory';
  const theory = [];
  const examples = [];
  const practice = [];
  for (; i < lines.length; i++) {
    const raw = lines[i];
    const L = raw.trim();
    if (THEORY_HEADER.test(L)) {
      mode = 'theory';
      continue;
    }
    if (EXAMPLES_HEADER.test(L)) {
      mode = 'examples';
      continue;
    }
    if (PRACTICE_HEADER.test(L)) {
      mode = 'practice';
      continue;
    }
    if (mode === 'theory') theory.push(raw);
    else if (mode === 'examples') examples.push(raw);
    else practice.push(raw);
  }
  return {
    meta,
    theory_core: theory.join('\n').trim(),
    examples_core: examples.join('\n').trim(),
    practiceLines: practice,
  };
}

function parseOnePractice(block, idx) {
  const lines = block
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.trim() !== '---');
  if (!lines.length) return null;
  let head = lines[0].trim();
  const hm = head.match(/^Câu\s*([0-9]+[a-z]?)\s*[.:：]\s*(.*)$/i);
  if (!hm) return null;
  const id = `q_${hm[1]}`;
  let restFirst = hm[2] || '';
  const bodyLines = [restFirst, ...lines.slice(1)].filter((x) => x !== undefined);

  let hint = '';
  let explanation = '';
  let correctRaw = '';
  let placeholder = '';
  const content = [];
  for (const line of bodyLines) {
    const t = line.trim();
    if (/^Lời giải\s*[:：]?\s*/i.test(t)) {
      explanation = t.replace(/^Lời giải\s*[:：]?\s*/i, '').trim();
      continue;
    }
    if (/^Gợi ý( hướng dẫn)?\s*[:：]\s*/i.test(t)) {
      hint = t.replace(/^Gợi ý( hướng dẫn)?\s*[:：]\s*/i, '').trim();
      continue;
    }
    if (/^Đáp án\s*[:：]\s*/i.test(t)) {
      correctRaw = t.replace(/^Đáp án\s*[:：]\s*/i, '').trim();
      continue;
    }
    if (/^Placeholder\s*[:：]\s*/i.test(t)) {
      placeholder = t.replace(/^Placeholder\s*[:：]\s*/i, '').trim();
      continue;
    }
    content.push(line);
  }

  const joined = content.join('\n').trim();
  const tagTf = /\[đúng\s*sai\]/i.test(joined) || /\[đúng\s*sai\]/i.test(restFirst);
  const opts = [];
  const qLines = [];
  for (const line of content) {
    const om = line.trim().match(/^([A-D])\.\s+(.*)$/);
    if (om) opts.push(om[2]);
    else qLines.push(line);
  }
  let question = qLines.join('\n').trim().replace(/\[đúng\s*sai\]/i, '').trim();

  if (tagTf) {
    const ans = correctRaw.toLowerCase();
    const tf = /^(đúng|true|d|1)$/i.test(ans)
      ? true
      : /^(sai|false|s|0)$/i.test(ans)
        ? false
        : ans.includes('đúng')
          ? true
          : false;
    return { id, type: 'true_false', question, correctAnswer: tf, hint, explanation };
  }
  if (opts.length >= 2) {
    let idxAns = 0;
    const letter = correctRaw.trim().toUpperCase().charAt(0);
    if (/[A-D]/.test(letter)) idxAns = letter.charCodeAt(0) - 65;
    return { id, type: 'mcq', question, options: opts, correctAnswer: idxAns, hint, explanation };
  }
  if (correctRaw) {
    return {
      id,
      type: 'input',
      question,
      correctAnswer: correctRaw,
      answerPlaceholder: placeholder || 'Ví dụ: 1/2',
      hint,
      explanation,
    };
  }
  return { id, type: 'text', question: joined || question, explanation };
}

function parsePractice(practiceLines) {
  const text = practiceLines.join('\n');
  const chunks = text.split(/(?=^Câu\s+[0-9]+[a-z]?\s*[.:：])/im).filter((c) => c.trim());
  const items = [];
  chunks.forEach((c, i) => {
    const q = parseOnePractice(c.trim(), i);
    if (q) items.push(q);
  });
  return items;
}

function validate(parsed, lesson) {
  const issues = [];
  const { theory_core, examples_core, practice } = parsed;
  if (!theory_core || theory_core.length < 80) issues.push('theory_core quá ngắn');
  if (!examples_core || examples_core.length < 80) issues.push('examples_core quá ngắn');
  if (/#{3,}/.test(examples_core) || /#{3,}/.test(theory_core)) issues.push('còn ###/####');
  if (/####\s*Ví dụ/i.test(examples_core)) issues.push('còn #### Ví dụ');
  if (practice.length < lesson.minPractice) issues.push(`practice ${practice.length} < ${lesson.minPractice}`);
  const types = {};
  let bundled = 0;
  let textOnly = 0;
  for (const q of practice) {
    types[q.type] = (types[q.type] || 0) + 1;
    if (q.type === 'text') textOnly++;
    const qt = q.question || '';
    if (/\ba\)/.test(qt) && /\bb\)/.test(qt) && q.type === 'input') bundled++;
  }
  if (!types.mcq) issues.push('thiếu mcq');
  if (!types.input) issues.push('thiếu input');
  if (textOnly > practice.length * 0.3) issues.push(`quá nhiều type text (${textOnly})`);
  if (bundled) issues.push(`còn ${bundled} câu input gộp a/b`);
  return { ok: issues.length === 0, issues, types, count: practice.length };
}

const APPLY = process.argv.includes('--apply');
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];

const app = initializeApp({
  apiKey: 'AIzaSyBdQ11EDhwa46SdlrAHK71_7wEPja7ZqIM',
  authDomain: 'thayphatdaytoan-7832c.firebaseapp.com',
  projectId: 'thayphatdaytoan-7832c',
  storageBucket: 'thayphatdaytoan-7832c.firebasestorage.app',
  messagingSenderId: '249059029216',
  appId: '1:249059029216:web:2228f7c78483628e0ba085',
});
const auth = getAuth(app);
const db = getFirestore(app);
await signInAnonymously(auth);

const results = [];

for (const lesson of LESSONS) {
  if (ONLY && ONLY !== lesson.key && ONLY !== lesson.lesson_no) continue;
  console.error(`[${lesson.key}] generating...`);
  let rewritten = null;
  let parsed = null;
  let val = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const raw = await geminiGenerate(buildPrompt(lesson) + (attempt > 1 ? `\n\nLần trước lỗi: ${(val?.issues || []).join('; ')}. Hãy sửa đúng.` : ''));
    rewritten = postNormalize(stripCodeFence(raw));
    const sections = splitSections(rewritten);
    const practice = parsePractice(sections.practiceLines);
    parsed = {
      meta: {
        grade_level: '8',
        chapter: '2',
        lesson_no: lesson.lesson_no,
        title: lesson.title,
        focus_keyword: sections.meta.focus_keyword || '',
        keywords: sections.meta.keywords || '',
        seo_description: sections.meta.seo_description || '',
      },
      theory_core: sections.theory_core,
      examples_core: sections.examples_core,
      practice,
      examples: [],
    };
    val = validate(parsed, lesson);
    console.error(`[${lesson.key}] attempt ${attempt}:`, val);
    if (val.ok) break;
  }

  const outPath = join(BASE, lesson.folder, 'output', lesson.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, rewritten, 'utf8');
  writeFileSync(join(BASE, lesson.folder, 'output', lesson.out.replace('.txt', '.parsed.json')), JSON.stringify({ ...parsed, validation: val }, null, 2));

  let firestore = 'SKIPPED';
  let lessonId = lesson.id || null;
  if (APPLY && val.ok) {
    const slug = `toan-8-chuong-2-bai-${String(lesson.lesson_no).toLowerCase()}-${lesson.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80)}`;
    const nextContent = {
      meta: parsed.meta,
      theory_core: parsed.theory_core,
      examples_core: parsed.examples_core,
      practice: parsed.practice,
      examples: [],
      seo_description: parsed.meta.seo_description || '',
    };
    const payload = {
      content: JSON.stringify(nextContent),
      title: lesson.title,
      grade_level: '8',
      chapter: '2',
      lesson_no: String(lesson.lesson_no),
      description: parsed.meta.seo_description || '',
      slug,
      is_topic: false,
      videoUrl: '',
      videoMaterialUrl: '',
      pdfUrl: '',
      slidesUrl: '',
      topic_id: '',
      topic_name: '',
      timestamp: Date.now(),
    };
    // find existing by grade+chapter+lesson_no+title match
    const qy = query(
      collection(db, 'math_lessons_v2'),
      where('grade_level', '==', '8'),
      where('chapter', '==', '2'),
    );
    const existing = await getDocs(qy);
    let found = null;
    for (const d of existing.docs) {
      const x = d.data();
      if (String(x.lesson_no) === String(lesson.lesson_no) && String(x.title) === lesson.title) {
        found = d.id;
        break;
      }
    }
    if (found) {
      await updateDoc(doc(db, 'math_lessons_v2', found), payload);
      lessonId = found;
      firestore = 'UPDATED';
    } else {
      const ref = await addDoc(collection(db, 'math_lessons_v2'), payload);
      lessonId = ref.id;
      firestore = 'CREATED';
    }
  } else if (APPLY && !val.ok) {
    firestore = 'NOT_UPDATED_INVALID';
  }

  results.push({
    key: lesson.key,
    id: lessonId,
    validation: val,
    firestore,
    out: outPath,
  });
}

writeFileSync('/tmp/create-toan8-chuong2-results.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
process.exit(results.every((r) => r.validation.ok) ? 0 : 2);
