/* english.js - bản tiếng Anh trong editor: nút "Thêm bản tiếng Anh", công tắc Tiếng Việt, English ở thanh trên, tab
   English (sửa chữ tiếng Anh của khối đang chọn, bảng các chỗ cần xem).
   Người dùng sửa bố cục và tiếng Việt như cũ; bản tiếng Anh do AI dịch, sửa tay được. Trong lúc sửa không gọi AI: mã chỉ
   ghi lại câu nào đổi (i18n-text.js). AI chỉ chạy khi bật bản tiếng Anh, khi chuyển sang English (dịch câu tiếng Việt
   vừa đổi để xem đúng), và gom một lượt khi bấm Xem thử hoặc Lưu (dịch câu còn chờ, kiểm tra câu người dùng tự sửa).
   Trạng thái song ngữ nằm ở state.tr của editor, đi qua commit nên Hoàn tác được, và được ghi kèm nháp. */
import {
  textEntries, translationState, pendingWork, setManual, keepManual, dropManual, setChecked, applyResults, withLanguage,
  withoutLanguage, buildTranslation, addMemory,
} from '../core/i18n-text.js';
import { usageMark, modelsSince } from '../ai/gemini.js';
import { norm } from './ops.js';

const LANG = 'en';
let api = null;

const tr = () => api.state.tr;
const work = () => pendingWork(api.state.content, tr());

/* ---------- Nạp, ghi nháp ---------- */

