/* page-audit.js - kiểm màu trên trang thật trước khi đưa bảng màu AI gợi ý cho người dùng (#194).
   Bộ kiểm tương phản của palette.js chỉ đo các cặp biến khai ở CONTRAST, nhưng trong từng khối còn nhiều tổ hợp khác: chữ pha
   color-mix giữa mực và nền phụ ở chân trang, chữ trên nền nút, nhãn trên nền màu nhấn, chữ trên giấy note... Ở đây dựng trang đang
   mở trong một khung ẩn với bảng màu đề xuất (gửi nháp bằng wl:draft như khung xem trước), lần lượt ở chế độ sáng và tối, rồi đo mọi
   chữ đang hiện: màu chữ thật và màu nền thật phía sau (cộng dồn các lớp nền trong suốt từ chữ ra ngoài). Chữ nằm trên ảnh hay nền
   gradient thì bỏ qua: màu phía sau đổi theo ảnh, các khối đó tự có lớp phủ. Ngưỡng theo WCAG AA: chữ thường 4,5, chữ lớn (từ 24px,
   hoặc từ 18,66px đậm) 3. Như WCAG, không đo chữ trang trí (trong vùng aria-hidden, ví dụ số thứ tự rất lớn cố ý làm mờ) và chữ
   của nút đang khoá. Khung xem trước người dùng đang nhìn không bị đụng tới. */
import { contrastRatio } from './contrast.js';
import { BLOCKS } from './manifest.js';

const TIMEOUT_MS = 12000;
// Các lớp nền cộng dồn phủ từ 90% trở lên thì coi là nền của chữ: tấm thông tin ở chân trang phủ 93% nền phụ lên ảnh, 7% ảnh lộ ra
// không đổi được màu nền đáng kể; đòi đặc hơn thì chữ trên tấm đó bị bỏ qua như chữ trên ảnh.
const OPAQUE = 0.9;
const MEDIA = new Set(['IMG', 'VIDEO', 'CANVAS', 'PICTURE', 'IFRAME']);
const MEDIA_SELECTOR = 'img, video, canvas, picture';
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'OPTION', 'TITLE']);
const FIXED = { 'WL-HEADER': 'Đầu trang', 'WL-FOOTER': 'Chân trang', 'WL-STICKY-CTA': 'Nút đặt dính', 'WL-TO-TOP': 'Nút lên đầu' };

// Màu CSS bất kỳ (rgb, oklch, color-mix đã tính) đổi sang RGBA bằng cách tô một điểm ảnh: canvas luôn trả về sRGB.
const pixel = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
const parsed = new Map();
function rgba(css) {
  if (!parsed.has(css)) {
    pixel.clearRect(0, 0, 1, 1);
    pixel.fillStyle = '#000';
    pixel.fillStyle = css;
    pixel.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = pixel.getImageData(0, 0, 1, 1).data;
    parsed.set(css, { r, g, b, a: a / 255 });
  }
  return parsed.get(css);
}

