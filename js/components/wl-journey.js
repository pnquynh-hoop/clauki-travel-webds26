/* wl-journey.js - khối lịch trình: các trạm của chuyến đi nằm dọc một con đường.
   Cuộn trang thì xe chạy theo, trời đổi màu theo giờ, đồng hồ báo độ cao, núi chìm dần khi lên cao.
   Rê chuột vào ảnh trạm thì mây bay ra kể việc làm ở đó. Cuối đường có ô giữ chỗ.
   Chữ và ảnh đều lấy từ content.json nên thương hiệu nào cũng dùng được. */
import { asset } from '../core.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
// Năm khoảng trời trong ngày; mỗi khoảng là một lớp màu trong CSS.
const SKIES = ['dawn', 'morning', 'noon', 'afternoon', 'night'];
// Người xem bật "giảm chuyển động" trong máy thì xe, mây, núi đứng yên.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
// Màn hình từ 760px (giống journey.css): thẻ xen kẽ hai bên, có chỗ trống cho mây và khúc cua.
const wideScreen = matchMedia('(min-width: 760px)');

// Giữ một số nằm trong khoảng từ min tới max.
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
// Đi dần từ 0 lên 1, chậm ở hai đầu, để chuyển động không bị giật.
const smooth = (from, to, x) => {
  const t = clamp((x - from) / (to - from), 0, 1);
  return t * t * (3 - 2 * t);
};

// Tạo một thẻ chữ. Chữ trống thì trả về null để bỏ qua, không tạo ô rỗng.
function textEl(tag, className, text) {
  if (!text) return null;
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  return el;
}

// Tạo một hình vẽ SVG (đường, xe, núi, biểu đồ).
function svgEl(tag, className) {
  const el = document.createElementNS(SVG_NS, tag);
  if (className) el.setAttribute('class', className);
  return el;
}

// Viết độ cao kiểu Việt Nam, làm tròn tới chục mét: 1400 thành "1.400".
function formatMeters(altitude) {
  return (Math.round(altitude / 10) * 10).toLocaleString('vi-VN');
}

// Đoán màu trời từ giờ ghi ở trạm ("Ngày 2 · 05:00" là bình minh). Không có giờ thì coi là ban ngày.
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

// Khung ảnh của trạm, có lớp mây phủ lên để tan dần khi cuộn tới.
// Không có ảnh thì không có khung; ảnh hỏng thì gỡ khung để thẻ không còn ô trống.
function photoEl(image, onError) {
  if (!image?.src) return null;
  const box = document.createElement('div');
  box.className = 'journey__photo';
  const img = document.createElement('img');
  img.src = asset(image.src);
  img.alt = image.alt ?? '';
  img.loading = 'lazy';
  img.addEventListener('error', () => {
    box.remove();
    onError();
  }, { once: true });
  const veil = document.createElement('div');
  veil.className = 'journey__veil';
  box.append(img, veil);
  return box;
}

// Hai loại mây có màu riêng trong CSS: chỗ ngủ (night) và đồ nên mang (tip).
const PUFF_KINDS = ['night', 'tip'];
// Đếm để mỗi danh sách mây có một mã riêng, nhờ đó nút biết mình mở danh sách nào.
let planCount = 0;

// Ảnh nhỏ trong đám mây, cho thấy hoạt động. Ảnh hỏng thì bỏ ảnh, chữ vẫn còn.
function puffImageEl(image) {
  if (!image?.src) return null;
  const img = document.createElement('img');
  img.className = 'journey__puff-img';
  img.src = asset(image.src);
  img.alt = image.alt ?? '';
  img.loading = 'lazy';
  img.addEventListener('error', () => img.remove(), { once: true });
  return img;
}

// Liên kết ở cuối đám mây, dẫn sang khối khác của trang (ví dụ khối làm trà).
function puffLinkEl(link) {
  if (!link?.label || !link.href) return null;
  const a = document.createElement('a');
  a.className = 'journey__puff-link';
  a.href = link.href;
  a.textContent = link.label;
  return a;
}

