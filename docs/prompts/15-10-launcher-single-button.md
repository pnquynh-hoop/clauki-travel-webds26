# 15/10 - Một nút duy nhất cho Thử chỉnh và đổi thương hiệu

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #152

## Prompt (tóm tắt)

Hai nút ở góc dưới trái (Thử chỉnh và nút tròn W của BTC) gom lại thành một.

## Phần tự quyết định

- Giữ nút tròn W của BTC làm nút duy nhất (BTC cần nút này để ban giám khảo đổi thương hiệu), thay vì ẩn nó. Bấm W thì mở menu của đội; mục Đổi thương hiệu bấm giúp hộp chọn của BTC. Không sửa `wd2026.js`: chặn thao tác bấm ở pha bắt.
- Nút "Đổi dữ liệu demo" hiện khi rê chuột bị ẩn bằng CSS vì menu đã có mục tương ứng.
- Site khách không có nút của BTC nên vẫn dùng nút chữ "Thử chỉnh".
