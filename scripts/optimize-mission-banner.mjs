/**
 * Tạo ảnh banner nhẹ từ PNG phi hành gia trong public/images (giữ file gốc).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesDir = path.join(__dirname, '../public/images');

const files = fs.readdirSync(imagesDir);
const sourcePng = files.find(
  (f) =>
    f.toLowerCase().endsWith('.png') &&
    !f.includes('banner') &&
    f.toLowerCase().includes('phi')
);

if (!sourcePng) {
  console.error('[optimize-mission-banner] Không tìm thấy PNG phi hành gia trong public/images');
  process.exit(1);
}

const inputPath = path.join(imagesDir, sourcePng);
const outWebp = path.join(imagesDir, 'anh-phi-hanh-gia-banner.webp');

await sharp(inputPath)
  .resize({ width: 520, height: 520, fit: 'inside', withoutEnlargement: true })
  .webp({ quality: 82, effort: 6 })
  .toFile(outWebp);

const inSize = fs.statSync(inputPath).size;
const wSize = fs.statSync(outWebp).size;
console.log(`[optimize-mission-banner] Nguồn: ${sourcePng} (${(inSize / 1024 / 1024).toFixed(2)} MB)`);
console.log(`[optimize-mission-banner] → ${path.basename(outWebp)} (${(wSize / 1024).toFixed(1)} KB)`);
