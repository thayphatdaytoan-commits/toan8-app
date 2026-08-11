/* eslint-disable */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  COLLECTION_COMMUNITY_QUESTIONS,
  COLLECTION_CONTEST_NEWS,
  COLLECTION_CONTEST_SUBMISSIONS,
  COLLECTION_SCORES,
  COLLECTION_WEEKLY_CONTESTS,
  db,
  ensureAnonymousAuth,
} from '../firebaseClient';
import { getContestGradeOption, slugifyContestTitle } from './contestPoints';
import { WEEKLY_CONTESTS } from './weeklyContestData';

async function ready() {
  try {
    await ensureAnonymousAuth();
  } catch {
    /* ignore */
  }
}

function mapQuestion(id, d) {
  return {
    id,
    grade: d.grade_level || d.grade || '9',
    subject: d.subject || 'Toán',
    content: d.content || '',
    author: d.author_name || d.author || 'Học sinh',
    authorClass: d.author_class || '',
    createdAt: Number(d.created_at || d.createdAt || 0),
    tags: Array.isArray(d.tags) ? d.tags : [],
    answers: Array.isArray(d.answers) ? d.answers : [],
    status: d.status || 'open',
  };
}

export function subscribeCommunityQuestions(onData, onError) {
  const q = query(collection(db, COLLECTION_COMMUNITY_QUESTIONS), orderBy('created_at', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((x) => mapQuestion(x.id, x.data() || {}));
      onData(list);
    },
    (err) => {
      console.error(err);
      onError?.(err);
      onData([]);
    }
  );
}

export async function createCommunityQuestionFs({
  grade,
  subject,
  content,
  authorName,
  authorClass = '',
}) {
  await ready();
  const text = String(content || '').trim();
  if (!text) throw new Error('Nhập nội dung câu hỏi');
  if (!String(authorName || '').trim()) throw new Error('Cần đăng nhập để đặt câu hỏi');
  const g = String(grade || '9');
  const payload = {
    grade_level: g,
    subject: String(subject || 'Toán'),
    content: text,
    author_name: String(authorName).trim(),
    author_class: String(authorClass || ''),
    tags: ['#Hỏi cộng đồng', `#Toán ${g}`],
    answers: [],
    status: 'open',
    created_at: Date.now(),
    updated_at: Date.now(),
  };
  const ref = await addDoc(collection(db, COLLECTION_COMMUNITY_QUESTIONS), payload);
  return { id: ref.id, ...mapQuestion(ref.id, payload) };
}

export async function addCommunityAnswerWithList(questionId, currentAnswers, answer) {
  await ready();
  const text = String(answer.content || '').trim();
  if (!text) throw new Error('Nhập nội dung trả lời');
  const item = {
    id: `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    author: String(answer.authorName || '').trim(),
    authorClass: String(answer.authorClass || ''),
    badge: answer.isTeacher ? 'GV' : '',
    content: text,
    createdAt: Date.now(),
  };
  const next = [...(currentAnswers || []), item];
  await updateDoc(doc(db, COLLECTION_COMMUNITY_QUESTIONS, questionId), {
    answers: next,
    status: 'answered',
    updated_at: Date.now(),
  });
  return item;
}

export async function deleteCommunityQuestionFs(questionId) {
  await ready();
  await deleteDoc(doc(db, COLLECTION_COMMUNITY_QUESTIONS, questionId));
}

export function formatQaTime(ts) {
  try {
    const d = new Date(ts);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${day} tháng ${month} lúc ${hh}:${mm}`;
  } catch {
    return '';
  }
}

/* —— Contests —— */

function mapContest(id, d) {
  return {
    id,
    slug: d.slug || id,
    title: d.title || '',
    excerpt: d.excerpt || '',
    thumbnail: d.thumbnail || '/contest-thumb-1.svg',
    author: d.author || 'Thầy Phát',
    publishedAt: d.published_at || d.publishedAt || new Date().toISOString(),
    bodyIntro: d.body_intro || d.bodyIntro || '',
    bodyHtml: d.body_html || d.bodyHtml || '',
    grid: d.grid || null,
    rules: Array.isArray(d.rules) ? d.rules : [],
    outro: d.outro || '',
    status: d.status || 'published',
    createdAt: Number(d.created_at || 0),
    updatedAt: Number(d.updated_at || 0),
  };
}

export function subscribeWeeklyContests(onData, onError) {
  const q = query(collection(db, COLLECTION_WEEKLY_CONTESTS), orderBy('published_at', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((x) => mapContest(x.id, x.data() || {})));
    },
    (err) => {
      console.error(err);
      onError?.(err);
      onData([]);
    }
  );
}

export async function seedWeeklyContestsIfEmpty(existingCount) {
  if (existingCount > 0) return;
  await ready();
  for (const c of WEEKLY_CONTESTS) {
    await setDoc(doc(db, COLLECTION_WEEKLY_CONTESTS, c.id), {
      slug: c.slug,
      title: c.title,
      excerpt: c.excerpt,
      thumbnail: c.thumbnail,
      author: c.author,
      published_at: c.publishedAt,
      body_intro: c.bodyIntro,
      body_html: '',
      grid: c.grid || null,
      rules: c.rules || [],
      outro: c.outro || '',
      status: 'published',
      created_at: Date.now(),
      updated_at: Date.now(),
    });
  }
}

