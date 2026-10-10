# 10/10 - Khối thư viện ảnh (#12), kiểu `slices` cho Gành Sớm

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: commit b0b8e45

## Prompt (tóm tắt)

Bạn là kỹ sư frontend kiêm người thiết kế giao diện. Hãy làm khối `gallery` (#12) cho Gành Sớm:

1. làm nhiều mẫu thư viện ảnh khác hẳn nhau để chọn, dùng ảnh thật có giấy phép;
   tiêu đề không được làm khách hiểu ảnh chụp tại Gành Sớm, chú thích tả đúng nội dung ảnh, chỉ ghi địa danh khi ảnh đúng ở đó;
2. đưa mẫu được chọn vào repo thành kiểu `slices`: các ảnh là dải hẹp đứng cạnh nhau như tấm bình phong;
   rê chuột, bấm, Tab hoặc phím mũi tên tới dải nào thì dải đó xoè rộng, hiện số thứ tự, chú thích, tên tác giả;
   điện thoại thì các dải nằm ngang xếp dọc;
3. không có `variant` thì hiện lưới ảnh cơ bản; đọc dạng dữ liệu `images` (`src`, `alt`, `caption`) đội đã dùng.

Yêu cầu: màu, font chỉ lấy từ biến CSS; tôn trọng giảm chuyển động; ảnh mới có dòng trong `credits`; kiểm ở 360px, 390px, 1440px.

## Phần tự quyết định

- Chọn mẫu "Cột ảnh xoè" trong năm mẫu; yêu cầu thêm ba biến thể sáng tạo hơn, xem xong quyết định giữ bản ban đầu.
