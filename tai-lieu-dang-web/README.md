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

Mỗi thư mục bài có file `.gitkeep` để Git giữ folder trống. Khi có tài liệu nguồn, **thay `.gitkeep` bằng file `.docx` / `.pdf`** (hoặc giữ cả hai).

## Dùng với Cursor Automation (Cloud)

1. Đẩy folder này lên GitHub (`git push`).
2. Trong Automation chọn Repository = repo này.
3. Agent đọc file trong `tai-lieu-dang-web/…` thay vì ổ `C:\`.

## Đồng bộ từ máy local

Sau khi thêm/sửa file trong thư mục local, copy vào đây rồi commit/push, hoặc dùng script đồng bộ.
