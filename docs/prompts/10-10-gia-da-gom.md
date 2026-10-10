# 10/10 - Khối giá đã gồm (#11), kiểu `cutout` cho Gành Sớm

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: commit 713c7de, 4e8ab8b

## Prompt (tóm tắt)

Bạn là kỹ sư frontend kiêm người thiết kế giao diện. Trang Gành Sớm chưa có chi tiết nào về thuyền thúng. Hãy:

1. tìm ảnh thật một chiếc thuyền thúng, rõ nét, giấy phép dùng được (kiểm trên trang Commons);
2. tách nền ảnh thành ảnh trong suốt để đặt thật to vào trang, xuất WebP nhẹ, ghi nguồn và ghi rõ đã tách nền;
3. làm khối `features` (#11) kiểu `cutout`: ảnh thuyền thúng tràn ra mép trái, chòng chành nhẹ và xoay theo cuộn trang;
   bên cạnh là danh sách đánh số những thứ đã gồm trong giá, thêm mục "một buổi sáng trên thuyền thúng";
4. không có `variant` thì hiện lưới thẻ cơ bản; dữ liệu theo dạng `items` (`value`, `title`, `text`) đã có trong brand-test.

Yêu cầu: màu, font chỉ lấy từ biến CSS; tắt chuyển động khi bật giảm chuyển động; kiểm ở 390px và 1440px.

## Làm thêm (tóm tắt prompt)

Chỉ đặt ảnh tách nền lên trang thì chưa thú vị. Cho khách chơi với thúng: kéo ngang để nghiêng thúng, thả ra thì thúng
lắc vài nhịp như trên sóng rồi dừng (lò xo có ma sát), gợn nước loang dưới đáy; có nút cho bàn phím; tắt khi bật giảm chuyển động.

## Phần tự quyết định

- Đưa thuyền thúng vào gói "giá đã gồm" (thay đổi về sản phẩm của thương hiệu).
- Không dùng sơ đồ vẽ nét; yêu cầu ảnh thật tách nền đặt thật to trên trang.
- Thấy chỉ đặt ảnh lên trang thì chưa thú vị, chọn thêm tương tác cho khách chơi với thúng.
