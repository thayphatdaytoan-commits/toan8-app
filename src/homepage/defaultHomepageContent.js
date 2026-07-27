/* eslint-disable */
/** Nội dung mặc định trang chủ + schema blocks CMS */

export const HOMEPAGE_DOC_ID = 'main';

export const BLOCK_TYPE_LABELS = {
  hero: 'Hero (đầu trang)',
  promo_slider: 'Khung quảng cáo (slide)',
  featured_courses: 'Khóa học tiêu biểu',
  grade_grid: 'Khối THCS / THPT',
  tutor_packages: 'Gia sư luyện thi',
  hotline: 'Thanh hotline',
  trial_program: 'Chương trình học thử',
  community_hub: 'Hỏi đáp & Cuộc thi vui',
  blog_docs: 'Blog & Tài liệu',
  competition_banner: 'Khối Banner Kỳ thi',
  sidebar_guide: 'Sidebar: Video & MXH',
  footer: 'Chân trang',
};

/** Preset màu header thẻ khối / card */
export const COLOR_PRESETS = {
  amber: {
    label: 'Vàng cam',
    headerBg: 'bg-gradient-to-br from-[#fbbf24] via-[#f59e0b] to-[#d97706]',
    hoverRow: 'hover:bg-amber-50',
    gradient: 'from-[#fde68a] via-[#fb923c] to-[#ea580c]',
    badgeBg: 'bg-sky-900',
  },
  emerald: {
    label: 'Xanh lá',
    headerBg: 'bg-gradient-to-br from-[#34d399] via-[#10b981] to-[#059669]',
    hoverRow: 'hover:bg-emerald-50',
    gradient: 'from-emerald-200 via-teal-300 to-teal-500',
    badgeBg: 'bg-emerald-950',
  },
  sky: {
    label: 'Xanh trời',
    headerBg: 'bg-gradient-to-br from-[#38bdf8] via-[#0ea5e9] to-[#0284c7]',
    hoverRow: 'hover:bg-sky-50',
    gradient: 'from-[#7dd3fc] via-[#3b82f6] to-[#1e3a8a]',
    badgeBg: 'bg-blue-950',
  },
  blue: {
    label: 'Xanh dương',
    headerBg: 'bg-gradient-to-br from-[#93c5fd] via-[#60a5fa] to-[#3b82f6]',
    hoverRow: 'hover:bg-blue-50',
    gradient: 'from-sky-200 via-blue-300 to-blue-500',
    badgeBg: 'bg-blue-950',
  },
  violet: {
    label: 'Tím',
    headerBg: 'bg-gradient-to-br from-[#a78bfa] via-[#8b5cf6] to-[#6d28d9]',
    hoverRow: 'hover:bg-violet-50',
    gradient: 'from-[#ddd6fe] via-[#a78bfa] to-[#6d28d9]',
    badgeBg: 'bg-indigo-950',
  },
  orange: {
    label: 'Cam luyện thi',
    headerBg: 'bg-gradient-to-br from-[#fbbf24] via-[#f59e0b] to-[#ea580c]',
    hoverRow: 'hover:bg-orange-50',
    gradient: 'from-orange-200 via-amber-300 to-orange-500',
    badgeBg: 'bg-orange-950',
  },
  rose: {
    label: 'Hồng',
    headerBg: 'bg-gradient-to-br from-[#fb7185] via-[#f43f5e] to-[#e11d48]',
    hoverRow: 'hover:bg-rose-50',
    gradient: 'from-[#fecdd3] via-[#fb7185] to-[#e11d48]',
    badgeBg: 'bg-rose-950',
  },
};

