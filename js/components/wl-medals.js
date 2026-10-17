/* wl-medals.js - các điều cam kết kể như bảng thành tựu trong game: mỗi điều là một huy chương có icon, tên,
   câu giải thích và một con số chốt (value kèm valueLabel, ví dụ "0 đồng" "phí ẩn").
   Cuộn tới thì huy chương mở khoá lần lượt: ổ khoá rơi, huy chương nảy lên đổi từ xám sang màu, vệt sáng lướt qua,
   nhãn "đã mở khoá" (unlocked) bật ra; thanh kinh nghiệm phía trên đếm số huy chương đã mở (progress có {n}, {total}).
   Rê chuột thì huy chương xoay một vòng như đồng xu. Chữ luôn đọc được, khoá chỉ là lớp hình;
   giảm chuyển động thì mở sẵn hết. */
import { textEl } from '../core/dom.js';
import { iconEl } from '../core/icon.js';

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fill = (text, values) => String(text).replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');

// Huy chương chỉ để nhìn (tên đã có ở h3): icon của điều cam kết, ổ khoá phủ lên khi chưa mở.
function medalEl(icon) {
  const medal = document.createElement('span');
  medal.className = 'medals__medal';
  medal.setAttribute('aria-hidden', 'true');
  medal.append(...[iconEl(icon, 'medals__icon'), iconEl('lock', 'medals__lock')].filter(Boolean));
  return medal;
}

// Con số chốt: số to, nhãn nhỏ đi sau. Thiếu số thì bỏ.
function statEl(item) {
  if (!item.value) return null;
  const stat = document.createElement('p');
  stat.className = 'medals__stat';
  stat.append(...[textEl('strong', 'medals__value', item.value), textEl('span', '', item.valueLabel)].filter(Boolean));
  return stat;
}

// Màu đến từ dữ liệu nên kiểm trước khi gán vào CSS.
function itemEl(item, index, unlocked) {
  const li = document.createElement('li');
  li.className = 'medals__item';
  li.style.setProperty('--i', index);
  if (item.color && CSS.supports('color', item.color)) li.style.setProperty('--medal-color', item.color);
  const badge = textEl('span', 'medals__badge', unlocked);
  badge?.setAttribute('aria-hidden', 'true');
  li.append(...[
    medalEl(item.icon),
    badge,
    textEl('h3', 'medals__name', item.title),
    textEl('p', 'medals__text', item.text),
    statEl(item),
  ].filter(Boolean));
  return li;
}

// Thanh kinh nghiệm: chữ đếm và vạch tô theo số huy chương đã mở; chỉ để nhìn, trình đọc màn hình đọc danh sách.
function progressEl() {
  const bar = document.createElement('div');
  bar.className = 'medals__progress';
  bar.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.className = 'medals__progress-label';
  const track = document.createElement('span');
  track.className = 'medals__track';
  track.append(document.createElement('span'));
  bar.append(label, track);
  return { bar, label };
}

export class WlMedals extends HTMLElement {
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
    this.className = 'medals';
    // Huy chương không có tên thì không có h3 để trình đọc màn hình gọi, nên bỏ.
    const items = (section.items ?? []).filter((item) => item.title);

    const list = document.createElement('ol');
    list.className = 'medals__list';
    list.append(...items.map((item, i) => itemEl(item, i, section.unlocked)));
    const progress = section.progress && items.length ? progressEl() : null;

    const inner = document.createElement('div');
    inner.className = 'container';
    inner.append(...[
      textEl('p', 'medals__eyebrow', section.eyebrow),
      textEl('h2', 'medals__heading', section.title),
      textEl('p', 'medals__lead', section.lead),
      progress?.bar,
      items.length ? list : null,
    ].filter(Boolean));
    this.replaceChildren(inner);
    if (items.length) this.start(list, progress, section.progress);
  }

  // Mở khoá từng huy chương một khi danh sách vào màn hình (một lần); mỗi lần mở, thanh kinh nghiệm tăng một nấc.
  start(list, progress, text) {
    const items = [...list.children];
    const show = (n) => {
      if (!progress) return;
      progress.label.textContent = fill(text, { n, total: items.length });
      progress.bar.style.setProperty('--p', n / items.length);
    };
    if (reduceMotion()) {
      items.forEach((li) => li.classList.add('is-unlocked'));
      show(items.length);
      return;
    }
    show(0);
    this._io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      this._io.disconnect();
      this._timers = items.map((li, i) => setTimeout(() => {
        li.classList.add('is-unlocked');
        show(i + 1);
      }, 300 + i * 450));
    }, { threshold: 0.3 });
    this._io.observe(list);
  }

  stop() {
    this._io?.disconnect();
    (this._timers ?? []).forEach(clearTimeout);
    this._timers = [];
  }
}
