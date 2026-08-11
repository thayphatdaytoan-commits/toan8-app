/* eslint-disable */
import { parsePracticeImportText } from './LessonParser';
import {
  isInteractivePracticeType,
  preparePracticeQuestion,
  normalizeTrueFalseAnswer,
  normalizePracticeTfItems,
  normalizeInputAnswerParts,
  normalizeMcqCorrectIndex,
  parseOrderingItems,
  parseDragSlots,
  normalizeFillBlanksQuestion,
} from './practiceQuestionTypes';
import { extractDangNumber } from './theoryCoreRichText';

/** @deprecated Giữ tương thích — hệ thống luôn tự nhận classic/interactive từng ví dụ. */
export const EXAMPLES_DISPLAY_MODES = {
  classic: 'classic',
  interactive: 'interactive',
  auto: 'auto',
};

/** @deprecated Luôn dùng chế độ tự nhận diện. */
export function resolveExamplesDisplayMode(_raw) {
  return 'auto';
}

export const LESSON_DANG_COMPLETE_EXP = 45;

const VIDU_START_RE =
  /^(?:#\[\s*)?(Ví\s*dụ(?:\s*\d+(?:\.\d+)*)?|Bài(?:\s*\d+(?:\.\d+)*)?)\s*[:.\-—]?\s*(.*)$/i;
/** Khớp “Lời giải” / “Lời giải:” / “Lời giải Chọn B” (Word hay bỏ dấu :). */
const LOI_GIAI_START_RE =
  /^(?:#\[\s*)?(Lời\s*giải|Loi\s*giai)(?:\s*[:.\-—]\s*|\s+)(.*)$/i;
const LOI_GIAI_BARE_RE = /^(?:#\[\s*)?(Lời\s*giải|Loi\s*giai)\s*(?:\]#)?$/i;

export function lessonDangProgressDocId(studentName, lessonId, sectionKey = '0') {
  const safeName = String(studentName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/gi, '_')
    .slice(0, 48);
  const lid = String(lessonId || '').replace(/[/\\]/g, '_').slice(0, 64);
  const sk = String(sectionKey ?? '0').replace(/[/\\]/g, '_').slice(0, 24);
  return ('lesson_dang_prog_' + safeName + '_' + lid + '_s' + sk).slice(0, 750);
}

export function lessonDangCompleteExpDocId(studentName, lessonId, sectionKey = '0') {
  const safeName = String(studentName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/gi, '_')
    .slice(0, 48);
  const lid = String(lessonId || '').replace(/[/\\]/g, '_').slice(0, 64);
  const sk = String(sectionKey ?? '0').replace(/[/\\]/g, '_').slice(0, 24);
  return ('lesson_dang_exp_' + safeName + '_' + lid + '_s' + sk).slice(0, 750);
}

export function findLessonDangProgress(scoresList, studentName, lessonId, sectionKey = '0') {
  const docId = lessonDangProgressDocId(studentName, lessonId, sectionKey);
  const me = String(studentName || '').trim().toLowerCase();
  if (!me || !lessonId) return null;
  const row = (scoresList || []).find((s) => {
    if (String(s?.kind || '') !== 'lesson_dang_progress') return false;
    if (String(s?.quizId || '') === docId) return true;
    if (String(s?.id || '') === docId) return true;
    return false;
  });
  if (!row) return null;
  const completedByDang =
    row.completed_by_dang && typeof row.completed_by_dang === 'object' ? row.completed_by_dang : {};
  const clean = {};
  for (const [k, v] of Object.entries(completedByDang)) {
    clean[String(k)] = Array.isArray(v) ? v.map(String) : [];
  }
  return {
    unlockedDangIndex: Math.max(0, Number(row.unlocked_dang_index) || 0),
    completedByDang: clean,
    allComplete: Boolean(row.all_complete),
    updatedAt: Number(row.updated_at) || Number(row.timestamp) || 0,
  };
}

function normName(s) {
  return String(s || '')
    .trim()
    .toLowerCase();
}

/** Đã nộp bài tập luyện tập ít nhất 1 lần cho bài giảng này. */
export function hasLessonPracticeAttempt(scoresList, studentName, lessonId) {
  const me = normName(studentName);
  const lid = String(lessonId || '').trim();
  if (!me || !lid) return false;
  const qid = `lesson_practice_${lid}`;
  return (scoresList || []).some((s) => {
    if (normName(s?.name) !== me) return false;
    const kind = String(s?.kind || '').trim();
    const id = String(s?.quizId || '');
    if (kind === 'lesson_practice' && (id === qid || id.startsWith(qid))) return true;
    if (id === qid) return true;
    return false;
  });
}

/** Đã hoàn thành hết dạng toán ít nhất một lần (bất kỳ mục con) trong bài giảng. */
export function hasLessonDangCompleteOnce(scoresList, studentName, lessonId) {
  const me = normName(studentName);
  const lid = String(lessonId || '').trim();
  if (!me || !lid) return false;
  return (scoresList || []).some((s) => {
    if (String(s?.kind || '') !== 'lesson_dang_progress') return false;
    if (!s?.all_complete) return false;
    if (normName(s?.name) !== me) return false;
    return String(s?.lessonId || '') === lid;
  });
}

/**
 * Khoá lộ trình lần đầu (học sinh đã đăng nhập):
 * dạng tuần tự → luyện tập → đề luyện tập.
 * Sau khi hoàn thành 1 lượt (dạng xong + đã nộp luyện tập nếu có) → free roam.
 */
export function getLessonPathGates({
  studentName,
  previewEmbed,
  hasDangContent,
  dangAllComplete,
  lessonDangCompleteOnce,
  practiceCount,
  practiceDone,
}) {
  const enforce = Boolean(String(studentName || '').trim()) && !previewEmbed;
  if (!enforce) {
    return {
      enforce: false,
      freeRoam: true,
      practiceLocked: false,
      papersLocked: false,
      unlockAllDang: true,
      practiceLockReason: '',
      papersLockReason: '',
    };
  }
  const dangOk =
    !hasDangContent || Boolean(dangAllComplete) || Boolean(lessonDangCompleteOnce);
  const practiceOk = !(Number(practiceCount) > 0) || Boolean(practiceDone);
  const freeRoam = dangOk && practiceOk;
  const practiceLocked = !dangOk;
  const papersLocked = !dangOk || !practiceOk;
  return {
    enforce: true,
    freeRoam,
    practiceLocked,
    papersLocked,
    /** Trong lần đầu vẫn tuần tự; sau khi xong hết dạng (hoặc free roam) mở hết tab dạng. */
    unlockAllDang: Boolean(dangAllComplete) || freeRoam,
    practiceLockReason: practiceLocked
      ? 'Hãy hoàn thành tất cả các dạng toán (đánh dấu đã học từng ví dụ) trước khi làm bài tập luyện tập.'
      : '',
    papersLockReason: papersLocked
      ? !dangOk
        ? 'Hoàn thành các dạng toán trước, rồi làm bài tập luyện tập để mở đề luyện tập.'
        : 'Hãy nộp bài tập luyện tập ít nhất một lần để mở đề luyện tập.'
      : '',
  };
}

/** Đổi #[Ví dụ… / Lời giải…]# (và biến thể lỗi) về plain text để parse giống bài tập. */
export function unwrapExampleHashBoxes(raw) {
  let s = String(raw || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const labelGroup =
    '(Ví\\s*dụ(?:\\s*\\d+(?:\\.\\d+)*)?|Bài(?:\\s*\\d+(?:\\.\\d+)*)?|Lời\\s*giải|Loi\\s*giai|Phương\\s*pháp)';
  const reHash = new RegExp(`#\\[\\s*${labelGroup}\\s*:\\s*([\\s\\S]*?)\\]#`, 'gi');
  const reTypo = new RegExp(`#\\[\\s*${labelGroup}\\s*:\\s*([\\s\\S]*?)#\\]`, 'gi');
  const replaceOne = (_full, label, inner) => {
    const lab = String(label || '').trim();
    const body = String(inner || '').trim();
    if (/^(lời\s*giải|loi\s*giai)$/i.test(lab)) return `\nLời giải\n${body}\n`;
    if (/^phương\s*pháp$/i.test(lab)) return `\nPhương pháp:\n${body}\n`;
    return `\n${lab}.\n${body}\n`;
  };
  s = s.replace(reHash, replaceOne);
  s = s.replace(reTypo, replaceOne);
  // Dọn marker sót lại
  s = s.replace(/^\s*#\[\s*/gm, '');
  s = s.replace(/\s*\]#\s*$/gm, '');
  s = s.replace(/^\s*\]#\s*/gm, '');
  s = s.replace(/\s*#\]\s*$/gm, '');
  return s.replace(/\n{3,}/g, '\n\n').trim();
}

function stripResidualHashMarkers(text) {
  return String(text || '')
    .replace(/^\s*#\[\s*/gm, '')
    .replace(/\s*\]#\s*$/gm, '')
    .replace(/^\s*\]#\s*/gm, '')
    .replace(/\s*#\]\s*$/gm, '')
    .trim();
}

function splitStemAndSolution(body) {
  const lines = String(body || '').split('\n');
  let solIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (LOI_GIAI_BARE_RE.test(t) || LOI_GIAI_START_RE.test(t)) {
      solIdx = i;
      break;
    }
  }
  if (solIdx < 0) {
    return { stem: stripResidualHashMarkers(body), solution: '' };
  }
  const t0 = lines[solIdx].trim();
  const solParts = [];
  const mBare = t0.match(LOI_GIAI_BARE_RE);
  const mStart = t0.match(LOI_GIAI_START_RE);
  if (!mBare && mStart && mStart[2]) solParts.push(mStart[2]);
  solParts.push(...lines.slice(solIdx + 1));
  return {
    stem: stripResidualHashMarkers(lines.slice(0, solIdx).join('\n')),
    solution: stripResidualHashMarkers(solParts.join('\n')),
  };
}

export function splitViduBlocksFromContent(content) {
  const text = unwrapExampleHashBoxes(content);
  if (!text) return [];
  const lines = text.split('\n');
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].trim().match(VIDU_START_RE);
    if (!m) continue;
    hits.push({
      index: i,
      label: String(m[1] || 'Ví dụ').trim(),
      rest: stripResidualHashMarkers(String(m[2] || '')),
    });
  }
  if (hits.length === 0) {
    const { stem, solution } = splitStemAndSolution(text);
    return [{ id: 'vidu_0', label: 'Ví dụ', stem: stem || text, solution }];
  }
  return hits.map((hit, hi) => {
    const start = hit.index + 1;
    const end = hi + 1 < hits.length ? hits[hi + 1].index : lines.length;
    const bodyLines = [];
    if (hit.rest) bodyLines.push(hit.rest);
    bodyLines.push(...lines.slice(start, end));
    const body = bodyLines.join('\n').trim();
    const { stem, solution } = splitStemAndSolution(body);
    return { id: 'vidu_' + hi, label: hit.label, stem: stem || body, solution };
  });
}

function tryParseInlineMcq(stem, solution) {
  const text = String(stem || '');
  const re =
    /(?:^|(?<=[\s\t])|(?<=[\$\)\]\}]))(?:__\s*([A-D])\s*[\.\):\-]\s*__|__\s*([A-D])\s*__\s*[\.\):\-]|__\s*([A-D])\s*[\.\):\-]|([A-D])\s*[\.\):\-])/g;
  const starts = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const letter = String(m[1] || m[2] || m[3] || m[4] || '').toUpperCase();
    if (!letter) continue;
    starts.push({
      index: m.index,
      endLabel: m.index + m[0].length,
      letter,
      underlined: Boolean(m[1] || m[2] || m[3]),
    });
  }
  if (starts.length < 2) return null;
  const firstOpt = starts[0].index;
  const question = text.slice(0, firstOpt).trim();
  const options = ['', '', '', ''];
  let correct = -1;
  for (let i = 0; i < starts.length; i++) {
    const cur = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1].index : text.length;
    const raw = text.slice(cur.endLabel, end).trim().replace(/__/g, '').trim();
    const idx = { A: 0, B: 1, C: 2, D: 3 }[cur.letter];
    if (idx == null) continue;
    options[idx] = raw;
    if (cur.underlined || /__/.test(text.slice(cur.index, end))) correct = idx;
  }
  const realOpts = options.filter((o) => String(o || '').trim() && !/^\.{2,}$/.test(String(o).trim()));
  if (realOpts.length < 2) return null;
  if (correct < 0) {
    const da = String(solution || '').match(/(?:đáp\s*án|dap\s*an|chọn)\s*[:：]?\s*([A-D])/i);
    if (da) correct = { A: 0, B: 1, C: 2, D: 3 }[da[1].toUpperCase()] ?? -1;
  }
  if (correct < 0) return null;
  return { question: question || text, options, correctAnswer: correct };
}

