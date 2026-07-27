/* eslint-disable */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import {
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATION_CATEGORIES,
  subscribeStudentNotifications,
} from './admin/classroomNotificationStore';

function formatWhen(ts) {
  if (!ts) return '';
  try {
    const d = new Date(Number(ts));
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

const CAT_BADGE = {
  homework: 'bg-indigo-100 text-indigo-800',
  attendance: 'bg-blue-100 text-blue-800',
  timetable: 'bg-teal-100 text-teal-800',
  tuition: 'bg-violet-100 text-violet-800',
  feedback: 'bg-fuchsia-100 text-fuchsia-800',
};

/**
 * Chuông + danh sách thông báo học sinh.
 * @param {string} studentId
 * @param {string} studentName — fallback khi thiếu id
 * @param {'sm'|'md'} size
 * @param {boolean} [open] controlled
 * @param {function} [onOpenChange]
 * @param {boolean} [hideTrigger] — chỉ hiện panel (dùng từ menu)
 */
export default function StudentNotificationBell({
  studentId = '',
  studentName = '',
  onOpenLink,
  size = 'md',
  open: openProp,
  onOpenChange,
  hideTrigger = false,
  className = '',
}) {
  const [openInner, setOpenInner] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : openInner;
  const setOpen = (v) => {
    const next = typeof v === 'function' ? v(open) : v;
    if (!controlled) setOpenInner(next);
    onOpenChange?.(next);
  };

  const [items, setItems] = useState([]);
  const wrapRef = useRef(null);
  const hasIdentity = Boolean(String(studentId || '').trim() || String(studentName || '').trim());

  useEffect(() => {
    if (!hasIdentity) {
      setItems([]);
      return undefined;
    }
    const unsub = subscribeStudentNotifications(
      { studentId, studentName },
      setItems
    );
    return () => unsub();
  }, [studentId, studentName, hasIdentity]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const unread = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const handleClick = async (n) => {
    if (!n.read) await markNotificationRead(n.id);
    setOpen(false);
    onOpenLink?.(n);
  };

  const markAll = async () => {
    if (!hasIdentity) return;
    await markAllNotificationsRead({ studentId, studentName });
  };

  const iconCls = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
  const btnCls =
    size === 'sm'
      ? 'w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200 hover:text-indigo-600 hover:border-indigo-200 transition'
      : 'relative p-2 text-slate-500 hover:text-slate-700 transition-colors';

  const panel = open ? (
    <div
      className={`absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] bg-white border border-slate-200 rounded-2xl shadow-xl z-[80] overflow-hidden ${
        hideTrigger ? 'top-full' : ''
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
        <p className="font-black text-slate-900 text-sm">Thông báo</p>
        {unread > 0 ? (
          <button
            type="button"
            onClick={markAll}
            className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            <CheckCheck size={14} /> Đọc hết
          </button>
        ) : null}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {!hasIdentity ? (
          <p className="p-6 text-center text-sm text-slate-500">Đăng nhập để xem thông báo.</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">Chưa có thông báo.</p>
        ) : (
          items.map((n) => {
            const cat = NOTIFICATION_CATEGORIES[n.category] || NOTIFICATION_CATEGORIES.homework;
            const badge = CAT_BADGE[n.category] || CAT_BADGE.homework;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => handleClick(n)}
                className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                  n.read ? 'opacity-75' : 'bg-blue-50/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${badge}`}>
                    {cat.label}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-auto">{formatWhen(n.created_at)}</span>
                </div>
                <p className="font-bold text-slate-900 text-sm leading-snug">{n.title}</p>
                {n.body ? (
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2 whitespace-pre-line">{n.body}</p>
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  ) : null;

  if (hideTrigger) {
    return (
      <div className={`relative ${className}`} ref={wrapRef}>
        {panel}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`${btnCls} relative`}
        aria-label="Thông báo"
        disabled={!hasIdentity}
      >
        <Bell className={iconCls} />
        {unread > 0 ? (
          <span
            className={`absolute ${
              size === 'sm' ? '-top-0.5 -right-0.5' : 'top-1 right-1'
            } min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center`}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>
      {panel}
    </div>
  );
}

/** Badge số chưa đọc — dùng cho mục menu «Thông báo». */
export function useStudentUnreadCount(studentId, studentName) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!studentId && !studentName) {
      setCount(0);
      return undefined;
    }
    return subscribeStudentNotifications({ studentId, studentName }, (rows) => {
      setCount(rows.filter((r) => !r.read).length);
    });
  }, [studentId, studentName]);
  return count;
}
