import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  Users,
  FileText,
  ArrowLeft,
  Upload,
  MoveRight,
  Phone,
  Mail,
  ClipboardList,
  Eye,
  EyeOff,
  Trophy,
} from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { COLLECTION_STUDENTS, COLLECTION_CLASSES, COLLECTION_TRIAL_REGISTRATIONS } from '../firebaseClient';
import { CLASS_OTHER_ID, formatScoreTimestamp } from '../classroomConstants';
import { EXAM_TYPE } from '../quizExamTypes';
import {
  filterStudentsByGrade,
  filterScoresByGrade,
  groupStudentsByClass,
  buildClassFolderRows,
  buildAssignmentRows,
  getScoresForAssignment,
  buildStudentProfile,
  buildChapterFilterOptions,
} from '../classroomManagement';
import { DEFAULT_LEVEL_THRESHOLDS, levelFromExp } from '../studentLevelConfig';
import { subscribeLevelConfig } from '../studentLevelStore';
import AdminLevelPanel from './AdminLevelPanel';
import AdminAttendancePanel from './AdminAttendancePanel';
import AdminTimetablePanel from './AdminTimetablePanel';
import AdminTuitionPanel from './AdminTuitionPanel';
import AdminFeedbackPanel from './AdminFeedbackPanel';
import AdminHomeworkPanel from './AdminHomeworkPanel';
import {
  canAccessClassroomSubTab,
  filterClassesForStaff,
  filterStudentsForStaff,
} from './adminPermissions';

const EMPTY_STUDENT_FORM = {
  name: '',
  username: '',
  class_label: '',
  school: '',
  phone: '',
  address: '',
  email: '',
  login_password: '',
  province: '',
  ward: '',
  grade_level: '',
  account_type: 'free',
  is_vip: false,
  auth_provider: '',
  notify_zalo: false,
  notify_email: true,
};

function SubTabBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
        active ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

