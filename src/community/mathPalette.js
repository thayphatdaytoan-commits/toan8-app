/** Bảng phím toán nhẹ — chỉ chèn chuỗi LaTeX (text), render bằng KaTeX đã có */

export const MATH_PALETTE_TABS = [
  {
    id: 'basic',
    label: 'Cơ bản',
    items: [
      { label: 'x²', insert: '$x^{2}$', cursor: -2 },
      { label: 'xⁿ', insert: '$x^{n}$', cursor: -2 },
      { label: '√', insert: '$\\sqrt{}$', cursor: -1 },
      { label: 'ⁿ√', insert: '$\\sqrt[n]{}$', cursor: -1 },
      { label: 'a/b', insert: '$\\dfrac{}{}$', cursor: -3 },
      { label: '±', insert: '$\\pm$', cursor: 0 },
      { label: '×', insert: '$\\times$', cursor: 0 },
      { label: '÷', insert: '$\\div$', cursor: 0 },
      { label: '≠', insert: '$\\neq$', cursor: 0 },
      { label: '≤', insert: '$\\leq$', cursor: 0 },
      { label: '≥', insert: '$\\geq$', cursor: 0 },
      { label: '≈', insert: '$\\approx$', cursor: 0 },
      { label: '∞', insert: '$\\infty$', cursor: 0 },
      { label: '|x|', insert: '$|x|$', cursor: -2 },
      { label: '( )', insert: '$()$', cursor: -2 },
      { label: '[ ]', insert: '$[]$', cursor: -2 },
    ],
  },
  {
    id: 'alg',
    label: 'Đại số',
    items: [
      { label: 'Δ', insert: '$\\Delta$', cursor: 0 },
      { label: 'x₁', insert: '$x_{1}$', cursor: 0 },
      { label: 'x₂', insert: '$x_{2}$', cursor: 0 },
      { label: 'log', insert: '$\\log$', cursor: 0 },
      { label: 'ln', insert: '$\\ln$', cursor: 0 },
      { label: 'logₐ', insert: '$\\log_{}$', cursor: -1 },
      { label: 'eˣ', insert: '$e^{x}$', cursor: -2 },
      { label: 'aⁿ', insert: '$a^{n}$', cursor: -2 },
      { label: 'Σ', insert: '$\\sum$', cursor: 0 },
      { label: 'Π', insert: '$\\prod$', cursor: 0 },
      { label: '∈', insert: '$\\in$', cursor: 0 },
      { label: '∉', insert: '$\\notin$', cursor: 0 },
      { label: '∪', insert: '$\\cup$', cursor: 0 },
      { label: '∩', insert: '$\\cap$', cursor: 0 },
      { label: '⊂', insert: '$\\subset$', cursor: 0 },
      { label: '∅', insert: '$\\emptyset$', cursor: 0 },
    ],
  },
  {
    id: 'geo',
    label: 'Hình học',
    items: [
      { label: '∠', insert: '$\\angle$', cursor: 0 },
      { label: '△', insert: '$\\triangle$', cursor: 0 },
      { label: '⊥', insert: '$\\perp$', cursor: 0 },
      { label: '∥', insert: '$\\parallel$', cursor: 0 },
      { label: '°', insert: '$^{\\circ}$', cursor: 0 },
      { label: 'π', insert: '$\\pi$', cursor: 0 },
      { label: '̂A', insert: '$\\widehat{A}$', cursor: -2 },
      { label: '⃗AB', insert: '$\\overrightarrow{AB}$', cursor: -3 },
      { label: 'ĀB', insert: '$\\overline{AB}$', cursor: -3 },
      { label: '≅', insert: '$\\cong$', cursor: 0 },
      { label: '∼', insert: '$\\sim$', cursor: 0 },
      { label: '·', insert: '$\\cdot$', cursor: 0 },
    ],
  },
  {
    id: 'trig',
    label: 'Lượng giác',
    items: [
      { label: 'sin', insert: '$\\sin$', cursor: 0 },
      { label: 'cos', insert: '$\\cos$', cursor: 0 },
      { label: 'tan', insert: '$\\tan$', cursor: 0 },
      { label: 'cot', insert: '$\\cot$', cursor: 0 },
      { label: 'arcsin', insert: '$\\arcsin$', cursor: 0 },
      { label: 'α', insert: '$\\alpha$', cursor: 0 },
      { label: 'β', insert: '$\\beta$', cursor: 0 },
      { label: 'γ', insert: '$\\gamma$', cursor: 0 },
      { label: 'θ', insert: '$\\theta$', cursor: 0 },
      { label: 'φ', insert: '$\\varphi$', cursor: 0 },
    ],
  },
  {
    id: 'calc',
    label: 'Giải tích',
    items: [
      { label: "f'", insert: "$f'$", cursor: 0 },
      { label: "f''", insert: "$f''$", cursor: 0 },
      { label: 'lim', insert: '$\\lim_{x \\to }$', cursor: -1 },
      { label: '∫', insert: '$\\int$', cursor: 0 },
      { label: '∫ₐᵇ', insert: '$\\int_{a}^{b}$', cursor: -1 },
      { label: '∂', insert: '$\\partial$', cursor: 0 },
      { label: '→', insert: '$\\to$', cursor: 0 },
      { label: '⇒', insert: '$\\Rightarrow$', cursor: 0 },
      { label: '⇔', insert: '$\\Leftrightarrow$', cursor: 0 },
      { label: '∀', insert: '$\\forall$', cursor: 0 },
      { label: '∃', insert: '$\\exists$', cursor: 0 },
    ],
  },
];

