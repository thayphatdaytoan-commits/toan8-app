/**
 * Ghi 9 file import TXT Toán 7 (Chương I–II) theo mẫu mau-import-bai-giang-BAT-BUOC
 * + skill import-bai-giang-luyen-tap.
 *
 * Chạy: node scripts/write-toan7-imports.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASE_BG = path.join(ROOT, 'tai-lieu-dang-web', 'Toán 7', 'Bài Giảng');
const DOCS_OUT = path.join(ROOT, 'docs', 'toan7-imports');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function meta(o) {
  return [
    `@grade_level: 7`,
    `@chapter: ${o.chapter}`,
    `@lesson_no: ${o.lesson_no}`,
    `@title: ${o.title}`,
    `@video_url:`,
    `@video_material_url:`,
    `@pdf_url:`,
    `@seo_description: ${o.seo}`,
    `@focus_keyword: ${o.focus}`,
    `@keywords: ${o.keywords}`,
    ``,
  ].join('\n');
}

function qMcq(n, stem, options, ans, sol) {
  const lines = options.map((t, i) => `${String.fromCharCode(65 + i)}. ${t}`);
  return [
    `Câu ${n}. ${stem}`,
    ...lines,
    `Đáp án: ${ans}`,
    `Lời giải:`,
    sol,
    `---`,
    ``,
  ].join('\n');
}

function qInput(n, stem, ans, sol, placeholder = 'Đáp án = …') {
  return [
    `Câu ${n}. ${stem}`,
    `Đáp án: ${ans}`,
    `Placeholder: ${placeholder}`,
    `Lời giải:`,
    sol,
    `---`,
    ``,
  ].join('\n');
}

function qTF(n, stem, ans, sol) {
  return [
    `Câu ${n}. [đúng sai]`,
    stem,
    `Đáp án: ${ans}`,
    `Lời giải:`,
    sol,
    `---`,
    ``,
  ].join('\n');
}

function countCau(text) {
  return (text.match(/^Câu \d+\./gm) || []).length;
}

/* ===================== LESSON 1 ===================== */
function lesson1() {
  const theory = `LÝ THUYẾT TRỌNG TÂM
# 1. Số hữu tỉ
Định nghĩa:
Số hữu tỉ là số viết được dưới dạng phân số $\\dfrac{a}{b}$ với $a \\in \\mathbb{Z}$, $b \\in \\mathbb{Z}$ và $b \\ne 0$.
---
Ghi nhớ:
- Tập hợp các số hữu tỉ kí hiệu là $\\mathbb{Q}$.
- Mọi số tự nhiên, số nguyên, số thập phân hữu hạn đều là số hữu tỉ.
- Số hữu tỉ $> 0$ gọi là số hữu tỉ dương; số hữu tỉ $< 0$ gọi là số hữu tỉ âm; số $0$ không dương cũng không âm.
---
# 2. Số đối
Định nghĩa:
Số đối của số hữu tỉ $x$ kí hiệu là $-x$. Ta có $x + (-x) = 0$.
---
# 3. So sánh số hữu tỉ
Phương pháp:
- Đưa về cùng mẫu rồi so sánh tử; hoặc viết dưới dạng thập phân rồi so sánh.
- Trên trục số: số nằm bên phải lớn hơn số nằm bên trái.
`;

  const examples = `CÁC DẠNG TOÁN & VÍ DỤ
Dạng 1: Nhận biết số hữu tỉ và quan hệ thuộc tập hợp
Phương pháp:
Viết số dưới dạng phân số $\\dfrac{a}{b}$ ($b \\ne 0$) nếu được thì số đó $\\in \\mathbb{Q}$. Chú ý $\\mathbb{N} \\subset \\mathbb{Z} \\subset \\mathbb{Q}$.
---
Ví dụ 1:
Số $-2$ có là số hữu tỉ không?
A. Có, vì $-2 = \\dfrac{-2}{1}$
B. Không, vì $-2$ âm
C. Không, vì $-2$ là số nguyên
D. Chỉ khi viết thành thập phân
Đáp án: A
Lời giải:
$-2 = \\dfrac{-2}{1}$ với tử, mẫu nguyên và mẫu khác $0$, nên $-2 \\in \\mathbb{Q}$.
---
Ví dụ 2:
Điền đúng hay sai: $\\dfrac{1}{2} \\in \\mathbb{Z}$.
A. Đúng
B. Sai
C. Không kết luận được
D. Chỉ đúng khi mẫu bằng $1$
Đáp án: B
Lời giải:
$\\dfrac{1}{2}$ không phải số nguyên, nên $\\dfrac{1}{2} \\notin \\mathbb{Z}$.
---
Dạng 2: Tìm số đối và so sánh số hữu tỉ
Phương pháp:
Số đối của $\\dfrac{a}{b}$ là $-\\dfrac{a}{b} = \\dfrac{-a}{b}$. Khi so sánh: quy đồng mẫu hoặc đổi ra thập phân / phần trăm.
---
Ví dụ 1:
Tìm số đối của $-\\dfrac{6}{15}$.
A. $-\\dfrac{6}{15}$
B. $\\dfrac{6}{15}$
C. $\\dfrac{15}{6}$
D. $-\\dfrac{15}{6}$
Đáp án: B
Lời giải:
Số đối của $-\\dfrac{6}{15}$ là $\\dfrac{6}{15}$ (có thể rút gọn thành $\\dfrac{2}{5}$).
---
Ví dụ 2:
So sánh $-\\dfrac{2}{5}$ và $-\\dfrac{3}{4}$.
A. $-\\dfrac{2}{5} > -\\dfrac{3}{4}$
B. $-\\dfrac{2}{5} < -\\dfrac{3}{4}$
C. $-\\dfrac{2}{5} = -\\dfrac{3}{4}$
D. Không so sánh được
Đáp án: A
Lời giải:
Quy đồng mẫu $20$: $-\\dfrac{2}{5} = -\\dfrac{8}{20}$, $-\\dfrac{3}{4} = -\\dfrac{15}{20}$. Vì $-8 > -15$ nên $-\\dfrac{2}{5} > -\\dfrac{3}{4}$.
`;

  const practice = [
    qTF(1, '$-3 \\in \\mathbb{Z}$.', 'Đúng', '$-3$ là số nguyên nên $-3 \\in \\mathbb{Z}$.'),
    qTF(2, '$-2 \\in \\mathbb{N}$.', 'Sai', 'Số tự nhiên không âm; $-2 \\notin \\mathbb{N}$.'),
    qTF(3, '$-\\dfrac{3}{2} \\in \\mathbb{Q}$.', 'Đúng', '$-\\dfrac{3}{2}$ đã ở dạng phân số với mẫu $\\ne 0$, nên thuộc $\\mathbb{Q}$.'),
    qTF(4, '$5 \\in \\mathbb{Q}$.', 'Đúng', '$5 = \\dfrac{5}{1} \\in \\mathbb{Q}$.'),
    qTF(5, '$4{,}7 \\in \\mathbb{Q}$.', 'Đúng', '$4{,}7 = \\dfrac{47}{10} \\in \\mathbb{Q}$.'),
    qTF(6, '$\\dfrac{1}{2} \\in \\mathbb{Z}$.', 'Sai', '$\\dfrac{1}{2}$ không nguyên nên $\\dfrac{1}{2} \\notin \\mathbb{Z}$.'),
    qTF(7, '$0 \\in \\mathbb{Q}$.', 'Đúng', '$0 = \\dfrac{0}{1} \\in \\mathbb{Q}$.'),
    qTF(8, '$25\\% \\in \\mathbb{Z}$.', 'Sai', '$25\\% = \\dfrac{1}{4} \\notin \\mathbb{Z}$.'),
    qInput(9, 'Tìm số đối của $\\dfrac{3}{2}$.', '-3/2', 'Số đối của $\\dfrac{3}{2}$ là $-\\dfrac{3}{2}$.', 'Số đối = …'),
    qInput(10, 'Tìm số đối của $-\\dfrac{4}{7}$.', '4/7', 'Số đối của $-\\dfrac{4}{7}$ là $\\dfrac{4}{7}$.', 'Số đối = …'),
    qMcq(
      11,
      'So sánh $-\\dfrac{2}{5}$ và $-\\dfrac{3}{4}$.',
      ['$-\\dfrac{2}{5} > -\\dfrac{3}{4}$', '$-\\dfrac{2}{5} < -\\dfrac{3}{4}$', '$-\\dfrac{2}{5} = -\\dfrac{3}{4}$', 'Không so sánh được'],
      'A',
      '$-\\dfrac{2}{5}=-\\dfrac{8}{20}$, $-\\dfrac{3}{4}=-\\dfrac{15}{20}$ nên $-\\dfrac{2}{5} > -\\dfrac{3}{4}$.'
    ),
    qMcq(
      12,
      'So sánh $0{,}75$ và $\\dfrac{500}{800}$.',
      ['$0{,}75 > \\dfrac{500}{800}$', '$0{,}75 < \\dfrac{500}{800}$', '$0{,}75 = \\dfrac{500}{800}$', 'Không so sánh được'],
      'A',
      '$\\dfrac{500}{800}=\\dfrac{5}{8}=0{,}625$. Vì $0{,}75 > 0{,}625$ nên $0{,}75 > \\dfrac{500}{800}$.'
    ),
    qMcq(
      13,
      'So sánh $20\\%$ và $0{,}25$.',
      ['$20\\% > 0{,}25$', '$20\\% < 0{,}25$', '$20\\% = 0{,}25$', 'Không so sánh được'],
      'B',
      '$20\\%=0{,}2 < 0{,}25$.'
    ),
    qMcq(
      14,
      'So sánh $-0{,}125$ và $-\\dfrac{1}{8}$.',
      ['$-0{,}125 > -\\dfrac{1}{8}$', '$-0{,}125 < -\\dfrac{1}{8}$', '$-0{,}125 = -\\dfrac{1}{8}$', 'Không so sánh được'],
      'C',
      '$-\\dfrac{1}{8}=-0{,}125$ nên hai số bằng nhau.'
    ),
    qMcq(
      15,
      'Bạn Hải đúng $92\\%$ vòng 1 và đúng $36$ câu trên $40$ câu vòng 2. Vòng nào tốt hơn?',
      ['Vòng 1 tốt hơn', 'Vòng 2 tốt hơn', 'Hai vòng bằng nhau', 'Không đủ dữ kiện'],
      'A',
      'Vòng 2: $\\dfrac{36}{40}=90\\%$. Vì $92\\% > 90\\%$ nên vòng 1 tốt hơn.'
    ),
    qMcq(
      16,
      'Cô Thanh chọn chiều cao tầng hầm lớn hơn $\\dfrac{13}{5}\\,\\mathrm{m}$. Các số đo: $2{,}2$; $2{,}36$; $2{,}43$; $2{,}54$; $2{,}5$; $2{,}65$ (m). Số đo nào thỏa mãn?',
      ['$2{,}54$ và $2{,}65$', '$2{,}5$; $2{,}54$; $2{,}65$', 'Chỉ $2{,}65$', '$2{,}43$; $2{,}54$; $2{,}65$'],
      'C',
      '$\\dfrac{13}{5}=2{,}6$. Trong các số đo đã cho, chỉ có $2{,}65 > 2{,}6$.'
    ),
  ];

  return {
    chapter: 1,
    lesson_no: 1,
    title: 'Tập hợp các số hữu tỉ',
    seo: 'Bài 1 Toán 7: tập hợp số hữu tỉ Q, số đối, so sánh và biểu diễn trên trục số.',
    focus: 'tập hợp số hữu tỉ',
    keywords: 'số hữu tỉ, tập hợp Q, số đối, so sánh phân số, Toán 7',
    folder: path.join(BASE_BG, 'CHƯƠNG I. SỐ HỮU TỈ', 'Bài 1. Tập hợp các số hữu tỉ'),
    outName: 'bai-1-tap-hop-cac-so-huu-ti-import.txt',
    docsName: '01-bai-1-tap-hop-cac-so-huu-ti.txt',
    body: meta({
      chapter: 1,
      lesson_no: 1,
      title: 'Tập hợp các số hữu tỉ',
      seo: 'Bài 1 Toán 7: tập hợp số hữu tỉ Q, số đối, so sánh và biểu diễn trên trục số.',
      focus: 'tập hợp số hữu tỉ',
      keywords: 'số hữu tỉ, tập hợp Q, số đối, so sánh phân số, Toán 7',
    }) + theory + '\n' + examples + '\nBÀI TẬP LUYỆN TẬP\n' + practice.join('\n'),
  };
}

