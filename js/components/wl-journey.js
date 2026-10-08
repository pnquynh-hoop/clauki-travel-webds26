/* wl-journey.js - lịch trình chuyến đi: các trạm xếp theo thứ tự, mỗi trạm có giờ, tên, độ cao,
   một câu mô tả, ảnh và nơi ngủ (nếu là trạm cuối của một ngày).
   Kiểu "road": các trạm nằm dọc một con đường chữ S, chiếc xe chạy theo khi cuộn trang,
   trời đổi màu theo giờ của trạm, bên cạnh có đồng hồ độ cao, dưới nền có núi chìm dần khi xe lên cao. */
import { asset } from '../core.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SKIES = ['dawn', 'morning', 'noon', 'afternoon', 'night'];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
// Cùng điểm ngắt với journey.css: từ 760px thẻ mới xen kẽ hai bên, có cột trống cho đường vòng sang.
const wideScreen = matchMedia('(min-width: 760px)');

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const smooth = (from, to, x) => {
  const t = clamp((x - from) / (to - from), 0, 1);
  return t * t * (3 - 2 * t);
};

// Trường nào trống thì trả về null để bỏ qua, không tạo thẻ rỗng.
function textEl(tag, className, text) {
  if (!text) return null;
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  return el;
}

function svgEl(tag, className) {
  const el = document.createElementNS(SVG_NS, tag);
  if (className) el.setAttribute('class', className);
  return el;
}

// Độ cao là số mét; viết theo cách viết số của tiếng Việt, ví dụ 1.400.
function formatMeters(altitude) {
  return (Math.round(altitude / 10) * 10).toLocaleString('vi-VN');
}

// Màu trời lấy theo giờ ghi ở trạm ("Ngày 2 · 05:00" là bình minh). Không có giờ thì coi là ban ngày.
function skyOf(time) {
  const match = /(\d{1,2}):\d{2}/.exec(time ?? '');
  if (!match) return 'noon';
  const hour = Number(match[1]);
  if (hour < 7) return 'dawn';
  if (hour < 11) return 'morning';
  if (hour < 15) return 'noon';
  if (hour < 19) return 'afternoon';
  return 'night';
}

// Trạm không có ảnh thì không có khung ảnh, thẻ chỉ còn phần chữ. Ảnh hỏng (sai đường dẫn, chưa có tệp)
// thì gỡ cả khung, để không còn một ô trống giữa thẻ. Lớp mây phủ lên ảnh, tan dần khi trạm vào khung nhìn.
function photoEl(image) {
  if (!image?.src) return null;
  const box = document.createElement('div');
  box.className = 'journey__photo';
  const img = document.createElement('img');
  img.src = asset(image.src);
  img.alt = image.alt ?? '';
  img.loading = 'lazy';
  img.addEventListener('error', () => box.remove(), { once: true });
  const veil = document.createElement('div');
  veil.className = 'journey__veil';
  box.append(img, veil);
  return box;
}

function stopEl(stop) {
  const li = document.createElement('li');
  li.className = 'journey__stop';

  // Chấm trên đường chỉ để nhìn; người dùng trình đọc màn hình đã có thứ tự của danh sách.
  const dot = document.createElement('span');
  dot.className = 'journey__dot';
  dot.setAttribute('aria-hidden', 'true');

  const meta = document.createElement('p');
  meta.className = 'journey__meta';
  meta.append(...[
    textEl('span', 'journey__time', stop.time),
    typeof stop.altitude === 'number' ? textEl('span', 'journey__altitude', `${formatMeters(stop.altitude)} m`) : null,
  ].filter(Boolean));

  const body = document.createElement('div');
  body.className = 'journey__body';
  body.append(...[
    meta.childElementCount ? meta : null,
    textEl('h3', 'journey__name', stop.title),
    textEl('p', 'journey__text', stop.text),
    textEl('p', 'journey__night', stop.night),
  ].filter(Boolean));

  const card = document.createElement('article');
  card.className = 'journey__card';
  card.append(...[photoEl(stop.image), body].filter(Boolean));

  li.append(dot, card);
  return li;
}

