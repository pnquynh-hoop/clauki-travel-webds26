# components

Mỗi khối của trang (`<wl-hero>`, `<wl-booking>`...) là một thư mục ở đây. Trang không import sẵn khối nào:
`js/core/core.js` xem trang đang mở có những khối nào rồi mới tải JS, CSS của đúng các khối đó, theo bảng
`COMPONENTS` trong `js/core/app.js`.

Trường dữ liệu và kiểu trình bày chi tiết của từng khối ghi ở **mục 12 của `AGENTS.md`** (không chép lại ở đây để
hai nơi khỏi lệch). File này nói cách tổ chức và cách quyết định khi thêm mới.

## Một thư mục gồm gì

```
hero/
  wl-hero.js        lớp WlHero, ứng với thẻ <wl-hero>
  hero.css          giao diện chung và các kiểu nhỏ (.hero--coverflow, .hero--stacked...)
  hero-ride.js      kiểu lớn tách file riêng: JS ...
  hero-ride.css     ... và CSS của kiểu ride
  hero-haze.*, hero-reveal.*
  (images/)         ảnh riêng của khối nếu có, CSS gọi bằng url("images/...") (ví dụ journey/images/)
```

- `shared/`: file nhiều khối cùng dùng: `plate` (biển số nhà: intro, contact; footer tự vẽ biển số riêng), `catalog-card` (thẻ tour:
  catalog-list, tour-pick), `rooms` (đọc hạng phòng từ danh mục: stays, booking, offer), `item-detail` (các khối của
  trang chi tiết).
- `effects/`: hiệu ứng dùng chung: `lightbox` (xem ảnh lớn), `parallax` (ảnh trôi chậm), `pin-scroll` (ghim khối,
  cuộn dọc thành trượt ngang).

## Thêm kiểu (variant) hay thêm khối mới (component)?

**Nói gọn:** cùng một việc trên trang và dùng lại được dữ liệu thì là **kiểu**; khác việc, hoặc cần bộ dữ liệu khác
hẳn, hoặc cần đặt riêng trên trang thì là **khối mới**.

### Khác nhau ở đâu

| | Kiểu mới của khối có sẵn | Khối mới |
|---|---|---|
| Ghi trong `content.json` | `"variant": "notes"` trong section sẵn có | section mới `"type": "<tên>"` |
| Dữ liệu | dùng chung trường của khối; kiểu được thêm vài trường tuỳ chọn | bộ trường riêng |
| JS | cùng lớp, rẽ nhánh theo `variant` khi HTML khác hẳn (`reviews`: `cardEl` hay `noteEl`) | lớp và thẻ `<wl-...>` mới |
| CSS | lớp `.<khối>--<kiểu>` trong file của khối, hoặc file `<khối>-<kiểu>.css` nếu lớn | file `<tên>.css` với lớp gốc mới |
| Khai báo | thêm vào `variants` của khối trong `js/editor/manifest.js`; file riêng (nếu có) thêm vào `css` của khối trong `COMPONENTS` | dòng mới trong `COMPONENTS`, `manifest.js`, bảng mục 12 của `AGENTS.md` |
| Editor | đổi kiểu tại chỗ, giữ nguyên chữ và ảnh, Hoàn tác được | không đổi được từ khối này sang khối khác: phải thêm khối mới từ mẫu rồi nhập dữ liệu |
| White label | thương hiệu nào có khối đó cũng chọn được kiểu mới, không sửa dữ liệu | thương hiệu muốn dùng phải thêm section và dữ liệu |
| Trình tạo web `/tao` | kiểu của khối chung có thể vào `MIX_VARIANTS` (`js/create/rules.js`) cho AI trộn | khối đặc trưng của một thương hiệu khai trong `SIGNATURE` để AI chỉ dùng khi hợp |
| Bản dịch | bản dịch khớp khối theo `id` (rồi `type`), đổi kiểu giữ nguyên `id` nên không lệch; trường chữ riêng của kiểu mới thì dịch thêm | toàn bộ chữ của khối mới phải dịch |

