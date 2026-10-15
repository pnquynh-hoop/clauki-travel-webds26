# 15/10 - Kiểu plates cho thư viện ảnh

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #144

## Prompt (tóm tắt)

Khối "Một thành phố, sáu tốc độ" ở trang chủ SighGone chưa đúng bản mẫu (mẫu là lưới ô biển số nhà, ảnh loang ra từ con trỏ; bên repo là dải ảnh xoè). Thêm một kiểu hiển thị đúng mẫu.

Ràng buộc: là `variant` của `gallery`, không tạo component mới; chạy với dữ liệu của brand khác; đúng ở 390px và 1440px; màu, font lấy từ biến CSS.

## Phần tự quyết định

- Kiểu `plates` của `gallery`, thêm trường `note` và `icon` cho ảnh (số tour, icon phương tiện); liên kết dùng `href` đã có.
- Số tour mỗi phương tiện ghi tay vào `note` (tính từ danh mục lúc viết dữ liệu), nên đổi danh mục thì phải sửa lại.
- Màn hình cảm ứng không có rê chuột nên ảnh hiện sẵn (mẫu thì chỉ có ô xanh), để khách trên điện thoại vẫn thấy ảnh thật.
