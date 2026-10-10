# 10/10 - Logo, header kèm tên, footer `columns` và gallery `slices` cho Mé Rạch

- Người dùng AI: Mị Nương
- Công cụ: Claude Code (Claude Opus 5.5)
- Tệp: `brands/me-rach/content.json` (gallery, footer, logo, favicon), `brands/me-rach/images/logo-merach.webp`,
  `favicon.png`; `brandEl` trong `js/components/wl-header.js` (tệp của Huy); vài quy tắc logo trong
  `css/components/header.css`; khối `.gallery--mosaic` bị gỡ khỏi `css/components/gallery.css`; AGENTS.md mục 12

## Prompt (tóm tắt), theo thứ tự

1. Gallery dùng luôn kiểu của Huy, xoá kiểu mosaic.
2. Có hình logo rồi, đưa lên trang. Sau đó: muốn hiện cả logo lẫn tiêu đề, không bỏ chữ.
3. Kéo main về, dùng footer của Quỳnh (đổi hẳn sang `columns`, chấp nhận trùng Bậc Trà).
4. Đổi logo sang ảnh mới `logo-merach`, xoá ảnh logo cũ.

## Kết quả

- gallery: xoá khối `.gallery--mosaic` (tệp trở về đúng bản của Huy), Mé Rạch dùng `slices`;
- logo: tách nền, cắt con dấu tròn (cắt theo hình tròn để giữ mảng trắng bên trong, bỏ dấu ở góc ảnh gốc), xuất WebP
  320px và favicon 64px; ảnh gốc nặng để ngoài repo;
- header: `brandEl` thêm tên thương hiệu dạng chữ cạnh logo (ảnh `alt` rỗng); mặc định chữ ẩn khỏi mắt nên header
  Gành Sớm, Bậc Trà không đổi; kiểu `center` hiện cả logo và tên;
- footer `columns`: ảnh hoàng hôn trên sông, lời hẹn "Hẹn bạn dưới mé rạch", dòng chữ chạy các địa danh, giữ phần
  "Đường về vườn"; chỉ đổi dữ liệu.

## Phần tự làm và tự kiểm tra

- Tự làm ảnh logo (nguồn ảnh logo ghi riêng nếu có dùng công cụ tạo ảnh); chọn dùng footer của Quỳnh dù trùng kiểu.
- Xem ảnh chụp header cả ba thương hiệu (Gành Sớm, Bậc Trà không đổi), footer Mé Rạch ở 1440px và 390px.
  Báo Huy về `brandEl`, báo Quỳnh về việc dùng footer `columns`.
