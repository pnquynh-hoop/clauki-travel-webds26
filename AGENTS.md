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

1. `index.html` là vỏ. Nó chỉ chứa `<wl-header>`, `<main id="main">` rỗng, `<wl-footer>`, `<wl-sticky-cta>`, không có chữ của thương hiệu nào.
2. `app.js` import mọi component, gọi `customElements.define('wl-<tên>', Lớp)`, rồi gọi `start()` của `core.js`.
3. `core.js`:
   - đọc `brands/brands.json`; nếu địa chỉ có `?brand=` thì chỉ nhận id có trong danh sách (không có thì dùng `default`);
   - gọi `WebDesign2026.init`: `wd2026.js` tải `brands/<id>/content.json`, nhớ lựa chọn sau F5 và hiện nút tròn ở góc dưới phải để BGK đổi thương hiệu;
   - mỗi lần có sự kiện `webdesign2026:datachange`: đổi `href` của `<link id="brand-theme">` thành `brands/<id>/theme.css`, điền `title`, `description`, `favicon`, cập nhật `?brand=` trên địa chỉ;
   - sau đó dựng section: với mỗi phần tử trong `sections`, bỏ qua phần tử có `"hidden": true`, tạo `<wl-<type>>`, gán `el.site` rồi gán `el.data`, gắn vào `<main>` theo đúng thứ tự mảng;
   - `type` chưa có component đăng ký thì bỏ qua khối đó và cảnh báo trong console, không làm sập trang;
   - `id` của section được gán làm `id` của thẻ, để menu và nút CTA (`"href": "#dat-tour"`) nhảy tới được;
   - `el.site` gồm `brand`, `cta`, `nav`, `place` (nơi chốn, toạ độ, múi giờ), `contact` (điện thoại, email, địa chỉ); thương hiệu nào thiếu khoá nào thì khoá đó là `undefined`; `<main>` được thay toàn bộ bằng `replaceChildren`, nên đổi thương hiệu không bị nhân đôi khối.
4. Các component cố định (header, footer, sticky-cta) cũng nhận `el.site` như vậy, nhưng `el.data` là toàn bộ `content.json`; thẻ nào chưa có component thì bỏ qua.
5. `core.js` export hàm `asset(path)` để đổi đường dẫn ảnh trong JSON (tính từ thư mục thương hiệu) thành đường dẫn thật.

**`wd2026.js` do BTC cấp:** đặt nguyên ở thư mục gốc, **không sửa**.
- Đổi thương hiệu bằng nút của BTC **không tải lại trang**: component có thể nhận `data` mới nhiều lần, mỗi lần phải dựng lại từ đầu (`replaceChildren`), không cộng dồn phần tử hay listener.
- `id` trong `content.json` phải trùng tên thư mục thương hiệu, vì `core.js` dùng nó để chọn `theme.css`.
- Góc dưới phải là chỗ của nút tròn: không đặt thành phần `position: fixed` đè lên góc đó.

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
  - phần dùng chung (header, hero, đặt chỗ, footer) chọn `variant` khác nhau giữa các thương hiệu;
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
| `header` (khối cố định) | `solid` (mặc định): nền đặc, dòng thông tin nhỏ phía trên; các kiểu khác người phụ trách thương hiệu tự thêm | khoá `header` ngoài `sections`: `variant`, `note` (dòng thông tin), `menu` (chữ trên nút menu điện thoại); số điện thoại lấy từ `contact.phone` | chung: Bậc Trà `overlay`, Gành Sớm `solid`, Mé Rạch `center` | Gia Huy |
| `footer` (khối cố định) | `compact` (mặc định): hai hàng, trên là tên, liên hệ và nút CTA (`site.cta`), dưới là ghi chú và nguồn ảnh, ẩn menu và địa chỉ; các kiểu khác người phụ trách thương hiệu tự thêm | khoá `footer` ngoài `sections`: `variant`, `note` (ghi chú thương hiệu giả tưởng), `creditsTitle`; đọc thêm `brand`, `contact`, `nav`, `credits` | chung: Bậc Trà `columns`, Gành Sớm `compact`, Mé Rạch `directions` | Gia Huy |
| `hero` | `split` (mặc định): chữ trái, ảnh khung phải, điện thoại thì ảnh lên trên; `full`, `stacked`: người phụ trách Bậc Trà, Mé Rạch tự thiết kế | `image` (`src`, `alt`), `link` (`label`, `href`), `stats` (mảng `value`, `label`), `effect` (`sunrise`: mở trang như bình minh); nút chính lấy từ `site.cta` | chung: Bậc Trà `full`, Gành Sớm `split`, Mé Rạch `stacked` | Gia Huy |
