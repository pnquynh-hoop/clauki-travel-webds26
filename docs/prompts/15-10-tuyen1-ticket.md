# 15/10 - Giữ chỗ của Tuyến số 1 theo kiểu quầy vé

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #146

## Prompt (tóm tắt)

Khối "Giữ chỗ" ở landing Tuyến số 1 trông hơi kì (thẻ ngày kiểu lịch xé, nền xám, form lơ lửng, khác hẳn trang đặt tour vừa làm).

## Phần tự quyết định

- Dùng lại kiểu `ticket` của `booking` thay vì làm kiểu mới, để hai trang cùng một ngôn ngữ.
- Chế độ không có danh mục tour (chỉ `departures`) thiếu tên tour và giờ đón cho thẻ lên xe: thêm `tourName` và `start`.
- Sửa kèm hai lỗi thấy khi thử: thẻ lên xe hiện khung trống trước khi gửi form; màn hình máy in lỗi dấu (ơ, ỗ) với font đơn cách của hệ thống.
