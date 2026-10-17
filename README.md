# ClauKi - Web Design 2026

Website white label cho chủ đề **Du lịch & Dịch vụ lưu trú**: bốn thương hiệu giả tưởng chạy trên cùng một mã nguồn,
đổi thương hiệu chỉ là đổi dữ liệu. Thêm vào đó, ai cũng tự tạo được một website du lịch mới bằng lời (trình tạo web
`/tao`), chỉnh bằng editor ngay trên trang, rồi xuất bản thành `<tên>.xachbalo.com` kèm mã QR.

HTML, CSS, JavaScript thuần, Web Components `<wl-*>`. Không framework, không bước build, không backend tự viết.

- Web: https://clauki.xachbalo.com
- Trình tạo web: https://clauki.xachbalo.com/tao
- Ví dụ site khách tạo bằng `/tao`: https://mua-la-do.xachbalo.com

## Thử nhanh

| Muốn xem | Làm gì |
|---|---|
| White label | Bấm nút tròn bốn ô ở góc dưới trái, chọn **Đổi thương hiệu**. Trang đang mở được giữ nguyên nếu thương hiệu kia có trang đó. |
| Đổi kiểu một khối | Nút tròn, chọn **Chỉnh sửa** (hoặc thêm `?sua` vào địa chỉ). Chọn hero, đổi sang `full`, `haze`...: chữ, ảnh giữ nguyên, Hoàn tác được. |
| AI tạo website | Mở `/tao`, gõ một dòng mô tả (nơi chốn, loại hình, giá), bấm **Tinh chỉnh** rồi **Tạo**. Xem trước ngay bên cạnh trong lúc AI viết. |
| Xuất bản | Ở `/tao`, hoặc bấm **Xuất bản** ngay trong editor (cả khi đang sửa một thương hiệu có sẵn), đặt tên: ra link `<tên>.xachbalo.com` và mã QR để quét bằng điện thoại. |
| Đặt chỗ | SighGone `/sighgone/dat-tour` (quầy vé, máy in vé), Bậc Trà `/bac-tra/tour-moi` (lịch khởi hành), Gành Sớm `/ganh-som/dat-phong` (hạng phòng), Mé Rạch `/me-rach/` (giá theo khách). |

## Chạy trên máy

```bash
python3 serve.py
```

rồi mở http://localhost:5500. `serve.py` có file thì trả file, không có thì trả `index.html` (giống Cloudflare Pages), để
các trang con như `/ganh-som/nha` mở được; nó chỉ dùng trên máy, không deploy. `python3 -m http.server` và Live Server chỉ
mở được trang chủ; mở bằng cách nhấp đúp vào file thì trình duyệt chặn việc đọc JSON.

Địa chỉ: `/<thương hiệu>/<trang>`, ví dụ `/bac-tra/tour-moi`, `/sighgone/tour/can-gio`; `/` là thương hiệu mặc định
(SighGone, khai trong `brands/brands.json`).

## Bốn thương hiệu

| Thương hiệu | Loại hình | Trang | Đặt chỗ |
|---|---|---|---|
| **SighGone** (mặc định) | tour trong ngày ở Sài Gòn, đổi nhiều phương tiện | 18 trang: 7 trang tour, danh mục tour, tour riêng, đêm nay, cẩm nang, hỏi đáp, tuyến số 1, giới thiệu, liên hệ, 404; có bản tiếng Anh và chế độ tối | `ticket`: quầy vé chọn ghế, in vé |
| **Bậc Trà** | tour nhiều ngày Tây Bắc | 9 trang: 3 trang tour, tour mới 2027, chuẩn bị, giới thiệu, liên hệ, 404 | `calendar`: ngày khởi hành, phiếu giữ chỗ |
| **Gành Sớm** | nghỉ dưỡng biển nhiều hạng phòng | 7 trang: các hạng nhà và 3 trang chi tiết, ưu đãi, đặt phòng | `stay`: ngày nhận, trả phòng |
| **Mé Rạch** | homestay miệt vườn | landing page một trang | `request`: giá theo khách, soạn tin nhắn giữ phòng |

## White label hoạt động thế nào

1. `js/core/core.js` đọc thương hiệu và trang từ đường dẫn, để `wd2026.js` (của BTC) tải `brands/<id>/content.json`, rồi gắn
   `brands/<id>/theme.css`.
2. Trang là dữ liệu: `content.json` có `pages`, mỗi trang có `path`, `title` và danh sách `sections`. `index.html` không liệt
   kê trang hay khối nào; thêm trang là thêm một mục trong `pages`, không thêm file HTML.
