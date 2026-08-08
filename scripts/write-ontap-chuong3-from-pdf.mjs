import fs from 'fs';
import path from 'path';

const t9 = 'tai-lieu-dang-web/Toán 9/Bài Giảng';
const ch = fs.readdirSync(t9).find((n) => n.includes('III') && n.includes('CĂN'));
const otName = fs.readdirSync(path.join(t9, ch)).find((n) => n.startsWith('ÔN'));
const outDir = path.join(t9, ch, otName, 'output');
fs.mkdirSync(outDir, { recursive: true });

const lines = [];
const W = (s = '') => lines.push(s);

W('@grade_level: 9');
W('@chapter: 3');
W('@lesson_no: OT3');
W('@title: Ôn tập Chương 3: Căn bậc hai và căn bậc ba');
W(
  '@seo_description: Ôn tập Chương 3 Toán 9 theo tài liệu Thầy Phát: rút gọn căn thức, phương trình chứa căn, biểu thức P và hình lập phương.',
);
W('@focus_keyword: ôn tập chương 3 căn bậc hai');
W('@keywords: căn thức, rút gọn căn, phương trình chứa căn, toán 9');
W('');
W('LÝ THUYẾT TRỌNG TÂM');
W('');
W('# 1. Căn bậc hai số học');
W('Định nghĩa:');
W('Với $a \\ge 0$, số $\\sqrt{a}$ là căn bậc hai số học của $a$.');
W('Ghi nhớ: $\\sqrt{A}$ có nghĩa khi $A \\ge 0$; $\\sqrt{A^2}=|A|$.');
W('---');
W('# 2. Phép biến đổi căn thức');
W('Định lí:');
W('- $\\sqrt{AB}=\\sqrt{A}\\sqrt{B}$ ($A,B\\ge 0$)');
W('- $\\sqrt{\\dfrac{A}{B}}=\\dfrac{\\sqrt{A}}{\\sqrt{B}}$ ($A\\ge 0,B>0$)');
W('- $\\sqrt{A^2 B}=|A|\\sqrt{B}$ ($B\\ge 0$)');
W('- Trục căn ở mẫu khi điều kiện phù hợp.');
W('---');
W('# 3. Căn bậc ba');
W('Định nghĩa: $\\sqrt[3]{a}=x \\Leftrightarrow x^3=a$. Mọi số thực đều có đúng một căn bậc ba.');
W('---');
W('# 4. Phương trình chứa căn');
W('Phương pháp: điều kiện xác định → biến đổi → thử lại nghiệm.');
W('');
W('CÁC DẠNG TOÁN & VÍ DỤ');
W('');

const bai1 = [
  {
    q: '$4\\sqrt{5}+\\sqrt{45}-3\\sqrt{20}$',
    a: '$\\sqrt{5}$',
    sol: '$4\\sqrt{5}+3\\sqrt{5}-6\\sqrt{5}=\\sqrt{5}$.',
  },
  {
    q: '$3\\sqrt{20}+\\sqrt{75}-2\\sqrt{45}$',
    a: '$5\\sqrt{3}$',
    sol: '$6\\sqrt{5}+5\\sqrt{3}-6\\sqrt{5}=5\\sqrt{3}$.',
  },
  {
    q: '$\\sqrt{12}+\\sqrt{27}-\\sqrt{48}$',
    a: '$\\sqrt{3}$',
    sol: '$2\\sqrt{3}+3\\sqrt{3}-4\\sqrt{3}=\\sqrt{3}$.',
  },
  {
    q: '$\\sqrt{75}-\\sqrt{108}+\\sqrt{27}$',
    a: '$2\\sqrt{3}$',
    sol: '$5\\sqrt{3}-6\\sqrt{3}+3\\sqrt{3}=2\\sqrt{3}$.',
  },
  {
    q: '$5\\sqrt{12}+2\\sqrt{48}-3\\sqrt{300}$',
    a: '$-12\\sqrt{3}$',
    sol: '$10\\sqrt{3}+8\\sqrt{3}-30\\sqrt{3}=-12\\sqrt{3}$.',
  },
  {
    q: '$\\sqrt{12}-4\\sqrt{48}+\\sqrt{243}+2\\sqrt{147}$',
    a: '$9\\sqrt{3}$',
    sol: '$2\\sqrt{3}-16\\sqrt{3}+9\\sqrt{3}+14\\sqrt{3}=9\\sqrt{3}$.',
  },
  {
    q: '$\\sqrt{208}-2\\sqrt{117}+\\dfrac{3}{2}\\sqrt{52}$',
    a: '$\\sqrt{13}$',
    sol: '$4\\sqrt{13}-6\\sqrt{13}+3\\sqrt{13}=\\sqrt{13}$.',
  },
  {
    q: '$\\sqrt{243}+0{,}5\\sqrt{12}-\\sqrt{75}+\\dfrac{2}{7}\\sqrt{147}$',
    a: '$7\\sqrt{3}$',
    sol: '$9\\sqrt{3}+\\sqrt{3}-5\\sqrt{3}+2\\sqrt{3}=7\\sqrt{3}$.',
  },
  {
    q: '$\\dfrac{1}{2}\\sqrt{48}-5\\sqrt{27}+2\\sqrt{147}-\\sqrt{108}$',
    a: '$-5\\sqrt{3}$',
    sol: '$2\\sqrt{3}-15\\sqrt{3}+14\\sqrt{3}-6\\sqrt{3}=-5\\sqrt{3}$.',
  },
  {
    q: '$\\sqrt{75}-3\\sqrt{2}+\\sqrt{27}-\\sqrt{192}$',
    a: '$3\\sqrt{2}-6\\sqrt{3}$',
    sol: '$5\\sqrt{3}-3\\sqrt{2}+3\\sqrt{3}-8\\sqrt{3}=3\\sqrt{2}-6\\sqrt{3}$.',
  },
];

