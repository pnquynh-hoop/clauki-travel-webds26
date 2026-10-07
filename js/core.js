/* core.js - lõi white label:
   1. đọc brands/brands.json để biết có những thương hiệu nào;
   2. chọn thương hiệu theo ?brand=, chỉ nhận id có trong danh sách (không có thì dùng "default");
   3. gọi WebDesign2026.init (wd2026.js của BTC): nó tải brands/<id>/content.json và hiện nút đổi dữ liệu cho BGK;
   4. mỗi lần dữ liệu đổi: đổi href của <link id="brand-theme"> thành brands/<id>/theme.css, điền tiêu đề, mô tả, favicon;
   5. dựng các section trong <main> theo đúng thứ tự mảng "sections", bỏ qua section có "hidden": true (#5). */

const BRAND_LIST_URL = 'brands/brands.json';

// Báo lỗi ngay trên trang để người chạy thử biết phải sửa gì, thay vì chỉ thấy trang trắng.
function showError(message) {
  const note = document.createElement('p');
  note.className = 'load-error';
  note.textContent = message;
  document.getElementById('main').replaceChildren(note);
}

// Kiểm tra cấu trúc ngay khi đọc: sai ở đây thì báo rõ tên tệp, đỡ phải dò lỗi ở các bước sau.
async function loadBrandList() {
  const res = await fetch(BRAND_LIST_URL);
  if (!res.ok) {
    throw new Error(`Không tải được ${BRAND_LIST_URL} (mã ${res.status}).`);
  }
  const list = await res.json().catch(() => {
    throw new Error(`${BRAND_LIST_URL} sai cú pháp JSON.`);
  });
  if (!Array.isArray(list.brands) || list.brands.length === 0) {
    throw new Error(`${BRAND_LIST_URL} chưa có thương hiệu nào trong "brands".`);
  }
  return list;
}

export async function start() {
  try {
    const list = await loadBrandList();
    // Tạm in ra để kiểm tra; bước sau thay bằng chọn thương hiệu và gọi WebDesign2026.init.
    console.log('[core] danh sách thương hiệu:', list.brands);
  } catch (err) {
    showError(err.message);
    console.error(err);
  }
}
