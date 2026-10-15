# 15/10 - Công tắc Xem thử trong editor

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #150

## Prompt (tóm tắt)

Hai nút Chỉnh và Xem thử làm thành một công tắc (toggle).

## Phần tự quyết định

- Một công tắc tên "Xem thử": tắt là đang chỉnh (mặc định), bật là xem như khách. Dùng `role="switch"` và `aria-checked` để trình đọc màn hình hiểu, bật tắt được bằng phím cách.
- Vẫn ẩn trên điện thoại như hai nút cũ, vì thanh trên đã chật.
