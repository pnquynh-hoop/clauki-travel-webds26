# 08/10 - Mỗi thương hiệu một sườn trang riêng

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: commit 396d72d; cập nhật issue #3, #7

## Prompt (tóm tắt)

Bạn là trưởng nhóm kỹ thuật của dự án. Trang demo của BTC đổi thương hiệu thì chỉ đổi chữ, ảnh, màu; sườn trang
giữ nguyên. Đội muốn ba thương hiệu khác nhau cả về sườn trang. Hãy:

1. đánh giá kiến trúc hiện tại (danh sách section nằm trong `content.json` của từng thương hiệu) có làm được
   không, và căn cứ trong Biên bản Khai mạc;
2. đặt quy tắc: component vẫn dùng chung được, nhưng mỗi thương hiệu có những section riêng để thấy rõ khác biệt;
   component đặt tên theo chức năng, chạy đúng với mọi thương hiệu;
3. cập nhật `AGENTS.md` (mục 4, 5, 11, 12) và các issue liên quan (#3 chốt thương hiệu, #7 header và footer).

## Kết quả và phần đội tự làm

- Đội đưa ra hướng "mỗi thương hiệu có component riêng nhưng component vẫn dùng chung được".
- Đội chỉ ra 5 section đã có issue không đủ chia mỗi thương hiệu 2 section riêng; chốt lại cách tính:
  1 section cũ chia riêng cộng 1 section đặc trưng mới.
- Đội phân biệt section và component, yêu cầu sửa câu chữ trong issue cho đúng.
