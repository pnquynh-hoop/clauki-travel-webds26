# 14/10 - Editor "Thử chỉnh" (issue #82)

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #120

## Prompt (tóm tắt)

Làm editor theo #82 và bản thiết kế `editor.html` trong bản mẫu SighGone, chế độ "Thử chỉnh" cho brand có sẵn:

1. mở bằng nút trên trang khách (không đặt ở góc dưới trái, chỗ nút của BTC) hoặc `?sua`; trang thật ở giữa, bảng chỉnh bên phải,
   điện thoại có thanh 4 nút và tấm trượt;
2. chỉ sửa dữ liệu (`content.json`, biến theme), không sửa mã; mọi thay đổi có hoàn tác, làm lại, lưu nháp trên máy;
   có dải báo "đang thử, chưa lưu vào repo", nút về bản gốc, tải `content.json`;
3. khối: đổi kiểu, dời, ẩn, nhân đôi, xoá; sửa nội dung bằng form tự sinh theo manifest; thêm khối;
4. giao diện: màu có kiểm tương phản AA (không đạt thì không cho lưu), font, bo góc; trang: thêm trang có trên menu;
5. giao diện editor chung cho mọi brand, không đọc màu của brand.

Tiêu chí #82: đổi hero Gành Sớm sang kiểu của Bậc Trà dưới 3 lần bấm; đổi thứ tự, ẩn khối rồi hoàn tác về như cũ;
thoát ra tải lại nháp còn nguyên; dùng được ở 390px và 1440px.

Sau đó: sửa lỗi bấm nút "Thử chỉnh" không mở được editor; cho bảng chỉnh kéo được độ rộng.

## Phần tự quyết định

- Giao diện editor dùng chung một kiểu trung tính cho mọi brand (quyết định ghi ở #82).
- Phát hiện nút "Thử chỉnh" không mở được editor khi dùng thật.
- Yêu cầu bảng chỉnh kéo được độ rộng.
- Để tab AI sang PR riêng.
