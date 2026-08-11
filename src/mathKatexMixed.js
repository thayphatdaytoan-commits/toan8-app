import katex from 'katex';
import { inlineRichTextToHtml, normalizeDoubleBackslashInMath } from './theoryCoreRichText';

/**
 * Chuỗi có ký tự tiếng Việt đặc thù — không nên đưa vào KaTeX (cảnh báo / thiếu metrics font).
 */
export function mathSegmentContainsVietnamese(s) {
  return /[\u0103\u0110\u0111\u0129\u0169\u01A1\u01B0\u1EA0-\u1EF9]/i.test(String(s || ''));
}

/**
 * Chỉ hiển thị plain text (không KaTeX) khi trong $...$ có tiếng Việt — tránh metrics warn.
 * Không dùng heuristic "có dấu cách + chữ": sẽ làm hỏng công thức như $AH \\cdot AO = AE \\cdot AD$.
 */
export function mathSegmentPreferPlainText(s) {
  const inner = String(s ?? '').trim();
  if (!inner) return true;
  return mathSegmentContainsVietnamese(inner);
}

/**
 * Nhiều đề gõ \\cdot, \\widehat{...} nhưng quên bọc $...$ — bọc tự động trong đoạn "thường".
 * Chỉ chạy trên text nằm NGOÀI các khối $...$ / $$...$$ đã có sẵn.
 */
export function wrapBareLatexCommands(plain) {
  if (!plain || !/\\[a-zA-Z]/.test(plain)) return plain;
  let s = plain;
  // Dạng \\widehat{AHE} = \\widehat{ADO} — bắt buộc có {…} sau tên lệnh (tránh bọc nhầm \\cdot).
  s = s.replace(
    /(^|[^A-Za-z0-9$])((?:\\[a-zA-Z]+\{[^{}]*\})(?:\s*=\s*\\[a-zA-Z]+\{[^{}]*\})*)/g,
    (m, pre, eq) => `${pre}$${eq}$`
  );
  // Dạng AH \\cdot AO = AE \\cdot AD (bắt đầu bằng chữ/số, có ít nhất một \\lệnh)
  s = s.replace(
    /\b([A-Za-z0-9]+(?:\s*\\[a-zA-Z]+(?:\{[^{}]*\}|\[[^\]]*\]|\\,)?\s*[A-Za-z0-9]+)*(?:\s*=\s*[A-Za-z0-9]+(?:\s*\\[a-zA-Z]+(?:\{[^{}]*\}|\[[^\]]*\]|\\,)?\s*[A-Za-z0-9]+)*)+)/g,
    (m, eq) => {
      if (!/\\[a-zA-Z]/.test(eq)) return m;
      return `$${eq}$`;
    }
  );
  return s;
}

/** Bọc bare LaTeX trong toàn chuỗi, không đụng phần đã có $ / $$. */
export function wrapBareLatexOutsideDollars(text) {
  const s = text == null ? '' : String(text);
  const re = /(\$\$[\s\S]*?\$\$|\$[^$]*\$)/g;
  let out = '';
  let last = 0;
  let m;
  while ((m = re.exec(s)) !== null) {
    out += wrapBareLatexCommands(s.slice(last, m.index));
    out += m[0];
    last = m.index + m[0].length;
  }
  out += wrapBareLatexCommands(s.slice(last));
  return out;
}

export function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Chuẩn hoá \\( \\) và \\[ \\] (kể cả viết \\[ ... \\]) sang $ / $$ để một pipeline KaTeX duy nhất.
 * Không đụng khối thẻ lý thuyết #[Nhãn: ...]#.
 */
