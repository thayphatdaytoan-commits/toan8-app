/* eslint-disable */
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, Download } from 'lucide-react';
import MathEduLogo from './components/MathEduLogo';
import { folderLabel } from './content/contentTaxonomy';
import { subscribeSiteDocuments, toEmbeddableUrl } from './content/contentStore';

export default function DocumentViewerScreen({
  docId = '',
  onGoHome,
  onOpenDocuments,
  onOpenExplore,
}) {
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    const unsub = subscribeSiteDocuments(setDocs);
    return () => unsub?.();
  }, []);

  const doc = useMemo(() => docs.find((d) => d.id === docId), [docs, docId]);
  const embedSrc = doc ? toEmbeddableUrl(doc.embedUrl) : '';
  const tocLines = useMemo(
    () =>
      String(doc?.tocText || '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    [doc]
  );

  return (
    <div className="min-h-screen w-full bg-white flex flex-col font-sans">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenDocuments}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <button type="button" onClick={onGoHome}>
            <MathEduLogo className="h-9 sm:h-10" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-400 uppercase">{doc ? folderLabel(doc.folderId) : 'Tài liệu'}</p>
            <h1 className="text-sm font-black text-slate-900 truncate">{doc?.title || 'Xem tài liệu'}</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-4 py-5 sm:py-8 space-y-5">
        {!doc ? (
          <div className="rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
            Không tìm thấy tài liệu.
          </div>
        ) : (
          <>
            {tocLines.length > 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Mục lục</p>
                <ul className="space-y-1.5 text-sm text-slate-800">
                  {tocLines.map((line) => (
                    <li key={line} className={/^chương/i.test(line) ? 'font-bold underline mt-2' : ''}>
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="rounded-xl overflow-hidden border border-slate-200">
              <div className="bg-sky-100 px-4 py-2.5 font-bold text-sky-900 text-sm">Khám phá thêm</div>
              <div className="bg-white divide-y divide-slate-100">
                {[
                  { label: 'Đề thi HSG', action: () => onOpenExplore?.('hsg') },
                  { label: 'Tài nguyên giáo dục', action: () => onOpenDocuments?.() },
                  { label: 'Khóa học Toán', action: () => onGoHome?.() },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.action}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    {item.label}
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-300 overflow-hidden bg-slate-100">
              <div className="bg-slate-200 px-3 py-2 text-xs font-bold text-slate-600 flex items-center justify-between">
                <span>Xem tài liệu (nhúng link)</span>
                <span className="truncate max-w-[50%] opacity-70">{doc.embedUrl}</span>
              </div>
              {embedSrc ? (
                <iframe
                  title={doc.title}
                  src={embedSrc}
                  className="w-full h-[70vh] min-h-[420px] bg-white"
                  allow="autoplay"
                />
              ) : (
                <div className="p-10 text-center text-slate-500 text-sm">Chưa có link nhúng.</div>
              )}
            </div>

            <div className="flex justify-center pt-2 pb-6">
              <a
                href={doc.downloadUrl || doc.embedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-black text-sm shadow-sm"
              >
                <Download className="w-4 h-4" /> Tải tài liệu
              </a>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
