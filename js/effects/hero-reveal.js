/* hero-reveal.js - hiệu ứng mở đầu cho hero, bật bằng "effect": "reveal" trong khối hero.
   Một lớp màu nền phủ kín màn hình, tên thương hiệu khoét thủng để thấy ảnh hero bên dưới. Cuộn xuống thì chữ
   phóng to xuyên qua một nét chữ, lớp phủ tan, ảnh phủ kín màn hình rồi mờ đi, lộ ra bố cục hero nằm sẵn bên dưới.
   Chỉ thêm phần tử, không sửa HTML hero có sẵn; tắt hiệu ứng thì hero vẫn đủ. Chữ lấy từ site.brand.name,
   ảnh lấy từ image của hero (hoặc ảnh đầu của slides), nên thương hiệu nào bật cũng chạy. */
import { asset } from '../core/core.js';

const NS = 'http://www.w3.org/2000/svg';
let instance = 0;

const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

// Màn hẹp thì tách tên thành hai dòng ở chỗ dấu cách làm hai dòng dài gần bằng nhau, để chữ to hơn.
function splitLines(name, narrow) {
  const words = name.split(' ');
  if (!narrow || words.length < 2) return [name];
  let best = 1;
  for (let i = 1; i < words.length; i += 1) {
    const diff = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
    const bestDiff = Math.abs(words.slice(0, best).join(' ').length - words.slice(best).join(' ').length);
    if (diff < bestDiff) best = i;
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

// Tìm điểm nằm sâu trong một nét chữ (không phải lỗ trong chữ như lòng chữ "a"), gần giữa tên nhất.
// Phóng to quanh điểm đó thì nét chữ, tức phần thấy ảnh, phủ kín màn hình.
// Cách làm: vẽ chữ lên canvas ẩn cùng font, cỡ, vị trí; dò từ giữa ra, lấy điểm đầu tiên mà mọi điểm
// quanh nó trong bán kính r đều có mực.
function strokePoint(layout, font) {
  const { w, h, lines, size, baselines } = layout;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.font = font;
  ctx.textAlign = 'center';
  lines.forEach((line, i) => ctx.fillText(line, w / 2, baselines[i]));
  const data = ctx.getImageData(0, 0, w, h).data;
  const inked = (x, y) => x >= 0 && y >= 0 && x < w && y < h && data[(Math.round(y) * w + Math.round(x)) * 4 + 3] > 200;
  const r = Math.max(3, size * 0.035);
  const ring = Array.from({ length: 8 }, (_, k) => [Math.cos((k * Math.PI) / 4) * r, Math.sin((k * Math.PI) / 4) * r]);
  const cx = w / 2;
  const cy = (baselines[0] - size * 0.7 + baselines[baselines.length - 1]) / 2;
  for (let d = 0; d < Math.max(w, h) / 2; d += 2) {
    for (let a = 0; a < 16; a += 1) {
      const x = cx + Math.cos((a * Math.PI) / 8) * d;
      const y = cy + Math.sin((a * Math.PI) / 8) * d;
      if (inked(x, y) && ring.every(([dx, dy]) => inked(x + dx, y + dy))) return { x, y };
    }
  }
  return { x: cx, y: cy };
}

function buildOverlay(image, hint, maskId) {
  const reveal = document.createElement('div');
  reveal.className = 'hero__reveal';
  reveal.setAttribute('aria-hidden', 'true');
  const stage = document.createElement('div');
  stage.className = 'hero__reveal-stage';

  const img = document.createElement('img');
  img.className = 'hero__reveal-img';
  img.src = asset(image.src);
  img.alt = '';

  // Mặt nạ: trắng là hiện lớp phủ, chữ màu đen là chỗ khoét thủng.
  const svg = svgEl('svg', { class: 'hero__reveal-svg', focusable: 'false' });
  const mask = svgEl('mask', { id: maskId, maskUnits: 'userSpaceOnUse' });
  const maskBg = svgEl('rect', { fill: '#fff' });
  const word = svgEl('g', { class: 'hero__reveal-word' });
  const text = svgEl('text', { fill: '#000', 'text-anchor': 'middle' });
  word.append(text);
  mask.append(maskBg, word);
  const defs = svgEl('defs');
  defs.append(mask);
  const veil = svgEl('rect', { class: 'hero__reveal-veil', mask: `url(#${maskId})` });
  svg.append(defs, veil);

  stage.append(img, svg);
  if (hint) {
    const p = document.createElement('p');
    p.className = 'hero__reveal-hint';
    p.textContent = hint;
    stage.append(p);
  }
  reveal.append(stage);
  return { reveal, stage, svg, maskBg, veil, word, text };
}

// Gắn hiệu ứng vào thẻ hero. Trả về hàm gỡ: wl-hero gọi hàm này mỗi lần dựng lại hoặc khi bị gỡ khỏi trang,
// vì đổi thương hiệu không tải lại trang, không được để listener cũ chạy tiếp.
export function attachReveal(host, section, site) {
  const name = site?.brand?.name;
  // Hero một ảnh dùng image; hero nhiều ảnh (slides) thì lấy ảnh đầu tiên.
  const image = section.image?.src ? section.image : section.slides?.find((slide) => slide.image?.src)?.image;
  if (!name || !image) return () => {};
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  instance += 1;
  const parts = buildOverlay(image, section.revealHint, `hero-reveal-${instance}`);
  host.classList.add('hero--reveal');
  host.prepend(parts.reveal);

  let origin = { x: 0, y: 0 };
  let frame = 0;

  // Đặt chữ vừa khung màn hình rồi tìm điểm phóng to. Chạy lại khi đổi cỡ màn hình và khi font tải xong.
  function layout() {
    const w = parts.stage.clientWidth;
    const h = parts.stage.clientHeight;
    if (!w || !h) return;
    const narrow = w < 700;
    const lines = splitLines(name, narrow);
    const style = getComputedStyle(parts.text);
    const fontAt = (px) => `${style.fontWeight} ${px}px ${style.fontFamily}`;
    // Đo chữ ở cỡ 100px rồi nhân tỉ lệ để dòng dài nhất vừa 88% bề ngang và cả khối không quá nửa chiều cao.
    const probe = document.createElement('canvas').getContext('2d');
    probe.font = fontAt(100);
    const widest = Math.max(...lines.map((line) => probe.measureText(line).width));
    const size = Math.min((w * 0.88 * 100) / widest, (h * (narrow ? 0.5 : 0.42)) / (lines.length * 0.92));
    const lineH = size * 0.92;
    const first = h * 0.47 - ((lines.length - 1) * lineH) / 2 + size * 0.35;
    const baselines = lines.map((_, i) => first + i * lineH);

    parts.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    [parts.maskBg, parts.veil].forEach((rect) => {
      rect.setAttribute('width', w);
      rect.setAttribute('height', h);
    });
    parts.text.setAttribute('font-size', size);
    parts.text.replaceChildren(...lines.map((line, i) => {
      const span = svgEl('tspan', { x: w / 2, y: baselines[i] });
      span.textContent = line;
      return span;
    }));
    origin = strokePoint({ w, h, lines, size, baselines }, fontAt(size));
    update();
  }

  // Độ tiến p (0 tới 1) theo quãng cuộn của khối hiệu ứng. Ba nhịp nối nhau:
  // 0 tới 0,6 chữ phóng to (càng về sau càng nhanh); 0,4 tới 0,6 lớp phủ tan; 0,75 tới 1 cả lớp mờ đi.
  function update() {
    frame = 0;
    const rect = parts.reveal.getBoundingClientRect();
    const p = clamp(-rect.top / (rect.height - innerHeight));
    const zoom = clamp(p / 0.6);
    const scale = 60 ** (zoom * zoom);
    parts.word.setAttribute('transform', `translate(${origin.x} ${origin.y}) scale(${scale}) translate(${-origin.x} ${-origin.y})`);
    host.style.setProperty('--reveal-veil', (1 - clamp((p - 0.4) / 0.2)).toFixed(3));
    host.style.setProperty('--reveal-fade', (1 - clamp((p - 0.75) / 0.25)).toFixed(3));
    host.style.setProperty('--reveal-hint', (1 - clamp(p * 6)).toFixed(3));
    host.style.setProperty('--reveal-zoom', (1.2 - 0.2 * clamp(p / 0.75)).toFixed(3));
  }

  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const resize = new ResizeObserver(() => layout());
  resize.observe(parts.stage);
  window.addEventListener('scroll', onScroll, { passive: true });
  // Cỡ chữ đo theo font thật; font tải xong muộn thì đặt lại cho khớp.
  document.fonts?.ready.then(() => {
    if (parts.reveal.isConnected) layout();
  });

  return () => {
    window.removeEventListener('scroll', onScroll);
    resize.disconnect();
    cancelAnimationFrame(frame);
  };
}
