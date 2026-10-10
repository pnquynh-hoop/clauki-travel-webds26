# Quy tắc dự án — dành cho trợ lý AI và cả đội

Dự án thi **Web Design 2026** (CLB MPC, ĐH Mở TP.HCM) của đội **ClauKi**: landing page white label,
chủ đề **Du lịch & Dịch vụ lưu trú**, ba thương hiệu giả tưởng dùng chung một mã nguồn.
Trả lời người dùng bằng tiếng Việt.

Mốc thời gian: **push mã vòng loại trước 13h ngày 11/10/2026**. Chấm trực tiếp lúc 14h cùng ngày,
trên máy của đội. Chung kết ngày 18/10 cần website 3–5 trang có chứa landing page.

## 1. Luật thi (vi phạm bị trừ điểm hoặc bị loại)

| Không được | Hậu quả |
|---|---|
| Dùng framework (React, Vue, Angular, Svelte…) hoặc UI kit (Bootstrap, DaisyUI, Tailwind UI, Flowbite, MUI…) | trừ 20%; dựng toàn bộ bằng UI kit thì bị loại |
| Dùng bước build hoặc công cụ biên dịch (Node, npm, Vite, Webpack, Sass, TypeScript), backend tự viết | vi phạm luật công nghệ |
| Dùng tên, logo, sản phẩm của thương hiệu có thật | trừ 10% |
| Sao chép quá 60% giao diện hoặc mã của đội khác, của dự án có sẵn, **kể cả repo mẫu `konya007/demo-wd-26`** | bị loại |
| Dùng tài nguyên lậu, ảnh hoặc thư viện không rõ giấy phép | cảnh cáo, tái phạm bị trừ điểm |
| Nộp mã mà thành viên không giải thích được | phần đó không được tính; từ 2/3 đoạn bị hỏi trở lên thì tiêu chí AI 0 điểm |
| Báo cáo dùng AI không khớp lịch sử commit | trừ 15% |
| Có thành viên không có commit vào mã nguồn | mất toàn bộ điểm teamwork |

**Được dùng:**
- thư viện chỉ cung cấp công cụ, nhúng qua CDN (GSAP, AOS, Anime.js, Lucide, Three.js, Chart.js…);
- Tailwind CSS bản gốc, chỉ lớp tiện ích;
- Google Fonts;
- API gọi từ trình duyệt (kể cả API AI).

Khi chưa chắc một thư viện có hợp lệ không: **không tự quyết**, báo người dùng để hỏi BTC.

## 2. Cấu trúc và phân công

| Phần | Tệp | Người phụ trách |
|---|---|---|
| Lõi white label | `index.html`, `js/core.js`, `js/app.js`, `brands/brands.json`, `wl-header`, `wl-footer`, `wl-sticky-cta` | TV1 (điền tên) |
| Giao diện | `css/base.css`, `wl-hero`, `wl-card`, các khối lợi ích, `wl-gallery`, hiệu ứng | TV2 (điền tên) |
| Thương hiệu & trải nghiệm | `brands/<id>/*`, `wl-journey`, `wl-booking`, `wl-faq`, `docs/` | TV3 (điền tên) |

- Mỗi component gồm hai tệp: `js/components/wl-<tên>.js` và `css/components/<tên>.css`.
- **Chỉ sửa tệp thuộc phần của người đang nhờ.** Cần sửa tệp của người khác thì dừng lại và báo.

## 3. Luồng dữ liệu (hợp đồng chung, đổi phải báo cả đội)

1. `index.html` là vỏ. Nó chỉ chứa `<wl-header>`, `<main id="main">` rỗng, `<wl-footer>`, `<wl-sticky-cta>`, `<wl-to-top>`, không có chữ của thương hiệu nào.
2. `app.js` import mọi component, gọi `customElements.define('wl-<tên>', Lớp)`, rồi gọi `start()` của `core.js`.
3. `core.js`:
   - đọc `brands/brands.json`; nếu địa chỉ có `?brand=` thì chỉ nhận id có trong danh sách (không có thì dùng `default`);
   - gọi `WebDesign2026.init`: `wd2026.js` tải `brands/<id>/content.json`, nhớ lựa chọn sau F5 và hiện nút tròn để BGK đổi thương hiệu (BTC đặt ở góc dưới phải; `base.css` chuyển sang góc dưới trái và cho luôn hiện);
   - mỗi lần có sự kiện `webdesign2026:datachange`: đổi `href` của `<link id="brand-theme">` thành `brands/<id>/theme.css`, điền `title`, `description`, `favicon`, cập nhật `?brand=` trên địa chỉ;
   - sau đó dựng section: với mỗi phần tử trong `sections`, bỏ qua phần tử có `"hidden": true`, tạo `<wl-<type>>`, gán `el.site` rồi gán `el.data`, gắn vào `<main>` theo đúng thứ tự mảng;
   - `type` chưa có component đăng ký thì bỏ qua khối đó và cảnh báo trong console, không làm sập trang;
   - `id` của section được gán làm `id` của thẻ, để menu và nút CTA (`"href": "#dat-tour"`) nhảy tới được;
   - `el.site` gồm `brand`, `cta`, `nav`, `place` (nơi chốn, toạ độ, múi giờ), `contact` (điện thoại, email, địa chỉ); thương hiệu nào thiếu khoá nào thì khoá đó là `undefined`; `<main>` được thay toàn bộ bằng `replaceChildren`, nên đổi thương hiệu không bị nhân đôi khối.
4. Các component cố định (header, footer, sticky-cta, to-top) cũng nhận `el.site` như vậy, nhưng `el.data` là toàn bộ `content.json`; thẻ nào chưa có component thì bỏ qua.
5. `core.js` export hàm `asset(path)` để đổi đường dẫn ảnh trong JSON (tính từ thư mục thương hiệu) thành đường dẫn thật.

