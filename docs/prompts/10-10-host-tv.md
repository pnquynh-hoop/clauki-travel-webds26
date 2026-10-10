# 10/10 - Khối "Nhà chú Sáu" kiểu `tv`: tivi đời cũ kể chuyện theo cuộn

- Người dùng AI: Mị Nương
- Công cụ: Claude Code (Claude Opus 5.5)
- Tệp: `js/components/host-tv.js`, `css/components/host-tv.css` (mới); nhánh rẽ `variant === 'tv'` và gỡ listener
  trong `js/components/wl-host.js`; một dòng `@import` trong `css/components.css`; khối `host` trong
  `brands/me-rach/content.json`; dòng `host` trong AGENTS.md mục 12

## Prompt (tóm tắt)

Khối nhà chú Sáu cần thiết kế sáng tạo hơn. Ý tưởng (kèm một ảnh phác chỉ để hình dung, không dùng ảnh đó):
có một màn hình tivi đời cũ; lướt nhẹ thì nút bật tivi có hiệu ứng như có người ấn, tivi bắt đầu chiếu những câu chuyện
về chú Sáu; tivi to cho dễ nhìn; mỗi lần lướt thì nút chuyển kênh sáng lên, chuyển sang một câu chuyện nhỏ; lướt hết
thì nút tắt bị ấn, tivi tắt để xuống phần tiếp theo. Sau khi xem: tivi còn nhỏ, ảnh bị nhỏ, làm to hơn.

## Kết quả

- khối ghim khi cuộn, chia 7 nấc: tắt, 5 kênh, tắt; nút nguồn, nút kênh lún xuống khi tới nấc của nó;
- bật, tắt kiểu đèn hình (lớp ảnh co thành vệt mảnh rồi bung ra), đổi kênh có nhiễu sóng (ảnh chấm ngẫu nhiên
  vẽ một lần trên canvas nhỏ, CSS dịch vị trí để nhấp nháy);
- tivi vẽ bằng CSS (vỏ gỗ, vân gỗ, núm vặn, lưới loa, màn hình bo cong có vạch quét), màu pha từ biến thương hiệu,
  không có chữ hãng nào; tivi to theo chiều cao màn hình để luôn nằm trọn một màn hình;
- bấm nút kênh, nút nguồn thì trang cuộn tới đúng nấc; bật giảm chuyển động thì không ghim, bấm để đổi chuyện;
- năm câu chuyện dùng ảnh có sẵn của Mé Rạch (nhà sàn, măng cụt, cầu khỉ, chèo xuồng, mâm cơm); chữ do AI viết nháp.

## Phần tự làm và tự kiểm tra

- Đưa ý tưởng tivi và cách tương tác; chọn làm tivi thay cho các phương án cửa sổ gỗ, thư tay, dòng thời gian.
- Đọc lại và sửa chữ của năm câu chuyện.
- Chạy thử bằng thao tác thật ở 1440px và 390px: đủ 7 nấc, bấm nút kênh, không lỗi console.
