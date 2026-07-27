import { computeLessonStudyProgress } from './lessonProgress';
import { normalizeExamType, examTypeLabel, EXAM_TYPE } from './quizExamTypes';
import { formatSgkChapterHeading, getSgkChapters } from './sgkToc';
import {
  normStudentName,
  expPointsFromScoreRow,
  averageNumericScore,
  formatScoreTimestamp,
  normalizeStudentClassId,
  CLASS_OTHER_ID,
} from './classroomConstants';

export function filterStudentsByGrade(students, activeGrade) {
  const list = Array.isArray(students) ? students : [];
  if (!activeGrade || activeGrade === 'ALL') return list;
  return list.filter((s) => String(s.grade_level || '8') === String(activeGrade));
}

export function filterScoresByGrade(scores, activeGrade) {
  const list = Array.isArray(scores) ? scores : [];
  if (!activeGrade || activeGrade === 'ALL') return list;
  return list.filter((s) => String(s.grade_level || '8') === String(activeGrade));
}

export function groupStudentsByClass(students, classes) {
  const map = new Map();
  map.set(CLASS_OTHER_ID, []);
  (classes || []).forEach((c) => {
    if (c?.id) map.set(c.id, []);
  });
  (students || []).forEach((s) => {
    const cid = normalizeStudentClassId(s);
    if (!map.has(cid)) map.set(cid, []);
    map.get(cid).push(s);
  });
  return map;
}

export function buildClassFolderRows(classes, studentsByClass) {
  const rows = (classes || []).map((c) => ({
    id: c.id,
    label: c.name || 'Lớp',
    isOther: false,
    students: studentsByClass.get(c.id) || [],
  }));
  rows.sort((a, b) => a.label.localeCompare(b.label, 'vi'));
  rows.push({
    id: CLASS_OTHER_ID,
    label: 'Khác',
    isOther: true,
    students: studentsByClass.get(CLASS_OTHER_ID) || [],
  });
  return rows;
}

function lessonPracticeTitle(lessonId, lessonsList) {
  const lesson = (lessonsList || []).find((l) => l.id === lessonId);
  return lesson?.title ? `Bài tập luyện tập — ${lesson.title}` : 'Bài tập luyện tập';
}

function quizMetaLabel(quiz) {
  if (!quiz) return '';
  const et = normalizeExamType(quiz.exam_type, quiz.grade_level);
  const base = examTypeLabel(et, quiz.grade_level);
  if (et === EXAM_TYPE.lesson && quiz.chapter) {
    const ch = String(quiz.chapter).trim();
    const le = String(quiz.lesson_no || '').trim();
    return `${base} · Chương ${ch}${le ? ` · Bài ${le}` : ''}`;
  }
  return base;
}

