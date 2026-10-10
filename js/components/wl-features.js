/* wl-features.js - những điểm đáng chọn (hoặc những thứ đã gồm trong giá). Dữ liệu: items (mảng value tuỳ chọn, title, text).
   Hai cấu trúc HTML khác nhau nên rẽ nhánh JS theo variant:
   - không có variant: lưới thẻ, mỗi ý một thẻ (con số lớn nếu có, tiêu đề, một câu), dạng cơ bản;
   - cutout (Gành Sớm): một ảnh đã tách nền đặt thật to (thuyền thúng), xoay nhẹ theo cuộn trang như thúng xoay trên sóng;
     bên cạnh là danh sách đánh số và một dòng "chưa gồm". */
import { asset } from '../core.js';
import { textEl, groupEl } from '../dom.js';

const pad = (n) => String(n).padStart(2, '0');

export class WlFeatures extends HTMLElement {
  connectedCallback() {
    // Xoay ảnh theo vị trí cuộn: chỉ khi có ảnh tách nền và người dùng không bật giảm chuyển động.
    this._onScroll = () => {
      if (this._frame || !this._art) return;
      this._frame = requestAnimationFrame(() => {
        this._frame = null;
        this.spin();
      });
    };
    window.addEventListener('scroll', this._onScroll, { passive: true });
    this.spin();
  }

  disconnectedCallback() {
    window.removeEventListener('scroll', this._onScroll);
    cancelAnimationFrame(this._frame);
  }

  set data(section) {
    this._data = section;
    this.render();
  }

  // Khối đi từ đáy lên đỉnh màn hình thì góc xoay chạy từ -12 tới 12 độ; CSS đọc --spin.
  spin() {
    if (!this._art || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = this.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, (innerHeight - rect.top) / (innerHeight + rect.height)));
    this._art.style.setProperty('--spin', `${(progress - 0.5) * 24}deg`);
  }

  gridEl(items) {
    return groupEl('features__grid', items.map((item) => groupEl('features__card', [
      textEl('p', 'features__value', item.value),
      textEl('h3', 'features__name', item.title),
      textEl('p', 'features__text', item.text),
    ])));
  }

  listEl(items) {
    const list = document.createElement('ol');
    list.className = 'features__list';
    list.append(...items.map((item, i) => {
      const li = document.createElement('li');
      li.className = 'features__item';
      const num = textEl('span', 'features__num', item.value ?? pad(i + 1));
      num.setAttribute('aria-hidden', 'true');
      li.append(num, groupEl('features__copy', [textEl('h3', 'features__name', item.title), textEl('p', 'features__text', item.text)]));
      return li;
    }));
    return list;
  }

  artEl(image) {
    if (!image?.src) return null;
    const figure = document.createElement('figure');
    figure.className = 'features__art';
    const img = document.createElement('img');
    img.src = asset(image.src);
    img.alt = image.alt ?? '';
    img.loading = 'lazy';
    figure.append(img);
    return figure;
  }

  render() {
    const section = this._data;
    const variant = section.variant;
    this.className = variant ? `features features--${variant}` : 'features';
    const items = (section.items ?? []).filter((item) => item.title);

    const head = groupEl('features__head', [
      textEl('p', 'features__eyebrow', section.eyebrow),
      textEl('h2', 'features__title', section.title),
      textEl('p', 'features__lead', section.lead),
    ]);
    const note = textEl('p', 'features__note', section.note);

    this._art = variant === 'cutout' ? this.artEl(section.image) : null;
    const body = variant === 'cutout'
      ? [this._art, groupEl('features__side', [head, this.listEl(items), note])]
      : [head, this.gridEl(items), note];
    this.replaceChildren(...[groupEl('features__inner container', body)].filter(Boolean));
    if (this.isConnected) this.spin();
  }
}
