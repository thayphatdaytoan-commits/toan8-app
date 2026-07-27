/* eslint-disable */
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X, Shield, UserCog } from 'lucide-react';
import {
  ALL_GRADE_OPTIONS,
  STAFF_ROLE,
  deleteAdminStaff,
  saveAdminStaff,
  subscribeAdminStaff,
} from './adminStaffStore';

const EMPTY = {
  username: '',
  password: '',
  name: '',
  role: STAFF_ROLE.TEACHER,
  grade_levels: [],
  class_ids: [],
  active: true,
};

export default function AdminTeachersPanel({ classesList = [] }) {
  const [rows, setRows] = useState([]);
  const [editor, setEditor] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsub = subscribeAdminStaff(setRows, () => setErr('Không tải được danh sách giáo viên.'));
    return () => unsub();
  }, []);

  const classesByGrade = useMemo(() => {
    const map = {};
    (classesList || []).forEach((c) => {
      const g = String(c.grade_level || '');
      if (!map[g]) map[g] = [];
      map[g].push(c);
    });
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'vi'))
    );
    return map;
  }, [classesList]);

  const openCreate = () => setEditor({ ...EMPTY, grade_levels: ['8'] });
  const openEdit = (row) =>
    setEditor({
      id: row.id,
      username: row.username || '',
      password: row.password || '',
      name: row.name || '',
      role: row.role === STAFF_ROLE.SUPER_ADMIN ? STAFF_ROLE.SUPER_ADMIN : STAFF_ROLE.TEACHER,
      grade_levels: Array.isArray(row.grade_levels) ? [...row.grade_levels] : [],
      class_ids: Array.isArray(row.class_ids) ? [...row.class_ids] : [],
      active: row.active !== false,
    });

  const toggleGrade = (g) => {
    setEditor((prev) => {
      const set = new Set(prev.grade_levels || []);
      if (set.has(g)) set.delete(g);
      else set.add(g);
      const nextGrades = [...set];
      // Bỏ class_ids không thuộc khối còn chọn
      const allowedClassIds = new Set();
      nextGrades.forEach((grade) => {
        (classesByGrade[grade] || []).forEach((c) => allowedClassIds.add(c.id));
      });
      const nextClassIds = (prev.class_ids || []).filter((id) => allowedClassIds.has(id));
      return { ...prev, grade_levels: nextGrades, class_ids: nextClassIds };
    });
  };

  const toggleClass = (cid) => {
    setEditor((prev) => {
      const set = new Set(prev.class_ids || []);
      if (set.has(cid)) set.delete(cid);
      else set.add(cid);
      return { ...prev, class_ids: [...set] };
    });
  };

  const save = async (e) => {
    e.preventDefault();
    if (!editor) return;
    setBusy(true);
    setErr('');
    try {
      await saveAdminStaff(editor, editor.id || '');
      setEditor(null);
      setMsg('Đã lưu tài khoản giáo viên.');
    } catch (ex) {
      console.error(ex);
      setErr(ex.message || 'Lưu thất bại.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!id || !window.confirm('Xóa tài khoản giáo viên này?')) return;
    try {
      await deleteAdminStaff(id);
      setMsg('Đã xóa tài khoản.');
    } catch (ex) {
      console.error(ex);
      setErr('Xóa thất bại.');
    }
  };

  const classOptionsForEditor = useMemo(() => {
    if (!editor) return [];
    const out = [];
    (editor.grade_levels || []).forEach((g) => {
      (classesByGrade[g] || []).forEach((c) => out.push(c));
    });
    return out;
  }, [editor, classesByGrade]);

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <UserCog size={20} className="text-indigo-600" /> Quản lí giáo viên
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin tổng toàn quyền. Giáo viên chỉ vào được khối được gán — không sửa Trang chủ, Học phí, TKB.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"
        >
          <Plus size={16} /> Thêm giáo viên
        </button>
      </div>

      {(msg || err) && (
        <p className={`text-sm font-semibold ${err ? 'text-red-600' : 'text-emerald-700'}`}>
          {err || msg}
        </p>
      )}

      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-indigo-50 text-indigo-900">
              <tr>
                <th className="p-3 font-black">Họ tên</th>
                <th className="p-3 font-black">Tài khoản</th>
                <th className="p-3 font-black">Vai trò</th>
                <th className="p-3 font-black">Khối</th>
                <th className="p-3 font-black">Lớp</th>
                <th className="p-3 font-black">TT</th>
                <th className="p-3 font-black text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Chưa có tài khoản giáo viên. Bấm Thêm giáo viên.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="p-3 font-bold text-slate-900">{r.name}</td>
                    <td className="p-3 font-mono text-xs">{r.username}</td>
                    <td className="p-3">
                      {r.role === STAFF_ROLE.SUPER_ADMIN ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                          <Shield size={12} /> Admin tổng
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                          Giáo viên
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-xs font-semibold">
                      {(r.grade_levels || []).join(', ') || '—'}
                    </td>
                    <td className="p-3 text-xs text-slate-600">
                      {(r.class_ids || []).length
                        ? `${r.class_ids.length} lớp`
                        : r.role === STAFF_ROLE.TEACHER
                          ? 'Tất cả lớp (khối)'
                          : '—'}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs font-bold ${
                          r.active === false ? 'text-red-600' : 'text-emerald-700'
                        }`}
                      >
                        {r.active === false ? 'Khóa' : 'Mở'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className="px-2.5 py-1 rounded-lg border text-xs font-bold"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(r.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
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

      {editor ? (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <form
            onSubmit={save}
            className="bg-white rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-3 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900">
                {editor.id ? 'Sửa tài khoản' : 'Thêm giáo viên'}
              </h3>
              <button type="button" onClick={() => setEditor(null)} className="p-1 rounded hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <label className="block text-xs font-bold text-slate-600">
              Họ tên
              <input
                required
                value={editor.name}
                onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border text-sm font-semibold"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-bold text-slate-600">
                Tên đăng nhập
                <input
                  required
                  value={editor.username}
                  onChange={(e) => setEditor({ ...editor, username: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border text-sm font-semibold"
                  autoComplete="off"
                />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                Mật khẩu
                <input
                  required
                  value={editor.password}
                  onChange={(e) => setEditor({ ...editor, password: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border text-sm font-semibold"
                  autoComplete="new-password"
                />
              </label>
            </div>
            <label className="block text-xs font-bold text-slate-600">
              Vai trò
              <select
                value={editor.role}
                onChange={(e) => setEditor({ ...editor, role: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border text-sm font-semibold"
              >
                <option value={STAFF_ROLE.TEACHER}>Giáo viên (theo khối)</option>
                <option value={STAFF_ROLE.SUPER_ADMIN}>Admin tổng</option>
              </select>
            </label>

            {editor.role === STAFF_ROLE.TEACHER ? (
              <>
                <div>
                  <p className="text-xs font-black text-slate-700 mb-1.5">Khối được phân công</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_GRADE_OPTIONS.map((g) => {
                      const on = (editor.grade_levels || []).includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => toggleGrade(g)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                            on ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          Toán {g}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-black text-slate-700 mb-1">
                    Lớp cụ thể (tuỳ chọn — để trống = mọi lớp trong khối)
                  </p>
                  {classOptionsForEditor.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Chọn khối trước / chưa có lớp trong khối.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                      {classOptionsForEditor.map((c) => {
                        const on = (editor.class_ids || []).includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleClass(c.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                              on ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {c.name} ({c.grade_level})
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Admin tổng có toàn quyền mọi khối và mọi mục (trang chủ, học phí, TKB…).
              </p>
            )}

            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={editor.active !== false}
                onChange={(e) => setEditor({ ...editor, active: e.target.checked })}
              />
              Tài khoản đang hoạt động
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setEditor(null)} className="px-4 py-2 rounded-lg border text-sm font-bold">
                Hủy
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold disabled:opacity-60"
              >
                Lưu
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
