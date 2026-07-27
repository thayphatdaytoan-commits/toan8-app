import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  Video,
} from 'lucide-react';
import { buildAdminLessonRepositoryTree, getAdminLessonCardLabel } from '../lessonEditorCatalog';

function chapterKey(grade, chapterNo) {
  return `${grade}::${chapterNo}`;
}

export default function LessonRepositoryPanel({
  lessonsList,
  activeGrade,
  onCreateLesson,
  onEditLesson,
  onDeleteLesson,
}) {
  const tree = useMemo(() => buildAdminLessonRepositoryTree(lessonsList), [lessonsList]);

  const visibleTree = useMemo(() => {
    if (!activeGrade || activeGrade === 'ALL') return tree;
    return tree.filter((g) => String(g.grade) === String(activeGrade));
  }, [tree, activeGrade]);

  const [expandedGrades, setExpandedGrades] = useState([]);
  const [expandedChapters, setExpandedChapters] = useState([]);

  useEffect(() => {
    const gradesWithLessons = visibleTree.filter((g) => g.totalLessons > 0).map((g) => g.grade);
    const preferred =
      activeGrade && activeGrade !== 'ALL' ? [String(activeGrade)] : gradesWithLessons.slice(0, 1);
    const nextGrades = preferred.length ? preferred : visibleTree.slice(0, 1).map((g) => g.grade);
    setExpandedGrades(nextGrades);

    const nextChapters = [];
    visibleTree.forEach((g) => {
      if (!nextGrades.includes(g.grade)) return;
      g.chapters.forEach((ch) => {
        if (ch.lessons.length > 0) nextChapters.push(chapterKey(g.grade, ch.no));
      });
    });
    setExpandedChapters(nextChapters.slice(0, 3));
  }, [visibleTree, activeGrade]);

  const toggleGrade = (grade) => {
    setExpandedGrades((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]
    );
  };

  const toggleChapter = (grade, chapterNo) => {
    const key = chapterKey(grade, chapterNo);
    setExpandedChapters((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const renderLessonCard = (lesson) => (
    <div
      key={lesson.id}
      className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col gap-2 shadow-sm hover:border-indigo-200 transition-colors"
    >
      <div className="min-w-0">
        <h4 className="font-bold text-sm text-slate-800 leading-snug line-clamp-2">
          <Video size={14} className="inline mr-1 text-indigo-500 shrink-0" />
          {getAdminLessonCardLabel(lesson)}
        </h4>
        {(lesson.description || '').toString().trim() ? (
          <p className="text-xs text-slate-500 line-clamp-2 mt-1">{String(lesson.description).trim()}</p>
        ) : null}
      </div>
      <div className="flex gap-2 mt-auto">
        <button
          type="button"
          onClick={() => onEditLesson(lesson)}
          className="flex-1 bg-indigo-50 text-indigo-700 py-1.5 rounded-md font-semibold text-xs hover:bg-indigo-100"
        >
          Sửa
        </button>
        <button
          type="button"
          onClick={() => onDeleteLesson(lesson.id)}
          className="px-2.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100"
          title="Xóa bài giảng"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );

  const renderChapterBlock = (gradeRow, chapter) => {
    const key = chapterKey(gradeRow.grade, chapter.no);
    const open = expandedChapters.includes(key);
    const count = chapter.lessons.length;
    const FolderIcon = open ? FolderOpen : Folder;

    return (
      <div key={key} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/60">
        <div className="flex items-start gap-2 px-3 py-2.5 hover:bg-white transition-colors">
          <button
            type="button"
            onClick={() => toggleChapter(gradeRow.grade, chapter.no)}
            className="flex items-start gap-2 flex-1 min-w-0 text-left"
          >
            <span className="mt-0.5 text-amber-600 shrink-0">
              {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
            <FolderIcon size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs md:text-sm font-bold text-slate-800 leading-snug">{chapter.label}</span>
              <span className="text-[11px] text-slate-500 font-semibold mt-0.5 block">
                {count > 0 ? `${count} bài giảng` : 'Chưa có bài'}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => onCreateLesson({ grade_level: gradeRow.grade, chapter: chapter.no, lesson_no: '' })}
            className="shrink-0 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-2 py-1 rounded-md self-center"
            title="Thêm bài vào chương này"
          >
            + Bài
          </button>
        </div>
        {open ? (
          <div className="px-3 pb-3 pt-1 border-t border-slate-200 bg-white">
            {count > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {chapter.lessons.map((l) => renderLessonCard(l))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-2">
                Chưa có bài trong chương này. Bấm <strong>+ Bài</strong> để tạo mới — chọn số bài ở dropdown khi soạn.
              </p>
            )}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {visibleTree.map((gradeRow) => {
        const gradeOpen = expandedGrades.includes(gradeRow.grade);
        const GradeFolderIcon = gradeOpen ? FolderOpen : Folder;
        return (
          <div key={gradeRow.grade} className="border border-indigo-100 rounded-2xl overflow-hidden bg-white shadow-sm">
            <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-indigo-50 to-white">
              <button
                type="button"
                onClick={() => toggleGrade(gradeRow.grade)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-90"
              >
                <span className="text-indigo-600 shrink-0">
                  {gradeOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </span>
                <GradeFolderIcon size={20} className="text-indigo-600 shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block font-black text-base text-indigo-900">{gradeRow.label}</span>
                  <span className="text-xs text-indigo-700/80 font-semibold">
                    {gradeRow.totalLessons} bài · {gradeRow.chapters.filter((c) => c.lessons.length > 0).length} chương có nội dung
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => onCreateLesson({ grade_level: gradeRow.grade, chapter: '', lesson_no: '' })}
                className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1.5 rounded-lg"
              >
                <Plus size={14} /> Bài mới
              </button>
            </div>

            {gradeOpen ? (
              <div className="p-3 space-y-2 border-t border-indigo-100 bg-slate-50/40">
                {gradeRow.chapters.map((ch) => renderChapterBlock(gradeRow, ch))}

                {gradeRow.unassigned.length > 0 ? (
                  <div className="border border-amber-200 rounded-xl overflow-hidden bg-amber-50/50">
                    <div className="px-3 py-2 border-b border-amber-200 text-xs font-bold text-amber-900">
                      Chưa gán chương ({gradeRow.unassigned.length})
                    </div>
                    <div className="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                      {gradeRow.unassigned.map((l) => renderLessonCard(l))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