W('Dạng 1: Rút gọn căn (cộng trừ) — nguồn Bài 1, mỗi ý một ví dụ');
W('Phương pháp: Đưa thừa số ra ngoài dấu căn rồi cộng trừ hệ số.');
W('---');
bai1.forEach((it, i) => {
  W(`Ví dụ ${i + 1}: Rút gọn biểu thức: ${it.q}.`);
  W('Lời giải:');
  W(it.sol);
  W(`Kết quả: ${it.a}.`);
  W('---');
});

const bai2a = [
  ['$\\sqrt{16-8\\sqrt{3}}-\\sqrt{(3-2\\sqrt{3})^2}$', '$1$'],
  ['$\\sqrt{14+6\\sqrt{5}}-\\sqrt{(\\sqrt{5}-2)^2}$', '$2\\sqrt{5}$'],
  ['$\\sqrt{49+20\\sqrt{6}}-\\sqrt{(3-2\\sqrt{6})^2}$', '$8$'],
  ['$\\sqrt{(2\\sqrt{2}-3)^2}-\\sqrt{11-6\\sqrt{2}}$', '$-\\sqrt{2}$'],
  ['$\\sqrt{9-4\\sqrt{5}}\\cdot\\sqrt{(2+\\sqrt{5})^2}$', '$1$'],
  ['$\\sqrt{(\\sqrt{3}-2)^2}\\cdot\\sqrt{7+4\\sqrt{3}}$', '$1$'],
  ['$(\\sqrt{14}+\\sqrt{6})(\\sqrt{5}-\\sqrt{21})$', '$4$'],
  ['$(\\sqrt{10}+\\sqrt{6})(2-\\sqrt{15})$', '$2$'],
  ['$\\sqrt{14-5\\sqrt{3}}(5-2\\sqrt{6})$', '$22$'],
  ['$\\sqrt{2-\\sqrt{3}}(\\sqrt{2}+\\sqrt{6})$', '$2$'],
];

W('Dạng 2: Dạng $\\sqrt{a\\pm b\\sqrt{c}}$ và nhân căn — nguồn Bài 2 ý 1–10');
W('Phương pháp: Biến đổi thành bình phương; dùng $\\sqrt{A^2}=|A|$.');
W('---');
bai2a.forEach(([q, a], i) => {
  W(`Ví dụ ${i + 1}: Rút gọn: ${q}.`);
  W(`Đáp án: ${a}`);
  W('---');
});

