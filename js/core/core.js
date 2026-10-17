/* core.js - lõi white label: đọc thương hiệu và trang từ đường dẫn (/<thương hiệu>/<trang>),
   rồi để wd2026.js (của BTC) tải content.json và hiện nút đổi dữ liệu cho BGK;
   mỗi lần đổi thương hiệu thì đổi màu, tiêu đề tab và dựng lại các khối của trang đang mở.
   Component không tải sẵn: trước khi dựng, core.js tải JS và CSS của đúng các khối trang đó dùng (bảng tra ở app.js). */

import { readDraft } from '../editor/draft.js';
import { applyTheme } from './theme-mode.js';
// Song ngữ: chọn ngôn ngữ, ghép bản dịch content.<lang>.json vào nội dung (xem chú thích đầu i18n.js).
import { localize, langFor, mergeTranslation, BASE_LANG } from './i18n.js';

// Mọi đường dẫn tính từ gốc: trang có thể nằm ở /ganh-som/phong, đường dẫn tương đối sẽ trỏ sai thư mục.
const DATA_ROOT = '/brands';
const BRAND_LIST_URL = `${DATA_ROOT}/brands.json`;
// Tên do wd2026.js đặt, phải khớp với mã của BTC.
const STORAGE_KEY = 'wd2026_active_file';
const CHANGE_EVENT = 'webdesign2026:datachange';
// Các khối luôn có sẵn trong index.html (đầu trang, chân trang, nút lên đầu trang), không nằm trong danh sách sections.
const FIXED_TAGS = ['wl-header', 'wl-footer', 'wl-to-top'];
const HOME = '/';
// Trang thương hiệu tự khai để hiện khi địa chỉ trỏ tới trang không có.
const NOT_FOUND = '404';

let currentId = null;
let currentPage = HOME;
let firstRender = true;
// Dữ liệu thô của thương hiệu đang mở, để chuyển sang trang khác cùng thương hiệu mà không phải tải lại.
let lastRaw = null;
// Khối nào cũng có thể phát wl:choose (detail.id là id sản phẩm trong danh mục) để khối đặt chỗ chọn sẵn.
// Khối đặt chỗ có thể nằm ở trang khác, lúc bấm chưa được dựng nên không nghe thấy: giữ lại lựa chọn,
// dựng xong trang mới thì phát lại một lần.
const CHOOSE_EVENT = 'wl:choose';
// Tên cũ: khối stays, offer, booking hiện còn dùng. core.js nhận cả hai và chuyển wl:choose sang tên cũ,
// để đổi tên dần từng khối mà không khối nào hỏng.
const LEGACY_CHOOSE = 'wl:choose-room';
let pendingChoice = null;
// Bảng tra component (app.js truyền vào) và các component đang tải, để một component chỉ tải một lần.
let registry = {};
const loading = new Map();
// Mỗi lần dựng mang một số; lần dựng cũ tải xong muộn hơn lần mới thì bỏ, không vẽ đè trang mới.
let renderToken = 0;
// Editor (#82): trang chạy trong khung của editor thì không hiện nút chỉnh sửa; editor báo nháp đổi bằng DRAFT_EVENT.
// Dựng xong mỗi lần thì phát RENDERED_EVENT (thương hiệu, trang, dữ liệu gốc) để editor và nút chỉnh sửa biết.
const IN_EDITOR = Boolean(window.frameElement?.hasAttribute('data-ed-frame'));
const DRAFT_EVENT = 'wl:draft';
const RENDERED_EVENT = 'wl:rendered';
let launcher = null;
let lastRendered = null;
// Nháp editor gửi thẳng qua DRAFT_EVENT: vẫn xem trước được khi trình duyệt chặn localStorage.
let editorDraft = null;
// Site khách (tạo bằng /tao): theme gồm base (thương hiệu làm khung) và vars; null là thương hiệu có sẵn.
let guestTheme = null;
// Site khách đã xuất bản là cố định: không dựng theo nháp trên máy, không mở editor (chỉ bản nháp /nhap/ sửa được).
let guestReadOnly = false;

