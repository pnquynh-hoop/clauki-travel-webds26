/* preview.js - khung xem trước trang trong editor và trình tạo web: rộng đúng khổ đang chọn (390 hoặc 1440),
   thu nhỏ cho vừa chỗ. Điện thoại (dưới NARROW) thì khung rộng bằng màn hình, không thu nhỏ. */

export const DESKTOP = 1440;
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

// Hai nút chọn khổ 390, 1440; nút đang chọn có aria-pressed.
export function deviceButtons(h, current, onPick) {
  const buttons = [[PHONE, '390'], [DESKTOP, '1440']].map(([width, label]) => h('button', {
    type: 'button', class: 'ed-seg', 'data-device': String(width), 'aria-pressed': String(width === current),
    'aria-label': `Xem khổ ${label}px`, text: label,
    onclick: () => {
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.device) === width)));
      onPick(width);
    },
  }));
  return buttons;
}
