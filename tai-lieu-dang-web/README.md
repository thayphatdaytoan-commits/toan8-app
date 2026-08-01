# Tài liệu đăng web (đồng bộ cấu trúc local)

Thư mục này **giống cấu trúc** trên máy:

`C:\Users\ADMIN\Downloads\web toán\TAI LIEU DANG WEB`

## Cấu trúc

```
tai-lieu-dang-web/
  Toán {6-12}/
    Bài Giảng/
      CHƯƠNG …/
        Bài …/
    Đề thi/
      CHƯƠNG …/
        Bài …/
```

Mỗi thư mục bài có file `.gitkeep` để Git giữ folder trống. Khi có tài liệu nguồn, **thay `.gitkeep` bằng file `.pdf` / ảnh** (có thể giữ thêm `.docx` để lưu trữ, nhưng **bai-viet-ai chỉ upload PDF hoặc ảnh**).

## Dùng với Cursor Automation (Cloud)

1. Đẩy folder này lên GitHub (`git push`).
2. Trong Automation chọn Repository = repo này.
3. Agent đọc file trong `tai-lieu-dang-web/…` thay vì ổ `C:\`.
4. Khi soạn trên [bai-viet-ai](https://bai-viet-ai.vercel.app/): **làm đúng** `docs/HUONG_DAN_BAI_VIET_AI_BAT_BUOC.txt`
   (chọn đúng lớp/chương/bài, cấu hình 2 ví dụ/dạng + 10 bài tập, dán «Yêu cầu thêm»,
   **file nguồn chỉ PDF/ảnh — không .doc/.docx**, tạo xong **phải nhấn «Lưu vào thư mục»**).

## Đồng bộ từ máy local

Sau khi thêm/sửa file trong thư mục local, copy vào đây rồi commit/push, hoặc dùng script đồng bộ.
