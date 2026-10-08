# 06/10 - Dựng khung dự án và quy tắc cho cả đội

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: commit f5d1ed2 (PR #1)

## Prompt (tóm tắt)

Bạn là kỹ sư frontend phụ trách dựng khung dự án cho đội thi Web Design 2026: landing page white label,
HTML, CSS, JavaScript thuần, không framework, không bước build. Dựa trên phụ lục Biên bản Khai mạc và
cấu trúc đội đã chốt, hãy:

1. dựng cấu trúc thư mục: `index.html` là vỏ trang; `css/base.css`, `css/components.css`;
   `js/core.js`, `js/app.js`, `js/components/`; `brands/brands.json` và `brands/<id>/` gồm `content.json`,
   `theme.css`, `images/`; `docs/ai-log.md`. Mỗi tệp chỉ có chú thích nêu nhiệm vụ, chưa viết mã;
2. viết `.gitignore`: bỏ thư mục tài liệu của BTC, tệp của hệ điều hành và trình soạn thảo;
3. viết `README.md` (cách chạy, cấu trúc, quy ước) và `AGENTS.md` làm quy tắc chung cho cả đội và trợ lý AI:
   luật thi và mức phạt, phân công, luồng dữ liệu, mẫu component, cấu trúc `content.json`, quy tắc CSS, JS,
   ảnh, git, cách AI làm việc, danh sách tự kiểm trước khi push; `CLAUDE.md` trỏ tới `AGENTS.md`.

Yêu cầu:

- commit và PR không có dòng trailer AI; việc dùng AI ghi bằng scope `AI/` và trong `docs/ai-log.md`;
- không dùng icon hay emoji trang trí trong giao diện, mã, commit và tài liệu;
- chỉ dùng thư viện và cách làm mà luật thi cho phép.

## Kết quả và phần đội tự làm

- AI dựng khung và viết các tệp quy tắc; đội đọc lại và chỉnh `.gitignore`, chú thích trong `core.js`,
  tên thành viên trong `docs/ai-log.md`, rồi mở PR #1.
