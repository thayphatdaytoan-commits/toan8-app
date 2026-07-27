/* eslint-disable */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Download, Eye, Sparkles, Trash2, Wand2, X } from 'lucide-react';
import { CLASS_OTHER_ID, normalizeStudentClassId } from '../classroomConstants';
import { addDaysYmd, weekStartMonday } from './classroomTimetableStore';
import {
  FEEDBACK_TEMPLATES,
  buildAttendanceSummary,
  buildLessonProgressSummary,
  buildOnlineScoreSummary,
  deleteFeedback,
  feedbackPeriodKey,
  formatPeriodLabel,
  saveFeedback,
  subscribeFeedbackPeriod,
} from './classroomFeedbackStore';
import { currentMonthKey, downloadElementAsPng } from './receiptDownload';
import SendStudentNotificationButton from './SendStudentNotificationButton';

function FeedbackSlipCard({ data, periodLabel, cardRef }) {
  const displayDate = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div
      ref={cardRef}
      className="w-full max-w-md mx-auto rounded-2xl overflow-hidden bg-white shadow-xl border border-slate-200"
    >
      <div className="relative bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-400 px-5 pt-6 pb-8 text-white text-center">
        <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-[11px] font-black tracking-wide uppercase">
          {data.student_name}
        </span>
        <h3 className="text-2xl font-black mt-3 tracking-wide">PHIẾU NHẬN XÉT</h3>
        <p className="text-sm font-semibold mt-1 opacity-95">{periodLabel}</p>
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold opacity-90">
          <Calendar size={14} /> Ngày {displayDate}
        </p>
        <div className="absolute left-4 top-10 text-yellow-200/80">
          <Sparkles size={18} />
        </div>
        <div className="absolute right-6 bottom-4 text-white/40">
          <Sparkles size={22} />
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        <p className="text-[11px] font-black tracking-wide text-violet-700 text-center">
          NỘI DUNG ĐÁNH GIÁ
        </p>
        <div className="space-y-2.5 text-sm">
          <div className="rounded-xl bg-violet-50 border border-violet-100 px-3 py-2.5">
            <p className="text-[11px] font-black text-violet-600 mb-0.5">Chuyên cần</p>
            <p className="font-semibold text-slate-800">{data.attendance_summary || '—'}</p>
          </div>
          <div className="rounded-xl bg-fuchsia-50 border border-fuchsia-100 px-3 py-2.5">
            <p className="text-[11px] font-black text-fuchsia-600 mb-0.5">Điểm KT online</p>
            <p className="font-semibold text-slate-800">{data.online_score_summary || '—'}</p>
          </div>
          <div className="rounded-xl bg-pink-50 border border-pink-100 px-3 py-2.5">
            <p className="text-[11px] font-black text-pink-600 mb-0.5">Tiến độ học online</p>
            <p className="font-semibold text-slate-800">{data.lesson_progress_summary || '—'}</p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-6">
        <p className="text-center text-[11px] font-black tracking-wide text-fuchsia-700 mb-2">
          ❤ NHẬN XÉT CỦA GIÁO VIÊN ❤
        </p>
        <div className="rounded-xl bg-gradient-to-br from-violet-50 to-pink-50 border border-violet-100 px-4 py-3 min-h-[4.5rem]">
          <p className="text-sm italic text-slate-700 leading-relaxed text-center">
            {data.comment ? `“${data.comment}”` : 'Chưa có nhận xét.'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminFeedbackPanel({
  activeGrade,
  studentsList = [],
  classesList = [],
  scoresList = [],
  quizzesList = [],
}) {
  const [periodType, setPeriodType] = useState('month');
  const [periodKey, setPeriodKey] = useState(() => feedbackPeriodKey('month'));
  const [filterClassId, setFilterClassId] = useState('');
  const [rows, setRows] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [templatesFor, setTemplatesFor] = useState(null);
  const [preview, setPreview] = useState(null);
  const [assessCache, setAssessCache] = useState({});
  const cardRef = useRef(null);

  const gradeFolders = useMemo(() => {
    const g = String(activeGrade || '').trim();
    return (classesList || [])
      .filter((c) => {
        if (!g || g === 'ALL') return true;
        return String(c.grade_level || '') === g;
      })
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'vi'));
  }, [classesList, activeGrade]);

  const gradeStudents = useMemo(() => {
    const g = String(activeGrade || '').trim();
    return (studentsList || [])
      .filter((s) => {
        if (g && g !== 'ALL' && String(s.grade_level || '') !== g) return false;
        if (filterClassId && normalizeStudentClassId(s) !== filterClassId) return false;
        return true;
      })
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'vi'));
  }, [studentsList, activeGrade, filterClassId]);

  useEffect(() => {
    const unsub = subscribeFeedbackPeriod(periodType, periodKey, setRows, () =>
      setErr('Không tải được nhận xét.')
    );
    return () => unsub();
  }, [periodType, periodKey]);

  useEffect(() => {
    const map = {};
    rows.forEach((r) => {
      if (r.student_id) map[r.student_id] = r.comment || '';
    });
    setDrafts(map);
  }, [rows]);

  const savedByStudent = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      if (r.student_id) map[r.student_id] = r;
    });
    return map;
  }, [rows]);

  const periodLabel = formatPeriodLabel(periodType, periodKey);

  const ensureAssessment = async (student) => {
    const cacheKey = `${student.id}_${periodType}_${periodKey}`;
    if (assessCache[cacheKey]) return assessCache[cacheKey];

    const attendance_summary = await buildAttendanceSummary({
      classId: normalizeStudentClassId(student),
      studentId: student.id,
      periodType,
      periodKey,
    });
    const online_score_summary = buildOnlineScoreSummary(
      scoresList,
      student.name,
      periodType,
      periodKey
    );
    const lesson_progress_summary = buildLessonProgressSummary(
      scoresList,
      quizzesList,
      student.name,
      activeGrade
    );
    const result = { attendance_summary, online_score_summary, lesson_progress_summary };
    setAssessCache((prev) => ({ ...prev, [cacheKey]: result }));
    return result;
  };

  const saveComment = async (student) => {
    setBusy(true);
    setErr('');
    try {
      const assess = await ensureAssessment(student);
      const existing = savedByStudent[student.id];
      await saveFeedback(
        {
          student_id: student.id,
          student_name: student.name,
          class_id: normalizeStudentClassId(student),
          grade_level: student.grade_level || (activeGrade === 'ALL' ? '' : activeGrade),
          period_type: periodType,
          period_key: periodKey,
          comment: drafts[student.id] || '',
          ...assess,
        },
        existing?.id || ''
      );
      setMsg(`Đã lưu nhận xét — ${student.name}.`);
    } catch (ex) {
      console.error(ex);
      setErr('Lưu nhận xét thất bại.');
    } finally {
      setBusy(false);
    }
  };

  const openPreview = async (student) => {
    setBusy(true);
    try {
      const assess = await ensureAssessment(student);
      const existing = savedByStudent[student.id];
      setPreview({
        student_name: student.name,
        comment: drafts[student.id] || existing?.comment || '',
        ...assess,
        ...(existing || {}),
        comment: drafts[student.id] || existing?.comment || '',
      });
    } catch (ex) {
      console.error(ex);
      setErr('Không mở được phiếu nhận xét.');
    } finally {
      setBusy(false);
    }
  };

  const downloadPreview = async () => {
    try {
      await downloadElementAsPng(
        cardRef.current,
        `nhan-xet-${preview?.student_name || 'hs'}-${periodKey}.png`
      );
      setMsg('Đã tải ảnh phiếu nhận xét.');
    } catch (ex) {
      console.error(ex);
      setErr(ex.message || 'Tải ảnh thất bại.');
    }
  };

  const handleDelete = async (student) => {
    const row = savedByStudent[student.id];
    if (!row?.id || !window.confirm('Xóa nhận xét đã lưu?')) return;
    try {
      await deleteFeedback(row.id);
      setDrafts((prev) => ({ ...prev, [student.id]: '' }));
      setMsg('Đã xóa nhận xét.');
    } catch (ex) {
      console.error(ex);
      setErr('Xóa thất bại.');
    }
  };

  const switchPeriodType = (type) => {
    setPeriodType(type);
    setPeriodKey(feedbackPeriodKey(type));
    setAssessCache({});
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-black text-fuchsia-800 mr-auto">Nhận xét học sinh</h2>
          <SendStudentNotificationButton
            category="feedback"
            studentsList={studentsList}
            activeGrade={activeGrade}
            classId={filterClassId}
            defaultTitle="Phiếu nhận xét mới"
            defaultBody={`Giáo viên đã cập nhật nhận xét ${periodLabel}. Các em xem trên hệ thống.`}
            compact
          />
          <div className="flex rounded-xl overflow-hidden border border-fuchsia-200">
            <button
              type="button"
              onClick={() => switchPeriodType('week')}
              className={`px-3 py-2 text-xs font-bold ${
                periodType === 'week' ? 'bg-fuchsia-600 text-white' : 'bg-white text-slate-700'
              }`}
            >
              Theo tuần
            </button>
            <button
              type="button"
              onClick={() => switchPeriodType('month')}
              className={`px-3 py-2 text-xs font-bold ${
                periodType === 'month' ? 'bg-fuchsia-600 text-white' : 'bg-white text-slate-700'
              }`}
            >
              Theo tháng
            </button>
          </div>
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
              <option value={CLASS_OTHER_ID}>Khác</option>
            </select>
          </label>

          {periodType === 'month' ? (
            <label className="text-xs font-bold text-slate-600">
              Tháng
              <input
                type="month"
                value={periodKey}
                onChange={(e) => {
                  setPeriodKey(e.target.value || currentMonthKey());
                  setAssessCache({});
                }}
                className="mt-1 block px-3 py-2 rounded-lg border bg-white text-sm font-semibold"
              />
            </label>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setPeriodKey(addDaysYmd(periodKey, -7));
                  setAssessCache({});
                }}
                className="px-2 py-2 rounded-lg border bg-white text-sm font-bold"
              >
                ‹
              </button>
              <div className="px-3 py-2 rounded-lg border bg-slate-50 text-sm font-black min-w-[10rem] text-center">
                {periodLabel}
              </div>
              <button
                type="button"
                onClick={() => {
                  setPeriodKey(addDaysYmd(periodKey, 7));
                  setAssessCache({});
                }}
                className="px-2 py-2 rounded-lg border bg-white text-sm font-bold"
              >
                ›
              </button>
              <button
                type="button"
                onClick={() => {
                  setPeriodKey(weekStartMonday());
                  setAssessCache({});
                }}
                className="px-3 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold"
              >
                Tuần này
              </button>
            </div>
          )}
        </div>

        {(msg || err || busy) && (
          <p className={`text-sm font-semibold ${err ? 'text-red-600' : 'text-emerald-700'}`}>
            {err || (busy ? 'Đang xử lý…' : msg)}
          </p>
        )}
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-fuchsia-50 text-fuchsia-900">
              <tr>
                <th className="p-3 font-black w-48">Học sinh</th>
                <th className="p-3 font-black">Nhận xét</th>
                <th className="p-3 font-black text-right w-40">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {gradeStudents.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500">
                    Không có học sinh trong bộ lọc.
                  </td>
                </tr>
              ) : (
                gradeStudents.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100 align-top">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="w-9 h-9 rounded-full bg-fuchsia-100 text-fuchsia-800 flex items-center justify-center text-xs font-black shrink-0">
                          {String(s.name || '?')
                            .trim()
                            .slice(0, 1)
                            .toUpperCase()}
                        </span>
                        <span className="font-bold text-slate-900">{s.name}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <textarea
                        value={drafts[s.id] || ''}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))
                        }
                        rows={2}
                        placeholder="Nhập nhận xét của giáo viên…"
                        className="w-full px-3 py-2 rounded-lg border text-sm resize-y min-h-[3rem]"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap justify-end gap-1">
                        <button
                          type="button"
                          title="Gợi ý mẫu"
                          onClick={() => setTemplatesFor(s.id)}
                          className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50"
                        >
                          <Wand2 size={16} />
                        </button>
                        <button
                          type="button"
                          title="Xem phiếu / tải ảnh"
                          onClick={() => openPreview(s)}
                          className="p-1.5 rounded-lg text-fuchsia-600 hover:bg-fuchsia-50"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => saveComment(s)}
                          className="px-2.5 py-1.5 rounded-lg bg-fuchsia-600 text-white text-xs font-bold hover:bg-fuchsia-700"
                        >
                          Lưu
                        </button>
                        {savedByStudent[s.id] ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(s)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {templatesFor ? (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 flex items-center gap-2">
                <Wand2 size={18} className="text-amber-500" /> Mẫu nhận xét gợi ý
              </h3>
              <button
                type="button"
                onClick={() => setTemplatesFor(null)}
                className="p-1 rounded hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <ul className="space-y-2">
              {FEEDBACK_TEMPLATES.map((t) => (
                <li key={t}>
                  <button
                    type="button"
                    onClick={() => {
                      setDrafts((prev) => ({ ...prev, [templatesFor]: t }));
                      setTemplatesFor(null);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl border border-slate-200 hover:border-fuchsia-300 hover:bg-fuchsia-50 text-sm font-semibold text-slate-800"
                  >
                    {t}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {preview ? (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md my-4 space-y-3">
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={downloadPreview}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-fuchsia-700 text-sm font-bold shadow"
              >
                <Download size={16} /> Tải ảnh
              </button>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="px-4 py-2 rounded-xl bg-white/90 text-slate-700 text-sm font-bold shadow"
              >
                Đóng
              </button>
            </div>
            <FeedbackSlipCard data={preview} periodLabel={periodLabel} cardRef={cardRef} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
