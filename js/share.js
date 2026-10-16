/* share.js - khối chia sẻ một site khách: mã QR, link công khai (tên miền con, xem publicLink trong sites.js), nút Chép link,
   Chia sẻ (bảng chia sẻ của điện thoại, có thì mới hiện), Tải mã QR. Dùng ở màn xuất bản của /tao và mục "Mã QR, chia sẻ" trên
   trang khách đã xuất bản; nút Phóng to (hay bấm vào mã) phủ mã QR cả màn hình để người ngồi dưới quét. Mã QR vẽ bằng qrcode-generator (MIT) nạp từ cdnjs, chỉ khi cần. */
import { h } from './dom.js';

const QR_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
const CSS_ID = 'share-css';
let lib = null;

function loadCss() {
  if (document.getElementById(CSS_ID)) return;
  document.head.append(h('link', { rel: 'stylesheet', id: CSS_ID, href: '/css/share.css' }));
}

// Thư viện là script thường (biến toàn cục qrcode), nạp một lần; lỗi mạng thì lần sau thử lại.
function loadLib() {
  lib ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = QR_LIB;
    script.onload = () => resolve(window.qrcode);
    script.onerror = () => {
      lib = null;
      reject(new Error('Chưa tải được thư viện mã QR.'));
    };
    document.head.append(script);
  });
  return lib;
}

// Vẽ mã QR lên canvas: đen trên nền trắng, chừa lề 4 ô như chuẩn QR. Màu cố định, không theo thương hiệu, để điện thoại nào cũng
// quét được.
async function qrCanvas(text, size = 352) {
  const qrcode = await loadLib();
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const cell = Math.max(1, Math.floor(size / (count + 8)));
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = cell * (count + 8);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  for (let r = 0; r < count; r += 1) {
    for (let c = 0; c < count; c += 1) if (qr.isDark(r, c)) ctx.fillRect((c + 4) * cell, (r + 4) * cell, cell, cell);
  }
  return canvas;
}

// Phóng to mã QR phủ cả màn hình (chiếu cho người ngồi dưới quét): nền trắng, mã QR to nhất có thể, tên miền chữ lớn bên dưới.
// Bấm vào đâu hay Esc thì thu nhỏ; <dialog> tự trả con trỏ về nút đã bấm.
function openZoom(data, domain) {
  const close = h('button', { type: 'button', class: 'share__btn share-zoom__close', text: 'Thu nhỏ' });
  const zoom = h('dialog', { class: 'share-zoom', 'aria-label': `Mã QR mở ${domain}` },
    h('img', { class: 'share-zoom__qr', src: data, alt: `Mã QR mở ${domain}` }),
    h('p', { class: 'share-zoom__url', text: domain }),
    close);
  zoom.addEventListener('click', () => zoom.close());
  zoom.addEventListener('close', () => zoom.remove());
  document.body.append(zoom);
  zoom.showModal();
  close.focus();
}

// url: link công khai; name: tên file khi tải mã QR; title: tiêu đề gửi kèm khi chia sẻ.
export function shareEl(url, { name = 'site', title = '' } = {}) {
  loadCss();
  const note = h('p', { class: 'share__note', 'aria-live': 'polite' });
  const img = h('img', { class: 'share__qr', alt: `Mã QR mở ${url}`, width: '176', height: '176' });
  const download = h('a', { class: 'share__btn', download: `ma-qr-${name}.png`, hidden: true, text: 'Tải mã QR' });
  const copy = h('button', { type: 'button', class: 'share__btn share__btn--main', text: 'Chép link',
    onclick: async () => {
      try {
        await navigator.clipboard.writeText(url);
        note.textContent = 'Đã chép link.';
      } catch {
        getSelection().selectAllChildren(link);
        note.textContent = 'Trình duyệt chặn chép tự động, link đã được bôi đen để chép tay.';
      }
    } });
  const share = typeof navigator.share === 'function'
    ? h('button', { type: 'button', class: 'share__btn', text: 'Chia sẻ', onclick: () => navigator.share({ title, url }).catch(() => {}) })
    : null;
  // Chữ của link chỉ là tên miền (mua-la-do.xachbalo.com): ngắn, vừa cạnh mã QR; link bấm vẫn đủ https.
  const domain = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const link = h('a', { class: 'share__url', href: url, target: '_blank', rel: 'noopener', text: domain });
  // Ô mã QR cũng là nút phóng to; cả hai chỉ bấm được khi đã vẽ xong mã.
  const tile = h('button', { type: 'button', class: 'share__tile', 'aria-label': 'Phóng to mã QR', disabled: true }, img);
  const zoom = h('button', { type: 'button', class: 'share__btn', hidden: true, text: 'Phóng to' });
  qrCanvas(url).then((canvas) => {
    const data = canvas.toDataURL('image/png');
    img.src = data;
    download.href = data;
    download.hidden = false;
    zoom.hidden = false;
    tile.disabled = false;
    for (const el of [tile, zoom]) el.addEventListener('click', () => openZoom(data, domain));
  }).catch((err) => {
    img.replaceWith(h('p', { class: 'share__note', text: `${err.message} Link vẫn dùng được.` }));
  });
  // .share là container: khối hẹp (bảng /tao kéo nhỏ, điện thoại) thì hàng nút xuống dưới cả bề ngang, rộng thì nằm cạnh mã QR.
  return h('div', { class: 'share' }, h('div', { class: 'share__grid' },
    tile,
    h('div', { class: 'share__text' }, link, h('p', { class: 'share__hint', text: 'Quét mã để mở trên điện thoại' })),
    h('div', { class: 'share__actions' }, copy, zoom, share, download),
    note));
}
