import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DEFAULT_SITE = 'https://thayphatdaytoan-7832c.web.app'

function buildRobotsTxt(siteUrl) {
  return `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`
}

function buildSitemapIndexXml(siteUrl, sitemaps) {
  const items = (sitemaps || []).map((sm) => {
    const loc = `${siteUrl}/${sm.file}`.replace(/\/{2,}/g, '/').replace('https:/', 'https://')
    const lastmod = sm.lastmod ? `\n    <lastmod>${sm.lastmod}</lastmod>` : ''
    return `  <sitemap>\n    <loc>${loc}</loc>${lastmod}\n  </sitemap>`
  })
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join(
    '\n'
  )}\n</sitemapindex>\n`
}

function slugifyVi(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildLessonSlugFallback({ grade_level, chapter, lesson_no, title }) {
  const g = String(grade_level || '').trim()
  const ch = slugifyVi(chapter)
  const bn = slugifyVi(lesson_no)
  const tt = slugifyVi(title)
  const core = [g ? `toan-${g}` : 'toan', ch ? `chuong-${ch}` : null, bn ? `bai-${bn}` : null, tt || null]
    .filter(Boolean)
    .join('-')
  return core || `bai-giang-${Date.now()}`
}

function buildSitemapXml(siteUrl, extraUrls = []) {
  const grades = ['', '6', '7', '8', '9', '10', '11', '12']
  const urls = grades.map((g) => {
    const loc = g ? `${siteUrl}/?grade=${g}` : `${siteUrl}/`
    const priority = g === '' ? '1.0' : g === '9' || g === '12' ? '0.95' : '0.9'
    return `  <url>
    <loc>${loc}</loc>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`
  })
  const lessonUrls = (extraUrls || []).map((u) => {
    const loc = `${siteUrl}${u.path.startsWith('/') ? '' : '/'}${u.path}`
    const lastmod = u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''
    return `  <url>
    <loc>${loc}</loc>${lastmod}
    <changefreq>monthly</changefreq>
    <priority>0.85</priority>
  </url>`
  })
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.concat(lessonUrls).join('\n')}
</urlset>
`
}

