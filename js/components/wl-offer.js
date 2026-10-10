/* wl-offer.js - khối chiến dịch ưu đãi: tiêu đề, đếm ngược tới hạn đặt, phép tính "ở N đêm, chỉ trả N - k đêm",
   lịch biển 12 tháng có tô khoảng mùa ưu đãi. Mọi kiểu dùng chung một cấu trúc HTML, variant chỉ đổi CSS
   (tide của Gành Sớm: dải nền tối, đường sóng cao thấp theo độ động của biển từng tháng).
   Nút đặt lấy từ site.cta; bấm nút thì phát wl:choose-room để khối đặt chỗ chọn sẵn hạng đang tính thử. */
import { textEl, groupEl, clamp } from '../dom.js';

const MINUTE = 60 * 1000;
const SVG_NS = 'http://www.w3.org/2000/svg';

function fill(template, values) {
  return (template ?? '').replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
}

// Tháng (1 tới 12) của một ngày dạng "2027-04-01".
function monthOf(iso) {
  const month = Number(String(iso ?? '').slice(5, 7));
  return month >= 1 && month <= 12 ? month : null;
}

// Đường sóng của lịch biển trong khung width x height: biên độ theo độ động của từng tháng (level 0 lặng tới 3 động),
// chuyển mượt giữa hai tháng liền nhau; mỗi tháng một con sóng. phase dời sóng sang ngang để vẽ thêm lớp sóng phía sau.
// Đóng đường ở đáy khung để tô được phần nước.
function wavePath(levels, width, height, phase) {
  const step = width / levels.length;
  const base = height * 0.62;
  const amplitude = (x) => {
    const pos = x / step - 0.5;
    const i = clamp(Math.floor(pos), 0, levels.length - 1);
    const j = clamp(i + 1, 0, levels.length - 1);
    const t = clamp(pos - i, 0, 1);
    return 1.5 + (levels[i] * (1 - t) + levels[j] * t) * 5.5;
  };
  const points = [];
  for (let x = 0; x <= width; x += 4) {
    points.push(`L${x} ${(base - amplitude(x) * Math.sin((x / step + phase) * Math.PI * 2)).toFixed(1)}`);
  }
  return `M0 ${height} ${points.join(' ')} L${width} ${height} Z`;
}

export class WlOffer extends HTMLElement {
  disconnectedCallback() {
    clearInterval(this._timer);
  }

  set data(section) {
    this._data = section;
    this.render();
  }

  get labels() {
    return this._data.labels ?? {};
  }

  money(amount) {
    return `${amount.toLocaleString('vi-VN')} ${this._data.currency ?? ''}`.trim();
  }

  // Giá gọn trong ô đêm (ví dụ "6,2 triệu") cho vừa bốn ô một hàng; dữ liệu không có nhãn million thì ghi đủ.
  short(amount) {
    if (!this.labels.million) return this.money(amount);
    return fill(this.labels.million, { n: (amount / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) });
  }

  /* ---------- Đếm ngược ---------- */

  // Hạn đặt ghi kèm múi giờ (ví dụ 2026-12-31T23:59:59+07:00) nên máy ở múi giờ nào cũng đếm đúng.
  countdownEl() {
    const deadline = new Date(this._data.deadline ?? '');
    if (Number.isNaN(deadline.getTime())) return null;
    this._deadline = deadline;
    this._clock = document.createElement('p');
    this._clock.className = 'offer__clock';
    const box = groupEl('offer__countdown', [
      textEl('p', 'offer__countdown-label', this.labels.countdown),
      this._clock,
      textEl('p', 'offer__deadline', this.labels.deadline),
    ]);
    // role="timer": trình đọc màn hình không đọc lại mỗi lần số đổi.
    box.setAttribute('role', 'timer');
    this.tick();
    // Chỉ hiện tới phút nên nửa phút cập nhật một lần là đủ.
    this._timer = setInterval(() => this.tick(), MINUTE / 2);
    return box;
  }

