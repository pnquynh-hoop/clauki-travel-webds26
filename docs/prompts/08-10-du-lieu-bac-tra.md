# 08–09/10 - Dữ liệu, ảnh, logo và tài liệu của Bậc Trà (issue #3, #13)

- Người dùng AI: Như Quỳnh
- Công cụ: Claude Code (Claude Opus 5.5); logo và favicon tạo bằng Gemini
- Kết quả: commit 384e3a5 (logo, favicon), 5529ed3 (dữ liệu, ảnh, theme), 0419d04 (tài liệu kế hoạch) trên
  nhánh `feat/13-lich-trinh-road`

## Prompt (tóm tắt)

Điền đầy đủ `brands/bac-tra/content.json` theo tài liệu kế hoạch và bản phác 2: `meta`, `brand`, `cta`,
`nav`, thông tin liên hệ giả, và nội dung từng section theo sườn trang. Viết `theme.css` theo mục 7.
Tìm ảnh thật đúng địa danh, giấy phép dùng được (CC0, phạm vi công cộng, CC BY, CC BY-SA), nén dưới 300 KB,
mỗi ảnh một dòng `credits`. Kiểm chứng độ cao từng trạm và ghi nguồn; trạm chưa tra được thì để trống,
không đoán. Cập nhật mục 6 và mục 8 của tài liệu kế hoạch theo bản phác 2.

Các lần yêu cầu chỉnh sau đó:

- "Dữ liệu của Bậc Trà còn quá ít thông tin để hiển thị, không đủ theo issue": tra thêm độ cao cho đủ 7
  trạm, tìm ảnh Mường Lò và Tú Lệ, thêm danh sách các ngày cho đồng hồ.
- "Dùng ảnh này làm logo, ảnh này làm favicon, chuyển vào thư mục ảnh của Bậc Trà".

## Kết quả và phần tự làm

- Tự chọn email liên hệ `clauki@bactra.example`; yêu cầu không gắn ảnh sai địa danh.
- Tự tạo logo (tỉ lệ 16:9) và favicon (tỉ lệ 1:1) bằng Gemini, theo gợi ý tỉ lệ của AI. AI bỏ nền giấy, làm
  trong suốt lòng các chữ, giữ nguyên phần trong vòng tròn, cắt sát rồi xuất PNG; hai ảnh gốc giữ lại với tên
  `logo-goc.jpg`, `favicon-goc.jpg`.
- AI tìm ảnh trên Wikimedia Commons, kiểm giấy phép trên trang ảnh, nén lại và ghi `credits`.
- AI tra độ cao trên báo (Tạp chí Công Thương, VnExpress, mia.vn) và Wikipedia; Tú Lệ và La Pán Tẩn không có
  bài viết nêu số khớp nhau nên lấy theo dữ liệu địa hình Open-Meteo. Bảng độ cao và nguồn ghi ở mục 4 của
  `docs/ke-hoach-thuong-hieu-bac-tra.md`.
- AI cập nhật mục 4, 6, 8 và nguồn tham khảo của tài liệu kế hoạch; mình đọc lại trước khi dùng.
