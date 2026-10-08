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
| 08/10 | Claude Code (Claude Opus 5.5) | Reset cho base.css (#4): box-sizing, bỏ margin mặc định, ảnh không tràn khung, ô nhập kế thừa font; `body` lấy nền, chữ, font từ biến | Tóm tắt dạng prompt: [docs/prompts/08-10-base-css.md](prompts/08-10-base-css.md) | 2e94722 |
| 08/10 | Claude Code (Claude Opus 5.5) | Phần còn lại của #4 trong base.css: kiểu chữ tiêu đề và liên kết, khung, khoảng cách section, lưới, nút `.btn`, `:focus-visible`, giảm chuyển động; Claude Code kiểm tra theo issue và AGENTS.md, sửa 3 biến chưa khai báo, màu liên kết có class, chú thích, chạy thử bằng Chrome headless | Tóm tắt dạng prompt: [docs/prompts/08-10-base-css.md](prompts/08-10-base-css.md) | 4e1ef31 |
| 08/10 | Claude Code (Claude Opus 5.5) | Đề xuất thương hiệu miền Tây "Mé Rạch" (#3): loại hình homestay nhà vườn, sản phẩm, chiến dịch, giá, màu, font, sườn trang với hai khối riêng `host` và `day-plan`, khung `content.json`; tự chọn tên và chỉnh thông tin | Tóm tắt dạng prompt và phần tự kiểm tra: [docs/prompts/08-10-me-rach.md](prompts/08-10-me-rach.md) | [comment #3](https://github.com/pnquynh-hoop/clauki-travel-webds26/issues/3#issuecomment-6052146644) |

## Như Quỳnh

| Ngày | Công cụ | Việc nhờ AI làm | Prompt chính (hoặc tóm tắt) | Commit |
| ---- | ------- | --------------- | --------------------------- | ------ |
| 08/10 | Claude Code | #3: hỗ trợ lên kế hoạch thương hiệu Bậc Trà. Như Quỳnh đưa định hướng (tour núi miền Bắc, hái trà trên mây, ruộng bậc thang, nước xanh ngọc), ý tưởng con đường chữ S cho lịch trình từ bản phác của mình, và chọn các phương án. Claude Code gợi ý tuyến Yên Bái, tên doanh nghiệp và hai khối mới, tra cứu số liệu trên mạng, soạn lịch trình, bảng màu, sườn trang, khung `content.json`, và viết hai tệp `docs/ke-hoach-thuong-hieu-bac-tra.md`, `docs/tom-tat-thuong-hieu-bac-tra.md`. | Mô tả sở thích về tour (núi, miền Bắc, thác xanh ngọc, ruộng bậc thang, hái trà trên mây), rồi nhờ đề xuất tên, lịch trình, hình ảnh và sườn trang | 782a1de |