// Ba dải núi (xa, giữa, gần) vẽ trong khung 1440 x 400, kéo giãn theo bề ngang màn hình.
const RIDGES = {
  far: 'M0 400 V170 C120 150 180 90 260 100 C340 110 380 160 470 150 C560 140 600 60 700 70 C800 80 830 150 930 140 C1030 130 1080 70 1180 80 C1280 90 1350 140 1440 130 V400Z',
  mid: 'M0 400 V240 C100 220 170 170 250 180 C340 192 380 250 480 240 C580 230 640 170 740 180 C840 190 880 250 990 240 C1090 230 1150 180 1250 190 C1340 198 1400 230 1440 230 V400Z',
  near: 'M0 400 V320 C140 290 260 280 380 300 C520 322 600 340 720 330 C860 318 940 280 1080 290 C1220 300 1320 330 1440 320 V400Z',
};

// Núi ở đáy màn hình, nằm sau thẻ và con đường. Mỗi dải là một SVG riêng để CSS đẩy từng dải xuống
// một quãng khác nhau theo độ cao (dải gần chìm nhiều nhất, tạo chiều sâu). Biển mây nằm trên các dải núi.
function hillsEl() {
  const hills = document.createElement('div');
  hills.className = 'journey__hills';
  Object.entries(RIDGES).forEach(([name, d]) => {
    const svg = svgEl('svg', `journey__ridge journey__ridge--${name}`);
    svg.setAttribute('viewBox', '0 0 1440 400');
    svg.setAttribute('preserveAspectRatio', 'none');
    const path = svgEl('path');
    path.setAttribute('d', d);
    svg.append(path);
    hills.append(svg);
  });
  const sea = document.createElement('div');
  sea.className = 'journey__sea';
  hills.append(sea);
  return hills;
}

// Mỗi khoảng trời là một lớp nền; JS chỉ đổi độ mờ của các lớp, còn màu nằm trong CSS.
function skyEl() {
  const sky = document.createElement('div');
  sky.className = 'journey__sky';
  sky.setAttribute('aria-hidden', 'true');
  SKIES.forEach((name) => {
    const layer = document.createElement('div');
    layer.className = `journey__sky-layer journey__sky-layer--${name}`;
    layer.dataset.sky = name;
    sky.append(layer);
  });
  const stars = document.createElement('div');
  stars.className = 'journey__stars';
  sky.append(stars, hillsEl());
  return sky;
}

// Con đường gồm mặt đường, vạch kẻ giữa, phần đã đi và chiếc xe. Chỉ để nhìn nên ẩn với trình đọc màn hình.
function roadEl() {
  const svg = svgEl('svg', 'journey__road');
  svg.setAttribute('aria-hidden', 'true');
  svg.append(
    svgEl('path', 'journey__road-edge'),
    svgEl('path', 'journey__road-base'),
    svgEl('path', 'journey__road-lane'),
    svgEl('path', 'journey__road-done'),
  );

  // Xe vẽ đầu hướng sang phải (trục x); khi chạy sẽ được xoay theo hướng của đường.
  const car = svgEl('g', 'journey__car');
  const beam = svgEl('path', 'journey__beam');
  beam.setAttribute('d', 'M14 -6 L120 -46 L120 46 L14 6 Z');
  const parts = [['journey__car-body', -16, -9, 32, 18, 5], ['journey__car-roof', -12, -7, 13, 14, 2], ['journey__car-glass', 4, -7, 8, 14, 2]];
  car.append(beam, ...parts.map(([cls, x, y, w, h, r]) => {
    const rect = svgEl('rect', cls);
    Object.entries({ x, y, width: w, height: h, rx: r }).forEach(([k, v]) => rect.setAttribute(k, v));
    return rect;
  }));
  svg.append(car);
  return svg;
}

// Biểu đồ độ cao nhỏ của cả chuyến: đường lên xuống, vùng tô bên dưới, mỗi trạm một chấm.
// Cần ít nhất hai trạm có độ cao mới vẽ được; thiếu thì không vẽ.
function profileEl(stops) {
  const known = stops.map((s, i) => ({ i, altitude: s.altitude })).filter((s) => typeof s.altitude === 'number');
  if (known.length < 2) return null;
  const low = Math.min(...known.map((s) => s.altitude));
  const high = Math.max(...known.map((s) => s.altitude));
  const span = high - low || 1;
  const points = known.map((s, k) => ({ i: s.i, x: 8 + (k * 204) / (known.length - 1), y: 58 - ((s.altitude - low) / span) * 46 }));
  const line = points.map((p) => `${p.x},${p.y}`).join(' ');

  const svg = svgEl('svg', 'journey__profile');
  svg.setAttribute('viewBox', '0 0 220 64');
  const area = svgEl('polygon', 'journey__profile-area');
  area.setAttribute('points', `${points[0].x},64 ${line} ${points[points.length - 1].x},64`);
  const path = svgEl('polyline', 'journey__profile-line');
  path.setAttribute('points', line);
  svg.append(area, path, ...points.map((p) => {
    const dot = svgEl('circle', 'journey__profile-dot');
    Object.entries({ cx: p.x, cy: p.y, r: 4 }).forEach(([k, v]) => dot.setAttribute(k, v));
    dot.dataset.stop = p.i;
    return dot;
  }));
  return svg;
}

