# 15/10 - Dải ảnh nền cố định

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #141

## Prompt (tóm tắt)

Thêm một component dạng section chỉ là một bức ảnh: trang cuộn qua nhưng ảnh không cuộn, tạo cảm giác ảnh là nền cố định.

Ràng buộc: đặt tên theo chức năng, dùng được cho mọi thương hiệu bằng dữ liệu; đúng ở 390px và 1440px; giảm chuyển động thì tắt hiệu ứng.

## Phần tự quyết định

- Không dùng `background-attachment: fixed` vì iOS bỏ qua; dùng ảnh `position: fixed` trong khung `clip-path: inset(0)`.
- Khung không dùng `transform` hay `filter`, vì chúng làm ảnh fixed bám theo khung và mất hiệu ứng.
- Ba chiều cao (`screen`, `half`, `tall`) làm thành `variant`; chữ là tuỳ chọn.
