/* eslint-disable */
import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  ExternalLink,
  GripVertical,
  Upload,
} from 'lucide-react';
import { COLLECTION_SITE_HOMEPAGE, HOMEPAGE_DOC_ID, ensureAnonymousAuth } from '../firebaseClient';
import { compressImageFileToJpegBlob } from '../adminImageUpload';
import {
  BLOCK_TYPE_LABELS,
  COLOR_PRESETS,
  cloneDefaultHomepageContent,
  normalizeHomepageContent,
  sanitizeHomepagePayloadForFirestore,
  newFeaturedCourseItem,
  newTutorPackageItem,
  newTrialBenefitItem,
  newPromoSlideItem,
} from '../homepage/defaultHomepageContent';

function Field({ label, children, className = '' }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function TextInput({ value, onChange, type = 'text', ...rest }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-teal-400"
      {...rest}
    />
  );
}

function TextArea({ value, onChange, rows = 3 }) {
  return (
    <textarea
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-teal-400 resize-y"
    />
  );
}

function ColorPresetSelect({ value, onChange }) {
  return (
    <select
      value={value || 'blue'}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
    >
      {Object.entries(COLOR_PRESETS).map(([key, p]) => (
        <option key={key} value={key}>
          {p.label}
        </option>
      ))}
    </select>
  );
}

function HexColor({ label, value, onChange }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9A-Fa-f]{6}$/.test(value || '') ? value : '#2563eb'}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 rounded border border-slate-200 cursor-pointer"
        />
        <TextInput value={value} onChange={onChange} placeholder="#2563eb" />
      </div>
    </Field>
  );
}

function formatHomepageSaveError(e) {
  const code = String(e?.code || '');
  const msg = String(e?.message || e || '');
  if (code === 'permission-denied') {
    return 'Không có quyền ghi Firestore. Mở lại trang admin hoặc chạy: firebase deploy --only firestore';
  }
  if (code === 'unauthenticated') {
    return 'Phiên Firebase chưa đăng nhập. Tải lại trang admin rồi thử Lưu lại.';
  }
  if (code === 'invalid-argument' || msg.toLowerCase().includes('undefined')) {
    return 'Dữ liệu không hợp lệ để lưu. Đã tự chuẩn hoá — bấm Lưu lại; nếu vẫn lỗi, kiểm tra URL ảnh không dán base64 quá dài.';
  }
  if (msg.toLowerCase().includes('longer than') || msg.toLowerCase().includes('maximum allowed size')) {
    return 'Nội dung trang chủ vượt giới hạn Firestore (~1MB). Rút gọn mô tả hoặc chỉ dùng URL ảnh từ nút Tải ảnh.';
  }
  return `Lưu thất bại (${code || 'lỗi'}): ${msg}`;
}

