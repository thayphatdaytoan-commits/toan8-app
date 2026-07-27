/* eslint-disable */
import React, { useEffect, useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import { formatBlogMonth, formatDocDate, resolveBlogThumbnail } from '../content/contentTaxonomy';
import { subscribeBlogPosts, subscribeSiteDocuments } from '../content/contentStore';

/**
 * Khối Blog + Tài liệu mới nhất — trang chủ (trên footer / trước banner kỳ thi).
 */
export default function BlogDocsHomeSection({
  onOpenBlogPost,
  onOpenDocuments,
  onOpenDocument,
}) {
  const [posts, setPosts] = useState([]);
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    const u1 = subscribeBlogPosts(setPosts);
    const u2 = subscribeSiteDocuments(setDocs);
    return () => {
      u1?.();
      u2?.();
    };
  }, []);

  const blogList = useMemo(
    () => posts.filter((p) => p.enabled !== false).slice(0, 4),
    [posts]
  );
  const docList = useMemo(
    () => docs.filter((d) => d.enabled !== false).slice(0, 4),
    [docs]
  );

  return (
    <section className="mb-10 md:mb-14 min-w-0">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-6 lg:gap-8">
        {/* Blog */}
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 pb-2 border-b border-slate-200 mb-4">
            Blog Toán Học
          </h2>
          {blogList.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-6">Chưa có bài viết. Thêm ở Admin → Blog.</p>
          ) : (
            <div className="space-y-5">
              {blogList.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onOpenBlogPost?.(p.slug || p.id)}
                  className="w-full text-left flex gap-3 sm:gap-4 group"
                >
                  <img
                    src={resolveBlogThumbnail(p)}
                    alt=""
                    className="w-28 sm:w-36 h-20 sm:h-24 rounded-lg object-cover bg-slate-100 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-blue-600 mb-0.5">
                      {p.categoryTag || 'BLOG TOÁN HỌC'}
                    </p>
                    <p className="text-sm sm:text-base font-bold text-blue-700 leading-snug group-hover:underline line-clamp-2">
                      {p.title}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 line-clamp-2">{p.excerpt}</p>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      bởi <span className="text-blue-600 font-semibold">{p.author}</span>
                      {' - '}
                      {formatBlogMonth(p.publishedAt)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tài liệu mới nhất */}
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2 mb-3 bg-slate-100 px-3 py-2.5 rounded-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-1.5 h-5 bg-red-600 shrink-0" />
              <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wide truncate">
                Tài liệu mới nhất
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onOpenDocuments?.()}
              className="text-sm font-bold text-red-600 hover:underline shrink-0"
            >
              Xem tất cả
            </button>
          </div>
          {docList.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-4">Chưa có tài liệu. Thêm ở Admin → Tài liệu.</p>
          ) : (
            <div className="space-y-3">
              {docList.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onOpenDocument?.(d.id)}
                  className="w-full text-left flex gap-3 group"
                >
                  <img
                    src={d.thumbnail}
                    alt=""
                    className="w-12 h-16 rounded object-cover bg-slate-100 shrink-0 border border-slate-100"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 leading-snug group-hover:text-blue-700 line-clamp-2">
                      {d.title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDocDate(d.publishedAt)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
