# 10/10 - Khối giữ chỗ kiểu `request` cho Mé Rạch, trên nền `wl-booking` của Huy

- Người dùng AI: Mị Nương
- Công cụ: Claude Code (Claude Opus 5.5)
- Tệp: các hàm `counterEl`, `placeEl`, `requestEl`, `quoteRequest`, `updateRequest`, `submitRequest` và nhánh rẽ
  trong `render()` của `js/components/wl-booking.js`; vài quy tắc `.booking--request` trong `css/components/booking.css`;
  khối `booking` trong `brands/me-rach/content.json`; dòng `booking` trong AGENTS.md mục 12

## Bối cảnh

Trên nhánh riêng đã làm một bản `wl-booking` khác cho Mé Rạch, nhưng trong lúc đó Huy làm `wl-booking` kiểu `stay`
cho Gành Sớm và merge trước, hai bản trùng tên tệp và trùng class. Bỏ bản của mình, giữ bản của Huy làm tệp chính.

## Prompt (tóm tắt)

1. Kiểu `request` khác gì kiểu `stay` hiện tại, thêm cái gì.
2. Làm kiểu `request` trên nền mã của Huy, CSS gọn đẹp như của Huy.

## Kết quả

- dùng lại hàm và class sẵn có của Huy (`fieldEl`, `inputEl`, `showError`, khung tin nhắn `messageEl`, thẻ ảnh trái,
  bảng nhập phải, hộp tạm tính), chỉ thêm phần riêng: ảnh nhà cố định, ngày đến và ngày về (1 tới 2 đêm),
  người lớn và trẻ em có nút bớt, thêm (tổng không quá 10 khách), tính tiền theo đầu người, trẻ em miễn phí,
  dòng ưu đãi mùa trái chín; ngày mẫu để vừa mở đã thấy tạm tính;
- dữ liệu Mé Rạch đặt tên theo kiểu của Huy (`labels`, `errors`, `message`); phần `stay` của Huy không đổi.

## Phần tự làm và tự kiểm tra

- Quyết định bỏ bản booking riêng, dùng bản của Huy; thử bật kiểu `stay` cho Mé Rạch để so rồi chọn `request`.
- Chạy thử bằng thao tác thật ở 1440px và 390px: báo lỗi, tạm tính, ưu đãi, chọn quá 2 đêm, tin nhắn soạn ra;
  Gành Sớm vẫn chạy kiểu `stay`; báo Huy về phần thêm vào tệp của Huy.
