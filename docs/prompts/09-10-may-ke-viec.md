# 08–09/10 - Mây kể việc ở từng trạm và ô chuyến gần nhất (issue #13)

- Người dùng AI: Như Quỳnh
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: commit 3cf7b42, 7548cb5, 31683b0 trên nhánh `feat/13-lich-trinh-road`

## Prompt (tóm tắt)

Các câu mình gõ, theo thứ tự:

- "Có sử dụng đa kiểu chữ và độ tương phản đúng với đã khai báo trên comment chưa": AI đo lại tương phản,
  dòng nhỏ trên tiêu đề lịch trình chưa đủ trên nền trời nên đổi sang màu chữ chính.
- "Giao diện hiện tại đã đủ nhưng vẫn ít thông tin về tour quá, có những hành động gì của chuyến đi, không
  có hình ảnh thể hiện các hoạt động... đọc xong thì chỉ biết sẽ đi qua các địa điểm nào thôi."
- "Ví dụ như là hover vô cái hình địa điểm thì nó hiển thị ra các đám mây nói thêm những thông tin, những
  việc sẽ làm cụ thể ở địa chỉ đó."
- "Hiệu ứng thì được rồi nhưng hình dạng đám mây xấu quá, tôi muốn hiệu ứng mây lơ lửng chứ không phải một
  khối đặc màu trắng."
- "Sao trên giao diện mấy cái đám mây bị chớp chớp?"
- "Tôi đồng ý áp dụng cho code repo, thêm những cái vừa thêm trong thiết kế."
- "Độ mượt khi hover và bỏ hover chưa ok."
- "Áp dụng phần vừa cập nhật cho wl-journey của repo" (ô chuyến gần nhất ở cuối đường, liên kết sang khối
  làm trà trong mây Suối Giàng).
- "Kiểm tra lại các AC coi đã đủ điều kiện đóng issue chưa", rồi "commit và push lên PR".

Cách làm: thử trên bản phác 2 trước, mình xem và duyệt rồi mới đưa vào repo.

## Kết quả và phần tự làm

- Ý tưởng rê chuột vào ảnh trạm thì mây bay ra kể việc làm theo giờ là của mình.
- Tự xem trên trình duyệt và chỉ ra chỗ chưa ổn: mây là khối trắng đặc, mây chớp khi cuộn, mở và đóng mây
  chưa mượt.
- AI thêm vào `wl-journey`: trường `plan` cho từng trạm và `planLabel` cho nút mở mây; mây mở khi rê chuột
  hoặc bấm nút, Esc thì đóng; bỏ qua sự kiện rê chuột lúc đang cuộn để hết chớp; mở và đóng bằng transition
  nên đổi hướng giữa chừng không bị giật. Hình mây là ba ảnh mặt nạ vẽ sẵn trong
  `css/components/journey/`.
- AI thêm ô cuối đường (`finish`): nút lấy từ `site.cta`, con đường dừng ở mép trên của ô; liên kết trong
  mây (`link`) tự ẩn khi khối đích chưa có trên trang.
- AI thêm dữ liệu Bậc Trà: các mốc giờ chép từ mục 4 của tài liệu kế hoạch, 12 ảnh hoạt động trên Wikimedia
  Commons kèm `credits` (5 ảnh đúng nơi, 7 ảnh thay thế, ghi rõ ở mục 8 của tài liệu kế hoạch).
- AI chạy thử bằng Chrome headless: 1440px rê chuột, 390px bấm nút, Esc, `brand-test`, đổi thương hiệu
  qua lại; kiểm lại 5 tiêu chí của issue #13 bằng script, cả 5 đều đạt.
