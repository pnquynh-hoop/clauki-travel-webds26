/* wl-breadcrumb.js - đường dẫn "Trang chủ / Tour / Sài Gòn lên đèn" ở đầu trang con, để khách biết mình đang ở đâu và quay lên một bậc.
   Bước đầu (trang chủ) lấy từ site.home, chữ của nó là `home`; các bước tiếp theo ghi trong `items`; bước cuối là trang đang xem
   (không có liên kết, aria-current="page"). Thiếu `home` hoặc site.home thì bỏ bước đầu; không có bước nào thì không dựng gì. */
import { textEl } from '../core/dom.js';

export class WlBreadcrumb extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  disconnectedCallback() {
    this._watch?.disconnect();
    this._watch = null;
  }

  // Header kiểu overlay không chiếm chỗ nên che dòng này khi nó đứng đầu trang. --header-stuck chỉ là thanh chính (không gồm dải
  // thông tin phía trên), nên đo cả header rồi ghi vào --breadcrumb-top; CSS chỉ dùng khi header là overlay (breadcrumb.css).
  trackHeader() {
    this._watch?.disconnect();
    const header = document.querySelector('wl-header');
    if (!header || typeof ResizeObserver === 'undefined') return;
    const measure = () => this.style.setProperty('--breadcrumb-top', `${header.offsetHeight}px`);
    measure();
    this._watch = new ResizeObserver(measure);
    this._watch.observe(header);
  }

  // Một bước: có href (và không phải bước cuối) thì là liên kết, còn lại là chữ. Bước cuối đánh dấu trang đang xem.
  stepEl(label, href, last) {
    const item = document.createElement('li');
    item.className = 'breadcrumb__item';
    if (last || !href) {
      const current = textEl('span', 'breadcrumb__current', label);
      if (last) current.setAttribute('aria-current', 'page');
      item.append(current);
    } else {
      const link = textEl('a', 'breadcrumb__link', label);
      link.href = href;
      item.append(link);
    }
    return item;
  }

  render() {
    const section = this._data;
    this.className = section.variant ? `breadcrumb breadcrumb--${section.variant}` : 'breadcrumb';
    const steps = [];
    if (section.home && this.site?.home) steps.push([section.home, this.site.home]);
    (section.items ?? []).filter((it) => it.label).forEach((it) => steps.push([it.label, it.href]));
    if (!steps.length) {
      this.replaceChildren();
      return;
    }

    const list = document.createElement('ol');
    list.className = 'breadcrumb__list';
    list.append(...steps.map(([label, href], i) => this.stepEl(label, href, i === steps.length - 1)));

    const nav = document.createElement('nav');
    nav.className = 'breadcrumb__nav container';
    // Nhãn của vùng điều hướng cho trình đọc màn hình; thiếu thì không gán (vẫn là <nav>).
    if (section.label) nav.setAttribute('aria-label', section.label);
    nav.append(list);
    this.replaceChildren(nav);
    this.trackHeader();
  }
}
