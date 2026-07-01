/* eslint-disable */
import { Helmet } from 'react-helmet-async';
import {
  SITE_NAME_FULL,
  DEFAULT_DESCRIPTION,
  TWITTER_HANDLE,
  getSiteOrigin,
} from './siteConfig';
import { extractYouTubeID } from '../youtubeUtils';
import { slugifyVi } from '../lessonSlug';

function jsonLdSafe(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

/** Meta description ~150–160 ký tự (Google snippet). */
function clipSeoDescription(text, max = 158) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 50 ? cut.slice(0, lastSpace) : cut).trim() + '…';
}

/**
 * Meta title/description/canonical/OG/Twitter + JSON-LD theo trạng thái app.
 */
export default function SeoHead({
  appState,
  publicGrade = '11',
  studentName = '',
  /** Khối trên danh sách lớp (học sinh không tự đổi; quản trị cập nhật). */
  studentRosterGrade = '8',
  selectedLesson = null,
  activeQuiz = null,
}) {
  const origin = getSiteOrigin();

  const isPublicLanding = appState === 'dashboard' && !studentName;
  const isLogin = appState === 'login';
  const isAdmin = appState === 'admin';
  const pathname = typeof window !== 'undefined' ? String(window.location.pathname || '/') : '/';
  const pathnameNorm = pathname.replace(/\/+$/, '') || '/';
  const isAdminLoginUrl = pathnameNorm === '/admin' || pathnameNorm === '/admin/login';
  const catalogMatch = pathname.match(/^\/lop\/(\d{1,2})(?:\/chuong\/([^\/?#]+)(?:\/bai\/([^\/?#]+))?)?\/?$/i);
  const isCatalog = !!catalogMatch && !studentName && !isLogin && !isAdmin;

  let title = `${SITE_NAME_FULL}`;
  let description = DEFAULT_DESCRIPTION;
  let keywords = '';
  const ogImage = `${origin}/og-image.png`;
  const ogImageWidth = 1200;
  const ogImageHeight = 630;

  if (isCatalog) {
    const g = catalogMatch?.[1] || publicGrade;
    const ch = catalogMatch?.[2] ? decodeURIComponent(catalogMatch[2]) : '';
    const bn = catalogMatch?.[3] ? decodeURIComponent(catalogMatch[3]) : '';
    if (g && ch && bn) {
      title = `Toán ${g} — Chương ${ch} · Bài ${bn} | Bài giảng & đề luyện | ${SITE_NAME_FULL}`;
      description = clipSeoDescription(
        `Tổng hợp bài giảng và đề luyện Toán ${g} theo Chương ${ch} Bài ${bn}: lý thuyết trọng tâm, ví dụ minh hoạ, bài tập tự luyện, đề kiểm tra.`,
        158
      );
      keywords = [`Toán ${g}`, `lớp ${g}`, `chương ${ch}`, `bài ${bn}`, 'bài giảng', 'đề luyện', 'bài tập', 'lời giải']
        .filter(Boolean)
        .join(', ');
    } else if (g && ch) {
      title = `Toán ${g} — Chương ${ch} | Danh mục bài giảng & đề | ${SITE_NAME_FULL}`;
      description = clipSeoDescription(
        `Danh mục bài giảng và đề luyện Toán ${g} theo Chương ${ch}. Học lý thuyết trọng tâm, làm ví dụ, luyện bài tập và đề kiểm tra.`,
        158
      );
      keywords = [`Toán ${g}`, `lớp ${g}`, `chương ${ch}`, 'bài giảng', 'đề luyện', 'bài tập', 'lời giải'].join(', ');
    } else if (g) {
      title = `Toán ${g} | Danh mục bài giảng theo chương/bài | ${SITE_NAME_FULL}`;
      description = clipSeoDescription(
        `Kho bài giảng và đề luyện Toán lớp ${g} theo từng chương/bài. Học tư duy, bám GDPT 2018: lý thuyết, ví dụ, bài tập, đề thi.`,
        158
      );
      keywords = [`Toán ${g}`, `lớp ${g}`, 'bài giảng', 'đề thi', 'luyện đề', 'GDPT 2018'].join(', ');
    }
  } else if (isPublicLanding) {
    title = `Toán ${publicGrade} — Học tư duy & luyện đề | ${SITE_NAME_FULL}`;
    description = `Bài giảng và đề thi Toán lớp ${publicGrade}. ${DEFAULT_DESCRIPTION}`;
  } else if (isLogin) {
    title = isAdminLoginUrl ? `Đăng nhập giáo viên | ${SITE_NAME_FULL}` : `Đăng nhập học sinh | ${SITE_NAME_FULL}`;
    description = isAdminLoginUrl
      ? 'Đăng nhập khu vực quản trị nội dung (giáo viên).'
      : 'Đăng nhập để làm bài thi và lưu kết quả trên hệ thống Thầy Phát dạy toán.';
  } else if (appState === 'dashboard' && studentName) {
    title = `Kho học liệu Toán ${studentRosterGrade} | ${SITE_NAME_FULL}`;
    description = `Học liệu môn Toán khối ${studentRosterGrade} dành cho học sinh đã đăng nhập.`;
  } else if (appState === 'lesson_viewer' && selectedLesson?.title) {
    const g = selectedLesson.grade_level || publicGrade;
    title = `${selectedLesson.title} | Toán ${g} | ${SITE_NAME_FULL}`;
    const seoBody = (selectedLesson.description || '').replace(/\s+/g, ' ').trim();
    const fallback = `Bài giảng Toán ${g} — ${selectedLesson.title}. Ôn tập theo chương, bám sách KNTT & GDPT 2018.`;
    description = clipSeoDescription(seoBody || fallback, 158);
    keywords = [
      `Toán ${g}`,
      `lớp ${g}`,
      selectedLesson.chapter && `chương ${selectedLesson.chapter}`,
      selectedLesson.lesson_no && `bài ${selectedLesson.lesson_no}`,
      'bài giảng',
      'học online',
      'GDPT 2018',
    ]
      .filter(Boolean)
      .join(', ');
  } else if ((appState === 'quiz' || appState === 'result' || appState === 'review') && activeQuiz?.title) {
    title = `${activeQuiz.title} | Phòng thi | ${SITE_NAME_FULL}`;
    description = `Đề thi: ${activeQuiz.title}. Hệ thống trắc nghiệm Thầy Phát dạy toán.`;
  } else if (isAdmin) {
    title = `Quản trị nội dung | ${SITE_NAME_FULL}`;
    description = 'Khu vực quản trị giáo viên.';
  }

  const gradeForCanonical = String(publicGrade || '11').trim() || '11';
  const canonicalUrl =
    typeof window !== 'undefined'
      ? isPublicLanding
        ? `${window.location.origin}/lop/${encodeURIComponent(gradeForCanonical)}`
        : isCatalog
          ? `${window.location.origin}${window.location.pathname || '/'}`
          : `${window.location.origin}${window.location.pathname}${window.location.search || ''}`
      : `${origin}/lop/${encodeURIComponent(gradeForCanonical)}`;

  const robots =
    (isPublicLanding || isCatalog) && !isLogin && !isAdmin
      ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
      : 'noindex, nofollow';

  const graph = [
    {
      '@type': 'WebSite',
      '@id': `${origin}/#website`,
      url: origin,
      name: SITE_NAME_FULL,
      inLanguage: 'vi-VN',
      description: DEFAULT_DESCRIPTION,
      publisher: { '@id': `${origin}/#org` },
    },
    {
      '@type': 'EducationalOrganization',
      '@id': `${origin}/#org`,
      name: SITE_NAME_FULL,
      url: origin,
      logo: `${origin}/favicon.svg`,
      sameAs: ['https://sites.google.com/view/hoctoanthayphat/trang-ch%E1%BB%A7'],
    },
  ];

  if (appState === 'lesson_viewer' && selectedLesson?.title) {
    const g = String(selectedLesson.grade_level || publicGrade || '11').trim() || '11';
    const chRaw = String(selectedLesson.chapter || '').trim();
    const bnRaw = String(selectedLesson.lesson_no || '').trim();
    const chSlug = slugifyVi(chRaw);
    const bnSlug = slugifyVi(bnRaw);

    const breadcrumbItems = [
      { name: SITE_NAME_FULL, item: `${origin}/` },
      { name: `Toán ${g}`, item: `${origin}/lop/${encodeURIComponent(g)}` },
    ];
    if (chRaw && chSlug) {
      breadcrumbItems.push({
        name: `Chương ${chRaw}`,
        item: `${origin}/lop/${encodeURIComponent(g)}/chuong/${encodeURIComponent(chSlug)}`,
      });
    }
    if (chRaw && bnRaw && chSlug && bnSlug) {
      breadcrumbItems.push({
        name: `Bài ${bnRaw}`,
        item: `${origin}/lop/${encodeURIComponent(g)}/chuong/${encodeURIComponent(chSlug)}/bai/${encodeURIComponent(bnSlug)}`,
      });
    }
    breadcrumbItems.push({ name: selectedLesson.title, item: canonicalUrl });

    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${canonicalUrl}#breadcrumb`,
      itemListElement: breadcrumbItems.map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: it.name,
        item: it.item,
      })),
    });

    graph.push({
      '@type': 'LearningResource',
      '@id': `${canonicalUrl}#learning`,
      url: canonicalUrl,
      name: selectedLesson.title,
      description,
      inLanguage: 'vi-VN',
      isAccessibleForFree: true,
      educationalLevel: `THPT — lớp ${g}`,
      learningResourceType: 'Lecture',
      about: { '@type': 'Thing', name: `Môn Toán lớp ${g}` },
      provider: { '@id': `${origin}/#org` },
    });

    const ts = selectedLesson.timestamp ? Number(selectedLesson.timestamp) : null;
    const isoDate = ts && Number.isFinite(ts) ? new Date(ts).toISOString() : undefined;

    graph.push({
      '@type': 'Article',
      '@id': `${canonicalUrl}#article`,
      headline: selectedLesson.title,
      description,
      inLanguage: 'vi-VN',
      isAccessibleForFree: true,
      author: { '@id': `${origin}/#org` },
      publisher: { '@id': `${origin}/#org` },
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
      ...(isoDate ? { dateModified: isoDate, datePublished: isoDate } : {}),
    });

    const vid = extractYouTubeID(selectedLesson.videoUrl || '');
    if (vid) {
      graph.push({
        '@type': 'VideoObject',
        '@id': `${canonicalUrl}#video`,
        name: `Video: ${selectedLesson.title}`,
        description: clipSeoDescription(description, 200),
        thumbnailUrl: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
        embedUrl: `https://www.youtube.com/embed/${vid}`,
        contentUrl: `https://www.youtube.com/watch?v=${vid}`,
        uploadDate: isoDate,
        inLanguage: 'vi-VN',
        publisher: { '@id': `${origin}/#org` },
        isPartOf: { '@id': `${canonicalUrl}#learning` },
      });
    }
  }

  if (isCatalog && catalogMatch) {
    const g = catalogMatch?.[1] || publicGrade;
    const ch = catalogMatch?.[2] ? decodeURIComponent(catalogMatch[2]) : '';
    const bn = catalogMatch?.[3] ? decodeURIComponent(catalogMatch[3]) : '';

    const catItems = [{ name: SITE_NAME_FULL, item: `${origin}/` }, { name: `Toán ${g}`, item: `${origin}/lop/${encodeURIComponent(g)}` }];
    if (ch) {
      catItems.push({
        name: `Chương ${ch}`,
        item: `${origin}/lop/${encodeURIComponent(g)}/chuong/${encodeURIComponent(ch)}`,
      });
    }
    if (ch && bn) {
      catItems.push({
        name: `Bài ${bn}`,
        item: `${origin}/lop/${encodeURIComponent(g)}/chuong/${encodeURIComponent(ch)}/bai/${encodeURIComponent(bn)}`,
      });
    }

    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${canonicalUrl}#breadcrumb`,
      itemListElement: catItems.map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: it.name,
        item: it.item,
      })),
    });

    graph.push({
      '@type': 'CollectionPage',
      '@id': `${canonicalUrl}#collection`,
      name: title,
      description,
      url: canonicalUrl,
      inLanguage: 'vi-VN',
      isPartOf: { '@id': `${origin}/#website` },
      about: { '@type': 'Thing', name: `Toán lớp ${g}` },
    });
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': graph,
  };

  return (
    <Helmet prioritizeSeoTags htmlAttributes={{ lang: 'vi' }}>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords ? <meta name="keywords" content={keywords} /> : null}
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonicalUrl} />

      <meta
        property="og:type"
        content={appState === 'lesson_viewer' && selectedLesson?.title ? 'article' : 'website'}
      />
      <meta property="og:site_name" content={SITE_NAME_FULL} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:locale" content="vi_VN" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content={String(ogImageWidth)} />
      <meta property="og:image:height" content={String(ogImageHeight)} />
      <meta property="og:image:type" content="image/png" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      <meta name="theme-color" content="#1d4ed8" />

      <script type="application/ld+json">{jsonLdSafe(jsonLd)}</script>
    </Helmet>
  );
}