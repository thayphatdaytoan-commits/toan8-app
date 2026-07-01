/** Firestore: khóa ôn tập (TXT marker tiếng Việt → import admin). */
export const COLLECTION_REVIEW_COURSES = 'review_courses_v1';

/** Tiến độ học sinh theo chủ đề ôn tập (bước, đúng/sai, câu đang làm). */
export const COLLECTION_REVIEW_PROGRESS = 'review_progress_v1';

/** EXP cộng khi học sinh đã đăng nhập (lưu qua bảng điểm với exp_points). */
export const EXP_REVIEW_EXAMPLE_DONE = 2;
export const EXP_REVIEW_QUESTION_CORRECT = 3;

/** Ví dụ đánh số trong chủ đề: VÍ_DỤ_1: … VÍ_DỤ_2: … (nội dung con dùng ĐỀ_VÍ_DỤ / ĐÁP_ÁN_VÍ_DỤ — chỉ parse bên trong khối VÍ_DỤ_N). */
export const IMPORT_VIDU_NUMBERED_KEYS = Array.from({ length: 30 }, (_, i) => `VÍ_DỤ_${i + 1}`);

/** Khối tiêu đề được parser nhận (sắp theo độ dài giảm dần khi khớp dòng). */
export const IMPORT_BLOCK_KEYS = [
  'HIỂN_THỊ_TÓM_TẮT_MỞ_ĐẦU',
  'HIỂN_THỊ_VIDEO_MỞ_ĐẦU',
  'HIỂN_THỊ_VIDEO_CHỦ_ĐỀ',
  'HIỂN_THỊ_TÓM_TẮT_CHỦ_ĐỀ',
  'HIỂN_THỊ_VÍ_DỤ_CHỦ_ĐỀ',
  'LỜI_GIẢI_CHI_TIẾT',
  'ĐỀ_KIỂM_TRA_CUỐI',
  'MÔ_TẢ_CHỦ_ĐỀ',
  'TÓM_TẮT_MỞ_ĐẦU',
  'VIDEO_MỞ_ĐẦU',
  'TÓM_TẮT_CHỦ_ĐỀ',
  'VÍ_DỤ_CHỦ_ĐỀ',
  'VIDEO_CHỦ_ĐỀ',
  'TRẮC_NGHIỆM',
  'KHỐI_LỚP',
  'ĐỀ_BÀI',
  'BÀI_TẬP',
  'CHỦ_ĐỀ',
  'KHÓA_HỌC',
  'MÔ_TẢ',
  'THỨ_TỰ',
  'GỢI_Ý',
  'ĐÁP_ÁN',
  'VIDEO_BÀI',
  'LOẠI_CÂU',
  'CẤP_ĐỘ',
  ...IMPORT_VIDU_NUMBERED_KEYS,
];