// Một đám mây: mốc giờ, việc làm, ảnh và liên kết (nếu có).
// Hình đám mây là một lớp riêng nằm sau chữ, chỉ để trang trí.
function puffEl(item, index) {
  const li = document.createElement('li');
  li.className = PUFF_KINDS.includes(item.kind) ? `journey__puff journey__puff--${item.kind}` : 'journey__puff';
  // Số thứ tự của đám mây: CSS dùng để các đám bay ra nối tiếp nhau và bập bềnh lệch nhịp.
  li.style.setProperty('--i', index);
  const cloud = document.createElement('span');
  cloud.className = 'journey__puff-cloud';
  cloud.setAttribute('aria-hidden', 'true');
  const text = document.createElement('p');
  text.className = 'journey__puff-text';
  text.append(...[
    textEl('span', 'journey__puff-time', item.time),
    item.text ? document.createTextNode(item.text) : null,
    puffLinkEl(item.link),
  ].filter(Boolean));
  li.append(...[cloud, puffImageEl(item.image), text].filter(Boolean));
  return li;
}

// Danh sách các đám mây của một trạm. Tên đọc cho trình đọc màn hình ghép từ chữ trên nút và tên trạm.
function planEl(stop, label, id) {
  const list = document.createElement('ul');
  list.className = 'journey__plan';
  list.id = id;
  list.setAttribute('aria-label', [label, stop.title].filter(Boolean).join(' '));
  list.append(...stop.plan.map(puffEl));
  return list;
}

// Nút "Ở đây làm gì?" trên ảnh trạm: bấm để mở hoặc đóng mây; báo cho trình đọc màn hình biết mây đang mở hay đóng.
function moreEl(label, id) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'journey__more';
  button.textContent = label;
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', id);
  return button;
}

// Chuột đang ở trên ảnh trạm (rê vào thì mở mây) hay trên chính đám mây (giữ mây mở).
function planZone(node) {
  return node instanceof Element ? node.closest('.journey__photo, .journey__plan') : null;
}

// Dựng một trạm: chấm trên đường, thẻ (ảnh, giờ, độ cao, tên, mô tả, nơi ngủ) và mây kể việc.
// Mây chỉ có khi khối có chữ cho nút mở (planLabel) và trạm có danh sách việc (plan).
function stopEl(stop, label) {
  const li = document.createElement('li');
  li.className = 'journey__stop';

  // Chấm trên đường chỉ để nhìn nên ẩn với trình đọc màn hình.
  const dot = document.createElement('span');
  dot.className = 'journey__dot';
  dot.setAttribute('aria-hidden', 'true');

  // Dòng giờ và độ cao trên tên trạm; trạm không có độ cao thì chỉ có giờ.
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

  const hasPlan = Boolean(label && stop.plan?.length);
  planCount += 1;
  const id = `journey-plan-${planCount}`;
  const more = hasPlan ? moreEl(label, id) : null;
  // Nút nằm ở góc ảnh; trạm không có ảnh hoặc ảnh hỏng thì nút xuống dưới phần chữ.
  const photo = photoEl(stop.image, () => { if (more) body.append(more); });
  if (more) (photo ?? body).append(more);

  const card = document.createElement('article');
  card.className = 'journey__card';
  card.append(...[photo, body].filter(Boolean));

  li.append(...[dot, card, hasPlan ? planEl(stop, label, id) : null].filter(Boolean));
  return li;
}

// Ô cuối con đường: báo chuyến gần nhất và có nút đặt chỗ, đúng lúc người xem vừa đọc hết lịch trình.
// Nút lấy chữ và đích từ nút chính của trang (site.cta) để cả trang thống nhất.
function finishEl(finish, cta) {
  if (!finish) return null;
  let button = null;
  if (cta?.label && cta.href) {
    button = document.createElement('a');
    button.className = 'btn journey__finish-cta';
    button.href = cta.href;
    button.textContent = cta.label;
  }
  const box = document.createElement('div');
  box.className = 'journey__finish';
  box.append(...[
    textEl('p', 'journey__finish-eyebrow', finish.eyebrow),
    textEl('p', 'journey__finish-title', finish.title),
    button,
    textEl('p', 'journey__finish-text', finish.text),
  ].filter(Boolean));
  return box.childElementCount ? box : null;
}

