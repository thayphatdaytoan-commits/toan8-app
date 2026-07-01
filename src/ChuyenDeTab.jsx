/* eslint-disable */
import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookMarked,
  BookOpen,
  CheckCircle,
  ChevronRight,
  FileText,
  Play,
  PlayCircle,
  Sparkles,
  Target,
} from 'lucide-react';
import { deriveTopicsFromLessons, TOPIC_COLOR_THEMES, pickTopicTheme } from './topics';
import { computeLessonStudyProgress } from './lessonProgress';

function normName(s) {
  return (s || '').trim().toLowerCase();
}

function statusFromPercent(p) {
  if (p >= 100) return 'mastered';
  if (p >= 75) return 'good';
  if (p >= 50) return 'learning';
  if (p >= 25) return 'weak';
  return 'critical';
}

function statusBarClass(status) {
  switch (status) {
    case 'mastered':
      return 'bg-emerald-500';
    case 'good':
      return 'bg-blue-500';
    case 'learning':
      return 'bg-amber-500';
    case 'weak':
      return 'bg-orange-500';
    case 'critical':
      return 'bg-red-500';
    default:
      return 'bg-slate-300';
  }
}

export default function ChuyenDeTab({
  studentName = '',
  rosterGrade = '8',
  lessonsList = [],
  quizzesList = [],
  scoresList = [],
  onSelectLesson,
}) {
  const [selectedTopicId, setSelectedTopicId] = useState(null);

  const myScores = useMemo(() => {
    const me = normName(studentName);
    const g = String(rosterGrade || '').trim();
    return (scoresList || []).filter((s) => {
      if (normName(s?.name) !== me) return false;
      const sg = String(s?.grade_level ?? '').trim();
      if (sg && g && sg !== g) return false;
      return true;
    });
  }, [scoresList, studentName, rosterGrade]);

  const topics = useMemo(() => {
    const base = deriveTopicsFromLessons(lessonsList, { grade: rosterGrade });
    return base.map((t) => {
      const lessonsWithProgress = t.lessons.map((l) => {
        const chapter = (l?.chapter ?? '').toString().trim();
        const lesson_no = (l?.lesson_no ?? '').toString().trim();
        const lessonQuizzes = (quizzesList || []).filter((q) => {
          const qc = (q?.chapter ?? '').toString().trim();
          const ql = (q?.lesson_no ?? '').toString().trim();
          return qc === chapter && ql === lesson_no;
        });
        const progress = computeLessonStudyProgress(l, lessonQuizzes, myScores);
        return { ...l, _progress: progress, _quizzesCount: lessonQuizzes.length };
      });
      const avg = lessonsWithProgress.length
        ? Math.round(lessonsWithProgress.reduce((a, x) => a + (x._progress || 0), 0) / lessonsWithProgress.length)
        : 0;
      const quizzes = lessonsWithProgress.reduce((a, x) => a + (x._quizzesCount || 0), 0);
      return { ...t, lessons: lessonsWithProgress, percent: avg, quizzesTotal: quizzes };
    });
  }, [lessonsList, quizzesList, myScores, rosterGrade]);

  const overallPercent = useMemo(() => {
    if (!topics.length) return 0;
    return Math.round(topics.reduce((a, t) => a + (t.percent || 0), 0) / topics.length);
  }, [topics]);

  const weakCount = useMemo(
    () => topics.filter((t) => ['weak', 'critical'].includes(statusFromPercent(t.percent))).length,
    [topics]
  );

  const selectedTopic = useMemo(
    () => topics.find((t) => t.id === selectedTopicId) || null,
    [topics, selectedTopicId]
  );

  if (selectedTopic) {
    return (
      <TopicDetailView
        topic={selectedTopic}
        onBack={() => setSelectedTopicId(null)}
        onSelectLesson={onSelectLesson}
      />
    );
  }

  if (!topics.length) {
    return (
      <div className="w-full bg-white rounded-3xl border border-slate-200 p-10 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
          <BookMarked className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-black text-slate-800">Chưa có chuyên đề nào</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
          Giáo viên có thể vào Admin → Sửa bài giảng → tích ô <strong>“Bài giảng thuộc Chuyên đề ôn thi”</strong>,
          sau đó chọn chuyên đề có sẵn hoặc “+ Tạo chuyên đề mới”.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col pb-12">
      <div className="flex items-start justify-between mb-8 gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">Chuyên Đề Ôn Thi</h2>
          <p className="text-gray-500 mt-1 font-medium text-sm">
            Hệ thống toàn bộ kiến thức trọng tâm theo từng chuyên đề — tiến độ cập nhật theo bài bạn đã làm.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-fuchsia-600 rounded-[2rem] p-7 shadow-xl shadow-indigo-900/20 relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-[80px] opacity-15 -translate-y-1/2 translate-x-1/4" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest mb-3 border border-white/20">
              <Target className="w-4 h-4" /> Tiến độ chuyên đề
            </div>
            <p className="text-3xl md:text-4xl font-black tracking-tight">{overallPercent}% hoàn thành</p>
            <p className="text-indigo-100 text-sm mt-1">
              {topics.length} chuyên đề • {topics.reduce((a, t) => a + t.lessons.length, 0)} bài học
            </p>
            <div className="mt-5 h-2.5 w-full bg-black/25 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-amber-300 to-orange-400 rounded-full"
                style={{ width: `${overallPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] p-7 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest mb-3 border border-rose-100">
            <AlertTriangle className="w-4 h-4" /> Ưu tiên ôn ngay
          </div>
          <p className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            {weakCount} <span className="text-lg text-slate-500 font-bold">chuyên đề đang yếu</span>
          </p>
          <p className="text-slate-500 text-sm mt-1">
            Gợi ý: chọn ngay các thẻ có viền đỏ bên dưới để cải thiện điểm.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {topics
              .filter((t) => ['weak', 'critical'].includes(statusFromPercent(t.percent)))
              .slice(0, 4)
              .map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTopicId(t.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors border border-rose-100"
                >
                  <AlertTriangle className="w-3 h-3" /> {t.name}
                </button>
              ))}
            {weakCount === 0 && (
              <p className="text-xs text-slate-400 font-semibold">Chưa có chuyên đề nào dưới 50%. Giữ phong độ!</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-end mb-4 px-1">
        <div>
          <h3 className="text-xl font-extrabold text-gray-900">Danh sách chuyên đề</h3>
          <p className="text-gray-500 mt-1 font-medium text-xs">Chọn một chuyên đề bên dưới để xem các bài học bên trong.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {topics.map((t, idx) => (
          <TopicCard
            key={t.id}
            topic={t}
            index={idx + 1}
            onOpen={() => setSelectedTopicId(t.id)}
          />
        ))}
      </div>
    </div>
  );
}

function TopicCard({ topic, index, onOpen }) {
  const themeName = pickTopicTheme(topic.id);
  const theme = TOPIC_COLOR_THEMES[themeName] || TOPIC_COLOR_THEMES.blue;
  const status = statusFromPercent(topic.percent);
  const danger = status === 'weak' || status === 'critical';
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group bg-white rounded-3xl border ${theme.border} shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full overflow-hidden relative text-left cursor-pointer hover:-translate-y-1 ${
        danger ? 'ring-1 ring-rose-200' : ''
      }`}
    >
      {danger && (
        <div className="absolute top-0 left-0 w-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest py-1.5 text-center z-10 flex justify-center items-center">
          <AlertTriangle className="w-3 h-3 mr-1" /> Cần ôn tập ngay
        </div>
      )}

      <div className={`p-5 flex-1 flex flex-col ${danger ? 'pt-9' : ''}`}>
        <div className="flex justify-between items-start mb-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${theme.bg} ${theme.text}`}>
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="flex flex-col items-end">
            <span className="text-lg font-black text-gray-800">{topic.percent}%</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tiến độ</span>
          </div>
        </div>

        <h4 className="font-extrabold text-gray-900 text-base mb-1.5 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">
          {index}. {topic.name}
        </h4>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed font-medium line-clamp-2">
          {topic.lessons.length} bài học · {topic.quizzesTotal || 0} đề luyện
        </p>

        <div className="mt-auto pt-3 border-t border-gray-100 flex items-center gap-4 mb-4">
          <div className="flex items-center text-[11px] font-semibold text-gray-500">
            <BookMarked className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
            {topic.lessons.length} bài
          </div>
          <div className="flex items-center text-[11px] font-semibold text-gray-500">
            <FileText className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
            {topic.quizzesTotal || 0} đề
          </div>
        </div>

        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${statusBarClass(status)}`}
            style={{ width: `${topic.percent}%` }}
          />
        </div>

        <div
          className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center transition-all duration-300 border ${
            topic.percent >= 100
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-indigo-50 text-indigo-700 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white'
          }`}
        >
          {topic.percent >= 100 ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" /> Đã hoàn thành
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 mr-1.5" /> {topic.percent === 0 ? 'Bắt đầu học' : 'Tiếp tục học'}
            </>
          )}
        </div>
      </div>
    </button>
  );
}