3. Mỗi section thành một thẻ `<wl-<type>>`. `core.js` chỉ tải JS, CSS của những khối trang đang dùng, theo bảng `COMPONENTS`
   trong `js/core/app.js`.

Cùng một component mà mỗi thương hiệu trông khác nhau nhờ ba lớp, đều nằm ngoài mã nguồn:

1. **Kiểu trình bày (`variant`)** trong `content.json`: component gắn class `<khối>--<kiểu>`, CSS và JS của kiểu đó đổi bố
   cục, hiệu ứng. Ví dụ `hero` có `coverflow`, `full`, `stacked`, `haze`, `ride`.
2. **Dữ liệu**: trường nào có thì hiện phần đó, thiếu thì bỏ. Cả ba footer kiểu `columns` có ảnh nền, lời hẹn riêng; chỉ Bậc
   Trà bật `clouds` (mây trôi), chỉ Mé Rạch có `directions` (đường về vườn).
3. **Biến CSS** trong `theme.css`: màu, font, bo góc và vài biến tuỳ chọn (`--color-tint`, `--font-hand`). Khai thêm bảng màu
   tối (`--dark-*`) thì trang có nút sáng, tối.

Muốn đổi cách một thương hiệu hiển thị thì sửa một trong ba chỗ trên, không sửa component. Sửa CSS của một kiểu (ví dụ
`.faq--chat`) thì mọi thương hiệu dùng kiểu đó cùng đổi.

### Component dùng chung

| Component | Bậc Trà | Gành Sớm | Mé Rạch | SighGone |
|---|---|---|---|---|
| `header` | `overlay`: trong suốt đè lên hero | `solid` | `center`: tên đứng giữa | `solid` |
| `hero` | `coverflow`; trang tour mới `full` (mây vén khi cuộn); trang chuẩn bị `stacked` | `coverflow`: chồng thẻ ảnh xoay | `stacked`: chữ trên, ảnh tràn ngang | `haze`: ảnh phủ sương, rê chuột thì tan; trang tuyến số 1 `ride` |
| `booking` | `calendar` | `stay` | `request` | `ticket`; trang đêm nay `wall` (tờ lịch tháng) |
| `reviews` | `postcard` | `postcard` | `postcard` | `notes`: tường giấy note |
| `gallery` | mặc định | `slices` | `slices` | `plates`: ô biển số, ảnh loang theo con trỏ |
| `faq` | mặc định, `chat` | `chat` | `chat` | `chat` |
| `footer` | `columns`, có mây | `columns` | `columns`, có đường về vườn | `headline`: chữ bảng hiệu, dây điện, biển số nhà |

### Component đặc trưng

| Thương hiệu | Component | Nội dung |
|---|---|---|
| Bậc Trà | `journey` (`road`) | lịch trình con đường chữ S, xe chạy theo cuộn |
| | `process` (`morph`) | từ búp đến chén, hình đổi dáng qua từng bước |
| | `cloud-band` | dải mây che chỗ nối giữa hai khối |
| Gành Sớm | `stays` (`headland`) | ba hạng nhà trên mỏm gành, bấm mốc hiện cảnh nhìn ra |
| | `offer` (`postcard`) | bưu thiếp ưu đãi, dấu bưu điện đếm ngược |
| Mé Rạch | `host` (`tv`) | tivi đời cũ kể chuyện chủ nhà |
| | `day-plan` | một ngày ở vườn, xuồng trôi theo cuộn |
| SighGone | `timetable` (`board`) | bảng giờ chạy hôm nay kiểu nhà ga, chữ lật, trạng thái theo giờ thật |
| | `hero` (`ride`) | trang tuyến số 1: cuộn qua từng ga, thành phố trôi ngang, trời đổi từ chiều sang đêm |
| | `route` (`metro`) | hành trình chia chặng như sơ đồ metro, phương tiện đổi theo chặng |
| | `clock` | đồng hồ 24 giờ: giờ nào đi đâu, tour hợp giờ đó |
| | `tour-pick` (`reel`, `claw`) | gợi ý một tour: vòng quay, máy gắp |
| | `custom-trip` | khách tự ghép tour từ nhiều chặng |
| | `backdrop`, `tips`, `policy` | dải ảnh nền đứng yên; thẻ mẹo; bảng chính sách huỷ |

Đủ 37 khối, cách tổ chức thư mục và khi nào thêm kiểu hay thêm khối mới: [components/README.md](components/README.md).
Trường dữ liệu của từng khối: mục 12 của [AGENTS.md](AGENTS.md).

## Editor "Thử chỉnh"

