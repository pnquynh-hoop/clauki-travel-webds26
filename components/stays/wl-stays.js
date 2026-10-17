/* wl-stays.js - các hạng chỗ ở. Hai cấu trúc HTML khác nhau nên rẽ nhánh JS theo variant:
   - không có variant: lưới thẻ, mỗi hạng một thẻ ảnh, tên, mô tả, số căn, diện tích, sức chứa, giá, dạng cơ bản;
   - headland (Gành Sớm): ảnh mỏm gành thật đã tách nền đặt thẳng lên nền trang, trên đó có mốc của từng hạng nhà.
     Bấm một mốc thì ngay trên mốc hiện khung ảnh cảnh nhìn ra từ ban công của hạng đó, có vạch mảnh nối xuống mốc;
     thẻ bên cạnh hiện tên, mô tả, các con số và giá của hạng đó.
   Hạng phòng lấy từ catalog.items khi section ghi items (rooms.js), hạng có href thì thẻ có liên kết xem chi tiết.
   Nút "đặt hạng này" phát sự kiện wl:choose-room (detail.id là id hạng) để khối đặt chỗ chọn sẵn hạng đó. */
import { asset } from '../../js/core/core.js';
import { textEl, groupEl, linkEl } from '../../js/core/dom.js';
import { roomsOf } from '../shared/rooms.js';

function fill(template, values) {
  return (template ?? '').replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
}

function imgEl(image, className, lazy) {
  if (!image?.src) return null;
  const img = document.createElement('img');
  if (className) img.className = className;
  img.src = asset(image.src);
  img.alt = image.alt ?? '';
  if (lazy) img.loading = 'lazy';
  return img;
}

