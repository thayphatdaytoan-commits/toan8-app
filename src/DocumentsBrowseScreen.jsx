/* eslint-disable */
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Clock } from 'lucide-react';
import MathEduLogo from './components/MathEduLogo';
import { DOC_FOLDERS, folderShort, formatDocDate } from './content/contentTaxonomy';
import { subscribeSiteDocuments } from './content/contentStore';

/** Cột theo lớp (5 tài liệu mới nhất / cột); thư mục thi để mục riêng bên dưới */
const HOME_GRADE_COLS = [
  'grade_8',
  'grade_7',
  'grade_6',
  'grade_9',
  'grade_10',
  'grade_11',
  'grade_12',
];

export default function DocumentsBrowseScreen({
  folderId = '',
  onGoHome,
  onOpenDocument,
  onOpenFolder,
  onOpenAll,
}) {
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    const unsub = subscribeSiteDocuments(setDocs);
    return () => unsub?.();
  }, []);

  const enabled = useMemo(() => docs.filter((d) => d.enabled !== false), [docs]);

  const byFolder = useMemo(() => {
    const map = {};
    for (const f of DOC_FOLDERS) map[f.id] = [];
    for (const d of enabled) {
      const key = d.folderId || 'other';
      if (!map[key]) map[key] = [];
      map[key].push(d);
    }
    return map;
  }, [enabled]);

  const singleFolder = folderId ? byFolder[folderId] || [] : null;

  const DocRow = ({ d }) => (
    <button
      type="button"
      onClick={() => onOpenDocument?.(d.id)}
      className="w-full text-left flex gap-3 py-2.5 border-b border-slate-100 last:border-0 group"
    >
      <img src={d.thumbnail} alt="" className="w-11 h-14 rounded object-cover bg-slate-100 shrink-0 border border-slate-100" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900 leading-snug group-hover:text-blue-700 line-clamp-2">{d.title}</p>
        <p className="text-[11px] text-slate-400 mt-1 inline-flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDocDate(d.publishedAt)}
        </p>
      </div>
    </button>
  );

  return (
    <div className="min-h-screen w-full bg-white flex flex-col font-sans">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-2">
          <button
            type="button"
            onClick={folderId ? onOpenAll : onGoHome}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <button type="button" onClick={onGoHome}>
            <MathEduLogo className="h-9 sm:h-10" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-400 uppercase">Tài liệu</p>
            <h1 className="text-sm font-black text-slate-900 truncate">
              {folderId ? folderShort(folderId) : 'Tài liệu mới nhất'}
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-5 sm:py-8">
        {singleFolder ? (
          <div>
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-2.5 mb-3">
              <span className="w-1.5 h-5 bg-red-600 shrink-0" />
              <h2 className="text-sm font-black text-slate-900 uppercase">{folderShort(folderId)}</h2>
            </div>
            {singleFolder.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Chưa có tài liệu.</p>
            ) : (
              singleFolder.map((d) => <DocRow key={d.id} d={d} />)
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {HOME_GRADE_COLS.map((fid) => {
                const list = (byFolder[fid] || []).slice(0, 5);
                return (
                  <div key={fid}>
                    <div className="flex items-center justify-between gap-2 bg-slate-100 px-3 py-2.5 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-1.5 h-5 bg-red-600 shrink-0" />
                        <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase truncate">
                          {folderShort(fid)}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenFolder?.(fid)}
                        className="text-xs font-bold text-red-600 hover:underline shrink-0"
                      >
                        Xem tất cả
                      </button>
                    </div>
                    {list.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">Chưa có tài liệu.</p>
                    ) : (
                      list.map((d) => <DocRow key={d.id} d={d} />)
                    )}
                  </div>
                );
              })}
            </div>

            <h3 className="text-sm font-black text-slate-800 mb-3 uppercase">Thư mục khác</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {DOC_FOLDERS.filter((f) => !HOME_GRADE_COLS.includes(f.id)).map((f) => {
                const n = (byFolder[f.id] || []).length;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onOpenFolder?.(f.id)}
                    className="text-left rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-red-300 hover:shadow-sm"
                  >
                    <p className="font-bold text-slate-900 text-sm">{f.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{n} tài liệu</p>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
