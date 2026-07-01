/**
 * So khớp đáp án điền — bỏ qua khoảng trắng, chuẩn hoá dấu câu (vd M(5;25) vs M(5; 25)).
 */

function tightenAroundPunctuation(s) {
  let t = String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\u2212/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ');
  for (let i = 0; i < 8; i++) {
    const n = t
      .replace(/\s*\(\s*/g, '(')
      .replace(/\s*\)\s*/g, ')')
      .replace(/\s*;\s*/g, ';')
      .replace(/\s*,\s*/g, ',');
    if (n === t) break;
    t = n;
  }
  return t.replace(/\s/g, '');
}

/** Chỉ số thập phân dạng 3,14 ↔ 3.14 (không áp dụng khi có ngoặc / tọa độ). */
function tryPureDecimalEqual(a, b) {
  const hasCoord = /[();]/.test(a) || /[();]/.test(b);
  if (hasCoord) return false;
  const na = Number(String(a).replace(',', '.'));
  const nb = Number(String(b).replace(',', '.'));
  if (!Number.isFinite(na) || !Number.isFinite(nb)) return false;
  return Math.abs(na - nb) < 1e-9;
}

/**
 * @param {string} userInput
 * @param {string} shortCorrect — có thể nhiều đáp án phân tách bởi |
 */
export function shortAnswerIsCorrect(userInput, shortCorrect) {
  const raw = String(userInput || '').trim();
  if (!raw) return false;
  const variants = String(shortCorrect || '')
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean);
  if (!variants.length) return false;

  const uKey = tightenAroundPunctuation(raw);
  if (!uKey) return false;

  for (const v of variants) {
    const vKey = tightenAroundPunctuation(v);
    if (vKey && vKey === uKey) return true;
    if (tryPureDecimalEqual(uKey, vKey)) return true;
  }
  return false;
}
