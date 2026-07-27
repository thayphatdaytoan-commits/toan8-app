/* eslint-disable */
import React, { useEffect, useMemo, useState } from 'react';
import { Crown, Medal } from 'lucide-react';
import { expPointsFromScoreRow, normStudentName } from '../classroomConstants';
import { DEFAULT_LEVEL_THRESHOLDS, levelFromExp, startOfWeekMs } from '../studentLevelConfig';
import { displayLoginName, subscribeLevelConfig, totalExpForStudent } from '../studentLevelStore';

/**
 * mode="weekly" — Thành viên tiêu biểu tuần qua (trang chủ ngoài, mọi khối).
 * mode="grade" — Bảng xếp hạng EXP của khối đang xem.
 */
export default function HomeSidebarLeaderboard({
  scoresList = [],
  studentsList = [],
  grade = '',
  studentName = '',
  mode = 'weekly',
}) {
  const weeklyOnly = mode === 'weekly';
  const [thresholds, setThresholds] = useState(DEFAULT_LEVEL_THRESHOLDS);

  useEffect(() => {
    const unsub = subscribeLevelConfig(
      (cfg) => setThresholds(cfg.thresholds || DEFAULT_LEVEL_THRESHOLDS),
      () => setThresholds(DEFAULT_LEVEL_THRESHOLDS)
    );
    return () => {
      try {
        unsub?.();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const studentByName = useMemo(() => {
    const map = new Map();
    for (const s of studentsList || []) {
      const k = normStudentName(s?.name);
      if (k) map.set(k, s);
    }
    return map;
  }, [studentsList]);

  const { topFive, myRank } = useMemo(() => {
    const g = String(grade || '').trim();
    const weekStart = weeklyOnly ? startOfWeekMs() : 0;
    const byName = new Map();

    for (const s of scoresList || []) {
      if (weeklyOnly && (Number(s?.timestamp) || 0) < weekStart) continue;
      const sg = String(s?.grade_level ?? '').trim();
      // weekly = toàn hệ thống; grade = chỉ khối đang chọn
      if (!weeklyOnly && g && g !== 'ALL' && sg && sg !== g) continue;
      if (weeklyOnly === false && g && g !== 'ALL' && !sg) {
        /* vẫn tính nếu thiếu grade_level khi không lọc được */
      }
      const name = String(s?.name || '').trim();
      if (!name) continue;
      const exp = expPointsFromScoreRow(s);
      if (!byName.has(name)) byName.set(name, { name, points: 0, attempts: 0 });
      const row = byName.get(name);
      row.points += exp;
      row.attempts += 1;
    }

    const sorted = Array.from(byName.values())
      .filter((r) => r.points > 0 || !weeklyOnly)
      .sort((a, b) => b.points - a.points)
      .map((r, i) => {
        const st = studentByName.get(normStudentName(r.name));
        const lifetime = weeklyOnly
          ? totalExpForStudent(scoresList, r.name, '')
          : r.points;
        return {
          ...r,
          rank: i + 1,
          login: displayLoginName(st, r.name),
          level: levelFromExp(lifetime, thresholds),
          totalExp: weeklyOnly ? lifetime : r.points,
        };
      });

    if (weeklyOnly) {
      const top = sorted.filter((r) => r.points > 0).slice(0, 5);
      return { topFive: top, myRank: null };
    }

    const top = sorted.slice(0, 5);
    const me = String(studentName || '').trim();
    const mine = me ? sorted.find((r) => normStudentName(r.name) === normStudentName(me)) : null;
    return { topFive: top, myRank: mine ? mine.rank : null };
  }, [scoresList, grade, weeklyOnly, studentByName, thresholds, studentName]);

  const rankIcon = (rank) => {
    if (rank === 1) {
      return (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center shadow-md shadow-orange-400/40 shrink-0">
          <Crown className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center shrink-0">
          <Medal className="w-4 h-4 text-white" />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shrink-0">
          <Medal className="w-4 h-4 text-amber-100" />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-black shrink-0">
        {rank}
      </div>
    );
  };

  if (weeklyOnly) {
    return (
      <div className="mx-3 mb-3 rounded-2xl overflow-hidden border border-violet-200/60 shadow-sm">
        <div className="relative px-3.5 pt-3.5 pb-3 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-rose-500 text-white">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/85">Tuần này</p>
          <h3 className="text-[15px] font-black mt-0.5 leading-snug flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-amber-200 shrink-0" />
            Thành viên tiêu biểu tuần qua
          </h3>
          <p className="text-[11px] text-white/90 mt-0.5">Tất cả khối · theo EXP tăng trong tuần</p>
        </div>

        <div className="bg-[#faf7f2] px-2.5 py-2.5 space-y-2">
          {Array.from({ length: 5 }).map((_, slot) => {
            const r = topFive[slot];
            if (!r) {
              return (
                <div
                  key={`empty-${slot}`}
                  className="flex items-center gap-2 rounded-xl px-2.5 py-2 border border-dashed border-slate-300/90 bg-white/60"
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 bg-slate-100 text-slate-400">
                    {slot + 1}
                  </div>
                  <div className="flex-1 text-xs text-slate-400 italic">Chờ thêm thành viên</div>
                </div>
              );
            }
            const isMe = normStudentName(r.name) === normStudentName(studentName);
            return (
              <div
                key={r.name}
                className={`flex items-center gap-2 rounded-xl px-2.5 py-2 bg-white shadow-sm border ${
                  isMe ? 'border-violet-300 ring-1 ring-violet-200' : 'border-white'
                }`}
              >
                {rankIcon(r.rank)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {r.login}
                    {isMe ? (
                      <span className="ml-1 text-[9px] font-black uppercase text-violet-600">Bạn</span>
                    ) : null}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Level {r.level} · +{r.points.toLocaleString('vi-VN')} EXP tuần
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const gradeLabel = String(grade || '').trim() || '—';

  return (
    <div className="mx-3 mb-3 rounded-2xl overflow-hidden border border-orange-200/50 shadow-sm">
      <div className="relative px-3.5 pt-3.5 pb-3 bg-gradient-to-br from-orange-400 via-orange-500 to-rose-500 text-white">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/85">Top 5 học sinh</p>
            <h3 className="text-base font-black mt-0.5 flex items-center gap-1.5 leading-tight">
              <Crown className="w-4 h-4 text-amber-100 shrink-0" />
              Bảng xếp hạng
            </h3>
            <p className="text-[11px] text-white/90 mt-0.5">Khối {gradeLabel} · theo tổng EXP</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-semibold text-white/80">Vị trí của bạn</p>
            <p className="text-xl font-black leading-none mt-0.5">{myRank ? `#${myRank}` : '—'}</p>
          </div>
        </div>
      </div>

      <div className="bg-[#faf7f2] px-2.5 py-2.5 space-y-2">
        {Array.from({ length: 5 }).map((_, slot) => {
          const r = topFive[slot];
          if (!r) {
            return (
              <div
                key={`empty-${slot}`}
                className="flex items-center gap-2 rounded-xl px-2.5 py-2 border border-dashed border-slate-300/90 bg-white/60"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 bg-slate-100 text-slate-400">
                  {slot + 1}
                </div>
                <div className="flex-1 text-xs text-slate-400 italic">Chờ thêm học sinh</div>
                <div className="text-xs text-slate-400">—</div>
              </div>
            );
          }
          const isMe = normStudentName(r.name) === normStudentName(studentName);
          return (
            <div
              key={r.name}
              className={`flex items-center gap-2 rounded-xl px-2.5 py-2 bg-white shadow-sm border ${
                isMe ? 'border-orange-300 ring-1 ring-orange-200' : 'border-white'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                  r.rank === 1
                    ? 'bg-gradient-to-br from-orange-400 to-rose-500 text-white shadow-md shadow-orange-400/40'
                    : r.rank === 2
                      ? 'bg-slate-400 text-white'
                      : r.rank === 3
                        ? 'bg-amber-700 text-amber-50'
                        : 'bg-slate-200 text-slate-600'
                }`}
              >
                {r.rank}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {r.login}
                  {isMe ? (
                    <span className="ml-1 text-[9px] font-black uppercase text-orange-600">Bạn</span>
                  ) : null}
                </p>
                <p className="text-[10px] text-slate-500">
                  Level {r.level} · {r.attempts} lần làm bài
                </p>
              </div>
              <div className="text-right shrink-0">
                <p
                  className={`text-sm font-black tabular-nums leading-none ${
                    r.rank === 1 ? 'text-orange-500' : 'text-slate-700'
                  }`}
                >
                  {r.totalExp.toLocaleString('vi-VN')}
                </p>
                <p className="text-[9px] font-bold uppercase text-slate-400 mt-0.5">EXP</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
