# 15/10 - Tuyến số 1 dùng header đầy đủ

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #157

## Prompt (tóm tắt)

Hỏi Tuyến số 1 có giữ header cũ không; sau đó nói rõ ý là muốn giữ header nhiều mục (header đầy đủ), không dùng bản rút gọn.

## Phần tự quyết định

- Chỉ bỏ khai `header: minimal` của trang `tuyen-so-1`; không sửa component. Trang dùng header chung của thương hiệu.
- Hero `ride` ghim ngay dưới header (cùng chiều cao như bản rút gọn), nên không phải sửa gì ở hero.
- Giữ breadcrumb không đặt ở trang này vì vẫn là landing một mục tiêu.
