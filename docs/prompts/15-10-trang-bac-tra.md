# 14-15/10 - Website nhiều trang của Bậc Trà, component liên hệ kiểu giấy note

- Người dùng AI: Như Quỳnh
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #122 trên nhánh `feat/bac-tra-pages`

## Prompt (tóm tắt)

Bạn là kỹ sư frontend kiêm người thiết kế giao diện trong đội làm website white label nhiều trang. Hãy chuyển Bậc Trà
từ một landing page thành website nhiều trang theo sơ đồ ở issue #89, dùng `pages[]` của `content.json` và các component có sẵn:

1. trang chủ, landing tour mới 2027, ba trang tour theo mùa, trang chuẩn bị, về chúng tôi, liên hệ, 404;
   menu và nút giữ chỗ dùng link `page:`;
2. chuyển khối hỏi đáp của landing vào trang chuẩn bị, gộp với câu hỏi sẵn có của trang đó;
3. bỏ khối hỏi đáp ở trang liên hệ, thêm khối liên hệ kiểu giấy note như bản mẫu thiết kế ban đầu
   (thẻ liên hệ nghiêng, biển đang mở theo giờ thật, ô nhắn nhanh); chưa có component thì tạo mới, có rồi thì thêm variant;
   trang liên hệ chỉ dùng để liên hệ với doanh nghiệp;
4. trang chủ đổi sang hero kiểu `coverflow`, trang chuẩn bị đổi sang hero kiểu `stacked` có hiệu ứng `reveal`;
5. sửa nút giữ chỗ thừa ở trang chuẩn bị; rebase lên `main` mới nhất rồi mở PR.

Yêu cầu:

- component không ghi cứng chữ, màu, đường dẫn ảnh; thêm vào thương hiệu khác vẫn hiện đúng theo màu, font của thương hiệu đó;
- dùng được bằng bàn phím, tôn trọng giảm chuyển động;
- kiểm ở bề ngang 390px và 1440px;
- không có tên thương hiệu hay tên người trong mã.

## Phần tự quyết định

- Chọn trang chuẩn bị làm nơi đặt khối hỏi đáp.
- Chọn kiểu giấy note của bản mẫu thiết kế ban đầu cho trang liên hệ.
- Chọn hero `coverflow` cho trang chủ, hero `stacked` có `reveal` cho trang chuẩn bị.
- Sửa nội dung trang liên hệ thành liên hệ với doanh nghiệp, không phải với trưởng đoàn.
- Gộp component, CSS và dữ liệu trong một PR.