**`wd2026.js` do BTC cấp:** đặt nguyên ở thư mục gốc, **không sửa**.
- Đổi thương hiệu bằng nút của BTC **không tải lại trang**: component có thể nhận `data` mới nhiều lần, mỗi lần phải dựng lại từ đầu (`replaceChildren`), không cộng dồn phần tử hay listener.
- `id` trong `content.json` phải trùng tên thư mục thương hiệu, vì `core.js` dùng nó để chọn `theme.css`.
- Góc dưới trái là chỗ của nút tròn (đội đã chuyển từ góc dưới phải sang bằng CSS trong `base.css`): không đặt thành phần `position: fixed` đè lên góc đó.

## 4. Component

```js
// js/components/wl-hero.js
import { asset } from '../core.js';

export class WlHero extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  render() {
    const s = this._data;
    this.className = `hero hero--${s.variant ?? 'split'}`;
    // dựng DOM bằng createElement + textContent, rồi this.replaceChildren(...)
  }
}
```

- **Ví dụ đầy đủ:** `js/components/wl-intro.js` và `css/components/intro.css`.
- **Đăng ký trong `app.js`, đặt trước dòng `start()`:** import lớp rồi `customElements.define('wl-<tên>', Lớp)`. Phải đăng ký trước khi `core.js` tạo khối: chưa đăng ký thì `core.js` bỏ qua khối đó.
- **Light DOM**, không dùng Shadow DOM, để biến CSS và `css/components/*.css` áp vào được.
- **Không ghi cứng** chữ, màu, font, đường dẫn ảnh. Chữ và ảnh lấy từ dữ liệu; màu và font chỉ dùng biến CSS.
- **Chèn chữ bằng `textContent`.** Không ghép dữ liệu vào `innerHTML`.
- **Kiểu trình bày:** `variant` thành class `<tên>--<variant>`, CSS lo phần bố cục; chỉ rẽ nhánh JS khi cấu trúc HTML thật sự khác.
- **Đặt tên theo chức năng, không theo thương hiệu:** `wl-route-profile`, không phải `wl-brand-a-special`. Một component có thể chỉ một thương hiệu dùng, nhưng phải chạy đúng với mọi thương hiệu: thêm nó vào `sections` của thương hiệu khác thì vẫn hiện đúng, theo màu và font của thương hiệu đó. Không bao giờ viết `if (id === 'brand-a')`.
- **Nút kêu gọi hành động:** luôn lấy `el.site.cta`, để cả trang dùng một CTA nhất quán (yêu cầu của BTC).
- **Thiếu trường tuỳ chọn thì bỏ qua phần đó, không được lỗi.** Phải chịu được chữ dài ngắn khác nhau và số mục khác nhau.
- **Dùng thẻ đúng nghĩa:**
  - mỗi section một `h2`, chỉ hero có `h1`;
  - `button` cho hành động, `a` cho liên kết;
  - ảnh có `alt` lấy từ JSON;
  - có viền focus khi dùng bàn phím;
  - tôn trọng `prefers-reduced-motion`.

## 5. Dữ liệu thương hiệu

**`brands/<id>/content.json`**
```json
{
  "id": "brand-a",
  "meta": { "title": "", "description": "", "favicon": "images/logo.svg" },
  "brand": { "name": "", "logo": "images/logo.svg", "slogan": "" },
  "cta": { "label": "Đặt tour", "href": "#dat-tour" },
  "nav": [{ "label": "", "href": "#..." }],
  "sections": [
    { "type": "hero", "id": "gioi-thieu", "variant": "split", "hidden": false, "title": "", "lead": "",
      "image": { "src": "images/hero.jpg", "alt": "" } }
  ],
  "footer": {},
  "credits": [{ "file": "images/hero.jpg", "author": "", "license": "CC0", "source": "https://..." }]
}
```
- **Trường chung của mọi section:** `type` (bắt buộc, trùng tên component), `id` (neo cho menu), `variant`, `hidden`, `eyebrow`, `title`, `lead`. Các trường riêng do người viết component quy định, và phải ghi vào bảng ở cuối tệp này.
- **Ảnh** luôn là object `{ "src", "alt" }`, đường dẫn tính từ thư mục thương hiệu.
- **Chữ:** chữ thường, không chứa HTML. Ít chữ: tiêu đề ngắn, mỗi đoạn tối đa khoảng 2 câu.
- **Mỗi thương hiệu một sườn trang riêng**, không chỉ đổi màu và chữ:
  - phần dùng chung (header, hero, đặt chỗ) chọn `variant` khác nhau giữa các thương hiệu; footer có thể dùng chung kiểu nhưng ảnh, lời hẹn, chữ chạy phải riêng;
  - mỗi thương hiệu có ít nhất 2 section mà hai thương hiệu kia không dùng, gắn với loại hình của nó;
  - thương hiệu nào dùng section nào ghi ở cột "Thương hiệu dùng" trong bảng mục 12.

**`brands/brand-test/`: bộ dữ liệu chung của cả đội khi phát triển** (công ty tour núi giả tưởng "Lối Mây"), có đủ các loại section dự kiến.
- Viết component mới thì thử trên `?brand=brand-test` trước. Tên trường riêng trong brand-test chỉ là đề xuất: người viết component đặt tên khác thì sửa brand-test cho khớp.
- Không nộp cho BGK: gỡ khỏi `brands/brands.json` trước khi nộp (xem mục 11).

**`brands/<id>/theme.css`**
- chỉ có `@import` Google Fonts (nếu cần) và một khối `:root { }`;
- không viết bộ chọn nào khác.

**Biến CSS bắt buộc:**
- `--color-primary`, `--color-on-primary`, `--color-bg`, `--color-surface`, `--color-ink`, `--color-muted`, `--color-accent`;
- `--font-heading`, `--font-body`;
- `--radius`.

