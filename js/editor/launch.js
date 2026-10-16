/* launch.js - lối vào editor và trình tạo web trên trang khách: một nút duy nhất ở góc dưới trái, bấm vào thì mở một menu nhỏ.
   Trang thương hiệu có sẵn đã có nút tròn của BTC ở đó (wd2026.js), nên nút tròn đó chính là nút này: bấm nó mở menu của mình,
   không mở thêm khung riêng của BTC; mục Đổi thương hiệu bấm giúp hộp chọn của BTC. Site khách không có nút của BTC nên có nút
   chữ "Thử chỉnh".
   Thương hiệu có sẵn: Đổi thương hiệu (mở hộp chọn của BTC), Tạo mới (trình tạo web /tao), Chỉnh sửa (editor).
   Site khách đã xuất bản là cố định nên chỉ có Mã QR, chia sẻ và Tạo bản sao (chép cả nội dung lẫn màu, font sang trình tạo web để
   đặt tên mới rồi xuất bản); máy demo (có khoá) có thêm Sửa trang này; bản nháp /nhap/ thì có Tạo mới và Chỉnh sửa. Khi đang có nháp trên máy, dải báo "Đang thử, chưa lưu vào repo" kèm nút mở lại editor và về bản gốc.
   core.js tải tệp này sau khi trang dựng xong; editor thật (editor.js) chỉ tải khi bấm vào nút. */
import { clearDraft } from './draft.js';
import { writeTaoDraft, DRAFT_SLUG, readDemoKey, publicLink } from '../sites.js';

const CSS_ID = 'ed-launch-css';

function loadCss() {
  if (document.getElementById(CSS_ID)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.id = CSS_ID;
  link.href = '/css/editor-launch.css';
  document.head.append(link);
}

// Địa chỉ editor: chính trang đang mở, thêm ?sua.
function editorUrl() {
  return `${location.pathname}?sua`;
}

function button(text, className) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.textContent = text;
  return b;
}

function link(text, href) {
  const a = document.createElement('a');
  a.className = 'ed-menu__item';
  a.setAttribute('role', 'menuitem');
  a.href = href;
  a.textContent = text;
  return a;
}

function action(text, onclick) {
  const b = button(text, 'ed-menu__item');
  b.setAttribute('role', 'menuitem');
  b.addEventListener('click', onclick);
  return b;
}

// Nút tròn đổi thương hiệu của BTC (wd2026.js tự chèn) có sẵn một nút mở hộp chọn: bấm giúp nó.
function openBrandPicker() {
  document.querySelector('.wd2026-trigger')?.click();
}

// Tạo bản sao của site khách đang xem (bản đã xuất bản, kèm màu và font của nó) thành nháp của trình tạo web, rồi mở /tao để đặt tên mới.
// edit (máy demo): nháp ghi editOf thay cho copyOf và mở thẳng editor; xuất bản lại đúng tên cũ thì /tao cập nhật trang đó (updateSite).
function copySite(current, edit = false) {
  const content = structuredClone(current.raw);
  delete content.id;
  const theme = { ...structuredClone(current.theme ?? {}), base: current.base };
  const ok = writeTaoDraft({ brief: '', profile: null, [edit ? 'editOf' : 'copyOf']: current.id, content, theme, at: new Date().toISOString() });
  if (!ok) {
    alert('Trình duyệt chặn bộ nhớ nên chưa chép được. Hãy cho phép lưu dữ liệu trang rồi thử lại.');
    return;
  }
  location.href = edit ? `/${DRAFT_SLUG}/?sua` : '/tao';
}

// Hộp thoại mã QR, link tên miền con, chép, chia sẻ của site khách đang xem; js/share.js chỉ tải khi bấm.
async function openShare(current) {
  const { shareEl } = await import('../share.js');
  const { h } = await import('../dom.js');
  const url = publicLink(current.id);
  const dialog = h('dialog', { class: 'share-dialog', 'aria-labelledby': 'share-dialog-title' },
    h('div', { class: 'share-dialog__head' },
      h('h2', { class: 'share-dialog__title', id: 'share-dialog-title', text: 'Mã QR, chia sẻ' }),
      h('button', { type: 'button', class: 'share__btn', text: 'Đóng', onclick: () => dialog.close() })),
    shareEl(url, { name: current.id, title: current.raw?.brand?.name ?? '' }));
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}