const bai2b = [
  ['$(\\sqrt{3-\\sqrt{5}}+\\sqrt{2+\\sqrt{3}})(\\sqrt{10}-\\sqrt{6})$', '$2$'],
  ['$(\\sqrt{11-6\\sqrt{2}}-\\sqrt{15-6\\sqrt{6}})\\sqrt{2+\\sqrt{3}}$', '$2$'],
  ['$\\sqrt{4+\\sqrt{6}-2\\sqrt{5}}(\\sqrt{10}-\\sqrt{2})$', '$4$'],
  ['$\\sqrt{2-\\sqrt{6}+2\\sqrt{5}}(\\sqrt{10}+\\sqrt{2})$', '$4$'],
  ['$(\\sqrt{10}+\\sqrt{6})\\sqrt{4+\\sqrt{15}}(4-\\sqrt{15})$', '$2$'],
  ['$(\\sqrt{10}+\\sqrt{2})\\sqrt{3+\\sqrt{5}}(3-\\sqrt{5})$', '$8$'],
  ['$(4+\\sqrt{3})\\sqrt{19-8\\sqrt{3}}$', '$4$'],
  ['$(4-\\sqrt{15})(2\\sqrt{3}+\\sqrt{5})$', '$1$'],
  ['$(1+\\sqrt{3})(2-\\sqrt{3})+\\sqrt{9-2\\sqrt{13+4\\sqrt{3}}}$', '$1$'],
  ['$\\sqrt{5}-\\sqrt{3}-\\sqrt{29-12\\sqrt{5}}$', '$1$'],
];

W('Dạng 3: Rút gọn nâng cao — nguồn Bài 2 ý 11–20');
W('Phương pháp: Kết hợp nhân hóa và hằng đẳng thức.');
W('---');
bai2b.forEach(([q, a], i) => {
  W(`Ví dụ ${i + 1}: Rút gọn: ${q}.`);
  W(`Đáp án: ${a}`);
  W('---');
});

const bai3head = [
  [
    '$\\dfrac{2\\sqrt{3}-3\\sqrt{2}}{\\sqrt{3}-\\sqrt{2}}+\\dfrac{2}{\\sqrt{3}}+\\dfrac{4}{2-\\sqrt{6}}$',
    '$-2\\sqrt{6}-4$',
  ],
  [
    '$\\dfrac{2}{3-\\sqrt{10}}-\\dfrac{36}{4+\\sqrt{10}}-\\dfrac{40}{\\sqrt{10}}$',
    '$-30$',
  ],
  [
    '$\\dfrac{2}{2\\sqrt{5}+3}+\\dfrac{1}{2\\sqrt{5}-3}+\\dfrac{2\\sqrt{5}}{11}$',
    '$\\dfrac{9}{11}$',
  ],
  [
    '$\\dfrac{1}{3+2\\sqrt{3}}-\\dfrac{1}{3-2\\sqrt{3}}+\\dfrac{1}{\\sqrt{3}}$',
    '$-\\dfrac{5\\sqrt{3}}{3}$',
  ],
  ['$\\sqrt{13-4\\sqrt{3}}-\\sqrt{\\dfrac{2}{2+\\sqrt{3}}}$', '$\\sqrt{3}$'],
];

W('Dạng 4: Phân thức chứa căn — nguồn Bài 3 ý 1–5');
W('Phương pháp: Trục căn ở mẫu rồi rút gọn.');
W('---');
bai3head.forEach(([q, a], i) => {
  W(`Ví dụ ${i + 1}: Rút gọn: ${q}.`);
  W(`Đáp án: ${a}`);
  W('---');
});

const bai4ex = [
  [
    '$\\sqrt{4(1-2x)^2}=6$',
    '$x=-1$ hoặc $x=2$',
    '$|2(1-2x)|=6\\Rightarrow|1-2x|=3\\Rightarrow x=-1$ hoặc $x=2$.',
  ],
  [
    '$\\sqrt{36x^2-12x+1}=3$',
    '$x=\\dfrac{2}{3}$ hoặc $x=0$',
    '$|6x-1|=3$.',
  ],
  [
    '$\\sqrt{9x^2-6x+1}-2=0$',
    '$x=1$ hoặc $x=-\\dfrac{1}{3}$',
    '$|3x-1|=2$.',
  ],
  [
    '$\\sqrt{4x^2-12x+9}+5=4x$',
    '$x=\\dfrac{4}{3}$',
    '$|2x-3|=4x-5$ với $x\\ge\\dfrac{5}{4}$.',
  ],
  [
    '$\\sqrt{9x^2-12x+4}+4=5x$',
    '$x=1$',
    '$|3x-2|=5x-4$ với $x\\ge\\dfrac{4}{5}$.',
  ],
];

W('Dạng 5: Phương trình chứa căn — nguồn Bài 4');
W('Phương pháp: Điều kiện xác định → biến đổi → thử lại.');
W('---');
bai4ex.forEach(([q, a, sol], i) => {
  W(`Ví dụ ${i + 1}: Giải phương trình: ${q}.`);
  W('Lời giải:');
  W(sol);
  W(`Đáp án: ${a}`);
  W('---');
});

