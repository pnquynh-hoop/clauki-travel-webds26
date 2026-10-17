/* wl-backdrop.js - một dải ảnh "đóng đinh" vào màn hình: trang cuộn qua, ảnh đứng yên như nền cố định, chữ (nếu có) trôi lên trên ảnh.
   Ảnh là phần tử position: fixed nằm trong khung cắt bằng clip-path, nên chỉ thấy trong phạm vi của khối. Cách này chạy cả trên
   điện thoại (background-attachment: fixed thì iOS bỏ qua). Bật giảm chuyển động thì ảnh cuộn cùng trang, không còn hiệu ứng. */
import { asset } from '../../js/core/core.js';
import { textEl, groupEl } from '../../js/core/dom.js';

export class WlBackdrop extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  render() {
    const section = this._data;
    const image = section.image;
    if (!image?.src) {
      this.replaceChildren();
      return;
    }
    this.className = `backdrop backdrop--${section.variant ?? 'screen'}`;

    const img = document.createElement('img');
    img.className = 'backdrop__image';
    img.src = asset(image.src);
    img.alt = image.alt ?? '';
    img.loading = 'lazy';
    img.decoding = 'async';
    if (section.focus) img.style.objectPosition = section.focus;

    const shade = document.createElement('div');
    shade.className = 'backdrop__shade';
    shade.setAttribute('aria-hidden', 'true');

    const text = groupEl('backdrop__text', [
      textEl('p', 'backdrop__eyebrow', section.eyebrow),
      textEl('h2', 'backdrop__title', section.title),
      textEl('p', 'backdrop__lead', section.lead),
    ]);

    const frame = document.createElement('div');
    frame.className = 'backdrop__frame';
    frame.append(...[img, text ? shade : null, text, textEl('p', 'backdrop__credit', section.credit)].filter(Boolean));
    this.replaceChildren(frame);
  }
}
