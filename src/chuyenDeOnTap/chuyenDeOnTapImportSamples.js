/** File mẫu import — phục vụ link tải trong admin Chuyên đề ôn tập. */
export const REVIEW_IMPORT_SAMPLE_FILES = [
  {
    id: 'full',
    label: 'Khóa học đầy đủ',
    file: 'MAU_1_KHOA_HOC_DAY_DU.txt',
    hint: 'Nhiều chủ đề, ví dụ và câu hỏi',
  },
  {
    id: 'topic',
    label: 'Một chủ đề',
    file: 'MAU_2_CHU_DE_NHO.txt',
    hint: 'Lý thuyết + ví dụ + nhiều bài tập',
  },
  {
    id: 'one-fill',
    label: 'Một bài điền',
    file: 'MAU_3_MOT_BAI_DIEN.txt',
    hint: 'Một câu điền đáp án',
  },
  {
    id: 'one-mcq',
    label: 'Một bài trắc nghiệm',
    file: 'MAU_4_MOT_BAI_TRAC_NGHIEM.txt',
    hint: 'Một câu trắc nghiệm A–D',
  },
  {
    id: 'questions-only',
    label: 'Chỉ câu hỏi (nhiều bài)',
    file: 'MAU_5_NHIEU_CAU_HOI.txt',
    hint: 'Import thêm câu vào chủ đề đang sửa — không lý thuyết/ví dụ',
  },
  {
    id: 'guide',
    label: 'Hướng dẫn ngắn',
    file: 'HUONG_DAN_NGAN.txt',
    hint: 'Quy tắc marker tiếng Việt',
  },
];

export function reviewImportSampleUrl(filename) {
  const base = import.meta.env.BASE_URL || '/';
  const root = base.endsWith('/') ? base : `${base}/`;
  return `${root}mau-import-chuyen-de/${encodeURIComponent(filename)}`;
}