// Danh sách các ngày (tuỳ chọn): mỗi ngày một dòng tên ngày và nơi đi qua; ngày xe đang chạy được tô nền.
function daysEl(days) {
  if (!days?.length) return null;
  const list = document.createElement('ol');
  list.className = 'journey__days';
  list.append(...days.map((day) => {
    const li = document.createElement('li');
    li.className = 'journey__day';
    li.append(...[textEl('strong', 'journey__day-title', day.title), textEl('span', 'journey__day-text', day.text)].filter(Boolean));
    return li;
  }));
  return list;
}

// Đồng hồ bên cạnh: trạm đang tới, độ cao chạy số, biểu đồ độ cao, các ngày và ghi chú nguồn độ cao.
// Mọi thứ ở đây đều đã có trong danh sách trạm, nên cả khối ẩn với trình đọc màn hình để khỏi đọc hai lần.
function meterEl(section, stops) {
  const meter = document.createElement('aside');
  meter.className = 'journey__meter';
  meter.setAttribute('aria-hidden', 'true');

  const alt = document.createElement('p');
  alt.className = 'journey__meter-alt';
  const num = document.createElement('span');
  num.className = 'journey__meter-num';
  alt.append(num, textEl('span', 'journey__meter-unit', 'm'));

  meter.append(...[
    textEl('p', 'journey__meter-time', ' '),
    textEl('p', 'journey__meter-place', ' '),
    alt,
    profileEl(stops),
    daysEl(section.days),
    textEl('p', 'journey__meter-note', section.note),
  ].filter(Boolean));
  return meter;
}

// Các điểm đường phải đi qua. Màn rộng: giữa hai trạm thêm một điểm vòng sâu sang cột trống
// bên cạnh thẻ (thẻ trái thì vòng sang phải, thẻ phải thì vòng sang trái), như khúc cua đường đèo.
// Điện thoại không có cột trống, nên đường chỉ đi qua các chấm và uốn nhẹ.
function wayPoints(points, width, height) {
  const first = { x: points[0].x, y: 0 };
  const last = { x: points[points.length - 1].x, y: height };
  if (!wideScreen.matches) return [first, ...points, last];

  const center = width / 2;
  const swing = width * 0.3;
  const out = [first];
  points.forEach((point, i) => {
    out.push(point);
    const next = points[i + 1];
    if (next) out.push({ x: center + swing * (i % 2 === 0 ? 1 : -1), y: (point.y + next.y) / 2 });
  });
  out.push(last);
  return out;
}

// Nối các điểm bằng đường cong. Tại mỗi điểm đường đi thẳng đứng, nên ở chấm trạm và ở đỉnh
// khúc cua nét cong đều, không bị gãy góc.
function roadPath(all) {
  const round = (n) => Math.round(n * 10) / 10;
  let d = `M ${round(all[0].x)} ${round(all[0].y)}`;
  for (let i = 1; i < all.length; i += 1) {
    const a = all[i - 1];
    const b = all[i];
    const bend = (b.y - a.y) * 0.55;
    d += ` C ${round(a.x)} ${round(a.y + bend)} ${round(b.x)} ${round(b.y - bend)} ${round(b.x)} ${round(b.y)}`;
  }
  return d;
}

export class WlJourney extends HTMLElement {
  // Hai thứ làm khối phải vẽ lại: kích thước khối đổi (bề ngang màn hình, font tải xong) thì vẽ lại đường;
  // trang cuộn thì xe, trời, đồng hồ cập nhật. Cuộn rất dày nên gom về một lần mỗi khung hình.
  connectedCallback() {
    this._resize = new ResizeObserver(() => this.drawRoad());
    this._resize.observe(this);
    this._onScroll = () => {
      if (this._ticking) return;
      this._ticking = true;
      requestAnimationFrame(() => {
        this._ticking = false;
        this.update();
      });
    };
    addEventListener('scroll', this._onScroll, { passive: true });
  }

