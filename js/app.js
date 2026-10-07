/* app.js - điểm vào: import từng component trong js/components/, đăng ký bằng customElements.define,
   rồi gọi core.js để nạp thương hiệu và dựng trang.
   Mỗi component một file, đặt tên wl-<tên>.js, ví dụ js/components/wl-hero.js ứng với thẻ <wl-hero>. */
import { start } from './core.js';

start();