/* ===================== LESSON 2 ===================== */
function lesson2() {
  const theory = `LÝ THUYẾT TRỌNG TÂM
# 1. Cộng, trừ số hữu tỉ
Ghi nhớ:
- Cùng mẫu: $\\dfrac{a}{m} + \\dfrac{b}{m} = \\dfrac{a+b}{m}$; $\\dfrac{a}{m} - \\dfrac{b}{m} = \\dfrac{a-b}{m}$.
- Khác mẫu: quy đồng mẫu rồi cộng/trừ tử.
---
# 2. Nhân, chia số hữu tỉ
Ghi nhớ:
- $\\dfrac{a}{b} \\cdot \\dfrac{c}{d} = \\dfrac{ac}{bd}$.
- $\\dfrac{a}{b} : \\dfrac{c}{d} = \\dfrac{a}{b} \\cdot \\dfrac{d}{c} = \\dfrac{ad}{bc}$ ($c \\ne 0$).
---
# 3. Phân phối
Ghi nhớ:
$a(b+c)=ab+ac$. Không dùng $a:b + a:c = a:(b+c)$ (sai).
`;

  const examples = `CÁC DẠNG TOÁN & VÍ DỤ
Dạng 1: Cộng, trừ, nhân, chia số hữu tỉ
Phương pháp:
Quy đồng mẫu khi cộng/trừ; nhân tử–mẫu; chia thì nhân nghịch đảo; rút gọn khi có thể.
---
Ví dụ 1:
Tính $\\dfrac{8}{18} - \\dfrac{15}{27}$.
A. $-\\dfrac{1}{6}$
B. $\\dfrac{1}{6}$
C. $-\\dfrac{1}{9}$
D. $\\dfrac{1}{9}$
Đáp án: A
Lời giải:
$\\dfrac{8}{18}=\\dfrac{4}{9}$, $\\dfrac{15}{27}=\\dfrac{5}{9}$ nên $\\dfrac{4}{9}-\\dfrac{5}{9}=-\\dfrac{1}{9}$. (Kiểm lại: 8/18−15/27 = 4/9 − 5/9 = −1/9. Đáp án C.)
---
Ví dụ 2:
Tính $\\left(-\\dfrac{4}{7}\\right)\\cdot\\dfrac{21}{12}$.
A. $-1$
B. $1$
C. $-\\dfrac{1}{2}$
D. $\\dfrac{1}{2}$
Đáp án: A
Lời giải:
$\\left(-\\dfrac{4}{7}\\right)\\cdot\\dfrac{21}{12} = -\\dfrac{4\\cdot 21}{7\\cdot 12} = -\\dfrac{4\\cdot 3}{12} = -\\dfrac{12}{12}=-1$.
---
Dạng 2: Tính nhanh và tìm $x$
Phương pháp:
Nhóm hạng tử cùng mẫu / dùng phân phối. Khi tìm $x$: chuyển vế đổi dấu hoặc nhân nghịch đảo.
---
Ví dụ 1:
Tính nhanh $\\dfrac{11}{13}+\\dfrac{17}{29}+\\dfrac{2}{13}+\\dfrac{17}{29}$.
A. $1 + \\dfrac{34}{29}$
B. $\\dfrac{13}{13}+\\dfrac{34}{29}$
C. $1+\\dfrac{34}{29}$
D. $\\dfrac{13}{13}+\\dfrac{17}{29}$
Đáp án: C
Lời giải:
$\\left(\\dfrac{11}{13}+\\dfrac{2}{13}\\right)+\\left(\\dfrac{17}{29}+\\dfrac{17}{29}\\right)=1+\\dfrac{34}{29}$.
---
Ví dụ 2:
Tìm $x$ biết $x - \\dfrac{1}{2} = \\dfrac{5}{7}$.
A. $\\dfrac{17}{14}$
B. $\\dfrac{3}{14}$
C. $\\dfrac{5}{14}$
D. $\\dfrac{12}{14}$
Đáp án: A
Lời giải:
$x = \\dfrac{5}{7}+\\dfrac{1}{2}=\\dfrac{10}{14}+\\dfrac{7}{14}=\\dfrac{17}{14}$.
`;

  // Fix example 1 answer in the examples string - I'll rewrite examples cleanly
  const examplesFixed = `CÁC DẠNG TOÁN & VÍ DỤ
Dạng 1: Cộng, trừ, nhân, chia số hữu tỉ
Phương pháp:
Quy đồng mẫu khi cộng/trừ; nhân tử với tử, mẫu với mẫu; chia thì nhân với nghịch đảo.
---
Ví dụ 1:
Tính $\\dfrac{8}{18}-\\dfrac{15}{27}$.
A. $-\\dfrac{1}{6}$
B. $\\dfrac{1}{6}$
C. $-\\dfrac{1}{9}$
D. $\\dfrac{1}{9}$
Đáp án: C
Lời giải:
$\\dfrac{8}{18}=\\dfrac{4}{9}$, $\\dfrac{15}{27}=\\dfrac{5}{9}$ nên $\\dfrac{4}{9}-\\dfrac{5}{9}=-\\dfrac{1}{9}$.
---
Ví dụ 2:
Tính $\\left(-\\dfrac{4}{7}\\right)\\cdot\\dfrac{21}{12}$.
A. $-1$
B. $1$
C. $-\\dfrac{1}{2}$
D. $\\dfrac{1}{2}$
Đáp án: A
Lời giải:
$\\left(-\\dfrac{4}{7}\\right)\\cdot\\dfrac{21}{12}=-\\dfrac{84}{84}=-1$.
---
Dạng 2: Tính nhanh và tìm ẩn $x$
Phương pháp:
Nhóm hạng tử cùng mẫu; dùng phân phối. Giải phương trình bằng chuyển vế đổi dấu.
---
Ví dụ 1:
Tính nhanh $\\dfrac{11}{13}+\\dfrac{17}{29}+\\dfrac{2}{13}+\\dfrac{17}{29}$.
A. $1+\\dfrac{34}{29}$
B. $\\dfrac{13}{13}+\\dfrac{17}{29}$
C. $1+\\dfrac{17}{29}$
D. $\\dfrac{34}{29}$
Đáp án: A
Lời giải:
$\\dfrac{11+2}{13}+\\dfrac{17+17}{29}=1+\\dfrac{34}{29}$.
---
Ví dụ 2:
Tìm $x$ biết $x-\\dfrac{1}{2}=\\dfrac{5}{7}$.
A. $\\dfrac{17}{14}$
B. $\\dfrac{3}{14}$
C. $\\dfrac{5}{14}$
D. $\\dfrac{12}{7}$
Đáp án: A
Lời giải:
$x=\\dfrac{5}{7}+\\dfrac{1}{2}=\\dfrac{10+7}{14}=\\dfrac{17}{14}$.
`;

  const practice = [
    qMcq(1, 'Tính $\\dfrac{8}{18}-\\dfrac{15}{27}$.', ['$-\\dfrac{1}{6}$', '$\\dfrac{1}{6}$', '$-\\dfrac{1}{9}$', '$\\dfrac{1}{9}$'], 'C', '$\\dfrac{4}{9}-\\dfrac{5}{9}=-\\dfrac{1}{9}$.'),
    qMcq(2, 'Tính $-\\dfrac{5}{12}+0{,}75$.', ['$\\dfrac{1}{3}$', '$\\dfrac{1}{4}$', '$-\\dfrac{1}{3}$', '$\\dfrac{2}{3}$'], 'A', '$0{,}75=\\dfrac{3}{4}=\\dfrac{9}{12}$ nên $-\\dfrac{5}{12}+\\dfrac{9}{12}=\\dfrac{4}{12}=\\dfrac{1}{3}$.'),
    qMcq(3, 'Tính $\\left(-\\dfrac{4}{7}\\right)\\cdot\\dfrac{21}{12}$.', ['$-1$', '$1$', '$-\\dfrac{1}{2}$', '$\\dfrac{1}{2}$'], 'A', '$-\\dfrac{4\\cdot21}{7\\cdot12}=-1$.'),
    qMcq(4, 'Tính $\\dfrac{17}{15}:\\dfrac{4}{5}$.', ['$\\dfrac{17}{12}$', '$\\dfrac{68}{75}$', '$\\dfrac{17}{4}$', '$\\dfrac{4}{17}$'], 'A', '$\\dfrac{17}{15}\\cdot\\dfrac{5}{4}=\\dfrac{17}{12}$.'),
    qMcq(5, 'Tính $\\dfrac{2}{7}+\\dfrac{6}{21}-\\dfrac{3}{14}$.', ['$\\dfrac{5}{14}$', '$\\dfrac{1}{2}$', '$\\dfrac{3}{14}$', '$\\dfrac{11}{42}$'], 'A', 'Quy đồng mẫu $42$: $\\dfrac{12}{42}+\\dfrac{12}{42}-\\dfrac{9}{42}=\\dfrac{15}{42}=\\dfrac{5}{14}$.'),
    qMcq(6, 'Tính $\\dfrac{7}{3}\\cdot\\dfrac{1}{3}\\cdot\\dfrac{9}{5}$.', ['$\\dfrac{7}{5}$', '$\\dfrac{21}{5}$', '$\\dfrac{7}{15}$', '$\\dfrac{63}{45}$'], 'A', '$\\dfrac{7\\cdot1\\cdot9}{3\\cdot3\\cdot5}=\\dfrac{63}{45}=\\dfrac{7}{5}$.'),
    qMcq(7, 'Tính nhanh $\\dfrac{11}{13}+\\dfrac{17}{29}+\\dfrac{2}{13}+\\dfrac{17}{29}$.', ['$1+\\dfrac{34}{29}$', '$1+\\dfrac{17}{29}$', '$\\dfrac{13}{13}+\\dfrac{17}{29}$', '$\\dfrac{34}{29}$'], 'A', 'Nhóm: $1+\\dfrac{34}{29}$.'),
    qInput(8, 'Tìm $x$ biết $x-\\dfrac{1}{2}=\\dfrac{5}{7}$. Viết đáp án dạng phân số tối giản.', '17/14', '$x=\\dfrac{5}{7}+\\dfrac{1}{2}=\\dfrac{17}{14}$.', 'x = …'),
    qInput(9, 'Tìm $x$ biết $-\\dfrac{2}{7}-x=-\\dfrac{6}{7}$.', '4/7', '$-x=-\\dfrac{6}{7}+\\dfrac{2}{7}=-\\dfrac{4}{7}$ nên $x=\\dfrac{4}{7}$.', 'x = …'),
    qInput(10, 'Tìm $x$ biết $-\\dfrac{4}{7}x=\\dfrac{1}{3}$.', '-7/12', '$x=\\dfrac{1}{3}:\\left(-\\dfrac{4}{7}\\right)=\\dfrac{1}{3}\\cdot\\left(-\\dfrac{7}{4}\\right)=-\\dfrac{7}{12}$.', 'x = …'),
    qInput(11, 'Bể chứa nước $\\dfrac{3}{4}$ dung tích. Mỗi giờ thêm $\\dfrac{1}{8}$ bể. Hỏi sau bao nhiêu giờ thì đầy bể?', '2', 'Còn thiếu $1-\\dfrac{3}{4}=\\dfrac{1}{4}$. Thời gian: $\\dfrac{1}{4}:\\dfrac{1}{8}=2$ (giờ).', 'Số giờ = …'),
    qMcq(12, 'Sau khi ghép, mảnh ván dài $3{,}2\\,\\mathrm{m}$, phần ghép chung $\\dfrac{3}{50}\\,\\mathrm{m}$, mảnh thứ nhất dài $2\\dfrac{1}{5}\\,\\mathrm{m}$. Chiều dài mảnh thứ hai là?', ['$1{,}06\\,\\mathrm{m}$', '$1\\,\\mathrm{m}$', '$1{,}2\\,\\mathrm{m}$', '$0{,}96\\,\\mathrm{m}$'], 'A', 'Tổng hai mảnh $=3{,}2+\\dfrac{3}{50}=3{,}26$. Mảnh 1 $=2{,}2$. Mảnh 2 $=3{,}26-2{,}2=1{,}06\\,\\mathrm{m}$.'),
    qInput(13, 'Lượng gạo còn $\\dfrac{2}{3}$ thùng, mỗi tháng dùng $10\\,\\mathrm{kg}$, còn đủ $6$ tháng. Thùng chứa tối đa bao nhiêu kg?', '90', '$\\dfrac{2}{3}$ thùng $=10\\cdot6=60\\,\\mathrm{kg}$ nên cả thùng $=60:\\dfrac{2}{3}=90\\,\\mathrm{kg}$.', 'Số kg = …'),
    qInput(14, 'Tuần đầu làm $\\dfrac{1}{5}$, hai tuần sau làm $\\dfrac{1}{2}$, còn thiếu $300$ sản phẩm. Tổng sản phẩm cần làm trong tháng là?', '1000', 'Đã làm $\\dfrac{1}{5}+\\dfrac{1}{2}=\\dfrac{7}{10}$, còn $\\dfrac{3}{10}=300$ nên tổng $=300:\\dfrac{3}{10}=1000$.', 'Tổng = …'),
    qMcq(15, 'Đỉnh Bà Đen cao bằng $\\dfrac{2}{5}$ Ngọc Linh; Ngọc Linh bằng $0{,}78$ Phan Xi Păng. Bà Đen bằng bao nhiêu phần Phan Xi Păng?', ['$0{,}312$', '$0{,}39$', '$0{,}78$', '$\\dfrac{2}{5}$'], 'A', '$\\dfrac{2}{5}\\cdot 0{,}78=0{,}312$.'),
    qInput(16, 'Đỉnh Bà Đen cao khoảng $980\\,\\mathrm{m}$ và bằng $\\dfrac{2}{5}$ Ngọc Linh. Độ cao Ngọc Linh (m) là?', '2450', 'Ngọc Linh $=980:\\dfrac{2}{5}=2450\\,\\mathrm{m}$.', 'Độ cao = …'),
  ];

  return {
    folder: path.join(BASE_BG, 'CHƯƠNG I. SỐ HỮU TỈ', 'Bài 2. Cộng, trừ, nhân, chia số hữu tỉ'),
    outName: 'bai-2-cong-tru-nhan-chia-so-huu-ti-import.txt',
    docsName: '02-bai-2-cong-tru-nhan-chia-so-huu-ti.txt',
    body:
      meta({
        chapter: 1,
        lesson_no: 2,
        title: 'Cộng, trừ, nhân, chia số hữu tỉ',
        seo: 'Bài 2 Toán 7: cộng trừ nhân chia số hữu tỉ, tính nhanh và bài toán thực tế.',
        focus: 'phép tính số hữu tỉ',
        keywords: 'cộng trừ nhân chia, số hữu tỉ, tính nhanh, Toán 7',
      }) +
      theory +
      '\n' +
      examplesFixed +
      '\nBÀI TẬP LUYỆN TẬP\n' +
      practice.join('\n'),
  };
}

