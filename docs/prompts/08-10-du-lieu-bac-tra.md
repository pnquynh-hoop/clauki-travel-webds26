# 08–09/10 - Dữ liệu, ảnh, logo và tài liệu của Bậc Trà (issue #3, #13)

- Người dùng AI: Như Quỳnh
- Công cụ: Claude Code (Claude Opus 5.5); logo và favicon tạo bằng Gemini
- Kết quả: commit 384e3a5 (logo, favicon), 5529ed3 (dữ liệu, ảnh, theme), 0419d04 (tài liệu kế hoạch) trên
  nhánh `feat/13-lich-trinh-road`

## Prompt (tóm tắt)

Bạn là kỹ sư frontend kiêm người soạn nội dung trong đội làm landing page white label. Hãy điền dữ liệu cho
thương hiệu Bậc Trà theo tài liệu kế hoạch và bản phác 2:

1. điền đầy đủ `brands/bac-tra/content.json`: `meta`, `brand`, `cta`, `nav`, thông tin liên hệ giả, và nội
   dung từng section theo sườn trang;
2. viết `theme.css` theo mục 7 của tài liệu kế hoạch;
3. tìm ảnh thật đúng địa danh, giấy phép dùng được (CC0, phạm vi công cộng, CC BY, CC BY-SA), nén dưới 300 KB,
   mỗi ảnh một dòng `credits`;
4. kiểm chứng độ cao từng trạm và ghi nguồn vào mục 4 của tài liệu kế hoạch; trạm chưa tra được thì để trống,
   không đoán;
5. cập nhật mục 6 và mục 8 của tài liệu kế hoạch theo bản phác 2.

Sau khi xem bản đầu, yêu cầu chỉnh thêm:

6. dữ liệu còn quá ít thông tin để hiển thị, chưa đủ theo issue: tra thêm độ cao cho đủ 7 trạm, tìm ảnh
   Mường Lò và Tú Lệ, thêm danh sách các ngày cho đồng hồ;
7. dùng hai ảnh tự tạo làm logo và favicon: bỏ nền giấy, cắt sát, xuất PNG, giữ lại ảnh gốc, đặt vào thư mục
   ảnh của Bậc Trà.

Yêu cầu:

- không gắn ảnh sai địa danh; ảnh không có logo hay biển hiệu thương hiệu thật;
- thông tin liên hệ đều giả;
- chữ trong `content.json` là chữ thường, không chứa HTML.

## Phần tự quyết định

- Chọn email liên hệ `clauki@bactra.example`.
- Yêu cầu không gắn ảnh sai địa danh.
- Tự tạo logo (tỉ lệ 16:9) và favicon (tỉ lệ 1:1) bằng Gemini, theo gợi ý tỉ lệ của AI.
- Chỉ ra dữ liệu còn quá ít so với issue và yêu cầu bổ sung.
- Đọc lại phần tài liệu kế hoạch được cập nhật (mục 4, 6, 8 và nguồn tham khảo) trước khi dùng.
