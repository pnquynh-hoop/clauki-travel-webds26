/* logo.js - logo của thương hiệu hay site khách trong editor: tải logo từ máy, hoặc tạo logo chữ từ tên.
   Logo không thành file trên máy chủ: trình duyệt thu nhỏ (cao tối đa MAX_H, rộng tối đa MAX_W) rồi đổi thành chuỗi
   data:image/webp nằm ngay trong dữ liệu site (brand.logo), kèm favicon vuông 64px (meta.favicon). Xuất bản thì đi cùng dòng của
   site trong bảng sites; supabase/sites.sql chỉ nhận chuỗi ảnh nhúng ở ba trường logo, favicon và dưới LIMIT ký tự.
   Không nhận SVG (có thể chứa mã). Logo chữ vẽ trong document của khung xem trước để dùng đúng font của trang. */

const MAX_H = 200;
const MAX_W = 640;
const ICON = 64;
// Khớp giới hạn trong site_ok của supabase/sites.sql.
export const LIMIT = 60000;
const TYPES = /^image\/(png|jpeg|webp)$/;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Không đọc được ảnh này.'));
    img.src = src;
  });
}

function canvasOf(doc, width, height) {
  const canvas = (doc ?? document).createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

// WebP nhỏ hơn PNG nhiều; trình duyệt không xuất được WebP thì toDataURL trả PNG, vẫn hợp lệ.
const encode = (canvas, quality) => canvas.toDataURL('image/webp', quality);

// Ảnh vuông 64px cho favicon: ảnh đặt giữa, giữ tỉ lệ.
function iconOf(source, width, height, doc) {
  const canvas = canvasOf(doc, ICON, ICON);
  const scale = Math.min(ICON / width, ICON / height);
  canvas.getContext('2d').drawImage(source, (ICON - width * scale) / 2, (ICON - height * scale) / 2, width * scale, height * scale);
  return encode(canvas, 0.9);
}

// Logo từ file trên máy: thu nhỏ, giảm chất lượng dần cho tới khi vừa LIMIT. Trả về { logo, favicon }.
export async function fileToLogo(file) {
  if (!file || !TYPES.test(file.type)) throw new Error('Chỉ nhận logo dạng PNG, JPG hoặc WebP.');
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    let scale = Math.min(1, MAX_H / img.naturalHeight, MAX_W / img.naturalWidth);
    let quality = 0.9;
    for (let tries = 0; tries < 12; tries += 1) {
      const canvas = canvasOf(document, img.naturalWidth * scale, img.naturalHeight * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const logo = encode(canvas, quality);
      if (logo.length <= LIMIT) return { logo, favicon: iconOf(canvas, canvas.width, canvas.height, document) };
      if (quality > 0.6) quality -= 0.1;
      else scale *= 0.8;
    }
    throw new Error('Logo quá nặng, hãy chọn ảnh đơn giản hơn.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

const initials = (name) => String(name ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

// Logo chữ cái: vòng tròn màu nút có chữ cái đầu của tên, font tiêu đề. Chỉ là dấu hình (không kèm tên), header tự hiện tên chữ
// cạnh logo (brand.logoMark), nên không bị lặp tên ở kiểu header nào. doc là document của khung xem trước (font của trang đã tải ở
// đó). Trả về { logo, favicon, mark: true }.
export async function textLogo(name, doc) {
  const style = getComputedStyle(doc.documentElement);
  const read = (v, fallback) => style.getPropertyValue(v).trim() || fallback;
  const font = read('--font-heading', 'serif');
  const primary = read('--color-primary', '#333333');
  const onPrimary = read('--color-on-primary', '#ffffff');
  await doc.fonts?.ready;
  const H = 160;
  const canvas = canvasOf(doc, H, H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = primary;
  ctx.beginPath();
  ctx.arc(H / 2, H / 2, H / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = onPrimary;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${initials(name).length > 1 ? 68 : 84}px ${font}`;
  ctx.fillText(initials(name), H / 2, H / 2 + 4);
  return { logo: encode(canvas, 0.9), favicon: iconOf(canvas, H, H, doc), mark: true };
}
