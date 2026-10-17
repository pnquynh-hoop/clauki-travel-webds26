/* wl-timetable.js - bảng giờ chạy hôm nay: mỗi sản phẩm trong danh mục (catalog, mục 5 AGENTS.md) có giờ bắt đầu là một
   dòng, xếp theo giờ: giờ chạy, tên, icon phương tiện của các chặng, trạng thái tính theo giờ thật ở nơi đến
   (place.timezone): đã chạy (qua giờ bắt đầu), hết chỗ (availability hôm nay còn 0), sắp chạy (còn dưới `soon` phút),
   còn N chỗ (hôm nay không có số chỗ thì chỉ ghi còn chỗ). Mỗi nửa phút đồng hồ và trạng thái được tính lại.
   Mọi chuyến hôm nay đã chạy mà có labels.tomorrow thì bảng chuyển sang ngày mai: tiêu đề đổi thành chữ đó, số chỗ
   lấy theo ngày mai, để buổi tối bảng vẫn có chuyến để đặt thay vì toàn dòng đã chạy.
   Bấm một dòng thì sang trang đặt chỗ (book, thiếu thì nút chung site.cta) và phát wl:choose để khối đặt chỗ chọn sẵn
   tour đó, kể cả khi khối đặt chỗ ở trang khác (core.js giữ lại sự kiện). Dòng hết chỗ hoặc đã chạy không đặt được
   nên không còn là liên kết (bỏ href: không bấm, không Tab tới); trạng thái đổi theo giờ thì liên kết bật, tắt theo.
   Kiểu board: bảng giờ nhà ga, giờ và trạng thái xếp trên các ô chữ lật; cuộn tới thì các ô quay chữ rồi dừng
   (một lần); giảm chuyển động thì không lật. Kiểu mặc định: danh sách trên một tấm thẻ. */
import { textEl } from '../../js/core/dom.js';
import { iconEl } from '../../js/core/icon.js';

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fill = (text, values) => String(text ?? '').replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
const ALPHA = 'ABCDEGHIKLMNOPRSTUVY0123456789';

function toMinutes(time) {
  const [h, m] = String(time).split(':').map(Number);
  return h * 60 + m;
}

