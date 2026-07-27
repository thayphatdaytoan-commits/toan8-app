/* eslint-disable */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Plus, Pencil, Trash2, Save, Upload } from 'lucide-react';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import CommunityMathComposer from '../community/CommunityMathComposer';
import { compressImageFileToJpegBlob } from '../adminImageUpload';
import { ensureAnonymousAuth, storage } from '../firebaseClient';
import {
  BLOG_CATEGORIES,
  blogCategoryMeta,
  resolveBlogThumbnail,
  slugifyContent,
} from '../content/contentTaxonomy';
import { deleteBlogPostFs, saveBlogPostFs, subscribeBlogPosts } from '../content/contentStore';

const empty = () => ({
  id: '',
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  thumbnail: '',
  categoryId: 'blog_toan',
  tagsText: '',
  author: 'Thầy Phát',
  seoTitle: '',
  seoDescription: '',
  publishedAt: new Date().toISOString(),
  enabled: true,
});

async function uploadBlogImage(file, kind = 'content') {
  if (!storage) throw new Error('Storage chưa sẵn sàng');
  if (!file) throw new Error('Chưa chọn ảnh');
  try {
    await ensureAnonymousAuth();
  } catch {
    /* ignore */
  }
  const blob = await compressImageFileToJpegBlob(file, { maxEdge: 1680, quality: 0.85 });
  const path = `site-content/blog_${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const r = storageRef(storage, path);
  await uploadBytes(r, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(r);
}

function toDatetimeLocalValue(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

export default function AdminBlogPanel() {
  const [posts, setPosts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [thumbBusy, setThumbBusy] = useState(false);
  const [error, setError] = useState('');
  const thumbInputRef = useRef(null);

  useEffect(() => {
    const unsub = subscribeBlogPosts(setPosts);
    return () => unsub?.();
  }, []);

  const previewThumb = useMemo(
    () => (editing ? resolveBlogThumbnail(editing) : ''),
    [editing]
  );

  const startEdit = (p) =>
    setEditing({
      ...p,
      tagsText: (p.tags || []).join(', '),
    });

  const onSave = async () => {
    if (!editing) return;
    setBusy(true);
    setError('');
    try {
      const cat = blogCategoryMeta(editing.categoryId);
      const tags = String(editing.tagsText || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const thumbnail = resolveBlogThumbnail(editing);
      await saveBlogPostFs({
        ...editing,
        slug: editing.slug || slugifyContent(editing.title),
        categoryTag: cat.tag,
        tags,
        thumbnail,
      });
      setEditing(null);
    } catch (e) {
      setError(e?.message || 'Lưu thất bại');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Xóa bài viết này?')) return;
    setBusy(true);
    try {
      await deleteBlogPostFs(id);
    } catch (e) {
      setError(e?.message || 'Xóa thất bại');
    } finally {
      setBusy(false);
    }
  };

  const onThumbFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editing) return;
    setThumbBusy(true);
    setError('');
    try {
      const url = await uploadBlogImage(file, 'thumb');
      setEditing((prev) => (prev ? { ...prev, thumbnail: url } : prev));
    } catch (err) {
      setError(err?.message || 'Tải thumbnail thất bại');
    } finally {
      setThumbBusy(false);
    }
  };

  const uploadContentImage = async (file) => uploadBlogImage(file, 'content');

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" /> Blog Toán học
          </h2>
          <p className="text-sm text-slate-500">
            Bài viết hiện trên trang chủ, sidebar Đố vui và trang /blog. Có thể tải ảnh từ máy.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(empty())}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold"
        >
          <Plus className="w-4 h-4" /> Thêm bài viết
        </button>
      </div>

      {error ? <p className="text-sm text-red-600 font-semibold">{error}</p> : null}

      {editing ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <p className="font-black text-slate-800">{editing.id ? 'Sửa bài viết' : 'Bài viết mới'}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs font-bold text-slate-500 block md:col-span-2">
              Tiêu đề
              <input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
              />
            </label>
            <label className="text-xs font-bold text-slate-500 block">
              Slug (URL)
              <input
                value={editing.slug}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                placeholder="tu-dong-tu-tieu-de"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold text-slate-500 block">
              Chuyên mục
              <select
                value={editing.categoryId}
                onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
              >
                {BLOG_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-500 block md:col-span-2">
              Tóm tắt
              <textarea
                value={editing.excerpt}
                onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>

            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
              <p className="text-xs font-bold text-slate-500">Ảnh thumbnail</p>
              <div className="flex flex-wrap items-start gap-3">
                <img
                  src={previewThumb}
                  alt=""
                  className="w-28 h-20 rounded-lg object-cover bg-white border border-slate-200"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    ref={thumbInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onThumbFile}
                  />
                  <button
                    type="button"
                    disabled={thumbBusy || !storage}
                    onClick={() => thumbInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {thumbBusy ? 'Đang tải…' : 'Tải ảnh thumbnail từ máy'}
                  </button>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Không tải lên thì tự lấy ảnh trong bài viết; nếu chưa có ảnh thì dùng logo MathEdu.
                  </p>
                  <input
                    value={editing.thumbnail}
                    onChange={(e) => setEditing({ ...editing, thumbnail: e.target.value })}
                    placeholder="Hoặc dán URL ảnh (để trống = tự động)"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                  />
                  {editing.thumbnail ? (
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, thumbnail: '' })}
                      className="text-[11px] font-bold text-slate-500 hover:text-red-600"
                    >
                      Xóa thumbnail thủ công (dùng mặc định)
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <label className="text-xs font-bold text-slate-500 block">
              Tác giả
              <input
                value={editing.author}
                onChange={(e) => setEditing({ ...editing, author: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold text-slate-500 block md:col-span-2">
              Tags (cách nhau bởi dấu phẩy)
              <input
                value={editing.tagsText}
                onChange={(e) => setEditing({ ...editing, tagsText: e.target.value })}
                placeholder="thi THPT, điểm chuẩn, ..."
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold text-slate-500 block">
              SEO Title
              <input
                value={editing.seoTitle}
                onChange={(e) => setEditing({ ...editing, seoTitle: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold text-slate-500 block">
              SEO Description
              <input
                value={editing.seoDescription}
                onChange={(e) => setEditing({ ...editing, seoDescription: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold text-slate-500 block">
              Ngày đăng
              <input
                type="datetime-local"
                value={toDatetimeLocalValue(editing.publishedAt)}
                onChange={(e) => {
                  const v = e.target.value;
                  setEditing({
                    ...editing,
                    publishedAt: v ? new Date(v).toISOString() : new Date().toISOString(),
                  });
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">Nội dung bài viết</p>
            <CommunityMathComposer
              value={editing.content}
              onChange={(v) => setEditing({ ...editing, content: v })}
              rows={8}
              placeholder="Soạn nội dung blog…"
              maxImages={12}
              enableFileUpload
              onUploadImage={uploadContentImage}
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={editing.enabled !== false}
              onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })}
            />
            Hiển thị công khai
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="px-3 py-2 rounded-lg bg-slate-100 text-sm font-bold">
              Hủy
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onSave}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold"
            >
              <Save className="w-4 h-4" /> Lưu
            </button>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        {posts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
            Chưa có bài viết. Nhấn “Thêm bài viết”.
          </div>
        ) : (
          posts.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center gap-3">
              <img
                src={resolveBlogThumbnail(p)}
                alt=""
                className="w-16 h-12 rounded-lg object-cover bg-slate-100"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-blue-600 uppercase">{p.categoryTag}</p>
                <p className="font-bold text-slate-900 truncate">{p.title}</p>
                <p className="text-xs text-slate-500 truncate">{p.excerpt}</p>
              </div>
              <button type="button" onClick={() => startEdit(p)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-xs font-bold">
                <Pencil className="w-3.5 h-3.5" /> Sửa
              </button>
              <button type="button" onClick={() => onDelete(p.id)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold">
                <Trash2 className="w-3.5 h-3.5" /> Xóa
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
