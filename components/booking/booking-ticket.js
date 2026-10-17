/* booking-ticket.js - phương thức của <wl-booking> cho kiểu ticket (quầy vé): vạch chỗ dưới mỗi ngày, điểm đón dạng radio, icon phương tiện của tour, bố cục các bước đánh số và máy in vé, thẻ lên xe có mã vạch; phần còn lại là calendar.
   Ghép vào lớp WlBooking trong wl-booking.js (Object.assign lên prototype), nên `this` vẫn là khối đặt chỗ. */
import { textEl, groupEl, telHref } from '../../js/core/dom.js';
import { iconEl } from '../../js/core/icon.js';
import { fill } from './booking-helpers.js';

export const ticketMethods = {

  // Kiểu ticket: dưới mỗi ngày là một hàng vạch, mỗi vạch một chỗ (sáng là còn); chữ số chỗ đã có ở trên nên vạch chỉ để nhìn nhanh.
  seatBarEl(left) {
    if (this._data.variant !== 'ticket') return null;
    const total = this._data.seatMap?.total ?? 8;
    const bar = document.createElement('span');
    bar.className = 'booking__date-bar';
    bar.setAttribute('aria-hidden', 'true');
    bar.append(...Array.from({ length: total }, (_, i) => Object.assign(document.createElement('i'), { className: i < left ? 'on' : '' })));
    return bar;
  },

  // Kiểu ticket: điểm đón là danh sách nút radio (mỗi dòng một cách đón, phí ở bên phải). Giá trị đang chọn nằm trong một ô ẩn
  // để pickup() đọc giống ô chọn thường; radio ghi vào đó ở sự kiện input của chính nó, trước khi form nghe input và tính lại.
  pickupRadios(prefix, pickups) {
    const control = Object.assign(document.createElement('input'), { type: 'hidden', value: pickups[0].id });
    const list = document.createElement('div');
    list.className = 'booking__pickups';
    list.append(...pickups.map((p, i) => {
      const radio = Object.assign(document.createElement('input'), { type: 'radio', name: `${prefix}-pickup`, value: p.id, checked: i === 0, className: 'booking__pickup-input' });
      radio.addEventListener('input', () => { control.value = p.id; });
      const label = document.createElement('label');
      label.className = 'booking__pickup';
      label.append(radio, textEl('span', 'booking__pickup-label', p.label), textEl('span', 'booking__pickup-fee', p.fee ? `+ ${this.money(p.fee)}` : this._data.labels?.pickupFree));
      return label;
    }), control);
    return { field: list, control };
  },

  // Các phương tiện của tour (từ `stages`, mỗi loại một lần) dưới dạng hàng icon nhỏ; tên phương tiện nằm ở `title` để rê chuột thấy.
  vehicleList(tour) {
    const vehicles = this.site?.catalog?.vehicles ?? {};
    return [...new Set((tour.stages ?? []).map((stage) => stage.vehicle))].map((id) => vehicles[id] && { id, ...vehicles[id] }).filter(Boolean);
  },

  vehiclesEl(tour) {
    const icons = this.vehicleList(tour).map((v) => {
      const icon = iconEl(v.icon, 'booking__vehicle');
      if (icon) icon.title = v.label;
      return icon;
    }).filter(Boolean);
    return groupEl('booking__vehicles', icons);
  },

  // Kiểu ticket (quầy vé): form là cả khối, cột trái là các bước đánh số trong khung (tour, ngày, số khách, điểm đón, thông tin),
  // cột phải là "máy in vé": hoá đơn tạm tính sống, nút giữ chỗ, và phiếu trượt ra khỏi khe khi gửi.
  ticketBody(prefix, tourPick, dates, sum, extra) {
    const section = this._data;
    const labels = section.labels ?? {};
    const f = this._fields;
    const box = (title, ...children) => {
      const fieldset = document.createElement('fieldset');
      fieldset.className = 'booking__box';
      fieldset.append(textEl('legend', 'booking__step-title', title), ...children.filter(Boolean));
      return fieldset;
    };
    tourPick?.classList.add('booking__box');
    const steps = groupEl('booking__steps', [
      tourPick,
      box(labels.departures, dates),
      box(labels.guestsTitle ?? labels.guests, f.guests.field, this.seatPickEl(prefix)),
      f.pickup ? box(labels.pickup, f.pickup.field) : null,
      box(labels.contactTitle ?? labels.name, f.name.field, f.phone.field),
    ]);
    const screen = document.createElement('div');
    screen.className = 'booking__screen';
    screen.append(...[this.dealActive() ? textEl('p', 'booking__hold-deal', section.deal.label) : null, this.countdownEl(), sum].filter(Boolean));
    const slot = document.createElement('div');
    slot.className = 'booking__slot';
    slot.setAttribute('aria-hidden', 'true');
    this._ticket = this.passEl();
    const printer = groupEl('booking__printer', [
      groupEl('booking__printer-body', [textEl('p', 'booking__printer-brand', labels.printer), screen, this._submit, slot]),
      this._ticket,
    ]);
    this._form.classList.add('booking__hold--ticket');
    this._form.append(steps, printer);
    this._form.addEventListener('input', () => this.updateCalendar());
    this._form.addEventListener('submit', (e) => this.submitCalendar(e));
    return groupEl('booking__body', [this._form, extra]);
  },

  // Mã vạch trên thẻ lên xe: độ dày từng vạch suy từ mã vé, nên cùng vé thì cùng vạch. Chỉ để trang trí.
  barcodeEl(code) {
    let x = 0;
    const bars = [...code.repeat(3)].map((c) => {
      const w = 1 + (c.charCodeAt(0) % 4);
      const bar = `<rect x="${x}" width="${w}" height="40"/>`;
      x += w + 1 + (c.charCodeAt(0) % 2);
      return bar;
    }).join('');
    const svg = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" class="booking__pass-bar" viewBox="0 0 ${x} 40" preserveAspectRatio="none" aria-hidden="true">${bars}</svg>`, 'image/svg+xml').documentElement;
    return document.importNode(svg, true);
  },

  // Kiểu ticket: thẻ lên xe thay cho phiếu của kiểu thường. Khung rỗng dựng một lần, submitCalendar điền chữ và mã vạch mỗi lần gửi.
  passEl() {
    const m = this._data.message ?? {};
    const hotline = this.site?.contact?.phone;
    const cell = (label) => {
      const value = document.createElement('dd');
      return { value, node: groupEl('booking__pass-cell', [textEl('dt', '', label), value]) };
    };
    this._pass = { code: textEl('span', 'booking__pass-code', ' '), tour: textEl('h3', 'booking__pass-tour', ' '), route: document.createElement('div'), who: document.createElement('p'), bar: document.createElement('div'), date: cell(m.date), time: cell(m.time), guests: cell(m.seats), total: cell(m.total) };
    this._pass.route.className = 'booking__pass-route';
    this._pass.who.className = 'booking__pass-who';
    const grid = document.createElement('dl');
    grid.className = 'booking__pass-grid';
    grid.append(...['date', 'time', 'guests', 'total'].map((key) => this._pass[key].node));
    this._messageTitle = textEl('p', 'booking__pass-brand', m.brand) ?? document.createElement('p');
    this._messageTitle.tabIndex = -1;
    this._draft = document.createElement('p');
    this._draft.className = 'booking__pass-msg-text';
    this._sms = hotline && m.sms ? Object.assign(document.createElement('a'), { className: 'btn booking__sms', href: '#', textContent: m.sms }) : null;
    const call = hotline && m.call ? Object.assign(document.createElement('a'), { className: 'btn btn--ghost booking__call', href: telHref(hotline), textContent: fill(m.call, { phone: hotline }) }) : null;
    let copy = null;
    if (m.copy) {
      copy = Object.assign(document.createElement('button'), { type: 'button', className: 'btn btn--ghost booking__copy', textContent: m.copy });
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(this._draft.textContent);
          copy.textContent = m.copied ?? m.copy;
          setTimeout(() => { copy.textContent = m.copy; }, 2000);
        } catch {
          getSelection().selectAllChildren(this._draft);
        }
      });
    }
    const pass = groupEl('booking__ticket booking__pass', [
      groupEl('booking__pass-top', [this._messageTitle, this._pass.code]),
      this._pass.tour,
      this._pass.route,
      grid,
      this._pass.who,
      this._pass.bar,
      textEl('span', 'booking__pass-stamp', m.stamp),
      groupEl('booking__pass-msg', [textEl('p', 'booking__pass-msg-title', m.msgTitle), this._draft, groupEl('booking__pass-actions', [this._sms, call, copy])]),
    ]);
    pass.hidden = true;
    return pass;
  },

  // Điền thẻ lên xe: mã vé, tên tour, các phương tiện, ngày, giờ đón, khách, tạm tính, người đặt, mã vạch.
  fillPass(values) {
    const p = this._pass;
    const code = `SG${this._departure.date.replaceAll('-', '').slice(2)}${(this._tour?.id ?? 'tour').slice(0, 2).toUpperCase()}${Math.floor(Math.random() * 900) + 100}`;
    p.code.textContent = code;
    p.tour.textContent = values.tour;
    p.route.replaceChildren(...(this._tour ? this.vehicleList(this._tour) : []).map((v) => {
      const dot = groupEl('booking__pass-vehicle', [iconEl(v.icon, 'booking__vehicle')]);
      if (dot) dot.title = v.label;
      return dot;
    }).filter(Boolean));
    p.date.value.textContent = values.date;
    const start = this._tour?.start ?? this._data.start ?? '';
    p.time.value.textContent = start;
    p.time.node.hidden = !start;
    p.guests.value.textContent = fill(this._data.labels?.guestsValue ?? '{guests}', values);
    p.total.value.textContent = values.total;
    p.who.replaceChildren(`${values.name}, ${values.phone}`, document.createElement('br'), values.pickup);
    p.bar.className = 'booking__pass-barwrap';
    p.bar.replaceChildren(this.barcodeEl(code));
    values.code = code;
  },
};
