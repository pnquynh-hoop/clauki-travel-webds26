# 15/10 - Sáu cách đi ở trang chủ SighGone

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #143

## Prompt (tóm tắt)

Bản mẫu SighGone có khối "Một thành phố, sáu tốc độ" (sáu cách đi, mỗi cách một ô dẫn sang tour). Hỏi nên áp vào component có sẵn hay làm mới.

## Phần tự quyết định

- Không làm component mới: khối `gallery` kiểu `slices` ở trang chủ đã là các cách đi bằng ảnh thật. Thêm `href` tuỳ chọn cho mỗi ảnh và `linkLabel` cho section.
- Liên kết dùng địa chỉ lọc sẵn của `catalog-list` (`/tour#di=<phương tiện>`), không viết thêm logic lọc.
- Bỏ ảnh phà (phà chỉ là một chặng của tour Cần Giờ, không phải một cách đi riêng) để khớp "sáu".
- Không làm hiệu ứng ảnh loang theo con trỏ của bản mẫu vì dải xoè rộng đã thay vai trò đó.