// Ngày (YYYY-MM-DD), giờ phút và số phút từ nửa đêm ở múi giờ của nơi đến; múi giờ sai thì theo đồng hồ máy khách.
function nowIn(timeZone) {
  const format = (zone) => new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  let parts;
  try {
    parts = format(timeZone);
  } catch {
    parts = format(undefined);
  }
  const p = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, clock: `${p.hour}:${p.minute}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

// Ngày kế tiếp của một ngày YYYY-MM-DD (tính theo UTC để không lệch vì múi giờ của máy khách).
function nextDate(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

// Trạng thái của một chuyến lúc này. Qua giờ bắt đầu là đã chạy, dù chuyến chưa kết thúc.
function statusOf(item, now, soon) {
  const start = toMinutes(item.start);
  const today = (item.availability ?? []).find((day) => day.date === now.date);
  const left = today ? Number(today.left) : null;
  if (now.minutes >= start) return { kind: 'gone' };
  if (left === 0) return { kind: 'full' };
  if (start - now.minutes <= soon) return { kind: 'soon', left };
  return { kind: 'open', left };
}

function statusText(status, labels) {
  if (status.kind === 'open' && status.left !== null) return fill(labels.left, { n: status.left });
  return labels[status.kind] ?? '';
}

// Ô chữ lật: mỗi ký tự một ô, dấu cách thành ô trống. Chỉ để nhìn, chữ thật nằm ở phần chữ ẩn đi kèm.
function flapsEl(text) {
  const box = document.createElement('span');
  box.className = 'timetable__flaps';
  box.setAttribute('aria-hidden', 'true');
  box.append(...[...String(text).toUpperCase()].map((ch) => {
    const cell = document.createElement('span');
    cell.className = ch === ' ' ? 'timetable__flap timetable__flap--space' : 'timetable__flap';
    cell.textContent = ch;
    return cell;
  }));
  return box;
}

// Một ô chữ (giờ hoặc trạng thái): kiểu board xếp lên ô lật kèm chữ ẩn cho trình đọc màn hình, kiểu khác là chữ thường.
function fieldEl(className, text, board) {
  const field = document.createElement('span');
  field.className = className;
  if (board) field.append(flapsEl(text), textEl('span', 'timetable__sr', text));
  else field.textContent = text;
  return field;
}

// Icon phương tiện của các chặng (mỗi loại một lần, theo thứ tự đi), tên phương tiện đọc bằng chữ ẩn.
function vehiclesEl(item, vehicles = {}) {
  const ids = [...new Set((item.stages ?? []).map((stage) => stage.vehicle).filter((id) => vehicles[id]))];
  if (!ids.length) return null;
  const box = document.createElement('span');
  box.className = 'timetable__vehicles';
  ids.forEach((id) => {
    const icon = iconEl(vehicles[id].icon, 'timetable__icon');
    if (!icon) return;
    if (vehicles[id].color && CSS.supports('color', vehicles[id].color)) icon.style.setProperty('--vehicle-color', vehicles[id].color);
    box.append(icon);
  });
  box.append(textEl('span', 'timetable__sr', ids.map((id) => vehicles[id].label).filter(Boolean).join(', ')));
  return box;
}

export class WlTimetable extends HTMLElement {
  disconnectedCallback() {
    this.stop();
  }

  set data(section) {
    this._data = section;
    this.render();
  }

  render() {
    const section = this._data;
    this.stop();
    const board = section.variant === 'board';
    this.className = section.variant ? `timetable timetable--${section.variant}` : 'timetable';
    const catalog = this.site?.catalog ?? {};
    const pick = Array.isArray(section.pick) ? section.pick : null;
    // Chỉ những chuyến có giờ bắt đầu hợp lệ; có pick thì chỉ các chuyến được chọn. Xếp theo giờ chạy.
    const items = (catalog.items ?? [])
      .filter((item) => item.name && !Number.isNaN(toMinutes(item.start)) && (!pick || pick.includes(item.id)))
      .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    if (!items.length) {
      this.replaceChildren();
      return;
    }

    this._labels = section.labels ?? {};
    this._soon = Number(section.soon) > 0 ? Number(section.soon) : 90;
    this._board = board;
    const href = section.book?.href ?? this.site?.cta?.href;
    const list = document.createElement('ol');
    list.className = 'timetable__list';
    this._rows = items.map((item) => this.rowEl(item, href, catalog.vehicles));
    list.append(...this._rows.map((row) => row.li));

    this._clock = document.createElement('p');
    this._clock.className = 'timetable__clock';
    const head = document.createElement('div');
    head.className = 'timetable__head';
    this._title = textEl('h2', 'timetable__title', section.title);
    head.append(...[textEl('p', 'timetable__eyebrow', section.eyebrow), this._title, this._clock].filter(Boolean));

    const frame = document.createElement('div');
    frame.className = 'timetable__frame';
    frame.append(...[head, textEl('p', 'timetable__lead', section.lead), list, textEl('p', 'timetable__foot', section.note)].filter(Boolean));
    const inner = document.createElement('div');
    inner.className = 'container';
    inner.append(frame);
    this.replaceChildren(inner);

    this.refresh();
    // Nửa phút tính lại một lần: đủ để đồng hồ và trạng thái đổi đúng phút mà không tốn máy.
    this._timer = setInterval(() => this.refresh(), 30000);
    if (board) this.watch(list);
  }

  rowEl(item, href, vehicles) {
    const li = document.createElement('li');
    li.className = 'timetable__item';
    const row = document.createElement(href ? 'a' : 'div');
    row.className = 'timetable__row';
    if (href) {
      // Phát wl:choose trước khi chuyển trang để khối đặt chỗ chọn sẵn đúng chuyến này; dòng đang khoá (không href) thì thôi.
      row.addEventListener('click', () => {
        if (row.hasAttribute('href')) document.dispatchEvent(new CustomEvent('wl:choose', { detail: { id: item.id } }));
      });
    }
    const status = document.createElement('span');
    status.className = 'timetable__status';
    row.append(...[
      fieldEl('timetable__time', item.start, this._board),
      textEl('span', 'timetable__name', item.name),
      vehiclesEl(item, vehicles),
      status,
    ].filter(Boolean));
    li.append(row);
    return { li, row, status, item, href, text: '' };
  }

  // Tính lại đồng hồ và trạng thái từng dòng; dòng nào đổi trạng thái thì vẽ lại ô chữ của dòng đó.
  refresh() {
    const now = nowIn(this.site?.place?.timezone);
    // Nhãn đồng hồ (ví dụ "Giờ Sài Gòn:") chỉ cho trình đọc màn hình; thiếu nhãn thì chỉ có giờ.
    const label = this._labels.clock ? textEl('span', 'timetable__sr', `${this._labels.clock} `) : null;
    this._clock.replaceChildren(...[label, ...this.clockParts(now.clock)].filter(Boolean));
    // Hết chuyến hôm nay thì xét ngày mai: chưa chuyến nào chạy, không chuyến nào sắp chạy.
    const allGone = this._rows.every((row) => now.minutes >= toMinutes(row.item.start));
    const tomorrow = allGone && this._labels.tomorrow;
    const when = tomorrow ? { date: nextDate(now.date), minutes: -Infinity } : now;
    if (this._title) this._title.textContent = tomorrow ? this._labels.tomorrow : this._data.title;
    this._rows.forEach((row) => {
      const status = statusOf(row.item, when, this._soon);
      const text = statusText(status, this._labels);
      row.row.dataset.status = status.kind;
      // Chỉ chuyến còn đặt được mới là liên kết.
      if (row.href && ['open', 'soon'].includes(status.kind)) row.row.setAttribute('href', row.href);
      else row.row.removeAttribute('href');
      if (text === row.text) return;
      row.text = text;
      row.status.replaceChildren(fieldEl('timetable__status-text', text, this._board));
    });
  }

  // Đồng hồ: dấu hai chấm tách riêng để kiểu board cho nhấp nháy như đồng hồ nhà ga.
  clockParts(clock) {
    const [h, m] = clock.split(':');
    const colon = textEl('span', 'timetable__colon', ':');
    return [h, colon, m];
  }

  // Cuộn tới thì các ô chữ quay qua vài ký tự rồi dừng ở chữ thật, ô sau dừng muộn hơn ô trước (một lần).
  watch(list) {
    if (reduceMotion()) return;
    this._io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      this._io.disconnect();
      this.flip(list);
    }, { threshold: 0.3 });
    this._io.observe(list);
  }

  flip(list) {
    const begin = performance.now();
    const cells = [...list.querySelectorAll('.timetable__flaps')].flatMap((group, g) => (
      [...group.querySelectorAll('.timetable__flap:not(.timetable__flap--space)')]
        .map((cell, c) => ({ cell, final: cell.textContent, stop: 350 + c * 70 + g * 40 }))
    ));
    const step = (now) => {
      let running = false;
      cells.forEach((one) => {
        if (now - begin >= one.stop) {
          one.cell.textContent = one.final;
          return;
        }
        running = true;
        one.cell.textContent = ALPHA[Math.floor(Math.random() * ALPHA.length)];
      });
      if (running) this._frame = setTimeout(() => step(performance.now()), 55);
    };
    step(begin);
  }

  stop() {
    this._io?.disconnect();
    clearInterval(this._timer);
    clearTimeout(this._frame);
  }
}
