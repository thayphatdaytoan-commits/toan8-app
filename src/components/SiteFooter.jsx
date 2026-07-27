/* eslint-disable */
import React from 'react';
import { ChevronUp, Phone, Mail } from 'lucide-react';
import MathEduLogo from './MathEduLogo';

const DEFAULTS = {
  phoneDisplay: '0968 526 800',
  phoneTel: '0968526800',
  email: 'thayphatdaytoan@gmail.com',
  zaloUrl: 'https://zalo.me/0968526800',
  facebookUrl: 'https://www.facebook.com/',
  youtubeUrl: 'https://www.youtube.com/',
  tagline: 'Thầy Phát dạy toán',
  description:
    'Nền tảng học Toán trực tuyến THCS & THPT (lớp 6–12), bám GDPT 2018 — bài giảng, luyện đề, phòng thi online.',
  copyright: '© 2024–2026 MathEdu — Thầy Phát dạy toán',
  exploreTitle: 'Khám phá',
  supportTitle: 'Hỗ trợ',
  connectTitle: 'Kết nối với MathEdu',
  connectNote: 'Học trên trình duyệt — không cần cài app. Hỗ trợ máy tính và điện thoại.',
};

function FooterLink({ children, onClick, href }) {
  if (href) {
    return (
      <a
        href={href}
        className="block text-sm text-slate-600 hover:text-blue-600 transition-colors py-0.5"
        target={href.startsWith('http') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-left text-sm text-slate-600 hover:text-blue-600 transition-colors py-0.5"
    >
      {children}
    </button>
  );
}

export default function SiteFooter({
  scrollParentRef,
  onGoHome,
  onRequestLogin,
  onRequestRegister,
  onEnterExam,
  onSelectThcs,
  onSelectThpt,
  onScrollTo,
  content,
}) {
  const f = { ...DEFAULTS, ...(content?.fields || {}) };
  const c = content?.colors || {};

  const scrollToTop = () => {
    const el = scrollParentRef?.current;
    if (el && typeof el.scrollTo === 'function') {
      el.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      /* ignore */
    }
  };

  const goSection = (id) => {
    if (onGoHome) onGoHome();
    window.setTimeout(() => {
      if (onScrollTo) onScrollTo(id);
      else {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);
  };

  return (
    <footer
      className="relative mt-10 sm:mt-14 -mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8 border-t border-slate-200 text-slate-800"
      style={{ backgroundColor: c.bg || '#ffffff' }}
    >
      <button
        type="button"
        onClick={scrollToTop}
        className="absolute -top-5 right-4 sm:right-8 z-10 w-10 h-10 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors"
        aria-label="Lên đầu trang"
        title="Lên đầu trang"
      >
        <ChevronUp className="w-5 h-5" />
      </button>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          <div className="min-w-0">
            <div className="mb-3 min-w-0">
              <MathEduLogo className="h-16 sm:h-20" />
              <p className="text-xs font-semibold text-slate-500 mt-1.5">{f.tagline}</p>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">{f.description}</p>
            <p className="text-sm text-slate-700 flex items-start gap-2 mb-1.5">
              <Phone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <a href={`tel:${f.phoneTel}`} className="font-bold text-slate-900 hover:text-blue-600">
                {f.phoneDisplay}
              </a>
            </p>
            <p className="text-sm text-slate-700 flex items-start gap-2">
              <Mail className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <a href={`mailto:${f.email}`} className="font-semibold text-slate-800 hover:text-blue-600 break-all">
                {f.email}
              </a>
            </p>
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-black text-slate-900 mb-3">{f.exploreTitle}</h3>
            <nav className="space-y-1">
              <FooterLink onClick={onGoHome}>Trang chủ</FooterLink>
              <FooterLink onClick={onSelectThcs}>Toán THCS</FooterLink>
              <FooterLink onClick={onSelectThpt}>Toán THPT</FooterLink>
              <FooterLink onClick={() => goSection('khoi-hoc')}>Khối học 6–12</FooterLink>
              <FooterLink onClick={() => goSection('gia-su')}>Gia sư luyện thi</FooterLink>
              <FooterLink onClick={() => goSection('hoc-thu')}>Chương trình học thử</FooterLink>
            </nav>
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-black text-slate-900 mb-3">{f.supportTitle}</h3>
            <nav className="space-y-1">
              <FooterLink onClick={onRequestLogin}>Đăng nhập</FooterLink>
              <FooterLink onClick={onRequestRegister}>Đăng ký tài khoản</FooterLink>
              <FooterLink onClick={onEnterExam}>Phòng thi Online</FooterLink>
              <FooterLink href={f.zaloUrl}>Liên hệ Zalo</FooterLink>
              <FooterLink href={`tel:${f.phoneTel}`}>Gọi hotline tư vấn</FooterLink>
            </nav>
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-black text-slate-900 mb-3">{f.connectTitle}</h3>
            <div className="flex flex-wrap gap-2.5 mb-5">
              <a
                href={f.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-black text-lg hover:opacity-90 shadow-sm"
                aria-label="Facebook"
              >
                f
              </a>
              <a
                href={f.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center text-xs font-black hover:opacity-90 shadow-sm"
                aria-label="YouTube"
              >
                YT
              </a>
              <a
                href={f.zaloUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-[#0068FF] text-white flex items-center justify-center text-[10px] font-black hover:opacity-90 shadow-sm"
                aria-label="Zalo"
              >
                Zalo
              </a>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{f.connectNote}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200" style={{ backgroundColor: c.barBg || '#f8fafc' }}>
        <p className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 text-center text-xs sm:text-sm text-slate-500">
          {f.copyright} · Email:{' '}
          <a href={`mailto:${f.email}`} className="text-slate-700 hover:text-blue-600 font-semibold">
            {f.email}
          </a>
        </p>
      </div>
    </footer>
  );
}
