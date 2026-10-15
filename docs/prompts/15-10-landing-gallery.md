# 15/10 - Thư viện ảnh cho landing Tuyến số 1

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #140

## Prompt (tóm tắt)

Landing "Tuyến số 1" của SighGone không cần khối khách kể (chuyến đầu mới mở bán ngày 01/11/2026, chưa có khách nào đi)
và đang thiếu thư viện ảnh. Bỏ `reviews`, thêm `gallery`.

Ràng buộc: ảnh thật có giấy phép cho dùng lại, mỗi ảnh có `alt` và một dòng `credits`, rộng tối đa 2000px, nên dưới 300KB;
dùng lại kiểu `slices` đã có, không viết component mới.

## Phần tự quyết định

- Sáu ảnh ứng với sáu ga của tuyến, chú thích ghi giờ ga để khớp với hero.
- Đặt khối ngay sau hero và trước đặt chỗ: khách xem trước rồi mới giữ chỗ.
- Trang chủ và các trang khác của SighGone vẫn giữ `reviews` như cũ.
