/* core.js - lõi white label: đọc danh sách thương hiệu, chọn thương hiệu theo ?brand=,
   rồi để wd2026.js (của BTC) tải content.json và hiện nút đổi dữ liệu cho BGK. */

const BRAND_LIST_URL = 'brands/brands.json';
// Tên do wd2026.js đặt, phải khớp với mã của BTC.
const STORAGE_KEY = 'wd2026_active_file';
const CHANGE_EVENT = 'webdesign2026:datachange';

function showError(message) {
  const note = document.createElement('p');
  note.textContent = message;
  document.getElementById('main').replaceChildren(note);
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

// Tạm in ra để kiểm tra; bước sau thay bằng đổi theme.css, điền meta và dựng section.
function applyBrand(data) {
  console.log('[core] đang dùng thương hiệu:', data.id);
}

export async function start() {
  try {
    const list = await loadBrandList();
    const ids = list.brands.map((b) => b.id);
    saveBrandFromUrl(ids, list.default);
    // Gắn trước init vì init bắn sự kiện ngay lần nạp đầu.
    document.addEventListener(CHANGE_EVENT, (e) => applyBrand(e.detail));
    window.WebDesign2026.init({
      folder: 'brands',
      files: ids.map(contentFile),
      labels: list.brands.map((b) => b.label ?? b.id),
      defaultIndex: ids.indexOf(list.default),
      overrideCss: false,
    });
  } catch (err) {
    showError(err.message);
    console.error(err);
  }
}
