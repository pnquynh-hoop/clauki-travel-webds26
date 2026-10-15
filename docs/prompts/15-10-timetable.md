# 15/10 - Bảng giờ chạy hôm nay (khối `timetable`)

- Người dùng AI: Như Quỳnh
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #166

## Prompt (tóm tắt)

Bạn là kỹ sư frontend kiêm người thiết kế giao diện trong đội làm website white label nhiều trang. Hãy làm khối
"Chuyến hôm nay" (issue #117) theo phần "Giờ chạy hôm nay" ở trang chủ bản mẫu SighGone:

1. mỗi tour một dòng: giờ chạy, tên, phương tiện, trạng thái (còn N chỗ, sắp chạy, hết chỗ, đã chạy) theo giờ thật
   ở nơi đến (`place.timezone`);
2. bấm một dòng thì sang trang đặt tour, tour đã chọn sẵn; tour hết chỗ đã khoá thì không bấm được;
3. kiểu `board`: chữ lật như bảng giờ nhà ga, giảm chuyển động thì không lật;
4. đọc từ danh mục tour, ghi dòng vào AGENTS.md mục 12.

Yêu cầu:

- component đặt tên theo hình thức hiển thị, dùng lại được cho thương hiệu khác chỉ bằng dữ liệu;
- không ghi cứng chữ, màu, đường dẫn ảnh; thiếu trường thì bỏ phần đó;
- dùng được bằng bàn phím, có chữ cho trình đọc màn hình, tôn trọng giảm chuyển động;
- thử trên brand-test, kiểm ở bề ngang 390px và 1440px.

## Phần tự quyết định

- Đặt tên khối `timetable` (bảng giờ), kiểu mặc định là danh sách trên một tấm thẻ, kiểu `board` là bảng nhà ga.
- Trạng thái: qua giờ bắt đầu là đã chạy; số chỗ lấy từ `availability` của hôm nay, không có thì chỉ ghi còn chỗ;
  sắp chạy là còn dưới `soon` phút (mặc định 90).
- Dòng đã chạy cũng khoá như dòng hết chỗ vì hôm nay không đặt được nữa.
- Khi mọi chuyến hôm nay đã chạy, bảng chuyển sang ngày mai (tiêu đề `labels.tomorrow`), để buổi tối vẫn có chuyến để đặt.
- Chọn sẵn tour bằng sự kiện `wl:choose` có sẵn của `core.js`, không thêm tham số trên địa chỉ.
- Bảng nhà ga dùng nền và màu đèn cố định để đọc được ở cả theme sáng lẫn tối.
- Thêm số chỗ các ngày 15 tới 19/10 cho danh mục SighGone (trước đây bắt đầu từ 20/10), có cả ngày hết chỗ.
