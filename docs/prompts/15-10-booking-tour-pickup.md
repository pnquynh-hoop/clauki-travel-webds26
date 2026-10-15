# 15/10 - Đặt tour theo lịch: chọn tour, điểm đón (issue #107)

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #137

## Prompt (tóm tắt)

Làm issue #107: mở rộng khối `booking` kiểu `calendar` để khách chọn tour (từ danh mục), chọn ngày còn chỗ, số khách, điểm đón
(quận 1 miễn phí, khách sạn quận khác cộng phí), xem tạm tính và gửi yêu cầu bằng tin nhắn soạn sẵn. Đi từ trang chi tiết tour sang
thì tour đã chọn sẵn. Bậc Trà vẫn chạy đúng. Dùng cho trang `dat-tour` và form trên trang `dem-nay` của SighGone.

## Phần tự quyết định

- Không dựng component mới: thêm hai tuỳ chọn `tours` và `pickups` cho `booking` kiểu `calendar`; không khai thì chạy như cũ.
- Phí đón tính cho cả đơn, không nhân số khách (khách sạn xa tốn một chuyến đón cho cả nhóm).
- Dữ liệu lịch và giá lấy từ `catalog` (một nguồn), không chép lại ngày vào section.
- Nút đặt ở trang chi tiết dùng `wl:choose` (core.js giữ lại và phát lại khi trang đặt tour dựng xong), thay vì tên cũ.