export const TABLE_SNIPPET = `| Cột 1 | Cột 2 | Cột 3 |
| --- | --- | --- |
| a | b | c |
|  |  |  |
`;

/** Phím tắt trực quan cho học sinh (KaTeX preview trên nút) */
export const STUDENT_MATH_TABS = [
  {
    id: 'hot',
    label: 'Hay dùng',
    items: [
      { tex: 'x^{2}', insert: '$x^{2}$' },
      { tex: 'x^{3}', insert: '$x^{3}$' },
      { tex: '\\sqrt{x}', insert: '$\\sqrt{x}$' },
      { tex: '\\dfrac{a}{b}', insert: '$\\dfrac{a}{b}$' },
      { tex: 'x_{1}', insert: '$x_{1}$' },
      { tex: 'x_{2}', insert: '$x_{2}$' },
      { tex: '\\pi', insert: '$\\pi$' },
      { tex: '\\Delta', insert: '$\\Delta$' },
      { tex: '\\pm', insert: '$\\pm$' },
      { tex: '\\times', insert: '$\\times$' },
      { tex: '\\neq', insert: '$\\neq$' },
      { tex: '\\leq', insert: '$\\leq$' },
      { tex: '\\geq', insert: '$\\geq$' },
      { tex: '\\angle', insert: '$\\angle$' },
      { tex: '\\triangle', insert: '$\\triangle$' },
      { tex: '\\sin', insert: '$\\sin$' },
      { tex: '\\cos', insert: '$\\cos$' },
      { tex: '\\tan', insert: '$\\tan$' },
    ],
  },
  {
    id: 'ops',
    label: 'Dấu toán',
    items: [
      { tex: '+', insert: '$+$' },
      { tex: '-', insert: '$-$' },
      { tex: '\\times', insert: '$\\times$' },
      { tex: '\\div', insert: '$\\div$' },
      { tex: '=', insert: '$=$' },
      { tex: '\\approx', insert: '$\\approx$' },
      { tex: '\\infty', insert: '$\\infty$' },
      { tex: '\\cdot', insert: '$\\cdot$' },
      { tex: '(', insert: '$($' },
      { tex: ')', insert: '$)$' },
      { tex: '|x|', insert: '$|x|$' },
      { tex: '\\%', insert: '\\%' },
    ],
  },
  {
    id: 'geo',
    label: 'Hình học',
    items: [
      { tex: '\\angle ABC', insert: '$\\angle ABC$' },
      { tex: '\\triangle ABC', insert: '$\\triangle ABC$' },
      { tex: '\\perp', insert: '$\\perp$' },
      { tex: '\\parallel', insert: '$\\parallel$' },
      { tex: '90^{\\circ}', insert: '$90^{\\circ}$' },
      { tex: '\\widehat{A}', insert: '$\\widehat{A}$' },
      { tex: '\\overline{AB}', insert: '$\\overline{AB}$' },
      { tex: '\\overrightarrow{AB}', insert: '$\\overrightarrow{AB}$' },
      { tex: '\\cong', insert: '$\\cong$' },
      { tex: '\\sim', insert: '$\\sim$' },
    ],
  },
];

