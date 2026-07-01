/**
 * Raster hóa og-source.svg → og-image.png (1200×630) phục vụ Open Graph / Twitter Card.
 * Chạy tự động trước `vite build` (prebuild).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const svgPath = path.join(root, 'public', 'og-source.svg');
const outPath = path.join(root, 'public', 'og-image.png');

const svg = fs.readFileSync(svgPath);
await sharp(svg, { density: 144 }).resize(1200, 630, { fit: 'fill' }).png({ compressionLevel: 9 }).toFile(outPath);
console.log('[generate-og] Wrote', outPath);