function tryParseShortAnswer(stem, solution) {
  const lines = String(stem || '').split('\n');
  let ansLine = -1;
  let answer = '';
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i]
      .trim()
      .match(/^(?:đáp\s*án|dap\s*an|đáp\s*số|trả\s*lời|tra\s*loi)\s*[:：\-]\s*(.+)$/i);
    if (m) {
      ansLine = i;
      answer = m[1].trim();
      break;
    }
  }
  if (!answer) {
    const m2 = String(solution || '')
      .trim()
      .match(/(?:^|\n)\s*(?:đáp\s*án|dap\s*an|đáp\s*số|trả\s*lời|tra\s*loi)\s*[:：\-]\s*(.+)$/im);
    if (m2) answer = m2[1].trim().split('\n')[0].trim();
  }
  if (!answer) return null;
  if (/^[A-D]$/i.test(answer) && tryParseInlineMcq(stem, solution)) return null;
  const question = ansLine >= 0 ? lines.slice(0, ansLine).join('\n').trim() : String(stem || '').trim();
  if (!question) return null;
  return { question, answer };
}

function buildPracticeBlobFromVidu(stem, solution) {
  const parts = [];
  const s = String(stem || '').trim();
  const sol = String(solution || '').trim();
  if (s) parts.push(s);
  if (sol) {
    if (!/^(lời\s*giải|loi\s*giai)\b/i.test(sol)) parts.push('Lời giải');
    parts.push(sol);
  }
  let blob = parts.join('\n').trim();
  if (!blob) return '';
  if (!/^Câu\s*\d+/im.test(blob) && !/^\s*§/m.test(blob)) {
    blob = `Câu 1.\n${blob}`;
  }
  return blob;
}