// Trang trung tính của ClauKi khi địa chỉ site khách không có: câu báo, nút tạo website, nút xem các thương hiệu mẫu.
// CSS riêng (css/tool/no-site.css) chỉ tải khi cần.
function showNoSite(err, brands = []) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/css/tool/no-site.css';
  document.head.append(link);
  document.title = err.isDraft ? 'Chưa có bản nháp - ClauKi' : 'Không có website này - ClauKi';
  document.documentElement.classList.add('no-site-page');
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const button = (href, text, ghost) => {
    const a = el('a', ghost ? 'no-site__btn no-site__btn--ghost' : 'no-site__btn', text);
    a.href = href;
    return a;
  };
  const card = el('section', 'no-site');
  card.setAttribute('aria-labelledby', 'no-site-title');
  const title = el('h1', 'no-site__title', err.isDraft ? 'Chưa có bản nháp nào' : 'Không có website này');
  title.id = 'no-site-title';
  const lead = el('p', 'no-site__lead', err.isDraft
    ? 'Bản nháp nằm trên trình duyệt đã tạo ra nó. Máy này chưa có nháp nào, hãy tạo một website mới.'
    : `Địa chỉ /${err.slug}/ chưa có website nào. Có thể địa chỉ bị gõ nhầm, hoặc website đã được gỡ.`);
  const actions = el('div', 'no-site__actions');
  actions.append(button('/tao', 'Tạo website của bạn'), button('/', 'Về trang chủ', true));
  card.append(el('p', 'no-site__brand', 'ClauKi'), title, lead, actions);
  const samples = brands;
  if (samples.length) {
    const list = el('ul', 'no-site__list');
    samples.forEach((b) => {
      const li = el('li');
      li.append(button(`/${b.id}/`, b.label, true));
      list.append(li);
    });
    card.append(el('p', 'no-site__label', 'Hoặc xem các website mẫu'), list);
  }
  document.getElementById('main').replaceChildren(card);
}

function showError(err) {
  const note = document.createElement('p');
  note.textContent = err.message;
  document.getElementById('main').replaceChildren(note);
  console.error(err);
}

async function loadBrandList() {
  const res = await fetch(BRAND_LIST_URL);
  // fetch không coi 404 là lỗi, phải tự kiểm tra.
  if (!res.ok) {
    throw new Error(`Không tải được ${BRAND_LIST_URL} (mã ${res.status}).`);
  }
  return res.json();
}

// wd2026.js nối folder + '/' + file, nên file kèm luôn thư mục của thương hiệu.
function contentFile(id) {
  return `${id}/content.json`;
}

// "/phong/", "phong" và "" đều quy về một dạng để so sánh; trang chủ là "/".
function normalizePage(path) {
  const clean = String(path ?? '').replace(/^\/+|\/+$/g, '');
  return clean || HOME;
}

// Đọc thương hiệu và trang từ đường dẫn. Chỉ nhận id có trong danh sách để địa chỉ lạ không trỏ ra ngoài thư mục brands.
// ?brand= của địa chỉ cũ vẫn nhận, để link đã gửi trước đây không hỏng.
// Đoạn đầu không phải thương hiệu có sẵn nhưng đúng dạng tên site thì là site khách (/tao xuất bản), hoặc trang công cụ.
export const SITE_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;
const TOOL_PAGES = ['tao'];

function readLocation(ids) {
  // Tên miền con abc.xachbalo.com/nha được Cloudflare chuyển tới /s/abc/nha (Redirect Rule, xem FINAL_PLAN): đổi địa chỉ về /abc/nha,
  // dạng mọi link trong site khách dùng, rồi đọc như thường.
  const subdomain = location.pathname.match(/^\/s\/([^/]+)(\/.*)?$/);
  if (subdomain) history.replaceState(history.state, '', `/${subdomain[1]}${subdomain[2] ?? '/'}${location.search}${location.hash}`);
  const parts = location.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (parts.length && ids.includes(parts[0])) {
    return { id: parts[0], page: normalizePage(parts.slice(1).join('/')) };
  }
  if (parts.length && TOOL_PAGES.includes(parts[0])) return { tool: parts[0], page: HOME };
  if (parts.length && SITE_SLUG_RE.test(parts[0])) return { guest: parts[0], page: normalizePage(parts.slice(1).join('/')) };
  const legacy = new URLSearchParams(location.search).get('brand');
  return { id: ids.includes(legacy) ? legacy : null, page: HOME };
}

