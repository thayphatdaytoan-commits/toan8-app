/** Hỏi đáp cộng đồng — lưu local + seed mẫu */

const STORAGE_KEY = 'mathedu_community_qa_v1';

const SEED = [
  {
    id: 'q_seed_1',
    grade: '9',
    subject: 'Toán',
    content: 'Động năng và thế năng khác nhau thế nào ạ? Cho ví dụ dễ hiểu với học sinh lớp 9.',
    author: 'Minh Anh',
    createdAt: Date.now() - 1000 * 60 * 60 * 26,
    tags: ['#Hỏi cộng đồng', '#Toán 9'],
    answers: [
      {
        id: 'a1',
        author: 'Thầy Phát',
        badge: 'GV',
        content:
          'Động năng gắn với chuyển động (K = ½mv²). Thế năng gắn với vị trí trong lực trường (vd. trọng trường). Ví dụ: quả bóng đang rơi vừa có động năng vừa có thế năng trọng trường.',
        createdAt: Date.now() - 1000 * 60 * 60 * 20,
      },
    ],
  },
  {
    id: 'q_seed_2',
    grade: '11',
    subject: 'Toán',
    content: 'Em chưa hiểu điều kiện để hàm số y = ax³ + bx² + cx + d đồng biến trên R. Thầy giải thích giúp em?',
    author: 'Hoàng Long',
    createdAt: Date.now() - 1000 * 60 * 60 * 8,
    tags: ['#Hỏi cộng đồng', '#Toán 11'],
    answers: [],
  },
  {
    id: 'q_seed_3',
    grade: '12',
    subject: 'Toán',
    content: 'Làm sao phân biệt nhanh tích phân từng phần và đổi biến khi gặp đề thi THPT?',
    author: 'Lan Chi',
    createdAt: Date.now() - 1000 * 60 * 45,
    tags: ['#Hỏi cộng đồng', '#Toán 12'],
    answers: [
      {
        id: 'a2',
        author: 'Bạn học MathEdu',
        badge: '',
        content: 'Thường đổi biến khi thấy dạng f\'(u)·u\' ; từng phần khi có tích đa thức × lượng giác/ mũ/ log.',
        createdAt: Date.now() - 1000 * 60 * 20,
      },
    ],
  },
];

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      return [...SEED];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...SEED];
  } catch {
    return [...SEED];
  }
}

function writeAll(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function listCommunityQuestions() {
  return readAll().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function createCommunityQuestion({ grade, subject, content, author }) {
  const text = String(content || '').trim();
  if (!text) throw new Error('Nhập nội dung câu hỏi');
  const item = {
    id: `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    grade: String(grade || '9'),
    subject: String(subject || 'Toán'),
    content: text,
    author: String(author || 'Khách').trim() || 'Khách',
    createdAt: Date.now(),
    tags: [`#Hỏi cộng đồng`, `#Toán ${grade || '9'}`],
    answers: [],
  };
  const next = [item, ...readAll()];
  writeAll(next);
  return item;
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
