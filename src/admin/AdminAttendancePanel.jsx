/* eslint-disable */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Filter, Bell } from 'lucide-react';
import { CLASS_OTHER_ID, normalizeStudentClassId } from '../classroomConstants';
import {
  ATTENDANCE_STATUS,
  ATTENDANCE_STATUS_LABELS,
  attendanceDocId,
  defaultAttendanceTitle,
  formatYmdVi,
  saveAttendanceSession,
  subscribeAttendanceSession,
  summarizeAttendance,
  todayYmd,
} from './classroomAttendanceStore';
import SendStudentNotificationButton from './SendStudentNotificationButton';

const STATUS_ORDER = ['present', 'late', 'excused', 'absent'];

function StatusBtn({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-colors ${
        active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'bg-slate-600 text-white/95 hover:bg-slate-500'
      }`}
    >
      {label}
    </button>
  );
}

export default function AdminAttendancePanel({
  activeGrade,
  studentsList = [],
  classesList = [],
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

  const [classId, setClassId] = useState(() => initialClassId || gradeFolders[0]?.id || CLASS_OTHER_ID);
  const [session, setSession] = useState('afternoon');
  const [dateYmd, setDateYmd] = useState(todayYmd());
  const [draftDate, setDraftDate] = useState(todayYmd());
  const [draftClassId, setDraftClassId] = useState(classId);
  const [draftSession, setDraftSession] = useState('afternoon');
  const [title, setTitle] = useState('');
  const [records, setRecords] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [notifyOpen, setNotifyOpen] = useState(false);
  const saveTimer = useRef(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (initialClassId) {
      setClassId(initialClassId);
      setDraftClassId(initialClassId);
    }
  }, [initialClassId]);

  const classMeta = useMemo(
    () => gradeFolders.find((c) => c.id === classId) || { id: classId, name: classId === CLASS_OTHER_ID ? 'Khác' : 'Lớp' },
    [gradeFolders, classId]
  );

  const classStudents = useMemo(() => {
    const g = String(activeGrade || '').trim();
    return (studentsList || [])
      .filter((s) => {
        if (g && g !== 'ALL' && String(s.grade_level || '') !== g) return false;
        return normalizeStudentClassId(s) === classId;
      })
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'vi'));
  }, [studentsList, activeGrade, classId]);

  const docId = attendanceDocId(classId, dateYmd, session);

  useEffect(() => {
    loadedRef.current = false;
    const unsub = subscribeAttendanceSession(docId, (data) => {
      if (data) {
        setTitle(data.title || defaultAttendanceTitle({ grade: activeGrade, classLabel: classMeta.name, dateYmd }));
        setRecords(data.records || {});
      } else {
        setTitle(defaultAttendanceTitle({ grade: activeGrade, classLabel: classMeta.name, dateYmd }));
        setRecords({});
      }
      loadedRef.current = true;
    });
    return () => unsub();
  }, [docId, activeGrade, classMeta.name, dateYmd]);

  const counts = useMemo(
    () => summarizeAttendance(classStudents, records),
    [classStudents, records]
  );

  const scheduleSave = (nextRecords, nextTitle) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      setErr('');
      try {
        await saveAttendanceSession({
          class_id: classId,
          grade_level: activeGrade === 'ALL' ? '' : activeGrade,
          session,
          date: dateYmd,
          title: nextTitle ?? title,
          records: nextRecords ?? records,
        });
        setMsg('Đã lưu điểm danh.');
      } catch (e) {
        console.error(e);
        setErr('Lưu điểm danh thất bại. Kiểm tra đăng nhập / Firestore rules.');
      } finally {
        setSaving(false);
      }
    }, 400);
  };

  const setStatus = (studentId, status) => {
    const next = { ...records, [studentId]: status };
    setRecords(next);
    scheduleSave(next, title);
  };

  const applyFilter = () => {
    setClassId(draftClassId || CLASS_OTHER_ID);
    setSession(draftSession === 'morning' ? 'morning' : 'afternoon');
    setDateYmd(draftDate || todayYmd());
    setMsg('');
  };

  const exportCsv = () => {
    const lines = [['STT', 'Họ tên', 'Trạng thái']];
    classStudents.forEach((s, i) => {
      const st = records[s.id];
      lines.push([
        String(i + 1),
        s.name || '',
        ATTENDANCE_STATUS_LABELS[st] || 'Chưa điểm danh',
      ]);
    });
    const csv = lines.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diem-danh-${classMeta.name}-${dateYmd}-${session}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const notifyList = useMemo(
    () =>
      classStudents.filter((s) => {
        const st = records[s.id];
        return st === 'late' || st === 'excused' || st === 'absent';
      }),
    [classStudents, records]
  );

  return (
    <div className="space-y-4">
      <div className="bg-slate-100/90 border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <h2 className="text-xl font-black text-blue-700 mr-auto">Quản lý điểm danh</h2>
          <SendStudentNotificationButton
            category="attendance"
            studentsList={classStudents}
            activeGrade={activeGrade}
            classId={classId}
            defaultTitle="Thông báo điểm danh"
            defaultBody={`Điểm danh buổi ${session === 'morning' ? 'sáng' : 'chiều'} ngày ${formatYmdVi(dateYmd)}.`}
            compact
          />
          <label className="text-xs font-bold text-slate-600">
            Khối
            <div className="mt-1 px-3 py-2 rounded-lg border bg-white text-sm font-bold text-slate-800 min-w-[5.5rem]">
              {activeGrade === 'ALL' ? 'Tất cả' : `Khối ${activeGrade}`}
            </div>
          </label>
          <label className="text-xs font-bold text-slate-600">
            Lớp
            <select
              value={draftClassId}
              onChange={(e) => setDraftClassId(e.target.value)}
              className="mt-1 block w-full min-w-[9rem] px-3 py-2 rounded-lg border bg-white text-sm font-semibold"
            >
              {gradeFolders.length === 0 ? <option value={CLASS_OTHER_ID}>Chọn lớp</option> : null}
              {gradeFolders.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value={CLASS_OTHER_ID}>Khác</option>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">
            Buổi
            <select
              value={draftSession}
              onChange={(e) => setDraftSession(e.target.value)}
              className="mt-1 block w-full min-w-[7rem] px-3 py-2 rounded-lg border bg-white text-sm font-semibold"
            >
              <option value="morning">Sáng</option>
              <option value="afternoon">Chiều</option>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">
            Lọc ngày
            <input
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              className="mt-1 block px-3 py-2 rounded-lg border bg-white text-sm font-semibold"
            />
          </label>
          <button
            type="button"
            onClick={applyFilter}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700"
          >
            <Filter size={16} /> Lọc
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-bold hover:bg-orange-600"
          >
            <Download size={16} /> Tải về
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_12rem] gap-3">
        <label className="text-xs font-bold text-slate-600">
          Tiêu đề
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              scheduleSave(records, e.target.value);
            }}
            className="mt-1 w-full px-3 py-2.5 rounded-lg border bg-white text-sm font-semibold"
          />
        </label>
        <label className="text-xs font-bold text-slate-600">
          Ngày điểm danh
          <input
            type="date"
            value={dateYmd}
            onChange={(e) => {
              setDateYmd(e.target.value);
              setDraftDate(e.target.value);
            }}
            className="mt-1 w-full px-3 py-2.5 rounded-lg border bg-white text-sm font-semibold"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          ['Sĩ số', counts.total],
          ['Đi học', counts.present],
          ['Đi muộn', counts.late],
          ['Nghỉ có phép', counts.excused],
          ['Nghỉ không phép', counts.absent],
        ].map(([label, n]) => (
          <div
            key={label}
            className="rounded-xl border border-blue-200 bg-white px-3 py-3 text-center shadow-sm"
          >
            <p className="text-xs font-bold text-slate-500">{label}</p>
            <p className="text-xl font-black text-slate-900 tabular-nums mt-0.5">{n}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setNotifyOpen(true)}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 shadow-sm"
      >
        <Bell size={16} />
        Gửi thông báo đến phụ huynh những bạn nghỉ học hoặc đi muộn
      </button>

      {(msg || err || saving) && (
        <p className={`text-sm font-semibold ${err ? 'text-red-600' : 'text-emerald-700'}`}>
          {err || (saving ? 'Đang lưu…' : msg)}
        </p>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-sm">
        {classStudents.length === 0 ? (
          <p className="p-8 text-center text-slate-500 text-sm">Lớp chưa có học sinh.</p>
        ) : (
          classStudents.map((s, idx) => {
            const st = records[s.id] || '';
            return (
              <div key={s.id} className="px-4 py-4">
                <p className="font-bold text-slate-900 mb-2.5">
                  {idx + 1}. {s.name}
                </p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_ORDER.map((key) => (
                    <StatusBtn
                      key={key}
                      active={st === key}
                      label={ATTENDANCE_STATUS_LABELS[key]}
                      onClick={() => setStatus(s.id, ATTENDANCE_STATUS[key])}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs text-slate-400">
        Buổi {session === 'morning' ? 'sáng' : 'chiều'} · {formatYmdVi(dateYmd)} · {classMeta.name}
      </p>

      {notifyOpen ? (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-3">
            <h3 className="font-black text-slate-900">Thông báo phụ huynh (xem trước)</h3>
            <p className="text-sm text-slate-600">
              Giai đoạn này chưa gửi Zalo/email tự động. Danh sách học sinh nghỉ hoặc đi muộn:
            </p>
            {notifyList.length === 0 ? (
              <p className="text-sm text-slate-500 italic">Không có học sinh nghỉ/muộn trong buổi này.</p>
            ) : (
              <ul className="max-h-60 overflow-y-auto space-y-1.5 text-sm">
                {notifyList.map((s) => (
                  <li key={s.id} className="flex justify-between gap-2 border-b border-slate-100 py-1.5">
                    <span className="font-semibold text-slate-800">{s.name}</span>
                    <span className="text-slate-500">{ATTENDANCE_STATUS_LABELS[records[s.id]]}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setNotifyOpen(false);
                  setMsg(
                    notifyList.length
                      ? `Đã xác nhận danh sách ${notifyList.length} học sinh nghỉ/muộn.`
                      : 'Không có học sinh cần thông báo.'
                  );
                }}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold"
              >
                Xác nhận
              </button>
              <button
                type="button"
                onClick={() => setNotifyOpen(false)}
                className="px-4 py-2 rounded-lg border text-sm font-bold text-slate-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