// wd2026.js không đọc địa chỉ và ưu tiên lựa chọn đã lưu, nên ghi thương hiệu trên địa chỉ vào chỗ nó đọc trước khi init.
function saveBrand(id) {
  if (id) localStorage.setItem(STORAGE_KEY, contentFile(id));
}

function pageUrl(id, page) {
  return page === HOME ? `/${id}/` : `/${id}/${page}`;
}

// Đường dẫn ảnh trong content.json tính từ thư mục thương hiệu; component gọi hàm này để ra đường dẫn thật.
// Đường dẫn tuyệt đối (ảnh của site khách lấy từ thư mục thương hiệu làm khung, ví dụ /brands/me-rach/images/...) và địa chỉ https (ảnh của
// site khách tìm theo nơi chốn) giữ nguyên.
export function asset(path) {
  // Logo, favicon tải lên trong editor là ảnh nhúng (data:image/...), dùng nguyên.
  if (typeof path === 'string' && (path.startsWith('/') || /^(https:\/\/|data:image\/)/.test(path))) return path;
  return `${DATA_ROOT}/${currentId}/${path}`;
}

// Thương hiệu chưa chuyển sang pages thì coi cả trang cũ là trang chủ, nên chuyển dần từng thương hiệu được.
function pagesOf(data) {
  return data.pages ?? [{ path: HOME, sections: data.sections ?? [] }];
}

function findPage(data, page) {
  return pagesOf(data).find((p) => normalizePage(p.path) === page);
}

// Trong dữ liệu, link sang trang khác ghi "page:phong" hoặc "page:/#dat-cho" để không phụ thuộc thương hiệu nằm ở đâu;
// đổi thành đường dẫn thật ở đây một lần, các component chỉ việc gán href như trước.
function resolveHref(href, id) {
  if (typeof href !== 'string' || !href.startsWith('page:')) return href;
  const [page, hash] = href.slice('page:'.length).split('#');
  return pageUrl(id, normalizePage(page)) + (hash ? `#${hash}` : '');
}

function resolveLinks(node, id) {
  if (Array.isArray(node)) return node.map((item) => resolveLinks(item, id));
  if (!node || typeof node !== 'object') return node;
  return Object.fromEntries(Object.entries(node).map(([key, value]) => (
    [key, key === 'href' ? resolveHref(value, id) : resolveLinks(value, id)]
  )));
}

// themeBase: site khách và nháp dùng theme.css của thương hiệu làm khung.
function applyBrand(data, page, themeBase) {
  currentId = data.id;
  document.getElementById('brand-theme').href = `${DATA_ROOT}/${themeBase ?? data.id}/theme.css`;
  // Trang con lấy tiêu đề riêng; trang chủ giữ tiêu đề chung của thương hiệu.
  const isHome = normalizePage(page.path) === HOME;
  document.title = isHome || !page.title ? data.meta.title : `${page.title} - ${data.brand?.name ?? data.meta.title}`;
  document.querySelector('meta[name="description"]').content = page.description ?? data.meta.description;
  // 'data:,' là favicon rỗng, để trình duyệt khỏi tự đi tìm /favicon.ico khi thương hiệu chưa có.
  document.querySelector('link[rel="icon"]').href = data.meta.favicon ? asset(data.meta.favicon) : 'data:,';

  // Giữ địa chỉ khớp với thương hiệu và trang đang mở: BGK đổi thương hiệu rồi tải lại trang thì vẫn đúng chỗ.
  history.replaceState(null, '', pageUrl(data.id, currentPage) + location.hash);
}

// Thông tin chung của thương hiệu mà khối nào cũng có thể cần (tên, menu, CTA, nơi chốn, liên hệ, danh mục
// sản phẩm), gom lại một chỗ để đưa cho mọi khối, khỏi phải chép vào dữ liệu từng section.
// home là đường dẫn trang chủ của thương hiệu, để logo ở trang con dẫn về trang chủ.
function siteInfo(data) {
  return {
    brand: data.brand, cta: data.cta, nav: data.nav, place: data.place, contact: data.contact,
    catalog: data.catalog,
    home: pageUrl(data.id, HOME),
    // Ngôn ngữ đang hiện và các ngôn ngữ thương hiệu có: header dùng để vẽ nút đổi ngôn ngữ.
    lang: document.documentElement.lang || BASE_LANG,
    // Trong khung editor không có nút đổi ngôn ngữ: khung luôn là tiếng Việt, bấm EN sẽ không đổi gì.
    languages: IN_EDITOR ? undefined : data.languages,
  };
}

