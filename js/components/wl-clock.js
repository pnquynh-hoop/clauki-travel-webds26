/* wl-clock.js - đồng hồ 24 giờ "giờ nào ăn gì, đi đâu": mặt đồng hồ chia múi (bình minh, sáng, trưa...), kim chỉ giờ
   đang chọn; bảng bên cạnh hiện tên múi, nên ăn gì, làm gì, mức kẹt xe và tour hợp giờ đó (lấy từ catalog).
   Mặc định là giờ thật ở nơi của thương hiệu (place.timezone). Đổi giờ bằng cách bấm hoặc kéo trên mặt đồng hồ
   (chuột, cảm ứng), hoặc thanh trượt (bàn phím, trình đọc màn hình); mặt đồng hồ chỉ để nhìn nên ẩn với trình đọc. */
import { catalogItem } from '../core.js';
import { textEl, groupEl } from '../dom.js';

const NS = 'http://www.w3.org/2000/svg';
const TAU = Math.PI * 2;
// Bán kính trong, ngoài của vành múi giờ và vị trí số giờ, theo khung -110..110.
const R_IN = 52;
const R_OUT = 100;
const R_HOURS = 44;
const pad = (n) => String(n).padStart(2, '0');
const fill = (text, values) => String(text ?? '').replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