/** Danh sách bài / đề để chế độ quản lí theo bài tập. */
export function buildAssignmentRows({ quizzes, scores, lessons, filters = {} }) {
  const { examType = '', chapter = '', lessonNo = '' } = filters;
  const scoreByQuiz = new Map();
  (scores || []).forEach((s) => {
    const qid = String(s?.quizId || '');
    if (!qid) return;
    if (!scoreByQuiz.has(qid)) scoreByQuiz.set(qid, []);
    scoreByQuiz.get(qid).push(s);
  });

  const rows = [];
  const seenQuizIds = new Set();

  (quizzes || []).forEach((q) => {
    const et = normalizeExamType(q.exam_type, q.grade_level);
    if (examType && et !== examType) return;
    const ch = String(q.chapter ?? '').trim();
    const le = String(q.lesson_no ?? '').trim();
    if (chapter && ch !== chapter) return;
    if (lessonNo && le !== lessonNo) return;
    seenQuizIds.add(q.id);
    const attempts = scoreByQuiz.get(q.id) || [];
    rows.push({
      id: q.id,
      kind: 'quiz',
      title: q.title || 'Đề thi',
      subtitle: quizMetaLabel(q),
      exam_type: et,
      chapter: ch,
      lesson_no: le,
      attemptCount: attempts.length,
      latestAt: attempts.reduce((m, s) => Math.max(m, Number(s.timestamp) || 0), 0),
    });
  });

  scoreByQuiz.forEach((attempts, qid) => {
    if (seenQuizIds.has(qid)) return;
    if (!qid.startsWith('lesson_practice_')) return;
    const lessonId = qid.slice('lesson_practice_'.length);
    const lesson = (lessons || []).find((l) => l.id === lessonId);
    const ch = String(lesson?.chapter ?? '').trim();
    const le = String(lesson?.lesson_no ?? '').trim();
    if (examType && examType !== 'lesson_practice') return;
    if (chapter && ch !== chapter) return;
    if (lessonNo && le !== lessonNo) return;
    rows.push({
      id: qid,
      kind: 'lesson_practice',
      title: lessonPracticeTitle(lessonId, lessons),
      subtitle: ch ? `Bài giảng · Chương ${ch}${le ? ` · Bài ${le}` : ''}` : 'Bài giảng',
      exam_type: 'lesson_practice',
      chapter: ch,
      lesson_no: le,
      attemptCount: attempts.length,
      latestAt: attempts.reduce((m, s) => Math.max(m, Number(s.timestamp) || 0), 0),
    });
  });

  return rows.sort((a, b) => (b.latestAt - a.latestAt) || a.title.localeCompare(b.title, 'vi'));
}

export function getScoresForAssignment(scores, assignmentId) {
  return [...(scores || []).filter((s) => String(s.quizId) === String(assignmentId))].sort(
    (a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0)
  );
}

export function buildStudentProfile({
  studentName,
  scores,
  lessons,
  quizzes,
  activeGrade,
}) {
  const name = String(studentName || '').trim();
  const myScores = (scores || [])
    .filter((s) => normStudentName(s.name) === normStudentName(name))
    .sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));

  const gradeLessons = (lessons || []).filter((l) => {
    if (!activeGrade || activeGrade === 'ALL') return true;
    return String(l.grade_level || '8') === String(activeGrade);
  });

  const lessonRows = gradeLessons.map((lesson) => {
    const chapter = String(lesson?.chapter ?? '').trim();
    const lesson_no = String(lesson?.lesson_no ?? '').trim();
    const lessonQuizzes = (quizzes || []).filter((q) => {
      const et = normalizeExamType(q.exam_type, q.grade_level);
      if (et !== EXAM_TYPE.lesson) return false;
      return String(q.chapter ?? '').trim() === chapter && String(q.lesson_no ?? '').trim() === lesson_no;
    });
    const progress = computeLessonStudyProgress(lesson, lessonQuizzes, myScores);
    return {
      id: lesson.id,
      title: lesson.title || 'Bài học',
      chapter,
      lesson_no,
      progress,
    };
  });

  const totalExp = myScores.reduce((sum, s) => sum + expPointsFromScoreRow(s), 0);
  const avgScore = averageNumericScore(myScores);

  return {
    name,
    lessonRows: lessonRows.filter((r) => r.progress > 0).sort((a, b) => b.progress - a.progress),
    allLessons: lessonRows,
    scores: myScores.map((s) => ({
      id: s.id,
      title: s.quizTitle || 'Bài làm',
      score: s.score,
      time: s.time,
      timestamp: s.timestamp,
      formattedAt: formatScoreTimestamp(s.timestamp),
      exp: expPointsFromScoreRow(s),
    })),
    totalExp,
    avgScore,
    attemptCount: myScores.length,
  };
}

export function buildChapterFilterOptions(activeGrade) {
  const opts = [{ value: '', label: 'Tất cả chương' }];
  if (!activeGrade || activeGrade === 'ALL') return opts;
  getSgkChapters(activeGrade).forEach((ch) => {
    opts.push({
      value: ch.no,
      label: formatSgkChapterHeading(activeGrade, ch.no),
    });
  });
  return opts;
}