Mở bằng nút tròn, mục **Chỉnh sửa**, hoặc thêm `?sua` vào địa chỉ. Trang thật chạy trong khung xem trước (điện thoại 390,
máy tính bảng 768, laptop 1440), bảng chỉnh bên phải có sáu tab:

- **Khối**: mỗi dòng có nút dời lên xuống, tạo bản sao, ẩn, xoá (xoá hỏi xác nhận trước); bấm khối trên trang hay trong
  danh sách để đổi kiểu, sửa chữ và ảnh (form sinh theo `js/editor/manifest.js`), thêm khối mới; khối Đầu trang có kéo thả
  thứ tự menu.
- **English**: thêm bản tiếng Anh do AI dịch, sửa từng câu.
- **Thương hiệu**: thông tin (tên, khẩu hiệu, nút chính, liên hệ), logo, font và bo góc, màu (công tắc bật tắt chế độ tối,
  xem trước sáng, tối, nhờ AI gợi ý phối màu bằng lời hoặc tự chỉnh, có kiểm tương phản WCAG).
- **Trang**: mở từng trang, thêm trang mới (trống hoặc chép từ trang đang mở).
- **Danh mục**: sửa tour, phòng một lần, mọi khối dùng danh mục cùng đổi.
- **AI**: sửa website bằng lời (gõ hoặc nói); AI trả về các thao tác nhỏ, hiện dạng "trước, sau", bấm Đồng ý mới áp.

Sửa trên thương hiệu có sẵn chỉ lưu nháp trên trình duyệt: có dải báo "chưa lưu vào repo", nút Về bản gốc và Tải content.json.

## Trình tạo web `/tao`

1. **Đọc mô tả**: AI lập hồ sơ (tên, khẩu hiệu, nơi chốn, giá, giọng văn) và chọn một trong bốn thương hiệu làm khung theo
   loại hình: homestay, nghỉ dưỡng nhiều hạng phòng, tour nhiều ngày, tour trong ngày. Đề ngoài chủ đề du lịch thì từ chối.
2. **Chọn khung, màu, chữ**: bảng màu theo nơi chốn (kiểm tương phản), font.
3. **Ghép bố cục**: trộn khối chung từ nhiều khung; khối đặc trưng chỉ dùng khi hợp nơi chốn (`js/create/rules.js`).
4. **Viết chữ**: mọi chữ của khung là dữ liệu, chia nhóm cho AI viết lại song song; code kiểm từng dòng, dòng chép y chữ cũ hay
   còn tên nơi cũ thì gửi lại.
5. **Tìm ảnh thật**: Wikimedia Commons (hoặc Unsplash nếu dán khoá), AI loại ảnh lạc đề, ghi nguồn ở chân trang.
6. **Dịch tiếng Anh** (tuỳ chọn), rồi **Xuất bản**.

Mỗi bước hiện thời gian và model Gemini đã dùng. Bản nháp trước khi xuất bản nằm ở `/nhap/`. Site xuất bản lưu trên Supabase
và **cố định**: ai cũng xem và tạo bản sao được, chỉ máy demo của đội (có khoá riêng, không nằm trong repo) sửa được trang đã
xuất bản.

## AI

- Gemini gọi thẳng từ trình duyệt (`js/ai/gemini.js`), model chính `gemini-3.5-flash-lite`, dự phòng `gemini-3.1-flash-lite`.
  Thứ tự: hai khoá dự phòng của thành viên, rồi Firebase AI Logic (gói Spark miễn phí); đường nào hết lượt thì nghỉ một phút,
  máy chủ bận thì thử lại rồi chuyển đường.
- Mọi lời nhắc gửi Gemini nằm ở `js/ai/prompts/`: sửa câu chữ ở đây, không đụng logic.
- Nhật ký dùng AI khi làm sản phẩm: [docs/ai-log.md](docs/ai-log.md), prompt đầy đủ ở `docs/prompts/`. Commit có dùng AI ghi
  `AI/` trong scope, ví dụ `feat(AI/hero): ...`.

## Cấu trúc

