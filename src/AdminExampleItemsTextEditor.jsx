/* eslint-disable */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Code, Wand2 } from 'lucide-react';
import { LessonFormattingToolbar } from './LessonFormattingToolbar';

function isItemHeaderLine(line) {
  const t = (line || '').trim();
  return /^([a-z]|[0-9]{1,2})[\)\.]\s+/.test(t) || /^câu\s+([a-z]|[0-9]{1,2})\s*[:\)\.]\s+/i.test(t);
}

function parseItemHeader(line) {
  const t = (line || '').trim();
  let m = t.match(/^([a-z]|[0-9]{1,2})[\)\.]\s+(.+)$/i);
  if (m) return { key: m[1], q: m[2] };
  m = t.match(/^câu\s+([a-z]|[0-9]{1,2})\s*[:\)\.]\s+(.+)$/i);
  if (m) return { key: m[1], q: m[2] };
  return null;
}

function parseItemsFromText(text) {
  const s = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = s.split('\n');
  const items = [];

  let cur = null; // { q: string, steps: string[] }
  const flush = () => {
    if (!cur) return;
    const q = (cur.q || '').trim();
    const steps = (cur.steps || []).map((x) => String(x || '').trim()).filter(Boolean);
    if (q || steps.length) items.push({ q, steps });
    cur = null;
  };

  const pushStep = (line) => {
    const t = (line || '').trim();
    if (!t) return;
    // gạch đầu dòng hoặc không
    const step = t.replace(/^\s*[-*•]\s+/, '').trim();
    if (step) cur.steps.push(step);
  };

  // Mode 1: có header a) / Câu a:
  const hasHeaders = lines.some((ln) => isItemHeaderLine(ln));
  if (hasHeaders) {
    for (const ln of lines) {
      if (isItemHeaderLine(ln)) {
        flush();
        const h = parseItemHeader(ln);
        cur = { q: h?.q || '', steps: [] };
        continue;
      }
      if (!cur) {
        // bỏ qua rác trước header
        continue;
      }
      pushStep(ln);
    }
    flush();
    return items;
  }

  // Mode 2: không có header: tách theo đoạn, dòng đầu là q, dòng sau là steps
  const blocks = s.split(/\n\s*\n+/g).map((b) => b.trim()).filter(Boolean);
  for (const b of blocks) {
    const bl = b.split('\n').map((x) => x.trim()).filter(Boolean);
    if (bl.length === 0) continue;
    const q = bl[0];
    const steps = bl.slice(1).map((x) => x.replace(/^\s*[-*•]\s+/, '').trim()).filter(Boolean);
    items.push({ q, steps });
  }
  return items;
}

function itemsToText(items) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) return '';
  const keys = 'abcdefghijklmnopqrstuvwxyz';
  return list
    .map((it, idx) => {
      const k = keys[idx] || String(idx + 1);
      const q = String(it?.q || '').trim();
      const steps = Array.isArray(it?.steps) ? it.steps : [];
      const stepLines = steps.map((s) => `- ${String(s || '').trim()}`).filter((x) => x.trim() !== '-');
      return `${k}) ${q}${stepLines.length ? `\n${stepLines.join('\n')}` : ''}`.trim();
    })
    .join('\n\n')
    .trim();
}

