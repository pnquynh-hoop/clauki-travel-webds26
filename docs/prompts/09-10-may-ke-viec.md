# 08–09/10 - Mây kể việc ở từng trạm và ô chuyến gần nhất (issue #13)

- Người dùng AI: Như Quỳnh
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: commit 3cf7b42, 7548cb5, 31683b0 trên nhánh `feat/13-lich-trinh-road`

## Prompt (tóm tắt)

Bạn là kỹ sư frontend kiêm người thiết kế giao diện. Lịch trình kiểu `road` của Bậc Trà (#13) mới cho biết xe
đi qua những nơi nào; người xem chưa biết ở mỗi nơi sẽ làm gì và chưa thấy ảnh hoạt động nào. Hãy bổ sung phần
này, thử trên bản phác 2 trước, duyệt xong mới đưa vào `wl-journey`:

1. kiểm tra trang đã dùng đủ các kiểu chữ và đạt độ tương phản như đã khai báo trong comment Bậc Trà ở issue #3;
   chỗ nào chưa đạt thì sửa;
2. rê chuột vào ảnh một trạm thì các đám mây bay ra, kể những việc cụ thể sẽ làm ở trạm đó theo từng mốc giờ,
   kèm ảnh hoạt động;
3. đám mây phải trông như mây lơ lửng, mép mềm, không phải một khối trắng đặc;
4. mây không được chớp khi cuộn trang; mở và đóng mây phải mượt cả lúc rê chuột vào lẫn lúc rời ra;
5. đưa vào `wl-journey` phần mới trên bản phác: ô chuyến gần nhất ở cuối con đường, liên kết từ mây ở Suối Giàng
   sang khối làm trà;
6. thêm dữ liệu cho Bậc Trà: việc làm và mốc giờ lấy từ mục 4 của tài liệu kế hoạch, ảnh hoạt động có giấy phép;
7. kiểm tra lại các tiêu chí của issue #13 xem đã đủ điều kiện đóng chưa, sau đó commit và push lên PR.

Yêu cầu (theo `AGENTS.md`):

- chữ và ảnh lấy từ `content.json`, màu và font chỉ lấy từ biến CSS; thương hiệu khác thêm khối này vẫn chạy đúng;
- mỗi ảnh có giấy phép dùng được và một dòng trong `credits`;
- dùng được bằng bàn phím, tôn trọng giảm chuyển động;
- chạy thử ở 1440px và 390px, console không lỗi.

## Phần tự quyết định

- Đưa ra ý tưởng rê chuột vào ảnh trạm thì mây bay ra kể việc làm theo giờ.
- Thử trên bản phác 2 trước, xem và duyệt rồi mới cho đưa vào repo.
- Tự xem trên trình duyệt và chỉ ra chỗ chưa ổn để sửa: mây là khối trắng đặc, mây chớp khi cuộn, mở và đóng
  mây chưa mượt.
- Quyết định đưa ô chuyến gần nhất và liên kết sang khối làm trà vào repo.
- Cho commit và push sau khi kiểm lại 5 tiêu chí của issue #13, cả 5 đều đạt.