// Hình ba dải núi xa, giữa, gần, vẽ trong khung 1440 x 400 rồi kéo giãn theo bề ngang màn hình.
const RIDGES = {
  far: 'M0 400 V170 C120 150 180 90 260 100 C340 110 380 160 470 150 C560 140 600 60 700 70 C800 80 830 150 930 140 C1030 130 1080 70 1180 80 C1280 90 1350 140 1440 130 V400Z',
  mid: 'M0 400 V240 C100 220 170 170 250 180 C340 192 380 250 480 240 C580 230 640 170 740 180 C840 190 880 250 990 240 C1090 230 1150 180 1250 190 C1340 198 1400 230 1440 230 V400Z',
  near: 'M0 400 V320 C140 290 260 280 380 300 C520 322 600 340 720 330 C860 318 940 280 1080 290 C1220 300 1320 330 1440 320 V400Z',
};

// Núi ở đáy màn hình, nằm sau thẻ. Mỗi dải là một hình riêng để khi xe lên cao, dải gần chìm nhiều hơn dải xa,
// tạo chiều sâu. Lớp biển mây nằm trên núi, hiện ra ở trạm cao nhất.
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

// Nền trời của khối: mỗi khoảng trời một lớp màu, thêm lớp sao và núi.
// Mã chỉ đổi độ đậm nhạt của từng lớp để trời chuyển màu dần; màu nằm trong CSS.
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

