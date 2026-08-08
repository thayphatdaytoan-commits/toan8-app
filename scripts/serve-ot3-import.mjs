import http from 'http';
import fs from 'fs';

const file = new URL('../docs/on-tap-chuong-3-toan9-import.txt', import.meta.url);
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(fs.readFileSync(file));
});
server.listen(8765, '127.0.0.1', () => console.log('ready8765'));
