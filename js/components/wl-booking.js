/* wl-booking.js - khối đặt chỗ: khách chọn ngày và hạng, điền tên, số điện thoại, xem tạm tính.
   Không có máy chủ nên "đặt" nghĩa là soạn sẵn tin nhắn để khách gửi cho hotline (SMS, gọi, hoặc chép);
   trang không báo đặt thành công khi chưa ai nhận.
   Mỗi kiểu trình bày có ô nhập khác nhau nên rẽ nhánh JS theo variant. Kiểu stay: bên trái là ảnh lớn của hạng đang chọn,
   bên phải là thẻ ảnh để chọn hạng, ngày nhận và trả phòng, số khách, họ tên, số điện thoại và tạm tính.
   Kiểu request (nhà dân tính tiền theo khách): một ảnh lớn của nhà, ngày đến và ngày về (ở tối đa maxNights đêm),
   số người lớn và số trẻ em, họ tên, số điện thoại, tạm tính theo đầu người. Hai kiểu dùng chung ô nhập, khung tin nhắn. */
import { asset } from '../core.js';
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

function errorEl(id) {
  const error = document.createElement('p');
  error.className = 'booking__error';
  error.id = id;
  error.hidden = true;
  return error;
}

// Một ô nhập: nhãn, ô, dòng báo lỗi ngay dưới ô (ẩn khi không có lỗi). aria-describedby nối ô với dòng lỗi.
function fieldEl(id, label, control, extra) {
  const field = document.createElement('div');
  field.className = 'booking__field';
  const labelEl = document.createElement('label');
  labelEl.htmlFor = id;
  labelEl.textContent = label ?? '';
  control.id = id;
  const error = errorEl(`${id}-error`);
  control.setAttribute('aria-describedby', error.id);
  field.append(labelEl, extra ?? control, error);
  return { field, control, error };
}

function inputEl(type, attrs = {}) {
  const input = document.createElement('input');
  input.type = type;
  input.className = 'booking__input';
  Object.entries(attrs).forEach(([key, value]) => input.setAttribute(key, value));
  return input;
}

function showError(ref, message) {
  ref.error.textContent = message ?? '';
  ref.error.hidden = !message;
  if (message) ref.control.setAttribute('aria-invalid', 'true');
  else ref.control.removeAttribute('aria-invalid');
}

function imageEl(image, className, lazy) {
  const img = document.createElement('img');
  img.className = className;
  img.src = asset(image.src);
  img.alt = image.alt ?? '';
  if (lazy) img.loading = 'lazy';
  return img;
}

export class WlBooking extends HTMLElement {
  // Khối các hạng nhà phát wl:choose-room khi khách bấm "đặt hạng này": chọn sẵn hạng đó trong form.
  connectedCallback() {
    this._onChoose = (e) => this.chooseRoom(e.detail?.id);
    document.addEventListener('wl:choose-room', this._onChoose);
  }

  disconnectedCallback() {
    document.removeEventListener('wl:choose-room', this._onChoose);
  }

  chooseRoom(id) {
    const input = this._roomInputs?.find((radio) => radio.value === id);
    if (!input) return;
    input.checked = true;
    // Khách đang xem tin nhắn đã soạn thì quay về form để thấy hạng vừa chọn.
    if (this._form?.hidden) {
      this._message.hidden = true;
      this._form.hidden = false;
    }
    this.updateStay();
  }

  set data(section) {
    this._data = section;
    this.render();
  }

  money(amount) {
    return `${amount.toLocaleString('vi-VN')} ${this._data.currency ?? ''}`.trim();
  }

  room() {
    const id = this._roomInputs.find((input) => input.checked)?.value;
    return this._data.rooms.find((r) => r.id === id) ?? this._data.rooms[0];
  }

  // Số căn còn trống của một hạng, theo khoảng ngày chứa ngày nhận phòng; ngoài các khoảng đã ghi thì không biết.
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
    const room = this.room();
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

  // Số khách luôn nằm trong khoảng 1 tới sức chứa của hạng đang chọn; đổi sang hạng nhỏ hơn thì tự giảm.
  setGuests(value) {
    const room = this.room();
    const input = this._fields.guests.control;
    const guests = Math.min(room.maxGuests, Math.max(1, Number(value) || 1));
    input.max = String(room.maxGuests);
    input.value = String(guests);
    this._less.disabled = guests <= 1;
    this._more.disabled = guests >= room.maxGuests;
  }

