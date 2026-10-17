/* wl-to-top.js - nút lên đầu trang. Khối cố định như header, footer: nhận cả content.json (el.data).
   Chỉ hiện khi đã cuộn quá một màn hình; vòng quanh nút cho biết đã đọc tới đâu trong trang.
   Nằm ngay phía trên nút tròn đổi thương hiệu của BTC (góc dưới phải), không đè lên nút đó.
   Tên nút cho trình đọc màn hình lấy từ toTop.label; thương hiệu không ghi thì không có nút. */
import { clamp } from '../core/dom.js';

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export class WlToTop extends HTMLElement {
  connectedCallback() {
    // Cuộn trang gắn vào window nên phải gỡ khi khối bị gỡ.
    this._onScroll = () => {
      if (!this._frame) this._frame = requestAnimationFrame(() => this.update());
    };
    addEventListener('scroll', this._onScroll, { passive: true });
    addEventListener('resize', this._onScroll, { passive: true });
    this.update();
  }

  disconnectedCallback() {
    removeEventListener('scroll', this._onScroll);
    removeEventListener('resize', this._onScroll);
    cancelAnimationFrame(this._frame);
  }

  set data(content) {
    this._data = content;
    this.render();
  }

  render() {
    const label = this._data?.toTop?.label;
    this.className = 'to-top';
    this._button = null;
    if (!label) {
      this.replaceChildren();
      return;
    }
    // Mũi tên vẽ bằng CSS; nút chỉ có hình nên cần aria-label (và title để rê chuột thấy chữ).
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'to-top__button';
    button.setAttribute('aria-label', label);
    button.title = label;
    button.addEventListener('click', () => {
      scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
    });
    this._button = button;
    this.replaceChildren(button);
    this.update();
  }

  // Hiện khi đã cuộn quá một màn hình; --progress (0 tới 1) là phần trang đã đọc, CSS vẽ thành vòng quanh nút.
  update() {
    this._frame = 0;
    if (!this._button) return;
    const max = document.documentElement.scrollHeight - innerHeight;
    this.style.setProperty('--progress', (max > 0 ? clamp(scrollY / max, 0, 1) : 0).toFixed(3));
    this.classList.toggle('is-visible', scrollY > innerHeight);
  }
}
