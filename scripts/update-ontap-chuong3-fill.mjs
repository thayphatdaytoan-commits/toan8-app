import fs from 'fs';
import path from 'path';

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const outPath =
  walk('tai-lieu-dang-web').find((p) => p.replace(/\\/g, '/').endsWith('output/on-tap-chuong-3-import.txt')) ||
  path.resolve('docs/on-tap-chuong-3-toan9-import.txt');

const old = fs.readFileSync('docs/on-tap-chuong-3-toan9-import.txt', 'utf8');
const head = old.split('CÁC DẠNG TOÁN & VÍ DỤ')[0];

const body = `CÁC DẠNG TOÁN & VÍ DỤ
Dạng 1: Điền đáp án — tính giá trị căn bậc ba
Phương pháp:
Tính từng căn, rồi điền kết quả số vào ô (không chọn A–D).
---
Ví dụ 1. Tính $\\sqrt[3]{12^3}$.
Đáp án: 12
Placeholder: Kết quả = …
Lời giải: Vì $\\sqrt[3]{a^3}=a$ nên $\\sqrt[3]{12^3}=12$.
---
Ví dụ 2. Tính $\\sqrt[3]{-64}\\cdot\\sqrt[3]{-27}$.
Đáp án: 12
Placeholder: Tích = …
Lời giải: $\\sqrt[3]{-64}=-4$, $\\sqrt[3]{-27}=-3$, tích bằng $12$.
---
Ví dụ 3. [điền chỗ trống]
Điền kết quả vào chỗ trống.
Đoạn: $\\sqrt[3]{8}={{1}}$ và $\\sqrt[3]{-27}={{2}}$.
Đáp án: 1=2; 2=-3
Lời giải: $\\sqrt[3]{8}=2$, $\\sqrt[3]{-27}=-3$.
---
Dạng 2: Điền chỗ trống — công thức căn
Phương pháp:
Nhớ định nghĩa và quy tắc, điền đúng biểu thức/số vào từng chỗ {{n}}.
---
Ví dụ 1. [điền chỗ trống]
Điền công thức đúng.
Đoạn: $(\\sqrt{a})^2={{1}}$ ($a\\ge 0$) và $\\sqrt{a^2}={{2}}$.
Đáp án: 1=a; 2=|a|
Lời giải: Theo định nghĩa căn bậc hai; $\\sqrt{a^2}=|a|$.
---
Ví dụ 2. [điền chỗ trống]
Điền để hoàn thành so sánh.
Đoạn: Vì $3^3={{1}}$ và $27>{{2}}$ nên $3>{{3}}$.
Đáp án: 1=27; 2=26; 3=\\sqrt[3]{26}
Lời giải: Lập phương để so sánh: $27>26\\Rightarrow 3>\\sqrt[3]{26}$.
---
Dạng 3: Trắc nghiệm — nhận biết nhanh
Phương pháp:
Chọn phương án đúng sau khi tính hoặc so sánh.
---
Ví dụ 1. Tính $\\sqrt[3]{\\dfrac{27}{8}}$.
A. $\\dfrac{3}{2}$
B. $\\dfrac{9}{4}$
C. $\\dfrac{27}{8}$
D. $\\dfrac{3}{8}$
Đáp án: A
Lời giải: $\\sqrt[3]{\\dfrac{27}{8}}=\\dfrac{3}{2}$.
---
Dạng 4: Điền đáp án — phương trình $x^3=a$
Phương pháp:
$x^3=a\\Rightarrow x=\\sqrt[3]{a}$. Điền giá trị $x$.
---
Ví dụ 1. Tìm $x$, biết $x^3=-8$.
Đáp án: -2
Placeholder: x = …
Lời giải: $x=\\sqrt[3]{-8}=-2$.
---
Ví dụ 2. [điền chỗ trống]
Điền nghiệm.
Đoạn: Nếu $x^3=27$ thì $x={{1}}$; nếu $x^3=-125$ thì $x={{2}}$.
Đáp án: 1=3; 2=-5
Lời giải: $\\sqrt[3]{27}=3$, $\\sqrt[3]{-125}=-5$.

BÀI TẬP LUYỆN TẬP
Câu 1. Tính $\\sqrt[3]{12^3}$.
Đáp án: 12
Placeholder: Kết quả = …
Lời giải: $\\sqrt[3]{12^3}=12$.

---

Câu 2. [điền chỗ trống]
Điền kết quả.
Đoạn: $\\sqrt[3]{\\dfrac{27}{8}}={{1}}$ và $\\left(\\sqrt[3]{\\dfrac{27}{8}}\\right)^2={{2}}$.
Đáp án: 1=3/2; 2=9/4
Lời giải: $\\sqrt[3]{27/8}=3/2$, bình phương được $9/4$.

---

Câu 3. Tính $\\sqrt[3]{-64}\\cdot\\sqrt[3]{-27}$.
Đáp án: 12
Placeholder: Tích = …
Lời giải: $(-4)\\cdot(-3)=12$.

---

Câu 4. So sánh $3$ và $\\sqrt[3]{26}$.
A. $3 < \\sqrt[3]{26}$
B. $3 = \\sqrt[3]{26}$
C. $3 > \\sqrt[3]{26}$
D. Không xác định
Đáp án: C
Lời giải: $3^3=27>26$.

---

Câu 5. [điền chỗ trống]
Điền dấu so sánh (viết >, < hoặc =).
Đoạn: $\\sqrt[3]{-8} {{1}} -1$ và $\\sqrt[3]{0{,}001} {{2}} 0{,}1$.
Đáp án: 1=<; 2==
Lời giải: $-2<-1$; $\\sqrt[3]{0{,}001}=0{,}1$.

---

Câu 6. Tìm $x$, biết $x^3=-8$.
Đáp án: -2
Placeholder: x = …
Lời giải: $x=\\sqrt[3]{-8}=-2$.

---

Câu 7. [điền chỗ trống]
Điền công thức.
Đoạn: $(\\sqrt[3]{a})^3={{1}}$ và $\\sqrt{a^2}={{2}}$.
Đáp án: 1=a; 2=|a|
Lời giải: Định nghĩa căn bậc ba; căn bậc hai của bình phương là trị tuyệt đối.

---

Câu 8. Tính $\\left(\\sqrt[3]{\\dfrac{27}{8}}\\right)^2$.
A. $\\dfrac{9}{4}$
B. $\\dfrac{3}{2}$
C. $\\dfrac{27}{8}$
D. $\\dfrac{9}{8}$
Đáp án: A
Lời giải: $\\left(3/2\\right)^2=9/4$.

---

Câu 9. [đúng sai nhóm]
Xét các khẳng định sau:
a) $\\sqrt[3]{a^3}=a$ với mọi số thực $a$
b) $\\sqrt{a^2}=a$ với mọi số thực $a$
c) $\\sqrt[3]{-27}=-3$
d) $\\sqrt{-9}$ là số thực
Lời giải
a) Đúng: Theo định nghĩa căn bậc ba.
b) Sai: $\\sqrt{a^2}=|a|$.
c) Đúng: $(-3)^3=-27$.
d) Sai: Căn bậc hai chỉ với số không âm.

---

Câu 10. [điền chỗ trống]
Điền nghiệm.
Đoạn: Nếu $x^3=27$ thì $x={{1}}$; nếu $x^3=-125$ thì $x={{2}}$.
Đáp án: 1=3; 2=-5
Lời giải: $\\sqrt[3]{27}=3$, $\\sqrt[3]{-125}=-5$.

TÓM TẮT BÀI HỌC
TITLE: Ôn tập Chương 3 — Căn thức
ROOT: Căn bậc hai & căn bậc ba
- Căn bậc hai
  - Định nghĩa $\\sqrt{a}$ ($a\\ge 0$)
  - Quy tắc nhân/chia căn
  - $\\sqrt{a^2}=|a|$
- Căn bậc ba
  - Định nghĩa $\\sqrt[3]{a}$ (mọi $a$)
  - Rút gọn / tính giá trị
  - So sánh bằng lập phương
- Luyện tập ưu tiên
  - Điền đáp án
  - Điền chỗ trống
  - Trắc nghiệm / đúng-sai
`;

const full = head + body;
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, full, 'utf8');
fs.writeFileSync(path.resolve('docs/on-tap-chuong-3-toan9-import.txt'), full, 'utf8');
console.log('WROTE', outPath);
console.log('inputQs', (full.match(/Placeholder:/g) || []).length);
console.log('fillQs', (full.match(/\[điền chỗ trống\]/g) || []).length);
console.log('cau', (full.match(/^Câu /gm) || []).length);