  updateStay() {
    const section = this._data;
    const labels = section.labels ?? {};
    const f = this._fields;
    // Cập nhật số khách theo hạng trước khi tính tiền, để tạm tính không dùng số khách vượt sức chứa.
    this.setGuests(f.guests.control.value);
    const q = this.quote();
    // Ngày trả phòng sớm nhất là sau ngày nhận một đêm.
    if (f.checkIn.control.value) f.checkOut.control.min = isoAfter(f.checkIn.control.value, 1);
    showError(f.checkOut, q.nights > 0 || !f.checkOut.control.value ? '' : section.errors?.dates);
    // Lỗi tên và số điện thoại chỉ báo khi bấm đặt; khách sửa đúng thì tắt ngay, không chờ bấm lại.
    if (f.name.control.value.trim()) showError(f.name, '');
    if (validPhone(f.phone.control.value.trim())) showError(f.phone, '');

    // Ảnh lớn bên trái và chú thích đổi theo hạng đang chọn; mỗi thẻ hạng ghi số căn còn theo ngày nhận phòng.
    this._shots.forEach((shot, i) => {
      const on = section.rooms[i] === q.room;
      shot.classList.toggle('is-active', on);
      shot.setAttribute('aria-hidden', String(!on));
    });
    this._showName.textContent = q.room.label;
    this._showFacts.textContent = fill(labels.capacity, { area: q.room.area, max: q.room.maxGuests });
    this._showPrice.textContent = fill(labels.perNight, { price: this.money(q.room.price) });
    section.rooms.forEach((room, i) => {
      const left = this.roomsLeft(room.id, f.checkIn.control.value);
      const tag = this._roomTags[i];
      tag.textContent = left === undefined ? '' : left === 0 ? labels.soldOut : fill(labels.left, { n: left });
      tag.hidden = left === undefined;
      tag.classList.toggle('is-out', left === 0);
    });

    const soldOut = q.left === 0;
    showError(this._roomRef, soldOut ? section.errors?.soldOut : '');
    this._submit.disabled = soldOut;

    this._sunrise.textContent = q.nights > 0 ? fill(labels.sunrises, { nights: q.nights }) : '';
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
    if (q.left === 0) {
      this._roomInputs.find((input) => input.checked)?.focus();
      return;
    }
    const invalid = Object.values(f).find((ref) => !ref.error.hidden);
    if (invalid) {
      invalid.control.focus();
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
    const digits = this.site?.contact?.phone?.replace(/\s/g, '');
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

  // Ảnh lớn của hạng đang chọn: mỗi hạng một ảnh chồng lên nhau, ảnh đang chọn hiện rõ; chú thích ghi tên, sức chứa, giá.
  showcaseEl(rooms) {
    this._shots = rooms.map((room, i) => (room.image?.src ? imageEl(room.image, 'booking__shot', i > 0) : document.createElement('span')));
    this._showName = document.createElement('p');
    this._showName.className = 'booking__show-name';
    this._showFacts = document.createElement('p');
    this._showFacts.className = 'booking__show-facts';
    this._showPrice = document.createElement('p');
    this._showPrice.className = 'booking__show-price';
    const caption = document.createElement('figcaption');
    caption.className = 'booking__show-caption';
    caption.append(this._showName, this._showFacts, this._showPrice);
    const figure = document.createElement('figure');
    figure.className = 'booking__showcase';
    figure.append(...this._shots, caption);
    return figure;
  }

  // Chọn hạng bằng thẻ ảnh: mỗi thẻ là một nút radio thật bọc trong label, nên dùng được phím mũi tên như nhóm radio.
  roomPickerEl(rooms, prefix) {
    const labels = this._data.labels ?? {};
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'booking__rooms';
    const legend = document.createElement('legend');
    legend.className = 'booking__legend';
    legend.textContent = labels.room ?? '';
    const list = document.createElement('div');
    list.className = 'booking__room-list';
    this._roomInputs = [];
    this._roomTags = [];
    rooms.forEach((room, i) => {
      const card = document.createElement('label');
      card.className = 'booking__room';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `${prefix}-room`;
      input.value = room.id;
      input.className = 'booking__room-input';
      input.checked = i === 0;
      const tag = document.createElement('span');
      tag.className = 'booking__room-tag';
      tag.hidden = true;
      card.append(...[
        input,
        room.image?.src ? imageEl({ src: room.image.src, alt: '' }, 'booking__room-thumb', true) : null,
        textEl('span', 'booking__room-name', room.label),
        textEl('span', 'booking__room-price', this.money(room.price)),
        tag,
      ].filter(Boolean));
      list.append(card);
      this._roomInputs.push(input);
      this._roomTags.push(tag);
    });
    const error = errorEl(`${prefix}-room-error`);
    this._roomRef = { control: fieldset, error };
    fieldset.setAttribute('aria-describedby', error.id);
    fieldset.append(legend, list, error);
    return fieldset;
  }

  // Số khách: ô số kèm hai nút bớt, thêm hai bên; nút chỉ có dấu nên cần aria-label lấy từ content.json.
  guestsEl(prefix) {
    const labels = this._data.labels ?? {};
    const input = inputEl('number', { min: '1', inputmode: 'numeric' });
    input.classList.add('booking__count');
    const step = (className, text, label, delta) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `booking__step ${className}`;
      button.textContent = text;
      if (label) button.setAttribute('aria-label', label);
      button.addEventListener('click', () => {
        this.setGuests(Number(input.value) + delta);
        this.updateStay();
      });
      return button;
    };
    this._less = step('booking__step--less', '−', labels.guestsLess, -1);
    this._more = step('booking__step--more', '+', labels.guestsMore, 1);
    const stepper = groupEl('booking__stepper', [this._less, input, this._more]);
    input.value = String(this._data.includedGuests ?? 1);
    return fieldEl(`${prefix}-guests`, labels.guests, input, stepper);
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
    const picker = this.roomPickerEl(rooms, prefix);
    this._fields = {
      checkIn: fieldEl(`${prefix}-checkin`, labels.checkIn, checkIn),
      checkOut: fieldEl(`${prefix}-checkout`, labels.checkOut, checkOut),
      guests: this.guestsEl(prefix),
      name: fieldEl(`${prefix}-name`, labels.name, inputEl('text', { autocomplete: 'name' })),
      phone: fieldEl(`${prefix}-phone`, labels.phone, inputEl('tel', { autocomplete: 'tel', inputmode: 'tel' })),
    };
    const f = this._fields;
    [f.checkIn, f.checkOut, f.name, f.phone].forEach((ref) => ref.field.classList.add('booking__field--half'));
    // Mỗi ô một class theo tên, để màn rộng xếp ngày nhận, ngày trả, số khách một hàng và tên, số điện thoại một hàng.
    Object.entries(f).forEach(([key, ref]) => ref.field.classList.add(`booking__field--${key.toLowerCase()}`));
    const fields = groupEl('booking__fields', Object.values(f).map((ref) => ref.field));

    this._sunrise = document.createElement('p');
    this._sunrise.className = 'booking__sunrise';
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
      textEl('p', 'booking__summary-title', labels.summary),
      this._sunrise,
      this._lines,
      groupEl('booking__total', [textEl('span', 'booking__total-label', labels.total), this._total]),
      textEl('p', 'booking__includes', labels.includes),
      this._submit,
    ]);

