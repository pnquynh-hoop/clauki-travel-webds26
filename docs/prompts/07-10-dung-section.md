# 07–08/10 - Dựng section từ content.json và hợp đồng component (issue #5)

- Người dùng AI: Như Quỳnh
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: commit e61df46 (PR #19)

## Prompt (tóm tắt)

Bạn là kỹ sư frontend trong đội làm landing page white label. Giải thích issue #5 cần làm những gì, rồi lập
danh sách các bước cụ thể và làm lần lượt; xong mỗi bước thì dừng để tôi kiểm tra, chưa commit:

1. `core.js` dựng `<main>` theo đúng thứ tự `sections`: bỏ khối `hidden` và khối chưa có component (cảnh báo
   trong console), gán `id` của section cho thẻ, gán `el.site` rồi `el.data`;
2. header, footer, sticky-cta nhận cả `content.json`; đổi thương hiệu thì dựng lại, không bị lặp khối;
3. `app.js` đăng ký component trước khi gọi `start()`;
4. một component mẫu chỉ có chữ (`eyebrow`, `title`, `lead`) để thử luồng dữ liệu;
5. tạo thư mục `brand-test` làm bộ dữ liệu chung của đội khi phát triển, dữ liệu giống thật theo chủ đề
   doanh nghiệp du lịch;
6. ghi hợp đồng component vào `AGENTS.md`.

Yêu cầu:

- chú thích trong code giải thích vì sao, ngắn gọn, diễn đạt đơn giản để người mới đọc lần đầu cũng hiểu;
- so sánh cách viết component của Gia Huy (setter `set data`), cách `update(section, site)` và cách của
  repo mẫu.

## Kết quả và phần tự làm

- Chạy thử trên Live Server sau từng bước; AI chạy thêm bằng Chrome headless.
- Tự đọc code và kiểm tra từng đoạn; phát hiện chú thích "phải đăng ký trước `start()`" chưa đúng (đổi vị trí
  thì section vẫn hiện) và class `intro--center` chưa có CSS; AI sửa cả hai.
- Thử cách `update(section, site)`, so sánh ba cách rồi chọn giữ cách `set data` của Gia Huy.
- AI đối chiếu các mục trong issue #5 và đánh dấu những mục đã xong; mục cuối (người làm giải thích được
  code) chỉ đánh dấu sau khi mình đã hiểu phần giải thích.