// Một múi hình quạt khuyết từ góc a0 tới a1 (radian, 0 là 12 giờ, theo chiều kim đồng hồ).
function arcPath(a0, a1) {
  const at = (a, r) => [Math.sin(a) * r, -Math.cos(a) * r];
  const [x0, y0] = at(a0, R_OUT);
  const [x1, y1] = at(a1, R_OUT);
  const [x2, y2] = at(a1, R_IN);
  const [x3, y3] = at(a0, R_IN);
  const big = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x0} ${y0} A${R_OUT} ${R_OUT} 0 ${big} 1 ${x1} ${y1} L${x2} ${y2} A${R_IN} ${R_IN} 0 ${big} 0 ${x3} ${y3}Z`;
}

// Múi chứa giờ h; múi qua nửa đêm ghi to lớn hơn 24 (ví dụ 23 tới 29 là 23:00 tới 05:00).
function windowAt(windows, h) {
  return windows.find((w) => (h >= w.from && h < w.to) || (h + 24 >= w.from && h + 24 < w.to));
}

function hourNow(timezone) {
  try {
    const text = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: timezone }).format(new Date());
    return Number(text) % 24;
  } catch {
    return new Date().getHours();
  }
}

export class WlClock extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  dialEl(windows) {
    const svg = svgEl('svg', { viewBox: '-110 -110 220 220', class: 'clock__face', 'aria-hidden': 'true' });
    const sectors = svgEl('g');
    for (const w of windows) {
      const path = svgEl('path', { class: 'clock__sector', d: arcPath((w.from / 24) * TAU, (w.to / 24) * TAU), fill: w.color ?? 'currentColor' });
      sectors.append(path);
    }
    const hours = svgEl('g', { class: 'clock__hours' });
    for (let h = 0; h < 24; h += 3) {
      const a = (h / 24) * TAU;
      const text = svgEl('text', { x: (Math.sin(a) * R_HOURS).toFixed(1), y: (-Math.cos(a) * R_HOURS + 3).toFixed(1), 'text-anchor': 'middle' });
      text.textContent = String(h);
      hours.append(text);
    }
    this._hand = svgEl('line', { class: 'clock__hand', x1: 0, y1: 0, x2: 0, y2: -74 });
    svg.append(sectors, hours, this._hand, svgEl('circle', { class: 'clock__hub', r: 9 }));

    // Bấm hoặc kéo: đổi vị trí con trỏ ra góc so với tâm rồi ra giờ.
    const pick = (e) => {
      const box = svg.getBoundingClientRect();
      const x = e.clientX - (box.left + box.width / 2);
      const y = e.clientY - (box.top + box.height / 2);
      const angle = (Math.atan2(x, -y) + TAU) % TAU;
      this.show(Math.floor((angle / TAU) * 24) % 24);
    };
    // Chuột, bút: bấm hoặc kéo để đổi giờ. Cảm ứng: chỉ đổi khi chạm rồi nhả tại chỗ, để vuốt qua mặt đồng hồ
    // vẫn cuộn trang bình thường (touch-action: pan-y trong clock.css).
    let start = null;
    svg.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') {
        start = { x: e.clientX, y: e.clientY };
        return;
      }
      svg.setPointerCapture(e.pointerId);
      this._dragging = true;
      pick(e);
    });
    svg.addEventListener('pointermove', (e) => {
      if (this._dragging) pick(e);
    });
    svg.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch' && start && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 10) pick(e);
      start = null;
      this._dragging = false;
    });
    svg.addEventListener('pointercancel', () => {
      start = null;
      this._dragging = false;
    });
    return svg;
  }

  panelEl(labels) {
    this._range = document.createElement('input');
    this._range.type = 'range';
    this._range.min = '0';
    this._range.max = '23';
    this._range.step = '1';
    this._range.className = 'clock__range';
    this._range.addEventListener('input', () => this.show(Number(this._range.value)));
    const rangeLabel = document.createElement('label');
    rangeLabel.className = 'clock__range-label';
    rangeLabel.append(textEl('span', '', labels.range) ?? '', this._range);

    this._time = textEl('p', 'clock__time', ' ');
    this._name = textEl('h3', 'clock__name', ' ');
    // Chỉ đọc tên múi khi đổi giờ, để trình đọc màn hình không đọc lại cả bảng mỗi nấc trượt.
    this._name.setAttribute('aria-live', 'polite');
    this._eat = this.lineEl(labels.eat);
    this._do = this.lineEl(labels.do);
    this._traffic = this.lineEl(labels.traffic);
    this._tour = document.createElement('a');
    this._tour.className = 'btn clock__tour';
    const panel = groupEl('clock__panel', [rangeLabel, this._time, this._name, this._eat.row, this._do.row, this._traffic.row, this._tour]);
    return panel;
  }

  // Một dòng "Ăn: ...": nhãn đậm, phần giá trị đổi theo giờ.
  lineEl(label) {
    const row = document.createElement('p');
    row.className = 'clock__line';
    const value = document.createElement('span');
    row.append(...[textEl('strong', '', label && `${label}:`), label ? ' ' : null, value].filter(Boolean));
    return { row, value };
  }

  show(h) {
    const section = this._data;
    const labels = section.labels ?? {};
    const w = windowAt(this._windows, h);
    if (!w) return;
    this._range.value = String(h);
    // Kim xoay tới giữa ô giờ (mỗi giờ 15 độ).
    this._hand.style.transform = `rotate(${(h / 24) * 360 + 7.5}deg)`;
    this._time.textContent = `${pad(h)}:00`;
    this._name.textContent = w.name ?? '';
    this._eat.value.textContent = w.eat ?? '';
    this._eat.row.hidden = !w.eat;
    this._do.value.textContent = w.do ?? '';
    this._do.row.hidden = !w.do;

    const level = section.traffic?.[h];
    this._traffic.row.hidden = level === undefined;
    if (level !== undefined) {
      const meter = document.createElement('span');
      meter.className = 'clock__meter';
      for (let i = 0; i < 5; i += 1) {
        const dot = document.createElement('i');
        if (i < level) dot.className = 'is-on';
        meter.append(dot);
      }
      const sr = textEl('span', 'clock__sr', fill(labels.trafficValue, { n: level }));
      this._traffic.value.replaceChildren(...[meter, sr].filter(Boolean));
    }

    // Tour chưa có trang (không có href) thì ẩn nút, không dẫn khách tới chỗ trống.
    const item = catalogItem(this.site, w.item);
    this._tour.hidden = !item?.href;
    if (item?.href) {
      this._tour.textContent = fill(labels.tour, { name: item.name });
      this._tour.href = item.href;
    } else {
      // Gỡ cả link cũ: nút ẩn mà còn href thì vẫn có thể nhận Tab ở trình duyệt cũ.
      this._tour.removeAttribute('href');
    }
    // Thanh trượt đọc ra giờ và tên múi ("15:00, Chiều") thay vì chỉ con số.
    this._range.setAttribute('aria-valuetext', `${pad(h)}:00, ${w.name ?? ''}`.replace(/, $/, ''));
    this.style.setProperty('--clock-color', w.color ?? 'var(--color-primary)');
  }

  render() {
    const section = this._data;
    const labels = section.labels ?? {};
    this.className = 'clock';
    this._windows = (section.windows ?? []).filter((w) => Number.isFinite(w.from) && Number.isFinite(w.to));
    const head = groupEl('clock__head', [
      textEl('p', 'clock__eyebrow', section.eyebrow),
      textEl('h2', 'clock__title', section.title),
      textEl('p', 'clock__lead', section.lead),
    ]);
    if (!this._windows.length) {
      this.replaceChildren(...[groupEl('clock__inner container', [head])].filter(Boolean));
      return;
    }
    const now = hourNow(this.site?.place?.timezone);
    const dial = groupEl('clock__dial', [this.dialEl(this._windows), textEl('p', 'clock__now', fill(labels.now, { h: pad(now) }))]);
    this.replaceChildren(groupEl('clock__inner container', [head, groupEl('clock__body', [dial, this.panelEl(labels)])]));
    this.show(now);
  }
}
