/* wl-room-detail.js - trang chi tiết một hạng phòng hoặc một tour, dàn như một trang tạp chí:
   - ảnh bìa tràn màn hình, tên hạng chữ lớn đè lên; ảnh phóng chậm khi vào trang và trôi chậm khi cuộn;
   - cột trái: các con số có icon, tiện nghi, thư viện ảnh dạng khảm (bấm ảnh thì xem lớn toàn màn hình);
   - cột phải: thẻ đặt phòng nổi (giá, ghi chú giá, nút đặt, khoảng ngày còn trống), đè lên mép dưới ảnh bìa
     và dính khi cuộn (từ 1024px);
   - dải "nhìn ra từ hiên" tràn màn hình có câu chữ đè lên;
   - thẻ ảnh dẫn sang các hạng khác.
   Nút đặt lấy từ site.cta và phát wl:choose-room (detail.id = room) để form đặt chỗ chọn sẵn hạng này,
   kể cả khi form nằm ở trang khác (core.js giữ lựa chọn rồi phát lại). */
import { asset } from '../core.js';
import { textEl, groupEl } from '../dom.js';
import { iconEl } from '../icon.js';
import { parallax } from '../effects/parallax.js';
import { openLightbox } from '../effects/lightbox.js';

function fill(template, values) {
  return (template ?? '').replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
}

function imgEl(image, className, lazy) {
  if (!image?.src) return null;
  const img = document.createElement('img');
  img.className = className;
  img.src = asset(image.src);
  img.alt = image.alt ?? '';
  if (lazy) img.loading = 'lazy';
  return img;
}

