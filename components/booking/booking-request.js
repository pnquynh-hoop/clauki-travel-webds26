/* booking-request.js - phương thức của <wl-booking> cho kiểu request (nhà dân tính tiền theo khách): ảnh lớn của nhà, ngày đến, ngày về, người lớn, trẻ em, tạm tính theo đầu người, gửi thành tin nhắn soạn sẵn.
   Ghép vào lớp WlBooking trong wl-booking.js (Object.assign lên prototype), nên `this` vẫn là khối đặt chỗ. */
import { textEl, groupEl } from '../../js/core/dom.js';
import { dayNumber, todayIso, isoAfter, viDate, fill, validPhone, fieldEl, inputEl, showError, imageEl } from './booking-helpers.js';

export const requestMethods = {

  // Ảnh lớn của nhà (một ảnh cố định), chú thích ghi tên nhà, vài nét về chỗ ở và giá mỗi khách.
  placeEl() {
    const section = this._data;
    const labels = section.labels ?? {};
    const caption = groupEl('booking__show-caption', [
      textEl('p', 'booking__show-name', labels.place),
      textEl('p', 'booking__show-facts', labels.placeFacts),
      textEl('p', 'booking__show-price', fill(labels.perGuest, { price: this.money(section.price) })),
    ]);
    const figure = document.createElement('figure');
    figure.className = 'booking__showcase';
    figure.append(...[section.image?.src ? imageEl(section.image, 'booking__shot is-active', true) : null, caption].filter(Boolean));
    return figure;
  },

  requestEl() {
    const section = this._data;
    const labels = section.labels ?? {};
    const prefix = this.id || 'booking';
    if (!section.price) return null;

    // Ngày mẫu (giống stay) để vừa mở đã thấy tạm tính; khách đổi được ngay.
    const dates = section.defaultDates ?? {};
    const checkIn = inputEl('date', { min: todayIso(), required: '' });
    checkIn.value = dates.checkIn ?? '';
    const checkOut = inputEl('date', { required: '' });
    checkOut.value = dates.checkOut ?? '';
    this._fields = {
      checkIn: fieldEl(`${prefix}-checkin`, labels.checkIn, checkIn),
      checkOut: fieldEl(`${prefix}-checkout`, labels.checkOut, checkOut),
      adults: this.counterEl(`${prefix}-adults`, labels.adults, labels.adultsLess, labels.adultsMore, 1, section.defaultAdults ?? 2),
      children: this.counterEl(`${prefix}-children`, labels.children, labels.childrenLess, labels.childrenMore, 0, 0),
      name: fieldEl(`${prefix}-name`, labels.name, inputEl('text', { autocomplete: 'name' })),
      phone: fieldEl(`${prefix}-phone`, labels.phone, inputEl('tel', { autocomplete: 'tel', inputmode: 'tel' })),
    };
    const f = this._fields;
    // Mọi ô chia đôi hàng; class theo tên để màn rộng xếp ba hàng: ngày, khách, liên hệ.
    Object.entries(f).forEach(([key, ref]) => ref.field.classList.add('booking__field--half', `booking__field--${key.toLowerCase()}`));
    const fields = groupEl('booking__fields', Object.values(f).map((ref) => ref.field));

    // Dòng ưu đãi dùng chung chỗ với dòng bình minh của stay: trống thì CSS tự ẩn.
    this._sunrise = document.createElement('p');
    this._sunrise.className = 'booking__sunrise';
    this._lines = document.createElement('dl');
    this._lines.className = 'booking__lines';
    this._total = document.createElement('strong');
    this._total.setAttribute('aria-live', 'polite');
    this._submit = document.createElement('button');
    this._submit.type = 'submit';
    this._submit.className = 'btn booking__submit';
    this._submit.textContent = this.site?.cta?.label ?? '';

    const summary = groupEl('booking__summary', [
      textEl('p', 'booking__summary-title', labels.summary),
      this._sunrise,
      this._lines,
      groupEl('booking__total', [textEl('span', 'booking__total-label', labels.total), this._total]),
      textEl('p', 'booking__includes', labels.includes),
      this._submit,
    ]);

    this._form = document.createElement('form');
    this._form.className = 'booking__card';
    this._form.noValidate = true;
    this._form.append(this.placeEl(), groupEl('booking__panel', [fields, summary]));
    this._form.addEventListener('input', () => this.updateRequest());
    this._form.addEventListener('change', () => this.updateRequest());
    this._form.addEventListener('submit', (e) => this.submitRequest(e));

    this._message = this.messageEl();
    return groupEl('booking__body', [this._form, this._message]);
  },

  // Tính lại từ giá trị trong các ô: số đêm, tiền theo người lớn, trẻ em (giá riêng, thường miễn phí), ưu đãi, tổng.
  quoteRequest() {
    const section = this._data;
    const labels = section.labels ?? {};
    const f = this._fields;
    const adults = Number(f.adults.control.value) || 0;
    const children = Number(f.children.control.value) || 0;
    const checkIn = f.checkIn.control.value;
    const nights = dayNumber(f.checkOut.control.value) - dayNumber(checkIn);
    const valid = nights >= 1 && nights <= (section.maxNights ?? nights);
    const lines = [];
    let total = 0;
    if (valid) {
      total = adults * nights * section.price;
      lines.push([labels.guestLine, fill(labels.guestDetail, { adults, nights, price: this.money(section.price) }), this.money(total)]);
      if (children) {
        const amount = children * nights * (section.childPrice ?? 0);
        total += amount;
        lines.push([labels.childLine, fill(labels.childDetail, { children }), amount ? this.money(amount) : labels.free]);
      }
    }
    // Ưu đãi đầu tiên đủ điều kiện: ở đủ số đêm và (nếu có ghi tháng) ngày đến rơi vào một trong các tháng đó.
    const month = checkIn ? Number(checkIn.slice(5, 7)) : 0;
    const perk = valid ? (section.perks ?? []).find((p) => nights >= (p.minNights ?? 1) && (!p.months?.length || p.months.includes(month))) : null;
    return { adults, children, nights, valid, lines, total, perk };
  },

  // Tổng số khách không vượt maxGuests: bấm thêm tới giới hạn thì nút thêm của cả hai ô mờ đi.
  // Ngày về chỉ chọn được trong khoảng 1 tới maxNights đêm sau ngày đến.
  updateRequest() {
    const section = this._data;
    const f = this._fields;
    const max = section.maxGuests ?? Infinity;
    for (const key of ['adults', 'children']) {
      const ref = f[key];
      const other = Number(f[key === 'adults' ? 'children' : 'adults'].control.value) || 0;
      const value = Math.min(Math.max(ref.min, Number(ref.control.value) || 0), max - other);
      ref.control.value = String(value);
      ref.less.disabled = value <= ref.min;
      ref.more.disabled = value + other >= max;
    }
    const checkIn = f.checkIn.control.value;
    if (checkIn) {
      f.checkOut.control.min = isoAfter(checkIn, 1);
      if (section.maxNights) f.checkOut.control.max = isoAfter(checkIn, section.maxNights);
    }
    const q = this.quoteRequest();
    showError(f.checkOut, q.valid || !f.checkOut.control.value ? '' : section.errors?.dates);
    if (f.name.control.value.trim()) showError(f.name, '');
    if (validPhone(f.phone.control.value.trim())) showError(f.phone, '');

    this._sunrise.textContent = q.perk?.text ?? '';
    this._lines.replaceChildren(...q.lines.map(([label, detail, amount]) => {
      const row = document.createElement('div');
      row.className = 'booking__line';
      const term = document.createElement('dt');
      term.append(...[textEl('span', 'booking__line-label', label), textEl('span', 'booking__line-detail', detail)].filter(Boolean));
      const value = document.createElement('dd');
      value.textContent = amount;
      row.append(term, value);
      return row;
    }));
    this._total.textContent = q.valid ? this.money(q.total) : '';
  },

  // Bấm đặt: kiểm tra ngày, họ tên, số điện thoại; hợp lệ thì soạn tin nhắn và hiện khung tin nhắn (dùng chung với stay).
  submitRequest(e) {
    e.preventDefault();
    const section = this._data;
    const errors = section.errors ?? {};
    const f = this._fields;
    const q = this.quoteRequest();
    const name = f.name.control.value.trim();
    const phone = f.phone.control.value.trim();
    showError(f.checkOut, q.valid ? '' : errors.dates);
    showError(f.name, name ? '' : errors.name);
    showError(f.phone, validPhone(phone) ? '' : errors.phone);
    const invalid = [f.checkOut, f.name, f.phone].find((ref) => !ref.error.hidden);
    if (invalid) {
      (invalid === f.checkOut && !f.checkIn.control.value ? f.checkIn : invalid).control.focus();
      return;
    }
    const text = fill(section.message?.template, {
      name,
      phone,
      checkIn: viDate(f.checkIn.control.value),
      checkOut: viDate(f.checkOut.control.value),
      nights: q.nights,
      adults: q.adults,
      children: q.children,
      total: this.money(q.total),
    });
    this._draft.textContent = text;
    const digits = this.site?.contact?.phone?.replace(/\s/g, '');
    if (this._sms) this._sms.href = `sms:${digits}?body=${encodeURIComponent(text)}`;
    this._form.hidden = true;
    this._message.hidden = false;
    this._messageTitle.focus();
  },
};