  // core.js thay cả <main> khi đổi thương hiệu; gỡ hết bộ theo dõi để khối cũ không còn chạy ngầm.
  disconnectedCallback() {
    this._resize?.disconnect();
    removeEventListener('scroll', this._onScroll);
  }

  // core.js gán el.data mỗi lần đổi thương hiệu; lưu lại rồi vẽ lại từ đầu.
  set data(section) {
    this._data = section;
    this.render();
  }

  render() {
    const section = this._data;
    const stops = section.stops ?? [];
    this._stops = stops;
    this._active = -1;
    this._total = 0;
    // Khoảng độ cao của cả tour: để quy độ cao đang đi về 0 (trạm thấp nhất) tới 1 (trạm cao nhất),
    // nên thương hiệu nào có số độ cao khác cũng chạy đúng, không ghi cứng mốc nào.
    const alts = stops.map((s) => s.altitude).filter((a) => typeof a === 'number');
    this._altLow = alts.length ? Math.min(...alts) : 0;
    this._altSpan = alts.length ? Math.max(...alts) - this._altLow : 0;
    this.className = `journey journey--${section.variant ?? 'road'}`;

    const head = document.createElement('div');
    head.className = 'journey__head';
    head.append(...[
      textEl('p', 'journey__eyebrow', section.eyebrow),
      textEl('h2', 'journey__title', section.title),
      textEl('p', 'journey__lead', section.lead),
    ].filter(Boolean));

    // Danh sách có thứ tự vì lịch trình đi theo thứ tự; không có trạm thì vẫn ra khối rỗng, không lỗi.
    const list = document.createElement('ol');
    list.className = 'journey__stops';
    list.append(...stops.map(stopEl));

    // Đường và danh sách nằm chung một khung, để toạ độ chấm và toạ độ đường cùng gốc.
    const track = document.createElement('div');
    track.className = 'journey__track';
    track.append(roadEl(), list);

    const layout = document.createElement('div');
    layout.className = 'journey__layout';
    layout.append(meterEl(section, stops), track);

    const inner = document.createElement('div');
    inner.className = 'container';
    inner.append(head, layout);

    // Thay toàn bộ nội dung cũ, nên đổi thương hiệu bao nhiêu lần cũng không bị lặp trạm.
    this.replaceChildren(skyEl(), inner);

    // Lần đầu core.js gán dữ liệu khi khối chưa nằm trên trang, chưa đo được; khi đó
    // ResizeObserver sẽ vẽ ngay lúc khối được gắn vào. Nếu khối đã nằm trên trang thì vẽ ở khung hình kế tiếp.
    if (this.isConnected) requestAnimationFrame(() => this.drawRoad());
  }

  // Đo tâm từng chấm trạm so với khung, vẽ đường đi qua các tâm đó, rồi tính các mốc trên đường.
  drawRoad() {
    const track = this.querySelector('.journey__track');
    const dots = [...this.querySelectorAll('.journey__dot')];
    if (!track || dots.length === 0) return;

    const box = track.getBoundingClientRect();
    const points = dots.map((dot) => {
      const r = dot.getBoundingClientRect();
      return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
    });

    const svg = track.querySelector('.journey__road');
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    const d = roadPath(wayPoints(points, box.width, box.height));
    svg.querySelectorAll('path:not(.journey__beam)').forEach((path) => path.setAttribute('d', d));

    const done = svg.querySelector('.journey__road-done');
    this._total = done.getTotalLength();
    done.style.strokeDasharray = `${this._total} ${this._total}`;
    this._lens = this.lengthsAt(done, points);
    this._lastY = points[points.length - 1].y;
    this._skyKeys = this.skyKeys();
    this.update();
  }

  // Quãng đường từ đầu đường tới từng trạm: lấy mẫu dọc đường, chọn điểm gần tâm chấm nhất.
  // Cần con số này để biết cuộn tới đâu thì xe đã qua trạm nào. Giữ lại các mẫu để tìm điểm theo độ cao.
  lengthsAt(path, points) {
    const samples = Array.from({ length: 401 }, (_, i) => {
      const len = (this._total * i) / 400;
      const p = path.getPointAtLength(len);
      return { len, x: p.x, y: p.y };
    });
    this._samples = samples;
    return points.map((pt) => samples.reduce((best, s) => {
      const dist = (s.x - pt.x) ** 2 + (s.y - pt.y) ** 2;
      return dist < best.dist ? { dist, len: s.len } : best;
    }, { dist: Infinity, len: 0 }).len);
  }