// Tra một sản phẩm (tour, hạng phòng) trong danh mục theo id: khối chỉ cần ghi "item": "<id>"
// là lấy được tên, ảnh, giá, khỏi chép lại ở từng section.
export function catalogItem(site, id) {
  return site?.catalog?.items?.find((item) => item.id === id);
}

/* ---------- Tải component khi cần ---------- */

// CSS của component (name: đường dẫn trong components/ không có đuôi, ví dụ hero/hero-ride) chèn trước theme của brand, giữ đúng thứ tự cũ (style component trước, biến của brand sau).
function loadCss(name) {
  if (document.querySelector(`link[data-component-css="${name}"]`)) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `/components/${name}.css`;
    link.dataset.componentCss = name;
    // Lỗi tải CSS không chặn trang: khối vẫn hiện, chỉ thiếu style.
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.getElementById('brand-theme').before(link);
  });
}

// Tải JS và CSS của một thẻ rồi đăng ký; thẻ không có trong bảng tra thì bỏ qua (hasComponent sẽ báo).
function loadComponent(tag) {
  const entry = registry[tag];
  if (customElements.get(tag) || !entry) return Promise.resolve();
  if (!loading.has(tag)) {
    const job = Promise.all([entry.load(), ...(entry.css ?? []).map(loadCss)])
      .then(([Component]) => {
        if (!customElements.get(tag)) customElements.define(tag, Component);
      })
      .catch((err) => {
        // Tải hỏng thì cho lần sau thử lại.
        loading.delete(tag);
        console.error(`Không tải được <${tag}>:`, err);
      });
    loading.set(tag, job);
  }
  return loading.get(tag);
}

// Các thẻ một trang cần: khối cố định và các loại khối không ẩn của trang.
function tagsOf(page) {
  const types = (page.sections ?? []).filter((section) => !section.hidden).map((section) => `wl-${section.type}`);
  return [...new Set([...FIXED_TAGS, ...types])];
}

// Phải gán site trước: dòng el.data = section làm khối vẽ ngay lập tức,
// nếu lúc đó chưa có site thì khối vẽ ra thiếu nút CTA và không tự vẽ lại.
function createSection(section, site) {
  const el = document.createElement(`wl-${section.type}`);
  // Đặt id để bấm menu (href="#dat-cho") là trang cuộn tới khối này; làm ở đây cho mọi khối.
  if (section.id) el.id = section.id;
  el.site = site;
  el.data = section;
  return el;
}

// JSON có thể ghi một loại khối chưa ai viết code (ví dụ gõ nhầm type).
// Khi đó bỏ qua khối và báo trong console, để biết vì sao khối không hiện.
function hasComponent(section) {
  if (customElements.get(`wl-${section.type}`)) return true;
  console.warn(`Bỏ qua section "${section.id ?? section.type}": chưa có component <wl-${section.type}>.`);
  return false;
}

// Xoá hết khối cũ rồi mới đặt khối mới, nên đổi thương hiệu hay trang không bị lặp hay sót khối.
// Mỗi khối mang số thứ tự của nó trong sections (kể cả khối ẩn), để editor biết bấm vào khối nào là sửa mục nào.
function renderSections(data, page) {
  const site = siteInfo(data);
  const blocks = (page.sections ?? [])
    .map((section, index) => ({ section, index }))
    .filter(({ section }) => !section.hidden && hasComponent(section))
    .map(({ section, index }) => {
      const el = createSection(section, site);
      el.dataset.section = String(index);
      return el;
    });
  document.getElementById('main').replaceChildren(...blocks);
}

