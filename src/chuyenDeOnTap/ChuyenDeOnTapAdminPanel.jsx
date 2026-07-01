/* eslint-disable */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  Map as MapIcon,
  Pencil,
  Plus,
  Save,
  Trash2,
  Undo2,
  Upload,
  XCircle,
} from 'lucide-react';
import { COLLECTION_REVIEW_COURSES } from './chuyenDeOnTapConstants';
import {
  emptyExample,
  emptyQuestion,
  emptyTopic,
  parseChuyenDeOnTapImportText,
  parseChuyenDeOnTapQuestionsOnlyImportText,
} from './chuyenDeOnTapImport';
import { REVIEW_IMPORT_SAMPLE_FILES, reviewImportSampleUrl } from './chuyenDeOnTapImportSamples';
import { sanitizeReviewCourseForFirestore } from './chuyenDeOnTapFirestore';
import { buildTopicSteps, deepCloneCourse } from './chuyenDeOnTapTopicSteps';
import ChuyenDeOnTapStepView from './ChuyenDeOnTapStepView';
import ChuyenDeOnTapRichTextField from './ChuyenDeOnTapRichTextField';
import ChuyenDeOnTapAdminStepList from './ChuyenDeOnTapAdminStepList';
import { REVIEW_LEVELS, parseReviewLevelId } from './chuyenDeOnTapLevels';