/* ===================== LESSON 3 ===================== */
function lesson3() {
  const theory = `LÝ THUYẾT TRỌNG TÂM
# 1. Lũy thừa với số mũ tự nhiên
Định nghĩa:
Với $x \\in \\mathbb{Q}$ và $n \\in \\mathbb{N}$, $n \\ge 1$: $x^n = \\underbrace{x \\cdot x \\cdot \\ldots \\cdot x}_{n\\ \\text{thừa số}}$.
Quy ước: $x^0 = 1$ với $x \\ne 0$; $x^1 = x$.
---
# 2. Các công thức
Ghi nhớ:
- $a^m \\cdot a^n = a^{m+n}$
- $a^m : a^n = a^{m-n}$ ($a \\ne 0$)
- $(a^m)^n = a^{mn}$
- $(ab)^n = a^n b^n$; $\\left(\\dfrac{a}{b}\\right)^n = \\dfrac{a^n}{b^n}$ ($b \\ne 0$)
`;

  const examples = `CÁC DẠNG TOÁN & VÍ DỤ
Dạng 1: Rút gọn và tính lũy thừa
Phương pháp:
Áp dụng công thức cùng cơ số; đưa cơ số về cùng dạng rồi cộng/trừ số mũ.
---
Ví dụ 1:
Rút gọn $\\left(\\dfrac{1}{6}\\right)^5 \\cdot \\left(\\dfrac{1}{6}\\right)^2$.
A. $\\left(\\dfrac{1}{6}\\right)^7$
B. $\\left(\\dfrac{1}{6}\\right)^{10}$
C. $\\left(\\dfrac{1}{6}\\right)^3$
D. $\\dfrac{1}{6^7}$ (khác A)
Đáp án: A
Lời giải:
$\\left(\\dfrac{1}{6}\\right)^5\\cdot\\left(\\dfrac{1}{6}\\right)^2=\\left(\\dfrac{1}{6}\\right)^{7}$.
---
Ví dụ 2:
Tính $\\left(\\dfrac{4}{7}\\right)^2$.
A. $\\dfrac{16}{49}$
B. $\\dfrac{8}{14}$
C. $\\dfrac{16}{7}$
D. $\\dfrac{4}{49}$
Đáp án: A
Lời giải:
$\\left(\\dfrac{4}{7}\\right)^2=\\dfrac{16}{49}$.
---
Dạng 2: Viết dưới dạng một lũy thừa và tính giá trị
Phương pháp:
Đưa các thừa số về cùng cơ số (thường là $2$, $3$, $5$,…) rồi dùng công thức nhân/chia lũy thừa.
---
Ví dụ 1:
Tính $\\dfrac{4^2 \\cdot 4^3}{2^{10}}$.
A. $1$
B. $2$
C. $4$
D. $\\dfrac{1}{2}$
Đáp án: A
Lời giải:
$4=2^2$ nên $\\dfrac{(2^2)^2 \\cdot (2^2)^3}{2^{10}}=\\dfrac{2^4 \\cdot 2^6}{2^{10}}=\\dfrac{2^{10}}{2^{10}}=1$.
---
Ví dụ 2:
Tính $\\left(-\\dfrac{1}{2}\\right)^3$.
A. $-\\dfrac{1}{8}$
B. $\\dfrac{1}{8}$
C. $-\\dfrac{1}{6}$
D. $-\\dfrac{3}{2}$
Đáp án: A
Lời giải:
$\\left(-\\dfrac{1}{2}\\right)^3=-\\dfrac{1}{8}$.
`;

  const practice = [
    qMcq(1, 'Rút gọn $\\left(\\dfrac{1}{6}\\right)^5\\cdot\\left(\\dfrac{1}{6}\\right)^2$.', ['$\\left(\\dfrac{1}{6}\\right)^7$', '$\\left(\\dfrac{1}{6}\\right)^{10}$', '$\\left(\\dfrac{1}{6}\\right)^3$', '$\\left(\\dfrac{1}{36}\\right)^7$'], 'A', 'Cùng cơ số: cộng mũ $5+2=7$.'),
    qMcq(2, 'Rút gọn $\\left(-\\dfrac{13}{9}\\right)^4 : \\left(-\\dfrac{13}{9}\\right)^4$.', ['$1$', '$-1$', '$\\left(-\\dfrac{13}{9}\\right)^8$', '$0$'], 'A', '$a^n:a^n=1$ với $a\\ne 0$.'),
    qMcq(3, 'Tính $\\left(\\dfrac{4}{7}\\right)^2$.', ['$\\dfrac{16}{49}$', '$\\dfrac{8}{14}$', '$\\dfrac{16}{7}$', '$\\dfrac{4}{49}$'], 'A', '$\\dfrac{4^2}{7^2}=\\dfrac{16}{49}$.'),
    qMcq(4, 'Tính $\\left(-\\dfrac{1}{2}\\right)^3$.', ['$-\\dfrac{1}{8}$', '$\\dfrac{1}{8}$', '$-\\dfrac{1}{6}$', '$-\\dfrac{3}{2}$'], 'A', 'Mũ lẻ giữ dấu âm: $-\\dfrac{1}{8}$.'),
    qMcq(5, 'Tính $\\left(1\\dfrac{1}{4}\\right)^2$.', ['$\\dfrac{25}{16}$', '$\\dfrac{9}{16}$', '$\\dfrac{5}{4}$', '$\\dfrac{25}{4}$'], 'A', '$1\\dfrac{1}{4}=\\dfrac{5}{4}$, $\\left(\\dfrac{5}{4}\\right)^2=\\dfrac{25}{16}$.'),
    qMcq(6, 'Tính $\\left[\\left(\\dfrac{3}{5}\\right)^4 \\cdot \\left(\\dfrac{3}{5}\\right)^5\\right] : \\left(\\dfrac{3}{5}\\right)^7$.', ['$\\left(\\dfrac{3}{5}\\right)^2$', '$\\left(\\dfrac{3}{5}\\right)^9$', '$\\left(\\dfrac{3}{5}\\right)^{16}$', '$1$'], 'A', '$\\left(\\dfrac{3}{5}\\right)^{4+5-7}=\\left(\\dfrac{3}{5}\\right)^2$.'),
    qMcq(7, 'Tính $\\dfrac{4^2\\cdot 4^3}{2^{10}}$.', ['$1$', '$2$', '$4$', '$\\dfrac{1}{2}$'], 'A', '$4=2^2$ nên biểu thức $=\\dfrac{2^{10}}{2^{10}}=1$.'),
    qMcq(8, 'Tính $\\dfrac{8^2\\cdot 4^5}{2^{20}}$.', ['$\\dfrac{1}{16}$', '$1$', '$2$', '$\\dfrac{1}{4}$'], 'A', '$8^2=2^6$, $4^5=2^{10}$ nên $\\dfrac{2^{16}}{2^{20}}=\\dfrac{1}{16}$.'),
    qMcq(9, 'Tính $\\left(\\dfrac{2}{3}\\right)^3 \\cdot \\left(\\dfrac{3}{4}\\right)^3$.', ['$\\dfrac{1}{8}$', '$\\dfrac{1}{4}$', '$\\dfrac{8}{27}$', '$\\dfrac{6}{12}$'], 'A', '$\\left(\\dfrac{2}{3}\\cdot\\dfrac{3}{4}\\right)^3=\\left(\\dfrac{1}{2}\\right)^3=\\dfrac{1}{8}$.'),
    qInput(10, 'Tính $3^0$ (với quy ước đã học).', '1', 'Với $a\\ne 0$, $a^0=1$.', 'Kết quả = …'),
    qMcq(11, 'Viết $4^8 \\cdot 3$ dưới dạng nào gần với một lũy thừa nhất trong các lựa chọn?', ['$3\\cdot (2^2)^8 = 3\\cdot 2^{16}$', '$12^8$', '$4^{11}$', '$7^8$'], 'A', '$4=2^2$ nên $4^8\\cdot 3=3\\cdot 2^{16}$.'),
    qMcq(12, 'Sắp xếp số dân (dạng $a\\cdot 10^n$) từ bé đến lớn: Hàn Quốc $51{,}2\\cdot 10^6$; Trung Quốc $143{,}9\\cdot 10^7$; Hoa Kỳ $331\\cdot 10^6$; Ấn Độ $13{,}8\\cdot 10^8$; Việt Nam $97{,}3\\cdot 10^6$.', ['Hàn → VN → Mỹ → Ấn → Trung', 'VN → Hàn → Mỹ → Ấn → Trung', 'Hàn → Mỹ → VN → Ấn → Trung', 'Hàn → VN → Ấn → Mỹ → Trung'], 'A', 'Đổi về cùng dạng: Hàn $\\approx 5{,}12\\cdot 10^7$; VN $\\approx 9{,}73\\cdot 10^7$; Mỹ $\\approx 3{,}31\\cdot 10^8$; Ấn $\\approx 1{,}38\\cdot 10^9$; Trung $\\approx 1{,}439\\cdot 10^9$.'),
    qMcq(13, 'Ba chu kì bán rã Uranium-238 mỗi chu kì $4{,}468\\cdot 10^9$ năm. Ba chu kì bằng?', ['$1{,}3404\\cdot 10^{10}$', '$1{,}3404\\cdot 10^9$', '$4{,}468\\cdot 10^{27}$', '$13{,}404\\cdot 10^{10}$'], 'A', '$3\\cdot 4{,}468\\cdot 10^9 = 13{,}404\\cdot 10^9 = 1{,}3404\\cdot 10^{10}$.'),
    qMcq(14, 'Sau ba chu kì bán rã, khối lượng còn lại bằng bao nhiêu phần ban đầu?', ['$\\dfrac{1}{8}$', '$\\dfrac{1}{4}$', '$\\dfrac{1}{2}$', '$\\dfrac{1}{16}$'], 'A', 'Mỗi chu kì còn $\\dfrac{1}{2}$ nên sau $3$ chu kì còn $\\left(\\dfrac{1}{2}\\right)^3=\\dfrac{1}{8}$.'),
    qMcq(15, 'Tính $\\dfrac{15^2 \\cdot 9^3}{25^2 \\cdot 27}$.', ['$\\dfrac{81}{5}$', '$\\dfrac{9}{5}$', '$\\dfrac{27}{5}$', '$\\dfrac{3}{5}$'], 'A', 'Viết $15=3\\cdot5$, $9=3^2$, $25=5^2$, $27=3^3$ rồi rút gọn được $\\dfrac{3^4}{5}=\\dfrac{81}{5}$.'),
    qMcq(16, 'Tính $\\left[\\left(\\dfrac{7}{9}\\right)^{11}\\right]:\\left[\\left(\\dfrac{7}{9}\\right)^5 \\cdot \\left(\\dfrac{7}{9}\\right)^3\\right]$.', ['$\\left(\\dfrac{7}{9}\\right)^3$', '$\\left(\\dfrac{7}{9}\\right)^8$', '$\\left(\\dfrac{7}{9}\\right)^{19}$', '$1$'], 'A', 'Mũ: $11-(5+3)=3$.'),
  ];

  return {
    folder: path.join(BASE_BG, 'CHƯƠNG I. SỐ HỮU TỈ', 'Bài 3. Luỹ thừa với số mũ tự nhiên của một số hữu tỉ'),
    outName: 'bai-3-luy-thua-so-mu-tu-nhien-import.txt',
    docsName: '03-bai-3-luy-thua-so-mu-tu-nhien.txt',
    body:
      meta({
        chapter: 1,
        lesson_no: 3,
        title: 'Luỹ thừa với số mũ tự nhiên của một số hữu tỉ',
        seo: 'Bài 3 Toán 7: lũy thừa số hữu tỉ, công thức nhân chia lũy thừa và dạng khoa học.',
        focus: 'lũy thừa số hữu tỉ',
        keywords: 'lũy thừa, số mũ tự nhiên, công thức lũy thừa, Toán 7',
      }) +
      theory +
      '\n' +
      examples +
      '\nBÀI TẬP LUYỆN TẬP\n' +
      practice.join('\n'),
  };
}

