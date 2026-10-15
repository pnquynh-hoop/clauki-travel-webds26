# 15/10 - Ghép khối từ nhiều khung cho website AI tạo ở /tao

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Sonnet 5.5)
- Kết quả: PR #174

## Prompt (tóm tắt)

Ba site tạo gần đây đều ra khung Bậc Trà. Hãy cho AI trộn: thay vì chọn một khung rồi chép nguyên, AI chọn từng khối chung
của trang chủ (hero, intro, gallery, reviews, faq, host, tips, policy) từ bất kỳ khung nào, còn khối gắn với dữ liệu của khung
(đặt chỗ, danh sách tour, lịch trình) giữ nguyên. Yêu cầu: một lời gọi AI cho hồ sơ vẫn đủ (thêm `trangChu` và `dauTrang`),
khối đặc trưng vẫn theo luật ở `rules.js`, ảnh và credits của khung khác đi theo khối, không để lại liên kết chết, và có
cách lùi về trang chủ của khung nếu AI trả danh sách không dùng được.

## Kết quả AI trả về

`js/create/mix.js` (`MENU`, `loadFrames`, `composeHome`), phần lời nhắc hồ sơ và `applyMixed` trong `js/create/generate.js`, điều
kiện lọc ảnh theo địa danh nới ra trong `photos.js`. Đã chạy thử 16 tổ hợp (4 khung nền nhân 4 kiểu hero) với đủ khối ghép,
không lỗi JavaScript, rồi tạo thử site Nhật Bản và homestay Đường Lâm.
