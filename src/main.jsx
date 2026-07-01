import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import 'katex/dist/katex.min.css'
import './index.css'
import { isLessonDeepLinkLocation } from './lessonDeepLink.js'
import { ensureAnonymousAuth } from './firebaseClient.js'

const isLessonDeepLink = isLessonDeepLinkLocation()

if (isLessonDeepLink) {
  ensureAnonymousAuth().catch(() => {})
  void import('./App.jsx')
}

const App = lazy(() => import('./App.jsx'))

const bootFallback = isLessonDeepLink ? (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 text-slate-700 gap-3">
    <span className="inline-block w-11 h-11 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
    <span className="text-sm font-semibold text-slate-800">Đang mở bài giảng…</span>
  </div>
) : (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 text-slate-700 gap-3">
    <span className="inline-block w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    <span className="text-sm font-semibold">Đang tải ứng dụng…</span>
  </div>
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <Suspense fallback={bootFallback}>
        <App />
      </Suspense>
    </HelmetProvider>
  </StrictMode>,
)
