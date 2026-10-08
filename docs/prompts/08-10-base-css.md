# 08/10 - base.css: biến mặc định, chữ, bố cục, responsive (issue #4)

- Người dùng AI: Mị Nương
- Công cụ: Claude Code (Claude Opus 5.5), hai phiên: một phiên viết mã, một phiên kiểm tra và sửa
- Kết quả: commit 2e94722, 4e1ef31 (commit a44714d tự viết, không dùng AI)

## Prompt (tóm tắt)

Phiên viết mã:

Bạn là kỹ sư frontend phụ trách nền giao diện. Viết tiếp `css/base.css` cho issue #4, bên dưới khối `:root`
đã có, theo từng phần:

1. reset: `box-sizing`, bỏ margin mặc định, ảnh không tràn khung, ô nhập và nút kế thừa font;
   `body` lấy nền, chữ, font từ biến;
2. kiểu chữ: tiêu đề dùng `--font-heading`, cỡ chữ lớn dùng `clamp()`; màu liên kết lấy từ biến;
3. bố cục chung: khung nội dung, khoảng cách giữa các section, lưới;
4. nút kêu gọi hành động dùng chung, có hover và viền focus khi dùng bàn phím;
5. tắt chuyển động khi bật `prefers-reduced-motion`.

Yêu cầu: chỉ dùng biến CSS, không ghi cứng mã màu, không `!important`, đơn vị `rem`, viết cho điện thoại trước
với điểm ngắt `760px` và `1024px`; chú thích tiếng Việt giải thích vì sao.

Phiên kiểm tra:

Đọc toàn bộ repo và issue #4, nắm luật thi và quy tắc trong AGENTS.md; sau mỗi đoạn trong base.css thì kiểm tra
theo yêu cầu của issue và luật dự án; cuối cùng kiểm lại cả issue và sửa các lỗi tìm được.

## Kết quả và phần tự làm

- Tự viết khối `:root` với 10 biến mặc định và chú thích (commit a44714d); AI tính tương phản các cặp màu,
  đều đạt AA.
- Phiên kiểm tra tìm ra 3 biến dùng mà chưa khai báo (`--container`, `--space-section`, `--duration`), làm khung,
  khoảng cách section và transition không chạy; liên kết có class bị màu mặc định của trình duyệt. AI sửa các lỗi
  này, bỏ ký hiệu trang trí trong chú thích, viết lại chú thích `clamp()` theo hướng vì sao.
- AI chạy thử bằng Chrome headless ở 500px, 800px, 1440px: khung, khoảng cách section, số cột lưới đúng;
  nút và liên kết đổi theo `--color-primary`; transition về 0 khi bật giảm chuyển động.
- Commit reset lúc đầu thiếu `AI/` trong scope, đã sửa lại trước khi push.
