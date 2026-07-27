/* eslint-disable */
import React, { useEffect, useMemo, useState } from 'react';
import { FolderOpen, Plus, Pencil, Trash2, Save } from 'lucide-react';
import { DOC_FOLDERS, folderLabel } from '../content/contentTaxonomy';
import { deleteSiteDocumentFs, saveSiteDocumentFs, subscribeSiteDocuments } from '../content/contentStore';

const empty = () => ({
  id: '',
  title: '',
  folderId: 'grade_8',
  thumbnail: '/contest-thumb-2.svg',
  embedUrl: '',
  downloadUrl: '',
  tocText: '',
  publishedAt: new Date().toISOString(),
  enabled: true,
});

export default function AdminDocumentsPanel() {
  const [docs, setDocs] = useState([]);
  const [folderFilter, setFolderFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = subscribeSiteDocuments(setDocs);
    return () => unsub?.();
  }, []);

  const filtered = useMemo(() => {
    if (folderFilter === 'all') return docs;
    return docs.filter((d) => d.folderId === folderFilter);
  }, [docs, folderFilter]);

  const onSave = async () => {
    if (!editing) return;
    if (!String(editing.embedUrl || '').trim()) {
      setError('Cần dán link nhúng / xem tài liệu (Drive, PDF…)');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await saveSiteDocumentFs(editing);
      setEditing(null);
    } catch (e) {
      setError(e?.message || 'Lưu thất bại');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Xóa tài liệu này?')) return;
    setBusy(true);
    try {
      await deleteSiteDocumentFs(id);
    } catch (e) {
      setError(e?.message || 'Xóa thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-rose-600" /> Tài liệu
          </h2>
          <p className="text-sm text-slate-500">
            Quản lý link tài liệu theo thư mục: khối lớp, Tuyển sinh 10, THPT, HSG, Khác. Nhúng link để trang nhẹ.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(empty())}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 text-white text-sm font-bold"
        >
          <Plus className="w-4 h-4" /> Thêm tài liệu
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFolderFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold ${
            folderFilter === 'all' ? 'bg-rose-600 text-white' : 'bg-white border border-slate-200'
          }`}
        >
          Tất cả
        </button>
        {DOC_FOLDERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFolderFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold ${
              folderFilter === f.id ? 'bg-rose-600 text-white' : 'bg-white border border-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-600 font-semibold">{error}</p> : null}

      {editing ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <p className="font-black text-slate-800">{editing.id ? 'Sửa tài liệu' : 'Tài liệu mới'}</p>
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
              Thư mục
              <select
                value={editing.folderId}
                onChange={(e) => setEditing({ ...editing, folderId: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
              >
                {DOC_FOLDERS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-500 block">
              Ảnh bìa (URL)
              <input
                value={editing.thumbnail}
                onChange={(e) => setEditing({ ...editing, thumbnail: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold text-slate-500 block md:col-span-2">
              Link nhúng / xem (Google Drive, PDF…)
              <input
                value={editing.embedUrl}
                onChange={(e) => setEditing({ ...editing, embedUrl: e.target.value })}
                placeholder="https://drive.google.com/file/d/.../view"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold text-slate-500 block md:col-span-2">
              Link tải (để trống = dùng link xem)
              <input
                value={editing.downloadUrl}
                onChange={(e) => setEditing({ ...editing, downloadUrl: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold text-slate-500 block md:col-span-2">
              Mục lục (tuỳ chọn, mỗi dòng một mục)
              <textarea
                value={editing.tocText}
                onChange={(e) => setEditing({ ...editing, tocText: e.target.value })}
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
              />
            </label>
            <label className="text-xs font-bold text-slate-500 block">
              Ngày đăng
              <input
                type="datetime-local"
                value={(() => {
                  try {
                    const d = new Date(editing.publishedAt);
                    if (Number.isNaN(d.getTime())) return '';
                    const pad = (n) => String(n).padStart(2, '0');
                    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                  } catch {
                    return '';
                  }
                })()}
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
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 self-end pb-2">
              <input
                type="checkbox"
                checked={editing.enabled !== false}
                onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })}
              />
              Hiển thị công khai
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="px-3 py-2 rounded-lg bg-slate-100 text-sm font-bold">
              Hủy
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onSave}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-rose-600 text-white text-sm font-bold"
            >
              <Save className="w-4 h-4" /> Lưu
            </button>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
            Chưa có tài liệu trong thư mục này.
          </div>
        ) : (
          filtered.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center gap-3">
              <img src={d.thumbnail} alt="" className="w-12 h-16 rounded object-cover bg-slate-100" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-rose-600 uppercase">{folderLabel(d.folderId)}</p>
                <p className="font-bold text-slate-900 truncate">{d.title}</p>
                <p className="text-xs text-slate-400 truncate">{d.embedUrl}</p>
              </div>
              <button type="button" onClick={() => setEditing(d)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-xs font-bold">
                <Pencil className="w-3.5 h-3.5" /> Sửa
              </button>
              <button type="button" onClick={() => onDelete(d.id)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold">
                <Trash2 className="w-3.5 h-3.5" /> Xóa
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
