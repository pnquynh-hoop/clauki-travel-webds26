/* wl-deal.js - khối "giá ưu đãi có hạn" của landing page: giá hiện tại và giá thường, đếm ngược tới hạn,
   số ghế còn trên tổng, nút đặt. Mọi chữ lấy từ section; nút lấy từ site.cta để cả trang dùng một lời kêu gọi.
   Hết hạn thì thay đồng hồ bằng một dòng báo (labels.ended); thiếu trường nào bỏ phần đó. */
import { asset } from '../core.js';
import { textEl, groupEl, linkEl } from '../dom.js';

const UNITS = ['d', 'h', 'm', 's'];
const pad = (n) => String(n).padStart(2, '0');

// "Còn {left} trên {total} ghế": chỗ trống trong mẫu chữ do section quy định, mỗi thương hiệu một giọng.
function fill(template, values) {
  return template?.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '') ?? '';
}

function money(amount, currency) {
  return `${Number(amount).toLocaleString('vi-VN')} ${currency ?? ''}`.trim();
}

export class WlDeal extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  // Gỡ khối khỏi trang (đổi thương hiệu, đổi trang) thì tắt đồng hồ, không để nó chạy ngầm.
  disconnectedCallback() {
    this.stopClock();
  }

  stopClock() {
    clearInterval(this._timer);
    this._timer = null;
  }

  priceEl(deal, currency) {
    if (!deal.now) return null;
    const row = document.createElement('p');
    row.className = 'deal__price';
    const now = textEl('b', 'deal__now', money(deal.now, currency));
    const was = deal.was ? textEl('s', 'deal__was', money(deal.was, currency)) : null;
    const badge = textEl('span', 'deal__badge', deal.badge);
    row.append(...[now, was, badge].filter(Boolean));
    return row;
  }

  // Bốn ô ngày, giờ, phút, giây; JS chỉ đổi chữ trong các thẻ <b>, nên mỗi giây không dựng lại DOM.
  clockEl(labels) {
    const clock = document.createElement('div');
    clock.className = 'deal__clock';
    clock.setAttribute('role', 'timer');
    if (labels.timer) clock.setAttribute('aria-label', labels.timer);
    this._cells = {};
    UNITS.forEach((unit) => {
      const cell = document.createElement('div');
      const value = document.createElement('b');
      value.textContent = '00';
      this._cells[unit] = value;
      cell.append(value, textEl('span', '', labels[unit]) ?? '');
      clock.append(cell);
    });
    return clock;
  }

  seatsEl(seats, labels) {
    if (!seats?.total) return null;
    const left = Math.max(0, seats.total - (seats.taken ?? 0));
    const row = document.createElement('div');
    row.className = 'deal__seats';
    const text = textEl('p', 'deal__seat-text', fill(labels.seats, { left, total: seats.total }));
    const map = document.createElement('div');
    map.className = 'deal__seat-map';
    map.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < seats.total; i += 1) {
      const seat = document.createElement('i');
      if (i < (seats.taken ?? 0)) seat.className = 'is-taken';
      map.append(seat);
    }
    row.append(...[text, map].filter(Boolean));
    return row;
  }

  tick() {
    const left = Math.max(0, new Date(this._data.deadline) - Date.now());
    const parts = { d: Math.floor(left / 864e5), h: Math.floor(left / 36e5) % 24, m: Math.floor(left / 6e4) % 60, s: Math.floor(left / 1e3) % 60 };
    UNITS.forEach((unit) => { this._cells[unit].textContent = pad(parts[unit]); });
    if (left === 0) {
      this.stopClock();
      this.classList.add('deal--ended');
    }
  }

  render() {
    this.stopClock();
    const section = this._data;
    const labels = section.labels ?? {};
    this.className = section.variant ? `deal deal--${section.variant}` : 'deal';

    const head = groupEl('deal__head', [
      textEl('p', 'deal__eyebrow', section.eyebrow),
      textEl('h2', 'deal__title', section.title),
      textEl('p', 'deal__lead', section.lead),
    ]);

    const hasClock = Number.isFinite(Date.parse(section.deadline));
    const ended = hasClock && Date.parse(section.deadline) <= Date.now();
    const cta = this.site?.cta;
    const card = groupEl('deal__card', [
      this.priceEl(section, section.currency),
      ended ? textEl('p', 'deal__ended', labels.ended) : hasClock ? this.clockEl(labels) : null,
      this.seatsEl(section.seats, labels),
      linkEl(cta?.href, cta?.label, 'btn deal__cta'),
    ]);

    // Ảnh tách nền nằm đè mép khối cho vui mắt; không có chữ nên ẩn với trình đọc màn hình.
    const pic = section.image?.src ? document.createElement('img') : null;
    if (pic) {
      pic.className = 'deal__pic';
      pic.src = asset(section.image.src);
      pic.alt = section.image.alt ?? '';
      pic.loading = 'lazy';
      if (!pic.alt) pic.setAttribute('aria-hidden', 'true');
    }

    const inner = document.createElement('div');
    inner.className = 'deal__inner container';
    inner.append(...[head, card].filter(Boolean));
    this.replaceChildren(...[inner, pic].filter(Boolean));

    if (hasClock && !ended) {
      this.tick();
      this._timer = setInterval(() => this.tick(), 1000);
    } else if (ended) {
      this.classList.add('deal--ended');
    }
  }
}