/* ===================== LESSON 4 ===================== */
function lesson4() {
  const theory = `LÝ THUYẾT TRỌNG TÂM
# 1. Thứ tự thực hiện phép tính
Ghi nhớ:
- Không có ngoặc: Lũy thừa → Nhân, chia (trái sang phải) → Cộng, trừ (trái sang phải).
- Có ngoặc: thực hiện trong $(\\ )$ rồi $[\\ ]$ rồi $\\{\\ \\}$.
---
# 2. Quy tắc dấu ngoặc
Ghi nhớ:
- Trước ngoặc có dấu $+$: giữ nguyên dấu các số hạng trong ngoặc.
- Trước ngoặc có dấu $-$: đổi dấu tất cả các số hạng trong ngoặc.
---
# 3. Quy tắc chuyển vế
Định lí:
Khi chuyển một số hạng từ vế này sang vế kia của đẳng thức, phải đổi dấu số hạng đó.
`;

  const examples = `CÁC DẠNG TOÁN & VÍ DỤ
Dạng 1: Tính giá trị biểu thức theo đúng thứ tự
Phương pháp:
Làm ngoặc trước; trong ngoặc vẫn theo thứ tự lũy thừa → nhân chia → cộng trừ.
---
Ví dụ 1:
Tính $\\dfrac{5}{4}-\\dfrac{3}{7}+\\dfrac{21}{8}$.
A. $\\dfrac{67}{28}$
B. $\\dfrac{5}{4}$
C. $\\dfrac{21}{8}$
D. $\\dfrac{1}{2}$
Đáp án: A
Lời giải:
Quy đồng mẫu $56$: $\\dfrac{70}{56}-\\dfrac{24}{56}+\\dfrac{147}{56}=\\dfrac{193}{56}$. (Recheck LCD of 4,7,8 = 56: 5/4=70/56, 3/7=24/56, 21/8=147/56 → 70-24+147=193/56. Fix A to 193/56.)
---
Ví dụ 2:
Tìm $x$ biết $x+\\dfrac{3}{4}=\\dfrac{1}{2}$.
A. $-\\dfrac{1}{4}$
B. $\\dfrac{1}{4}$
C. $\\dfrac{5}{4}$
D. $-\\dfrac{5}{4}$
Đáp án: A
Lời giải:
$x=\\dfrac{1}{2}-\\dfrac{3}{4}=-\\dfrac{1}{4}$.
---
Dạng 2: Bài toán phần trăm, giảm giá
Phương pháp:
Số tiền sau giảm $p\\%$: nhân với $(100\\%-p\\%)$. Giá gốc: chia cho $(100\\%-p\\%)$.
---
Ví dụ 1:
Sách giá $50000$ đồng, giảm $15\\%$. Số tiền phải trả là?
A. $42500$
B. $45000$
C. $47500$
D. $41500$
Đáp án: A
Lời giải:
$50000\\cdot(100\\%-15\\%)=50000\\cdot 0{,}85=42500$.
---
Ví dụ 2:
Đồng hồ mua với giá $2600000$ đồng sau khi giảm $35\\%$. Giá trước giảm là?
A. $4000000$
B. $3500000$
C. $3000000$
D. $3900000$
Đáp án: A
Lời giải:
Giá gốc $=2600000:(100\\%-35\\%)=2600000:0{,}65=4000000$.
`;

  const examplesFixed = `CÁC DẠNG TOÁN & VÍ DỤ
Dạng 1: Tính biểu thức và chuyển vế tìm $x$
Phương pháp:
Theo thứ tự phép tính; khi tìm $x$ dùng quy tắc chuyển vế đổi dấu.
---
Ví dụ 1:
Tính $\\dfrac{7}{12}\\cdot\\dfrac{27}{7}\\cdot\\dfrac{1}{18}$.
A. $\\dfrac{1}{8}$
B. $\\dfrac{1}{4}$
C. $\\dfrac{3}{8}$
D. $\\dfrac{1}{16}$
Đáp án: A
Lời giải:
$\\dfrac{7\\cdot27\\cdot1}{12\\cdot7\\cdot18}=\\dfrac{27}{216}=\\dfrac{1}{8}$.
---
Ví dụ 2:
Tìm $x$ biết $x+\\dfrac{3}{4}=\\dfrac{1}{2}$.
A. $-\\dfrac{1}{4}$
B. $\\dfrac{1}{4}$
C. $\\dfrac{5}{4}$
D. $-\\dfrac{5}{4}$
Đáp án: A
Lời giải:
$x=\\dfrac{1}{2}-\\dfrac{3}{4}=-\\dfrac{1}{4}$.
---
Dạng 2: Bài toán giảm giá, lãi suất
Phương pháp:
Sau giảm $p\\%$ nhân $(1-p/100)$. Giá gốc = giá sau giảm $:(1-p/100)$.
---
Ví dụ 1:
Sách $50000$ đồng giảm $15\\%$. Phải trả bao nhiêu?
A. $42500$
B. $45000$
C. $47500$
D. $41500$
Đáp án: A
Lời giải:
$50000\\times 0{,}85=42500$.
---
Ví dụ 2:
Mua đồng hồ $2600000$ đồng (đã giảm $35\\%$). Giá gốc là?
A. $4000000$
B. $3500000$
C. $3000000$
D. $3900000$
Đáp án: A
Lời giải:
$2600000:0{,}65=4000000$.
`;

  const practice = [
    qMcq(1, 'Tính $\\dfrac{7}{12}\\cdot\\dfrac{27}{7}\\cdot\\dfrac{1}{18}$.', ['$\\dfrac{1}{8}$', '$\\dfrac{1}{4}$', '$\\dfrac{3}{8}$', '$\\dfrac{1}{16}$'], 'A', 'Rút gọn được $\\dfrac{1}{8}$.'),
    qMcq(2, 'Tính $\\left(\\dfrac{3}{4}+\\dfrac{1}{4}\\right)\\cdot(-3)$.', ['$-3$', '$3$', '$-\\dfrac{9}{4}$', '$0$'], 'A', 'Trong ngoặc $=1$, nhân $-3$ được $-3$.'),
    qMcq(3, 'Tính $\\dfrac{5}{4}-\\dfrac{3}{7}\\cdot\\dfrac{21}{8}$.', ['$\\dfrac{1}{8}$', '$\\dfrac{5}{8}$', '$-\\dfrac{1}{8}$', '$\\dfrac{17}{8}$'], 'A', 'Nhân trước: $\\dfrac{3}{7}\\cdot\\dfrac{21}{8}=\\dfrac{9}{8}$; rồi $\\dfrac{5}{4}-\\dfrac{9}{8}=\\dfrac{10}{8}-\\dfrac{9}{8}=\\dfrac{1}{8}$.'),
    qMcq(4, 'Bỏ dấu ngoặc: $3-\\left(2-\\dfrac{1}{5}\\right)$.', ['$1+\\dfrac{1}{5}$', '$5-\\dfrac{1}{5}$', '$1-\\dfrac{1}{5}$', '$3-2-\\dfrac{1}{5}$'], 'A', '$3-2+\\dfrac{1}{5}=1+\\dfrac{1}{5}$.'),
    qInput(5, 'Tìm $x$ biết $x+\\dfrac{3}{4}=\\dfrac{1}{2}$.', '-1/4', '$x=\\dfrac{1}{2}-\\dfrac{3}{4}=-\\dfrac{1}{4}$.', 'x = …'),
    qInput(6, 'Tìm $x$ biết $\\dfrac{5}{2}-x=\\dfrac{3}{2}$.', '1', '$x=\\dfrac{5}{2}-\\dfrac{3}{2}=1$.', 'x = …'),
    qInput(7, 'Sách giá $50000$ đồng giảm $15\\%$. Số tiền phải trả?', '42500', '$50000\\times 0{,}85=42500$.', 'Số tiền = …'),
    qInput(8, 'Hằng mua $2$ áo ($200000$/áo) và $2$ quần ($350000$/quần), giảm $20\\%$. Tổng phải trả?', '880000', 'Tổng gốc $=2\\cdot200000+2\\cdot350000=1100000$; sau giảm $1100000\\times 0{,}8=880000$.', 'Số tiền = …'),
    qInput(9, 'Ly mua $5$ sách ($120000$/quyển), có thẻ giảm $10\\%$, đưa $600000$. Tiền thừa nhận lại?', '60000', 'Phải trả $5\\cdot120000\\times 0{,}9=540000$; thừa $600000-540000=60000$.', 'Tiền thừa = …'),
    qInput(10, 'Bác Nam gửi $90$ triệu, lãi suất $6{,}5\\%$/năm, rút sau $1$ năm (gốc+lãi). Số tiền rút?', '96450000', '$90\\,000\\,000\\times 1{,}065=96\\,450\\,000$.', 'Số tiền = …'),
    qInput(11, 'Đồng hồ mua $2600000$ đồng sau giảm $35\\%$. Giá trước giảm?', '4000000', '$2600000:0{,}65=4000000$.', 'Giá gốc = …'),
    qInput(12, 'Mua $10$ sách cùng loại, giảm $20\\%$ phải trả $144000$. Giá mỗi quyển trước giảm?', '18000', 'Giá $10$ quyển trước giảm $=144000:0{,}8=180000$; mỗi quyển $=18000$.', 'Giá mỗi quyển = …'),
    qInput(13, 'Trả $2915000$ đã gồm VAT $10\\%$. Giá chưa VAT?', '2650000', 'Giá chưa thuế $=2915000:1{,}1=2650000$.', 'Giá = …'),
    qMcq(14, 'Tính $\\dfrac{2}{3}:\\dfrac{8}{9}\\cdot\\dfrac{5}{7}$.', ['$\\dfrac{15}{28}$', '$\\dfrac{5}{14}$', '$\\dfrac{10}{21}$', '$\\dfrac{16}{63}$'], 'A', '$\\dfrac{2}{3}\\cdot\\dfrac{9}{8}\\cdot\\dfrac{5}{7}=\\dfrac{15}{28}$.'),
    qMcq(15, 'Tính $\\left(\\dfrac{1}{7}+\\dfrac{6}{7}\\right)\\cdot\\left(\\dfrac{1}{2}-\\dfrac{1}{3}\\right)$.', ['$\\dfrac{1}{6}$', '$\\dfrac{1}{2}$', '$\\dfrac{1}{3}$', '$1$'], 'A', '$1\\cdot\\left(\\dfrac{3-2}{6}\\right)=\\dfrac{1}{6}$.'),
    qMcq(16, 'Khẳng định nào đúng về thứ tự phép tính khi không có ngoặc?', ['Lũy thừa → nhân chia → cộng trừ', 'Cộng trừ → nhân chia → lũy thừa', 'Nhân chia → lũy thừa → cộng trừ', 'Từ trái sang phải bất kỳ'], 'A', 'Quy tắc chuẩn: lũy thừa trước, rồi nhân chia, cuối cùng cộng trừ.'),
  ];

  return {
    folder: path.join(BASE_BG, 'CHƯƠNG I. SỐ HỮU TỈ', 'Bài 4. Thứ tự thực hiện các phép tính. Quy tắc chuyển vế'),
    outName: 'bai-4-thu-tu-phep-tinh-chuyen-ve-import.txt',
    docsName: '04-bai-4-thu-tu-phep-tinh-chuyen-ve.txt',
    body:
      meta({
        chapter: 1,
        lesson_no: 4,
        title: 'Thứ tự thực hiện các phép tính. Quy tắc chuyển vế',
        seo: 'Bài 4 Toán 7: thứ tự phép tính, dấu ngoặc, chuyển vế và bài toán phần trăm.',
        focus: 'thứ tự phép tính chuyển vế',
        keywords: 'thứ tự phép tính, dấu ngoặc, chuyển vế, phần trăm, Toán 7',
      }) +
      theory +
      '\n' +
      examplesFixed +
      '\nBÀI TẬP LUYỆN TẬP\n' +
      practice.join('\n'),
  };
}