/**
 * Lưới ký hiệu kiểu Hoidap247 — chạm chèn, có cursorOffset để đặt con trỏ vào ô trống.
 * cursor: lệch so với cuối chuỗi đã chèn (âm = lùi vào trong).
 */
export const HOIDAP_MATH_KEYS = [
  // Hàng mẫu / hay dùng (ảnh 3)
  { tex: 'x^{2}', insert: '$x^{2}$', cursor: 0 },
  { tex: 'x^{3}', insert: '$x^{3}$', cursor: 0 },
  { tex: '\\sqrt{\\square}', insert: '$\\sqrt{}$', cursor: -1 },
  { tex: '\\sqrt[n]{\\square}', insert: '$\\sqrt[n]{}$', cursor: -1 },
  { tex: '\\dfrac{\\square}{\\square}', insert: '$\\dfrac{}{}$', cursor: -3 },
  { tex: 'x_{n}', insert: '$x_{}$', cursor: -1 },
  { tex: '\\le', insert: '$\\le$', cursor: 0 },
  { tex: '\\ge', insert: '$\\ge$', cursor: 0 },
  { tex: '\\ne', insert: '$\\ne$', cursor: 0 },
  { tex: '\\pi', insert: '$\\pi$', cursor: 0 },
  { tex: '\\alpha', insert: '$\\alpha$', cursor: 0 },
  { tex: '|x|', insert: '$| |$', cursor: -2 },
  { tex: '\\int', insert: '$\\int$', cursor: 0 },
  { tex: '\\lim', insert: '$\\lim_{x \\to }$', cursor: -1 },
  // Toán tử
  { tex: '\\cdot', insert: '$\\cdot$', cursor: 0 },
  { tex: '\\times', insert: '$\\times$', cursor: 0 },
  { tex: '\\div', insert: '$\\div$', cursor: 0 },
  { tex: '\\pm', insert: '$\\pm$', cursor: 0 },
  { tex: '\\approx', insert: '$\\approx$', cursor: 0 },
  { tex: '\\equiv', insert: '$\\equiv$', cursor: 0 },
  { tex: '\\Rightarrow', insert: '$\\Rightarrow$', cursor: 0 },
  { tex: '\\Leftrightarrow', insert: '$\\Leftrightarrow$', cursor: 0 },
  // Tập hợp / logic
  { tex: '\\in', insert: '$\\in$', cursor: 0 },
  { tex: '\\notin', insert: '$\\notin$', cursor: 0 },
  { tex: '\\subset', insert: '$\\subset$', cursor: 0 },
  { tex: '\\subseteq', insert: '$\\subseteq$', cursor: 0 },
  { tex: '\\cup', insert: '$\\cup$', cursor: 0 },
  { tex: '\\cap', insert: '$\\cap$', cursor: 0 },
  { tex: '\\emptyset', insert: '$\\emptyset$', cursor: 0 },
  { tex: '\\infty', insert: '$\\infty$', cursor: 0 },
  { tex: '\\Delta', insert: '$\\Delta$', cursor: 0 },
  // Hình + Hy Lạp
  { tex: '\\perp', insert: '$\\perp$', cursor: 0 },
  { tex: '\\angle', insert: '$\\angle$', cursor: 0 },
  { tex: '\\to', insert: '$\\to$', cursor: 0 },
  { tex: '\\leftrightarrow', insert: '$\\leftrightarrow$', cursor: 0 },
  { tex: '\\Phi', insert: '$\\Phi$', cursor: 0 },
  { tex: '\\omega', insert: '$\\omega$', cursor: 0 },
  { tex: '\\beta', insert: '$\\beta$', cursor: 0 },
  { tex: '\\theta', insert: '$\\theta$', cursor: 0 },
  { tex: '\\sum', insert: '$\\sum$', cursor: 0 },
  { tex: '\\log', insert: '$\\log$', cursor: 0 },
  { tex: '\\ln', insert: '$\\ln$', cursor: 0 },
  { tex: '\\sin', insert: '$\\sin$', cursor: 0 },
  { tex: '\\cos', insert: '$\\cos$', cursor: 0 },
  { tex: '\\tan', insert: '$\\tan$', cursor: 0 },
];