export function isUsableInteractivePracticeQuestion(q) {
  if (!q || !isInteractivePracticeType(q.type)) return false;
  const t = q.type;
  if (t === 'mcq') {
    const opts = Array.isArray(q.options)
      ? q.options.filter((o) => String(o ?? '').trim() && !/^\.{2,}$/.test(String(o).trim()))
      : [];
    const ans = normalizeMcqCorrectIndex(q.correctAnswer, (q.options || []).length || 4);
    return opts.length >= 2 && ans >= 0;
  }
  if (t === 'input') {
    const parts = normalizeInputAnswerParts({
      ...q,
      correctAnswer: q.correctAnswer ?? q.shortCorrect,
    });
    return parts.some((p) => String(p.correctAnswer || '').trim());
  }
  if (t === 'true_false') {
    return normalizeTrueFalseAnswer(q.correctAnswer) != null;
  }
  if (t === 'true_false_group') {
    const items = normalizePracticeTfItems(q.tfItems);
    return (
      items.length >= 2 &&
      items.filter((it) => (it.text || '').trim()).length >= 2 &&
      items.every((it) => typeof it.correct === 'boolean')
    );
  }
  if (t === 'ordering') {
    return parseOrderingItems(q.items).length >= 2;
  }
  if (t === 'drag_drop') {
    return parseDragSlots(q.slots).length >= 1;
  }
  if (t === 'fill_blanks') {
    const fb = normalizeFillBlanksQuestion(q);
    return Array.isArray(fb.blanks) && fb.blanks.length >= 1;
  }
  return false;
}