  // Các mốc màu trời dọc đường: mỗi trạm theo giờ của nó; trạm có ghi nơi ngủ thì đoạn giữa chặng sau là đêm.
  skyKeys() {
    const stops = this._stops;
    const keys = [{ len: 0, sky: skyOf(stops[0]?.time) }];
    stops.forEach((stop, i) => {
      keys.push({ len: this._lens[i], sky: skyOf(stop.time) });
      if (stop.night && i < stops.length - 1) {
        const gap = this._lens[i + 1] - this._lens[i];
        keys.push({ len: this._lens[i] + gap * 0.3, sky: 'night' }, { len: this._lens[i] + gap * 0.62, sky: 'night' });
      }
    });
    keys.push({ len: this._total, sky: keys[keys.length - 1].sky });
    return keys;
  }

  // Mỗi lần cuộn: xe nằm ngang mốc trên màn hình (thường là giữa màn hình). Lấy độ cao của mốc trong khung,
  // tìm điểm trên đường có cùng độ cao, rồi cập nhật từng phần theo vị trí đó.
  update() {
    if (!this._total) return;
    const rect = this.querySelector('.journey__track').getBoundingClientRect();
    if (rect.bottom < -innerHeight || rect.top > innerHeight * 2) return;
    const len = this.lengthAtY(clamp(this.anchorY(rect) - rect.top, 0, rect.height));
    const index = this.stopIndexAt(len);

    this.moveCar(reduceMotion.matches ? 0 : len);
    this.paintSky(len);
    this.setActive(index);
    this.showAltitude(len, index);
    this.clearClouds();
  }

  // Mốc của xe trên màn hình. Bình thường là giữa màn hình. Nhưng khi khối nằm gần cuối trang, trang có thể
  // hết chỗ cuộn trước khi trạm cuối lên tới giữa màn hình (thẻ cuối ngắn, phía sau không còn khối nào),
  // nên xe không bao giờ tới trạm cuối. Khi đó, trong nửa màn hình cuộn cuối cùng, kéo dần mốc xuống chỗ
  // trạm cuối sẽ nằm lúc hết trang: cuộn hết trang là xe vừa tới trạm cuối, dữ liệu dài ngắn thế nào cũng vậy.
  anchorY(rect) {
    const middle = innerHeight * 0.5;
    const left = document.documentElement.scrollHeight - innerHeight - scrollY;
    const lastAtEnd = rect.top + this._lastY - left;
    if (lastAtEnd <= middle) return middle;
    return middle + (lastAtEnd - middle) * smooth(0, 1, 1 - left / middle);
  }

