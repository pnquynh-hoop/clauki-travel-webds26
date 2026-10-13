/* parallax.js - ảnh trôi chậm hơn trang khi cuộn, tạo cảm giác có chiều sâu.
   Ảnh được phóng to một chút (scale) để khi dịch lên xuống không lộ mép khung; khung cha phải có overflow: hidden.
   Một listener cuộn dùng chung cho mọi ảnh, chỉ tính ảnh đang ở trong màn hình.
   Bật "giảm chuyển động" thì không làm gì, ảnh đứng yên. */

const items = new Set();
let ticking = false;
let bound = false;

function update() {
  ticking = false;
  const vh = innerHeight;
  for (const el of items) {
    // Đổi trang hay đổi thương hiệu thì ảnh cũ bị gỡ khỏi trang: bỏ khỏi danh sách.
    if (!el.isConnected) {
      items.delete(el);
      continue;
    }
    const box = el.parentElement.getBoundingClientRect();
    if (box.bottom < 0 || box.top > vh) continue;
    // Tâm khung càng xa tâm màn hình thì ảnh càng lệch, nhân với tốc độ riêng của từng ảnh.
    const offset = (box.top + box.height / 2 - vh / 2) * el.parallaxSpeed;
    el.style.transform = `translate3d(0, ${(-offset).toFixed(1)}px, 0) scale(${el.parallaxScale})`;
  }
}

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(update);
}

// speed: 0.1 là trôi nhẹ, 0.25 là trôi rõ. scale phải đủ lớn để bù phần dịch, nếu không sẽ lộ mép.
export function parallax(el, speed = 0.12, scale = 1.15) {
  if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.parallaxSpeed = speed;
  el.parallaxScale = scale;
  items.add(el);
  if (!bound) {
    bound = true;
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
  }
  onScroll();
}