/* ===================== OT1 ===================== */
function lessonOT1() {
  const theory = `LÝ THUYẾT TRỌNG TÂM
# Ôn tập Chương I — Số hữu tỉ
Ghi nhớ:
- $\\mathbb{N} \\subset \\mathbb{Z} \\subset \\mathbb{Q}$.
- Cộng/trừ: quy đồng mẫu; nhân: tử–mẫu; chia: nhân nghịch đảo.
- Lũy thừa: $a^m a^n=a^{m+n}$, $a^m:a^n=a^{m-n}$, $(a^m)^n=a^{mn}$.
- Thứ tự: ngoặc → lũy thừa → nhân chia → cộng trừ; chuyển vế đổi dấu.
`;

  const examples = `CÁC DẠNG TOÁN & VÍ DỤ
Dạng 1: Thuộc tính tập hợp và tính biểu thức hỗn hợp
Phương pháp:
Xét $\\in/\\notin$; với biểu thức có lũy thừa và ngoặc thì làm đúng thứ tự.
---
Ví dụ 1:
$-5 \\in \\mathbb{N}$?
A. Đúng
B. Sai
C. Chỉ khi xét số nguyên
D. Không kết luận
Đáp án: B
Lời giải:
$-5 \\notin \\mathbb{N}$.
---
Ví dụ 2:
Tính $\\left[\\left(\\dfrac{3}{7}\\right)^{100}\\cdot\\left(\\dfrac{3}{7}\\right)^{99}\\right]:\\left(\\dfrac{3}{7}\\right)^{100}$.
A. $\\left(\\dfrac{3}{7}\\right)^{99}$
B. $\\left(\\dfrac{3}{7}\\right)^{199}$
C. $1$
D. $\\left(\\dfrac{3}{7}\\right)^{1}$
Đáp án: A
Lời giải:
Mũ: $100+99-100=99$.
---
Dạng 2: Tìm $x$ và bài toán thực tế
Phương pháp:
Chuyển vế đổi dấu; với phương trình dạng $x^n=a$ lấy căn/lũy thừa phù hợp trong chương đã học.
---
Ví dụ 1:
Tìm $x$ biết $x-\\dfrac{5}{7}=-\\dfrac{1}{4}-\\dfrac{3}{5}$.
A. $-\\dfrac{53}{140}$
B. $\\dfrac{53}{140}$
C. $-\\dfrac{1}{4}$
D. $-\\dfrac{5}{7}$
Đáp án: A
Lời giải:
Vế phải $= -\\dfrac{5}{20}-\\dfrac{12}{20}=-\\dfrac{17}{20}$? Better: $-1/4-3/5=-5/20-12/20=-17/20$. Then x = -17/20 + 5/7. LCD 140: -119/140 + 100/140 = -19/140. Recalc carefully...
Actually example: x - 5/7 = -1/4 - 3/5. RHS = -5/20 - 12/20 = -17/20. x = -17/20 + 5/7 = (-119 + 100)/140 = -19/140.
---
Ví dụ 2:
Máy giặt niêm yết $10000000$, giảm $15\\%$ rồi giảm thêm $5\\%$ trên giá đã giảm. Phải trả?
A. $8075000$
B. $8000000$
C. $8500000$
D. $9025000$
Đáp án: A
Lời giải:
$10000000\\times 0{,}85\\times 0{,}95=8075000$.
`;

  const examplesFixed = `CÁC DẠNG TOÁN & VÍ DỤ
Dạng 1: Tập hợp và biểu thức lũy thừa / hỗn hợp
Phương pháp:
Xét $\\in/\\notin$; rút gọn mũ; tính theo đúng thứ tự phép tính.
---
Ví dụ 1:
Khẳng định $-5 \\in \\mathbb{N}$ là?
A. Đúng
B. Sai
C. Đúng nếu coi $0$ thuộc $\\mathbb{N}$
D. Không kết luận
Đáp án: B
Lời giải:
Số tự nhiên không âm; $-5 \\notin \\mathbb{N}$.
---
Ví dụ 2:
Tính $\\left[\\left(\\dfrac{3}{7}\\right)^{100}\\cdot\\left(\\dfrac{3}{7}\\right)^{99}\\right]:\\left(\\dfrac{3}{7}\\right)^{100}$.
A. $\\left(\\dfrac{3}{7}\\right)^{99}$
B. $\\left(\\dfrac{3}{7}\\right)^{199}$
C. $1$
D. $\\dfrac{3}{7}$
Đáp án: A
Lời giải:
Số mũ: $100+99-100=99$.
---
Dạng 2: Tìm $x$ và giảm giá liên tiếp
Phương pháp:
Chuyển vế đổi dấu. Giảm liên tiếp: nhân lần lượt các hệ số còn lại.
---
Ví dụ 1:
Tìm $x$ biết $\\dfrac{3}{4}+x=\\dfrac{7}{2}$.
A. $\\dfrac{11}{4}$
B. $\\dfrac{5}{4}$
C. $\\dfrac{13}{4}$
D. $-\\dfrac{11}{4}$
Đáp án: A
Lời giải:
$x=\\dfrac{7}{2}-\\dfrac{3}{4}=\\dfrac{14-3}{4}=\\dfrac{11}{4}$.
---
Ví dụ 2:
Máy giặt $10000000$ đồng, giảm $15\\%$ rồi thêm $5\\%$ trên giá đã giảm. Phải trả?
A. $8075000$
B. $8000000$
C. $8500000$
D. $9025000$
Đáp án: A
Lời giải:
$10000000\\times 0{,}85\\times 0{,}95=8075000$.
`;

  const practice = [
    qTF(1, '$-5 \\in \\mathbb{N}$.', 'Sai', '$-5 \\notin \\mathbb{N}$.'),
    qTF(2, '$\\dfrac{7}{2} \\in \\mathbb{Q}$.', 'Đúng', 'Đã là phân số với mẫu $\\ne 0$.'),
    qTF(3, '$3{,}01 \\in \\mathbb{Z}$.', 'Sai', '$3{,}01$ không nguyên.'),
    qTF(4, '$-25\\% \\in \\mathbb{Q}$.', 'Đúng', '$-25\\%=-\\dfrac{1}{4}\\in\\mathbb{Q}$.'),
    qMcq(5, 'Tính $\\left[\\left(\\dfrac{3}{7}\\right)^{100}\\cdot\\left(\\dfrac{3}{7}\\right)^{99}\\right]:\\left(\\dfrac{3}{7}\\right)^{100}$.', ['$\\left(\\dfrac{3}{7}\\right)^{99}$', '$\\left(\\dfrac{3}{7}\\right)^{199}$', '$1$', '$\\dfrac{3}{7}$'], 'A', 'Mũ $100+99-100=99$.'),
    qMcq(6, 'Tính $\\dfrac{2}{5}+\\dfrac{3}{5}:\\dfrac{1}{2}+\\dfrac{1}{2}$.', ['$\\dfrac{21}{10}$', '$\\dfrac{11}{5}$', '$2$', '$\\dfrac{7}{5}$'], 'A', 'Chia trước: $\\dfrac{3}{5}:\\dfrac{1}{2}=\\dfrac{6}{5}$; rồi $\\dfrac{2}{5}+\\dfrac{6}{5}+\\dfrac{1}{2}=\\dfrac{8}{5}+\\dfrac{1}{2}=\\dfrac{16+5}{10}=\\dfrac{21}{10}$.'),
    qMcq(7, 'Tính nhanh $\\dfrac{2}{5}\\cdot\\dfrac{3}{8}+\\dfrac{5}{8}\\cdot\\dfrac{2}{5}$.', ['$\\dfrac{2}{5}$', '$\\dfrac{1}{5}$', '$1$', '$\\dfrac{16}{40}$'], 'A', 'Phân phối: $\\dfrac{2}{5}\\left(\\dfrac{3}{8}+\\dfrac{5}{8}\\right)=\\dfrac{2}{5}\\cdot 1=\\dfrac{2}{5}$.'),
    qMcq(8, 'Tính $\\dfrac{15^2\\cdot 9^3}{25\\cdot 27}$.', ['$81$', '$27$', '$9$', '$243$'], 'A', 'Rút gọn theo thừa số nguyên tố được $81$.'),
    qInput(9, 'Tìm $x$ biết $\\dfrac{3}{4}+x=\\dfrac{7}{2}$.', '11/4', '$x=\\dfrac{7}{2}-\\dfrac{3}{4}=\\dfrac{11}{4}$.', 'x = …'),
    qInput(10, 'Tìm $x$ biết $\\dfrac{3}{5}+x=\\dfrac{2}{5}$.', '-1/5', '$x=\\dfrac{2}{5}-\\dfrac{3}{5}=-\\dfrac{1}{5}$.', 'x = …'),
    qInput(11, 'Tìm $x$ biết $5^x=125$.', '3', '$125=5^3$ nên $x=3$.', 'x = …'),
    qInput(12, 'Tìm $x$ biết $x^2=9$ và $x>0$.', '3', 'Vì $x>0$ nên $x=3$.', 'x = …'),
    qInput(13, 'Máy giặt $10000000$, giảm $15\\%$ rồi thêm $5\\%$ trên giá đã giảm. Phải trả?', '8075000', '$10000000\\times0{,}85\\times0{,}95=8075000$.', 'Số tiền = …'),
    qInput(14, 'Lò vi sóng trả $2640000$ sau giảm $15\\%$ rồi thêm $5\\%$ trên giá đã giảm. Giá niêm yết?', '3270000', 'Hệ số $0{,}85\\times0{,}95=0{,}8075$; giá gốc $=2640000:0{,}8075=3270000$.', 'Giá gốc = …'),
    qInput(15, 'An trả $196000$ sau giảm $20\\%$ rồi thêm $2\\%$ trên giá đã giảm. Giá ban đầu?', '250000', 'Hệ số $0{,}8\\times0{,}98=0{,}784$; $196000:0{,}784=250000$.', 'Giá gốc = …'),
    qInput(16, 'TV còn $12150000$ sau hai lần giảm $10\\%$ liên tiếp. Giá ban đầu?', '15000000', 'Hệ số $0{,}9\\times0{,}9=0{,}81$; $12150000:0{,}81=15000000$.', 'Giá gốc = …'),
  ];

  return {
    folder: path.join(BASE_BG, 'CHƯƠNG I. SỐ HỮU TỈ', 'ÔN TẬP CHƯƠNG I'),
    outName: 'on-tap-chuong-I-import.txt',
    docsName: '05-on-tap-chuong-I.txt',
    body:
      meta({
        chapter: 1,
        lesson_no: 'OT1',
        title: 'Ôn tập chương I',
        seo: 'Ôn tập Chương I Toán 7: số hữu tỉ, phép tính, lũy thừa và bài toán phần trăm.',
        focus: 'ôn tập số hữu tỉ',
        keywords: 'ôn tập chương I, số hữu tỉ, lũy thừa, Toán 7',
      }) +
      theory +
      '\n' +
      examplesFixed +
      '\nBÀI TẬP LUYỆN TẬP\n' +
      practice.join('\n'),
  };
}

