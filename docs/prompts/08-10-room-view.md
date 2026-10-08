# 08/10 - Khối nhìn từ ban công (#31) cho Gành Sớm

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: commit 40204d6

## Prompt (tóm tắt)

Bạn là kỹ sư frontend. Hãy làm khối `room-view` (#31) cho Gành Sớm theo tiêu chí trong issue:

1. tìm ba ảnh thật, sắc nét, có giấy phép dùng được cho cảnh nhìn ra từ villa sát biển, nhà đồi, phòng vườn;
   kiểm tra giấy phép trên trang gốc, cắt tránh chữ ký, ghi `credits`;
2. `wl-room-view`: các hạng phòng thành dải thẻ ảnh đứng xếp nghiêng 3D (lấy cảm hứng bố cục từ mẫu trang du lịch
   đội đưa ra, không chép), thẻ giữa là hạng đang chọn với tên in hoa cỡ lớn, nền khối là ảnh đó làm mờ;
   chọn bằng hàng nút tên hạng phòng, bấm thẻ bên hoặc vuốt; nút CTA từ `site.cta`;
3. dùng được bằng bàn phím theo mẫu tabs của WAI-ARIA (mũi tên, Home, End); thẻ xoè ra khi cuộn tới, tắt khi bật
   giảm chuyển động;
4. chạy thử ở 1440px và 390px.

Yêu cầu: màu, font, bo góc lấy từ biến CSS; chữ và ảnh lấy từ `content.json`; tên khối theo chức năng để thương hiệu
khác dùng lại được.

## Phần tự quyết định

- Duyệt và yêu cầu làm lại: bản đầu chưa có gì sáng tạo, bản cửa chớp trông quê.
- Đưa ba mẫu tham khảo, chọn hướng thẻ xếp nghiêng 3D.
