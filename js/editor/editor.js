/* editor.js - editor "Thử chỉnh" (#82): mở bằng /<thương hiệu>/<trang>?sua.
   Trang thật chạy trong khung (iframe cùng nguồn, có data-ed-frame), editor đứng ngoài: thanh trên, bảng chỉnh bên phải
   (điện thoại: thanh dưới mở tấm trượt), thanh công cụ nổi trên khối đang chọn.
   Editor chỉ sửa dữ liệu: bản sao content.json và biến theme. Mọi thay đổi đi qua commit(): chụp trạng thái cũ để hoàn tác,
   ghi nháp trên máy (draft.js), rồi báo trang trong khung dựng lại bằng chính các component <wl-*>.
   Giao diện editor là của ClauKi, chung cho mọi thương hiệu (css/editor.css, tiền tố ed-), không đọc biến của brand. */
import { readDraft, writeDraft, clearDraft, fingerprint } from './draft.js';
import { BLOCKS, HEADER_VARIANTS, variantsFor, COLORS, CONTRAST, FONTS, TEMPLATES } from './manifest.js';
import { buildForm, imageLibrary, setIn, getIn } from './form.js';
import { norm, pageAt, headerTarget as headerOf, checkNewPage, addPage as addPageTo, insertBlock, applyFont } from './ops.js';
import { contrastRatio, AA } from './contrast.js';
import { DESKTOP, isNarrow, fitFrame, deviceButtons } from './preview.js';
import { h, slugify } from '../dom.js';

const HISTORY_MAX = 60;
const TOAST_MS = 2600;
const SCROLL_AFTER_RENDER_MS = 300;
// Độ rộng bảng chỉnh (px) trên máy tính: kéo thanh ở mép trái bảng; nhớ trên máy cho lần mở sau.
const PANEL_MIN = 288;
const PANEL_MAX = 640;
const PANEL_DEFAULT = 384;
const PANEL_KEY = 'clauki-ed-panel';

const state = {
  brands: [],
  id: null,
  page: '/',
  raw: null,
  content: null,
  theme: { vars: {} },
  base: {},
  baseCss: '',
  past: [],
  future: [],
  sel: null,
  mode: 'edit',
  device: DESKTOP,
  // Số thứ tự lần nạp thương hiệu: đổi brand liên tiếp thì kết quả tải theme.css của lần cũ bị bỏ.
  loadToken: 0,
  // Điều khiển cần nhận lại con trỏ bàn phím sau lần vẽ lại kế tiếp (ví dụ nút Xuống của khối vừa dời).
  focusKey: null,
};
const ui = {};

/* ---------- Tiện ích ---------- */

const clone = (value) => JSON.parse(JSON.stringify(value));
const pageUrl = (id, page) => (page === '/' ? `/${id}/` : `/${id}/${page}`);
let toastTimer = 0;

function toast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove('is-on'), TOAST_MS);
}

/* ---------- Tương phản ---------- */

const colorOf = (name) => state.theme.vars[name] ?? state.base[name] ?? '';

function contrastChecks(vars = state.theme.vars) {
  const pick = (name) => vars[name] ?? state.base[name] ?? '';
  return CONTRAST.map(([fg, bg, label]) => {
    const r = contrastRatio(pick(fg), pick(bg));
    // Màu không phải mã hex (ví dụ color-mix) thì không đo được: không chặn.
    return { label, r, ok: r === null || r >= AA };
  });
}

/* ---------- Dữ liệu trang ---------- */

const pageOf = (content, path = state.page) => pageAt(content, path);

const sections = () => pageOf(state.content)?.sections ?? [];

function blockName(section) {
  const label = BLOCKS[section.type]?.label ?? section.type;
  return section.title ? `${label}: ${section.title}` : label;
}

/* ---------- Kho trạng thái: thao tác, hoàn tác, nháp ---------- */

function snapshot() {
  return { content: clone(state.content), theme: clone(state.theme), page: state.page, sel: state.sel };
}

// Hoàn tác trả lại cả khối đang chọn, để thanh công cụ không nhảy sang khối khác sau khi dời hay nhân đôi.
function restore(snap) {
  state.content = snap.content;
  state.theme = snap.theme;
  state.sel = snap.sel;
}

function commit(label, mutate) {
  const before = snapshot();
  mutate();
  state.past.push({ label, before });
  if (state.past.length > HISTORY_MAX) state.past.shift();
  state.future = [];
  persist();
}

function undo() {
  const op = state.past.pop();
  if (!op) return;
  state.future.push({ label: op.label, before: snapshot() });
  restore(op.before);
  persist();
  toast(`Đã hoàn tác: ${op.label}`);
}

function redo() {
  const op = state.future.pop();
  if (!op) return;
  state.past.push({ label: op.label, before: snapshot() });
  restore(op.before);
  persist();
  toast(`Làm lại: ${op.label}`);
}

// Giống hệt bản gốc thì xoá nháp (trang khách không còn dải "đang thử"); khác thì ghi nháp.
function isOriginal() {
  return JSON.stringify(state.content) === JSON.stringify(state.raw) && !Object.keys(state.theme.vars).length;
}