export class WlStays extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  money(amount) {
    return `${amount.toLocaleString('vi-VN')} ${this._data.currency ?? ''}`.trim();
  }

  // Phát sự kiện để khối đặt chỗ (nếu có trên trang) chọn sẵn hạng này; liên kết vẫn nhảy tới khối đặt chỗ như thường.
  bookLink(room) {
    const cta = this.site?.cta;
    const label = this._data.labels?.book;
    if (!cta?.href || !label) return null;
    const a = document.createElement('a');
    a.className = 'stays__book';
    a.href = cta.href;
    a.textContent = label;
    a.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('wl:choose-room', { detail: { id: room.id } }));
    });
    return a;
  }

  factsEl(room) {
    const labels = this._data.labels ?? {};
    const facts = [
      [labels.count, room.count && fill(labels.countValue, { n: room.count })],
      [labels.area, room.area],
      [labels.guests, room.maxGuests && fill(labels.guestsValue, { n: room.maxGuests })],
    ].filter(([term, value]) => term && value);
    if (!facts.length) return null;
    const dl = document.createElement('dl');
    dl.className = 'stays__facts';
    dl.append(...facts.map(([term, value]) => groupEl('stays__fact', [textEl('dt', '', term), textEl('dd', '', value)])));
    return dl;
  }

  priceEl(room) {
    if (!room.price) return null;
    return groupEl('stays__price', [
      textEl('strong', 'stays__amount', this.money(room.price)),
      ' ',
      textEl('span', 'stays__per', this._data.labels?.perNight),
    ]);
  }

  // "Đẹp nhất lúc: bình minh" ghép từ nhãn chung và giờ đẹp nhất của cảnh nhìn ra.
  bestText(view) {
    return view?.best && [this._data.labels?.best, view.best].filter(Boolean).join(': ');
  }

  // Thẻ của một hạng: ảnh, tên, câu mô tả, cảnh nhìn ra từ ban công (nếu có), các con số, giá, nút đặt hạng này.
  // Có view thì ảnh của thẻ là ảnh cảnh nhìn ra, kèm câu tả cảnh và giờ đẹp nhất.
  // brief = true (thẻ chi tiết của kiểu headland): bỏ ảnh và cảnh nhìn ra, vì hai thứ đó đã hiện trong khung ngay trên mốc.
  cardEl(room, className, lazy, brief = false) {
    const card = document.createElement('article');
    card.className = className;
    const view = brief ? null : room.view;
    const body = groupEl('stays__body', [
      textEl('h3', 'stays__name', room.label),
      textEl('p', 'stays__text', room.text),
      groupEl('stays__view', [textEl('p', 'stays__view-text', view?.text), textEl('p', 'stays__best', this.bestText(view))]),
      this.factsEl(room),
      groupEl('stays__foot', [this.priceEl(room), this.bookLink(room)]),
      // Hạng có trang chi tiết (href trong catalog): liên kết xem kỹ trước khi đặt.
      room.href ? linkEl(room.href, this._data.labels?.detail, 'stays__more') : null,
    ]);
    const image = brief ? null : imgEl(view?.image ?? room.image, '', lazy);
    card.append(...[image, body].filter(Boolean));
    return card;
  }

  /* ---------- Kiểu headland ---------- */

  // Khung ảnh cảnh nhìn ra từ ban công của một hạng (ảnh, câu tả cảnh, giờ đẹp nhất) và vạch nối khung xuống mốc.
  // Cả hai nằm trong lớp mỏm đá, dùng chung toạ độ phần trăm --x, --y với mốc nên luôn đúng chỗ khi ảnh co giãn.
  windowEls(room) {
    const view = room.view;
    const image = imgEl(view?.image, 'stays__window-img', false);
    if (!image) return [];
    const caption = document.createElement('figcaption');
    caption.className = 'stays__window-caption';
    caption.append(...[textEl('span', 'stays__view-text', view.text), textEl('span', 'stays__best', this.bestText(view))].filter(Boolean));
    const figure = document.createElement('figure');
    figure.className = 'stays__window';
    figure.append(...[image, caption.childElementCount ? caption : null].filter(Boolean));
    const leader = document.createElement('span');
    leader.className = 'stays__leader';
    [figure, leader].forEach((el) => {
      el.style.setProperty('--x', `${room.x ?? 50}%`);
      el.style.setProperty('--y', `${room.y ?? 50}%`);
    });
    return [leader, figure];
  }

  // Chọn hạng: đánh dấu mốc, thay khung ảnh trên mỏm đá và thẻ thông tin.
  select(index) {
    const room = this._rooms[index];
    this._pins.forEach((pin, i) => pin.setAttribute('aria-pressed', String(i === index)));
    this._window.forEach((el) => el.remove());
    this._window = this.windowEls(room);
    this._land.append(...this._window);
    this._detail.replaceChildren(this.cardEl(room, 'stays__detail-card', false, true));
  }

  headlandEl(rooms) {
    const section = this._data;
    this._rooms = rooms;
    this._window = [];
    this._pins = rooms.map((room, i) => {
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'stays__pin';
      // Toạ độ mốc tính bằng phần trăm của ảnh mỏm đá, nên mốc đi theo ảnh khi ảnh co giãn.
      pin.style.setProperty('--x', `${room.x ?? 50}%`);
      pin.style.setProperty('--y', `${room.y ?? 50}%`);
      const count = textEl('span', 'stays__pin-count', room.count && fill(section.labels?.countValue, { n: room.count }));
      // Tên ngắn chỉ để nhìn trên điện thoại; tên đầy đủ (stays__pin-name) mới là tên của nút.
      const short = textEl('span', 'stays__pin-short', room.short);
      short?.setAttribute('aria-hidden', 'true');
      pin.append(...[textEl('span', 'stays__pin-name', room.label), short, count].filter(Boolean));
      pin.addEventListener('click', () => this.select(i));
      return pin;
    });
    this._land = groupEl('stays__land', [imgEl(section.scene.image, 'stays__land-img', true), ...this._pins]);

    this._detail = document.createElement('div');
    this._detail.className = 'stays__detail';
    this._detail.setAttribute('aria-live', 'polite');
    const head = groupEl('stays__head', [
      textEl('p', 'stays__eyebrow', section.eyebrow),
      textEl('h2', 'stays__title', section.title),
      textEl('p', 'stays__lead', section.lead),
      textEl('p', 'stays__hint', section.hint),
    ]);
    const bottom = groupEl('stays__bottom', [this._detail, textEl('p', 'stays__note', section.priceNote)]);
    // Thứ tự: tiêu đề, cảnh, thẻ. Điện thoại xếp dọc đúng thứ tự này; màn rộng đặt tiêu đề và thẻ đè lên bên trái cảnh.
    return groupEl('stays__stage', [head, groupEl('stays__scene', [this._land]), bottom]);
  }

  render() {
    const section = this._data;
    const variant = section.variant;
    this.className = variant ? `stays stays--${variant}` : 'stays';
    const rooms = roomsOf(section, this.site).filter((room) => room.label);

    if (variant === 'headland' && rooms.length && section.scene?.image?.src) {
      this.replaceChildren(this.headlandEl(rooms));
      this.select(0);
      return;
    }

    const head = groupEl('stays__head', [
      textEl('p', 'stays__eyebrow', section.eyebrow),
      textEl('h2', 'stays__title', section.title),
      textEl('p', 'stays__lead', section.lead),
    ]);
    const grid = groupEl('stays__grid', rooms.map((room) => this.cardEl(room, 'stays__card', true)));
    this.replaceChildren(...[groupEl('stays__inner container', [head, grid, textEl('p', 'stays__note', section.priceNote)])].filter(Boolean));
  }
}
