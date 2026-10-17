/* wl-gallery.js - thư viện ảnh. Dữ liệu ảnh: images (mảng src, alt, caption, credit tuỳ chọn, href tuỳ chọn).
   Hai cấu trúc HTML khác nhau nên rẽ nhánh JS theo variant:
   - không có variant: lưới ảnh có chú thích, dạng cơ bản;
   - slices (Gành Sớm): các ảnh là dải hẹp đứng cạnh nhau như tấm bình phong; rê chuột, bấm, Tab hoặc phím mũi tên
     tới dải nào thì dải đó xoè rộng, hiện số thứ tự, chú thích và tên tác giả. Điện thoại thì các dải nằm ngang xếp dọc.
     Ảnh có href (và section có linkLabel) thì dải mở ra kèm một liên kết, ví dụ sang danh sách tour đã lọc theo cách đi đó;
   - plates (SighGone): lưới ô như biển số nhà (nền màu nhấn, viền trắng bên trong), mỗi ô có số, tên (caption), icon và dòng phụ
     (`note`, `icon` tuỳ chọn); rê chuột hoặc Tab tới ô thì ảnh loang ra từ chỗ con trỏ; ảnh có href thì cả ô là liên kết. */
import { asset } from '../core.js';
import { textEl, groupEl, linkEl } from '../dom.js';
import { iconEl } from '../icon.js';

const pad = (n) => String(n).padStart(2, '0');

function imgEl(image, lazy) {
  const img = document.createElement('img');
  img.src = asset(image.src);
  img.alt = image.alt ?? '';
  if (lazy) img.loading = 'lazy';
  return img;
}

function gridEl(images) {
  return groupEl('gallery__grid', images.map((image) => {
    const figure = document.createElement('figure');
    figure.className = 'gallery__figure';
    figure.append(...[imgEl(image, true), textEl('figcaption', 'gallery__caption', image.caption)].filter(Boolean));
    return figure;
  }));
}