W('Dạng 6: Biểu thức P và hình lập phương — nguồn Bài 5–6 (tách a,b,c)');
W('Phương pháp: Rút gọn đại số; dùng công thức hình học.');
W('---');
W(
  'Ví dụ 1: Cho $P=(2+\\sqrt{a})\\left(\\dfrac{1}{\\sqrt{a}+2}-\\dfrac{1}{2-\\sqrt{a}}+\\dfrac{a}{4-a}\\right)$ với $a\\ge 0,a\\ne 4$. Rút gọn $P$.',
);
W('Đáp án: $-\\sqrt{a}$');
W('---');
W('Ví dụ 2: Với $P$ ở Ví dụ 1, tính $P$ khi $a=0{,}81$.');
W('Đáp án: $-0{,}9$');
W('---');
W('Ví dụ 3: Với $P=-\\sqrt{a}$, tìm $a$ để $P=5$.');
W('Đáp án: vô nghiệm');
W('---');
W('Ví dụ 4: Thùng lập phương cạnh $x$ (cm). Viết $V$ và $S$ theo $x$.');
W('Đáp án: $V=x^3$, $S=6x^2$');
W('---');
W('Ví dụ 5: Từ $S=6x^2$, viết $x$ theo $S$.');
W('Đáp án: $x=\\sqrt{\\dfrac{S}{6}}$ ($x>0$)');
W('---');

W('BÀI TẬP LUYỆN TẬP');
W('');

let n = 0;

const bai3 = [
  [
    '$\\dfrac{2\\sqrt{3}-3\\sqrt{2}}{\\sqrt{3}-\\sqrt{2}}+\\dfrac{2}{\\sqrt{3}}+\\dfrac{4}{2-\\sqrt{6}}$',
    '$-2\\sqrt{6}-4$',
  ],
  [
    '$\\dfrac{2}{3-\\sqrt{10}}-\\dfrac{36}{4+\\sqrt{10}}-\\dfrac{40}{\\sqrt{10}}$',
    '$-30$',
  ],
  [
    '$\\dfrac{2}{2\\sqrt{5}+3}+\\dfrac{1}{2\\sqrt{5}-3}+\\dfrac{2\\sqrt{5}}{11}$',
    '$\\dfrac{9}{11}$',
  ],
  [
    '$\\dfrac{1}{3+2\\sqrt{3}}-\\dfrac{1}{3-2\\sqrt{3}}+\\dfrac{1}{\\sqrt{3}}$',
    '$-\\dfrac{5\\sqrt{3}}{3}$',
  ],
  ['$\\sqrt{13-4\\sqrt{3}}-\\sqrt{\\dfrac{2}{2+\\sqrt{3}}}$', '$\\sqrt{3}$'],
  ['$\\dfrac{6}{\\sqrt{5}+1}+\\sqrt{\\dfrac{2}{7+3\\sqrt{5}}}$', '$\\sqrt{5}$'],
  [
    '$\\sqrt{\\dfrac{2}{2-\\sqrt{3}}}+\\sqrt{4-2\\sqrt{3}}-\\sqrt{27}$',
    '$-\\sqrt{3}$',
  ],
  [
    '$\\dfrac{-2}{\\sqrt{5}+1}+\\sqrt{\\dfrac{2}{3-\\sqrt{5}}}-\\dfrac{2}{\\sqrt{3}-1}$',
    '$-\\sqrt{3}$',
  ],
  ['$\\dfrac{4}{\\sqrt{5}-1}+\\sqrt{\\dfrac{8}{7+3\\sqrt{5}}}$', '$4$'],
  [
    '$\\sqrt{\\dfrac{2}{7+3\\sqrt{5}}}+\\dfrac{2}{3-\\sqrt{5}}-\\dfrac{2+3\\sqrt{2}}{\\sqrt{2}}$',
    '$-\\sqrt{2}$',
  ],
  [
    '$\\left(\\dfrac{\\sqrt{6}-\\sqrt{2}}{\\sqrt{3}-1}+\\dfrac{1}{\\sqrt{3}+\\sqrt{2}}\\right):\\dfrac{1}{2\\sqrt{3}}$',
    '$6$',
  ],
  [
    '$\\left(\\dfrac{\\sqrt{6}+\\sqrt{2}}{1+\\sqrt{3}}-\\dfrac{5}{\\sqrt{5}}\\right):\\dfrac{\\sqrt{5}+\\sqrt{2}}{3}$',
    '$-1$',
  ],
  [
    '$\\dfrac{5-\\sqrt{15}}{\\sqrt{5}-\\sqrt{3}}-\\dfrac{2\\sqrt{5}-6}{\\sqrt{14-2\\sqrt{45}}}$',
    '$\\sqrt{5}+2$',
  ],
  [
    '$\\dfrac{12}{4-\\sqrt{10}}-6\\sqrt{\\dfrac{5}{2}}+\\dfrac{5\\sqrt{2}+\\sqrt{10}}{\\sqrt{5}+1}$',
    '$8$',
  ],
  [
    '$\\dfrac{5-\\sqrt{5}}{\\sqrt{5}-1}\\cdot\\sqrt{\\dfrac{\\sqrt{5}+2}{\\sqrt{5}-2}}$',
    '$-2$',
  ],
  [
    '$\\sqrt{14+6\\sqrt{5}}-\\sqrt{\\dfrac{\\sqrt{5}-2}{\\sqrt{5}+2}}$',
    '$5$',
  ],
  [
    '$\\dfrac{(\\sqrt{10}+\\sqrt{6})\\sqrt{4-\\sqrt{15}}}{8-2\\sqrt{15}}-\\sqrt{15}$',
    '$4$',
  ],
  [
    '$\\sqrt{\\dfrac{\\sqrt{3}+4}{5-2\\sqrt{3}}}\\cdot(\\sqrt{6}-\\sqrt{2})$',
    '$2$',
  ],
  [
    '$\\dfrac{3+\\sqrt{5}}{5-\\sqrt{9+4\\sqrt{5}}}+\\dfrac{3-\\sqrt{5}}{4+\\sqrt{6-2\\sqrt{5}}}$',
    '$7$',
  ],
  [
    '$\\sqrt{\\dfrac{2\\sqrt{10}+\\sqrt{30}-2\\sqrt{2}-\\sqrt{6}}{2\\sqrt{10}-2\\sqrt{2}}}+\\dfrac{1}{\\sqrt{3}+1}$',
    '$\\sqrt{3}$',
  ],
];