// Nháp gửi thẳng cho trang trong khung (xem trước được cả khi bộ nhớ bị chặn), đồng thời ghi trên máy.
function persist() {
  const original = isOriginal();
  const draft = original ? null : { base: fingerprint(state.raw), content: state.content, theme: state.theme };
  if (original) clearDraft(state.id);
  else if (!writeDraft(state.id, draft)) {
    toast('Trình duyệt chặn bộ nhớ: xem thử được trong editor, nhưng thoát ra là mất.');
  }
  // Hoàn tác hay về bản gốc làm mất trang đang mở (trang vừa thêm): về trang chủ.
  if (!pageOf(state.content)) {
    openPage('/');
  }
  frameDoc()?.dispatchEvent(new CustomEvent('wl:draft', { detail: draft && clone(draft) }));
  refresh();
}

/* ---------- Khung trang ---------- */

// Khung cùng nguồn nên đọc được document; null khi khung chưa tải.
const frameDoc = () => ui.frame.contentDocument;

function openPage(page) {
  state.page = norm(page);
  state.sel = null;
  ui.frame.src = pageUrl(state.id, state.page);
}

// Mỗi lần trang trong khung tải (lần đầu, đổi trang bằng đường dẫn): gắn style chọn khối và các sự kiện.
function onFrameLoad() {
  const doc = frameDoc();
  if (!doc) return;
  const style = doc.createElement('style');
  style.textContent = `[data-ed-hover] { outline: 2px dashed #22d3ee; outline-offset: -2px; }
    [data-ed-sel] { outline: 3px solid #22d3ee; outline-offset: -3px; }`;
  doc.head.append(style);
  doc.addEventListener('click', onFrameClick, true);
  doc.addEventListener('mouseover', onFrameHover);
  doc.addEventListener('keydown', onKey);
  ui.frame.contentWindow.addEventListener('scroll', placeTool, { passive: true });
  ui.frame.contentWindow.addEventListener('resize', placeTool);
}

// Trang trong khung vừa dựng xong: đổi thương hiệu (nút của BTC trong khung) hoặc đổi trang thì editor theo.
async function onRendered(detail) {
  if (detail.id !== state.id || !state.raw) await loadBrand(detail.id, detail.raw);
  if (detail.id !== state.id) return;
  if (norm(detail.page) !== state.page) state.sel = null;
  state.page = norm(detail.page);
  // Địa chỉ của editor theo trang trong khung: F5 thì mở lại đúng thương hiệu, đúng trang.
  try {
    history.replaceState(null, '', `${ui.frame.contentWindow.location.pathname}?sua`);
  } catch {
    // Khung chưa sẵn sàng thì giữ địa chỉ cũ.
  }
  refresh();
}

async function loadBrand(id, raw) {
  const token = ++state.loadToken;
  state.id = id;
  state.raw = clone(raw);
  const draft = readDraft(id, raw);
  state.content = clone(draft?.content ?? raw);
  state.theme = clone(draft?.theme ?? { vars: {} });
  state.theme.vars ??= {};
  state.past = [];
  state.future = [];
  state.sel = null;
  state.base = {};
  let css = '';
  const base = {};
  try {
    css = await (await fetch(`/brands/${id}/theme.css`)).text();
    const root = /:root\s*\{([\s\S]*?)\}/.exec(css)?.[1] ?? '';
    for (const m of root.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) base[m[1]] = m[2].trim();
  } catch {
    css = '';
  }
  if (token !== state.loadToken) return;
  state.baseCss = css;
  state.base = base;
  const brand = state.brands.find((b) => b.id === id);
  document.title = `Thử chỉnh - ${brand?.label ?? id}`;
}

function selectedEl() {
  const doc = frameDoc();
  if (!doc || state.sel === null) return null;
  if (state.sel === 'header') return doc.querySelector('wl-header');
  return doc.querySelector(`main > [data-section="${state.sel}"]`);
}

function blockOf(target) {
  const header = target.closest?.('wl-header');
  if (header) return { key: 'header', el: header };
  const el = target.closest?.('main > [data-section]');
  return el ? { key: Number(el.dataset.section), el } : null;
}

function onFrameClick(e) {
  if (state.mode !== 'edit') return;
  const hit = blockOf(e.target);
  if (!hit) return;
  // Đang chỉnh: bấm là chọn khối, không mở liên kết hay nút của trang.
  e.preventDefault();
  e.stopPropagation();
  select(hit.key);
}

function onFrameHover(e) {
  const doc = frameDoc();
  doc.querySelectorAll('[data-ed-hover]').forEach((el) => el.removeAttribute('data-ed-hover'));
  if (state.mode !== 'edit') return;
  const hit = blockOf(e.target);
  if (hit && hit.key !== state.sel) hit.el.setAttribute('data-ed-hover', '');
}

function select(key, scroll = false) {
  state.sel = key;
  refresh();
  if (scroll) selectedEl()?.scrollIntoView({ block: 'start' });
}

/* ---------- Thao tác trên khối ---------- */

const headerTarget = () => headerOf(state.content, state.page);

