# 08/10 - Header và footer (#7) cho Gành Sớm

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: commit 8e9c834

## Prompt (tóm tắt)

Bạn là kỹ sư frontend kiêm người thiết kế giao diện. Hãy làm hai khối cố định của trang (#7), dùng dữ liệu Gành Sớm:

1. `wl-header`: logo hoặc tên thương hiệu, menu neo tới các section, nút CTA từ `site.cta`, menu gập trên điện thoại;
   kiểu `solid` có dòng thông tin nhỏ phía trên (giờ nhận, trả phòng và số điện thoại);
2. `wl-footer`: tên, khẩu hiệu, liên hệ, nút CTA, nguồn ảnh theo `credits`; kiểu `compact` gọn hai hàng;
3. hover rõ ràng, dùng được bằng bàn phím; header thu gọn khi cuộn;
4. rà dấu hiệu mã do AI viết, gom các hàm dựng thẻ bị lặp ở hero, header, footer về một chỗ.

Yêu cầu:

- màu, font chỉ lấy từ biến CSS; chữ lấy từ `content.json`;
- ảnh CC BY-SA phải ghi tác giả, giấy phép, nguồn trên trang;
- các kiểu khác (`overlay`, `columns`, `center`, `directions`) để người phụ trách Bậc Trà, Mé Rạch tự thiết kế.

## Phần tự quyết định

- Định hướng bố cục và hiệu ứng, duyệt và yêu cầu làm lại tới bản cuối.
- Chọn nội dung: email đuôi `.clauki`, nhãn menu "Giá đã gồm", nút "Đặt phòng ngay", footer có nút đặt phòng.
