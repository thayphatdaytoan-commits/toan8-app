import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { pdf as pdfToImg } from 'pdf-to-img';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');

const root = 'tai-lieu-dang-web/Toán 7';
const outRoot = 'docs/toan7-extract';

function walk(dir, acc = []) {
  for (const n of fs.readdirSync(dir)) {
    const p = path.join(dir, n);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.pdf$/i.test(n)) acc.push(p);
  }
  return acc;
}

function slugFromPath(pdfPath) {
  const parts = pdfPath.split(path.sep);
  const baiIdx = parts.findIndex((x) => /^Bài\s/i.test(x) || /^ÔN\s/i.test(x) || /^ON\s/i.test(x));
  const folder = baiIdx >= 0 ? parts[baiIdx] : path.basename(pdfPath, '.pdf');
  return folder
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 80);
}

const pdfs = walk(root);
fs.mkdirSync(outRoot, { recursive: true });
console.log('Found', pdfs.length, 'PDFs');

for (const pdfPath of pdfs) {
  const slug = slugFromPath(pdfPath);
  const dir = path.join(outRoot, slug);
  fs.mkdirSync(dir, { recursive: true });
  console.log('\n==', slug, '==');
  console.log(pdfPath);

  try {
    const parser = new PDFParse({ data: fs.readFileSync(pdfPath) });
    const result = await parser.getText();
    const text = typeof result === 'string' ? result : result?.text || JSON.stringify(result).slice(0, 500);
    fs.writeFileSync(path.join(dir, 'text.txt'), text, 'utf8');
    console.log('text chars:', text.length);
  } catch (e) {
    console.log('text extract fail:', e.message);
  }

  try {
    const doc = await pdfToImg(pdfPath, { scale: 1.6 });
    let i = 0;
    for await (const page of doc) {
      i += 1;
      fs.writeFileSync(path.join(dir, `p${i}.png`), page);
      if (i >= 8) break;
    }
    console.log('rendered pages:', i);
  } catch (e) {
    console.log('render fail:', e.message);
  }
}
