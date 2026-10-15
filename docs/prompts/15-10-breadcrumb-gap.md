# 15/10 - Khoảng trống dưới breadcrumb

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #161

## Prompt (tóm tắt)

Hỏi khoảng cách từ breadcrumb xuống khối Hỏi đáp có phải lỗi giao diện không (ảnh chụp trang `/sighgone/hoi-dap`).

## Phần tự quyết định

- Đúng là lỗi: mọi khối có đệm trên `var(--space-section)` (6rem) hoặc của riêng component (5rem), cộng thêm dòng breadcrumb nên thành hơn 100px trống. Đo trên 16 trang.
- Sửa bằng một quy tắc trong `breadcrumb.css` cho khối ngay dưới breadcrumb (đệm trên 1,5rem), không đụng từng component. Dùng `[class]` để mạnh hơn bộ chọn theo class của component mà không cần `!important`.
- Không áp cho `hero`, `room-detail` vì chúng bắt đầu bằng ảnh tràn và có đệm trên bằng 0.
