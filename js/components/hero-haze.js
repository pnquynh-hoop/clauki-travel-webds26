/* hero-haze.js - kiểu "haze" của <wl-hero>: một ảnh phủ kín khối, bị lớp sương xám che. Rê chuột thì sương tan
   theo vệt con trỏ, lộ ảnh rực màu bên dưới; tan gần một nửa (CLEAR_RATIO) thì tan hết, một chữ trong tiêu đề (haze.word) bay mất.
   Điện thoại không có chuột: sau một lúc, một "hơi thở" tự quét ngang ảnh. Bật giảm chuyển động thì không có sương.
   Tách tệp riêng vì HTML và hành vi khác hẳn các kiểu còn lại của hero. */
import { asset } from '../core/core.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
// Tỉ lệ điểm ảnh đã tan để coi như tan hết; đo trên lưới thưa cho nhẹ.
const CLEAR_RATIO = 0.45;
// Đo trên bản thu nhỏ cỡ này: đọc cả canvas lớn (hàng chục MB ở màn hình nét cao) mỗi lần rê chuột thì quá nặng.
const SAMPLE_W = 96;
const SAMPLE_H = 54;

function decorEl(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  el.setAttribute('aria-hidden', 'true');
  if (text) el.textContent = text;
  return el;
}

// Bọc chữ cần bay mất trong tiêu đề, mỗi chữ cái một span để CSS cho bay lệch nhau. Dấu câu ngay sau chữ đó
// đi chung một cụm không ngắt dòng, để dấu phẩy không rớt xuống dòng dưới. Không tìm thấy chữ thì bỏ qua.
function markWord(title, word) {
  const text = title?.textContent ?? '';
  const at = word ? text.indexOf(word) : -1;
  if (at < 0) return null;
  const span = document.createElement('span');
  span.className = 'hero__vanish';
  [...word].forEach((char, i) => {
    const letter = document.createElement('span');
    letter.style.setProperty('--i', i);
    letter.textContent = char;
    span.append(letter);
  });
  const end = at + word.length;
  const marks = text.slice(end).match(/^[,.!?;:]*/)[0];
  const keep = document.createElement('span');
  keep.className = 'hero__keep';
  keep.append(span, marks);
  title.replaceChildren(text.slice(0, at), keep, text.slice(end + marks.length));
  return span;
}

// Màu sương lấy từ màu nền của thương hiệu, để thương hiệu khác dùng kiểu này vẫn hợp tông.
function fogColor(host) {
  return getComputedStyle(host).getPropertyValue('--color-bg').trim() || '#d6d2c8';
}

