/* wl-tour-pick.js - gợi ý tour cho khách chưa biết chọn gì: trả lời một câu vui là ra một thẻ tour.
   Kiểu reel: câu "Hôm nay mình đi bằng [ô chữ]", bấm quay thì ô chữ chạy như máy quay số rồi dừng ở một lựa chọn,
   bên cạnh hiện thẻ một tour của lựa chọn đó. Mỗi lựa chọn (options) trỏ tới id tour trong catalog (AGENTS.md mục 5),
   thẻ kết quả dựng bằng catalog-card.js nên giống hệt thẻ ở trang tất cả tour. */
import { catalogItem } from '../core.js';
import { textEl, groupEl } from '../dom.js';
import { cardEl, fill, isComplete } from './catalog-card.js';

// Ô chữ chạy qua đủ nhiều vòng mỗi lần quay để trông như quay thật, không nhảy thẳng tới kết quả.
const CYCLES = 8;
const SPIN_MS = 2400;

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function random(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export class WlTourPick extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  get labels() {
    return this._data.labels ?? {};
  }

  // Khối bị gỡ khỏi trang (đổi trang, đổi brand) giữa lúc đang quay thì huỷ hẹn giờ, khỏi vẽ vào khối đã mất.
  disconnectedCallback() {
    clearTimeout(this._timer);
  }

  // Chỉ giữ lựa chọn có chữ và có ít nhất một tour thật trong danh mục; tour của lựa chọn cũng lọc như vậy.
  options() {
    return (this._data.options ?? [])
      .map((option) => ({ ...option, tours: (option.items ?? []).map((id) => catalogItem(this.site, id)).filter(isComplete) }))
      .filter((option) => option.label && option.tours.length);
  }

  resultCard(tour) {
    return cardEl(tour, { site: this.site, labels: this.labels });
  }

  // Dải chữ là các lựa chọn lặp lại CYCLES lần; ô cửa sổ chỉ cao một dòng nên mỗi lúc thấy một chữ.
  // Vị trí tính bằng em (mỗi dòng 1.12em) nên không phải đo pixel, đổi cỡ chữ vẫn đúng.
  reelEl() {
    const strip = document.createElement('span');
    strip.className = 'tour-pick__strip';
    for (let i = 0; i < CYCLES; i += 1) {
      this._options.forEach((option) => strip.append(textEl('span', '', option.label)));
    }
    this._strip = strip;
    this._pos = 0;
    const win = groupEl('tour-pick__window', [strip]);
    // Chữ trên ô chỉ để nhìn; kết quả được đọc qua dòng ghi chú bên dưới (aria-live).
    win.setAttribute('aria-hidden', 'true');
    return win;
  }

  moveTo(pos, animate) {
    this._strip.style.transition = animate ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.75, 0.15, 1)` : 'none';
    this._strip.style.transform = `translateY(${-pos * 1.12}em)`;
    this._pos = pos;
  }

  // Quay: về vòng đầu không hiệu ứng, rồi chạy tới lựa chọn trúng ở vòng cuối, nên lần nào cũng quay đủ nhiều vòng.
  // Giảm chuyển động thì không quay, ra kết quả ngay.
  spin() {
    const n = this._options.length;
    const index = Math.floor(Math.random() * n);
    const animate = !reducedMotion();
    this._button.disabled = true;
    this.moveTo(this._pos % n, false);
    this._strip.getBoundingClientRect();
    this.moveTo((CYCLES - 1) * n + index, animate);
    clearTimeout(this._timer);
    const land = () => this.land(this._options[index]);
    if (animate) this._timer = setTimeout(land, SPIN_MS + 50);
    else land();
  }

  land(option) {
    const tour = random(option.tours);
    this._note.textContent = fill(this.labels.note, { option: option.label, tour: tour.name, start: tour.start ?? '', end: tour.end ?? '' }) ?? '';
    const card = this.resultCard(tour);
    card.classList.add('tour-pick__card');
    this._result.replaceChildren(card);
    this._button.disabled = false;
    this._button.textContent = this.labels.again ?? this.labels.spin ?? '';
  }

  render() {
    const section = this._data;
    this.className = `tour-pick tour-pick--${section.variant ?? 'reel'}`;
    clearTimeout(this._timer);
    this._options = this.options();
    const eyebrow = textEl('p', 'tour-pick__eyebrow', section.eyebrow);
    // Không có lựa chọn nào dùng được thì chỉ hiện phần chữ, không dựng nút quay vô dụng.
    if (!this._options.length) {
      this.replaceChildren(...[groupEl('tour-pick__inner container', [eyebrow, textEl('h2', 'tour-pick__title', section.title)])].filter(Boolean));
      return;
    }

    const title = document.createElement('h2');
    title.className = 'tour-pick__title';
    title.append(section.title ? `${section.title} ` : '', this.reelEl());

    this._button = textEl('button', 'btn tour-pick__spin', this.labels.spin) ?? document.createElement('button');
    this._button.type = 'button';
    this._button.addEventListener('click', () => this.spin());
    this._note = document.createElement('p');
    this._note.className = 'tour-pick__note';
    this._note.setAttribute('aria-live', 'polite');
    this._result = document.createElement('div');
    this._result.className = 'tour-pick__result';
    const empty = textEl('p', 'tour-pick__empty', this.labels.empty);
    if (empty) this._result.append(empty);

    const ask = groupEl('tour-pick__ask', [eyebrow, title, textEl('p', 'tour-pick__lead', section.lead), this._button, this._note]);
    this.replaceChildren(groupEl('tour-pick__inner container', [ask, this._result]));
    this.moveTo(0, false);
  }
}
