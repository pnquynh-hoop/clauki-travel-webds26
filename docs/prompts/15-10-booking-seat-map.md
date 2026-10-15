# 15/10 - Sơ đồ ghế, đếm ngược và nên mang cho khối đặt chỗ, trang Tuyến số 1

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #134

## Prompt (tóm tắt)

Thiết kế tiếp các component riêng cho landing page "Tuyến số 1" của SighGone (giá ưu đãi có đếm ngược, danh sách gồm gì và mang gì,
giữ chỗ có sơ đồ ghế). Người dùng hỏi có trùng component cũ không; đối chiếu bảng mục 12 của AGENTS.md thấy trùng với `booking`
kiểu `calendar` (số khách theo chỗ còn, ưu đãi có hạn, danh sách đã gồm, tin nhắn và phiếu), nên người dùng yêu cầu bỏ trùng.

## Phần tự quyết định

- Đóng hai PR #132 và #133 (ba component riêng `deal`, `checklist`, `seat-booking`), làm lại thành ba tính năng tuỳ chọn của `booking`
  kiểu `calendar`: `seatMap`, đếm ngược theo `deal.until` (nhãn `labels.dealCountdown`), danh sách `bring`.
- Tính năng tắt khi dữ liệu không khai, nên các trang `booking` đang chạy không đổi; kiểm lại ở SighGone, Bậc Trà, Gành Sớm, Mé Rạch.
- Thử bật cả ba trên Bậc Trà chỉ bằng dữ liệu rồi hoàn lại.