// Lớp màu trên đặt lên lớp dưới (đã đặc).
const over = (top, bottom) => ({
  r: top.r * top.a + bottom.r * (1 - top.a),
  g: top.g * top.a + bottom.g * (1 - top.a),
  b: top.b * top.a + bottom.b * (1 - top.a),
  a: 1,
});
const hex = (c) => `#${[c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

// Hai hình chữ nhật có chồng nhau không. Chỉ cần chồng một phần: dải chữ chạy dài gấp nhiều lần ảnh vẫn là chữ nằm trên ảnh.
const overlaps = (a, b) => Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top);

// Lớp ảnh phải đủ lớn so với chữ mới tính là nền của chữ: icon nhỏ đứng cạnh chữ thì không.
const bigEnough = (media, box) => media.width * media.height >= 0.5 * box.width * box.height;

// Trong khối n có ảnh (hay lớp có ảnh, hình SVG lớn như cảnh phố của hero ride) đè lên chỗ chữ không: ảnh nền của hero, backdrop,
// chân trang có ảnh.
function imageUnder(n, el, box, view) {
  for (const child of n.children) {
    if (child.contains(el)) continue;
    const cs = view.getComputedStyle(child);
    const media = MEDIA.has(child.tagName) || child.tagName.toLowerCase() === 'svg' || cs.backgroundImage !== 'none'
      || ((cs.position === 'absolute' || cs.position === 'fixed') && child.querySelector(MEDIA_SELECTOR));
    const rect = media && child.getBoundingClientRect();
    if (media && overlaps(box, rect) && bigEnough(rect, box)) return true;
  }
  return false;
}

// Lớp phủ vẽ bằng ::before, ::after nằm tuyệt đối trong khối (dải màu đầu thẻ đeo, lỗ phim, lớp tối trên ảnh): không đo được lớp
// đó phủ tới đâu, có nằm sau chữ hay không, nên chữ trong khối đó không đo (đoán sai sẽ làm code sửa nhầm màu).
function hasOverlay(n, view) {
  return ['::before', '::after'].some((which) => {
    const ps = view.getComputedStyle(n, which);
    if (ps.content === 'none' || ps.display === 'none' || (ps.position !== 'absolute' && ps.position !== 'fixed')) return false;
    return ps.backgroundImage !== 'none' || rgba(ps.backgroundColor).a > 0;
  });
}

// Màu nền thật phía sau chữ: đi từ chữ ra ngoài, gom các lớp nền tới khi đủ đặc. Gặp ảnh hay gradient thì trả null (bỏ qua).
function backOf(el, box, view) {
  const layers = [];
  let alpha = 0;
  const add = (color) => {
    layers.push(color);
    alpha = 1 - (1 - alpha) * (1 - color.a);
  };
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    const cs = view.getComputedStyle(n);
    if (cs.backgroundImage !== 'none' || imageUnder(n, el, box, view)) return null;
    if (n !== el && hasOverlay(n, view)) return null;
    const color = rgba(cs.backgroundColor);
    if (color.a > 0) add(color);
    if (alpha >= OPAQUE) break;
  }
  // Hết cây mà chưa đặc thì phía sau là nền trắng của trình duyệt.
  return layers.reverse().reduce((bottom, top) => over(top, bottom), { r: 255, g: 255, b: 255, a: 1 });
}

// Màu nền thật phía sau chữ, hỏi thẳng trình duyệt các lớp nằm dưới một điểm của chữ (elementsFromPoint): bắt được cả lớp không
// phải thẻ cha của chữ, như ảnh hero nằm dưới header nổi. Trả undefined khi không thấy chữ ở điểm đó (chữ bị che, hay không nhận
// con trỏ) để dùng cách đi theo cây thẻ cha; null khi dưới chữ là ảnh hay lớp phủ (bỏ qua).
function backAt(doc, el, box, view) {
  const x = Math.min(Math.max(box.left + box.width / 2, 1), view.innerWidth - 1);
  const y = Math.min(Math.max(box.top + Math.min(box.height / 2, 10), 1), view.innerHeight - 1);
  const stack = doc.elementsFromPoint(x, y);
  const at = stack.findIndex((n) => n === el || el.contains(n));
  if (at < 0) return undefined;
  const layers = [];
  let alpha = 0;
  for (const n of stack.slice(at)) {
    const cs = view.getComputedStyle(n);
    // Icon, ảnh nhỏ nằm trong chính chữ không phải nền của chữ.
    const inside = n !== el && el.contains(n);
    if (!inside && (MEDIA.has(n.tagName) || n.tagName.toLowerCase() === 'svg' || cs.backgroundImage !== 'none')) return null;
    if (!inside && n !== el && hasOverlay(n, view)) return null;
    const color = rgba(cs.backgroundColor);
    if (color.a > 0) {
      layers.push(color);
      alpha = 1 - (1 - alpha) * (1 - color.a);
      if (alpha >= OPAQUE) break;
    }
  }
  return layers.reverse().reduce((bottom, top) => over(top, bottom), { r: 255, g: 255, b: 255, a: 1 });
}

const whereOf = (el) => {
  const block = el.closest('main > *, wl-header, wl-footer, wl-sticky-cta, wl-to-top');
  if (!block) return 'Trang';
  if (FIXED[block.tagName]) return FIXED[block.tagName];
  const type = block.tagName.toLowerCase().replace(/^wl-/, '');
  return BLOCKS[type]?.label ?? type;
};

// Đo mọi chữ đang hiện trong một tài liệu; trả về các chỗ chưa đạt, gộp theo cặp màu và khối.
export function measure(doc) {
  const view = doc.defaultView;
  const found = new Map();
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement;
    if (!el || seen.has(el) || !node.nodeValue.trim() || SKIP.has(el.tagName) || el.closest('svg, [aria-hidden="true"], :disabled, [aria-disabled="true"]')) continue;
    seen.add(el);
    const cs = view.getComputedStyle(el);
    let box = el.getBoundingClientRect();
    // Chữ ẩn (display none, chữ chỉ cho trình đọc màn hình 1px) không đo; chữ đang mờ chờ hiệu ứng hiện dần vẫn đo.
    if (cs.visibility === 'hidden' || box.width < 2 || box.height < 2) continue;
    // Đưa chữ vào vùng nhìn của khung ẩn để hỏi được lớp nằm dưới nó.
    if (box.bottom < 0 || box.top > view.innerHeight) {
      view.scrollTo(0, view.scrollY + box.top - view.innerHeight / 3);
      box = el.getBoundingClientRect();
    }
    const under = backAt(doc, el, box, view);
    const back = under === undefined ? backOf(el, box, view) : under;
    if (!back) continue;
    const ink = rgba(cs.color);
    const fg = hex(over(ink, back));
    const bg = hex(back);
    const size = parseFloat(cs.fontSize);
    const need = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700) ? 3 : 4.5;
    const ratio = contrastRatio(fg, bg);
    if (ratio === null || ratio >= need) continue;
    const where = whereOf(el);
    const key = `${fg}|${bg}|${where}`;
    const hit = found.get(key) ?? { fg, bg, where, need, ratio, text: node.nodeValue.trim().slice(0, 40), count: 0 };
    hit.count += 1;
    hit.ratio = Math.min(hit.ratio, ratio);
    found.set(key, hit);
  }
  view.scrollTo(0, 0);
  return [...found.values()].sort((a, b) => a.ratio - b.ratio);
}

const nextRender = (frame) => new Promise((resolve) => frame.addEventListener('wl:rendered', resolve, { once: true }));
const frames = (win, n = 2) => new Promise((resolve) => {
  const step = (left) => (left ? win.requestAnimationFrame(() => step(left - 1)) : resolve());
  step(n);
});

/* Dựng trang trong khung ẩn với nháp draft rồi đo từng chế độ trong modes. url: trang đang mở; width: bề ngang khung xem trước;
   restoreMode: chế độ khung xem trước đang dùng (đổi chế độ trong khung ẩn ghi vào bộ nhớ chung, nên trả lại sau khi đo).
   Trả về { light: [...], dark: [...] }, hoặc null khi không dựng được trang (mạng lỗi, quá TIMEOUT_MS). */
export async function auditPage({ url, width, draft, modes, restoreMode }) {
  const frame = document.createElement('iframe');
  frame.setAttribute('data-ed-frame', '');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.style.cssText = `position:fixed;left:-20000px;top:0;width:${width}px;height:900px;border:0;opacity:0;pointer-events:none;`;
  const first = nextRender(frame);
  frame.src = url;
  document.body.append(frame);
  const timeout = new Promise((resolve) => setTimeout(() => resolve('timeout'), TIMEOUT_MS));
  try {
    if (await Promise.race([first, timeout]) === 'timeout') return null;
    const doc = frame.contentDocument;
    const rendered = nextRender(frame);
    doc.dispatchEvent(new CustomEvent('wl:draft', { detail: draft }));
    if (await Promise.race([rendered, timeout]) === 'timeout') return null;
    const result = {};
    for (const mode of modes) {
      doc.dispatchEvent(new CustomEvent('wl:set-mode', { detail: mode }));
      await frames(frame.contentWindow);
      result[mode] = measure(doc);
    }
    return result;
  } catch {
    return null;
  } finally {
    frame.contentDocument?.dispatchEvent(new CustomEvent('wl:set-mode', { detail: restoreMode }));
    frame.remove();
  }
}
