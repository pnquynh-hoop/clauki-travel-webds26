# 10/10 - Khối hỏi đáp (#15), kiểu `chat` cho Gành Sớm

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: commit 2ca961f, e04d044, 6254d80, 17f7590

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

## Làm lại kiểu của Gành Sớm (tóm tắt prompt)

Danh sách mở đóng nhìn đơn điệu. Hãy làm nhiều mẫu khối hỏi đáp khác hẳn nhau để chọn, rồi đưa mẫu được chọn vào repo
thành kiểu `chat`:

- khung nhắn tin với chủ nhà: đầu khung có ảnh bình minh, tên và khẩu hiệu lấy từ `brand`, nút bắt đầu lại;
- câu hỏi là nút gợi ý; bấm thì hiện thành tin của khách, chủ nhà "đang nhập" rồi trả lời; hỏi hết thì mời gọi hotline;
- khung tin nhắn là `role="log"`, `aria-live="polite"`; con trỏ bàn phím nhảy sang câu gợi ý kế bên;
- bên cạnh là thẻ ảnh mời gọi hotline; mọi câu chữ lấy từ `content.json`; điện thoại không tràn ngang.

## Phần tự quyết định (làm lại)

- Thấy kiểu danh sách đơn điệu, yêu cầu làm nhiều mẫu; chọn mẫu "Nhắn tin với Gành Sớm".

## Sửa lỗi cuộn ngang (tóm tắt prompt)

Ở màn rộng 1024px trang Gành Sớm cuộn ngang khoảng 18px. Tìm phần tử gây tràn rồi sửa, không đổi giao diện ở màn rộng.
Kết quả: tấm nền nghiêng sau khung nhắn tin thò ra ngoài lề phải khi lề trang chỉ còn 1rem; cắt phần thừa theo chiều ngang.

## Phần tự quyết định (sửa lỗi)

- Đồng ý sửa lỗi cuộn ngang ở màn 1024px.
