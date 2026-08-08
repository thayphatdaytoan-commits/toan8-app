import fs from 'fs';
import path from 'path';

const outPath = fs.readFileSync(path.resolve('tai-lieu-dang-web/_outpath.txt'), 'utf8').trim();

const text = `@grade_level: 9
@chapter: 3
@lesson_no: OT3
@title: Ôn tập Chương 3: Căn bậc hai và căn bậc ba
@video_url:
@video_material_url:
@pdf_url:
@seo_description: Ôn tập Chương 3 Toán 9 — căn bậc hai, căn bậc ba, rút gọn căn thức và so sánh căn.
@focus_keyword: ôn tập căn bậc hai căn bậc ba
@keywords: căn bậc hai, căn bậc ba, căn thức, rút gọn biểu thức chứa căn, Toán 9

LÝ THUYẾT TRỌNG TÂM
# 1. Căn bậc hai
Định nghĩa:
Với $a \\ge 0$, số $\\sqrt{a}$ là số không âm có bình phương bằng $a$. Ta có $(\\sqrt{a})^2 = a$ và $\\sqrt{a} \\ge 0$.
---
Ghi nhớ:
- $\\sqrt{a^2} = |a|$.
- $\\sqrt{a}\\cdot\\sqrt{b} = \\sqrt{ab}$ (với $a\\ge 0$, $b\\ge 0$).
- $\\dfrac{\\sqrt{a}}{\\sqrt{b}} = \\sqrt{\\dfrac{a}{b}}$ (với $a\\ge 0$, $b>0$).
---
Chú ý:
Không viết $\\sqrt{a}+\\sqrt{b} = \\sqrt{a+b}$ (sai trong hầu hết trường hợp).
---
# 2. Căn bậc ba
Định nghĩa:
Với mọi số thực $a$, số $\\sqrt[3]{a}$ là số có lập phương bằng $a$. Ta có $(\\sqrt[3]{a})^3 = a$.
---
Ghi nhớ:
- $\\sqrt[3]{a^3} = a$.
- $\\sqrt[3]{a}\\cdot\\sqrt[3]{b} = \\sqrt[3]{ab}$.
- $\\dfrac{\\sqrt[3]{a}}{\\sqrt[3]{b}} = \\sqrt[3]{\\dfrac{a}{b}}$ ($b \\ne 0$).
---
Phương pháp:
Khi rút gọn: phân tích thành tích các thừa số là lũy thừa phù hợp (bậc 2 hoặc bậc 3), rồi đưa thừa số ra ngoài dấu căn.

CÁC DẠNG TOÁN & VÍ DỤ
Dạng 1: Tính giá trị biểu thức chứa căn bậc ba
Phương pháp:
Tính từng căn bậc ba (nếu là số chính phương/lập phương), rồi thực hiện phép tính theo thứ tự.
---
Ví dụ 1. Tính $\\sqrt[3]{12^3}$.
Đáp án: 12
Placeholder: Kết quả = …
Lời giải: Vì $\\sqrt[3]{a^3}=a$ nên $\\sqrt[3]{12^3}=12$.
---
Ví dụ 2. Tính $\\sqrt[3]{\\dfrac{27}{8}}$.
A. $\\dfrac{3}{2}$
B. $\\dfrac{9}{4}$
C. $\\dfrac{27}{8}$
D. $\\dfrac{3}{8}$
Đáp án: A
Lời giải: $\\sqrt[3]{\\dfrac{27}{8}} = \\dfrac{\\sqrt[3]{27}}{\\sqrt[3]{8}} = \\dfrac{3}{2}$.
---
Dạng 2: So sánh hai số chứa căn
Phương pháp:
So sánh bằng cách lập phương (với căn bậc ba) hoặc bình phương (với căn bậc hai) hai vế, chú ý dấu và điều kiện.
---
Ví dụ 1. So sánh $3$ và $\\sqrt[3]{26}$.
A. $3 > \\sqrt[3]{26}$
B. $3 < \\sqrt[3]{26}$
C. $3 = \\sqrt[3]{26}$
D. Không so sánh được
Đáp án: A
Lời giải: $3^3=27>26$ nên $3 > \\sqrt[3]{26}$.
---
Dạng 3: Tìm $x$ từ phương trình dạng $x^3 = a$
Phương pháp:
$x^3 = a \\Rightarrow x = \\sqrt[3]{a}$.
---
Ví dụ 1. Tìm $x$, biết $x^3 = -8$.
Đáp án: -2
Placeholder: x = …
Lời giải: $x = \\sqrt[3]{-8} = -2$.

BÀI TẬP LUYỆN TẬP
Câu 1. Tính $\\sqrt[3]{12^3}$.
A. $12$
B. $4$
C. $36$
D. $144$
Đáp án: A
Lời giải: $\\sqrt[3]{12^3}=12$.

---

Câu 2. Tính $\\sqrt[3]{\\dfrac{27}{8}}$.
A. $\\dfrac{9}{4}$
B. $\\dfrac{3}{2}$
C. $\\dfrac{3}{8}$
D. $\\dfrac{27}{2}$
Đáp án: B
Lời giải: $\\sqrt[3]{\\dfrac{27}{8}}=\\dfrac{3}{2}$.

---

Câu 3. Tính $\\sqrt[3]{-64}\\cdot\\sqrt[3]{-27}$.
A. $12$
B. $-12$
C. $24$
D. $-24$
Đáp án: A
Lời giải: $\\sqrt[3]{-64}=-4$, $\\sqrt[3]{-27}=-3$, tích bằng $12$.

---

Câu 4. Tính $\\left(\\sqrt[3]{\\dfrac{27}{8}}\\right)^2$.
A. $\\dfrac{9}{4}$
B. $\\dfrac{3}{2}$
C. $\\dfrac{27}{8}$
D. $\\dfrac{9}{8}$
Đáp án: A
Lời giải: $\\left(\\dfrac{3}{2}\\right)^2=\\dfrac{9}{4}$.

---

Câu 5. So sánh $3$ và $\\sqrt[3]{26}$.
A. $3 < \\sqrt[3]{26}$
B. $3 = \\sqrt[3]{26}$
C. $3 > \\sqrt[3]{26}$
D. Không xác định
Đáp án: C
Lời giải: $3^3=27>26$ nên $3>\\sqrt[3]{26}$.

---

Câu 6. So sánh $\\sqrt[3]{-8}$ và $-1$.
A. $\\sqrt[3]{-8} > -1$
B. $\\sqrt[3]{-8} < -1$
C. $\\sqrt[3]{-8} = -1$
D. Không so sánh được
Đáp án: B
Lời giải: $\\sqrt[3]{-8}=-2 < -1$.

---

Câu 7. So sánh $\\sqrt[3]{0{,}001}$ và $0{,}1$.
A. $\\sqrt[3]{0{,}001} > 0{,}1$
B. $\\sqrt[3]{0{,}001} < 0{,}1$
C. $\\sqrt[3]{0{,}001} = 0{,}1$
D. Không xác định
Đáp án: C
Lời giải: $(0{,}1)^3=0{,}001$ nên $\\sqrt[3]{0{,}001}=0{,}1$.

---

Câu 8. Tìm $x$, biết $x^3 = -8$.
Đáp án: -2
Placeholder: x = …
Lời giải: $x=\\sqrt[3]{-8}=-2$.

---

Câu 9. [đúng sai nhóm]
Xét các khẳng định sau:
a) $\\sqrt[3]{a^3}=a$ với mọi số thực $a$
b) $\\sqrt{a^2}=a$ với mọi số thực $a$
c) $\\sqrt[3]{-27}=-3$
d) $\\sqrt{-9}$ là số thực
Lời giải
a) Đúng: Theo định nghĩa căn bậc ba.
b) Sai: $\\sqrt{a^2}=|a|$, không luôn bằng $a$.
c) Đúng: $(-3)^3=-27$.
d) Sai: Căn bậc hai chỉ xác định với số không âm.

---

Câu 10. [điền chỗ trống]
Điền kết quả đúng vào chỗ trống.
Đoạn: Vì $(\\sqrt[3]{a})^3={{1}}$ và $\\sqrt[3]{8}={{2}}$.
Đáp án: 1=a; 2=2
Lời giải: Theo định nghĩa căn bậc ba; $\\sqrt[3]{8}=2$.

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
- Luyện tập
  - Tính giá trị
  - So sánh
  - Phương trình $x^3=a$
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, text, 'utf8');
fs.writeFileSync(path.resolve('docs/on-tap-chuong-3-toan9-import.txt'), text, 'utf8');
console.log('WROTE', outPath);
console.log('BYTES', fs.statSync(outPath).size);
