/* wl-coins.js - tiền đi đâu, kể bằng đồng xu: một khoản tiền chia thành các phần (parts), mỗi phần là một chồng xu,
   mỗi đồng xu bằng `unit` phần trăm (mặc định 5). Khoản tiền là giá một sản phẩm trong danh mục (item, xem mục 5 của
   AGENTS.md) hoặc ghi thẳng (amount); số tiền của mỗi phần tính từ khoản đó, làm tròn tới nghìn.
   Cuộn tới thì xu rơi xuống từng đồng, chồng cao dần, phần trăm đếm lên như điểm trong game (một lần).
   Rê chuột vào một phần thì các phần khác mờ đi. Chữ có sẵn trong DOM cho trình đọc màn hình, đồng xu chỉ để nhìn;
   giảm chuyển động thì hiện đủ ngay. */
import { catalogItem } from '../core.js';
import { textEl } from '../dom.js';
import { iconEl } from '../icon.js';

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const format = (n) => new Intl.NumberFormat('vi-VN').format(n);
const fill = (text, values) => String(text).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');

function coinEl(k) {
  const coin = document.createElement('li');
  coin.className = 'coins__coin';
  coin.style.setProperty('--k', k);
  return coin;
}

// Chồng xu của một phần; start là số xu của các phần trước, để xu rơi nối tiếp nhau qua mọi chồng.
function stackEl(count, start) {
  const stack = document.createElement('ul');
  stack.className = 'coins__stack';
  stack.setAttribute('aria-hidden', 'true');
  stack.append(...Array.from({ length: count }, (_, i) => coinEl(start + i)));
  return stack;
}

// Phần trăm: số đếm chạy chỉ để nhìn, trình đọc màn hình đọc số cuối cùng ở chữ ẩn bên cạnh.
function percentEl(value) {
  const box = document.createElement('p');
  box.className = 'coins__percent';
  const number = textEl('span', '', `${value}%`);
  number.setAttribute('aria-hidden', 'true');
  box.append(number, textEl('span', 'coins__sr', `${value}%`));
  return { box, number };
}

// Màu đến từ dữ liệu nên kiểm trước khi gán vào CSS.
function partEl(part, coins, start, amount, currency) {
  const li = document.createElement('li');
  li.className = 'coins__part';
  if (part.color && CSS.supports('color', part.color)) li.style.setProperty('--part-color', part.color);
  const label = document.createElement('h3');
  label.className = 'coins__label';
  label.append(...[iconEl(part.icon, 'coins__icon'), part.label].filter(Boolean));
  const percent = percentEl(part.value);
  const money = amount ? `${format(Math.round((amount * part.value) / 100000) * 1000)} ${currency ?? ''}`.trim() : '';
  li.append(...[
    stackEl(coins, start),
    percent.box,
    label,
    textEl('p', 'coins__amount', money),
    textEl('p', 'coins__text', part.text),
  ].filter(Boolean));
  return { li, number: percent.number };
}

export class WlCoins extends HTMLElement {
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
    this.className = 'coins';
    const labels = section.labels ?? {};
    const unit = Number(section.unit) > 0 ? Number(section.unit) : 5;
    // Khoản tiền: lấy giá của sản phẩm trong danh mục nếu có, không thì số ghi thẳng ở khối.
    const product = section.item ? catalogItem(this.site, section.item) : null;
    const amount = Number(product?.price ?? section.amount) || 0;
    const currency = section.currency ?? this.site?.catalog?.currency;
    // Phần thiếu tên hoặc phần trăm không dương thì bỏ.
    this._parts = (section.parts ?? [])
      .map((part) => ({ ...part, value: Number(part.value) }))
      .filter((part) => part.label && part.value > 0);

    const list = document.createElement('ol');
    list.className = 'coins__parts';
    let start = 0;
    const counts = this._parts.map((part) => Math.max(1, Math.round(part.value / unit)));
    // Mọi chồng cao bằng chồng cao nhất, để đáy các chồng thẳng hàng như cột biểu đồ.
    list.style.setProperty('--max', Math.max(0, ...counts));
    this._numbers = this._parts.map((part, i) => {
      const { li, number } = partEl(part, counts[i], start, amount, currency);
      start += counts[i];
      list.append(li);
      return number;
    });

    const inner = document.createElement('div');
    inner.className = 'container';
    inner.append(...[
      textEl('p', 'coins__eyebrow', section.eyebrow),
      textEl('h2', 'coins__heading', section.title),
      textEl('p', 'coins__lead', section.lead),
      this.totalEl(labels, product, amount, currency, unit),
      this._parts.length ? list : null,
    ].filter(Boolean));
    this.replaceChildren(inner);
    if (this._parts.length) this.start(list);
  }

  // Dòng tổng như tờ hoá đơn: tên khoản tiền, số tiền lớn, và chú thích mỗi đồng xu bằng bao nhiêu phần trăm.
  totalEl(labels, product, amount, currency, unit) {
    if (!amount) return null;
    const box = document.createElement('div');
    box.className = 'coins__total';
    const key = document.createElement('p');
    key.className = 'coins__unit';
    const coin = document.createElement('span');
    coin.className = 'coins__coin coins__coin--key';
    coin.setAttribute('aria-hidden', 'true');
    if (labels.unit) key.append(coin, fill(labels.unit, { n: unit }));
    box.append(...[
      textEl('p', 'coins__name', fill(labels.total ?? '', { name: product?.name ?? '' })),
      textEl('p', 'coins__price', `${format(amount)} ${currency ?? ''}`.trim()),
      labels.unit ? key : null,
    ].filter(Boolean));
    return box;
  }

  // Xu rơi khi danh sách vào màn hình (một lần); phần trăm đếm lên cùng lúc, chậm dần ở cuối.
  start(list) {
    if (reduceMotion()) {
      list.classList.add('is-shown');
      return;
    }
    this._numbers.forEach((number) => { number.textContent = '0%'; });
    this._io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      this._io.disconnect();
      list.classList.add('is-shown');
      this.countUp();
    }, { threshold: 0.25 });
    this._io.observe(list);
  }

  countUp() {
    const duration = 1400;
    const begin = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - begin) / duration);
      const eased = 1 - (1 - t) ** 3;
      this._parts.forEach((part, i) => {
        this._numbers[i].textContent = `${Math.round(part.value * eased)}%`;
      });
      if (t < 1) this._frame = requestAnimationFrame(step);
    };
    this._frame = requestAnimationFrame(step);
  }

  stop() {
    this._io?.disconnect();
    cancelAnimationFrame(this._frame);
  }
}