// Mỗi khối cố định cần một phần khác nhau (đầu trang cần menu, chân trang cần nguồn ảnh), nên đưa cả tệp.
// Trang có thể khai header riêng (ví dụ landing page dùng header rút gọn): ghi đè lên header chung của brand.
function renderFixed(data, page) {
  const site = siteInfo(data);
  const withHeader = page.header ? { ...data, header: { ...data.header, ...page.header } } : data;
  for (const tag of FIXED_TAGS) {
    const el = document.querySelector(tag);
    // Trang khác có thể thiếu thẻ này, hoặc thẻ chưa có ai viết code: bỏ qua.
    // Không gán vào thẻ chưa có code: gán trước khi đăng ký thì khối sẽ không bao giờ tự vẽ.
    if (!el || !customElements.get(tag)) continue;
    el.site = site;
    el.data = tag === 'wl-header' ? withHeader : data;
  }
}

// Mục menu trỏ đúng trang đang mở (không phải neo tới một khối) được đánh dấu cho trình đọc màn hình và CSS.
function markCurrentPage() {
  const root = `/${currentId}`;
  const path = location.pathname.replace(/\/$/, '');
  for (const a of document.querySelectorAll('wl-header a[href], wl-footer a[href]')) {
    const same = a.origin === location.origin && a.getAttribute('href') !== '#';
    // Link chỉ có "#" (ví dụ nút mở menu) trỏ về chính trang nhưng không phải mục menu của trang.
    const here = same && a.pathname === location.pathname && !a.hash;
    if (here) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
    // Trang con không có trong menu (ví dụ tour/can-gio) thì mục menu của trang cha (tour) được đánh dấu nhẹ hơn (data-parent):
    // mục trỏ về trang chủ không tính, vì trang nào cũng nằm dưới trang chủ.
    const base = a.pathname.replace(/\/$/, '');
    const parent = same && !here && !a.hash && a.closest('wl-header') && base !== root && path.startsWith(`${base}/`);
    if (parent) a.setAttribute('data-parent', '');
    else a.removeAttribute('data-parent');
  }
}

// Khối được dựng sau khi trang tải xong nên trình duyệt không tự cuộn tới #neo trên địa chỉ
// (ví dụ đi từ trang con về /ganh-som/#dat-cho); cuộn giúp một lần ở lần dựng đầu.
function scrollToHash() {
  if (!location.hash) return;
  requestAnimationFrame(() => document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView());
}

// Trang đã dựng lại xong ngay khi đổi thương hiệu (không cần tải lại), nên bỏ qua câu hỏi "tải lại trang?" của wd2026.js:
// chờ hộp thoại vẽ xong màn xác nhận rồi bấm giúp nút "Để sau" (chỉ đóng hộp, không sửa wd2026.js), đưa trang về đầu
// để thấy thương hiệu mới từ hero. Lần nạp đầu không có hộp thoại nên không làm gì.
function skipReloadPrompt() {
  setTimeout(() => {
    const later = document.getElementById('wd2026BtnLater');
    if (!later) return;
    later.click();
    scrollTo({ top: 0, behavior: 'instant' });
  });
}

function onChoose(e) {
  if (e.detail?.replayed || e.detail?.bridged) return;
  pendingChoice = document.querySelector('wl-booking') ? null : e.detail;
}

// Khối đặt chỗ hiện nghe tên cũ: phát kèm tên cũ cho mỗi wl:choose.
function bridgeChoose(e) {
  document.dispatchEvent(new CustomEvent(LEGACY_CHOOSE, { detail: { ...e.detail, bridged: true } }));
}

function replayChoice() {
  if (!pendingChoice) return;
  const detail = { ...pendingChoice, replayed: true };
  pendingChoice = null;
  document.dispatchEvent(new CustomEvent(CHOOSE_EVENT, { detail }));
}

// Nháp chỉnh sửa của thương hiệu này: trong khung editor lấy bản editor vừa gửi, ngoài ra đọc trên máy.
function draftFor(raw) {
  if (guestReadOnly) return null;
  if (IN_EDITOR && editorDraft?.content?.id === raw.id) return editorDraft;
  return readDraft(raw.id, raw);
}

/* Nội dung theo ngôn ngữ của lần dựng này:
   - khung editor: theo công tắc ngôn ngữ của editor (draft.view), không theo lần chọn trước của khách;
   - nháp ngoài editor: theo ngôn ngữ khách chọn nếu nháp có bản dịch (editor gửi kèm draft.translation), không thì
     tiếng Việt, vì bản dịch trong file có thể chưa khớp chữ vừa sửa;
   - không có nháp: ghép bản dịch của thương hiệu như thường. */
