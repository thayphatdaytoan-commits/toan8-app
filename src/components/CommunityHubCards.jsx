/* eslint-disable */
import React from 'react';
import { ArrowRight } from 'lucide-react';

/**
 * Hai thẻ Hỏi đáp + Cuộc thi vui (kiểu ảnh tham chiếu).
 */
export default function CommunityHubCards({ block, onOpenQa, onOpenContest }) {
  if (block && block.enabled === false) return null;
  const items = Array.isArray(block?.items) && block.items.length >= 2
    ? block.items
    : [
        {
          id: 'qa',
          title: 'Hỏi & Đáp cùng cộng đồng',
          description: 'Đặt câu hỏi và nhận ngay lời giải từ thầy cô và các bạn',
          ctaLabel: 'Đặt câu hỏi',
          imageUrl: '/community-qa.jpg',
          action: 'qa',
        },
        {
          id: 'contest',
          title: 'Cuộc thi vui mỗi tuần',
          description: 'Chinh phục những đề thi thú vị và nhận quà mỗi tuần',
          ctaLabel: 'Khám phá',
          imageUrl: '/community-contest.jpg',
          action: 'contest',
        },
      ];

  const handleClick = (item) => {
    const action = String(item.action || item.id || '').toLowerCase();
    if (action.includes('contest') || action.includes('cuoc') || item.linkUrl === '/cuoc-thi') {
      onOpenContest?.();
      return;
    }
    if (item.linkUrl === '/hoi-dap' || action.includes('qa') || action.includes('hoi')) {
      onOpenQa?.();
      return;
    }
    if (item.linkUrl?.startsWith('/')) {
      window.open(item.linkUrl, '_self');
      return;
    }
    onOpenQa?.();
  };

  return (
    <section className="mb-10 md:mb-14 min-w-0" aria-label="Cộng đồng MathEdu">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {items.slice(0, 2).map((item) => (
          <article
            key={item.id}
            className="group bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <div className="relative aspect-[16/9] sm:aspect-[18/10] bg-slate-100 overflow-hidden">
              <img
                src={item.imageUrl || '/community-qa.jpg'}
                alt={item.title || ''}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="p-5 sm:p-6">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2 leading-snug">
                {item.title}
              </h3>
              <p className="text-sm sm:text-[15px] text-slate-500 leading-relaxed mb-5">
                {item.description}
              </p>
              <button
                type="button"
                onClick={() => handleClick(item)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border-2 border-orange-400 text-orange-500 font-bold text-sm hover:bg-orange-50 transition-colors"
              >
                {item.ctaLabel || 'Xem thêm'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
