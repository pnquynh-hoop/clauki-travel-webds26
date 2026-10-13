/* wl-room-detail.js - trang chi tiết một hạng phòng hoặc một tour: ảnh lớn và dải ảnh nhỏ, tên, mô tả,
   các con số, giá, nút đặt, các khoảng ngày còn trống; bên dưới là tiện nghi có icon, cảnh nhìn ra và link
   sang các hạng khác. Từ 1024px ảnh nằm trái, phần thông tin dính bên phải khi cuộn.
   Nút đặt lấy từ site.cta và phát wl:choose-room (detail.id = room) để form đặt chỗ chọn sẵn hạng này,
   kể cả khi form nằm ở trang khác (core.js giữ lựa chọn rồi phát lại). */
import { asset } from '../core.js';
import { textEl, groupEl, linkEl } from '../dom.js';
import { iconEl } from '../icon.js';

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

  /* ---------- Ảnh ---------- */

  // Ảnh lớn và dải ảnh nhỏ. Bấm ảnh nhỏ thì ảnh mới đè lên ảnh cũ rồi hiện dần (thời gian theo --duration,
  // bật giảm chuyển động thì đổi ngay); ảnh cũ được gỡ khi ảnh mới đã hiện hẳn.
  mediaEl(images) {
    if (!images.length) return null;
    this._main = document.createElement('figure');
    this._main.className = 'room-detail__main';
    this._main.append(imgEl(images[0], 'room-detail__photo is-shown', false));

    this._thumbs = images.length < 2 ? [] : images.map((image, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'room-detail__thumb';
      button.setAttribute('aria-label', fill(this.labels.thumb, { n: i + 1 }) || image.alt || '');
      button.setAttribute('aria-pressed', String(i === 0));
      button.append(imgEl(image, '', true));
      button.addEventListener('click', () => this.show(i));
      return button;
    });
    const strip = this._thumbs.length ? groupEl('room-detail__thumbs', this._thumbs) : null;
    strip?.setAttribute('role', 'group');
    if (strip && this.labels.gallery) strip.setAttribute('aria-label', this.labels.gallery);
    return groupEl('room-detail__media', [this._main, strip]);
  }

  show(index) {
    const image = this._data.images[index];
    this._thumbs.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    const next = imgEl(image, 'room-detail__photo', false);
    const old = [...this._main.querySelectorAll('.room-detail__photo')];
    this._main.append(next);
    // Đợi một khung hình để trình duyệt vẽ ảnh mới ở độ mờ 0 trước, rồi mới bật lớp hiện ra cho có hiệu ứng.
    requestAnimationFrame(() => requestAnimationFrame(() => next.classList.add('is-shown')));
    next.addEventListener('transitionend', () => old.forEach((img) => img.remove()), { once: true });
    // Giảm chuyển động thì không có transition nên không có transitionend: gỡ ảnh cũ sau một nhịp.
    setTimeout(() => old.forEach((img) => img.remove()), 1000);
  }

  /* ---------- Thông tin bên phải ---------- */

  factsEl(facts) {
    const items = facts.filter((f) => f.label && f.value);
    if (!items.length) return null;
    const dl = document.createElement('dl');
    dl.className = 'room-detail__facts';
    dl.append(...items.map((f) => groupEl('room-detail__fact', [textEl('dt', '', f.label), textEl('dd', '', f.value)])));
    return dl;
  }

  priceEl(section) {
    if (!section.price) return null;
    return groupEl('room-detail__price', [
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

  // Khoảng ngày còn trống: "1 đến 15/5: còn 3 căn"; hết căn thì ghi nhãn hết phòng và làm mờ dòng đó.
  availabilityEl(ranges) {
    const items = ranges.filter((r) => r.label);
    if (!items.length) return null;
    const list = document.createElement('ul');
    list.className = 'room-detail__dates';
    list.append(...items.map((r) => {
      const li = document.createElement('li');
      const soldOut = Number(r.left) === 0;
      li.className = soldOut ? 'room-detail__date is-sold-out' : 'room-detail__date';
      li.append(
        textEl('span', 'room-detail__date-label', r.label),
        textEl('span', 'room-detail__date-left', soldOut ? this.labels.soldOut : fill(this.labels.left, { n: r.left })) ?? '',
      );
      return li;
    }));
    return groupEl('room-detail__availability', [textEl('h3', 'room-detail__subtitle', this.labels.availability), list]);
  }

  /* ---------- Phần dưới ---------- */

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

  viewEl(view) {
    if (!view?.image?.src) return null;
    const figure = document.createElement('figure');
    figure.className = 'room-detail__view';
    // "Đẹp nhất lúc: bình minh" ghép từ nhãn chung và giờ đẹp nhất của cảnh.
    const best = view.best && [this.labels.best, view.best].filter(Boolean).join(': ');
    const lines = [textEl('p', 'room-detail__view-text', view.text), textEl('p', 'room-detail__view-best', best)].filter(Boolean);
    figure.append(imgEl(view.image, 'room-detail__view-img', true));
    if (lines.length) {
      const caption = document.createElement('figcaption');
      caption.className = 'room-detail__view-caption';
      caption.append(...lines);
      figure.append(caption);
    }
    return groupEl('room-detail__block', [textEl('h3', 'room-detail__subtitle', this.labels.view), figure]);
  }

  othersEl(others) {
    const links = others.map((o) => linkEl(o.href, o.label, 'room-detail__other')).filter(Boolean);
    if (!links.length) return null;
    const nav = document.createElement('nav');
    nav.className = 'room-detail__others';
    if (this.labels.others) nav.setAttribute('aria-label', this.labels.others);
    nav.append(...[textEl('p', 'room-detail__subtitle', this.labels.others), ...links].filter(Boolean));
    return nav;
  }

  render() {
    const section = this._data;
    this.className = section.variant ? `room-detail room-detail--${section.variant}` : 'room-detail';

    const info = groupEl('room-detail__info', [
      textEl('p', 'room-detail__eyebrow', section.eyebrow),
      textEl('h2', 'room-detail__title', section.title),
      textEl('p', 'room-detail__lead', section.lead),
      this.factsEl(section.facts ?? []),
      this.priceEl(section),
      this.bookEl(section),
      this.availabilityEl(section.availability ?? []),
    ]);
    const top = groupEl('room-detail__top container', [this.mediaEl(section.images ?? []), info]);
    const more = groupEl('room-detail__more container', [
      this.amenitiesEl(section.amenities ?? []),
      this.viewEl(section.view),
    ]);
    this.replaceChildren(...[top, more, groupEl('container', [this.othersEl(section.others ?? [])])].filter(Boolean));
  }
}
