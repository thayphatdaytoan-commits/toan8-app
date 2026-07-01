import { useMemo } from 'react';
import 'katex/dist/katex.min.css';
import { mixedMathContentToHtml } from '../mathKatexMixed';

export default function MindMapMath({ text, className = '' }) {
  const html = useMemo(() => (text ? mixedMathContentToHtml(text) : ''), [text]);
  if (!text) return <div className="whitespace-pre-wrap leading-relaxed" />;
  return (
    <div
      className={`whitespace-pre-wrap leading-relaxed inline-block w-full [&_.katex]:text-inherit ${
        className ? className : 'text-slate-800'
      }`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