async function localized(raw, draft) {
  const fromDraft = (content, lang) => (lang !== BASE_LANG && draft?.translation
    ? { lang, source: mergeTranslation(content, draft.translation) }
    : { lang: BASE_LANG, source: content });
  if (IN_EDITOR) return fromDraft(draft?.content ?? raw, draft?.view ?? BASE_LANG);
  if (draft) return fromDraft(draft.content, langFor(draft.content));
  return { lang: langFor(raw), source: await localize(raw, DATA_ROOT) };
}

async function render(raw, useDraft = true) {
  const token = ++renderToken;
  lastRaw = raw;
  // Thương hiệu đang có nháp chỉnh sửa thì dựng theo nháp; lastRaw vẫn giữ bản gốc để về bản gốc được.
  const draft = useDraft ? draftFor(raw) : null;
  const { lang, source } = await localized(raw, draft);
  if (token !== renderToken) return;
  document.documentElement.lang = lang;
  const data = resolveLinks(source, raw.id);
  // Đổi thương hiệu thì giữ trang đang mở; thương hiệu mới không có trang đó thì hiện trang 404 nó tự khai,
  // không khai thì về trang chủ.
  let page = findPage(data, currentPage);
  if (!page) {
    page = findPage(data, NOT_FOUND);
    if (!page) {
      currentPage = HOME;
      page = findPage(data, HOME);
    }
  }
  // Tải đủ component của trang rồi mới dựng, để khối nào cũng hiện ngay lần đầu, không bị bỏ qua vì chưa đăng ký.
  await Promise.all(tagsOf(page).map(loadComponent));
  if (token !== renderToken) return;
  // applyBrand chạy trước: nó ghi nhớ thương hiệu đang chọn, các khối cần điều đó để lấy đúng ảnh.
  const theme = draft?.theme ?? guestTheme;
  applyBrand(data, page, theme?.base);
  // Biến của nháp, rồi bảng màu tối nếu thương hiệu có và khách đang chọn chế độ tối (theme-mode.js).
  applyTheme(theme);
  try {
    renderSections(data, page);
    renderFixed(data, page);
  } catch (err) {
    // Nháp hỏng cấu trúc thì dựng lại theo bản gốc, để trang khách không trắng và vẫn có nút về bản gốc.
    if (!draft) throw err;
    console.warn('Nháp chỉnh sửa lỗi, dựng theo bản gốc:', err);
    return render(raw, false);
  }
  markCurrentPage();
  replayChoice();
  if (firstRender) scrollToHash();
  firstRender = false;
  // page là trang thật sự đã dựng (ví dụ "404" khi địa chỉ trỏ tới trang không có), để editor sửa đúng trang đó.
  // guest và base: site khách (không phải thương hiệu có sẵn) và thương hiệu làm khung của nó, để nút chỉnh sửa và editor biết.
  lastRendered = { id: raw.id, page: normalizePage(page.path), raw, draft: Boolean(draft), guest: Boolean(guestTheme), base: guestTheme?.base ?? null, theme: guestTheme };
  document.dispatchEvent(new CustomEvent(RENDERED_EVENT, { detail: lastRendered }));
  // Trong khung editor thì báo cả lên thẻ iframe: editor nghe một lần ở đó, không phụ thuộc lúc khung tải.
  if (IN_EDITOR) window.frameElement.dispatchEvent(new CustomEvent(RENDERED_EVENT, { detail: lastRendered }));
  if (!IN_EDITOR) mountLauncher();
}

// Về bản gốc (nháp đã xoá): trang đang mở chỉ có trong nháp (trang thêm khi thử) thì về trang chủ.
function resetDraft() {
  if (!findPage(lastRaw, currentPage)) currentPage = HOME;
  return render(lastRaw).catch(showError);
}

// Nút chỉnh sửa và dải báo đang thử nháp: tải sau khi trang đã dựng, không làm chậm lần hiện đầu tiên.
function mountLauncher() {
  launcher ??= import('../editor/launch.js')
    .then((m) => m.mountLauncher({ current: lastRendered, reset: resetDraft }))
    .catch((err) => console.error('Không tải được nút chỉnh sửa:', err));
}

