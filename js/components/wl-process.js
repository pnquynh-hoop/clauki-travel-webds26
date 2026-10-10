/* wl-process.js - quy trình từng bước: khối ghim lại khi cuộn, một hình đổi dáng và màu qua từng bước,
   danh sách bước bên cạnh, bước đang tới sáng lên kèm ảnh thật của bước đó.
   Dáng hình (shape) và màu (color) của từng bước nằm trong dữ liệu, nên thương hiệu khác đổi được hình. */
import { asset } from '../core.js';
import { textEl, clamp, smooth } from '../dom.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const NUMBER = /-?\d*\.?\d+/g;

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

// Các số trong một đường SVG. Các bước dùng cùng cấu trúc lệnh thì đổi dáng chỉ là nội suy từng con số.
const numbersOf = (d) => (d.match(NUMBER) ?? []).map(Number);

// Ghép lại đường SVG: giữ nguyên chữ lệnh của dáng mẫu, thay các số bằng số mới.
function pathWith(template, nums) {
  let k = 0;
  return template.replace(NUMBER, () => String(Math.round(nums[k++] * 10) / 10));
}

// Gân lá: đường cong từ điểm đầu tới điểm mút của dáng. Chỉ vẽ khi dáng là hai đường cong (14 số),
// đúng kiểu "M đầu C ... mút C ... đầu Z"; dáng kiểu khác thì không có gân.
function ribOf(nums) {
  if (nums.length !== 14) return '';
  const [x0, y0] = nums;
  const [x1, y1] = [nums[6], nums[7]];
  return `M ${x0} ${y0} Q 0 ${((y0 + y1) / 2 - 6).toFixed(1)} ${x1} ${y1}`;
}

// Màu dạng #rrggbb thành ba số để pha giữa hai bước; màu viết kiểu khác thì trả null (không pha được).
function rgbOf(color) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color ?? '');
  return m ? m.slice(1).map((h) => parseInt(h, 16)) : null;
}