  // Đường vòng sang hai bên nên chiều dài không tỉ lệ với độ cuộn; nhưng đường luôn đi xuống,
  // nên độ cao tăng dần theo chiều dài. Tìm nhị phân trong các mẫu rồi nội suy giữa hai mẫu kề nhau.
  lengthAtY(y) {
    const s = this._samples;
    let lo = 0;
    let hi = s.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (s[mid].y <= y) lo = mid;
      else hi = mid;
    }
    const span = s[hi].y - s[lo].y;
    return s[lo].len + (span > 0 ? (y - s[lo].y) / span : 0) * (s[hi].len - s[lo].len);
  }

  stopIndexAt(len) {
    let index = 0;
    this._lens.forEach((stopLen, i) => { if (stopLen <= len + 2) index = i; });
    return index;
  }

  // Đặt xe vào điểm trên đường và xoay theo hướng đường tại đó; phần đường đã đi được tô màu.
  moveCar(len) {
    const svg = this.querySelector('.journey__road');
    const done = svg.querySelector('.journey__road-done');
    done.style.strokeDashoffset = String(this._total - len);
    const at = done.getPointAtLength(len);
    const back = done.getPointAtLength(Math.max(0, len - 1));
    const ahead = done.getPointAtLength(Math.min(this._total, len + 1));
    const angle = (Math.atan2(ahead.y - back.y, ahead.x - back.x) * 180) / Math.PI;
    svg.querySelector('.journey__car').setAttribute('transform', `translate(${at.x} ${at.y}) rotate(${angle})`);
  }

  // Trộn hai khoảng trời liền kề theo vị trí xe giữa hai mốc; mức "đêm" dùng cho sao và đèn xe.
  paintSky(len) {
    const keys = this._skyKeys;
    let i = 0;
    while (i < keys.length - 2 && keys[i + 1].len < len) i += 1;
    const a = keys[i];
    const b = keys[i + 1];
    const t = b.len === a.len ? 1 : smooth(0, 1, (len - a.len) / (b.len - a.len));
    const weight = Object.fromEntries(SKIES.map((name) => [name, 0]));
    weight[a.sky] += 1 - t;
    weight[b.sky] += t;
    this.querySelectorAll('.journey__sky-layer').forEach((layer) => { layer.style.opacity = String(weight[layer.dataset.sky]); });
    this.style.setProperty('--journey-night', weight.night.toFixed(3));
    this.classList.toggle('is-night', weight.night > 0.5);
  }

  setActive(index) {
    if (index === this._active) return;
    this._active = index;
    const stop = this._stops[index] ?? {};
    this.querySelectorAll('.journey__stop').forEach((li, i) => li.classList.toggle('is-active', i === index));
    this.querySelector('.journey__meter-time').textContent = stop.time ?? '';
    this.querySelector('.journey__meter-place').textContent = stop.title ?? '';
    this.querySelectorAll('.journey__profile-dot').forEach((dot) => dot.classList.toggle('is-active', Number(dot.dataset.stop) === index));
    // Mỗi đêm ngủ là hết một ngày: trạm đứng sau bao nhiêu trạm có ghi nơi ngủ thì thuộc ngày thứ bấy nhiêu cộng một.
    const day = this._stops.slice(0, index).filter((s) => s.night).length;
    this.querySelectorAll('.journey__day').forEach((li, i) => li.classList.toggle('is-active', i === day));
  }

  // Độ cao chạy số giữa hai trạm khi cả hai đều có số; trạm không có số thì ẩn, không đoán.
  showAltitude(len, index) {
    const stops = this._stops;
    const here = stops[index]?.altitude;
    const next = stops[index + 1]?.altitude;
    let value = null;
    if (typeof here === 'number' && typeof next === 'number') {
      const span = this._lens[index + 1] - this._lens[index];
      value = here + (next - here) * smooth(0, 1, span ? (len - this._lens[index]) / span : 0);
    } else if (typeof here === 'number') {
      value = here;
    }
    const alt = this.querySelector('.journey__meter-alt');
    alt.hidden = value === null;
    if (value !== null) alt.querySelector('.journey__meter-num').textContent = formatMeters(value);
    this.sinkHills(value);
  }

  // Núi chìm theo độ cao xe đang đi. --journey-high bằng 0 ở trạm thấp nhất (núi đứng cao quanh mình),
  // bằng 1 ở trạm cao nhất (núi chìm dưới chân, biển mây hiện ra). Chặng không có độ cao thì giữ mức cũ.
  // Giảm chuyển động thì núi đứng yên ở mức giữa.
  sinkHills(value) {
    if (reduceMotion.matches) {
      this.style.setProperty('--journey-high', '0.5');
      return;
    }
    if (value === null || !this._altSpan) return;
    this.style.setProperty('--journey-high', clamp((value - this._altLow) / this._altSpan, 0, 1).toFixed(3));
  }

  // Mây phủ ảnh trạm khi trạm còn ở dưới màn hình, tan dần khi trạm đi lên giữa màn hình.
  // Ảnh trong khung trôi chậm hơn khung một chút, tạo cảm giác có chiều sâu.
  clearClouds() {
    const calm = reduceMotion.matches;
    this.querySelectorAll('.journey__photo').forEach((photo) => {
      const r = photo.getBoundingClientRect();
      if (r.top > innerHeight * 1.5 || r.bottom < -innerHeight * 0.5) return;
      const seen = clamp((innerHeight - r.top) / (innerHeight * 0.6), 0, 1);
      const veil = photo.querySelector('.journey__veil');
      veil.style.opacity = calm ? '0' : String(1 - smooth(0.2, 0.85, seen));
      veil.style.transform = `translateX(${seen * 35}%)`;
      const img = photo.querySelector('img');
      if (img) img.style.transform = calm ? '' : `translateY(${(r.top + r.height / 2 - innerHeight / 2) * -0.06}px)`;
    });
  }
}
