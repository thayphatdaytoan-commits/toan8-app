/* eslint-disable */
import React, { useEffect, useMemo, useState } from 'react';
import { Trophy, Plus, Trash2, Save, Pencil, Star } from 'lucide-react';
import CommunityMathComposer from '../community/CommunityMathComposer';
import CommunityRichText from '../community/CommunityRichText';
import { CONTEST_GRADE_OPTIONS } from '../community/contestPoints';
import {
  deleteWeeklyContestFs,
  formatQaTime,
  gradeContestSubmissionFs,
  saveWeeklyContestFs,
  seedWeeklyContestsIfEmpty,
  subscribeContestSubmissions,
  subscribeWeeklyContests,
} from '../community/communityFirestore';

const emptyContest = () => ({
  id: '',
  title: '',
  excerpt: '',
  thumbnail: '/contest-thumb-1.svg',
  author: 'Thầy Phát',
  publishedAt: new Date().toISOString(),
  bodyIntro: '',
  bodyHtml: '',
  rulesText: '',
  outro: '',
  status: 'published',
});

export default function AdminWeeklyContestPanel() {
  const [contests, setContests] = useState([]);
  const [subs, setSubs] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('contests'); // contests | submissions
  const [filterContest, setFilterContest] = useState('all');

  useEffect(() => {
    const u1 = subscribeWeeklyContests(async (list) => {
      if (!list.length) {
        try {
          await seedWeeklyContestsIfEmpty(0);
        } catch (e) {
          console.error(e);
        }
      }
      setContests(list);
    });
    const u2 = subscribeContestSubmissions(setSubs);
    return () => {
      u1?.();
      u2?.();
    };
  }, []);

  const filteredSubs = useMemo(() => {
    if (filterContest === 'all') return subs;
    return subs.filter((s) => s.contestId === filterContest);
  }, [subs, filterContest]);

  const startNew = () => setEditing(emptyContest());
  const startEdit = (c) =>
    setEditing({
      ...c,
      bodyHtml: c.bodyHtml || c.bodyIntro || '',
      rulesText: (c.rules || []).join('\n'),
    });

  const onSave = async () => {
    if (!editing) return;
    setBusy(true);
    setError('');
    try {
      const rules = String(editing.rulesText || '')
        .split('\n')
        .map((x) => x.trim())
        .filter(Boolean);
      await saveWeeklyContestFs({
        ...editing,
        bodyIntro: editing.bodyHtml,
        bodyHtml: editing.bodyHtml,
        rules,
      });
      setEditing(null);
    } catch (e) {
      setError(e?.message || 'Lưu thất bại');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Xóa đố vui này?')) return;
    setBusy(true);
    try {
      await deleteWeeklyContestFs(id);
    } catch (e) {
      setError(e?.message || 'Xóa thất bại');
    } finally {
      setBusy(false);
    }
  };

  const onGrade = async (sub, gradeId) => {
    setBusy(true);
    setError('');
    try {
      await gradeContestSubmissionFs(sub, gradeId);
    } catch (e) {
      setError(e?.message || 'Chấm điểm thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" /> Đố vui mỗi tuần
        </h2>
        <p className="text-sm text-slate-500">
          Thêm / sửa đề đố vui, chấm bài làm học sinh. Tin sidebar lấy từ Admin → <strong>Blog</strong>.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ['contests', 'Đề đố vui'],
          ['submissions', 'Bài làm học sinh'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 rounded-full text-sm font-bold ${
              tab === id ? 'bg-amber-500 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-600 font-semibold">{error}</p> : null}

      {tab === 'contests' && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 text-white text-sm font-bold"
          >
            <Plus className="w-4 h-4" /> Thêm đố vui
          </button>

          {editing ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <p className="font-black text-slate-800">{editing.id ? 'Sửa đố vui' : 'Thêm đố vui mới'}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-xs font-bold text-slate-500 block">
                  Tiêu đề
                  <input
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800"
                  />
                </label>
                <label className="text-xs font-bold text-slate-500 block">
                  Mô tả ngắn
                  <input
                    value={editing.excerpt}
                    onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  />
                </label>
                <label className="text-xs font-bold text-slate-500 block">
                  URL ảnh thumbnail
                  <input
                    value={editing.thumbnail}
                    onChange={(e) => setEditing({ ...editing, thumbnail: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs font-bold text-slate-500 block">
                  Tác giả
                  <input
                    value={editing.author}
                    onChange={(e) => setEditing({ ...editing, author: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1">Nội dung đề (công thức + định dạng)</p>
                <CommunityMathComposer
                  value={editing.bodyHtml}
                  onChange={(v) => setEditing({ ...editing, bodyHtml: v })}
                  rows={6}
                  placeholder="Soạn đề đố vui…"
                />
              </div>
              <label className="text-xs font-bold text-slate-500 block">
                Luật chơi (mỗi dòng một mục)
                <textarea
                  value={editing.rulesText}
                  onChange={(e) => setEditing({ ...editing, rulesText: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditing(null)} className="px-3 py-2 rounded-lg bg-slate-100 text-sm font-bold">
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={onSave}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-teal-600 text-white text-sm font-bold"
                >
                  <Save className="w-4 h-4" /> Lưu
                </button>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            {contests.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
                Chưa có đố vui.
              </div>
            ) : (
              contests.map((c) => (
                <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center gap-3">
                  <img src={c.thumbnail} alt="" className="w-14 h-14 rounded-lg object-cover bg-slate-100" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 truncate">{c.title}</p>
                    <p className="text-xs text-slate-500 truncate">{c.excerpt}</p>
                  </div>
                  <button type="button" onClick={() => startEdit(c)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-xs font-bold">
                    <Pencil className="w-3.5 h-3.5" /> Sửa
                  </button>
                  <button type="button" onClick={() => onDelete(c.id)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold">
                    <Trash2 className="w-3.5 h-3.5" /> Xóa
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'submissions' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-bold text-slate-500">Lọc đề:</span>
            <select
              value={filterContest}
              onChange={(e) => setFilterContest(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            >
              <option value="all">Tất cả</option>
              {contests.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          {filteredSubs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
              Chưa có bài làm.
            </div>
          ) : (
            filteredSubs.map((s) => (
              <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900">
                      {s.studentName}
                      {s.studentClass ? ` · ${s.studentClass}` : ''}
                    </p>
                    <p className="text-xs text-slate-500">
                      {s.contestTitle} · {formatQaTime(s.createdAt)}
                    </p>
                  </div>
                  {s.status === 'graded' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                      <Star className="w-3.5 h-3.5" /> {s.gradeLabel} (+{s.points})
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">Chờ chấm</span>
                  )}
                </div>
                <CommunityRichText text={s.content} className="text-sm text-slate-800" />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {CONTEST_GRADE_OPTIONS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      disabled={busy}
                      onClick={() => onGrade(s, g.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border ${
                        s.gradeId === g.id
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      {g.label} (+{g.points})
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
