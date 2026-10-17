/* editor.js - editor (#82): mở bằng /<thương hiệu hoặc nhap>/<trang>?sua, hay từ menu nút tròn (Chỉnh sửa).
   Trang thật chạy trong khung (iframe cùng nguồn, có data-ed-frame), editor đứng ngoài: thanh trên, bảng chỉnh bên phải
   (điện thoại: thanh dưới mở tấm trượt), thanh công cụ nổi trên khối đang chọn.
   Editor chỉ sửa dữ liệu: bản sao content.json và biến theme. Mọi thay đổi đi qua commit(): chụp trạng thái cũ để hoàn tác,
   ghi nháp trên máy (draft.js), rồi báo trang trong khung dựng lại bằng chính các component <wl-*>.
   Giao diện editor là của ClauKi, chung cho mọi thương hiệu (css/tool/editor.css, tiền tố ed-), không đọc biến của brand. */
import { readDraft, writeDraft, clearDraft, fingerprint } from './draft.js';
import { BLOCKS, HEADER_VARIANTS, variantsFor, CONTRAST, FONTS, CATALOG_FIELDS } from './manifest.js';
import { loadLibrary, addableGroups, makeBlock, addCredits } from './blocks-add.js';
import { paletteEl, DARK_OFF } from './palette.js';
import { auditPage } from './page-audit.js';
import { readMode } from '../core/theme-mode.js';
import { menuOrderEl } from './menu-order.js';
import { buildForm, buildFields, imageLibrary, setIn, getIn } from './form.js';
import { norm, pageAt, headerTarget as headerOf, checkNewPage, addPage as addPageTo, insertBlock, applyFont } from './ops.js';
import { contrastRatio, AA } from './contrast.js';
import { DESKTOP, isNarrow, fitFrame, deviceButtons } from './preview.js';
import { h, slugify } from '../core/dom.js';
import { iconEl } from '../core/icon.js';
import { confirmAction } from './confirm.js';
import { mountAi, refreshAiHistory } from './ai.js';
import { addTurn } from './chat-log.js';
import { fileToLogo, textLogo } from './logo.js';
import { readTaoDraft, writeTaoDraft, DRAFT_SLUG } from '../site/sites.js';
import { mountEnglish, langControl, renderEnglish, finalCheck as checkEnglish, draftPart, baseEnglish } from './english.js';

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
  // Tab Danh mục: id các mục đang mở, giữ qua mỗi lần vẽ lại bảng chỉnh.
  catOpen: new Set(),
  mode: 'edit',
  device: DESKTOP,
  // Số thứ tự lần nạp thương hiệu: đổi brand liên tiếp thì kết quả tải theme.css của lần cũ bị bỏ.
  loadToken: 0,
  // Điều khiển cần nhận lại con trỏ bàn phím sau lần vẽ lại kế tiếp (ví dụ nút Xuống của khối vừa dời).
  focusKey: null,
  // Thương hiệu làm khung (theme.css, ảnh): bằng id với thương hiệu có sẵn, khác id với site khách.
  baseId: null,
  // Lúc ghi nháp gần nhất (Date) để hiện "Đã lưu lúc ..." ở thanh trên.
  savedAt: null,
  // Bản tiếng Anh (english.js): tr là trạng thái song ngữ (null khi chưa bật), trBase là bản gốc lúc mở để biết đã đổi
  // chưa, view là ngôn ngữ đang xem trong khung, trBusy là chữ báo khi AI đang chạy, trIssues là câu AI báo nên xem lại.
  tr: null,
  trBase: 'null',
  view: 'vi',
  trBusy: null,
  trIssues: [],
  trReport: '',
  // Nút Lưu đang chờ AI dịch bản tiếng Anh xong; hẹn giờ gỡ trạng thái đang tải của nút Làm mới nếu khung không báo dựng xong.
  saving: false,
  reloadTimer: 0,
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

// vars: bộ biến thử (AI kiểm bộ màu mới trước khi đề xuất); bỏ trống thì kiểm theme đang dùng.
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
  return { content: clone(state.content), theme: clone(state.theme), tr: clone(state.tr), page: state.page, sel: state.sel };
}

