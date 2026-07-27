import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  Folder,
  FolderOpen,
  HelpCircle,
  Trash2,
} from 'lucide-react';
import { RichMathContent } from '../RichMathContent';
import { COG_LEVEL_LABEL, QUESTION_TYPE_LABEL } from '../questionBank';
import { buildAdminQuestionBankTree, BANK_TOPIC_NONE } from '../questionBankRepository';

function chapterKey(chapterNo) {
  return `ch::${chapterNo}`;
}

function topicKey(chapterNo, topic) {
  return `${chapterKey(chapterNo)}::${topic}`;
}

function giftedTopicKey(topic) {
  return `hsg::${topic}`;
}

export default function QuestionRepositoryPanel({
  questions,
  activeGrade,
  onEditQuestion,
  onDeleteQuestion,
}) {
  const tree = useMemo(
    () => buildAdminQuestionBankTree(questions, { activeGrade }),
    [questions, activeGrade]
  );

  const [expandedChapters, setExpandedChapters] = useState([]);
  const [expandedTopics, setExpandedTopics] = useState([]);
  const [giftedOpen, setGiftedOpen] = useState(false);
  const [unassignedOpen, setUnassignedOpen] = useState(false);

  useEffect(() => {
    const withContent = tree.chapters.filter((c) => c.totalQuestions > 0).map((c) => c.no);
    setExpandedChapters(withContent.length ? withContent : []);

    const nextTopics = [];
    tree.chapters.forEach((ch) => {
      if (ch.totalQuestions === 0) return;
      ch.topicFolders.forEach((tf) => {
        if (tf.questions.length > 0) nextTopics.push(topicKey(ch.no, tf.topic));
      });
    });
    setExpandedTopics(nextTopics);
    setGiftedOpen(tree.giftedFolder.totalQuestions > 0);
    setUnassignedOpen(tree.unassigned.some((tf) => tf.questions.length > 0));
  }, [tree, activeGrade]);

  const toggleChapter = (no) => {
    setExpandedChapters((prev) =>
      prev.includes(no) ? prev.filter((x) => x !== no) : [...prev, no]
    );
  };

  const toggleTopic = (key) => {
    setExpandedTopics((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const renderQuestionCard = (q) => (
    <div
      key={q.id}
      className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col gap-2 shadow-sm hover:border-violet-200 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-slate-500">
            {COG_LEVEL_LABEL[String(q.cognitive_level || 'recognize')] || '—'} ·{' '}
            {QUESTION_TYPE_LABEL[String(q.q_type || 'multiple_choice')] || '—'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDeleteQuestion(q.id)}
          className="text-red-400 hover:text-red-600 shrink-0"
          title="Xóa"
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="text-sm text-slate-800 line-clamp-3 min-h-[2.5rem]">
        <RichMathContent text={String(q.question || '—')} />
      </div>
      <div className="flex gap-2 mt-auto">
        <button
          type="button"
          onClick={() => onEditQuestion(q)}
          className="flex-1 bg-violet-50 text-violet-700 py-1.5 rounded-md font-semibold text-xs hover:bg-violet-100 inline-flex items-center justify-center gap-1"
        >
          <Edit2 size={14} /> Sửa
        </button>
      </div>
    </div>
  );

  const renderTopicBlock = (chapterNo, tf, keyFn) => {
    const count = tf.questions.length;
    if (count === 0) return null;
    const key = keyFn(tf.topic);
    const open = expandedTopics.includes(key);
    const FolderIcon = open ? FolderOpen : Folder;

    return (
      <div key={key} className="border border-violet-100 rounded-xl overflow-hidden bg-violet-50/30">
        <button
          type="button"
          onClick={() => toggleTopic(key)}
          className="w-full flex items-start gap-2 px-3 py-2.5 hover:bg-white transition-colors text-left"
        >
          <span className="mt-0.5 text-violet-600 shrink-0">
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
          <FolderIcon size={17} className="text-violet-600 shrink-0 mt-0.5" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-slate-800 leading-snug line-clamp-2">{tf.label}</span>
            <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
              {count > 0 ? `${count} câu` : 'Chưa có câu'}
            </span>
          </span>
        </button>
        {open && count > 0 ? (
          <div className="px-3 pb-3 pt-1 border-t border-violet-100 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {tf.questions.map((q) => renderQuestionCard(q))}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const renderChapterBlock = (chapter) => {
    const open = expandedChapters.includes(chapter.no);
    const FolderIcon = open ? FolderOpen : Folder;
    const topicCount = chapter.topicFolders.filter((t) => t.questions.length > 0).length;

    return (
      <div key={chapter.no} className="border border-violet-100 rounded-2xl overflow-hidden bg-white shadow-sm">
        <button
          type="button"
          onClick={() => toggleChapter(chapter.no)}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-violet-50 to-white hover:opacity-95 text-left"
        >
          <span className="text-violet-600 shrink-0">
            {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </span>
          <FolderIcon size={20} className="text-violet-600 shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block font-black text-sm md:text-base text-violet-900 leading-snug">{chapter.label}</span>
            <span className="text-xs text-violet-700/80 font-semibold">
              {chapter.totalQuestions} câu · {topicCount} dạng toán
            </span>
          </span>
        </button>
        {open ? (
          <div className="p-3 space-y-2 border-t border-violet-100 bg-slate-50/40">
            {chapter.topicFolders.length > 0 ? (
              chapter.topicFolders.map((tf) =>
                renderTopicBlock(chapter.no, tf, (topic) => topicKey(chapter.no, topic))
              )
            ) : (
              <p className="text-xs text-slate-500 italic py-2 px-1">Chưa có câu trong chương này.</p>
            )}
          </div>
        ) : null}
      </div>
    );
  };

  const renderGiftedFolder = () => {
    const folder = tree.giftedFolder;
    const FolderIcon = giftedOpen ? FolderOpen : Folder;
    const topicCount = folder.topicFolders.filter((t) => t.questions.length > 0).length;

    return (
      <div className="border border-fuchsia-200 rounded-2xl overflow-hidden bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setGiftedOpen((v) => !v)}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-fuchsia-50 to-white hover:opacity-95 text-left"
        >
          <span className="text-fuchsia-600 shrink-0">
            {giftedOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </span>
          <FolderIcon size={20} className="text-fuchsia-600 shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block font-black text-sm md:text-base text-fuchsia-900">{folder.label}</span>
            <span className="text-xs text-fuchsia-700/80 font-semibold">
              {folder.totalQuestions} câu · {topicCount} dạng toán
            </span>
          </span>
        </button>
        {giftedOpen ? (
          <div className="p-3 space-y-2 border-t border-fuchsia-100 bg-slate-50/40">
            {folder.totalQuestions > 0 ? (
              folder.topicFolders.map((tf) =>
                renderTopicBlock('hsg', tf, (topic) => giftedTopicKey(topic))
              )
            ) : (
              <p className="text-xs text-slate-500 italic py-2 px-1">
                Câu từ đề <strong>Học sinh giỏi</strong> sẽ nằm ở đây khi bấm &quot;Lưu đề vào ngân hàng&quot;.
              </p>
            )}
          </div>
        ) : null}
      </div>
    );
  };

  if (tree.totalQuestions === 0) {
    return (
      <div className="bg-slate-50 p-10 rounded-2xl border-2 border-dashed border-slate-200 text-center text-slate-500">
        <HelpCircle size={32} className="mx-auto mb-2 text-slate-400" />
        Chưa có câu hỏi trong ngân hàng (hoặc bộ lọc rỗng).
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tree.chapters.filter((ch) => ch.totalQuestions > 0).map((ch) => renderChapterBlock(ch))}

      {tree.unassigned.some((tf) => tf.questions.length > 0) ? (
        <div className="border border-amber-200 rounded-2xl overflow-hidden bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setUnassignedOpen((v) => !v)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-amber-50 hover:bg-amber-100/80 text-left"
          >
            <span className="text-amber-700 shrink-0">
              {unassignedOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </span>
            <Folder size={20} className="text-amber-600 shrink-0" />
            <span className="font-black text-amber-900 text-sm">Chưa chọn chương</span>
          </button>
          {unassignedOpen ? (
            <div className="p-3 space-y-2 border-t border-amber-200 bg-white">
              {tree.unassigned.map((tf) =>
                renderTopicBlock(BANK_TOPIC_NONE, tf, (topic) => topicKey(BANK_TOPIC_NONE, topic))
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {tree.giftedFolder.totalQuestions > 0 ? renderGiftedFolder() : null}
    </div>
  );
}
