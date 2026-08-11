/**
 * Mo phong bai giang (tab tuy chon).
 * mode = 'geogebra' -> GeoGebra embed (link / material id / iframe)
 * mode = 'html'     -> self-contained HTML (AI) in sandboxed iframe (srcdoc)
 */

export function emptyLessonSimulation() {
  return {
    enabled: false,
    mode: 'geogebra',
    title: '',
    geogebraUrl: '',
    htmlCode: '',
    guideText: '',
    height: 560,
  };
}

/** Extract GeoGebra embed URL from share link, material id, or iframe tag. */
export function resolveGeogebraEmbedUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';

  let candidate = raw;
  const iframeSrc = raw.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (iframeSrc) candidate = iframeSrc[1].trim();

  const idFromPath = candidate.match(
    /geogebra\.org\/(?:material\/iframe\/id\/|m\/|classic\/|calculator\/|graphing\/|geometry\/|3d\/|cas\/|suite\/)?([a-zA-Z0-9_-]+)/i
  );
  if (idFromPath) {
    const id = idFromPath[1];
    return `https://www.geogebra.org/material/iframe/id/${encodeURIComponent(id)}?embed`;
  }

  if (/^[a-zA-Z0-9_-]{5,32}$/.test(candidate) && !/\s/.test(candidate)) {
    return `https://www.geogebra.org/material/iframe/id/${encodeURIComponent(candidate)}?embed`;
  }

  if (/^https?:\/\//i.test(candidate) && /geogebra\.org/i.test(candidate)) {
    if (/\/material\/iframe\//i.test(candidate)) {
      return /[?&]embed(=|$)/i.test(candidate)
        ? candidate
        : `${candidate}${candidate.includes('?') ? '&' : '?'}embed`;
    }
    return candidate;
  }

  return '';
}

/**
 * Normalize AI code into an HTML document for srcdoc.
 * Preferred formats:
 * 1) Full document (<!DOCTYPE html>...</html>)
 * 2) HTML + CSS + JS fragment (auto-wrapped)
 */
export function wrapSimulationHtmlDocument(code) {
  const src = String(code || '').trim();
  if (!src) return '';
  if (/<!DOCTYPE\s+html/i.test(src) || /<html[\s>]/i.test(src)) return src;
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  html, body { margin: 0; padding: 0; min-height: 100%; font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; }
  * { box-sizing: border-box; }
</style>
</head>
<body>
${src}
</body>
</html>`;
}

export function normalizeLessonSimulation(raw) {
  const base = emptyLessonSimulation();
  if (!raw || typeof raw !== 'object') return base;
  const mode = String(raw.mode || '').trim() === 'html' ? 'html' : 'geogebra';
  const title = String(raw.title ?? '').trim();
  const geogebraUrl = String(raw.geogebraUrl ?? raw.geogebra_url ?? raw.url ?? '').trim();
  const htmlCode = String(raw.htmlCode ?? raw.html_code ?? raw.html ?? '').trim();
  const guideText = String(raw.guideText ?? raw.guide_text ?? raw.guideHtml ?? '').trim();
  let height = Number(raw.height);
  if (!Number.isFinite(height) || height < 280) height = 560;
  if (height > 1200) height = 1200;

  const hasContent =
    (mode === 'geogebra' && Boolean(resolveGeogebraEmbedUrl(geogebraUrl))) ||
    (mode === 'html' && Boolean(htmlCode));

  const enabledExplicit = raw.enabled;
  const enabled =
    enabledExplicit === true || enabledExplicit === false
      ? Boolean(enabledExplicit)
      : hasContent;

  return {
    enabled,
    mode,
    title,
    geogebraUrl,
    htmlCode,
    guideText,
    height,
  };
}

export function lessonSimulationIsVisible(raw) {
  const sim = normalizeLessonSimulation(raw);
  if (!sim.enabled) return false;
  if (sim.mode === 'html') return Boolean(sim.htmlCode);
  return Boolean(resolveGeogebraEmbedUrl(sim.geogebraUrl));
}

export function parseLessonSimulationFromContent(content) {
  if (content == null || content === '') return emptyLessonSimulation();
  let obj = content;
  if (typeof content === 'string') {
    try {
      obj = JSON.parse(content);
    } catch {
      return emptyLessonSimulation();
    }
  }
  if (!obj || typeof obj !== 'object') return emptyLessonSimulation();
  return normalizeLessonSimulation(obj.simulation ?? obj.moPhong ?? obj.mo_phong);
}

/** Short HTML sample for admin / AI reference. */
export const DEFAULT_SIMULATION_HTML_SAMPLE = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Mo phong mau</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #f1f5f9; color: #0f172a; }
    .wrap { padding: 16px; max-width: 720px; margin: 0 auto; }
    canvas { width: 100%; max-width: 420px; height: auto; background: #fff; border-radius: 12px; border: 1px solid #cbd5e1; display: block; margin: 12px auto; }
    .row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; justify-content: center; }
    button { border: 0; border-radius: 8px; padding: 8px 14px; font-weight: 700; cursor: pointer; background: #2563eb; color: #fff; }
    button.secondary { background: #fff; color: #334155; border: 1px solid #cbd5e1; }
    #info { text-align: center; font-weight: 700; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="wrap">
    <h2 style="text-align:center;margin:0 0 4px">Duong tron don vi (mau)</h2>
    <p style="text-align:center;margin:0;color:#64748b;font-size:14px">Keo thanh goc hoac bam Chay.</p>
    <canvas id="c" width="420" height="420"></canvas>
    <div class="row">
      <label>Goc (do): <input id="ang" type="range" min="0" max="360" value="45" /></label>
      <button type="button" id="run">Chay</button>
      <button type="button" class="secondary" id="reset">Dat lai</button>
    </div>
    <div id="info"></div>
  </div>
  <script>
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');
    const ang = document.getElementById('ang');
    const info = document.getElementById('info');
    let timer = null;
    function draw() {
      const a = Number(ang.value) * Math.PI / 180;
      const cx = 210, cy = 210, r = 140;
      ctx.clearRect(0, 0, 420, 420);
      ctx.strokeStyle = '#94a3b8'; ctx.beginPath(); ctx.moveTo(40, cy); ctx.lineTo(380, cy); ctx.moveTo(cx, 40); ctx.lineTo(cx, 380); ctx.stroke();
      ctx.strokeStyle = '#2563eb'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      const x = cx + r * Math.cos(a), y = cy - r * Math.sin(a);
      ctx.strokeStyle = '#16a34a'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, cy); ctx.stroke();
      ctx.strokeStyle = '#dc2626'; ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x, y); ctx.stroke();
      ctx.strokeStyle = '#ea580c'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = '#2563eb'; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      const s = Math.sin(a), c = Math.cos(a);
      info.textContent = 'goc = ' + ang.value + ' do | sin = ' + s.toFixed(3) + ' | cos = ' + c.toFixed(3);
    }
    ang.addEventListener('input', draw);
    document.getElementById('reset').onclick = () => { clearInterval(timer); timer = null; ang.value = 45; draw(); };
    document.getElementById('run').onclick = () => {
      clearInterval(timer);
      timer = setInterval(() => { ang.value = (Number(ang.value) + 1) % 360; draw(); }, 30);
    };
    draw();
  </script>
</body>
</html>`;
