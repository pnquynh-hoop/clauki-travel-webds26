/* booking-wall.js - phương thức của <wl-booking> cho kiểu wall: chọn ngày bằng tờ lịch tháng treo tường (lưới 7 cột, lật tháng như xé lịch); phần còn lại là calendar.
   Ghép vào lớp WlBooking trong wl-booking.js (Object.assign lên prototype), nên `this` vẫn là khối đặt chỗ. */
import { textEl, groupEl } from '../../js/core/dom.js';
import { DAY, dayNumber, viDate, fill } from './booking-helpers.js';

export const wallMethods = {

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
  },

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
  },
};
