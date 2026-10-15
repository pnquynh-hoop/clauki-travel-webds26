# 15/10 - Chế độ sáng, tối, gợi ý màu bằng AI và thứ tự menu trong editor

- Người dùng AI: Như Quỳnh
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #178

## Prompt (tóm tắt)

Bạn là kỹ sư frontend trong đội làm website white label nhiều trang có editor "Thử chỉnh". Hãy làm:

1. chế độ sáng, tối cho trang: thương hiệu có bảng màu tối thì header có nút đổi, nhớ lựa chọn của khách;
2. trong editor, tab Giao diện, phần Màu: trên là khung chat nhờ AI gợi ý màu sáng, tối, có placeholder hướng dẫn
   cách viết yêu cầu; câu mẫu chỉ điền sẵn vào ô, chưa gửi; kết quả chỉ hiện màu được gợi ý, giới hạn chiều cao để
   phần bên dưới không bị đẩy đi; thông báo rõ ràng khi không có màu nào để áp;
3. dưới khung chat là bảng màu hiện tại chia hai nửa sáng, tối để tự chỉnh;
4. trong editor, đổi thứ tự các mục menu trên header bằng kéo thả;
5. form sửa nội dung: chỉ nhãn in đậm, chữ trong ô viết thường; bỏ chữ "null" trên thanh công cụ nổi.

Yêu cầu:

- không ghi cứng màu trong component; thương hiệu không khai màu tối thì trang như cũ;
- mỗi chế độ đạt tương phản AA;
- dùng được bằng bàn phím và màn hình cảm ứng, tôn trọng giảm chuyển động;
- kiểm ở bề ngang 390px và 1440px.

## Phần tự quyết định

- Màu tối khai thành biến `--dark-*` trong `theme.css` (và trong nháp của editor); bật tối thì đè lên biến cùng tên
  bằng style trên `<html>`, nên không phải sửa CSS của từng khối.
- Lần đầu vào trang là chế độ sáng, vì đó là màu chính của thương hiệu.
- Khối vốn sáng ngoài đời (giấy note, biển số, chữ trên ảnh) giữ bảng màu sáng trong chế độ tối, gom ở `css/theme-mode.css`.
- Làm bảng màu tối cho SighGone ("Sài Gòn về đêm") và logo cho nền tối; thương hiệu khác tạo trong editor bằng nút
  tạo bảng tối từ màu sáng hoặc nhờ AI.
- Màu AI gợi ý qua cùng bộ kiểm với sửa tay (tên biến, mã hex, tương phản AA của từng chế độ), bấm Đồng ý mới áp.
- Thứ tự menu đặt ở phần Đầu trang của tab Khối, có cả nút Lên, Xuống cho bàn phím và điện thoại.
