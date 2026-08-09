/**
 * Chuẩn hóa lại Toán 8 Chương I theo quy tắc định dạng mới:
 * - Không #### / ### quanh Ví dụ
 * - Practice đa dạng (mcq / input / true_false)
 * - Tách ý a)b)c) thành câu riêng
 * - Đáp án ngay dưới mỗi câu (không mục ĐÁP ÁN riêng)
 * - LaTeX $...$
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';

const ROOT = '/workspace';
const BASE = join(ROOT, 'tai-lieu-dang-web/Toán 8/Bài Giảng/CHƯƠNG I. ĐA THỨC');
const SAMPLE = readFileSync(join(ROOT, 'docs/mau-import-bai-giang-BAT-BUOC.txt'), 'utf8').slice(0, 9000);

const LESSONS = [
  {
    key: 'bai1',
    id: 'v2QeUjIMBd1SZGKzFvZ1',
    folder: 'Bài 1. Đơn thức',
    out: 'Bai-1-import.txt',
    lesson_no: '1',
    title: 'Đơn thức',
    minPractice: 12,
    hasSource: true,
  },
  {
    key: 'bai2',
    id: 'khCU7nk2DGE8KuOjZecy',
    folder: 'Bài 2. Đa thức',
    out: 'Bai-2-import.txt',
    lesson_no: '2',
    title: 'Đa thức',
    minPractice: 12,
    hasSource: true,
  },
  {
    key: 'bai3',
    id: 'IsLzs3WwZRZpjBTibRFa',
    folder: 'Bài 3. Phép cộng và phép trừ đa thức',
    out: 'Bai-3-import.txt',
    lesson_no: '3',
    title: 'Phép cộng và phép trừ đa thức',
    minPractice: 12,
    hasSource: true,
  },
  {
    key: 'bai4',
    id: 'tGZoE6Rb2uNu5RGOaLJv',
    folder: 'Bài 4. Phép nhân đa thức',
    out: 'Bai-4-import.txt',
    lesson_no: '4',
    title: 'Phép nhân đa thức',
    minPractice: 12,
    hasSource: true,
  },
  {
    key: 'bai5',
    id: 'lHuuoNRojgCEBTkv0xU0',
    folder: 'Bài 5. Phép chia đa thức cho đơn thức',
    out: 'Bai-5-import.txt',
    lesson_no: '5',
    title: 'Phép chia đa thức cho đơn thức',
    minPractice: 12,
    hasSource: true,
  },
  {
    key: 'ot',
    id: 'tTaXDQPCJrBUH13iqYjd',
    folder: 'ÔN TẬP CHƯƠNG I',
    out: 'On-tap-chuong-I-import.txt',
    lesson_no: 'OT1',
    title: 'Ôn tập chương I – Đa thức',
    minPractice: 20,
    hasSource: false,
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

function buildPrompt(lesson, oldText) {
  const minP = lesson.minPractice;
  return `Bạn là biên tập viên soạn file IMPORT bài giảng Toán cho website thayphatdaytoan.
Hãy VIẾT LẠI TOÀN BỘ file import TXT dưới đây cho đúng 100% quy tắc mẫu.

BÀI: Toán 8 — Chương 1 — ${lesson.title} (lesson_no=${lesson.lesson_no})
YÊU CẦU BẮT BUỘC:
1) Giữ đúng meta:
@grade_level: 8
@chapter: 1
@lesson_no: ${lesson.lesson_no}
@title: ${lesson.title}
(và các @focus_keyword/@keywords/@seo_description hợp lý)

2) Cấu trúc mục đúng thứ tự, tiêu đề dòng đơn (KHÔNG dùng ###/####):
LÝ THUYẾT TRỌNG TÂM
CÁC DẠNG TOÁN & VÍ DỤ
BÀI TẬP LUYỆN TẬP

3) Trong CÁC DẠNG TOÁN:
- Dạng 1: ... / Phương pháp: ... / Ví dụ 1: ... / Lời giải: ...
- Viết "Ví dụ 1:", "Ví dụ 2:" — CẤM "#### Ví dụ 5.1:"
- Mỗi dạng ≥ 2 ví dụ có lời giải
- Có khoảng 4–5 dạng toán phù hợp bài

4) BÀI TẬP LUYỆN TẬP (≥ ${minP} câu), ĐA DẠNG, mỗi câu chấm được:
- Khoảng 40% trắc nghiệm:
  Câu n. <đề>
  A. ...
  B. ...
  C. ...
  D. ...
  Đáp án: B
  Lời giải: ...
- Khoảng 40% điền đáp án (mỗi ý một câu riêng):
  Câu n. Tính ... / Xác định hệ số của ...
  Đáp án: <giá trị>
  Placeholder: ...
  Lời giải: ...
- Khoảng 20% đúng/sai:
  Câu n. [đúng sai]
  <mệnh đề>
  Đáp án: Đúng
  Lời giải: ...
- CẤM gộp a) b) c) trong MỘT câu điền đáp án. Phải tách:
  Câu 3a. ... Đáp án: ...
  Câu 3b. ... Đáp án: ...
- CẤM mục "ĐÁP ÁN/HƯỚNG DẪN" riêng ở cuối — Đáp án nằm ngay dưới từng câu.
- Ngăn câu bằng dòng ---
- Công thức chỉ $...$ hoặc $$...$$ — không $[{...}]$

5) Giữ nội dung toán học đúng SGK Toán 8 Chương I (đa thức), dựa trên bản cũ bên dưới (sửa format, bổ sung loại câu thiếu).
6) Chỉ xuất ra file TXT thuần, không giải thích, không bọc \`\`\`.

===== MẪU QUY TẮC (tham khảo) =====
${SAMPLE}

===== BẢN CŨ CẦN VIẾT LẠI =====
${oldText.slice(0, 14000)}
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
  const inPath = join(BASE, lesson.folder, 'output', lesson.out);
  const oldText = readFileSync(inPath, 'utf8');
  console.error(`[${lesson.key}] generating...`);
  let rewritten = null;
  let parsed = null;
  let val = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const raw = await geminiGenerate(buildPrompt(lesson, oldText) + (attempt > 1 ? `\n\nLần trước lỗi: ${(val?.issues || []).join('; ')}. Hãy sửa đúng.` : ''));
    rewritten = postNormalize(stripCodeFence(raw));
    const sections = splitSections(rewritten);
    const practice = parsePractice(sections.practiceLines);
    parsed = {
      meta: {
        grade_level: '8',
        chapter: '1',
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
  if (APPLY && val.ok) {
    const snap = await getDoc(doc(db, 'math_lessons_v2', lesson.id));
    const prev = snap.data() || {};
    let prevContent = {};
    try {
      prevContent = JSON.parse(prev.content || '{}');
    } catch {}
    const nextContent = {
      ...prevContent,
      meta: parsed.meta,
      theory_core: parsed.theory_core,
      examples_core: parsed.examples_core,
      practice: parsed.practice,
      examples: [],
    };
    // keep seo fields if parser had them
    if (parsed.meta.seo_description) nextContent.seo_description = parsed.meta.seo_description;
    await updateDoc(doc(db, 'math_lessons_v2', lesson.id), {
      content: JSON.stringify(nextContent),
      title: lesson.title,
      grade_level: '8',
      chapter: '1',
      lesson_no: String(lesson.lesson_no),
      description: parsed.meta.seo_description || prev.description || '',
      timestamp: Date.now(),
    });
    firestore = 'UPDATED';
  } else if (APPLY && !val.ok) {
    firestore = 'NOT_UPDATED_INVALID';
  }

  results.push({
    key: lesson.key,
    id: lesson.id,
    validation: val,
    firestore,
    out: outPath,
  });
}

writeFileSync('/tmp/rewrite-toan8-chuong1-results.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
process.exit(results.every((r) => r.validation.ok) ? 0 : 2);