// Hoàn tác trả lại cả khối đang chọn, để thanh công cụ không nhảy sang khối khác sau khi dời hay nhân đôi.
function restore(snap) {
  state.content = snap.content;
  state.theme = snap.theme;
  state.tr = snap.tr;
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

// Nút đang chạy việc: khoá lại và hiện vòng quay (editor.css, theo aria-busy), để bấm liên tục không gửi thêm việc trùng.
// Thẻ a không có disabled nên khoá bằng aria-disabled, CSS chặn bấm.
function setBusy(button, busy) {
  button.setAttribute('aria-busy', String(busy));
  if (button.tagName === 'BUTTON') button.disabled = busy;
  else button.setAttribute('aria-disabled', String(busy));
}

// Mỗi thay đổi đã tự ghi nháp ngay (persist), nút Lưu để người dùng thấy rõ điều đó: ghi lại một lần nữa, báo giờ lưu và nơi lưu.
// Nháp chỉ nằm trên trình duyệt này; muốn đưa vào repo thì tải content.json.
async function save() {
  if (isOriginal()) {
    toast('Chưa có thay đổi nào để lưu.');
    return;
  }
  if (state.saving) return;
  persist();
  const at = timeLabel(state.savedAt);
  toast(isTaoDraft()
    ? `Đã lưu lúc ${at} vào nháp của trang tạo web. Bấm Xuất bản để đưa website lên mạng.`
    : `Đã lưu lúc ${at}. Bản nháp nằm trên trình duyệt này, mở lại ?sua là còn. Muốn đưa vào repo thì bấm Tải content.json.`);
  // Lưu là một hành động cuối: AI dịch câu tiếng Việt mới và kiểm tra câu tiếng Anh tự sửa. Ghi nháp xong ngay, chỉ phần AI
  // tốn thời gian, nên nút quay vòng tới khi AI xong (không có gì cần dịch thì xong luôn).
  state.saving = true;
  setBusy(ui.save, true);
  try {
    await checkEnglish();
  } finally {
    state.saving = false;
    setBusy(ui.save, false);
    ui.save.disabled = isOriginal();
  }
  ui.save.textContent = 'Đã lưu';
  setTimeout(() => { ui.save.textContent = 'Lưu'; }, 1800);
}

// Hộp thoại Xuất bản chỉ tải khi bấm, như các phần ít dùng khác của editor.
async function openPublishDialog() {
  const { openPublish } = await import('./publish.js');
  openPublish(state);
}

const timeLabel = (date) => (date ?? new Date()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

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
  return JSON.stringify(state.content) === JSON.stringify(state.raw) && JSON.stringify(state.theme) === state.themeRaw
    && JSON.stringify(state.tr) === state.trBase;
}

// Bản nháp /nhap/ của trình tạo web: editor sửa thẳng nháp của /tao (clauki-tao), không tạo nháp riêng, để Xuất bản ở /tao
// dùng đúng bản đã chỉnh tay.
const isTaoDraft = () => state.id === DRAFT_SLUG;

// Nháp như persist gửi cho khung, nhưng với bảng biến vars (bảng màu AI đề xuất, chưa áp): khung ẩn của page-audit.js dựng trang
// bằng nháp này để đo màu trên trang thật trước khi đưa đề xuất cho người dùng.
function draftWith(vars) {
  const theme = { ...state.theme, vars, ...(state.baseId && state.baseId !== state.id ? { base: state.baseId } : {}) };
  return { base: fingerprint(state.raw), content: state.content, theme, ...draftPart() };
}

const auditColors = (vars, modes) => auditPage({ url: pageUrl(state.id, state.page), width: state.device, draft: draftWith(vars), modes, restoreMode: readMode() });

// Nháp gửi thẳng cho trang trong khung (xem trước được cả khi bộ nhớ bị chặn), đồng thời ghi trên máy.
function persist() {
  const original = isOriginal();
  // Site khách: ghi kèm base trong theme để core.js dựng nháp trên đúng thương hiệu khung.
  const theme = state.baseId && state.baseId !== state.id ? { ...state.theme, base: state.baseId } : state.theme;
  const draft = original ? null : { base: fingerprint(state.raw), content: state.content, theme, ...draftPart() };
  if (isTaoDraft()) {
    const ok = writeTaoDraft({ ...(readTaoDraft() ?? {}), content: state.content, theme, ...draftPart(), edited: !original, at: new Date().toISOString() });
    if (ok) state.savedAt = new Date();
    else toast('Trình duyệt chặn bộ nhớ: xem thử được trong editor, nhưng thoát ra là mất.');
  } else if (original) clearDraft(state.id);
  else if (!writeDraft(state.id, draft)) {
    toast('Trình duyệt chặn bộ nhớ: xem thử được trong editor, nhưng thoát ra là mất.');
  } else {
    state.savedAt = new Date();
  }
  // Hoàn tác hay về bản gốc làm mất trang đang mở (trang vừa thêm): về trang chủ.
  if (!pageOf(state.content)) {
    openPage('/');
  }
  // Đang xem bản tiếng Anh thì khung cần nội dung kèm bản dịch, kể cả khi chưa sửa gì so với bản gốc.
  const frame = draft ?? (state.view !== 'vi' ? { content: state.content, theme, ...draftPart() } : null);
  frameDoc()?.dispatchEvent(new CustomEvent('wl:draft', { detail: frame && clone(frame) }));
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

// Nút Làm mới: tải lại riêng trang trong khung (về đầu trang), như F5 nhưng không tải lại editor. Hiệu ứng chỉ chạy một lần
// (hiện dần khi cuộn, đếm số, sương tan) chạy lại từ đầu; nháp vẫn còn vì core.js trong khung dựng theo nháp đã ghi.
// Nút quay vòng tới khi trang trong khung dựng xong (onRendered); khung lỗi không báo thì 15 giây sau tự gỡ.
// Giữ nguyên trang và khối đang mở: chỉ trang trong khung tải lại, chỗ đang sửa không mất.
function reloadFrame() {
  setBusy(ui.reload, true);
  clearTimeout(state.reloadTimer);
  state.reloadTimer = setTimeout(() => setBusy(ui.reload, false), 15000);
  const sel = state.sel;
  openPage(state.page);
  state.sel = sel;
}

// Mỗi lần trang trong khung tải (lần đầu, đổi trang bằng đường dẫn): gắn style chọn khối và các sự kiện.
function onFrameLoad() {
  const doc = frameDoc();
  if (!doc) return;
  const style = doc.createElement('style');
  style.textContent = `[data-ed-hover] { outline: 2px dashed #0891b2; outline-offset: -2px; }
    [data-ed-sel] { outline: 3px solid #0891b2; outline-offset: -3px; }`;
  doc.head.append(style);
  doc.addEventListener('click', onFrameClick, true);
  doc.addEventListener('mouseover', onFrameHover);
  doc.addEventListener('keydown', onKey);
  ui.frame.contentWindow.addEventListener('scroll', placeTool, { passive: true });
  ui.frame.contentWindow.addEventListener('resize', placeTool);
}

// Trang trong khung vừa dựng xong: đổi thương hiệu (nút của BTC trong khung) hoặc đổi trang thì editor theo.
async function onRendered(detail) {
  clearTimeout(state.reloadTimer);
  setBusy(ui.reload, false);
  if (detail.id !== state.id || !state.raw) await loadBrand(detail.id, detail.raw, detail.base, detail.theme);
  if (detail.id !== state.id) return;
  if (norm(detail.page) !== state.page) state.sel = null;
  state.page = norm(detail.page);
  // Địa chỉ của editor theo trang trong khung: F5 thì mở lại đúng thương hiệu (trang thì về trang chủ, xem openEditor).
  try {
    history.replaceState(null, '', `${ui.frame.contentWindow.location.pathname}?sua`);
  } catch {
    // Khung chưa sẵn sàng thì giữ địa chỉ cũ.
  }
  refresh();
}

// base: thương hiệu làm khung của site khách (lấy theme.css, ảnh từ thư mục đó); thương hiệu có sẵn thì chính nó.
// guestTheme: theme của site khách (màu, font AI chọn), là bản gốc để so và để Về bản gốc, không phải theme rỗng.
async function loadBrand(id, raw, base = null, guestTheme = null) {
  const token = ++state.loadToken;
  state.id = id;
  state.baseId = base ?? id;
  state.raw = clone(raw);
  state.tr = null;
  state.trIssues = [];
  state.trReport = '';
  // Nháp /nhap/ chính là nội dung đang dựng (raw), nên không đọc nháp riêng; dọn nháp riêng cũ nếu còn.
  if (id === DRAFT_SLUG) clearDraft(id);
  const draft = id === DRAFT_SLUG ? null : readDraft(id, raw);
  const startTheme = clone(guestTheme ?? {});
  delete startTheme.base;
  startTheme.vars ??= {};
  state.themeRaw = JSON.stringify(startTheme);
  state.content = clone(draft?.content ?? raw);
  state.theme = clone(draft?.theme ?? startTheme);
  delete state.theme.base;
  state.theme.vars ??= {};
  state.past = [];
  state.future = [];
  state.sel = null;
  state.base = {};
  let css = '';
  const vars = {};
  try {
    css = await (await fetch(`/brands/${state.baseId}/theme.css`)).text();
    const root = /:root\s*\{([\s\S]*?)\}/.exec(css)?.[1] ?? '';
    for (const m of root.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  } catch {
    css = '';
  }
  const english = await baseEnglish(raw);
  if (token !== state.loadToken) return;
  state.baseCss = css;
  state.base = vars;
  state.trBase = JSON.stringify(english);
  state.tr = clone(draft?.i18n ?? (id === DRAFT_SLUG ? readTaoDraft()?.i18n : null) ?? english);
  // Mở editor luôn bắt đầu ở tiếng Việt và tab Khối, kể cả khi lần trước khách xem trang bằng tiếng Anh: người sửa chỉ sửa
  // tiếng Việt, bản tiếng Anh mở khi bấm English ở thanh trên.
  state.view = 'vi';
  const brand = state.brands.find((b) => b.id === id);
  document.title = `Chỉnh sửa - ${brand?.label ?? id}`;
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
  revealSelected();
}

// Đưa dòng của khối đang chọn lên đầu bảng, để thấy ngay tên khối và form của nó (danh sách dài thì khỏi phải cuộn tìm).
// Máy tính: bấm khối trên trang thì chuyển sang tab Khối; điện thoại giữ nguyên (tấm trượt chỉ mở khi bấm Sửa nội dung).
function revealSelected() {
  if (state.sel === null) return;
  if (!isNarrow() && ui.panes.blocks.hidden && state.view === 'vi') openTab('blocks');
  // Tự cuộn bảng (không dùng scrollIntoView vì nó cuộn cả trang editor và lệch ngang khi tấm trượt cố định trên điện thoại).
  const pane = ui.panes.blocks;
  const row = pane.querySelector('.ed-block.is-sel');
  if (!row) return;
  pane.scrollTop += row.getBoundingClientRect().top - pane.getBoundingClientRect().top - 8;
  pane.scrollLeft = 0;
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
  // Con trỏ bàn phím đi theo khối vừa dời; đặt trước commit để lần vẽ lại trong commit dùng luôn. Dời chỉ đổi chỗ hai khối,
  // không mở khối nào: khối đang mở (nếu có) vẫn là nó, chỉ đổi số thứ tự khi nó là một trong hai khối vừa đổi chỗ.
  state.focusKey = `a:${to}:${dir < 0 ? 'up' : 'down'}`;
  const followed = state.sel === key;
  commit(`Dời ${blockName(list[key])} ${dir < 0 ? 'lên' : 'xuống'}`, () => {
    const s = sections();
    [s[key], s[to]] = [s[to], s[key]];
    if (state.sel === key) state.sel = to;
    else if (state.sel === to) state.sel = key;
  });
  if (followed) setTimeout(() => selectedEl()?.scrollIntoView({ block: 'start' }), SCROLL_AFTER_RENDER_MS);
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
    // Bản sao chen vào sau khối gốc: khối đang mở nằm phía sau thì lùi một số để vẫn là đúng khối đó.
    if (typeof state.sel === 'number' && state.sel > key) state.sel += 1;
  });
}

function remove(key) {
  const section = sections()[key];
  commit(`Xoá ${blockName(section)}`, () => {
    sections().splice(key, 1);
    // Xoá chính khối đang mở thì đóng lại; xoá khối khác thì khối đang mở vẫn mở (khối phía sau tiến lên một số).
    if (state.sel === key) state.sel = null;
    else if (typeof state.sel === 'number' && state.sel > key) state.sel -= 1;
  });
}

/* ---------- Nội dung khối, thêm khối ---------- */

function setField(key, path, value, label) {
  commit(label, () => {
    const section = sections()[key];
    if (section) setIn(section, path, value);
  });
}

const LIST_LABELS = { add: 'Thêm mục', remove: 'Xoá mục', up: 'Dời mục lên', down: 'Dời mục xuống' };

// Thêm, xoá, dời một mục của danh sách nằm ở path trong target (khối hoặc mục danh mục); gọi bên trong commit().
function editList(target, path, action, i, item) {
  let list = getIn(target, path);
  if (!Array.isArray(list)) {
    list = [];
    setIn(target, path, list);
  }
  if (action === 'add') list.push(clone(item ?? {}));
  if (action === 'remove') list.splice(i, 1);
  const to = action === 'up' ? i - 1 : i + 1;
  if ((action === 'up' || action === 'down') && to >= 0 && to < list.length) [list[i], list[to]] = [list[to], list[i]];
}

function listOp(key, path, action, i, item) {
  commit(`${LIST_LABELS[action]} trong ${blockName(sections()[key])}`, () => {
    const section = sections()[key];
    if (section) editList(section, path, action, i, item);
  });
}

// Mốc (#id) của các khối trên trang đang mở: liên kết của mẫu trỏ tới mốc không có ở đây thì blocks-add.js đổi đi.
const anchors = () => new Set(sections().map((s) => s.id).filter(Boolean));

// Khối mới chèn ngay sau khối đang chọn (chưa chọn thì cuối trang), id không trùng khối nào trên trang. Mẫu mượn của thương hiệu
// khác kèm dòng credits cho ảnh của nó.
function addBlock(type) {
  const made = makeBlock(type, state.content, state.baseId, imageLibrary(state.content).filter((img) => img.alt), anchors());
  if (!made) return;
  const at = typeof state.sel === 'number' ? state.sel + 1 : sections().length;
  commit(`Thêm khối ${BLOCKS[type]?.label ?? type}`, () => {
    insertBlock(sections(), made.section, at);
    addCredits(state.content, made.credits);
    state.sel = at;
  });
  setTimeout(() => selectedEl()?.scrollIntoView({ block: 'start' }), SCROLL_AFTER_RENDER_MS);
}

// Ảnh xem trước trong form. Ảnh của site khách ghi đường dẫn tuyệt đối (/brands/<khung>/images/...): giữ nguyên.
const assetUrl = (src) => (/^(\/|https:\/\/)/.test(String(src)) ? src : `/brands/${state.baseId}/${src}`);

function contentEl() {
  const key = state.sel;
  const section = typeof key === 'number' ? sections()[key] : null;
  if (!section) return null;
  const form = buildForm(section, {
    h,
    key: `f:${key}`,
    images: imageLibrary(state.content),
    assetUrl,
    set: (path, value, label) => setField(key, path, value, label),
    list: (path, action, i, item) => listOp(key, path, action, i, item),
  });
  // Form nằm thẳng trong khung của khối, không có tiêu đề hay viền riêng: ở trong khung là biết đang sửa khối đó.
  return h('section', { class: 'ed-content', 'aria-label': `Nội dung của ${blockName(section)}` }, form);
}

// Ô chọn khối chia nhóm theo việc (blocks-add.js), như một kho khối dùng chung của cả hệ thống; khối chưa thêm được
// (cần danh mục) vẫn hiện nhưng khoá, kèm lý do.
function addBlockEl() {
  const groups = addableGroups(state.content, state.baseId, anchors());
  const pick = h('select', { class: 'ed-select', 'aria-label': 'Loại khối muốn thêm', 'data-ed-key': 'add:type' },
    groups.map(({ group, blocks: items }) => h('optgroup', { label: group },
      items.map((b) => h('option', { value: b.type, disabled: Boolean(b.reason), text: b.reason ? `${b.label} (${b.reason})` : b.label })))));
  pick.value = groups.flatMap((g) => g.blocks).find((b) => !b.reason)?.type ?? '';
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
  revealSelected();
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
  // replaceChildren in null thành chữ "null", nên bỏ phần trống (khối chỉ có một kiểu thì không có ô chọn kiểu).
  ui.tool.replaceChildren(...[
    h('span', { class: 'ed-tool__name', text: BLOCKS[section.type]?.label ?? section.type }),
    options.length > 1 ? variantSelect(key, section.variant ?? '', options, `Kiểu của ${blockName(section)}`, 'tool') : null,
    h('button', { type: 'button', class: 'ed-btn', 'data-ed-key': 'tool:edit', onclick: openContent, text: 'Sửa nội dung' }),
  ].filter(Boolean));
}

/* ---------- Tab Khối ---------- */

// Nút chỉ có icon trong danh sách khối. title là tên việc ngắn hiện khi rê chuột (Xoá, Ẩn, Tạo bản sao); aria-label
// đọc kèm tên khối cho trình đọc màn hình, vì nghe "Xoá" một mình thì không biết xoá khối nào.
function blockIcon(icon, title, onclick, { label = title, key, disabled = false, danger = false } = {}) {
  return h('button', { type: 'button', class: `ed-icon-btn${danger ? ' is-danger' : ''}`, 'data-ed-key': key, disabled, onclick, 'aria-label': label, title },
    iconEl(icon, 'ed-icon'));
}

// Tên khối là tên loại khối (khai ở manifest.js). Dòng chưa mở có icon bút chì: bấm cả dòng để mở.
// Dòng đang mở thì bấm tên lần nữa cũng thu gọn, cùng việc với nút đóng.
function blockHead({ key, num, label, chosen, hidden, onclick }) {
  return h('button', { type: 'button', class: 'ed-block__name', 'data-ed-key': `n:${key}`, 'aria-expanded': String(chosen), onclick: chosen ? () => closeBlock(key) : onclick },
    h('span', { class: 'ed-block__num', text: num }),
    h('strong', { class: 'ed-block__label', text: label }),
    hidden ? h('small', { text: 'đang ẩn' }) : null,
    chosen || hidden ? null : iconEl('pencil', 'ed-icon ed-block__edit'));
}

// Thu gọn khối đang mở (bỏ chọn); con trỏ bàn phím về lại tên khối thay vì rơi mất cùng nút đóng.
function closeBlock(key) {
  state.focusKey = `n:${key}`;
  select(null);
}

// Nút đóng ở góc phải đầu khối đang mở, tách khỏi các nút thao tác bằng vạch mảnh: dấu X là cách đóng quen thuộc nhất.
const closeIcon = (key) => h('span', { class: 'ed-block__close' }, blockIcon('x', 'Đóng', () => closeBlock(key), { label: 'Đóng khối' }));

function renderBlocks() {
  const list = sections();
  const headerVariant = headerTarget().variant ?? 'solid';
  const headerOn = state.sel === 'header';
  // Danh sách gọn: mỗi khối một dòng. Chỉ khối đang chọn mở rộng (kiểu, các nút, rồi form nội dung ngay bên dưới),
  // nên danh sách không dài ra theo số khối và luôn thấy khối nào đang sửa.
  const rows = [
    h('li', { class: `ed-block${headerOn ? ' is-sel' : ' ed-block--compact'}` },
      h('div', { class: 'ed-block__head' },
        blockHead({ key: 'header', num: '', label: 'Đầu trang', chosen: headerOn, onclick: () => select('header', true) }),
        headerOn ? closeIcon('header') : null),
      headerOn ? variantSelect('header', headerVariant, HEADER_VARIANTS, 'Kiểu đầu trang') : null,
      headerOn ? menuOrderEl({ h, state, commit }) : null),
    ...list.map((section, i) => {
      const chosen = state.sel === i;
      const name = blockName(section);
      const show = section.hidden ? 'Hiện' : 'Ẩn';
      // Dời, tạo bản sao, ẩn, xoá có sẵn trên mọi dòng, không phải mở khối ra mới làm được.
      const acts = h('span', { class: 'ed-block__acts' },
        blockIcon('arrow-up', 'Đưa lên', () => move(i, -1), { label: `Đưa ${name} lên`, key: `a:${i}:up`, disabled: i === 0 }),
        blockIcon('arrow-down', 'Đưa xuống', () => move(i, 1), { label: `Đưa ${name} xuống`, key: `a:${i}:down`, disabled: i === list.length - 1 }),
        blockIcon('copy-plus', 'Tạo bản sao', () => duplicate(i), { label: `Tạo bản sao của ${name}`, key: `a:${i}:dup` }),
        blockIcon(section.hidden ? 'eye' : 'eye-off', show, () => toggleHidden(i), { label: `${show} ${name}`, key: `a:${i}:hide` }),
        blockIcon('trash-2', 'Xoá', async () => {
          if (await confirmAction(`Xoá khối ${BLOCKS[section.type]?.label ?? section.type} (số ${i + 1})?`, { note: 'Hoàn tác được.', danger: true })) remove(i);
        }, { label: `Xoá ${name}`, danger: true }));
      const head = blockHead({
        key: i, num: String(i + 1), label: BLOCKS[section.type]?.label ?? section.type, chosen, hidden: section.hidden,
        // Khối đang ẩn không chọn được (không có trên trang), nên nút Hiện nằm ngay ở dòng gọn.
        onclick: () => (section.hidden ? null : select(i, true)),
      });
      if (!chosen) {
        return h('li', { class: `ed-block ed-block--compact${section.hidden ? ' is-hidden' : ''}` },
          h('div', { class: 'ed-block__head' }, head, acts));
      }
      const options = variantsFor(section);
      return h('li', { class: 'ed-block is-sel' },
        h('div', { class: 'ed-block__head' }, head, acts, closeIcon(i)),
        options.length > 1
          ? variantSelect(i, section.variant ?? '', options, `Kiểu của ${name}`)
          : h('span', { class: 'ed-block__one', text: 'Một kiểu' }),
        contentEl());
    }),
  ];
  ui.panes.blocks.replaceChildren(...[
    h('ol', { class: 'ed-blocks', 'aria-label': `Các khối của trang, ${list.length} khối` }, rows),
    pageOf(state.content) ? addBlockEl() : null,
  ].filter(Boolean));
}

/* ---------- Tab Thương hiệu ---------- */

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

/* ---------- Logo ---------- */

// Đặt logo và favicon vào nội dung (một commit, Hoàn tác được); logo người dùng tải thì bỏ logo cho nền tối của khung.
function setLogo(next, label) {
  commit(label, () => {
    state.content.brand ??= {};
    state.content.meta ??= {};
    if (next) {
      state.content.brand.logo = next.logo;
      state.content.meta.favicon = next.favicon;
    } else {
      delete state.content.brand.logo;
      delete state.content.meta.favicon;
    }
    // Logo chữ cái chỉ là dấu hình: header hiện tên cạnh logo. Logo tải lên thường đã có tên nên header ẩn tên như cũ.
    if (next?.mark) state.content.brand.logoMark = true;
    else delete state.content.brand.logoMark;
    delete state.content.brand.logoDark;
  });
}

function logoEl() {
  const logo = state.content.brand?.logo;
  const note = h('p', { class: 'ed-hint', 'aria-live': 'polite' });
  const file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', hidden: true });
  file.addEventListener('change', async () => {
    const picked = file.files?.[0];
    if (!picked) return;
    note.textContent = 'Đang thu nhỏ logo...';
    try {
      setLogo(await fileToLogo(picked), 'Tải logo');
      toast('Đã đổi logo, cả biểu tượng tab. Bấm Hoàn tác nếu muốn bỏ.');
    } catch (err) {
      note.textContent = err.message;
    }
  });
  const fromName = async () => {
    const doc = frameDoc();
    if (!doc) return;
    try {
      setLogo(await textLogo(state.content.brand?.name ?? state.id, doc), 'Tạo logo chữ cái');
    } catch (err) {
      note.textContent = `Chưa tạo được logo: ${err.message}`;
    }
  };
  // Ảnh xem trước: đường dẫn tương đối của thương hiệu có sẵn tính từ thư mục của nó.
  const src = logo && (/^(data:|\/|https:)/.test(logo) ? logo : `/brands/${state.baseId ?? state.id}/${logo}`);
  // Ảnh xem trước bên trái, các nút bên phải; chưa có logo thì ô viền đứt ghi "Chưa có". Định dạng nhận được ghi ở title của nút.
  return h('div', { class: 'ed-logo' },
    src ? h('img', { class: 'ed-logo__img', src, alt: 'Logo hiện tại' }) : h('span', { class: 'ed-logo__img ed-logo__none', text: 'Chưa có' }),
    h('div', { class: 'ed-logo__acts' },
      h('button', { type: 'button', class: 'ed-btn', onclick: () => file.click(), title: 'PNG, JPG hoặc WebP', text: 'Tải logo' }),
      h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', onclick: fromName, text: 'Tạo logo chữ cái' }),
      logo ? h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', onclick: () => setLogo(null, 'Bỏ logo'), text: 'Bỏ logo' }) : null),
    file, note);
}

// Một phần của tab Thương hiệu: tiêu đề nhỏ rồi nội dung; các phần ngăn nhau bằng đường kẻ mảnh (editor.css, .ed-sec).
const themeSection = (title, ...children) => h('section', { class: 'ed-sec', 'aria-label': title }, h('h3', { class: 'ed-h', text: title }), ...children);

// Tab Thương hiệu chia bốn phần, từ trên xuống: Thông tin, Logo, Chữ và góc, Màu (palette.js, kèm nhờ AI). Màu để cuối vì là
// phần dài nhất (bảng màu, tương phản, khung chat AI), không đẩy các phần ngắn xuống khuất.
function renderTheme() {
  const font = h('select', { class: 'ed-select', id: 'ed-font', 'data-ed-key': 'font' },
    FONTS.map((f) => h('option', { value: f.key, text: f.label, selected: (state.theme.font ?? '') === f.key })));
  font.addEventListener('change', () => setFont(font.value));
  const radius = h('input', { type: 'range', class: 'ed-range', id: 'ed-radius', min: '0', max: '32', step: '2', value: String(radiusPx()), 'data-ed-key': 'radius' });
  const radiusValue = h('output', { class: 'ed-setting__value', for: 'ed-radius', text: `${radiusPx()}px` });
  // Kéo thì số px đổi theo ngay; thả tay mới ghi vào nháp (một bước Hoàn tác cho cả lần kéo).
  radius.addEventListener('input', () => { radiusValue.textContent = `${radius.value}px`; });
  radius.addEventListener('change', () => setThemeVar('--radius', `${Number(radius.value) / 16}rem`, 'Đổi bo góc'));
  const c = state.content;
  ui.panes.theme.replaceChildren(
    themeSection('Thông tin',
      textField('Tên thương hiệu', 'brand.name', c.brand?.name),
      textField('Khẩu hiệu', 'brand.slogan', c.brand?.slogan),
      textField('Chữ trên nút chính', 'cta.label', c.cta?.label),
      textField('Dòng giá dưới nút', 'cta.note', c.cta?.note),
      textField('Số điện thoại', 'contact.phone', c.contact?.phone),
      textField('Địa chỉ', 'contact.address', c.contact?.address)),
    themeSection('Logo', logoEl()),
    themeSection('Chữ và góc',
      h('div', { class: 'ed-setting' }, h('label', { for: 'ed-font', text: 'Font' }), font),
      h('div', { class: 'ed-setting' }, h('label', { for: 'ed-radius', text: 'Bo góc' }), radius, radiusValue)),
    paletteEl({ h, state, commit, frameDoc, rerender: renderTheme, audit: auditColors }),
  );
}

/* ---------- Tab Trang ---------- */

const NEW_PAGE = '__new__';

// Mở tab Trang (điện thoại: mở tấm trượt) và đặt con trỏ vào ô tên trang mới.
function openNewPage() {
  openTab('pages');
  if (isNarrow() && !ui.panel.classList.contains('is-open')) dock('pages');
  const input = ui.panes.pages.querySelector('.ed-newpage input[name="name"]');
  input?.scrollIntoView({ block: 'center' });
  input?.focus();
}

function addPage(form) {
  const name = form.elements.name.value.trim();
  const { slug, error } = checkNewPage(state.content, name);
  if (error) {
    form.querySelector('.ed-err').textContent = error;
    return;
  }
  const onMenu = form.elements.menu.checked;
  const from = form.elements.from.value;
  commit(`Thêm trang ${name}`, () => addPageTo(state.content, slug, name, onMenu, from || null));
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
    h('label', { class: 'ed-field' }, h('span', { text: 'Bắt đầu từ' }),
      h('select', { class: 'ed-select', name: 'from' },
        h('option', { value: '', text: 'Trang trống (chỉ có tiêu đề)', selected: true }),
        h('option', { value: state.page, text: 'Bản sao của trang đang mở' }))),
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
        p.added ? h('button', {
          type: 'button', class: 'ed-btn ed-btn--danger', text: 'Xoá',
          onclick: async () => {
            if (await confirmAction(`Xoá trang ${p.title ?? path}?`, { note: 'Hoàn tác được.', danger: true })) removePage(path);
          },
        }) : null);
    })),
    h('h3', { class: 'ed-h', text: 'Thêm trang' }),
    form,
  );
}

