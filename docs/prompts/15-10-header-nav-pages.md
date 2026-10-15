# 15/10 - Menu header chỉ gồm trang

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #156

## Prompt (tóm tắt)

Header đang trộn lẫn liên kết sang trang khác và liên kết lướt trong trang.

## Phần tự quyết định

- Menu của thương hiệu nhiều trang chỉ gồm liên kết sang trang. Bản mẫu SighGone cũng vậy (Tour, Tour riêng, Về SighGone, Cẩm nang, Hỏi đáp, Liên hệ).
- SighGone: bỏ "Cách đi" và "Khách kể" (nhảy tới khối ở trang chủ), thêm Tour riêng, Về SighGone, Liên hệ; giữ "Tuyến số 1" vì là chiến dịch đang mở bán. Bảy mục vẫn vừa một hàng ở 1024px.
- Gành Sớm: bỏ "Thư viện ảnh" (khối ở trang chủ), "Hỏi đáp" trỏ thẳng sang trang đặt phòng (chứa hỏi đáp và form).
- Mé Rạch là trang một trang nên menu toàn liên kết `#`, giữ nguyên. Bậc Trà đã toàn liên kết sang trang.
