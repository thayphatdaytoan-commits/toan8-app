/* eslint-disable */
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Save, Trophy } from 'lucide-react';
import {
  DEFAULT_LEVEL_THRESHOLDS,
  expDeltaToTargetLevel,
  levelFromExp,
  maxLevel,
  normalizeLevelThresholds,
} from '../studentLevelConfig';
import {
  displayLoginName,
  saveLevelConfigFs,
  subscribeLevelConfig,
  totalExpForStudent,
  writeExpAdjustmentFs,
} from '../studentLevelStore';
import { normStudentName } from '../classroomConstants';

export default function AdminLevelPanel({
  activeGrade,
  studentsList = [],
  scoresList = [],
}) {
  const [thresholds, setThresholds] = useState(DEFAULT_LEVEL_THRESHOLDS.map((x) => ({ ...x })));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = subscribeLevelConfig((cfg) => setThresholds(cfg.thresholds));
    return () => unsub?.();
  }, []);

  const gradeStudents = useMemo(() => {
    const g = String(activeGrade || '').trim();
    return (studentsList || []).filter((s) => {
      if (!g || g === 'ALL') return true;
      return String(s.grade_level || '') === g;
    });
  }, [studentsList, activeGrade]);

  const ranked = useMemo(() => {
    const rows = gradeStudents.map((s) => {
      const totalExp = totalExpForStudent(scoresList, s.name, activeGrade);
      const level = levelFromExp(totalExp, thresholds);
      return {
        student: s,
        name: s.name,
        login: displayLoginName(s, s.name),
        totalExp,
        level,
      };
    });
    // Học sinh chưa trong roster nhưng có điểm
    const known = new Set(rows.map((r) => normStudentName(r.name)));
    const g = String(activeGrade || '').trim();
    for (const sc of scoresList || []) {
      const sg = String(sc?.grade_level ?? '').trim();
      if (g && g !== 'ALL' && sg && sg !== g) continue;
      const n = String(sc?.name || '').trim();
      if (!n || known.has(normStudentName(n))) continue;
      known.add(normStudentName(n));
      const totalExp = totalExpForStudent(scoresList, n, activeGrade);
      rows.push({
        student: { name: n, grade_level: sg },
        name: n,
        login: n,
        totalExp,
        level: levelFromExp(totalExp, thresholds),
      });
    }
    return rows.sort((a, b) => b.level - a.level || b.totalExp - a.totalExp);
  }, [gradeStudents, scoresList, activeGrade, thresholds]);

  const onSaveThresholds = async () => {
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const next = normalizeLevelThresholds(thresholds);
      await saveLevelConfigFs(next);
      setThresholds(next);
      setMsg('Đã lưu ngưỡng Level.');
    } catch (e) {
      setError(e?.message || 'Lưu thất bại');
    } finally {
      setBusy(false);
    }
  };

  const changeLevel = async (row, dir) => {
    const cur = row.level;
    const maxL = maxLevel(thresholds);
    const target = dir === 'up' ? cur + 1 : cur - 1;
    if (target < 1 || target > maxL) {
      window.alert(dir === 'up' ? 'Đã ở Level cao nhất.' : 'Đã ở Level thấp nhất.');
      return;
    }
    const delta = expDeltaToTargetLevel(row.totalExp, target, thresholds);
    if (!delta) {
      window.alert('Không cần điều chỉnh EXP.');
      return;
    }
    const ok = window.confirm(
      `${dir === 'up' ? 'Lên' : 'Xuống'} Level ${target} cho ${row.login}?\nĐiều chỉnh EXP: ${delta > 0 ? '+' : ''}${delta}`
    );
    if (!ok) return;
    setBusy(true);
    setError('');
    try {
      await writeExpAdjustmentFs({
        studentName: row.name,
        gradeLevel: row.student?.grade_level || activeGrade || '',
        className: row.student?.class_label || '',
        deltaExp: delta,
        note: dir === 'up' ? `Lên Level ${target}` : `Xuống Level ${target}`,
      });
      setMsg(`Đã ${dir === 'up' ? 'lên' : 'xuống'} Level ${target} cho ${row.login}.`);
    } catch (e) {
      setError(e?.message || 'Điều chỉnh thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-black text-slate-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" /> Ngưỡng EXP theo Level
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Điểm EXP tối thiểu để đạt từng Level. Level 1 luôn là 0.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onSaveThresholds}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 text-white text-sm font-bold disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> Lưu ngưỡng
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {thresholds.map((t, i) => (
            <label key={t.level} className="text-xs font-bold text-slate-500 block bg-slate-50 border border-slate-200 rounded-lg p-2">
              Level {t.level}
              <input
                type="number"
                min={0}
                disabled={i === 0}
                value={t.minExp}
                onChange={(e) => {
                  const v = Math.max(0, Math.round(Number(e.target.value) || 0));
                  setThresholds((prev) =>
                    prev.map((x, j) => (j === i ? { ...x, minExp: i === 0 ? 0 : v } : x))
                  );
                }}
                className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm font-black text-slate-800 disabled:bg-slate-100"
              />
            </label>
          ))}
        </div>
      </div>

      {msg ? <p className="text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">{msg}</p> : null}
      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-slate-50">
          <h3 className="font-bold text-slate-800">
            Học sinh khối {activeGrade === 'ALL' ? 'tất cả' : activeGrade} — theo Level
          </h3>
          <p className="text-xs text-slate-500">Từ cao xuống thấp. Lên/xuống Level sẽ cộng hoặc trừ EXP tương ứng.</p>
        </div>
        <div className="overflow-auto max-h-[28rem]">
          <table className="w-full text-sm text-left">
            <thead className="bg-white sticky top-0 border-b">
              <tr>
                <th className="p-3 w-12">#</th>
                <th className="p-3">Tên đăng nhập</th>
                <th className="p-3">Họ tên</th>
                <th className="p-3 text-center">Level</th>
                <th className="p-3 text-right">EXP</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {ranked.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                    Chưa có học sinh trong khối này.
                  </td>
                </tr>
              ) : (
                ranked.map((row, idx) => (
                  <tr key={row.name} className="border-t hover:bg-slate-50/80">
                    <td className="p-3 text-slate-400 font-bold">{idx + 1}</td>
                    <td className="p-3 font-bold text-blue-700">{row.login}</td>
                    <td className="p-3 text-slate-700">{row.name}</td>
                    <td className="p-3 text-center">
                      <span className="inline-flex px-2.5 py-1 rounded-full bg-violet-100 text-violet-800 text-xs font-black">
                        Lv {row.level}
                      </span>
                    </td>
                    <td className="p-3 text-right font-black text-amber-600 tabular-nums">
                      {row.totalExp.toLocaleString('vi-VN')}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={busy || row.level <= 1}
                          onClick={() => changeLevel(row, 'down')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                          title="Xuống Level"
                        >
                          <ArrowDown className="w-3.5 h-3.5" /> Xuống
                        </button>
                        <button
                          type="button"
                          disabled={busy || row.level >= maxLevel(thresholds)}
                          onClick={() => changeLevel(row, 'up')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 disabled:opacity-40"
                          title="Lên Level"
                        >
                          <ArrowUp className="w-3.5 h-3.5" /> Lên
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
