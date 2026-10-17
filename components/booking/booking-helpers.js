/* booking-helpers.js - hàm nhỏ dùng chung cho các kiểu của <wl-booking>: ngày tháng, điền mẫu chữ, kiểm số điện thoại,
   dựng ô nhập và câu báo lỗi, ảnh. */
import { asset } from '../../js/core/core.js';

export const DAY = 86400000;

// Ngày trong JSON và trong ô date đều dạng yyyy-mm-dd; đổi ra số ngày theo UTC để trừ nhau không lệch múi giờ.
export function dayNumber(iso) {
  if (!iso) return NaN;
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY;
}

export function todayIso() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
}

export function isoAfter(iso, days) {
  return new Date((dayNumber(iso) + days) * DAY).toISOString().slice(0, 10);
}

export function viDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Điền {tên} trong câu mẫu lấy từ content.json bằng giá trị tương ứng.
export function fill(template, values) {
  return (template ?? '').replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
}

// Số điện thoại Việt Nam: 10 chữ số bắt đầu bằng 0, hoặc +84 thay cho số 0; cho phép dấu cách và dấu chấm.
export function validPhone(text) {
  return /^(0|\+84)\d{9}$/.test(text.replace(/[\s.]/g, ''));
}

export function errorEl(id) {
  const error = document.createElement('p');
  error.className = 'booking__error';
  error.id = id;
  error.hidden = true;
  return error;
}

// Một ô nhập: nhãn, ô, dòng báo lỗi ngay dưới ô (ẩn khi không có lỗi). aria-describedby nối ô với dòng lỗi.
export function fieldEl(id, label, control, extra) {
  const field = document.createElement('div');
  field.className = 'booking__field';
  const labelEl = document.createElement('label');
  labelEl.htmlFor = id;
  labelEl.textContent = label ?? '';
  control.id = id;
  const error = errorEl(`${id}-error`);
  control.setAttribute('aria-describedby', error.id);
  field.append(labelEl, extra ?? control, error);
  return { field, control, error };
}

export function inputEl(type, attrs = {}) {
  const input = document.createElement('input');
  input.type = type;
  input.className = 'booking__input';
  Object.entries(attrs).forEach(([key, value]) => input.setAttribute(key, value));
  return input;
}

export function showError(ref, message) {
  ref.error.textContent = message ?? '';
  ref.error.hidden = !message;
  if (message) ref.control.setAttribute('aria-invalid', 'true');
  else ref.control.removeAttribute('aria-invalid');
}

export function imageEl(image, className, lazy) {
  const img = document.createElement('img');
  img.className = className;
  img.src = asset(image.src);
  img.alt = image.alt ?? '';
  if (lazy) img.loading = 'lazy';
  return img;
}