// Link trỏ tới một trang khác của cùng thương hiệu thì trả về trang đó; link ra ngoài, sang thương hiệu khác,
// mở tab mới hay chỉ nhảy #neo trong trang đang mở thì để trình duyệt tự xử lý.
function samebrandPage(a) {
  if (!a || !currentId || a.hasAttribute('download') || (a.target && a.target !== '_self')) return null;
  const url = new URL(a.href, location.href);
  // Link có phần ?... khác trang hiện tại (ví dụ nút chỉnh sửa trỏ tới ?sua để mở editor) thì để trình duyệt mở hẳn.
  if (url.search !== location.search) return null;
  const root = `/${currentId}`;
  if (url.origin !== location.origin || !(url.pathname === root || url.pathname.startsWith(`${root}/`))) return null;
  const page = normalizePage(decodeURIComponent(url.pathname.slice(root.length)));
  // Cùng trang mà có #neo thì trình duyệt tự cuộn tới khối; để nguyên.
  if (page === currentPage && url.hash) return null;
  return { page, hash: url.hash };
}

// Đổi trang tại chỗ: không tải lại content.json hay wd2026.js, nên nhanh, và chuyển mượt bằng View Transitions
// (trình duyệt không hỗ trợ hoặc bật giảm chuyển động thì đổi ngay). push = false khi đi bằng nút Back, Forward.
function goToPage(page, hash, push) {
  // update trả về promise: View Transitions đợi trang mới dựng xong (kể cả lúc tải component) rồi mới chuyển.
  const update = async () => {
    currentPage = page;
    if (push) history.pushState(null, '', pageUrl(currentId, page) + hash);
    await render(lastRaw);
    if (hash) scrollToHash();
    else scrollTo({ top: 0, behavior: 'instant' });
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (document.startViewTransition && !reduce) document.startViewTransition(update);
  else update();
}

function onLinkClick(e) {
  // Bấm giữ Ctrl, Cmd, Shift hay chuột giữa là muốn mở tab mới: để trình duyệt làm.
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const target = samebrandPage(e.target.closest('a[href]'));
  if (!target || !lastRaw) return;
  e.preventDefault();
  // Link về chính trang đang mở (ví dụ bấm logo khi đang ở /ganh-som/#dat-phong): bỏ #neo và cuộn lên đầu,
  // không để trình duyệt tải lại cả trang chỉ vì địa chỉ mất phần #.
  if (target.page === currentPage) {
    history.pushState(null, '', pageUrl(currentId, currentPage));
    scrollTo({ top: 0 });
    return;
  }
  goToPage(target.page, target.hash, true);
}

// Nút Back, Forward: cùng thương hiệu thì đổi trang tại chỗ; khác thương hiệu thì tải lại cho chắc.
// Chỉ đổi #neo trong cùng trang thì trình duyệt tự cuộn, không làm gì.
function onPopState() {
  const parts = location.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] !== currentId) {
    location.reload();
    return;
  }
  const page = normalizePage(parts.slice(1).join('/'));
  if (page !== currentPage) goToPage(page, location.hash, false);
}

// Site khách: đọc từ nháp trên máy (/nhap/) hoặc Supabase, dựng thẳng, không qua nút đổi thương hiệu của BTC.
// Trình tạo web mở /nhap/ trong khung (data-ed-frame) và gửi nháp mới bằng DRAFT_EVENT khi AI đang viết.
async function startGuest(here, ids) {
  const { loadSite, RESERVED, DRAFT_SLUG } = await import('../site/sites.js');
  const isDraft = here.guest === DRAFT_SLUG;
  // Không có site (gõ nhầm, đã gỡ, chưa có nháp): báo bằng trang trung tính của ClauKi, không mượn giao diện thương hiệu nào.
  const missing = () => Object.assign(new Error(isDraft ? 'Chưa có bản nháp.' : `Không có trang /${here.guest}/.`), { kind: 'no-site', slug: here.guest, isDraft });
  if (RESERVED.includes(here.guest) && !isDraft) throw missing();
  const site = await loadSite(here.guest);
  if (!site) throw missing();
  guestTheme = site.theme?.base && ids.includes(site.theme.base) ? site.theme : { ...site.theme, base: ids[0] };
  guestReadOnly = !isDraft;
  currentPage = here.page;
  listenPage();
  listenDraft();
  listenLang();
  await render({ ...site.content, id: here.guest });
}

