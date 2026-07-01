/* eslint-disable */

import React, { useMemo, useState } from 'react';
import { RichMathContent } from './RichMathContent';
import { parseLoiGiaiSegments, stripLoiGiaiPrefix } from './loiGiaiSegments';

/** LaTeX + ảnh: ![mô tả](url) hoặc <img src="..." /> */
export function TextWithMath({ text, className, inlineImage = false }) {
  return <RichMathContent text={text} className={className} inlineImage={inlineImage} />;
}

const LOI_GIAI_DETAILS_CLASS =
  'group lesson-loi-giai-details mt-5 border-t border-slate-200 pt-4 bg-transparent shadow-none open:shadow-none w-full max-w-full';
const LOI_GIAI_SUMMARY_CLASS =
  'cursor-pointer select-none list-none py-2 font-semibold text-indigo-800 hover:text-indigo-900 flex items-center justify-between gap-3 [&::-webkit-details-marker]:hidden';
const LOI_GIAI_BODY_CLASS =
  'pb-2 pt-3 text-slate-700 text-base md:text-lg leading-loose lesson-math-content w-full max-w-full';

/**
 * Giống TextWithMath; nếu có khối \\{ Lời giải: ... \\} (hoặc cú pháp dòng cũ) thì bọc phần đó trong &lt;details&gt;.
 */
export function TextWithMathWithLoiGiai({ text, className, inlineImage = false }) {
  const segments = useMemo(() => parseLoiGiaiSegments(text ?? ''), [text]);
  if (segments.length === 1 && segments[0].type === 'plain') {
    return <TextWithMath text={segments[0].text} className={className} inlineImage={inlineImage} />;
  }
  return (
    <div className={className ? `${className} w-full max-w-full` : 'w-full max-w-full'}>
      {segments.map((seg, idx) =>
        seg.type === 'loigiai' ? (
          <details key={idx} className={LOI_GIAI_DETAILS_CLASS}>
            <summary className={LOI_GIAI_SUMMARY_CLASS}>
              <span className="inline-flex items-center gap-2.5">
                <span className="text-lg leading-none" aria-hidden="true">
                  💡
                </span>
                <span>Xem lời giải chi tiết</span>
              </span>
              <span
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-xs transition-transform duration-200 group-open:rotate-180"
                aria-hidden="true"
              >
                ▲
              </span>
            </summary>
            <div className={LOI_GIAI_BODY_CLASS}>
              <TextWithMath text={stripLoiGiaiPrefix(seg.text)} inlineImage={inlineImage} />
            </div>
          </details>
        ) : (
          <TextWithMath key={idx} text={seg.text} inlineImage={inlineImage} />
        )
      )}
    </div>
  );
}

export function Math11LessonViewer({ lesson }) {
  const [showSolution, setShowSolution] = useState({});
  const toggleSolution = (id) => setShowSolution(prev => ({ ...prev, [id]: !prev[id] }));

  let contentData;
  try {
    contentData = typeof lesson.content === 'string' ? JSON.parse(lesson.content) : lesson.content;
  } catch(e) {
    contentData = { title: lesson.title, examples: [] };
  }

  const examples = contentData.examples || [];

  return (
    <div className="max-w-5xl mx-auto my-4 bg-white rounded-xl shadow-lg border-t-8 border-indigo-600 p-6 md:p-10 font-sans">
      <h2 className="text-3xl font-[900] text-indigo-700 mb-6 border-b-4 border-indigo-300 inline-block pb-2 tracking-tight">
        {contentData.title || lesson.title}
      </h2>
      <div className="space-y-8">
        {examples.map((ex, idx) => (
          <div key={ex.id || idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h3 className="font-extrabold text-blue-900 text-lg mb-1 tracking-wide">{ex.title}</h3>
                {ex.desc && <p className="text-sm text-gray-500 font-semibold"><i className="fas fa-lightbulb text-yellow-500 mr-2"></i><TextWithMath text={ex.desc}/></p>}
              </div>
              <button 
                onClick={() => toggleSolution(ex.id || idx)} 
                className={`mt-3 md:mt-0 text-sm border-2 px-5 py-2.5 rounded-lg font-bold flex items-center transition-colors shadow-sm ${showSolution[ex.id || idx] ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                {showSolution[ex.id || idx] ? 'Ẩn Lời giải' : 'Xem Lời giải'}
              </button>
            </div>
            <div className="p-6 text-gray-800">
              <div className="grid grid-cols-1 gap-6">
                {(ex.items || []).map((item, idxi) => (
                  <div key={idxi} className="flex flex-col border-b border-gray-100 pb-5 last:border-0 last:pb-0">
                    <div className="font-bold text-indigo-900 mb-2 flex items-center">
                      <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mr-3 text-sm flex-shrink-0">{String.fromCharCode(97 + idxi)}</span>
                      <span className="text-lg"><TextWithMath text={item.q} /></span>
                    </div>
                    {showSolution[ex.id || idx] && (
                      <div className="ml-11 mt-3 space-y-2 text-gray-700 animate-in fade-in border-l-4 border-indigo-300 pl-5 py-3 bg-gradient-to-r from-blue-50 to-transparent rounded-r font-medium">
                        {(item.steps || []).map((step, sIdx) => (
                          <div key={sIdx} className="flex items-start">
                            <span className="text-base"><TextWithMath text={stripLoiGiaiPrefix(step)} /></span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
