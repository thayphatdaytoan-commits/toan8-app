/* eslint-disable */
/** Phân tích link bài giảng / đề thi dán từ trang web. */
export function parseInternalResourceLink(raw) {
  const input = String(raw || '').trim();
  if (!input) return { kind: 'link', label: '', link_url: '', resource_id: '' };

  let url;
  try {
    url = input.startsWith('http') ? new URL(input) : new URL(input, 'https://thayphatdaytoan-7832c.web.app/');
  } catch {
    return { kind: 'link', label: input, link_url: input, resource_id: '' };
  }

  const params = url.searchParams;
  const lessonId = params.get('lessonId');
  if (lessonId) {
    return {
      kind: 'lesson',
      label: `Bài giảng (${lessonId.slice(0, 8)}…)`,
      link_url: input,
      resource_id: lessonId,
    };
  }

  const quizId = params.get('quizId');
  if (quizId) {
    return {
      kind: 'quiz',
      label: `Đề thi (${quizId.slice(0, 8)}…)`,
      link_url: input,
      resource_id: quizId,
    };
  }

  const pathMatch = url.pathname.match(/^\/bai-giang\/([^/?#]+)\/?$/i);
  if (pathMatch) {
    const slug = decodeURIComponent(pathMatch[1]);
    return {
      kind: 'lesson',
      label: `Bài giảng /${slug}`,
      link_url: input,
      resource_id: slug,
      slug,
    };
  }

  return { kind: 'link', label: input, link_url: input, resource_id: '' };
}

export function buildResourceLabel(parsed, lessonsList = [], quizzesList = []) {
  if (!parsed) return '';
  if (parsed.kind === 'lesson' && parsed.resource_id) {
    const byId = lessonsList.find((l) => l.id === parsed.resource_id);
    if (byId?.title) return byId.title;
    if (parsed.slug) {
      const bySlug = lessonsList.find((l) => String(l.slug || '') === parsed.slug);
      if (bySlug?.title) return bySlug.title;
    }
  }
  if (parsed.kind === 'quiz' && parsed.resource_id) {
    const q = quizzesList.find((x) => x.id === parsed.resource_id);
    if (q?.title) return q.title;
  }
  return parsed.label || parsed.link_url || '';
}