    this._form = document.createElement('form');
    this._form.className = 'booking__card';
    // Tự kiểm tra và báo lỗi bằng chữ trong content.json thay cho bong bóng lỗi mặc định của trình duyệt.
    this._form.noValidate = true;
    this._form.append(this.showcaseEl(rooms), groupEl('booking__panel', [picker, fields, summary]));
    this._form.addEventListener('input', () => this.updateStay());
    this._form.addEventListener('change', () => this.updateStay());
    this._form.addEventListener('submit', (e) => this.submitStay(e));

    this._message = this.messageEl();
    return groupEl('booking__body', [this._form, this._message]);
  }

  // Ô đếm (người lớn, trẻ em): ô số kèm hai nút bớt, thêm, cùng kiểu với ô số khách của stay.
  // Bấm nút thì phát sự kiện input lên form, để tính tiền và kiểm lỗi chạy chung một đường với khi gõ.
  counterEl(id, label, lessLabel, moreLabel, min, value) {
    const input = inputEl('number', { min: String(min), inputmode: 'numeric' });
    input.classList.add('booking__count');
    input.value = String(value);
    const step = (className, text, aria, delta) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `booking__step ${className}`;
      button.textContent = text;
      if (aria) button.setAttribute('aria-label', aria);
      button.addEventListener('click', () => {
        input.value = String(Math.max(min, (Number(input.value) || 0) + delta));
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      return button;
    };
    const less = step('booking__step--less', '−', lessLabel, -1);
    const more = step('booking__step--more', '+', moreLabel, 1);
    const ref = fieldEl(id, label, input, groupEl('booking__stepper', [less, input, more]));
    return { ...ref, less, more, min };
  }

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
  }

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
  }

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
  }

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
  }

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
    const build = { stay: () => this.stayEl(), request: () => this.requestEl() }[variant];
    const body = build ? build() : null;
    if (!body) console.warn(`Khối đặt chỗ: kiểu "${variant}" chưa có hoặc thiếu dữ liệu.`);

    this.replaceChildren(...[groupEl('booking__inner container', [head, body])].filter(Boolean));
    if (body) (variant === 'stay' ? this.updateStay() : this.updateRequest());
  }
}
