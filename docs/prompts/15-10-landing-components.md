# 15/10 - Ba component cho landing page Tuyến số 1

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #132 (component), PR dữ liệu và ảnh SighGone đi kèm

## Prompt (tóm tắt)

Thiết kế tiếp các component riêng cho landing page "Tuyến số 1" của SighGone, cùng phong cách bản thiết kế đã chọn
(nền tối nối nhịp với hero, thẻ viền dày bóng cứng, ảnh tách nền đè mép khối): khối giá ưu đãi có hạn kèm đếm ngược và hàng ghế,
danh sách gồm gì và mang gì, giữ chỗ có sơ đồ ghế. Yêu cầu: chạy bằng dữ liệu, màu và font qua biến CSS, thử trên một
thương hiệu khác chỉ bằng dữ liệu, thiếu trường thì bỏ phần đó, đúng ở 390px và 1440px.

## Phần tự quyết định

- Đặt tên theo chức năng (`deal`, `checklist`, `seat-booking`), không gắn tên thương hiệu.
- Số khách luôn khớp số ghế chọn, không vượt số ghế trống; không báo "đặt thành công" vì trang tĩnh không có máy chủ.
- Tách hai PR độc lập cùng base `main`: component, rồi dữ liệu và ảnh của trang.
