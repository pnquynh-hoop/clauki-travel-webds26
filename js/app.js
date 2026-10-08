/* app.js - điểm vào: import từng component trong js/components/, đăng ký bằng customElements.define,
   rồi gọi core.js để nạp thương hiệu và dựng trang.
   Mỗi component một file, đặt tên wl-<tên>.js, ví dụ js/components/wl-hero.js ứng với thẻ <wl-hero>. */
import { start } from './core.js';
import { WlIntro } from './components/wl-intro.js';
import { WlHero } from './components/wl-hero.js';

// Phải đăng ký trước khi core.js tạo khối, nếu không core.js bỏ qua khối đó.
// Đặt sau start() hiện vẫn chạy vì start() còn chờ tải brands.json; đặt trước thì không phụ thuộc vào việc đó.
customElements.define('wl-intro', WlIntro);
customElements.define('wl-hero', WlHero);

start();