/* ---------- Tab Danh mục ---------- */

// Tour, hạng phòng khai một lần trong catalog.items (AGENTS.md mục 5); sửa ở đây thì mọi khối đọc danh mục cùng đổi.
// Chỉ sửa, chưa thêm hay xoá mục: id của mục đang được trang chi tiết, đặt chỗ, gợi ý tour trỏ tới.
const catalogItems = () => state.content?.catalog?.items ?? [];
const itemName = (i) => catalogItems()[i]?.name || 'danh mục';

function setCatalogField(i, path, value, label) {
  commit(`${label} (${itemName(i)})`, () => {
    const item = catalogItems()[i];
    if (item) setIn(item, path, value);
  });
}

function catalogListOp(i, path, action, j, item) {
  commit(`${LIST_LABELS[action]} trong ${itemName(i)}`, () => {
    const target = catalogItems()[i];
    if (target) editList(target, path, action, j, item);
  });
}

// Mỗi mục một khung gập mở (details); mục đang mở được nhớ trong state.catOpen để vẽ lại không gập mất.
function renderCatalog() {
  const images = imageLibrary(state.content);
  ui.panes.catalog.replaceChildren(
    h('p', { class: 'ed-hint', text: 'Tour, hạng phòng khai một lần ở đây. Sửa xong thì danh sách, trang chi tiết, đặt chỗ, bảng giờ, gợi ý tour cùng đổi.' }),
    ...catalogItems().map((item, i) => {
      const key = item.id ?? String(i);
      const box = h('details', { class: 'ed-cat', open: state.catOpen.has(key) },
        h('summary', { class: 'ed-cat__head', text: item.name || item.id || `Mục ${i + 1}` }),
        buildFields(item, CATALOG_FIELDS, {
          h,
          key: `c:${key}`,
          images,
          assetUrl,
          set: (path, value, label) => setCatalogField(i, path, value, label),
          list: (path, action, j, it) => catalogListOp(i, path, action, j, it),
        }));
      box.addEventListener('toggle', () => {
        if (box.open) state.catOpen.add(key);
        else state.catOpen.delete(key);
      });
      return box;
    }));
}

