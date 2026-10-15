# 15/10 - Menu của nút Thử chỉnh

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #151

## Prompt (tóm tắt)

Chuyển nút "Thử chỉnh" sang bên trái, bấm vào thì hiện menu: đổi thương hiệu, tạo mới, chỉnh sửa. Ở trang web đã xuất bản thì chỉ có chỉnh sửa và tạo bản sao.

## Phần tự quyết định

- Đặt ngay trên nút tròn đổi thương hiệu của BTC (không đè lên góc đó, theo quy ước của dự án). "Đổi thương hiệu" bấm giúp nút mở hộp chọn có sẵn của BTC, không viết lại.
- Site khách đã xuất bản không sửa được bản gốc (xuất bản là cố định, chưa có khoá sửa), nên "Chỉnh sửa" là sửa nháp trên máy theo tên site, giống thương hiệu có sẵn; "Tạo bản sao" chép site thành nháp của trình tạo web `/tao` để đặt tên mới và xuất bản.
- Editor học thêm cách mở site khách: thương hiệu làm khung (theme.css, ảnh) lấy từ `theme.base`, nháp ghi kèm `base`.
- Chưa nối Supabase nên không có site khách thật để thử: kiểm thử bản sao bằng sự kiện dựng trang giả lập, kiểm thử editor trên `/nhap/`.