export function viduBlockToInteractiveQuestion(block, opts = {}) {
  const dangIndex = opts.dangIndex || 0;
  const exampleIndex = opts.exampleIndex || 0;
  const id = 'dang' + dangIndex + '_' + (block.id || 'v' + exampleIndex);
  const stem = stripResidualHashMarkers(block.stem || '');
  const solution = stripResidualHashMarkers(block.solution || '');

  const practiceBlob = buildPracticeBlobFromVidu(stem, solution);
  let parsed = [];
  try {
    parsed = practiceBlob ? parsePracticeImportText(practiceBlob) : [];
  } catch {
    parsed = [];
  }

  const candidates = Array.isArray(parsed) ? parsed : [];
  const hit = candidates.find((p) => isUsableInteractivePracticeQuestion(p));
  if (hit) {
    const base = preparePracticeQuestion({
      ...hit,
      id,
      explanation: hit.explanation || solution,
      correctAnswer: hit.correctAnswer ?? hit.shortCorrect,
    });
    return { ...base, id, _viduLabel: block.label, _mode: 'interactive' };
  }

  const mcq = tryParseInlineMcq(stem, solution);
  if (mcq) {
    return {
      id,
      type: 'mcq',
      question: mcq.question,
      options: mcq.options,
      correctAnswer: mcq.correctAnswer,
      explanation: solution,
      _viduLabel: block.label,
      _mode: 'interactive',
    };
  }
  const short = tryParseShortAnswer(stem, solution);
  if (short) {
    return {
      id,
      type: 'input',
      question: short.question,
      correctAnswer: short.answer,
      shortCorrect: short.answer,
      answerPlaceholder: 'Nhập đáp án...',
      explanation: solution,
      _viduLabel: block.label,
      _mode: 'interactive',
    };
  }
  return {
    id,
    type: 'reveal',
    question: stem,
    explanation: solution,
    _viduLabel: block.label,
    _mode: 'reveal',
  };
}

