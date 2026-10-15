/* wl-seat-booking.js - form giữ chỗ gọn có sơ đồ ghế, cho landing page chuyến có số ghế ít: ngày đi, số khách, chọn ghế,
   họ tên, số điện thoại, tạm tính. Số khách và ghế chọn luôn khớp nhau (bấm ghế thì số khách đổi, bấm bớt hoặc thêm
   khách thì ghế đổi theo). Gửi thì kiểm từng ô, hợp lệ thì soạn sẵn tin nhắn kèm nút gửi SMS, gọi, chép; trang tĩnh
   không có máy chủ nên không báo "đặt thành công". Mọi chữ lấy từ section; hotline lấy từ site.contact.phone. */
import { asset } from '../core.js';
import { textEl, groupEl, telHref } from '../dom.js';

let uid = 0;

function fill(template, values) {
  return template?.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '') ?? '';
}

function money(amount, currency) {
  return `${Number(amount).toLocaleString('vi-VN')} ${currency ?? ''}`.trim();
}

function validPhone(text) {
  return /^(0|\+84)\d{9}$/.test(text.replace(/[\s.]/g, ''));
}

export class WlSeatBooking extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  // Ghế đã có người là các ghế đầu; ghế trống đánh số tiếp theo. Không khai `seats` thì không có sơ đồ ghế.
  freeSeats() {
    const seats = this._data.seats;
    if (!seats?.total) return [];
    const taken = seats.taken ?? 0;
    return Array.from({ length: seats.total - taken }, (_, i) => taken + i + 1);
  }

  maxGuests() {
    const free = this.freeSeats().length;
    return free || (this._data.maxGuests ?? 8);
  }

  fieldEl(label, control, error) {
    const id = `seat-booking-${uid += 1}`;
    const wrap = document.createElement('div');
    wrap.className = 'seat-booking__field';
    const labelEl = document.createElement('label');
    labelEl.htmlFor = id;
    labelEl.textContent = label ?? '';
    control.id = id;
    wrap.append(labelEl, control);
    if (error) {
      error.id = `${id}-error`;
      control.setAttribute('aria-describedby', error.id);
      wrap.append(error);
    }
    return wrap;
  }

  errorEl() {
    const p = document.createElement('p');
    p.className = 'seat-booking__error';
    p.hidden = true;
    return p;
  }

  setError(error, control, message) {
    error.textContent = message ?? '';
    error.hidden = !message;
    if (message) control.setAttribute('aria-invalid', 'true');
    else control.removeAttribute('aria-invalid');
  }

  // Số khách và ghế chọn khớp nhau: ghế nhiều hơn số khách thì bỏ bớt từ ghế cuối, ít hơn thì thêm ghế trống nhỏ nhất.
  syncSeats() {
    const free = this.freeSeats();
    if (!free.length) return;
    const seats = [...this._picked].sort((a, b) => a - b);
    while (seats.length > this._guests) seats.pop();
    free.forEach((n) => { if (seats.length < this._guests && !seats.includes(n)) seats.push(n); });
    this._picked = new Set(seats);
  }

  paint() {
    const m = this._data;
    this._refs.guests.value = this._guests;
    this._refs.less.disabled = this._guests <= 1;
    this._refs.more.disabled = this._guests >= this.maxGuests();
    (this._refs.seatButtons ?? []).forEach((btn) => btn.setAttribute('aria-pressed', String(this._picked.has(Number(btn.dataset.seat)))));
    // Không khai giá thì không tính: bỏ cả dòng tạm tính chứ không hiện NaN.
    this._refs.totalRow.hidden = !Number.isFinite(m.price);
    if (Number.isFinite(m.price)) this._refs.total.textContent = money(this._guests * m.price, m.currency);
  }

  setGuests(count) {
    this._guests = Math.min(this.maxGuests(), Math.max(1, count));
    this.syncSeats();
    this.paint();
  }

  toggleSeat(number) {
    const next = new Set(this._picked);
    if (next.has(number)) next.delete(number);
    else next.add(number);
    if (!next.size) return;
    this._picked = next;
    this._guests = next.size;
    this.paint();
  }

  seatMapEl() {
    const seats = this._data.seats;
    if (!seats?.total) return null;
    const map = document.createElement('div');
    map.className = 'seat-booking__seats';
    map.setAttribute('role', 'group');
    map.setAttribute('aria-label', this._data.labels?.seatMap ?? '');
    this._refs.seatButtons = [];
    for (let n = 1; n <= seats.total; n += 1) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = n;
      if (n <= (seats.taken ?? 0)) {
        btn.className = 'is-taken';
        btn.disabled = true;
        btn.setAttribute('aria-label', fill(this._data.labels?.seatTaken, { n }));
      } else {
        btn.dataset.seat = n;
        btn.setAttribute('aria-pressed', 'false');
        btn.addEventListener('click', () => this.toggleSeat(n));
        this._refs.seatButtons.push(btn);
      }
      map.append(btn);
    }
    return map;
  }

  guestsEl() {
    const labels = this._data.labels ?? {};
    const box = document.createElement('div');
    box.className = 'seat-booking__guests';
    this._refs.less = textEl('button', 'seat-booking__step', '-');
    this._refs.more = textEl('button', 'seat-booking__step', '+');
    this._refs.less.type = 'button';
    this._refs.more.type = 'button';
    this._refs.less.setAttribute('aria-label', labels.guestsLess ?? '');
    this._refs.more.setAttribute('aria-label', labels.guestsMore ?? '');
    this._refs.guests = document.createElement('output');
    this._refs.less.addEventListener('click', () => this.setGuests(this._guests - 1));
    this._refs.more.addEventListener('click', () => this.setGuests(this._guests + 1));
    box.append(this._refs.less, this._refs.guests, this._refs.more);
    return box;
  }

  // Kiểm từng ô; ô sai đầu tiên nhận focus. Trả về true khi hợp lệ.
  check() {
    const e = this._data.errors ?? {};
    const name = this._refs.name.value.trim();
    const phoneOk = validPhone(this._refs.phone.value);
    this.setError(this._refs.nameError, this._refs.name, name ? '' : e.name);
    this.setError(this._refs.phoneError, this._refs.phone, phoneOk ? '' : e.phone);
    if (!name) { this._refs.name.focus(); return false; }
    if (!phoneOk) { this._refs.phone.focus(); return false; }
    return true;
  }

  submit() {
    if (!this.check()) return;
    const m = this._data;
    const message = m.message ?? {};
    const seats = [...this._picked].sort((a, b) => a - b).join(', ');
    const text = fill(message.template, {
      name: this._refs.name.value.trim(),
      phone: this._refs.phone.value.trim(),
      guests: this._guests,
      date: this._refs.date.value,
      seats,
      total: money(this._guests * m.price, m.currency),
    });
    const hotline = this.site?.contact?.phone;
    this._refs.draft.textContent = text;
    if (this._refs.sms) this._refs.sms.href = `sms:${hotline.replace(/\s/g, '')}?body=${encodeURIComponent(text)}`;
    this._refs.form.classList.add('is-done');
    this._refs.done.hidden = false;
    this._refs.done.querySelector('h3')?.focus();
  }

  doneEl() {
    const message = this._data.message ?? {};
    const hotline = this.site?.contact?.phone;
    this._refs.draft = document.createElement('p');
    this._refs.draft.className = 'seat-booking__draft';
    this._refs.sms = hotline && message.sms ? textEl('a', 'btn', message.sms) : null;
    const callText = fill(message.call, { phone: hotline });
    const call = hotline && callText ? textEl('a', 'btn btn--ghost', callText) : null;
    if (call) call.href = telHref(hotline);
    const copy = message.copy ? textEl('button', 'btn btn--ghost', message.copy) : null;
    if (copy) {
      copy.type = 'button';
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(this._refs.draft.textContent);
          copy.textContent = message.copied ?? message.copy;
          setTimeout(() => { copy.textContent = message.copy; }, 2000);
        } catch {
          getSelection().selectAllChildren(this._refs.draft);
        }
      });
    }
    const edit = textEl('button', 'seat-booking__edit', message.edit);
    if (edit) {
      edit.type = 'button';
      edit.addEventListener('click', () => {
        this._refs.form.classList.remove('is-done');
        this._refs.done.hidden = true;
      });
    }
    const title = textEl('h3', 'seat-booking__done-title', message.title) ?? document.createElement('h3');
    title.tabIndex = -1;
    const box = groupEl('seat-booking__done', [title, this._refs.draft, groupEl('seat-booking__actions', [this._refs.sms, call, copy, edit])]);
    box.hidden = true;
    return box;
  }

  render() {
    const m = this._data;
    const labels = m.labels ?? {};
    this.className = m.variant ? `seat-booking seat-booking--${m.variant}` : 'seat-booking';
    this._refs = {};
    this._picked = new Set();
    this._guests = Math.min(this.maxGuests(), m.defaultGuests ?? 2);

    const head = groupEl('seat-booking__head', [
      textEl('p', 'seat-booking__eyebrow', m.eyebrow),
      textEl('h2', 'seat-booking__title', m.title),
      textEl('p', 'seat-booking__lead', m.lead),
    ]);

    const form = document.createElement('form');
    form.className = 'seat-booking__form';
    form.noValidate = true;
    this._refs.form = form;

    const date = document.createElement('select');
    (m.dates ?? []).forEach((value) => date.append(new Option(value, value)));
    this._refs.date = date;

    this._refs.name = document.createElement('input');
    this._refs.name.autocomplete = 'name';
    this._refs.nameError = this.errorEl();
    this._refs.phone = document.createElement('input');
    this._refs.phone.type = 'tel';
    this._refs.phone.inputMode = 'tel';
    this._refs.phone.autocomplete = 'tel';
    this._refs.phone.placeholder = labels.phoneExample ?? '';
    this._refs.phoneError = this.errorEl();

    const total = document.createElement('strong');
    this._refs.total = total;
    const totalRow = groupEl('seat-booking__total', [textEl('span', '', labels.total), total]);
    this._refs.totalRow = totalRow;
    const submit = textEl('button', 'btn seat-booking__submit', labels.submit ?? this.site?.cta?.label);
    if (submit) submit.type = 'submit';
    this._refs.done = this.doneEl();

    const seatField = this.seatMapEl();
    // Số khách là cụm nút chứ không phải một ô nhập: dùng nhóm có nhãn thay cho <label>.
    const guestField = groupEl('seat-booking__field', [textEl('span', 'seat-booking__label', labels.guests), this.guestsEl()]);
    const seatBlock = seatField ? groupEl('seat-booking__field', [textEl('span', 'seat-booking__label', fill(labels.seats, { left: this.freeSeats().length, total: m.seats.total })), seatField]) : null;

    form.append(...[
      m.dates?.length ? this.fieldEl(labels.date, date) : null,
      guestField,
      seatBlock,
      this.fieldEl(labels.name, this._refs.name, this._refs.nameError),
      this.fieldEl(labels.phone, this._refs.phone, this._refs.phoneError),
      totalRow,
      submit,
      this._refs.done,
    ].filter(Boolean));
    form.addEventListener('submit', (event) => { event.preventDefault(); this.submit(); });

    // Ảnh tách nền đứng cạnh form, ẩn với trình đọc màn hình vì không có chữ.
    const pic = m.image?.src ? document.createElement('img') : null;
    if (pic) {
      pic.className = 'seat-booking__pic';
      pic.src = asset(m.image.src);
      pic.alt = m.image.alt ?? '';
      pic.loading = 'lazy';
      if (!pic.alt) pic.setAttribute('aria-hidden', 'true');
    }

    const inner = document.createElement('div');
    inner.className = 'seat-booking__inner container';
    const side = groupEl('seat-booking__side', [head, pic]);
    inner.append(...[side, form].filter(Boolean));
    this.replaceChildren(inner);
    this.syncSeats();
    this.paint();
  }
}
