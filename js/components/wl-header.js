/* wl-header.js - đầu trang: logo hoặc tên thương hiệu, menu neo tới các section, nút CTA.
   Là khối cố định nên nhận cả content.json (el.data); kiểu trình bày đọc từ header.variant. */
import { asset } from '../core.js';
import { textEl, linkEl, groupEl, telHref } from '../dom.js';

// Có logo thì dùng ảnh kèm tên thương hiệu, chưa có thì chỉ hiện tên bằng font tiêu đề.
// Tên luôn là chữ thật (ảnh để alt rỗng để trình đọc màn hình không đọc tên hai lần);
// kiểu header nào chỉ muốn thấy logo thì CSS ẩn chữ khỏi mắt nhưng vẫn giữ cho trình đọc màn hình.
// Bấm logo thì về trang chủ của thương hiệu (core.js đưa vào site.home); chưa có thì về đầu trang.
function brandEl(brand, home) {
  const a = document.createElement('a');
  a.className = 'header__brand';
  a.href = home ?? '#';
  if (brand.logo) {
    const img = document.createElement('img');
    img.src = asset(brand.logo);
    img.alt = '';
    a.append(img, textEl('span', 'header__brand-name', brand.name) ?? '');
  } else {
    a.textContent = brand.name ?? '';
  }
  return a;
}

// Dòng thông tin nhỏ phía trên: chỉ có khi dữ liệu ghi header.note (ví dụ giờ nhận phòng), kèm số điện thoại bấm gọi được.
function topbarEl(note, phone) {
  if (!note) return null;
  const inner = groupEl('header__topbar-inner container', [
    textEl('p', 'header__note', note),
    linkEl(telHref(phone), phone, 'header__phone'),
  ]);
  return inner && groupEl('header__topbar', [inner]);
}

export class WlHeader extends HTMLElement {
  connectedCallback() {
    // Phím Escape đóng menu điện thoại. Cuộn khỏi đầu trang thì bật lớp is-scrolled để CSS hiện đường kẻ dưới header.
    // Lớp này chỉ được đổi màu, không được đổi chiều cao header (xem chú thích đầu header.css).
    // Hai listener gắn vào document và window nên phải gỡ khi khối bị gỡ.
    this._onKey = (e) => {
      if (e.key === 'Escape') this.setOpen(false);
    };
    this._onScroll = () => this.classList.toggle('is-scrolled', window.scrollY > 8);
    document.addEventListener('keydown', this._onKey);
    window.addEventListener('scroll', this._onScroll, { passive: true });
    // Thanh chính là phần còn dính trên màn hình khi cuộn (dải thông tin phía trên trượt khuất), nên đo nó.
    this._resize = new ResizeObserver(() => this.saveStuckHeight());
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this._onKey);
    window.removeEventListener('scroll', this._onScroll);
    this._resize.disconnect();
  }

  // Ghi chiều cao thanh chính vào biến --header-stuck trên <html>; base.css dùng nó để link nhảy tới khối không bị header che.
  // Lúc menu điện thoại đang mở thì giữ số cũ: bấm một mục là menu đóng lại trước khi trang cuộn.
  saveStuckHeight() {
    if (!this._bar || this.classList.contains('is-open')) return;
    document.documentElement.style.setProperty('--header-stuck', `${this._bar.offsetHeight}px`);
  }

  set data(content) {
    this._data = content;
    this.render();
  }

  // Mở hoặc đóng menu trên điện thoại; aria-expanded cho trình đọc màn hình biết trạng thái.
  setOpen(open) {
    this.classList.toggle('is-open', open);
    this._toggle?.setAttribute('aria-expanded', String(open));
  }

  render() {
    const content = this._data;
    const header = content.header ?? {};
    this.className = `header header--${header.variant ?? 'solid'}`;

    const nav = document.createElement('nav');
    nav.className = 'header__nav';
    nav.id = 'menu-chinh';
    const links = (content.nav ?? []).map((item) => linkEl(item.href, item.label, 'header__link')).filter(Boolean);
    nav.append(...links);
    // Bấm một mục trong menu điện thoại thì đóng menu lại để thấy section vừa nhảy tới.
    nav.addEventListener('click', (e) => {
      if (e.target.closest('a')) this.setOpen(false);
    });

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'header__toggle';
    toggle.textContent = header.menu ?? 'Menu';
    toggle.setAttribute('aria-controls', nav.id);
    toggle.addEventListener('click', () => this.setOpen(!this.classList.contains('is-open')));
    this._toggle = toggle;

    const bar = document.createElement('div');
    bar.className = 'header__bar container';
    const cta = linkEl(this.site?.cta?.href, this.site?.cta?.label, 'btn header__cta');
    // Nút Menu đứng ngay sau tên thương hiệu: điện thoại thì cùng hàng, phím Tab đi qua nút trước rồi mới tới menu.
    bar.append(...[brandEl(content.brand ?? {}, this.site?.home), toggle, nav, cta].filter(Boolean));
    // Đổi thương hiệu thì thanh cũ bị thay: theo dõi thanh mới (đổi bề ngang màn hình thì thanh cũng đổi cao).
    this._bar = bar;
    this._resize?.disconnect();
    this._resize?.observe(bar);

    this.replaceChildren(...[topbarEl(header.note, content.contact?.phone), bar].filter(Boolean));
    // Gán className ở trên đã xoá is-open, is-scrolled; đặt lại cho khớp trạng thái hiện tại.
    this.setOpen(false);
    this._onScroll?.();
  }
}
