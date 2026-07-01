import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  ChevronRight,
} from 'lucide-react';
import MindMapImagePanZoom from './MindMapImagePanZoom';
import MindMapMath from './MindMapMath';
import MindMapTeacherPanel from './MindMapTeacherPanel';

const PREVIEW_LEN = 260;

function truncateText(s, len = PREVIEW_LEN) {
  const t = String(s || '').trim();
  if (t.length <= len) return t;
  return `${t.slice(0, len)}…`;
}

export default function StudentMindMapFlow({
  mindMapCategories,
  rosterGrade,
  onExitToDashboard,
  onBeforeNavigate,
  navBridgeRef,
}) {
  const [screen, setScreen] = useState('categories');
  const [categoryId, setCategoryId] = useState(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [problemExpanded, setProblemExpanded] = useState(false);

  const sortedCats = useMemo(
    () => [...(mindMapCategories || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    [mindMapCategories]
  );

  const activeCategory = sortedCats.find((c) => c.id === categoryId);
  const exercises = Array.isArray(activeCategory?.exercises) ? activeCategory.exercises : [];
  const totalEx = exercises.length;
  const current = exercises[exerciseIndex];

  useEffect(() => {
    setProblemExpanded(false);
  }, [categoryId, exerciseIndex]);

  const goPractice = (cat) => {
    onBeforeNavigate?.();
    setCategoryId(cat.id);
    setExerciseIndex(0);
    setProblemExpanded(false);
    setScreen('practice');
  };

  const goCategories = () => {
    setScreen('categories');
    setCategoryId(null);
  };

  useEffect(() => {
    if (!navBridgeRef) return undefined;
    navBridgeRef.current = {
      getState: () => ({ screen, categoryId, exerciseIndex }),
      restore: (s) => {
        if (!s || s.screen === 'categories') {
          setScreen('categories');
          setCategoryId(null);
          setExerciseIndex(0);
          setProblemExpanded(false);
          return;
        }
        setScreen(s.screen || 'categories');
        setCategoryId(s.categoryId ?? null);
        setExerciseIndex(s.exerciseIndex ?? 0);
        setProblemExpanded(false);
      },
    };
    return () => {
      navBridgeRef.current = null;
    };
  }, [navBridgeRef, screen, categoryId, exerciseIndex]);

  const nextEx = () => {
    if (exerciseIndex < totalEx - 1) {
      setExerciseIndex(exerciseIndex + 1);
    }
  };

  const prevEx = () => {
    if (exerciseIndex > 0) {
      setExerciseIndex(exerciseIndex - 1);
    }
  };

  if (String(rosterGrade || '').trim() !== '9') {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-600">
        Nội dung &quot;Sơ đồ tư duy Hình học&quot; chỉ dành cho học sinh <strong>Khối 9</strong>. Tài khoản của bạn đang ở khối khác.
      </div>
    );
  }

  if (screen === 'categories') {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <button
          type="button"
          onClick={() => (typeof onExitToDashboard === 'function' ? onExitToDashboard() : undefined)}
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Về tổng quan
        </button>
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-violet-600" />
            Danh mục — Hình học lớp 9
          </h1>
        </div>

        {sortedCats.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
            Giáo viên chưa đăng chuyên đề nào. Vui lòng quay lại sau.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sortedCats.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => goPractice(cat)}
                className="text-left rounded-2xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/80 p-6 shadow-sm hover:shadow-lg hover:border-violet-300 transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-violet-600 mb-1">Chuyên đề</p>
                    <h3 className="font-display text-xl font-black text-slate-900 group-hover:text-violet-800 leading-snug">
                      {cat.title}
                    </h3>
                    <p className="text-sm text-slate-500 mt-2">{(cat.exercises || []).length} bài</p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-violet-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 min-w-0">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <button
          type="button"
          onClick={goCategories}
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Về danh mục
        </button>
        <p className="text-sm text-slate-600 truncate max-w-[min(100%,28rem)] text-right">
          <span className="font-semibold text-slate-800">{activeCategory?.title}</span>
          <span className="text-slate-400 mx-1">·</span>
          <span className="font-bold text-indigo-700">{current?.title || `Bài ${exerciseIndex + 1}`}</span>
        </p>
      </div>

      {!current ? (
        <p className="text-slate-500">Chuyên đề này chưa có bài.</p>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 text-white">
              <h2 className="font-display text-xl font-black">{current.title || `Bài ${exerciseIndex + 1}`}</h2>
            </div>
            <div className="p-5 space-y-3">
              <div className="font-bold text-slate-900 text-xl">
                <MindMapMath text={current.problem?.title || ''} />
              </div>
              {current.problem?.imageUrl ? (
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-h-[min(70vh,520px)] min-h-[200px]">
                  <MindMapImagePanZoom imageUrl={current.problem.imageUrl} title="Minh họa đề" allowPan={false} />
                </div>
              ) : null}
              <div className="text-slate-800 text-base md:text-lg leading-relaxed">
                {problemExpanded ? (
                  <MindMapMath text={current.problem?.content || ''} />
                ) : (
                  <MindMapMath text={truncateText(current.problem?.content || '')} />
                )}
              </div>
              {(current.problem?.content || '').length > PREVIEW_LEN && (
                <button
                  type="button"
                  onClick={() => setProblemExpanded(!problemExpanded)}
                  className="text-indigo-600 font-bold text-sm hover:underline"
                >
                  {problemExpanded ? 'Thu gọn' : 'Xem thêm...'}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              disabled={exerciseIndex <= 0}
              onClick={prevEx}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ArrowLeft className="w-4 h-4" /> Bài trước
            </button>
            <span className="text-sm font-semibold text-slate-500">
              {exerciseIndex + 1} / {totalEx || 1}
            </span>
            <button
              type="button"
              disabled={exerciseIndex >= totalEx - 1}
              onClick={nextEx}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none"
            >
              Bài tiếp theo <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <MindMapTeacherPanel
            problem={current.problem}
            setProblem={() => {}}
            sharedMindMapImageUrl={current.sharedMindMapImageUrl ?? null}
            setSharedMindMapImageUrl={() => {}}
            logicTrees={current.logicTrees || []}
            setLogicTrees={() => {}}
            isTeacherMode={false}
            hideProblemSection
          />
        </>
      )}
    </div>
  );
}