function TopicDetailView({ topic, onBack, onSelectLesson }) {
  const themeName = pickTopicTheme(topic.id);
  const theme = TOPIC_COLOR_THEMES[themeName] || TOPIC_COLOR_THEMES.blue;

  return (
    <div className="w-full flex flex-col pb-12">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition shadow-sm border border-gray-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-widest text-indigo-600">Chuyên đề ôn thi</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 truncate">{topic.name}</h2>
        </div>
      </div>

      <div className={`rounded-3xl border ${theme.border} bg-white p-5 md:p-6 shadow-sm mb-6`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl ${theme.bg} ${theme.text} flex items-center justify-center`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-600">Tiến độ chung</p>
              <p className="text-2xl font-black text-slate-900">{topic.percent}%</p>
            </div>
          </div>
          <div className="text-sm font-semibold text-slate-500">
            {topic.lessons.length} bài · {topic.quizzesTotal || 0} đề luyện
          </div>
        </div>
        <div className="mt-4 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${statusBarClass(statusFromPercent(topic.percent))}`}
            style={{ width: `${topic.percent}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {topic.lessons.map((l, idx) => {
          const p = l._progress || 0;
          const done = p >= 100;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => onSelectLesson?.(l.id)}
              className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-left"
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  done ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                }`}
              >
                {done ? <CheckCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2">
                  {idx + 1}. {l.title || 'Bài học'}
                </h4>
                <p className="text-[11px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">
                  {done ? 'Đã hoàn thành' : `Tiến độ · ${p}%`}
                </p>
                <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${done ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                    style={{ width: `${p}%` }}
                  />
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
