/* eslint-disable */
import React, { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, Link2, Plus, Trash2, X } from 'lucide-react';
import { CLASS_OTHER_ID, normalizeStudentClassId } from '../classroomConstants';
import {
  deleteHomeworkAssignment,
  saveHomeworkAssignment,
  subscribeHomeworkByGrade,
} from './classroomHomeworkStore';
import { buildResourceLabel, parseInternalResourceLink } from './parseInternalResourceLink';
import SendStudentNotificationButton from './SendStudentNotificationButton';
import { sendStudentNotifications } from './classroomNotificationStore';

function emptyForm(classId, grade) {
  return {
    class_id: classId || '',
    grade_level: grade === 'ALL' ? '' : grade,
    title: '',
    description: '',
    due_date: '',
    items: [],
    linkDraft: '',
  };
}

export default function AdminHomeworkPanel({
  activeGrade,
  studentsList = [],
  classesList = [],
  lessonsList = [],
  quizzesList = [],
  initialClassId = '',
}) {
  const [filterClassId, setFilterClassId] = useState(initialClassId || '');
  const [rows, setRows] = useState([]);
  const [editor, setEditor] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const gradeFolders = useMemo(() => {
    const g = String(activeGrade || '').trim();
    return (classesList || [])
      .filter((c) => {
        if (!g || g === 'ALL') return true;
        return String(c.grade_level || '') === g;
      })
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'vi'));
  }, [classesList, activeGrade]);

  const classNameById = useMemo(() => {
    const map = {};
    gradeFolders.forEach((c) => {
      map[c.id] = c.name;
    });
    map[CLASS_OTHER_ID] = 'Khác';
    return map;
  }, [gradeFolders]);

  useEffect(() => {
    if (initialClassId) setFilterClassId(initialClassId);
  }, [initialClassId]);

  useEffect(() => {
    const unsub = subscribeHomeworkByGrade(activeGrade, setRows, () =>
      setErr('Không tải được BTVN.')
    );
    return () => unsub();
  }, [activeGrade]);

  const filtered = useMemo(() => {
    return rows.filter((r) => !filterClassId || r.class_id === filterClassId);
  }, [rows, filterClassId]);

  const recipientsFor = (classId) =>
    (studentsList || []).filter((s) => {
      const g = String(activeGrade || '').trim();
      if (g && g !== 'ALL' && String(s.grade_level || '') !== g) return false;
      if (classId && normalizeStudentClassId(s) !== classId) return false;
      return Boolean(s.id);
    });

  const addLinkItem = () => {
    const raw = String(editor?.linkDraft || '').trim();
    if (!raw) return;
    const parsed = parseInternalResourceLink(raw);
    const label = buildResourceLabel(parsed, lessonsList, quizzesList) || parsed.label || raw;
    setEditor((prev) => ({
      ...prev,
      items: [
        ...(prev.items || []),
        {
          kind: parsed.kind,
          label,
          link_url: parsed.link_url || raw,
          resource_id: parsed.resource_id || '',
        },
      ],
      linkDraft: '',
    }));
  };

  const saveEditor = async (e) => {
    e.preventDefault();
    if (!editor) return;
    setBusy(true);
    setErr('');
    try {
      await saveHomeworkAssignment(editor, editor.id || '');
      setEditor(null);
      setMsg('Đã lưu BTVN.');
    } catch (ex) {
      console.error(ex);
      setErr('Lưu BTVN thất bại.');
    } finally {
      setBusy(false);
    }
  };

  const saveAndNotify = async () => {
    if (!editor) return;
    setBusy(true);
    setErr('');
    try {
      const saved = await saveHomeworkAssignment(editor, editor.id || '');
      const items = saved?.items || [];
      const link = items[0];
      const bodyLines = [
        editor.description,
        items.length ? `Link: ${items.map((it) => it.label).join(', ')}` : '',
        editor.due_date ? `Hạn nộp: ${editor.due_date}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      await sendStudentNotifications({
        students: recipientsFor(editor.class_id),
        category: 'homework',
        title: editor.title || 'Bài tập về nhà mới',
        body: bodyLines,
        link_type: link?.kind === 'lesson' ? 'lesson' : link?.kind === 'quiz' ? 'quiz' : '',
        link_id: link?.resource_id || '',
        link_url: link?.link_url || '',
      });
      setEditor(null);
      setMsg('Đã lưu BTVN và gửi thông báo học sinh.');
    } catch (ex) {
      console.error(ex);
      setErr(ex.message || 'Lưu hoặc gửi thông báo thất bại.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id) => {
    if (!id || !window.confirm('Xóa BTVN này?')) return;
    try {
      await deleteHomeworkAssignment(id);
      setMsg('Đã xóa BTVN.');
    } catch (ex) {
      console.error(ex);
      setErr('Xóa thất bại.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-black text-indigo-800 mr-auto flex items-center gap-2">
            <BookOpenCheck size={20} /> Bài tập về nhà (BTVN)
          </h2>
          <SendStudentNotificationButton
            category="homework"
            studentsList={studentsList}
            activeGrade={activeGrade}
            classId={filterClassId}
            defaultTitle="Nhắc BTVN"
            defaultBody="Các em xem bài tập về nhà trên hệ thống và hoàn thành đúng hạn."
            compact
          />
          <button
            type="button"
            onClick={() =>
              setEditor(emptyForm(filterClassId || gradeFolders[0]?.id || CLASS_OTHER_ID, activeGrade))
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"
          >
            <Plus size={16} /> Giao BTVN
          </button>
        </div>
        <label className="text-xs font-bold text-slate-600 block">
          Lớp
          <select
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
            className="mt-1 block min-w-[9rem] px-3 py-2 rounded-lg border bg-white text-sm font-semibold"
          >
            <option value="">Tất cả lớp</option>
            {gradeFolders.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value={CLASS_OTHER_ID}>Khác</option>
          </select>
        </label>
        <p className="text-xs text-slate-500">
          Dán link bài giảng (<code>?lessonId=…</code> hoặc <code>/bai-giang/…</code>) hoặc đề thi (
          <code>?quizId=…</code>) từ trang web.
        </p>
        {(msg || err || busy) && (
          <p className={`text-sm font-semibold ${err ? 'text-red-600' : 'text-emerald-700'}`}>
            {err || (busy ? 'Đang xử lý…' : msg)}
          </p>
        )}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white border rounded-2xl p-10 text-center text-slate-500 text-sm">
            Chưa có BTVN. Bấm <strong>Giao BTVN</strong> để tạo.
          </div>
        ) : (
          filtered.map((row) => (
            <div key={row.id} className="bg-white border rounded-2xl p-4 shadow-sm">
              <HomeworkCard
                row={row}
                classNameById={classNameById}
                onEdit={() =>
                  setEditor({
                    ...emptyForm(row.class_id, activeGrade),
                    ...row,
                    items: Array.isArray(row.items) ? row.items.map((x) => ({ ...x })) : [],
                    id: row.id,
                    linkDraft: '',
                  })
                }
                onDelete={() => handleDelete(row.id)}
                studentsList={studentsList}
                activeGrade={activeGrade}
              />
            </div>
          ))
        )}
      </div>

      {editor ? (
        <HomeworkEditorModal
          editor={editor}
          setEditor={setEditor}
          gradeFolders={gradeFolders}
          onClose={() => setEditor(null)}
          onSave={saveEditor}
          onSaveAndNotify={saveAndNotify}
          onAddLink={addLinkItem}
          busy={busy}
        />
      ) : null}
    </div>
  );
}

function HomeworkCard({ row, classNameById, onEdit, onDelete, studentsList, activeGrade }) {
  const first = row.items?.[0];
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-indigo-600">
            {classNameById[row.class_id] || row.class_id}
            {row.due_date ? ` · Hạn ${row.due_date}` : ''}
          </p>
          <h3 className="font-black text-slate-900 text-lg">{row.title}</h3>
          {row.description ? <p className="text-sm text-slate-600 mt-1">{row.description}</p> : null}
        </div>
        <div className="flex flex-wrap gap-1">
          <SendStudentNotificationButton
            category="homework"
            studentsList={studentsList}
            activeGrade={activeGrade}
            classId={row.class_id}
            defaultTitle={row.title || 'BTVN'}
            defaultBody={row.description || 'Xem bài tập về nhà trên hệ thống.'}
            linkType={first?.kind === 'lesson' ? 'lesson' : first?.kind === 'quiz' ? 'quiz' : ''}
            linkId={first?.resource_id || ''}
            linkUrl={first?.link_url || ''}
            compact
          />
          <button
            type="button"
            onClick={onEdit}
            className="px-2.5 py-1.5 rounded-lg border text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Sửa
          </button>
          <button type="button" onClick={onDelete} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      {(row.items || []).length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {row.items.map((it, i) => (
            <li key={`${it.link_url}-${i}`} className="flex items-center gap-2 text-sm">
              <Link2 size={14} className="text-indigo-500 shrink-0" />
              <a
                href={it.link_url}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-indigo-700 hover:underline truncate"
              >
                {it.label || it.link_url}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function HomeworkEditorModal({
  editor,
  setEditor,
  gradeFolders,
  onClose,
  onSave,
  onSaveAndNotify,
  onAddLink,
  busy,
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
      <form
        onSubmit={onSave}
        className="bg-white rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-3 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-black text-slate-900">{editor.id ? 'Sửa BTVN' : 'Giao BTVN'}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <label className="block text-xs font-bold text-slate-600">
          Lớp
          <select
            required
            value={editor.class_id}
            onChange={(e) => setEditor({ ...editor, class_id: e.target.value })}
            className="mt-1 w-full px-3 py-2 rounded-lg border text-sm font-semibold"
          >
            {gradeFolders.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value={CLASS_OTHER_ID}>Khác</option>
          </select>
        </label>
        <label className="block text-xs font-bold text-slate-600">
          Tiêu đề BTVN
          <input
            required
            value={editor.title}
            onChange={(e) => setEditor({ ...editor, title: e.target.value })}
            className="mt-1 w-full px-3 py-2 rounded-lg border text-sm font-semibold"
            placeholder="VD: BTVN Chương 3 — Dạng 2"
          />
        </label>
        <label className="block text-xs font-bold text-slate-600">
          Mô tả (tuỳ chọn)
          <textarea
            value={editor.description}
            onChange={(e) => setEditor({ ...editor, description: e.target.value })}
            rows={2}
            className="mt-1 w-full px-3 py-2 rounded-lg border text-sm"
          />
        </label>
        <label className="block text-xs font-bold text-slate-600">
          Hạn nộp
          <input
            type="date"
            value={editor.due_date}
            onChange={(e) => setEditor({ ...editor, due_date: e.target.value })}
            className="mt-1 w-full px-3 py-2 rounded-lg border text-sm font-semibold"
          />
        </label>
        <div>
          <p className="text-xs font-black text-slate-700 mb-1">Link bài giảng / đề thi</p>
          <div className="flex gap-2">
            <input
              value={editor.linkDraft || ''}
              onChange={(e) => setEditor({ ...editor, linkDraft: e.target.value })}
              placeholder="Dán link bài giảng hoặc ?quizId=…"
              className="flex-1 px-3 py-2 rounded-lg border text-sm"
            />
            <button
              type="button"
              onClick={onAddLink}
              className="px-3 py-2 rounded-lg bg-indigo-100 text-indigo-800 text-sm font-bold"
            >
              Thêm
            </button>
          </div>
          <ul className="mt-2 space-y-1">
            {(editor.items || []).map((it, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm bg-slate-50 rounded-lg px-2 py-1.5">
                <Link2 size={14} className="text-indigo-500" />
                <span className="flex-1 truncate font-semibold">{it.label}</span>
                <button
                  type="button"
                  onClick={() =>
                    setEditor({
                      ...editor,
                      items: editor.items.filter((_, i) => i !== idx),
                    })
                  }
                  className="text-red-500 text-xs font-bold"
                >
                  Xóa
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border text-sm font-bold">
            Hủy
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold disabled:opacity-60"
          >
            Lưu
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onSaveAndNotify}
            className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-bold disabled:opacity-60"
          >
            Lưu & gửi thông báo
          </button>
        </div>
      </form>
    </div>
  );
}
