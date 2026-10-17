/* lightbox.js - xem ảnh lớn toàn màn hình, dùng chung cho mọi component.
   Dựng trên <dialog> có sẵn của trình duyệt: Esc tự đóng, focus giữ trong hộp, trang phía sau không bấm được.
   Đổi ảnh bằng nút trước, sau, phím mũi tên, hoặc vuốt ngang trên điện thoại; bấm ra ngoài ảnh thì đóng.
   Chữ trên nút (cho trình đọc màn hình) lấy từ dữ liệu của component gọi tới. */
import { asset } from '../../js/core/core.js';
import { iconEl } from '../../js/core/icon.js';

let dialog = null;
let photo = null;
let caption = null;
let counter = null;
let buttons = {};
let list = [];
let index = 0;

function buttonEl(className, icon, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `lightbox__btn ${className}`;
  const glyph = iconEl(icon, 'lightbox__icon');
  if (glyph) button.append(glyph);
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return button;
}

function show(i) {
  index = (i + list.length) % list.length;
  const image = list[index];
  photo.src = asset(image.src);
  photo.alt = image.alt ?? '';
  caption.textContent = image.caption ?? image.alt ?? '';
  counter.textContent = list.length > 1 ? `${index + 1} / ${list.length}` : '';
  const many = list.length > 1;
  buttons.prev.hidden = !many;
  buttons.next.hidden = !many;
}

function build() {
  dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  photo = document.createElement('img');
  photo.className = 'lightbox__img';
  caption = document.createElement('p');
  caption.className = 'lightbox__caption';
  counter = document.createElement('p');
  counter.className = 'lightbox__counter';
  buttons = {
    close: buttonEl('lightbox__close', 'x', () => dialog.close()),
    prev: buttonEl('lightbox__prev', 'chevron-left', () => show(index - 1)),
    next: buttonEl('lightbox__next', 'chevron-right', () => show(index + 1)),
  };
  const figure = document.createElement('figure');
  figure.className = 'lightbox__figure';
  figure.append(photo, caption, counter);
  // Bấm vào ảnh thì không đóng; bấm vào khoảng trống quanh ảnh (chính <dialog>) thì đóng.
  figure.addEventListener('click', (e) => e.stopPropagation());
  dialog.append(buttons.close, buttons.prev, figure, buttons.next);
  dialog.addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });
  // Vuốt ngang trên điện thoại: lệch quá 40px thì đổi ảnh.
  let startX = null;
  dialog.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  dialog.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
    startX = null;
  });
  document.body.append(dialog);
}

// images: mảng { src, alt, caption } như trong content.json; labels: { close, prev, next } cho trình đọc màn hình.
export function openLightbox(images, start = 0, labels = {}) {
  if (!images?.length) return;
  if (!dialog) build();
  list = images;
  for (const [key, button] of Object.entries(buttons)) button.setAttribute('aria-label', labels[key] ?? '');
  show(start);
  dialog.showModal();
}
