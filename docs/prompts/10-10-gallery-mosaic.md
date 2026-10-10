# 10/10 - Thư viện ảnh kiểu `mosaic` cho Mé Rạch

- Người dùng AI: Mị Nương
- Công cụ: Claude Code (Claude Opus 5.5)
- Tệp: khối `.gallery--mosaic` cuối `css/components/gallery.css` (tệp của Huy, không sửa phần mặc định và `slices`);
  dòng `gallery` trong AGENTS.md mục 12

## Prompt (tóm tắt)

Khối "Quanh nhà vườn" đang dùng lưới mặc định của Huy, chia ô nhỏ nên ảnh bị nhỏ. Làm kiểu mới, chỉnh lại bố cục cho
nhìn ổn hơn, ảnh to hơn. Đồng ý với đề xuất `mosaic`: ô to nhỏ xen kẽ như ghép gạch, chú thích đè đáy ảnh.

## Kết quả

- chỉ thêm CSS, dùng nguyên HTML lưới mặc định nên không sửa `wl-gallery.js`;
- điện thoại 2 cột (ảnh đầu 2 x 2, ảnh thứ tư cao gấp đôi); từ 760px 4 cột (ảnh 1 chiếm 2 x 2, ảnh 3 cao gấp đôi,
  ảnh 5, 6 trải ngang); xếp lặp theo nhóm 6 ảnh bằng `nth-child(6n + k)`, `grid-auto-flow: dense` để số ảnh khác vẫn khít;
- ảnh lấp kín ô, chú thích chữ sáng trên lớp tối mờ ở đáy ảnh; rê chuột thì ảnh phóng nhẹ; tắt hiệu ứng khi giảm chuyển động.

## Phần tự làm và tự kiểm tra

- Chọn hướng `mosaic` trong các phương án.
- Xem ảnh chụp ở 1440px và 390px: các ô khít, chú thích đọc rõ trên mọi ảnh. Báo Huy về khối thêm vào `gallery.css`.
