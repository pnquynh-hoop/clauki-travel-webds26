/* booking-calendar.js - phương thức của <wl-booking> cho kiểu calendar (tour theo lịch khởi hành), dùng chung cho wall và ticket: chọn tour, thẻ ngày, điểm đón, số khách, đếm ngược ưu đãi, sơ đồ ghế, tạm tính, phiếu giữ chỗ và tin nhắn soạn sẵn.
   Ghép vào lớp WlBooking trong wl-booking.js (Object.assign lên prototype), nên `this` vẫn là khối đặt chỗ. */
import { textEl, groupEl, telHref } from '../../js/core/dom.js';
import { DAY, dayNumber, todayIso, viDate, fill, validPhone, fieldEl, inputEl, showError, imageEl } from './booking-helpers.js';

export const calendarMethods = {

  /* ========= KIỂU CALENDAR =========
     Tour theo lịch khởi hành cố định, giá tính theo khách. Bên trái là các thẻ ngày khởi hành như tờ lịch (hết chỗ thì khoá),
     danh sách đã gồm, chưa gồm và các điều khoản; bên phải là form giữ chỗ (họ tên, số điện thoại, số khách, tạm tính).
     Gửi form thì in ra phiếu giữ chỗ có dấu "chờ xác nhận", không báo đặt thành công vì chưa ai nhận. */

  // Ưu đãi còn hạn: có số tiền giảm và hôm nay chưa qua ngày hết hạn (không ghi ngày hết hạn thì luôn còn).
  dealActive() {
    const deal = this._data.deal;
    return Boolean(deal?.amount) && (!deal.until || todayIso() <= deal.until);
  },

  // Một thẻ ngày: thứ, ngày, tháng và năm, số chỗ còn. Còn ít chỗ (từ fewSeats trở xuống) thì dòng số chỗ đổi màu nhấn.
  departureEl(dep) {
    const section = this._data;
    const labels = section.labels ?? {};
    const date = new Date(dayNumber(dep.date) * DAY);
    const weekday = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', timeZone: 'UTC' }).format(date);
    const seats = dep.seats > 0 ? fill(labels.seats, { n: dep.seats }) : labels.soldOut;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'booking__date';
    button.disabled = !(dep.seats > 0);
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', `${weekday} ${viDate(dep.date)}, ${String(seats ?? '').toLowerCase()}`);
    const few = dep.seats > 0 && dep.seats <= (section.fewSeats ?? 4);
    button.append(...[
      textEl('span', 'booking__date-dow', this._data.variant === 'ticket' ? new Intl.DateTimeFormat('vi-VN', { weekday: 'short', timeZone: 'UTC' }).format(date) : weekday.charAt(0).toUpperCase() + weekday.slice(1)),
      textEl('span', 'booking__date-day', dep.date.slice(8, 10)),
      textEl('span', 'booking__date-month', fill(labels.month, { m: Number(dep.date.slice(5, 7)), y: dep.date.slice(0, 4) })),
      textEl('span', few ? 'booking__date-seats booking__date-seats--few' : 'booking__date-seats', seats),
      this.seatBarEl(dep.seats),
    ].filter(Boolean));
    button.addEventListener('click', () => {
      this._departure = dep;
      this.updateCalendar();
    });
    return button;
  },

  // Danh sách có tiêu đề (đã gồm, chưa gồm). Danh sách trống thì bỏ cả cột.
  listEl(title, items = [], className) {
    if (!items.length) return null;
    const ul = document.createElement('ul');
    ul.className = className;
    ul.append(...items.map((item) => textEl('li', '', item)));
    return groupEl('booking__term', [textEl('h3', 'booking__term-title', title), ul]);
  },

  // Một điều khoản: tiêu đề, các dòng "nhãn in đậm: nội dung", ghi chú cuối (nếu có).
  policyEl(policy) {
    const ul = document.createElement('ul');
    ul.append(...(policy.items ?? []).filter((item) => item.text).map((item) => {
      const li = document.createElement('li');
      if (item.label) li.append(textEl('strong', '', `${item.label}:`), ' ');
      li.append(item.text);
      return li;
    }));
    return groupEl('booking__policy', [
      textEl('h3', 'booking__term-title', policy.title),
      ul.childElementCount ? ul : null,
      textEl('p', 'booking__policy-note', policy.note),
    ]);
  },

  // Một dòng tạm tính: nhãn bên trái, số tiền bên phải.
  sumRow(className) {
    const row = document.createElement('div');
    row.className = `booking__sum-row ${className}`;
    const term = document.createElement('dt');
    const value = document.createElement('dd');
    row.append(term, value);
    return { row, term, value };
  },

  /* Chế độ chọn tour của kiểu calendar (khai `tours` trong section): khách chọn tour trong danh mục (site.catalog.items), ngày
     còn chỗ lấy từ `availability` của tour đó, giá lấy từ `price` của tour. `tours` là true (mọi tour có lịch) hoặc mảng id
     (chỉ các tour này, giữ thứ tự). Không khai `tours` thì kiểu calendar chạy như cũ với `price` và `departures` của section. */
  toursList() {
    const want = this._data.tours;
    if (!want) return [];
    const items = this.site?.catalog?.items ?? [];
    const pool = Array.isArray(want) ? want.map((id) => items.find((item) => item.id === id)) : items;
    return pool.filter((item) => item?.price && (item.availability ?? []).length);
  },

  tourPrice() {
    return this._tour?.price ?? this._data.price;
  },

  calDepartures() {
    if (!this._tour) return (this._data.departures ?? []).filter((dep) => dep.date);
    return this._tour.availability.filter((a) => a.date).map((a) => ({ date: a.date, seats: a.left }));
  },

  // Điểm đón đang chọn: { label, fee } với fee là phí cả đơn (không nhân số khách); không khai pickups thì không có phí.
  pickup() {
    const list = this._data.pickups ?? [];
    return list.find((p) => p.id === this._fields?.pickup?.control.value) ?? list[0] ?? null;
  },

  // Dựng các thẻ ngày vào hộp ngày. Lịch dài (nhiều tour có cả quý) thì chỉ hiện `datesShown` ngày đầu (mặc định 8), phần còn lại
  // mở bằng nút "Xem thêm"; ngày được chọn sẵn luôn nằm trong phần hiện. Lịch ngắn (Bậc Trà) thì không có nút.
  fillDates() {
    const departures = this.calDepartures();
    this._departure = departures.find((dep) => dep.seats > 0) ?? null;
    if (this._data.variant === 'wall') {
      this._month = (this._departure ?? departures[0])?.date.slice(0, 7);
      this._wall = null;
      this._datesBox.className = 'booking__dates booking__dates--wall';
      this._datesBox.replaceChildren();
      this.paintWall(0);
      return;
    }
    this._dateButtons = departures.map((dep) => ({ dep, button: this.departureEl(dep) }));
    const picked = this._dateButtons.findIndex(({ dep }) => dep === this._departure);
    const shown = Math.max(this._data.datesShown ?? 8, picked + 1);
    this._dateButtons.forEach(({ button }, i) => { button.hidden = i >= shown; });
    const hidden = this._dateButtons.length - shown;
    const more = hidden > 0 && this._data.labels?.moreDates ? textEl('button', 'booking__dates-more', fill(this._data.labels.moreDates, { n: hidden })) : null;
    if (more) {
      more.type = 'button';
      more.addEventListener('click', () => {
        this._dateButtons.forEach(({ button }) => { button.hidden = false; });
        more.remove();
      });
    }
    this._datesBox.replaceChildren(...this._dateButtons.map(({ button }) => button), ...[more].filter(Boolean));
  },

  // Đổi tour: dựng lại các thẻ ngày theo lịch của tour mới, chọn ngày đầu còn chỗ, tính lại tạm tính; phiếu cũ ẩn đi.
  pickTour(id) {
    const tour = this._tours.find((t) => t.id === id);
    if (!tour) return;
    this._tour = tour;
    this.fillDates();
    this._tourRadios?.forEach((radio) => { radio.checked = radio.value === id; });
    if (this._ticket) this._ticket.hidden = true;
    this.updateCalendar();
  },

  // Các thẻ chọn tour: nút radio thật nằm trong thẻ (cùng kiểu thẻ hạng của kiểu stay). Chỉ một tour thì không cần chọn.
  tourPickEl(prefix) {
    if (this._tours.length < 2) return null;
    const labels = this._data.labels ?? {};
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'booking__rooms booking__tours';
    fieldset.append(textEl('legend', 'booking__legend booking__step-title', labels.tour) ?? '');
    const list = document.createElement('div');
    list.className = 'booking__room-list booking__tour-list';
    this._tourRadios = this._tours.map((tour) => {
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = `${prefix}-tour`;
      radio.value = tour.id;
      radio.checked = tour === this._tour;
      radio.className = 'booking__room-input';
      radio.addEventListener('change', () => this.pickTour(tour.id));
      const label = document.createElement('label');
      label.className = 'booking__room booking__tour';
      const thumb = tour.image?.src ? imageEl(tour.image, 'booking__room-thumb', true) : null;
      if (thumb) thumb.alt = '';
      label.append(...[radio, thumb].filter(Boolean), groupEl('booking__room-text', [
        textEl('span', 'booking__room-name', tour.name),
        textEl('span', 'booking__room-price', [tour.start, this.money(tour.price)].filter(Boolean).join(', ')),
        this._data.variant === 'ticket' ? this.vehiclesEl(tour) : null,
      ]));
      list.append(label);
      return radio;
    });
    fieldset.append(list);
    return fieldset;
  },

  // Ô chọn điểm đón: mỗi lựa chọn ghi phí nếu có (phí cả đơn).
  pickupField(prefix) {
    const pickups = this._data.pickups ?? [];
    if (!pickups.length) return null;
    if (this._data.variant === 'ticket') return this.pickupRadios(prefix, pickups);
    const select = document.createElement('select');
    select.className = 'booking__input';
    pickups.forEach((p) => {
      const fee = p.fee ? ` (+ ${this.money(p.fee)})` : '';
      select.append(new Option(`${p.label}${fee}`, p.id));
    });
    return fieldEl(`${prefix}-pickup`, this._data.labels?.pickup, select);
  },

  // Đếm ngược tới hết ngày ưu đãi (deal.until, 23:59:59 giờ máy khách, cùng cách tính với dealActive).
  // Mẫu chữ labels.dealCountdown có {d} {h} {m} {s}; thiếu mẫu hoặc ưu đãi đã hết hạn thì không có dòng này.
  countdownEl() {
    const deal = this._data.deal;
    const template = this._data.labels?.dealCountdown;
    if (!template || !this.dealActive() || !deal.until) return null;
    const [y, m, d] = deal.until.split('-').map(Number);
    const end = new Date(y, m - 1, d, 23, 59, 59);
    const line = textEl('p', 'booking__hold-count', ' ');
    const tick = () => {
      const left = Math.max(0, end - Date.now());
      const two = (n) => String(n).padStart(2, '0');
      line.textContent = fill(template, { d: Math.floor(left / DAY), h: two(Math.floor(left / 36e5) % 24), m: two(Math.floor(left / 6e4) % 60), s: two(Math.floor(left / 1e3) % 60) });
      if (!left) this.stopCountdown();
    };
    this.stopCountdown();
    tick();
    this._countTimer = setInterval(tick, 1000);
    return line;
  },

  // Sơ đồ ghế (tuỳ chọn, khai seatMap.total): các ghế đầu là chỗ đã có người, số ghế trống là số chỗ còn của chuyến đang chọn.
  // Số khách và ghế chọn luôn khớp nhau: bấm ghế thì số khách đổi, đổi số khách hoặc đổi chuyến thì ghế đổi theo.
  seatPickEl(prefix) {
    const total = this._data.seatMap?.total;
    if (!total) return null;
    const labels = this._data.labels ?? {};
    this._picked = new Set();
    this._seatDep = null;
    const map = document.createElement('div');
    map.className = 'booking__seatmap';
    map.setAttribute('role', 'group');
    if (labels.seatMap) map.setAttribute('aria-label', labels.seatMap);
    this._seatButtons = Array.from({ length: total }, (_, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'booking__seat';
      button.textContent = String(i + 1);
      button.addEventListener('click', () => this.toggleSeat(i + 1));
      map.append(button);
      return button;
    });
    return groupEl('booking__seatpick', [textEl('span', 'booking__seatpick-label', labels.seatPick), map]);
  },

  syncSeats(guests) {
    const total = this._data.seatMap.total;
    const dep = this._departure;
    const taken = total - (dep?.seats ?? 0);
    if (this._seatDep !== dep) {
      this._picked = new Set();
      this._seatDep = dep;
    }
    const picks = [...this._picked].filter((n) => n > taken).sort((a, b) => a - b).slice(0, guests);
    for (let n = taken + 1; n <= total && picks.length < guests; n += 1) {
      if (!picks.includes(n)) picks.push(n);
    }
    this._picked = new Set(picks);
    const labels = this._data.labels ?? {};
    this._seatButtons.forEach((button, i) => {
      const n = i + 1;
      button.disabled = n <= taken;
      button.setAttribute('aria-pressed', String(this._picked.has(n)));
      if (n <= taken && labels.seatTaken) button.setAttribute('aria-label', fill(labels.seatTaken, { n }));
      else button.removeAttribute('aria-label');
    });
  },

  toggleSeat(n) {
    const next = new Set(this._picked);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    if (!next.size) return;
    this._picked = next;
    this._fields.guests.control.value = String(next.size);
    this.updateCalendar();
  },

  calendarEl() {
    const section = this._data;
    const labels = section.labels ?? {};
    const prefix = this.id || 'booking';
    this._tours = this.toursList();
    this._tour = this._tours[0] ?? null;
    const departures = this.calDepartures();
    if (!this.tourPrice() || !departures.length) return null;

    // Ngày khởi hành đầu tiên còn chỗ được chọn sẵn (trong fillDates) để vừa mở đã thấy tạm tính.
    const dates = document.createElement('div');
    dates.className = 'booking__dates';
    dates.setAttribute('role', 'group');
    if (labels.departures) dates.setAttribute('aria-label', labels.departures);
    this._datesBox = dates;
    this.fillDates();

    // Bước 1 và 2 (chọn tour, chọn ngày) ở khối chính; "đã gồm", điều khoản đi sau form để trên điện thoại form không bị đẩy xuống cuối.
    const tourPick = this.tourPickEl(prefix);
    const info = groupEl('booking__info', [
      tourPick,
      textEl('h3', 'booking__step-title', labels.departures),
      dates,
    ]);
    const extra = groupEl('booking__extra', [
      groupEl('booking__terms', [
        this.listEl(labels.includesTitle, section.includes, 'booking__included'),
        this.listEl(labels.excludesTitle, section.excludes, 'booking__included booking__included--no'),
        this.listEl(labels.bringTitle, section.bring, 'booking__included booking__included--bring'),
      ]),
      ...(section.policies ?? []).map((policy) => this.policyEl(policy)),
    ]);

    const pickup = this.pickupField(prefix);
    this._fields = {
      name: fieldEl(`${prefix}-name`, labels.name, inputEl('text', { autocomplete: 'name' })),
      phone: fieldEl(`${prefix}-phone`, labels.phone, inputEl('tel', { autocomplete: 'tel', inputmode: 'tel', ...(labels.phoneExample ? { placeholder: labels.phoneExample } : {}) })),
      guests: this.counterEl(`${prefix}-guests`, labels.guests, labels.guestsLess, labels.guestsMore, 1, section.defaultGuests ?? 2),
      ...(pickup ? { pickup } : {}),
    };
    const price = document.createElement('p');
    price.className = 'booking__hold-price';
    this._priceNow = textEl('strong', '', this.money(this.tourPrice()));
    price.append(this._priceNow, ` ${section.priceNote ?? ''}`);
    this._sum = { base: this.sumRow('booking__sum-row--base'), deal: this.sumRow('booking__sum-row--deal'), pickup: this.sumRow('booking__sum-row--pickup'), total: this.sumRow('booking__sum-row--total'), deposit: this.sumRow('booking__sum-row--deposit') };
    const sum = document.createElement('dl');
    sum.className = 'booking__sum';
    sum.append(...Object.values(this._sum).map((line) => line.row));
    this._submit = document.createElement('button');
    this._submit.type = 'submit';
    this._submit.className = 'btn booking__submit';
    this._submit.textContent = this.site?.cta?.label ?? '';

    this._form = document.createElement('form');
    this._form.className = 'booking__hold';
    this._form.noValidate = true;
    if (section.variant === 'ticket') return this.ticketBody(prefix, tourPick, dates, sum, extra);
    this._form.append(...[
      textEl('h3', 'booking__step-title', labels.holdTitle),
      price,
      this.dealActive() ? textEl('p', 'booking__hold-deal', section.deal.label) : null,
      this.countdownEl(),
      ...Object.values(this._fields).map((ref) => ref.field),
      this.seatPickEl(prefix),
      sum,
      this._submit,
    ].filter(Boolean));
    this._form.addEventListener('input', () => this.updateCalendar());
    this._form.addEventListener('submit', (e) => this.submitCalendar(e));

    this._ticket = this.ticketEl();
    const layout = groupEl('booking__layout', [info, this._form, extra]);
    // Có tiêu đề cho form thì ba khối thành ba bước đánh số 1, 2, 3; không có thì chỉ là các tiêu đề thường.
    if (labels.holdTitle) layout.classList.add('booking__layout--steps');
    return groupEl('booking__body', [layout, this._ticket]);
  },

  // Tạm tính theo số khách: giá một khách nhân số khách, trừ ưu đãi mỗi khách nếu còn hạn; tiền cọc tính riêng.
  quoteCalendar() {
    const section = this._data;
    const guests = Number(this._fields.guests.control.value) || 0;
    const base = this.tourPrice() * guests;
    const discount = this.dealActive() ? section.deal.amount * guests : 0;
    const fee = this.pickup()?.fee ?? 0;
    return { guests, base, discount, fee, total: base - discount + fee, deposit: (section.deposit ?? 0) * guests };
  },

  // Số khách không vượt số chỗ còn của chuyến đang chọn; đổi chuyến thì số khách tự thu lại cho vừa.
  updateCalendar() {
    const section = this._data;
    const labels = section.labels ?? {};
    const dep = this._departure;
    this._dateButtons.forEach(({ dep: d, button }) => button.setAttribute('aria-pressed', String(d === dep)));
    const g = this._fields.guests;
    const max = dep?.seats ?? 0;
    const value = Math.min(Math.max(g.min, Number(g.control.value) || 0), Math.max(max, g.min));
    g.control.value = String(value);
    g.less.disabled = value <= g.min;
    g.more.disabled = value >= max;
    this._submit.disabled = !dep;
    if (this._seatButtons) this.syncSeats(value);
    if (this._fields.name.control.value.trim()) showError(this._fields.name, '');
    if (validPhone(this._fields.phone.control.value.trim())) showError(this._fields.phone, '');

    const q = this.quoteCalendar();
    const s = this._sum;
    if (this._priceNow) this._priceNow.textContent = this.money(this.tourPrice());
    s.base.term.textContent = fill(labels.baseLine, { price: this.money(this.tourPrice()), guests: q.guests });
    s.base.value.textContent = this.money(q.base);
    s.deal.row.hidden = !q.discount;
    s.deal.term.textContent = labels.dealLine ?? '';
    s.deal.value.textContent = `− ${this.money(q.discount)}`;
    s.pickup.row.hidden = !q.fee;
    s.pickup.term.textContent = fill(labels.pickupLine, { label: this.pickup()?.label ?? '' });
    s.pickup.value.textContent = `+ ${this.money(q.fee)}`;
    s.total.term.textContent = labels.total ?? '';
    s.total.value.textContent = this.money(q.total);
    s.deposit.row.hidden = !q.deposit;
    s.deposit.term.textContent = labels.deposit ?? '';
    s.deposit.value.textContent = this.money(q.deposit);
  },

  // Phiếu giữ chỗ: tên, chặng đi, bốn ô thông tin, tin nhắn soạn sẵn; cuống phiếu có dấu "chờ xác nhận" và các nút gửi.
  ticketEl() {
    const m = this._data.message ?? {};
    const hotline = this.site?.contact?.phone;
    this._ticketInfo = {};
    const info = document.createElement('dl');
    info.className = 'booking__ticket-info';
    for (const key of ['guest', 'date', 'seats', 'total']) {
      const value = document.createElement('dd');
      this._ticketInfo[key] = value;
      info.append(groupEl('booking__ticket-cell', [textEl('dt', '', m[key]), value]));
    }
    this._messageTitle = textEl('p', 'booking__ticket-brand', m.brand) ?? document.createElement('p');
    this._messageTitle.tabIndex = -1;
    // Vạch nét đứt nối điểm đi với điểm đến chỉ để trang trí, trình đọc màn hình bỏ qua.
    const line = document.createElement('span');
    line.className = 'booking__ticket-line';
    line.setAttribute('aria-hidden', 'true');
    this._routeLine = line;
    line.hidden = !(m.from && m.to);
    // Điểm đi, điểm đến: chữ mặc định trong message, gửi phiếu thì đổi theo điểm đón và tour khách đã chọn (submitCalendar).
    this._routeFrom = Object.assign(document.createElement('span'), { textContent: m.from ?? '' });
    this._routeTo = Object.assign(document.createElement('span'), { textContent: m.to ?? '' });
    const route = groupEl('booking__ticket-route', [this._routeFrom, line, this._routeTo]);
    this._draft = document.createElement('p');
    this._draft.className = 'booking__ticket-msg';

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
    const ticket = groupEl('booking__ticket', [
      groupEl('booking__ticket-main', [this._messageTitle, route, info, this._draft]),
      groupEl('booking__ticket-stub', [textEl('p', 'booking__ticket-stamp', m.stamp), this._sms, call, copy]),
    ]);
    ticket.hidden = true;
    return ticket;
  },

  // Bấm giữ chỗ: kiểm tra họ tên, số điện thoại; hợp lệ thì điền phiếu, soạn tin nhắn và hiện phiếu ngay dưới form.
  submitCalendar(e) {
    e.preventDefault();
    const section = this._data;
    const errors = section.errors ?? {};
    const f = this._fields;
    const name = f.name.control.value.trim();
    const phone = f.phone.control.value.trim();
    showError(f.name, name ? '' : errors.name);
    showError(f.phone, validPhone(phone) ? '' : errors.phone);
    const invalid = [f.name, f.phone].find((ref) => !ref.error.hidden);
    if (invalid || !this._departure) {
      invalid?.control.focus();
      return;
    }
    const q = this.quoteCalendar();
    const date = viDate(this._departure.date);
    const values = { name, phone, date, guests: q.guests, total: this.money(q.total), tour: this._tour?.name ?? section.tourName ?? '', pickup: this.pickup()?.label ?? '', seats: this._seatButtons ? [...this._picked].sort((a, b) => a - b).join(', ') : '' };
    if (this._pass) {
      this.fillPass(values);
    } else {
      const t = this._ticketInfo;
      t.guest.textContent = name;
      t.date.textContent = date;
      t.seats.textContent = fill(section.labels?.guestsValue ?? '{guests}', values);
      t.total.textContent = values.total;
      const from = values.pickup || section.message?.from || '';
      const to = this._tour?.name || section.message?.to || '';
      this._routeFrom.textContent = from;
      this._routeTo.textContent = to;
      this._routeLine.hidden = !(from && to);
    }
    const text = fill(section.message?.template, values);
    this._draft.textContent = text;
    const digits = this.site?.contact?.phone?.replace(/\s/g, '');
    if (this._sms) this._sms.href = `sms:${digits}?body=${encodeURIComponent(text)}`;
    // Ẩn rồi hiện lại để dấu "chờ xác nhận" đóng lại mỗi lần gửi.
    this._ticket.hidden = true;
    void this._ticket.offsetWidth;
    this._ticket.hidden = false;
    this._messageTitle.focus({ preventScroll: true });
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._ticket.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
  },
};
