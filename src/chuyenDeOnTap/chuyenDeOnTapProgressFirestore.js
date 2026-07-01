import { COLLECTION_REVIEW_PROGRESS } from './chuyenDeOnTapConstants';

export { COLLECTION_REVIEW_PROGRESS };

function normName(s) {
  return String(s || '')
    .trim()
    .toLowerCase();
}

/** Id tài liệu ổn định: 1 học sinh × 1 chủ đề trong 1 khóa. */
export function reviewProgressDocId(studentName, courseId, topicId) {
  const safeName = normName(studentName).replace(/[^a-z0-9_]/gi, '_').slice(0, 48);
  const cid = String(courseId || '').replace(/[/\\]/g, '_').slice(0, 48);
  const tid = String(topicId || '').replace(/[/\\]/g, '_').slice(0, 48);
  return `rev_prog_${safeName}_${cid}_${tid}`.slice(0, 750);
}

/**
 * @param {object} raw — từ Firestore
 * @returns {object|null}
 */
export function parseReviewProgressDoc(raw) {
  if (!raw) return null;
  const stepStates = raw.step_states && typeof raw.step_states === 'object' ? raw.step_states : {};
  return {
    id: raw.id,
    name: String(raw.name || ''),
    grade_level: String(raw.grade_level || ''),
    course_id: String(raw.course_id || ''),
    topic_id: String(raw.topic_id || ''),
    step_index: Number(raw.step_index) || 0,
    max_reachable_idx: Number(raw.max_reachable_idx) || 0,
    completed_step_ids: Array.isArray(raw.completed_step_ids) ? raw.completed_step_ids.map(String) : [],
    step_states: stepStates,
    updated_at: Number(raw.updated_at) || 0,
  };
}

export function findReviewProgressForTopic(progressList, studentName, rosterGrade, courseId, topicId) {
  const me = normName(studentName);
  const g = String(rosterGrade || '').trim();
  const cid = String(courseId || '');
  const tid = String(topicId || '');
  if (!me || !cid || !tid) return null;
  const row = (progressList || []).find((p) => {
    if (normName(p?.name) !== me) return false;
    const pg = String(p?.grade_level ?? '').trim();
    if (pg && g && pg !== g) return false;
    return String(p?.course_id || '') === cid && String(p?.topic_id || '') === tid;
  });
  return row ? parseReviewProgressDoc(row) : null;
}

/** Chuẩn hóa trước khi ghi Firestore. */
export function sanitizeReviewProgressPayload(payload, { updatedAt = Date.now() } = {}) {
  const ss = payload?.step_states && typeof payload.step_states === 'object' ? payload.step_states : {};
  const cleanStates = {};
  for (const [k, v] of Object.entries(ss)) {
    if (!v || typeof v !== 'object') continue;
    cleanStates[String(k).slice(0, 120)] = {
      checked: !!v.checked,
      was_correct: !!v.was_correct,
      wrong_attempts: Math.max(0, Math.min(99, Number(v.wrong_attempts) || 0)),
      fill_answer: String(v.fill_answer ?? '').slice(0, 500),
      mcq_pick: v.mcq_pick == null ? '' : String(v.mcq_pick).slice(0, 8),
      show_solution: !!v.show_solution,
      show_example_answer: !!v.show_example_answer,
    };
  }
  return {
    name: String(payload?.name || '').trim(),
    grade_level: String(payload?.grade_level || '').trim(),
    course_id: String(payload?.course_id || ''),
    topic_id: String(payload?.topic_id || ''),
    step_index: Math.max(0, Number(payload?.step_index) || 0),
    max_reachable_idx: Math.max(0, Number(payload?.max_reachable_idx) || 0),
    completed_step_ids: Array.isArray(payload?.completed_step_ids)
      ? payload.completed_step_ids.map((x) => String(x)).slice(0, 200)
      : [],
    step_states: cleanStates,
    updated_at: updatedAt,
  };
}
