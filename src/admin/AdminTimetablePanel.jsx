/* eslint-disable */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Plus, Pencil, Trash2, X } from 'lucide-react';
import { CLASS_OTHER_ID } from '../classroomConstants';
import {
  DAY_LABELS,
  HOUR_SLOTS,
  addDaysYmd,
  copyTimetableWeek,
  deleteTimetableEntry,
  formatFee,
  formatWeekRangeVi,
  minutesToTime,
  parseYmd,
  saveTimetableEntry,
  subscribeTimetableWeek,
  timeToMinutes,
  weekStartMonday,
} from './classroomTimetableStore';
import SendStudentNotificationButton from './SendStudentNotificationButton';

const COLORS = [
  { id: 'blue', bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-900' },
  { id: 'emerald', bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-900' },
  { id: 'amber', bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-900' },
  { id: 'rose', bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-900' },
  { id: 'violet', bg: 'bg-violet-100', border: 'border-violet-300', text: 'text-violet-900' },
  { id: 'cyan', bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-900' },
];

function colorClass(id) {
  return COLORS.find((c) => c.id === id) || COLORS[0];
}

function emptyForm(weekStart, classId = '') {
  return {
    class_id: classId || '',
    subject: 'Toán',
    teacher: '',
    day_of_week: 1,
    start_time: '18:00',
    end_time: '20:00',
    fee: 0,
    week_start: weekStart,
    color: 'blue',
  };
}

export default function AdminTimetablePanel({
  activeGrade,
  classesList = [],
  studentsList = [],
  initialClassId = '',
}) {
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

  const [weekStart, setWeekStart] = useState(() => weekStartMonday());
  const [entries, setEntries] = useState([]);
  const [filterClassId, setFilterClassId] = useState(initialClassId || '');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState(null); // { id?, ...form }
  const [teachersList, setTeachersList] = useState([]);
  const [subjectsList, setSubjectsList] = useState(['Toán']);
  const [metaOpen, setMetaOpen] = useState(null); // 'teacher' | 'subject' | null
  const [metaDraft, setMetaDraft] = useState('');

  useEffect(() => {
    if (initialClassId) setFilterClassId(initialClassId);
  }, [initialClassId]);

  useEffect(() => {
    const unsub = subscribeTimetableWeek(
      weekStart,
      (rows) => setEntries(rows),
      () => setErr('Không tải được thời khóa biểu.')
    );
    return () => unsub();
  }, [weekStart]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterClassId && e.class_id !== filterClassId) return false;
      if (filterTeacher && !String(e.teacher || '').toLowerCase().includes(filterTeacher.toLowerCase())) {
        return false;
      }
      if (filterSubject && !String(e.subject || '').toLowerCase().includes(filterSubject.toLowerCase())) {
        return false;
      }
      if (activeGrade && activeGrade !== 'ALL' && e.grade_level && e.grade_level !== activeGrade) {
        return false;
      }
      return true;
    });
  }, [entries, filterClassId, filterTeacher, filterSubject, activeGrade]);

  const byDayHour = useMemo(() => {
    const map = {};
    DAY_LABELS.forEach((d) => {
      map[d.dow] = {};
      HOUR_SLOTS.forEach((h) => {
        map[d.dow][h] = [];
      });
    });
    filtered.forEach((e) => {
      const startM = timeToMinutes(e.start_time);
      const hour = Math.floor(startM / 60);
      const dow = e.day_of_week;
      if (map[dow] && map[dow][hour] !== undefined) {
        map[dow][hour].push(e);
      } else if (map[dow]) {
        const nearest = HOUR_SLOTS.reduce((best, h) =>
          Math.abs(h - hour) < Math.abs(best - hour) ? h : best
        );
        map[dow][nearest].push(e);
      }
    });
    return map;
  }, [filtered]);

  const openCreate = (dow, hour) => {
    const form = emptyForm(weekStart, filterClassId || gradeFolders[0]?.id || CLASS_OTHER_ID);
    if (dow) form.day_of_week = dow;
    if (hour != null) {
      form.start_time = minutesToTime(hour * 60);
      form.end_time = minutesToTime(Math.min(21 * 60, (hour + 2) * 60));
    }
    setEditor({ id: '', ...form });
  };

  const openEdit = (entry) => {
    setEditor({
      id: entry.id,
      class_id: entry.class_id || '',
      subject: entry.subject || 'Toán',
      teacher: entry.teacher || '',
      day_of_week: entry.day_of_week || 1,
      start_time: entry.start_time || '18:00',
      end_time: entry.end_time || '20:00',
      fee: entry.fee || 0,
      week_start: entry.week_start || weekStart,
      color: entry.color || 'blue',
    });
  };

  const saveEditor = async (e) => {
    e.preventDefault();
    if (!editor) return;
    setBusy(true);
    setErr('');
    try {
      await saveTimetableEntry(
        {
          ...editor,
          grade_level: activeGrade === 'ALL' ? '' : activeGrade,
          week_start: weekStart,
        },
        editor.id || ''
      );
      if (editor.teacher && !teachersList.includes(editor.teacher)) {
        setTeachersList((prev) => [...prev, editor.teacher].sort((a, b) => a.localeCompare(b, 'vi')));
      }
      if (editor.subject && !subjectsList.includes(editor.subject)) {
        setSubjectsList((prev) => [...prev, editor.subject].sort((a, b) => a.localeCompare(b, 'vi')));
      }
      setEditor(null);
      setMsg('Đã lưu lịch học.');
    } catch (ex) {
      console.error(ex);
      setErr('Lưu lịch thất bại. Kiểm tra đăng nhập / Firestore rules.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id) => {
    if (!id || !window.confirm('Xóa buổi học này?')) return;
    setBusy(true);
    try {
      await deleteTimetableEntry(id);
      setMsg('Đã xóa buổi học.');
      if (editor?.id === id) setEditor(null);
    } catch (ex) {
      console.error(ex);
      setErr('Xóa thất bại.');
    } finally {
      setBusy(false);
    }
  };

  const handleCopyPrev = async () => {
    const prev = addDaysYmd(weekStart, -7);
    if (!window.confirm(`Sao chép lịch từ tuần ${formatWeekRangeVi(prev)} sang tuần hiện tại?`)) return;
    setBusy(true);
    setErr('');
    try {
      const n = await copyTimetableWeek(prev, weekStart);
      setMsg(n ? `Đã sao chép ${n} buổi học.` : 'Tuần trước không có lịch.');
    } catch (ex) {
      console.error(ex);
      setErr('Sao chép tuần thất bại.');
    } finally {
      setBusy(false);
    }
  };

  const weekLabel = formatWeekRangeVi(weekStart);
  const mon = parseYmd(weekStart);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-black text-teal-800 mr-auto">Thời khóa biểu</h2>
          <SendStudentNotificationButton
            category="timetable"
            studentsList={studentsList}
            activeGrade={activeGrade}
            classId={filterClassId}
            defaultTitle="Cập nhật thời khóa biểu"
            defaultBody={`Lịch học tuần ${weekLabel}. Các em xem TKB trên hệ thống.`}
            compact
          />
          <button
            type="button"
            onClick={() => openCreate(1, 18)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 text-white text-sm font-bold hover:bg-teal-700"
          >
            <Plus size={16} /> Thêm lịch
          </button>
          <button
            type="button"
            onClick={() => {
              setMetaDraft('');
              setMetaOpen('teacher');
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Giáo viên
          </button>
          <button
            type="button"
            onClick={() => {
              setMetaDraft('');
              setMetaOpen('subject');
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Môn
          </button>
          <button
            type="button"
            onClick={handleCopyPrev}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-60"
          >
            <Copy size={16} /> Sao chép tuần trước
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-bold text-slate-600">
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
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">
            Giáo viên
            <input
              value={filterTeacher}
              onChange={(e) => setFilterTeacher(e.target.value)}
              list="tt-teachers"
              placeholder="Lọc GV…"
              className="mt-1 block min-w-[8rem] px-3 py-2 rounded-lg border bg-white text-sm font-semibold"
            />
            <datalist id="tt-teachers">
              {teachersList.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
          <label className="text-xs font-bold text-slate-600">
            Môn
            <input
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              list="tt-subjects"
              placeholder="Lọc môn…"
              className="mt-1 block min-w-[7rem] px-3 py-2 rounded-lg border bg-white text-sm font-semibold"
            />
            <datalist id="tt-subjects">
              {subjectsList.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>

          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={() => setWeekStart(addDaysYmd(weekStart, -7))}
              className="p-2 rounded-lg border bg-white hover:bg-slate-50"
              title="Tuần trước"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="px-3 py-2 rounded-lg border bg-slate-50 text-sm font-black text-slate-800 min-w-[11rem] text-center">
              {weekLabel}
            </div>
            <button
              type="button"
              onClick={() => setWeekStart(addDaysYmd(weekStart, 7))}
              className="p-2 rounded-lg border bg-white hover:bg-slate-50"
              title="Tuần sau"
            >
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(weekStartMonday())}
              className="px-3 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold hover:bg-slate-700"
            >
              Tuần này
            </button>
          </div>
        </div>

        {(msg || err || busy) && (
          <p className={`text-sm font-semibold ${err ? 'text-red-600' : 'text-emerald-700'}`}>
            {err || (busy ? 'Đang xử lý…' : msg)}
          </p>
        )}
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
        <table className="w-full min-w-[56rem] text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="p-2 border-b border-r text-xs font-bold text-slate-500 w-16 sticky left-0 bg-slate-100 z-10">
                Giờ
              </th>
              {DAY_LABELS.map((d) => {
                const dayDate = new Date(mon);
                dayDate.setDate(mon.getDate() + (d.dow - 1));
                const dd = String(dayDate.getDate()).padStart(2, '0');
                const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
                return (
                  <th key={d.dow} className="p-2 border-b text-center font-black text-slate-800">
                    <div>{d.short}</div>
                    <div className="text-[11px] font-semibold text-slate-500">
                      {dd}/{mm}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {HOUR_SLOTS.map((hour) => (
              <tr key={hour} className="align-top">
                <td className="p-1.5 border-r border-b text-xs font-bold text-slate-500 text-center sticky left-0 bg-white z-10">
                  {String(hour).padStart(2, '0')}:00
                </td>
                {DAY_LABELS.map((d) => {
                  const cell = byDayHour[d.dow]?.[hour] || [];
                  return (
                    <td
                      key={`${d.dow}-${hour}`}
                      className="p-1 border-b border-r min-h-[3.5rem] hover:bg-slate-50/80 cursor-pointer align-top"
                      onClick={() => openCreate(d.dow, hour)}
                    >
                      <div className="space-y-1 min-h-[2.75rem]">
                        {cell.map((entry) => {
                          const c = colorClass(entry.color);
                          return (
                            <div
                              key={entry.id}
                              role="button"
                              tabIndex={0}
                              onClick={(ev) => {
                                ev.stopPropagation();
                                openEdit(entry);
                              }}
                              onKeyDown={(ev) => {
                                if (ev.key === 'Enter') {
                                  ev.stopPropagation();
                                  openEdit(entry);
                                }
                              }}
                              className={`rounded-lg border px-2 py-1.5 text-left ${c.bg} ${c.border} ${c.text} shadow-sm`}
                            >
                              <p className="font-black text-xs leading-tight">
                                {classNameById[entry.class_id] || entry.class_id}
                              </p>
                              <p className="text-[11px] font-semibold opacity-90">
                                {entry.subject}
                                {entry.teacher ? ` · ${entry.teacher}` : ''}
                              </p>
                              <p className="text-[10px] font-bold tabular-nums mt-0.5">
                                {entry.start_time}–{entry.end_time}
                                {entry.fee ? ` · ${formatFee(entry.fee)}` : ''}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editor ? (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <form
            onSubmit={saveEditor}
            className="bg-white rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-3 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900">{editor.id ? 'Sửa buổi học' : 'Thêm buổi học'}</h3>
              <button type="button" onClick={() => setEditor(null)} className="p-1 rounded hover:bg-slate-100">
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
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-bold text-slate-600">
                Môn
                <input
                  value={editor.subject}
                  onChange={(e) => setEditor({ ...editor, subject: e.target.value })}
                  list="tt-subjects"
                  className="mt-1 w-full px-3 py-2 rounded-lg border text-sm font-semibold"
                />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                Giáo viên
                <input
                  value={editor.teacher}
                  onChange={(e) => setEditor({ ...editor, teacher: e.target.value })}
                  list="tt-teachers"
                  className="mt-1 w-full px-3 py-2 rounded-lg border text-sm font-semibold"
                />
              </label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className="block text-xs font-bold text-slate-600">
                Thứ
                <select
                  value={editor.day_of_week}
                  onChange={(e) => setEditor({ ...editor, day_of_week: Number(e.target.value) })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border text-sm font-semibold"
                >
                  {DAY_LABELS.map((d) => (
                    <option key={d.dow} value={d.dow}>
                      {d.short}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-bold text-slate-600">
                Bắt đầu
                <input
                  type="time"
                  value={editor.start_time}
                  onChange={(e) => setEditor({ ...editor, start_time: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border text-sm font-semibold"
                />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                Kết thúc
                <input
                  type="time"
                  value={editor.end_time}
                  onChange={(e) => setEditor({ ...editor, end_time: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border text-sm font-semibold"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-bold text-slate-600">
                Học phí (đ)
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={editor.fee}
                  onChange={(e) => setEditor({ ...editor, fee: Number(e.target.value) || 0 })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border text-sm font-semibold"
                />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                Màu
                <select
                  value={editor.color}
                  onChange={(e) => setEditor({ ...editor, color: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border text-sm font-semibold"
                >
                  {COLORS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap justify-between gap-2 pt-2">
              {editor.id ? (
                <button
                  type="button"
                  onClick={() => handleDelete(editor.id)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-red-600 border border-red-200 text-sm font-bold hover:bg-red-50"
                >
                  <Trash2 size={14} /> Xóa
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setEditor(null)}
                  className="px-4 py-2 rounded-lg border text-sm font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-60"
                >
                  <Pencil size={14} /> Lưu
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}

      {metaOpen ? (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-3">
            <h3 className="font-black text-slate-900">
              {metaOpen === 'teacher' ? 'Danh sách giáo viên' : 'Danh sách môn'}
            </h3>
            <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
              {(metaOpen === 'teacher' ? teachersList : subjectsList).map((item) => (
                <li key={item} className="px-2 py-1 rounded bg-slate-50 font-semibold text-slate-800">
                  {item}
                </li>
              ))}
              {(metaOpen === 'teacher' ? teachersList : subjectsList).length === 0 ? (
                <li className="text-slate-400 italic text-sm">Chưa có mục nào.</li>
              ) : null}
            </ul>
            <div className="flex gap-2">
              <input
                value={metaDraft}
                onChange={(e) => setMetaDraft(e.target.value)}
                placeholder={metaOpen === 'teacher' ? 'Tên GV mới…' : 'Tên môn mới…'}
                className="flex-1 px-3 py-2 rounded-lg border text-sm font-semibold"
              />
              <button
                type="button"
                onClick={() => {
                  const v = metaDraft.trim();
                  if (!v) return;
                  if (metaOpen === 'teacher') {
                    setTeachersList((prev) =>
                      prev.includes(v) ? prev : [...prev, v].sort((a, b) => a.localeCompare(b, 'vi'))
                    );
                  } else {
                    setSubjectsList((prev) =>
                      prev.includes(v) ? prev : [...prev, v].sort((a, b) => a.localeCompare(b, 'vi'))
                    );
                  }
                  setMetaDraft('');
                }}
                className="px-3 py-2 rounded-lg bg-teal-600 text-white text-sm font-bold"
              >
                Thêm
              </button>
            </div>
            <button
              type="button"
              onClick={() => setMetaOpen(null)}
              className="w-full px-4 py-2 rounded-lg border text-sm font-bold text-slate-700"
            >
              Đóng
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