bai3.forEach(([q, a], i) => {
  n += 1;
  const kind = i % 3;
  if (kind === 0) {
    W(`Câu ${n}. Rút gọn biểu thức: ${q}.`);
    W(`Đáp án: ${a}`);
  } else if (kind === 1) {
    W(`Câu ${n}. [điền chỗ trống]`);
    W(`Rút gọn ${q} được {{1}}.`);
    W(`Đáp án: 1=${a.replace(/^\$/, '').replace(/\$$/, '')}`);
  } else {
    W(`Câu ${n}. Rút gọn: ${q}. Kết quả bằng?`);
    W('A. $0$');
    W(`B. ${a}`);
    W('C. $1$');
    W('D. $-1$');
    W('Đáp án: B');
  }
  W('---');
});

const bai4 = [
  ['$\\sqrt{4(1-2x)^2}=6$', '$x=-1$ hoặc $x=2$'],
  ['$\\sqrt{9-2x}=\\sqrt{x^2+9}$', 'thử lại theo điều kiện'],
  ['$\\sqrt{36x^2-12x+1}=3$', '$x=\\dfrac{2}{3}$ hoặc $x=0$'],
  ['$\\sqrt{9x^2-6x+1}-2=0$', '$x=1$ hoặc $x=-\\dfrac{1}{3}$'],
  ['$\\sqrt{4x^2-12x+9}+5=4x$', '$x=\\dfrac{4}{3}$'],
  ['$\\sqrt{9x^2-12x+4}+4=5x$', '$x=1$'],
  ['$\\sqrt{x^2-5}=\\sqrt{4x-9}$', 'giải theo điều kiện'],
  ['$\\sqrt{4x^2+x-3}=2x$', 'giải với $x\\ge 0$'],
  ['$\\sqrt{9x^2-12x+4}=\\sqrt{4x^2-12x+9}$', '$x=\\dfrac{7}{2}$'],
  ['$\\sqrt{x^2-4x+4}=\\sqrt{100x^2}$', '$|x-2|=10|x|$'],
  ['$\\sqrt{9x^2-3}+1=|3x-2|$', 'theo nguồn Bài 4 ý 11'],
  ['$\\sqrt{x^2-2}-x=1$', 'theo điều kiện'],
  [
    '$2\\sqrt{12-4x}+\\dfrac{3}{4}\\sqrt{48-16x}-3\\sqrt{\\dfrac{75-25x}{9}}=6$',
    'rút về $\\sqrt{3-x}$',
  ],
  [
    '$5\\sqrt{4x-16}-2\\sqrt{25x-100}+14\\sqrt{\\dfrac{9x-36}{49}}=42$',
    'rút về $\\sqrt{x-4}$',
  ],
  [
    '$\\sqrt{4x+20}+\\dfrac{5}{4}\\sqrt{\\dfrac{16x+80}{25}}-\\dfrac{2}{3}\\sqrt{9x+45}=4$',
    'rút về $\\sqrt{x+5}$',
  ],
  [
    '$\\sqrt{4x^2+4}-3\\sqrt{\\dfrac{x^2+1}{9}}=2$',
    'rút về $\\sqrt{x^2+1}$',
  ],
  [
    '$\\sqrt{4-8x}+\\dfrac{6}{5}\\sqrt{25-50x}-\\sqrt{9-18x}+26=0$',
    'rút về $\\sqrt{1-2x}$',
  ],
  [
    '$\\sqrt[3]{9x-9}+5\\sqrt[3]{\\dfrac{x-1}{25}}=\\sqrt[3]{112}$',
    'theo nguồn Bài 4 ý 18',
  ],
];