export function AdminExampleItemsTextEditor({ items, disabled, onCommit }) {
  const [showJsonHint, setShowJsonHint] = useState(false);
  const initial = useMemo(() => itemsToText(items), [items]);
  const [text, setText] = useState(initial);
  const [err, setErr] = useState('');
  const taRef = useRef(null);
  const undoStackRef = useRef([]);
  const lastSnapshotRef = useRef('');
  const lastAtRef = useRef(0);

  useEffect(() => {
    setText(itemsToText(items));
    setErr('');
    undoStackRef.current = [];
    lastSnapshotRef.current = itemsToText(items);
    lastAtRef.current = Date.now();
  }, [items]);

  const recordSnapshot = (nextVal) => {
    const now = Date.now();
    const prev = lastSnapshotRef.current;
    if (nextVal === prev) return;
    // snapshot mỗi ~900ms để undo không quá dày
    if (now - lastAtRef.current < 900) return;
    undoStackRef.current.push(prev);
    if (undoStackRef.current.length > 80) undoStackRef.current.shift();
    lastSnapshotRef.current = nextVal;
    lastAtRef.current = now;
  };

  const undo = () => {
    const prev = undoStackRef.current.pop();
    if (prev === undefined) return;
    setText(prev);
    lastSnapshotRef.current = prev;
    lastAtRef.current = Date.now();
    // focus + caret cuối
    requestAnimationFrame(() => {
      const el = taRef.current;
      if (!el) return;
      try {
        el.focus();
        const p = prev.length;
        el.setSelectionRange(p, p);
      } catch {
        /* ignore */
      }
    });
  };

  const convert = () => {
    try {
      const parsed = parseItemsFromText(text);
      if (!Array.isArray(parsed)) throw new Error('Parse failed');
      onCommit(parsed);
      setErr('');
    } catch (e) {
      setErr('Không chuyển được. Hãy kiểm tra định dạng (a) / Câu a: hoặc tách đoạn bằng dòng trống).');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
          <Wand2 size={14} className="text-indigo-600" /> items (soạn thảo dạng văn bản → tự chuyển cấu trúc)
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={convert}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-black bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
            title="Chuyển nội dung đang gõ thành cấu trúc q/steps để hiển thị đẹp cho học sinh"
          >
            <Wand2 size={14} /> Chuyển thành cấu trúc
          </button>
          <button
            type="button"
            onClick={() => setShowJsonHint((v) => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            title="Gợi ý định dạng"
          >
            <ChevronDown size={14} className={showJsonHint ? 'rotate-180 transition-transform' : 'transition-transform'} /> Gợi ý
          </button>
        </div>
      </div>

      {showJsonHint ? (
        <div className="text-[11px] leading-snug text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2">
          <p className="font-bold text-slate-700 flex items-center gap-1 mb-1">
            <Code size={14} /> Bạn có thể gõ theo 1 trong 2 kiểu:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="bg-white border border-slate-200 rounded p-2 font-mono text-[10px] whitespace-pre-wrap">
              a) Câu hỏi a\n- Bước 1\n- Bước 2\n\nb) Câu hỏi b\n- ...
            </div>
            <div className="bg-white border border-slate-200 rounded p-2 font-mono text-[10px] whitespace-pre-wrap">
              Câu hỏi 1 (không có a/b)\n- Bước 1\n- Bước 2\n\nCâu hỏi 2 (đoạn mới)\n- ...
            </div>
          </div>
          <p className="mt-2">
            Sau khi gõ xong, bấm <strong>Chuyển thành cấu trúc</strong> để hệ thống lưu đúng định dạng và hiển thị đẹp.
          </p>
        </div>
      ) : null}

      <LessonFormattingToolbar
        textareaRef={taRef}
        value={text}
        disabled={disabled}
        showHeadings={false}
        showInternalLink={false}
        canUndo={undoStackRef.current.length > 0}
        onUndo={undo}
        onApply={(next, selStart, selEnd) => {
          undoStackRef.current.push(text);
          if (undoStackRef.current.length > 80) undoStackRef.current.shift();
          lastSnapshotRef.current = next;
          lastAtRef.current = Date.now();
          setText(next);
          requestAnimationFrame(() => {
            const el = taRef.current;
            if (!el) return;
            try {
              el.focus();
              el.setSelectionRange(selStart, selEnd);
            } catch {
              /* ignore */
            }
          });
        }}
      />

      <textarea
        ref={taRef}
        value={text}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          recordSnapshot(next);
          setErr('');
        }}
        spellCheck={false}
        className="w-full text-sm p-2 border border-slate-300 rounded-lg min-h-[140px] bg-white disabled:opacity-50"
        placeholder="a) ...\n- ...\n\nb) ...\n- ...\n\n(hoặc tách đoạn bằng dòng trống)"
      />
      {err ? <p className="text-xs font-semibold text-red-600">{err}</p> : null}
    </div>
  );
}

