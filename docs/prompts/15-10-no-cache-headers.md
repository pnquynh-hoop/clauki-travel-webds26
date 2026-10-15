# 15/10 - Tắt cache dài

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #153

## Prompt (tóm tắt)

Trang đã deploy giữ bản cũ tới 4 tiếng dù tải lại cứng (Ctrl+Shift+R). Tắt cache.

## Phần tự quyết định

- Dùng `_headers` của Cloudflare Pages với `Cache-Control: no-cache` cho mọi tệp: trình duyệt vẫn lưu nhưng luôn hỏi lại máy chủ, chưa đổi thì nhận 304 nhẹ. Không dùng `no-store` vì sẽ tải lại toàn bộ ảnh mỗi lần.
- Tên miền riêng có cài đặt Browser Cache TTL 4 tiếng ở dashboard Cloudflare: nếu cài đặt đó không ở chế độ "Respect Existing Headers" thì tên miền riêng vẫn có thể giữ cache, cần người giữ tài khoản đổi.