Hàng "Editor" là lý do quan trọng nhất: BGK từng bảo đổi hero của thương hiệu này sang kiểu của thương hiệu kia ngay
trên giao diện. Làm được việc đó là nhờ các kiểu hero dùng chung dữ liệu.

### Bốn câu hỏi để quyết

1. **Trên trang nó làm cùng một việc với khối có sẵn không?** (khách kể, hỏi đáp, đặt chỗ, liên hệ...) Khác việc thì là khối mới.
2. **Đổi sang nó thì chữ, ảnh đang có còn đủ để hiện không?** Đủ thì là kiểu. Chỉ thiếu vài trường thì vẫn là kiểu, khai
   `needs` trong `manifest.js` để editor chỉ cho chọn khi dữ liệu đủ (hero `ride` cần `stops`, host `tv` cần `stories`,
   stays `headland` cần `scene.image`). Cần bộ trường khác hẳn thì là khối mới.
3. **Người dùng có cần dời, ẩn, đổi kiểu từng phần riêng không?** Có thì tách thành nhiều khối nhỏ. Ví dụ `room-detail`
   dựng cả trang chi tiết trong một khối; trang tour SighGone cần sắp xếp từng phần nên dùng các khối riêng `item-cover`,
   `item-booking`, `photo-strip`, `scene`, `included`.
4. **Hai cái có cần nằm cùng một trang không?** Câu này *không* quyết định: hai section cùng `type` khác kiểu vẫn được
   (trang chủ SighGone có `tour-pick` kiểu `reel` và kiểu `claw`).

### Ví dụ trong repo

- **Là kiểu:** `reviews` `postcard` và `notes` (cùng lời kể, tên, quê); `gallery` `slices` và `plates`; `contact` `notes`,
  `plate`, `bell`; `booking` `calendar`, `wall`, `ticket` (cùng lịch khởi hành, chỉ đổi cách chọn ngày); năm kiểu `hero`.
- **Là khối riêng dù gần nhau:** `timetable` và `catalog-list` cùng đọc danh mục, nhưng một cái là bảng giờ chạy hôm nay,
  một cái là danh sách có bộ lọc; `tour-pick` gợi ý một tour chứ không liệt kê; `medals`, `pictogram`, `coins` đều kể con
  số nhưng dữ liệu khác hẳn.
- **Ngoại lệ có chủ đích:** `booking` kiểu `stay`, `request` dùng dữ liệu khác `calendar` mà vẫn là kiểu của `booking`, vì
  thương hiệu nào cũng có đúng một khối đặt chỗ để menu, nút CTA, `wl:choose` cùng trỏ tới. Editor không cho đổi qua lại
  giữa chúng: `stay`, `request` không có trong danh sách kiểu của `booking` ở `manifest.js`, còn ba kiểu chọn ngày khai `needs`
  để chỉ hiện khi khối có lịch khởi hành. `route` cũng là ngoại lệ: không khai trong `manifest.js` vì chỉ chạy với chặng của
  danh mục tour, nên editor không thêm mới được.

## Khi nào tách kiểu ra file riêng

Kiểu thêm hơn khoảng 200 dòng CSS, hoặc có JS riêng đáng kể, thì để file `<khối>-<kiểu>.js`, `<khối>-<kiểu>.css` (như
`hero-ride`, `host-tv`, `contact-bell`, `tour-pick-claw`, các file `booking-*`). Kiểu nhỏ thì để chung file của khối,
ngăn bằng chú thích tiêu đề `/* Kiểu notes: ... */` (như `reviews`: kiểu `notes` khoảng 130 dòng CSS, chung file).
File CSS của kiểu khai trong `css` của khối ở `COMPONENTS`, theo thứ tự cần áp dụng.

## Quy ước đặt tên

- Thẻ `<wl-<tên>>`, lớp `Wl<Tên>`, file `wl-<tên>.js`, thư mục và CSS `<tên>`. Tên theo chức năng (`route`, `timetable`),
  không theo thương hiệu.