export function resolveColorPreset(key, fallback = 'blue') {
  return COLOR_PRESETS[key] || COLOR_PRESETS[fallback] || COLOR_PRESETS.blue;
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createDefaultHomepageContent() {
  return {
    version: 1,
    updated_at: 0,
    blocks: [
      {
        id: 'hero',
        type: 'hero',
        enabled: true,
        fields: {
          eyebrow: 'CẬP NHẬT GDPT 2018 | TOÁN 9 - 11 - 12',
          headlineBefore: 'Học Toán tư duy cùng',
          headlineBrand: 'MathEdu',
          subtitle:
            'Phát triển năng lực, nắm vững kiến thức cốt lõi và chuẩn bị tốt cho kỳ thi tuyển sinh 10, thi THPT Quốc gia — lộ trình cá nhân hóa theo từng khối (6–12).',
          ctaPrimary: 'Khám phá khóa học',
          ctaSecondary: 'Đăng ký miễn phí',
          stat1Value: '5.000+',
          stat1Label: 'Học sinh đã đăng ký',
          stat2Value: '98%',
          stat2Label: 'Đạt mục tiêu kỳ thi',
          panelBadge: 'Phương pháp mới',
          panelKicker: 'TOÁN HỌC',
          panelTitle: 'MathEdu',
          panelDesc:
            'Ôn thi vào 10 & THPT QG: lộ trình theo năng lực, bám sát đề minh họa và phân dạng bài tập.',
        },
        colors: {
          ctaPrimaryBg: '#2563eb',
          ctaSecondaryBg: '#f97316',
          panelGradient: 'from-cyan-400 via-blue-600 to-violet-800',
        },
      },
      {
        id: 'promo',
        type: 'promo_slider',
        enabled: true,
        fields: {
          intervalMs: 5000,
        },
        colors: {},
        items: [
          {
            id: 'promo1',
            imageUrl: '/promo-slide-1.svg',
            linkUrl: '#hoc-thu',
            alt: 'Luyện đề thi vào 10 — MathEdu',
          },
          {
            id: 'promo2',
            imageUrl: '/promo-slide-2.svg',
            linkUrl: '#hoc-thu',
            alt: 'Ôn thi THPT Quốc gia — MathEdu',
          },
        ],
      },
      {
        id: 'featured',
        type: 'featured_courses',
        enabled: true,
        fields: {
          title: 'Khóa học tiêu biểu',
          subtitle: 'Hệ thống kiến thức vững chắc, sẵn sàng bứt phá cho năm học mới cùng MathEdu',
        },
        colors: {},
        items: [
          {
            id: 'g9',
            banner: 'TOÁN ÔN THI 9 VÀ 10',
            badge: 'Lớp 9 & Ôn thi 10',
            title: 'Lớp 9 & Ôn thi 10',
            description: 'Nền tảng kiến thức và luyện thi vào 10.',
            colorPreset: 'amber',
            action: 'grade:9',
            featured: false,
            icon: 'gate',
            imageUrl: '',
            bannerColor: '#ffffff',
            bannerFontSize: 17,
            badgeTextColor: '#ffffff',
          },
          {
            id: 'dg',
            banner: 'TOÁN TƯ DUY',
            badge: 'Luyện thi ĐGNL & Tư duy',
            title: 'Luyện thi ĐGNL & Tư duy',
            description: 'Rèn luyện tư duy và dạng bài nâng cao.',
            colorPreset: 'violet',
            action: 'grade:12',
            featured: false,
            icon: 'think',
            imageUrl: '',
            bannerColor: '#ffffff',
            bannerFontSize: 18,
            badgeTextColor: '#ffffff',
          },
          {
            id: 'thpt',
            banner: 'TOÁN ÔN THI THPT QUỐC GIA',
            badge: 'Ôn Thi THPT QG',
            title: 'Ôn Thi THPT QG',
            description: 'Ôn luyện theo chương trình và đề thi thử.',
            colorPreset: 'rose',
            action: 'grade:12',
            featured: false,
            icon: 'book',
            imageUrl: '',
            bannerColor: '#ffffff',
            bannerFontSize: 15,
            badgeTextColor: '#ffffff',
          },
          {
            id: 'hsg',
            banner: 'TOÁN HSG',
            badge: 'Luyện thi HSG',
            title: 'Luyện thi HSG',
            description: 'Bồi dưỡng kiến thức nâng cao, chuyên sâu và giải các đề thi HSG các cấp.',
            colorPreset: 'sky',
            action: 'grade:12',
            featured: false,
            icon: 'medal',
            imageUrl: '',
            bannerColor: '#ffffff',
            bannerFontSize: 20,
            badgeTextColor: '#ffffff',
          },
        ],
      },
      {
        id: 'grades',
        type: 'grade_grid',
        enabled: true,
        fields: {
          thcsTitle: 'Khối THCS',
          thptTitle: 'Khối THPT',
          seeAllLabel: 'Xem tất cả →',
          moreLabel: 'Xem thêm →',
        },
        colors: {},
        menuItems: [
          { id: 'lessons', label: 'Bài giảng', shortLabel: 'Bài giảng', badge: 'Miễn phí', badgeClass: 'bg-emerald-100 text-emerald-700', disabled: false },
          { id: 'topics', label: 'Chuyên đề ôn tập', shortLabel: 'Chuyên đề', badge: 'Đăng nhập', badgeClass: 'bg-amber-100 text-amber-800', disabled: false },
          { id: 'exams', label: 'Đề kiểm tra', shortLabel: 'Đề KT', badge: 'Đăng nhập', badgeClass: 'bg-amber-100 text-amber-800', disabled: false },
          { id: 'gifted', label: 'Học sinh giỏi', shortLabel: 'HS giỏi', badge: 'Sắp ra', badgeClass: 'bg-slate-100 text-slate-500', disabled: true },
        ],
        thcsItems: [
          { id: 'g6', grade: '6', colorPreset: 'rose', enabled: true, labelColor: '#ffffff', numberColor: '#fde047', labelFontSize: 14, numberFontSize: 64 },
          { id: 'g7', grade: '7', colorPreset: 'amber', enabled: true, labelColor: '#ffffff', numberColor: '#fde047', labelFontSize: 14, numberFontSize: 64 },
          { id: 'g8', grade: '8', colorPreset: 'emerald', enabled: true, labelColor: '#ffffff', numberColor: '#fde047', labelFontSize: 14, numberFontSize: 64 },
          { id: 'g9', grade: '9', colorPreset: 'sky', enabled: true, labelColor: '#ffffff', numberColor: '#fde047', labelFontSize: 14, numberFontSize: 64 },
        ],
        thptItems: [
          { id: 'g10', grade: '10', colorPreset: 'blue', enabled: true, labelColor: '#ffffff', numberColor: '#fde047', labelFontSize: 14, numberFontSize: 64 },
          { id: 'g11', grade: '11', colorPreset: 'rose', enabled: true, labelColor: '#ffffff', numberColor: '#fde047', labelFontSize: 14, numberFontSize: 64 },
          { id: 'g12', grade: '12', colorPreset: 'violet', enabled: true, labelColor: '#ffffff', numberColor: '#fde047', labelFontSize: 14, numberFontSize: 64 },
        ],
        luyenThi: {
          enabled: true,
          titleLine1: 'LUYỆN THI',
          titleLine2: 'THPT QG',
          colorPreset: 'orange',
          rows: [
            { id: 'r1', label: 'Thi thử TN THPT', action: 'grade:12' },
            { id: 'r2', label: 'Đề sưu tầm', action: 'exam' },
            { id: 'r3', label: 'Kho đề KT', action: 'exam' },
          ],
        },
      },
      {
        id: 'tutor',
        type: 'tutor_packages',
        enabled: true,
        fields: {
          title: 'Gia sư luyện thi đặc biệt',
          ctaLabel: 'Đăng ký học thử',
        },
        colors: {
          headerBg: '#1a5c45',
          ctaBg: '#f97316',
        },
        items: [
          {
            id: 'weak',
            title: 'KÈM HỌC SINH YẾU/MẤT GỐC',
            lines: [
              { type: 'target', text: 'Đối tượng: Học sinh muốn tìm lộ trình ngắn nhất để cải thiện điểm số.' },
              { type: 'star', text: 'Nội dung khóa học:' },
              { type: 'dot', text: 'Đánh giá kiến thức nền tảng, xác định lỗ hổng kiến thức.' },
              { type: 'dot', text: 'Củng cố kiến thức cơ bản theo chuẩn Bộ GD&ĐT.' },
              { type: 'dot', text: 'Sơ đồ tư duy giúp ghi nhớ lâu dài.' },
              { type: 'dot', text: 'Luyện đề theo lộ trình tăng dần độ khó.' },
              { type: 'dot', text: 'Phương pháp tự học hiệu quả tại nhà.' },
            ],
          },
          {
            id: 'gifted',
            title: 'BỒI DƯỠNG HỌC SINH GIỎI',
            lines: [
              { type: 'target', text: 'Đối tượng: Học sinh lớp 6–12 muốn đạt điểm cao / học sinh giỏi.' },
              { type: 'star', text: 'Nội dung khóa học:' },
              { type: 'dot', text: 'Kiến thức chuyên sâu, mở rộng ngoài chương trình.' },
              { type: 'dot', text: 'Luyện đề dạng nâng cao, tư duy phản biện.' },
              { type: 'dot', text: 'Sơ đồ tư duy & tài liệu chuyên biệt.' },
              { type: 'dot', text: 'Kỹ năng quản lý thời gian làm bài.' },
              { type: 'dot', text: 'Giáo viên giàu kinh nghiệm bồi dưỡng HSG.' },
            ],
          },
          {
            id: 'grade10',
            title: 'GIA SƯ LUYỆN THI VÀO LỚP 10',
            lines: [
              { type: 'target', text: 'Đối tượng: Học sinh lớp 9 ôn thi vào trường công lập / chuyên.' },
              { type: 'star', text: 'Nội dung khóa học:' },
              { type: 'dot', text: 'Toán: công thức trọng tâm, luyện đề nâng cao.' },
              { type: 'dot', text: 'Văn: kỹ năng viết, phân tích đề.' },
              { type: 'dot', text: 'Anh: phát âm, ngữ pháp, nghe hiểu.' },
              { type: 'dot', text: 'Thi thử định kỳ & mẹo làm bài thi.' },
              { type: 'dot', text: 'Lộ trình cá nhân hóa theo mục tiêu trường.' },
            ],
          },
        ],
      },
      {
        id: 'hotline',
        type: 'hotline',
        enabled: true,
        fields: {
          label: 'Hotline tư vấn 24/7',
          phoneDisplay: '0968 526 800',
          phoneTel: '0968526800',
          consultLabel: 'Nhận tư vấn ngay',
          zaloLabel: 'Chat Zalo',
          zaloUrl: 'https://zalo.me/0968526800',
        },
        colors: {
          barBg: '#0b1f3a',
          zaloBg: '#0068FF',
        },
      },
      {
        id: 'trial',
        type: 'trial_program',
        enabled: true,
        fields: {
          title: 'Chương trình học thử',
          formHeadline: 'Chỉ còn',
          formHighlight: '5 suất',
          formHeadlineAfter: 'học thử',
          submitLabel: 'Đăng ký học thử ngay',
          courseOptions: [
            'Học thử gia sư môn Toán',
            'Kèm học sinh yếu / mất gốc',
            'Bồi dưỡng học sinh giỏi',
            'Luyện thi vào lớp 10',
            'Luyện thi tốt nghiệp THPT',
          ],
        },
        colors: {
          formBg: '#1a5c45',
          titleColor: '#1a5c45',
        },
        items: [
          {
            id: 'free',
            title: 'MIỄN PHÍ HỌC THỬ',
            desc: 'Học thử miễn phí trị giá 300.000đ với giáo viên trường chuyên.',
            icon: 'GraduationCap',
            border: 'border-emerald-400',
            iconBg: 'bg-emerald-50 text-emerald-700',
          },
          {
            id: 'test',
            title: 'KIỂM TRA NĂNG LỰC HỌC TẬP',
            desc: 'Được giáo viên đánh giá hoặc làm bài kiểm tra miễn phí.',
            icon: 'ClipboardList',
            border: 'border-sky-400',
            iconBg: 'bg-sky-50 text-sky-700',
          },
          {
            id: 'scholarship',
            title: 'TẶNG HỌC BỔNG ĐẾN 50%',
            desc: 'Nhận voucher giảm học phí đến 50% sau buổi học thử.',
            icon: 'Tag',
            border: 'border-teal-600',
            iconBg: 'bg-teal-50 text-teal-800',
          },
          {
            id: 'path',
            title: 'NHẬN LỘ TRÌNH HỌC ĐẠT ĐIỂM CAO',
            desc: 'Nhận lộ trình tối ưu để đạt điểm 8–9 theo mục tiêu.',
            icon: 'TrendingUp',
            border: 'border-cyan-500',
            iconBg: 'bg-cyan-50 text-cyan-700',
          },
        ],
      },
      {
        id: 'community',
        type: 'community_hub',
        enabled: true,
        fields: {},
        colors: {},
        items: [
          {
            id: 'qa',
            title: 'Hỏi & Đáp cùng cộng đồng',
            description: 'Đặt câu hỏi và nhận ngay lời giải từ thầy cô và các bạn',
            ctaLabel: 'Đặt câu hỏi',
            imageUrl: '/community-qa.jpg',
            linkUrl: '/hoi-dap',
            action: 'qa',
          },
          {
            id: 'contest',
            title: 'Cuộc thi vui mỗi tuần',
            description: 'Chinh phục những đề thi thú vị và nhận quà mỗi tuần',
            ctaLabel: 'Khám phá',
            imageUrl: '/community-contest.jpg',
            linkUrl: '/cuoc-thi',
            action: 'contest',
          },
        ],
      },
      {
        id: 'blog_docs',
        type: 'blog_docs',
        enabled: true,
        fields: {
          blogTitle: 'Blog Toán Học',
          docsTitle: 'TÀI LIỆU MỚI NHẤT',
          docsViewAll: 'Xem tất cả',
        },
        colors: {},
      },
      {
        id: 'competition_banner',
        type: 'competition_banner',
        enabled: true,
        fields: {
          bannerTitle: 'Chinh phục các kì thi toán học quốc gia, quốc tế cùng MathEdu',
          imageUrl: '/competition-logos.png',
        },
        colors: {},
      },
      {
        id: 'sidebar_guide',
        type: 'sidebar_guide',
        enabled: true,
        fields: {
          sectionTitle: 'Video hướng dẫn học trực tuyến',
          videoTitle: 'Hướng dẫn sử dụng MathEdu',
          videoUrl: '',
          facebookUrl: 'https://www.facebook.com/',
          youtubeUrl: 'https://www.youtube.com/',
          copyrightNote: '© MathEdu — Nền tảng học Toán trực tuyến',
        },
        colors: {},
      },
      {
        id: 'footer',
        type: 'footer',
        enabled: true,
        fields: {
          tagline: 'Thầy Phát dạy toán',
          description:
            'Nền tảng học Toán trực tuyến THCS & THPT (lớp 6–12), bám GDPT 2018 — bài giảng, luyện đề, phòng thi online.',
          phoneDisplay: '0968 526 800',
          phoneTel: '0968526800',
          email: 'thayphatdaytoan@gmail.com',
          zaloUrl: 'https://zalo.me/0968526800',
          facebookUrl: 'https://www.facebook.com/',
          youtubeUrl: 'https://www.youtube.com/',
          copyright: '© 2024–2026 MathEdu — Thầy Phát dạy toán',
          exploreTitle: 'Khám phá',
          supportTitle: 'Hỗ trợ',
          connectTitle: 'Kết nối với MathEdu',
          connectNote: 'Học trên trình duyệt — không cần cài app. Hỗ trợ máy tính và điện thoại.',
        },
        colors: {
          bg: '#ffffff',
          barBg: '#f8fafc',
        },
      },
    ],
  };
}

/** Deep clone mặc định */
export function cloneDefaultHomepageContent() {
  return JSON.parse(JSON.stringify(createDefaultHomepageContent()));
}

export function getBlock(content, type) {
  if (!content?.blocks) return null;
  return content.blocks.find((b) => b.type === type) || null;
}

const LEGACY_FEATURED_BANNERS = new Set([
  'ÔN THI 10',
  'TƯ DUY',
  'THPT QG',
  'THI ONLINE',
]);

/** Đổi card cũ (banner ngắn / id exam) sang layout + nội dung mới nếu còn copy legacy. */
function migrateFeaturedCourseItems(curItems, defItems) {
  const defById = new Map((defItems || []).map((d) => [d.id, d]));
  const defByIndex = defItems || [];
  return (curItems || []).map((item, i) => {
    const banner = String(item?.banner || '').trim();
    const isLegacy =
      LEGACY_FEATURED_BANNERS.has(banner) ||
      item?.id === 'exam' ||
      (!item?.icon && LEGACY_FEATURED_BANNERS.has(banner));
    if (!isLegacy) {
      return { ...item, icon: item.icon || defByIndex[i]?.icon || 'book' };
    }
    const defItem =
      defById.get(item.id === 'exam' ? 'hsg' : item.id) || defByIndex[i] || {};
    return {
      ...defItem,
      ...item,
      id: item.id === 'exam' ? 'hsg' : item.id,
      banner: defItem.banner || item.banner,
      badge: defItem.badge || item.badge,
      title: defItem.title || item.title,
      description: defItem.description || item.description,
      colorPreset: defItem.colorPreset || item.colorPreset,
      icon: defItem.icon || item.icon || 'book',
      bannerFontSize: defItem.bannerFontSize ?? item.bannerFontSize ?? 17,
      featured: false,
      action: item.id === 'exam' ? defItem.action || 'grade:12' : item.action || defItem.action,
    };
  });
}

export function normalizeHomepageContent(raw) {
  const fallback = createDefaultHomepageContent();
  if (!raw || typeof raw !== 'object') return fallback;
  const blocks = Array.isArray(raw.blocks) ? raw.blocks : fallback.blocks;
  const byType = new Map(blocks.map((b) => [b.type, b]));
  const mergedBlocks = fallback.blocks.map((def) => {
    const cur = byType.get(def.type);
    if (!cur) return JSON.parse(JSON.stringify(def));
    return {
      ...JSON.parse(JSON.stringify(def)),
      ...cur,
      id: cur.id || def.id,
      type: def.type,
      enabled: cur.enabled !== false,
      fields: { ...def.fields, ...(cur.fields || {}) },
      colors: { ...(def.colors || {}), ...(cur.colors || {}) },
      items: Array.isArray(cur.items)
        ? def.type === 'community_hub'
          ? cur.items.map((item, i) => {
              const defItem = (def.items || [])[i] || {};
              const url = String(item.imageUrl || '');
              const stale =
                !url ||
                url.includes('community-qa-card.svg') ||
                url.includes('community-contest-card.svg');
              return {
                ...defItem,
                ...item,
                imageUrl: stale ? defItem.imageUrl || url : url,
              };
            })
          : def.type === 'featured_courses'
            ? migrateFeaturedCourseItems(cur.items, def.items || [])
            : cur.items
        : def.items,
      menuItems: Array.isArray(cur.menuItems) ? cur.menuItems : def.menuItems,
      thcsItems: Array.isArray(cur.thcsItems) ? cur.thcsItems : def.thcsItems,
      thptItems: Array.isArray(cur.thptItems) ? cur.thptItems : def.thptItems,
      luyenThi: cur.luyenThi ? { ...def.luyenThi, ...cur.luyenThi } : def.luyenThi,
    };
  });
  // Giữ thứ tự từ raw nếu đủ type; không thì theo default
  const orderTypes = blocks.map((b) => b.type).filter((t) => mergedBlocks.some((m) => m.type === t));
  // Giữ thứ tự từ raw; chèn block mặc định còn thiếu vào đúng vị trí (vd. promo sau hero)
  const ordered = orderTypes
    .map((t) => mergedBlocks.find((m) => m.type === t))
    .filter(Boolean);

  const defaultOrder = fallback.blocks.map((b) => b.type);
  for (const type of defaultOrder) {
    if (ordered.some((b) => b.type === type)) continue;
    const missing = mergedBlocks.find((m) => m.type === type);
    if (!missing) continue;
    const defIdx = defaultOrder.indexOf(type);
    let insertAt = ordered.length;
    for (let i = defIdx - 1; i >= 0; i -= 1) {
      const prevType = defaultOrder[i];
      const prevIdx = ordered.findIndex((b) => b.type === prevType);
      if (prevIdx >= 0) {
        insertAt = prevIdx + 1;
        break;
      }
    }
    ordered.splice(insertAt, 0, missing);
  }

  return {
    version: Number(raw.version) || 1,
    updated_at: Number(raw.updated_at) || 0,
    blocks: ordered,
  };
}

function deepSanitizeHomepageValue(value, depth = 0) {
  if (depth > 48) return null;
  if (value === undefined) return undefined;
  if (value === null) return null;
  const t = typeof value;
  if (t === 'string') {
    const s = value.trim();
    if (s.startsWith('data:image/') && s.length > 6000) return '';
    return s.length > 4000 ? s.slice(0, 4000) : s;
  }
  if (t === 'boolean') return value;
  if (t === 'number') return Number.isFinite(value) ? value : null;
  if (t === 'bigint' || t === 'function' || t === 'symbol') return null;
  if (Array.isArray(value)) {
    return value
      .map((item) => deepSanitizeHomepageValue(item, depth + 1))
      .filter((item) => item !== undefined);
  }
  if (t === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      try {
        return String(value);
      } catch {
        return null;
      }
    }
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      const cleaned = deepSanitizeHomepageValue(val, depth + 1);
      if (cleaned !== undefined) out[key] = cleaned;
    }
    return out;
  }
  return null;
}

