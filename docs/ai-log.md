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
| 08/10 | Claude Code (Claude Opus 5.5) | Soạn tài liệu Gành Sớm theo khuôn tài liệu Bậc Trà: bản tóm tắt và bản kế hoạch 10 mục trong `docs/brands/ganh-som/` | Tóm tắt dạng prompt: [docs/prompts/08-10-tai-lieu-ganh-som.md](prompts/08-10-tai-lieu-ganh-som.md) | 80ba2fc |
| 08/10 | Claude Code (Claude Opus 5.5) | Đổi `brand-b` thành `ganh-som` (#3): khung `content.json` theo sườn trang, `theme.css`, `brands.json`; tạo issue `room-view` (#31); điền bảng sườn trang trong #3; chạy thử bằng Chrome headless | Tóm tắt dạng prompt: [docs/prompts/08-10-dua-ganh-som-vao-repo.md](prompts/08-10-dua-ganh-som-vao-repo.md) | e505bb6 |
| 08/10 | Claude Code (Claude Opus 5.5) | Hero (#10): component `wl-hero`, kiểu `split`, hiệu ứng `sunrise`; ảnh hero và nội dung hero của Gành Sớm | Tóm tắt dạng prompt: [docs/prompts/08-10-hero.md](prompts/08-10-hero.md) | 5d7ca8e |
| 08/10 | Claude Code (Claude Opus 5.5) | Header và footer (#7): `wl-header` kiểu `solid`, `wl-footer` kiểu `compact`, dữ liệu Gành Sớm; gom hàm dựng thẻ vào `js/dom.js` | Tóm tắt dạng prompt: [docs/prompts/08-10-header-footer.md](prompts/08-10-header-footer.md) | 8e9c834 |

## Mị Nương

| Ngày | Công cụ | Việc nhờ AI làm | Prompt chính (hoặc tóm tắt) | Commit |
| ---- | ------- | --------------- | --------------------------- | ------ |
| 08/10 | Claude Code (Claude Opus 5.5) | Reset cho base.css (#4): box-sizing, bỏ margin mặc định, ảnh không tràn khung, ô nhập kế thừa font; `body` lấy nền, chữ, font từ biến | Tóm tắt dạng prompt: [docs/prompts/08-10-base-css.md](prompts/08-10-base-css.md) | 2e94722 |
| 08/10 | Claude Code (Claude Opus 5.5) | Phần còn lại của #4 trong base.css: kiểu chữ tiêu đề và liên kết, khung, khoảng cách section, lưới, nút `.btn`, `:focus-visible`, giảm chuyển động; Claude Code kiểm tra theo issue và AGENTS.md, sửa 3 biến chưa khai báo, màu liên kết có class, chú thích, chạy thử bằng Chrome headless | Tóm tắt dạng prompt: [docs/prompts/08-10-base-css.md](prompts/08-10-base-css.md) | 4e1ef31 |
| 08/10 | Claude Code (Claude Opus 5.5) | Đề xuất thương hiệu miền Tây "Mé Rạch" (#3): loại hình homestay nhà vườn, sản phẩm, chiến dịch, giá, màu, font, sườn trang với hai khối riêng `host` và `day-plan`, khung `content.json`; tự chọn tên và chỉnh thông tin | Tóm tắt dạng prompt và phần tự kiểm tra: [docs/prompts/08-10-me-rach.md](prompts/08-10-me-rach.md) | [comment #3](https://github.com/pnquynh-hoop/clauki-travel-webds26/issues/3#issuecomment-6052146644) |

## Như Quỳnh

| Ngày | Công cụ | Việc nhờ AI làm | Prompt chính (hoặc tóm tắt) | Commit |
| ---- | ------- | --------------- | --------------------------- | ------ |
| 07–08/10 | Claude Code (Claude Opus 5.5) | Dựng section từ `content.json` (#5): phần dựng section trong `core.js`, đăng ký component trong `app.js`, component mẫu `wl-intro`, bộ dữ liệu `brand-test`, cập nhật AGENTS.md | Tóm tắt dạng prompt và phần tự làm: [docs/prompts/07-10-dung-section.md](prompts/07-10-dung-section.md) | e61df46 |
| 08/10 | Claude Code (Claude Opus 5.5) | Đề xuất thương hiệu miền Bắc "Bậc Trà" (#3): tên, tour, lịch trình, chiến dịch, màu, font, sườn trang, khung `content.json`, tài liệu kế hoạch và bản tóm tắt đăng ở issue #3 | Tóm tắt dạng prompt và phần tự làm: [docs/prompts/08-10-bac-tra.md](prompts/08-10-bac-tra.md) | 782a1de, 4664d58, fd5fdb9, a7db6b7, [comment #3](https://github.com/pnquynh-hoop/clauki-travel-webds26/issues/3#issuecomment-6051395000) |
| 08/10 | Claude Code (Claude Opus 5.5) | Đổi `brands/brand-a` thành `brands/bac-tra` (#3): đổi tên thư mục, sửa `id` trong `content.json` và `brands.json`, chạy thử bằng Chrome headless | Đổi brand-a thành bac-tra, tôi đã nhận phần này với đội | 1b7c107 |