export function buildHaze(host, section, inner) {
  const haze = section.haze ?? {};
  const image = section.image ?? section.slides?.[0]?.image;
  const stage = document.createElement('div');
  stage.className = 'hero__haze';

  const photo = document.createElement('img');
  photo.className = 'hero__photo';
  photo.alt = image?.alt ?? '';
  photo.setAttribute('fetchpriority', 'high');
  if (image?.src) photo.src = asset(image.src);
  const canvas = decorEl('canvas', 'hero__fog');
  const hint = haze.hint ? decorEl('p', 'hero__hint', haze.hint) : null;
  const stamp = haze.stamp ? decorEl('span', 'hero__stamp', haze.stamp) : null;
  stage.append(...[photo, canvas, hint, stamp].filter(Boolean));

  const title = inner.querySelector('.hero__title');
  // Chữ cái tách thành từng span thì trình đọc màn hình đọc rời từng chữ; nhãn giữ nguyên câu tiêu đề.
  if (title && haze.word) title.setAttribute('aria-label', title.textContent);
  const vanish = markWord(title, haze.word);
  const sample = document.createElement('canvas');
  sample.width = SAMPLE_W;
  sample.height = SAMPLE_H;
  const sampleCtx = sample.getContext('2d', { willReadFrequently: true });
  const ctx = canvas.getContext('2d');
  let w = 0;
  let h = 0;
  let done = false;
  let last = null;
  let idle = 0;
  let checkedAt = 0;

  const finish = () => {
    if (done) return;
    done = true;
    host.classList.add('is-clear');
    idle = setTimeout(() => vanish?.classList.add('is-gone'), 500);
  };

  function drawCover() {
    const r = Math.max(w / photo.naturalWidth, h / photo.naturalHeight);
    const iw = photo.naturalWidth * r;
    const ih = photo.naturalHeight * r;
    ctx.drawImage(photo, (w - iw) / 2, (h - ih) / 2, iw, ih);
  }

  // Sương là chính ảnh đó vẽ lại dạng xám, nhoè, phủ thêm một lớp màu nền.
  function paint() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    w = stage.clientWidth;
    h = stage.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    if (photo.complete && photo.naturalWidth) {
      ctx.filter = 'grayscale(1) blur(7px) contrast(.75) brightness(1.15)';
      drawCover();
      ctx.filter = 'none';
    }
    ctx.globalAlpha = 0.66;
    ctx.fillStyle = fogColor(host);
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  // Xoá một vệt tròn mềm (destination-out) để lộ ảnh bên dưới.
  function puff(x, y, r) {
    ctx.globalCompositeOperation = 'destination-out';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,.95)');
    g.addColorStop(0.6, 'rgba(0,0,0,.5)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nối điểm trước với điểm sau để rê nhanh vẫn ra một vệt liền.
  function stroke(x, y) {
    const r = Math.max(60, Math.min(w, h) * 0.14);
    if (last) {
      const dx = x - last.x;
      const dy = y - last.y;
      const n = Math.ceil(Math.hypot(dx, dy) / (r / 3));
      for (let i = 1; i <= n; i += 1) puff(last.x + (dx * i) / n, last.y + (dy * i) / n, r);
    } else {
      puff(x, y, r);
    }
    last = { x, y };
  }

  function clearedRatio() {
    try {
      sampleCtx.clearRect(0, 0, SAMPLE_W, SAMPLE_H);
      sampleCtx.drawImage(canvas, 0, 0, SAMPLE_W, SAMPLE_H);
      const data = sampleCtx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;
      let clear = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 60) clear += 1;
      }
      return clear / (SAMPLE_W * SAMPLE_H);
    } catch {
      return 0;
    }
  }

  function onMove(e) {
    if (done || e.pointerType === 'touch') return;
    const box = stage.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    host.style.setProperty('--hx', `${x}px`);
    host.style.setProperty('--hy', `${y}px`);
    host.classList.add('is-touched');
    stroke(x, y);
    clearTimeout(idle);
    if (performance.now() - checkedAt > 250) {
      checkedAt = performance.now();
      if (clearedRatio() > CLEAR_RATIO) finish();
    }
  }

  function onLeave() {
    last = null;
  }

  // Không có chuột hoặc khách không rê: một hơi thở tự quét ngang ảnh.
  function autoBreath(delay) {
    idle = setTimeout(() => {
      if (done) return;
      const t0 = performance.now();
      last = null;
      const step = (t) => {
        if (done) return;
        const k = Math.min(1, (t - t0) / 1800);
        stroke(w * (-0.1 + k * 1.2), h * (0.45 + Math.sin(k * Math.PI * 3) * 0.18));
        if (k < 1) requestAnimationFrame(step);
        else finish();
      };
      requestAnimationFrame(step);
    }, delay);
  }

  function onResize() {
    if (done) return;
    paint();
    last = null;
  }

  function onScroll() {
    if (scrollY > innerHeight * 0.35) finish();
  }

  function begin() {
    if (!stage.isConnected) return;
    paint();
    autoBreath(matchMedia('(hover: none)').matches ? 1200 : 4500);
  }

  if (reducedMotion.matches || !image?.src) {
    finish();
  } else {
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);
    addEventListener('resize', onResize);
    addEventListener('scroll', onScroll, { passive: true });
    // Đợi khung có kích thước (đã gắn vào trang) rồi mới vẽ sương.
    requestAnimationFrame(() => {
      if (photo.complete) begin();
      else {
        photo.addEventListener('load', begin, { once: true });
        photo.addEventListener('error', begin, { once: true });
      }
    });
  }

  const detach = () => {
    clearTimeout(idle);
    done = true;
    host.removeEventListener('pointermove', onMove);
    host.removeEventListener('pointerleave', onLeave);
    removeEventListener('resize', onResize);
    removeEventListener('scroll', onScroll);
    host.classList.remove('is-clear', 'is-touched');
  };
  return { stage, detach };
}
