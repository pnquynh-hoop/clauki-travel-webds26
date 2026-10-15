# 15/10 - Hành trình chia chặng (issue #106), nút đặt của room-detail, bộ dữ liệu thử brand-test

- Người dùng AI: Như Quỳnh
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #127

## Prompt (tóm tắt)

Bạn là kỹ sư frontend kiêm người thiết kế giao diện trong đội làm website white label nhiều trang. Hãy làm issue #106
theo bản mẫu SighGone (phần hành trình kiểu sơ đồ tuyến metro ở trang chi tiết tour):

1. khối hiện từng chặng của tour: giờ, tên nơi, phương tiện, ảnh; cuộn tới chặng nào thì phương tiện đổi theo chặng đó;
   chặng đọc từ danh mục tour (`catalog`); gắn vào các trang chi tiết tour và landing `dem-nay`;
2. nhãn "Hành trình" giống bản mẫu; nhãn tên phương tiện không được đẩy bố cục, để hai bên khối đều nhau;
3. sửa tận gốc lỗi nút "Giữ chỗ" lẻ của `room-detail`: thiếu dữ liệu thì không hiển thị phần đó, khối không còn gì thì ẩn;
4. dựng bộ dữ liệu thử trong brand-test, chủ đề khác xa các brand chính (nước ngoài, mùa, phương tiện), lượng dữ liệu
   cỡ Bậc Trà, chỗ hiện ảnh để khung trống; đoạn về brand-test trong AGENTS.md chỉ nói vai trò: cho BGK xem và để thử hệ thống.

Yêu cầu:

- component không ghi cứng chữ, màu, đường dẫn ảnh; thêm vào thương hiệu khác vẫn hiện đúng theo màu, font của thương hiệu đó;
- thiếu trường tuỳ chọn thì bỏ phần đó, không hiện phần lỗi;
- dùng được bằng bàn phím, tôn trọng giảm chuyển động; kiểm ở bề ngang 390px và 1440px;
- không có tên thương hiệu hay tên người trong mã.

## Phần tự quyết định

- Gắn khối hành trình vào trang tour SighGone và `dem-nay`.
- Nhãn tên phương tiện đặt ở lề ngoài khung nội dung thay vì chừa làn giữa đường ray và chữ.
- Sửa nút đặt ở chính `room-detail` và bỏ các dòng `"book": ""` vá tạm.
- Chọn chủ đề thử trái ngược các brand chính, chỗ hiện ảnh là khung trống.
- Đoạn về brand-test trong AGENTS.md chỉ mô tả vai trò: cho BGK xem và để thử hệ thống.
