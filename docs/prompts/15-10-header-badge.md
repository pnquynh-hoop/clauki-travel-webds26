# 15/10 - Nhãn Mới trên menu header

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #158

## Prompt (tóm tắt)

Thêm tag "Mới" cho Tuyến số 1 trên header.

## Phần tự quyết định

- Làm thành trường dữ liệu chung `nav[].badge` thay vì ghi cứng cho một mục, để thương hiệu nào cũng gắn nhãn cho mục menu của mình được.
- Nhãn chỉ hiện ở header, chân trang giữ chữ thường vì dùng chung danh sách menu.
- Màu lấy từ `--color-mark` của thương hiệu, thiếu thì màu nhấn; cỡ chữ tính theo em để theo mục menu ở mọi kiểu header.
