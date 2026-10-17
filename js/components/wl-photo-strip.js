/* wl-photo-strip.js - dải ảnh như cuộn phim: từ 1024px khối ghim lại, cuộn dọc thì dải trôi ngang; điện thoại vuốt
   ngang; bấm ảnh thì xem lớn toàn màn hình. Section ghi "item" thì lấy ảnh bìa rồi ảnh từng chặng trong catalog
   (chú thích là tên chặng); không thì ghi images ({ src, alt, caption }) trong section. Tách từ room-detail. */
import { textEl, groupEl } from '../core/dom.js';
import { pinHorizontal } from '../effects/pin-scroll.js';
import { openLightbox } from '../effects/lightbox.js';
import { fill, imgEl, pad, itemSection } from './item-detail.js';

export class WlPhotoStrip extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  get labels() {
    return this._data.labels ?? {};
  }

  // Mỗi khung là một nút mở hộp xem ảnh lớn ở đúng ảnh đó; dưới ảnh là số thứ tự và chú thích (nếu có).
  filmEl(images) {
    if (images.length < 2) return null;
    const track = document.createElement('ol');
    track.className = 'photo-strip__film-track';
    track.append(...images.map((image, i) => {
      const li = document.createElement('li');
      li.className = 'photo-strip__frame';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'photo-strip__frame-btn';
      button.setAttribute('aria-label', fill(this.labels.open, { n: i + 1 }) || image.alt || '');
      // Không lazy: dải bị dịch ngang bằng transform nên trình duyệt có thể không nạp kịp ảnh ở cuối dải.
      button.append(imgEl(image, 'photo-strip__frame-img', false));
      button.addEventListener('click', () => openLightbox(images, i, this.labels.lightbox ?? {}));
      li.append(button, groupEl('photo-strip__frame-caption', [
        textEl('span', 'photo-strip__frame-no', pad(i + 1)),
        textEl('span', '', image.caption),
      ]));
      return li;
    }));
    const head = groupEl('photo-strip__film-head container', [
      textEl('h3', 'photo-strip__film-title', this.labels.gallery),
      textEl('p', 'photo-strip__film-count', pad(images.length)),
    ]);
    const stage = groupEl('photo-strip__film-stage', [head, groupEl('photo-strip__film-window', [track])]);
    const film = document.createElement('section');
    film.className = 'photo-strip__film';
    if (this.labels.gallery) film.setAttribute('aria-label', this.labels.gallery);
    film.append(stage);
    pinHorizontal(film, track);
    return film;
  }

  render() {
    const section = itemSection(this.site, this._data);
    this.className = section.variant ? `photo-strip photo-strip--${section.variant}` : 'photo-strip';
    this.replaceChildren(...[this.filmEl(section.images ?? [])].filter(Boolean));
  }
}
