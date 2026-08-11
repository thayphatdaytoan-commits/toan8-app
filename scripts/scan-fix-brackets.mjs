import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { writeFileSync } from 'fs';

const firebaseConfig = {
  apiKey: 'AIzaSyBdQ11EDhwa46SdlrAHK71_7wEPja7ZqIM',
  authDomain: 'thayphatdaytoan-7832c.firebaseapp.com',
  databaseURL: 'https://thayphatdaytoan-7832c-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'thayphatdaytoan-7832c',
  storageBucket: 'thayphatdaytoan-7832c.firebasestorage.app',
  messagingSenderId: '249059029216',
  appId: '1:249059029216:web:2228f7c78483628e0ba085',
  measurementId: 'G-M1XZTB1SEY',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/** Đếm wrapper lỗi: $[{...}]$ hoặc $[...]$ (kể cả khi trong có \\sqrt[3]). */
function countBadWrappers(s) {
  if (typeof s !== 'string') return 0;
  let n = 0;
  let i = 0;
  while (i < s.length) {
    if (s.startsWith('$[{', i)) {
      n++;
      i += 3;
      continue;
    }
    if (s.startsWith('$[', i)) {
      n++;
      i += 2;
      continue;
    }
    i++;
  }
  return n;
}

/**
 * Chuẩn hóa:
 *   $[{inner}]$ → $inner$
 *   $[inner]$   → $inner$
 * Hỗ trợ inner chứa ] như \\sqrt[3]{...}.
 */
function fixMathBrackets(s) {
  if (typeof s !== 'string' || !s.includes('$[')) return { text: s, changed: false, count: 0 };
  let out = '';
  let i = 0;
  let count = 0;
  while (i < s.length) {
    if (s.startsWith('$[{', i)) {
      const start = i + 3;
      let j = start;
      let depth = 1;
      let done = false;
      while (j < s.length) {
        const ch = s[j];
        if (ch === '{') depth += 1;
        else if (ch === '}') {
          depth -= 1;
          if (depth === 0 && s.startsWith('}]$', j)) {
            out += `$${s.slice(start, j)}$`;
            i = j + 3;
            count += 1;
            done = true;
            break;
          }
        }
        j += 1;
      }
      if (!done) {
        out += s[i];
        i += 1;
      }
      continue;
    }
    if (s.startsWith('$[', i)) {
      const start = i + 2;
      let j = start;
      let done = false;
      while (j < s.length) {
        if (s.startsWith(']$', j)) {
          out += `$${s.slice(start, j)}$`;
          i = j + 2;
          count += 1;
          done = true;
          break;
        }
        // tránh nuốt quá dài nếu không có đóng
        if (s[j] === '\n' && j - start > 500) break;
        j += 1;
      }
      if (!done) {
        out += s[i];
        i += 1;
      }
      continue;
    }
    out += s[i];
    i += 1;
  }
  return { text: out, changed: out !== s, count };
}

function walk(value, path = '') {
  if (typeof value === 'string') {
    const r = fixMathBrackets(value);
    if (r.changed) {
      return {
        value: r.text,
        changed: true,
        count: r.count,
        samples: [`${path}: fixed ${r.count}; beforeBad=${countBadWrappers(value)} afterBad=${countBadWrappers(r.text)}`],
      };
    }
    return { value, changed: false, count: 0, samples: [] };
  }
  if (Array.isArray(value)) {
    const samples = [];
    let changed = false;
    let count = 0;
    const next = value.map((item, idx) => {
      const r = walk(item, `${path}[${idx}]`);
      if (r.changed) {
        changed = true;
        count += r.count;
        samples.push(...r.samples.slice(0, 2));
      }
      return r.value;
    });
    return { value: next, changed, count, samples };
  }
  if (value && typeof value === 'object') {
    const samples = [];
    let changed = false;
    let count = 0;
    const next = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === 'updatedAt' || k === 'createdAt') {
        next[k] = v;
        continue;
      }
      const r = walk(v, path ? `${path}.${k}` : k);
      next[k] = r.value;
      if (r.changed) {
        changed = true;
        count += r.count;
        samples.push(...r.samples.slice(0, 2));
      }
    }
    return { value: next, changed, count, samples };
  }
  return { value, changed: false, count: 0, samples: [] };
}

function stripUndefined(obj) {
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out;
  }
  return obj;
}

const APPLY = process.argv.includes('--apply');
const GRADE = process.argv.includes('--all-grades')
  ? null
  : Number(process.argv.find((a) => a.startsWith('--grade='))?.split('=')[1] || '9');
const CHAPTER = process.argv.includes('--all-chapters')
  ? null
  : Number(process.argv.find((a) => a.startsWith('--chapter='))?.split('=')[1] || '3');

await signInAnonymously(auth);
const snap = await getDocs(collection(db, 'math_lessons_v2'));
const results = [];

for (const d of snap.docs) {
  const data = d.data();
  const grade = Number(data.grade_level ?? data.grade ?? data.lop);
  const chapter = Number(data.chapter ?? data.chuong);
  if (GRADE != null && grade !== GRADE) continue;
  if (CHAPTER != null && chapter !== CHAPTER) continue;

  const beforeBad = countBadWrappers(JSON.stringify(data));
  const walked = walk(data);
  const status = !walked.changed
    ? beforeBad > 0
      ? 'STILL_BAD'
      : 'CLEAN'
    : APPLY
      ? 'UPDATED'
      : 'NEEDS_FIX';

  if (walked.changed && APPLY) {
    const payload = stripUndefined(walked.value);
    delete payload.id;
    await updateDoc(doc(db, 'math_lessons_v2', d.id), payload);
  }

  const afterBad = walked.changed
    ? countBadWrappers(JSON.stringify(walked.value))
    : beforeBad;

  results.push({
    id: d.id,
    title: data.title || data.name || '',
    grade,
    chapter,
    lesson: data.lesson_no ?? data.lesson ?? data.bai ?? data.order,
    status,
    beforeBad,
    afterBad,
    fixedWrappers: walked.count,
    samples: walked.samples.slice(0, 3),
  });
}

results.sort((a, b) => String(a.lesson).localeCompare(String(b.lesson), undefined, { numeric: true }));
writeFileSync('/tmp/bracket-scan-results.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify({ apply: APPLY, grade: GRADE, chapter: CHAPTER, count: results.length, results }, null, 2));
process.exit(0);
