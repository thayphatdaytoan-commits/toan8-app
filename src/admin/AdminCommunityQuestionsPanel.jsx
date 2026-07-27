/* eslint-disable */
import React, { useEffect, useState } from 'react';
import { MessageCircle, Trash2, Send, RefreshCw } from 'lucide-react';
import CommunityRichText from '../community/CommunityRichText';
import CommunityMathComposer from '../community/CommunityMathComposer';
import {
  addCommunityAnswerWithList,
  deleteCommunityQuestionFs,
  formatQaTime,
  subscribeCommunityQuestions,
} from '../community/communityFirestore';

export default function AdminCommunityQuestionsPanel() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyFor, setReplyFor] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeCommunityQuestions((list) => {
      setQuestions(list);
      setLoading(false);
    });
    return () => unsub?.();
  }, []);

  const onDelete = async (id) => {
    if (!window.confirm('Xóa câu hỏi này?')) return;
    setBusy(true);
    try {
      await deleteCommunityQuestionFs(id);
    } catch (e) {
      setError(e?.message || 'Xóa thất bại');
    } finally {
      setBusy(false);
    }
  };

  const onReply = async (q) => {
    setBusy(true);
    setError('');
    try {
      await addCommunityAnswerWithList(q.id, q.answers || [], {
        content: replyText,
        authorName: 'Thầy Phát',
        isTeacher: true,
      });
      setReplyFor(null);
      setReplyText('');
    } catch (e) {
      setError(e?.message || 'Trả lời thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" /> Câu hỏi cộng đồng
          </h2>
          <p className="text-sm text-slate-500">Xem, trả lời hoặc xóa câu hỏi học sinh gửi.</p>
        </div>
        {loading ? (
          <span className="text-xs font-bold text-slate-400 inline-flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang tải…
          </span>
        ) : (
          <span className="text-xs font-bold text-slate-500">{questions.length} câu hỏi</span>
        )}
      </div>

      {error ? <p className="text-sm text-red-600 font-semibold">{error}</p> : null}

      {questions.length === 0 && !loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
          Chưa có câu hỏi nào.
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <article key={q.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-black text-slate-900">{q.author}</p>
                  <p className="text-xs text-slate-400">
                    Lớp {q.grade}
                    {q.authorClass ? ` · ${q.authorClass}` : ''} · {formatQaTime(q.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setReplyFor(replyFor === q.id ? null : q.id);
                      setReplyText('');
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100"
                  >
                    <Send className="w-3.5 h-3.5" /> Trả lời
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onDelete(q.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Xóa
                  </button>
                </div>
              </div>
              <CommunityRichText text={q.content} className="text-sm text-slate-800 mb-3" />
              {(q.answers || []).length > 0 ? (
                <div className="pl-3 border-l-2 border-emerald-200 space-y-2 mb-2">
                  {q.answers.map((a) => (
                    <div key={a.id}>
                      <p className="text-xs font-bold text-emerald-700">
                        {a.author}
                        {a.badge ? ` · ${a.badge}` : ''}
                      </p>
                      <CommunityRichText text={a.content} className="text-sm text-slate-700" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-amber-700 font-semibold mb-2">Chưa có câu trả lời</p>
              )}
              {replyFor === q.id ? (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  <CommunityMathComposer value={replyText} onChange={setReplyText} rows={3} />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setReplyFor(null)}
                      className="px-3 py-2 rounded-lg bg-slate-100 text-sm font-bold"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onReply(q)}
                      className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold"
                    >
                      Gửi trả lời
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