export default function ClassroomManagementPanel({
  db,
  activeGrade,
  studentsList = [],
  classesList = [],
  scoresList = [],
  quizzesList = [],
  lessonsList = [],
  trialRegistrations = [],
  onViewEssayImage,
  staffSession = null,
}) {
  const [subTab, setSubTab] = useState('classes');
  const [preselectClassId, setPreselectClassId] = useState('');
  const [scoresMode, setScoresMode] = useState('assignment');
  const [expandedClassId, setExpandedClassId] = useState(CLASS_OTHER_ID);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [selectedStudentName, setSelectedStudentName] = useState(null);
  const [trialFolderOpen, setTrialFolderOpen] = useState(true);
  const [trialStatusFilter, setTrialStatusFilter] = useState('all');
  const [levelThresholds, setLevelThresholds] = useState(DEFAULT_LEVEL_THRESHOLDS);

  useEffect(() => {
    const unsub = subscribeLevelConfig((cfg) => setLevelThresholds(cfg.thresholds));
    return () => unsub?.();
  }, []);

  useEffect(() => {
    if (!canAccessClassroomSubTab(staffSession, subTab)) {
      setSubTab('classes');
    }
  }, [staffSession, subTab]);

  const goSubTab = (id, extra) => {
    if (!canAccessClassroomSubTab(staffSession, id)) return;
    extra?.();
    setSubTab(id);
  };

  const [showStudentForm, setShowStudentForm] = useState(null);
  const [studentForm, setStudentForm] = useState(EMPTY_STUDENT_FORM);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [bulkText, setBulkText] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [moveStudentId, setMoveStudentId] = useState(null);
  const [showStudentPassword, setShowStudentPassword] = useState(false);

  const [filterExamType, setFilterExamType] = useState('');
  const [filterChapter, setFilterChapter] = useState('');
  const [filterLessonNo, setFilterLessonNo] = useState('');

  const scopedStudents = useMemo(
    () => filterStudentsForStaff(studentsList, staffSession, activeGrade),
    [studentsList, staffSession, activeGrade]
  );
  const scopedClasses = useMemo(
    () => filterClassesForStaff(classesList, staffSession, activeGrade),
    [classesList, staffSession, activeGrade]
  );

  const gradeStudents = useMemo(
    () => filterStudentsByGrade(scopedStudents, activeGrade),
    [scopedStudents, activeGrade]
  );
  const gradeScores = useMemo(
    () => filterScoresByGrade(scoresList, activeGrade),
    [scoresList, activeGrade]
  );
  const gradeQuizzes = useMemo(() => {
    if (!activeGrade || activeGrade === 'ALL') return quizzesList || [];
    return (quizzesList || []).filter((q) => String(q.grade_level || '8') === String(activeGrade));
  }, [quizzesList, activeGrade]);
  const gradeLessons = useMemo(() => {
    if (!activeGrade || activeGrade === 'ALL') return lessonsList || [];
    return (lessonsList || []).filter((l) => String(l.grade_level || '8') === String(activeGrade));
  }, [lessonsList, activeGrade]);

  const classFolders = useMemo(() => {
    const byClass = groupStudentsByClass(gradeStudents, scopedClasses);
    return buildClassFolderRows(scopedClasses, byClass);
  }, [gradeStudents, scopedClasses]);

  const chapterOptions = useMemo(() => buildChapterFilterOptions(activeGrade), [activeGrade]);

  const assignmentRows = useMemo(
    () =>
      buildAssignmentRows({
        quizzes: gradeQuizzes,
        scores: gradeScores,
        lessons: gradeLessons,
        filters: {
          examType: filterExamType,
          chapter: filterChapter,
          lessonNo: filterLessonNo,
        },
      }),
    [gradeQuizzes, gradeScores, gradeLessons, filterExamType, filterChapter, filterLessonNo]
  );

  const selectedAssignmentScores = useMemo(() => {
    if (!selectedAssignmentId) return [];
    return getScoresForAssignment(gradeScores, selectedAssignmentId);
  }, [gradeScores, selectedAssignmentId]);

  const selectedAssignmentMeta = useMemo(
    () => assignmentRows.find((r) => r.id === selectedAssignmentId) || null,
    [assignmentRows, selectedAssignmentId]
  );

  const studentProfile = useMemo(() => {
    if (!selectedStudentName) return null;
    return buildStudentProfile({
      studentName: selectedStudentName,
      scores: gradeScores,
      lessons: gradeLessons,
      quizzes: gradeQuizzes,
      activeGrade,
    });
  }, [selectedStudentName, gradeScores, gradeLessons, gradeQuizzes, activeGrade]);

  const gradeForNew = activeGrade === 'ALL' ? '8' : activeGrade;

  const handleCreateClass = async () => {
    const name = window.prompt('Tên lớp mới (vd. 9A1, 11B2):', '');
    if (!name?.trim()) return;
    await addDoc(collection(db, COLLECTION_CLASSES), {
      name: name.trim(),
      grade_level: gradeForNew,
      created_at: Date.now(),
      updated_at: Date.now(),
    });
  };

  const openAddStudent = (classId) => {
    setEditingStudentId(null);
    setStudentForm({ ...EMPTY_STUDENT_FORM, class_label: '' });
    setShowStudentForm(classId);
  };

  const openEditStudent = (student) => {
    setEditingStudentId(student.id);
    const vip =
      student.is_vip === true ||
      ['vip', 'premium'].includes(String(student.account_type || '').toLowerCase());
    setStudentForm({
      name: student.name || '',
      username: student.username || student.email || '',
      class_label: student.class_label || '',
      school: student.school || '',
      phone: student.phone || '',
      address: student.address || '',
      email: student.email || '',
      login_password: student.login_password || '',
      province: student.province || '',
      ward: student.ward || '',
      grade_level: student.grade_level || gradeForNew,
      account_type: vip ? 'vip' : 'free',
      is_vip: vip,
      auth_provider: student.auth_provider || '',
      notify_zalo: student.notify_zalo === true,
      notify_email: student.notify_email !== false,
    });
    setShowStudentForm(student.class_id || CLASS_OTHER_ID);
    setShowStudentPassword(false);
  };

  const saveStudent = async (e) => {
    e.preventDefault();
    const name = studentForm.name.trim();
    if (!name) return alert('Họ tên là bắt buộc.');
    const username = String(studentForm.username || '').trim().replace(/\s+/g, '');
    const email = (studentForm.email || '').trim().toLowerCase();
    const resolvedUsername = username || email;
    if (resolvedUsername) {
      const taken = (studentsList || []).find((s) => {
        if (editingStudentId && s.id === editingStudentId) return false;
        const u = String(s.username || '').trim().toLowerCase();
        const em = String(s.email || '').trim().toLowerCase();
        const key = resolvedUsername.toLowerCase();
        return u === key || em === key;
      });
      if (taken) return alert('Tên đăng nhập đã trùng với học sinh khác.');
    }
    const isVip = studentForm.is_vip === true || studentForm.account_type === 'vip';
    const payload = {
      name,
      username: resolvedUsername,
      grade_level: (studentForm.grade_level || gradeForNew || '8').toString(),
      class_id: showStudentForm || CLASS_OTHER_ID,
      class_label: (studentForm.class_label || '').trim(),
      school: (studentForm.school || '').trim(),
      phone: (studentForm.phone || '').trim(),
      address: (studentForm.address || '').trim(),
      email,
      login_password: (studentForm.login_password || '').trim(),
      province: (studentForm.province || '').trim(),
      ward: (studentForm.ward || '').trim(),
      account_type: isVip ? 'vip' : 'free',
      is_vip: isVip,
      notify_zalo: Boolean(studentForm.notify_zalo),
      notify_email: Boolean(studentForm.notify_email),
      updated_at: Date.now(),
    };
    if (editingStudentId) {
      await updateDoc(doc(db, COLLECTION_STUDENTS, editingStudentId), payload);
    } else {
      await addDoc(collection(db, COLLECTION_STUDENTS), { ...payload, created_at: Date.now() });
    }
    setShowStudentForm(null);
    setStudentForm(EMPTY_STUDENT_FORM);
    setEditingStudentId(null);
    setShowStudentPassword(false);
  };

  const handleMoveStudent = async (studentId, targetClassId) => {
    if (!studentId || !targetClassId) return;
    await updateDoc(doc(db, COLLECTION_STUDENTS, studentId), {
      class_id: targetClassId,
      updated_at: Date.now(),
    });
    setMoveStudentId(null);
  };

  const handleBulkImport = async () => {
    if (!bulkText.trim()) return;
    const names = bulkText.split('\n').map((n) => n.trim()).filter(Boolean);
    const existing = new Set(gradeStudents.map((s) => (s.name || '').trim().toLowerCase()));
    const unique = [...new Set(names)].filter((n) => !existing.has(n.toLowerCase()));
    await Promise.all(
      unique.map((name) =>
        addDoc(collection(db, COLLECTION_STUDENTS), {
          name,
          grade_level: gradeForNew,
          class_id: CLASS_OTHER_ID,
          created_at: Date.now(),
          updated_at: Date.now(),
        })
      )
    );
    setShowBulkModal(false);
    setBulkText('');
  };

  const displayUsername = (s) => s.username || s.email || '—';
  const displayPassword = (s) => {
    if (s.login_password) return s.login_password;
    if (String(s.auth_provider || '') === 'google.com') return '(Google)';
    return '—';
  };
  const isVipStudent = (s) =>
    s?.is_vip === true || ['vip', 'premium'].includes(String(s?.account_type || '').toLowerCase());

  const renderStudentTable = (folder) => (
    <div className="overflow-x-auto border-t border-slate-100">
      <table className="w-full text-left text-xs md:text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="p-2 font-bold">Họ tên</th>
            <th className="p-2 font-bold">Tên đăng nhập</th>
            <th className="p-2 font-bold hidden md:table-cell">Trường</th>
            <th className="p-2 font-bold hidden lg:table-cell">SĐT</th>
            <th className="p-2 font-bold hidden xl:table-cell">Mật khẩu</th>
            <th className="p-2 font-bold hidden lg:table-cell">Gmail</th>
            <th className="p-2 w-28"></th>
          </tr>
        </thead>
        <tbody>
          {folder.students.length === 0 ? (
            <tr>
              <td colSpan={7} className="p-4 text-center text-slate-400 italic">
                Chưa có học sinh trong lớp này.
              </td>
            </tr>
          ) : (
            folder.students
              .slice()
              .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'))
              .map((s) => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                  <td className="p-2 font-semibold text-slate-800">
                    <span className="inline-flex items-center gap-1.5 flex-wrap">
                      {s.name}
                      {isVipStudent(s) && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          VIP
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="p-2 text-slate-600 font-mono text-[11px] md:text-xs">{displayUsername(s)}</td>
                  <td className="p-2 text-slate-600 hidden md:table-cell">{s.school || '—'}</td>
                  <td className="p-2 text-slate-600 hidden lg:table-cell">{s.phone || '—'}</td>
                  <td className="p-2 text-slate-600 hidden xl:table-cell max-w-[140px] truncate font-mono text-[11px]">
                    {displayPassword(s)}
                  </td>
                  <td className="p-2 text-slate-600 hidden lg:table-cell truncate max-w-[120px]">{s.email || '—'}</td>
                  <td className="p-2">
                    <div className="flex gap-1 justify-end">
                      <button
                        type="button"
                        onClick={() => openEditStudent(s)}
                        className="text-teal-700 text-[11px] font-bold px-2 py-1 rounded bg-teal-50 hover:bg-teal-100"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => setMoveStudentId(s.id)}
                        className="text-indigo-700 text-[11px] font-bold px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100"
                        title="Chuyển lớp"
                      >
                        <MoveRight size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => window.confirm('Xóa học sinh?') && deleteDoc(doc(db, COLLECTION_STUDENTS, s.id))}
                        className="text-red-500 p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderClassesTab = () => (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <p className="text-sm text-slate-500">
          Quản lí lớp học theo khối <strong>{activeGrade === 'ALL' ? 'toàn trường' : `Toán ${activeGrade}`}</strong>.
          Học sinh cũ nằm trong thư mục <strong>Khác</strong>.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="bg-amber-100 text-amber-800 px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-1"
          >
            <Upload size={14} /> Nhập từ Excel
          </button>
          <button
            type="button"
            onClick={handleCreateClass}
            className="bg-teal-600 text-white px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-1"
          >
            <Plus size={16} /> Tạo lớp mới
          </button>
        </div>
      </div>

      {classFolders.map((folder) => {
        const open = expandedClassId === folder.id;
        const FolderIcon = open ? FolderOpen : Folder;
        return (
          <div key={folder.id} className="border border-teal-100 rounded-2xl overflow-hidden bg-white shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-50 to-white">
              <button
                type="button"
                onClick={() => setExpandedClassId(open ? null : folder.id)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <span className="text-teal-600 shrink-0">
                  {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </span>
                <FolderIcon size={20} className="text-teal-600 shrink-0" />
                <span className="font-black text-teal-900">{folder.label}</span>
                <span className="text-xs font-bold text-teal-700/80">({folder.students.length} học sinh)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreselectClassId(folder.id);
                  goSubTab('attendance');
                }}
                className="shrink-0 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-lg"
              >
                Điểm danh
              </button>
              {canAccessClassroomSubTab(staffSession, 'timetable') ? (
              <button
                type="button"
                onClick={() => {
                  setPreselectClassId(folder.id);
                  goSubTab('timetable');
                }}
                className="shrink-0 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1.5 rounded-lg"
              >
                TKB lớp
              </button>
              ) : null}
              <button
                type="button"
                onClick={() => openAddStudent(folder.id)}
                className="shrink-0 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 px-2.5 py-1.5 rounded-lg flex items-center gap-1"
              >
                <Plus size={14} /> Thêm HS
              </button>
            </div>
            {open ? renderStudentTable(folder) : null}
          </div>
        );
      })}
    </div>
  );

  const renderAssignmentDetail = () => (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setSelectedAssignmentId(null)}
        className="text-sm font-bold text-teal-700 flex items-center gap-1 hover:underline"
      >
        <ArrowLeft size={16} /> Quay lại danh sách bài
      </button>
      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <h3 className="font-bold text-slate-800">{selectedAssignmentMeta?.title}</h3>
        <p className="text-xs text-slate-500 mt-1">{selectedAssignmentMeta?.subtitle}</p>
        <p className="text-xs font-semibold text-teal-700 mt-2">{selectedAssignmentScores.length} lượt làm</p>
      </div>
      <div className="overflow-auto border rounded-xl bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-100 sticky top-0">
            <tr>
              <th className="p-2">Học sinh</th>
              <th className="p-2 text-center">Điểm</th>
              <th className="p-2">Thời gian</th>
              <th className="p-2 text-center">Tự luận</th>
            </tr>
          </thead>
          <tbody>
            {selectedAssignmentScores.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-2 font-semibold">{s.name}</td>
                <td className="p-2 text-center font-bold text-blue-600">{s.score}</td>
                <td className="p-2 text-slate-500 text-xs">{formatScoreTimestamp(s.timestamp)}</td>
                <td className="p-2 text-center">
                  {s.essayImages && Object.keys(s.essayImages).length > 0 ? (
                    <button
                      type="button"
                      onClick={() => onViewEssayImage?.({ name: s.name, img: Object.values(s.essayImages)[0] })}
                      className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded"
                    >
                      Xem ảnh
                    </button>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderScoresByAssignment = () => {
    if (selectedAssignmentId) return renderAssignmentDetail();
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 bg-white p-3 rounded-xl border">
          <select
            value={filterExamType}
            onChange={(e) => setFilterExamType(e.target.value)}
            className="p-2 text-xs font-bold border rounded-lg bg-slate-50"
          >
            <option value="">Tất cả loại đề</option>
            <option value={EXAM_TYPE.lesson}>Đề theo bài</option>
            <option value="lesson_practice">Bài tập luyện tập</option>
            <option value={EXAM_TYPE.midterm}>Giữa kỳ</option>
            <option value={EXAM_TYPE.final}>Cuối kỳ</option>
            <option value={EXAM_TYPE.gifted}>Học sinh giỏi</option>
            <option value={EXAM_TYPE.combined}>Tổng hợp</option>
          </select>
          <select
            value={filterChapter}
            onChange={(e) => setFilterChapter(e.target.value)}
            className="p-2 text-xs font-semibold border rounded-lg"
          >
            {chapterOptions.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={filterLessonNo}
            onChange={(e) => setFilterLessonNo(e.target.value)}
            placeholder="Số bài (tuỳ chọn)"
            className="p-2 text-xs border rounded-lg"
          />
          <button
            type="button"
            onClick={() => {
              setFilterExamType('');
              setFilterChapter('');
              setFilterLessonNo('');
            }}
            className="text-xs font-bold text-teal-700 border border-teal-100 rounded-lg hover:bg-teal-50"
          >
            Xóa bộ lọc
          </button>
        </div>

        <div className="space-y-2">
          {assignmentRows.length === 0 ? (
            <p className="text-sm text-slate-500 italic p-6 text-center bg-white rounded-xl border">
              Không có bài / đề phù hợp bộ lọc.
            </p>
          ) : (
            assignmentRows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedAssignmentId(row.id)}
                className="w-full text-left bg-white border rounded-xl p-4 hover:border-teal-300 hover:shadow-sm transition-all"
              >
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">{row.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{row.subtitle}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black text-teal-700">{row.attemptCount} lượt</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderStudentDetail = () => {
    if (!studentProfile) return null;
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setSelectedStudentName(null)}
          className="text-sm font-bold text-teal-700 flex items-center gap-1 hover:underline"
        >
          <ArrowLeft size={16} /> Quay lại danh sách học sinh
        </button>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white border rounded-xl p-4">
            <p className="text-[11px] font-bold text-slate-500 uppercase">Điểm TB</p>
            <p className="text-2xl font-black text-blue-600 mt-1">
              {studentProfile.avgScore != null ? studentProfile.avgScore : '—'}
            </p>
          </div>
          <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-200 rounded-xl p-4">
            <p className="text-[11px] font-bold text-violet-600 uppercase">Level học sinh</p>
            <p className="text-2xl font-black text-violet-700 mt-1">
              Lv {levelFromExp(studentProfile.totalExp, levelThresholds)}
            </p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-[11px] font-bold text-slate-500 uppercase">EXP</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{studentProfile.totalExp}</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-[11px] font-bold text-slate-500 uppercase">Lượt làm bài</p>
            <p className="text-2xl font-black text-teal-700 mt-1">{studentProfile.attemptCount}</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-[11px] font-bold text-slate-500 uppercase">Bài đã học</p>
            <p className="text-2xl font-black text-violet-700 mt-1">{studentProfile.lessonRows.length}</p>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-bold text-slate-800 mb-3">Tiến độ bài học</h3>
          {studentProfile.lessonRows.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Chưa có tiến độ bài học.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-auto">
              {studentProfile.lessonRows.map((l) => (
                <div key={l.id} className="flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0 truncate font-medium">{l.title}</div>
                  <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-teal-500 h-full" style={{ width: `${l.progress}%` }} />
                  </div>
                  <span className="text-xs font-bold text-teal-700 w-10 text-right">{l.progress}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          <h3 className="font-bold text-slate-800 p-4 border-b">Các bài / đề đã làm</h3>
          <div className="overflow-auto max-h-80">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="p-2">Bài / Đề</th>
                  <th className="p-2 text-center">Điểm</th>
                  <th className="p-2">EXP</th>
                  <th className="p-2">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {studentProfile.scores.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-2">{s.title}</td>
                    <td className="p-2 text-center font-bold text-blue-600">{s.score}</td>
                    <td className="p-2 text-amber-700 font-semibold">+{s.exp}</td>
                    <td className="p-2 text-xs text-slate-500">{s.formattedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderScoresByStudent = () => {
    if (selectedStudentName) return renderStudentDetail();
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {gradeStudents
          .slice()
          .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'))
          .map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedStudentName(s.name)}
              className="text-left bg-white border rounded-xl p-4 hover:border-teal-300 hover:shadow-sm"
            >
              <p className="font-bold text-slate-800">{s.name}</p>
              <p className="text-xs text-slate-500 mt-1">
                {s.class_label ? `Lớp ${s.class_label}` : '—'}
                {s.school ? ` · ${s.school}` : ''}
              </p>
            </button>
          ))}
      </div>
    );
  };

  const renderScoresTab = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        <SubTabBtn active={scoresMode === 'assignment'} onClick={() => { setScoresMode('assignment'); setSelectedStudentName(null); }}>
          <FileText size={14} className="inline mr-1" /> Theo bài tập / đề
        </SubTabBtn>
        <SubTabBtn active={scoresMode === 'student'} onClick={() => { setScoresMode('student'); setSelectedAssignmentId(null); }}>
          <Users size={14} className="inline mr-1" /> Theo học sinh
        </SubTabBtn>
      </div>
      {scoresMode === 'assignment' ? renderScoresByAssignment() : renderScoresByStudent()}
    </div>
  );

  const filteredTrialRegs = useMemo(() => {
    const list = Array.isArray(trialRegistrations) ? [...trialRegistrations] : [];
    list.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    if (trialStatusFilter === 'all') return list;
    return list.filter((r) => (r.status || 'new') === trialStatusFilter);
  }, [trialRegistrations, trialStatusFilter]);

  const newTrialCount = useMemo(
    () => (trialRegistrations || []).filter((r) => (r.status || 'new') === 'new').length,
    [trialRegistrations]
  );

  const updateTrialStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, COLLECTION_TRIAL_REGISTRATIONS, id), {
        status,
        updated_at: Date.now(),
      });
    } catch (err) {
      console.error(err);
      window.alert('Không cập nhật được trạng thái.');
    }
  };

  const deleteTrialReg = async (id) => {
    if (!window.confirm('Xóa đăng ký này?')) return;
    try {
      await deleteDoc(doc(db, COLLECTION_TRIAL_REGISTRATIONS, id));
    } catch (err) {
      console.error(err);
      window.alert('Không xóa được.');
    }
  };

  const formatTrialTime = (ts) => {
    if (!ts) return '—';
    try {
      return new Date(ts).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  const statusLabel = (s) => {
    if (s === 'contacted') return 'Đã liên hệ';
    if (s === 'done') return 'Hoàn tất';
    return 'Mới';
  };

  const statusClass = (s) => {
    if (s === 'contacted') return 'bg-amber-100 text-amber-800';
    if (s === 'done') return 'bg-emerald-100 text-emerald-800';
    return 'bg-rose-100 text-rose-800';
  };

  const renderTrialRegistrationsTab = () => (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setTrialFolderOpen((v) => !v)}
        className="w-full flex items-center gap-3 bg-white border border-teal-200 rounded-xl px-4 py-3.5 text-left hover:bg-teal-50/50 shadow-sm"
      >
        {trialFolderOpen ? (
          <FolderOpen className="w-6 h-6 text-teal-600 shrink-0" />
        ) : (
          <Folder className="w-6 h-6 text-teal-600 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-black text-teal-900 uppercase tracking-wide text-sm sm:text-base">
            Học sinh đăng kí học
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Form trang chủ · {trialRegistrations?.length || 0} đăng ký
            {newTrialCount > 0 ? ` · ${newTrialCount} mới` : ''}
          </p>
        </div>
        {newTrialCount > 0 && (
          <span className="shrink-0 px-2.5 py-1 rounded-full bg-rose-500 text-white text-xs font-black">
            {newTrialCount} mới
          </span>
        )}
        {trialFolderOpen ? (
          <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
        )}
      </button>

      {trialFolderOpen && (
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-slate-50 flex flex-wrap items-center gap-2 justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <ClipboardList size={16} className="text-teal-600" />
              <span className="font-semibold">Danh sách đăng ký học thử</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'new', label: 'Mới' },
                { id: 'contacted', label: 'Đã liên hệ' },
                { id: 'done', label: 'Hoàn tất' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTrialStatusFilter(f.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    trialStatusFilter === f.id
                      ? 'bg-teal-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredTrialRegs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Chưa có đăng ký nào{trialStatusFilter !== 'all' ? ' với bộ lọc này' : ''}.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTrialRegs.map((r) => {
                const st = r.status || 'new';
                return (
                  <div key={r.id} className="p-4 hover:bg-slate-50/80 flex flex-col lg:flex-row lg:items-center gap-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900">
                          {r.student_name || '(Chưa nhập tên)'}
                        </p>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${statusClass(st)}`}>
                          {statusLabel(st)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 font-semibold">{r.course || '—'}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Phone size={12} /> {r.phone || '—'}
                        </span>
                        {r.email ? (
                          <span className="inline-flex items-center gap-1">
                            <Mail size={12} /> {r.email}
                          </span>
                        ) : null}
                        <span>{formatTrialTime(r.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {r.phone && (
                        <>
                          <a
                            href={`tel:${r.phone}`}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                          >
                            Gọi
                          </a>
                          <a
                            href={`https://zalo.me/${r.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-[#0068FF] text-white text-xs font-bold hover:opacity-90"
                          >
                            Zalo
                          </a>
                        </>
                      )}
                      <select
                        value={st}
                        onChange={(e) => updateTrialStatus(r.id, e.target.value)}
                        className="text-xs font-bold border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
                      >
                        <option value="new">Mới</option>
                        <option value="contacted">Đã liên hệ</option>
                        <option value="done">Hoàn tất</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => deleteTrialReg(r.id)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                        title="Xóa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border shadow-sm">
        <div>
          <h2 className="font-black text-lg text-teal-800">Quản lí lớp học</h2>
          <p className="text-xs text-slate-500">BTVN · điểm danh · TKB · học phí · nhận xét · lớp</p>
        </div>
        <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-xl">
          <SubTabBtn active={subTab === 'homework'} onClick={() => goSubTab('homework')}>
            BTVN
          </SubTabBtn>
          <SubTabBtn
            active={subTab === 'attendance'}
            onClick={() => {
              goSubTab('attendance', () => setPreselectClassId(''));
            }}
          >
            Điểm danh
          </SubTabBtn>
          {canAccessClassroomSubTab(staffSession, 'timetable') ? (
          <SubTabBtn
            active={subTab === 'timetable'}
            onClick={() => {
              goSubTab('timetable', () => setPreselectClassId(''));
            }}
          >
            Thời khóa biểu
          </SubTabBtn>
          ) : null}
          {canAccessClassroomSubTab(staffSession, 'tuition') ? (
          <SubTabBtn active={subTab === 'tuition'} onClick={() => goSubTab('tuition')}>
            Học phí
          </SubTabBtn>
          ) : null}
          <SubTabBtn active={subTab === 'feedback'} onClick={() => goSubTab('feedback')}>
            Nhận xét
          </SubTabBtn>
          <SubTabBtn active={subTab === 'levels'} onClick={() => goSubTab('levels')}>
            <Trophy size={14} className="inline mr-1" /> Quản lí Level
          </SubTabBtn>
          <SubTabBtn active={subTab === 'classes'} onClick={() => goSubTab('classes')}>
            Danh sách lớp
          </SubTabBtn>
          <SubTabBtn active={subTab === 'scores'} onClick={() => goSubTab('scores')}>
            Quản lí bài tập và điểm
          </SubTabBtn>
          <SubTabBtn active={subTab === 'trials'} onClick={() => goSubTab('trials')}>
            Học sinh đăng kí học
            {newTrialCount > 0 ? ` (${newTrialCount})` : ''}
          </SubTabBtn>
        </div>
      </div>

      {subTab === 'homework' && (
        <AdminHomeworkPanel
          activeGrade={activeGrade}
          studentsList={scopedStudents}
          classesList={scopedClasses}
          lessonsList={lessonsList}
          quizzesList={quizzesList}
          initialClassId={preselectClassId}
        />
      )}
      {subTab === 'attendance' && (
        <AdminAttendancePanel
          activeGrade={activeGrade}
          studentsList={scopedStudents}
          classesList={scopedClasses}
          initialClassId={preselectClassId}
        />
      )}
      {subTab === 'timetable' && canAccessClassroomSubTab(staffSession, 'timetable') && (
        <AdminTimetablePanel
          activeGrade={activeGrade}
          classesList={scopedClasses}
          studentsList={scopedStudents}
          initialClassId={preselectClassId}
        />
      )}
      {subTab === 'tuition' && canAccessClassroomSubTab(staffSession, 'tuition') && (
        <AdminTuitionPanel
          activeGrade={activeGrade}
          studentsList={scopedStudents}
          classesList={scopedClasses}
        />
      )}
      {subTab === 'feedback' && (
        <AdminFeedbackPanel
          activeGrade={activeGrade}
          studentsList={scopedStudents}
          classesList={scopedClasses}
          scoresList={scoresList}
          quizzesList={quizzesList}
        />
      )}
      {subTab === 'levels' && (
        <AdminLevelPanel
          activeGrade={activeGrade}
          studentsList={scopedStudents}
          scoresList={scoresList}
        />
      )}
      {subTab === 'classes' && renderClassesTab()}
      {subTab === 'scores' && renderScoresTab()}
      {subTab === 'trials' && renderTrialRegistrationsTab()}

      {showStudentForm != null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form
            onSubmit={saveStudent}
            className="bg-white rounded-2xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-4 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-lg text-teal-800">
                  {editingStudentId ? 'Thông tin tài khoản học sinh' : 'Thêm học sinh mới'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hồ sơ đăng ký · tên đăng nhập · trạng thái VIP / miễn phí
                </p>
              </div>
              <span
                className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                  studentForm.is_vip || studentForm.account_type === 'vip'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {studentForm.is_vip || studentForm.account_type === 'vip' ? 'VIP' : 'Miễn phí'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block sm:col-span-2">
                <span className="text-xs font-bold text-slate-600">Họ tên *</span>
                <input
                  required
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  className="mt-1 w-full p-2.5 border rounded-lg text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-600">Tên đăng nhập</span>
                <input
                  value={studentForm.username}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, username: e.target.value.replace(/\s/g, '') })
                  }
                  placeholder="Phat@xyz"
                  className="mt-1 w-full p-2.5 border rounded-lg text-sm font-mono"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-600">Mật khẩu đăng nhập</span>
                <div className="relative mt-1">
                  <input
                    type={showStudentPassword ? 'text' : 'password'}
                    value={studentForm.login_password}
                    onChange={(e) => setStudentForm({ ...studentForm, login_password: e.target.value })}
                    placeholder="Đặt / đổi mật khẩu cho học sinh"
                    className="w-full p-2.5 pr-10 border rounded-lg text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStudentPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                    aria-label={showStudentPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showStudentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Học sinh đăng nhập bằng mật khẩu này (sau khi bạn bấm Lưu).
                </p>
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-600">Gmail</span>
                <input
                  type="email"
                  value={studentForm.email}
                  onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                  className="mt-1 w-full p-2.5 border rounded-lg text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-600">SĐT</span>
                <input
                  value={studentForm.phone}
                  onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                  className="mt-1 w-full p-2.5 border rounded-lg text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-600">Lớp (vd. 9A1)</span>
                <input
                  value={studentForm.class_label}
                  onChange={(e) => setStudentForm({ ...studentForm, class_label: e.target.value })}
                  className="mt-1 w-full p-2.5 border rounded-lg text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-600">Khối học</span>
                <select
                  value={studentForm.grade_level || gradeForNew}
                  onChange={(e) => setStudentForm({ ...studentForm, grade_level: e.target.value })}
                  className="mt-1 w-full p-2.5 border rounded-lg text-sm bg-white"
                >
                  {['6', '7', '8', '9', '10', '11', '12'].map((g) => (
                    <option key={g} value={g}>
                      Lớp {g}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-bold text-slate-600">Trường</span>
                <input
                  value={studentForm.school}
                  onChange={(e) => setStudentForm({ ...studentForm, school: e.target.value })}
                  className="mt-1 w-full p-2.5 border rounded-lg text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-600">Tỉnh/thành</span>
                <input
                  value={studentForm.province}
                  onChange={(e) => setStudentForm({ ...studentForm, province: e.target.value })}
                  className="mt-1 w-full p-2.5 border rounded-lg text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-600">Xã/phường</span>
                <input
                  value={studentForm.ward}
                  onChange={(e) => setStudentForm({ ...studentForm, ward: e.target.value })}
                  className="mt-1 w-full p-2.5 border rounded-lg text-sm"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-bold text-slate-600">Địa chỉ</span>
                <input
                  value={studentForm.address}
                  onChange={(e) => setStudentForm({ ...studentForm, address: e.target.value })}
                  className="mt-1 w-full p-2.5 border rounded-lg text-sm"
                />
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
              <p className="text-xs font-black text-slate-700 uppercase">Tình trạng tài khoản</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="acct"
                    checked={!studentForm.is_vip && studentForm.account_type !== 'vip'}
                    onChange={() => setStudentForm({ ...studentForm, is_vip: false, account_type: 'free' })}
                  />
                  Tài khoản thường (miễn phí)
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="acct"
                    checked={studentForm.is_vip || studentForm.account_type === 'vip'}
                    onChange={() => setStudentForm({ ...studentForm, is_vip: true, account_type: 'vip' })}
                  />
                  Tài khoản VIP
                </label>
              </div>
              {studentForm.auth_provider ? (
                <p className="text-xs text-slate-500">
                  Đăng nhập qua: <strong>{studentForm.auth_provider === 'google.com' ? 'Google' : 'Email/mật khẩu'}</strong>
                </p>
              ) : null}
              <div className="flex flex-wrap gap-4 text-sm pt-1">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(studentForm.notify_zalo)}
                    onChange={(e) => setStudentForm({ ...studentForm, notify_zalo: e.target.checked })}
                  />
                  Thông báo Zalo
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(studentForm.notify_email)}
                    onChange={(e) => setStudentForm({ ...studentForm, notify_email: e.target.checked })}
                  />
                  Thông báo Email
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowStudentForm(null);
                  setEditingStudentId(null);
                  setStudentForm(EMPTY_STUDENT_FORM);
                  setShowStudentPassword(false);
                }}
                className="flex-1 py-2.5 rounded-lg bg-slate-100 font-bold"
              >
                Hủy
              </button>
              <button type="submit" className="flex-1 py-2.5 rounded-lg bg-teal-600 text-white font-bold">
                Lưu
              </button>
            </div>
          </form>
        </div>
      )}

      {moveStudentId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-3">
            <h3 className="font-bold text-teal-800">Chuyển học sinh sang lớp</h3>
            <select
              className="w-full p-2.5 border rounded-lg text-sm"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) handleMoveStudent(moveStudentId, e.target.value);
              }}
            >
              <option value="">— Chọn lớp đích —</option>
              {classFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => setMoveStudentId(null)} className="w-full py-2 rounded-lg bg-slate-100 font-bold">
              Đóng
            </button>
          </div>
        </div>
      )}

      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <h3 className="font-bold mb-2">Nhập tên từ Excel (mỗi tên 1 dòng)</h3>
            <p className="text-xs text-slate-500 mb-2">Học sinh sẽ được thêm vào thư mục Khác.</p>
            <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} className="w-full h-48 border rounded p-2 mb-4 text-sm" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowBulkModal(false)} className="flex-1 bg-slate-100 py-2 rounded font-bold">
                Hủy
              </button>
              <button type="button" onClick={handleBulkImport} className="flex-1 bg-teal-600 text-white py-2 rounded font-bold">
                Xác nhận nạp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
