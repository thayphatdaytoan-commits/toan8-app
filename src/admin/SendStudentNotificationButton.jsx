/* eslint-disable */
import React, { useMemo, useState } from 'react';
import { Bell, Send, X } from 'lucide-react';
import { CLASS_OTHER_ID, normalizeStudentClassId } from '../classroomConstants';
import { NOTIFICATION_CATEGORIES, sendStudentNotifications } from './classroomNotificationStore';

export default function SendStudentNotificationButton({
  category = 'homework',
  studentsList = [],
  activeGrade = '',
  classId = '',
  defaultTitle = '',
  defaultBody = '',
  linkType = '',
  linkId = '',
  linkUrl = '',
  label = 'Gửi thông báo học sinh',
  compact = false,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [body, setBody] = useState(defaultBody);
  const [targetClassId, setTargetClassId] = useState(classId || '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const recipients = useMemo(() => {
    const g = String(activeGrade || '').trim();
    return (studentsList || []).filter((s) => {
      if (g && g !== 'ALL' && String(s.grade_level || '') !== g) return false;
      if (targetClassId && normalizeStudentClassId(s) !== targetClassId) return false;
      return Boolean(s.id);
    });
  }, [studentsList, activeGrade, targetClassId]);

  const classOptions = useMemo(() => {
    const map = new Map();
    (studentsList || []).forEach((s) => {
      const cid = normalizeStudentClassId(s);
      const lbl = s.class_label || cid;
      if (!map.has(cid)) map.set(cid, lbl);
    });
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [studentsList]);

  const openModal = () => {
    setTitle(defaultTitle);
    setBody(defaultBody);
    setTargetClassId(classId || '');
    setMsg('');
    setErr('');
    setOpen(true);
  };

  const handleSend = async () => {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const n = await sendStudentNotifications({
        students: recipients,
        category,
        title,
        body,
        link_type: linkType,
        link_id: linkId,
        link_url: linkUrl,
      });
      setMsg(`Đã gửi thông báo đến ${n} học sinh.`);
    } catch (ex) {
      console.error(ex);
      setErr(ex.message || 'Gửi thông báo thất bại.');
    } finally {
      setBusy(false);
    }
  };

  const catMeta = NOTIFICATION_CATEGORIES[category] || NOTIFICATION_CATEGORIES.homework;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={
          className ||
          'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 text-white text-sm font-bold hover:bg-slate-900 shadow-sm'
        }
      >
        <Bell size={compact ? 14 : 16} />
        {compact ? 'Thông báo HS' : label}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] bg-black/45 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-black text-slate-900">Gửi thông báo — {catMeta.label}</h3>
              <button type="button" onClick={() => setOpen(false)} className="p-1 rounded hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Thông báo hiện ở nút chuông trên tài khoản học sinh ({recipients.length} người nhận).
            </p>
            <label className="block text-xs font-bold text-slate-600">
              Lớp nhận
              <select
                value={targetClassId}
                onChange={(e) => setTargetClassId(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border text-sm font-semibold"
              >
                <option value="">Tất cả lớp (khối đang chọn)</option>
                {classOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value={CLASS_OTHER_ID}>Khác</option>
              </select>
            </label>
            <label className="block text-xs font-bold text-slate-600">
              Tiêu đề
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg border text-sm font-semibold"
              />
            </label>
            <label className="block text-xs font-bold text-slate-600">
              Nội dung
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                className="mt-1 w-full px-3 py-2 rounded-lg border text-sm"
              />
            </label>
            {(msg || err) && (
              <p className={`text-sm font-semibold ${err ? 'text-red-600' : 'text-emerald-700'}`}>
                {err || msg}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-lg border text-sm font-bold text-slate-700"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={busy || recipients.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-bold disabled:opacity-50 hover:bg-slate-900"
              >
                <Send size={14} />
                {busy ? 'Đang gửi…' : 'Gửi thông báo'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
