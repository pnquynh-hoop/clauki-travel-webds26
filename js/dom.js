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

// Dựng thẻ cho giao diện công cụ (editor, trình tạo web): thuộc tính, sự kiện (onclick...), con.
// Chữ chỉ qua textContent (khoá text), không ghép HTML từ dữ liệu.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    if (key === 'class') el.className = value;
    else if (key === 'text') el.textContent = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  el.append(...children.flat().filter((c) => c !== null && c !== undefined && c !== false));
  return el;
}

// "Ăn chay ở Sài Gòn" thành "an-chay-o-sai-gon": đường dẫn trang, tên site; tối đa 30 ký tự.
export function slugify(text) {
  return String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30).replace(/-$/, '');
}
