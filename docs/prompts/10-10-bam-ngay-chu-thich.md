# 09–10/10 - Bấm ngày để tới trạm và viết lại chú thích của lịch trình (issue #13)

- Người dùng AI: Như Quỳnh
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: commit f368ce8 trên nhánh `feat/13-lich-trinh-road`

## Prompt (tóm tắt)

Bạn là kỹ sư frontend trong đội làm landing page white label. Hãy đối chiếu khối lịch trình (`wl-journey`)
trong PR #39 với bản phác 2 của Bậc Trà và làm nốt phần còn thiếu:

1. so từng tính năng và từng trường dữ liệu của khối lịch trình giữa PR và bản phác, liệt kê chỗ khác nhau;
2. thêm phần bấm vào một ngày ở cột đồng hồ thì tới trạm đầu của ngày đó, như bản phác; không đưa dải mây trôi
   theo gió vào repo;
3. chạy thử với `brand-test`: thiếu khối lịch trình hoặc thiếu các trường của khối thì trang không được lỗi,
   không bị xô lệch giao diện, vì trang phải là white label;
4. viết lại toàn bộ chú thích trong `wl-journey.js` và `journey.css`: ngắn, diễn đạt đơn giản để người không
   biết code đọc cũng hiểu đoạn đó làm gì và để làm gì; thêm chú thích cho chỗ còn thiếu.

Yêu cầu (theo `AGENTS.md`):

- dùng được bằng bàn phím, tôn trọng giảm chuyển động;
- chạy thử ở 1440px và 390px, console không lỗi;
- ghi thay đổi của trường `days` vào mục 12 của `AGENTS.md`.

## Phần tự quyết định

- Yêu cầu đối chiếu PR với bản phác trước khi merge.
- Chọn thêm phần bấm ngày, không duyệt dải mây trôi theo gió.
- Yêu cầu kiểm thử trên `brand-test` theo tính chất white label: bỏ khối, thiếu trường thì trang vẫn đúng.
- Yêu cầu viết lại chú thích để người không biết code cũng hiểu.
