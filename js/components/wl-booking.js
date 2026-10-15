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
    this.stopCountdown();
  }

  stopCountdown() {
    clearInterval(this._countTimer);
    this._countTimer = null;
  }

  chooseRoom(id) {
    // Chế độ chọn tour (calendar có `tours`): id là id tour trong danh mục.
    if (this._tours?.length) {
      this.pickTour(id);
      return;
    }
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
    return this._rooms.find((r) => r.id === id) ?? this._rooms[0];
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
        lines.push([section.offer.label, section.offer.note, `−${this.money(amount)}`, true]);
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
      const on = this._rooms[i] === q.room;
      shot.classList.toggle('is-active', on);
      shot.setAttribute('aria-hidden', String(!on));
    });
    this._showName.textContent = q.room.label;
    this._showFacts.textContent = fill(labels.capacity, { area: q.room.area, max: q.room.maxGuests });
    this._showPrice.textContent = fill(labels.perNight, { price: this.money(q.room.price) });
    this._rooms.forEach((room, i) => {
      const left = this.roomsLeft(room.id, f.checkIn.control.value);
      const tag = this._roomTags[i];
      tag.textContent = left === undefined ? '' : left === 0 ? labels.soldOut : fill(labels.left, { n: left });
      tag.hidden = left === undefined;
      tag.classList.toggle('is-out', left === 0);
    });

    const soldOut = q.left === 0;
    showError(this._roomRef, soldOut ? section.errors?.soldOut : '');
    this._submit.disabled = soldOut;

    this._nightsNote.textContent = q.nights > 0 ? fill(labels.nightsNote, { nights: q.nights }) : '';
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
    // Bỏ hạng thiếu giá hoặc sức chứa: thiếu một trong hai thì không tính được tiền, không giới hạn được số khách.
    const rooms = (section.rooms ?? []).filter((r) => r.id && r.label && r.price > 0 && r.maxGuests > 0);
    this._rooms = rooms;
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

    this._nightsNote = document.createElement('p');
    this._nightsNote.className = 'booking__nights-note';
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
      this._nightsNote,
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
    // Ô ngày, nút radio, ô chữ đều bắn input mỗi khi đổi, nên một sự kiện là đủ (nghe thêm change thì tính hai lần).
    this._form.addEventListener('input', () => this.updateStay());
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

  /* ========= KIỂU CALENDAR =========
     Tour theo lịch khởi hành cố định, giá tính theo khách. Bên trái là các thẻ ngày khởi hành như tờ lịch (hết chỗ thì khoá),
     danh sách đã gồm, chưa gồm và các điều khoản; bên phải là form giữ chỗ (họ tên, số điện thoại, số khách, tạm tính).
     Gửi form thì in ra phiếu giữ chỗ có dấu "chờ xác nhận", không báo đặt thành công vì chưa ai nhận. */

  // Ưu đãi còn hạn: có số tiền giảm và hôm nay chưa qua ngày hết hạn (không ghi ngày hết hạn thì luôn còn).
  dealActive() {
    const deal = this._data.deal;
    return Boolean(deal?.amount) && (!deal.until || todayIso() <= deal.until);
  }

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
      textEl('span', 'booking__date-dow', weekday.charAt(0).toUpperCase() + weekday.slice(1)),
      textEl('span', 'booking__date-day', dep.date.slice(8, 10)),
      textEl('span', 'booking__date-month', fill(labels.month, { m: Number(dep.date.slice(5, 7)), y: dep.date.slice(0, 4) })),
      textEl('span', few ? 'booking__date-seats booking__date-seats--few' : 'booking__date-seats', seats),
    ].filter(Boolean));
    button.addEventListener('click', () => {
      this._departure = dep;
      this.updateCalendar();
    });
    return button;
  }

  // Danh sách có tiêu đề (đã gồm, chưa gồm). Danh sách trống thì bỏ cả cột.
  listEl(title, items = [], className) {
    if (!items.length) return null;
    const ul = document.createElement('ul');
    ul.className = className;
    ul.append(...items.map((item) => textEl('li', '', item)));
    return groupEl('booking__term', [textEl('h3', 'booking__term-title', title), ul]);
  }

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
  }

  // Một dòng tạm tính: nhãn bên trái, số tiền bên phải.
  sumRow(className) {
    const row = document.createElement('div');
    row.className = `booking__sum-row ${className}`;
    const term = document.createElement('dt');
    const value = document.createElement('dd');
    row.append(term, value);
    return { row, term, value };
  }

  /* Chế độ chọn tour của kiểu calendar (khai `tours` trong section): khách chọn tour trong danh mục (site.catalog.items), ngày
     còn chỗ lấy từ `availability` của tour đó, giá lấy từ `price` của tour. `tours` là true (mọi tour có lịch) hoặc mảng id
     (chỉ các tour này, giữ thứ tự). Không khai `tours` thì kiểu calendar chạy như cũ với `price` và `departures` của section. */
  toursList() {
    const want = this._data.tours;
    if (!want) return [];
    const items = this.site?.catalog?.items ?? [];
    const pool = Array.isArray(want) ? want.map((id) => items.find((item) => item.id === id)) : items;
    return pool.filter((item) => item?.price && (item.availability ?? []).length);
  }

  tourPrice() {
    return this._tour?.price ?? this._data.price;
  }

  calDepartures() {
    if (!this._tour) return (this._data.departures ?? []).filter((dep) => dep.date);
    return this._tour.availability.filter((a) => a.date).map((a) => ({ date: a.date, seats: a.left }));
  }

  // Điểm đón đang chọn: { label, fee } với fee là phí cả đơn (không nhân số khách); không khai pickups thì không có phí.
  pickup() {
    const list = this._data.pickups ?? [];
    return list.find((p) => p.id === this._fields?.pickup?.control.value) ?? list[0] ?? null;
  }

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
  }

  /* Kiểu wall: mỗi tháng một tờ lịch lưới 7 cột (thứ hai đứng đầu), ngày có chuyến là nút bấm kèm số chỗ còn, ngày hết chỗ gạch,
     ngày ít chỗ đổi màu. Đổi tháng thì tờ cũ rơi xuống như bị xé (bật giảm chuyển động thì đổi ngay). */
  dayEl(dep, day) {
    const labels = this._data.labels ?? {};
    const weekday = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', timeZone: 'UTC' }).format(new Date(dayNumber(dep.date) * DAY));
    const seats = dep.seats > 0 ? fill(labels.seats, { n: dep.seats }) : labels.soldOut;
    const few = dep.seats > 0 && dep.seats <= (this._data.fewSeats ?? 4);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = few ? 'booking__day booking__day--few' : 'booking__day';
    button.disabled = !(dep.seats > 0);
    button.setAttribute('aria-pressed', String(dep === this._departure));
    button.setAttribute('aria-label', `${weekday} ${viDate(dep.date)}, ${String(seats ?? '').toLowerCase()}`);
    button.append(...[textEl('span', 'booking__day-num', String(day)), textEl('span', 'booking__day-seats', dep.seats > 0 ? String(dep.seats) : '')].filter(Boolean));
    button.addEventListener('click', () => {
      this._departure = dep;
      this.updateCalendar();
    });
    return button;
  }

  paintWall(flip) {
    const labels = this._data.labels ?? {};
    const deps = this.calDepartures();
    const byDate = new Map(deps.map((d) => [d.date, d]));
    const months = [...new Set(deps.map((d) => d.date.slice(0, 7)))].sort();
    const at = months.indexOf(this._month);
    const [y, m] = this._month.split('-').map(Number);
    const pad = (n) => String(n).padStart(2, '0');

    const go = (delta, text, aria) => {
      const button = textEl('button', 'booking__wall-nav', text) ?? document.createElement('button');
      button.type = 'button';
      button.disabled = !months[at + delta];
      if (aria) button.setAttribute('aria-label', aria);
      button.addEventListener('click', () => {
        this._month = months[at + delta];
        this.paintWall(delta);
      });
      return button;
    };
    const head = groupEl('booking__wall-head', [
      go(-1, labels.prevMonth, labels.prevMonth),
      textEl('p', 'booking__wall-title', fill(labels.month, { m, y })),
      go(1, labels.nextMonth, labels.nextMonth),
    ]);

    const grid = document.createElement('div');
    grid.className = 'booking__wall-grid';
    for (let i = 0; i < 7; i += 1) {
      const dow = new Intl.DateTimeFormat('vi-VN', { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 1 + i)));
      grid.append(textEl('span', 'booking__wall-dow', dow));
    }
    const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
    for (let i = 0; i < lead; i += 1) grid.append(document.createElement('span'));
    this._dateButtons = [];
    const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
    for (let day = 1; day <= count; day += 1) {
      const dep = byDate.get(`${y}-${pad(m)}-${pad(day)}`);
      if (!dep) {
        grid.append(textEl('span', 'booking__day booking__day--off', String(day)));
        continue;
      }
      const button = this.dayEl(dep, day);
      this._dateButtons.push({ dep, button });
      grid.append(button);
    }

    const page = groupEl('booking__wall-page', [head, grid]);
    if (!this._wall || !this._datesBox.contains(this._wall)) {
      this._wall = document.createElement('div');
      this._wall.className = 'booking__wall';
      this._datesBox.append(this._wall);
    }
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const old = this._wall.querySelector('.booking__wall-page');
    if (old && flip && !calm) {
      // Tờ cũ rời ra rơi xuống (bản sao không bấm được), tờ mới lật lên từ trên.
      old.classList.add('is-torn');
      old.setAttribute('aria-hidden', 'true');
      old.inert = true;
      old.addEventListener('animationend', () => old.remove(), { once: true });
      page.classList.add('is-turning');
      this._wall.prepend(page);
    } else {
      this._wall.replaceChildren(page);
    }
  }

  // Đổi tour: dựng lại các thẻ ngày theo lịch của tour mới, chọn ngày đầu còn chỗ, tính lại tạm tính; phiếu cũ ẩn đi.
  pickTour(id) {
    const tour = this._tours.find((t) => t.id === id);
    if (!tour) return;
    this._tour = tour;
    this.fillDates();
    this._tourRadios?.forEach((radio) => { radio.checked = radio.value === id; });
    if (this._ticket) this._ticket.hidden = true;
    this.updateCalendar();
  }

  // Các thẻ chọn tour: nút radio thật nằm trong thẻ (cùng kiểu thẻ hạng của kiểu stay). Chỉ một tour thì không cần chọn.
  tourPickEl(prefix) {
    if (this._tours.length < 2) return null;
    const labels = this._data.labels ?? {};
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'booking__rooms booking__tours';
    fieldset.append(textEl('legend', 'booking__legend', labels.tour) ?? '');
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
      label.append(radio, groupEl('booking__room-text', [
        textEl('span', 'booking__room-name', tour.name),
        textEl('span', 'booking__room-price', [tour.start, this.money(tour.price)].filter(Boolean).join(', ')),
      ]));
      list.append(label);
      return radio;
    });
    fieldset.append(list);
    return fieldset;
  }

  // Ô chọn điểm đón: mỗi lựa chọn ghi phí nếu có (phí cả đơn).
  pickupField(prefix) {
    const pickups = this._data.pickups ?? [];
    if (!pickups.length) return null;
    const select = document.createElement('select');
    select.className = 'booking__input';
    pickups.forEach((p) => {
      const fee = p.fee ? ` (+ ${this.money(p.fee)})` : '';
      select.append(new Option(`${p.label}${fee}`, p.id));
    });
    return fieldEl(`${prefix}-pickup`, this._data.labels?.pickup, select);
  }

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
  }

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
  }

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
  }

  toggleSeat(n) {
    const next = new Set(this._picked);
    if (next.has(n)) next.delete(n);
    else next.add(n);
    if (!next.size) return;
    this._picked = next;
    this._fields.guests.control.value = String(next.size);
    this.updateCalendar();
  }

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

    const info = groupEl('booking__info', [
      this.tourPickEl(prefix),
      dates,
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
    this._form.append(...[
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
    return groupEl('booking__body', [groupEl('booking__layout', [info, this._form]), this._ticket]);
  }

  // Tạm tính theo số khách: giá một khách nhân số khách, trừ ưu đãi mỗi khách nếu còn hạn; tiền cọc tính riêng.
  quoteCalendar() {
    const section = this._data;
    const guests = Number(this._fields.guests.control.value) || 0;
    const base = this.tourPrice() * guests;
    const discount = this.dealActive() ? section.deal.amount * guests : 0;
    const fee = this.pickup()?.fee ?? 0;
    return { guests, base, discount, fee, total: base - discount + fee, deposit: (section.deposit ?? 0) * guests };
  }

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
  }

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
    const route = groupEl('booking__ticket-route', [textEl('span', '', m.from), m.from && m.to ? line : null, textEl('span', '', m.to)]);
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
  }

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
    const values = { name, phone, date, guests: q.guests, total: this.money(q.total), tour: this._tour?.name ?? '', pickup: this.pickup()?.label ?? '', seats: this._seatButtons ? [...this._picked].sort((a, b) => a - b).join(', ') : '' };
    const t = this._ticketInfo;
    t.guest.textContent = name;
    t.date.textContent = date;
    t.seats.textContent = fill(section.labels?.guestsValue ?? '{guests}', values);
    t.total.textContent = values.total;
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
  }

  render() {
    const section = this._data;
    // Kiểu wall (tờ lịch treo tường) chỉ đổi cách chọn ngày, còn lại là calendar: dùng chung mã và kiểu của calendar.
    const variant = section.variant === 'wall' ? 'calendar' : (section.variant ?? 'calendar');
    this.className = `booking booking--${variant}${section.variant === 'wall' ? ' booking--wall' : ''}`;
    // Dựng lại từ đầu (đổi thương hiệu): bỏ đồng hồ và sơ đồ ghế của lần trước.
    this.stopCountdown();
    this._seatButtons = null;
    this._tours = null;
    this._tour = null;
    this._tourRadios = null;

    const head = groupEl('booking__head', [
      textEl('p', 'booking__eyebrow', section.eyebrow),
      textEl('h2', 'booking__title', section.title),
      textEl('p', 'booking__lead', section.lead),
    ]);
    const build = { stay: () => this.stayEl(), request: () => this.requestEl(), calendar: () => this.calendarEl() }[variant];
    const body = build ? build() : null;
    if (!body) console.warn(`Khối đặt chỗ: kiểu "${variant}" chưa có hoặc thiếu dữ liệu.`);

    this.replaceChildren(...[groupEl('booking__inner container', [head, body])].filter(Boolean));
    const update = { stay: () => this.updateStay(), request: () => this.updateRequest(), calendar: () => this.updateCalendar() }[variant];
    if (body) update();
  }
}
