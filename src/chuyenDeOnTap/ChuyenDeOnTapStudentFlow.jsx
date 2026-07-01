/* eslint-disable */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronRight, Map as MapIcon, Sparkles } from 'lucide-react';
import { buildTopicSteps } from './chuyenDeOnTapTopicSteps';
import { findReviewProgressForTopic } from './chuyenDeOnTapProgressFirestore';
import ChuyenDeOnTapProgressMap from './ChuyenDeOnTapProgressMap';
import ChuyenDeOnTapStepView from './ChuyenDeOnTapStepView';

function filterCoursesForGrade(list, grade) {
  const g = String(grade || '').trim();
  return (list || []).filter((c) => !c.grade_level || c.grade_level === g);
}

function clampIdx(n, max) {
  const m = Math.max(0, max);
  return Math.min(Math.max(0, Number(n) || 0), m);
}

export default function ChuyenDeOnTapStudentFlow({
  reviewCoursesList = [],
  reviewProgressList = [],
  rosterGrade,
  onSelectQuiz,
  studentName = '',
  onReviewOnTapExp,
  onSaveReviewProgress,
  onImmersiveChange,
  onBeforeNavigate,
  navBridgeRef,
}) {
  const courses = useMemo(() => filterCoursesForGrade(reviewCoursesList, rosterGrade), [reviewCoursesList, rosterGrade]);

  const topicEntries = useMemo(() => {
    const rows = [];
    for (const c of courses) {
      for (const t of c.topics || []) {
        rows.push({ course: c, topic: t });
      }
    }
    return rows;
  }, [courses]);

  const [courseId, setCourseId] = useState(null);
  const [topicId, setTopicId] = useState(null);
  const [playMode, setPlayMode] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [completedStepIds, setCompletedStepIds] = useState([]);
  const [maxReachableIdx, setMaxReachableIdx] = useState(0);
  const [stepStates, setStepStates] = useState({});

  const hasLocalEditsRef = useRef(false);
  const saveTimerRef = useRef(null);

  const course = useMemo(() => courses.find((c) => c.id === courseId) || null, [courses, courseId]);
  const topic = useMemo(
    () => (course?.topics || []).find((t) => t.id === topicId) || null,
    [course, topicId]
  );

  const steps = useMemo(() => buildTopicSteps(topic), [topic]);

  const immersiveMode = !!topicId && playMode && steps.length > 0;

  useEffect(() => {
    onImmersiveChange?.(immersiveMode);
    return () => onImmersiveChange?.(false);
  }, [immersiveMode, onImmersiveChange]);

  const markLocalEdit = useCallback(() => {
    hasLocalEditsRef.current = true;
  }, []);

  useEffect(() => {
    hasLocalEditsRef.current = false;
    setPlayMode(false);
    setStepIdx(0);
    setCompletedStepIds([]);
    setMaxReachableIdx(0);
    setStepStates({});
  }, [topicId]);

  useEffect(() => {
    if (!topicId || !course?.id || !steps.length) return;
    if (hasLocalEditsRef.current) return;

    const saved = findReviewProgressForTopic(
      reviewProgressList,
      studentName,
      rosterGrade,
      course.id,
      topicId
    );
    if (!saved) return;

    const lastStep = steps.length - 1;
    const maxR = clampIdx(saved.max_reachable_idx, lastStep);
    const idx = clampIdx(saved.step_index, maxR);
    const validCompleted = (saved.completed_step_ids || []).filter((id) => steps.some((s) => s.id === id));

    setStepIdx(idx);
    setMaxReachableIdx(maxR);
    setCompletedStepIds(validCompleted);
    setStepStates(saved.step_states || {});
  }, [topicId, course?.id, steps, reviewProgressList, studentName, rosterGrade]);

  const queueSaveProgress = useCallback(
    (patch) => {
      if (!onSaveReviewProgress || !String(studentName || '').trim() || !course?.id || !topic?.id) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        onSaveReviewProgress({
          name: studentName,
          grade_level: rosterGrade,
          course_id: course.id,
          topic_id: topic.id,
          step_index: patch.step_index ?? stepIdx,
          max_reachable_idx: patch.max_reachable_idx ?? maxReachableIdx,
          completed_step_ids: patch.completed_step_ids ?? completedStepIds,
          step_states: patch.step_states ?? stepStates,
        });
      }, 450);
    },
    [
      onSaveReviewProgress,
      studentName,
      rosterGrade,
      course?.id,
      topic?.id,
      stepIdx,
      maxReachableIdx,
      completedStepIds,
      stepStates,
    ]
  );

  useEffect(() => {
    if (!topicId || !course?.id || !topic?.id) return;
    if (!hasLocalEditsRef.current) return;
    queueSaveProgress({});
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [topicId, course?.id, topic?.id, stepIdx, maxReachableIdx, completedStepIds, stepStates, queueSaveProgress]);

  const handleAwardExp = useCallback(
    async (payload) => {
      if (!String(studentName || '').trim() || !onReviewOnTapExp || !course?.id || !topic?.id) return;
      await onReviewOnTapExp({
        courseId: course.id,
        topicId: topic.id,
        ...payload,
      });
    },
    [studentName, onReviewOnTapExp, course?.id, topic?.id]
  );

  const markStepComplete = useCallback(
    (stepId) => {
      if (!stepId) return;
      markLocalEdit();
      setCompletedStepIds((prev) => (prev.includes(stepId) ? prev : [...prev, stepId]));
    },
    [markLocalEdit]
  );

  const handleStepStateChange = useCallback(
    (stepId, partial) => {
      if (!stepId) return;
      markLocalEdit();
      setStepStates((prev) => ({
        ...prev,
        [stepId]: { ...(prev[stepId] || {}), ...partial },
      }));
    },
    [markLocalEdit]
  );

  const openTopicEntry = (c, t) => {
    onBeforeNavigate?.();
    setCourseId(c.id);
    setTopicId(t.id);
    setPlayMode(false);
    setStepIdx(0);
  };

  const closeTopic = () => {
    setTopicId(null);
    setCourseId(null);
    setPlayMode(false);
    setStepIdx(0);
  };

  const backToMap = () => {
    setPlayMode(false);
  };

  useEffect(() => {
    if (!navBridgeRef) return undefined;
    navBridgeRef.current = {
      getState: () => ({
        courseId,
        topicId,
        playMode,
        stepIdx,
        maxReachableIdx,
        completedStepIds,
        stepStates,
      }),
      restore: (s) => {
        if (!s?.topicId) {
          setCourseId(null);
          setTopicId(null);
          setPlayMode(false);
          setStepIdx(0);
          setMaxReachableIdx(0);
          setCompletedStepIds([]);
          setStepStates({});
          return;
        }
        setCourseId(s.courseId ?? null);
        setTopicId(s.topicId ?? null);
        setPlayMode(!!s.playMode);
        setStepIdx(s.stepIdx ?? 0);
        setMaxReachableIdx(s.maxReachableIdx ?? 0);
        setCompletedStepIds(Array.isArray(s.completedStepIds) ? s.completedStepIds : []);
        setStepStates(s.stepStates && typeof s.stepStates === 'object' ? s.stepStates : {});
      },
    };
    return () => {
      navBridgeRef.current = null;
    };
  }, [
    navBridgeRef,
    courseId,
    topicId,
    playMode,
    stepIdx,
    maxReachableIdx,
    completedStepIds,
    stepStates,
  ]);

  const startStep = (i) => {
    if (i < 0 || i >= steps.length) return;
    onBeforeNavigate?.();
    markLocalEdit();
    setStepIdx(i);
    setMaxReachableIdx((m) => Math.max(m, i));
    setPlayMode(true);
  };

  const handleStepPrev = () => {
    markLocalEdit();
    if (stepIdx <= 0) backToMap();
    else setStepIdx((i) => i - 1);
  };

  const handleStepNext = () => {
    markLocalEdit();
    const cur = steps[stepIdx];
    if (cur?.id) markStepComplete(cur.id);
    if (stepIdx >= steps.length - 1) {
      setPlayMode(false);
    } else {
      const next = stepIdx + 1;
      setStepIdx(next);
      setMaxReachableIdx((m) => Math.max(m, next));
    }
  };

  const handleGoToStep = (i) => {
    if (i < 0 || i > maxReachableIdx || i >= steps.length) return;
    markLocalEdit();
    setStepIdx(i);
  };

  const handleStepComplete = useCallback(
    (stepId) => {
      markStepComplete(stepId);
      setMaxReachableIdx((m) => Math.max(m, stepIdx + 1));
    },
    [markStepComplete, stepIdx]
  );

  if (!courses.length || !topicEntries.length) {
    return null;
  }

  if (!topic) {
    return (
      <div className="w-full mb-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
            <MapIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-xl md:text-2xl font-black text-slate-900">Chuyên đề ôn thi</h2>
            <p className="text-sm text-slate-500 font-semibold">
              Chọn chuyên đề — vào thẳng lộ trình Nền tảng · Luyện tập · Nâng cao · Thử thách.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {topicEntries.map(({ course: c, topic: t }, i) => {
            const nSteps = buildTopicSteps(t).length;
            const nQ = t.questions?.length || 0;
            const saved = findReviewProgressForTopic(
              reviewProgressList,
              studentName,
              rosterGrade,
              c.id,
              t.id
            );
            const pct =
              saved && nSteps > 0
                ? Math.round(((saved.completed_step_ids || []).length / nSteps) * 100)
                : 0;
            return (
              <button
                key={`${c.id}_${t.id}`}
                type="button"
                onClick={() => openTopicEntry(c, t)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 text-left transition-colors shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black uppercase tracking-widest text-indigo-600 truncate">{c.title}</p>
                  <p className="font-bold text-base text-slate-800 truncate">{t.title}</p>
                  <p className="text-sm text-slate-500">
                    {nQ} câu · {(t.examples || []).length || (t.example ? 1 : 0)} ví dụ
                    {saved ? ` · đã làm ${pct}%` : ''}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (!steps.length) {
    return (
      <div className="w-full mb-10 rounded-3xl border border-amber-200 bg-amber-50/80 p-6 text-center">
        <p className="text-sm font-bold text-amber-900 mb-3">Chủ đề chưa có nội dung bước nào (lý thuyết / ví dụ / câu).</p>
        <button type="button" onClick={closeTopic} className="text-sm font-bold text-indigo-600 underline">
          ← Quay lại danh sách chuyên đề
        </button>
      </div>
    );
  }

  if (!playMode) {
    return (
      <div className="w-full mb-10">
        <ChuyenDeOnTapProgressMap
          courseTitle={course.title}
          topicTitle={topic.title}
          topic={topic}
          steps={steps}
          completedStepIds={completedStepIds}
          maxReachableIdx={maxReachableIdx}
          currentStepIndex={stepIdx}
          onBack={closeTopic}
          onStartStep={startStep}
          onStartFromBeginning={() => startStep(0)}
        />
      </div>
    );
  }

  const currentStep = steps[stepIdx];
  const currentStepState = currentStep?.id ? stepStates[currentStep.id] : null;

  return (
    <div className={immersiveMode ? 'w-full flex-1 min-h-0 flex flex-col' : 'w-full mb-10'}>
      <ChuyenDeOnTapStepView
        courseTitle={course.title}
        topicTitle={topic.title}
        step={currentStep}
        steps={steps}
        stepIndex={stepIdx}
        totalSteps={steps.length}
        completedStepIds={completedStepIds}
        maxReachableIdx={maxReachableIdx}
        initialStepState={currentStepState}
        onStepStateChange={(partial) => handleStepStateChange(currentStep?.id, partial)}
        onGoToStep={handleGoToStep}
        onStepComplete={handleStepComplete}
        onClose={backToMap}
        onPrev={handleStepPrev}
        onNext={handleStepNext}
        variant="student"
        immersive={immersiveMode}
        enableExp={!!String(studentName || '').trim()}
        onAwardExp={handleAwardExp}
      />
    </div>
  );
}
