# 15/10 - Kiểu notes cho khối đánh giá

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #147

## Prompt (tóm tắt)

Thêm một kiểu của khối đánh giá giống bản mẫu SighGone: bức tường giấy note dán băng keo, mỗi tờ có mức thở dài trước và sau chuyến.

Ràng buộc: là `variant` của `reviews`, không tạo component mới; chạy với dữ liệu của brand khác (thiếu thước đo thì bỏ dòng đó); màu giấy lấy từ biến CSS thay vì màu cố định; đúng ở 390px và 1440px; giảm chuyển động thì hiện ngay.

## Phần tự quyết định

- Thước đo viết thành dữ liệu chung (`meter` ở mục và ở section), không ghi cứng chữ "thở dài" trong mã.
- Màu giấy xoay vòng sáu màu pha từ `--color-primary`, `--color-accent`, `--color-mark` và nền thẻ, độ nghiêng xoay theo thứ tự bằng CSS.
- Giữ dòng giới thiệu số chuyến và điểm trung bình dưới tiêu đề (bản mẫu không có).
