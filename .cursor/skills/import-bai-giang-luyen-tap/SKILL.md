---
name: import-bai-giang-luyen-tap
description: >-
  Quy tắc bắt buộc khi soạn/import/đăng bài tập luyện tập bài giảng
  (thayphatdaytoan / toan8-app): tách Lời giải khỏi đề bài; chỉ dùng dạng
  điền đáp án khi đáp án đơn giản, còn đáp án có x mũ / y mũ hoặc biểu thức
  phức tạp thì chuyển trắc nghiệm. Use when importing lessons, fixing practice
  questions, soạn bài giảng, đăng bài, sửa lỗi lời giải hiện ở đề bài, hoặc
  chọn dạng input vs mcq.
---

# Import bài giảng — bài tập luyện tập

Áp dụng mọi lần soạn file import, sửa JSON practice, hoặc đăng/cập nhật bài giảng trên web.

Mẫu import bắt buộc (cấu trúc chung): `tai-lieu-dang-web/mau-import-bai-giang (8).txt` và `(7).docx` — xem thêm `docs/mau-import-bai-giang-BAT-BUOC.txt`.

## Quy tắc 1 — Không để Lời giải trong đề bài

**Lỗi cần tránh:** bước giải / biến đổi nằm xen giữa đề và A–D (học sinh thấy đáp án trước khi làm).

**Đúng format import:**

```text
Câu N. <chỉ đề bài — không có bước giải>
A. ...
B. ...
C. ...
D. ...
Đáp án: A
Lời giải:
<toàn bộ bước giải ở đây>
```

Với dạng nhập đáp án / đúng-sai:

```text
Câu N. <chỉ đề bài>
Đáp án: ...
Lời giải:
<bước giải>
```

**Khi sửa bài đã lỗi trên web (JSON practice):**

- `question` = **một dòng đề** (hoặc chỉ phần hỏi, không có chuỗi `= ...` bước giải).
- Mọi dòng bước giải chuyển sang `explanation` (Lời giải chi tiết — chỉ hiện sau nộp).
- Không nhét lời giải vào `options`.

**Checklist trước khi Lưu:**

- [ ] Stem không còn dòng kiểu `$= ...$` / “Thực hiện phép chia trước” / suy luận dài.
- [ ] Preview học sinh: đề → A–D (hoặc ô nhập) — **không** có khung lời giải ở giữa.
- [ ] `explanation` / khối `Lời giải:` có nội dung sau `Đáp án:`.

## Quy tắc 2 — Điền đáp án chỉ khi đáp án đơn giản

Trong **BÀI TẬP LUYỆN TẬP / BÀI TẬP TỰ LUYỆN**:

| Dạng | Khi nào dùng |
|------|----------------|
| **Nhập đáp án (input)** | Đáp án **đơn giản**: số (`10`, `-27`, `2/3`), một biến (`$x$`), đơn thức ngắn không mũ phức (`$3xy$`, `$8x$`, `$3m$`). |
| **Trắc nghiệm (mcq)** | Đáp án có **nhiều kí tự x mũ / y mũ** (hoặc tương đương: `x^2`, `y^3`, đa thức nhiều hạng tử, tích nhân tử `(x-2)(x+2)`, phân thức biến…). |

**Ví dụ:**

- Điền OK: `$10$`, `$x$`, `$800$`, `$3m$`
- Phải MCQ: `$4x^2 - 3x + 5$`, `$-4x^2z^2$`, `$x^2 - 3y^2$`, `$(x+2)(x+4)$`

Khi chuyển input → mcq: giữ đáp án đúng làm một phương án, thêm 3 nhiễu hợp lý (đổi dấu, đổi mũ, đổi hệ số), ghi `Đáp án: A` (hoặc index đúng), đưa bước giải vào `Lời giải:`.

## Thứ tự làm việc khi đăng/sửa bài

1. Soạn / sửa practice theo hai quy tắc trên + mẫu import bắt buộc.
2. Import hoặc dán JSON → kiểm tra preview tab Bài tập.
3. Chỉ **Lưu** khi checklist Quy tắc 1 đạt.
4. Không đụng bài user đã bảo giữ nguyên (ví dụ chỉ sửa Bài 5–9 thì bỏ qua 1–4).
