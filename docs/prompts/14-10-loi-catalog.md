# 14/10 - Lõi: danh mục sản phẩm, tải component khi cần, header theo trang (issue #104)

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #118

## Prompt (tóm tắt)

Làm issue #104 trên máy, chưa commit, chưa push:

1. thêm danh mục sản phẩm `catalog` trong `content.json`: tour hoặc hạng phòng khai một lần, các khối đọc chung qua
   `el.site.catalog`, có hàm tra một mục theo id;
2. trang có thể khai header riêng, thêm kiểu `minimal` (chỉ logo và nút đặt) cho landing page;
3. `app.js` không import sẵn mọi component nữa: `core.js` chỉ tải JS và CSS của các khối trang đang mở dùng;
   bỏ `css/components.css`; đổi brand nhanh liên tiếp không được vẽ đè trang;
4. một sự kiện chung để khối nào cũng chọn sẵn sản phẩm cho form đặt chỗ, tên cũ vẫn chạy để không hỏng khối của đồng đội.

Yêu cầu: chạy thử bằng `serve.py` trên máy; ghi vào AGENTS.md mục 3, 4, 5.

## Phần tự quyết định

- Chọn làm #104 trước vì các issue khác của đội dựa vào định dạng `catalog`.
- Chỉ làm trên máy cho tới khi tự xem; sau đó mới cho mở PR.
- Phát hiện trình duyệt giữ tệp cũ ("nhảy sang brand-test", "không thấy #104") nên yêu cầu sửa cách chạy trên máy.
