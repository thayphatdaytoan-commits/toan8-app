import fs from 'fs';
import path from 'path';

const name = process.argv[2];
if (!name) {
  console.error('Usage: node scripts/make-publish-eval.mjs <import-file-name>');
  process.exit(1);
}
const text = fs.readFileSync(path.join('docs/toan7-imports', name), 'utf8');
const b64 = Buffer.from(text, 'utf8').toString('base64');

const expr = `(() => {
  window.__alerts = window.__alerts || [];
  window.alert = (m) => { window.__alerts.push(String(m)); };

  const b64 = ${JSON.stringify(b64)};
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const text = new TextDecoder('utf-8').decode(bytes);
  const file = new File([text], ${JSON.stringify(name)}, { type: 'text/plain' });

  const input = document.querySelector('input[type="file"][accept*=".txt"]');
  if (!input) return { ok: false, err: 'no file input', editing: /Thêm Bài|Sửa Bài/.test(document.body.innerText) };

  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));

  return { ok: true, name: ${JSON.stringify(name)}, bytes: text.length, alerts: window.__alerts.slice(-1) };
})()`;

fs.writeFileSync('docs/toan7-imports/_eval-expr.js', expr, 'utf8');
console.log('wrote eval expr', expr.length);
