/* core.js - lõi white label: đọc thương hiệu và trang từ đường dẫn (/<thương hiệu>/<trang>),
   rồi để wd2026.js (của BTC) tải content.json và hiện nút đổi dữ liệu cho BGK;
   mỗi lần đổi thương hiệu thì đổi màu, tiêu đề tab và dựng lại các khối của trang đang mở. */

// Mọi đường dẫn tính từ gốc: trang có thể nằm ở /ganh-som/phong, đường dẫn tương đối sẽ trỏ sai thư mục.
const DATA_ROOT = '/brands';
const BRAND_LIST_URL = `${DATA_ROOT}/brands.json`;
// Tên do wd2026.js đặt, phải khớp với mã của BTC.
const STORAGE_KEY = 'wd2026_active_file';
const CHANGE_EVENT = 'webdesign2026:datachange';
// Ba khối luôn có sẵn trong index.html, không nằm trong danh sách sections.
const FIXED_TAGS = ['wl-header', 'wl-footer', 'wl-sticky-cta', 'wl-to-top'];
const HOME = '/';
// Trang thương hiệu tự khai để hiện khi địa chỉ trỏ tới trang không có.
const NOT_FOUND = '404';

let currentId = null;
let currentPage = HOME;
let firstRender = true;

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
function readLocation(ids) {
  const parts = location.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (parts.length && ids.includes(parts[0])) {
    return { id: parts[0], page: normalizePage(parts.slice(1).join('/')) };
  }
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
export function asset(path) {
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

function applyBrand(data, page) {
  currentId = data.id;
  document.getElementById('brand-theme').href = `${DATA_ROOT}/${data.id}/theme.css`;
  // Trang con lấy tiêu đề riêng; trang chủ giữ tiêu đề chung của thương hiệu.
  const isHome = normalizePage(page.path) === HOME;
  document.title = isHome || !page.title ? data.meta.title : `${page.title} - ${data.brand?.name ?? data.meta.title}`;
  document.querySelector('meta[name="description"]').content = page.description ?? data.meta.description;
  // 'data:,' là favicon rỗng, để trình duyệt khỏi tự đi tìm /favicon.ico khi thương hiệu chưa có.
  document.querySelector('link[rel="icon"]').href = data.meta.favicon ? asset(data.meta.favicon) : 'data:,';

  // Giữ địa chỉ khớp với thương hiệu và trang đang mở: BGK đổi thương hiệu rồi tải lại trang thì vẫn đúng chỗ.
  history.replaceState(null, '', pageUrl(data.id, currentPage) + location.hash);
}

// Thông tin chung của thương hiệu mà khối nào cũng có thể cần (tên, menu, CTA, nơi chốn, liên hệ),
// gom lại một chỗ để đưa cho mọi khối, khỏi phải chép vào dữ liệu từng section.
// home là đường dẫn trang chủ của thương hiệu, để logo ở trang con dẫn về trang chủ.
function siteInfo(data) {
  return {
    brand: data.brand, cta: data.cta, nav: data.nav, place: data.place, contact: data.contact,
    home: pageUrl(data.id, HOME),
  };
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

// JSON có thể ghi một loại khối chưa ai viết code (ví dụ booking).
// Khi đó bỏ qua khối và báo trong console, để biết vì sao khối không hiện.
function hasComponent(section) {
  if (customElements.get(`wl-${section.type}`)) return true;
  console.warn(`Bỏ qua section "${section.id ?? section.type}": chưa có component <wl-${section.type}>.`);
  return false;
}

// Xoá hết khối cũ rồi mới đặt khối mới, nên đổi thương hiệu hay trang không bị lặp hay sót khối.
function renderSections(data, page) {
  const site = siteInfo(data);
  const blocks = (page.sections ?? [])
    .filter((section) => !section.hidden)
    .filter(hasComponent)
    .map((section) => createSection(section, site));
  document.getElementById('main').replaceChildren(...blocks);
}

// Mỗi khối cố định cần một phần khác nhau (đầu trang cần menu, chân trang cần nguồn ảnh), nên đưa cả tệp.
function renderFixed(data) {
  const site = siteInfo(data);
  for (const tag of FIXED_TAGS) {
    const el = document.querySelector(tag);
    // Trang khác có thể thiếu thẻ này, hoặc thẻ chưa có ai viết code: bỏ qua.
    // Không gán vào thẻ chưa có code: gán trước khi đăng ký thì khối sẽ không bao giờ tự vẽ.
    if (!el || !customElements.get(tag)) continue;
    el.site = site;
    el.data = data;
  }
}

// Mục menu trỏ đúng trang đang mở (không phải neo tới một khối) được đánh dấu cho trình đọc màn hình và CSS.
function markCurrentPage() {
  for (const a of document.querySelectorAll('wl-header a[href], wl-footer a[href]')) {
    // Link chỉ có "#" (ví dụ nút mở menu) trỏ về chính trang nhưng không phải mục menu của trang.
    const here = a.getAttribute('href') !== '#'
      && a.origin === location.origin && a.pathname === location.pathname && !a.hash;
    if (here) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
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

function render(raw) {
  const data = resolveLinks(raw, raw.id);
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
  // applyBrand chạy trước: nó ghi nhớ thương hiệu đang chọn, các khối cần điều đó để lấy đúng ảnh.
  applyBrand(data, page);
  renderSections(data, page);
  renderFixed(data);
  markCurrentPage();
  if (firstRender) scrollToHash();
  firstRender = false;
}

export async function start() {
  try {
    const list = await loadBrandList();
    const ids = list.brands.map((b) => b.id);
    const here = readLocation(ids);
    currentPage = here.page;
    saveBrand(here.id);
    // Gắn trước init vì init bắn sự kiện ngay lần nạp đầu.
    // Lỗi trong listener không lọt ra try bên ngoài, nên phải bắt riêng.
    document.addEventListener(CHANGE_EVENT, (e) => {
      try {
        render(e.detail);
        skipReloadPrompt();
      } catch (err) {
        showError(err);
      }
    });
    window.WebDesign2026.init({
      folder: DATA_ROOT,
      files: ids.map(contentFile),
      labels: list.brands.map((b) => b.label ?? b.id),
      defaultIndex: ids.indexOf(list.default),
      overrideCss: false,
    });
  } catch (err) {
    showError(err);
  }
}
