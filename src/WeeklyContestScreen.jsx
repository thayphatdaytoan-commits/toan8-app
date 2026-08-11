/* eslint-disable */
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Clock, Lock, Send, Trophy, Newspaper } from 'lucide-react';
import MathEduLogo from './components/MathEduLogo';
import CommunityMathComposer from './community/CommunityMathComposer';
import CommunityRichText from './community/CommunityRichText';
import {
  formatContestDate,
} from './community/weeklyContestData';
import {
  seedWeeklyContestsIfEmpty,
  startOfWeekMs,
  submitContestWorkFs,
  subscribeContestSubmissions,
  subscribeWeeklyContests,
} from './community/communityFirestore';
import { subscribeBlogPosts } from './content/contentStore';
import { resolveBlogThumbnail } from './content/contentTaxonomy';

function ContestListItem({ item, onOpen, onSubmitClick }) {
  return (
    <div className="flex gap-3 py-3.5 border-b border-slate-100 last:border-0 px-1">
      <button type="button" onClick={() => onOpen(item.slug)} className="shrink-0">
        <img
          src={item.thumbnail}
          alt=""
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover bg-slate-100"
        />
      </button>
      <div className="min-w-0 flex-1 flex flex-col">
        <button type="button" onClick={() => onOpen(item.slug)} className="text-left">
          <p className="font-bold text-blue-700 leading-snug text-base sm:text-lg line-clamp-2 hover:underline">
            {item.title}
          </p>
          <p className="text-slate-600 text-sm mt-1 line-clamp-1">{item.excerpt}</p>
        </button>
        <div className="mt-auto pt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-slate-400 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatContestDate(item.publishedAt)}
          </p>
          <button
            type="button"
            onClick={() => onSubmitClick(item)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-900 text-xs font-black"
          >
            <Send className="w-3.5 h-3.5" /> Gửi bài làm
          </button>
        </div>
      </div>
    </div>
  );
}

function BombGrid({ grid }) {
  if (!grid?.cols?.length || !grid?.rows?.length) return null;
  return (
    <div className="my-6 overflow-x-auto">
      <div className="inline-block min-w-[280px]">
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `48px repeat(${grid.cols.length}, minmax(64px, 1fr))` }}
        >
          <div />
          {grid.cols.map((c) => (
            <div key={c} className="text-center text-sm font-black text-orange-500 py-1">
              Cột {c}
            </div>
          ))}
          {grid.rows.map((r) => (
            <React.Fragment key={r}>
              <div className="flex items-center justify-center text-sm font-black text-orange-500">Hàng {r}</div>
              {grid.cols.map((c) => (
                <div
                  key={`${c}-${r}`}
                  className="aspect-square rounded-lg border-2 border-slate-200 bg-white flex items-center justify-center text-xs sm:text-sm font-semibold text-slate-500"
                >
                  ( {c} ; {r} )
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WeeklyContestScreen({
  slug = '',
  onGoHome,
  onOpenList,
  onOpenDetail,
  onOpenBlogPost,
  studentName = '',
  studentClass = '',
  studentGrade = '',
  onRequestLogin,
}) {
  const [contests, setContests] = useState([]);
  const [subs, setSubs] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);
  const [submitFor, setSubmitFor] = useState(null);
  const [workText, setWorkText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const u1 = subscribeWeeklyContests(async (list) => {
      if (!list.length) {
        try {
          await seedWeeklyContestsIfEmpty(0);
        } catch {
          /* ignore */
        }
      }
      setContests(list.filter((c) => c.status !== 'draft'));
    });
    const u2 = subscribeContestSubmissions(setSubs);
    const u3 = subscribeBlogPosts((list) => setBlogPosts(list.filter((p) => p.enabled !== false)));
    return () => {
      u1?.();
      u2?.();
      u3?.();
    };
  }, []);

  const contest = useMemo(
    () => (slug ? contests.find((c) => c.slug === slug || c.id === slug) : null),
    [slug, contests]
  );

  const weekStart = startOfWeekMs();
  const leaderboard = useMemo(() => {
    const map = new Map();
    for (const s of subs) {
      if (s.status !== 'graded' || !(s.points > 0)) continue;
      if ((s.gradedAt || s.createdAt || 0) < weekStart) continue;
      const key = String(s.studentName || '').trim();
      if (!key) continue;
      const cur = map.get(key) || { name: key, points: 0, className: s.studentClass || '' };
      cur.points += Number(s.points) || 0;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.points - a.points).slice(0, 10);
  }, [subs, weekStart]);

  const openSubmit = (item) => {
    if (!studentName) {
      onRequestLogin?.();
      return;
    }
    setSubmitFor(item);
    setWorkText('');
    setError('');
    setMsg('');
  };

  const sendWork = async () => {
    if (!submitFor) return;
    if (!studentName) {
      onRequestLogin?.();
      return;
    }
    setBusy(true);
    setError('');
    try {
      await submitContestWorkFs({
        contestId: submitFor.id,
        contestTitle: submitFor.title,
        studentName,
        studentClass,
        gradeLevel: studentGrade || '',
        content: workText,
      });
      setMsg('Đã gửi bài làm! Thầy cô sẽ chấm và cộng điểm thưởng.');
      setWorkText('');
      setSubmitFor(null);
    } catch (e) {
      setError(e?.message || 'Gửi bài thất bại');
    } finally {
      setBusy(false);
    }
  };

  const sidebar = (
    <aside className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <h3 className="font-black text-blue-700 mb-2 inline-flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-500" /> Xếp hạng tuần này
        </h3>
        <p className="text-[11px] text-slate-500 mb-3">Học sinh đã trả lời đúng / được chấm điểm trong tuần</p>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Chưa có điểm tuần này.</p>
        ) : (
          <ol className="space-y-2">
            {leaderboard.map((u, i) => (
              <li key={u.name} className="flex items-center gap-2 text-sm">
                <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-800 text-xs font-black flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="flex-1 font-semibold text-slate-800 truncate">{u.name}</span>
                <span className="text-xs font-bold text-amber-600">+{u.points}đ</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <h3 className="font-black text-blue-700 mb-2 inline-flex items-center gap-1.5">
          <Newspaper className="w-4 h-4" /> Tin tức liên quan
        </h3>
        {blogPosts.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Chưa có bài viết. Thêm ở Admin → Blog.</p>
        ) : (
          <div className="space-y-3">
            {blogPosts.slice(0, 5).map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => onOpenBlogPost?.(n.slug || n.id)}
                className="w-full text-left flex gap-2 group"
              >
                <img
                  src={resolveBlogThumbnail(n)}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-blue-700 line-clamp-2 group-hover:underline">{n.title}</p>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{n.excerpt}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen w-full bg-[#f4f7fe] flex flex-col font-sans">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-2">
          <button
            type="button"
            onClick={contest ? onOpenList : onGoHome}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 hover:bg-slate-50 shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <button type="button" onClick={onGoHome}>
            <MathEduLogo className="h-9 sm:h-10" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Cộng đồng</p>
            <h1 className="text-sm font-black text-slate-900 truncate">Cuộc thi vui mỗi tuần</h1>
          </div>
          {!studentName && onRequestLogin ? (
            <button
              type="button"
              onClick={onRequestLogin}
              className="px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0"
            >
              Đăng nhập
            </button>
          ) : null}
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-5 sm:py-8">
        {msg ? <p className="mb-3 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">{msg}</p> : null}

        {contest ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
            <article className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-7 min-w-0">
              <p className="text-xs text-slate-400 mb-3">
                MathEdu &gt;{' '}
                <button type="button" onClick={onOpenList} className="text-blue-600 hover:underline">
                  Cuộc thi vui mỗi tuần
                </button>
              </p>
              <h2 className="text-2xl sm:text-3xl font-black text-blue-800 leading-tight mb-3">{contest.title}</h2>
              <div className="flex items-center gap-2 mb-5 text-sm">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">
                  {(contest.author || 'T').slice(0, 1)}
                </div>
                <span className="font-bold text-blue-600">{contest.author}</span>
                <span className="text-slate-400">· {formatContestDate(contest.publishedAt)}</span>
              </div>
              <div className="text-[15px] sm:text-base text-slate-700 leading-relaxed space-y-4">
                <CommunityRichText text={contest.bodyHtml || contest.bodyIntro} />
                <BombGrid grid={contest.grid} />
                {Array.isArray(contest.rules) && contest.rules.length > 0 ? (
                  <ol className="list-decimal pl-5 space-y-2">
                    {contest.rules.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ol>
                ) : null}
                {contest.outro ? <p className="font-semibold text-slate-800">{contest.outro}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => openSubmit(contest)}
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-900 text-sm font-black"
              >
                <Send className="w-4 h-4" /> Gửi bài làm
              </button>
            </article>
            {sidebar}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-black text-blue-800 mb-1">Cuộc thi vui mỗi tuần</h2>
              <p className="text-sm text-slate-500 mb-4">
                Thử thách Toán vui — giải đố, nhận xu và xếp hạng cùng bạn bè.
              </p>
              <div>
                {contests.map((item) => (
                  <ContestListItem key={item.id} item={item} onOpen={onOpenDetail} onSubmitClick={openSubmit} />
                ))}
              </div>
            </section>
            {sidebar}
          </div>
        )}
      </main>

      {submitFor ? (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-5">
            <h3 className="font-black text-slate-900 mb-1">Gửi bài làm</h3>
            <p className="text-sm text-slate-500 mb-3 line-clamp-2">{submitFor.title}</p>
            {!studentName ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
                <p className="font-bold inline-flex items-center gap-1 mb-2">
                  <Lock className="w-4 h-4" /> Cần đăng nhập
                </p>
                <button type="button" onClick={onRequestLogin} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold">
                  Đăng nhập
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-500 mb-2">
                  Học sinh: <strong>{studentName}</strong>
                </p>
                <CommunityMathComposer value={workText} onChange={setWorkText} rows={5} placeholder="Viết lời giải / đáp án của em…" />
                {error ? <p className="mt-2 text-xs text-red-600 font-semibold">{error}</p> : null}
                <div className="mt-3 flex justify-end gap-2">
                  <button type="button" onClick={() => setSubmitFor(null)} className="px-3 py-2 rounded-lg bg-slate-100 text-sm font-bold">
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={sendWork}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-amber-400 text-slate-900 text-sm font-black"
                  >
                    <Send className="w-4 h-4" /> Gửi
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