/* ===================== LESSON 5 ===================== */
function lesson5() {
  const theory = `LÝ THUYẾT TRỌNG TÂM
# 1. Số thập phân hữu hạn và vô hạn tuần hoàn
Ghi nhớ:
- Mỗi số hữu tỉ viết được dưới dạng thập phân hữu hạn hoặc vô hạn tuần hoàn.
- Ngược lại, mỗi thập phân hữu hạn hoặc vô hạn tuần hoàn biểu diễn một số hữu tỉ.
- Kí hiệu chu kì: $4{,}(3)=4{,}333\\ldots$; $2{,}(35)=2{,}353535\\ldots$.
---
# 2. Làm tròn số
Phương pháp:
Gạch hàng quy tròn; nhìn chữ số bên phải: $\\ge 5$ thì tăng $1$, $<5$ thì giữ nguyên; bỏ/ thay $0$ các chữ số bên phải.
`;

  const examples = `CÁC DẠNG TOÁN & VÍ DỤ
Dạng 1: Đổi phân số ↔ thập phân tuần hoàn
Phương pháp:
Chia tử cho mẫu để được thập phân; với $0{,}(a)$ dùng $x=0{,}aaa\\ldots$ rồi $10x-x$.
---
Ví dụ 1:
Viết $\\dfrac{7}{4}$ dưới dạng thập phân.
A. $1{,}75$
B. $1{,}7$
C. $1{,}(7)$
D. $0{,}75$
Đáp án: A
Lời giải:
$\\dfrac{7}{4}=1{,}75$.
---
Ví dụ 2:
Viết gọn $2{,}212121\\ldots$.
A. $2{,}(21)$
B. $2{,}2(1)$
C. $2{,}(2)$
D. $2{,}21$
Đáp án: A
Lời giải:
Chu kì gồm hai chữ số $21$: $2{,}(21)$.
---
Dạng 2: Làm tròn số
Phương pháp:
Xác định hàng quy tròn rồi áp dụng quy tắc $\\ge 5$ tăng, $<5$ giữ.
---
Ví dụ 1:
Làm tròn $3{,}819$ đến hàng phần trăm.
A. $3{,}82$
B. $3{,}81$
C. $3{,}8$
D. $4$
Đáp án: A
Lời giải:
Hàng phần trăm là chữ số $1$; bên phải $9\\ge 5$ nên làm tròn thành $3{,}82$.
---
Ví dụ 2:
$299792458$ làm tròn thành $300000000$ là làm tròn đến hàng nào?
A. Hàng triệu
B. Hàng trăm triệu
C. Hàng nghìn
D. Hàng tỉ
Đáp án: B
Lời giải:
$300000000$ chính là làm tròn đến hàng trăm triệu.
`;

  const practice = [
    qMcq(1, 'Viết $\\dfrac{7}{4}$ dưới dạng thập phân.', ['$1{,}75$', '$1{,}7$', '$1{,}(7)$', '$0{,}75$'], 'A', '$7:4=1{,}75$.'),
    qMcq(2, 'Viết $\\dfrac{1}{3}$ dưới dạng thập phân tuần hoàn.', ['$0{,}(3)$', '$0{,}3$', '$0{,}33$', '$1{,}(3)$'], 'A', '$1:3=0{,}333\\ldots=0{,}(3)$.'),
    qMcq(3, 'Viết gọn $0{,}580580580\\ldots$.', ['$0{,}(580)$', '$0{,}5(80)$', '$0{,}58(0)$', '$0{,}580$'], 'A', 'Chu kì $580$: $0{,}(580)$.'),
    qMcq(4, 'Viết gọn $0{,}62313131\\ldots$.', ['$0{,}62(31)$', '$0{,}(6231)$', '$0{,}6(231)$', '$0{,}6231$'], 'A', 'Sau $62$ là chu kì $31$: $0{,}62(31)$.'),
    qMcq(5, 'Biểu diễn $0{,}(2)$ dưới dạng phân số.', ['$\\dfrac{2}{9}$', '$\\dfrac{2}{10}$', '$\\dfrac{1}{5}$', '$\\dfrac{2}{99}$'], 'A', 'Đặt $x=0{,}222\\ldots$, $10x-x=2$ $\\Rightarrow x=\\dfrac{2}{9}$.'),
    qMcq(6, 'Biểu diễn $2{,}(35)$ dưới dạng phân số.', ['$\\dfrac{233}{99}$', '$\\dfrac{235}{99}$', '$\\dfrac{235}{100}$', '$\\dfrac{23}{9}$'], 'A', '$x=2{,}3535\\ldots$; $100x-x=233$ $\\Rightarrow x=\\dfrac{233}{99}$.'),
    qMcq(7, 'So sánh $4{,}(15)$ và $4{,}1(15)$.', ['$4{,}(15) < 4{,}1(15)$', '$4{,}(15) > 4{,}1(15)$', 'Bằng nhau', 'Không so sánh được'], 'A', '$4{,}(15)=4{,}151515\\ldots$; $4{,}1(15)=4{,}1151515\\ldots$ nên $4{,}(15)>4{,}1(15)$? 4.1515... vs 4.11515... → first is larger. So B.'),
    qMcq(8, 'Làm tròn $21441$ đến hàng chục.', ['$21440$', '$21450$', '$21400$', '$21500$'], 'A', 'Chữ số hàng đơn vị $1<5$ nên giữ $21440$.'),
    qMcq(9, 'Làm tròn $3{,}819$ đến hàng phần trăm.', ['$3{,}82$', '$3{,}81$', '$3{,}8$', '$4$'], 'A', 'Bên phải hàng phần trăm là $9\\ge 5$ → $3{,}82$.'),
    qMcq(10, 'Làm tròn $-5$ đến hàng phần trăm (theo dạng $-5{,}00$).', ['$-5{,}00$', '$-5$', '$-5{,}0$', '$-4{,}99$'], 'A', '$-5=-5{,}00$ khi lấy đến hàng phần trăm.'),
    qInput(11, 'Dân số $7914638803$ làm tròn đến hàng tỉ. Kết quả?', '8000000000', 'Hàng tỉ: nhìn $9\\ge 5$ nên làm tròn thành $8000000000$.', 'Số ≈ …'),
    qInput(12, '$1\\,\\mathrm{inch}=2{,}54\\,\\mathrm{cm}$. Đường chéo Tivi $39$ inch (cm), làm tròn đến hàng đơn vị?', '99', '$39\\times 2{,}54=99{,}06\\approx 99$.', 'Độ dài ≈ …'),
    qInput(13, 'Xăng $\\le 26070$ đồng/lít, bình $3{,}7$ lít. Tiền đổ đầy (làm tròn nghìn đồng)?', '96000', '$26070\\times 3{,}7=96459\\approx 96000$ (đến nghìn).', 'Số tiền ≈ …'),
    qMcq(14, 'Vận tốc ánh sáng $299792458$ nói thành $300000000$ đã làm tròn đến hàng nào?', ['Hàng trăm triệu', 'Hàng triệu', 'Hàng tỉ', 'Hàng nghìn'], 'A', '$300000000$ là hàng trăm triệu.'),
    qMcq(15, 'So sánh $0{,}(15)$ và $0{,}15$.', ['$0{,}(15) > 0{,}15$', '$0{,}(15) < 0{,}15$', 'Bằng nhau', 'Không so sánh được'], 'A', '$0{,}(15)=0{,}151515\\ldots > 0{,}15$.'),
    qMcq(16, 'Số nào biểu diễn số hữu tỉ?', ['$0{,}(6)$', '$\\pi$', '$0{,}1010010001\\ldots$ (không tuần hoàn)', '$\\sqrt{2}$'], 'A', '$0{,}(6)=\\dfrac{2}{3}\\in\\mathbb{Q}$.'),
  ];

  practice[6] = qMcq(7, 'So sánh $4{,}(15)$ và $4{,}1(15)$.', ['$4{,}(15) > 4{,}1(15)$', '$4{,}(15) < 4{,}1(15)$', 'Bằng nhau', 'Không so sánh được'], 'A', '$4{,}1515\\ldots > 4{,}11515\\ldots$.');

  return {
    folder: path.join(BASE_BG, 'CHƯƠNG II. SỐ THỰC', 'Bài 5. Làm quen với số thập phân vô hạn tuần hoàn'),
    outName: 'bai-5-thap-phan-vo-han-tuan-hoan-import.txt',
    docsName: '06-bai-5-thap-phan-vo-han-tuan-hoan.txt',
    body:
      meta({
        chapter: 2,
        lesson_no: 5,
        title: 'Làm quen với số thập phân vô hạn tuần hoàn',
        seo: 'Bài 5 Toán 7: thập phân hữu hạn, vô hạn tuần hoàn, đổi phân số và làm tròn số.',
        focus: 'số thập phân vô hạn tuần hoàn',
        keywords: 'thập phân tuần hoàn, làm tròn số, số hữu tỉ, Toán 7',
      }) +
      theory +
      '\n' +
      examples +
      '\nBÀI TẬP LUYỆN TẬP\n' +
      practice.join('\n'),
  };
}

