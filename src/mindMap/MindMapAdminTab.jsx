import { useCallback, useEffect, useRef, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, GripVertical, Plus, Save, Trash2 } from 'lucide-react';
import MindMapTeacherPanel from './MindMapTeacherPanel';
import { sanitizeMindMapExercisesForFirestore } from './mindMapFirestoreSanitize';
import { COLLECTION_MINDMAP_G9, filterMindMapCategoriesByGrade, mindMapGradeForAdmin, newCategoryDraft, newExerciseDraft } from './mindMapConstants';

/**
 * Firestore không cho mảng lồng mảng, không cho undefined, không cho số NaN/Infinity,
 * và không cho object "lạ" (Map/Set/Date/class instance) trong dữ liệu.
 * Hàm này giúp chỉ ra chính xác path gây lỗi để còn sửa file import / sanitizer.
 */
function findFirstFirestoreInvalidValue(value, path = 'root', depth = 0) {
  if (depth > 60) return { ok: false, path, reason: 'too_deep' };
  if (value === undefined) return { ok: false, path, reason: 'undefined' };
  if (value === null) return { ok: true };

  const t = typeof value;
  if (t === 'string' || t === 'boolean') return { ok: true };
  if (t === 'number') return Number.isFinite(value) ? { ok: true } : { ok: false, path, reason: 'non_finite_number' };
  if (t === 'bigint' || t === 'function' || t === 'symbol') return { ok: false, path, reason: `bad_type:${t}` };

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const v = value[i];
      if (Array.isArray(v)) return { ok: false, path: `${path}[${i}]`, reason: 'array_in_array' };
      const r = findFirstFirestoreInvalidValue(v, `${path}[${i}]`, depth + 1);
      if (!r.ok) return r;
    }
    return { ok: true };
  }

  if (t === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      return { ok: false, path, reason: `non_plain_object:${proto?.constructor?.name || 'unknown'}` };
    }
    for (const k of Object.keys(value)) {
      const r = findFirstFirestoreInvalidValue(value[k], `${path}.${k}`, depth + 1);
      if (!r.ok) return r;
    }
    return { ok: true };
  }

  return { ok: false, path, reason: `bad_type:${t}` };
}

function collectFirestoreIssues(value, path = 'root', depth = 0, out = []) {
  if (out.length >= 10) return out;
  if (depth > 60) {
    out.push({ path, reason: 'too_deep' });
    return out;
  }
  if (value === undefined) {
    out.push({ path, reason: 'undefined' });
    return out;
  }
  if (value === null) return out;

  const t = typeof value;
  if (t === 'string' || t === 'boolean') return out;
  if (t === 'number') {
    if (!Number.isFinite(value)) out.push({ path, reason: 'non_finite_number' });
    return out;
  }
  if (t === 'bigint' || t === 'function' || t === 'symbol') {
    out.push({ path, reason: `bad_type:${t}` });
    return out;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const v = value[i];
      if (Array.isArray(v)) out.push({ path: `${path}[${i}]`, reason: 'array_in_array' });
      collectFirestoreIssues(v, `${path}[${i}]`, depth + 1, out);
      if (out.length >= 10) break;
    }
    return out;
  }
  if (t === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      out.push({ path, reason: `non_plain_object:${proto?.constructor?.name || 'unknown'}` });
      return out;
    }
    for (const k of Object.keys(value)) {
      collectFirestoreIssues(value[k], `${path}.${k}`, depth + 1, out);
      if (out.length >= 10) break;
    }
    return out;
  }
  out.push({ path, reason: `bad_type:${t}` });
  return out;
}

/** Đưa phần tử từ fromIndex sang vị trí toIndex (mảng bài tập). */
function reorderByMove(arr, fromIndex, toIndex) {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= arr.length ||
    toIndex >= arr.length
  ) {
    return arr;
  }
  const next = [...arr];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

/** Sau khi reorder, chỉnh index bài đang chọn cho khớp cùng một bài (theo id/object). */
function selectedIndexAfterReorder(selected, fromIndex, toIndex) {
  if (selected === fromIndex) return toIndex;
  if (fromIndex < toIndex) {
    if (selected > fromIndex && selected <= toIndex) return selected - 1;
  } else if (fromIndex > toIndex) {
    if (selected >= toIndex && selected < fromIndex) return selected + 1;
  }
  return selected;
}

