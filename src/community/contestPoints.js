/** Điểm thưởng đố vui → xếp hạng + cộng EXP hệ thống */

export const CONTEST_GRADE_OPTIONS = [
  { id: 'xuat_sac', label: 'Xuất sắc', points: 50, score: 10 },
  { id: 'tot', label: 'Tốt', points: 30, score: 8 },
  { id: 'dat', label: 'Đạt', points: 15, score: 5 },
  { id: 'chua_dat', label: 'Chưa đạt', points: 0, score: 0 },
];

export function getContestGradeOption(id) {
  return CONTEST_GRADE_OPTIONS.find((g) => g.id === id) || CONTEST_GRADE_OPTIONS[3];
}

export function slugifyContestTitle(title) {
  return String(title || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `cuoc-thi-${Date.now().toString(36)}`;
}
