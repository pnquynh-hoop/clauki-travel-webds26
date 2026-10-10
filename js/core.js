/* core.js - lõi white label: đọc danh sách thương hiệu, chọn thương hiệu theo ?brand=,
   rồi để wd2026.js (của BTC) tải content.json và hiện nút đổi dữ liệu cho BGK;
   mỗi lần đổi thương hiệu thì đổi màu, tiêu đề tab và dựng lại các khối trong <main>. */

const BRAND_LIST_URL = 'brands/brands.json';
// Tên do wd2026.js đặt, phải khớp với mã của BTC.
const STORAGE_KEY = 'wd2026_active_file';
const CHANGE_EVENT = 'webdesign2026:datachange';
// Ba khối luôn có sẵn trong index.html, không nằm trong danh sách sections.
const FIXED_TAGS = ['wl-header', 'wl-footer', 'wl-sticky-cta', 'wl-to-top'];

let currentId = null;

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

// wd2026.js không đọc địa chỉ và ưu tiên lựa chọn đã lưu, nên ghi ?brand= vào chỗ nó đọc trước khi init.
// Chỉ nhận id có trong danh sách để ?brand=../../abc không trỏ ra ngoài thư mục brands.
function saveBrandFromUrl(ids, defaultId) {
  const wanted = new URLSearchParams(location.search).get('brand');
  if (wanted === null) return;
  const id = ids.includes(wanted) ? wanted : defaultId;
  localStorage.setItem(STORAGE_KEY, contentFile(id));
}

// Đường dẫn ảnh trong content.json tính từ thư mục thương hiệu; component gọi hàm này để ra đường dẫn thật.
export function asset(path) {
  return `brands/${currentId}/${path}`;
}

function applyBrand(data) {
  currentId = data.id;
  document.getElementById('brand-theme').href = `brands/${data.id}/theme.css`;
  document.title = data.meta.title;
  document.querySelector('meta[name="description"]').content = data.meta.description;
  // 'data:,' là favicon rỗng, để trình duyệt khỏi tự đi tìm /favicon.ico khi thương hiệu chưa có.
  document.querySelector('link[rel="icon"]').href = data.meta.favicon ? asset(data.meta.favicon) : 'data:,';

  // Giữ ?brand= khớp với thương hiệu đang dùng, nếu không thì BGK đổi trong hộp chọn rồi tải lại trang
  // sẽ bị ?brand= cũ kéo về thương hiệu trước.
  const url = new URL(location.href);
  url.searchParams.set('brand', data.id);
  history.replaceState(null, '', url);
}

// Thông tin chung của thương hiệu mà khối nào cũng có thể cần (tên, menu, CTA, nơi chốn, liên hệ),
// gom lại một chỗ để đưa cho mọi khối, khỏi phải chép vào dữ liệu từng section.
function siteInfo(data) {
  return { brand: data.brand, cta: data.cta, nav: data.nav, place: data.place, contact: data.contact };
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

// Xoá hết khối cũ rồi mới đặt khối mới, nên đổi thương hiệu không bị lặp hay sót khối.
function renderSections(data) {
  const site = siteInfo(data);
  // Thương hiệu chưa có sections thì coi như danh sách rỗng.
  const blocks = (data.sections ?? [])
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

export async function start() {
  try {
    const list = await loadBrandList();
    const ids = list.brands.map((b) => b.id);
    saveBrandFromUrl(ids, list.default);
    // Gắn trước init vì init bắn sự kiện ngay lần nạp đầu.
    // Lỗi trong listener không lọt ra try bên ngoài, nên phải bắt riêng.
    document.addEventListener(CHANGE_EVENT, (e) => {
      try {
        // applyBrand chạy trước: nó ghi nhớ thương hiệu đang chọn, các khối cần điều đó để lấy đúng ảnh.
        applyBrand(e.detail);
        renderSections(e.detail);
        renderFixed(e.detail);
      } catch (err) {
        showError(err);
      }
    });
    window.WebDesign2026.init({
      folder: 'brands',
      files: ids.map(contentFile),
      labels: list.brands.map((b) => b.label ?? b.id),
      defaultIndex: ids.indexOf(list.default),
      overrideCss: false,
    });
  } catch (err) {
    showError(err);
  }
}
