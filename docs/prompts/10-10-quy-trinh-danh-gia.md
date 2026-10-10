# 10/10 - Khối quy trình (issue #24), khối đánh giá và khối đặt chỗ kiểu calendar cho Bậc Trà

- Người dùng AI: Như Quỳnh
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: commit 47a35cf, 5e76fe3, d32e200, b59e7b2, 73b2e15, 7fd9165 trên nhánh `feat/24-quy-trinh-morph`

## Prompt (tóm tắt)

Bạn là kỹ sư frontend kiêm người thiết kế giao diện trong đội làm landing page white label. Hãy làm khối quy trình
từng bước kiểu `morph` theo issue #24 và khối đánh giá của khách, giống bản phác 2 của Bậc Trà:

1. tạo nhánh cho issue #24;
2. khối quy trình: chiếc lá đổi dáng và màu qua năm bước làm chè khi cuộn, bước đang tới sáng lên kèm ảnh thật,
   bước sao có chảo và hơi nóng, cuối cùng lá rơi vào chén, nước trà dâng lên; dáng, màu, lớp phụ khai báo trong dữ
   liệu để thương hiệu khác dùng lại được;
3. khối đánh giá: mỗi đánh giá là một tấm bưu thiếp có tem độ cao và tên chặng, dấu bưu điện ghi ngày đi, rơi xuống
   khi cuộn tới; áp dụng y như bản phác;
4. khối đặt chỗ kiểu `calendar` cho Bậc Trà trong `wl-booking`, giống bản phác: thẻ ngày khởi hành như tờ lịch, danh sách
   đã gồm và chưa gồm, điều khoản cọc, đổi huỷ; form giữ chỗ có tạm tính và tiền cọc; gửi thì in phiếu giữ chỗ có dấu
   "chờ xác nhận"; căn lề như bản phác; thêm mục đặt lịch lên menu;
5. bỏ khối thư viện ảnh và lịch mùa khỏi Bậc Trà; đảm bảo mọi thay đổi chạy đúng khi thương hiệu khác dùng;
6. chú thích ngắn, diễn đạt đơn giản; không ghi tên người trong code;
7. đọc quy tắc trong `AGENTS.md` và điều chỉnh cho đúng; chạy kiểm thử theo tiêu chí chấp nhận của issue.

Yêu cầu (theo `AGENTS.md` và issue #24):

- chữ và ảnh lấy từ `content.json`, màu và font chỉ lấy từ biến CSS; thêm khối vào thương hiệu khác với 3 bước và
  hình khác thì hiện đúng, theo màu và font của thương hiệu đó;
- thiếu trường tuỳ chọn thì bỏ phần đó, không lỗi;
- bật giảm chuyển động thì mọi bước hiện cùng lúc, không ghim;
- đổi thương hiệu bằng nút của BTC không nhân đôi khối, console không lỗi; hiển thị đúng ở 390px và 1440px;
- ghi trường riêng vào mục 12 của `AGENTS.md`.

## Phần tự quyết định

- Làm khối quy trình theo khối lá của bản phác 2 đã duyệt, khối đánh giá theo khối bưu thiếp của bản phác.
- Yêu cầu khối đánh giá giống y bản phác; thêm mục "Đánh giá" vào menu như bản phác.
- Bỏ khối thư viện ảnh và lịch mùa khỏi sườn trang Bậc Trà; thử khối chỗ ngủ bằng `wl-stays` sẵn có rồi bỏ.
- Giữ và làm khối đặt chỗ kiểu `calendar` theo bản phác, yêu cầu căn lề giống y bản phác; thêm mục "Đặt lịch" lên menu.