export class WlGallery extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  // Mở dải thứ index, đóng các dải khác. Chỉ dải đang mở nhận Tab (tabindex 0), các dải khác đi tới bằng phím mũi tên.
  open(index) {
    this._slices.forEach((slice, i) => {
      const on = i === index;
      slice.classList.toggle('is-open', on);
      this._buttons[i].setAttribute('aria-expanded', String(on));
      this._buttons[i].tabIndex = on ? 0 : -1;
    });
    this._current = index;
  }

  sliceEl(image, i, count) {
    const prefix = this.id || 'gallery';
    const slice = document.createElement('li');
    slice.className = 'gallery__slice';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gallery__btn';
    button.setAttribute('aria-controls', `${prefix}-cap-${i}`);
    const tab = textEl('span', 'gallery__tab', pad(i + 1));
    tab.setAttribute('aria-hidden', 'true');
    // Lớp tối trên ảnh (vẽ bằng ::before, ::after), chỉ để nhìn.
    const shade = document.createElement('span');
    shade.className = 'gallery__shade';
    button.append(imgEl(image, i > 0), shade, tab);
    button.addEventListener('click', () => this.open(i));
    button.addEventListener('focus', () => this.open(i));
    // Rê chuột qua thì mở sau một nhịp ngắn, để lướt chuột ngang qua nhiều dải không làm cả hàng giật liên tục.
    button.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse') return;
      clearTimeout(this._hover);
      this._hover = setTimeout(() => this.open(i), 110);
    });
    button.addEventListener('pointerleave', () => clearTimeout(this._hover));

    const number = textEl('span', 'gallery__num', pad(i + 1));
    number.append(textEl('span', 'gallery__total', `/ ${pad(count)}`));
    number.setAttribute('aria-hidden', 'true');
    const caption = groupEl('gallery__cap', [
      number,
      textEl('p', 'gallery__cap-text', image.caption),
      textEl('p', 'gallery__credit', image.credit),
      linkEl(image.href, this._data.linkLabel, 'gallery__link'),
    ]);
    caption.id = `${prefix}-cap-${i}`;

    slice.append(button, caption);
    this._buttons.push(button);
    return slice;
  }

  slicesEl(images) {
    const section = this._data;
    const list = document.createElement('ul');
    list.className = 'gallery__screen';
    list.style.setProperty('--count', String(images.length));
    if (section.listLabel) list.setAttribute('aria-label', section.listLabel);
    this._buttons = [];
    this._slices = images.map((image, i) => this.sliceEl(image, i, images.length));
    list.append(...this._slices);

    // Phím mũi tên đi qua các dải theo vòng, Home và End nhảy về dải đầu, dải cuối.
    list.addEventListener('keydown', (e) => {
      const from = this._buttons.indexOf(document.activeElement);
      if (from < 0) return;
      const last = this._buttons.length - 1;
      const to = {
        ArrowRight: from === last ? 0 : from + 1,
        ArrowDown: from === last ? 0 : from + 1,
        ArrowLeft: from === 0 ? last : from - 1,
        ArrowUp: from === 0 ? last : from - 1,
        Home: 0,
        End: last,
      }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      this._buttons[to].focus();
    });
    return list;
  }

  // Kiểu plates: ghi vị trí con trỏ vào ô để ảnh loang ra đúng từ chỗ chuột đi vào (CSS đọc --mx, --my).
  plateEl(image, i) {
    const plate = document.createElement(image.href ? 'a' : 'div');
    plate.className = 'gallery__plate';
    // Ô làm cho nhãn ngắn (Đi bộ, Xích lô); chú thích dài như một câu thì CSS cho chữ nhỏ lại để khỏi tràn ô.
    if (image.caption?.length > 24) plate.classList.add('gallery__plate--long');
    if (image.href) plate.href = image.href;
    else plate.tabIndex = 0;
    const photo = document.createElement('span');
    photo.className = 'gallery__plate-photo';
    photo.append(imgEl(image, true));
    const number = textEl('span', 'gallery__plate-no', pad(i + 1));
    number.setAttribute('aria-hidden', 'true');
    const name = textEl('span', 'gallery__plate-name', image.caption);
    if (name) name.prepend(...[iconEl(image.icon, 'gallery__plate-icon')].filter(Boolean));
    // Ảnh không có chú thích lẫn dòng phụ thì groupEl trả null; append(null) sẽ in chữ "null" lên ô nên phải lọc.
    const text = groupEl('gallery__plate-text', [name, textEl('span', 'gallery__plate-note', image.note)]);
    plate.append(...[photo, number, text].filter(Boolean));
    plate.addEventListener('pointermove', (e) => {
      const box = plate.getBoundingClientRect();
      plate.style.setProperty('--mx', `${e.clientX - box.left}px`);
      plate.style.setProperty('--my', `${e.clientY - box.top}px`);
    });
    return plate;
  }

  platesEl(images) {
    const list = document.createElement('div');
    list.className = 'gallery__plates';
    if (this._data.listLabel) {
      list.setAttribute('role', 'group');
      list.setAttribute('aria-label', this._data.listLabel);
    }
    list.append(...images.map((image, i) => this.plateEl(image, i)));
    return list;
  }

  render() {
    const section = this._data;
    const variant = section.variant;
    this.className = variant ? `gallery gallery--${variant}` : 'gallery';
    const images = (section.images ?? []).filter((image) => image.src);

    // Hai câu hướng dẫn: một cho chuột và bàn phím, một cho màn hình cảm ứng; CSS hiện câu hợp với thiết bị.
    const hint = groupEl('gallery__hint', [
      textEl('span', 'gallery__hint-key', section.hint),
      textEl('span', 'gallery__hint-touch', section.touchHint),
    ]);
    const head = groupEl('gallery__head', [
      groupEl('gallery__heading', [textEl('p', 'gallery__eyebrow', section.eyebrow), textEl('h2', 'gallery__title', section.title)]),
      groupEl('gallery__intro', [textEl('p', 'gallery__lead', section.lead), variant === 'slices' ? hint : null]),
    ]);

    const body = images.length && variant === 'slices' ? this.slicesEl(images) : images.length && variant === 'plates' ? this.platesEl(images) : gridEl(images);
    this.replaceChildren(...[groupEl('gallery__inner container', [head, body])].filter(Boolean));
    if (variant === 'slices' && images.length) this.open(0);
  }
}
