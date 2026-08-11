/* eslint-disable */
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MessageCircle, Lock, Send } from 'lucide-react';
import MathEduLogo from './components/MathEduLogo';
import CommunityMathComposer from './community/CommunityMathComposer';
import CommunityRichText from './community/CommunityRichText';
import {
  addCommunityAnswerWithList,
  createCommunityQuestionFs,
  formatQaTime,
  subscribeCommunityQuestions,
} from './community/communityFirestore';

const GRADES = ['6', '7', '8', '9', '10', '11', '12'];
const SUBJECTS = ['Toán', 'Tất cả'];
const TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'newest', label: 'Mới nhất' },
  { id: 'unanswered', label: 'Chưa trả lời' },
];

export default function CommunityQaScreen({
  onGoHome,
  studentName = '',
  studentClass = '',
  onRequestLogin,
}) {
  const [grade, setGrade] = useState('9');
  const [subject, setSubject] = useState('Toán');
  const [content, setContent] = useState('');
  const [tab, setTab] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState([]);
  const [replyOpen, setReplyOpen] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsub = subscribeCommunityQuestions(setQuestions);
    return () => unsub?.();
  }, []);

  const filtered = useMemo(() => {
    let list = [...questions];
    if (filterGrade !== 'all') list = list.filter((q) => String(q.grade) === String(filterGrade));
    if (tab === 'unanswered') list = list.filter((q) => !(q.answers || []).length);
    return list;
  }, [questions, tab, filterGrade]);

  const requireLogin = () => {
    if (studentName) return true;
    onRequestLogin?.();
    return false;
  };

  const submit = async () => {
    if (!requireLogin()) return;
    setError('');
    setBusy(true);
    try {
      await createCommunityQuestionFs({
        grade,
        subject: subject === 'Tất cả' ? 'Toán' : subject,
        content,
        authorName: studentName,
        authorClass: studentClass,
      });
      setContent('');
    } catch (e) {
      setError(e?.message || 'Không tạo được câu hỏi');
    } finally {
      setBusy(false);
    }
  };

  const submitReply = async (q) => {
    if (!requireLogin()) return;
    setBusy(true);
    setError('');
    try {
      await addCommunityAnswerWithList(q.id, q.answers || [], {
        content: replyText,
        authorName: studentName,
        authorClass: studentClass,
        isTeacher: false,
      });
      setReplyOpen(null);
      setReplyText('');
    } catch (e) {
      setError(e?.message || 'Không gửi được trả lời');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f4f7fe] flex flex-col font-sans">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onGoHome}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 hover:bg-slate-50 shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </button>
            <button type="button" onClick={onGoHome}>
              <MathEduLogo className="h-9 sm:h-10" />
            </button>
            <div className="min-w-0 hidden sm:block">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Cộng đồng</p>
              <h1 className="text-sm font-black text-slate-900 truncate">Hỏi & Đáp</h1>
            </div>
          </div>
          {studentName ? (
            <span className="text-xs font-bold text-slate-700 truncate max-w-[45%]">Xin chào, {studentName}</span>
          ) : (
            <button
              type="button"
              onClick={onRequestLogin}
              className="px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-bold"
            >
              Đăng nhập
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-5 sm:py-8 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        <div className="min-w-0 space-y-4">
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
            <h2 className="text-lg font-black text-slate-900 mb-3">Soạn nội dung câu hỏi</h2>

            {!studentName ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-bold inline-flex items-center gap-1.5 mb-2">
                  <Lock className="w-4 h-4" /> Cần đăng nhập để đặt câu hỏi
                </p>
                <p className="mb-3 text-amber-800/90">Tên học sinh sẽ hiện cùng câu hỏi để thầy cô và bạn bè nhận biết.</p>
                <button
                  type="button"
                  onClick={onRequestLogin}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold"
                >
                  Đăng nhập để hỏi
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-500 mb-2">
                  Đăng với tên: <strong className="text-slate-800">{studentName}</strong>
                  {studentClass ? ` · ${studentClass}` : ''}
                </p>
                <CommunityMathComposer value={content} onChange={setContent} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <label className="block text-xs font-bold text-slate-500">
                    Chọn lớp
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800"
                    >
                      {GRADES.map((g) => (
                        <option key={g} value={g}>
                          Lớp {g}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-bold text-slate-500">
                    Chọn môn
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800"
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setContent('')}
                    className="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-700 text-sm font-bold"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={submit}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-900 text-sm font-black"
                  >
                    <Send className="w-4 h-4" /> Đặt câu hỏi ngay
                  </button>
                </div>
              </>
            )}
            {error ? <p className="mt-2 text-xs text-red-600 font-semibold">{error}</p> : null}
          </section>

          <div className="flex flex-wrap gap-2">
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-bold px-3 py-2"
            >
              <option value="all">Tất cả khối</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  Lớp {g}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-1 border-b border-slate-200">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-sm font-bold border-b-2 -mb-px ${
                  tab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
                Chưa có câu hỏi. Hãy đăng nhập và đặt câu hỏi đầu tiên!
              </div>
            ) : (
              filtered.map((q) => (
                <article key={q.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 text-white flex items-center justify-center font-black text-sm shrink-0">
                      {(q.author || '?').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900">{q.author}</p>
                        <span className="text-[11px] text-slate-400">{formatQaTime(q.createdAt)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {(q.tags || []).map((tag) => (
                          <span
                            key={tag}
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              tag.includes('cộng đồng') ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <CommunityRichText text={q.content} className="text-slate-800 text-sm sm:text-[15px]" />
                  {(q.answers || []).length > 0 ? (
                    <div className="mt-4 pl-3 border-l-2 border-emerald-200 space-y-3">
                      {q.answers.map((a) => (
                        <div key={a.id}>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-bold text-emerald-700">{a.author}</p>
                            {a.badge ? (
                              <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                {a.badge}
                              </span>
                            ) : null}
                          </div>
                          <CommunityRichText text={a.content} className="text-sm text-slate-700" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs font-semibold text-amber-700 inline-flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" /> Chưa có câu trả lời
                    </p>
                  )}

                  <div className="mt-3">
                    {replyOpen === q.id ? (
                      <div className="space-y-2">
                        {!studentName ? (
                          <button type="button" onClick={onRequestLogin} className="text-sm font-bold text-blue-600">
                            Đăng nhập để trả lời
                          </button>
                        ) : (
                          <>
                            <CommunityMathComposer value={replyText} onChange={setReplyText} rows={3} />
                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => setReplyOpen(null)}
                                className="px-3 py-1.5 rounded-lg bg-slate-100 text-sm font-bold"
                              >
                                Hủy
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => submitReply(q)}
                                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-bold"
                              >
                                Gửi trả lời
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!studentName) {
                            onRequestLogin?.();
                            return;
                          }
                          setReplyOpen(q.id);
                          setReplyText('');
                        }}
                        className="text-sm font-bold text-blue-600 hover:underline"
                      >
                        Trả lời câu hỏi
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <h2 className="font-black text-blue-700 mb-2">Hướng dẫn</h2>
            <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-4">
              <li>Đăng nhập mới được hỏi / trả lời</li>
              <li>Dùng nút π để chèn công thức</li>
              <li>Viết rõ lớp và nội dung cần hỏi</li>
            </ul>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <button type="button" onClick={onGoHome} className="text-sm font-semibold text-slate-600 hover:text-blue-600">
              ← Về trang chủ MathEdu
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
