/* plate.js - biển số nhà: số lớn, bên cạnh là các dòng tên hẻm, quận ngăn bằng vạch. Dùng chung cho các khối cần
   một tấm biển làm điểm nhấn (contact, intro); giao diện ở css/components/plate.css, khối nào dùng thì tải kèm.
   Dữ liệu: number (bắt buộc), lines (mảng chữ), label (câu đầy đủ cho trình đọc màn hình). */
import { textEl } from '../dom.js';

export function plateEl(plate, className) {
  if (!plate?.number) return null;
  const box = document.createElement('div');
  box.className = className ? `plate ${className}` : 'plate';
  // Biển đọc thành câu đầy đủ (ví dụ "Số 8, hẻm 42, Quận 1") thay vì đọc rời số và từng dòng.
  if (plate.label) {
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', plate.label);
  }
  const street = document.createElement('span');
  street.className = 'plate__street';
  (plate.lines ?? []).forEach((line, i) => street.append(...(i ? [document.createElement('br')] : []), line));
  box.append(...[textEl('span', 'plate__no', String(plate.number)), street.childNodes.length ? street : null].filter(Boolean));
  return box;
}