  // Số ngày, giờ, phút còn lại; hết hạn thì thay bằng câu báo hết hạn và thôi đếm.
  tick() {
    const left = this._deadline.getTime() - Date.now();
    if (left <= 0) {
      clearInterval(this._timer);
      this._clock.replaceChildren(...[textEl('span', 'offer__ended', this.labels.ended)].filter(Boolean));
      return;
    }
    const minutes = Math.floor(left / MINUTE);
    const parts = [
      [Math.floor(minutes / 1440), this.labels.days],
      [Math.floor(minutes / 60) % 24, this.labels.hours],
      [minutes % 60, this.labels.minutes],
    ];
    this._clock.replaceChildren(...parts.map(([n, unit]) => groupEl('offer__unit', [
      textEl('strong', 'offer__num', String(n).padStart(2, '0')),
      textEl('span', 'offer__unit-name', unit),
    ])));
  }

  /* ---------- Tính thử ---------- */

  calcEl(rooms) {
    const nights = this._data.nights ?? 0;
    if (!rooms.length || nights < 1) return null;
    this._rooms = rooms;

    const fieldset = document.createElement('fieldset');
    fieldset.className = 'offer__rooms';
    const legend = textEl('legend', 'offer__rooms-label', this.labels.room);
    if (legend) fieldset.append(legend);
    rooms.forEach((room, i) => {
      const input = document.createElement('input');
      input.type = 'radio';
      input.className = 'offer__room-input';
      input.name = `${this.id || 'offer'}-room`;
      input.value = String(i);
      input.checked = i === 0;
      input.addEventListener('change', () => this.updateCalc());
      const chip = document.createElement('label');
      chip.className = 'offer__room';
      chip.append(input, textEl('span', '', room.label));
      fieldset.append(chip);
    });
    this._roomInputs = [...fieldset.querySelectorAll('input')];

    this._nights = document.createElement('ol');
    this._nights.className = 'offer__nights';
    this._sum = document.createElement('dl');
    this._sum.className = 'offer__sum';
    this._sum.setAttribute('aria-live', 'polite');

    const cta = this.site?.cta;
    let book = null;
    if (cta?.href && cta?.label) {
      book = document.createElement('a');
      book.className = 'btn offer__book';
      book.href = cta.href;
      book.textContent = cta.label;
      // Khối đặt chỗ (nếu có trên trang) chọn sẵn hạng đang tính; liên kết vẫn nhảy tới khối đặt chỗ như thường.
      book.addEventListener('click', () => {
        const room = this.currentRoom();
        if (room.id) document.dispatchEvent(new CustomEvent('wl:choose-room', { detail: { id: room.id } }));
      });
    }

    this.updateCalc();
    return groupEl('offer__calc', [textEl('h3', 'offer__calc-title', this.labels.calc), fieldset, this._nights, this._sum, book]);
  }

  currentRoom() {
    const checked = this._roomInputs.find((input) => input.checked);
    return this._rooms[Number(checked?.value ?? 0)];
  }

  // Vẽ lại các ô đêm và dòng tổng theo hạng đang chọn. Các đêm cuối là đêm được tặng.
  updateCalc() {
    const room = this.currentRoom();
    const nights = this._data.nights;
    const paid = nights - clamp(this._data.freeNights ?? 0, 0, nights);
    const items = Array.from({ length: nights }, (_, i) => {
      const free = i + 1 > paid;
      const li = document.createElement('li');
      li.className = free ? 'offer__night is-free' : 'offer__night';
      li.append(...[
        textEl('span', 'offer__night-name', fill(this.labels.night, { n: i + 1 })),
        textEl('strong', 'offer__night-price', free ? this.labels.free : this.short(room.price)),
        free ? textEl('s', 'offer__night-was', this.short(room.price)) : null,
      ].filter(Boolean));
      return li;
    });
    this._nights.replaceChildren(...items);

    // Làm tròn tới nghìn đồng cho dễ đọc.
    const perNight = Math.round((room.price * paid) / nights / 1000) * 1000;
    const rows = [
      [this.labels.full, textEl('s', '', this.money(room.price * nights))],
      [this.labels.pay, textEl('strong', '', this.money(room.price * paid))],
      [this.labels.perNight, textEl('span', '', this.money(perNight))],
    ].filter(([term]) => term);
    this._sum.replaceChildren(...rows.map(([term, value]) => {
      const dd = document.createElement('dd');
      dd.append(value);
      return groupEl('offer__sum-row', [textEl('dt', '', term), dd]);
    }));
  }

