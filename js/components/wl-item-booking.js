/* wl-item-booking.js - phần đặt chỗ của trang chi tiết một tour hay hạng phòng: cột trái và thẻ đặt bên phải, từ 1024px
   thẻ dính lại khi cuộn dọc theo cột trái (vì vậy hai phần này phải nằm chung một khối).
   Mặc định: cột trái là câu dẫn, tiện nghi, đã gồm, chưa gồm, nên mang; thẻ đặt có giá, nút đặt, danh sách ngày còn chỗ.
   Kiểu ticket (tour theo ngày, theo bản mẫu SighGone): thẻ đặt thành vé giữ chỗ, 5 ngày gần nhất là các ô bấm chọn,
   nút giữ chỗ phát wl:choose với id và ngày đã chọn; section có route thì cột trái là lộ trình (component route).
   Nút đặt lấy từ site.cta; section ghi book (label, href) thì dùng nút riêng. Tách từ room-detail. */
import { textEl, groupEl } from '../core/dom.js';
import { iconEl } from '../core/icon.js';
import { fill, dayChip, itemSection, money, lazyChildEl } from './item-detail.js';

// Vé giữ chỗ chỉ có chỗ cho 5 ô ngày trên một hàng.
const TICKET_DAYS = 5;

export class WlItemBooking extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  get labels() {
    return this._data.labels ?? {};
  }

  amenitiesEl(amenities) {
    const items = amenities.filter((a) => a.text);
    if (!items.length) return null;
    const list = document.createElement('ul');
    list.className = 'item-booking__amenities';
    list.append(...items.map((a) => {
      const li = document.createElement('li');
      li.className = 'item-booking__amenity';
      li.append(...[iconEl(a.icon, 'item-booking__icon'), textEl('span', '', a.text)].filter(Boolean));
      return li;
    }));
    return groupEl('item-booking__block', [textEl('h3', 'item-booking__subtitle', this.labels.amenities), list]);
  }

  // Gồm, chưa gồm, nên mang (của tour trong catalog): mỗi nhóm một danh sách ngắn có tiêu đề.
  listsEl(section) {
    const groups = [['includes', 'check'], ['excludes', 'x'], ['bring', 'backpack']].map(([key, icon]) => {
      const items = (section[key] ?? []).filter(Boolean);
      if (!items.length) return null;
      const list = document.createElement('ul');
      list.className = `item-booking__list item-booking__list--${key}`;
      list.append(...items.map((text) => {
        const li = document.createElement('li');
        li.append(...[iconEl(icon, 'item-booking__icon'), textEl('span', '', text)].filter(Boolean));
        return li;
      }));
      return groupEl('item-booking__block', [textEl('h3', 'item-booking__subtitle', this.labels[key]), list]);
    });
    return groupEl('item-booking__lists', groups);
  }

  priceEl(section) {
    if (!section.price) return null;
    return groupEl('item-booking__price', [
      textEl('p', 'item-booking__from', this.labels.from),
      groupEl('item-booking__amount-row', [
        textEl('strong', 'item-booking__amount', money(section.price, section.currency)),
        textEl('span', 'item-booking__per', this.labels.perNight),
      ]),
      textEl('p', 'item-booking__price-note', section.priceNote),
    ]);
  }

  // Nút đặt mặc định theo site.cta; section ghi book (label, href) thì dùng nút riêng, ví dụ gọi điện khi
  // trang đặt chỗ chưa nhận sản phẩm này.
  bookEl(section) {
    const cta = this.site?.cta;
    const href = section.book?.href ?? cta?.href;
    const label = section.book?.label ?? this.labels.book ?? cta?.label;
    if (!href || !label) return null;
    const a = document.createElement('a');
    a.className = 'btn item-booking__book';
    a.href = href;
    a.textContent = label;
    if (section.room && !section.book) {
      a.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('wl:choose-room', { detail: { id: section.room } }));
      });
    } else if (section.item && !section.book) {
      // Trang chi tiết lấy từ danh mục: phát wl:choose (core.js giữ lại nếu khối đặt chỗ ở trang khác) để chọn sẵn tour này.
      a.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('wl:choose', { detail: { id: section.item } }));
      });
    }
    return a;
  }

  // Khoảng ngày còn trống: "1 đến 15/5: còn 3 căn"; hết căn thì gạch khoảng ngày và ghi nhãn hết phòng.
  availabilityEl(ranges) {
    const items = ranges.filter((r) => r.label);
    if (!items.length) return null;
    const list = document.createElement('ul');
    list.className = 'item-booking__dates';
    list.append(...items.map((r) => {
      const li = document.createElement('li');
      const soldOut = Number(r.left) === 0;
      li.className = soldOut ? 'item-booking__date is-sold-out' : 'item-booking__date';
      li.append(...[
        textEl('span', 'item-booking__date-label', r.label),
        textEl('span', 'item-booking__date-left', soldOut ? this.labels.soldOut : fill(this.labels.left, { n: r.left })),
      ].filter(Boolean));
      return li;
    }));
    return groupEl('item-booking__availability', [textEl('p', 'item-booking__card-title', this.labels.availability), list]);
  }

  // Vé giữ chỗ: mỗi ngày còn chỗ là một ô radio (dùng được bằng bàn phím); ngày hết chỗ khoá lại.
  // Mặc định chọn ngày gần nhất còn chỗ.
  daysEl(section) {
    const days = (section.availability ?? []).filter((d) => d.date).slice(0, TICKET_DAYS);
    if (!days.length) return null;
    const name = `${this.id || 'item-booking'}-day`;
    const firstOpen = days.find((d) => Number(d.left) > 0);
    this._day = firstOpen?.date ?? null;
    const chips = days.map((d) => {
      const soldOut = Number(d.left) === 0;
      const { dow, day } = dayChip(d.date);
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = name;
      input.value = d.date;
      input.disabled = soldOut;
      input.checked = d === firstOpen;
      input.addEventListener('change', () => { this._day = d.date; });
      const label = document.createElement('label');
      label.className = soldOut ? 'item-booking__day is-full' : 'item-booking__day';
      label.append(input, ...[
        textEl('span', 'item-booking__day-dow', dow),
        textEl('span', 'item-booking__day-date', day),
        textEl('span', 'item-booking__day-left', soldOut ? this.labels.soldOut : fill(this.labels.left, { n: d.left })),
      ].filter(Boolean));
      return label;
    });
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'item-booking__days';
    const legend = textEl('legend', 'item-booking__card-title', this.labels.chooseDay ?? this.labels.availability);
    fieldset.append(...[legend, ...chips].filter(Boolean));
    return fieldset;
  }

  // Nút giữ chỗ của vé: phát wl:choose kèm ngày đang chọn rồi mới sang trang đặt; core.js giữ lựa chọn và phát lại
  // khi trang đặt dựng xong.
  ticketBookEl(section) {
    // Bỏ room, item khi gọi bookEl để nút không phát thêm wl:choose chỉ có id; vé tự phát một lần, kèm ngày.
    const a = this.bookEl({ ...section, room: null, item: null });
    if (a && section.room && !section.book) {
      a.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('wl:choose', { detail: { id: section.room, date: this._day } }));
      });
    }
    return a;
  }

  cardEl(section) {
    if (section.variant === 'ticket') {
      return groupEl('item-booking__card item-booking__ticket', [
        this.priceEl(section),
        this.daysEl(section),
        this.ticketBookEl(section),
        textEl('p', 'item-booking__ticket-note', section.ticketNote),
      ]);
    }
    return groupEl('item-booking__card', [
      this.priceEl(section),
      this.bookEl(section),
      this.availabilityEl(section.availability ?? []),
    ]);
  }

  // Kiểu ticket có route: lộ trình (component route) đứng ở cột trái, cạnh vé, như bản mẫu.
  routeEl(section) {
    if (!section.route) return null;
    return lazyChildEl('item-booking__route', 'wl-route', () => import('./wl-route.js').then((m) => m.WlRoute),
      this.site, { type: 'route', ...section.route, item: this._data.item });
  }

  render() {
    const section = itemSection(this.site, this._data);
    this.className = section.variant ? `item-booking item-booking--${section.variant}` : 'item-booking';
    // Kiểu ticket: cột trái là lộ trình (nếu có) hoặc câu dẫn; đã gồm, chưa gồm để cho khối included.
    const content = section.variant === 'ticket'
      ? [this.routeEl(section) ?? textEl('p', 'item-booking__lead', section.lead)]
      : [textEl('p', 'item-booking__lead', section.lead), this.amenitiesEl(section.amenities ?? []), this.listsEl(section)];
    this.replaceChildren(groupEl('item-booking__layout container', [groupEl('item-booking__content', content), this.cardEl(section)]));
  }
}
