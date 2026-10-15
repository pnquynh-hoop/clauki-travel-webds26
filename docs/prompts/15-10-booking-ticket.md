# 15/10 - Trang đặt tour theo bản mẫu quầy vé

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #142

## Prompt (tóm tắt)

Trang đặt tour của SighGone trong repo chưa giống bản mẫu `sighgone-mau/dat-tour.html`. Làm lại cho giống:
các bước đánh số trong khung, dải ngày có vạch chỗ còn, điểm đón dạng danh sách, máy in vé có màn hình tạm tính, phiếu trượt ra khỏi khe.

Ràng buộc: không viết component trùng với `booking`; chạy được với dữ liệu của brand khác; đúng ở 390px và 1440px; giảm chuyển động thì tắt hiệu ứng.

## Phần tự quyết định

- Làm thành `variant: ticket` của `booking` (dùng lại tour, ngày, điểm đón, tạm tính, phiếu của kiểu `calendar`), không tạo component mới.
- Chưa làm: số khách tách người lớn, trẻ em, em bé (cần quy tắc giá), thẻ lên xe có mã vạch; để PR sau.
- Sửa kèm: `datesShown` không có tác dụng vì `display: grid` của ô ngày thắng thuộc tính `hidden`.
