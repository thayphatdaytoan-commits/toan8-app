import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Maximize2, Minimize2 } from 'lucide-react';
import { RichMathContent } from './RichMathContent';
import {
  lessonSimulationIsVisible,
  normalizeLessonSimulation,
  resolveGeogebraEmbedUrl,
  wrapSimulationHtmlDocument,
} from './lessonSimulation';

export default function LessonSimulationPanel({ simulation, title = 'Mô phỏng' }) {
  const sim = normalizeLessonSimulation(simulation);
  const shellRef = useRef(null);
  const [isFs, setIsFs] = useState(false);

  const embedUrl = useMemo(
    () => (sim.mode === 'geogebra' ? resolveGeogebraEmbedUrl(sim.geogebraUrl) : ''),
    [sim.mode, sim.geogebraUrl]
  );
  const htmlDoc = useMemo(
    () => (sim.mode === 'html' ? wrapSimulationHtmlDocument(sim.htmlCode) : ''),
    [sim.mode, sim.htmlCode]
  );
  const guideText = String(sim.guideText || '').trim();
  const showGuide = sim.mode === 'geogebra' && Boolean(guideText);

  useEffect(() => {
    const onFsChange = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  if (!lessonSimulationIsVisible(sim)) {
    return (
      <p className="text-sm text-slate-500 italic p-8 text-center">Chưa có nội dung mô phỏng.</p>
    );
  }

  const displayTitle = sim.title || title;
  const height = sim.height || 560;
  const frameHeight = isFs ? 'calc(100vh - 52px)' : height;

  const toggleFullscreen = async () => {
    const el = shellRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className={`lesson-simulation-panel animate-in fade-in duration-200 ${
        sim.mode === 'html' ? 'p-0 md:p-2' : 'p-3 md:p-5'
      }`}
    >
      <div
        ref={shellRef}
        className={`bg-white overflow-hidden shadow-sm ${
          sim.mode === 'html'
            ? 'rounded-none md:rounded-2xl border-y md:border border-slate-200'
            : 'rounded-2xl border border-slate-200'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-slate-200 bg-slate-50/90">
          <h3 className="text-sm font-black text-slate-800 truncate min-w-0 flex-1">{displayTitle}</h3>
          <div className="flex items-center gap-1.5 shrink-0">
            {embedUrl ? (
              <a
                href={embedUrl.replace(/\?embed$/, '')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:bg-slate-50"
                title="Mở GeoGebra"
              >
                <ExternalLink className="w-3.5 h-3.5" /> GeoGebra
              </a>
            ) : null}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-600 hover:bg-slate-50"
              title="Toàn màn hình"
            >
              {isFs ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              {isFs ? 'Thu nhỏ' : 'Toàn màn hình'}
            </button>
          </div>
        </div>

        {sim.mode === 'geogebra' && embedUrl ? (
          <div
            className={`bg-slate-100/40 ${
              showGuide ? 'md:grid md:grid-cols-[minmax(0,1.35fr)_minmax(240px,0.85fr)] md:items-stretch' : ''
            }`}
            style={{ minHeight: frameHeight }}
          >
            <div className="min-w-0 bg-white">
              <iframe
                title={displayTitle}
                src={embedUrl}
                className="w-full border-0 bg-white block"
                style={{ height: frameHeight, minHeight: frameHeight }}
                allow="fullscreen; accelerometer; clipboard-write"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            {showGuide ? (
              <aside
                className="hidden md:flex flex-col border-t md:border-t-0 md:border-l border-slate-200 bg-white min-h-0"
                style={{ maxHeight: frameHeight }}
              >
                <div className="px-3 py-2 border-b border-slate-100 bg-amber-50/70 shrink-0">
                  <p className="text-[11px] font-black uppercase tracking-wide text-amber-800">
                    Hướng dẫn / Giải thích
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-3 md:p-4">
                  <RichMathContent
                    text={guideText}
                    className="text-sm text-slate-800 leading-relaxed [&_img]:max-w-full"
                  />
                </div>
              </aside>
            ) : null}
          </div>
        ) : null}

        {sim.mode === 'html' && htmlDoc ? (
          <div className="bg-white w-full">
            <iframe
              title={displayTitle}
              srcDoc={htmlDoc}
              sandbox="allow-scripts allow-forms allow-modals allow-pointer-lock allow-popups"
              className="w-full border-0 bg-white block min-h-[70vh] h-[70vh] md:min-h-[min(78vh,920px)] md:h-[min(78vh,920px)]"
              style={isFs ? { height: frameHeight, minHeight: frameHeight } : undefined}
              loading="lazy"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
