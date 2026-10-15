# 15/10 - Giá, màu và lịch tháng cho site AI tạo

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #179

## Prompt (tóm tắt)

Site thử Tulip Trails (Hà Lan): giá đi Hà Lan rẻ vậy (10.000 đồng); lịch này đổi thành lịch quyển tháng đi; màu lệch pha
(chữ tiêu đề nâu trên trang màu nút xanh lá).

## Kết quả AI trả về

`generate.js`: lời nhắc ghi rõ giá bằng đồng và đơn vị tính, giá gốc lấy từ tour chính của catalog, bỏ qua giá dưới 50.000;
màu nhấn kéo về cùng sắc màu nút, `extraVars` dựng `--color-tint`, `--color-mark`, `--eyebrow-color` và bảng `--dark-*` khi khung
có chế độ tối; nhãn cột menu chân trang đổi theo tên mới. `rules.js`: `ALWAYS` đổi `booking:ticket` sang `wall`, `PREFER` khi đổi
kiểu bị cấm. Đã tạo thử lại site Hà Lan: giá 2.500.000 đồng, trang đặt tour dùng tờ lịch tháng, bảng màu cùng họ xanh lá.
