# 07/10 - Nạp thương hiệu qua wd2026.js và ?brand= (issue #2)

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: commit b605f20 (PR #17), fe234b1, 089d6f5, 41669cd, fd68682 (PR #18)

## Prompt (tóm tắt)

Bạn là kỹ sư frontend phụ trách lõi white label. BTC xác nhận `wd2026.js` dùng hay không là tuỳ đội; đội chọn
dùng nguyên tệp, không sửa. Hãy lập kế hoạch cho issue #2 theo từng bước nhỏ, mỗi bước một commit, rồi làm lần lượt:

1. nạp `wd2026.js` trước `js/app.js` trong `index.html`;
2. thêm tên hiển thị (`label`) cho từng thương hiệu trong `brands/brands.json`, kèm dữ liệu tạm để thử;
3. `core.js` đọc `brands.json`, báo lỗi ngay trên trang; mở bằng `file://` thì hiện hướng dẫn chạy qua máy chủ;
4. chọn thương hiệu theo `?brand=`, chỉ nhận id có trong danh sách, ghi lựa chọn trước khi gọi
   `WebDesign2026.init`; danh sách tệp lấy từ `brands.json`, không ghi cứng;
5. mỗi lần có sự kiện `webdesign2026:datachange`: đổi `theme.css`, điền tiêu đề, mô tả, favicon, cập nhật
   `?brand=` trên địa chỉ; export hàm `asset()` cho component;
6. cập nhật `AGENTS.md` mục 3 và `README.md` theo luồng mới.

Yêu cầu:

- ES module, không tạo biến toàn cục, chèn chữ bằng `textContent`; chú thích tiếng Việt giải thích vì sao;
- sau mỗi bước chạy thử bằng Chrome headless đủ các ca: chạy bình thường, mở bằng `file://`, thiếu hoặc sai
  `brands.json`, `?brand=` lạ, đổi bằng nút của BTC rồi tải lại trang;
- sau bước 4 rà lại cả tệp, bỏ dấu hiệu mã do AI viết: chú thích kể lại mã, kiểm tra thừa, tham số thừa;
- không chép mã của repo mẫu `konya007/demo-wd-26`;
- mỗi bước giải thích ngắn để người làm trình bày lại được khi vấn đáp.

## Kết quả và phần đội tự làm

- Đội chạy thử trên máy ở `localhost:5500` sau từng bước, tự commit và push.
- Đội yêu cầu rà "AI slop" sau bước 4: `core.js` giảm từ 85 xuống 61 dòng, chạy lại đủ các ca đều đúng.
- Đội so sánh với repo mẫu: chỉ trùng lời gọi `WebDesign2026.init`, là cách dùng BTC ghi trong `wd2026.js`.
- Ba commit fe234b1, 089d6f5, 41669cd thiếu `AI/` trong scope; ghi lại ở đây để đối chiếu.
