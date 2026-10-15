# 15/10 - Header thể hiện trang đang mở

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #155

## Prompt (tóm tắt)

Cập nhật header cho hợp lý, thể hiện đang ở trang nào.

## Phần tự quyết định

- Mã đã gắn `aria-current="page"` cho mục menu của trang đang mở nhưng không thấy gì: kiểu `solid` và `center` đặt màu chữ xám cho mọi mục với độ ưu tiên ngang, nên mục đang mở không nổi lên. Viết lại kiểu bằng bộ chọn mạnh hơn.
- Dấu hiệu: chữ đậm màu mực và vạch màu nhấn dưới chữ (màn rộng), thanh màu bên trái (điện thoại, khi mở menu).
- Trang con không có trong menu (tour/can-gio): mục của trang cha (Tour) được đánh dấu nhẹ hơn bằng `data-parent`; không tính mục trang chủ vì trang nào cũng nằm dưới trang chủ.
- Mục menu trỏ tới một khối trong trang (có `#`) không tính là trang đang mở.