export async function saveWeeklyContestFs(contest) {
  await ready();
  const id = contest.id || `ct_${Date.now().toString(36)}`;
  const slug = contest.slug || slugifyContestTitle(contest.title);
  const payload = {
    slug,
    title: String(contest.title || '').trim() || 'Đố vui mới',
    excerpt: String(contest.excerpt || ''),
    thumbnail: contest.thumbnail || '/contest-thumb-1.svg',
    author: contest.author || 'Thầy Phát',
    published_at: contest.publishedAt || new Date().toISOString(),
    body_intro: contest.bodyIntro || '',
    body_html: contest.bodyHtml || contest.bodyIntro || '',
    grid: contest.grid || null,
    rules: Array.isArray(contest.rules) ? contest.rules : [],
    outro: contest.outro || '',
    status: contest.status || 'published',
    updated_at: Date.now(),
    created_at: contest.createdAt || Date.now(),
  };
  await setDoc(doc(db, COLLECTION_WEEKLY_CONTESTS, id), payload, { merge: true });
  return mapContest(id, payload);
}

export async function deleteWeeklyContestFs(id) {
  await ready();
  await deleteDoc(doc(db, COLLECTION_WEEKLY_CONTESTS, id));
}

function mapSubmission(id, d) {
  return {
    id,
    contestId: d.contest_id || '',
    contestTitle: d.contest_title || '',
    studentName: d.student_name || '',
    studentClass: d.student_class || '',
    gradeLevel: d.grade_level || '',
    content: d.content || '',
    status: d.status || 'pending',
    gradeId: d.grade_id || '',
    points: Number(d.points || 0),
    scoreDocId: d.score_doc_id || '',
    createdAt: Number(d.created_at || 0),
    gradedAt: Number(d.graded_at || 0),
  };
}

export function subscribeContestSubmissions(onData, onError) {
  const q = query(collection(db, COLLECTION_CONTEST_SUBMISSIONS), orderBy('created_at', 'desc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((x) => mapSubmission(x.id, x.data() || {}))),
    (err) => {
      console.error(err);
      onError?.(err);
      onData([]);
    }
  );
}

export async function submitContestWorkFs({
  contestId,
  contestTitle,
  studentName,
  studentClass,
  gradeLevel,
  content,
}) {
  await ready();
  const text = String(content || '').trim();
  if (!text) throw new Error('Nhập bài làm của em');
  if (!String(studentName || '').trim()) throw new Error('Cần đăng nhập để gửi bài');
  const payload = {
    contest_id: contestId,
    contest_title: contestTitle || '',
    student_name: String(studentName).trim(),
    student_class: String(studentClass || ''),
    grade_level: String(gradeLevel || ''),
    content: text,
    status: 'pending',
    grade_id: '',
    points: 0,
    created_at: Date.now(),
  };
  const ref = await addDoc(collection(db, COLLECTION_CONTEST_SUBMISSIONS), payload);
  return mapSubmission(ref.id, payload);
}

export async function gradeContestSubmissionFs(submission, gradeId) {
  await ready();
  const opt = getContestGradeOption(gradeId);
  const scoreDocId =
    submission.scoreDocId ||
    `contest_${submission.contestId}_${submission.id}`.replace(/[^a-zA-Z0-9_]/g, '_');

  await updateDoc(doc(db, COLLECTION_CONTEST_SUBMISSIONS, submission.id), {
    status: 'graded',
    grade_id: opt.id,
    points: opt.points,
    score_doc_id: scoreDocId,
    graded_at: Date.now(),
  });

  // Cộng vào điểm tích lũy hệ thống (math_quiz_scores_v2)
  if (opt.points > 0 || opt.score > 0) {
    await setDoc(doc(db, COLLECTION_SCORES, scoreDocId), {
      name: submission.studentName,
      className: submission.studentClass || '',
      quizId: `weekly_contest_${submission.contestId}`,
      grade_level: submission.gradeLevel || '8',
      quizTitle: `Đố vui: ${submission.contestTitle || ''}`.trim(),
      score: opt.score,
      exp_points: opt.points,
      kind: 'weekly_contest',
      contest_grade: opt.id,
      timestamp: Date.now(),
    });
  } else if (submission.scoreDocId) {
    try {
      await deleteDoc(doc(db, COLLECTION_SCORES, scoreDocId));
    } catch {
      /* ignore */
    }
  }

  return opt;
}

/* —— News / blog —— */

function mapNews(id, d) {
  return {
    id,
    title: d.title || '',
    excerpt: d.excerpt || '',
    thumbnail: d.thumbnail || '/contest-thumb-2.svg',
    publishedAt: d.published_at || new Date().toISOString(),
    enabled: d.enabled !== false,
  };
}

export function subscribeContestNews(onData, onError) {
  const q = query(collection(db, COLLECTION_CONTEST_NEWS), orderBy('published_at', 'desc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((x) => mapNews(x.id, x.data() || {}))),
    (err) => {
      console.error(err);
      onError?.(err);
      onData([]);
    }
  );
}

export async function saveContestNewsFs(item) {
  await ready();
  const id = item.id || `news_${Date.now().toString(36)}`;
  const payload = {
    title: String(item.title || '').trim() || 'Tin mới',
    excerpt: String(item.excerpt || ''),
    thumbnail: item.thumbnail || '/contest-thumb-2.svg',
    published_at: item.publishedAt || new Date().toISOString(),
    enabled: item.enabled !== false,
    updated_at: Date.now(),
  };
  await setDoc(doc(db, COLLECTION_CONTEST_NEWS, id), payload, { merge: true });
  return mapNews(id, payload);
}

export async function deleteContestNewsFs(id) {
  await ready();
  await deleteDoc(doc(db, COLLECTION_CONTEST_NEWS, id));
}

export function startOfWeekMs(now = Date.now()) {
  const d = new Date(now);
  const day = d.getDay(); // 0 CN
  const diff = day === 0 ? 6 : day - 1; // tuần bắt đầu Thứ 2
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d.getTime();
}