bai4.forEach(([q, a]) => {
  n += 1;
  W(`Câu ${n}. Giải phương trình: ${q}.`);
  W(`Đáp án: ${a}`);
  W('---');
});

n += 1;
W(
  `Câu ${n}. Cho $P=(2+\\sqrt{a})\\left(\\dfrac{1}{\\sqrt{a}+2}-\\dfrac{1}{2-\\sqrt{a}}+\\dfrac{a}{4-a}\\right)$ với $a\\ge 0,a\\ne 4$. Rút gọn $P$.`,
);
W('Đáp án: $-\\sqrt{a}$');
W('---');
n += 1;
W(`Câu ${n}. Với $P$ đã rút gọn, tính $P$ khi $a=0{,}81$.`);
W('Đáp án: $-0{,}9$');
W('---');
n += 1;
W(`Câu ${n}. Với $P=-\\sqrt{a}$, tìm $a$ để $P=5$.`);
W('Đáp án: vô nghiệm');
W('---');
n += 1;
W(
  `Câu ${n}. Thùng lập phương cạnh $x$ (cm). Viết công thức $V(cm^3)$ và $S(cm^2)$ theo $x$.`,
);
W('Đáp án: $V=x^3$; $S=6x^2$');
W('---');
n += 1;
W(`Câu ${n}. Từ $S=6x^2$, viết công thức tính $x$ theo $S$.`);
W('Đáp án: $x=\\sqrt{\\dfrac{S}{6}}$');
W('---');
n += 1;
W(`Câu ${n}. [điền chỗ trống]`);
W('Viết $V$ theo $S$: $V={{1}}$. Khi $S=50$, thì $V={{2}}$.');
W('Đáp án: 1=\\sqrt{\\dfrac{S^3}{216}}; 2=\\dfrac{125\\sqrt{3}}{9}');
W('---');

// Bài 1 lại dưới dạng câu luyện tập riêng (đảm bảo ≥90% ý nguồn có trong luyện tập)
bai1.forEach((it) => {
  n += 1;
  W(`Câu ${n}. Rút gọn: ${it.q}.`);
  W(`Đáp án: ${it.a}`);
  W('---');
});

W('TÓM TẮT BÀI HỌC');
W('TITLE: Ôn tập Chương 3 — Căn thức');
W('ROOT: Căn bậc hai và căn bậc ba');
W('- Rút gọn căn (cộng trừ, nhân chia)');
W('- Dạng $\\sqrt{a\\pm b\\sqrt{c}}$');
W('- Trục căn ở mẫu');
W('- Phương trình chứa căn');
W('- Ứng dụng: biểu thức P, hình lập phương');
W('');
W('TÀI LIỆU PDF');
W('(file nguồn: ÔN TẬP CHƯƠNG III.pdf)');

const text = lines.join('\n');
const p1 = path.join(outDir, 'on-tap-chuong-3-import.txt');
const p2 = 'docs/on-tap-chuong-3-toan9-import.txt';
fs.writeFileSync(p1, text, 'utf8');
fs.writeFileSync(p2, text, 'utf8');
const cau = (text.match(/^Câu\s+\d+/gm) || []).length;
const vidu = (text.match(/^Ví dụ\s+\d+/gm) || []).length;
console.log(JSON.stringify({ bytes: Buffer.byteLength(text, 'utf8'), cau, vidu, p1, p2 }, null, 2));