**Biến CSS tuỳ chọn:** `--color-tint` (nền phụ cho khối cần nổi khỏi nền trang, ví dụ tấm thông tin ở footer kiểu `columns`); thương hiệu không khai báo thì `base.css` pha sẵn từ `--color-primary` và `--color-bg`. `--font-hand` (chữ viết tay: lời nhắn bưu thiếp ở offer, dòng sau của lời hẹn ở footer), `--footer-top`, `--footer-gap` (khoảng trên lời hẹn và khoảng giữa lời hẹn, chữ chạy, tấm thông tin ở footer): không khai báo thì component dùng giá trị sẵn có.

**Màu nào được làm màu chữ:** `--color-primary` có thể là màu sáng chỉ hợp làm nền nút, nên không dùng làm màu chữ trên nền trang. Chữ cần màu thương hiệu (liên kết, nhãn nhỏ, chữ của nút viền) dùng `--color-accent`. Vì vậy mỗi thương hiệu phải chọn `--color-accent` đạt tương phản AA (từ 4,5) trên `--color-bg`.

## 6. CSS

- `base.css` khai báo giá trị mặc định của mọi biến; style component chỉ đọc biến (được dùng `color-mix()` với biến).
- Thiết kế cho điện thoại trước. Điểm ngắt: `760px` và `1024px`. Đơn vị: `rem`; dùng `clamp()` cho cỡ chữ lớn.
- Đặt tên kiểu BEM: `.hero`, `.hero__title`, `.hero--split`. Không dùng `!important`, không style theo id.
- Thẻ tự đặt tên như `<wl-hero>` mặc định là inline: class gốc của component phải có `display: block`, nếu không `padding` và `max-width` không có tác dụng.

## 7. JavaScript

- ES module, `const` và `let`, không dùng `var`, không tạo biến toàn cục.
- Thụt 2 dấu cách, dấu chấm phẩy cuối câu, nháy đơn. Hàm ngắn, mỗi hàm một việc.
- Chú thích bằng tiếng Việt, giải thích **vì sao** chứ không kể lại mã làm gì.
- `fetch` phải bắt lỗi. Mở bằng `file://` thì hiện thông báo hướng dẫn chạy bằng Live Server.
- Không thêm `package.json`, không cài gói npm. Thư viện ngoài nhúng qua CDN, ghi rõ số phiên bản trong URL, và ghi vào README kèm giấy phép.

## 8. Ảnh và nội dung

- **Ảnh là chủ đạo** ("ít chữ, hình ảnh là chủ đạo"). Dùng ảnh chụp thật, không dùng hình minh hoạ thay ảnh.
- **Giấy phép:** chỉ CC0, phạm vi công cộng, CC BY, CC BY-SA, hoặc giấy phép Unsplash/Pexels. Không dùng ảnh NC hay ND. Mỗi ảnh phải có một dòng trong `credits`.
- **Không có logo, biển hiệu thương hiệu thật** trong ảnh.
- **Kích thước:** ảnh rộng tối đa 2000px, JPEG hoặc WebP, nên dưới 300KB.
- **Thông tin liên hệ đều giả:** số điện thoại kiểu `0123 456 789`, email đuôi `.clauki` (không phải tên miền thật, đã đối chiếu danh sách của IANA), ví dụ `dat-phong@ganhsom.clauki`.

**Icon:** quy định của BTC coi "icon 3D bóng bẩy vô nghĩa" là AI slop.
- Không dùng icon chỉ để trang trí; mỗi icon phải giúp hiểu nhanh hơn chữ.
- Không dùng emoji làm icon, không đặt icon trước mỗi tiêu đề hay mỗi thẻ.
- Cần icon thì dùng một bộ duy nhất cho cả trang (ví dụ Lucide), nét đồng đều, màu lấy từ biến CSS.
- Icon đứng một mình (không kèm chữ) phải có `aria-label`.

## 9. Git

- Commit theo Conventional Commits, viết tiếng Việt: `feat(hero): thêm kiểu trình bày split`.
- **Phần do AI viết phải có `AI/` trong scope:** `feat(AI/hero): …`, đồng thời thêm một dòng vào bảng của mình trong `docs/ai-log.md`.
- `git pull --rebase` trước khi push. Không `push --force` lên `main`.
- Commit nhỏ, mỗi commit một việc. Không commit khoá API hay bí mật.
- **Trợ lý AI không tự commit hay push.** Chỉ đề xuất nội dung commit để người dùng tự chạy.
- **Commit message và mô tả PR không có trailer AI:**
  - không có `Co-Authored-By: Claude …`, `Co-authored-by: Copilot …`;
  - không có dòng "Generated with …".

  Việc dùng AI đã được ghi bằng `AI/` trong scope và trong `docs/ai-log.md`.

## 10. Cách trợ lý AI làm việc trong dự án này

- **Làm từng bước nhỏ, đúng phần được nhờ.** Không viết cả tính năng lớn trong một lần, không sửa lan sang tệp khác.
- **Viết xong thì giải thích ngắn gọn** đoạn mã làm gì và vì sao, đủ để người dùng tự trình bày lại khi vấn đáp.
- **Ưu tiên cách đơn giản, dễ giải thích** hơn cách thông minh.
- **Không dùng emoji hay ký hiệu trang trí** (dấu tích, tên lửa, lấp lánh, mũi tên…) trong mã, chú thích, commit message, tài liệu và câu trả lời. Viết bằng chữ.
- **Không bịa luật thi.** Không chắc thì nói không chắc và đề nghị hỏi BTC.
- **Không chép mã** từ repo mẫu của BTC hay của đội khác.
- **Kết thúc mỗi phần việc:** đề xuất commit message có `AI/` và nhắc ghi `docs/ai-log.md`.

## 11. Trước khi push: tự kiểm

