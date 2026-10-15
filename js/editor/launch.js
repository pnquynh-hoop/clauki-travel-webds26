/* launch.js - lối vào editor và trình tạo web trên trang khách: nút "Thử chỉnh" ở bên trái, bấm vào thì mở một menu nhỏ.
   Thương hiệu có sẵn: Đổi thương hiệu (mở hộp chọn của BTC), Tạo mới (trình tạo web /tao), Chỉnh sửa (editor).
   Site khách đã xuất bản: chỉ Chỉnh sửa (nháp trên máy này, không đụng bản đã xuất bản) và Tạo bản sao (chép sang trình tạo web
   để đặt tên mới rồi xuất bản). Khi đang có nháp trên máy, dải báo "Đang thử, chưa lưu vào repo" kèm nút mở lại editor và về bản gốc.
   core.js tải tệp này sau khi trang dựng xong; editor thật (editor.js) chỉ tải khi bấm vào nút. */
import { clearDraft, readDraft } from './draft.js';
import { writeTaoDraft, DRAFT_SLUG } from '../sites.js';

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

// Tạo bản sao của site khách đang xem (kèm bản sửa trên máy nếu có) thành nháp của trình tạo web, rồi mở /tao để đặt tên mới.
function copySite(current) {
  const saved = readDraft(current.id, current.raw);
  const content = structuredClone(saved?.content ?? current.raw);
  delete content.id;
  const theme = { ...structuredClone(saved?.theme ?? {}), base: current.base };
  const ok = writeTaoDraft({ brief: '', profile: null, copyOf: current.id, content, theme, at: new Date().toISOString() });
  if (!ok) {
    alert('Trình duyệt chặn bộ nhớ nên chưa chép được. Hãy cho phép lưu dữ liệu trang rồi thử lại.');
    return;
  }
  location.href = '/tao';
}

export function mountLauncher({ current: first, reset }) {
  loadCss();
  const wrap = document.createElement('div');
  wrap.className = 'ed-fab';
  const open = button('Thử chỉnh', 'ed-launch');
  open.setAttribute('aria-haspopup', 'menu');
  open.setAttribute('aria-expanded', 'false');
  open.title = 'Đổi thương hiệu, tạo mới, chỉnh sửa; bản sửa chỉ lưu trên máy này';
  const menu = document.createElement('div');
  menu.className = 'ed-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Thử chỉnh');
  menu.hidden = true;
  wrap.append(menu, open);

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
  open.addEventListener('click', () => setOpen(menu.hidden));
  // Bấm ra ngoài hoặc Esc thì đóng; Esc trả con trỏ về nút.
  document.addEventListener('click', (e) => {
    if (!menu.hidden && !wrap.contains(e.target)) setOpen(false);
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
    menu.replaceChildren(...(published
      ? [link('Chỉnh sửa', editorUrl()), action('Tạo bản sao', () => copySite(detail))]
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
    // Có nháp thì dải báo đã có nút Mở editor, nên ẩn nút Thử chỉnh cho gọn.
    wrap.hidden = has;
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