  /* ---------- Lịch biển ---------- */

  // Lưới 12 cột: dải tô khoảng mùa ưu đãi, đường sóng, số tháng, rồi chú thích từng mùa nằm dưới đúng các tháng của nó.
  seaEl() {
    const groups = (this._data.sea ?? []).filter((g) => Array.isArray(g.months) && g.months.length);
    if (!groups.length) return null;
    const levels = Array(12).fill(0);
    groups.forEach((g) => g.months.forEach((m) => {
      if (m >= 1 && m <= 12) levels[m - 1] = g.level ?? 0;
    }));

    const sea = document.createElement('div');
    sea.className = 'offer__sea';

    const from = monthOf(this._data.from);
    const to = monthOf(this._data.to);
    if (from && to && to >= from) {
      const band = document.createElement('div');
      band.className = 'offer__window';
      band.append(...[textEl('span', 'offer__window-label', this.labels.window)].filter(Boolean));
      band.style.setProperty('--from', from);
      band.style.setProperty('--to', to + 1);
      sea.append(band);
    }

    // Đường sóng chỉ để nhìn nhanh; chữ chú thích bên dưới đã nói đủ, nên ẩn với trình đọc màn hình.
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'offer__wave');
    svg.setAttribute('viewBox', '0 0 1200 60');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    // Hai lớp: lớp sau lệch nửa con sóng và mờ hơn, cho mặt nước có chiều sâu.
    [['offer__wave-back', 0.5], ['offer__wave-front', 0]].forEach(([className, phase]) => {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('class', className);
      path.setAttribute('d', wavePath(levels, 1200, 60, phase));
      svg.append(path);
    });
    sea.append(svg);

    for (let m = 1; m <= 12; m += 1) {
      const cell = document.createElement('span');
      cell.className = from && to && m >= from && m <= to ? 'offer__month is-offer' : 'offer__month';
      cell.textContent = String(m);
      cell.style.gridColumn = String(m);
      cell.setAttribute('aria-hidden', 'true');
      sea.append(cell);
    }

    const legend = document.createElement('ul');
    legend.className = 'offer__legend';
    legend.append(...groups.map((g) => {
      const first = Math.min(...g.months);
      const last = Math.max(...g.months);
      const li = document.createElement('li');
      li.className = 'offer__season';
      li.style.setProperty('--from', first);
      li.style.setProperty('--to', last + 1);
      const range = first === last ? fill(this.labels.monthOne, { n: first }) : fill(this.labels.months, { from: first, to: last });
      li.append(...[textEl('strong', 'offer__season-range', range), textEl('span', 'offer__season-text', g.label)].filter(Boolean));
      return li;
    }));
    sea.append(legend);

    return groupEl('offer__calendar', [textEl('h3', 'offer__calendar-title', this.labels.calendar), sea]);
  }

  render() {
    clearInterval(this._timer);
    const section = this._data;
    this.className = section.variant ? `offer offer--${section.variant}` : 'offer';
    const rooms = (section.rooms ?? []).filter((room) => room.label && room.price > 0);

    const head = groupEl('offer__head', [
      textEl('p', 'offer__eyebrow', section.eyebrow),
      textEl('h2', 'offer__title', section.title),
      textEl('p', 'offer__lead', section.lead),
    ]);
    this.replaceChildren(...[groupEl('offer__inner container', [head, this.countdownEl(), this.calcEl(rooms), this.seaEl()])].filter(Boolean));
  }
}