export class WlRoomDetail extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  get labels() {
    return this._data.labels ?? {};
  }

  money(amount) {
    return `${amount.toLocaleString('vi-VN')} ${this._data.currency ?? ''}`.trim();
  }

  /* ---------- Ảnh bìa ---------- */

  // Chưa có ảnh thì vẫn có phần chữ (tên, mô tả), chỉ không có ảnh bìa.
  coverEl(section) {
    const image = section.images?.[0];
    const cover = document.createElement('header');
    cover.className = image?.src ? 'room-detail__cover' : 'room-detail__cover room-detail__cover--plain';
    const img = imgEl(image, 'room-detail__cover-img', false);
    const text = groupEl('room-detail__cover-text container', [
      textEl('p', 'room-detail__eyebrow', section.eyebrow),
      textEl('h2', 'room-detail__title', section.title),
      textEl('p', 'room-detail__lead', section.lead),
    ]);
    if (!img && !text) return null;
    cover.append(...[img, text].filter(Boolean));
    parallax(img, 0.18, 1.18);
    return cover;
  }

  /* ---------- Cột trái ---------- */

  factsEl(facts) {
    const items = facts.filter((f) => f.label && f.value);
    if (!items.length) return null;
    const dl = document.createElement('dl');
    dl.className = 'room-detail__facts';
    dl.append(...items.map((f) => groupEl('room-detail__fact', [
      iconEl(f.icon, 'room-detail__fact-icon'),
      groupEl('room-detail__fact-text', [textEl('dt', '', f.label), textEl('dd', '', f.value)]),
    ])));
    return dl;
  }

  amenitiesEl(amenities) {
    const items = amenities.filter((a) => a.text);
    if (!items.length) return null;
    const list = document.createElement('ul');
    list.className = 'room-detail__amenities';
    list.append(...items.map((a) => {
      const li = document.createElement('li');
      li.className = 'room-detail__amenity';
      li.append(...[iconEl(a.icon, 'room-detail__icon'), textEl('span', '', a.text)].filter(Boolean));
      return li;
    }));
    return groupEl('room-detail__block', [textEl('h3', 'room-detail__subtitle', this.labels.amenities), list]);
  }

  // Thư viện ảnh dạng khảm: ảnh đầu to, các ảnh sau nhỏ; mỗi ô là một nút mở hộp xem ảnh lớn ở đúng ảnh đó.
  galleryEl(images) {
    if (images.length < 2) return null;
    const grid = document.createElement('div');
    grid.className = 'room-detail__mosaic';
    grid.append(...images.map((image, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'room-detail__tile';
      button.setAttribute('aria-label', fill(this.labels.open, { n: i + 1 }) || image.alt || '');
      button.append(imgEl(image, '', true));
      button.addEventListener('click', () => openLightbox(images, i, this.labels.lightbox ?? {}));
      return button;
    }));
    return groupEl('room-detail__block', [textEl('h3', 'room-detail__subtitle', this.labels.gallery), grid]);
  }

  /* ---------- Thẻ đặt phòng ---------- */

  priceEl(section) {
    if (!section.price) return null;
    return groupEl('room-detail__price', [
      textEl('p', 'room-detail__from', this.labels.from),
      groupEl('room-detail__amount-row', [
        textEl('strong', 'room-detail__amount', this.money(section.price)),
        textEl('span', 'room-detail__per', this.labels.perNight),
      ]),
      textEl('p', 'room-detail__price-note', section.priceNote),
    ]);
  }

  bookEl(section) {
    const cta = this.site?.cta;
    const label = this.labels.book ?? cta?.label;
    if (!cta?.href || !label) return null;
    const a = document.createElement('a');
    a.className = 'btn room-detail__book';
    a.href = cta.href;
    a.textContent = label;
    if (section.room) {
      a.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('wl:choose-room', { detail: { id: section.room } }));
      });
    }
    return a;
  }

  // Khoảng ngày còn trống: "1 đến 15/5: còn 3 căn"; hết căn thì gạch khoảng ngày và ghi nhãn hết phòng.
  availabilityEl(ranges) {
    const items = ranges.filter((r) => r.label);
    if (!items.length) return null;
    const list = document.createElement('ul');
    list.className = 'room-detail__dates';
    list.append(...items.map((r) => {
      const li = document.createElement('li');
      const soldOut = Number(r.left) === 0;
      li.className = soldOut ? 'room-detail__date is-sold-out' : 'room-detail__date';
      li.append(...[
        textEl('span', 'room-detail__date-label', r.label),
        textEl('span', 'room-detail__date-left', soldOut ? this.labels.soldOut : fill(this.labels.left, { n: r.left })),
      ].filter(Boolean));
      return li;
    }));
    return groupEl('room-detail__availability', [textEl('p', 'room-detail__card-title', this.labels.availability), list]);
  }

  cardEl(section) {
    return groupEl('room-detail__card', [
      this.priceEl(section),
      this.bookEl(section),
      this.availabilityEl(section.availability ?? []),
    ]);
  }

  /* ---------- Phần dưới ---------- */

  // Dải ảnh tràn màn hình, câu tả cảnh chữ lớn nghiêng đè lên góc dưới, ảnh trôi chậm khi cuộn.
  viewEl(view) {
    if (!view?.image?.src) return null;
    const figure = document.createElement('figure');
    figure.className = 'room-detail__view';
    const img = imgEl(view.image, 'room-detail__view-img', true);
    const best = view.best && [this.labels.best, view.best].filter(Boolean).join(': ');
    const lines = [
      textEl('p', 'room-detail__view-label', this.labels.view),
      textEl('p', 'room-detail__view-text', view.text),
      textEl('p', 'room-detail__view-best', best),
    ].filter(Boolean);
    figure.append(img);
    if (lines.length) {
      const caption = document.createElement('figcaption');
      caption.className = 'room-detail__view-caption container';
      caption.append(...lines);
      figure.append(caption);
    }
    parallax(img, 0.12, 1.2);
    return figure;
  }

  // Thẻ ảnh của các hạng khác: ảnh, tên, một dòng ghi chú (ví dụ giá); cả thẻ là một liên kết.
  othersEl(others) {
    const cards = others.filter((o) => o.href && o.label).map((o) => {
      const a = document.createElement('a');
      a.className = o.image ? 'room-detail__other' : 'room-detail__other room-detail__other--plain';
      a.href = o.href;
      a.append(...[
        imgEl(o.image, 'room-detail__other-img', true),
        groupEl('room-detail__other-text', [textEl('span', 'room-detail__other-name', o.label), textEl('span', 'room-detail__other-note', o.note)]),
      ].filter(Boolean));
      return a;
    });
    if (!cards.length) return null;
    const nav = document.createElement('nav');
    nav.className = 'room-detail__others container';
    if (this.labels.others) nav.setAttribute('aria-label', this.labels.others);
    nav.append(...[textEl('h3', 'room-detail__subtitle', this.labels.others), groupEl('room-detail__others-grid', cards)].filter(Boolean));
    return nav;
  }

  render() {
    const section = this._data;
    this.className = section.variant ? `room-detail room-detail--${section.variant}` : 'room-detail';
    const body = groupEl('room-detail__layout container', [
      groupEl('room-detail__content', [
        this.factsEl(section.facts ?? []),
        this.amenitiesEl(section.amenities ?? []),
        this.galleryEl(section.images ?? []),
      ]),
      this.cardEl(section),
    ]);
    this.replaceChildren(...[
      this.coverEl(section),
      body,
      this.viewEl(section.view),
      this.othersEl(section.others ?? []),
    ].filter(Boolean));
  }
}
