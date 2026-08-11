/** Dữ liệu mẫu — Cuộc thi vui mỗi tuần */

export const WEEKLY_CONTESTS = [
  {
    id: 'hai-trinh-067',
    slug: 'hai-trinh-toan-hoc-067',
    title: 'Hải trình Toán học - 067',
    excerpt: 'Thám tử nhí gỡ bom',
    thumbnail: '/contest-thumb-1.svg',
    author: 'Thầy Phát',
    publishedAt: '2026-07-10T22:05:00+07:00',
    bodyIntro:
      'Thám tử nhí phát hiện 4 quả bom được giấu trong một khu vực chia thành lưới 4×4. Mỗi ô có tọa độ dạng (Cột ; Hàng). Hãy dùng các manh mối bên dưới để tìm đúng vị trí các quả bom.',
    grid: {
      cols: ['A', 'B', 'C', 'D'],
      rows: ['1', '2', '3', '4'],
    },
    rules: [
      'Mỗi hàng và mỗi cột có đúng một quả bom.',
      'Hai quả bom không được nằm ở các ô kề cạnh nhau (chỉ tính cạnh chung, không tính chéo).',
      'Bom ở cột A nằm ở hàng chẵn.',
      'Bom ở hàng 3 nằm ở cột đứng trước cột có bom ở hàng 1 (theo thứ tự A→D).',
    ],
    outro: 'Hãy ghi lại 4 tọa độ bom và gửi lời giải trong phần bình luận. Ai giải đúng sớm nhất sẽ nhận thưởng xu tuần này!',
  },
  {
    id: 'hai-trinh-066',
    slug: 'hai-trinh-toan-hoc-066',
    title: 'Hải trình Toán học - 066',
    excerpt: 'Mê cung số nguyên tố',
    thumbnail: '/contest-thumb-2.svg',
    author: 'Thầy Phát',
    publishedAt: '2026-07-03T20:30:00+07:00',
    bodyIntro:
      'Trong mê cung 5×5, mỗi ô chứa một số. Bạn chỉ được đi sang ô có số nguyên tố và tổng đường đi phải đạt đúng 50.',
    grid: null,
    rules: [
      'Bắt đầu từ ô góc trên-trái.',
      'Chỉ đi phải hoặc xuống.',
      'Kết thúc tại góc dưới-phải.',
      'Tổng các số trên đường đi bằng 50.',
    ],
    outro: 'Có bao nhiêu đường đi thỏa mãn? Gửi đáp án kèm một ví dụ đường đi.',
  },
  {
    id: 'hai-trinh-065',
    slug: 'hai-trinh-toan-hoc-065',
    title: 'Hải trình Toán học - 065',
    excerpt: 'Đồng xu và chiếc cân',
    thumbnail: '/contest-thumb-3.svg',
    author: 'Thầy Phát',
    publishedAt: '2026-06-26T19:15:00+07:00',
    bodyIntro:
      'Có 9 đồng xu trông giống nhau, trong đó đúng 1 đồng nhẹ hơn. Bạn có một chiếc cân đĩa và được cân tối đa 2 lần.',
    grid: null,
    rules: [
      'Mỗi lần cân so sánh hai nhóm đồng xu.',
      'Cần tìm ra đồng xu nhẹ hơn sau đúng hoặc ít hơn 2 lần cân.',
      'Mô tả chiến lược cân tối ưu.',
    ],
    outro: 'Đây là bài kinh điển về chia để trị — hãy giải thích vì sao 2 lần là đủ.',
  },
  {
    id: 'hai-trinh-064',
    slug: 'hai-trinh-toan-hoc-064',
    title: 'Hải trình Toán học - 064',
    excerpt: 'Hình vuông biến mất',
    thumbnail: '/contest-thumb-1.svg',
    author: 'Thầy Phát',
    publishedAt: '2026-06-19T21:00:00+07:00',
    bodyIntro:
      'Một hình chữ nhật 13×5 được cắt thành các mảnh rồi ghép lại thành hình vuông — nhưng diện tích lại “thiếu” 1 đơn vị. Tìm chỗ sai trong lập luận.',
    grid: null,
    rules: [
      'Diện tích hình chữ nhật ban đầu là 65.',
      'Hình vuông ghép lại có cạnh 8 nên diện tích 64.',
      'Chỉ ra vì sao có sự lệch 1 đơn vị.',
    ],
    outro: 'Gợi ý: xem kỹ đường chéo khi ghép các mảnh.',
  },
];

export function formatContestDate(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${day} tháng ${month} lúc ${hh}:${mm}`;
  } catch {
    return '';
  }
}

export function getContestBySlug(slug) {
  const s = String(slug || '').trim();
  return WEEKLY_CONTESTS.find((c) => c.slug === s || c.id === s) || null;
}
