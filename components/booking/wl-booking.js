/* wl-booking.js - khối đặt chỗ: khách chọn ngày và hạng, điền tên, số điện thoại, xem tạm tính.
   Không có máy chủ nên "đặt" nghĩa là soạn sẵn tin nhắn để khách gửi cho hotline (SMS, gọi, hoặc chép);
   trang không báo đặt thành công khi chưa ai nhận.
   Mỗi kiểu trình bày có ô nhập khác nhau nên rẽ nhánh JS theo variant. Kiểu stay: bên trái là ảnh lớn của hạng đang chọn,
   bên phải là thẻ ảnh để chọn hạng, ngày nhận và trả phòng, số khách, họ tên, số điện thoại và tạm tính.
   Kiểu request (nhà dân tính tiền theo khách): một ảnh lớn của nhà, ngày đến và ngày về (ở tối đa maxNights đêm),
   số người lớn và số trẻ em, họ tên, số điện thoại, tạm tính theo đầu người. Hai kiểu dùng chung ô nhập, khung tin nhắn.
   Mã từng kiểu nằm ở file riêng trong thư mục này: booking-stay.js, booking-request.js, booking-calendar.js (chung cho calendar,
   wall, ticket), booking-wall.js, booking-ticket.js; hàm nhỏ dùng chung ở booking-helpers.js. Ở đây chỉ còn vòng đời, phần stay và
   request dùng chung (khung tin nhắn, ô đếm) và render() chọn kiểu. */
import { textEl, groupEl, telHref } from '../../js/core/dom.js';
import { fill, fieldEl, inputEl } from './booking-helpers.js';
import { stayMethods } from './booking-stay.js';
import { requestMethods } from './booking-request.js';
import { calendarMethods } from './booking-calendar.js';
import { wallMethods } from './booking-wall.js';
import { ticketMethods } from './booking-ticket.js';

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

  render() {
    const section = this._data;
    // Kiểu wall (tờ lịch treo tường) chỉ đổi cách chọn ngày, còn lại là calendar: dùng chung mã và kiểu của calendar.
    // Kiểu ticket (quầy vé) cũng là calendar, đổi bố cục và cách chọn điểm đón.
    const skin = ['wall', 'ticket'].includes(section.variant) ? section.variant : null;
    const variant = skin ? 'calendar' : (section.variant ?? 'calendar');
    this.className = `booking booking--${variant}${skin ? ` booking--${skin}` : ''}`;
    // Dựng lại từ đầu (đổi thương hiệu): bỏ đồng hồ và sơ đồ ghế của lần trước.
    this.stopCountdown();
    this._seatButtons = null;
    this._tours = null;
    this._tour = null;
    this._tourRadios = null;
    this._pass = null;

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

// Phương thức của từng kiểu ghép thẳng vào lớp: gọi như this.stayEl(), this.paintWall() như khi còn chung một file.
Object.assign(WlBooking.prototype, stayMethods, requestMethods, calendarMethods, wallMethods, ticketMethods);