/* ---------- Tab AI ---------- */

function renderAi() {
  mountAi(ui.panes.ai, {
    h,
    state,
    sections,
    pageOf,
    colorOf,
    commit,
    images: () => imageLibrary(state.content),
    contrastOf: contrastChecks,
    tab: ui.tabs.find((t) => t.dataset.tab === 'ai'),
  });
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
    // Chế độ tối đã tắt (palette.js): bỏ hẳn dòng biến tối của thương hiệu, không ghi "initial" vào theme.css.
    if (value === DARK_OFF) {
      body = body.replace(new RegExp(`^[ \\t]*${name.replace(/-/g, '\\-')}\\s*:[^;]*;[ \\t]*\\n?`, 'm'), '');
      continue;
    }
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
  // Thương hiệu có sẵn giữ bản tiếng Anh ở file riêng (Tải content.en.json ở tab English).
  delete out.translations;
  delete out.translationNotes;
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
    state.theme = JSON.parse(state.themeRaw);
    state.tr = JSON.parse(state.trBase);
    state.trIssues = [];
  });
  // Ghi một mốc vào lịch sử nhờ AI để lượt nhờ sau biết trang đã về bản gốc, không hiểu nhầm "như lúc nãy" là bản đã sửa.
  ['ai', 'palette'].forEach((kind) => addTurn(state.id, kind, { text: 'Về bản gốc', say: 'Mọi thay đổi trước đó đã bỏ', status: 'reset' }));
  refreshAiHistory();
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
  ui.status.textContent = isOriginal() ? (isTaoDraft() ? 'Bản AI tạo' : 'Bản gốc') : `Đã lưu ${timeLabel(state.savedAt)}`;
  ui.status.title = isOriginal() ? '' : (isTaoDraft() ? 'Đã lưu vào nháp của trang tạo web, bấm Xuất bản để đưa lên mạng.' : 'Bản nháp nằm trên trình duyệt này, chưa vào repo. Tải content.json để đưa vào repo.');
  ui.save.disabled = isOriginal() || state.saving;
  ui.save.title = isOriginal() ? 'Chưa có thay đổi' : 'Lưu bản nháp trên trình duyệt này';
  ui.status.classList.toggle('is-draft', !isOriginal());
  const pages = state.content.pages ?? [{ path: '/', title: 'Trang chủ' }];
  ui.pageSelect.replaceChildren(...pages.map((p) => {
    const path = norm(p.path);
    return h('option', { value: path, text: p.title ?? (path === '/' ? 'Trang chủ' : path), selected: path === state.page });
  }), h('option', { value: NEW_PAGE, text: '+ Thêm trang mới' }));
  // Nháp của trình tạo web: thoát là về /tao. Đổi thương hiệu trong khung thì lịch sử nhờ AI đổi theo.
  refreshAiHistory();
  ui.exit.href = isTaoDraft() ? '/tao' : pageUrl(state.id, state.page);
  ui.exit.textContent = isTaoDraft() ? 'Về trang tạo' : 'Thoát';
  const bad = !contrastChecks().every((c) => c.ok);
  ui.themeBtn.disabled = bad;
  ui.themeBtn.title = bad ? 'Màu chưa đạt tương phản AA' : '';
  ui.lang.replaceChildren(langControl());
  // Tab English chỉ có khi trang đã bật bản tiếng Anh.
  [...ui.tabs, ...ui.docks].filter((b) => (b.dataset.tab ?? b.dataset.dock) === 'en').forEach((b) => { b.hidden = !state.tr; });
  if (!state.tr && !ui.panes.en.hidden) openTab('blocks');
  // Tab Danh mục chỉ có khi thương hiệu khai catalog; chỉ vẽ khi đang mở (mỗi mục là một form, vẽ hết mỗi lần sửa thì phí).
  const hasCatalog = catalogItems().length > 0;
  [...ui.tabs, ...ui.docks].filter((b) => (b.dataset.tab ?? b.dataset.dock) === 'catalog').forEach((b) => { b.hidden = !hasCatalog; });
  if (!hasCatalog && !ui.panes.catalog.hidden) openTab('blocks');
  if (!ui.panes.catalog.hidden) renderCatalog();
  renderBlocks();
  renderTheme();
  renderPages();
  if (!ui.panes.en.hidden) renderEnglish(ui.panes.en);
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
  // Xem thử là một hành động cuối: AI dịch câu tiếng Việt mới và kiểm tra câu tiếng Anh tự sửa (chạy nền, không chặn).
  if (mode === 'view') checkEnglish();
  ui.viewToggle.setAttribute('aria-checked', String(mode === 'view'));
  frameDoc()?.querySelectorAll('[data-ed-hover]').forEach((el) => el.removeAttribute('data-ed-hover'));
  markSelection();
  toast(mode === 'view' ? 'Đang xem thử: bấm, cuộn như khách. Tắt "Xem thử" để chỉnh tiếp.' : 'Đang chỉnh: bấm một khối để chọn.');
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
  if (name === 'en' && state.content) renderEnglish(ui.panes.en);
  if (name === 'catalog' && state.content) renderCatalog();
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

