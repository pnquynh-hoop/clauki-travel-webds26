# 15/10 - Footer headline trên điện thoại

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #164

## Prompt (tóm tắt)

Hỏi footer kiểu `headline` đã responsive trên điện thoại chưa; đo thì không tràn ngang nhưng xếp một cột dài khoảng 1330px. Yêu cầu responsive lại cho hợp lý hơn.

## Phần tự quyết định

- Chỉ sửa CSS trong khối `@media (max-width: 759px)`: hai cột menu cạnh nhau, các cột sau chiếm cả hàng, khoảng cách dọc nhỏ lại. Không đổi dữ liệu hay mã JS, không đụng cách dàn từ 760px trở lên.
- Liên kết vẫn đủ cao để bấm (khoảng 36px mỗi dòng), không thu nhỏ quá.