/** Nhóm template nhanh (hàng đầu kiểu Hoidap247) */
export const HOIDAP_TEMPLATE_KEYS = [
  { tex: 'x^{2}', insert: '$x^{2}$', cursor: 0 },
  { tex: '\\square^{2}', insert: '$^{2}$', cursor: -3 },
  { tex: '\\sqrt{\\square}', insert: '$\\sqrt{}$', cursor: -1 },
  { tex: '\\dfrac{\\square}{\\square}', insert: '$\\dfrac{}{}$', cursor: -3 },
  { tex: 'x_{n}', insert: '$_{}$', cursor: -1 },
  { tex: '\\le', insert: '$\\le$', cursor: 0 },
  { tex: '\\ge', insert: '$\\ge$', cursor: 0 },
  { tex: '\\ne', insert: '$\\ne$', cursor: 0 },
  { tex: '\\pi', insert: '$\\pi$', cursor: 0 },
  { tex: '\\alpha', insert: '$\\alpha$', cursor: 0 },
  { tex: '|\\square|', insert: '$| |$', cursor: -2 },
  { tex: '\\int', insert: '$\\int$', cursor: 0 },
  { tex: '\\lim', insert: '$\\lim_{x \\to }$', cursor: -1 },
];

export const STUDENT_STARTERS = [
  { label: 'Giải giúp em', text: 'Thầy/cô giải giúp em bài này với ạ:\n' },
  { label: 'Tìm x', text: 'Tìm $x$ biết rằng ' },
  { label: 'Chứng minh', text: 'Chứng minh rằng ' },
  { label: 'Em chưa hiểu', text: 'Em chưa hiểu chỗ này, xin thầy/cô giải thích giúp em:\n' },
];

/**
 * Chèn chuỗi vào textarea tại vị trí con trỏ.
 * @returns {{ next: string, selStart: number, selEnd: number }}
 */
export function insertAtSelection(value, selStart, selEnd, chunk, cursorOffset = 0) {
  const start = Math.max(0, Number(selStart) || 0);
  const end = Math.max(start, Number(selEnd) || 0);
  const before = String(value || '').slice(0, start);
  const after = String(value || '').slice(end);
  const next = before + chunk + after;
  let caret = before.length + chunk.length + cursorOffset;
  if (caret < 0) caret = 0;
  if (caret > next.length) caret = next.length;
  return { next, selStart: caret, selEnd: caret };
}

/** Bọc đoạn đang chọn bằng prefix/suffix (vd **...**) */
export function wrapSelection(value, selStart, selEnd, prefix, suffix) {
  const start = Math.max(0, Number(selStart) || 0);
  const end = Math.max(start, Number(selEnd) || 0);
  const selected = String(value || '').slice(start, end) || '…';
  return insertAtSelection(value, start, end, `${prefix}${selected}${suffix}`, -(suffix.length));
}

/** Escape ký tự đặc biệt trong nội dung toán người dùng gõ (ngoài lệnh LaTeX) */
export function sanitizeMathPlain(s) {
  return String(s ?? '')
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([{}$&#^_])/g, '\\$1');
}

export function buildFractionTex(num, den) {
  const a = String(num || '').trim() || 'a';
  const b = String(den || '').trim() || 'b';
  return `$\\dfrac{${a}}{${b}}$`;
}

export function buildPowerTex(base, exp) {
  const a = String(base || '').trim() || 'x';
  const b = String(exp || '').trim() || '2';
  return `$${`{${a}}`}^{${b}}$`;
}

export function buildSqrtTex(inner, index = '') {
  const body = String(inner || '').trim() || 'x';
  const idx = String(index || '').trim();
  if (idx && idx !== '2') return `$\\sqrt[${idx}]{${body}}$`;
  return `$\\sqrt{${body}}$`;
}

export function buildEquationTex(left, right) {
  const a = String(left || '').trim() || 'x';
  const b = String(right || '').trim() || '0';
  return `$${a} = ${b}$`;
}
