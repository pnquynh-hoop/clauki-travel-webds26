# 15/10 - SighGone: trang về chúng tôi, liên hệ, 404 và footer theo bản mẫu

- Người dùng AI: Như Quỳnh
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #161

## Prompt (tóm tắt)

Bạn là kỹ sư frontend kiêm người thiết kế giao diện trong đội làm website white label nhiều trang. Hãy làm ba trang
về chúng tôi, liên hệ, 404 của SighGone theo bản mẫu thiết kế (issue #111), đường dẫn thống nhất với menu:

1. trang về chúng tôi: tiêu đề tên thương hiệu "đọc nhanh" (Sài Gòn lật thành Sigh Gone), giữ câu chuyện về cái tên;
   các con số kể chuyện bằng hình ảnh, đồ hoạ thay vì chữ; thẻ hướng dẫn viên treo lệch như trong game, chỉ ghi lĩnh vực
   chuyên môn (không ghi tên tour cụ thể), ba người có ảnh chân dung; mục cam kết của doanh nghiệp (tiền bạc, minh bạch,
   sứ mệnh) trình bày như game; nhãn và tiêu đề như bản mẫu;
2. trang liên hệ: lấy ý tưởng bảng chuông cửa của bản thử, chi tiết giữ nội dung hiện tại (biển số nhà, giờ mở cửa,
   đường vào hẻm, soạn tin nhắn); nút trên màn hình tối phải đọc rõ;
3. trang 404 như bản mẫu nhưng bỏ nút về trang chủ;
4. footer như bản mẫu: lời hẹn chữ bảng hiệu rất lớn, các cột tour, menu, liên hệ, biển số nhà;
5. tiêu đề khối danh sách tour ở trang 404 của các thương hiệu không được to hơn tiêu đề chính.

Yêu cầu:

- component đặt tên theo hình thức hiển thị, không mang nghiệp vụ, dùng lại được cho thương hiệu khác chỉ bằng dữ liệu;
- không ghi cứng chữ, màu, đường dẫn ảnh; thương hiệu không khai trường mới thì giao diện giữ như cũ;
- dùng được bằng bàn phím, tôn trọng giảm chuyển động;
- thử trên brand-test, kiểm ở bề ngang 390px và 1440px;
- không có tên thương hiệu hay tên người trong mã.

## Phần tự quyết định

- Thêm khối `cards` (lưới thẻ, kiểu `badge` thẻ đeo treo lệch quanh móc, đung đưa khi cuộn tới), `pictogram` (con số vẽ
  bằng dãy hình), `medals` (cam kết như bảng thành tựu, mở khoá lần lượt), `coins` (giá một tour chia thành các chồng xu).
- Thêm `plate.js` dùng chung cho biển số nhà; `intro` thêm kiểu `headline`, `plate`, `road`, `morph`; `contact` thêm
  kiểu `plate`, `bell`, `directions`; footer thêm kiểu `headline` có cột tour lấy từ `catalog`.
- Thêm biến tuỳ chọn `--eyebrow-*`, `--heading-*` để nhãn và tiêu đề của `intro`, `host` theo bản mẫu mà không đổi
  giao diện các thương hiệu khác.
- Khối đầu trang chỉ chừa chỗ cho header khi header là `overlay`; header kiểu khác đã chiếm chỗ của nó.
- Chọn vé "Sài Gòn lên đèn" cho khối tiền đi đâu, phần trăm là bội của 10 để số tiền các phần cộng lại đúng giá vé.
- Cắt ảnh chân dung hướng dẫn viên lấy mặt và vai, chuyển sang WebP; bỏ tiêu đề khối tour ở trang 404 của Bậc Trà,
  brand-test.