export function normalizeLegacyTexDelimiters(raw) {
  let s = String(raw ?? '');

  // Display: \[ ... \]  hoặc  \\[ ... \\]  (tránh #[...]# )
  s = s.replace(/(^|[^#\\])\\{1,2}\[([\s\S]*?)\\{1,2}\](?!#)/g, (_, pre, inner) => `${pre}$$${inner}$$`);
  // Inline: \( ... \)  hoặc  \\( ... \\)
  s = s.replace(/(^|[^\\])\\{1,2}\(([\s\S]*?)\\{1,2}\)/g, (_, pre, inner) => `${pre}$${inner}$`);

  return s;
}

/**
 * Word/MathType hay xuất \begin{align} trong $...$ — KaTeX chỉ hỗ trợ aligned trong math mode.
 * Đồng thời vá \right thiếu delimiter (thường là \right. trước dấu $).
 */
export function normalizeKatexEnvironments(raw) {
  let s = String(raw ?? '');
  if (!s.includes('\\')) return s;

  s = s.replace(/\\begin\{align\*?\}/gi, '\\begin{aligned}');
  s = s.replace(/\\end\{align\*?\}/gi, '\\end{aligned}');
  s = s.replace(/\\begin\{eqnarray\*?\}/gi, '\\begin{aligned}');
  s = s.replace(/\\end\{eqnarray\*?\}/gi, '\\end{aligned}');

  // \left[ ... \right   (thiếu . hoặc ]) trước $ / hết công thức
  s = s.replace(/\\right(?=\s*\$)/g, '\\right.');
  s = s.replace(/\\right(\s*)(?=\$\$)/g, '\\right.$1');
  s = s.replace(/\\right(?=\s*$)/gm, '\\right.');

  return s;
}

function prepareTexSource(text) {
  return normalizeKatexEnvironments(
    normalizeDoubleBackslashInMath(normalizeLegacyTexDelimiters(text == null ? '' : String(text)))
  );
}

/**
 * Inline: chia $...$, KaTeX chỉ cho cụm không có tiếng Việt; phần còn lại escape HTML.
 * @returns {string} HTML an toàn (text đã escape)
 */
export function mixedInlineMathToHtml(text, katexOpts = {}) {
  const raw = prepareTexSource(text);
  const parts = raw.split(/(\$[^$]+\$)/g);
  const chunks = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith('$') && part.endsWith('$')) {
      const inner = normalizeKatexEnvironments(part.slice(1, -1));
      if (mathSegmentPreferPlainText(inner)) {
        chunks.push(`<span class="katex-vi-plain">${escapeHtml(inner)}</span>`);
      } else {
        try {
          // Hệ phương trình / aligned → ưu tiên display cho dễ đọc
          const useDisplay = /\\begin\{aligned\}|\\left\s*[\\[(]/.test(inner) && /\\\\/.test(inner);
          chunks.push(
            katex.renderToString(inner, {
              throwOnError: false,
              displayMode: useDisplay,
              strict: false,
              ...katexOpts,
            })
          );
        } catch {
          chunks.push(`<span class="text-red-600">${escapeHtml(part)}</span>`);
        }
      }
    } else {
      chunks.push(inlineRichTextToHtml(part));
    }
  }
  return chunks.join('');
}

/** Inline + khối $$...$$ (display). Hỗ trợ cả \[...\] / \(...\) qua normalizeLegacyTexDelimiters. */
export function mixedMathContentToHtml(text, katexOpts = {}) {
  const raw = wrapBareLatexOutsideDollars(prepareTexSource(text));
  const segments = raw.split(/(\$\$[\s\S]*?\$\$)/g);
  let out = '';
  for (const seg of segments) {
    if (seg.startsWith('$$') && seg.endsWith('$$')) {
      const inner = normalizeKatexEnvironments(seg.slice(2, -2).trim());
      if (mathSegmentPreferPlainText(inner)) {
        out += `<span class="katex-display d-block my-2 katex-vi-plain whitespace-pre-wrap">${escapeHtml(inner)}</span>`;
      } else {
        try {
          out += katex.renderToString(inner, {
            throwOnError: false,
            displayMode: true,
            strict: false,
            ...katexOpts,
          });
        } catch {
          out += `<span class="text-red-600">${escapeHtml(seg)}</span>`;
        }
      }
    } else {
      out += mixedInlineMathToHtml(seg, katexOpts);
    }
  }
  return out;
}
