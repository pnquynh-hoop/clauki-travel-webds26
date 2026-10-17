/* menu-order.js - đổi thứ tự các mục menu trên header trong editor (#82): danh sách mục của content.nav, kéo tay nắm
   để thả mục vào chỗ mới, hoặc bấm Lên, Xuống (bàn phím, màn hình cảm ứng). Hiện khi chọn "Đầu trang" ở tab Khối.
   Kéo bằng pointer events (chuột và cảm ứng cùng một đường): trong lúc kéo chỉ dời thẻ trong danh sách, thả ra mới ghi
   một lần vào dữ liệu, nên một lần Hoàn tác là về thứ tự cũ. Đổi thứ tự menu thì footer (cột menu) cũng đổi theo. */
import { iconEl } from '../core/icon.js';

let api = null;

const nameOf = (item) => item.label || item.href || 'Mục không tên';

function reorder(from, to) {
  const nav = api.state.content.nav ?? [];
  if (from === to || from < 0 || to < 0 || from >= nav.length || to >= nav.length) return;
  api.commit(`Dời mục menu ${nameOf(nav[from])}`, () => {
    const list = api.state.content.nav;
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
  });
}

// Bấm Lên, Xuống: con trỏ bàn phím đi theo mục vừa dời (editor đặt lại focus theo data-ed-key sau khi vẽ lại).
function step(index, dir) {
  const to = index + dir;
  api.state.focusKey = `m:${to}:${dir < 0 ? 'up' : 'down'}`;
  reorder(index, to);
}

// Kéo tay nắm: thẻ đi theo con trỏ trong danh sách, đổi chỗ với thẻ bên cạnh khi con trỏ qua nửa thẻ đó.
// Nghe trên window chứ không giữ con trỏ trên tay nắm: dời thẻ trong DOM làm trình duyệt bỏ việc giữ con trỏ đó.
function startDrag(e, li, list) {
  e.preventDefault();
  const from = [...list.children].indexOf(li);
  li.classList.add('is-dragging');
  const move = (ev) => {
    const others = [...list.children].filter((el) => el !== li);
    const before = others.find((el) => {
      const box = el.getBoundingClientRect();
      return ev.clientY < box.top + box.height / 2;
    });
    if (before) list.insertBefore(li, before);
    else list.append(li);
  };
  const stop = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', stop);
    window.removeEventListener('pointercancel', stop);
    li.classList.remove('is-dragging');
    const to = [...list.children].indexOf(li);
    if (to === from) return;
    api.state.focusKey = `m:${to}:drag`;
    reorder(from, to);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', stop);
  window.addEventListener('pointercancel', stop);
}

// api: h, state, commit.
export function menuOrderEl(options) {
  api = options;
  const { h } = api;
  const nav = api.state.content.nav ?? [];
  if (nav.length < 2) return null;
  const list = h('ol', { class: 'ed-menu-order' });
  nav.forEach((item, i) => {
    const handle = h('button', {
      type: 'button', class: 'ed-menu-order__handle', 'data-ed-key': `m:${i}:drag`,
      'aria-label': `Kéo để dời ${nameOf(item)}`, title: 'Kéo để đổi chỗ',
    }, iconEl('grip-vertical', 'ed-menu-order__grip'));
    const li = h('li', { class: 'ed-menu-order__item' },
      handle,
      h('span', { class: 'ed-menu-order__name', text: nameOf(item) }),
      h('span', { class: 'ed-block__acts' },
        h('button', { type: 'button', 'data-ed-key': `m:${i}:up`, disabled: i === 0, onclick: () => step(i, -1), 'aria-label': `Đưa ${nameOf(item)} lên`, text: 'Lên' }),
        h('button', { type: 'button', 'data-ed-key': `m:${i}:down`, disabled: i === nav.length - 1, onclick: () => step(i, 1), 'aria-label': `Đưa ${nameOf(item)} xuống`, text: 'Xuống' })));
    handle.addEventListener('pointerdown', (e) => startDrag(e, li, list));
    list.append(li);
  });
  return h('div', { class: 'ed-menu-order__wrap' },
    h('p', { class: 'ed-h', text: 'Thứ tự menu' }),
    h('p', { class: 'ed-hint', text: 'Kéo tay nắm để đổi chỗ, hoặc bấm Lên, Xuống. Mục trên cùng đứng đầu menu.' }),
    list);
}
