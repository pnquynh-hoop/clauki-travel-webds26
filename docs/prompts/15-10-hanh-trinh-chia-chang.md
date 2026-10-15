# 15/10 - Hành trình chia chặng (issue #106), nút đặt của room-detail, bộ dữ liệu thử brand-test

- Người dùng AI: Như Quỳnh
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #127 trên nhánh `feat/106-hanh-trinh-chia-chang`

## Prompt (tóm tắt)

Bạn là kỹ sư frontend kiêm người thiết kế giao diện trong đội làm website white label nhiều trang. Hãy làm issue #106
theo bản mẫu SighGone (phần hành trình kiểu sơ đồ tuyến metro ở trang chi tiết tour), trước khi làm thì nói rõ sẽ làm gì:

1. khối hiện từng chặng của tour: giờ, tên nơi, phương tiện, ảnh; cuộn tới chặng nào thì phương tiện đổi theo chặng đó;
   chặng đọc từ danh mục tour (`catalog`); gắn vào các trang chi tiết tour và landing `dem-nay`;
2. nhãn "Hành trình" làm giống bản mẫu; nhãn tên phương tiện không được đẩy bố cục, để hai bên khối đều nhau;
3. sửa tận gốc lỗi nút "Giữ chỗ" lẻ của `room-detail`: thiếu dữ liệu thì không hiển thị, không vá bằng dữ liệu;
4. dựng bộ dữ liệu thử trong brand-test, chủ đề khác xa các brand chính, lượng dữ liệu cỡ Bậc Trà, ảnh để khung trống,
   chỉ sửa tệp JSON và CSS của brand-test; sửa đoạn về brand-test trong AGENTS.md thành vai trò chung;
5. rebase lên `main` mới nhất rồi mở PR.

Yêu cầu:

- component không ghi cứng chữ, màu, đường dẫn ảnh; thêm vào thương hiệu khác vẫn hiện đúng theo màu, font của thương hiệu đó;
- thiếu trường tuỳ chọn thì bỏ phần đó, không hiện phần lỗi;
- dùng được bằng bàn phím, tôn trọng giảm chuyển động; kiểm ở bề ngang 390px và 1440px;
- không có tên thương hiệu hay tên người trong mã.

## Phần tự quyết định

- Phân công theo người được assign trong issue, không theo bảng phân công nháp ở #88.
- Gắn khối hành trình vào trang tour SighGone và `dem-nay`.
- Nhãn tên phương tiện đặt ngoài khung nội dung thay vì chừa làn giữa đường ray và chữ.
- Sửa nút đặt ở chính `room-detail` và bỏ các dòng `"book": ""` vá tạm.
- Chọn chủ đề thử trái ngược các brand chính, ảnh là khung trống, đưa bộ dữ liệu thử vào cùng PR.
- Đoạn về brand-test trong AGENTS.md chỉ mô tả vai trò: cho BGK xem và để thử hệ thống.