export default function HomepageCmsAdminPanel({ db, storage, user }) {
  const [draft, setDraft] = useState(() => cloneDefaultHomepageContent());
  const [openId, setOpenId] = useState('hero');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!db) return undefined;
    const ref = doc(db, COLLECTION_SITE_HOMEPAGE, HOMEPAGE_DOC_ID);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setDraft(normalizeHomepageContent(snap.data()));
        } else {
          setDraft(cloneDefaultHomepageContent());
        }
        setLoading(false);
      },
      (e) => {
        console.error(e);
        setErr('Không tải được nội dung trang chủ.');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [db]);

  const updateBlock = (blockId, patch) => {
    setDraft((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
    }));
  };

  const updateFields = (blockId, fieldsPatch) => {
    setDraft((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId ? { ...b, fields: { ...b.fields, ...fieldsPatch } } : b
      ),
    }));
  };

  const updateColors = (blockId, colorsPatch) => {
    setDraft((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId ? { ...b, colors: { ...b.colors, ...colorsPatch } } : b
      ),
    }));
  };

  const moveBlock = (index, dir) => {
    setDraft((prev) => {
      const blocks = [...prev.blocks];
      const j = index + dir;
      if (j < 0 || j >= blocks.length) return prev;
      [blocks[index], blocks[j]] = [blocks[j], blocks[index]];
      return { ...prev, blocks };
    });
  };

  const uploadBlockItemImage = async (blockId, itemId, file, { maxEdge = 1920, quality = 0.85, filePrefix = 'homepage' } = {}) => {
    if (!storage || !file) return;
    setUploadingId(itemId);
    setErr('');
    try {
      try {
        await ensureAnonymousAuth();
      } catch (authErr) {
        console.warn(authErr);
      }
      const blob = await compressImageFileToJpegBlob(file, { maxEdge, quality });
      const path = `site-content/${filePrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
      const r = storageRef(storage, path);
      await uploadBytes(r, blob, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(r);
      setDraft((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.id !== blockId) return b;
          return {
            ...b,
            items: (b.items || []).map((x) => (x.id === itemId ? { ...x, imageUrl: url } : x)),
          };
        }),
      }));
      setMsg('Đã tải ảnh lên. Nhớ bấm Lưu để áp dụng trang chủ.');
    } catch (e) {
      console.error(e);
      setErr(formatHomepageSaveError(e).replace('Lưu thất bại', 'Upload ảnh thất bại'));
    } finally {
      setUploadingId('');
    }
  };

  const uploadPromoImage = (blockId, itemId, file) =>
    uploadBlockItemImage(blockId, itemId, file, { maxEdge: 1920, quality: 0.85, filePrefix: 'homepage_promo' });

  const uploadFeaturedCourseHero = (blockId, itemId, file) =>
    uploadBlockItemImage(blockId, itemId, file, { maxEdge: 960, quality: 0.88, filePrefix: 'homepage_featured' });

  const handleSave = async () => {
    if (!db) return;
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      try {
        await ensureAnonymousAuth();
      } catch (authErr) {
        throw new Error('unauthenticated: Không đăng nhập được Firebase. Tải lại trang admin.');
      }
      const payload = sanitizeHomepagePayloadForFirestore({
        ...draft,
        version: 1,
        updated_at: Date.now(),
      });
      const bytes = new TextEncoder().encode(JSON.stringify(payload)).length;
      if (bytes > 950_000) {
        throw new Error(`maximum allowed size: ${bytes} bytes`);
      }
      await setDoc(doc(db, COLLECTION_SITE_HOMEPAGE, HOMEPAGE_DOC_ID), payload, { merge: false });
      setMsg('Đã lưu trang chủ. Mở tab mới để xem kết quả.');
    } catch (e) {
      console.error(e);
      setErr(formatHomepageSaveError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Khôi phục toàn bộ nội dung mặc định và ghi đè lên Firestore?')) return;
    const fresh = cloneDefaultHomepageContent();
    fresh.updated_at = Date.now();
    setDraft(fresh);
    setSaving(true);
    setErr('');
    try {
      try {
        await ensureAnonymousAuth();
      } catch (authErr) {
        throw new Error('unauthenticated: Không đăng nhập được Firebase.');
      }
      const payload = sanitizeHomepagePayloadForFirestore(fresh);
      await setDoc(doc(db, COLLECTION_SITE_HOMEPAGE, HOMEPAGE_DOC_ID), payload, { merge: false });
      setMsg('Đã khôi phục mặc định.');
    } catch (e) {
      console.error(e);
      setErr('Khôi phục thất bại.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
        <span className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
        Đang tải CMS trang chủ…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-900">Chỉnh trang chủ</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Sửa chữ · ẩn/hiện · sắp xếp khối · thêm/xóa card · đổi màu. Bấm Lưu để áp dụng lên site.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <ExternalLink className="w-4 h-4" /> Xem trang chủ
          </a>
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" /> Mặc định
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-bold hover:bg-teal-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Đang lưu…' : 'Lưu'}
          </button>
        </div>
      </div>

      {msg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold px-4 py-3">
          {msg}
        </div>
      )}
      {err && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold px-4 py-3">
          {err}
        </div>
      )}

      <div className="space-y-3">
        {draft.blocks.map((block, index) => {
          const open = openId === block.id;
          return (
            <div
              key={block.id}
              className={`bg-white border rounded-2xl shadow-sm overflow-hidden ${
                block.enabled ? 'border-slate-200' : 'border-slate-200 opacity-70'
              }`}
            >
              <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border-b border-slate-100">
                <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : block.id)}
                  className="flex-1 text-left font-black text-slate-800 text-sm"
                >
                  {BLOCK_TYPE_LABELS[block.type] || block.type}
                </button>
                <button
                  type="button"
                  onClick={() => moveBlock(index, -1)}
                  className="p-1.5 rounded-lg hover:bg-white text-slate-500"
                  title="Lên"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveBlock(index, 1)}
                  className="p-1.5 rounded-lg hover:bg-white text-slate-500"
                  title="Xuống"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => updateBlock(block.id, { enabled: !block.enabled })}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold ${
                    block.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {block.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {block.enabled ? 'Hiện' : 'Ẩn'}
                </button>
              </div>

              {open && (
                <div className="p-4 space-y-4">
                  {block.type === 'hero' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Field label="Eyebrow"><TextInput value={block.fields.eyebrow} onChange={(v) => updateFields(block.id, { eyebrow: v })} /></Field>
                        <Field label="Thương hiệu (highlight)"><TextInput value={block.fields.headlineBrand} onChange={(v) => updateFields(block.id, { headlineBrand: v })} /></Field>
                        <Field label="Tiêu đề trước brand" className="md:col-span-2"><TextInput value={block.fields.headlineBefore} onChange={(v) => updateFields(block.id, { headlineBefore: v })} /></Field>
                        <Field label="Mô tả" className="md:col-span-2"><TextArea value={block.fields.subtitle} onChange={(v) => updateFields(block.id, { subtitle: v })} rows={3} /></Field>
                        <Field label="Nút chính"><TextInput value={block.fields.ctaPrimary} onChange={(v) => updateFields(block.id, { ctaPrimary: v })} /></Field>
                        <Field label="Nút phụ"><TextInput value={block.fields.ctaSecondary} onChange={(v) => updateFields(block.id, { ctaSecondary: v })} /></Field>
                        <Field label="Số liệu 1"><TextInput value={block.fields.stat1Value} onChange={(v) => updateFields(block.id, { stat1Value: v })} /></Field>
                        <Field label="Nhãn số liệu 1"><TextInput value={block.fields.stat1Label} onChange={(v) => updateFields(block.id, { stat1Label: v })} /></Field>
                        <Field label="Số liệu 2"><TextInput value={block.fields.stat2Value} onChange={(v) => updateFields(block.id, { stat2Value: v })} /></Field>
                        <Field label="Nhãn số liệu 2"><TextInput value={block.fields.stat2Label} onChange={(v) => updateFields(block.id, { stat2Label: v })} /></Field>
                        <Field label="Badge panel"><TextInput value={block.fields.panelBadge} onChange={(v) => updateFields(block.id, { panelBadge: v })} /></Field>
                        <Field label="Tiêu đề panel"><TextInput value={block.fields.panelTitle} onChange={(v) => updateFields(block.id, { panelTitle: v })} /></Field>
                        <Field label="Mô tả panel" className="md:col-span-2"><TextArea value={block.fields.panelDesc} onChange={(v) => updateFields(block.id, { panelDesc: v })} /></Field>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-slate-100 pt-3">
                        <HexColor label="Màu nút chính" value={block.colors.ctaPrimaryBg} onChange={(v) => updateColors(block.id, { ctaPrimaryBg: v })} />
                        <HexColor label="Màu nút phụ" value={block.colors.ctaSecondaryBg} onChange={(v) => updateColors(block.id, { ctaSecondaryBg: v })} />
                        <Field label="Gradient panel (Tailwind)">
                          <TextInput value={block.colors.panelGradient} onChange={(v) => updateColors(block.id, { panelGradient: v })} />
                        </Field>
                      </div>
                    </>
                  )}

                  {block.type === 'promo_slider' && (
                    <>
                      <Field label="Thời gian tự trượt (ms)">
                        <TextInput
                          type="number"
                          value={block.fields?.intervalMs ?? 5000}
                          onChange={(v) => updateFields(block.id, { intervalMs: Number(v) || 5000 })}
                        />
                      </Field>
                      <p className="text-xs text-slate-500">
                        Mỗi slide: dán URL ảnh hoặc tải ảnh lên (khuyến nghị ngang ~1200×360). Link: URL / <code>#hoc-thu</code> / để trống.
                      </p>
                      <div className="space-y-3">
                        {(block.items || []).map((item, i) => (
                          <div key={item.id} className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50/50">
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-xs font-black text-slate-500">Slide #{i + 1}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateBlock(block.id, {
                                    items: block.items.filter((x) => x.id !== item.id),
                                  })
                                }
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.alt || ''}
                                className="w-full max-h-36 object-cover rounded-lg border border-slate-200"
                              />
                            ) : null}
                            <Field label="URL ảnh">
                              <TextInput
                                value={item.imageUrl || ''}
                                onChange={(v) => {
                                  const items = block.items.map((x) =>
                                    x.id === item.id ? { ...x, imageUrl: v } : x
                                  );
                                  updateBlock(block.id, { items });
                                }}
                                placeholder="/promo-slide-1.svg hoặc https://..."
                              />
                            </Field>
                            <div className="flex flex-wrap items-center gap-2">
                              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold cursor-pointer hover:bg-teal-700">
                                <Upload className="w-3.5 h-3.5" />
                                {uploadingId === item.id ? 'Đang tải…' : 'Tải ảnh lên'}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={!!uploadingId || !storage}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    e.target.value = '';
                                    if (f) uploadPromoImage(block.id, item.id, f);
                                  }}
                                />
                              </label>
                              {!storage && (
                                <span className="text-xs text-amber-700">Thiếu Storage — dùng URL ảnh.</span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <Field label="Link khi bấm">
                                <TextInput
                                  value={item.linkUrl || ''}
                                  onChange={(v) => {
                                    const items = block.items.map((x) =>
                                      x.id === item.id ? { ...x, linkUrl: v } : x
                                    );
                                    updateBlock(block.id, { items });
                                  }}
                                  placeholder="#hoc-thu hoặc https://..."
                                />
                              </Field>
                              <Field label="Alt (mô tả ảnh)">
                                <TextInput
                                  value={item.alt || ''}
                                  onChange={(v) => {
                                    const items = block.items.map((x) =>
                                      x.id === item.id ? { ...x, alt: v } : x
                                    );
                                    updateBlock(block.id, { items });
                                  }}
                                />
                              </Field>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            updateBlock(block.id, {
                              items: [...(block.items || []), newPromoSlideItem()],
                            })
                          }
                          className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-700 hover:text-teal-900"
                        >
                          <Plus className="w-4 h-4" /> Thêm slide
                        </button>
                      </div>
                    </>
                  )}

                  {block.type === 'featured_courses' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Field label="Tiêu đề mục"><TextInput value={block.fields.title} onChange={(v) => updateFields(block.id, { title: v })} /></Field>
                        <Field label="Mô tả mục"><TextInput value={block.fields.subtitle} onChange={(v) => updateFields(block.id, { subtitle: v })} /></Field>
                      </div>
                      <div className="space-y-3">
                        {(block.items || []).map((item, i) => (
                          <div key={item.id} className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50/50">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black text-slate-500">Card #{i + 1}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateBlock(block.id, {
                                    items: block.items.filter((x) => x.id !== item.id),
                                  })
                                }
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <Field label="Banner"><TextInput value={item.banner} onChange={(v) => {
                                const items = block.items.map((x) => (x.id === item.id ? { ...x, banner: v } : x));
                                updateBlock(block.id, { items });
                              }} /></Field>
                              <Field label="Badge"><TextInput value={item.badge} onChange={(v) => {
                                const items = block.items.map((x) => (x.id === item.id ? { ...x, badge: v } : x));
                                updateBlock(block.id, { items });
                              }} /></Field>
                              <HexColor
                                label="Màu chữ banner"
                                value={item.bannerColor || '#ffffff'}
                                onChange={(v) => {
                                  const items = block.items.map((x) => (x.id === item.id ? { ...x, bannerColor: v } : x));
                                  updateBlock(block.id, { items });
                                }}
                              />
                              <Field label="Cỡ chữ banner (px)">
                                <TextInput
                                  type="number"
                                  value={item.bannerFontSize ?? 26}
                                  onChange={(v) => {
                                    const items = block.items.map((x) =>
                                      x.id === item.id ? { ...x, bannerFontSize: Number(v) || 26 } : x
                                    );
                                    updateBlock(block.id, { items });
                                  }}
                                />
                              </Field>
                              <HexColor
                                label="Màu chữ badge"
                                value={item.badgeTextColor || '#ffffff'}
                                onChange={(v) => {
                                  const items = block.items.map((x) => (x.id === item.id ? { ...x, badgeTextColor: v } : x));
                                  updateBlock(block.id, { items });
                                }}
                              />
                              <Field label="Tiêu đề"><TextInput value={item.title} onChange={(v) => {
                                const items = block.items.map((x) => (x.id === item.id ? { ...x, title: v } : x));
                                updateBlock(block.id, { items });
                              }} /></Field>
                              <Field label="Màu nền dự phòng (khi chưa có ảnh)"><ColorPresetSelect value={item.colorPreset} onChange={(v) => {
                                const items = block.items.map((x) => (x.id === item.id ? { ...x, colorPreset: v } : x));
                                updateBlock(block.id, { items });
                              }} /></Field>
                              <div className="sm:col-span-2 rounded-xl border border-dashed border-teal-200 bg-teal-50/40 p-3 space-y-2">
                                <p className="text-xs font-bold text-teal-900 uppercase tracking-wide">Ảnh đại diện hero</p>
                                <p className="text-xs text-slate-600">
                                  Khuyến nghị ảnh ngang <strong>600×360 px</strong> (tỉ lệ ~5:3). Ảnh sẽ tự co vừa khung, ưu tiên hiển thị phần giữa.
                                </p>
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.title || item.banner || 'Ảnh khóa học'}
                                    className="w-full max-h-40 object-cover object-center rounded-lg border border-slate-200 bg-white"
                                  />
                                ) : (
                                  <div className="w-full h-28 rounded-lg border border-slate-200 bg-white/80 flex items-center justify-center text-xs text-slate-400">
                                    Chưa có ảnh — dùng gradient + icon mặc định
                                  </div>
                                )}
                                <Field label="URL ảnh hero">
                                  <TextInput
                                    value={item.imageUrl || ''}
                                    onChange={(v) => {
                                      const items = block.items.map((x) =>
                                        x.id === item.id ? { ...x, imageUrl: v } : x
                                      );
                                      updateBlock(block.id, { items });
                                    }}
                                    placeholder="https://... hoặc /featured-course-g9.jpg"
                                  />
                                </Field>
                                <div className="flex flex-wrap items-center gap-2">
                                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold cursor-pointer hover:bg-teal-700">
                                    <Upload className="w-3.5 h-3.5" />
                                    {uploadingId === item.id ? 'Đang tải…' : 'Tải ảnh đại diện'}
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      disabled={!!uploadingId || !storage}
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        e.target.value = '';
                                        if (f) uploadFeaturedCourseHero(block.id, item.id, f);
                                      }}
                                    />
                                  </label>
                                  {item.imageUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const items = block.items.map((x) =>
                                          x.id === item.id ? { ...x, imageUrl: '' } : x
                                        );
                                        updateBlock(block.id, { items });
                                      }}
                                      className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-white"
                                    >
                                      Xóa ảnh
                                    </button>
                                  ) : null}
                                  {!storage && (
                                    <span className="text-xs text-amber-700">Thiếu Storage — dùng URL ảnh.</span>
                                  )}
                                </div>
                              </div>
                              <Field label="Mô tả" className="sm:col-span-2"><TextArea value={item.description} onChange={(v) => {
                                const items = block.items.map((x) => (x.id === item.id ? { ...x, description: v } : x));
                                updateBlock(block.id, { items });
                              }} rows={2} /></Field>
                              <Field label="Hành động">
                                <select
                                  value={item.action || 'grade:9'}
                                  onChange={(e) => {
                                    const items = block.items.map((x) => (x.id === item.id ? { ...x, action: e.target.value } : x));
                                    updateBlock(block.id, { items });
                                  }}
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                >
                                  <option value="grade:9">Mở khối 9</option>
                                  <option value="grade:10">Mở khối 10</option>
                                  <option value="grade:11">Mở khối 11</option>
                                  <option value="grade:12">Mở khối 12</option>
                                  <option value="exam">Phòng thi</option>
                                </select>
                              </Field>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => updateBlock(block.id, { items: [...(block.items || []), newFeaturedCourseItem()] })}
                          className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-700 hover:text-teal-900"
                        >
                          <Plus className="w-4 h-4" /> Thêm card khóa học
                        </button>
                      </div>
                    </>
                  )}

                  {block.type === 'grade_grid' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Field label="Tiêu đề THCS"><TextInput value={block.fields.thcsTitle} onChange={(v) => updateFields(block.id, { thcsTitle: v })} /></Field>
                        <Field label="Tiêu đề THPT"><TextInput value={block.fields.thptTitle} onChange={(v) => updateFields(block.id, { thptTitle: v })} /></Field>
                      </div>
                      <p className="text-xs font-bold text-slate-500 uppercase">Thẻ THCS — màu nền / chữ banner / ẩn</p>
                      <div className="space-y-2">
                        {(block.thcsItems || []).map((item) => (
                          <div key={item.id} className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50/40">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-black text-slate-800 w-10">T{item.grade}</span>
                              <div className="flex-1 min-w-[8rem]">
                                <ColorPresetSelect
                                  value={item.colorPreset}
                                  onChange={(v) => {
                                    const thcsItems = block.thcsItems.map((x) => (x.id === item.id ? { ...x, colorPreset: v } : x));
                                    updateBlock(block.id, { thcsItems });
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const thcsItems = block.thcsItems.map((x) =>
                                    x.id === item.id ? { ...x, enabled: !(x.enabled !== false) } : x
                                  );
                                  updateBlock(block.id, { thcsItems });
                                }}
                                className={`shrink-0 px-2 py-1 rounded-lg text-xs font-bold ${
                                  item.enabled !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {item.enabled !== false ? 'Hiện' : 'Ẩn'}
                              </button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <HexColor
                                label="Màu chữ TOÁN"
                                value={item.labelColor || '#ffffff'}
                                onChange={(v) => {
                                  const thcsItems = block.thcsItems.map((x) => (x.id === item.id ? { ...x, labelColor: v } : x));
                                  updateBlock(block.id, { thcsItems });
                                }}
                              />
                              <Field label="Cỡ TOÁN (px)">
                                <TextInput
                                  type="number"
                                  value={item.labelFontSize ?? 14}
                                  onChange={(v) => {
                                    const thcsItems = block.thcsItems.map((x) =>
                                      x.id === item.id ? { ...x, labelFontSize: Number(v) || 14 } : x
                                    );
                                    updateBlock(block.id, { thcsItems });
                                  }}
                                />
                              </Field>
                              <HexColor
                                label="Màu số lớp"
                                value={item.numberColor || '#fde047'}
                                onChange={(v) => {
                                  const thcsItems = block.thcsItems.map((x) => (x.id === item.id ? { ...x, numberColor: v } : x));
                                  updateBlock(block.id, { thcsItems });
                                }}
                              />
                              <Field label="Cỡ số (px)">
                                <TextInput
                                  type="number"
                                  value={item.numberFontSize ?? 64}
                                  onChange={(v) => {
                                    const thcsItems = block.thcsItems.map((x) =>
                                      x.id === item.id ? { ...x, numberFontSize: Number(v) || 64 } : x
                                    );
                                    updateBlock(block.id, { thcsItems });
                                  }}
                                />
                              </Field>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs font-bold text-slate-500 uppercase pt-2">Thẻ THPT — màu nền / chữ banner / ẩn</p>
                      <div className="space-y-2">
                        {(block.thptItems || []).map((item) => (
                          <div key={item.id} className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50/40">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-black text-slate-800 w-10">T{item.grade}</span>
                              <div className="flex-1 min-w-[8rem]">
                                <ColorPresetSelect
                                  value={item.colorPreset}
                                  onChange={(v) => {
                                    const thptItems = block.thptItems.map((x) => (x.id === item.id ? { ...x, colorPreset: v } : x));
                                    updateBlock(block.id, { thptItems });
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const thptItems = block.thptItems.map((x) =>
                                    x.id === item.id ? { ...x, enabled: !(x.enabled !== false) } : x
                                  );
                                  updateBlock(block.id, { thptItems });
                                }}
                                className={`shrink-0 px-2 py-1 rounded-lg text-xs font-bold ${
                                  item.enabled !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {item.enabled !== false ? 'Hiện' : 'Ẩn'}
                              </button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <HexColor
                                label="Màu chữ TOÁN"
                                value={item.labelColor || '#ffffff'}
                                onChange={(v) => {
                                  const thptItems = block.thptItems.map((x) => (x.id === item.id ? { ...x, labelColor: v } : x));
                                  updateBlock(block.id, { thptItems });
                                }}
                              />
                              <Field label="Cỡ TOÁN (px)">
                                <TextInput
                                  type="number"
                                  value={item.labelFontSize ?? 14}
                                  onChange={(v) => {
                                    const thptItems = block.thptItems.map((x) =>
                                      x.id === item.id ? { ...x, labelFontSize: Number(v) || 14 } : x
                                    );
                                    updateBlock(block.id, { thptItems });
                                  }}
                                />
                              </Field>
                              <HexColor
                                label="Màu số lớp"
                                value={item.numberColor || '#fde047'}
                                onChange={(v) => {
                                  const thptItems = block.thptItems.map((x) => (x.id === item.id ? { ...x, numberColor: v } : x));
                                  updateBlock(block.id, { thptItems });
                                }}
                              />
                              <Field label="Cỡ số (px)">
                                <TextInput
                                  type="number"
                                  value={item.numberFontSize ?? 64}
                                  onChange={(v) => {
                                    const thptItems = block.thptItems.map((x) =>
                                      x.id === item.id ? { ...x, numberFontSize: Number(v) || 64 } : x
                                    );
                                    updateBlock(block.id, { thptItems });
                                  }}
                                />
                              </Field>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs font-bold text-slate-500 uppercase pt-2">Nhãn menu trên mỗi thẻ</p>
                      {(block.menuItems || []).map((m) => (
                        <div key={m.id} className="grid grid-cols-1 sm:grid-cols-3 gap-2 border border-slate-100 rounded-lg p-2">
                          <Field label="Nhãn"><TextInput value={m.label} onChange={(v) => {
                            const menuItems = block.menuItems.map((x) => (x.id === m.id ? { ...x, label: v } : x));
                            updateBlock(block.id, { menuItems });
                          }} /></Field>
                          <Field label="Badge"><TextInput value={m.badge} onChange={(v) => {
                            const menuItems = block.menuItems.map((x) => (x.id === m.id ? { ...x, badge: v } : x));
                            updateBlock(block.id, { menuItems });
                          }} /></Field>
                          <Field label="Short (mobile)"><TextInput value={m.shortLabel} onChange={(v) => {
                            const menuItems = block.menuItems.map((x) => (x.id === m.id ? { ...x, shortLabel: v } : x));
                            updateBlock(block.id, { menuItems });
                          }} /></Field>
                        </div>
                      ))}
                    </>
                  )}

                  {block.type === 'tutor_packages' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Field label="Tiêu đề mục"><TextInput value={block.fields.title} onChange={(v) => updateFields(block.id, { title: v })} /></Field>
                        <Field label="Nút CTA"><TextInput value={block.fields.ctaLabel} onChange={(v) => updateFields(block.id, { ctaLabel: v })} /></Field>
                        <HexColor label="Màu header card" value={block.colors.headerBg} onChange={(v) => updateColors(block.id, { headerBg: v })} />
                        <HexColor label="Màu nút CTA" value={block.colors.ctaBg} onChange={(v) => updateColors(block.id, { ctaBg: v })} />
                      </div>
                      {(block.items || []).map((pkg, i) => (
                        <div key={pkg.id} className="rounded-xl border border-slate-200 p-3 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-xs font-black text-slate-500">Gói #{i + 1}</span>
                            <button
                              type="button"
                              onClick={() => updateBlock(block.id, { items: block.items.filter((x) => x.id !== pkg.id) })}
                              className="text-red-500 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <Field label="Tiêu đề gói">
                            <TextInput
                              value={pkg.title}
                              onChange={(v) => {
                                const items = block.items.map((x) => (x.id === pkg.id ? { ...x, title: v } : x));
                                updateBlock(block.id, { items });
                              }}
                            />
                          </Field>
                          <Field label="Nội dung (mỗi dòng: target| / star| / dot| + chữ)">
                            <TextArea
                              rows={6}
                              value={(pkg.lines || []).map((l) => `${l.type}|${l.text}`).join('\n')}
                              onChange={(v) => {
                                const lines = v.split('\n').filter(Boolean).map((line) => {
                                  const m = line.match(/^(target|star|dot)\|(.*)$/i);
                                  if (m) return { type: m[1].toLowerCase(), text: m[2] };
                                  return { type: 'dot', text: line };
                                });
                                const items = block.items.map((x) => (x.id === pkg.id ? { ...x, lines } : x));
                                updateBlock(block.id, { items });
                              }}
                            />
                          </Field>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => updateBlock(block.id, { items: [...(block.items || []), newTutorPackageItem()] })}
                        className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-700"
                      >
                        <Plus className="w-4 h-4" /> Thêm gói gia sư
                      </button>
                    </>
                  )}

                  {block.type === 'hotline' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="Nhãn"><TextInput value={block.fields.label} onChange={(v) => updateFields(block.id, { label: v })} /></Field>
                      <Field label="SĐT hiển thị"><TextInput value={block.fields.phoneDisplay} onChange={(v) => updateFields(block.id, { phoneDisplay: v })} /></Field>
                      <Field label="SĐT tel:"><TextInput value={block.fields.phoneTel} onChange={(v) => updateFields(block.id, { phoneTel: v })} /></Field>
                      <Field label="Nút tư vấn"><TextInput value={block.fields.consultLabel} onChange={(v) => updateFields(block.id, { consultLabel: v })} /></Field>
                      <Field label="Nút Zalo"><TextInput value={block.fields.zaloLabel} onChange={(v) => updateFields(block.id, { zaloLabel: v })} /></Field>
                      <Field label="Link Zalo"><TextInput value={block.fields.zaloUrl} onChange={(v) => updateFields(block.id, { zaloUrl: v })} /></Field>
                      <HexColor label="Màu nền bar" value={block.colors.barBg} onChange={(v) => updateColors(block.id, { barBg: v })} />
                      <HexColor label="Màu nút Zalo" value={block.colors.zaloBg} onChange={(v) => updateColors(block.id, { zaloBg: v })} />
                    </div>
                  )}

                  {block.type === 'trial_program' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Field label="Tiêu đề mục"><TextInput value={block.fields.title} onChange={(v) => updateFields(block.id, { title: v })} /></Field>
                        <Field label="Headline form (trước)"><TextInput value={block.fields.formHeadline} onChange={(v) => updateFields(block.id, { formHeadline: v })} /></Field>
                        <Field label="Highlight"><TextInput value={block.fields.formHighlight} onChange={(v) => updateFields(block.id, { formHighlight: v })} /></Field>
                        <Field label="Headline (sau)"><TextInput value={block.fields.formHeadlineAfter} onChange={(v) => updateFields(block.id, { formHeadlineAfter: v })} /></Field>
                        <HexColor label="Màu form" value={block.colors.formBg} onChange={(v) => updateColors(block.id, { formBg: v })} />
                        <Field label="Options khóa (mỗi dòng 1)" className="md:col-span-2">
                          <TextArea
                            rows={4}
                            value={(block.fields.courseOptions || []).join('\n')}
                            onChange={(v) =>
                              updateFields(block.id, {
                                courseOptions: v.split('\n').map((s) => s.trim()).filter(Boolean),
                              })
                            }
                          />
                        </Field>
                      </div>
                      {(block.items || []).map((item, i) => (
                        <div key={item.id} className="rounded-xl border border-slate-200 p-3 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-xs font-black text-slate-500">Benefit #{i + 1}</span>
                            <button
                              type="button"
                              onClick={() => updateBlock(block.id, { items: block.items.filter((x) => x.id !== item.id) })}
                              className="text-red-500 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Field label="Tiêu đề"><TextInput value={item.title} onChange={(v) => {
                              const items = block.items.map((x) => (x.id === item.id ? { ...x, title: v } : x));
                              updateBlock(block.id, { items });
                            }} /></Field>
                            <Field label="Mô tả"><TextInput value={item.desc} onChange={(v) => {
                              const items = block.items.map((x) => (x.id === item.id ? { ...x, desc: v } : x));
                              updateBlock(block.id, { items });
                            }} /></Field>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => updateBlock(block.id, { items: [...(block.items || []), newTrialBenefitItem()] })}
                        className="inline-flex items-center gap-1.5 text-sm font-bold text-teal-700"
                      >
                        <Plus className="w-4 h-4" /> Thêm lợi ích
                      </button>
                    </>
                  )}

                  {block.type === 'blog_docs' && (
                    <p className="text-xs text-slate-500">
                      Khối Blog + Tài liệu mới nhất (cuối trang). Nội dung lấy từ Admin → <strong>Blog</strong> và{' '}
                      <strong>Tài liệu</strong>. Bật/tắt bằng công tắc khối.
                    </p>
                  )}

                  {block.type === 'competition_banner' && (
                    <>
                      <p className="text-xs text-slate-500">
                        Banner kỳ thi quốc gia / quốc tế (logo). Có thể đổi tiêu đề hoặc ảnh.
                      </p>
                      <Field label="Tiêu đề banner">
                        <TextInput
                          value={block.fields?.bannerTitle || ''}
                          onChange={(v) =>
                            updateBlock(block.id, {
                              fields: { ...(block.fields || {}), bannerTitle: v },
                            })
                          }
                        />
                      </Field>
                      <Field label="Ảnh logo kỳ thi (URL)">
                        <TextInput
                          value={block.fields?.imageUrl || ''}
                          onChange={(v) =>
                            updateBlock(block.id, {
                              fields: { ...(block.fields || {}), imageUrl: v },
                            })
                          }
                        />
                      </Field>
                    </>
                  )}

                  {block.type === 'community_hub' && (
                    <>
                      <p className="text-xs text-slate-500">
                        Hai thẻ cuối trang (trước footer). Link mặc định: <code>/hoi-dap</code>, <code>/cuoc-thi</code>. Có thể đổi ảnh (URL).
                      </p>
                      <div className="space-y-3">
                        {(block.items || []).map((item, i) => (
                          <div key={item.id} className="rounded-xl border border-slate-200 p-3 space-y-2 bg-slate-50/50">
                            <span className="text-xs font-black text-slate-500">Thẻ #{i + 1}</span>
                            <Field label="Tiêu đề">
                              <TextInput
                                value={item.title || ''}
                                onChange={(v) => {
                                  const items = block.items.map((x) =>
                                    x.id === item.id ? { ...x, title: v } : x
                                  );
                                  updateBlock(block.id, { items });
                                }}
                              />
                            </Field>
                            <Field label="Mô tả">
                              <TextArea
                                value={item.description || ''}
                                onChange={(v) => {
                                  const items = block.items.map((x) =>
                                    x.id === item.id ? { ...x, description: v } : x
                                  );
                                  updateBlock(block.id, { items });
                                }}
                              />
                            </Field>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <Field label="Nút CTA">
                                <TextInput
                                  value={item.ctaLabel || ''}
                                  onChange={(v) => {
                                    const items = block.items.map((x) =>
                                      x.id === item.id ? { ...x, ctaLabel: v } : x
                                    );
                                    updateBlock(block.id, { items });
                                  }}
                                />
                              </Field>
                              <Field label="Link (/hoi-dap, /cuoc-thi)">
                                <TextInput
                                  value={item.linkUrl || ''}
                                  onChange={(v) => {
                                    const items = block.items.map((x) =>
                                      x.id === item.id ? { ...x, linkUrl: v } : x
                                    );
                                    updateBlock(block.id, { items });
                                  }}
                                />
                              </Field>
                            </div>
                            <Field label="URL ảnh">
                              <TextInput
                                value={item.imageUrl || ''}
                                onChange={(v) => {
                                  const items = block.items.map((x) =>
                                    x.id === item.id ? { ...x, imageUrl: v } : x
                                  );
                                  updateBlock(block.id, { items });
                                }}
                              />
                            </Field>
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt=""
                                className="w-full max-h-28 object-cover rounded-lg border border-slate-200"
                              />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {block.type === 'sidebar_guide' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <p className="md:col-span-2 text-xs text-slate-500">
                        Khối này hiện ở thanh sidebar trang chủ (dưới bảng xếp hạng tuần): video hướng dẫn + nút Facebook / YouTube.
                      </p>
                      <Field label="Tiêu đề mục" className="md:col-span-2">
                        <TextInput
                          value={block.fields.sectionTitle}
                          onChange={(v) => updateFields(block.id, { sectionTitle: v })}
                          placeholder="Video hướng dẫn học trực tuyến"
                        />
                      </Field>
                      <Field label="Tiêu đề video" className="md:col-span-2">
                        <TextInput
                          value={block.fields.videoTitle}
                          onChange={(v) => updateFields(block.id, { videoTitle: v })}
                          placeholder="Hướng dẫn sử dụng MathEdu"
                        />
                      </Field>
                      <Field label="Link video (YouTube / Drive / …)" className="md:col-span-2">
                        <TextInput
                          value={block.fields.videoUrl}
                          onChange={(v) => updateFields(block.id, { videoUrl: v })}
                          placeholder="https://www.youtube.com/watch?v=..."
                        />
                      </Field>
                      <Field label="Facebook URL">
                        <TextInput
                          value={block.fields.facebookUrl}
                          onChange={(v) => updateFields(block.id, { facebookUrl: v })}
                          placeholder="https://www.facebook.com/..."
                        />
                      </Field>
                      <Field label="YouTube URL (kênh / playlist)">
                        <TextInput
                          value={block.fields.youtubeUrl}
                          onChange={(v) => updateFields(block.id, { youtubeUrl: v })}
                          placeholder="https://www.youtube.com/..."
                        />
                      </Field>
                      <Field label="Dòng bản quyền (dưới nút)" className="md:col-span-2">
                        <TextInput
                          value={block.fields.copyrightNote}
                          onChange={(v) => updateFields(block.id, { copyrightNote: v })}
                        />
                      </Field>
                    </div>
                  )}

                  {block.type === 'footer' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="Tagline"><TextInput value={block.fields.tagline} onChange={(v) => updateFields(block.id, { tagline: v })} /></Field>
                      <Field label="Email"><TextInput value={block.fields.email} onChange={(v) => updateFields(block.id, { email: v })} /></Field>
                      <Field label="Mô tả" className="md:col-span-2"><TextArea value={block.fields.description} onChange={(v) => updateFields(block.id, { description: v })} /></Field>
                      <Field label="SĐT hiển thị"><TextInput value={block.fields.phoneDisplay} onChange={(v) => updateFields(block.id, { phoneDisplay: v })} /></Field>
                      <Field label="SĐT tel"><TextInput value={block.fields.phoneTel} onChange={(v) => updateFields(block.id, { phoneTel: v })} /></Field>
                      <Field label="Zalo URL"><TextInput value={block.fields.zaloUrl} onChange={(v) => updateFields(block.id, { zaloUrl: v })} /></Field>
                      <Field label="Facebook URL"><TextInput value={block.fields.facebookUrl} onChange={(v) => updateFields(block.id, { facebookUrl: v })} /></Field>
                      <Field label="YouTube URL"><TextInput value={block.fields.youtubeUrl} onChange={(v) => updateFields(block.id, { youtubeUrl: v })} /></Field>
                      <Field label="Copyright" className="md:col-span-2"><TextInput value={block.fields.copyright} onChange={(v) => updateFields(block.id, { copyright: v })} /></Field>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
