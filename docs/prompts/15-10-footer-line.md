# 15/10 - Footer kiểu line

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #160 (issue #159)

## Prompt (tóm tắt)

Tạo issue cho một variant mới của footer, rồi làm luôn một kiểu hợp với phong cách của SighGone.

## Phần tự quyết định

- Ý tưởng: footer là ga cuối của một tuyến, hợp với hero `ride`, hành trình kiểu metro và biển ga của thương hiệu. Menu thành các ga trên một đường kẻ, nút CTA là ga cuối.
- Là variant của `wl-footer` (HTML khác hẳn nên rẽ nhánh JS), không tạo component mới; dùng lại cột liên hệ, biển số nhà, ghi chú, nguồn ảnh và dây điện của kiểu `columns`.
- Màu và font lấy từ biến CSS (`--color-ink`, `--color-bg`, `--color-primary`, `--font-hand`), nên thương hiệu khác dùng kiểu này vẫn đúng màu.
- Chỉ SighGone dùng kiểu mới; ba thương hiệu kia giữ `columns` để không ảnh hưởng.
