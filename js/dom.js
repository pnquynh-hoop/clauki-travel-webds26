/* dom.js - vài hàm nhỏ dựng thẻ HTML, dùng chung cho các component.
   Gặp dữ liệu trống thì trả về null, để component lọc bỏ thay vì tạo thẻ rỗng. */

export function textEl(tag, className, text) {
  if (!text) return null;
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  return el;
}

export function linkEl(href, text, className) {
  if (!href || !text) return null;
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  if (className) a.className = className;
  return a;
}

export function groupEl(className, children) {
  const items = children.filter(Boolean);
  if (!items.length) return null;
  const el = document.createElement('div');
  el.className = className;
  el.append(...items);
  return el;
}

// Số điện thoại hiển thị có dấu cách cho dễ đọc; đường dẫn tel: thì phải bỏ dấu cách.
export function telHref(phone) {
  return phone ? `tel:${phone.replace(/\s/g, '')}` : null;
}

// Hai hàm tính toán nhỏ cho các hiệu ứng chạy theo cuộn trang.

// Giữ một số nằm trong khoảng từ min tới max.
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Đi dần từ 0 lên 1 khi x chạy từ from tới to, chậm ở hai đầu, để chuyển động không bị giật.
export function smooth(from, to, x) {
  const t = clamp((x - from) / (to - from), 0, 1);
  return t * t * (3 - 2 * t);
}
