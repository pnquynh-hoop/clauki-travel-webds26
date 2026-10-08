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
