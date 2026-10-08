# Nhật ký dùng AI

Quy định cuộc thi: mọi việc dùng AI phải được ghi lại trung thực và đối chiếu được với lịch sử GitHub.
Khi trình bày hiệu ứng phức tạp, đội phải cung cấp prompt đã dùng.

Mỗi lần dùng AI cho mã nguồn, thêm một dòng vào bảng của mình. Cột "Commit" ghi mã commit chứa phần đó.
Prompt dài hoặc nhiều dòng thì lưu ở `docs/prompts/<ngày>-<việc>.md` rồi đặt link trong bảng, để bảng không bị vỡ.

## Gia Huy

| Ngày | Công cụ | Việc nhờ AI làm | Prompt chính (hoặc tóm tắt) | Commit |
| ---- | ------- | --------------- | --------------------------- | ------ |
| 06/10 | Claude Code (Claude Opus 5.5) | Dựng khung thư mục theo phụ lục Biên bản; viết README, AGENTS.md, CLAUDE.md, .gitignore | Tóm tắt dạng prompt: [docs/prompts/06-10-khung-du-an.md](prompts/06-10-khung-du-an.md) | f5d1ed2 |
| 07/10 | Claude Code (Claude Opus 5.5) | Nạp thương hiệu (#2): nạp wd2026.js, `label` trong brands.json, `core.js` đọc brands.json, chọn theo `?brand=`, gọi `WebDesign2026.init`, đổi theme.css và meta; cập nhật AGENTS.md mục 3 | Tóm tắt dạng prompt: [docs/prompts/07-10-nap-thuong-hieu.md](prompts/07-10-nap-thuong-hieu.md) | b605f20, fe234b1, 089d6f5, 41669cd, fd68682 (fe234b1, 089d6f5, 41669cd thiếu `AI/` trong scope) |
| 08/10 | Claude Code (Claude Opus 5.5) | AGENTS.md: mỗi thương hiệu một sườn trang riêng, đặt tên component theo chức năng | Tóm tắt dạng prompt: [docs/prompts/08-10-so-do-thuong-hieu.md](prompts/08-10-so-do-thuong-hieu.md) | 396d72d |
| 08/10 | Claude Code (Claude Opus 5.5) | Đề xuất thương hiệu miền Trung "Gành Sớm": loại hình, sản phẩm, màu, font, sườn trang, khung `content.json`; đội kiểm tra lại tương phản, tên, địa danh | Tóm tắt dạng prompt và phần đội tự kiểm tra: [docs/prompts/08-10-ganh-som.md](prompts/08-10-ganh-som.md) | [comment #3](https://github.com/pnquynh-hoop/clauki-travel-webds26/issues/3#issuecomment-6051703384) |

## Mị Nương

| Ngày | Công cụ | Việc nhờ AI làm | Prompt chính (hoặc tóm tắt) | Commit |
| ---- | ------- | --------------- | --------------------------- | ------ |

## Như Quỳnh

| Ngày | Công cụ | Việc nhờ AI làm | Prompt chính (hoặc tóm tắt) | Commit |
| ---- | ------- | --------------- | --------------------------- | ------ |
