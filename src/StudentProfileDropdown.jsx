/* eslint-disable */
import React from 'react';
import {
  Bell,
  BookOpen,
  ChevronRight,
  FileText,
  Gift,
  LogOut,
  Map as MapIcon,
  Settings,
  User,
  Wallet,
} from 'lucide-react';

function ProfileMenuItem({ icon: Icon, label, onClick, className = '', showArrow = true }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left ${className}`}
    >
      <Icon className="w-4 h-4 shrink-0 text-slate-500" />
      <span className="flex-1 font-medium">{label}</span>
      {showArrow && <ChevronRight className="w-4 h-4 shrink-0 text-slate-300" />}
    </button>
  );
}

/**
 * Menu tài khoản học sinh (giống trang chủ).
 */
export default function StudentProfileDropdown({
  studentName,
  studentClass,
  rosterGrade,
  studentProfile,
  onEnterStudentPortal,
  onLogout,
  onClose,
  onOpenNotifications,
  unreadCount = 0,
}) {
  const go = (tab) => {
    onClose?.();
    onEnterStudentPortal?.(tab);
  };
  const vip =
    studentProfile?.is_vip === true ||
    ['vip', 'premium'].includes(String(studentProfile?.account_type || '').toLowerCase());

  return (
    <div className="absolute right-0 top-full mt-2 w-[min(calc(100vw-1.5rem),20rem)] rounded-2xl bg-white shadow-2xl border border-slate-200 z-[70] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
            <User className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black text-slate-900 truncate text-base">{studentName}</p>
            <span className="inline-flex mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-700">
              Học sinh
            </span>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">
              Lớp {studentClass || studentProfile?.class_label || '—'} · Khối{' '}
              {rosterGrade || studentProfile?.grade_level || '—'}
            </p>
            {studentProfile?.school ? (
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">{studentProfile.school}</p>
            ) : null}
          </div>
        </div>
        <div
          className={`mt-3 flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${
            vip ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'
          }`}
        >
          <span className={`text-xs font-bold ${vip ? 'text-amber-800' : 'text-slate-600'}`}>
            {vip ? 'Tài khoản VIP' : 'Tài khoản miễn phí'}
          </span>
        </div>
      </div>

      <div className="py-1">
        <button
          type="button"
          onClick={() => {
            onClose?.();
            onOpenNotifications?.();
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
        >
          <Bell className="w-4 h-4 shrink-0 text-slate-500" />
          <span className="flex-1 font-medium">Thông báo</span>
          {unreadCount > 0 ? (
            <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : (
            <ChevronRight className="w-4 h-4 shrink-0 text-slate-300" />
          )}
        </button>
        <ProfileMenuItem icon={Settings} label="Thông tin tài khoản" onClick={() => go('settings')} />
        <ProfileMenuItem icon={Gift} label="Giới thiệu bạn bè" onClick={() => go('settings')} />
        <ProfileMenuItem icon={BookOpen} label="Bài giảng & lộ trình" onClick={() => go('lessons')} />
        <ProfileMenuItem icon={MapIcon} label="Chuyên đề ôn tập" onClick={() => go('topics')} />
        <ProfileMenuItem icon={FileText} label="Đề kiểm tra" onClick={() => go('exams')} />
        <ProfileMenuItem icon={Wallet} label="Bảng điểm & EXP" onClick={() => go('reports')} />
      </div>

      <div className="border-t border-slate-100 py-1">
        <button
          type="button"
          onClick={() => {
            onClose?.();
            onLogout?.();
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Đăng xuất
        </button>
      </div>
    </div>
  );
}