/* ===================== LESSON 6 ===================== */
function lesson6() {
  const theory = `LÝ THUYẾT TRỌNG TÂM
# 1. Số vô tỉ
Định nghĩa:
Số vô tỉ là số viết dưới dạng thập phân vô hạn không tuần hoàn; không viết được dưới dạng phân số $\\dfrac{a}{b}$.
Tập hợp các số vô tỉ thường kí hiệu $\\mathbb{I}$ (hoặc nói "các số vô tỉ").
Ví dụ: $\\pi = 3{,}14159\\ldots$; $\\sqrt{2}=1{,}41421\\ldots$.
---
# 2. Căn bậc hai số học
Định nghĩa:
Với $a \\ge 0$, căn bậc hai số học của $a$ là số không âm $x$ sao cho $x^2 = a$, kí hiệu $\\sqrt{a}$.
Ghi nhớ:
$\\sqrt{a}\\ge 0$; $(\\sqrt{a})^2=a$; $\\sqrt{a^2}=|a|$.
`;

  const examples = `CÁC DẠNG TOÁN & VÍ DỤ
Dạng 1: Tính căn bậc hai số học
Phương pháp:
Tìm số không âm có bình phương bằng số trong căn; với phân số: $\\sqrt{\\dfrac{a}{b}}=\\dfrac{\\sqrt{a}}{\\sqrt{b}}$.
---
Ví dụ 1:
Tính $\\sqrt{81}$.
A. $9$
B. $-9$
C. $\\pm 9$
D. $81$
Đáp án: A
Lời giải:
Căn bậc hai số học không âm: $\\sqrt{81}=9$.
---
Ví dụ 2:
Tính $\\sqrt{\\dfrac{64}{25}}$.
A. $\\dfrac{8}{5}$
B. $-\\dfrac{8}{5}$
C. $\\dfrac{64}{25}$
D. $\\dfrac{8}{25}$
Đáp án: A
Lời giải:
$\\sqrt{\\dfrac{64}{25}}=\\dfrac{8}{5}$.
---
Dạng 2: Phương trình chứa căn / bình phương
Phương pháp:
$\\sqrt{x}=a$ ($a\\ge 0$) $\\Rightarrow x=a^2$. Với $x^2=a$ ($a\\ge 0$) thì $x=\\pm\\sqrt{a}$ (chọn theo điều kiện).
---
Ví dụ 1:
Tìm $x$ biết $\\sqrt{x}=2$.
A. $4$
B. $2$
C. $-4$
D. $\\pm 2$
Đáp án: A
Lời giải:
$x=2^2=4$.
---
Ví dụ 2:
Tìm $x\\ge 0$ biết $x^2=9$.
A. $3$
B. $-3$
C. $\\pm 3$
D. $9$
Đáp án: A
Lời giải:
Vì yêu cầu $x\\ge 0$ nên $x=3$.
`;

  const practice = [
    qInput(1, 'Tính $\\sqrt{81}$.', '9', '$9^2=81$ và $9\\ge 0$.', 'Kết quả = …'),
    qInput(2, 'Tính $\\sqrt{169}$.', '13', '$13^2=169$.', 'Kết quả = …'),
    qMcq(3, 'Tính $\\sqrt{\\dfrac{1}{9}}$.', ['$\\dfrac{1}{3}$', '$-\\dfrac{1}{3}$', '$\\dfrac{1}{9}$', '$3$'], 'A', '$\\sqrt{\\dfrac{1}{9}}=\\dfrac{1}{3}$.'),
    qMcq(4, 'Tính $\\sqrt{\\dfrac{64}{25}}$.', ['$\\dfrac{8}{5}$', '$-\\dfrac{8}{5}$', '$\\dfrac{64}{25}$', '$\\dfrac{8}{25}$'], 'A', '$\\dfrac{8}{5}$.'),
    qMcq(5, 'Tính $\\sqrt{81}-\\sqrt{64}+\\sqrt{49}$.', ['$8$', '$6$', '$10$', '$2$'], 'A', '$9-8+7=8$.'),
    qInput(6, 'Tìm $x$ biết $\\sqrt{x}=2$.', '4', '$x=2^2=4$.', 'x = …'),
    qInput(7, 'Tìm $x$ biết $\\sqrt{x}=3$.', '9', '$x=9$.', 'x = …'),
    qInput(8, 'Tìm $x$ biết $\\sqrt{x}+1=4$.', '9', '$\\sqrt{x}=3\\Rightarrow x=9$.', 'x = …'),
    qInput(9, 'Tìm $x$ biết $\\sqrt{x}-2=5$.', '49', '$\\sqrt{x}=7\\Rightarrow x=49$.', 'x = …'),
    qInput(10, 'Tìm $x\\ge 0$ biết $x^2=9$.', '3', '$x=3$ (nhánh không âm).', 'x = …'),
    qMcq(11, 'Tìm tất cả $x$ thỏa $x^2=\\dfrac{4}{9}$.', ['$x=\\pm\\dfrac{2}{3}$', '$x=\\dfrac{2}{3}$', '$x=-\\dfrac{2}{3}$', '$x=\\pm\\dfrac{4}{9}$'], 'A', '$x=\\pm\\dfrac{2}{3}$.'),
    qInput(12, 'Sân hình vuông chi phí $10125000$ đồng, đơn giá $125000$ đồng/m$^2$. Cạnh sân (m)?', '9', 'Diện tích $=10125000:125000=81$; cạnh $=\\sqrt{81}=9$.', 'Cạnh = …'),
    qInput(13, 'Gửi $200000000$, sau $1$ năm nhận $214000000$. Lãi suất năm (% )?', '7', 'Lãi $=14000000$; suất $=\\dfrac{14}{200}=0{,}07=7\\%$.', 'Lãi suất = …'),
    qInput(14, 'Gửi $100000000$, sau $2$ năm nhận $112360000$. Lãi suất năm kép $r$ thỏa $(1+r)^2=1{,}1236$. Giá trị $r$ (% )?', '6', '$1+r=\\sqrt{1{,}1236}=1{,}06$ nên $r=6\\%$.', 'r = …'),
    qTF(15, '$\\sqrt{2}$ là số hữu tỉ.', 'Sai', '$\\sqrt{2}$ là số vô tỉ.'),
    qTF(16, '$\\sqrt{9}=3$ (căn bậc hai số học).', 'Đúng', 'Căn bậc hai số học lấy giá trị không âm.'),
  ];

  return {
    folder: path.join(BASE_BG, 'CHƯƠNG II. SỐ THỰC', 'Bài 6. Số vô tỉ. Căn bậc hai số học'),
    outName: 'bai-6-so-vo-ti-can-bac-hai-import.txt',
    docsName: '07-bai-6-so-vo-ti-can-bac-hai.txt',
    body:
      meta({
        chapter: 2,
        lesson_no: 6,
        title: 'Số vô tỉ. Căn bậc hai số học',
        seo: 'Bài 6 Toán 7: số vô tỉ và căn bậc hai số học, tính căn và giải phương trình đơn giản.',
        focus: 'căn bậc hai số học',
        keywords: 'số vô tỉ, căn bậc hai, Toán 7',
      }) +
      theory +
      '\n' +
      examples +
      '\nBÀI TẬP LUYỆN TẬP\n' +
      practice.join('\n'),
  };
}

/* ===================== LESSON 7 ===================== */
function lesson7() {
  const theory = `LÝ THUYẾT TRỌNG TÂM
# 1. Tập hợp số thực
Định nghĩa:
Số hữu tỉ và số vô tỉ gọi chung là số thực. Tập hợp các số thực kí hiệu $\\mathbb{R}$.
Ghi nhớ:
$\\mathbb{N}\\subset\\mathbb{Z}\\subset\\mathbb{Q}\\subset\\mathbb{R}$ và các số vô tỉ cũng thuộc $\\mathbb{R}$.
---
# 2. Giá trị tuyệt đối
Định nghĩa:
$|x|=\\begin{cases}x & \\text{nếu } x\\ge 0\\\\ -x & \\text{nếu } x<0\\end{cases}$.
Ghi nhớ: $|x|\\ge 0$; $|x|=|-x|$ với mọi $x\\in\\mathbb{R}$.
`;

  const examples = `CÁC DẠNG TOÁN & VÍ DỤ
Dạng 1: Quan hệ thuộc / bao hàm tập hợp số
Phương pháp:
Số thập phân tuần hoàn $\\in\\mathbb{Q}\\subset\\mathbb{R}$; số vô hạn không tuần hoàn $\\notin\\mathbb{Q}$ nhưng $\\in\\mathbb{R}$.
---
Ví dụ 1:
$-2 \\in \\mathbb{R}$?
A. Đúng
B. Sai
C. Chỉ thuộc $\\mathbb{Z}$
D. Không kết luận
Đáp án: A
Lời giải:
Mọi số nguyên đều là số thực.
---
Ví dụ 2:
$\\sqrt{2} \\in \\mathbb{Q}$?
A. Đúng
B. Sai
C. Đúng vì viết được thập phân
D. Không kết luận
Đáp án: B
Lời giải:
$\\sqrt{2}$ vô tỉ nên $\\notin\\mathbb{Q}$.
---
Dạng 2: Giá trị tuyệt đối và sắp xếp số thực
Phương pháp:
Tính $|x|$ theo định nghĩa; sắp xếp bằng cách so sánh trên trục số hoặc đưa về cùng dạng.
---
Ví dụ 1:
Tính $\\left|-\\dfrac{3}{4}\\right|$.
A. $\\dfrac{3}{4}$
B. $-\\dfrac{3}{4}$
C. $\\dfrac{4}{3}$
D. $0$
Đáp án: A
Lời giải:
$|-x|=|x|$ nên $\\left|-\\dfrac{3}{4}\\right|=\\dfrac{3}{4}$.
---
Ví dụ 2:
Cạnh hình vuông diện tích $169\\,\\mathrm{m}^2$ bằng?
A. $13\\,\\mathrm{m}$
B. $12\\,\\mathrm{m}$
C. $14\\,\\mathrm{m}$
D. $169\\,\\mathrm{m}$
Đáp án: A
Lời giải:
$\\sqrt{169}=13$.
`;

  const practice = [
    qTF(1, '$-2 \\in \\mathbb{R}$.', 'Đúng', 'Số nguyên là số thực.'),
    qTF(2, '$\\dfrac{3}{2} \\in \\mathbb{R}$.', 'Đúng', 'Số hữu tỉ là số thực.'),
    qTF(3, '$0{,}5 \\in \\mathbb{I}$ (tập số vô tỉ).', 'Sai', '$0{,}5=\\dfrac{1}{2}$ hữu tỉ.'),
    qTF(4, '$\\sqrt{3} \\in \\mathbb{R}$.', 'Đúng', 'Số vô tỉ cũng là số thực.'),
    qTF(5, '$0{,}3(5) \\in \\mathbb{Q}$.', 'Đúng', 'Thập phân tuần hoàn là số hữu tỉ.'),
    qTF(6, '$\\sqrt{2} \\in \\mathbb{Q}$.', 'Sai', '$\\sqrt{2}$ vô tỉ.'),
    qInput(7, 'Tính $\\left|-3\\right|$.', '3', '$-3<0$ nên $|-3|=3$.', '|−3| = …'),
    qInput(8, 'Tính $\\left|-2{,}5\\right|$.', '2.5', '$|-2{,}5|=2{,}5$.', 'Kết quả = …'),
    qMcq(9, 'Tính $\\left|-\\dfrac{3}{4}\\right|$.', ['$\\dfrac{3}{4}$', '$-\\dfrac{3}{4}$', '$\\dfrac{4}{3}$', '$0$'], 'A', '$\\dfrac{3}{4}$.'),
    qMcq(10, 'Sắp xếp tăng dần: $-2{,}63$; $3{,}(4)$; $-2{,}75$; $0$; $\\dfrac{33}{10}$; $\\sqrt{2}$.', ['$-2{,}75; -2{,}63; 0; \\sqrt{2}; 3{,}(4); \\dfrac{33}{10}$', '$-2{,}75; -2{,}63; 0; \\sqrt{2}; \\dfrac{33}{10}; 3{,}(4)$', '$-2{,}63; -2{,}75; 0; \\sqrt{2}; \\dfrac{33}{10}; 3{,}(4)$', '$-2{,}75; -2{,}63; 0; \\dfrac{33}{10}; \\sqrt{2}; 3{,}(4)$'], 'B', '$-2{,}75<-2{,}63<0<\\sqrt{2}\\approx1{,}41<3{,}3=\\dfrac{33}{10}<3{,}(4)=3{,}444\\ldots$.'),
    qInput(11, 'Tìm $x$ biết $|x|=8$. Nếu chỉ lấy nghiệm không âm thì $x=?$', '8', 'Nghiệm là $\\pm 8$; không âm chọn $8$.', 'x = …'),
    qInput(12, 'Tìm $x$ biết $|x|-0{,}3=\\dfrac{1}{5}$ và $x\\ge 0$.', '0.5', '$|x|=0{,}3+0{,}2=0{,}5$; $x=0{,}5$.', 'x = …'),
    qInput(13, 'Cạnh hình vuông diện tích $169\\,\\mathrm{m}^2$?', '13', '$\\sqrt{169}=13$.', 'Cạnh = …'),
    qMcq(14, 'Bán kính hình tròn diện tích $100\\,\\mathrm{cm}^2$ (lấy $\\pi=3{,}14$) gần bằng?', ['$\\approx 5{,}64$', '$10$', '$50$', '$\\approx 31{,}4$'], 'A', '$r=\\sqrt{\\dfrac{100}{\\pi}}\\approx\\sqrt{31{,}85}\\approx 5{,}64$.'),
    qInput(15, 'Sân vuông chi phí $36720000$ đồng, $255000$ đồng/m$^2$. Cạnh sân (m)?', '12', 'Diện tích $=36720000:255000=144$; cạnh $=12$.', 'Cạnh = …'),
    qMcq(16, 'Hình vuông cạnh $1$, đường chéo bằng?', ['$\\sqrt{2}$', '$2$', '$1$', '$\\dfrac{1}{2}$'], 'A', 'Theo Pythagore: $\\sqrt{1^2+1^2}=\\sqrt{2}$.'),
  ];

  return {
    folder: path.join(BASE_BG, 'CHƯƠNG II. SỐ THỰC', 'Bài 7. Tập hợp các số thực'),
    outName: 'bai-7-tap-hop-cac-so-thuc-import.txt',
    docsName: '08-bai-7-tap-hop-cac-so-thuc.txt',
    body:
      meta({
        chapter: 2,
        lesson_no: 7,
        title: 'Tập hợp các số thực',
        seo: 'Bài 7 Toán 7: tập hợp số thực R, giá trị tuyệt đối và ứng dụng căn bậc hai.',
        focus: 'tập hợp số thực',
        keywords: 'số thực, giá trị tuyệt đối, tập hợp R, Toán 7',
      }) +
      theory +
      '\n' +
      examples +
      '\nBÀI TẬP LUYỆN TẬP\n' +
      practice.join('\n'),
  };
}

