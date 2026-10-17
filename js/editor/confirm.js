/* confirm.js - hộp hỏi lại dùng chung cho mọi chỗ của editor cần xác nhận trước khi làm (hiện là các nút xoá: khối, mục
   trong danh sách, trang, lịch sử nhờ AI, cấu hình AI). Luôn hai nút Huỷ và Xác nhận; danger tô nút Xác nhận màu đỏ cho việc xoá.
   Dùng <dialog> có sẵn của trình duyệt: showModal() giữ con trỏ bàn phím trong hộp, nền phía sau không bấm được, Esc là huỷ.
   Nút Huỷ nhận con trỏ trước, để lỡ bấm Enter cũng không làm. Trả về Promise: true khi người dùng bấm Xác nhận. */
import { h } from '../core/dom.js';

export function confirmAction(title, { note = '', danger = false } = {}) {
  return new Promise((resolve) => {
    const cancel = h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', autofocus: true, text: 'Huỷ' });
    const ok = h('button', { type: 'button', class: `ed-btn${danger ? ' ed-dialog__danger' : ''}`, text: 'Xác nhận' });
    const dialog = h('dialog', { class: 'ed-dialog', 'aria-labelledby': 'ed-dialog-title' },
      h('div', { class: 'ed-dialog__box' },
        h('p', { class: 'ed-dialog__title', id: 'ed-dialog-title', text: title }),
        note ? h('p', { class: 'ed-dialog__note', text: note }) : null,
        h('div', { class: 'ed-dialog__acts' }, cancel, ok)));
    cancel.addEventListener('click', () => dialog.close('cancel'));
    ok.addEventListener('click', () => dialog.close('ok'));
    // Bấm ra nền mờ ngoài hộp cũng là huỷ: chỗ đó chỉ trúng chính thẻ dialog, phần trong hộp là .ed-dialog__box.
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close('cancel');
    });
    dialog.addEventListener('close', () => {
      dialog.remove();
      resolve(dialog.returnValue === 'ok');
    });
    document.body.append(dialog);
    dialog.showModal();
  });
}
