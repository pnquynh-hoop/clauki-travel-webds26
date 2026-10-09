# 09/10 - Khối đặt chỗ (#14), kiểu `stay` cho Gành Sớm

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: commit 5c4120d

## Prompt (tóm tắt)

Bạn là kỹ sư frontend. Hãy làm khối `booking` (#14) với kiểu `stay` cho Gành Sớm, theo tiêu chí trong issue:

1. `wl-booking.js` và `booking.css`, đăng ký trong `app.js`, thêm `@import` vào `components.css`;
2. form: ngày nhận và trả phòng (ô date của trình duyệt), hạng nhà, số khách (không vượt sức chứa của hạng), họ tên,
   số điện thoại (kiểm tra định dạng số Việt Nam);
3. tạm tính cập nhật ngay: tiền phòng theo số đêm, tiền thêm khách từ khách thứ 3, ưu đãi đặt sớm hè 2027
   (ở từ 4 đêm tặng 1 đêm); số căn còn theo lịch mẫu, hết phòng thì khoá nút;
4. báo lỗi ngay dưới ô sai, không dùng `alert()`;
5. không có máy chủ, nên bấm đặt thì hiện tin nhắn soạn sẵn, kèm nút gửi SMS, gọi hotline, chép nội dung;
   không báo "đặt thành công";
6. mọi câu chữ, câu báo lỗi, mẫu tin nhắn nằm trong `content.json`.

Yêu cầu:

- rẽ nhánh JS theo `variant`, chừa chỗ cho kiểu `calendar` (Bậc Trà) và `request` (Mé Rạch);
- màu, font chỉ lấy từ biến CSS; dùng được bằng bàn phím; kiểm ở 1440px, 390px và 360px.

## Phần tự quyết định

- Chọn làm #14 trước các khối khác vì mọi nút "Đặt phòng ngay" đều dẫn tới khối này.
- Duyệt nội dung đặt phòng của Gành Sớm theo bản kế hoạch thương hiệu (giá, ưu đãi, lịch còn phòng mẫu).
