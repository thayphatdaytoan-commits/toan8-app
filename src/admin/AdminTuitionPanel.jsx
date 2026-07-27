/* eslint-disable */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Eye, Plus, Trash2, X, Banknote, QrCode, Upload } from 'lucide-react';
import { CLASS_OTHER_ID, normalizeStudentClassId } from '../classroomConstants';
import {
  computeTuitionTotal,
  deleteTuitionReceipt,
  fetchAttendanceForMonth,
  saveTuitionReceipt,
  subscribeTuitionMonth,
  subscribeTuitionSettings,
  uploadBankQrImage,
  saveTuitionSettings,
} from './classroomTuitionStore';
import {
  currentMonthKey,
  downloadElementAsPng,
  formatMoneyVnd,
  monthLabelVi,
} from './receiptDownload';
import SendStudentNotificationButton from './SendStudentNotificationButton';

const MONTH_NAMES = [
  '',
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

function emptyDraft(student, monthKey, grade) {
  return {
    student_id: student?.id || '',
    student_name: student?.name || '',
    class_id: normalizeStudentClassId(student),
    grade_level: student?.grade_level || grade || '',
    month_key: monthKey,
    fee_mode: 'session',
    fee_per_session: 50000,
    monthly_fee: 500000,
    session_count: 0,
    attended_dates: [],
    extras: [],
    total: 0,
    status: 'unpaid',
    teacher_note: '',
    payment_note: '',
  };
}

function TuitionReceiptCard({ draft, monthTitle, cardRef, bankQrUrl }) {
  const feeLine =
    draft.fee_mode === 'month'
      ? { label: 'Học phí tháng', amount: draft.monthly_fee }
      : { label: 'Học phí / buổi', amount: draft.fee_per_session };

  return (
    <div
      ref={cardRef}
      className="w-full max-w-md mx-auto rounded-2xl overflow-hidden bg-white shadow-xl border border-slate-200"
    >
      <div className="relative bg-gradient-to-br from-violet-600 via-fuchsia-500 to-pink-400 px-5 pt-5 pb-6 text-white">
        <p className="text-[11px] font-bold tracking-widest uppercase opacity-90">Phiếu học phí</p>
        <h3 className="text-2xl font-black mt-1">PHIẾU HỌC PHÍ</h3>
        <p className="text-sm font-semibold mt-1 opacity-95">{monthTitle}</p>
        <div className="absolute -right-4 -bottom-6 w-24 h-24 rounded-full bg-white/10" />
        <div className="absolute right-8 top-4 w-10 h-10 rounded-full bg-white/15" />
      </div>

      <div className="px-5 py-4 space-y-2.5 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-slate-500 font-semibold">Học sinh</span>
          <span className="font-black text-slate-900 text-right">{draft.student_name}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-slate-500 font-semibold">{feeLine.label}</span>
          <span className="font-bold text-slate-800">{formatMoneyVnd(feeLine.amount)}</span>
        </div>
        {draft.fee_mode === 'session' ? (
          <div className="flex justify-between gap-2">
            <span className="text-slate-500 font-semibold">Số buổi học</span>
            <span className="font-bold text-slate-800">{draft.session_count}</span>
          </div>
        ) : null}
        {(draft.extras || []).map((ex, i) => (
          <div key={`${ex.label}-${i}`} className="flex justify-between gap-2">
            <span className="text-slate-500 font-semibold">{ex.label}</span>
            <span className="font-bold text-slate-800">{formatMoneyVnd(ex.amount)}</span>
          </div>
        ))}
        <div className="flex justify-between gap-2 pt-2 border-t border-slate-100">
          <span className="font-black text-slate-900">Tổng thanh toán</span>
          <span className="font-black text-violet-700 text-lg">{formatMoneyVnd(draft.total)}</span>
        </div>
      </div>

      {(draft.attended_dates || []).length > 0 ? (
        <div className="px-5 pb-3">
          <p className="text-[11px] font-black tracking-wide text-violet-700 mb-2">NGÀY ĐI HỌC</p>
          <div className="flex flex-wrap gap-1.5">
            {draft.attended_dates.map((d) => (
              <span
                key={d}
                className="px-2.5 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-800"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {draft.teacher_note ? (
        <div className="px-5 pb-4">
          <p className="text-[11px] font-black tracking-wide text-fuchsia-700 mb-1">
            NHẬN XÉT CỦA GIÁO VIÊN
          </p>
          <p className="text-sm italic text-slate-700 leading-relaxed">“{draft.teacher_note}”</p>
        </div>
      ) : null}

      <div className="mx-5 mb-5 rounded-xl bg-slate-50 border border-dashed border-slate-300 px-4 py-4 text-center">
        <p className="text-[10px] font-black text-slate-500 tracking-wide">
          QUÉT MÃ ĐỂ THANH TOÁN
        </p>
        <div className="mt-3 mx-auto w-36 h-36 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
          {bankQrUrl ? (
            <img
              src={bankQrUrl}
              alt="Mã QR ngân hàng"
              crossOrigin="anonymous"
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-[10px] text-slate-400 font-bold px-2">
              Chưa có ảnh QR
              <br />
              (tải lên ở tab Học phí)
            </span>
          )}
        </div>
        <p className="mt-2 text-xs font-bold text-violet-700">{formatMoneyVnd(draft.total)}</p>
      </div>
    </div>
  );
}

export default function AdminTuitionPanel({
  activeGrade,
  studentsList = [],
  classesList = [],
}) {
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [filterClassId, setFilterClassId] = useState('');
  const [receipts, setReceipts] = useState([]);
  const [bankQrUrl, setBankQrUrl] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [editor, setEditor] = useState(null);
  const [preview, setPreview] = useState(null);
  const cardRef = useRef(null);
  const qrInputRef = useRef(null);

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
    const unsub = subscribeTuitionMonth(monthKey, setReceipts, () =>
      setErr('Không tải được danh sách học phí.')
    );
    return () => unsub();
  }, [monthKey]);

  useEffect(() => {
    const unsub = subscribeTuitionSettings((data) => {
      setBankQrUrl(String(data?.bank_qr_url || '').trim());
    });
    return () => unsub();
  }, []);

  const handleUploadBankQr = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErr('Vui lòng chọn file ảnh (PNG/JPG).');
      return;
    }
    setUploadingQr(true);
    setErr('');
    try {
      const url = await uploadBankQrImage(file);
      setBankQrUrl(url);
      setMsg('Đã tải ảnh mã QR ngân hàng. Ảnh sẽ hiện trên mọi phiếu học phí.');
    } catch (ex) {
      console.error(ex);
      setErr('Tải ảnh QR thất bại. Kiểm tra đăng nhập / Storage rules.');
    } finally {
      setUploadingQr(false);
    }
  };

  const handleRemoveBankQr = async () => {
    if (!bankQrUrl || !window.confirm('Gỡ ảnh mã QR ngân hàng khỏi phiếu học phí?')) return;
    setBusy(true);
    try {
      await saveTuitionSettings({ bank_qr_url: '' });
      setBankQrUrl('');
      setMsg('Đã gỡ ảnh QR.');
    } catch (ex) {
      console.error(ex);
      setErr('Gỡ QR thất bại.');
    } finally {
      setBusy(false);
    }
  };

  const receiptByStudent = useMemo(() => {
    const map = {};
    receipts.forEach((r) => {
      if (r.student_id) map[r.student_id] = r;
    });
    return map;
  }, [receipts]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      if (filterClassId && r.class_id !== filterClassId) return false;
      if (activeGrade && activeGrade !== 'ALL' && r.grade_level && r.grade_level !== activeGrade) {
        return false;
      }
      return true;
    });
  }, [receipts, filterClassId, activeGrade]);

  const summary = useMemo(() => {
    let total = 0;
    let unpaid = 0;
    filteredReceipts.forEach((r) => {
      const t = Number(r.total) || 0;
      total += t;
      if (r.status !== 'paid') unpaid += t;
    });
    return { total, unpaid };
  }, [filteredReceipts]);

  const openCreateForStudent = async (student) => {
    const draft = emptyDraft(student, monthKey, activeGrade);
    setBusy(true);
    try {
      const att = await fetchAttendanceForMonth({
        classId: draft.class_id,
        studentId: student.id,
        monthKey,
      });
      draft.session_count = att.sessionCount;
      draft.attended_dates = att.attendedDates;
      draft.total = computeTuitionTotal(draft);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
    setEditor(draft);
  };

  const openEdit = (row) => {
    setEditor({
      ...emptyDraft(null, monthKey, activeGrade),
      ...row,
      id: row.id,
      extras: Array.isArray(row.extras) ? row.extras.map((e) => ({ ...e })) : [],
    });
  };

  const syncTotal = (next) => {
    const t = computeTuitionTotal(next);
    return { ...next, total: t };
  };

  const saveEditor = async (e) => {
    e.preventDefault();
    if (!editor?.student_id) return;
    setBusy(true);
    setErr('');
    try {
      const payload = syncTotal(editor);
      await saveTuitionReceipt(payload, editor.id || '');
      setEditor(null);
      setMsg('Đã lưu phiếu học phí.');
    } catch (ex) {
      console.error(ex);
      setErr('Lưu học phí thất bại.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id) => {
    if (!id || !window.confirm('Xóa phiếu học phí này?')) return;
    try {
      await deleteTuitionReceipt(id);
      setMsg('Đã xóa phiếu.');
      if (preview?.id === id) setPreview(null);
    } catch (ex) {
      console.error(ex);
      setErr('Xóa thất bại.');
    }
  };

  const downloadPreview = async () => {
    try {
      await downloadElementAsPng(
        cardRef.current,
        `hoc-phi-${preview?.student_name || 'hs'}-${monthKey}.png`
      );
      setMsg('Đã tải ảnh phiếu học phí.');
    } catch (ex) {
      console.error(ex);
      setErr(ex.message || 'Tải ảnh thất bại.');
    }
  };

  const monthTitle = (() => {
    const m = monthKey.match(/^(\d{4})-(\d{2})$/);
    if (!m) return monthLabelVi(monthKey);
    return MONTH_NAMES[Number(m[2])] || monthLabelVi(monthKey);
  })();

  const year = monthKey.slice(0, 4) || String(new Date().getFullYear());

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white px-5 py-4 shadow-sm">
          <p className="text-xs font-bold opacity-90">Tổng</p>
          <p className="text-2xl font-black tabular-nums mt-1">{formatMoneyVnd(summary.total)}</p>
        </div>
        <div className="rounded-2xl bg-white border border-amber-200 px-5 py-4 shadow-sm">
          <p className="text-xs font-bold text-amber-700">Chưa thu</p>
          <p className="text-2xl font-black text-amber-800 tabular-nums mt-1">
            {formatMoneyVnd(summary.unpaid)}
          </p>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-black text-violet-800 mr-auto flex items-center gap-2">
            <Banknote size={20} /> Học phí
          </h2>
          <SendStudentNotificationButton
            category="tuition"
            studentsList={studentsList}
            activeGrade={activeGrade}
            classId={filterClassId}
            defaultTitle="Thông báo học phí"
            defaultBody={`Phiếu học phí ${monthTitle}. Phụ huynh vui lòng thanh toán đúng hạn.`}
            compact
          />
          <input
            ref={qrInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUploadBankQr}
          />
          <button
            type="button"
            disabled={uploadingQr}
            onClick={() => qrInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60"
          >
            <Upload size={16} />
            {uploadingQr ? 'Đang tải QR…' : 'Tải ảnh QR ngân hàng'}
          </button>
          {bankQrUrl ? (
            <button
              type="button"
              onClick={handleRemoveBankQr}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              <QrCode size={16} /> Gỡ QR
            </button>
          ) : null}
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
          <label className="text-xs font-bold text-slate-600">
            Tháng
            <input
              type="month"
              value={monthKey}
              onChange={(e) => setMonthKey(e.target.value || currentMonthKey())}
              className="mt-1 block px-3 py-2 rounded-lg border bg-white text-sm font-semibold"
            />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Năm
            <div className="mt-1 px-3 py-2 rounded-lg border bg-slate-50 text-sm font-bold min-w-[4.5rem]">
              {year}
            </div>
          </label>
        </div>

        {bankQrUrl ? (
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
            <img
              src={bankQrUrl}
              alt="QR ngân hàng"
              className="w-14 h-14 rounded-lg object-contain bg-white border"
            />
            <div className="min-w-0">
              <p className="text-xs font-black text-emerald-800 flex items-center gap-1">
                <QrCode size={14} /> Mã QR đang dùng trên phiếu học phí
              </p>
              <p className="text-[11px] text-emerald-700/80 truncate">Ảnh đã lưu — dùng chung mọi phiếu</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Chưa có mã QR. Bấm <strong>Tải ảnh QR ngân hàng</strong> để hiện QR trên phiếu thu.
          </p>
        )}

        {(msg || err || busy) && (
          <p className={`text-sm font-semibold ${err ? 'text-red-600' : 'text-emerald-700'}`}>
            {err || (busy ? 'Đang xử lý…' : msg)}
          </p>
        )}
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-violet-50 text-violet-900">
              <tr>
                <th className="p-3 font-black">Học sinh</th>
                <th className="p-3 font-black">Tháng</th>
                <th className="p-3 font-black">Tổng tiền</th>
                <th className="p-3 font-black">Trạng thái</th>
                <th className="p-3 font-black text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {gradeStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    Không có học sinh trong bộ lọc.
                  </td>
                </tr>
              ) : (
                gradeStudents.map((s) => {
                  const row = receiptByStudent[s.id];
                  return (
                    <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                      <td className="p-3 font-bold text-slate-900">{s.name}</td>
                      <td className="p-3 text-slate-600">{monthTitle}</td>
                      <td className="p-3 font-bold tabular-nums">
                        {row ? formatMoneyVnd(row.total) : '—'}
                      </td>
                      <td className="p-3">
                        {row ? (
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                              row.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {row.status === 'paid' ? 'Đã thu' : 'Chưa thu'}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-semibold">Chưa tạo</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          {row ? (
                            <>
                              <button
                                type="button"
                                title="Xem phiếu"
                                onClick={() => setPreview(row)}
                                className="p-1.5 rounded-lg text-violet-600 hover:bg-violet-50"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                type="button"
                                title="Sửa"
                                onClick={() => openEdit(row)}
                                className="px-2 py-1 rounded-lg text-xs font-bold text-slate-700 border hover:bg-slate-50"
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                title="Xóa"
                                onClick={() => handleDelete(row.id)}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openCreateForStudent(s)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700"
                            >
                              <Plus size={14} /> Tạo phiếu
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editor ? (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <form
            onSubmit={saveEditor}
            className="bg-white rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-3 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900">
                {editor.id ? 'Sửa phiếu học phí' : 'Tạo phiếu học phí'}
              </h3>
              <button type="button" onClick={() => setEditor(null)} className="p-1 rounded hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm font-bold text-violet-700">{editor.student_name}</p>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEditor(syncTotal({ ...editor, fee_mode: 'session' }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  editor.fee_mode === 'session'
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                Theo buổi
              </button>
              <button
                type="button"
                onClick={() => setEditor(syncTotal({ ...editor, fee_mode: 'month' }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  editor.fee_mode === 'month'
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                Theo tháng
              </button>
            </div>

            {editor.fee_mode === 'session' ? (
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-bold text-slate-600">
                  Học phí / buổi (đ)
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={editor.fee_per_session}
                    onChange={(e) =>
                      setEditor(
                        syncTotal({ ...editor, fee_per_session: Number(e.target.value) || 0 })
                      )
                    }
                    className="mt-1 w-full px-3 py-2 rounded-lg border text-sm font-semibold"
                  />
                </label>
                <label className="text-xs font-bold text-slate-600">
                  Số buổi
                  <input
                    type="number"
                    min={0}
                    value={editor.session_count}
                    onChange={(e) =>
                      setEditor(
                        syncTotal({ ...editor, session_count: Number(e.target.value) || 0 })
                      )
                    }
                    className="mt-1 w-full px-3 py-2 rounded-lg border text-sm font-semibold"
                  />
                </label>
              </div>
            ) : (
              <label className="block text-xs font-bold text-slate-600">
                Học phí tháng (đ)
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={editor.monthly_fee}
                  onChange={(e) =>
                    setEditor(syncTotal({ ...editor, monthly_fee: Number(e.target.value) || 0 }))
                  }
                  className="mt-1 w-full px-3 py-2 rounded-lg border text-sm font-semibold"
                />
              </label>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-slate-700">Phụ phí</p>
                <button
                  type="button"
                  onClick={() =>
                    setEditor(
                      syncTotal({
                        ...editor,
                        extras: [...(editor.extras || []), { label: 'Sách / tài liệu', amount: 0 }],
                      })
                    )
                  }
                  className="text-xs font-bold text-violet-700 hover:underline"
                >
                  + Thêm phụ phí
                </button>
              </div>
              {(editor.extras || []).map((ex, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    value={ex.label}
                    onChange={(e) => {
                      const extras = [...editor.extras];
                      extras[idx] = { ...extras[idx], label: e.target.value };
                      setEditor(syncTotal({ ...editor, extras }));
                    }}
                    placeholder="Tên phụ phí"
                    className="flex-1 px-3 py-2 rounded-lg border text-sm font-semibold"
                  />
                  <input
                    type="number"
                    min={0}
                    value={ex.amount}
                    onChange={(e) => {
                      const extras = [...editor.extras];
                      extras[idx] = { ...extras[idx], amount: Number(e.target.value) || 0 };
                      setEditor(syncTotal({ ...editor, extras }));
                    }}
                    className="w-28 px-3 py-2 rounded-lg border text-sm font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const extras = editor.extras.filter((_, i) => i !== idx);
                      setEditor(syncTotal({ ...editor, extras }));
                    }}
                    className="p-2 text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <label className="block text-xs font-bold text-slate-600">
              Nhận xét trên phiếu (tuỳ chọn)
              <textarea
                value={editor.teacher_note}
                onChange={(e) => setEditor({ ...editor, teacher_note: e.target.value })}
                rows={2}
                className="mt-1 w-full px-3 py-2 rounded-lg border text-sm"
                placeholder="VD: Tháng này con học đều…"
              />
            </label>

            <label className="block text-xs font-bold text-slate-600">
              Trạng thái
              <select
                value={editor.status}
                onChange={(e) => setEditor({ ...editor, status: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border text-sm font-semibold"
              >
                <option value="unpaid">Chưa thu</option>
                <option value="paid">Đã thu</option>
              </select>
            </label>

            <p className="text-sm font-black text-violet-800">
              Tổng: {formatMoneyVnd(editor.total)}
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditor(null)}
                className="px-4 py-2 rounded-lg border text-sm font-bold"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-bold disabled:opacity-60"
              >
                Lưu phiếu
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {preview ? (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md my-4 space-y-3">
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={downloadPreview}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-violet-700 text-sm font-bold shadow"
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
            <TuitionReceiptCard
              draft={preview}
              monthTitle={monthTitle}
              cardRef={cardRef}
              bankQrUrl={bankQrUrl}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
