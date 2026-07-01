import React, { useMemo, useState } from 'react';
import { XCircle, Plus, Trash2, Target, Clock3 } from 'lucide-react';
import { COG_LEVEL, COG_LEVEL_LABEL, QUESTION_TYPE, QUESTION_TYPE_LABEL } from '../questionBank';

const COG_ORDER = [COG_LEVEL.recognize, COG_LEVEL.understand, COG_LEVEL.apply, COG_LEVEL.apply_high];
const DEFAULT_CELL = { count: 0, q_type: QUESTION_TYPE.multiple_choice };

function emptyRow({ grade_level } = {}) {
  const cells = {};
  COG_ORDER.forEach((c) => {
    cells[c] = { ...DEFAULT_CELL };
  });
  return {
    grade_level: grade_level || '',
    chapter: '',
    topic: '',
    cells,
  };
}

function filterPool(bankQuestions, { grade_level, chapter, topic }) {
  const gl = String(grade_level || '').trim();
  const ch = String(chapter || '').trim();
  const tp = String(topic || '').trim();
  return (bankQuestions || []).filter((q) => {
    if (gl && String(q.grade_level || '').trim() !== gl) return false;
    if (ch && String(q.chapter || '').trim() !== ch) return false;
    if (tp) {
      const tags = Array.isArray(q.topic_tags) ? q.topic_tags : [];
      if (!tags.includes(tp)) return false;
    }
    return true;
  });
}

