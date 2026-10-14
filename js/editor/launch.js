/* launch.js - lối vào editor trên trang khách: nút "Thử chỉnh" và, khi thương hiệu đang có nháp trên máy này,
   dải báo "Đang thử, chưa lưu vào repo" kèm nút mở lại editor và nút về bản gốc.
   core.js tải tệp này sau khi trang dựng xong; editor thật (editor.js) chỉ tải khi bấm vào nút. */
import { clearDraft } from './draft.js';

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

export function mountLauncher({ current: first, reset }) {
  loadCss();
  const open = document.createElement('a');
  open.className = 'ed-launch';
  open.textContent = 'Thử chỉnh';
  open.title = 'Đổi kiểu khối, thứ tự, màu ngay trên trang; chỉ lưu trên máy này';

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
  document.body.append(open, bar);

  let current = null;
  const update = (detail) => {
    current = detail;
    open.href = editorUrl();
    edit.href = editorUrl();
    // core.js báo trang vừa dựng có theo nháp hay không (nháp cũ của content.json trước đó thì không tính).
    const has = Boolean(detail.draft);
    bar.hidden = !has;
    open.hidden = has;
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