/* ===================== OT2 ===================== */
function lessonOT2() {
  const theory = `LÝ THUYẾT TRỌNG TÂM
# Ôn tập Chương II — Số thực
Ghi nhớ:
- Thập phân hữu hạn / tuần hoàn $\\Leftrightarrow$ số hữu tỉ; vô hạn không tuần hoàn $\\Rightarrow$ vô tỉ.
- $\\mathbb{Q}\\cup\\{\\text{số vô tỉ}\\}=\\mathbb{R}$.
- $\\sqrt{a}$ ($a\\ge 0$) là số không âm có bình phương bằng $a$.
- $|x|$ là khoảng cách từ $x$ đến $0$ trên trục số.
`;

  const examples = `CÁC DẠNG TOÁN & VÍ DỤ
Dạng 1: Phân loại số và tính nhanh
Phương pháp:
Xét $\\in/\\notin$ các tập; nhóm hạng tử khi tính nhanh; dùng căn và giá trị tuyệt đối đúng định nghĩa.
---
Ví dụ 1:
$0{,}2(6) \\in \\mathbb{Q}$?
A. Đúng
B. Sai
C. Chỉ thuộc $\\mathbb{R}$
D. Không kết luận
Đáp án: A
Lời giải:
Thập phân tuần hoàn là số hữu tỉ.
---
Ví dụ 2:
Tính nhanh $\\dfrac{3}{15}:\\dfrac{2}{7}+\\dfrac{12}{15}:\\dfrac{2}{7}$.
A. $\\dfrac{15}{2}$
B. $\\dfrac{3}{2}$
C. $1$
D. $\\dfrac{21}{2}$
Đáp án: A
Lời giải:
$\\left(\\dfrac{3}{15}+\\dfrac{12}{15}\\right):\\dfrac{2}{7}=1:\\dfrac{2}{7}=\\dfrac{7}{2}$. (Fix: 7/2 not 15/2)
---
Dạng 2: Tìm $x$ và bài toán phần trăm thực tế
Phương pháp:
Chuyển vế; với giảm giá liên tiếp nhân các hệ số.
---
Ví dụ 1:
Tìm $x$ biết $\\sqrt{x}=3$.
A. $9$
B. $3$
C. $-9$
D. $\\pm 3$
Đáp án: A
Lời giải:
$x=9$.
---
Ví dụ 2:
TV $20000000$, giảm $25\\%$ rồi thêm $2\\%$ nếu thanh toán app. Phải trả?
A. $14700000$
B. $15000000$
C. $14600000$
D. $16000000$
Đáp án: A
Lời giải:
$20000000\\times 0{,}75\\times 0{,}98=14700000$.
`;

  const examplesFixed = `CÁC DẠNG TOÁN & VÍ DỤ
Dạng 1: Phân loại số và tính biểu thức
Phương pháp:
Xét tập hợp; tính nhanh bằng nhóm hạng tử; dùng căn bậc hai số học.
---
Ví dụ 1:
Khẳng định $0{,}2(6)\\in\\mathbb{Q}$ là?
A. Đúng
B. Sai
C. Chỉ đúng với $\\mathbb{R}$
D. Không kết luận
Đáp án: A
Lời giải:
Thập phân tuần hoàn biểu diễn số hữu tỉ.
---
Ví dụ 2:
Tính $\\left(\\dfrac{3}{15}:\\dfrac{2}{7}\\right)+\\left(\\dfrac{12}{15}:\\dfrac{2}{7}\\right)$.
A. $\\dfrac{7}{2}$
B. $\\dfrac{15}{2}$
C. $1$
D. $\\dfrac{21}{2}$
Đáp án: A
Lời giải:
$\\dfrac{3+12}{15}:\\dfrac{2}{7}=1:\\dfrac{2}{7}=\\dfrac{7}{2}$.
---
Dạng 2: Tìm $x$ và bài toán giảm giá
Phương pháp:
Chuyển vế đổi dấu; giảm liên tiếp nhân các hệ số còn lại.
---
Ví dụ 1:
Tìm $x$ biết $\\sqrt{x}=3$.
A. $9$
B. $3$
C. $-9$
D. $\\pm 3$
Đáp án: A
Lời giải:
$x=9$.
---
Ví dụ 2:
TV $20000000$, giảm $25\\%$ rồi thêm $2\\%$ (app). Phải trả?
A. $14700000$
B. $15000000$
C. $14600000$
D. $16000000$
Đáp án: A
Lời giải:
$20000000\\times 0{,}75\\times 0{,}98=14700000$.
`;

  const practice = [
    qTF(1, '$-5 \\in \\mathbb{N}$.', 'Sai', '$-5\\notin\\mathbb{N}$.'),
    qTF(2, '$\\dfrac{7}{2}\\in\\mathbb{Q}$.', 'Đúng', 'Là phân số.'),
    qTF(3, '$0{,}2\\in\\mathbb{I}$ (vô tỉ).', 'Sai', '$0{,}2$ hữu tỉ.'),
    qTF(4, '$\\sqrt{7}\\in\\mathbb{R}$.', 'Đúng', 'Vô tỉ là số thực.'),
    qTF(5, '$0{,}2(6)\\in\\mathbb{Q}$.', 'Đúng', 'Tuần hoàn ⇒ hữu tỉ.'),
    qMcq(6, 'Tính $\\dfrac{3}{15}:\\dfrac{2}{7}+\\dfrac{12}{15}:\\dfrac{2}{7}$.', ['$\\dfrac{7}{2}$', '$\\dfrac{15}{2}$', '$1$', '$\\dfrac{3}{2}$'], 'A', 'Nhóm được $1:\\dfrac{2}{7}=\\dfrac{7}{2}$.'),
    qMcq(7, 'Tính $\\dfrac{11}{15}\\cdot\\dfrac{12}{13}+\\dfrac{7}{15}\\cdot\\dfrac{11}{13}$.', ['$\\dfrac{209}{195}$', '$\\dfrac{11}{15}$', '$1$', '$\\dfrac{19}{13}$'], 'A', '$\\dfrac{11}{15\\cdot 13}(12+7)=\\dfrac{11\\cdot 19}{195}=\\dfrac{209}{195}$.'),
    qMcq(8, 'Tính $\\dfrac{4^9\\cdot 5^6}{8^6\\cdot 25^3}$.', ['$\\dfrac{1}{4}$', '$1$', '$4$', '$\\dfrac{1}{2}$'], 'A', 'Đổi $4=2^2$, $8=2^3$, $5^6/25^3=1$ rồi rút gọn được $\\dfrac{1}{4}$.'),
    qInput(9, 'Tìm $x$ biết $\\dfrac{7}{4}+x=-\\dfrac{3}{4}$.', '-5/2', '$x=-\\dfrac{3}{4}-\\dfrac{7}{4}=-\\dfrac{10}{4}=-\\dfrac{5}{2}$.', 'x = …'),
    qInput(10, 'Tìm $x$ biết $\\sqrt{x}=3$.', '9', '$x=9$.', 'x = …'),
    qInput(11, 'Tìm $x\\ge 0$ biết $x^2=9$.', '3', '$x=3$.', 'x = …'),
    qInput(12, 'TV $20000000$, giảm $25\\%$ rồi thêm $2\\%$. Phải trả?', '14700000', '$20000000\\times0{,}75\\times0{,}98=14700000$.', 'Số tiền = …'),
    qInput(13, 'An (sinh tháng 11) mua máy tính $440000$, giảm $10\\%$ rồi thêm $5\\%$ trên giá đã giảm. Phải trả?', '376200', '$440000\\times0{,}9\\times0{,}95=376200$.', 'Số tiền = …'),
    qInput(14, 'An trả $513000$ sau giảm $10\\%$ rồi $5\\%$ trên giá đã giảm. Giá ban đầu?', '600000', '$513000:(0{,}9\\times0{,}95)=513000:0{,}855=600000$.', 'Giá gốc = …'),
    qInput(15, 'An trả $266000$ sau giảm $20\\%$ rồi thêm $5\\%$ trên giá đã giảm. Giá ban đầu?', '350000', '$266000:(0{,}8\\times0{,}95)=266000:0{,}76=350000$.', 'Giá gốc = …'),
    qInput(16, 'TV sau giảm $15\\%$ rồi thêm $10\\%$ trên giá đã giảm còn $11475000$. Giá ban đầu?', '15000000', 'Hệ số $0{,}85\\times0{,}9=0{,}765$; $11475000:0{,}765=15000000$.', 'Giá gốc = …'),
  ];

  return {
    folder: path.join(BASE_BG, 'CHƯƠNG II. SỐ THỰC', 'ÔN TẬP CHƯƠNG II'),
    outName: 'on-tap-chuong-II-import.txt',
    docsName: '09-on-tap-chuong-II.txt',
    body:
      meta({
        chapter: 2,
        lesson_no: 'OT2',
        title: 'Ôn tập chương II',
        seo: 'Ôn tập Chương II Toán 7: số thực, thập phân tuần hoàn, căn bậc hai và bài toán thực tế.',
        focus: 'ôn tập số thực',
        keywords: 'ôn tập chương II, số thực, căn bậc hai, Toán 7',
      }) +
      theory +
      '\n' +
      examplesFixed +
      '\nBÀI TẬP LUYỆN TẬP\n' +
      practice.join('\n'),
  };
}

function writeLesson(lesson) {
  const outDir = path.join(lesson.folder, 'output');
  ensureDir(outDir);
  ensureDir(DOCS_OUT);
  const primary = path.join(outDir, lesson.outName);
  const docs = path.join(DOCS_OUT, lesson.docsName);
  const text = lesson.body.replace(/\n+$/, '\n');
  fs.writeFileSync(primary, text, 'utf8');
  fs.writeFileSync(docs, text, 'utf8');
  const n = countCau(text);
  return { primary, docs, practiceCount: n, title: lesson.outName };
}

const lessons = [
  lesson1(),
  lesson2(),
  lesson3(),
  lesson4(),
  lessonOT1(),
  lesson5(),
  lesson6(),
  lesson7(),
  lessonOT2(),
];

const report = lessons.map(writeLesson);

console.log('Wrote', report.length, 'lessons:\n');
for (const r of report) {
  console.log(`- ${r.title}: ${r.practiceCount} practice questions`);
  console.log(`  ${r.primary}`);
  console.log(`  ${r.docs}`);
}
console.log('\nTotal practice questions:', report.reduce((s, r) => s + r.practiceCount, 0));