// Chọn sẵn sản phẩm, đổi trang tại chỗ, nút Back, Forward: chung cho thương hiệu có sẵn và site khách.
function listenPage() {
  document.addEventListener(CHOOSE_EVENT, onChoose);
  document.addEventListener(CHOOSE_EVENT, bridgeChoose);
  document.addEventListener(LEGACY_CHOOSE, onChoose);
  document.addEventListener('click', onLinkClick);
  addEventListener('popstate', onPopState);
}

// Khách đổi ngôn ngữ (nút ở header): dựng lại trang đang mở bằng bản dịch, không tải lại trang.
// Chung cho thương hiệu có sẵn và site khách: site khách rẽ sang startGuest từ sớm, thiếu chỗ này thì bấm EN không có gì xảy ra.
function listenLang() {
  document.addEventListener('wl:lang', () => {
    if (lastRaw) render(lastRaw).catch(showError);
  });
}

// Trong khung của editor, trình tạo web: nhận nháp mới qua DRAFT_EVENT rồi dựng lại trang đang mở.
function listenDraft() {
  if (!IN_EDITOR) return;
  document.addEventListener(DRAFT_EVENT, (e) => {
    editorDraft = e.detail ?? null;
    if (lastRaw) render(lastRaw).catch(showError);
  });
}

// Ảnh trên nút tròn của BTC (tuỳ chọn logoSrc của wd2026.js, thay chữ cái đầu tên thương hiệu): bốn ô vuông như icon layout-grid
// của Lucide, nét trắng, lề rộng để icon khoảng 24px giữa nút 52px, giống icon bút của nút chỉnh sửa trên site khách. Bấm nút mở menu
// Đổi thương hiệu, Tạo mới, Chỉnh sửa (launch.js).
const FAB_ICON = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-14 -14 52 52" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>')}`;

// components: bảng tra thẻ, cách tải JS, các file CSS (khai ở app.js).
export async function start(components = {}) {
  registry = components;
  // Giữ danh sách thương hiệu ngoài try để trang báo không có site (showNoSite) liệt kê được các website mẫu.
  let brandList = null;
  try {
    const list = await loadBrandList();
    brandList = list;
    const ids = list.brands.map((b) => b.id);
    const here = readLocation(ids);
    if (here.tool === 'tao') {
      const { openBuilder } = await import('../create/create.js');
      openBuilder({ brands: list.brands });
      return;
    }
    // Địa chỉ có ?sua: mở editor; trang thật chạy trong khung của editor, nên trang ngoài không dựng gì.
    // Bản nháp /nhap/ của trình tạo web cũng sửa được (nháp trên máy này).
    let wantsEditor = new URLSearchParams(location.search).has('sua') && !IN_EDITOR;
    // Site khách đã xuất bản không sửa được: bỏ ?sua khỏi địa chỉ rồi dựng như trang xem bình thường.
    if (wantsEditor && here.guest && here.guest !== (await import('../site/sites.js')).DRAFT_SLUG) {
      history.replaceState(history.state, '', location.pathname + location.hash);
      wantsEditor = false;
    }
    if (wantsEditor) {
      const { openEditor } = await import('../editor/editor.js');
      openEditor({ brands: list.brands, id: here.guest ?? here.id ?? list.default, page: here.page });
      return;
    }
    if (here.guest) {
      await startGuest(here, ids);
      return;
    }
    listenDraft();
    currentPage = here.page;
    saveBrand(here.id);
    listenPage();
    listenLang();
    // Gắn trước init vì init bắn sự kiện ngay lần nạp đầu.
    // Lỗi trong listener không lọt ra try bên ngoài, nên phải bắt riêng.
    document.addEventListener(CHANGE_EVENT, (e) => {
      render(e.detail).then(skipReloadPrompt).catch(showError);
    });
    window.WebDesign2026.init({
      folder: DATA_ROOT,
      files: ids.map(contentFile),
      labels: list.brands.map((b) => b.label ?? b.id),
      defaultIndex: ids.indexOf(list.default),
      overrideCss: false,
      logoSrc: FAB_ICON,
    });
  } catch (err) {
    if (err.kind === 'no-site') showNoSite(err, brandList?.brands);
    else showError(err);
  }
}
