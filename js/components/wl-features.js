/* wl-features.js - những điểm đáng chọn (hoặc những thứ đã gồm trong giá). Dữ liệu: items (mảng value tuỳ chọn, title, text).
   Hai cấu trúc HTML khác nhau nên rẽ nhánh JS theo variant:
   - không có variant: lưới thẻ, mỗi ý một thẻ (con số lớn nếu có, tiêu đề, một câu), dạng cơ bản;
   - cutout (Gành Sớm): một ảnh đã tách nền đặt thật to (thuyền thúng), xoay nhẹ theo cuộn trang như thúng xoay trên sóng;
     bên cạnh là danh sách đánh số và một dòng "chưa gồm". */
import { asset } from '../core.js';
import { textEl, groupEl } from '../dom.js';

const pad = (n) => String(n).padStart(2, '0');

export class WlFeatures extends HTMLElement {
  connectedCallback() {
    // Xoay ảnh theo vị trí cuộn: chỉ khi có ảnh tách nền và người dùng không bật giảm chuyển động.
    this._onScroll = () => {
      if (this._frame || !this._art) return;
      this._frame = requestAnimationFrame(() => {
        this._frame = null;
        this.spin();
      });
    };
    window.addEventListener('scroll', this._onScroll, { passive: true });
    this.spin();
  }

  disconnectedCallback() {
    window.removeEventListener('scroll', this._onScroll);
    cancelAnimationFrame(this._frame);
  }

  set data(section) {
    this._data = section;
    this.render();
  }

  /* ---------- Lắc thúng ----------
     Ảnh chụp thúng từ bên hông nên không quay tròn cả vòng được (trông như lật úp); thay vào đó thúng lắc qua lại như trên sóng.
     Kéo ngang thì thúng nghiêng theo tay; thả ra thì một lò xo kéo về giữa, có ma sát, nên thúng lắc vài nhịp rồi dừng. */

  rockTo(angle) {
    this._rock = Math.max(-28, Math.min(28, angle));
    this._art.style.setProperty('--rock', `${this._rock}deg`);
  }

  // Một bước mô phỏng lò xo: gia tốc kéo về 0 tỉ lệ với độ nghiêng, trừ bớt theo vận tốc (ma sát).
  swing() {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      this.rockTo(0);
      return;
    }
    const step = () => {
      const accel = -0.06 * this._rock - 0.08 * this._vel;
      this._vel += accel;
      const before = this._rock;
      this.rockTo(this._rock + this._vel);
      // Thúng đi qua điểm giữa với tốc độ đủ lớn thì loang một vòng gợn nước.
      if (Math.sign(before) !== Math.sign(this._rock) && Math.abs(this._vel) > 1.2) this.ripple();
      if (Math.abs(this._rock) < 0.05 && Math.abs(this._vel) < 0.05) {
        this.rockTo(0);
        this._swing = null;
        return;
      }
      this._swing = requestAnimationFrame(step);
    };
    cancelAnimationFrame(this._swing);
    this._swing = requestAnimationFrame(step);
  }

  ripple() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ring = document.createElement('span');
    ring.className = 'features__ripple';
    ring.addEventListener('animationend', () => ring.remove());
    this._art.append(ring);
  }

  // Nút cho người dùng bàn phím: đẩy thúng một cái, thúng tự lắc rồi dừng.
  push() {
    this._vel = (this._vel ?? 0) + 4;
    this.ripple();
    this.swing();
  }

  bindRock(figure) {
    this._rock = 0;
    this._vel = 0;
    figure.addEventListener('pointerdown', (e) => {
      cancelAnimationFrame(this._swing);
      this._drag = { x: e.clientX, angle: this._rock, last: e.clientX };
      figure.setPointerCapture(e.pointerId);
      figure.classList.add('is-dragging');
    });
    figure.addEventListener('pointermove', (e) => {
      if (!this._drag) return;
      // Vận tốc lúc thả tay lấy theo quãng chuột vừa đi trong khung hình gần nhất, để thả mạnh thì lắc mạnh.
      this._vel = (e.clientX - this._drag.last) * 0.12;
      this._drag.last = e.clientX;
      this.rockTo(this._drag.angle + (e.clientX - this._drag.x) * 0.12);
    });
    const release = () => {
      if (!this._drag) return;
      this._drag = null;
      figure.classList.remove('is-dragging');
      this.swing();
    };
    figure.addEventListener('pointerup', release);
    figure.addEventListener('pointercancel', release);
  }

  // Khối đi từ đáy lên đỉnh màn hình thì góc xoay chạy từ -12 tới 12 độ; CSS đọc --spin.
  spin() {
    if (!this._art || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = this.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, (innerHeight - rect.top) / (innerHeight + rect.height)));
    this._art.style.setProperty('--spin', `${(progress - 0.5) * 24}deg`);
  }

  gridEl(items) {
    return groupEl('features__grid', items.map((item) => groupEl('features__card', [
      textEl('p', 'features__value', item.value),
      textEl('h3', 'features__name', item.title),
      textEl('p', 'features__text', item.text),
    ])));
  }

  listEl(items) {
    const list = document.createElement('ol');
    list.className = 'features__list';
    list.append(...items.map((item, i) => {
      const li = document.createElement('li');
      li.className = 'features__item';
      const num = textEl('span', 'features__num', item.value ?? pad(i + 1));
      num.setAttribute('aria-hidden', 'true');
      li.append(num, groupEl('features__copy', [textEl('h3', 'features__name', item.title), textEl('p', 'features__text', item.text)]));
      return li;
    }));
    return list;
  }

  artEl(image) {
    if (!image?.src) return null;
    const figure = document.createElement('figure');
    figure.className = 'features__art';
    const img = document.createElement('img');
    img.src = asset(image.src);
    img.alt = image.alt ?? '';
    img.loading = 'lazy';
    img.draggable = false;
    figure.append(img);
    this.bindRock(figure);
    return figure;
  }

  // Dòng gợi ý "kéo để lắc" và nút lắc cho bàn phím, chữ lấy từ content.json; thiếu chữ thì bỏ.
  playEl() {
    const section = this._data;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'features__push';
    button.textContent = section.pushLabel ?? '';
    button.addEventListener('click', () => this.push());
    return groupEl('features__play', [textEl('p', 'features__hint', section.hint), section.pushLabel ? button : null]);
  }

  render() {
    const section = this._data;
    const variant = section.variant;
    this.className = variant ? `features features--${variant}` : 'features';
    const items = (section.items ?? []).filter((item) => item.title);

    const head = groupEl('features__head', [
      textEl('p', 'features__eyebrow', section.eyebrow),
      textEl('h2', 'features__title', section.title),
      textEl('p', 'features__lead', section.lead),
    ]);
    const note = textEl('p', 'features__note', section.note);

    this._art = variant === 'cutout' ? this.artEl(section.image) : null;
    const stage = this._art ? groupEl('features__stage', [this._art, this.playEl()]) : null;
    const body = variant === 'cutout'
      ? [stage, groupEl('features__side', [head, this.listEl(items), note])]
      : [head, this.gridEl(items), note];
    this.replaceChildren(...[groupEl('features__inner container', body)].filter(Boolean));
    if (this.isConnected) this.spin();
  }
}
