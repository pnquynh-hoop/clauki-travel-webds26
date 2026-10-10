# 10/10 - Khối hỏi đáp (#15)

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: commit 2ca961f

## Prompt (tóm tắt)

Bạn là kỹ sư frontend. Hãy làm khối `faq` (#15) theo tiêu chí trong issue:

1. `wl-faq.js` và `faq.css`, đăng ký trong `app.js`, thêm `@import` vào `components.css`;
2. mỗi câu dùng `<details>` và `<summary>` để bàn phím và trình đọc màn hình chạy sẵn;
3. mở, đóng mượt, tắt hiệu ứng khi bật `prefers-reduced-motion`;
4. đọc đúng dạng dữ liệu `items` (`question`, `answer`) đã có trong `content.json` của Bậc Trà, Mé Rạch;
5. thêm câu hỏi cho Gành Sớm theo bản kế hoạch thương hiệu.

Yêu cầu: màu, font chỉ lấy từ biến CSS; chạy đúng với cả ba thương hiệu; kiểm ở 390px và 1440px.

## Phần tự quyết định

- Giữ kiểu mặc định cho cả ba thương hiệu vì còn ít thời gian trước hạn nộp.
