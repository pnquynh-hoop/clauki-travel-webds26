# 14/10 - Brand SighGone: khung brand, hỏi đáp, cẩm nang, chi tiết tour (issue #105, #114, #112)

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #119

## Prompt (tóm tắt)

Đưa SighGone (công ty tour trong ngày quanh Sài Gòn, nhiều phương tiện) từ bản mẫu vào repo, thêm thành brand thứ tư,
không thay brand nào:

1. #105: thư mục brand (màu, font Bricolage Grotesque, Bungee, Be Vietnam Pro theo bản mẫu, logo, favicon), ảnh có giấy phép
   chuyển sang WebP, danh mục 7 tour; hero kiểu `haze` (ảnh phủ sương, rê chuột thì tan), footer có dây điện và biển số nhà,
   nút và thẻ kiểu bảng hiệu;
2. #114: trang hỏi đáp kiểu chat có chia nhóm câu hỏi, bảng chính sách huỷ; trang cẩm nang có đồng hồ 24 giờ "giờ nào ăn gì,
   đi đâu" (bấm hoặc kéo để đổi giờ, mặc định giờ thật ở Sài Gòn) và vài thẻ mẹo, mỗi phần có link sang tour;
3. #112: trang chi tiết tour dùng khối `room-detail` có sẵn, đọc dữ liệu từ danh mục; 7 tour nhưng chỉ làm vài trang.

Yêu cầu: mọi kiểu mới chạy được với dữ liệu của brand khác; đúng ở 390px và 1440px; giảm chuyển động thì tắt hiệu ứng;
ảnh không có biển hiệu thật.

Sau đó: "check lại có lỗi không", rồi soát code sạch và dấu hiệu AI slop trước khi mở PR.

## Phần tự quyết định

- Thêm SighGone thành brand thứ tư, giữ ba brand cũ cho phần đổi cấu hình.
- Chỉ làm 3 trang chi tiết tour (Cần Giờ, Lên đèn, Chợ Lớn); tour chưa có trang thì bỏ liên kết.
- Để landing page `dem-nay` (#113) lại sau.
- Yêu cầu hai lượt soát (lỗi, a11y, code thừa, chữ sáo) rồi mới tách PR.