function normalizeCategory(raw, id) {
  const exercises = Array.isArray(raw.exercises) ? raw.exercises : [];
  return {
    id,
    grade_level: raw.grade_level || '9',
    title: raw.title || 'Chuyên đề',
    sort_order: Number(raw.sort_order) || 0,
    exercises: exercises.map((ex, i) => {
      const legacySol = typeof ex.solutionText === 'string' ? ex.solutionText.trim() : '';
      let logicTrees = (Array.isArray(ex.logicTrees) ? ex.logicTrees : []).map((t, ti) => ({
        id: t.id || `tree_${i}_${ti}`,
        title: t.title || '',
        imageUrl: t.imageUrl ?? null,
        useOwnFigure: t.useOwnFigure === true,
        imageCaption: t.imageCaption || '',
        horizontalSpacing: Number(t.horizontalSpacing) || 16,
        root: t.root,
        solutionText: typeof t.solutionText === 'string' ? t.solutionText : '',
      }));
      if (legacySol && logicTrees.length > 0 && !String(logicTrees[0].solutionText || '').trim()) {
        logicTrees = logicTrees.map((tr, j) => (j === 0 ? { ...tr, solutionText: legacySol } : tr));
      }
      return {
        id: ex.id || `ex_${id}_${i}`,
        title: ex.title || `Bài ${i + 1}`,
        sharedMindMapImageUrl: typeof ex.sharedMindMapImageUrl === 'string' ? ex.sharedMindMapImageUrl : null,
        problem: ex.problem || { title: '', content: '', imageUrl: null },
        logicTrees,
      };
    }),
    updated_at: raw.updated_at || 0,
  };
}