/**
 * Mỗi ví dụ: interactive (có đáp án/loại câu) hoặc classic (chỉ Lời giải — khung như cũ).
 */
export function buildAutoExamplesForDang(group, dangIndex) {
  const blocks = splitViduBlocksFromContent(group?.content || '');
  const dangNo = extractDangNumber(group?.dangLabel || group?.dangTitle, dangIndex);
  return blocks.map((b, i) => {
    const badge = dangNo != null ? 'Ví dụ ' + dangNo + '.' + (i + 1) : b.label || 'Ví dụ ' + (i + 1);
    const q = viduBlockToInteractiveQuestion(b, { dangIndex, exampleIndex: i });
    if (q._mode === 'interactive' && isUsableInteractivePracticeQuestion(q)) {
      return {
        kind: 'interactive',
        id: q.id,
        badge,
        q: { ...q, _viduBadge: badge, _viduIndex: i },
      };
    }
    const stem = stripResidualHashMarkers(b.stem || '');
    const solution = stripResidualHashMarkers(b.solution || '');
    const sourceText = [badge + (stem ? `. ${stem}` : '.'), solution ? `Lời giải\n${solution}` : '']
      .filter(Boolean)
      .join('\n');
    return {
      kind: 'classic',
      id: q.id || b.id || 'vidu_' + i,
      badge,
      stem,
      solution,
      sourceText,
    };
  });
}

/** @deprecated Dùng buildAutoExamplesForDang */
export function buildInteractiveQuestionsForDang(group, dangIndex) {
  return buildAutoExamplesForDang(group, dangIndex)
    .filter((x) => x.kind === 'interactive')
    .map((x) => x.q);
}

export function dangTabLabel(group, index) {
  const raw = String(group?.dangLabel || '').trim();
  if (/^dạng\s*\d+/i.test(raw)) return raw;
  const n = extractDangNumber(group?.dangLabel || group?.dangTitle, index);
  return n != null ? 'Dạng ' + n : 'Dạng ' + (index + 1);
}
