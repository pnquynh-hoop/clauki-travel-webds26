# 11/10 - Chạy prompt tạo thương hiệu mới cho brand-test: "Lượn Vịnh"

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Prompt: [tao-thuong-hieu-moi.md](tao-thuong-hieu-moi.md), chạy nguyên văn, chỉ điền hai chỗ trong ngoặc vuông
- Tệp: `brands/brand-test/content.json`, `brands/brand-test/theme.css`, 9 ảnh trong `brands/brand-test/images/`
  (viết đè bộ dữ liệu thử "Lối Mây"; bản cũ còn trong lịch sử Git)

## Giá trị đã điền vào prompt

- Thương hiệu mới: du lịch hàng không. Tour bay thuỷ phi cơ 25 phút từ Tuần Châu (Hạ Long) sang vịnh Lan Hạ,
  hạ cánh trước nhà bè, ngủ một đêm, sáng chèo kayak rồi theo tàu về. Khách là cặp đôi, gia đình muốn thấy vịnh
  từ trên cao; giá theo khách, gồm chuyến bay và một đêm.
- id thư mục: `brand-test` (giữ id để không phải sửa `brands/brands.json`)

## AI viết

- Tên "Lượn Vịnh", khẩu hiệu, mọi câu chữ trên trang, bảng màu và font trong `theme.css`.
- Sáu khối: hero, intro `center`, gallery `slices`, reviews `postcard`, faq (danh sách), booking `request`;
  header `solid`, footer `columns`. Lý do chọn:
  - hero: hứa hẹn "ngắm vịnh từ trên mây", nút giữ ghế;
  - intro `center`: một câu nói rõ chuyến đi gồm gì (bay, ngủ bè, kayak, tàu về);
  - gallery `slices`: cho thấy vịnh từ hai phía, buồng lái và mặt nước;
  - reviews: lời kể nhắc chi tiết cụ thể (nghiêng cánh qua làng chài, ghế đầu, chuyến dời vì gió);
  - faq kiểu danh sách: tour có quy định (thời tiết, hành lý, trẻ em), giọng gọn hơn kiểu chat;
  - booking `request`: giá theo khách, một giá trọn gói, `maxNights` 1;
  - header `solid`: ảnh hero sáng (trời xanh, nước xanh) nên không đè chữ trắng lên ảnh.
- Danh sách ảnh cần tìm (mỗi ảnh một cảnh).

## Người kiểm tra lại và sửa

- Tên "Lượn Vịnh": tra Google, không có thương hiệu hay sản phẩm có thật trùng tên.
- Tìm 9 ảnh thật trên Wikimedia Commons (CC0, CC BY, CC BY-SA), ghi đủ `credits`; loại hai ảnh có biển hiệu, màu sơn
  của hãng thuỷ phi cơ có thật ở Hạ Long. Hai ảnh máy bay chụp ở Canada, Mỹ: ghi rõ nơi chụp trong `credits`, `alt`
  chỉ tả cảnh, không nói là Hạ Long.
- Màu nhấn ban đầu (`#a14a1c`) gần trùng màu nhấn của Gành Sớm: đổi sang xanh ngọc `#0d6b5e`; tính lại tương phản
  bằng công thức WCAG (ghi trong chú thích `theme.css`).
- Font tiêu đề phải có kiểu nghiêng thật vì lời kể ở reviews và lời hẹn ở footer in nghiêng: chọn Archivo.
- Hero `stacked` cắt lấy phần dưới ảnh nên mất máy bay; chỉ sửa JSON (không sửa ảnh, không sửa CSS): đổi sang
  `coverflow` ba ảnh, rút tiêu đề còn "Ngắm vịnh từ trên mây", đưa ảnh núi đá lên thẻ đầu để tiêu đề không đè máy bay.
- Mở `index.html?brand=brand-test` ở 390px và 1440px: đủ 6 khối, không lỗi console, không ảnh hỏng, không tràn ngang;
  mọi `href` trong `nav` và `cta.href` trỏ đúng `id`.