// Con đường và chiếc xe: viền đường, mặt đường, vạch giữa, phần đường đã đi (tô màu).
// Chỉ để nhìn nên ẩn với trình đọc màn hình.
function roadEl() {
  const svg = svgEl('svg', 'journey__road');
  svg.setAttribute('aria-hidden', 'true');
  svg.append(
    svgEl('path', 'journey__road-edge'),
    svgEl('path', 'journey__road-base'),
    svgEl('path', 'journey__road-lane'),
    svgEl('path', 'journey__road-done'),
  );

  // Xe vẽ đầu quay sang phải, khi chạy được xoay theo hướng đường. Phía trước có luồng đèn pha, chỉ sáng lúc đêm.
  const car = svgEl('g', 'journey__car');
  const beam = svgEl('path', 'journey__beam');
  beam.setAttribute('d', 'M14 -6 L120 -46 L120 46 L14 6 Z');
  // Thân, mui, kính xe: mỗi phần một hình chữ nhật bo góc (vị trí x, y, rộng, cao, độ bo).
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
// Cần ít nhất hai trạm có độ cao mới vẽ được; thiếu thì bỏ.
function profileEl(stops) {
  const known = stops.map((s, i) => ({ i, altitude: s.altitude })).filter((s) => typeof s.altitude === 'number');
  if (known.length < 2) return null;
  // Đổi độ cao thành vị trí trong khung 220 x 64: trạm thấp nhất nằm dưới, trạm cao nhất nằm trên.
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

// Tìm trạm mở đầu mỗi ngày: ngày 1 bắt đầu ở trạm đầu, qua mỗi đêm ngủ là sang ngày mới.
// Cách đếm giống chỗ tô ngày (setActive), nên bấm ngày nào thì tô đúng ngày đó.
function dayStarts(stops) {
  const starts = stops.length ? [0] : [];
  stops.forEach((stop, i) => { if (stop.night && i < stops.length - 1) starts.push(i + 1); });
  return starts;
}

// Danh sách các ngày ở cột đồng hồ. Mỗi ngày là một liên kết tới trạm đầu của ngày đó.
// Ngày không tìm được trạm (dữ liệu ghi thừa ngày) thì vẫn hiện chữ nhưng không bấm được.
function daysEl(days, targets) {
  if (!days?.length) return null;
  const list = document.createElement('ol');
  list.className = 'journey__days';
  list.append(...days.map((day, i) => {
    const link = document.createElement('a');
    link.className = 'journey__day-link';
    if (targets[i]) link.href = `#${targets[i]}`;
    link.append(...[textEl('strong', 'journey__day-title', day.title), textEl('span', 'journey__day-text', day.text)].filter(Boolean));
    const li = document.createElement('li');
    li.append(link);
    return li;
  }));
  return list;
}

// Cột đồng hồ cạnh con đường: trạm đang tới, độ cao, biểu đồ, các ngày và ghi chú nguồn độ cao.
// Phần đã có trong thẻ trạm thì ẩn với trình đọc màn hình để khỏi đọc hai lần; danh sách ngày giữ lại vì bấm được.
function meterEl(section, stops, dayTargets) {
  const meter = document.createElement('aside');
  meter.className = 'journey__meter';

  const alt = document.createElement('p');
  alt.className = 'journey__meter-alt';
  const num = document.createElement('span');
  num.className = 'journey__meter-num';
  alt.append(num, textEl('span', 'journey__meter-unit', 'm'));

  const echoes = [
    textEl('p', 'journey__meter-time', ' '),
    textEl('p', 'journey__meter-place', ' '),
    alt,
    profileEl(stops),
  ].filter(Boolean);
  echoes.forEach((node) => node.setAttribute('aria-hidden', 'true'));
  const note = textEl('p', 'journey__meter-note', section.note);
  note?.setAttribute('aria-hidden', 'true');

  meter.append(...[...echoes, daysEl(section.days, dayTargets), note].filter(Boolean));
  return meter;
}

// Chọn các điểm con đường phải đi qua: tâm từng chấm trạm.
// Màn rộng thì giữa hai trạm thêm một khúc cua sang cột trống, như đường đèo; điện thoại thì đi qua các chấm.
function wayPoints(points, width, height, end) {
  // Có ô cuối thì đường dừng ở mép trên của ô; không có thì chạy tới đáy khối.
  const first = { x: points[0].x, y: 0 };
  const last = end ?? { x: points[points.length - 1].x, y: height };
  if (!wideScreen.matches) return [first, ...points, last];

  // Khúc cua lần lượt sang phải rồi sang trái, cách giữa khối 30% bề ngang.
  const center = width / 2;
  const swing = width * 0.3;
  const route = end ? [...points, end] : points;
  const out = [first];
  route.forEach((point, i) => {
    out.push(point);
    const next = route[i + 1];
    if (next) out.push({ x: center + swing * (i % 2 === 0 ? 1 : -1), y: (point.y + next.y) / 2 });
  });
  if (!end) out.push(last);
  return out;
}

// Chỗ con đường dừng ở ô cuối: màn rộng thì vào giữa mép trên của ô; điện thoại thì đi thẳng xuống từ trạm cuối.
function finishPoint(finish, box, points) {
  const r = finish.getBoundingClientRect();
  const x = wideScreen.matches ? r.left + r.width / 2 - box.left : points[points.length - 1].x;
  return { x, y: r.top - box.top + 2 };
}

// Nối các điểm thành một đường cong mềm, đi qua chấm trạm và khúc cua mà không gãy góc.
function roadPath(all) {
  // Làm tròn tới một chữ số lẻ cho dữ liệu đường ngắn gọn.
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

// Thẻ <wl-journey>: core.js tạo thẻ này cho mỗi khối lịch trình trong content.json.
export class WlJourney extends HTMLElement {
  // Khi khối được gắn vào trang: bắt đầu theo dõi cuộn, chuột, phím và cỡ khối.
  // Khối đổi cỡ (xoay màn hình, font tải xong, mây mở trên điện thoại) thì vẽ lại đường.
  connectedCallback() {
    this._resize = new ResizeObserver(() => this.drawRoad());
    this._resize.observe(this);
    this._onScroll = () => {
      // Nhớ lúc vừa cuộn, để không mở mây khi ảnh tự trôi qua dưới chuột đang đứng yên.
      this._lastScroll = performance.now();
      this.cancelPlanIntent();
      // Cuộn báo về rất nhiều lần; gom lại, mỗi khung hình chỉ cập nhật một lần cho mượt.
      if (this._ticking) return;
      this._ticking = true;
      requestAnimationFrame(() => {
        this._ticking = false;
        this.update();
      });
    };
    // Một lần bấm có thể là bấm vào ngày hoặc bấm nút mở mây.
    this._onClick = (e) => {
      this.onDayClick(e);
      this.onPlanClick(e);
    };
    this._onHover = (e) => this.onPlanHover(e);
    this._onLeave = (e) => this.onPlanLeave(e);
    this._onKey = (e) => this.onPlanKey(e);
    addEventListener('scroll', this._onScroll, { passive: true });
    addEventListener('keydown', this._onKey);
    this.addEventListener('click', this._onClick);
    this.addEventListener('pointerover', this._onHover);
    this.addEventListener('pointermove', this._onHover);
    this.addEventListener('pointerout', this._onLeave);
  }

  // Khi khối bị gỡ khỏi trang (đổi thương hiệu): tắt hết theo dõi để khối cũ không chạy ngầm.
  disconnectedCallback() {
    this._resize?.disconnect();
    removeEventListener('scroll', this._onScroll);
    removeEventListener('keydown', this._onKey);
    this.removeEventListener('click', this._onClick);
    this.removeEventListener('pointerover', this._onHover);
    this.removeEventListener('pointermove', this._onHover);
    this.removeEventListener('pointerout', this._onLeave);
    this.cancelPlanIntent();
    clearTimeout(this._planClose);
  }

  // core.js đưa dữ liệu vào đây mỗi lần đổi thương hiệu; mỗi lần đều dựng lại từ đầu.
  set data(section) {
    this._data = section;
    this.render();
  }

  // Dựng toàn bộ khối từ dữ liệu: tiêu đề, cột đồng hồ, con đường, các trạm, ô cuối.
  render() {
    const section = this._data;
    const stops = section.stops ?? [];
    // Xoá trạng thái của lần dựng trước: trạm đang sáng, mây đang mở, lượt chờ mở mây.
    this._stops = stops;
    this._active = -1;
    this._total = 0;
    this._pinned = null;
    this.cancelPlanIntent();
    clearTimeout(this._planClose);
    // Độ cao thấp nhất và cao nhất của chuyến, để biết xe đang cao tới đâu (núi chìm theo đó).
    // Tính từ dữ liệu nên thương hiệu nào cũng đúng, không ghi cứng con số nào.
    const alts = stops.map((s) => s.altitude).filter((a) => typeof a === 'number');
    this._altLow = alts.length ? Math.min(...alts) : 0;
    this._altSpan = alts.length ? Math.max(...alts) - this._altLow : 0;
    this.className = `journey journey--${section.variant ?? 'road'}`;

    // Phần đầu khối: dòng nhỏ, tiêu đề, câu dẫn; trường nào trống thì bỏ.
    const head = document.createElement('div');
    head.className = 'journey__head';
    head.append(...[
      textEl('p', 'journey__eyebrow', section.eyebrow),
      textEl('h2', 'journey__title', section.title),
      textEl('p', 'journey__lead', section.lead),
    ].filter(Boolean));

    // Các trạm theo đúng thứ tự trong dữ liệu. Mỗi trạm có mã riêng (ví dụ lich-trinh-3)
    // để danh sách ngày dẫn tới; ghép với mã của khối để không trùng với khối khác.
    const stopId = (i) => `${this.id || 'journey'}-${i + 1}`;
    const list = document.createElement('ol');
    list.className = 'journey__stops';
    list.append(...stops.map((stop, i) => {
      const li = stopEl(stop, section.planLabel);
      li.id = stopId(i);
      return li;
    }));

    // Đường, các trạm và ô cuối nằm chung một khung, để đo vị trí chấm và vẽ đường cho khớp.
    const finish = finishEl(section.finish, this.site?.cta);
    const track = document.createElement('div');
    track.className = 'journey__track';
    track.append(...[roadEl(), list, finish].filter(Boolean));

    // Bố cục: cột đồng hồ và con đường.
    const layout = document.createElement('div');
    layout.className = 'journey__layout';
    layout.append(meterEl(section, stops, dayStarts(stops).map(stopId)), track);

    // Không có trạm nào thì không có đường để đi: chỉ giữ tiêu đề và ô cuối (nếu có).
    const inner = document.createElement('div');
    inner.className = 'container';
    inner.append(...[head, stops.length ? layout : finish].filter(Boolean));

    // Thay toàn bộ nội dung cũ, nên đổi thương hiệu bao nhiêu lần cũng không bị lặp.
    this.replaceChildren(skyEl(), inner);

    // Khối đã nằm trên trang thì vẽ đường ở khung hình kế tiếp; chưa nằm trên trang thì đợi lúc được gắn vào.
    if (this.isConnected) requestAnimationFrame(() => this.drawRoad());
  }

  // Đo vị trí từng chấm trạm rồi vẽ con đường đi qua các chấm đó.
  // Chạy lại mỗi khi khối đổi cỡ, vì thẻ xê dịch thì đường phải theo.
  drawRoad() {
    const track = this.querySelector('.journey__track');
    const dots = [...this.querySelectorAll('.journey__dot')];
    if (!track || dots.length === 0) return;

    // Tâm từng chấm, tính từ góc trên trái của khung.
    const box = track.getBoundingClientRect();
    const points = dots.map((dot) => {
      const r = dot.getBoundingClientRect();
      return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
    });

    // Bốn lớp của con đường (viền, mặt, vạch, phần đã đi) dùng chung một hình.
    const finish = track.querySelector('.journey__finish');
    const end = finish ? finishPoint(finish, box, points) : null;
    const svg = track.querySelector('.journey__road');
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    const d = roadPath(wayPoints(points, box.width, box.height, end));
    svg.querySelectorAll('path:not(.journey__beam)').forEach((path) => path.setAttribute('d', d));

    // Đo chiều dài đường và vị trí từng trạm trên đường, để biết cuộn tới đâu thì xe ở đâu.
    const done = svg.querySelector('.journey__road-done');
    this._total = done.getTotalLength();
    done.style.strokeDasharray = `${this._total} ${this._total}`;
    this._lens = this.lengthsAt(done, points);
    // Chỗ cuối cùng xe cần tới: ô cuối đường nếu có, không thì trạm cuối.
    this._lastY = (end ?? points[points.length - 1]).y;
    this._skyKeys = this.skyKeys();
    this.update();
  }

  // Tính mỗi trạm nằm ở quãng thứ bao nhiêu trên con đường, để biết xe đã qua trạm nào.
  // Cách làm: lấy 400 điểm dọc đường, chọn điểm gần chấm trạm nhất. Giữ các điểm này để dùng khi cuộn.
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

  // Đặt các mốc màu trời dọc đường: tới trạm nào thì trời theo giờ của trạm đó.
  // Trạm có nơi ngủ thì khoảng giữa chặng sau là đêm.
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

  // Chạy mỗi lần cuộn: tìm xe đang ở đâu trên đường, rồi cập nhật xe, trời, trạm đang tới, độ cao, mây trên ảnh.
  update() {
    if (!this._total) return;
    // Khối còn ở quá xa màn hình thì bỏ qua cho đỡ tốn máy.
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

  // Chỗ xe nằm trên màn hình: bình thường là giữa màn hình. Gần cuối trang có thể hết chỗ cuộn trước khi
  // trạm cuối lên tới giữa, nên kéo dần chỗ này xuống để cuộn hết trang là xe vừa tới nơi.
  anchorY(rect) {
    const middle = innerHeight * 0.5;
    const left = document.documentElement.scrollHeight - innerHeight - scrollY;
    const lastAtEnd = rect.top + this._lastY - left;
    if (lastAtEnd <= middle) return middle;
    return middle + (lastAtEnd - middle) * smooth(0, 1, 1 - left / middle);
  }

  // Đổi một độ cao trong khung thành quãng đường xe đã đi. Đường luôn đi xuống nên tìm nhanh được
  // trong các điểm đã lấy; xuống quá cuối đường thì xe dừng ở cuối đường.
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
    return Math.min(this._total, s[lo].len + (span > 0 ? (y - s[lo].y) / span : 0) * (s[hi].len - s[lo].len));
  }

  // Trạm xa nhất mà xe đã tới (lệch 2px vẫn tính là tới).
  stopIndexAt(len) {
    let index = 0;
    this._lens.forEach((stopLen, i) => { if (stopLen <= len + 2) index = i; });
    return index;
  }

  // Đặt xe vào đúng điểm trên đường và tô màu đoạn đường đã đi.
  // Lấy hai điểm sát trước và sau xe để biết đường đang hướng về đâu, rồi xoay xe theo.
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

  // Trộn hai màu trời liền kề theo vị trí xe, để trời chuyển màu dần.
  // Mức "đêm" dùng để hiện sao, bật đèn xe và đổi chữ tiêu đề sang màu sáng.
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

  // Làm sáng trạm xe vừa tới và cập nhật đồng hồ: giờ, tên trạm, chấm trên biểu đồ, ngày đang đi.
  setActive(index) {
    if (index === this._active) return;
    this._active = index;
    const stop = this._stops[index] ?? {};
    this.querySelectorAll('.journey__stop').forEach((li, i) => li.classList.toggle('is-active', i === index));
    this.querySelector('.journey__meter-time').textContent = stop.time ?? '';
    this.querySelector('.journey__meter-place').textContent = stop.title ?? '';
    this.querySelectorAll('.journey__profile-dot').forEach((dot) => dot.classList.toggle('is-active', Number(dot.dataset.stop) === index));
    // Mỗi đêm ngủ là hết một ngày: đếm số đêm trước trạm này là ra đang ở ngày thứ mấy.
    const day = this._stops.slice(0, index).filter((s) => s.night).length;
    this.querySelectorAll('.journey__day-link').forEach((link, i) => {
      if (i === day) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
  }

  // Cho đồng hồ chạy số độ cao giữa hai trạm. Trạm không có số thì ẩn số, không đoán.
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

  // Núi chìm dần khi xe lên cao: ở trạm thấp nhất núi đứng cao quanh mình, ở trạm cao nhất núi chìm dưới chân.
  // Chặng không có độ cao thì giữ nguyên; người xem bật giảm chuyển động thì núi đứng yên ở mức giữa.
  sinkHills(value) {
    if (reduceMotion.matches) {
      this.style.setProperty('--journey-high', '0.5');
      return;
    }
    if (value === null || !this._altSpan) return;
    this.style.setProperty('--journey-high', clamp((value - this._altLow) / this._altSpan, 0, 1).toFixed(3));
  }

  // Mây phủ ảnh trạm tan dần khi trạm đi lên giữa màn hình, như xe đi xuyên qua mây.
  // Ảnh trôi chậm hơn khung một chút để có cảm giác chiều sâu.
  clearClouds() {
    const calm = reduceMotion.matches;
    this.querySelectorAll('.journey__photo').forEach((photo) => {
      const r = photo.getBoundingClientRect();
      // Ảnh còn ở quá xa màn hình thì bỏ qua.
      if (r.top > innerHeight * 1.5 || r.bottom < -innerHeight * 0.5) return;
      const seen = clamp((innerHeight - r.top) / (innerHeight * 0.6), 0, 1);
      const veil = photo.querySelector('.journey__veil');
      veil.style.opacity = calm ? '0' : String(1 - smooth(0.2, 0.85, seen));
      veil.style.transform = `translateX(${seen * 35}%)`;
      const img = photo.querySelector('img');
      if (img) img.style.transform = calm ? '' : `translateY(${(r.top + r.height / 2 - innerHeight / 2) * -0.06}px)`;
    });
  }

  // Mở mây của một trạm và đóng các trạm khác, mỗi lúc chỉ một trạm mở; truyền null để đóng hết.
  openPlan(li) {
    this.querySelectorAll('.journey__stop.is-open').forEach((open) => { if (open !== li) this.setPlanOpen(open, false); });
    if (li) this.setPlanOpen(li, true);
  }

  // Mở hoặc đóng mây của một trạm, và báo cho trình đọc màn hình biết nút đang ở trạng thái nào.
  setPlanOpen(li, open) {
    if (open) this.hideDeadLinks(li);
    li.classList.toggle('is-open', open);
    li.querySelector('.journey__more')?.setAttribute('aria-expanded', String(open));
  }

  // Ẩn liên kết trong mây nếu khối nó dẫn tới không có trên trang (bị ẩn hoặc chưa làm), để không bấm vào chỗ trống.
  // Xét lúc mở mây chứ không lúc vẽ, vì lúc vẽ khối này thì các khối phía sau chưa có.
  hideDeadLinks(li) {
    li.querySelectorAll('.journey__puff-link').forEach((a) => {
      const href = a.getAttribute('href');
      a.hidden = href.startsWith('#') && !document.getElementById(href.slice(1));
    });
  }

  // Huỷ lượt chờ mở mây đang đếm giờ (khi chuột rời đi hoặc trang bắt đầu cuộn).
  cancelPlanIntent() {
    clearTimeout(this._planIntent);
    this._intentStop = null;
  }

  // Bấm một ngày: cuộn mượt tới khi chấm trạm đầu ngày đó nằm ngay chỗ xe (giữa màn hình), xe chạy qua đoạn ở giữa.
  // Cách này tới đúng trạm dù thẻ dài hay ngắn. Người xem bật giảm chuyển động thì nhảy thẳng tới.
  onDayClick(e) {
    const link = e.target.closest('.journey__day-link[href]');
    const dot = link && document.getElementById(link.hash.slice(1))?.querySelector('.journey__dot');
    if (!dot) return;
    e.preventDefault();
    const r = dot.getBoundingClientRect();
    // Cộng 8px để xe đi quá chấm một chút, chắc chắn được tính là đã tới trạm.
    scrollTo({ top: scrollY + r.top + r.height / 2 - innerHeight / 2 + 8, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  }

  // Bấm nút: mở mây và giữ mở (dùng được trên điện thoại và bằng bàn phím); bấm lần nữa thì đóng.
  onPlanClick(e) {
    const button = e.target.closest('.journey__more');
    if (!button) return;
    const li = button.closest('.journey__stop');
    if (this._pinned === li) {
      this._pinned = null;
      this.setPlanOpen(li, false);
    } else {
      this._pinned = li;
      this.openPlan(li);
    }
  }

  // Rê chuột vào ảnh và dừng một nhịp ngắn (150ms) thì mở mây; chỉ với chuột, trên màn từ 760px.
  // Đang cuộn thì bỏ qua: ảnh trôi qua dưới chuột cũng tính là rê vào, không chặn thì mây chớp liên tục.
  onPlanHover(e) {
    if (e.pointerType !== 'mouse' || !wideScreen.matches) return;
    const zone = planZone(e.target);
    if (!zone) return;
    clearTimeout(this._planClose);
    const li = zone.closest('.journey__stop');
    const idle = performance.now() - (this._lastScroll ?? 0) > 500;
    if (!idle || li.classList.contains('is-open') || this._intentStop === li || !zone.matches('.journey__photo')) return;
    this.cancelPlanIntent();
    this._intentStop = li;
    this._planIntent = setTimeout(() => {
      this._intentStop = null;
      this._pinned = null;
      this.openPlan(li);
    }, 150);
  }

  // Chuột rời cả ảnh lẫn mây thì đợi một nhịp (380ms) mới đóng, để kịp đưa chuột từ ảnh sang mây.
  // Đi qua lại bên trong cùng một trạm thì không tính là rời.
  onPlanLeave(e) {
    if (e.pointerType !== 'mouse' || !wideScreen.matches) return;
    const from = planZone(e.target);
    const to = planZone(e.relatedTarget);
    if (!from || (to && to.closest('.journey__stop') === from.closest('.journey__stop'))) return;
    this.cancelPlanIntent();
    clearTimeout(this._planClose);
    this._planClose = setTimeout(() => { if (!this._pinned) this.openPlan(null); }, 380);
  }

  // Nhấn Esc thì đóng mây; nếu mây mở bằng nút thì đưa con trỏ bàn phím về lại nút đó.
  onPlanKey(e) {
    if (e.key !== 'Escape' || !this.querySelector('.journey__stop.is-open')) return;
    const button = this._pinned?.querySelector('.journey__more');
    this._pinned = null;
    this.openPlan(null);
    button?.focus();
  }
}
