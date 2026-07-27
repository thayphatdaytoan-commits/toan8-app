import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
} from 'lucide-react';
import { buildAdminQuizRepositoryTree, getQuizCardMeta } from '../quizExamTypes';

function chapterKey(folderId, chapterNo) {
  return `${folderId}::${chapterNo}`;
}

export default function QuizRepositoryPanel({
  quizzesList,
  activeGrade,
  onCreateQuiz,
  onEditQuiz,
  onDeleteQuiz,
}) {
  const folders = useMemo(
    () => buildAdminQuizRepositoryTree(quizzesList, { activeGrade }),
    [quizzesList, activeGrade]
  );

  const [expandedFolders, setExpandedFolders] = useState([]);
  const [expandedChapters, setExpandedChapters] = useState([]);

  useEffect(() => {
    const withContent = folders.filter((f) => f.totalQuizzes > 0).map((f) => f.id);
    const preferred = withContent.length ? withContent.slice(0, 1) : folders.slice(0, 1).map((f) => f.id);
    setExpandedFolders(preferred);

    const nextChapters = [];
    folders.forEach((f) => {
      if (!preferred.includes(f.id) || !f.hasChapters) return;
      f.chapters.forEach((ch) => {
        if (ch.quizzes.length > 0) nextChapters.push(chapterKey(f.id, ch.no));
      });
    });
    setExpandedChapters(nextChapters.slice(0, 2));
  }, [folders, activeGrade]);

  const toggleFolder = (id) => {
    setExpandedFolders((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleChapter = (folderId, chapterNo) => {
    const key = chapterKey(folderId, chapterNo);
    setExpandedChapters((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const renderQuizCard = (quiz) => (
    <div
      key={quiz.id}
      className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col gap-2 shadow-sm hover:border-blue-200 transition-colors"
    >
      <div className="min-w-0 pr-1">
        <h4 className="font-bold text-sm text-blue-800 leading-snug line-clamp-2">
          <FileText size={14} className="inline mr-1 text-blue-500 shrink-0" />
          {quiz.title || 'Đề thi'}
        </h4>
        <p className="text-xs text-slate-500 mt-1">{getQuizCardMeta(quiz)}</p>
      </div>
      <div className="flex gap-2 mt-auto">
        <button
          type="button"
          onClick={() => onEditQuiz(quiz)}
          className="flex-1 bg-blue-50 text-blue-700 py-1.5 rounded-md font-semibold text-xs hover:bg-blue-100"
        >
          Sửa Đề
        </button>
        <button
          type="button"
          onClick={() => onDeleteQuiz(quiz.id)}
          className="px-2.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100"
          title="Xóa đề"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );

  const renderChapterBlock = (folder, chapter) => {
    const key = chapterKey(folder.id, chapter.no);
    const open = expandedChapters.includes(key);
    const count = chapter.quizzes.length;
    const FolderIcon = open ? FolderOpen : Folder;

    return (
      <div key={key} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/60">
        <div className="flex items-start gap-2 px-3 py-2.5 hover:bg-white transition-colors">
          <button
            type="button"
            onClick={() => toggleChapter(folder.id, chapter.no)}
            className="flex items-start gap-2 flex-1 min-w-0 text-left"
          >
            <span className="mt-0.5 text-amber-600 shrink-0">
              {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
            <FolderIcon size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs md:text-sm font-bold text-slate-800 leading-snug">{chapter.label}</span>
              <span className="text-[11px] text-slate-500 font-semibold mt-0.5 block">
                {count > 0 ? `${count} đề` : 'Chưa có đề'}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() =>
              onCreateQuiz({
                exam_type: 'lesson',
                grade_level: String(chapter.no).includes('::')
                  ? chapter.no.split('::')[0]
                  : activeGrade !== 'ALL'
                    ? activeGrade
                    : undefined,
                chapter: String(chapter.no).includes('::') ? chapter.no.split('::')[1] : chapter.no,
              })
            }
            className="shrink-0 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-2 py-1 rounded-md self-center"
            title="Thêm đề vào chương này"
          >
            + Đề
          </button>
        </div>
        {open ? (
          <div className="px-3 pb-3 pt-1 border-t border-slate-200 bg-white">
            {count > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {chapter.quizzes.map((q) => renderQuizCard(q))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-2">
                Chưa có đề trong chương này. Bấm <strong>+ Đề</strong> hoặc tạo đề mới và chọn loại &quot;Đề ôn theo bài học&quot; + chương tương ứng.
              </p>
            )}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {folders.map((folder) => {
        const open = expandedFolders.includes(folder.id);
        const FolderIcon = open ? FolderOpen : Folder;
        const gradeForCreate = activeGrade !== 'ALL' ? activeGrade : '11';

        return (
          <div key={folder.id} className="border border-blue-100 rounded-2xl overflow-hidden bg-white shadow-sm">
            <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-blue-50 to-white">
              <button
                type="button"
                onClick={() => toggleFolder(folder.id)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-90"
              >
                <span className="text-blue-600 shrink-0">
                  {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </span>
                <FolderIcon size={20} className="text-blue-600 shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block font-black text-sm md:text-base text-blue-900">{folder.label}</span>
                  <span className="text-xs text-blue-700/80 font-semibold">
                    {folder.totalQuizzes} đề
                    {folder.hasChapters
                      ? ` · ${folder.chapters.filter((c) => c.quizzes.length > 0).length} chương có đề`
                      : ''}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onCreateQuiz({
                    exam_type: folder.id,
                    grade_level: gradeForCreate,
                    chapter: folder.hasChapters ? '' : undefined,
                  })
                }
                className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-lg"
              >
                <Plus size={14} /> Tạo đề
              </button>
            </div>

            {open ? (
              <div className="p-3 space-y-2 border-t border-blue-100 bg-slate-50/40">
                {folder.hasChapters ? (
                  <>
                    {folder.chapters.map((ch) => renderChapterBlock(folder, ch))}
                    {folder.unassigned.length > 0 ? (
                      <div className="border border-amber-200 rounded-xl overflow-hidden bg-amber-50/50">
                        <div className="px-3 py-2 border-b border-amber-200 text-xs font-bold text-amber-900">
                          Chưa chọn chương ({folder.unassigned.length})
                        </div>
                        <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                          {folder.unassigned.map((q) => renderQuizCard(q))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : folder.quizzes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {folder.quizzes.map((q) => renderQuizCard(q))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic py-2 px-1">
                    Chưa có đề trong thư mục này. Bấm <strong>Tạo đề</strong> và chọn loại đề tương ứng khi soạn.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