- Lớp CSS kiểu BEM: `.<khối>` cho gốc, `.<khối>__<phần>` cho phần con, `.<khối>--<kiểu>` cho kiểu.
- Hàm có đuôi `El` (`cardEl`, `stayEl`, `textEl`) dựng một phần tử HTML và trả nó về để gắn vào trang; hàm không có
  đuôi này thì tính toán (`quote`) hay cập nhật (`updateStay`).
- Thuộc tính có tiền tố `_` (`this._form`, `this._ticket`) là phần tử hay trạng thái khối giữ lại để lần cập nhật sau sửa
  thẳng, không phải tìm lại.

## Thêm một khối mới

1. Tạo `components/<tên>/` với `wl-<tên>.js` (lớp có `set data(section)` gọi `render()`, dựng lại từ đầu bằng
   `replaceChildren` mỗi lần nhận dữ liệu) và `<tên>.css` (lớp gốc có `display: block`, chỉ dùng biến CSS).
2. Thêm một dòng vào `COMPONENTS` trong `js/core/app.js`: `load` import file JS, `css` liệt kê đường dẫn CSS trong
   `components/` không có đuôi (ví dụ `'hero/hero-ride'`).
3. Khai khối trong `js/editor/manifest.js` (tên hiện trong editor, các kiểu, `needs` nếu kiểu cần trường riêng) để editor
   dời, đổi kiểu, sửa chữ được.
4. Thêm một dòng vào bảng mục 12 của `AGENTS.md`: kiểu, trường riêng, thương hiệu dùng, người viết.

Thử khối với dữ liệu của ít nhất hai thương hiệu (màu sáng và tối, chữ dài ngắn khác nhau, thiếu trường tuỳ chọn) trước
khi mở PR.

## Các khối

| Thư mục | Dùng để | Kiểu |
|---|---|---|
| `header`, `footer`, `to-top` | khối cố định mọi trang: đầu trang, chân trang, nút lên đầu trang | header `solid`, `center`, `overlay`, `minimal`; footer `columns`, `headline` |
| `hero` | ảnh đầu trang | `coverflow`, `full`, `stacked`, `haze`, `ride` |
| `intro` | đoạn giới thiệu | mặc định, `center`, `headline` |
| `gallery` | thư viện ảnh | mặc định, `slices`, `plates` |
| `reviews` | khách kể | `postcard`, `notes` |
| `faq` | hỏi đáp | mặc định, `chat` |
| `contact` | liên hệ | `notes`, `plate`, `bell` |
| `booking` | đặt chỗ | `stay`, `request`, `calendar`, `wall`, `ticket` |
| `stays` | các hạng phòng | mặc định, `headland` |
| `offer` | ưu đãi | mặc định, `postcard` |
| `host` | chủ nhà | mặc định, `tv` |
| `cards` | thẻ trình bày (người, cam kết) | mặc định, `badge` |
| `catalog-list` | danh sách tour, phòng có bộ lọc | mặc định, `compact` |
| `timetable` | giờ chạy hôm nay | mặc định, `board` |
| `tour-pick` | gợi ý một tour | `reel`, `claw` |
| `backdrop` | dải ảnh nền cố định | `screen`, `half`, `tall` |
| `room-detail` | trang chi tiết dựng trong một khối | (chuyển kiểu cho `item-booking`) |
| `item-cover`, `item-booking`, `photo-strip`, `scene`, `included` | các phần của trang chi tiết tour, phòng | item-booking mặc định, `ticket`; included mặc định, `receipt` |
| `route` | hành trình chia chặng kiểu tuyến metro | `metro` |
| `journey` | lịch trình con đường chữ S | `road` |
| `process` | các bước đổi dáng | `morph` |
| `day-plan` | một ngày theo giờ, xuồng trôi | không |
| `clock` | đồng hồ 24 giờ: giờ nào đi đâu | không |
| `tips`, `policy` | thẻ mẹo; bảng chính sách | không |
| `custom-trip` | tự ghép tour riêng | không |
| `pictogram`, `medals`, `coins` | con số bằng hình; bảng thành tựu; tiền đi đâu | không |
| `breadcrumb` | đường dẫn trang | không |
| `cloud-band` | dải mây nối hai khối | không |
