# 15/10 - Breadcrumb cho các trang con

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #139

## Prompt (tóm tắt)

Thêm breadcrumb (đường dẫn "Trang chủ / Tour / tên trang") cho website nhiều trang của SighGone. Đối chiếu trước: repo chưa có component nào tương tự
và issue #84 không có mục này, nên làm component mới `breadcrumb` dùng chung, nhận bước từ dữ liệu.

## Phần tự quyết định

- Bước ghi trong `items` của section (không tự suy ra từ đường dẫn) để không phải đổi `core.js`; bước đầu lấy từ `site.home`.
- Gạch ngăn vẽ bằng CSS thay vì chữ, theo quy tắc không dùng ký hiệu làm dấu ngăn trong chữ.
- Thử trên `brand-test` (header overlay) lộ lỗi dòng này bị header che; sửa bằng cách tự đo chiều cao header, vì `--header-stuck` chỉ gồm thanh chính, không gồm dải thông tin phía trên.
- Không thêm vào landing `tuyen-so-1` (header rút gọn) và trang `404`.
