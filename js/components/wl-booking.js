/* wl-booking.js - khối đặt chỗ: khách chọn ngày và hạng, điền tên, số điện thoại, xem tạm tính.
   Không có máy chủ nên "đặt" nghĩa là soạn sẵn tin nhắn để khách gửi cho hotline (SMS, gọi, hoặc chép);
   trang không báo đặt thành công khi chưa ai nhận.
   Mỗi kiểu trình bày có ô nhập khác nhau nên rẽ nhánh JS theo variant: stay (ngày nhận, trả phòng, hạng nhà, số khách);
   calendar (chọn chuyến khởi hành) và request (gửi yêu cầu giữ phòng) do người phụ trách Bậc Trà, Mé Rạch thêm. */
import { textEl, groupEl, telHref } from '../dom.js';

const DAY = 86400000;

// Ngày trong JSON và trong ô date đều dạng yyyy-mm-dd; đổi ra số ngày theo UTC để trừ nhau không lệch múi giờ.
function dayNumber(iso) {
  if (!iso) return NaN;
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY;
}

function todayIso() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
}

function isoAfter(iso, days) {
  return new Date((dayNumber(iso) + days) * DAY).toISOString().slice(0, 10);
}

function viDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Điền {tên} trong câu mẫu lấy từ content.json bằng giá trị tương ứng.
function fill(template, values) {
  return (template ?? '').replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
}

// Số điện thoại Việt Nam: 10 chữ số bắt đầu bằng 0, hoặc +84 thay cho số 0; cho phép dấu cách và dấu chấm.
function validPhone(text) {
  return /^(0|\+84)\d{9}$/.test(text.replace(/[\s.]/g, ''));
}

// Một ô nhập: nhãn, ô, dòng báo lỗi ngay dưới ô (ẩn khi không có lỗi). aria-describedby nối ô với dòng lỗi.
function fieldEl(id, label, control) {
  const field = document.createElement('div');
  field.className = 'booking__field';
  const labelEl = document.createElement('label');
  labelEl.htmlFor = id;
  labelEl.textContent = label ?? '';
  control.id = id;
  const error = document.createElement('p');
  error.className = 'booking__error';
  error.id = `${id}-error`;
  error.hidden = true;
  control.setAttribute('aria-describedby', error.id);
  field.append(labelEl, control, error);
  return { field, control, error };
}

function inputEl(type, attrs = {}) {
  const input = document.createElement('input');
  input.type = type;
  input.className = 'booking__input';
  Object.entries(attrs).forEach(([key, value]) => input.setAttribute(key, value));
  return input;
}

function selectEl(options) {
  const select = document.createElement('select');
  select.className = 'booking__input';
  select.append(...options.map(([value, text]) => new Option(text, value)));
  return select;
}

function showError(ref, message) {
  ref.error.textContent = message ?? '';
  ref.error.hidden = !message;
  if (message) ref.control.setAttribute('aria-invalid', 'true');
  else ref.control.removeAttribute('aria-invalid');
}