```
index.html              vỏ trang, không chứa chữ của thương hiệu nào
wd2026.js               thư viện đổi dữ liệu của BTC, giữ nguyên
_headers                Cloudflare Pages: tắt cache dài để bản mới hiện ngay sau deploy
serve.py                chạy thử trên máy (không deploy)
brands/
  brands.json           danh sách thương hiệu và thương hiệu mặc định
  <id>/content.json     nội dung, trang, bố cục, danh mục, nguồn ảnh (credits)
  <id>/content.en.json  bản tiếng Anh (SighGone)
  <id>/theme.css        màu, font, bo góc (chỉ biến CSS)
  <id>/images/          ảnh có giấy phép
components/<tên>/       mỗi khối một thư mục: wl-<tên>.js, <tên>.css, file kiểu lớn (hero-ride.*), images/
  shared/, effects/     file nhiều khối dùng chung; hiệu ứng (lightbox, parallax, pin-scroll)
css/
  site/                 CSS của trang theo biến thương hiệu: base.css, theme-mode.css (chế độ tối)
  tool/                 CSS của công cụ, màu cố định: editor, tao, editor-launch, share, no-site
js/
  core/                 lõi: app.js (bảng component), core.js (thương hiệu, trang, dựng section), dom.js, icon.js,
                        i18n.js và i18n-text.js (song ngữ), theme-mode.js (sáng, tối)
  site/                 site khách: sites.js (nháp, xuất bản, Supabase, link tên miền con), share.js (mã QR, chia sẻ),
                        publish.js (các bước xuất bản dùng chung cho /tao và nút Xuất bản của editor)
  editor/               editor: editor.js, form.js, manifest.js, ops.js (thao tác sửa dùng chung cho tay và AI), ai.js,
                        palette.js, english.js, draft.js, launch.js (nút tròn và menu), preview.js, logo.js...
  create/               trình tạo web: create.js (giao diện), generate.js (AI viết website), mix.js (ghép khối),
                        rules.js (luật khối đặc trưng), photos.js (ảnh thật), progress.js, english.js
  ai/                   gemini.js, speech.js (nói thay gõ), translate.js, prompts/
supabase/sites.sql      bảng sites và luật RLS cho site khách
docs/                   ai-log.md, prompts/, tài liệu thương hiệu
```

## Triển khai

- **Cloudflare Pages**, nhánh `main`. Lệnh build chỉ chép các thư mục cần chạy:
  `mkdir -p dist && cp -r index.html _headers wd2026.js css js brands components dist/`, thư mục ra `dist`. Thêm thư mục mới ở
  gốc repo thì phải thêm vào lệnh này. Mỗi PR có link xem trước `<mã>.clauki-web.pages.dev`.
- **Tên miền con**: bản ghi DNS `*` cùng một Redirect Rule chuyển `<tên>.xachbalo.com/<trang>` về
  `clauki.xachbalo.com/s/<tên>/<trang>`; `core.js` đổi địa chỉ trên thanh thành `/<tên>/<trang>`.
- **Supabase**: chạy `supabase/sites.sql` trong SQL Editor. Ai cũng thêm và đọc site, không ai xoá; chỉ request có header
  `x-demo-key` đúng mới sửa được (so mã băm SHA-256 lưu trong bảng riêng). Database còn chặn tên dành riêng, địa chỉ ngoài
  danh sách cho phép và JSON quá 400 KB.

## Thêm thương hiệu mới

1. Tạo `brands/<id>/` gồm `content.json`, `theme.css`, `images/`.
2. Thêm `{ "id": "<id>", "label": "<tên>" }` vào `brands/brands.json`.
3. Mở `/<id>/`. Không sửa HTML, CSS quy tắc hay JavaScript.

Có thể nhờ AI viết `content.json`, `theme.css` bằng prompt mẫu ở
[docs/prompts/tao-thuong-hieu-moi.md](docs/prompts/tao-thuong-hieu-moi.md).

## Quy ước

- Component không ghi cứng chữ, màu hay đường dẫn ảnh: mọi thứ lấy từ `content.json` và biến CSS.
- Mỗi PR merge bằng squash, tiêu đề tiếng Anh theo Conventional Commits; phần có dùng AI ghi `AI/` trong scope và thêm một dòng
  `PR #số` vào `docs/ai-log.md` ngay trong PR đó.
- Luật thi, luồng dữ liệu, quy ước CSS, JS, ảnh và git: [AGENTS.md](AGENTS.md).

## Nguồn ảnh và thư viện

- Tác giả và giấy phép từng ảnh nằm trong `credits` của mỗi `content.json`, hiện ở chân trang. Site tạo ở `/tao` ghi nguồn ảnh
  Wikimedia Commons, Unsplash theo cách tương tự.
- `wd2026.js` do BTC cấp (repo mẫu `konya007/demo-wd-26`), giữ nguyên.
- Icon: [Lucide](https://lucide.dev) 0.460.0 (ISC), nạp từng icon qua unpkg bằng `js/core/icon.js`.
- Mã QR: [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 1.4.4 (MIT), nạp từ cdnjs khi cần.
- AI: [Firebase JS SDK](https://github.com/firebase/firebase-js-sdk) 13.0.0 (Apache 2.0), nạp từ `www.gstatic.com` khi gọi AI.
- Mã nguồn: giấy phép MIT ([LICENSE](LICENSE)).