export default function MatrixModal({
  open,
  onClose,
  bankQuestions,
  initialFilters,
  /** @deprecated dùng getChapterOptionsForGrade */
  chapterOptions,
  getChapterOptionsForGrade,
  getTopicOptionsByChapter,
  /** (chapterNo) => topics — lớp 11 cũ */
  getTopicOptionsForChapterAndGrade,
  onGenerate,
}) {
  const [duration, setDuration] = useState(45);
  const [rows, setRows] = useState(() => [emptyRow({ grade_level: initialFilters?.grade_level || '' })]);

  const totalWanted = useMemo(() => {
    let n = 0;
    (rows || []).forEach((r) => {
      COG_ORDER.forEach((c) => {
        n += Number(r?.cells?.[c]?.count || 0);
      });
    });
    return n;
  }, [rows]);

  if (!open) return null;

  const chapterOptsForRow = (grade) => {
    if (typeof getChapterOptionsForGrade === 'function') return getChapterOptionsForGrade(grade) || [];
    return chapterOptions || [];
  };

  const topicOptsForRow = (grade, chapter) => {
    if (typeof getTopicOptionsForChapterAndGrade === 'function')
      return getTopicOptionsForChapterAndGrade(grade, chapter) || [];
    return getTopicOptionsByChapter ? getTopicOptionsByChapter(chapter) : [];
  };

  const setRow = (idx, patch) => {
    const next = [...rows];
    next[idx] = { ...next[idx], ...patch };
    setRows(next);
  };

  const setCell = (idx, cog, patch) => {
    const next = [...rows];
    const r = next[idx];
    next[idx] = { ...r, cells: { ...r.cells, [cog]: { ...r.cells[cog], ...patch } } };
    setRows(next);
  };

  const addRow = () => setRows([...rows, emptyRow({ grade_level: initialFilters?.grade_level || '' })]);
  const removeRow = (idx) => setRows(rows.filter((_, i) => i !== idx));

  const availabilityFor = (row, cog) => {
    const pool = filterPool(bankQuestions, row);
    const wantType = String(row?.cells?.[cog]?.q_type || QUESTION_TYPE.multiple_choice);
    const wantCog = String(cog);
    return pool.filter((q) => String(q.cognitive_level || '') === wantCog && String(q.q_type || q.type || '') === wantType).length;
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-3 md:p-4" role="dialog" aria-modal="true">
      <div className="bg-white w-full max-w-[min(1200px,98vw)] max-h-[92vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-slate-50 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-black text-slate-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              Tạo đề theo ma trận
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Mỗi dòng là 1 nội dung kiến thức (lọc theo lớp/chương/dạng). Mỗi cột là mức độ nhận thức, chọn số câu + loại câu.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-red-600 shrink-0" aria-label="Đóng">
            <XCircle className="w-7 h-7" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto min-h-0 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-end gap-2 justify-between">
            <label className="text-[11px] font-bold text-slate-600">
              Thời gian (phút)
              <div className="mt-1 flex items-center gap-2">
                <Clock3 className="w-4 h-4 text-slate-500" />
                <input
                  type="number"
                  min={5}
                  step={1}
                  value={duration}
                  onChange={(e) => setDuration(Math.max(5, Math.floor(Number(e.target.value) || 45)))}
                  className="w-28 p-2 border rounded-lg text-sm font-bold text-center"
                />
              </div>
            </label>
            <button type="button" onClick={addRow} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Thêm dòng
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-3 text-left font-black text-slate-700 min-w-[140px]">Lớp</th>
                    <th className="p-3 text-left font-black text-slate-700 min-w-[220px]">Chương</th>
                    <th className="p-3 text-left font-black text-slate-700 min-w-[360px]">Dạng toán</th>
                    {COG_ORDER.map((c) => (
                      <th key={c} className="p-3 text-center font-black text-slate-700 min-w-[240px]">
                        {COG_LEVEL_LABEL[c]}
                      </th>
                    ))}
                    <th className="p-3 text-center font-black text-slate-700 w-16">Xóa</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={idx} className="border-t bg-white align-top">
                      <td className="p-3">
                        <select
                          value={r.grade_level}
                          onChange={(e) => setRow(idx, { grade_level: e.target.value, chapter: '', topic: '' })}
                          className="w-full p-2 border rounded-lg text-sm font-bold bg-white"
                        >
                          <option value="">--</option>
                          {['6', '7', '8', '9', '10', '11', '12'].map((g) => (
                            <option key={g} value={g}>
                              Toán {g}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        <select
                          value={r.chapter}
                          onChange={(e) => {
                            const ch = e.target.value;
                            setRow(idx, { chapter: ch, topic: '' });
                          }}
                          className="w-full p-2 border rounded-lg text-sm font-bold bg-white"
                        >
                          <option value="">--</option>
                          {chapterOptsForRow(r.grade_level).map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        <select
                          value={r.topic}
                          onChange={(e) => setRow(idx, { topic: e.target.value })}
                          className="w-full p-2 border rounded-lg text-sm font-semibold bg-white"
                        >
                          <option value="">-- (không lọc dạng) --</option>
                          {topicOptsForRow(r.grade_level, r.chapter).map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                          <option value="Các dạng toán khác">Các dạng toán khác</option>
                        </select>
                      </td>

                      {COG_ORDER.map((c) => {
                        const cell = r.cells?.[c] || DEFAULT_CELL;
                        const avail = availabilityFor(r, c);
                        const ok = Number(cell.count || 0) <= avail;
                        return (
                          <td key={c} className="p-3">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={Number(cell.count || 0)}
                                  onChange={(e) =>
                                    setCell(idx, c, { count: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
                                  }
                                  className={`w-20 text-center p-2 border rounded-lg font-black ${
                                    ok ? 'border-slate-300' : 'border-red-300 bg-red-50'
                                  }`}
                                />
                                <select
                                  value={cell.q_type}
                                  onChange={(e) => setCell(idx, c, { q_type: e.target.value })}
                                  className="flex-1 p-2 border rounded-lg text-[11px] font-black bg-white"
                                  title="Loại câu hỏi"
                                >
                                  {Object.values(QUESTION_TYPE).map((t) => (
                                    <option key={t} value={t}>
                                      {QUESTION_TYPE_LABEL[t]}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className={`text-[11px] font-bold ${ok ? 'text-slate-500' : 'text-red-600'}`}>
                                Có: {avail}
                              </div>
                            </div>
                          </td>
                        );
                      })}

                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          disabled={rows.length <= 1}
                          className={`p-2 rounded-lg border ${
                            rows.length <= 1 ? 'bg-slate-100 text-slate-300 border-slate-200' : 'bg-white text-red-600 border-slate-200 hover:bg-red-50'
                          }`}
                          title="Xóa dòng"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-white flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="text-sm font-bold text-slate-700">
            Tổng số câu: <span className="text-indigo-700">{totalWanted}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => onGenerate({ rows, duration })}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black"
              disabled={totalWanted <= 0}
            >
              Tạo đề
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

