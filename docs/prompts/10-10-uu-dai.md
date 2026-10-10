# 10/10 - Khối ưu đãi đặt sớm hè 2027 (`offer`), kiểu `postcard` cho Gành Sớm

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: commit c47e7a8 (bản đầu, kiểu `tide`), 6371af6 (làm lại, kiểu `postcard`)

## Prompt (tóm tắt)

Bạn là kỹ sư frontend kiêm người thiết kế giao diện. Trang Gành Sớm ngắn hơn hai thương hiệu kia, và chiến dịch "Đặt sớm hè 2027"
(đặt trước 31/12/2026, ở 3 đêm tặng đêm thứ tư) là lý do landing page tồn tại nhưng chỉ nằm lẫn trong form đặt phòng.
Hãy làm một khối riêng cho chiến dịch, đặt ngay trước khối đặt phòng:

1. đếm ngược ngày, giờ, phút tới 23:59 ngày 31/12/2026 giờ Việt Nam; hết hạn thì hiện câu báo hết hạn;
2. tính thử 4 đêm: chọn hạng nhà thì hiện bốn ô đêm, đêm cuối là đêm được tặng, kèm giá thường, số tiền trả, giá tính ra mỗi đêm;
   luật tính phải khớp với khối đặt phòng (ở từ 4 đêm tặng 1 đêm); nút đặt chọn sẵn hạng đó trong khối đặt phòng;
3. lịch biển 2027: 12 tháng, độ động của biển từng tháng nhìn được bằng đường sóng, tô khoảng tháng 4 tới tháng 8;
   nhãn mùa lấy theo tài liệu kế hoạch Gành Sớm, phần tài liệu chưa ghi thì viết chung chung, không bịa số liệu;
4. component đặt tên theo chức năng; dạng cơ bản không có `variant`, kiểu riêng của Gành Sớm đặt tên riêng;
   gắn vào thương hiệu khác vẫn hiện đúng theo màu, font của thương hiệu đó.

Yêu cầu: kiểm ở 360px, 390px, 1440px, không tràn ngang; đổi thương hiệu qua lại không nhân đôi đồng hồ.
Mục menu "Giá đã gồm" đang không nhảy tới đâu (khối thuyền thúng để sau) nên tạm đổi thành "Ưu đãi".

## Làm lại theo mẫu (tóm tắt prompt)

Bản đầu (dải nền tối, số đếm ngược lớn, đường sóng) bị chê xấu. Cho 4 agent làm song song 4 mẫu tĩnh, mỗi mẫu một hướng,
ảnh thật làm chủ, chỉ dùng biến màu của thương hiệu: "Bốn bình minh" (bốn ảnh là bốn đêm), "Bưu thiếp hẹn hè 2027",
"Phiếu đặt sớm" (tấm vé có đường xé), "Ảnh tràn màn hình". Mỗi agent tự chụp màn hình ở 1440px và 390px rồi sửa.
Sau khi chọn mẫu bưu thiếp: chuyển mẫu thành `wl-offer`, một cấu trúc HTML cho mọi thương hiệu, chữ lấy hết từ `content.json`;
dạng cơ bản là hai thẻ phẳng, kiểu `postcard` mới nghiêng thẻ, tem răng cưa, chữ viết tay (font Mynerve vì Caveat thiếu dấu tiếng Việt,
khai báo `--font-hand` trong `theme.css` của Gành Sớm). Kiểm lại: chọn tem thì tem trên bưu thiếp, dòng hạng phòng, phiếu giá đổi theo;
nút đặt chọn sẵn hạng trong khối đặt phòng; không tràn ngang ở 360px và 1440px.

## Phần tự quyết định

- Thấy trang Gành Sớm ngắn, chọn thêm khối chiến dịch "Đặt sớm hè 2027" với đếm ngược, lịch biển và phép tính 3 đêm thành 4 đêm.
- Thấy bản đầu xấu, xem 4 mẫu và chọn mẫu bưu thiếp.
