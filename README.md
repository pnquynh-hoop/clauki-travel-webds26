# ClauKi - Web Design 2026

Landing page white label cho chủ đề **Du lịch & Dịch vụ lưu trú**. Ba thương hiệu giả tưởng dùng chung
một mã nguồn; đổi thương hiệu chỉ là đổi dữ liệu, không sửa dòng mã nào.

HTML, CSS, JavaScript thuần: không framework, không bước build, không backend.

## Chạy

Mở bằng **Live Server** của VS Code, hoặc:

```bash
python3 -m http.server 5500
```

Nếu mở bằng cách nhấp đúp vào file, trình duyệt sẽ chặn việc đọc JSON.

Đổi thương hiệu bằng nút tròn ở góc dưới trái (của BTC, trong `wd2026.js`), hoặc bằng tham số trên
địa chỉ: `index.html?brand=ganh-som`.

## Một component, nhiều cách hiển thị

Ba thương hiệu dùng chung một bộ component `<wl-*>`. Cùng một component nhưng mỗi thương hiệu trông khác
nhau nhờ ba lớp, đều nằm ngoài mã nguồn:

1. **Kiểu trình bày (`variant`)** trong `content.json`: component gắn class `<khối>--<variant>`, CSS và JS của
   kiểu đó đổi bố cục, hiệu ứng. Ví dụ `hero` có `full`, `coverflow`, `stacked`.
2. **Dữ liệu**: trường nào có thì hiện phần đó, thiếu thì bỏ. Ví dụ cả ba footer cùng kiểu `columns`, nhưng mỗi
   bên có ảnh nền, lời hẹn, dòng chữ chạy riêng; chỉ Bậc Trà bật `clouds` (mây trôi), chỉ Mé Rạch có
   `directions` (đường về vườn).
3. **Biến CSS** trong `theme.css`: màu, font, bo góc, và vài biến tuỳ chọn như `--color-tint` (màu tấm thông
   tin ở footer), `--font-hand` (chữ viết tay).

Muốn đổi cách một thương hiệu hiển thị thì sửa một trong ba chỗ trên, không sửa component. Ngược lại, sửa CSS
của một kiểu (ví dụ `.faq--chat`) là mọi thương hiệu dùng kiểu đó cùng đổi.

### Component dùng chung

| Component | Bậc Trà | Gành Sớm | Mé Rạch |
| --------- | ------- | -------- | ------- |
| `header` (cố định) | `overlay`: trong suốt đè lên hero | `solid`: nền màu trang hơi trong | `center`: tên thương hiệu đứng giữa |
| `hero` | `full`: ba lớp ảnh, mây vén khi cuộn | `coverflow`: chồng thẻ ảnh xoay vòng | `stacked`: chữ trên, ảnh tràn ngang; hiệu ứng `reveal` |
| `booking` | `calendar`: ngày khởi hành, phiếu giữ chỗ | `stay`: ngày nhận, trả phòng, hạng nhà | `request`: giá theo khách, soạn tin nhắn giữ phòng |
| `faq` | `chat` | `chat` | `chat` |
| `footer` (cố định) | `columns`, có mây | `columns` | `columns`, có đường về vườn |
| `to-top` (cố định) | có | có | có |
| `reviews` | `postcard` | `postcard` | `postcard` |
| `gallery` | | `slices` | `slices` |

Khối `faq`, `footer`, `reviews`, `gallery` dùng chung cả kiểu; chỗ khác nhau nằm ở dữ liệu và biến màu, font.

### Component đặc trưng riêng

| Thương hiệu | Component | Nội dung |
| ----------- | --------- | -------- |
| Bậc Trà (tour núi) | `journey` (`road`) | lịch trình con đường chữ S, xe chạy theo cuộn |
| | `process` (`morph`) | từ búp đến chén, hình đổi dáng qua từng bước |
| | `cloud-band` | dải mây che chỗ nối giữa hai khối |
| Gành Sớm (nghỉ dưỡng biển) | `stays` (`headland`) | ba hạng nhà trên mỏm gành, bấm mốc hiện cảnh nhìn ra |
| | `offer` (`postcard`) | bưu thiếp ưu đãi hè 2027, dấu bưu điện đếm ngược |
| Mé Rạch (homestay miệt vườn) | `host` (`tv`) | tivi đời cũ kể chuyện chủ nhà |
| | `day-plan` | một ngày ở vườn, xuồng trôi theo cuộn |

Trường dữ liệu và kiểu trình bày của từng component ghi ở mục 12 của `AGENTS.md`.

## Cấu trúc

```
index.html              vỏ trang: không chứa chữ của thương hiệu nào
wd2026.js               thư viện đổi dữ liệu của BTC, giữ nguyên
css/
  base.css              reset, kiểu chữ, bố cục, responsive; chỉ dùng biến CSS
  components.css        @import style của từng component
  components/           mỗi component một file
js/
  core.js               chọn thương hiệu, gọi wd2026.js, đổi theme.css và meta, dựng các section
  app.js                đăng ký các component <wl-*>
  dom.js                hàm nhỏ dựng thẻ HTML dùng chung cho các component
  components/           mỗi component một file: wl-<tên>.js
brands/
  brands.json           danh sách thương hiệu (id, tên hiện trong nút đổi dữ liệu) và thương hiệu mặc định
  <id>/content.json     nội dung, ảnh, bố cục (thứ tự, ẩn hiện, kiểu trình bày section)
  <id>/theme.css        màu, font, bo góc của thương hiệu (chỉ biến CSS)
  <id>/images/          ảnh của thương hiệu
docs/ai-log.md          nhật ký dùng AI
docs/prompts/           prompt đầy đủ của các lần dùng AI, link từ ai-log.md
```

## Thêm thương hiệu mới

1. Tạo thư mục `brands/<id>/` gồm `content.json`, `theme.css`, `images/`.
2. Thêm một dòng `{ "id": "<id>", "label": "<tên>" }` vào `brands/brands.json`.
3. Mở `index.html?brand=<id>`. Không cần sửa HTML, CSS quy tắc hay JavaScript.

Có thể nhờ AI viết `content.json` và `theme.css` bằng prompt mẫu ở
[docs/prompts/tao-thuong-hieu-moi.md](docs/prompts/tao-thuong-hieu-moi.md): prompt nói rõ khối nào dùng để nói ý
gì, kiểu nào hợp loại hình nào, và bắt AI ghi lý do chọn. Người chạy prompt tự tìm ảnh có giấy phép, kiểm tra
lại theo danh sách cuối file rồi ghi vào `docs/ai-log.md`.

## Quy ước

- Component không ghi cứng chữ, màu hay đường dẫn ảnh: mọi thứ lấy từ `content.json` và biến CSS.
- Thứ tự section nằm trong mảng `sections` của `content.json`; `index.html` không liệt kê section.
- Mỗi PR merge bằng squash, tiêu đề PR tiếng Anh theo Conventional Commits. Phần có dùng AI thì ghi rõ
  trong scope, ví dụ `feat(AI/hero): add split layout`, và thêm một dòng `PR #số` vào `docs/ai-log.md`
  ngay trong PR đó.

## Nguồn ảnh và thư viện

Tác giả và giấy phép của từng ảnh nằm trong `credits` của mỗi `content.json`, hiện ở chân trang.

`wd2026.js` do BTC cấp (lấy từ repo mẫu `konya007/demo-wd-26`), giữ nguyên, không sửa.