function setVariant(key, value) {
  if (key === 'header') {
    const label = HEADER_VARIANTS.find(([v]) => v === value)?.[1] ?? value;
    commit(`Đổi đầu trang sang ${label}`, () => {
      headerTarget().variant = value;
    });
    return;
  }
  const section = sections()[key];
  const label = BLOCKS[section.type]?.variants.find(([v]) => v === value)?.[1] ?? 'mặc định';
  commit(`Đổi kiểu ${blockName(section)} sang ${label}`, () => {
    const target = sections()[key];
    if (value) target.variant = value;
    else delete target.variant;
  });
}

function move(key, dir) {
  const list = sections();
  const to = key + dir;
  if (to < 0 || to >= list.length) return;
  // Khối đang chọn và con trỏ bàn phím đi theo khối vừa dời; đặt trước commit để lần vẽ lại trong commit dùng luôn.
  state.focusKey = `a:${to}:${dir < 0 ? 'up' : 'down'}`;
  commit(`Dời ${blockName(list[key])} ${dir < 0 ? 'lên' : 'xuống'}`, () => {
    const s = sections();
    [s[key], s[to]] = [s[to], s[key]];
    state.sel = to;
  });
  setTimeout(() => selectedEl()?.scrollIntoView({ block: 'start' }), SCROLL_AFTER_RENDER_MS);
}

function toggleHidden(key) {
  const section = sections()[key];
  const hide = !section.hidden;
  commit(`${hide ? 'Ẩn' : 'Hiện'} ${blockName(section)}`, () => {
    if (hide) sections()[key].hidden = true;
    else delete sections()[key].hidden;
  });
}

function duplicate(key) {
  const section = sections()[key];
  commit(`Nhân đôi ${blockName(section)}`, () => {
    const copy = clone(section);
    const taken = new Set(sections().map((s) => s.id));
    let n = 2;
    while (taken.has(`${section.id}-${n}`)) n += 1;
    if (section.id) copy.id = `${section.id}-${n}`;
    sections().splice(key + 1, 0, copy);
  });
}

function remove(key) {
  const section = sections()[key];
  commit(`Xoá ${blockName(section)}`, () => {
    sections().splice(key, 1);
    state.sel = null;
  });
}

/* ---------- Nội dung khối, thêm khối ---------- */

function setField(key, path, value, label) {
  commit(label, () => {
    const section = sections()[key];
    if (section) setIn(section, path, value);
  });
}

function listOp(key, path, action, i, item) {
  const labels = { add: 'Thêm mục', remove: 'Xoá mục', up: 'Dời mục lên', down: 'Dời mục xuống' };
  commit(`${labels[action]} trong ${blockName(sections()[key])}`, () => {
    const section = sections()[key];
    let list = getIn(section, path);
    if (!Array.isArray(list)) {
      list = [];
      setIn(section, path, list);
    }
    if (action === 'add') list.push(clone(item ?? {}));
    if (action === 'remove') list.splice(i, 1);
    const to = action === 'up' ? i - 1 : i + 1;
    if ((action === 'up' || action === 'down') && to >= 0 && to < list.length) [list[i], list[to]] = [list[to], list[i]];
  });
}

// Khối mới chèn ngay sau khối đang chọn (chưa chọn thì cuối trang), id không trùng khối nào trên trang.
function addBlock(type) {
  const template = TEMPLATES.find((t) => t.type === type);
  if (!template) return;
  const at = typeof state.sel === 'number' ? state.sel + 1 : sections().length;
  commit(`Thêm khối ${template.label}`, () => {
    insertBlock(sections(), type, at, imageLibrary(state.content).filter((img) => img.alt));
    state.sel = at;
  });
  setTimeout(() => selectedEl()?.scrollIntoView({ block: 'start' }), SCROLL_AFTER_RENDER_MS);
}

