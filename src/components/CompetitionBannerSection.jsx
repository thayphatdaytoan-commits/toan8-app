/* eslint-disable */
import React from 'react';

/**
 * Banner kỳ thi quốc gia / quốc tế — khối CMS riêng trên trang chủ.
 */
export default function CompetitionBannerSection({ block }) {
  const title =
    block?.fields?.bannerTitle ||
    'Chinh phục các kì thi toán học quốc gia, quốc tế cùng MathEdu';
  const imageUrl = block?.fields?.imageUrl || '/competition-logos.png';

  return (
    <section className="mb-10 md:mb-14 min-w-0">
      <div className="rounded-2xl bg-[#faf6f0] border border-amber-100/80 px-3 sm:px-6 py-6 sm:py-8">
        <h2 className="text-center text-lg sm:text-2xl font-black text-red-600 leading-snug mb-4 sm:mb-6 max-w-3xl mx-auto">
          {title}
        </h2>
        <img
          src={imageUrl}
          alt="Logo các kỳ thi Toán: TIMO, HKIMO, BBB, FMO, IKMC, ITMC, SASMO, SEAMO, ASMO, IMAS, IMC, AMC"
          className="w-full max-w-5xl mx-auto h-auto object-contain rounded-xl"
          loading="lazy"
          decoding="async"
        />
      </div>
    </section>
  );
}