export default function MindMapAdminTab({ db, user, activeGrade, mindMapCategories, storage }) {
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(null);

  useEffect(() => {
    if (!saveFeedback || saveFeedback.kind !== 'success') return;
    const t = setTimeout(() => setSaveFeedback(null), 6000);
    return () => clearTimeout(t);
  }, [saveFeedback]);

  const sortedCats = [...filterMindMapCategoriesByGrade(mindMapCategories, activeGrade)].sort(
    (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
  );

  useEffect(() => {
    if (selectedId && !sortedCats.some((c) => c.id === selectedId)) {
      setSelectedId(sortedCats[0]?.id ?? null);
    } else if (!selectedId && sortedCats.length > 0) {
      setSelectedId(sortedCats[0].id);
    }
  }, [selectedId, sortedCats]);

  useEffect(() => {
    const row = sortedCats.find((c) => c.id === selectedId);
    if (!row) {
      setDraft(null);
      return;
    }
    setDraft(normalizeCategory(row, row.id));
    setExerciseIndex(0);
  }, [selectedId, mindMapCategories]);

  const targetGrade = mindMapGradeForAdmin(activeGrade, draft?.grade_level);

  const persistDraft = useCallback(async () => {
    if (!db || !user || !draft?.id) return;
    setSaveFeedback(null);
    setSaving(true);
    try {
      const title = String(draft.title || '').trim();
      if (!title) {
        setSaveFeedback({
          kind: 'error',
          message: 'Chưa nhập tên chuyên đề — không gửi lên Firebase để tránh lưu dữ liệu rỗng.',
        });
        return;
      }
      const exercises = sanitizeMindMapExercisesForFirestore(draft.exercises);
      if (!Array.isArray(exercises) || exercises.length === 0) {
        setSaveFeedback({
          kind: 'error',
          message: 'Chưa có bài trong chuyên đề — không gửi lên Firebase.',
        });
        return;
      }
      const payload = {
        grade_level: targetGrade,
        title,
        sort_order: Number(draft.sort_order) || 0,
        exercises,
        updated_at: Date.now(),
      };

      const scan = findFirstFirestoreInvalidValue(payload);
      if (!scan.ok) {
        throw new Error(`Dữ liệu không hợp lệ tại ${scan.path} (${scan.reason}).`);
      }

      // Ép payload về JSON thuần để tránh các giá trị "lạ" mà Firestore không nhận.
      const payloadJson = JSON.parse(JSON.stringify(payload));
      await setDoc(doc(db, COLLECTION_MINDMAP_G9, draft.id), payloadJson, { merge: true });
      setSaveFeedback({ kind: 'success', message: 'Đã lưu thành công lên Firebase.' });
    } catch (err) {
      const rawMsg = err?.message || String(err);
      // Nếu Firestore vẫn báo "invalid nested entity" dù scan ok,
      // ta thêm gợi ý debug ngay trên UI (không cần DevTools).
      let hint = '';
      try {
        if (String(rawMsg || '').includes('invalid nested entity')) {
          const scanDraft = findFirstFirestoreInvalidValue(draft?.exercises, 'draft.exercises');
          const exSan = sanitizeMindMapExercisesForFirestore(draft?.exercises);
          const scanPayload = findFirstFirestoreInvalidValue(
            { grade_level: targetGrade, title: String(draft?.title || ''), sort_order: Number(draft?.sort_order) || 0, exercises: exSan, updated_at: Date.now() },
            'payload'
          );

          // Quét theo từng bài để tìm bài gây lỗi (index)
          let suspect = '';
          for (let i = 0; i < (Array.isArray(exSan) ? exSan.length : 0); i += 1) {
            const issues = collectFirestoreIssues(exSan[i], `payload.exercises[${i}]`);
            if (issues.length > 0) {
              suspect = ` suspectExercise=${i + 1} issues=${issues
                .slice(0, 3)
                .map((x) => `${x.path}:${x.reason}`)
                .join(' | ')}`;
              break;
            }
          }

          hint = ` (gợi ý: scanDraft=${scanDraft.ok ? 'ok' : `${scanDraft.path}:${scanDraft.reason}`}; scanPayload=${
            scanPayload.ok ? 'ok' : `${scanPayload.path}:${scanPayload.reason}`
          }${suspect})`;
        }
      } catch {
        // ignore
      }
      const msg = `${rawMsg}${hint}`;
      setSaveFeedback({
        kind: 'error',
        message: `Lưu thất bại — dữ liệu chưa được ghi lên Firebase: ${msg}`,
      });
    } finally {
      setSaving(false);
    }
  }, [db, draft, user, targetGrade]);

  const addCategory = async () => {
    if (!db || !user) {
      alert('Chưa kết nối Firebase.');
      return;
    }
    const template = newCategoryDraft(sortedCats.length);
    const gradeLevel = mindMapGradeForAdmin(activeGrade, null);
    try {
      const ref = await addDoc(collection(db, COLLECTION_MINDMAP_G9), {
        grade_level: gradeLevel,
        title: template.title,
        sort_order: Date.now(),
        exercises: sanitizeMindMapExercisesForFirestore(template.exercises),
        updated_at: Date.now(),
      });
      setSelectedId(ref.id);
    } catch (err) {
      alert(`Không tạo được danh mục: ${err.message || err}`);
    }
  };

  const removeCategory = async () => {
    if (!draft?.id) return;
    if (!window.confirm('Xóa hẳn danh mục này và mọi bài trong đó?')) return;
    try {
      await deleteDoc(doc(db, COLLECTION_MINDMAP_G9, draft.id));
      setSelectedId(null);
      setDraft(null);
    } catch (err) {
      alert(`Xóa thất bại: ${err.message || err}`);
    }
  };

  const addExercise = () => {
    if (!draft) return;
    const next = newExerciseDraft(draft.exercises.length + 1);
    setDraft({ ...draft, exercises: [...draft.exercises, next] });
    setExerciseIndex(draft.exercises.length);
  };

  const removeExercise = () => {
    if (!draft || draft.exercises.length <= 1) return alert('Cần ít nhất một bài.');
    if (!window.confirm('Xóa bài đang chọn?')) return;
    const exercises = draft.exercises.filter((_, i) => i !== exerciseIndex);
    setDraft({ ...draft, exercises });
    setExerciseIndex(Math.max(0, exerciseIndex - 1));
  };

  const currentExercise = draft?.exercises?.[exerciseIndex];

  const setProblem = (next) => {
    setDraft((d) => {
      if (!d) return d;
      const idx = exerciseIndex;
      const exercises = d.exercises.map((ex, i) => {
        if (i !== idx) return ex;
        const prev = ex.problem || { title: '', content: '', imageUrl: null };
        const merged = typeof next === 'function' ? next(prev) : { ...prev, ...next };
        return { ...ex, problem: merged };
      });
      return { ...d, exercises };
    });
  };

  const setLogicTrees = (next) => {
    setDraft((d) => {
      if (!d) return d;
      const idx = exerciseIndex;
      const exercises = d.exercises.map((ex, i) => {
        if (i !== idx) return ex;
        const lt = typeof next === 'function' ? next(ex.logicTrees || []) : next;
        return { ...ex, logicTrees: lt };
      });
      return { ...d, exercises };
    });
  };

  const setExerciseTitle = (title) => {
    setDraft((d) => {
      if (!d) return d;
      const idx = exerciseIndex;
      const exercises = d.exercises.map((ex, i) => (i === idx ? { ...ex, title } : ex));
      return { ...d, exercises };
    });
  };

  const setSharedMindMapImageUrl = (next) => {
    setDraft((d) => {
      if (!d) return d;
      const idx = exerciseIndex;
      const exercises = d.exercises.map((ex, i) => {
        if (i !== idx) return ex;
        const v = typeof next === 'function' ? next(ex.sharedMindMapImageUrl ?? null) : next;
        return { ...ex, sharedMindMapImageUrl: v };
      });
      return { ...d, exercises };
    });
  };

  const dragFromRef = useRef(null);

  const moveExerciseUp = () => {
    if (!draft || exerciseIndex <= 0) return;
    setDraft((d) => {
      if (!d) return d;
      const i = exerciseIndex;
      if (i <= 0) return d;
      const exercises = [...d.exercises];
      [exercises[i - 1], exercises[i]] = [exercises[i], exercises[i - 1]];
      return { ...d, exercises };
    });
    setExerciseIndex((idx) => idx - 1);
  };

  const moveExerciseDown = () => {
    if (!draft || exerciseIndex >= draft.exercises.length - 1) return;
    setDraft((d) => {
      if (!d) return d;
      const i = exerciseIndex;
      if (i >= d.exercises.length - 1) return d;
      const exercises = [...d.exercises];
      [exercises[i], exercises[i + 1]] = [exercises[i + 1], exercises[i]];
      return { ...d, exercises };
    });
    setExerciseIndex((idx) => idx + 1);
  };

  const applyExerciseReorder = (fromIndex, toIndex) => {
    setDraft((d) => {
      if (!d) return d;
      return { ...d, exercises: reorderByMove(d.exercises, fromIndex, toIndex) };
    });
    setExerciseIndex((sel) => selectedIndexAfterReorder(sel, fromIndex, toIndex));
  };

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-wrap gap-3 items-end bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-slate-500">Danh mục (chuyên đề)</label>
          <select
            value={selectedId || ''}
            onChange={(e) => setSelectedId(e.target.value)}
            className="border rounded-lg px-3 py-2 font-semibold text-slate-800 min-w-[220px]"
          >
            {sortedCats.length === 0 ? <option value="">— Chưa có —</option> : null}
            {sortedCats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={addCategory}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" /> Thêm danh mục
        </button>
        <button
          type="button"
          onClick={removeCategory}
          disabled={!draft}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-700 font-bold border border-red-200 hover:bg-red-100 disabled:opacity-40"
        >
          <Trash2 className="w-4 h-4" /> Xóa danh mục
        </button>
        <button
          type="button"
          onClick={persistDraft}
          disabled={saving || !draft}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu lên Firebase'}
        </button>
      </div>

      {saveFeedback ? (
        <div
          role="status"
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${
            saveFeedback.kind === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {saveFeedback.kind === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" aria-hidden />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" aria-hidden />
          )}
          <span>{saveFeedback.message}</span>
        </div>
      ) : null}

      {draft && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <div>
            <label htmlFor={`mm-admin-cat-title-${draft.id}`} className="text-xs font-bold text-slate-500">
              Tên chuyên đề
            </label>
            <input
              id={`mm-admin-cat-title-${draft.id}`}
              name={`mm-admin-cat-title-${draft.id}`}
              type="text"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="w-full mt-1 border rounded-lg px-3 py-2 font-semibold"
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-slate-500 block">Thứ tự bài trong chuyên đề</label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Kéo nút tay cầm bên trái mỗi dòng để đổi vị trí; hoặc chọn dòng rồi bấm Lên / Xuống.
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={moveExerciseUp}
                  disabled={!draft.exercises.length || exerciseIndex <= 0}
                  title="Đưa bài đang chọn lên một bậc"
                  className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={moveExerciseDown}
                  disabled={!draft.exercises.length || exerciseIndex >= draft.exercises.length - 1}
                  title="Đưa bài đang chọn xuống một bậc"
                  className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>

            <ul className="rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-52 overflow-y-auto bg-slate-50/50">
              {draft.exercises.map((ex, i) => {
                const active = exerciseIndex === i;
                return (
                  <li
                    key={ex.id || `ex-${i}`}
                    role="button"
                    tabIndex={0}
                    draggable
                    onDragStart={(e) => {
                      dragFromRef.current = i;
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', String(i));
                    }}
                    onDragEnd={() => {
                      dragFromRef.current = null;
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = dragFromRef.current;
                      dragFromRef.current = null;
                      if (from === null || from === i) return;
                      applyExerciseReorder(from, i);
                    }}
                    onClick={() => setExerciseIndex(i)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExerciseIndex(i);
                      }
                    }}
                    className={`flex items-center gap-2 px-2 py-2.5 text-left cursor-pointer transition-colors ${
                      active ? 'bg-indigo-100 ring-1 ring-inset ring-indigo-300' : 'hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className="text-slate-400 shrink-0 p-1 cursor-grab active:cursor-grabbing touch-none"
                      title="Kéo để đổi thứ tự"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GripVertical className="w-5 h-5" />
                    </span>
                    <span className="text-xs font-black text-slate-500 w-7 shrink-0 tabular-nums">{i + 1}.</span>
                    <span className="flex-1 min-w-0 text-sm font-semibold text-slate-800 truncate">
                      {ex.title || `Bài ${i + 1}`}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[200px]">
                <label
                  htmlFor={`mm-admin-ex-title-${draft.id}-${exerciseIndex}`}
                  className="text-xs font-bold text-slate-500 block mb-1"
                >
                  Tên bài (hiển thị — có thể đổi, ví dụ &quot;Bài 2&quot;)
                </label>
                <input
                  id={`mm-admin-ex-title-${draft.id}-${exerciseIndex}`}
                  name={`mm-admin-ex-title-${draft.id}-${exerciseIndex}`}
                  type="text"
                  value={currentExercise?.title ?? ''}
                  onChange={(e) => setExerciseTitle(e.target.value)}
                  disabled={!currentExercise}
                  placeholder="Ví dụ: Bài 2"
                  className="w-full border rounded-lg px-3 py-2 text-sm font-semibold disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
              <button type="button" onClick={addExercise} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold shrink-0">
                + Bài mới
              </button>
              <button type="button" onClick={removeExercise} className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-bold border shrink-0">
                Xóa bài
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            {currentExercise ? (
              <MindMapTeacherPanel
                problem={currentExercise.problem}
                setProblem={setProblem}
                sharedMindMapImageUrl={currentExercise.sharedMindMapImageUrl ?? null}
                setSharedMindMapImageUrl={setSharedMindMapImageUrl}
                logicTrees={currentExercise.logicTrees}
                setLogicTrees={setLogicTrees}
                isTeacherMode
                storage={storage}
                mindMapUploadContext={
                  draft?.id && currentExercise?.id
                    ? { categoryId: draft.id, exerciseId: currentExercise.id, gradeLevel: targetGrade }
                    : null
                }
              />
            ) : (
              <p className="text-slate-500 text-sm">Chưa có bài — thêm bài mới.</p>
            )}
          </div>
        </div>
      )}

      {!draft && sortedCats.length === 0 && (
        <p className="text-center text-slate-500 py-8">
          {activeGrade === 'ALL' ? (
            <>
              Chưa có chuyên đề nào. Bấm <strong>Thêm danh mục</strong> để bắt đầu (mặc định lưu khối 9 khi chọn Toàn Trường).
            </>
          ) : (
            <>
              Chưa có chuyên đề sơ đồ tư duy ngược cho <strong>Lớp {activeGrade}</strong>. Bấm <strong>Thêm danh mục</strong> để tạo mới.
            </>
          )}
        </p>
      )}
    </div>
  );
}
