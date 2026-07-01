/**
 * Sau `vite build`: phục vụ `dist/` cục bộ, mở Chromium headless với ?grade=11,
 * ghi lại HTML đã render (title, meta Helmet, nội dung #root) vào dist/index.html.
 * Giúp bot/công cụ đọc được snapshot tốt hơn so với shell HTML trước khi chạy JS.
 *
 * Bỏ qua: SKIP_PRERENDER=1
 * Lỗi mềm: in cảnh báo, thoát 0 (không phá pipeline deploy).
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import handler from 'serve-handler'
import { chromium } from 'playwright'
import { loadEnv } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const dist = path.join(root, 'dist')

const PORT = 47191
const PRERENDER_GRADE = process.env.PRERENDER_GRADE || '11'
const DEFAULT_PUBLIC_ORIGIN = 'https://thayphatdaytoan-7832c.web.app'

function resolvePublicOrigin() {
  const env = loadEnv('production', root, '')
  let o = (env.VITE_SITE_URL || DEFAULT_PUBLIC_ORIGIN).trim().replace(/\/$/, '')
  if (!o.startsWith('http')) o = `https://${o}`
  return o
}

if (process.env.SKIP_PRERENDER === '1') {
  console.log('[prerender] SKIP_PRERENDER=1 — bỏ qua.')
  process.exit(0)
}

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.warn('[prerender] Không có dist/index.html — chạy vite build trước.')
  process.exit(0)
}

function startStaticServer() {
  const server = http.createServer((req, res) =>
    handler(req, res, {
      public: dist,
      rewrites: [{ source: '**', destination: '/index.html' }],
    })
  )
  return new Promise((resolve, reject) => {
    server.listen(PORT, '127.0.0.1', () => {
      resolve(server)
    })
    server.on('error', reject)
  })
}

async function main() {
  /** @type {import('http').Server | undefined} */
  let server
  try {
    server = await startStaticServer()
  } catch (e) {
    console.warn('[prerender] Không khởi động static server:', e.message)
    process.exit(0)
  }

  const url = `http://127.0.0.1:${PORT}/?grade=${encodeURIComponent(PRERENDER_GRADE)}`

  let browser
  try {
    browser = await chromium.launch({ headless: true })
  } catch (e) {
    console.warn('[prerender] Không mở Chromium (cài: npx playwright install chromium):', e.message)
    server.close()
    process.exit(0)
  }

  try {
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForFunction(
      () => {
        const rootEl = document.querySelector('#root')
        const hasMain = rootEl && (rootEl.innerHTML || '').length > 200
        const hasMeta = !!document.querySelector('meta[name="description"]')
        return hasMain && hasMeta
      },
      { timeout: 90000 }
    )
    await new Promise((r) => setTimeout(r, 1500))
    let html = await page.content()
    const publicOrigin = resolvePublicOrigin()
    const localOrigin = `http://127.0.0.1:${PORT}`
    if (html.includes(localOrigin)) {
      html = html.split(localOrigin).join(publicOrigin)
    }
    const deepLinkLoader = `<script>(function(){try{if(!/^\\/bai-giang\\//i.test(location.pathname||''))return;var r=document.getElementById('root');if(!r)return;r.innerHTML='<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;color:#475569;background:#f1f5f9"><div style="text-align:center;padding:2rem"><div style="width:44px;height:44px;border:4px solid #99f6e4;border-top-color:#0d9488;border-radius:50%;animation:dlspin .8s linear infinite;margin:0 auto 1rem"></div><p style="font-weight:700;color:#1e293b;margin:0 0 .35rem">Đang mở bài giảng…</p><p style="font-size:14px;margin:0;color:#64748b">Vui lòng đợi trong giây lát</p></div></div><style>@keyframes dlspin{to{transform:rotate(360deg)}}</style>';}catch(e){}})();</script>`
    if (!html.includes('Đang mở bài giảng')) {
      html = html.replace('</body>', `${deepLinkLoader}</body>`)
    }
    fs.writeFileSync(path.join(dist, 'index.html'), html, 'utf8')
    console.log('[prerender] Đã ghi dist/index.html từ', url, '→ canonical/OG dùng', publicOrigin)
  } catch (e) {
    console.warn('[prerender] Không hoàn tất (giữ nguyên index.html gốc):', e.message)
  } finally {
    await browser.close()
    server.close()
  }
}

main().catch((e) => {
  console.warn('[prerender]', e.message)
  process.exit(0)
})