function contentEl() {
  const key = state.sel;
  const section = typeof key === 'number' ? sections()[key] : null;
  if (!section) return null;
  const form = buildForm(section, {
    h,
    key: `f:${key}`,
    images: imageLibrary(state.content),
    assetUrl: (src) => `/brands/${state.id}/${src}`,
    set: (path, value, label) => setField(key, path, value, label),
    list: (path, action, i, item) => listOp(key, path, action, i, item),
  });
  return h('section', { class: 'ed-content', 'aria-label': `Nội dung của ${blockName(section)}` },
    h('div', { class: 'ed-content__head' },
      h('h3', { class: 'ed-h', text: `Nội dung: ${BLOCKS[section.type]?.label ?? section.type}` }),
      h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', 'data-ed-key': 'unselect', onclick: () => select(null), text: 'Bỏ chọn' })),
    form);
}

function addBlockEl() {
  const pick = h('select', { class: 'ed-select', 'aria-label': 'Loại khối muốn thêm', 'data-ed-key': 'add:type' },
    TEMPLATES.map((t) => h('option', { value: t.type, text: t.label })));
  const where = typeof state.sel === 'number' ? `sau khối ${state.sel + 1}` : 'cuối trang';
  return h('div', { class: 'ed-add' },
    h('h3', { class: 'ed-h', text: 'Thêm khối' }),
    h('div', { class: 'ed-add__row' }, pick,
      h('button', { type: 'button', class: 'ed-btn', 'data-ed-key': 'add:go', onclick: () => addBlock(pick.value), text: `Thêm ${where}` })));
}

// Mở form nội dung của khối đang chọn: máy tính chuyển sang tab Khối; điện thoại mở tấm trượt của tab đó.
function openContent() {
  openTab('blocks');
  if (isNarrow() && !ui.panel.classList.contains('is-open')) dock('blocks');
  ui.panes.blocks.scrollTop = 0;
  ui.panes.blocks.querySelector('.ed-form input, .ed-form textarea, .ed-form select')?.focus({ preventScroll: true });
}

/* ---------- Thanh công cụ nổi trên khối ---------- */

function placeTool() {
  const el = selectedEl();
  if (!el || state.mode !== 'edit') {
    ui.tool.hidden = true;
    return;
  }
  const scale = Number(ui.wrap.dataset.scale || 1);
  const frameBox = ui.frame.getBoundingClientRect();
  const stageBox = ui.stage.getBoundingClientRect();
  const box = el.getBoundingClientRect();
  const top = frameBox.top - stageBox.top + Math.max(0, box.top) * scale;
  ui.tool.hidden = false;
  ui.tool.style.top = `${Math.min(top + 8, stageBox.height - ui.tool.offsetHeight - 8)}px`;
  ui.tool.style.left = `${Math.max(8, frameBox.left - stageBox.left + 8)}px`;
}

function variantSelect(key, current, options, labelText, where = 'list') {
  const select = h('select', { class: 'ed-select', 'aria-label': labelText, 'data-ed-key': `${where}:v:${key}` },
    options.map(([value, label]) => h('option', { value, text: label, selected: value === current })));
  select.addEventListener('change', () => setVariant(key, select.value));
  return select;
}

function renderTool() {
  const key = state.sel;
  if (key === null) {
    ui.tool.replaceChildren();
    return;
  }
  if (key === 'header') {
    const current = headerTarget().variant ?? 'solid';
    ui.tool.replaceChildren(
      h('span', { class: 'ed-tool__name', text: 'Đầu trang' }),
      variantSelect('header', current, HEADER_VARIANTS, 'Kiểu đầu trang', 'tool'),
    );
    return;
  }
  const list = sections();
  const section = list[key];
  if (!section) {
    ui.tool.replaceChildren();
    return;
  }
  const options = variantsFor(section);
  ui.tool.replaceChildren(
    h('span', { class: 'ed-tool__name', text: BLOCKS[section.type]?.label ?? section.type }),
    options.length > 1 ? variantSelect(key, section.variant ?? '', options, `Kiểu của ${blockName(section)}`, 'tool') : null,
    h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', 'data-ed-key': 'tool:up', disabled: key === 0, onclick: () => move(key, -1), text: 'Lên' }),
    h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', 'data-ed-key': 'tool:down', disabled: key === list.length - 1, onclick: () => move(key, 1), text: 'Xuống' }),
    h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', 'data-ed-key': 'tool:hide', onclick: () => toggleHidden(key), text: section.hidden ? 'Hiện' : 'Ẩn' }),
    h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', 'data-ed-key': 'tool:dup', onclick: () => duplicate(key), text: 'Nhân đôi' }),
    h('button', { type: 'button', class: 'ed-btn ed-btn--danger', onclick: () => remove(key), text: 'Xoá' }),
    h('button', { type: 'button', class: 'ed-btn', 'data-ed-key': 'tool:edit', onclick: openContent, text: 'Sửa nội dung' }),
  );
}

/* ---------- Tab Khối ---------- */

function renderBlocks() {
  const list = sections();
  const headerVariant = headerTarget().variant ?? 'solid';
  const rows = [
    h('li', { class: `ed-block${state.sel === 'header' ? ' is-sel' : ''}` },
      h('button', { type: 'button', class: 'ed-block__name', 'data-ed-key': 'n:header', onclick: () => select('header', true), text: 'Đầu trang (cố định)' }),
      variantSelect('header', headerVariant, HEADER_VARIANTS, 'Kiểu đầu trang')),
    ...list.map((section, i) => {
      const options = variantsFor(section);
      return h('li', { class: `ed-block${state.sel === i ? ' is-sel' : ''}${section.hidden ? ' is-hidden' : ''}` },
        h('button', { type: 'button', class: 'ed-block__name', 'data-ed-key': `n:${i}`, onclick: () => (section.hidden ? null : select(i, true)) },
          `${i + 1}. ${blockName(section)}`, section.hidden ? h('small', { text: ' đang ẩn' }) : null),
        options.length > 1
          ? variantSelect(i, section.variant ?? '', options, `Kiểu của ${blockName(section)}`)
          : h('span', { class: 'ed-block__one', text: 'Một kiểu' }),
        h('span', { class: 'ed-block__acts' },
          h('button', { type: 'button', 'data-ed-key': `a:${i}:up`, disabled: i === 0, onclick: () => move(i, -1), 'aria-label': `Đưa ${blockName(section)} lên`, text: 'Lên' }),
          h('button', { type: 'button', 'data-ed-key': `a:${i}:down`, disabled: i === list.length - 1, onclick: () => move(i, 1), 'aria-label': `Đưa ${blockName(section)} xuống`, text: 'Xuống' }),
          h('button', { type: 'button', 'data-ed-key': `a:${i}:hide`, onclick: () => toggleHidden(i), text: section.hidden ? 'Hiện' : 'Ẩn' }),
          h('button', { type: 'button', 'data-ed-key': `a:${i}:dup`, onclick: () => duplicate(i), text: 'Nhân đôi' }),
          h('button', { type: 'button', class: 'is-danger', onclick: () => remove(i), text: 'Xoá' })));
    }),
  ];
  ui.panes.blocks.replaceChildren(...[
    contentEl(),
    h('p', { class: 'ed-hint', text: `Bấm một khối trên trang hoặc trong danh sách để chọn và sửa nội dung. Trang này có ${list.length} khối.` }),
    h('ol', { class: 'ed-blocks' }, rows),
    pageOf(state.content) ? addBlockEl() : null,
  ].filter(Boolean));
}

/* ---------- Tab Giao diện ---------- */

function setThemeVar(name, value, label) {
  commit(label, () => {
    if (value === undefined || value === state.base[name]) delete state.theme.vars[name];
    else state.theme.vars[name] = value;
  });
}

function setFont(key) {
  const pair = FONTS.find((f) => f.key === key);
  commit(`Đổi font sang ${pair?.label ?? 'font gốc'}`, () => applyFont(state.theme, key));
}

// Bo góc trong theme.css ghi bằng rem; thanh trượt dùng px cho dễ hình dung.
function radiusPx() {
  const value = state.theme.vars['--radius'] ?? state.base['--radius'] ?? '0.5rem';
  const n = parseFloat(value);
  return value.endsWith('rem') ? Math.round(n * 16) : Math.round(n);
}

function setText(path, value, label) {
  commit(label, () => setIn(state.content, path, value));
}

function textField(label, path, value) {
  const input = h('input', { class: 'ed-input', value: value ?? '', 'data-ed-key': `t:${path}` });
  // Ghi sau khi con trỏ đã sang ô mới, để vẽ lại xong con trỏ về đúng ô vừa bấm.
  input.addEventListener('change', () => {
    const next = input.value.trim();
    setTimeout(() => setText(path, next, `Đổi ${label.toLowerCase()}`));
  });
  return h('label', { class: 'ed-field' }, h('span', { text: label }), input);
}

function renderTheme() {
  const checks = contrastChecks();
  const colors = COLORS.map(([name, label]) => {
    const value = colorOf(name);
    const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000';
    const input = h('input', { type: 'color', value: hex, 'aria-label': label, 'data-ed-key': `c:${name}` });
    input.addEventListener('change', () => setThemeVar(name, input.value, `Đổi ${label.toLowerCase()}`));
    return h('label', { class: `ed-color${state.theme.vars[name] ? ' is-changed' : ''}` }, input,
      h('span', {}, label, h('small', { text: value })));
  });
  const font = h('select', { class: 'ed-select', 'aria-label': 'Cặp font', 'data-ed-key': 'font' },
    FONTS.map((f) => h('option', { value: f.key, text: f.label, selected: (state.theme.font ?? '') === f.key })));
  font.addEventListener('change', () => setFont(font.value));
  const radius = h('input', { type: 'range', class: 'ed-range', min: '0', max: '32', step: '2', value: String(radiusPx()), 'aria-label': 'Bo góc', 'data-ed-key': 'radius' });
  radius.addEventListener('change', () => setThemeVar('--radius', `${Number(radius.value) / 16}rem`, 'Đổi bo góc'));
  const c = state.content;
  ui.panes.theme.replaceChildren(
    h('h3', { class: 'ed-h', text: 'Màu' }),
    h('div', { class: 'ed-colors' }, colors),
    h('ul', { class: 'ed-checks', 'aria-live': 'polite' }, checks.map((x) => h('li', { class: x.ok ? 'ok' : 'bad' },
      h('span', { text: x.label }),
      h('b', { text: x.r === null ? 'không đo được' : `${x.r.toFixed(2)} ${x.ok ? 'đạt AA' : 'chưa đạt, cần từ 4,5'}` })))),
    h('h3', { class: 'ed-h', text: 'Font' }),
    font,
    h('h3', { class: 'ed-h' }, 'Bo góc: ', h('span', { text: `${radiusPx()}px` })),
    radius,
    h('h3', { class: 'ed-h', text: 'Thông tin chung' }),
    textField('Tên thương hiệu', 'brand.name', c.brand?.name),
    textField('Khẩu hiệu', 'brand.slogan', c.brand?.slogan),
    textField('Chữ trên nút chính', 'cta.label', c.cta?.label),
    textField('Dòng giá dưới nút', 'cta.note', c.cta?.note),
    textField('Số điện thoại', 'contact.phone', c.contact?.phone),
    textField('Địa chỉ', 'contact.address', c.contact?.address),
  );
}

/* ---------- Tab Trang ---------- */

function addPage(form) {
  const name = form.elements.name.value.trim();
  const { slug, error } = checkNewPage(state.content, name);
  if (error) {
    form.querySelector('.ed-err').textContent = error;
    return;
  }
  const onMenu = form.elements.menu.checked;
  commit(`Thêm trang ${name}`, () => addPageTo(state.content, slug, name, onMenu));
  toast(`Đã thêm trang /${slug}${onMenu ? ', có trên menu' : ''}.`);
  openPage(slug);
}

function removePage(path) {
  const page = state.content.pages.find((p) => norm(p.path) === path);
  commit(`Xoá trang ${page.title ?? path}`, () => {
    state.content.pages = state.content.pages.filter((p) => norm(p.path) !== path);
    state.content.nav = (state.content.nav ?? []).filter((item) => item.href !== `page:${path}`);
  });
  if (state.page === path) openPage('/');
}

function renderPages() {
  const pages = state.content.pages ?? [{ path: '/', title: 'Trang chủ' }];
  const form = h('form', { class: 'ed-newpage' },
    h('label', { class: 'ed-field' }, h('span', { text: 'Tên trang' }), h('input', { class: 'ed-input', name: 'name', required: true, placeholder: 'Ví dụ: Ăn chay ở Sài Gòn' })),
    h('p', { class: 'ed-slug', text: 'Đường dẫn: /...' }),
    h('label', { class: 'ed-check' }, h('input', { type: 'checkbox', name: 'menu', checked: true }), ' Hiện trên menu'),
    h('p', { class: 'ed-err', 'aria-live': 'polite' }),
    h('button', { class: 'ed-btn', type: 'submit', text: 'Thêm trang' }));
  form.addEventListener('input', () => {
    form.querySelector('.ed-slug').textContent = `Đường dẫn: /${slugify(form.elements.name.value) || '...'}`;
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    addPage(form);
  });
  ui.panes.pages.replaceChildren(
    h('ol', { class: 'ed-pages' }, pages.map((p) => {
      const path = norm(p.path);
      return h('li', { class: path === state.page ? 'is-on' : '' },
        h('span', {}, p.title ?? (path === '/' ? 'Trang chủ' : path), h('small', { text: ` /${path === '/' ? '' : path}` })),
        h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', 'data-ed-key': `p:${path}`, onclick: () => openPage(path), text: 'Mở' }),
        p.added ? h('button', { type: 'button', class: 'ed-btn ed-btn--danger', onclick: () => removePage(path), text: 'Xoá' }) : null);
    })),
    h('h3', { class: 'ed-h', text: 'Thêm trang' }),
    form,
  );
}

/* ---------- Tab AI ---------- */

// Sửa bằng lời làm ở #81 (ai.js); tạm hiện một dòng báo.
function renderAi() {
  ui.panes.ai.replaceChildren(h('p', { class: 'ed-hint', text: 'Sửa website bằng lời: đang làm ở issue #81.' }));
}

/* ---------- Tải tệp ---------- */

function download(name, text, type) {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// theme.css mới: giữ nguyên tệp gốc, thay giá trị biến đã đổi, biến mới thêm cuối :root, font mới thêm @import.
// Chỉ thay trong khối :root, và tên biến phải đứng đầu khai báo (không khớp nhầm --color-ink trong --color-ink-2 hay comment).
function themeCss() {
  const m = /:root\s*\{([\s\S]*?)\n\}/.exec(state.baseCss);
  if (!m) return state.baseCss;
  let body = m[1];
  const extra = [];
  for (const [name, value] of Object.entries(state.theme.vars)) {
    const re = new RegExp(`(^|[\\s;{])(${name.replace(/-/g, '\\-')}\\s*:\\s*)[^;]+;`, 'm');
    if (re.test(body)) body = body.replace(re, `$1$2${value};`);
    else extra.push(`  ${name}: ${value};`);
  }
  if (extra.length) body = `${body}\n${extra.join('\n')}`;
  let css = state.baseCss.slice(0, m.index) + state.baseCss.slice(m.index).replace(m[1], () => body);
  if (state.theme.fontUrl) css = `@import url('${state.theme.fontUrl}');\n${css}`;
  return css;
}

function downloadContent() {
  const out = clone(state.content);
  out.pages?.forEach((p) => delete p.added);
  download('content.json', `${JSON.stringify(out, null, 2)}\n`, 'application/json');
}

function downloadTheme() {
  if (!contrastChecks().every((c) => c.ok)) {
    toast('Màu chưa đạt tương phản AA, chưa tải theme.css được.');
    return;
  }
  download('theme.css', themeCss(), 'text/css');
}

function resetAll() {
  if (isOriginal()) {
    toast('Đang là bản gốc.');
    return;
  }
  commit('Về bản gốc', () => {
    state.content = clone(state.raw);
    state.theme = { vars: {} };
  });
  toast('Đã về bản gốc. Bấm Hoàn tác nếu muốn lấy lại.');
}

/* ---------- Vẽ lại phần editor ---------- */

function refresh() {
  if (!state.content) return;
  // Vẽ lại bảng chỉnh thay mọi điều khiển: nhớ điều khiển đang có con trỏ để trả lại sau khi vẽ (người dùng bàn phím).
  const focusKey = state.focusKey ?? document.activeElement?.dataset?.edKey;
  state.focusKey = null;
  ui.undo.disabled = !state.past.length;
  ui.redo.disabled = !state.future.length;
  ui.undo.title = state.past.length ? `Hoàn tác: ${state.past.at(-1).label}` : '';
  ui.brand.textContent = state.brands.find((b) => b.id === state.id)?.label ?? state.id;
  ui.status.textContent = isOriginal() ? 'Bản gốc' : 'Đang thử, chưa lưu vào repo';
  ui.status.classList.toggle('is-draft', !isOriginal());
  const pages = state.content.pages ?? [{ path: '/', title: 'Trang chủ' }];
  ui.pageSelect.replaceChildren(...pages.map((p) => {
    const path = norm(p.path);
    return h('option', { value: path, text: p.title ?? (path === '/' ? 'Trang chủ' : path), selected: path === state.page });
  }));
  ui.exit.href = pageUrl(state.id, state.page);
  const bad = !contrastChecks().every((c) => c.ok);
  ui.themeBtn.disabled = bad;
  ui.themeBtn.title = bad ? 'Màu chưa đạt tương phản AA' : '';
  renderBlocks();
  renderTheme();
  renderPages();
  renderTool();
  markSelection();
  if (focusKey) document.querySelector(`[data-ed-key="${CSS.escape(focusKey)}"]`)?.focus({ preventScroll: true });
}

// Sau khi trang trong khung dựng lại, khối được tạo mới: gắn lại viền chọn và đặt lại thanh công cụ.
function markSelection() {
  const doc = frameDoc();
  if (!doc) return;
  requestAnimationFrame(() => {
    doc.querySelectorAll('[data-ed-sel]').forEach((el) => el.removeAttribute('data-ed-sel'));
    if (state.mode === 'edit') selectedEl()?.setAttribute('data-ed-sel', '');
    placeTool();
  });
}

/* ---------- Khổ màn hình, chế độ, phím tắt ---------- */

// Điện thoại: tấm trượt đang đóng nằm ngoài màn hình, nên không cho Tab đi vào.
function syncPanelInert() {
  ui.panel.inert = isNarrow() && !ui.panel.classList.contains('is-open');
}

function fit() {
  syncPanelInert();
  fitFrame(ui.stage, ui.wrap, state.device);
  placeTool();
}

function setMode(mode) {
  state.mode = mode;
  ui.modes.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  frameDoc()?.querySelectorAll('[data-ed-hover]').forEach((el) => el.removeAttribute('data-ed-hover'));
  markSelection();
  toast(mode === 'view' ? 'Xem thử: bấm, cuộn như khách. Bấm "Chỉnh" để quay lại.' : 'Chỉnh: bấm một khối để chọn.');
}

function onKey(e) {
  if (e.target.closest?.('input, textarea, select')) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
  }
}

function openTab(name) {
  ui.tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
  Object.entries(ui.panes).forEach(([key, pane]) => {
    pane.hidden = key !== name;
  });
}

// Điện thoại: bấm nút ở thanh dưới mở tấm trượt của tab đó; bấm lại nút đang mở thì đóng.
function dock(name) {
  const open = ui.panel.classList.contains('is-open') && ui.tabs.find((t) => t.dataset.tab === name)?.getAttribute('aria-selected') === 'true';
  openTab(name);
  ui.panel.classList.toggle('is-open', !open);
  syncPanelInert();
  ui.docks.forEach((b) => b.setAttribute('aria-pressed', String(!open && b.dataset.dock === name)));
}

/* ---------- Độ rộng bảng chỉnh ---------- */

function readPanelWidth() {
  try {
    const n = Number(localStorage.getItem(PANEL_KEY));
    return Number.isFinite(n) && n > 0 ? n : PANEL_DEFAULT;
  } catch {
    return PANEL_DEFAULT;
  }
}

function setPanelWidth(px, save = true) {
  const width = Math.round(Math.min(PANEL_MAX, Math.max(PANEL_MIN, px)));
  ui.main.style.setProperty('--ed-panel-w', `${width}px`);
  ui.resizer.setAttribute('aria-valuenow', String(width));
  ui.resizer.setAttribute('aria-valuetext', `${width} điểm ảnh`);
  if (save) {
    try {
      localStorage.setItem(PANEL_KEY, String(width));
    } catch {
      // Không lưu được thì lần sau dùng độ rộng mặc định.
    }
  }
  fit();
}

// Thanh kéo: chuột, cảm ứng kéo ngang; bàn phím mũi tên trái phải (Shift để bước lớn); nhấp đúp về mặc định.
// Khung trang nằm trong iframe nuốt sự kiện chuột khi con trỏ đi qua, nên tắt pointer-events của khung lúc đang kéo.
function resizerEl() {
  const bar = h('div', {
    class: 'ed-resizer', role: 'separator', tabindex: '0', 'aria-orientation': 'vertical',
    'aria-label': 'Độ rộng bảng chỉnh', 'aria-valuemin': String(PANEL_MIN), 'aria-valuemax': String(PANEL_MAX),
  });
  bar.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    bar.setPointerCapture(e.pointerId);
    bar.classList.add('is-dragging');
    ui.frame.style.pointerEvents = 'none';
    const move = (ev) => setPanelWidth(window.innerWidth - ev.clientX, false);
    const stop = () => {
      bar.classList.remove('is-dragging');
      ui.frame.style.pointerEvents = '';
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', stop);
      bar.removeEventListener('pointercancel', stop);
      setPanelWidth(ui.panel.getBoundingClientRect().width);
    };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', stop);
    bar.addEventListener('pointercancel', stop);
  });
  bar.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 64 : 16;
    const now = ui.panel.getBoundingClientRect().width;
    if (e.key === 'ArrowLeft') setPanelWidth(now + step);
    else if (e.key === 'ArrowRight') setPanelWidth(now - step);
    else if (e.key === 'Home') setPanelWidth(PANEL_MAX);
    else if (e.key === 'End') setPanelWidth(PANEL_MIN);
    else return;
    e.preventDefault();
  });
  bar.addEventListener('dblclick', () => setPanelWidth(PANEL_DEFAULT));
  return bar;
}

