/* preview.js - khung xem trước trang trong editor và trình tạo web: rộng đúng khổ đang chọn (điện thoại 390,
   máy tính bảng 768, laptop 1440), thu nhỏ cho vừa chỗ. Điện thoại (dưới NARROW) thì khung rộng bằng màn hình, không thu nhỏ. */
import { iconEl } from '../core/icon.js';

export const DESKTOP = 1440;
export const TABLET = 768;
export const PHONE = 390;
export const NARROW = 1024;
// Lề quanh khung trên máy tính (px), khớp top: 16px của .ed-frame-wrap trong editor.css.
const GUTTER = 32;

export const isNarrow = () => window.innerWidth < NARROW;

// Đặt rộng, cao, tỉ lệ của khung; trả về tỉ lệ để tính vị trí thanh công cụ nổi.
export function fitFrame(stage, wrap, device) {
  const narrow = isNarrow();
  const gutter = narrow ? 0 : GUTTER;
  const width = narrow ? stage.clientWidth : device;
  const scale = Math.min(1, (stage.clientWidth - gutter) / width);
  wrap.style.width = `${width}px`;
  wrap.style.height = `${(stage.clientHeight - gutter) / scale}px`;
  wrap.style.transform = `scale(${scale})`;
  wrap.dataset.scale = String(scale);
  return scale;
}

// Khổ máy tính bảng 768 nằm giữa hai điểm ngắt 760px và 1024px của trang, nên xem được bố cục riêng của khổ này.
const DEVICES = [[PHONE, 'smartphone', 'Điện thoại'], [TABLET, 'tablet', 'Máy tính bảng'], [DESKTOP, 'laptop', 'Laptop']];

// Ba nút chọn khổ là icon thiết bị; tên thiết bị và bề ngang nằm ở aria-label và title (rê chuột thì thấy).
// Nút đang chọn có aria-pressed.
export function deviceButtons(h, current, onPick) {
  const buttons = DEVICES.map(([width, icon, name]) => h('button', {
    type: 'button', class: 'ed-seg ed-seg--icon', 'data-device': String(width), 'aria-pressed': String(width === current),
    'aria-label': `Xem trên ${name.toLowerCase()} (${width}px)`, title: `${name}, ${width}px`,
    onclick: () => {
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.device) === width)));
      onPick(width);
    },
  }, iconEl(icon, 'ed-icon')));
  return buttons;
}
