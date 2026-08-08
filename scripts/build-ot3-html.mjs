import fs from 'fs';

const b64 = fs.readFileSync('C:/Users/ADMIN/AppData/Local/Temp/ot3-import.b64', 'utf8');
const html = `<!DOCTYPE html><html><body><pre id="c"></pre>
<script>
const b64 = ${JSON.stringify(b64)};
const bin = atob(b64);
const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
const text = new TextDecoder().decode(bytes);
document.getElementById('c').textContent = text;
window.OT3_TEXT = text;
document.title = 'OT3_IMPORT_' + text.length;
</script></body></html>`;
fs.writeFileSync('C:/Users/ADMIN/AppData/Local/Temp/ot3-import.html', html);
console.log('html', html.length);
