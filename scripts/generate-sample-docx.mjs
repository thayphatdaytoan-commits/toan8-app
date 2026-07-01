/**
 * Tạo file .docx mẫu trong public/ để import đề thi / bài giảng.
 * Word → mammoth.extractRawText → cùng quy tắc với .txt (xuống dòng = đoạn văn bản trong Word).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const assetsDir = path.join(__dirname, '..', 'src', 'assets');

function extractGradeSectionFromCurriculum(raw, gradeNum) {
  const g = String(gradeNum ?? '').trim();
  const text = String(raw || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n');
  let inSection = false;
  const out = [];
  for (const line of lines) {
    const t = line.trim();
    const gm = t.match(/^TOÁN\s+LỚP\s+(\d+)\s*$/i);
    if (gm) {
      inSection = String(gm[1]) === g;
      continue;
    }
    if (inSection) out.push(line);
  }
  return out.join('\n').trim();
}

function toHashCommentBlock(text) {
  const s = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!s) return '';
  return s
    .split('\n')
    .map((l) => `# ${String(l || '').trim()}`.trimEnd())
    .join('\n');
}

function paragraphsFromText(text) {
  const lines = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  return lines.map(
    (line) =>
      new Paragraph({
        children: [new TextRun({ text: line })],
      })
  );
}

const curriculumRaw = fs.readFileSync(path.join(assetsDir, 'math-curriculum-gdpt2018.txt'), 'utf8');
const CURR_G8 = extractGradeSectionFromCurriculum(curriculumRaw, 8);
const CURR_G11 = extractGradeSectionFromCurriculum(curriculumRaw, 11);

const QUIZ_DOCX_BODY = `
MẪU IMPORT ĐỀ THI (WORD .docx) — Toán 11

Hướng dẫn ngắn:
- Mỗi dòng trong Word tương ứng một dòng text sau khi trích (giữ Enter xuống dòng).
- Trắc nghiệm: phương án viết HOA A. B. C. D. (không dùng a. b. c. d. cho TN).
- Trong đề bài được dùng mệnh đề a) b) c) chữ thường xuống dòng (không bị nhầm là phương án TN).
- Không dùng dòng bắt đầu bằng # (parser đề sẽ bỏ qua toàn bộ dòng đó).
- Kiểu câu (TN / đúng sai / …): chỉ dùng dòng "Loại: ..." — không dùng "Dạng: ..." (dễ lẫn với "Dạng toán:" kiến thức).
- Chương: ghi số (1, 2, …); Dạng toán: copy nguyên văn một dòng trong bảng kiến thức CT (cùng khối / chương).
- Nhiều dạng trên một dòng: chỉ tách bằng ; hoặc | (không dùng dấu phẩy — tên kiến thức CT có dấu phẩy trong nội dung).

@grade_level: 11
@chapter: 1
@lesson_no: 1
@title: Đề mẫu Word — TN, Đúng/Sai, Trả lời ngắn, Tự luận
@duration: 20
@exam_type: lesson

Chương: 1
Bài: 1
Tiêu đề: Đề mẫu — đủ loại câu

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

Câu 3: Tìm $x$ biết $\\log_2 x = 3$ (chỉ ghi giá trị $x$).
Loại: trả lời ngắn
Mức độ: VD
Chương: 6
Dạng toán: Phương trình, bất phương trình mũ và lôgarit cơ bản.
Đáp án: 8
Gợi ý: Nhập một số...
Lời giải: $x=2^3=8$.

Câu 4: Chứng minh hàm số $f(x)=x^2$ liên tục tại mọi $x_0\\in\\mathbb{R}$.
Loại: tự luận
Mức độ: VDC
Chương: 3
Dạng toán: Hàm số liên tục: Liên tục tại một điểm, liên tục trên một khoảng/đoạn, tính chất và định lí về nghiệm của phương trình.
Lời giải: Gợi ý chấm: dùng định nghĩa liên tục hoặc $\\lim_{x\\to x_0} f(x)=f(x_0)$.


# =============================================================================
# THAM CHIẾU KIẾN THỨC (CT GDPT 2018) — DÙNG ĐỂ ÁNH XẠ "Dạng toán:"
# Các dòng bắt đầu bằng # sẽ được TRÌNH IMPORT ĐỀ THI BỎ QUA.
# Khi soạn đề: copy 1 dòng kiến thức (không phải tiêu đề chương) đặt vào "Dạng toán:".
# =============================================================================

# --- TOÁN LỚP 8 (tham chiếu) ---
${toHashCommentBlock(CURR_G8)}

# --- TOÁN LỚP 11 (tham chiếu) ---
${toHashCommentBlock(CURR_G11)}
`.trim();

const LESSON_DOCX_BODY = `
MẪU IMPORT BÀI GIẢNG (WORD .docx)

Hướng dẫn ngắn:
- Giữ nguyên các dòng meta @... ở đầu.
- Dòng bắt đầu bằng // trong Word sẽ bị parser bỏ qua (dùng cho ghi chú).
- Mục: LÝ THUYẾT TRỌNG TÂM, CÁC DẠNG TOÁN & VÍ DỤ, BÀI TẬP TỰ LUYỆN, TÀI LIỆU PDF.
- Nếu có "CÁC DẠNG TOÁN & VÍ DỤ" thì phải có "LÝ THUYẾT TRỌNG TÂM" phía trên — nội dung giữa hai mục → Lý thuyết trọng tâm trên web.

@grade_level: 11
@chapter: 1
@lesson_no: 1
@title: Hàm số bậc nhất (mẫu Word)
@video_url:
@pdf_url:
@seo_description: Tóm tắt ngắn để hiển thị/SEO.
@focus_keyword: hàm số bậc nhất
@keywords: đồ thị, hệ số góc, giao điểm, tính đơn điệu

LÝ THUYẾT TRỌNG TÂM
#[Định nghĩa:
Hàm số bậc nhất có dạng $y=ax+b$ với $a\\ne 0$.
]#

#[Ghi nhớ:
- Đồng biến nếu $a>0$, nghịch biến nếu $a<0$.
- Hai đường thẳng song song khi $a=a'$.
]#

CÁC DẠNG TOÁN & VÍ DỤ
Dạng 1: Nhận biết đồ thị và hệ số góc
#[Phương pháp:
Từ $y=ax+b$ suy ra hệ số góc là $a$, giao điểm với trục $Oy$ là $b$.
]#

#[Ví dụ:
Cho $y=2x-1$. Tìm hệ số góc và giao điểm với $Oy$.
]#

#[Lời giải:
Hệ số góc $a=2$; giao điểm với $Oy$ là điểm $(0,-1)$.
]#

BÀI TẬP TỰ LUYỆN
ID: hsbn_word_01
§ Cho $y=-3x+2$. Hệ số góc bằng bao nhiêu?
A. 2
B. -3
C. 3
D. 0
Đáp án: B
Gợi ý hướng dẫn: Nhớ dạng $y=ax+b$ — hệ số góc là hệ số của $x$.
Lời giải: Vì $y=ax+b$ nên $a=-3$.

---

ID: hsbn_word_02
§ Cho $y=2x-1$. Tính $f(1)$.
Đáp án: 1
Lời giải: $f(1)=2\\cdot 1-1=1$.

TÀI LIỆU PDF
https://drive.google.com/file/d/xxxxxxxx/view?usp=sharing
`.trim();

async function main() {
  const quizDoc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'Mẫu import đề thi (.docx)',
            heading: HeadingLevel.TITLE,
          }),
          ...paragraphsFromText(QUIZ_DOCX_BODY),
        ],
      },
    ],
  });

  const lessonDoc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'Mẫu import bài giảng (.docx)',
            heading: HeadingLevel.TITLE,
          }),
          ...paragraphsFromText(LESSON_DOCX_BODY),
        ],
      },
    ],
  });

  // Ghi bản v2 để tránh lỗi EBUSY nếu bạn đang mở file mẫu cũ trong Word.
  const outQuiz = path.join(publicDir, 'mau-import-de-thi-sample-v2.docx');
  const outLesson = path.join(publicDir, 'mau-import-bai-giang-sample-v2.docx');

  await fs.promises.writeFile(outQuiz, await Packer.toBuffer(quizDoc));
  await fs.promises.writeFile(outLesson, await Packer.toBuffer(lessonDoc));

  console.log('[generate-sample-docx] Wrote:', outQuiz);
  console.log('[generate-sample-docx] Wrote:', outLesson);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
