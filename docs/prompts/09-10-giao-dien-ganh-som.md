# 09/10 - Giao diện mới cho hero, header, footer của Gành Sớm

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: commit b00fb35, a9c0170

## Prompt (tóm tắt)

Bạn là kỹ sư frontend kiêm người thiết kế giao diện. Hãy làm lại hero, header, footer của Gành Sớm theo phong cách chồng thẻ ảnh 3D trên nền sáng:

1. `theme.css`: nền màu cát, nút màu cam chữ nâu than, màu nhấn đủ tương phản để làm màu chữ, font Montserrat có bộ chữ tiếng Việt;
2. `wl-hero` kiểu `coverflow`: 5 thẻ ảnh đứng xếp theo chiều sâu, đối xứng hai bên, xoay vòng; tiêu đề lớn đè lên giữa;
   nền là ảnh đang xem làm mờ; đổi ảnh bằng nút Trước, Sau, phím mũi tên, vuốt, hoặc bấm thẻ bên cạnh;
3. header kiểu `solid`: tên thương hiệu in hoa đậm, nút đặt phòng nhỏ hiện cả trên điện thoại;
4. `wl-footer` kiểu `card`: tên lớn, nút đặt phòng kèm dòng giá, ba cột menu, liên hệ, địa chỉ, nguồn ảnh;
5. tìm thêm ảnh có giấy phép cho hero và ghi nguồn;
6. rà dấu hiệu giao diện do AI làm (nhãn in hoa giãn chữ ở mọi khối, nhãn viên thuốc, nền mờ không có lý do) và bỏ đi;
   sửa `base.css` để liên kết và nút viền không lấy màu chủ đạo làm màu chữ.

Yêu cầu:

- chỉ làm giao diện sáng, chưa cần chế độ tối;
- màu, font chỉ lấy từ biến CSS; chữ và ảnh lấy từ `content.json`;
- dùng được bằng bàn phím, tôn trọng giảm chuyển động;
- chữ đạt tương phản AA; kiểm ở bề ngang 1440px và 390px.

## Phần tự quyết định

- Chọn phong cách chồng thẻ ảnh 3D cho Gành Sớm.
- Chỉ làm giao diện sáng, bỏ chế độ tối.
- Yêu cầu chồng thẻ ở hero phải đối xứng hai bên.
- Quyết định sửa thẳng `base.css` để chữ dùng màu nhấn.
