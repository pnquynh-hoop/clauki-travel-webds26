# ClauKi - Web Design 2026

Landing page white label cho chủ đề **Du lịch & Dịch vụ lưu trú**. Bốn thương hiệu giả tưởng dùng chung
một mã nguồn; đổi thương hiệu chỉ là đổi dữ liệu, không sửa dòng mã nào.

HTML, CSS, JavaScript thuần: không framework, không bước build, không backend.

## Chạy

```bash
python3 serve.py
```

rồi mở http://localhost:5500. `serve.py` có file thì trả file, không có thì trả `index.html` (giống Cloudflare Pages),
để các trang con như `/ganh-som/phong` mở được; nó chỉ dùng trên máy, không deploy. `python3 -m http.server` và
Live Server chỉ mở được trang chủ. Nếu mở bằng cách nhấp đúp vào file, trình duyệt sẽ chặn việc đọc JSON.

Địa chỉ: `/<thương hiệu>/<trang>`, ví dụ `/ganh-som/`, `/brand-test/hoi-dap`; `/` là thương hiệu mặc định.
Đổi thương hiệu bằng nút tròn ở góc dưới trái (của BTC, trong `wd2026.js`): trang đang mở được giữ nguyên.

## Một component, nhiều cách hiển thị

Các thương hiệu dùng chung một bộ component `<wl-*>`. Cùng một component nhưng mỗi thương hiệu trông khác
nhau nhờ ba lớp, đều nằm ngoài mã nguồn:

1. **Kiểu trình bày (`variant`)** trong `content.json`: component gắn class `<khối>--<variant>`, CSS và JS của
   kiểu đó đổi bố cục, hiệu ứng. Ví dụ `hero` có `full`, `coverflow`, `stacked`, `haze`.
2. **Dữ liệu**: trường nào có thì hiện phần đó, thiếu thì bỏ. Ví dụ cả ba footer cùng kiểu `columns`, nhưng mỗi
   bên có ảnh nền, lời hẹn, dòng chữ chạy riêng; chỉ Bậc Trà bật `clouds` (mây trôi), chỉ Mé Rạch có
   `directions` (đường về vườn).
3. **Biến CSS** trong `theme.css`: màu, font, bo góc, và vài biến tuỳ chọn như `--color-tint` (màu tấm thông
   tin ở footer), `--font-hand` (chữ viết tay).

Muốn đổi cách một thương hiệu hiển thị thì sửa một trong ba chỗ trên, không sửa component. Ngược lại, sửa CSS
của một kiểu (ví dụ `.faq--chat`) là mọi thương hiệu dùng kiểu đó cùng đổi.

### Component dùng chung

| Component | Bậc Trà | Gành Sớm | Mé Rạch | SighGone |
| --------- | ------- | -------- | ------- | -------- |
| `header` (cố định) | `overlay`: trong suốt đè lên hero | `solid`: nền màu trang hơi trong | `center`: tên thương hiệu đứng giữa | `solid` |
| `hero` | `full`: ba lớp ảnh, mây vén khi cuộn | `coverflow`: chồng thẻ ảnh xoay vòng | `stacked`: chữ trên, ảnh tràn ngang; hiệu ứng `reveal` | `haze`: ảnh phủ sương, rê chuột thì tan |
| `booking` | `calendar`: ngày khởi hành, phiếu giữ chỗ | `stay`: ngày nhận, trả phòng, hạng nhà | `request`: giá theo khách, soạn tin nhắn giữ phòng | `calendar` |
| `faq` | `chat` | `chat` | `chat` | `chat` |
| `footer` (cố định) | `columns`, có mây | `columns` | `columns`, có đường về vườn | `columns`, dây điện, biển số nhà |
| `to-top` (cố định) | có | có | có | có |
| `reviews` | `postcard` | `postcard` | `postcard` | `postcard` |
| `gallery` | | `slices` | `slices` | `slices` |

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
| SighGone (tour trong ngày ở Sài Gòn) | `clock` | đồng hồ 24 giờ: giờ nào ăn gì, đi đâu, tour hợp giờ đó (trang `cam-nang`) |
| | `tips`, `policy` | thẻ mẹo có biểu đồ nhỏ; bảng chính sách huỷ (trang `cam-nang`, `hoi-dap`) |

Trường dữ liệu và kiểu trình bày của từng component ghi ở mục 12 của `AGENTS.md`.

## Cấu trúc

```
index.html              vỏ trang: không chứa chữ của thương hiệu nào
serve.py                chạy thử trên máy: trả index.html cho đường dẫn trang con (không deploy)
wd2026.js               thư viện đổi dữ liệu của BTC, giữ nguyên
css/
  base.css              reset, kiểu chữ, bố cục, responsive; chỉ dùng biến CSS
  components/           mỗi component một file; core.js chỉ tải file của khối trang đang dùng
  editor.css            editor "Thử chỉnh" (chỉ tải khi mở /<brand>/<trang>?sua)
  editor-launch.css     nút "Thử chỉnh" và dải báo nháp trên trang khách
js/
  core.js               chọn thương hiệu, gọi wd2026.js, đổi theme.css và meta, dựng các section
  app.js                bảng tra component <wl-*> (file JS, file CSS); tải khi trang cần
  dom.js                hàm nhỏ dựng thẻ HTML dùng chung cho các component
  components/           mỗi component một file: wl-<tên>.js
  editor/               editor "Thử chỉnh": editor.js (giao diện), draft.js (nháp trên máy), launch.js (nút vào),
                        manifest.js (khối, kiểu, trường), form.js, ops.js (thao tác sửa dữ liệu), contrast.js, preview.js
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
3. Mở `/<id>/`. Không cần sửa HTML, CSS quy tắc hay JavaScript.

Có thể nhờ AI viết `content.json` và `theme.css` bằng prompt mẫu ở
[docs/prompts/tao-thuong-hieu-moi.md](docs/prompts/tao-thuong-hieu-moi.md): prompt nói rõ khối nào dùng để nói ý
gì, kiểu nào hợp loại hình nào, và bắt AI ghi lý do chọn. Người chạy prompt tự tìm ảnh có giấy phép, kiểm tra
lại theo danh sách cuối file rồi ghi vào `docs/ai-log.md`.

## Quy ước

- Component không ghi cứng chữ, màu hay đường dẫn ảnh: mọi thứ lấy từ `content.json` và biến CSS.
- Trang và thứ tự section nằm trong `pages` (hoặc `sections` nếu chỉ có một trang) của `content.json`;
  `index.html` không liệt kê trang hay section. Thêm trang là thêm một mục trong `pages`, không thêm file HTML.
- Mỗi PR merge bằng squash, tiêu đề PR tiếng Anh theo Conventional Commits. Phần có dùng AI thì ghi rõ
  trong scope, ví dụ `feat(AI/hero): add split layout`, và nếu là việc làm ra sản phẩm thi thì thêm
  một dòng `PR #số` vào `docs/ai-log.md` ngay trong PR đó.

## Nguồn ảnh và thư viện

Tác giả và giấy phép của từng ảnh nằm trong `credits` của mỗi `content.json`, hiện ở chân trang.

`wd2026.js` do BTC cấp (lấy từ repo mẫu `konya007/demo-wd-26`), giữ nguyên, không sửa.

Icon: [Lucide](https://lucide.dev) 0.460.0 (giấy phép ISC), nạp từng icon qua CDN unpkg bằng `js/icon.js`, không tải cả bộ.
