/* eslint-disable */
import { STAFF_ROLE } from './adminStaffStore';

/** Tab admin bị cấm với giáo viên thường. */
export const TEACHER_BLOCKED_TABS = new Set(['homepage', 'teachers']);

/** Sub-tab Quản lí lớp bị cấm với giáo viên thường. */
export const TEACHER_BLOCKED_CLASSROOM_SUBTABS = new Set(['timetable', 'tuition']);

export function isSuperAdmin(staff) {
  return !staff || staff.role === STAFF_ROLE.SUPER_ADMIN;
}

export function isTeacher(staff) {
  return staff?.role === STAFF_ROLE.TEACHER;
}

export function canAccessAdminTab(staff, tabId) {
  if (isSuperAdmin(staff)) return true;
  return !TEACHER_BLOCKED_TABS.has(tabId);
}

export function canAccessClassroomSubTab(staff, subTab) {
  if (isSuperAdmin(staff)) return true;
  return !TEACHER_BLOCKED_CLASSROOM_SUBTABS.has(subTab);
}

/** Danh sách khối giáo viên được phép (rỗng = không có quyền khối). */
export function allowedGradesForStaff(staff) {
  if (isSuperAdmin(staff)) return null; // null = tất cả
  const grades = Array.isArray(staff?.grade_levels) ? staff.grade_levels.map(String) : [];
  return grades;
}

export function canAccessGrade(staff, grade) {
  if (isSuperAdmin(staff)) return true;
  if (!grade || grade === 'ALL') return false;
  const allowed = allowedGradesForStaff(staff) || [];
  return allowed.includes(String(grade));
}

/** Lớp được gán (rỗng = mọi lớp trong khối được phép). */
export function allowedClassIdsForStaff(staff) {
  if (isSuperAdmin(staff)) return null;
  const ids = Array.isArray(staff?.class_ids) ? staff.class_ids.map(String).filter(Boolean) : [];
  return ids.length ? ids : null;
}

export function filterStudentsForStaff(students, staff, activeGrade) {
  let list = Array.isArray(students) ? students : [];
  const grades = allowedGradesForStaff(staff);
  const classIds = allowedClassIdsForStaff(staff);
  if (grades) {
    list = list.filter((s) => grades.includes(String(s.grade_level || '')));
  }
  if (activeGrade && activeGrade !== 'ALL') {
    list = list.filter((s) => String(s.grade_level || '') === String(activeGrade));
  }
  if (classIds) {
    list = list.filter((s) => classIds.includes(String(s.class_id || 'other')));
  }
  return list;
}

export function filterClassesForStaff(classes, staff, activeGrade) {
  let list = Array.isArray(classes) ? classes : [];
  const grades = allowedGradesForStaff(staff);
  const classIds = allowedClassIdsForStaff(staff);
  if (grades) {
    list = list.filter((c) => grades.includes(String(c.grade_level || '')));
  }
  if (activeGrade && activeGrade !== 'ALL') {
    list = list.filter((c) => String(c.grade_level || '') === String(activeGrade));
  }
  if (classIds) {
    list = list.filter((c) => classIds.includes(String(c.id)));
  }
  return list;
}

export function defaultGradeForStaff(staff, fallback = '8') {
  if (isSuperAdmin(staff)) return fallback || 'ALL';
  const grades = allowedGradesForStaff(staff) || [];
  return grades[0] || fallback;
}
