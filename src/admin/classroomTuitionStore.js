/* eslint-disable */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  COLLECTION_CLASS_ATTENDANCE,
  COLLECTION_CLASS_TUITION,
  COLLECTION_CLASS_TUITION_SETTINGS,
  db,
  ensureAnonymousAuth,
  storage,
} from '../firebaseClient';
import { compressImageFileToJpegBlob } from '../adminImageUpload';
import { currentMonthKey } from './receiptDownload';

export const TUITION_SETTINGS_DOC_ID = 'main';

async function ready() {
  try {
    await ensureAnonymousAuth();
  } catch {
    /* ignore */
  }
}

export function subscribeTuitionSettings(onData, onError) {
  const ref = doc(db, COLLECTION_CLASS_TUITION_SETTINGS, TUITION_SETTINGS_DOC_ID);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData({ bank_qr_url: '' });
        return;
      }
      onData({ id: snap.id, ...(snap.data() || {}) });
    },
    (err) => {
      console.error(err);
      onError?.(err);
      onData({ bank_qr_url: '' });
    }
  );
}

export async function saveTuitionSettings(payload) {
  await ready();
  const data = {
    bank_qr_url: String(payload.bank_qr_url || '').trim(),
    updated_at: Date.now(),
  };
  await setDoc(doc(db, COLLECTION_CLASS_TUITION_SETTINGS, TUITION_SETTINGS_DOC_ID), data, {
    merge: true,
  });
  return data;
}

/** Upload ảnh QR ngân hàng lên Storage rồi lưu URL vào settings. */
export async function uploadBankQrImage(file) {
  if (!file || !storage) throw new Error('Không có file hoặc Storage.');
  await ready();
  const blob = await compressImageFileToJpegBlob(file, { maxEdge: 900, quality: 0.9 });
  const path = `site-content/bank_qr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const r = storageRef(storage, path);
  await uploadBytes(r, blob, { contentType: 'image/jpeg' });
  const url = await getDownloadURL(r);
  await saveTuitionSettings({ bank_qr_url: url });
  return url;
}

export function tuitionDocId(studentId, monthKey) {
  const s = String(studentId || 'x').replace(/[^\w.-]/g, '_');
  const m = String(monthKey || currentMonthKey()).trim();
  return `${s}_${m}`;
}

export function subscribeTuitionMonth(monthKey, onData, onError) {
  const mk = String(monthKey || currentMonthKey()).trim();
  const q = query(collection(db, COLLECTION_CLASS_TUITION), where('month_key', '==', mk));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
      rows.sort((a, b) => String(a.student_name || '').localeCompare(String(b.student_name || ''), 'vi'));
      onData(rows);
    },
    (err) => {
      console.error(err);
      onError?.(err);
      onData([]);
    }
  );
}

function sanitizeTuition(payload) {
  const extras = Array.isArray(payload.extras)
    ? payload.extras
        .map((e) => ({
          label: String(e.label || '').trim(),
          amount: Number(e.amount) || 0,
        }))
        .filter((e) => e.label)
    : [];
  const feeMode = payload.fee_mode === 'month' ? 'month' : 'session';
  const feePerSession = Number(payload.fee_per_session) || 0;
  const monthlyFee = Number(payload.monthly_fee) || 0;
  const sessionCount = Math.max(0, Number(payload.session_count) || 0);
  const extrasTotal = extras.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const base = feeMode === 'month' ? monthlyFee : feePerSession * sessionCount;
  const total = Number(payload.total);
  return {
    student_id: String(payload.student_id || '').trim(),
    student_name: String(payload.student_name || '').trim(),
    class_id: String(payload.class_id || '').trim() || 'other',
    grade_level: String(payload.grade_level || '').trim(),
    month_key: String(payload.month_key || currentMonthKey()).trim(),
    fee_mode: feeMode,
    fee_per_session: feePerSession,
    monthly_fee: monthlyFee,
    session_count: sessionCount,
    attended_dates: Array.isArray(payload.attended_dates)
      ? payload.attended_dates.map(String)
      : [],
    extras,
    total: Number.isFinite(total) ? total : base + extrasTotal,
    status: payload.status === 'paid' ? 'paid' : 'unpaid',
    teacher_note: String(payload.teacher_note || '').trim(),
    payment_note: String(payload.payment_note || '').trim(),
    updated_at: Date.now(),
  };
}

export function computeTuitionTotal(payload) {
  const feeMode = payload.fee_mode === 'month' ? 'month' : 'session';
  const base =
    feeMode === 'month'
      ? Number(payload.monthly_fee) || 0
      : (Number(payload.fee_per_session) || 0) * (Number(payload.session_count) || 0);
  const extras = Array.isArray(payload.extras) ? payload.extras : [];
  const extrasTotal = extras.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  return base + extrasTotal;
}

export async function saveTuitionReceipt(payload, existingId = '') {
  await ready();
  const data = sanitizeTuition(payload);
  const id = existingId || tuitionDocId(data.student_id, data.month_key);
  await setDoc(doc(db, COLLECTION_CLASS_TUITION, id), data, { merge: true });
  return { id, ...data };
}

export async function deleteTuitionReceipt(id) {
  if (!id) return;
  await ready();
  await deleteDoc(doc(db, COLLECTION_CLASS_TUITION, id));
}

/** Lấy điểm danh của lớp trong tháng → số buổi đi học + danh sách ngày. */
export async function fetchAttendanceForMonth({ classId, studentId, monthKey }) {
  await ready();
  const mk = String(monthKey || currentMonthKey()).trim();
  const cid = String(classId || '').trim();
  if (!cid || !mk) {
    return { sessionCount: 0, attendedDates: [], absentDates: [] };
  }

  let snap;
  try {
    const q = query(collection(db, COLLECTION_CLASS_ATTENDANCE), where('class_id', '==', cid));
    snap = await getDocs(q);
  } catch (e) {
    console.error(e);
    return { sessionCount: 0, attendedDates: [], absentDates: [] };
  }

  const attendedDates = [];
  const absentDates = [];
  let sessionCount = 0;
  const sid = String(studentId || '');

  snap.docs.forEach((d) => {
    const data = d.data() || {};
    const date = String(data.date || '');
    if (!date.startsWith(mk)) return;
    const st = data.records?.[sid];
    if (st === 'present' || st === 'late') {
      sessionCount += 1;
      const [, mm, dd] = date.split('-');
      if (mm && dd) attendedDates.push(`${dd}/${mm}`);
    } else if (st === 'absent' || st === 'excused') {
      const [, mm, dd] = date.split('-');
      if (mm && dd) absentDates.push(`${dd}/${mm}`);
    }
  });

  return { sessionCount, attendedDates, absentDates };
}