/* ---------- Dựng khung editor ---------- */

const TABS = [['blocks', 'Khối'], ['theme', 'Giao diện'], ['pages', 'Trang'], ['ai', 'AI']];

function build() {
  const css = h('link', { rel: 'stylesheet', href: '/css/editor.css' });
  const font = h('link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700&display=swap' });
  document.head.append(css, font);

  ui.brand = h('strong', { class: 'ed-top__brand' });
  ui.status = h('span', { class: 'ed-top__status' });
  ui.pageSelect = h('select', { class: 'ed-select', 'aria-label': 'Trang đang chỉnh' });
  ui.pageSelect.addEventListener('change', () => openPage(ui.pageSelect.value));
  ui.undo = h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', onclick: undo, text: 'Hoàn tác' });
  ui.redo = h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', onclick: redo, text: 'Làm lại' });
  ui.modes = [['edit', 'Chỉnh'], ['view', 'Xem thử']].map(([mode, label]) =>
    h('button', { type: 'button', class: 'ed-seg', 'data-mode': mode, 'aria-pressed': String(mode === 'edit'), onclick: () => setMode(mode), text: label }));
  ui.devices = deviceButtons(h, DESKTOP, (width) => {
    state.device = width;
    fit();
  });
  ui.themeBtn = h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', onclick: downloadTheme, text: 'Tải theme.css' });
  ui.exit = h('a', { class: 'ed-btn', text: 'Thoát' });

  const top = h('header', { class: 'ed-top' },
    h('div', { class: 'ed-top__who' }, ui.brand, ui.status),
    h('div', { class: 'ed-top__group' }, ui.pageSelect, ui.undo, ui.redo),
    h('div', { class: 'ed-top__group ed-top__wide', role: 'group', 'aria-label': 'Chế độ' }, ui.modes),
    h('div', { class: 'ed-top__group ed-top__wide', role: 'group', 'aria-label': 'Khổ màn hình' }, ui.devices),
    h('div', { class: 'ed-top__group ed-top__end' },
      h('button', { type: 'button', class: 'ed-btn ed-btn--ghost ed-top__wide', onclick: resetAll, text: 'Về bản gốc' }),
      h('button', { type: 'button', class: 'ed-btn ed-btn--ghost ed-top__wide', onclick: downloadContent, text: 'Tải content.json' }),
      h('span', { class: 'ed-top__wide' }, ui.themeBtn),
      ui.exit));

  ui.frame = h('iframe', { class: 'ed-frame', title: 'Trang đang chỉnh', 'data-ed-frame': true });
  ui.frame.addEventListener('load', onFrameLoad);
  ui.frame.addEventListener('wl:rendered', (e) => onRendered(e.detail));
  ui.wrap = h('div', { class: 'ed-frame-wrap' }, ui.frame);
  ui.tool = h('div', { class: 'ed-tool', role: 'toolbar', 'aria-label': 'Công cụ của khối đang chọn', hidden: true });
  ui.stage = h('div', { class: 'ed-stage' }, ui.wrap, ui.tool);

  ui.panes = Object.fromEntries(TABS.map(([key, label]) => [key, h('div', { class: 'ed-pane', role: 'tabpanel', 'aria-label': label, hidden: key !== 'blocks' })]));
  ui.tabs = TABS.map(([key, label]) => h('button', { type: 'button', role: 'tab', class: 'ed-tab', 'data-tab': key, 'aria-selected': String(key === 'blocks'), onclick: () => openTab(key), text: label }));
  ui.resizer = resizerEl();
  ui.panel = h('aside', { class: 'ed-panel', 'aria-label': 'Bảng chỉnh' },
    ui.resizer,
    h('div', { class: 'ed-tabs', role: 'tablist' }, ui.tabs),
    Object.values(ui.panes));
  ui.docks = TABS.map(([key, label]) => h('button', { type: 'button', class: 'ed-dock__btn', 'data-dock': key, 'aria-pressed': 'false', onclick: () => dock(key), text: label }));
  ui.toast = h('p', { class: 'ed-toast', role: 'status' });

  document.body.className = 'ed-body';
  document.body.replaceChildren(h('div', { class: 'ed' },
    top,
    ui.main = h('div', { class: 'ed-main' }, ui.stage, ui.panel),
    h('nav', { class: 'ed-dock', 'aria-label': 'Bảng chỉnh' }, ui.docks),
    ui.toast));

  document.addEventListener('keydown', onKey);
  // Đo lại khi khu trang đổi cỡ: lúc editor.css chưa tải xong, đổi cửa sổ, mở tấm trượt, kéo độ rộng bảng.
  new ResizeObserver(fit).observe(ui.stage);
  setPanelWidth(readPanelWidth(), false);
}

export function openEditor({ brands, id, page }) {
  state.brands = brands;
  state.id = id;
  build();
  fit();
  renderAi();
  openPage(page);
}