const mixRgb = (a, b, t) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(' ')})`;
const lerp = (a, b, t) => a + (b - a) * t;

// Một bước trong danh sách: số thứ tự, tên, câu mô tả. Hình nhỏ và ảnh chỉ hiện khi bật giảm chuyển động.
function stepEl(step, index, miniShape) {
  const li = document.createElement('li');
  li.className = 'process__step';
  li.append(
    textEl('span', 'process__num', String(index + 1).padStart(2, '0')),
    textEl('span', 'process__name', step.name),
    ...[textEl('span', 'process__desc', step.text)].filter(Boolean),
  );
  if (miniShape) {
    const mini = svgEl('svg', { class: 'process__mini', viewBox: '-160 -120 320 240', 'aria-hidden': 'true' });
    const path = svgEl('path', { d: step.shape });
    if (step.color) path.style.fill = step.color;
    mini.append(path);
    li.append(mini);
  }
  if (step.image?.src) {
    const img = document.createElement('img');
    img.className = 'process__step-photo';
    img.src = asset(step.image.src);
    img.alt = step.image.alt ?? '';
    img.loading = 'lazy';
    li.append(img);
  }
  return li;
}

export class WlProcess extends HTMLElement {
  connectedCallback() {
    // Chỉ chạy vòng vẽ khi khối đang trong màn hình; ra khỏi màn hình thì dừng cho nhẹ máy.
    this._io = new IntersectionObserver(([entry]) => {
      this._visible = entry.isIntersecting;
      if (this._visible) this.play();
    });
    this._io.observe(this);
  }

  disconnectedCallback() {
    this._io?.disconnect();
    cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  set data(section) {
    this._data = section;
    this.render();
  }

  render() {
    const section = this._data;
    const steps = (section.steps ?? []).filter((step) => step.name);
    this.className = `process process--${section.variant ?? 'morph'}`;
    this.style.setProperty('--process-steps', String(Math.max(steps.length, 1)));

    // Đổi dáng được khi mọi bước đều có dáng và cùng số lượng con số; không thì chỉ còn danh sách bước.
    const counts = steps.map((step) => (step.shape ? numbersOf(step.shape).length : 0));
    const canMorph = steps.length >= 2 && counts[0] > 0 && counts.every((n) => n === counts[0]);
    this._steps = steps;
    this._nums = canMorph ? steps.map((step) => numbersOf(step.shape)) : null;
    this._rgbs = steps.map((step) => rgbOf(step.color));
    this._cup = canMorph && section.cup ? section.cup : null;

    const list = document.createElement('ol');
    list.className = 'process__steps';
    this._items = steps.map((step, i) => stepEl(step, i, canMorph));
    list.append(...this._items);

    const photo = document.createElement('figure');
    photo.className = 'process__photo';
    photo.hidden = true;
    this._photoImg = document.createElement('img');
    photo.append(this._photoImg);
    this._photo = photo;

    const text = document.createElement('div');
    text.className = 'process__text';
    text.append(...[
      textEl('p', 'process__eyebrow', section.eyebrow),
      textEl('h2', 'process__title', section.title),
      textEl('p', 'process__lead', section.lead),
      list,
      photo,
    ].filter(Boolean));

    const inner = document.createElement('div');
    inner.className = 'process__inner container';
    inner.append(...[text, canMorph ? this.artEl() : null].filter(Boolean));

    const bar = document.createElement('div');
    bar.className = 'process__progress';
    bar.setAttribute('aria-hidden', 'true');
    this._bar = document.createElement('span');
    bar.append(this._bar);

    const stage = document.createElement('div');
    stage.className = 'process__stage';
    stage.append(inner, bar);
    this._stage = stage;
    this.replaceChildren(stage);

    this._active = -1;
    this.classList.toggle('is-static', reduceMotion.matches || !canMorph);
    this.update(0);
    if (this._visible) this.play();
  }

  /* ========= HÌNH ĐỔI DÁNG =========
     Vẽ một lần: hình chính (thân, ánh sáng, gân, giọt nước), lớp chảo và hơi nóng cho bước có heat,
     chén nước ở cuối nếu dữ liệu có cup. Mỗi khung hình chỉ đổi thuộc tính, không dựng lại. */
  artEl() {
    const id = this.id || 'process';
    const art = svgEl('svg', { class: 'process__art', viewBox: '-200 -200 400 400', 'aria-hidden': 'true' });
    const defs = svgEl('defs');
    const clip = svgEl('clipPath', { id: `${id}-cup` });
    clip.append(svgEl('path', { d: 'M-70 60 L70 60 L58 150 Q0 168 -58 150 Z' }));
    const shine = svgEl('radialGradient', { id: `${id}-shine`, cx: '35%', cy: '35%', r: '70%' });
    shine.append(svgEl('stop', { class: 'process__shine-from', offset: '0' }), svgEl('stop', { class: 'process__shine-to', offset: '1' }));
    defs.append(clip, shine);

    const pan = svgEl('g', { class: 'process__pan' });
    pan.append(svgEl('path', { d: 'M-170 120 Q0 210 170 120' }));
    const steam = svgEl('g', { class: 'process__steam' });
    for (const x of [-40, 0, 40]) steam.append(svgEl('path', { d: `M${x} ${x ? -60 : -70} q-14 -24 0 -48 q14 -24 0 -48` }));

    const cup = svgEl('g', { class: 'process__cup' });
    const liquid = svgEl('rect', { class: 'process__liquid', x: -80, y: 170, width: 160, height: 110, 'clip-path': `url(#${id}-cup)` });
    if (this._cup?.color) liquid.style.fill = this._cup.color;
    cup.append(liquid, svgEl('path', { class: 'process__cup-line', d: 'M-70 60 L70 60 L58 150 Q0 168 -58 150 Z' }),
      svgEl('path', { class: 'process__cup-line', d: 'M70 80 q34 4 26 34 q-6 20 -32 18' }));

    const shape = svgEl('g', { class: 'process__shape' });
    const body = svgEl('path', { class: 'process__body' });
    const gloss = svgEl('path', { class: 'process__gloss', fill: `url(#${id}-shine)` });
    const rib = svgEl('path', { class: 'process__rib' });
    const dews = [[-40, -30, 6], [35, -42, 4.5], [70, 18, 5]].map(([cx, cy, r]) => svgEl('circle', { class: 'process__dew', cx, cy, r }));
    shape.append(body, gloss, rib, ...dews);

    art.append(defs, pan, steam);
    if (this._cup) art.append(cup);
    art.append(shape);
    this._art = { body, gloss, rib, dews, pan, steam, cup, liquid, shape };
    return art;
  }

  // Tiến độ cuộn qua khối, từ 0 (đầu khối chạm đỉnh màn hình) tới 1 (cuối khối chạm đáy màn hình).
  progress() {
    const box = this.getBoundingClientRect();
    const room = box.height - window.innerHeight;
    return room > 0 ? clamp(-box.top / room, 0, 1) : 0;
  }

  play() {
    if (this._raf || this.classList.contains('is-static')) return;
    const tick = (now) => {
      this.update(now / 1000);
      this._raf = this._visible && this.isConnected ? requestAnimationFrame(tick) : 0;
    };
    this._raf = requestAnimationFrame(tick);
  }

  // Vẽ theo tiến độ cuộn. Có chén thì 18% cuối quãng cuộn dành cho cảnh hình rơi vào chén, nước dâng lên.
  update(time) {
    const steps = this._steps;
    const n = steps.length;
    if (!n) return;
    const p = this.classList.contains('is-static') ? 1 : this.progress();
    const tail = this._cup ? 0.18 : 0;
    const ps = clamp(p / (1 - tail), 0, 1);
    this.showStep(Math.min(n - 1, Math.max(0, Math.floor(ps * n - 1e-6))));
    if (this._bar) this._bar.style.transform = `scaleX(${p})`;
    if (!this._nums || !this._art) return;

    // q đi từ 0 tới n - 1: phần nguyên là bước đang rời, phần lẻ là đã đi được bao nhiêu sang bước sau.
    const q = ps * (n - 1);
    const i = Math.min(n - 2, Math.floor(q));
    const f = smooth(0, 1, q - i);
    const nums = this._nums[i].map((v, k) => lerp(v, this._nums[i + 1][k], f));
    const a = this._art;
    const d = pathWith(steps[0].shape, nums);
    a.body.setAttribute('d', d);
    a.gloss.setAttribute('d', d);
    a.gloss.style.opacity = String(1 - ps);
    a.rib.setAttribute('d', ribOf(nums));
    a.rib.style.opacity = String(1 - ps * 0.8);
    const [c0, c1] = [this._rgbs[i], this._rgbs[i + 1]];
    if (c0 && c1) {
      const color = mixRgb(c0, c1, f);
      a.body.style.fill = color;
      this._stage.style.setProperty('--process-tint', color);
    }

    // Lớp phụ hiện quanh bước của nó: giọt nước ở bước có dew, chảo và hơi nóng ở bước có heat.
    const near = (flag, width) => Math.max(0, ...steps.map((step, k) => (step[flag] ? clamp(1 - Math.abs(q - k) / width, 0, 1) : 0)));
    const pour = this._cup ? smooth(1 - tail, 1, p) : 0;
    const heat = near('heat', 0.9) * (1 - pour);
    a.dews.forEach((dew) => { dew.style.opacity = String(near('dew', 0.4)); });
    a.pan.style.opacity = String(heat);
    a.steam.style.opacity = String(Math.max(heat, this._cup ? smooth(0.9, 1, p) : 0));
    a.steam.setAttribute('transform', `translate(0 ${pour * 110})`);

    const sway = reduceMotion.matches ? 0 : Math.sin(time * 1.3) * 2.5;
    a.shape.setAttribute('transform', `translate(0 ${pour * 150}) rotate(${lerp(-14, 24, ps) + sway}) scale(${1 - pour * 0.6})`);
    a.shape.style.opacity = String(this._cup ? 1 - smooth(0.93, 1, p) : 1);
    if (this._cup) {
      a.cup.style.opacity = String(smooth(1 - tail - 0.12, 1 - tail + 0.04, p));
      a.liquid.setAttribute('y', String(170 - 100 * smooth(1 - tail + 0.04, 1, p)));
    }
  }

  // Bước đang tới sáng lên; ảnh thật của bước đó hiện dưới danh sách (bước không có ảnh thì ẩn khung ảnh).
  showStep(index) {
    if (index === this._active) return;
    this._active = index;
    this._items.forEach((li, k) => li.classList.toggle('is-active', k === index));
    const image = this._steps[index]?.image;
    this._photo.hidden = !image?.src;
    if (!image?.src) return;
    this._photoImg.src = asset(image.src);
    this._photoImg.alt = image.alt ?? '';
  }
}