export function mountLauncher({ current: first, reset }) {
  loadCss();
  const wrap = document.createElement('div');
  wrap.className = 'ed-fab';
  const pill = button('Thử chỉnh', 'ed-launch');
  // Nút mở menu: nút tròn của BTC nếu có (gắn sau, xem bindFab), không thì nút chữ.
  let open = pill;
  const label = 'Đổi thương hiệu, tạo mới, chỉnh sửa; bản sửa chỉ lưu trên máy này';
  const describe = (el) => {
    el.setAttribute('aria-haspopup', 'menu');
    el.setAttribute('aria-expanded', 'false');
    el.title = label;
  };
  describe(pill);
  const menu = document.createElement('div');
  menu.className = 'ed-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Thử chỉnh');
  menu.hidden = true;
  wrap.append(menu, pill);

  const bar = document.createElement('div');
  bar.className = 'ed-draftbar';
  bar.setAttribute('role', 'status');
  const text = document.createElement('p');
  text.className = 'ed-draftbar__text';
  text.textContent = 'Đang thử bản chỉnh, chưa lưu vào repo';
  const back = button('Về bản gốc', 'ed-draftbar__btn');
  const edit = document.createElement('a');
  edit.className = 'ed-draftbar__btn ed-draftbar__btn--main';
  edit.textContent = 'Mở editor';
  bar.append(text, edit, back);
  document.body.append(wrap, bar);

  const setOpen = (on) => {
    menu.hidden = !on;
    open.setAttribute('aria-expanded', String(on));
    if (on) menu.querySelector('.ed-menu__item')?.focus();
  };
  pill.addEventListener('click', () => setOpen(menu.hidden));

  // Nút tròn của BTC: nghe ở pha bắt (capture) rồi chặn, để thao tác của BTC (hiện nút "Đổi dữ liệu demo") không chạy thêm.
  // Nút chữ ẩn đi, nút "Đổi dữ liệu demo" cũng ẩn (html.ed-merged), vì menu đã có mục Đổi thương hiệu.
  let merged = false;
  const bindFab = () => {
    const fab = document.querySelector('.wd2026-fab');
    if (!fab || fab.dataset.edBound) return Boolean(fab);
    fab.dataset.edBound = '1';
    open = fab;
    describe(fab);
    fab.setAttribute('aria-label', 'Đổi thương hiệu, tạo mới, chỉnh sửa');
    fab.addEventListener('click', (e) => {
      e.stopImmediatePropagation();
      setOpen(menu.hidden);
    }, true);
    merged = true;
    document.documentElement.classList.add('ed-merged');
    pill.hidden = true;
    return true;
  };
  // wd2026.js chèn nút tròn sau khi trang dựng xong; chờ nó xuất hiện (site khách không có, nên chỉ chờ ở trang thương hiệu có sẵn).
  const waitFab = (guest) => {
    if (guest || bindFab()) return;
    const watch = new MutationObserver(() => {
      if (bindFab()) watch.disconnect();
    });
    watch.observe(document.body, { childList: true });
    setTimeout(() => watch.disconnect(), 8000);
  };
  // Bấm ra ngoài hoặc Esc thì đóng; Esc trả con trỏ về nút.
  document.addEventListener('click', (e) => {
    if (!menu.hidden && !wrap.contains(e.target) && !open.contains(e.target)) setOpen(false);
  });
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) {
      setOpen(false);
      open.focus();
    }
    // Mũi tên đi qua các mục của menu.
    if (menu.hidden || !['ArrowDown', 'ArrowUp'].includes(e.key)) return;
    const items = [...menu.querySelectorAll('.ed-menu__item')];
    const at = items.indexOf(document.activeElement);
    const next = e.key === 'ArrowDown' ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
    e.preventDefault();
    items[next].focus();
  });

  let current = null;
  // Các mục menu theo loại trang: thương hiệu có sẵn, site khách đã xuất bản, hay bản nháp /nhap/ mở riêng.
  const fillMenu = (detail) => {
    const published = detail.guest && detail.id !== DRAFT_SLUG;
    // Máy demo (có khoá, dán ở Tuỳ chọn của /tao) thì sửa được trang đã xuất bản; máy khác chỉ chia sẻ và tạo bản sao.
    menu.replaceChildren(...(published
      ? [
        ...(readDemoKey() ? [action('Sửa trang này', () => copySite(detail, true))] : []),
        action('Mã QR, chia sẻ', () => { setOpen(false); openShare(detail); }),
        action('Tạo bản sao', () => copySite(detail)),
      ]
      : [
        ...(detail.guest ? [] : [action('Đổi thương hiệu', () => { setOpen(false); openBrandPicker(); })]),
        link('Tạo mới', '/tao'),
        link('Chỉnh sửa', editorUrl()),
      ]));
  };

  const update = (detail) => {
    current = detail;
    edit.href = editorUrl();
    fillMenu(detail);
    // core.js báo trang vừa dựng có theo nháp hay không (nháp cũ của content.json trước đó thì không tính).
    const has = Boolean(detail.draft);
    bar.hidden = !has;
    // Có nháp thì dải báo đã có nút Mở editor, nên ẩn nút chữ cho gọn (nút tròn của BTC thì luôn còn).
    pill.hidden = merged || has;
    waitFab(detail.guest);
  };
  back.addEventListener('click', () => {
    if (!current) return;
    clearDraft(current.id);
    reset();
  });
  document.addEventListener('wl:rendered', (e) => update(e.detail));
  // Lần dựng đầu đã xong trước khi tệp này tải: core.js đưa thông tin lần dựng đó vào.
  if (first) update(first);
}
