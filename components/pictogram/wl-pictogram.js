/* wl-pictogram.js - con số kể bằng hình: mỗi số vẽ thành một dãy icon lặp lại đúng bằng số đó (27 hướng dẫn viên
   là 27 hình người), để khách thấy độ lớn của con số thay vì chỉ đọc chữ số.
   Mỗi mục: số lớn và nhãn, một câu ngắn, ô hình. Ô hình hoặc lặp một icon (icon, value), hoặc vẽ một danh sách icon
   khác nhau có tên dưới mỗi hình (icons, ví dụ các phương tiện). Tuỳ chọn tô nổi vài hình đầu (mark) và vẽ thêm vài
   hình mờ phía sau (faded), mỗi loại có một dòng chú thích. Cuộn tới thì số đếm lên, các hình hiện lần lượt. */
import { textEl } from '../../js/core/dom.js';
import { iconEl } from '../../js/core/icon.js';

const format = (n) => new Intl.NumberFormat('vi-VN').format(n);

// Một hình trong ô. Màu đến từ dữ liệu nên kiểm trước khi gán vào CSS.
function figureEl(icon, index, kind, color, label) {
  const cell = document.createElement('li');
  cell.className = kind ? `pictogram__cell pictogram__cell--${kind}` : 'pictogram__cell';
  cell.style.setProperty('--i', index);
  if (color && CSS.supports('color', color)) cell.style.setProperty('--cell-color', color);
  cell.append(...[iconEl(icon, 'pictogram__icon'), textEl('span', 'pictogram__name', label)].filter(Boolean));
  return cell;
}

// Danh sách hình: icons ghi sẵn từng hình; không thì lặp icon đủ value lần, mark hình đầu tô nổi, faded hình mờ cuối.
function cellsOf(item, value) {
  if (item.icons?.length) {
    return item.icons.map((one, i) => figureEl(one.icon, i, '', one.color, one.label));
  }
  const mark = Math.min(Number(item.mark) || 0, value);
  const faded = Math.max(0, Number(item.faded) || 0);
  return Array.from({ length: value + faded }, (_, i) => {
    const kind = i < mark ? 'mark' : i >= value ? 'faded' : '';
    return figureEl(item.icon, i, kind);
  });
}

// Chú thích cho hình tô nổi và hình mờ: một ô màu nhỏ đứng trước câu chữ.
function legendEl(item) {
  const rows = [
    item.mark && item.markLabel ? ['mark', item.markLabel] : null,
    item.faded && item.fadedLabel ? ['faded', item.fadedLabel] : null,
  ].filter(Boolean);
  if (!rows.length) return null;
  const list = document.createElement('ul');
  list.className = 'pictogram__legend';
  rows.forEach(([kind, text]) => {
    const li = textEl('li', `pictogram__key pictogram__key--${kind}`, text);
    list.append(li);
  });
  return list;
}

export class WlPictogram extends HTMLElement {
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
    this.className = section.variant ? `pictogram pictogram--${section.variant}` : 'pictogram';

    // Mục không có số (ghi value, hoặc có danh sách icons) thì không có gì để vẽ, bỏ qua.
    this._items = (section.items ?? [])
      .map((item) => ({ ...item, value: Math.round(Number(item.value ?? item.icons?.length)) }))
      .filter((item) => item.value > 0 && (item.icon || item.icons?.length));

    const list = document.createElement('ul');
    list.className = 'pictogram__list';
    this._numbers = this._items.map((item) => {
      const { li, number } = this.itemEl(item);
      list.append(li);
      return number;
    });

    const inner = document.createElement('div');
    inner.className = 'container';
    inner.append(...[
      textEl('p', 'pictogram__eyebrow', section.eyebrow),
      textEl('h2', 'pictogram__title', section.title),
      textEl('p', 'pictogram__lead', section.lead),
      this._items.length ? list : null,
    ].filter(Boolean));
    this.replaceChildren(inner);
    this.start();
  }

  // Một mục: số và nhãn (số đếm chạy chỉ để nhìn, trình đọc màn hình đọc số cuối cùng), câu ngắn, ô hình, chú thích.
  itemEl(item) {
    const number = textEl('span', 'pictogram__number', format(item.value));
    number.setAttribute('aria-hidden', 'true');
    const value = document.createElement('p');
    value.className = 'pictogram__value';
    value.append(...[
      number,
      textEl('span', 'pictogram__sr', format(item.value)),
      textEl('span', 'pictogram__label', item.label),
    ].filter(Boolean));

    const cells = document.createElement('ul');
    cells.className = item.icons?.length ? 'pictogram__cells pictogram__cells--named' : 'pictogram__cells';
    cells.setAttribute('aria-hidden', 'true');
    cells.append(...cellsOf(item, item.value));

    const li = document.createElement('li');
    li.className = 'pictogram__item';
    li.append(...[value, textEl('p', 'pictogram__text', item.text), cells, legendEl(item)].filter(Boolean));
    return { li, number };
  }

  // Chỉ chạy một lần khi khối vào màn hình. Giảm chuyển động thì hiện đủ ngay, số không đếm.
  start() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.classList.add('is-shown');
      return;
    }
    this._numbers.forEach((number) => { number.textContent = format(0); });
    this._io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      this._io.disconnect();
      this.classList.add('is-shown');
      this.countUp();
    }, { threshold: 0.25 });
    this._io.observe(this);
  }

  stop() {
    this._io?.disconnect();
    cancelAnimationFrame(this._frame);
  }

  // Số chạy từ 0 lên trong cùng một khoảng thời gian cho mọi mục, chậm dần ở cuối.
  countUp() {
    const duration = 1200;
    const begin = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - begin) / duration);
      const eased = 1 - (1 - t) ** 3;
      this._items.forEach((item, i) => {
        this._numbers[i].textContent = format(Math.round(item.value * eased));
      });
      if (t < 1) this._frame = requestAnimationFrame(step);
    };
    this._frame = requestAnimationFrame(step);
  }
}