/** Chuẩn hoá payload trước khi ghi Firestore (bỏ undefined, cắt URL quá dài). */
export function sanitizeHomepagePayloadForFirestore(raw) {
  let cloned;
  try {
    cloned = JSON.parse(JSON.stringify(raw ?? {}));
  } catch {
    cloned = {};
  }
  return deepSanitizeHomepageValue({
    version: Number(cloned.version) || 1,
    updated_at: Date.now(),
    blocks: Array.isArray(cloned.blocks) ? cloned.blocks : [],
  });
}

export function newPromoSlideItem() {
  return {
    id: uid('promo'),
    imageUrl: '/promo-slide-1.svg',
    linkUrl: '#hoc-thu',
    alt: 'Quảng cáo MathEdu',
  };
}

export function newFeaturedCourseItem() {
  return {
    id: uid('course'),
    banner: 'KHÓA HỌC MỚI',
    badge: 'Mới',
    title: 'Khóa học mới',
    description: 'Mô tả ngắn.',
    colorPreset: 'blue',
    action: 'grade:9',
    featured: false,
    icon: 'book',
    imageUrl: '',
    bannerColor: '#ffffff',
    bannerFontSize: 17,
    badgeTextColor: '#ffffff',
  };
}

export function newTutorPackageItem() {
  return {
    id: uid('tutor'),
    title: 'GÓI GIA SƯ MỚI',
    lines: [
      { type: 'target', text: 'Đối tượng: …' },
      { type: 'star', text: 'Nội dung khóa học:' },
      { type: 'dot', text: 'Nội dung 1' },
    ],
  };
}

export function newTrialBenefitItem() {
  return {
    id: uid('benefit'),
    title: 'LỢI ÍCH MỚI',
    desc: 'Mô tả lợi ích.',
    icon: 'Gift',
    border: 'border-blue-400',
    iconBg: 'bg-blue-50 text-blue-700',
  };
}
