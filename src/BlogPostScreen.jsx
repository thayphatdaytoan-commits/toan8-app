/* eslint-disable */
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import MathEduLogo from './components/MathEduLogo';
import CommunityRichText from './community/CommunityRichText';
import { formatBlogMonth, resolveBlogThumbnail } from './content/contentTaxonomy';
import { subscribeBlogPosts } from './content/contentStore';

export default function BlogPostScreen({ slug = '', onGoHome, onOpenPost }) {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const unsub = subscribeBlogPosts(setPosts);
    return () => unsub?.();
  }, []);

  const published = useMemo(() => posts.filter((p) => p.enabled !== false), [posts]);
  const post = useMemo(
    () => (slug ? published.find((p) => p.slug === slug || p.id === slug) : null),
    [published, slug]
  );

  return (
    <div className="min-h-screen w-full bg-[#f4f7fe] flex flex-col font-sans">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onGoHome}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <button type="button" onClick={onGoHome}>
            <MathEduLogo className="h-9 sm:h-10" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-400 uppercase">Blog Toán Học</p>
            <h1 className="text-sm font-black text-slate-900 truncate">{slug ? 'Bài viết' : 'Tất cả bài viết'}</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-3 sm:px-4 py-6 sm:py-8">
        {!slug ? (
          <div className="space-y-3">
            {published.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10">Chưa có bài viết.</p>
            ) : (
              published.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onOpenPost?.(p.slug || p.id)}
                  className="w-full text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300"
                >
                  <p className="text-[10px] font-bold text-blue-600 uppercase">{p.categoryTag}</p>
                  <p className="font-bold text-slate-900">{p.title}</p>
                  <p className="text-sm text-slate-500 line-clamp-2 mt-1">{p.excerpt}</p>
                </button>
              ))
            )}
          </div>
        ) : !post ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
            Không tìm thấy bài viết.
            <button type="button" onClick={onGoHome} className="block mx-auto mt-3 text-blue-600 font-bold">
              Về trang chủ
            </button>
          </div>
        ) : (
          <article className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-8">
            <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600 mb-2">{post.categoryTag}</p>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-3">{post.title}</h2>
            <p className="text-sm text-slate-500 mb-5">
              bởi <span className="text-blue-600 font-semibold">{post.author}</span>
              {' · '}
              {formatBlogMonth(post.publishedAt)}
            </p>
            {resolveBlogThumbnail(post) ? (
              <img
                src={resolveBlogThumbnail(post)}
                alt=""
                className="w-full max-h-72 object-cover rounded-xl mb-6 bg-slate-100"
              />
            ) : null}
            {(post.tags || []).length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {post.tags.map((t) => (
                  <span key={t} className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    #{t}
                  </span>
                ))}
              </div>
            ) : null}
            <CommunityRichText text={post.content || post.excerpt} className="text-[15px] sm:text-base text-slate-800" />
          </article>
        )}
      </main>
    </div>
  );
}
