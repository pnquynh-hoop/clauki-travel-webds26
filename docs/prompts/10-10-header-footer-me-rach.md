# 10/10 - Header `center`, footer `directions` của Mé Rạch và sửa lỗi header giật

- Người dùng AI: Mị Nương
- Công cụ: Claude Code (Claude Opus 5.5)
- Tệp: khối `.header--center` và phần sửa lỗi trong `css/components/header.css`, chú thích trong
  `js/components/wl-header.js`; hàm `directionsEl` trong `js/components/wl-footer.js`; phần đường tới chỗ ở và
  khối `.footer--directions` trong `css/components/footer.css`; `header`, `footer` trong
  `brands/me-rach/content.json`; dòng `header`, `footer` trong AGENTS.md mục 12

## Lần 1: header và footer riêng cho Mé Rạch

Prompt (tóm tắt):

Mé Rạch đang dùng header `solid` và footer `card` trùng Gành Sớm, trái AGENTS.md mục 5. Đọc mã header,
footer của Huy, đề xuất kiểu `center` và `directions` trước khi làm. Hỏi thêm: header các thương hiệu có cùng
HTML không, variant có phải chỉ đổi bố cục bằng CSS không.

Kết quả:

- header `center`: lưới ba cột `1fr auto 1fr` để tên thương hiệu luôn nằm giữa; điện thoại nút Menu bên trái,
  nút CTA bên phải; màn rộng menu căn giữa ở hàng dưới. Chỉ thêm CSS;
- footer: hàm `directionsEl` dựng các chặng đường tới chỗ ở từ `footer.directions` (chạy theo dữ liệu,
  mọi kiểu footer đều dùng được), chấm và đường nét đứt lấy theo màu chữ; kiểu `directions` nền màu chủ đạo,
  chữ phụ pha 80% để vẫn đạt AA (4,62), nút CTA đảo màu.

## Lần 2: đầu trang giật liên tục

Prompt (tóm tắt):

Đầu trang giật giật liên tục, kiểm xem bị gì, sửa dứt điểm và tận gốc, không tạm bợ.

Kết quả:

- đo bằng cách lăn chuột thật qua giao thức DevTools của Chrome: vị trí cuộn cứ `15 → 0 → 15 → 0`;
- nguyên nhân: cuộn khỏi đầu trang thì lớp `is-scrolled` thu dải thông tin bằng `max-height`, header thấp đi,
  nội dung xô lên, trình duyệt tự kéo vị trí cuộn ngược lại (scroll anchoring), vị trí cuộn về gần 0 thì dải
  hiện lại, cứ thế lặp;
- sửa: bỏ việc thu dải; header có dải thông tin thì ghim ở vị trí âm đúng bằng chiều cao dải, cuộn xuống thì dải
  tự trượt khuất, thanh chính dính lại; dải cao cố định, chữ một dòng. Chiều cao header không còn đổi theo cuộn;
- đo lại trên cả ba thương hiệu, 1440px và 390px: vị trí cuộn tăng đều, chiều cao header không đổi.

## Phần tự làm và tự kiểm tra

- Duyệt bố cục header, footer trước khi làm; phát hiện lỗi giật khi xem trang và yêu cầu sửa tận gốc.
- Xem trên máy cả cuộn xuống và cuộn ngược lên.
- Báo Huy về phần thêm vào `header.css`, `footer.css`, `wl-footer.js` và lần sửa lỗi ở phần chung của header.