function buildUrlsetXml(siteUrl, entries, changefreq = 'monthly', priority = '0.85') {
  const urls = (entries || []).map((u) => {
    const loc = `${siteUrl}${u.path.startsWith('/') ? '' : '/'}${u.path}`
    const lastmod = u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''
    const cf = u.changefreq || changefreq
    const pr = u.priority || priority
    return `  <url>\n    <loc>${loc}</loc>${lastmod}\n    <changefreq>${cf}</changefreq>\n    <priority>${pr}</priority>\n  </url>`
  })
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join(
    '\n'
  )}\n</urlset>\n`
}

/** Ghi robots.txt + sitemap.xml vào thư mục build theo VITE_SITE_URL */
function seoStaticFilesPlugin(mode) {
  let outDir = 'dist'
  return {
    name: 'seo-static-files',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      const env = loadEnv(mode, process.cwd(), '')
      const raw = (env.VITE_SITE_URL || DEFAULT_SITE).trim().replace(/\/$/, '')
      const siteUrl = raw.startsWith('http') ? raw : `https://${raw}`

      const robots = buildRobotsTxt(siteUrl)
      const projectId = (env.VITE_FIREBASE_PROJECT_ID || 'thayphatdaytoan-7832c').trim()
      const apiKey =
        (env.VITE_FIREBASE_API_KEY || env.VITE_FIREBASE_APIKEY || '').trim() ||
        'AIzaSyBdQ11EDhwa46SdlrAHK71_7wEPja7ZqIM'

      /** @type {{ path: string, lastmod?: string }[]} */
      const lessonEntries = []
      /** @type {{ path: string, lastmod?: string }[]} */
      const catalogEntries = []
      /** @type {Set<string>} */
      const seenCatalog = new Set()
      /** @type {{ path: string, lastmod?: string }[]} */
      const quizEntries = []
      try {
        if (!projectId || !apiKey) throw new Error('Missing projectId/apiKey')
        const lessonsBase = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
          projectId
        )}/databases/(default)/documents/math_lessons_v2`
        let pageToken = ''
        let guard = 0
        while (guard < 50) {
          guard += 1
          const url =
            lessonsBase +
            `?pageSize=500${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}&key=${encodeURIComponent(
              apiKey
            )}`
          // node18+ có fetch global
          const res = await fetch(url, { method: 'GET' })
          if (!res.ok) throw new Error(`Firestore REST ${res.status}`)
          const data = await res.json()
          const docs = Array.isArray(data.documents) ? data.documents : []
          for (const d of docs) {
            const f = d.fields || {}
            const slug = String(f.slug?.stringValue || '').trim()
            const grade_level = String(f.grade_level?.stringValue || '').trim()
            const chapter = String(f.chapter?.stringValue || '').trim()
            const lesson_no = String(f.lesson_no?.stringValue || '').trim()
            const title = String(f.title?.stringValue || '').trim()
            const s = slug || buildLessonSlugFallback({ grade_level, chapter, lesson_no, title })
            const ts = f.timestamp?.integerValue ? Number(f.timestamp.integerValue) : null
            const lastmod = ts && Number.isFinite(ts) ? new Date(ts).toISOString().slice(0, 10) : undefined
            lessonEntries.push({ path: `/bai-giang/${s}`, lastmod })

            // Catalog pages: /lop/:g, /lop/:g/chuong/:c, /lop/:g/chuong/:c/bai/:bn
            if (grade_level) {
              const g = String(grade_level).trim()
              const ch = slugifyVi(chapter)
              const bn = slugifyVi(lesson_no)
              const add = (p) => {
                if (!p || seenCatalog.has(p)) return
                seenCatalog.add(p)
                catalogEntries.push({ path: p, lastmod })
              }
              add(`/lop/${g}`)
              if (ch) add(`/lop/${g}/chuong/${ch}`)
              if (ch && bn) add(`/lop/${g}/chuong/${ch}/bai/${bn}`)
            }
          }
          pageToken = data.nextPageToken || ''
          if (!pageToken) break
        }

        // Quizzes sitemap (deep link): ?quizId=<id>
        const quizzesBase = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
          projectId
        )}/databases/(default)/documents/math_quizzes_v2`
        pageToken = ''
        guard = 0
        while (guard < 50) {
          guard += 1
          const url =
            quizzesBase +
            `?pageSize=500${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}&key=${encodeURIComponent(
              apiKey
            )}`
          const res = await fetch(url, { method: 'GET' })
          if (!res.ok) throw new Error(`Firestore REST quizzes ${res.status}`)
          const data = await res.json()
          const docs = Array.isArray(data.documents) ? data.documents : []
          for (const d of docs) {
            const name = String(d.name || '')
            const id = name.split('/').pop()
            if (!id) continue
            quizEntries.push({ path: `/?quizId=${encodeURIComponent(id)}` })
          }
          pageToken = data.nextPageToken || ''
          if (!pageToken) break
        }
      } catch (e) {
        console.log('[seo-static-files] Skip lesson sitemap:', e?.message || String(e))
      }

      fs.mkdirSync(outDir, { recursive: true })
      fs.writeFileSync(path.join(outDir, 'robots.txt'), robots, 'utf8')

      const lessonsXml = buildUrlsetXml(siteUrl, lessonEntries)
      const quizzesXml = buildUrlsetXml(siteUrl, quizEntries, 'weekly', '0.7')
      const catalogXml = buildUrlsetXml(siteUrl, catalogEntries, 'weekly', '0.8')
      fs.writeFileSync(path.join(outDir, 'sitemap-lessons.xml'), lessonsXml, 'utf8')
      fs.writeFileSync(path.join(outDir, 'sitemap-quizzes.xml'), quizzesXml, 'utf8')
      fs.writeFileSync(path.join(outDir, 'sitemap-catalog.xml'), catalogXml, 'utf8')

      const today = new Date().toISOString().slice(0, 10)
      const indexXml = buildSitemapIndexXml(siteUrl, [
        { file: 'sitemap-catalog.xml', lastmod: today },
        { file: 'sitemap-lessons.xml', lastmod: today },
        { file: 'sitemap-quizzes.xml', lastmod: today },
      ])
      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), indexXml, 'utf8')
      console.log('[seo-static-files] Wrote sitemap index + lessons/quizzes/catalog for', siteUrl)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), seoStaticFilesPlugin(mode)],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase')) return 'vendor-firebase'
          if (id.includes('node_modules/katex')) return 'vendor-katex'
          if (id.includes('node_modules/mammoth')) return 'vendor-mammoth'
          if (id.includes('node_modules/lucide-react')) return 'vendor-icons'
        },
      },
    },
  },
}))
