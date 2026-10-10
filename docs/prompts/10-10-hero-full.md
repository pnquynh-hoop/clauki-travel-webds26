# 10/10 - Hero kiểu full cho Bậc Trà (issue #10)

- Người dùng AI: Như Quỳnh
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: commit 68c71bd, 8776434, 581a994 trên nhánh `feat/10-hero-full`

## Prompt (tóm tắt)

Bạn là kỹ sư frontend kiêm người thiết kế giao diện trong đội làm landing page white label. Hãy làm kiểu `full`
của `wl-hero` cho Bậc Trà theo màn mây trong bản phác 2:

1. làm trên nhánh mới cho issue #10;
2. làm dưới dạng một `variant` của `wl-hero`, không đụng phần tuỳ biến đã có (kiểu `coverflow`);
3. trước khi làm, liệt kê cụ thể những tệp sẽ thay đổi và thay đổi gì;
4. viết thẳng vào `wl-hero.js` và `hero.css` theo quy ước code hiện tại, không tự chế cách mới;
5. có chú thích đánh dấu phần của từng variant để phân biệt; chú thích ngắn, diễn đạt đơn giản để người không
   biết code đọc cũng hiểu đoạn đó làm gì và để làm gì; không ghi tên người trong code;
6. dùng lại các hàm dùng chung trong `dom.js`; hàm nào trùng với code hiện tại thì gom về một nơi trong `dom.js`;
7. đọc quy tắc trong `AGENTS.md` và điều chỉnh cho đúng;
8. chạy kiểm thử, sau đó commit và push nhánh.

Yêu cầu (theo `AGENTS.md`):

- chữ và ảnh lấy từ `content.json`, màu và font chỉ lấy từ biến CSS; thương hiệu khác dùng kiểu `full` vẫn đúng;
- thiếu trường tuỳ chọn thì bỏ phần đó, không lỗi;
- dùng được bằng bàn phím, tôn trọng giảm chuyển động;
- hàm ngắn, mỗi hàm một việc;
- chạy thử ở 1440px và 390px, console không lỗi; ghi trường riêng vào mục 12 của `AGENTS.md`.

## Phần tự quyết định

- Làm kiểu `full` dưới dạng variant của `wl-hero`, giữ nguyên phần `coverflow`.
- Viết thẳng vào tệp của component thay vì tách tệp riêng, theo quy ước một component gồm hai tệp.
- Yêu cầu chú thích đánh dấu phần kiểu `full`, không ghi tên người trong code; tự viết lại khung chú thích
  đánh dấu ở đầu phần kiểu `full`.
- Yêu cầu gom các hàm trùng (`clamp`, `smooth`, `textEl`) về `dom.js`.
- Hero theo màn mây của bản phác 2 đã duyệt trước đó.
