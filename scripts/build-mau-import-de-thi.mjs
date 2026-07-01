/**
 * Nhúng lại nội dung TỔNG HỢP KIẾN THỨC vào public/mau-import-de-thi.txt
 * (các dòng tham chiếu prefix # để parser import bỏ qua).
 *
 * Chạy từ thư mục toan8-app: node scripts/build-mau-import-de-thi.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const tongHop = path.join(root, '..', '..', 'toán 11', 'TỔNG HỢP KIẾN THỨC MÔN TOÁN.txt');
const out = path.join(root, 'public', 'mau-import-de-thi.txt');

if (!fs.existsSync(tongHop)) {
  console.error('Không tìm thấy:', tongHop);
  process.exit(1);
}

const raw = fs.readFileSync(tongHop, 'utf8');
const ref = raw
  .split(/\r?\n/)
  .map((l) => (l.trim() === '' ? '#' : `# ${l}`))
  .join('\n');

const head = `# =============================================================================
# MẪU IMPORT ĐỀ THI (TXT) — Toán 11 — copy/sửa rồi import trong Admin
# =============================================================================
#
# --- QUAN TRỌNG: PHẦN THAM CHIẾU KIẾN THỨC ---
# Toàn bộ nội dung file "TỔNG HỢP KIẾN THỨC MÔN TOÁN" (CT 2018, lớp 6–12) nằm ở
# CUỐI file này, mỗi dòng bắt đầu bằng # để TRÌNH IMPORT không hiểu nhầm là đề bài.
#
# --- QUY ƯỚC "Dạng toán" KHI IMPORT VÀO HỆ THỐNG (lớp 11) ---
# - Giá trị sau "Dạng toán:" phải là một hoặc nhiều chuỗi trùng NGUYÊN VĂN với một dòng
#   kiến thức (không phải tiêu đề chương) trong phần # TOÁN LỚP 11 của khối tham chiếu
#   phía dưới — trùng với file nguồn src/assets/math11-knowledge.txt trong mã nguồn.
# - Dòng "Chương: n" (n = 1..9) phải khớp chương Toán 11; mỗi tag chỉ hợp lệ nếu thuộc
#   đúng chương đó. Tag không nằm trong danh sách chương → hệ thống đổi thành "Các dạng toán khác".
# - Nhiều tag trên một dòng: chỉ phân tách bằng ; hoặc | (KHÔNG dùng dấu phẩy — tên kiến thức CT có dấu phẩy trong ngoặc / liệt kê)
# - Luôn có thể dùng: Dạng toán: Các dạng toán khác
#
# --- PROMPT GỢI Ý CHO AI (copy nguyên khối dưới đây khi nhờ soạn/ghi đề) ---
# Bạn là trợ lý soạn file import đề thi Toán 11 theo đúng định dạng mẫu (meta @..., Câu n:,
# Loại:, Mức độ:, Chương:, Dạng toán:, A.–D., Đáp án:, Lời giải:...).
#
# Nhiệm vụ:
# 1) Đọc khối "TỔNG HỢP KIẾN THỨC" đã nhúng trong cùng file (các dòng bắt đầu #).
# 2) Với mỗi câu hỏi: xác định nội dung thuộc kiến thức/chương nào của CT 2018 (có thể đối chiếu
#    cả lớp 6–12 để hiểu bối cảnh), rồi ÁNH XẠ sang Chương 1..9 của TOÁN LỚP 11 tương ứng.
# 3) Điền "Chương: n" (1–9) và "Dạng toán:" chỉ bằng các câu/nguyên mẫu kiến thức nằm dưới
#    tiêu đề "# Chương k: ..." trong phần # TOÁN LỚP 11 của khối tham chiếu (sao chép nguyên văn,
#    kể cả dấu câu và công thức LaTeX $...$ nếu có). Không tự đặt tên kiểu "Đạo hàm cơ bản"
#    nếu chuỗi đó không xuất hiện trong danh sách.
# 4) Nếu không chọn được dòng nào khớp chính xác, ghi: Dạng toán: Các dạng toán khác
# 5) Giữ nguyên quy tắc định dạng ảnh, đúng/sai, trả lời ngắn, tự luận như phần mẫu không comment.
# 6) Không xóa hoặc sửa khối tham chiếu # ở cuối file.
# --- HẾT PROMPT GỢI Ý ---
#
# --- PHẦN ĐỀ MẪU (import thật — các dòng không bắt đầu #, trừ meta @) ---
# Meta (tuỳ chọn):
@grade_level: 11
@chapter: 1
@lesson_no: 1
@title: Đề mẫu đủ loại câu
@duration: 20
@level: test
@exam_type: lesson

Chương: 1
Bài: 1
Tiêu đề: Đề mẫu — TN, Đúng/Sai, Trả lời ngắn, Tự luận

# --- PHẦN I: Trắc nghiệm 4 phương án ---
# Ảnh: dùng ![mô tả](URL) hoặc <img src="URL" alt="..." /> — thay URL bằng link ảnh thật (https)
Câu 1: Tính $\\sin\\frac{\\pi}{2}$.
Mức độ: NB
Chương: 1
Dạng toán: Góc lượng giác và giá trị lượng giác của các góc lượng giác.
A. $0$
B. $1$
C. $-1$
D. $\\frac{1}{2}$
Đáp án: B
Lời giải: $\\sin\\frac{\\pi}{2}=1$.

# --- PHẦN II: Đúng / Sai (nhiều mệnh đề a–d) ---
Câu 2: Cho $f(x)=2x^3$. Khi đó:
Loại: đúng sai
Mức độ: TH
Chương: 7
Dạng toán: Các quy tắc tính đạo hàm (tổng, hiệu, tích, thương, hàm hợp). Đạo hàm của hàm số lượng giác, mũ, lôgarit.
a) $f'(x_0)=\\lim_{x\\to x_0}\\frac{f(x)-f(x_0)}{x-x_0}$
Đáp án: Đúng
b) $f'(1)=-6$
Đáp án: Sai
c) $f'(0)=0$
Đáp án: Đúng
d) $f'(2)=24$
Đáp án: Đúng
Lời giải: $f'(x)=6x^2$; $f'(1)=6$, $f'(0)=0$, $f'(2)=24$.

# --- PHẦN III: Trả lời ngắn ---
Câu 3: Tìm $x$ biết $\\log_2 x = 3$ (chỉ ghi giá trị $x$).
Loại: trả lời ngắn
Mức độ: VD
Chương: 6
Dạng toán: Phương trình, bất phương trình mũ và lôgarit cơ bản.
Đáp án: 8
Gợi ý: Nhập một số...
Lời giải: $x=2^3=8$.

Câu 4: Số hạng thứ 5 của cấp số cộng có $u_1=3, d=2$ là?
Loại: trả lời ngắn
Mức độ: TH
Chương: 2
Dạng toán: Cấp số cộng: Định nghĩa, số hạng tổng quát, tính chất, tổng $n$ số hạng đầu.
Đáp án: 11
Placeholder: Nhập đáp án...
Lời giải: $u_5=u_1+4d=3+8=11$.

# --- PHẦN IV: Tự luận (học sinh nộp ảnh) ---
Câu 5: Chứng minh hàm số $f(x)=x^2$ liên tục tại mọi $x_0\\in\\mathbb{R}$.
Loại: tự luận
Mức độ: VDC
Chương: 3
Dạng toán: Hàm số liên tục: Liên tục tại một điểm, liên tục trên một khoảng/đoạn, tính chất và định lí về nghiệm của phương trình.
Lời giải: Gợi ý chấm: dùng định nghĩa liên tục hoặc $\\lim_{x\\to x_0} f(x)=f(x_0)$.

# =============================================================================
# HẾT PHẦN IMPORT — DƯỚI ĐÂY CHỈ LÀ THAM CHIẾU (mọi dòng bắt đầu #, parser sẽ bỏ qua)
# Nguồn: TỔNG HỢP KIẾN THỨC MÔN TOÁN.txt — CT GDPT 2018 (lớp 6–12)
# =============================================================================

`;

fs.writeFileSync(out, head + ref + '\n', 'utf8');
console.log('Wrote', out);