export class WlBooking extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  money(amount) {
    return `${amount.toLocaleString('vi-VN')} ${this._data.currency ?? ''}`.trim();
  }

  // Số căn còn trống của hạng đã chọn, theo khoảng ngày chứa ngày nhận phòng; ngoài các khoảng đã ghi thì không biết.
  roomsLeft(roomId, checkIn) {
    const day = dayNumber(checkIn);
    const period = (this._data.availability ?? []).find((p) => day >= dayNumber(p.from) && day <= dayNumber(p.to));
    return period?.left?.[roomId];
  }

  // Ưu đãi đặt sớm: đặt trước hạn bookBy, ngày nhận phòng nằm trong mùa ưu đãi và ở đủ số đêm thì trừ tiền phòng vài đêm.
  offerFor(checkIn, nights) {
    const offer = this._data.offer;
    if (!offer) return false;
    const day = dayNumber(checkIn);
    return dayNumber(todayIso()) <= dayNumber(offer.bookBy)
      && day >= dayNumber(offer.from) && day <= dayNumber(offer.to)
      && nights >= offer.minNights;
  }

  // Tính lại mọi thứ từ giá trị đang có trong các ô: số đêm, tiền phòng, thêm khách, ưu đãi, tổng, số căn còn.
  quote() {
    const section = this._data;
    const f = this._fields;
    const labels = section.labels ?? {};
    const room = section.rooms.find((r) => r.id === f.room.control.value) ?? section.rooms[0];
    const guests = Number(f.guests.control.value);
    const nights = dayNumber(f.checkOut.control.value) - dayNumber(f.checkIn.control.value);
    const left = this.roomsLeft(room.id, f.checkIn.control.value);
    const lines = [];
    let total = 0;
    if (nights > 0) {
      total = nights * room.price;
      lines.push([labels.roomLine, fill(labels.roomDetail, { nights, price: this.money(room.price) }), this.money(total)]);
      const extra = Math.max(0, guests - (section.includedGuests ?? guests));
      if (extra && section.extraGuestPrice) {
        const amount = extra * nights * section.extraGuestPrice;
        total += amount;
        lines.push([labels.extraLine, fill(labels.extraDetail, { guests: extra, nights, price: this.money(section.extraGuestPrice) }), this.money(amount)]);
      }
      if (this.offerFor(f.checkIn.control.value, nights)) {
        const amount = room.price * (section.offer.freeNights ?? 1);
        total -= amount;
        lines.push([section.offer.label, section.offer.note, `-${this.money(amount)}`, true]);
      }
    }
    return { room, guests, nights, left, lines, total };
  }

  // Đổi hạng thì số khách tối đa đổi theo; giữ số khách đang chọn nếu hạng mới còn chứa được.
  syncGuests(room) {
    const select = this._fields.guests.control;
    const current = Number(select.value) || this._data.includedGuests || 1;
    const unit = this._data.labels?.guestUnit ?? '';
    const options = Array.from({ length: room.maxGuests }, (_, i) => [String(i + 1), `${i + 1} ${unit}`.trim()]);
    select.replaceChildren(...options.map(([value, text]) => new Option(text, value)));
    select.value = String(Math.min(current, room.maxGuests));
  }

  updateStay() {
    const section = this._data;
    const f = this._fields;
    // Cập nhật danh sách số khách theo hạng trước khi tính tiền, để tạm tính không dùng số khách vượt sức chứa.
    const room = section.rooms.find((r) => r.id === f.room.control.value) ?? section.rooms[0];
    if (f.guests.control.options.length !== room.maxGuests) this.syncGuests(room);
    const q = this.quote();
    // Ngày trả phòng sớm nhất là sau ngày nhận một đêm.
    if (f.checkIn.control.value) f.checkOut.control.min = isoAfter(f.checkIn.control.value, 1);
    showError(f.checkOut, q.nights > 0 || !f.checkOut.control.value ? '' : section.errors?.dates);
    // Lỗi tên và số điện thoại chỉ báo khi bấm đặt; khách sửa đúng thì tắt ngay, không chờ bấm lại.
    if (f.name.control.value.trim()) showError(f.name, '');
    if (validPhone(f.phone.control.value.trim())) showError(f.phone, '');

    const labels = section.labels ?? {};
    const soldOut = q.left === 0;
    this._badge.textContent = q.left === undefined ? '' : soldOut ? labels.soldOut : fill(labels.left, { n: q.left });
    this._badge.hidden = q.left === undefined;
    this._badge.classList.toggle('is-out', soldOut);
    showError(f.room, soldOut ? section.errors?.soldOut : '');
    this._submit.disabled = soldOut;

    this._lines.replaceChildren(...q.lines.map(([label, detail, amount, saving]) => {
      const row = document.createElement('div');
      row.className = saving ? 'booking__line booking__line--saving' : 'booking__line';
      const term = document.createElement('dt');
      term.append(...[textEl('span', 'booking__line-label', label), textEl('span', 'booking__line-detail', detail)].filter(Boolean));
      const value = document.createElement('dd');
      value.textContent = amount;
      row.append(term, value);
      return row;
    }));
    this._total.textContent = q.nights > 0 ? this.money(q.total) : '';
  }

  // Bấm đặt: kiểm tra các ô, có lỗi thì báo dưới ô và đưa con trỏ tới ô sai đầu tiên;
  // hợp lệ thì soạn tin nhắn từ câu mẫu trong content.json và hiện khung tin nhắn thay cho form.
  submitStay(e) {
    e.preventDefault();
    const section = this._data;
    const errors = section.errors ?? {};
    const f = this._fields;
    const q = this.quote();
    const name = f.name.control.value.trim();
    const phone = f.phone.control.value.trim();
    showError(f.checkOut, q.nights > 0 ? '' : errors.dates);
    showError(f.name, name ? '' : errors.name);
    showError(f.phone, validPhone(phone) ? '' : errors.phone);
    const invalid = Object.values(f).find((ref) => !ref.error.hidden);
    if (invalid || q.left === 0) {
      (invalid ?? f.room).control.focus();
      return;
    }

    const text = fill(section.message?.template, {
      name,
      phone,
      room: q.room.label,
      checkIn: viDate(f.checkIn.control.value),
      checkOut: viDate(f.checkOut.control.value),
      nights: q.nights,
      guests: q.guests,
      total: this.money(q.total),
    });
    this._draft.textContent = text;
    const hotline = this.site?.contact?.phone;
    const digits = hotline?.replace(/\s/g, '');
    if (this._sms) this._sms.href = `sms:${digits}?body=${encodeURIComponent(text)}`;
    this._form.hidden = true;
    this._message.hidden = false;
    this._messageTitle.focus();
  }

  messageEl() {
    const m = this._data.message ?? {};
    const hotline = this.site?.contact?.phone;
    this._messageTitle = textEl('h3', 'booking__message-title', m.title) ?? document.createElement('h3');
    this._messageTitle.tabIndex = -1;
    this._draft = document.createElement('p');
    this._draft.className = 'booking__draft';

    const link = (className, href, text) => {
      if (!href || !text) return null;
      const a = document.createElement('a');
      a.className = className;
      a.href = href;
      a.textContent = text;
      return a;
    };
    this._sms = hotline ? link('btn booking__sms', '#', m.sms) : null;
    const call = link('btn btn--ghost booking__call', telHref(hotline), fill(m.call, { phone: hotline }));

    // Chép tin nhắn vào bộ nhớ tạm; trình duyệt chặn thì chọn sẵn đoạn chữ để khách tự chép.
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'btn btn--ghost booking__copy';
    copy.textContent = m.copy ?? '';
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(this._draft.textContent);
        copy.textContent = m.copied ?? m.copy ?? '';
        setTimeout(() => { copy.textContent = m.copy ?? ''; }, 2000);
      } catch {
        getSelection().selectAllChildren(this._draft);
      }
    });

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'booking__edit';
    edit.textContent = m.edit ?? '';
    edit.addEventListener('click', () => {
      this._message.hidden = true;
      this._form.hidden = false;
      this._fields.checkIn.control.focus();
    });

    const box = groupEl('booking__message', [
      this._messageTitle,
      textEl('p', 'booking__message-lead', m.lead),
      this._draft,
      groupEl('booking__message-actions', [this._sms, call, m.copy ? copy : null]),
      m.edit ? edit : null,
    ]);
    box.hidden = true;
    return box;
  }

  stayEl() {
    const section = this._data;
    const labels = section.labels ?? {};
    const prefix = this.id || 'booking';
    const rooms = section.rooms ?? [];
    if (!rooms.length) return null;

    const dates = section.defaultDates ?? {};
    const checkIn = inputEl('date', { min: todayIso(), required: '' });
    checkIn.value = dates.checkIn ?? '';
    const checkOut = inputEl('date', { required: '' });
    checkOut.value = dates.checkOut ?? '';
    this._fields = {
      checkIn: fieldEl(`${prefix}-checkin`, labels.checkIn, checkIn),
      checkOut: fieldEl(`${prefix}-checkout`, labels.checkOut, checkOut),
      room: fieldEl(`${prefix}-room`, labels.room, selectEl(rooms.map((r) => [r.id, r.label]))),
      guests: fieldEl(`${prefix}-guests`, labels.guests, selectEl([])),
      name: fieldEl(`${prefix}-name`, labels.name, inputEl('text', { autocomplete: 'name' })),
      phone: fieldEl(`${prefix}-phone`, labels.phone, inputEl('tel', { autocomplete: 'tel', inputmode: 'tel' })),
    };
    this.syncGuests(rooms[0]);
    const f = this._fields;
    f.checkIn.field.classList.add('booking__field--half');
    f.checkOut.field.classList.add('booking__field--half');
    f.name.field.classList.add('booking__field--half');
    f.phone.field.classList.add('booking__field--half');
    const fields = groupEl('booking__fields', Object.values(f).map((ref) => ref.field));

    this._badge = document.createElement('p');
    this._badge.className = 'booking__badge';
    this._lines = document.createElement('dl');
    this._lines.className = 'booking__lines';
    this._total = document.createElement('strong');
    // Đọc lại tổng tiền mỗi khi đổi, để người dùng trình đọc màn hình biết tạm tính vừa thay đổi.
    this._total.setAttribute('aria-live', 'polite');
    this._submit = document.createElement('button');
    this._submit.type = 'submit';
    this._submit.className = 'btn booking__submit';
    this._submit.textContent = this.site?.cta?.label ?? '';

    const summary = groupEl('booking__summary', [
      groupEl('booking__summary-head', [textEl('p', 'booking__summary-title', labels.summary), this._badge]),
      this._lines,
      groupEl('booking__total', [textEl('span', 'booking__total-label', labels.total), this._total]),
      textEl('p', 'booking__includes', labels.includes),
      this._submit,
    ]);

    this._form = document.createElement('form');
    this._form.className = 'booking__card';
    // Tự kiểm tra và báo lỗi bằng chữ trong content.json thay cho bong bóng lỗi mặc định của trình duyệt.
    this._form.noValidate = true;
    this._form.append(fields, summary);
    this._form.addEventListener('input', () => this.updateStay());
    this._form.addEventListener('change', () => this.updateStay());
    this._form.addEventListener('submit', (e) => this.submitStay(e));

    this._message = this.messageEl();
    return groupEl('booking__body', [this._form, this._message]);
  }

  render() {
    const section = this._data;
    const variant = section.variant ?? 'calendar';
    this.className = `booking booking--${variant}`;

    const head = groupEl('booking__head', [
      textEl('p', 'booking__eyebrow', section.eyebrow),
      textEl('h2', 'booking__title', section.title),
      textEl('p', 'booking__lead', section.lead),
    ]);
    const body = variant === 'stay' ? this.stayEl() : null;
    if (!body) console.warn(`Khối đặt chỗ: kiểu "${variant}" chưa có hoặc thiếu dữ liệu.`);

    this.replaceChildren(...[groupEl('booking__inner container', [head, body])].filter(Boolean));
    if (body) this.updateStay();
  }
}