async function fetchJson(url) {
  try {
    const res = await fetch(url);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/* Bản tiếng Anh gốc của thương hiệu đang mở: site khách có sẵn trong nội dung (translations.en), thương hiệu có sẵn đọc
   file brands/<id>/content.en.json. Thương hiệu chưa bật tiếng Anh thì null. */
export async function baseEnglish(raw) {
  if (!raw.languages?.includes(LANG)) return null;
  const translation = raw.translations?.[LANG] ?? await fetchJson(`/brands/${raw.id}/content.${LANG}.json`);
  return translationState({ ...raw, translations: { [LANG]: translation ?? {} } }, LANG);
}

// Phần nháp của bản tiếng Anh: trạng thái (để mở lại editor còn nguyên), bản dịch dựng sẵn (để khung xem trước và trang
// ngoài editor ghép được), ngôn ngữ đang xem trong khung.
export function draftPart() {
  if (!tr()) return { view: 'vi' };
  return { view: api.state.view, i18n: tr(), translation: buildTranslation(api.state.content, tr().en) };
}

/* ---------- Gọi AI ---------- */

// Bộ nhớ dịch thêm của site khách: bản tiếng Anh của thương hiệu làm khung, để chữ giao diện giữ nguyên khỏi phải dịch lại.
async function frameMemory() {
  const { state } = api;
  if (!state.baseId || state.baseId === state.id) return new Map();
  const [content, translation] = await Promise.all([
    fetchJson(`/brands/${state.baseId}/content.json`),
    fetchJson(`/brands/${state.baseId}/content.${LANG}.json`),
  ]);
  return addMemory(new Map(), content, translation);
}

function setBusy(text) {
  api.state.trBusy = text;
  api.refresh();
}

/* Chạy một việc AI (dịch hoặc gom kiểm tra) rồi ghi kết quả bằng một commit, nên một lần Hoàn tác là bỏ phần AI vừa làm.
   AI lỗi thì báo, không chặn gì; câu chưa dịch vẫn hiện tiếng Việt. */
async function runAi(label, task) {
  if (api.state.trBusy) return null;
  setBusy('Đang gọi AI...');
  const mark = usageMark();
  try {
    const result = await task((done, total) => setBusy(`Đang dịch ${done}/${total} câu...`));
    result.model = modelsSince(mark);
    api.commit(label, () => {
      api.state.tr = applyResults(tr(), api.state.content, result);
    });
    return result;
  } catch (err) {
    api.toast(err.message || 'AI gặp lỗi, bản tiếng Anh giữ nguyên.');
    return null;
  } finally {
    setBusy(null);
  }
}

// Dịch các câu còn chờ (bật bản tiếng Anh, chuyển sang English). Không có câu nào chờ thì không gọi AI.
async function sync() {
  if (!work().translate.length) return;
  const memory = await frameMemory();
  const result = await runAi('AI dịch bản tiếng Anh', async (progress) => {
    const { syncTranslation } = await import('../ai/translate.js');
    const out = await syncTranslation({ content: api.state.content, state: tr(), memory, on: { progress } });
    return { translated: out.translated, stats: out.stats };
  });
  if (result?.stats) report(result.stats, 0, result.model);
}

/* Lượt gom ở hành động cuối (Xem thử, Lưu): dịch câu còn chờ và kiểm tra câu tự sửa trong một lượt. Chạy nền, không
   chặn việc xem thử hay lưu; xong thì các chỗ cần xem hiện ở tab English. */
export async function finalCheck() {
  if (!tr() || api.state.trBusy) return;
  const { translate, review } = work();
  if (!translate.length && !review.length) return;
  const memory = await frameMemory();
  const result = await runAi('AI dịch và kiểm tra bản tiếng Anh', async (progress) => {
    const { finalCheck: check } = await import('../ai/translate.js');
    return check({ content: api.state.content, state: tr(), memory, on: { progress } });
  });
  if (!result) return;
  api.state.trIssues = result.issues;
  report(result.stats, result.issues.length, result.model);
}

// model: model đã dùng cho lượt dịch (modelsSince), ghi cuối câu báo.
function report(stats, issues = 0, model = '') {
  const parts = [];
  if (stats.total) parts.push(`đã dịch ${stats.total - stats.failed}/${stats.total} câu`);
  if (stats.failed) parts.push(`${stats.failed} câu chưa dịch được nên hiện tiếng Việt`);
  if (issues) parts.push(`${issues} câu bạn sửa nên xem lại (tab English)`);
  if (stats.error) parts.push(stats.error);
  if (model && parts.length) parts.push(`model ${model}`);
  if (parts.length) api.toast(`Bản tiếng Anh: ${parts.join('; ')}.`);
  api.state.trReport = parts.join('; ');
}

/* ---------- Bật, tắt, chuyển ngôn ngữ ---------- */

// Bật bản tiếng Anh rồi chuyển sang English: setView dịch cả website trong một lượt (không gọi dịch hai lần).
async function enable() {
  api.commit('Thêm bản tiếng Anh', () => {
    api.state.content = withLanguage(api.state.content, LANG);
    api.state.tr = translationState(api.state.content, LANG);
  });
  await setView(LANG);
}

function disable() {
  api.commit('Bỏ bản tiếng Anh', () => {
    api.state.content = withoutLanguage(api.state.content, LANG);
    api.state.tr = null;
    api.state.trIssues = [];
  });
  setView('vi');
  api.toast('Đã bỏ bản tiếng Anh. Bấm Hoàn tác nếu muốn lấy lại.');
}

// Chuyển ngôn ngữ đang chỉnh: khung xem trước và bảng chỉnh đổi theo. Sang English thì dịch trước các câu tiếng Việt
// vừa đổi, để thấy đúng bản sẽ lên trang.
export async function setView(lang) {
  if (lang === LANG && !tr()) return;
  api.state.view = lang;
  api.openTab(lang === LANG ? 'en' : 'blocks');
  api.persist();
  if (lang === LANG) await sync();
}

/* ---------- Thanh trên ---------- */

const reviewCount = () => {
  if (!tr()) return 0;
  const { conflicts, broken } = work();
  return conflicts.length + broken.length + liveIssues().length;
};

export function langControl() {
  const { h } = api;
  // Điện thoại: thanh trên chỉ một hàng nên hiện chữ ngắn (VI, EN); trình đọc màn hình vẫn đọc tên đầy đủ.
  const label = (long, brief) => [h('span', { class: 'ed-lang__long', text: long }), h('span', { class: 'ed-lang__short', 'aria-hidden': 'true', text: brief })];
  if (!tr()) {
    return h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', 'data-ed-key': 'lang:add', 'aria-label': 'Thêm bản tiếng Anh', disabled: Boolean(api.state.trBusy), onclick: enable },
      ...label('+ Thêm bản tiếng Anh', '+ EN'));
  }
  // Hai lựa chọn chung một khối, chọn một trong hai (radiogroup), nên trình đọc màn hình cũng đọc đúng ý đó.
  const seg = (lang, long, brief) => h('button', {
    type: 'button', role: 'radio', class: 'ed-lang__opt', 'data-ed-key': `lang:${lang}`, 'aria-checked': String(api.state.view === lang),
    'aria-label': long, onclick: () => setView(lang),
  }, ...label(long, brief));
  const count = reviewCount();
  const note = api.state.trBusy ?? (count ? `${count} chỗ cần xem` : '');
  return h('span', { class: 'ed-lang' },
    h('span', { class: 'ed-lang__seg', role: 'radiogroup', 'aria-label': 'Ngôn ngữ đang chỉnh' }, seg('vi', 'Tiếng Việt', 'VI'), seg(LANG, 'English', 'EN')),
    note ? h('button', { type: 'button', class: 'ed-lang__note', onclick: () => setView(LANG), text: note }) : null);
}

/* ---------- Tab Tiếng Anh ---------- */

// Câu AI báo lỗi mà người dùng chưa xử lý; sửa tiếp câu đó thì kết quả cũ không còn đúng nữa.
function liveIssues() {
  const state = tr();
  return (api.state.trIssues ?? []).filter((i) => state?.en[i.key] === i.en && state.checked[i.key] !== i.en);
}

const short = (text, max = 140) => (text.length > max ? `${text.slice(0, max - 3)}...` : text);

function statusOf(key, entry) {
  const state = tr();
  if (state.en[key] === undefined) return ['Chưa dịch', 'is-todo'];
  if (state.source[key] !== entry.text) return state.manual.includes(key) ? ['Tiếng Việt đã đổi', 'is-warn'] : ['Chờ dịch lại', 'is-todo'];
  return state.manual.includes(key) ? ['Bạn đã sửa', 'is-own'] : ['AI dịch', ''];
}

// Xoá trắng ô thì trả câu về cho AI: bỏ câu đang có, lượt sau dịch lại.
function clearEnglish(state, key) {
  const en = { ...state.en };
  delete en[key];
  return dropManual({ ...state, en }, key);
}

function edit(key, value) {
  const text = value.trim();
  if (text === (tr().en[key] ?? '')) return;
  api.commit('Sửa chữ tiếng Anh', () => {
    api.state.tr = text ? setManual(tr(), key, text) : clearEnglish(tr(), key);
  });
}

function fieldEl(entry) {
  const { h } = api;
  const value = tr().en[entry.key] ?? '';
  const [label, tone] = statusOf(entry.key, entry);
  const input = h('textarea', {
    class: 'ed-input ed-tr__en', rows: String(Math.min(4, Math.max(1, Math.ceil(Math.max(value.length, entry.text.length) / 42)))),
    'data-ed-key': `tr:${entry.key}`, 'aria-label': `Bản tiếng Anh của: ${short(entry.text, 80)}`, placeholder: 'Chưa dịch',
  });
  input.value = value;
  // Ghi khi rời ô, như các ô khác của editor; đợi con trỏ sang ô mới rồi mới vẽ lại.
  input.addEventListener('change', () => setTimeout(() => edit(entry.key, input.value)));
  return h('li', { class: 'ed-tr' },
    h('p', { class: 'ed-tr__vi', text: entry.text }),
    input,
    h('span', { class: `ed-tr__chip ${tone}`.trim(), text: label }));
}

// Các chỗ cần xem, gom một bảng: câu AI báo lỗi, câu tự sửa mà tiếng Việt đã đổi, câu mất chỗ {n}.
function reviewEl() {
  const { h } = api;
  const { conflicts, broken } = work();
  const issues = liveIssues();
  if (!conflicts.length && !broken.length && !issues.length) return null;
  const commitTr = (label, next) => api.commit(label, () => { api.state.tr = next(tr()); });
  const item = (entry, body, actions) => h('li', { class: 'ed-review__item' },
    h('p', { class: 'ed-tr__vi', text: entry.text }), ...body, h('div', { class: 'ed-row' }, actions));
  const line = (label, text) => h('p', { class: 'ed-review__line' }, h('b', { text: `${label}: ` }), text);
  const retranslate = (key) => async () => {
    commitTr('Cho AI dịch lại câu tiếng Anh', (s) => dropManual(s, key));
    await sync();
  };
  return h('section', { class: 'ed-review', 'aria-label': 'Chỗ cần xem' },
    h('h3', { class: 'ed-h', text: `Cần xem (${conflicts.length + broken.length + issues.length})` }),
    h('ol', { class: 'ed-review__list' },
      ...issues.map((i) => item(i, [line('Bản của bạn', i.en), line('Gợi ý', i.suggestion), i.reason ? line('Lý do', i.reason) : null].filter(Boolean), [
        h('button', { type: 'button', class: 'ed-btn', onclick: () => commitTr('Dùng gợi ý của AI', (s) => setChecked(s, i.key, i.suggestion)), text: 'Dùng gợi ý' }),
        h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', onclick: () => commitTr('Giữ câu tiếng Anh của bạn', (s) => setChecked(s, i.key)), text: 'Giữ nguyên' }),
      ])),
      ...conflicts.map((c) => item(c, [line('Câu tiếng Việt đã đổi, bản tiếng Anh của bạn', c.en)], [
        h('button', { type: 'button', class: 'ed-btn', onclick: retranslate(c.key), text: 'Dịch lại' }),
        h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', onclick: () => commitTr('Giữ câu tiếng Anh của bạn', (s) => keepManual(s, api.state.content, c.key)), text: 'Giữ bản của tôi' }),
      ])),
      ...broken.map((b) => item(b, [line('Thiếu chỗ điền số', b.en)], [
        h('button', { type: 'button', class: 'ed-btn', onclick: retranslate(b.key), text: 'Dịch lại' }),
      ]))));
}

// Chữ hiện trong tab: khối đang chọn, đầu trang, hoặc chữ chung khi chưa chọn khối (cùng danh mục, nguồn ảnh gập sẵn).
// Vị trí trong nội dung: pages.<trang>.sections.<khối>...; thương hiệu một trang thì sections.<khối>...
function scopeOf() {
  const { state } = api;
  const entries = textEntries(state.content);
  const pages = state.content.pages;
  const pageIndex = pages ? pages.findIndex((p) => norm(p.path) === state.page) : -1;
  const inPage = (e) => (pages ? e.path[0] === 'pages' && e.path[1] === pageIndex : true);
  const rest = (e) => (pages ? e.path.slice(2) : e.path);
  if (typeof state.sel === 'number') {
    const section = api.sections()[state.sel];
    return {
      title: `Chữ của khối: ${api.blockName(section)}`,
      list: entries.filter((e) => inPage(e) && rest(e)[0] === 'sections' && rest(e)[1] === state.sel),
    };
  }
  if (state.sel === 'header') {
    return {
      title: 'Chữ ở đầu trang và menu',
      list: entries.filter((e) => ['header', 'nav'].includes(e.path[0]) || (pages && inPage(e) && rest(e)[0] === 'header')),
    };
  }
  return {
    title: 'Chữ chung: tên, menu, chân trang, tiêu đề trang này',
    list: entries.filter((e) => !['pages', 'sections', 'catalog', 'credits'].includes(e.path[0])
      || (pages && inPage(e) && ['title', 'description'].includes(rest(e)[0]))),
    more: [
      ['Danh mục tour, phòng', entries.filter((e) => e.path[0] === 'catalog')],
      ['Nguồn ảnh', entries.filter((e) => e.path[0] === 'credits')],
    ],
  };
}

export function renderEnglish(pane) {
  const { h } = api;
  if (!tr()) {
    pane.replaceChildren(h('p', { class: 'ed-hint', text: 'Trang này chưa có bản tiếng Anh. Bấm "+ Thêm bản tiếng Anh" ở thanh trên, AI sẽ dịch cả website.' }));
    return;
  }
  const scope = scopeOf();
  const isOwnBrand = api.state.baseId === api.state.id;
  pane.replaceChildren(...[
    api.state.trBusy || api.state.trReport ? h('p', { class: 'ed-ai__status', 'aria-live': 'polite', text: api.state.trBusy ?? `Lần gần nhất: ${api.state.trReport}.` }) : null,
    h('div', { class: 'ed-row' },
      h('button', { type: 'button', class: 'ed-btn', disabled: Boolean(api.state.trBusy), onclick: finalCheck, text: 'Dịch và kiểm tra ngay' }),
      isOwnBrand ? h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', onclick: downloadEnglish, text: `Tải content.${LANG}.json` }) : null,
      h('button', { type: 'button', class: 'ed-btn ed-btn--danger', onclick: disable, text: 'Bỏ bản tiếng Anh' })),
    reviewEl(),
    h('h3', { class: 'ed-h', text: scope.title }),
    typeof api.state.sel !== 'number' ? h('p', { class: 'ed-hint', text: 'Bấm một khối trên trang để sửa chữ tiếng Anh của khối đó.' }) : null,
    scope.list.length ? h('ol', { class: 'ed-trs' }, scope.list.map(fieldEl)) : h('p', { class: 'ed-hint', text: 'Khối này không có chữ.' }),
    ...(scope.more ?? []).filter(([, list]) => list.length).map(([title, list]) => h('details', { class: 'ed-tr__more' },
      h('summary', { text: `${title} (${list.length} câu)` }),
      h('ol', { class: 'ed-trs' }, list.map(fieldEl)))),
  ].filter(Boolean));
}

function downloadEnglish() {
  const text = `${JSON.stringify(buildTranslation(api.state.content, tr().en), null, 2)}\n`;
  api.download(`content.${LANG}.json`, text, 'application/json');
}

/* ---------- Gắn vào editor ---------- */

// options: h, state, commit, persist, refresh, toast, openTab, sections, blockName, download.
export function mountEnglish(options) {
  api = options;
}