- [ ] Chạy bằng Live Server hoặc `python3 -m http.server`, không có lỗi trong console.
- [ ] `?brand=bac-tra`, `ganh-som`, `me-rach` đều ra trang đúng; đổi qua lại bằng nút tròn của BTC cũng đúng, không cần F5.
- [ ] Đổi màu chủ đạo ở `theme.css`: toàn trang đổi theo.
- [ ] Đổi thứ tự hai section trong `content.json`: trang đổi theo.
- [ ] Thêm một thương hiệu mới chỉ bằng dữ liệu, không sửa mã: vẫn ra trang.
- [ ] Thêm section dùng riêng của thương hiệu này vào `content.json` của thương hiệu khác: vẫn hiện đúng, theo màu và font của thương hiệu đó.
- [ ] Hiển thị đúng ở bề ngang 390px và 1440px.
- [ ] Ảnh mới có `alt` và có dòng trong `credits`.
- [ ] Người viết giải thích được từng dòng mình vừa thêm.
- [ ] Bản nộp vòng loại: đã gỡ `brand-test` khỏi `brands/brands.json`, nút đổi thương hiệu chỉ còn 3 thương hiệu thật.

## 12. Trường riêng của từng section

Mỗi người thêm một dòng khi tạo component mới.

| type | Kiểu trình bày (`variant`) | Trường riêng | Thương hiệu dùng | Người viết |
|---|---|---|---|---|
| `intro` | mặc định căn trái; `center`: căn giữa, khối hẹp hơn | không có, chỉ dùng `eyebrow`, `title`, `lead` | dùng chung | Như Quỳnh |
| `journey` | `road`: các trạm dọc con đường chữ S, xe chạy theo cuộn; trời đổi theo giờ ghi trong `time`, sau trạm có `night` thì trời tối; đồng hồ độ cao bên cạnh; nền có ba dải núi ở đáy màn hình, chìm dần khi xe lên cao, trạm cao nhất có biển mây. Điện thoại đường sát mép trái, từ 760px thẻ xen kẽ hai bên. Trạm có `plan`: rê chuột vào ảnh (hoặc bấm nút trên ảnh) thì các đám mây bay sang cột trống bên kia đường, mỗi đám một mốc giờ; điện thoại thì mây xếp dưới thẻ. Hình mây là ảnh mặt nạ trong `css/components/journey/` | `stops[]`: `time` (có giờ dạng 05:00), `title`, `text`, `image`; tuỳ chọn `altitude` (số mét), `night` (nơi ngủ đêm đó), `plan[]` (các mốc giờ ở trạm: `time`, `text`, tuỳ chọn `image`, `kind` là `night` cho chỗ ngủ hoặc `tip` cho đồ nên mang, `link` gồm `label`, `href` để dẫn sang khối khác; khối đó không có trên trang thì liên kết tự ẩn). Tuỳ chọn ở khối: `days[]` (`title`, `text`; hiện ở cột đồng hồ, sang ngày mới sau mỗi trạm có `night`; bấm vào một ngày thì cuộn tới trạm đầu ngày đó, xe dừng đúng chấm trạm), `note` (ghi chú nhỏ dưới đồng hồ, ví dụ nguồn độ cao), `planLabel` (chữ của nút mở mây, ví dụ "Ở đây làm gì?"; thiếu thì không hiện mây), `finish` (ô cuối con đường: `eyebrow`, `title`, `text`; nút trong ô lấy từ `cta` chung; có ô thì đường dừng ở mép trên của ô) | Bậc Trà | Như Quỳnh |
| `header` (khối cố định) | `solid` (mặc định): nền màu trang hơi trong, logo (`brand.logo`; điện thoại chỉ hiện phần dấu hình ở đầu logo, nên logo đặt dấu hình bên trái) hoặc tên thương hiệu in hoa đậm giãn rộng, nút CTA nhỏ hiện cả trên điện thoại cạnh nút Menu; cuộn xuống thì hiện đường kẻ dưới; dòng thông tin nhỏ phía trên chỉ hiện khi có `note`; `center`: tên thương hiệu in hoa giãn rộng đứng giữa (lưới ba cột `1fr auto 1fr`), điện thoại nút Menu bên trái và nút CTA bên phải, màn rộng menu căn giữa ở hàng dưới ngăn bằng đường kẻ mảnh; `overlay`: ghim ở mép trên và không chiếm chỗ, nên nằm đè lên khối đầu tiên của trang (hợp với hero `full`; hero kiểu khác thì phần trên cùng của hero nằm dưới header); trong suốt ở đầu trang, cuộn xuống hoặc mở menu thì có nền màu trang hơi trong và đường kẻ dưới; có `note` thì cuộn xuống dải thông tin trượt khuất; điện thoại một hàng gồm logo, nút CTA, nút Menu, tên dài thì cắt bằng dấu ba chấm; các kiểu khác người phụ trách thương hiệu tự thêm; có logo thì tên thương hiệu vẫn nằm cạnh logo dưới dạng chữ (ảnh `alt` rỗng): mặc định ẩn khỏi mắt, chỉ trình đọc màn hình đọc; kiểu `center` hiện cả logo lẫn tên | khoá `header` ngoài `sections`: `variant`, `note` (dòng thông tin), `menu` (chữ trên nút menu điện thoại); số điện thoại lấy từ `contact.phone` | chung: Bậc Trà `overlay`, Gành Sớm `solid`, Mé Rạch `center` | Gia Huy; Như Quỳnh |
| `footer` (khối cố định) | `columns` (mặc định): nền phụ (`--color-tint`), chữ màu mực; bên trái là khẩu hiệu chữ lớn (tên thương hiệu ẩn khi có ảnh), nút giữ chỗ lớn (`site.cta`, dưới nút là `cta.note`) bo tròn hai đầu, chữ font tiêu đề không xuống dòng, cứ vài giây có vệt sáng lướt qua, rê chuột thì nhô lên và hiện viền mảnh tách khỏi nút; bên phải các cột menu, liên hệ, địa chỉ rộng theo chữ của mình, hết chỗ thì cả cột xuống hàng (không cắt chữ); dưới cùng là ghi chú và nguồn ảnh gập sẵn; có `image` hoặc `title` thì ở mọi kiểu: ảnh phủ kín footer, trôi chậm hơn trang khi cuộn, lời hẹn chữ lớn màu sáng trên ảnh, phần thông tin nằm trên một tấm đè lên phần dưới ảnh; có `title` mà không có ảnh thì nền trang, lời hẹn màu mực, tấm thông tin nổi lên như một tấm thẻ; các kiểu khác người phụ trách thương hiệu tự thêm | khoá `footer` ngoài `sections`: `variant`, `navTitle`, `contactTitle`, `addressTitle` (tiêu đề ba cột, thiếu thì cột không có tiêu đề), `note`, `creditsTitle`; `image` (`src`, `alt`: ảnh nền), `title`, `titleAccent` (lời hẹn trên ảnh: phần đầu chữ đứng, phần sau xuống dòng in nghiêng), `marquee` (mảng chữ ngắn, ví dụ tên các chặng: một dòng chữ in hoa chạy chậm, cuộn trang thì nhanh lên rồi chậm dần, cuộn ngược thì chạy ngược; có ảnh thì nằm dưới lời hẹn, không có thì nằm trên cùng footer, ngăn với phần thông tin bằng vạch mảnh), `clouds` (`true`: lớp mây trôi ngang qua ảnh); thiếu trường nào bỏ phần đó, bật giảm chuyển động thì chữ, mây, ảnh đứng yên; đọc thêm `brand`, `contact`, `nav`, `credits` | chung: Bậc Trà `columns` (thêm mây), Gành Sớm `columns`, Mé Rạch `columns` | Gia Huy; Như Quỳnh |
| `hero` | `coverflow` (mặc định): chồng thẻ ảnh đứng xoay vòng, thẻ giữa là ảnh đang xem, hai bên nghiêng ra sau đối xứng; tiêu đề in hoa rất lớn đè lên giữa; nền là ảnh đang xem làm mờ; đổi ảnh bằng nút, phím mũi tên, vuốt hoặc bấm thẻ bên cạnh; nên dùng số ảnh lẻ (5) để hai bên bằng nhau; `full`: ảnh phủ kín màn hình, phủ một lớp sương, chữ nằm sát đáy ảnh; khối cao 2,4 màn hình, phần ảnh dính lại khi cuộn: ảnh tách ba lớp xa, giữa, gần tiến lại như máy quay bay vào, sương dạt ra hai bên, mây bay qua, chữ đổi từ màu mực sang màu sáng; rê chuột thì góc nhìn lệch theo; bật giảm chuyển động thì không ghim, sương mở sẵn, không có mây; `stacked`: hàng chữ ở trên (từ 1024px tiêu đề cột trái, đoạn dẫn, nút, dòng giá cột phải căn theo đáy tiêu đề), ảnh tràn hết bề ngang màn hình (điện thoại ảnh dọc 4:5, màn rộng cao vừa phần màn hình còn lại), `stats` nằm trên tấm thẻ đè lên mép dưới ảnh; khi tải trang ảnh thu nhẹ về cỡ thật, thẻ số trượt lên; dùng một ảnh (`image`) | `slides` (mảng `image` {`src`, `alt`}, `caption`), `slidesLabel` (nhãn cho trình đọc màn hình), `prevLabel`, `nextLabel` (chữ trên nút Trước, Sau); chỉ một ảnh thì dùng `image`; `link` (`label`, `href`), `stats` (mảng `value`, `label`); `effect` (tuỳ chọn): `reveal` thêm màn mở đầu, lớp màu nền có tên thương hiệu (`brand.name`) khoét thủng thấy ảnh `image`, cuộn thì chữ phóng to xuyên qua nét chữ, ảnh phủ kín rồi mờ đi lộ ra hero; tắt khi bật giảm chuyển động; mã ở `js/effects/hero-reveal.js` và `css/components/hero-reveal.css`; `revealHint` (gợi ý cuộn dưới chữ); nút chính lấy từ `site.cta`, dòng giá dưới nút lấy từ `cta.note` | chung: Bậc Trà `full`, Gành Sớm `coverflow`, Mé Rạch `stacked` | Gia Huy; Như Quỳnh |
| `host` | mặc định: điện thoại ảnh trên, chữ dưới; từ 1024px ảnh một bên, chữ một bên; `tv`: tivi đời cũ kể chuyện (tệp riêng `js/components/host-tv.js`, `css/components/host-tv.css`), khối ghim khi cuộn; lướt tới thì nút nguồn lún xuống, tivi bật kiểu đèn hình; mỗi nấc cuộn nút kênh kế tiếp lún và sáng, màn hình nhiễu sóng rồi sang chuyện mới; hết kênh thì nút nguồn lún, tivi tắt, khối thả ra; bấm nút kênh, nút nguồn thì trang cuộn tới đúng nấc; bật giảm chuyển động thì không ghim, tivi bật sẵn, bấm nút để đổi chuyện | `story` (mảng đoạn chữ), `quote` (`text`, `by`), `facts` (mảng `value`, `label`), `image`, `imageSecond` (`src`, `alt`; ảnh nhỏ đè góc ảnh lớn); thiếu trường nào thì bỏ phần đó; riêng `tv`: `stories` (mảng `title`, `text`, `quote` {`text`, `by`}, `image` {`src`, `alt`}), `tv` (`hint`: gợi ý lướt để bật, `channelHint`, `offHint`: ghi chú cạnh bảng nút, `power`: tên nút nguồn, `channel`: mẫu tên nút kênh với `{n}`, `{title}`); thiếu `stories` thì quay về kiểu mặc định | riêng: Mé Rạch | Mị Nương |
| `day-plan` | mặc định: sông màu nước uốn dọc khối, các mốc là bến xen kẽ hai bờ (điện thoại: sông dọc mép trái, bến một cột; từ 1024px sông giữa); mỗi bến là khung ảnh có số thứ tự rất lớn màu chữ pha nhạt đứng trên mép ảnh ở góc phía ngoài (xa sông); cuộn tới đâu bến diễn tới đó: số, ảnh, chữ mỗi phần bắt đầu hiện khi vừa ló khỏi đáy màn hình (số trồi lên từ sau ảnh, ảnh mở từ trên xuống, chữ trượt vào), cuộn ngược thì lùi lại; sông kiểu màu nước nhiều lớp (bờ cây nhoè, bờ cát ướt, nước đậm sát bờ sáng dần vào giữa, dải trời phản chiếu lệch một bên, vệt chảy, ánh lấp lánh); xuồng trôi theo độ cuộn, chấm bến sáng khi xuồng tới gần, nền đổi màu theo giờ của bến đang tới; bấm ảnh thì tấm mô tả trượt lên phủ ảnh, bấm lại hoặc Esc thì đóng; bật giảm chuyển động thì bến hiện đủ ngay, xuồng đậu ở bến đang diễn ra | `stops` (mảng `time` dạng "HH:MM", `title`, `text`, `image` {`src`, `alt`}, `details` (mảng `label`, `value`; dòng thiếu một trong hai bị bỏ; bến không có `details` hoặc không có ảnh thì ảnh không bấm được)), `nowLabel` (chữ trước giờ thật), `liveLabel` (nhãn bến đang diễn ra), `hint` (gợi ý cuộn), `moreLabel` (chữ trên nhãn góc ảnh, ví dụ "Ở bến này có gì"); múi giờ lấy từ `place.timezone` | riêng: Mé Rạch | Mị Nương |
| `booking` | `stay`: bên trái là ảnh lớn của hạng đang chọn kèm tên, diện tích, sức chứa, giá; bên phải là ba thẻ ảnh để chọn hạng (nhóm radio), ngày nhận, ngày trả phòng, số khách (nút bớt, thêm), họ tên, số điện thoại, tạm tính (tiền phòng theo đêm, thêm khách, ưu đãi, số lần bình minh); mỗi thẻ hạng ghi số căn còn, hết phòng thì khoá nút; bấm đặt thì kiểm tra các ô, báo lỗi ngay dưới ô, hợp lệ thì hiện tin nhắn soạn sẵn kèm nút gửi SMS, gọi, chép (không báo đặt thành công); `calendar` (tour theo lịch khởi hành, giá theo khách): bên trái các thẻ ngày như tờ lịch treo (thứ, ngày, tháng và năm, số chỗ còn; còn ít chỗ thì đổi màu nhấn, hết chỗ thì gạch ngang và khoá), danh sách đã gồm, chưa gồm, các hộp điều khoản; bên phải form giữ chỗ (giá một khách, dòng ưu đãi còn hạn, họ tên, số điện thoại, số khách không vượt số chỗ còn, tạm tính trừ ưu đãi, tiền cọc); gửi form thì in phiếu giữ chỗ ngay dưới (điểm đi, điểm đến, khách, ngày, số chỗ, tạm tính, tin nhắn soạn sẵn; cuống phiếu có dấu "chờ xác nhận" và nút gửi SMS, gọi, chép); từ 1024px hai cột; rẽ nhánh JS theo `variant`; `request` (nhà dân tính tiền theo khách, dùng chung ô nhập, khung tin nhắn, kiểu chữ với `stay`): bên trái một ảnh lớn của nhà kèm tên nhà, vài nét về chỗ ở, giá mỗi khách; bên phải ngày đến, ngày về (ở 1 tới `maxNights` đêm), người lớn và trẻ em có nút bớt, thêm (tổng không vượt `maxGuests`), họ tên, số điện thoại; tạm tính theo đầu người, trẻ em giá riêng (thường miễn phí), dòng ưu đãi hiện khi đủ điều kiện số đêm và tháng | `currency`; `rooms` (mảng `id`, `label`, `price`, `maxGuests`, `area`, `image` {`src`, `alt`}; hạng thiếu `price` hoặc `maxGuests` bị bỏ qua); `includedGuests`, `extraGuestPrice`; `defaultDates` (`checkIn`, `checkOut`); `offer` (`label`, `note`, `bookBy`, `from`, `to`, `minNights`, `freeNights`); `availability` (mảng `from`, `to`, `left` theo `id` hạng); `labels` (`checkIn`, `checkOut`, `room`, `guests`, `guestsLess`, `guestsMore`, `capacity` có `{area}`, `{max}`, `perNight` có `{price}`, `nightsNote` có `{nights}`, `name`, `phone`, `summary`, `roomLine`, `roomDetail` có `{nights}`, `{price}`, `extraLine`, `extraDetail` có `{guests}`, `{nights}`, `{price}`, `total`, `includes`, `left` có `{n}`, `soldOut`); `errors` (`dates`, `name`, `phone`, `soldOut`); `message` (`title`, `lead`, `template` có `{name}`, `{phone}`, `{room}`, `{checkIn}`, `{checkOut}`, `{nights}`, `{guests}`, `{total}`; `sms`, `call` (có `{phone}`), `copy`, `copied`, `edit`); với `calendar`: `price`, `priceNote` (chữ sau giá), `currency`, `deal` (`amount`, `until`, `label`), `deposit`, `fewSeats`, `defaultGuests`, `departures` (mảng `date`, `seats`), `includes`, `excludes` (mảng chữ), `policies` (mảng `title`, `items` gồm `label`, `text`, tuỳ chọn `note`), `labels` (`departures`, `month` có `{m}` `{y}`, `seats` có `{n}`, `soldOut`, `includesTitle`, `excludesTitle`, `name`, `phone`, `phoneExample`, `guests`, `guestsLess`, `guestsMore`, `guestsValue`, `baseLine` có `{price}` `{guests}`, `dealLine`, `total`, `deposit`), `errors` (`name`, `phone`), `message` (`brand`, `from`, `to`, `guest`, `date`, `seats`, `total`, `stamp`, `template` có `{name}` `{phone}` `{date}` `{guests}` `{total}`, `sms`, `call`, `copy`, `copied`); hotline lấy từ `contact.phone`, chữ nút gửi lấy từ `site.cta`; riêng `request`: `image`, `price` (mỗi khách mỗi đêm), `currency`, `childPrice`, `maxGuests`, `maxNights`, `defaultAdults`, `defaultDates` (`checkIn`, `checkOut`), `perks[]` (`minNights`, `months[]`, `text`), `labels` (`place`, `placeFacts`, `perGuest`, `checkIn`, `checkOut`, `adults`, `adultsLess`, `adultsMore`, `children`, `childrenLess`, `childrenMore`, `name`, `phone`, `summary`, `guestLine`, `guestDetail` với `{adults}`, `{nights}`, `{price}`, `childLine`, `childDetail` với `{children}`, `free`, `total`, `includes`), `errors` (`dates`, `name`, `phone`), `message` (như `stay`; mẫu tin nhắn dùng `{name}`, `{phone}`, `{checkIn}`, `{checkOut}`, `{nights}`, `{adults}`, `{children}`, `{total}`) | chung: Bậc Trà `calendar`, Gành Sớm `stay`, Mé Rạch `request` | Gia Huy (`stay`), Mị Nương (`request`); Như Quỳnh (`calendar`) |
| `faq` | không có `variant`: dạng cơ bản một cột, mỗi câu một thẻ `<details>` (bàn phím, trình đọc màn hình dùng được sẵn), mở câu này thì câu đang mở tự đóng, mở đóng mượt ở trình duyệt hỗ trợ `::details-content`; `chat` (Gành Sớm): khung nhắn tin với chủ nhà, câu hỏi là nút gợi ý, bấm thì hiện thành tin của khách, chủ nhà "đang nhập" rồi trả lời (khung là `role="log"`), có nút bắt đầu lại (chỉ hiện sau khi khách tự hỏi câu đầu tiên); bên cạnh là thẻ ảnh mời gọi hotline; rẽ nhánh JS theo `variant` vì HTML khác hẳn | `items` (mảng `question`, `answer`); `ask` (`text`, `action`, `image` cho thẻ ảnh của kiểu chat; số lấy từ `contact.phone`); `chat` (`label`, `cover` {`src`, `alt`}, `avatar` {`src`, `alt`} (ảnh đại diện, thiếu thì dùng chữ tắt của tên), `tagline` (dòng dưới tên, thiếu thì dùng `brand.slogan`), `greeting`, `pick`, `done`, `reset`, `again`, `closing`, `you`: chữ ẩn trước tin của khách cho trình đọc màn hình); tên, khẩu hiệu trên khung chat lấy từ `brand` | Gành Sớm, Bậc Trà, Mé Rạch `chat` | Gia Huy |
| `gallery` | không có `variant`: lưới ảnh có chú thích, dạng cơ bản; `slices` (Gành Sớm): các ảnh là dải hẹp đứng cạnh nhau trong khung trắng như tấm bình phong, rê chuột, bấm, Tab hoặc phím mũi tên tới dải nào thì dải đó xoè rộng, hiện số thứ tự, chú thích, tên tác giả; điện thoại thì các dải nằm ngang xếp dọc; rẽ nhánh JS theo `variant` vì HTML khác hẳn| `images` (mảng `src`, `alt`, `caption`, `credit` tuỳ chọn); với `slices`: `hint` (hướng dẫn cho chuột, bàn phím), `touchHint` (hướng dẫn cho màn hình cảm ứng), `listLabel` (nhãn của danh sách cho trình đọc màn hình) | Gành Sớm, Mé Rạch `slices` | Gia Huy |
| `stays` | không có `variant`: lưới thẻ, mỗi hạng một thẻ (ảnh, tên, mô tả, số căn, diện tích, sức chứa, giá, nút đặt hạng này); `headland` (Gành Sớm): ảnh mỏm gành thật đã tách nền đặt thẳng lên nền trang, có mốc của từng hạng; bấm mốc thì ngay trên mốc hiện khung ảnh cảnh nhìn ra từ ban công (ảnh, câu tả cảnh, giờ đẹp nhất) nối xuống mốc bằng một vạch, thẻ bên cạnh hiện tên, mô tả, các con số, giá của hạng đó; điện thoại xếp dọc tiêu đề, cảnh, thẻ; từ 1024px mỏm đá chiếm 58% bên phải, tiêu đề và thẻ nằm bên trái | `rooms` (mảng `id`, `label`, `text`, `count`, `area`, `maxGuests`, `price`, `image` {`src`, `alt`}, `view` tuỳ chọn {`image`, `text`, `best`}: cảnh nhìn ra từ ban công, có thì thẻ dùng ảnh cảnh này; với `headland` thêm `x`, `y`: vị trí mốc theo phần trăm của ảnh mỏm đá, `short`: tên ngắn hiện trên mốc ở điện thoại; kiểu `headland` không dùng `image` của hạng, ảnh trên mốc lấy từ `view.image`); `labels` (`count`, `countValue`, `area`, `guests`, `guestsValue`, `perNight`, `book`, `best`); `currency`, `priceNote`; với `headland`: `scene.image` {`src`, `alt`} (mỏm đá tách nền), `hint`. Nút đặt hạng này phát sự kiện `wl:choose-room` (`detail.id`), khối `booking` nghe sự kiện này để chọn sẵn hạng | Gành Sớm `headland` | Gia Huy |
| `offer` | không có `variant`: hai mặt bưu thiếp là hai thẻ phẳng, tem viền thường; `postcard` (Gành Sớm): bưu thiếp đặt nghiêng có bóng đổ, lời nhắn chữ viết tay (`--font-hand` trong `theme.css`, thiếu thì dùng font chữ thường), dấu bưu điện và tem răng cưa nghiêng. Cấu trúc chung: đầu khối (tiêu đề, lời dẫn, dải 12 tháng tô theo kiểu biển, ngoặc dưới các tháng của mùa ưu đãi, chú thích từng mùa); mặt trước (ảnh, chú thích); mặt sau (lời nhắn, dấu bưu điện đếm ngược ngày, giờ, phút tới hạn đặt, hết hạn thì hiện câu báo; con tem in giá ưu đãi của hạng đang chọn; các dòng điều kiện); bên dưới là các con tem chọn hạng (nhóm radio) và phiếu giá (giá thường, số tiền trả, giá tính ra mỗi đêm), nút đặt. Từ 1024px đầu khối, hai mặt, phần chọn tem đều chia hai cột | `deadline` (kèm múi giờ, ví dụ `2026-12-31T23:59:59+07:00`), `from`, `to` (ngày đầu, cuối mùa ưu đãi), `nights`, `freeNights` (số đêm cuối được tặng), `currency`, `titleAccent` (phần cuối tiêu đề in màu nhấn), `image`, `caption`, `captionPlace` (mặt trước), `note` (`label`, `greeting`, `text`, `sign`), `facts` (mảng `label`, `value`), `rooms` (mảng `id`, `label`, `price`, `image`), `sea` (mảng `months`, `kind` là `calm`, `windy` hoặc `stormy`, `label`), `labels` (`seasons`, `window` có `{from}`, `{to}`, `monthOne`, `monthRange`, `back`, `postmarkTop`, `postmarkBottom`, `date`, `daysLeft` có `{d}`, `timeLeft` có `{h}`, `{m}`, `countdownSr`, `ended`, `stamp`, `stampAlt` có `{room}`, `{alt}`, `million` có `{n}`, `perNight`, `roomFact`, `room`, `slip` có `{room}`, `full`, `pay`, `perNightTotal`); thiếu phần nào thì bỏ phần đó. Nút đặt lấy từ `site.cta`, bấm thì phát `wl:choose-room` để khối `booking` chọn sẵn hạng đang chọn | Gành Sớm `postcard` | Gia Huy |
| `to-top` (khối cố định) | nút tròn lên đầu trang ở góc dưới phải, ngang tâm với nút tròn đổi thương hiệu của BTC ở góc dưới trái; chỉ hiện khi đã cuộn quá một màn hình; vòng quanh nút cho biết đã đọc tới đâu; bấm thì cuộn mượt lên đầu (giảm chuyển động thì nhảy thẳng) | khoá `toTop` ngoài `sections`: `label` (tên nút cho trình đọc màn hình, cũng là chữ khi rê chuột); thiếu thì không có nút | chung: Bậc Trà, Gành Sớm, Mé Rạch (và brand-test); thương hiệu mới muốn có nút thì thêm khoá `toTop` vào `content.json` | Mị Nương |
| `cloud-band` | không có `variant`: dải mây vắt ngang chỗ nối hai khối để chuyển khối mềm hơn; cao 0 nên không đẩy bố cục; lõi mây đặc che đường nối, hai lớp mây có hình trôi ngang lặp liền mạch; điện thoại lệch xuống khối dưới, màn rộng cân hai bên, cao tối đa 15rem; hai dải đứng liền nhau (khối giữa bị ẩn hoặc chưa có component) thì chỉ hiện dải đầu, dải đứng đầu hoặc cuối trang thì ẩn; bật giảm chuyển động thì mây đứng yên; không có chữ, trình đọc màn hình bỏ qua | không có; đặt một mục `{ "type": "cloud-band" }` vào `sections` giữa hai khối cần nối, không cần `id`; nên đặt ở chỗ nối hai nền khác hẳn nhau (ảnh sang nền màu), không đặt giữa hai khối cùng nền | Bậc Trà (sau hero, sau lịch trình) | Như Quỳnh |
| `process` | `morph` (mặc định): khối cao theo số bước (mỗi bước nửa màn hình, cộng một màn hình), sân khấu dính khi cuộn; bên trái nhãn, tiêu đề, câu dẫn, danh sách bước (bước đang tới sáng lên, hiện câu mô tả) và ảnh thật của bước đó; bên phải một hình SVG đổi dáng và màu qua từng bước (nội suy số trong đường SVG), nền pha nhẹ màu của bước; bước có `heat` thì hiện chảo và hơi nóng, bước có `dew` thì hiện giọt nước; có `cup` thì cuối khối hình rơi vào chén, nước dâng lên; thanh tiến độ ở đáy; bật giảm chuyển động (hoặc các bước không cùng cấu trúc đường SVG) thì không ghim, mọi bước hiện đủ, mỗi bước kèm hình nhỏ và ảnh | `steps[]`: `name`, `text`, tuỳ chọn `shape` (đường SVG trong khung -200..200; mọi bước cùng cấu trúc lệnh và cùng số lượng số; dáng hai đường cong `M đầu C ... mút C ... đầu Z` thì có gân), `color` (#rrggbb), `image` (`src`, `alt`), `dew`, `heat` (`true`); tuỳ chọn ở khối: `cup` (`color`: màu nước trong chén) | riêng: Bậc Trà | Như Quỳnh |
| `reviews` | `postcard` (mặc định): mỗi đánh giá là một tấm bưu thiếp nghiêng nhẹ; bên trái điểm, lời kể chữ nghiêng, người gửi; bên phải tem răng cưa (con số, đơn vị, tên nơi; màu xoay vòng theo bốn màu pha từ màu thương hiệu) và dấu bưu điện tròn ghi ngày; điện thoại vuốt ngang từng tấm, từ 1024px hai cột, cột phải lệch xuống; cuộn tới thì các tấm rơi xuống lần lượt (một lần), rê chuột thì tấm nhấc lên; bật giảm chuyển động thì nằm thẳng, không rơi | `items[]`: `text` (bắt buộc), tuỳ chọn `rating` (số), `name`, `from`, `note` (đi cùng ai), `stamp` (`value`, `unit`, `label`), `date`; tuỳ chọn ở khối: `ratingMax` (mặc định 5), `scoreLabel` (chữ sau điểm), `dateLabel` (chữ trên dấu bưu điện); thiếu phần nào bỏ phần đó | chung: Bậc Trà, Gành Sớm, Mé Rạch `postcard` | Như Quỳnh |
