/* eslint-disable */
import { doc, onSnapshot, setDoc, addDoc, collection } from 'firebase/firestore';
import {
  COLLECTION_SCORES,
  COLLECTION_STUDENT_LEVEL_CONFIG,
  db,
  ensureAnonymousAuth,
} from './firebaseClient';
import {
  DEFAULT_LEVEL_THRESHOLDS,
  LEVEL_CONFIG_DOC_ID,
  normalizeLevelThresholds,
} from './studentLevelConfig';
import { expPointsFromScoreRow, countsTowardAverageScore, normStudentName } from './classroomConstants';

async function ready() {
  try {
    await ensureAnonymousAuth();
  } catch {
    /* ignore */
  }
}

export function subscribeLevelConfig(onData, onError) {
  const ref = doc(db, COLLECTION_STUDENT_LEVEL_CONFIG, LEVEL_CONFIG_DOC_ID);
  return onSnapshot(
    ref,
    (snap) => {
      const d = snap.exists() ? snap.data() || {} : {};
      onData({
        thresholds: normalizeLevelThresholds(d.thresholds),
        updatedAt: Number(d.updated_at || 0),
      });
    },
    (err) => {
      console.error(err);
      onError?.(err);
      onData({ thresholds: DEFAULT_LEVEL_THRESHOLDS.map((x) => ({ ...x })), updatedAt: 0 });
    }
  );
}

export async function saveLevelConfigFs(thresholds) {
  await ready();
  const list = normalizeLevelThresholds(thresholds);
  await setDoc(
    doc(db, COLLECTION_STUDENT_LEVEL_CONFIG, LEVEL_CONFIG_DOC_ID),
    { thresholds: list, updated_at: Date.now() },
    { merge: true }
  );
  return list;
}

/** Tổng EXP theo tên (khớp name trên điểm) */
export function totalExpForStudent(scoresList, studentName, grade = '') {
  const key = normStudentName(studentName);
  if (!key) return 0;
  const g = String(grade || '').trim();
  let sum = 0;
  for (const s of scoresList || []) {
    if (normStudentName(s?.name) !== key) continue;
    const sg = String(s?.grade_level ?? '').trim();
    if (g && g !== 'ALL' && sg && sg !== g) continue;
    sum += expPointsFromScoreRow(s);
  }
  return sum;
}

/** Ghi dòng điều chỉnh EXP (âm/dương) */
export async function writeExpAdjustmentFs({
  studentName,
  gradeLevel,
  className = '',
  deltaExp,
  note = '',
}) {
  await ready();
  const name = String(studentName || '').trim();
  if (!name) throw new Error('Thiếu tên học sinh');
  const delta = Math.round(Number(deltaExp) || 0);
  if (!delta) return null;
  const payload = {
    name,
    className: className || '',
    quizId: `exp_adjust_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    grade_level: String(gradeLevel || '').trim() || '',
    quizTitle: note || (delta > 0 ? 'Điều chỉnh EXP (+Level)' : 'Điều chỉnh EXP (−Level)'),
    score: 0,
    exp_points: delta,
    kind: 'exp_adjust',
    time: '0 giây',
    essayImages: {},
    answers: {},
    timestamp: Date.now(),
  };
  const ref = await addDoc(collection(db, COLLECTION_SCORES), payload);
  return { id: ref.id, ...payload };
}

export function displayLoginName(student, fallbackName = '') {
  const u = String(student?.username || student?.email || '').trim();
  if (u) return u;
  return String(fallbackName || student?.name || '').trim() || '—';
}
