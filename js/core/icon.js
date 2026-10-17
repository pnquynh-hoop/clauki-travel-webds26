/* icon.js - icon Lucide (giấy phép ISC) cho các component.
   Không tải cả bộ (hơn 350 KB): mỗi icon là một module nhỏ trên CDN, chỉ nạp những icon trang thật sự dùng.
   Dữ liệu ghi tên icon kiểu "bed-double" (tên trên lucide.dev). Mạng lỗi hay tên sai thì không có icon,
   chữ đi kèm vẫn hiện, nên trang không vỡ. */

const LUCIDE = 'https://unpkg.com/lucide@0.460.0/dist/esm';
// Mỗi icon chỉ nạp một lần, các khối dùng chung kết quả.
const loaded = new Map();

// Tên đến từ dữ liệu: chỉ nhận chữ thường, số, gạch nối, để dữ liệu không trỏ được tới tệp nào khác trên CDN.
const VALID_NAME = /^[a-z0-9-]+$/;

function loadIcon(name) {
  if (!loaded.has(name)) {
    const node = Promise.all([
      import(`${LUCIDE}/icons/${name}.js`),
      import(`${LUCIDE}/createElement.js`),
    ]).then(([icon, create]) => ({ node: icon.default, create: create.default }))
      .catch(() => null);
    loaded.set(name, node);
  }
  return loaded.get(name);
}

// Trả về ngay một <span> giữ chỗ (để bố cục không nhảy), icon vẽ vào khi nạp xong.
// Icon chỉ để nhìn, chữ bên cạnh mới là nội dung, nên ẩn khỏi trình đọc màn hình.
export function iconEl(name, className) {
  if (!name || !VALID_NAME.test(name)) return null;
  const span = document.createElement('span');
  span.className = className;
  span.setAttribute('aria-hidden', 'true');
  loadIcon(name).then((icon) => {
    if (icon) span.replaceChildren(icon.create(icon.node));
  });
  return span;
}
