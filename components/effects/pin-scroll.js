/* pin-scroll.js - dải ảnh ngang ghim lại khi cuộn: người xem cuộn dọc, dải trôi ngang như đi dọc một hành lang.
   Khối ngoài cao bằng quãng dải cần trôi cộng một màn hình; khung bên trong dính (position: sticky) ở đầu màn hình,
   JS chỉ đổi translateX của dải theo phần trăm đã cuộn qua khối ngoài.
   Chỉ bật từ 1024px và khi không giảm chuyển động; còn lại CSS để dải cuộn ngang bằng tay (vuốt trên điện thoại).
   Một listener cuộn dùng chung cho mọi dải, giống parallax.js. */

const items = new Set();
const wide = matchMedia('(min-width: 1024px)');
const calm = matchMedia('(prefers-reduced-motion: reduce)');
let ticking = false;
let bound = false;

function enabled() {
  return wide.matches && !calm.matches;
}

// Chiều cao khối ngoài = quãng trôi ngang + một màn hình, để trôi hết dải thì vừa cuộn hết khối.
function measure(item) {
  const { section, track } = item;
  if (!enabled()) {
    section.classList.remove('is-pinned');
    section.style.height = '';
    track.style.transform = '';
    return;
  }
  section.classList.add('is-pinned');
  item.distance = Math.max(0, track.scrollWidth - track.parentElement.clientWidth);
  section.style.height = `${item.distance + innerHeight}px`;
}

function update() {
  ticking = false;
  for (const item of items) {
    // Đổi trang hay đổi thương hiệu thì dải cũ bị gỡ khỏi trang: bỏ khỏi danh sách.
    if (!item.section.isConnected) {
      items.delete(item);
      continue;
    }
    if (!enabled()) continue;
    const box = item.section.getBoundingClientRect();
    const run = box.height - innerHeight;
    const progress = run > 0 ? Math.min(1, Math.max(0, -box.top / run)) : 0;
    item.track.style.transform = `translate3d(${(-progress * item.distance).toFixed(1)}px, 0, 0)`;
    item.section.style.setProperty('--pin-progress', progress.toFixed(3));
  }
}

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(update);
}

function remeasure() {
  for (const item of items) measure(item);
  onScroll();
}

// section: khối ngoài; track: dải ảnh nằm trong khung dính. Ảnh nạp xong thì đo lại vì bề ngang dải đổi theo ảnh.
export function pinHorizontal(section, track) {
  if (!section || !track) return;
  const item = { section, track, distance: 0 };
  items.add(item);
  for (const img of track.querySelectorAll('img')) {
    if (!img.complete) img.addEventListener('load', remeasure, { once: true });
  }
  if (!bound) {
    bound = true;
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', remeasure);
    wide.addEventListener('change', remeasure);
    calm.addEventListener('change', remeasure);
  }
  // Đợi khối được gắn vào trang rồi mới đo được bề ngang.
  requestAnimationFrame(() => {
    measure(item);
    onScroll();
  });
}
