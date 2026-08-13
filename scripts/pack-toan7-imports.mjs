/**
 * Publish one Toán 7 import via browser-side helper.
 * Usage from CDP: await window.__publishToan7Import(base64Utf8, fileName)
 */
import fs from 'fs';
import path from 'path';

const dir = 'docs/toan7-imports';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.txt')).sort();
const out = {};
for (const f of files) {
  const buf = fs.readFileSync(path.join(dir, f));
  out[f] = buf.toString('base64');
}
fs.writeFileSync('docs/toan7-imports/_payloads.json', JSON.stringify(out));
console.log('wrote payloads', files.length, files);