export default function ChuyenDeOnTapAdminPanel({ db, user, storage, activeGrade, reviewCoursesList = [] }) {
  const [importText, setImportText] = useState('');
  const [preview, setPreview] = useState(null);
  const [workingCourse, setWorkingCourse] = useState(null);
  const [previewTopicIndex, setPreviewTopicIndex] = useState(0);
  const [previewStepIndex, setPreviewStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [lastFileName, setLastFileName] = useState('');
  /** Khi sửa khóa đã lưu — id tài liệu Firestore */
  const [editingFirestoreId, setEditingFirestoreId] = useState(null);
  const txtFileInputRef = useRef(null);
  const questionsOnlyFileInputRef = useRef(null);
  const undoStackRef = useRef([]);

  const pushUndo = () => {
    if (!workingCourse || !preview?.ok) return;
    undoStackRef.current.push(deepCloneCourse(workingCourse));
    if (undoStackRef.current.length > 40) undoStackRef.current.shift();
  };

  const undoLast = () => {
    const prev = undoStackRef.current.pop();
    if (!prev) {
      alert('Chưa có thao tác để hoàn tác.');
      return;
    }
    setWorkingCourse(prev);
  };

  const defaultMcqOptions = () => [
    { key: 'A', text: 'Đáp án A', correct: true },
    { key: 'B', text: 'Đáp án B', correct: false },
    { key: 'C', text: 'Đáp án C', correct: false },
    { key: 'D', text: 'Đáp án D', correct: false },
  ];

  const handlePickTxtFile = () => {
    txtFileInputRef.current?.click();
  };

  const handleTxtFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const name = file.name || '';
    const lower = name.toLowerCase();
    if (!lower.endsWith('.txt') && file.type && file.type !== 'text/plain') {
      alert('Vui lòng chọn file định dạng .txt (văn bản UTF-8).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      setImportText(text);
      setLastFileName(name);
      setEditingFirestoreId(null);
      const r = parseChuyenDeOnTapImportText(text);
      setPreview(r);
      if (r.ok && r.course) {
        undoStackRef.current = [];
        setWorkingCourse(deepCloneCourse(r.course));
        setPreviewTopicIndex(0);
        setPreviewStepIndex(0);
      } else {
        setWorkingCourse(null);
      }
    };
    reader.onerror = () => {
      alert('Không đọc được file. Thử lưu lại file dạng UTF-8.');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handlePickQuestionsOnlyFile = () => {
    if (!workingCourse?.topics?.[previewTopicIndex]) {
      alert('Cần có chủ đề đang sửa trước khi import thêm câu hỏi.');
      return;
    }
    questionsOnlyFileInputRef.current?.click();
  };

  const mergeQuestionsIntoCurrentTopic = (newQuestions) => {
    if (!Array.isArray(newQuestions) || !newQuestions.length || !workingCourse?.topics?.[previewTopicIndex]) return;
    const prevCount = (workingCourse.topics[previewTopicIndex].questions || []).length;
    pushUndo();
    setWorkingCourse((wc) => {
      if (!wc?.topics?.[previewTopicIndex]) return wc;
      const n = deepCloneCourse(wc);
      const t = n.topics[previewTopicIndex];
      t.questions = [
        ...(t.questions || []),
        ...newQuestions.map((q) => ({ ...emptyQuestion(), ...q, id: q.id || emptyQuestion().id })),
      ];
      return n;
    });
    const n = deepCloneCourse(workingCourse);
    const t = n.topics[previewTopicIndex];
    t.questions = [
      ...(t.questions || []),
      ...newQuestions.map((q) => ({ ...emptyQuestion(), ...q, id: q.id || emptyQuestion().id })),
    ];
    const idx = buildTopicSteps(t).findIndex((s) => s.kind === 'question' && s.questionIndex === prevCount);
    if (idx >= 0) setPreviewStepIndex(idx);
  };

  const handleQuestionsOnlyFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const name = file.name || '';
    const lower = name.toLowerCase();
    if (!lower.endsWith('.txt') && file.type && file.type !== 'text/plain') {
      alert('Vui lòng chọn file .txt (UTF-8).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const r = parseChuyenDeOnTapQuestionsOnlyImportText(text);
      if (!r.ok || !r.questions?.length) {
        alert((r.errors || []).join('\n') || 'Import câu hỏi không hợp lệ.');
        return;
      }
      mergeQuestionsIntoCurrentTopic(r.questions);
      const skipMsg =
        r.skippedBlocks > 0
          ? `\n(Đã bỏ qua ${r.skippedBlocks} khối không phải câu hỏi — lý thuyết/ví dụ không được import.)`
          : '';
      alert(`Đã thêm ${r.questions.length} câu hỏi vào chủ đề đang sửa.${skipMsg}`);
    };
    reader.onerror = () => alert('Không đọc được file.');
    reader.readAsText(file, 'UTF-8');
  };

  const reorderExamplesInTopic = (fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    pushUndo();
    setWorkingCourse((wc) => {
      const t = wc?.topics?.[previewTopicIndex];
      if (!t?.examples?.length) return wc;
      const n = deepCloneCourse(wc);
      const exs = [...n.topics[previewTopicIndex].examples];
      const [moved] = exs.splice(fromIdx, 1);
      exs.splice(toIdx, 0, moved);
      exs.forEach((ex, i) => {
        ex.order = i + 1;
        if (!ex.label || /^Ví dụ \d+$/.test(String(ex.label).trim())) {
          ex.label = `Ví dụ ${i + 1}`;
        }
      });
      n.topics[previewTopicIndex].examples = exs;
      return n;
    });
  };

  const reorderQuestionsInTopic = (fromIdx, toIdx) => {
    if (fromIdx === toIdx || !workingCourse?.topics?.[previewTopicIndex]) return;
    const cur = previewSteps[previewStepIndex];
    let newQIdx = cur?.kind === 'question' ? cur.questionIndex : null;
    if (newQIdx != null) {
      if (newQIdx === fromIdx) newQIdx = toIdx;
      else if (fromIdx < newQIdx && toIdx >= newQIdx) newQIdx -= 1;
      else if (fromIdx > newQIdx && toIdx <= newQIdx) newQIdx += 1;
    }
    pushUndo();
    setWorkingCourse((wc) => {
      const t = wc?.topics?.[previewTopicIndex];
      if (!t?.questions?.length) return wc;
      const n = deepCloneCourse(wc);
      const qs = [...n.topics[previewTopicIndex].questions];
      const [moved] = qs.splice(fromIdx, 1);
      qs.splice(toIdx, 0, moved);
      qs.forEach((q, i) => {
        if (!q.label || /^Câu \d+$/.test(String(q.label).trim()) || /^Bài \d+$/.test(String(q.label).trim())) {
          q.label = `Câu ${i + 1}`;
        }
      });
      n.topics[previewTopicIndex].questions = qs;
      return n;
    });
    if (newQIdx != null) {
      const n = deepCloneCourse(workingCourse);
      const qs = [...n.topics[previewTopicIndex].questions];
      const [moved] = qs.splice(fromIdx, 1);
      qs.splice(toIdx, 0, moved);
      const idx = buildTopicSteps({ ...n.topics[previewTopicIndex], questions: qs }).findIndex(
        (s) => s.kind === 'question' && s.questionIndex === newQIdx
      );
      if (idx >= 0) setPreviewStepIndex(idx);
    }
  };

  const filtered = useMemo(() => {
    const list = [...(reviewCoursesList || [])];
    if (activeGrade === 'ALL') return list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    return list
      .filter((c) => (c.grade_level || '8') === activeGrade || !c.grade_level)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [reviewCoursesList, activeGrade]);

  const previewTopic = workingCourse?.topics?.[previewTopicIndex] || null;
  const previewSteps = useMemo(() => buildTopicSteps(previewTopic), [previewTopic]);

  useEffect(() => {
    setPreviewStepIndex(0);
  }, [previewTopicIndex]);

  useEffect(() => {
    if (!previewSteps.length) {
      setPreviewStepIndex(0);
      return;
    }
    const max = previewSteps.length - 1;
    setPreviewStepIndex((i) => (i > max ? max : i));
  }, [previewSteps.length]);

  const patchTopicField = (field, value) => {
    setWorkingCourse((wc) => {
      if (!wc?.topics?.[previewTopicIndex]) return wc;
      const n = deepCloneCourse(wc);
      n.topics[previewTopicIndex][field] = value;
      return n;
    });
  };

  const patchQuestionField = (qIndex, field, value) => {
    setWorkingCourse((wc) => {
      const t = wc?.topics?.[previewTopicIndex];
      if (!t?.questions?.[qIndex]) return wc;
      const n = deepCloneCourse(wc);
      n.topics[previewTopicIndex].questions[qIndex][field] = value;
      return n;
    });
  };

  const patchExampleField = (exIndex, field, value) => {
    setWorkingCourse((wc) => {
      const t = wc?.topics?.[previewTopicIndex];
      if (!Array.isArray(t?.examples) || t.examples[exIndex] == null) return wc;
      const n = deepCloneCourse(wc);
      n.topics[previewTopicIndex].examples[exIndex][field] = value;
      return n;
    });
  };

  const currentPreviewStep = previewSteps[previewStepIndex] || null;

  const startEditCourse = (c) => {
    if (!c?.id) return;
    const copy = deepCloneCourse(c);
    delete copy.id;
    setEditingFirestoreId(c.id);
    setWorkingCourse(copy);
    setPreview({ ok: true, errors: [], detect: 'course' });
    setPreviewTopicIndex(0);
    setPreviewStepIndex(0);
    setImportText('');
    setLastFileName('');
    undoStackRef.current = [];
  };

  const cancelCourseEdit = () => {
    setEditingFirestoreId(null);
    setWorkingCourse(null);
    setPreview(null);
    undoStackRef.current = [];
  };

  const addTopicToWorking = () => {
    pushUndo();
    let newIdx = 0;
    setWorkingCourse((wc) => {
      if (!wc) return wc;
      const n = deepCloneCourse(wc);
      const nextNum = (n.topics || []).length + 1;
      n.topics = [...(n.topics || []), emptyTopic(`Chủ đề ${nextNum}`)];
      newIdx = n.topics.length - 1;
      return n;
    });
    setPreviewTopicIndex(newIdx);
  };

  const removeCurrentTopic = () => {
    if (!workingCourse?.topics?.length || workingCourse.topics.length <= 1) {
      alert('Giữ lại ít nhất một chủ đề.');
      return;
    }
    pushUndo();
    const idx = previewTopicIndex;
    const maxAfter = Math.max(0, workingCourse.topics.length - 2);
    setWorkingCourse((wc) => {
      if (!wc?.topics?.length) return wc;
      const n = deepCloneCourse(wc);
      n.topics.splice(idx, 1);
      return n;
    });
    setPreviewTopicIndex((prev) => Math.min(prev, maxAfter));
    setPreviewStepIndex(0);
  };

  const addQuestionToCurrentTopic = () => {
    pushUndo();
    setWorkingCourse((wc) => {
      if (!wc?.topics?.[previewTopicIndex]) return wc;
      const n = deepCloneCourse(wc);
      const t = n.topics[previewTopicIndex];
      const qn = (t.questions || []).length + 1;
      t.questions = [...(t.questions || []), emptyQuestion(`Câu ${qn}`)];
      return n;
    });
  };

  const addExampleToCurrentTopic = () => {
    pushUndo();
    setWorkingCourse((wc) => {
      if (!wc?.topics?.[previewTopicIndex]) return wc;
      const n = deepCloneCourse(wc);
      const t = n.topics[previewTopicIndex];
      const exs = [...(t.examples || [])];
      const ord = exs.length + 1;
      exs.push(emptyExample(ord));
      t.examples = exs;
      t.example = '';
      return n;
    });
  };

  const removeCurrentStepFromTopic = () => {
    const st = currentPreviewStep;
    if (!st || !workingCourse?.topics?.[previewTopicIndex]) {
      alert('Không có bước để xóa.');
      return;
    }
    if (st.kind === 'question' && typeof st.questionIndex === 'number') {
      pushUndo();
      setWorkingCourse((wc) => {
        const n = deepCloneCourse(wc);
        const t = n.topics[previewTopicIndex];
        if (!t?.questions?.length) return wc;
        t.questions.splice(st.questionIndex, 1);
        return n;
      });
      setPreviewStepIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (st.kind === 'example_item') {
      const ei = st.exampleIndex;
      const t = workingCourse.topics[previewTopicIndex];
      const exs = t.examples;
      if (Array.isArray(exs) && exs.length > 0 && ei != null && exs[ei] != null) {
        pushUndo();
        setWorkingCourse((wc) => {
          const n = deepCloneCourse(wc);
          const tp = n.topics[previewTopicIndex];
          tp.examples = [...(tp.examples || [])];
          tp.examples.splice(ei, 1);
          return n;
        });
        setPreviewStepIndex((i) => Math.max(0, i - 1));
        return;
      }
      patchTopicField('example', '');
      setPreviewStepIndex(0);
      return;
    }
    alert('Với bước mở đầu / video / lý thuyết: sửa hoặc xóa nội dung trong khung bên dưới, hoặc xóa cả chủ đề.');
  };

  const setQuestionDienOnly = () => {
    if (currentPreviewStep?.kind !== 'question' || typeof currentPreviewStep.questionIndex !== 'number') return;
    const qi = currentPreviewStep.questionIndex;
    const q = workingCourse?.topics?.[previewTopicIndex]?.questions?.[qi];
    if (!q || q.questionType === 'dien') return;
    pushUndo();
    patchQuestionField(qi, 'questionType', 'dien');
  };

  const setQuestionMcqOnly = () => {
    if (currentPreviewStep?.kind !== 'question' || typeof currentPreviewStep.questionIndex !== 'number') return;
    const qi = currentPreviewStep.questionIndex;
    const q = workingCourse?.topics?.[previewTopicIndex]?.questions?.[qi];
    if (!q || q.questionType === 'trac_nghiem') return;
    pushUndo();
    setWorkingCourse((wc) => {
      const t = wc?.topics?.[previewTopicIndex];
      if (!t?.questions?.[qi]) return wc;
      const n = deepCloneCourse(wc);
      const qq = n.topics[previewTopicIndex].questions[qi];
      qq.questionType = 'trac_nghiem';
      if (!Array.isArray(qq.options) || qq.options.length < 2) {
        qq.options = defaultMcqOptions();
      }
      return n;
    });
  };

  const saveToFirestore = async () => {
    if (!db || !user) {
      alert('Chưa kết nối Firebase.');
      return;
    }
    let courseData = null;
    if (preview?.ok && workingCourse) {
      courseData = workingCourse;
    } else {
      const r = parseChuyenDeOnTapImportText(importText);
      setPreview(r);
      if (!r.ok || !r.course) {
        alert((r.errors || []).join('\n') || 'Import không hợp lệ.');
        return;
      }
      courseData = r.course;
    }
    const payload = sanitizeReviewCourseForFirestore(courseData, { updatedAt: Date.now() });
    if (activeGrade !== 'ALL' && !payload.grade_level) payload.grade_level = activeGrade;
    setBusy(true);
    try {
      if (editingFirestoreId) {
        await updateDoc(doc(db, COLLECTION_REVIEW_COURSES, editingFirestoreId), payload);
        alert('Đã cập nhật khóa ôn tập trên Firestore.');
      } else {
        await addDoc(collection(db, COLLECTION_REVIEW_COURSES), {
          ...payload,
          created_at: Date.now(),
        });
        setImportText('');
        setLastFileName('');
        setPreview(null);
        setWorkingCourse(null);
        setEditingFirestoreId(null);
        alert('Đã lưu khóa ôn tập lên Firestore.');
      }
    } catch (e) {
      console.error(e);
      alert(`Lỗi lưu: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  const removeCourse = async (id) => {
    if (!db || !user) return;
    if (!window.confirm('Xóa khóa ôn tập này?')) return;
    try {
      await deleteDoc(doc(db, COLLECTION_REVIEW_COURSES, id));
    } catch (e) {
      alert(`Lỗi xóa: ${e?.message || e}`);
    }
  };

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <div className="bg-gradient-to-br from-cyan-700 to-indigo-800 rounded-2xl p-6 text-white shadow-lg">
        {editingFirestoreId && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/25 px-3 py-2 text-xs font-semibold text-cyan-50">
            <span>
              Đang sửa khóa đã lưu — bấm <strong>Cập nhật Firestore</strong> để ghi đè dữ liệu.
            </span>
            <button
              type="button"
              onClick={cancelCourseEdit}
              className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2 py-1 font-bold hover:bg-white/25"
            >
              <XCircle className="w-3.5 h-3.5" /> Hủy sửa
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 text-cyan-100 text-xs font-black uppercase tracking-widest mb-2">
          <MapIcon className="w-4 h-4" /> Chuyên đề ôn tập (map + từng câu)
        </div>
        <h2 className="text-xl font-black">Chỉnh sửa khóa ôn tập</h2>
        <p className="text-sm text-cyan-100/90 mt-1 max-w-3xl">
          <strong>Import file .txt</strong> (marker tiếng Việt) — tự nhận và hiển thị bản xem như học sinh. Chỉnh nội dung từng bước ở khung dưới →{' '}
          <strong>Lưu / Cập nhật Firestore</strong>. Tải file mẫu ngay dưới nút Import.
        </p>
      </div>

      <div className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm flex flex-col gap-4">
        <input
          ref={txtFileInputRef}
          type="file"
          accept=".txt,text/plain,application/octet-stream"
          className="hidden"
          onChange={handleTxtFileChange}
        />
        <input
          ref={questionsOnlyFileInputRef}
          type="file"
          accept=".txt,text/plain,application/octet-stream"
          className="hidden"
          onChange={handleQuestionsOnlyFileChange}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="min-w-0">
            <h3 className="text-base font-black text-slate-900">Xem trước &amp; chỉnh sửa (giao diện học sinh)</h3>
            {lastFileName ? (
              <p className="text-xs text-slate-500 mt-1 truncate" title={lastFileName}>
                File: <span className="font-mono font-semibold text-slate-700">{lastFileName}</span>
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-1">Chưa chọn file — hoặc mở khóa đã lưu bằng nút Sửa.</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePickTxtFile}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-cyan-500 bg-cyan-50 text-cyan-900 text-sm font-black hover:bg-cyan-100 shadow-sm"
            >
              <FileText className="w-4 h-4 shrink-0" />
              Import file TXT
            </button>
            <button
              type="button"
              disabled={busy || !user}
              onClick={saveToFirestore}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700 disabled:opacity-50 shadow-md"
            >
              <Upload className="w-4 h-4 shrink-0" />
              {busy ? 'Đang lưu…' : editingFirestoreId ? 'Cập nhật Firestore' : 'Lưu lên Firestore'}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-cyan-200 bg-cyan-50/50 px-3 py-3">
          <p className="text-[11px] font-black text-cyan-900 mb-2">Tải file mẫu import (UTF-8 .txt)</p>
          <div className="flex flex-wrap gap-2">
            {REVIEW_IMPORT_SAMPLE_FILES.map((sample) => (
              <a
                key={sample.id}
                href={reviewImportSampleUrl(sample.file)}
                download={sample.file}
                title={sample.hint}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-cyan-300 bg-white text-[11px] font-bold text-cyan-900 hover:bg-cyan-100 hover:border-cyan-400 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 shrink-0 text-cyan-600" />
                {sample.label}
              </a>
            ))}
          </div>
        </div>

        {!preview && (
          <p className="text-slate-500 text-sm py-6 text-center">Chọn file .txt hoặc bấm Sửa một khóa đã lưu để bắt đầu.</p>
        )}
        {preview && (
          <div className="space-y-3 text-sm shrink-0">
            <p className="font-semibold text-slate-700">
              Nhận diện: <span className="text-indigo-600">{preview.detect}</span>
            </p>
            {preview.ok ? (
              <p className="flex items-center gap-1 text-emerald-700 font-bold text-xs">
                <CheckCircle className="w-4 h-4 shrink-0" /> Hợp lệ — nội dung lưu là bản đang chỉnh ở đây.
              </p>
            ) : (
              <div className="text-rose-700 space-y-1">
                <p className="flex items-center gap-1 font-bold">
                  <AlertTriangle className="w-4 h-4" /> Chưa hợp lệ
                </p>
                <ul className="list-disc pl-5 text-xs">
                  {(preview.errors || []).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {preview?.ok && workingCourse && previewTopic && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-bold text-slate-600">Chủ đề:</span>
              <select
                value={previewTopicIndex}
                onChange={(e) => setPreviewTopicIndex(Number(e.target.value))}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold bg-white max-w-[min(100%,420px)]"
              >
                {(workingCourse.topics || []).map((t, i) => (
                  <option key={t.id || i} value={i}>
                    {t.title || `Chủ đề ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addTopicToWorking}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100"
              >
                <Plus className="w-3.5 h-3.5" /> Chủ đề
              </button>
              <button
                type="button"
                onClick={removeCurrentTopic}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xóa chủ đề
              </button>
              <button
                type="button"
                onClick={addExampleToCurrentTopic}
                className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-900 hover:bg-violet-100"
              >
                <Plus className="w-3.5 h-3.5" /> Ví dụ (slide)
              </button>
              <button
                type="button"
                onClick={addQuestionToCurrentTopic}
                className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-900 hover:bg-sky-100"
              >
                <Plus className="w-3.5 h-3.5" /> Câu hỏi
              </button>
              <button
                type="button"
                onClick={removeCurrentStepFromTopic}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xóa bước đang xem
              </button>
            </div>

            {previewSteps.length > 0 ? (
              <div className="flex flex-col lg:flex-row gap-4 w-full max-w-none items-start">
                <ChuyenDeOnTapAdminStepList
                  topic={previewTopic}
                  steps={previewSteps}
                  previewStepIndex={previewStepIndex}
                  onSelectStep={setPreviewStepIndex}
                  onReorderExamples={reorderExamplesInTopic}
                  onReorderQuestions={reorderQuestionsInTopic}
                />

                <div className="flex-1 min-w-0 w-full space-y-4">
                <div className="w-full flex justify-center">
                  <div className="w-full max-w-3xl">
                    <ChuyenDeOnTapStepView
                      courseTitle={workingCourse.title || ''}
                      topicTitle={previewTopic.title || ''}
                      step={previewSteps[previewStepIndex]}
                      stepIndex={previewStepIndex}
                      totalSteps={previewSteps.length}
                      onClose={() => setPreviewStepIndex(0)}
                      onPrev={() => setPreviewStepIndex((i) => Math.max(0, i - 1))}
                      onNext={() =>
                        setPreviewStepIndex((i) => Math.min(previewSteps.length - 1, i + 1))
                      }
                      variant="preview"
                    />
                  </div>
                </div>

                {currentPreviewStep && (
                  <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/90 to-slate-50 p-5 sm:p-6 space-y-4 shadow-inner">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-200/80 pb-3">
                      <h4 className="text-sm font-black uppercase tracking-wider text-indigo-900">
                        Sửa nội dung bước đang xem
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handlePickQuestionsOnlyFile}
                          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-sky-400 bg-sky-50 px-3 py-2 text-xs font-black text-sky-900 hover:bg-sky-100"
                          title="Chỉ thêm câu hỏi vào chủ đề — bỏ qua lý thuyết và ví dụ trong file"
                        >
                          <Upload className="w-4 h-4" />
                          Import câu hỏi
                        </button>
                        <a
                          href={reviewImportSampleUrl('MAU_5_NHIEU_CAU_HOI.txt')}
                          download="MAU_5_NHIEU_CAU_HOI.txt"
                          className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-white px-2.5 py-2 text-[10px] font-bold text-sky-800 hover:bg-sky-50"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Mẫu câu hỏi
                        </a>
                        <button
                          type="button"
                          onClick={undoLast}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
                        >
                          <Undo2 className="w-4 h-4" /> Quay lại bước trước
                        </button>
                        <button
                          type="button"
                          disabled={busy || !user}
                          onClick={saveToFirestore}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" />
                          {busy ? 'Đang lưu…' : editingFirestoreId ? 'Cập nhật' : 'Lưu Firestore'}
                        </button>
                      </div>
                    </div>
                      {currentPreviewStep.kind === 'intro' && (
                        <ChuyenDeOnTapRichTextField
                          label="Mở đầu chủ đề"
                          value={previewTopic.description || ''}
                          onChange={(v) => patchTopicField('description', v)}
                          rows={4}
                          storage={storage}
                          user={user}
                          gradeLevel={workingCourse?.grade_level || activeGrade || '11'}
                        />
                      )}
                      {currentPreviewStep.kind === 'video' && (
                        <label className="block text-xs font-semibold text-slate-600">
                          URL YouTube
                          <input
                            value={previewTopic.videoUrl || ''}
                            onChange={(e) => patchTopicField('videoUrl', e.target.value)}
                            className="mt-1 w-full text-xs p-2 border rounded-lg bg-white"
                          />
                        </label>
                      )}
                      {currentPreviewStep.kind === 'theory' && (
                        <ChuyenDeOnTapRichTextField
                          label="Lý thuyết / tóm tắt"
                          value={previewTopic.summary || ''}
                          onChange={(v) => patchTopicField('summary', v)}
                          rows={6}
                          storage={storage}
                          user={user}
                          gradeLevel={workingCourse?.grade_level || activeGrade || '11'}
                        />
                      )}
                      {currentPreviewStep.kind === 'example_item' &&
                        (() => {
                          const ei = currentPreviewStep.exampleIndex;
                          const exArr = previewTopic.examples;
                          const exRow =
                            Array.isArray(exArr) && exArr[ei] != null
                              ? exArr[ei]
                              : currentPreviewStep.example;
                          if (!exRow) return null;
                          const legacy = !Array.isArray(exArr) || !exArr.length;
                          return (
                            <div className="space-y-2">
                              {!legacy && (
                                <label className="block text-xs font-semibold text-slate-600">
                                  Nhãn ví dụ
                                  <input
                                    value={exRow.label || ''}
                                    onChange={(e) => patchExampleField(ei, 'label', e.target.value)}
                                    className="mt-1 w-full text-xs p-2 border rounded-lg bg-white"
                                  />
                                </label>
                              )}
                              <ChuyenDeOnTapRichTextField
                                label="Đề / nội dung ví dụ"
                                value={exRow.stem != null ? exRow.stem : previewTopic.example || ''}
                                onChange={(v) =>
                                  legacy ? patchTopicField('example', v) : patchExampleField(ei, 'stem', v)
                                }
                                rows={4}
                                storage={storage}
                                user={user}
                                gradeLevel={workingCourse?.grade_level || activeGrade || '11'}
                              />
                              {!legacy && (
                                <>
                                  <ChuyenDeOnTapRichTextField
                                    label="Đáp án (ẩn/hiện cho học sinh)"
                                    value={exRow.answer || ''}
                                    onChange={(v) => patchExampleField(ei, 'answer', v)}
                                    rows={3}
                                    storage={storage}
                                    user={user}
                                    gradeLevel={workingCourse?.grade_level || activeGrade || '11'}
                                  />
                                  <ChuyenDeOnTapRichTextField
                                    label="Gợi ý (tuỳ chọn)"
                                    value={exRow.hint || ''}
                                    onChange={(v) => patchExampleField(ei, 'hint', v)}
                                    rows={2}
                                    storage={storage}
                                    user={user}
                                    gradeLevel={workingCourse?.grade_level || activeGrade || '11'}
                                    showHeadings={false}
                                  />
                                </>
                              )}
                              {legacy && (
                                <p className="text-[10px] text-slate-500">
                                  Khối cũ <span className="font-mono">VÍ_DỤ_CHỤ_ĐỀ</span> — dùng{' '}
                                  <span className="font-mono">VÍ_DỤ_1:</span> + <span className="font-mono">ĐỀ_VÍ_DỤ</span> /{' '}
                                  <span className="font-mono">ĐÁP_ÁN_VÍ_DỤ</span> để có nhiều ví dụ có đáp án.
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      {currentPreviewStep.kind === 'question' &&
                        typeof currentPreviewStep.questionIndex === 'number' &&
                        previewTopic.questions?.[currentPreviewStep.questionIndex] &&
                        (() => {
                          const qi = currentPreviewStep.questionIndex;
                          const qRow = previewTopic.questions[qi];
                          return (
                            <div className="space-y-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-slate-800">Định dạng câu</span>
                                <button
                                  type="button"
                                  onClick={setQuestionDienOnly}
                                  disabled={qRow.questionType === 'dien'}
                                  className={`rounded-xl px-4 py-2 text-sm font-bold border-2 transition-colors ${
                                    qRow.questionType === 'dien'
                                      ? 'border-indigo-600 bg-indigo-600 text-white opacity-100'
                                      : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                                  }`}
                                >
                                  Điền đáp án
                                </button>
                                <button
                                  type="button"
                                  onClick={setQuestionMcqOnly}
                                  disabled={qRow.questionType === 'trac_nghiem'}
                                  className={`rounded-xl px-4 py-2 text-sm font-bold border-2 transition-colors ${
                                    qRow.questionType === 'trac_nghiem'
                                      ? 'border-violet-600 bg-violet-600 text-white'
                                      : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                                  }`}
                                >
                                  Trắc nghiệm A–D
                                </button>
                              </div>

                              <label className="block text-sm font-semibold text-slate-700">
                                Cấp độ (CẤP_ĐỘ)
                                <select
                                  value={parseReviewLevelId(qRow.level || 'nen_tang')}
                                  onChange={(e) => patchQuestionField(qi, 'level', e.target.value)}
                                  className="mt-2 w-full max-w-xs text-sm p-3 border-2 border-slate-200 rounded-xl bg-white font-bold"
                                >
                                  {REVIEW_LEVELS.map((lv) => (
                                    <option key={lv.id} value={lv.id}>
                                      {lv.emoji} {lv.label}
                                    </option>
                                  ))}
                                </select>
                                <span className="mt-1 block text-[11px] text-slate-500 font-normal">
                                  Mặc định <strong>Nền tảng</strong> nếu file import không ghi{' '}
                                  <span className="font-mono">CẤP_ĐỘ:</span>
                                </span>
                              </label>

                              <label className="block text-sm font-semibold text-slate-700">
                                Tiêu đề câu (nhãn)
                                <input
                                  value={qRow.label || ''}
                                  onChange={(e) => patchQuestionField(qi, 'label', e.target.value)}
                                  className="mt-2 w-full text-sm p-3 border-2 border-slate-200 rounded-xl bg-white"
                                />
                              </label>
                              <ChuyenDeOnTapRichTextField
                                label="Đề bài"
                                value={qRow.stem || ''}
                                onChange={(v) => patchQuestionField(qi, 'stem', v)}
                                rows={5}
                                storage={storage}
                                user={user}
                                gradeLevel={workingCourse?.grade_level || activeGrade || '11'}
                              />
                              <ChuyenDeOnTapRichTextField
                                label="Gợi ý"
                                value={qRow.hint || ''}
                                onChange={(v) => patchQuestionField(qi, 'hint', v)}
                                rows={3}
                                storage={storage}
                                user={user}
                                gradeLevel={workingCourse?.grade_level || activeGrade || '11'}
                                showHeadings={false}
                              />

                              {qRow.questionType === 'trac_nghiem' && (
                                <div className="space-y-3 rounded-xl border-2 border-violet-200 bg-violet-50/60 p-4">
                                  <p className="text-sm font-black text-violet-900">Lựa chọn — chọn đáp án đúng</p>
                                  {(qRow.options || []).map((opt, oi) => (
                                    <div key={String(opt.key) + oi} className="flex flex-wrap items-start gap-3">
                                      <label className="flex items-center gap-2 shrink-0 mt-3 cursor-pointer text-sm font-bold text-slate-800">
                                        <input
                                          type="radio"
                                          name={`mcq-correct-${qi}`}
                                          checked={!!opt.correct}
                                          onChange={() => {
                                            setWorkingCourse((wc) => {
                                              const t = wc?.topics?.[previewTopicIndex];
                                              if (!t?.questions?.[qi]) return wc;
                                              const n = deepCloneCourse(wc);
                                              const opts = n.topics[previewTopicIndex].questions[qi].options || [];
                                              const k = String(opt.key || '').toUpperCase();
                                              n.topics[previewTopicIndex].questions[qi].options = opts.map((o) => ({
                                                ...o,
                                                correct: String(o.key || '').toUpperCase() === k,
                                              }));
                                              return n;
                                            });
                                          }}
                                        />
                                        <span className="font-mono w-6">{opt.key}.</span>
                                      </label>
                                      <div className="flex-1 min-w-[12rem] space-y-1">
                                        <ChuyenDeOnTapRichTextField
                                          value={opt.text || ''}
                                          onChange={(v) => {
                                            setWorkingCourse((wc) => {
                                              const t = wc?.topics?.[previewTopicIndex];
                                              if (!t?.questions?.[qi]) return wc;
                                              const n = deepCloneCourse(wc);
                                              const opts = [...(n.topics[previewTopicIndex].questions[qi].options || [])];
                                              if (opts[oi]) opts[oi] = { ...opts[oi], text: v };
                                              n.topics[previewTopicIndex].questions[qi].options = opts;
                                              return n;
                                            });
                                          }}
                                          rows={2}
                                          storage={storage}
                                          user={user}
                                          gradeLevel={workingCourse?.grade_level || activeGrade || '11'}
                                          showHeadings={false}
                                          showPreview={false}
                                          textareaClassName="w-full text-sm p-2 border-2 border-slate-200 rounded-xl bg-white"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {qRow.questionType !== 'trac_nghiem' && (
                                <label className="block text-sm font-semibold text-slate-700">
                                  Đáp án điền (nhiều dạng đúng cách nhau bởi |)
                                  <textarea
                                    value={qRow.shortAnswer || ''}
                                    onChange={(e) => patchQuestionField(qi, 'shortAnswer', e.target.value)}
                                    rows={3}
                                    className="mt-2 w-full font-mono text-sm p-3 border-2 border-slate-200 rounded-xl bg-white"
                                  />
                                </label>
                              )}

                              <ChuyenDeOnTapRichTextField
                                label="Lời giải chi tiết"
                                value={qRow.explanation || ''}
                                onChange={(v) => patchQuestionField(qi, 'explanation', v)}
                                rows={5}
                                storage={storage}
                                user={user}
                                gradeLevel={workingCourse?.grade_level || activeGrade || '11'}
                              />
                              <label className="block text-sm font-semibold text-slate-700">
                                Video bài (URL)
                                <input
                                  value={qRow.videoUrl || ''}
                                  onChange={(e) => patchQuestionField(qi, 'videoUrl', e.target.value)}
                                  className="mt-2 w-full text-sm p-3 border-2 border-slate-200 rounded-xl bg-white"
                                />
                              </label>
                            </div>
                          );
                        })()}
                    </div>
                  )}
                </div>
              </div>
            ) : (
                <p className="text-xs text-amber-700 font-semibold">
                  Chủ đề này chưa có bước hiển thị — thêm lý thuyết, ví dụ hoặc câu hỏi trong TXT.
                </p>
              )}
            </>
          )}
        </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <h3 className="text-sm font-black text-slate-800 mb-3">Khóa đã lưu ({filtered.length})</h3>
        <div className="space-y-2">
          {filtered.length === 0 && <p className="text-sm text-slate-500">Chưa có khóa nào.</p>}
          {filtered.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-slate-100 bg-slate-50"
            >
              <div className="min-w-0">
                <p className="font-bold text-slate-800 truncate">{c.title || '—'}</p>
                <p className="text-[11px] text-slate-500">
                  Khối {c.grade_level || '—'} · {(c.topics || []).length} chủ đề · cập nhật{' '}
                  {c.updated_at ? new Date(c.updated_at).toLocaleString('vi-VN') : '—'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => startEditCourse(c)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-800 text-xs font-bold hover:bg-indigo-100"
                >
                  <Pencil className="w-3.5 h-3.5" /> Sửa
                </button>
                <button
                  type="button"
                  onClick={() => removeCourse(c.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
