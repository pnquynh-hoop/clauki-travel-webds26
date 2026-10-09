# 08/10 - Đưa Gành Sớm vào repo

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: commit e505bb6; issue #31 (room-view); cập nhật bảng sườn trang trong issue #3

## Prompt (tóm tắt)

Bạn là trưởng nhóm kỹ thuật của dự án. Main đã có Bậc Trà (`bac-tra`) và Mé Rạch (`me-rach`); thư mục `brand-b`
còn trống, dành cho Gành Sớm. Hãy rà repo rồi làm bốn việc theo thứ tự:

1. chia các issue phần chung chưa ai nhận, nhận về phần lõi cố định theo bảng phân công ở AGENTS.md mục 2;
2. đổi `brands/brand-b` thành `brands/ganh-som`: khung `content.json` theo sườn trang đã chốt, `theme.css` theo
   tài liệu `docs/brands/ganh-som/ke-hoach.md`, sửa `brands/brands.json` và mọi chỗ còn nhắc `brand-b`;
3. tạo issue cho khối mới `room-view` theo khuôn issue #24 (user story, tiêu chí chấp nhận, phân rã công việc,
   phụ thuộc, ghi chú);
4. điền bảng sườn trang của cả ba thương hiệu trong issue #3.

Yêu cầu:

- `content.json` là JSON thuần, mọi link trong `nav` khớp `id` trong `sections`;
- chưa có `logo.svg` thì để trống `logo` và `favicon`, tránh lỗi 404 trong console;
- giữ mã commit đã ghi trong nhật ký: gộp main bằng merge, không rebase;
- chạy thử bằng Chrome headless: `?brand=ganh-som` nạp đúng tiêu đề, biến màu, font có dấu tiếng Việt;
  `?brand=brand-b` cũ quay về thương hiệu mặc định.

## Kết quả và phần đội tự làm

- Đội chọn làm cả bốn việc và thứ tự làm.
- Nhận #7, #8, #10; các issue chung còn lại chờ đội thống nhất trước khi gán cho người khác.
