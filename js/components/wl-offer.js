/* wl-offer.js - khối chiến dịch ưu đãi đặt sớm, dựng như một tấm bưu thiếp hai mặt:
   - đầu khối: tiêu đề, lời dẫn, dải 12 tháng của biển có ngoặc đánh dấu mùa ưu đãi;
   - mặt trước: ảnh và dòng chú thích; mặt sau: lời nhắn, dấu bưu điện đếm ngược tới hạn đặt, con tem in giá ưu đãi
     của hạng đang chọn, các dòng điều kiện;
   - bên dưới: chọn hạng bằng các con tem (nhóm radio), phiếu giá (giá thường, số tiền trả, giá tính ra mỗi đêm), nút đặt.
   Mọi kiểu dùng chung cấu trúc này, variant chỉ đổi CSS (postcard của Gành Sớm: bưu thiếp nghiêng, tem răng cưa, chữ viết tay).
   Nút đặt lấy từ site.cta; bấm thì phát wl:choose-room để khối đặt chỗ chọn sẵn hạng đang chọn. */
import { asset } from '../core/core.js';
import { textEl, groupEl, clamp } from '../core/dom.js';
import { roomsOf } from './rooms.js';

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

function imgEl(image, className) {
  if (!image?.src) return null;
  const img = document.createElement('img');
  img.className = className;
  img.src = asset(image.src);
  img.alt = image.alt ?? '';
  img.loading = 'lazy';
  return img;
}

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
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

  // Tiền tố cho id bên trong khối (đường chữ của dấu bưu điện, tên các con tem), để hai khối trên một trang không trùng id.
  get uid() {
    return this.id || 'offer';
  }

  money(amount) {
    return `${amount.toLocaleString('vi-VN')} ${this._data.currency ?? ''}`.trim();
  }

  // Giá gọn trên tem (ví dụ "6,2 triệu"); dữ liệu không có nhãn million thì ghi đủ.
  short(amount) {
    if (!this.labels.million) return this.money(amount);
    return fill(this.labels.million, { n: (amount / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) });
  }

  /* ---------- Đầu khối ---------- */

  headEl() {
    const section = this._data;
    const title = textEl('h2', 'offer__title', section.title);
    const accent = textEl('em', 'offer__title-accent', section.titleAccent);
    if (title && accent) title.append(' ', accent);
    const intro = groupEl('offer__intro', [
      textEl('p', 'offer__eyebrow', section.eyebrow),
      title,
      textEl('p', 'offer__lead', section.lead),
    ]);
    return groupEl('offer__head', [intro, this.seasonsEl()]);
  }

  // Dải 12 tháng: mỗi ô tô theo kiểu biển của tháng (kind: calm, windy, stormy); ngoặc dưới các tháng của mùa ưu đãi.
  // Dải màu chỉ để nhìn nhanh nên ẩn với trình đọc màn hình; chú thích bằng chữ bên dưới nói đủ.
  seasonsEl() {
    const groups = (this._data.sea ?? []).filter((g) => Array.isArray(g.months) && g.months.length);
    if (!groups.length) return null;
    const kinds = Array(12).fill('');
    groups.forEach((g) => g.months.forEach((m) => {
      if (m >= 1 && m <= 12) kinds[m - 1] = g.kind ?? '';
    }));

    const chart = document.createElement('div');
    chart.className = 'offer__chart';
    kinds.forEach((kind, i) => {
      const cell = textEl('span', kind ? `offer__month offer__month--${kind}` : 'offer__month', String(i + 1));
      cell.setAttribute('aria-hidden', 'true');
      chart.append(cell);
    });
    const from = monthOf(this._data.from);
    const to = monthOf(this._data.to);
    const bracket = from && to && to >= from ? textEl('p', 'offer__window', fill(this.labels.window, { from, to })) : null;
    if (bracket) {
      bracket.style.gridColumn = `${from} / ${to + 1}`;
      chart.append(bracket);
    }

    const legend = document.createElement('ul');
    legend.className = 'offer__legend';
    legend.append(...groups.map((g) => {
      const first = Math.min(...g.months);
      const last = Math.max(...g.months);
      const range = first === last ? fill(this.labels.monthOne, { n: first }) : fill(this.labels.monthRange, { from: first, to: last });
      const swatch = document.createElement('span');
      swatch.className = g.kind ? `offer__swatch offer__month--${g.kind}` : 'offer__swatch';
      swatch.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span');
      text.append(...[textEl('b', '', range && `${range}:`), g.label && ` ${g.label}`].filter(Boolean));
      const li = document.createElement('li');
      li.append(swatch, text);
      return li;
    }));

    return groupEl('offer__seasons', [textEl('p', 'offer__seasons-title', this.labels.seasons), chart, legend]);
  }

  /* ---------- Tấm bưu thiếp ---------- */

  frontEl() {
    const img = imgEl(this._data.image, 'offer__photo-img');
    if (!img) return null;
    const figure = document.createElement('figure');
    figure.className = 'offer__card offer__front';
    const caption = document.createElement('figcaption');
    caption.className = 'offer__caption';
    caption.append(...[textEl('strong', '', this._data.caption), textEl('span', '', this._data.captionPlace)].filter(Boolean));
    figure.append(...[groupEl('offer__photo', [img]), caption.childElementCount ? caption : null].filter(Boolean));
    return figure;
  }

  backEl() {
    const note = this._data.note ?? {};
    const msg = groupEl('offer__msg', [
      textEl('p', 'offer__msg-label', note.label),
      textEl('p', 'offer__note', note.greeting),
      textEl('p', 'offer__note', note.text),
      textEl('p', 'offer__sign', note.sign),
    ]);

    // Các dòng điều kiện như dòng địa chỉ; dòng cuối là hạng đang chọn, đổi theo con tem.
    const rows = (this._data.facts ?? []).filter((f) => f.label && f.value).map((f) => [f.label, textEl('dd', '', f.value)]);
    this._roomFact = null;
    if (this._rooms.length && this.labels.roomFact) {
      this._roomFact = document.createElement('dd');
      rows.push([this.labels.roomFact, this._roomFact]);
    }
    let facts = null;
    if (rows.length) {
      facts = document.createElement('dl');
      facts.className = 'offer__facts';
      facts.append(...rows.map(([term, dd]) => groupEl('offer__fact', [textEl('dt', '', term), dd])));
    }

    const back = document.createElement('article');
    back.className = 'offer__card offer__back';
    if (this.labels.back) back.setAttribute('aria-label', this.labels.back);
    back.append(...[msg, groupEl('offer__post', [this.postmarkEl(), this.stampEl()]), facts].filter(Boolean));
    return back.childElementCount ? back : null;
  }

  // Dấu bưu điện: hai vòng mực, chữ chạy theo vòng (trên, dưới), giữa là ngày hạn và thời gian còn lại.
  // Hạn đặt ghi kèm múi giờ (ví dụ 2026-12-31T23:59:59+07:00) nên máy ở múi giờ nào cũng đếm đúng.
  postmarkEl() {
    const deadline = new Date(this._data.deadline ?? '');
    if (Number.isNaN(deadline.getTime())) return null;
    this._deadline = deadline;

    const top = `${this.uid}-pm-top`;
    const bottom = `${this.uid}-pm-bottom`;
    const svg = svgEl('svg', { viewBox: '0 0 160 160', 'aria-hidden': 'true', focusable: 'false' });
    const defs = svgEl('defs', {});
    defs.append(svgEl('path', { id: top, d: 'M 18 80 A 62 62 0 0 1 142 80' }), svgEl('path', { id: bottom, d: 'M 9 80 A 71 71 0 0 0 151 80' }));
    svg.append(defs, svgEl('circle', { cx: 80, cy: 80, r: 77, class: 'offer__ring' }), svgEl('circle', { cx: 80, cy: 80, r: 56, class: 'offer__ring offer__ring--inner' }));
    [[top, this.labels.postmarkTop], [bottom, this.labels.postmarkBottom]].forEach(([id, text]) => {
      if (!text) return;
      const path = svgEl('textPath', { href: `#${id}`, startOffset: '50%', 'text-anchor': 'middle' });
      path.textContent = text;
      const el = svgEl('text', {});
      el.append(path);
      svg.append(el);
    });

    this._days = document.createElement('span');
    this._days.className = 'offer__pm-days';
    this._hm = document.createElement('span');
    this._hm.className = 'offer__pm-hm';
    const center = groupEl('offer__postmark-center', [textEl('span', 'offer__pm-date', this.labels.date), this._days, this._hm]);
    center.setAttribute('aria-hidden', 'true');
    // Trình đọc màn hình đọc câu đầy đủ này thay cho các số trong vòng; role="timer" để không đọc lại mỗi lần số đổi.
    this._sr = document.createElement('span');
    this._sr.className = 'offer__sr';

    this._postmark = groupEl('offer__postmark', [svg, center, this._sr]);
    this._postmark.setAttribute('role', 'timer');
    this.tick();
    // Chỉ hiện tới phút nên nửa phút cập nhật một lần là đủ.
    this._timer = setInterval(() => this.tick(), MINUTE / 2);
    return this._postmark;
  }

  // Số ngày, giờ, phút còn lại; hết hạn thì thay bằng câu báo hết hạn và thôi đếm.
  tick() {
    const left = this._deadline.getTime() - Date.now();
    if (left <= 0) {
      clearInterval(this._timer);
      this._postmark.classList.add('is-expired');
      this._days.textContent = this.labels.ended ?? '';
      this._hm.textContent = '';
      this._sr.textContent = this.labels.ended ?? '';
      return;
    }
    const minutes = Math.floor(left / MINUTE);
    const time = { d: Math.floor(minutes / 1440), h: Math.floor(minutes / 60) % 24, m: minutes % 60 };
    this._days.textContent = fill(this.labels.daysLeft, time);
    this._hm.textContent = fill(this.labels.timeLeft, time);
    this._sr.textContent = fill(this.labels.countdownSr, time);
  }

  // Con tem dán trên mặt sau: ảnh của hạng đang chọn và giá ưu đãi; update() điền nội dung.
  stampEl() {
    if (!this._rooms.length) return null;
    this._stampImg = document.createElement('img');
    this._stampImg.className = 'offer__stamp-img';
    this._stampPrice = document.createElement('strong');
    const value = groupEl('offer__stamp-value', [textEl('span', '', this.labels.stamp), this._stampPrice]);
    this._stamp = groupEl('offer__stamp', [this._stampImg, value]);
    return this._stamp;
  }

  /* ---------- Chọn hạng và phiếu giá ---------- */

  roomEl(room, i) {
    const input = document.createElement('input');
    input.type = 'radio';
    input.className = 'offer__room-input';
    input.name = `${this.uid}-room`;
    input.value = String(i);
    input.checked = i === 0;
    input.addEventListener('change', () => this.update(true));
    // Tên của nút chỉ gồm tên hạng và giá, không đọc thêm alt của ảnh trên tem.
    const name = textEl('span', 'offer__room-name', room.label);
    name.id = `${this.uid}-room-${i}`;
    const price = textEl('span', 'offer__room-price', [this.short(room.price), this.labels.perNight].filter(Boolean).join(' '));
    price.id = `${this.uid}-price-${i}`;
    input.setAttribute('aria-labelledby', `${name.id} ${price.id}`);
    const label = document.createElement('label');
    label.className = 'offer__room';
    label.append(input, groupEl('offer__room-face', [groupEl('offer__room-inner', [imgEl(room.image, 'offer__room-img'), name, price])]));
    return label;
  }

  deskEl() {
    if (!this._rooms.length) return null;
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'offer__rooms';
    const rooms = this._rooms.map((room, i) => this.roomEl(room, i));
    this._inputs = rooms.map((label) => label.querySelector('input'));
    fieldset.append(...[textEl('legend', 'offer__rooms-label', this.labels.room), groupEl('offer__room-row', rooms)].filter(Boolean));

    this._slipTitle = document.createElement('p');
    this._slipTitle.className = 'offer__slip-title';
    this._full = document.createElement('s');
    this._pay = document.createElement('dd');
    this._per = document.createElement('dd');
    const full = document.createElement('dd');
    full.append(this._full);
    const sum = document.createElement('dl');
    sum.className = 'offer__sum';
    sum.append(...[
      [this.labels.full, full, 'offer__sum-row'],
      [this.labels.pay, this._pay, 'offer__sum-row is-pay'],
      [this.labels.perNightTotal, this._per, 'offer__sum-row'],
    ].filter(([term]) => term).map(([term, dd, className]) => groupEl(className, [textEl('dt', '', term), dd])));
    const live = groupEl('', [this._slipTitle, sum]);
    live.setAttribute('aria-live', 'polite');

    const cta = this.site?.cta;
    let book = null;
    if (cta?.href && cta?.label) {
      book = document.createElement('a');
      book.className = 'btn offer__book';
      book.href = cta.href;
      book.textContent = cta.label;
      // Khối đặt chỗ (nếu có trên trang) chọn sẵn hạng đang chọn; liên kết vẫn nhảy tới khối đặt chỗ như thường.
      book.addEventListener('click', () => {
        const room = this.currentRoom();
        if (room.id) document.dispatchEvent(new CustomEvent('wl:choose-room', { detail: { id: room.id } }));
      });
    }
    return groupEl('offer__desk', [fieldset, groupEl('offer__slip', [live, book])]);
  }

  currentRoom() {
    const checked = this._inputs.find((input) => input.checked);
    return this._rooms[Number(checked?.value ?? 0)];
  }

  // Điền lại phiếu giá, dòng hạng phòng và con tem theo hạng đang chọn. Các đêm cuối là đêm được tặng.
  // animate = true khi khách tự đổi tem: con tem trên bưu thiếp "đóng" lại một lần.
  update(animate) {
    const room = this.currentRoom();
    const nights = this._data.nights ?? 1;
    const paid = nights - clamp(this._data.freeNights ?? 0, 0, nights);
    const pay = room.price * paid;
    this._slipTitle.textContent = fill(this.labels.slip, { room: room.label });
    this._full.textContent = this.money(room.price * nights);
    this._pay.textContent = this.money(pay);
    // Làm tròn tới nghìn đồng cho dễ đọc.
    this._per.textContent = this.money(Math.round(pay / nights / 1000) * 1000);
    if (this._roomFact) this._roomFact.textContent = room.label;
    if (!this._stamp) return;
    this._stampImg.hidden = !room.image?.src;
    if (room.image?.src) {
      this._stampImg.src = asset(room.image.src);
      this._stampImg.alt = fill(this.labels.stampAlt, { room: room.label, alt: room.image.alt ?? '' });
    }
    this._stampPrice.textContent = this.short(pay);
    if (animate) {
      this._stamp.classList.remove('is-new');
      void this._stamp.offsetWidth;
      this._stamp.classList.add('is-new');
    }
  }

  render() {
    clearInterval(this._timer);
    const section = this._data;
    this.className = section.variant ? `offer offer--${section.variant}` : 'offer';
    this._rooms = roomsOf(section, this.site).filter((room) => room.label && room.price > 0);
    this._stamp = null;
    this._inputs = [];

    const table = groupEl('offer__table', [this.frontEl(), this.backEl()]);
    const desk = this.deskEl();
    this.replaceChildren(...[groupEl('offer__inner container', [this.headEl(), table, desk])].filter(Boolean));
    if (this._rooms.length) this.update(false);
  }
}
