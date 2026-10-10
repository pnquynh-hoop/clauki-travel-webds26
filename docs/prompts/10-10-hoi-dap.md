# 10/10 - Khối hỏi đáp (#15), kiểu `split` cho Gành Sớm

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: commit 2ca961f, e04d044

## Prompt (tóm tắt)

Bạn là kỹ sư frontend. Hãy làm khối `faq` (#15) và kiểu `split` cho Gành Sớm, theo tiêu chí trong issue:

1. `wl-faq.js` và `faq.css`, đăng ký trong `app.js`, thêm `@import` vào `components.css`;
2. mỗi câu dùng `<details>` và `<summary>` để bàn phím và trình đọc màn hình chạy sẵn;
3. mở, đóng mượt, tắt hiệu ứng khi bật `prefers-reduced-motion`;
4. dữ liệu theo dạng `items` (`question`, `answer`) đội đã thống nhất trong `content.json`;
5. kiểu `split` cho Gành Sớm (tiêu đề trái, câu hỏi phải, mỗi câu một thẻ có nút tròn cộng trừ) và câu hỏi theo bản kế hoạch thương hiệu;
6. không có `variant` thì chỉ hiện dạng cơ bản, không áp giao diện Gành Sớm lên thương hiệu khác.

Yêu cầu: màu, font chỉ lấy từ biến CSS; kiểm ở 390px và 1440px.

## Phần tự quyết định

- Duyệt thứ tự việc trong ngày: làm #15 ngay sau #14.
- Chỉ làm kiểu của Gành Sớm, không áp giao diện lên thương hiệu khác.