// Nhãn đủ cho màn rộng và nhãn ngắn cho màn laptop, CSS chọn hiện một trong hai; trình đọc màn hình đọc nhãn đủ (aria-label).
const twoLabels = (long, short) => [h('span', { class: 'ed-top__long', text: long }), h('span', { class: 'ed-top__short', 'aria-hidden': 'true', text: short })];

const TABS = [['blocks', 'Khối'], ['en', 'English'], ['theme', 'Thương hiệu'], ['pages', 'Trang'], ['catalog', 'Danh mục'], ['ai', 'AI']];

function build() {
  const css = h('link', { rel: 'stylesheet', href: '/css/tool/editor.css' });
  const font = h('link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700&display=swap' });
  document.head.append(css, font);

  ui.brand = h('strong', { class: 'ed-top__brand' });
  ui.status = h('span', { class: 'ed-top__status' });
  ui.pageSelect = h('select', { class: 'ed-select', 'aria-label': 'Trang đang chỉnh' });
  ui.pageSelect.addEventListener('change', () => {
    if (ui.pageSelect.value !== NEW_PAGE) {
      openPage(ui.pageSelect.value);
      return;
    }
    // Chọn "Thêm trang mới": trả ô chọn về trang đang mở rồi đưa người dùng tới form thêm trang.
    ui.pageSelect.value = state.page;
    openNewPage();
  });
  ui.lang = h('div', { class: 'ed-top__group ed-top__lang' });
  ui.undo = h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', onclick: undo, text: 'Hoàn tác' });
  ui.redo = h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', onclick: redo, text: 'Làm lại' });
  // Công tắc Xem thử: tắt là đang chỉnh (bấm khối để chọn), bật là xem như khách (bấm, cuộn như trang thật).
  ui.viewToggle = h('button', { type: 'button', class: 'ed-switch', role: 'switch', 'aria-checked': 'false', onclick: () => setMode(state.mode === 'view' ? 'edit' : 'view') },
    h('span', { class: 'ed-switch__track', 'aria-hidden': 'true' }, h('span', { class: 'ed-switch__thumb' })),
    h('span', { text: 'Xem thử' }));
  ui.devices = deviceButtons(h, DESKTOP, (width) => {
    state.device = width;
    fit();
  });
  ui.reload = h('button', { type: 'button', class: 'ed-btn ed-btn--ghost ed-btn--icon', onclick: reloadFrame, title: 'Tải lại trang trong khung để xem lại hiệu ứng, nháp vẫn giữ' },
    iconEl('refresh-cw', 'ed-icon'), 'Làm mới');
  ui.themeBtn = h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', onclick: downloadTheme, 'aria-label': 'Tải theme.css' }, twoLabels('Tải theme.css', 'theme.css'));
  ui.save = h('button', { type: 'button', class: 'ed-btn ed-btn--save', onclick: save, text: 'Lưu' });
  ui.exit = h('a', { class: 'ed-btn ed-btn--ghost', text: 'Thoát' });
  // Xuất bản ngay trong editor (thương hiệu có sẵn hay nháp của trình tạo web): hộp thoại đặt tên ở js/editor/publish.js.
  ui.publish = h('button', { type: 'button', class: 'ed-btn', onclick: openPublishDialog, text: 'Xuất bản' });

  // Nút xếp theo nhóm việc, giữa hai nhóm có vạch mảnh (chỉ để nhìn): trang, hoàn tác, ngôn ngữ, xem trước, tệp, lưu.
  const sep = () => h('span', { class: 'ed-top__sep', 'aria-hidden': 'true' });
  const top = h('header', { class: 'ed-top' },
    h('div', { class: 'ed-top__who' }, ui.brand, ui.status),
    sep(),
    h('div', { class: 'ed-top__group' }, ui.pageSelect),
    sep(),
    h('div', { class: 'ed-top__group ed-top__history' }, ui.undo, ui.redo),
    sep(),
    ui.lang,
    sep(),
    h('div', { class: 'ed-top__group ed-top__wide' },
      ui.viewToggle,
      h('div', { class: 'ed-devices', role: 'group', 'aria-label': 'Khổ màn hình' }, ui.devices),
      ui.reload),
    h('div', { class: 'ed-top__group ed-top__end' },
      h('button', { type: 'button', class: 'ed-btn ed-btn--ghost ed-top__wide', onclick: resetAll, 'aria-label': 'Về bản gốc' }, twoLabels('Về bản gốc', 'Bản gốc')),
      h('button', { type: 'button', class: 'ed-btn ed-btn--ghost ed-top__wide', onclick: downloadContent, 'aria-label': 'Tải content.json' }, twoLabels('Tải content.json', 'content.json')),
      h('span', { class: 'ed-top__wide' }, ui.themeBtn),
      sep(),
      ui.save,
      ui.publish,
      ui.exit));

  ui.frame = h('iframe', { class: 'ed-frame', title: 'Trang đang chỉnh', 'data-ed-frame': true });
  ui.frame.addEventListener('load', onFrameLoad);
  ui.frame.addEventListener('wl:rendered', (e) => onRendered(e.detail));
  ui.wrap = h('div', { class: 'ed-frame-wrap' }, ui.frame);
  ui.tool = h('div', { class: 'ed-tool', role: 'toolbar', 'aria-label': 'Công cụ của khối đang chọn', hidden: true });
  ui.stage = h('div', { class: 'ed-stage' }, ui.wrap, ui.tool);

  ui.panes = Object.fromEntries(TABS.map(([key, label]) => [key, h('div', { class: 'ed-pane', role: 'tabpanel', 'aria-label': label, hidden: key !== 'blocks' })]));
  ui.tabs = TABS.map(([key, label]) => h('button', { type: 'button', role: 'tab', class: 'ed-tab', 'data-tab': key, 'aria-selected': String(key === 'blocks'), onclick: () => openTab(key), text: label }));
  // Tab English ẩn tới khi biết trang đã bật bản tiếng Anh (refresh bật lại).
  ui.tabs.find((t) => t.dataset.tab === 'en').hidden = true;
  ui.resizer = resizerEl();
  ui.panel = h('aside', { class: 'ed-panel', 'aria-label': 'Bảng chỉnh' },
    ui.resizer,
    h('div', { class: 'ed-tabs', role: 'tablist' }, ui.tabs),
    Object.values(ui.panes));
  ui.docks = TABS.map(([key, label]) => h('button', { type: 'button', class: 'ed-dock__btn', 'data-dock': key, 'aria-pressed': 'false', onclick: () => dock(key), text: label }));
  ui.docks.find((d) => d.dataset.dock === 'en').hidden = true;
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

// Mở editor (vào mới hay F5) luôn bắt đầu ở trang chủ, tiếng Việt, tab Khối, dù địa chỉ đang trỏ tới trang con: điểm
// bắt đầu lúc nào cũng giống nhau. Đổi trang bằng ô chọn trang; nút Làm mới chỉ tải lại trang đang mở (state.page).
export function openEditor({ brands, id }) {
  state.brands = brands;
  state.id = id;
  build();
  fit();
  renderAi();
  mountEnglish({ h, state, commit, persist, refresh, toast, openTab, sections, blockName, download });
  openPage('/');
  // Mẫu khối của các thương hiệu có sẵn cho ô Thêm khối; tải xong thì vẽ lại để ô chọn có đủ khối.
  loadLibrary(brands.map((b) => b.id)).then(() => {
    if (state.content) refresh();
  });
}
