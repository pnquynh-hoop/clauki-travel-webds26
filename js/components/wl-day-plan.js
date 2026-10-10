/* wl-day-plan.js - một ngày ở nơi đến, kể bằng các mốc giờ như các bến dọc một con sông.
   Lớp nền: danh sách bến (<ol>), mỗi bến một khung ảnh có số thứ tự lớn; bấm ảnh thì hiện vài dòng mô tả.
   Lớp hiệu ứng: số, ảnh, chữ của mỗi bến có độ tiến --p (0 tới 1) theo độ cuộn, CSS đọc --p để số đầy nước,
   ảnh mở ra, chữ trượt vào; sông vẽ bằng SVG theo chiều cao khối, xuồng trôi theo độ cuộn,
   nền đổi màu theo giờ của bến đang tới.
   Múi giờ lấy từ site.place.timezone, nên thương hiệu nào dùng khối này cũng có giờ thật của nơi mình. */
import { asset } from '../core.js';
import { textEl, groupEl } from '../dom.js';

const NS = 'http://www.w3.org/2000/svg';
// Mỗi phần bắt đầu hiện khi mép trên vừa ló khỏi đáy màn hình, hiện xong sau khi cuộn thêm 35% chiều cao màn hình:
// phần nào người xem đã thấy thì đã hiện gần đủ, không phải chờ tới giữa màn hình.
const REVEAL_DISTANCE = 0.35;
// Xuồng ở chỗ sông cắt ngang giữa màn hình; bến có tâm gần vạch này nhất là bến đang tới.
const BOAT_LINE = 0.5;
// Các lớp của dòng sông từ ngoài vào trong: [tên, bề rộng so với lòng sông, độ lệch khỏi tim sông].
// Bờ cây nhoè rộng, bờ cát ướt, nước sát bờ sẫm hơn, nước giữa sáng dần, dải trời phản chiếu lệch về một bên bờ.
// Chồng nhiều nét rồi làm mờ nhẹ thì màu chuyển dần từ mép vào giữa như nước thật.
const LAYERS = [['bank', 2.6, 0], ['shore', 1.22, 0], ['edge', 1, 0], ['water', 0.74, 0], ['center', 0.42, 0.04], ['sky', 0.12, -0.2]];
// Vệt dòng chảy song song với sông, lệch khỏi tim sông theo tỉ lệ bề rộng.
const FLOWS = [-0.28, 0.06, 0.3];
// Phần đầu và cuối sông mờ dần vào nền (tỉ lệ theo chiều cao sông); xuồng chỉ đi trong khúc giữa còn rõ.
const FADE = 0.07;
let instance = 0;

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + (m || 0);
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Giờ hiện tại ở múi giờ của nơi đến. Múi giờ sai hoặc thiếu thì dùng giờ máy, không làm hỏng khối.
function nowAt(timeZone) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type).value;
    return `${get('hour')}:${get('minute')}`;
  } catch {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}

// Mốc đang diễn ra: mốc gần nhất đã bắt đầu; trước mốc đầu tiên thì vẫn là mốc cuối của hôm trước.
function liveIndexOf(stops, hhmm) {
  const now = toMinutes(hhmm);
  let index = stops.length - 1;
  stops.forEach((stop, i) => { if (toMinutes(stop.time) <= now) index = i; });
  return now < toMinutes(stops[0].time) ? stops.length - 1 : index;
}

// Giai đoạn trong ngày suy ra từ giờ của mốc, dùng để đổi màu nền; không cần ghi vào dữ liệu.
function phaseOf(hhmm) {
  const m = toMinutes(hhmm);
  if (m < 7 * 60) return 'dawn';
  if (m < 11 * 60) return 'morning';
  if (m < 14 * 60) return 'noon';
  if (m < 17 * 60) return 'afternoon';
  if (m < 19 * 60 + 30) return 'evening';
  return 'night';
}

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  return el;
}

// Xuồng nhìn từ trên xuống, mũi theo trục x dương: vệt sóng và gợn nước nằm phía sau, nón lá là chấm tròn ở giữa.
function boatEl() {
  const boat = svgEl('g', { class: 'day-plan__boat' });
  const wake = svgEl('g', { class: 'day-plan__boat-wake' });
  wake.append(svgEl('path', { d: 'M -24 -5 Q -42 -11 -64 -21' }), svgEl('path', { d: 'M -24 5 Q -42 11 -64 21' }));
  const body = svgEl('g', { class: 'day-plan__boat-body' });
  body.append(
    svgEl('path', { class: 'day-plan__hull', d: 'M-30 0 C -16 -11, 16 -11, 30 0 C 16 11, -16 11, -30 0 Z' }),
    svgEl('path', { class: 'day-plan__deck', d: 'M-22 0 C -11 -6.5, 11 -6.5, 22 0 C 11 6.5, -11 6.5, -22 0 Z' }),
    svgEl('path', { class: 'day-plan__seat', d: 'M-13 -5 L -13 5 M 14 -5 L 14 5' }),
    svgEl('line', { class: 'day-plan__paddle', x1: 4, y1: 4, x2: -6, y2: 23 }),
    svgEl('circle', { class: 'day-plan__hat', cx: 2, cy: 0, r: 7.5 }),
    svgEl('circle', { class: 'day-plan__hat-ring', cx: 2, cy: 0, r: 3.4 }),
  );
  boat.append(
    wake,
    // Bóng xuồng in xuống mặt nước, lệch một chút như nắng chiếu xiên.
    svgEl('ellipse', { class: 'day-plan__boat-shadow', cx: 4, cy: 5, rx: 30, ry: 10 }),
    svgEl('circle', { class: 'day-plan__ripple', cx: -32, cy: 0, r: 10 }),
    svgEl('circle', { class: 'day-plan__ripple day-plan__ripple--late', cx: -32, cy: 0, r: 10 }),
    body,
  );
  return boat;
}

// Nối các điểm bằng đường cong mềm (mỗi đoạn một đường Bézier bậc ba tính từ hai điểm kề bên).
function smoothPath(points) {
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    d += ` C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6}, ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

// Vùng của bộ lọc tính theo cả khung vẽ (userSpaceOnUse), không theo khung bao của đường:
// khung bao không tính bề rộng nét, nên tính theo nó thì phần nét tràn ra bị cắt thành cạnh thẳng.
function filterEl(id, ...primitives) {
  const filter = svgEl('filter', { id, filterUnits: 'userSpaceOnUse', x: '-20%', y: '-2%', width: '140%', height: '104%' });
  filter.append(...primitives);
  return filter;
}

function riverSvg(filterId) {
  const svg = svgEl('svg', { class: 'day-plan__svg', 'aria-hidden': 'true', focusable: 'false' });
  // Hai bộ lọc, mỗi khối một id riêng để không trùng nếu trang có hai khối:
  // bờ cây nhoè rộng; lòng sông có mép lượn không đều như bờ đất thật rồi làm mờ để các lớp màu hoà vào nhau.
  const softId = `${filterId}-soft`;
  const fadeId = `${filterId}-fade`;
  const defs = svgEl('defs');
  defs.append(
    fadeMaskEl(fadeId),
    filterEl(softId, svgEl('feGaussianBlur', { stdDeviation: 12 })),
    filterEl(
      filterId,
      svgEl('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.015 0.03', numOctaves: 3, seed: 7, result: 'noise' }),
      svgEl('feDisplacementMap', { in: 'SourceGraphic', in2: 'noise', scale: 7, xChannelSelector: 'R', yChannelSelector: 'G', result: 'wobble' }),
      svgEl('feGaussianBlur', { in: 'wobble', stdDeviation: 3 }),
    ),
  );
  const layer = ([name, ratio, dx]) => svgEl('path', { class: `day-plan__layer day-plan__${name}`, 'data-w': ratio, 'data-dx': dx });
  const banks = svgEl('g', { filter: `url(#${softId})` });
  banks.append(layer(LAYERS[0]));
  const paint = svgEl('g', { filter: `url(#${filterId})` });
  paint.append(...LAYERS.slice(1).map(layer));
  const flows = svgEl('g', { class: 'day-plan__flows' });
  flows.append(
    ...FLOWS.map((dx, i) => svgEl('path', { class: `day-plan__flow day-plan__flow--${i + 1}`, 'data-dx': dx })),
    svgEl('path', { class: 'day-plan__glint', 'data-dx': -0.05 }),
  );
  // Mặt nạ chỉ áp lên sông, không áp lên chấm bến và xuồng, để xuồng ở đầu sông vẫn rõ.
  const river = svgEl('g', { mask: `url(#${fadeId})` });
  river.append(banks, paint, flows, svgEl('path', { class: 'day-plan__wake' }));
  svg.append(defs, river, svgEl('g', { class: 'day-plan__docks' }), boatEl());
  return svg;
}

// Mặt nạ làm hai đầu sông mờ dần vào nền section: sông như chảy từ xa tới rồi chảy tiếp,
// không bắt đầu và kết thúc bằng một khối bo tròn. Trắng là hiện, đen là ẩn; tính theo cả khung vẽ.
function fadeMaskEl(id) {
  const gradId = `${id}-grad`;
  const grad = svgEl('linearGradient', { id: gradId, x1: 0, y1: 0, x2: 0, y2: 1 });
  [[0, 0], [FADE, 1], [1 - FADE, 1], [1, 0]].forEach(([offset, opacity]) => {
    grad.append(svgEl('stop', { offset, 'stop-color': '#fff', 'stop-opacity': opacity }));
  });
  const mask = svgEl('mask', { id, maskUnits: 'userSpaceOnUse', x: '-20%', y: '0', width: '140%', height: '100%' });
  mask.append(grad, svgEl('rect', { x: '-20%', y: '0', width: '140%', height: '100%', fill: `url(#${gradId})` }));
  return mask;
}

// Tấm mô tả: chỉ lấy dòng có đủ nhãn và nội dung, để <dl> luôn đúng cặp dt, dd.
function noteEl(details, id) {
  const rows = (details ?? [])
    .filter((row) => row.label && row.value)
    .map((row) => groupEl('day-plan__detail', [textEl('dt', 'day-plan__label', row.label), textEl('dd', 'day-plan__value', row.value)]));
  if (!rows.length) return null;
  const list = document.createElement('dl');
  list.className = 'day-plan__details';
  list.append(...rows);
  const note = groupEl('day-plan__note', [list]);
  note.id = id;
  return note;
}

// Có mô tả thì ảnh là nút bấm (hành động mở, đóng), không có thì chỉ là khung ảnh.
function mediaEl(image, noteId, moreLabel) {
  const img = document.createElement('img');
  img.className = 'day-plan__img';
  img.src = asset(image.src);
  img.alt = image.alt ?? '';
  img.loading = 'lazy';
  if (!noteId) return groupEl('day-plan__media', [img]);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'day-plan__media day-plan__media--button';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', noteId);
  button.append(...[img, textEl('span', 'day-plan__more', moreLabel)].filter(Boolean));
  return button;
}

// Số thứ tự chỉ để nhìn: <ol> đã cho trình đọc màn hình biết thứ tự, nên ẩn khỏi trình đọc.
function numberEl(index) {
  const num = textEl('span', 'day-plan__num', String(index + 1).padStart(2, '0'));
  num.setAttribute('aria-hidden', 'true');
  return num;
}

function stopEl(stop, index, section, idBase) {
  const li = document.createElement('li');
  li.className = 'day-plan__stop';
  const note = stop.image?.src ? noteEl(stop.details, `${idBase}-note-${index}`) : null;
  const media = stop.image?.src ? mediaEl(stop.image, note?.id, section.moreLabel) : null;
  li.append(...[
    groupEl('day-plan__frame', [numberEl(index), media, note]),
    groupEl('day-plan__body', [
      textEl('p', 'day-plan__time', stop.time),
      textEl('h3', 'day-plan__title', stop.title),
      textEl('p', 'day-plan__text', stop.text),
    ]),
  ].filter(Boolean));
  return li;
}

export class WlDayPlan extends HTMLElement {
  constructor() {
    super();
    this._filterId = `day-plan-water-${(instance += 1)}`;
    this._onScroll = () => this.queueUpdate();
    this._resize = new ResizeObserver(() => requestAnimationFrame(() => this.drawRiver()));
    // Gắn một lần trên chính thẻ và bắt sự kiện nổi lên từ các nút ảnh: dựng lại bến không làm cộng dồn listener.
    this.addEventListener('click', (event) => {
      const button = event.target.closest('.day-plan__media--button');
      if (button) this.toggleNote(button);
    });
    this.addEventListener('keydown', (event) => {
      const button = event.target.closest('.day-plan__media--button');
      if (event.key === 'Escape' && button?.getAttribute('aria-expanded') === 'true') this.toggleNote(button);
    });
  }

  // Cuộn trang, đổi kích thước và đồng hồ đều gắn ở đây và gỡ ở disconnectedCallback:
  // đổi thương hiệu không tải lại trang, nên không được để listener cũ chạy tiếp.
  connectedCallback() {
    window.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('resize', this._onScroll, { passive: true });
    this._clock = setInterval(() => this.markLive(), 60000);
    if (this._river) this._resize.observe(this._river);
    this.queueUpdate();
  }

  disconnectedCallback() {
    window.removeEventListener('scroll', this._onScroll);
    window.removeEventListener('resize', this._onScroll);
    clearInterval(this._clock);
    this._resize.disconnect();
    cancelAnimationFrame(this._frame);
  }

  set data(section) {
    this._data = section;
    this.render();
  }

  render() {
    const section = this._data;
    this.className = section.variant ? `day-plan day-plan--${section.variant}` : 'day-plan';
    this._stops = (section.stops ?? []).filter((stop) => stop.time);

    this._nowTime = textEl('b', 'day-plan__now-time', '--:--');
    this._nowTitle = textEl('span', 'day-plan__now-title', '-');
    const now = section.nowLabel ? groupEl('day-plan__now', [textEl('span', 'day-plan__now-label', section.nowLabel), this._nowTime, this._nowTitle]) : null;
    if (now) now.setAttribute('aria-live', 'polite');

    const head = groupEl('day-plan__head', [
      textEl('p', 'day-plan__eyebrow', section.eyebrow),
      textEl('h2', 'day-plan__heading', section.title),
      now,
      textEl('p', 'day-plan__hint', section.hint),
    ]);

    this._list = document.createElement('ol');
    this._list.className = 'day-plan__stops';
    this._items = this._stops.map((stop, i) => stopEl(stop, i, section, this._filterId));
    this._list.append(...this._items);
    this._reveals = [...this._list.querySelectorAll('.day-plan__num, .day-plan__media, .day-plan__body')];

    this._river = null;
    this._docks = [];
    if (this._items.length) {
      this._svg = riverSvg(this._filterId);
      this._river = groupEl('day-plan__river', [this._svg, this._list]);
    }

    this._resize.disconnect();
    this._activeIndex = -1;
    this._riverLength = 0;
    this._boatLength = undefined;
    this.replaceChildren(...[groupEl('day-plan__inner container', [head, this._river])].filter(Boolean));
    if (this._river && this.isConnected) this._resize.observe(this._river);
    this.markLive();
    this.queueUpdate();
  }

  toggleNote(button) {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    button.closest('.day-plan__frame').classList.toggle('is-open', open);
  }

  // Đánh dấu bến đúng với giờ thật: nhãn "đang diễn ra", aria-current cho trình đọc màn hình, dòng giờ ở đầu khối.
  markLive() {
    if (!this._stops?.length) return;
    const hhmm = nowAt(this.site?.place?.timezone);
    const live = liveIndexOf(this._stops, hhmm);
    this._liveIndex = live;
    if (this._nowTime) this._nowTime.textContent = hhmm;
    if (this._nowTitle) this._nowTitle.textContent = this._stops[live].title ?? '';
    this._items.forEach((item, i) => {
      item.querySelector('.day-plan__live')?.remove();
      item.toggleAttribute('aria-current', false);
      if (i !== live) return;
      item.setAttribute('aria-current', 'time');
      const badge = textEl('p', 'day-plan__live', this._data.liveLabel);
      if (badge) item.querySelector('.day-plan__body').append(badge);
    });
  }

  // Sự kiện cuộn có thể bắn nhiều lần trong một khung hình; gom lại, mỗi khung chỉ tính một lần.
  queueUpdate() {
    if (this._queued) return;
    this._queued = true;
    requestAnimationFrame(() => {
      this._queued = false;
      if (this.isConnected) this.update();
    });
  }

  update() {
    this.updateProgress();
    this.requestBoat();
  }

  // Số, ảnh, chữ mỗi phần tự đo vị trí của chính nó, nên phần nào ló lên trước thì hiện trước, đúng chỗ mắt đang nhìn;
  // cuộn ngược lên thì lùi lại đúng theo. Bật giảm chuyển động thì hiện đủ ngay, bến đang tới là bến theo giờ thật.
  updateProgress() {
    if (!this._items?.length) return;
    const reduce = reducedMotion();
    const doc = document.documentElement;
    // Cuộn hết trang mà phần cuối chưa đi đủ quãng thì vẫn cho hiện đủ, để không bến nào bị bỏ dở.
    const atEnd = innerHeight + scrollY >= doc.scrollHeight - 2;
    const reach = innerHeight * REVEAL_DISTANCE;
    this._reveals.forEach((el) => {
      const p = reduce || atEnd ? 1 : clamp((innerHeight - el.getBoundingClientRect().top) / reach, 0, 1);
      el.style.setProperty('--p', p.toFixed(3));
    });
    this.setActive(reduce ? this._liveIndex ?? 0 : this.nearestToBoat());
  }

  // Bến có tâm gần vạch xuồng nhất: chấm bến sáng lên khi xuồng đang tới gần, không phải khi đã đi qua.
  nearestToBoat() {
    const line = innerHeight * BOAT_LINE;
    let nearest = 0;
    let best = Infinity;
    this._items.forEach((item, i) => {
      const rect = item.getBoundingClientRect();
      const distance = Math.abs(rect.top + rect.height / 2 - line);
      if (distance < best) {
        best = distance;
        nearest = i;
      }
    });
    return nearest;
  }

  // Đổi bến đang tới thì đổi luôn chấm bến trên sông và màu nền theo giờ của bến.
  setActive(index) {
    if (index === this._activeIndex) return;
    this._activeIndex = index;
    this._items.forEach((item, i) => item.classList.toggle('is-active', i === index));
    this._docks.forEach((dock, i) => dock.classList.toggle('is-active', i === index));
    this.dataset.phase = phaseOf(this._stops[index].time);
  }

  // Sông uốn đều như sóng dọc khối; mỗi bến đặt lên đúng chỗ sông ngang tâm thẻ của bến đó.
  drawRiver() {
    if (!this._river || !this._river.isConnected) return;
    const river = this._river;
    const w = river.clientWidth;
    const h = river.offsetHeight;
    if (!w || !h) return;
    const wide = matchMedia('(min-width: 1024px)').matches;
    const cx = wide ? w / 2 : 26;
    const bend = wide ? Math.min(46, w * 0.035) : 7;
    this._svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    const step = wide ? 320 : 240;
    const points = [[cx, 0]];
    for (let y = step / 2, k = 0; y < h; y += step, k += 1) points.push([cx + (k % 2 === 0 ? -bend : bend), y]);
    points.push([cx, h]);
    // Sông chủ yếu chạy dọc, nên dời ngang cả đường là có một đường gần như song song (dùng cho vệt dòng chảy).
    const pathAt = (dx) => smoothPath(points.map(([x, y]) => [x + dx, y]));
    const d = pathAt(0);
    const width = wide ? 64 : 32;

    this._svg.querySelectorAll('[data-dx]').forEach((line) => line.setAttribute('d', pathAt(width * Number(line.dataset.dx))));
    this._svg.querySelectorAll('.day-plan__layer').forEach((layer) => {
      layer.style.strokeWidth = width * Number(layer.dataset.w);
    });
    const wake = this._svg.querySelector('.day-plan__wake');
    wake.setAttribute('d', d);

    this._wake = wake;
    this._boat = this._svg.querySelector('.day-plan__boat');
    this._boatScale = wide ? 1.3 : 0.72;
    this._riverLength = wake.getTotalLength();
    wake.style.strokeDasharray = this._riverLength;

    const center = (item) => item.offsetTop + item.offsetHeight / 2;
    this._docks = this._items.map((item) => {
      const pt = wake.getPointAtLength(this.lengthAtY(center(item)));
      return svgEl('circle', { class: 'day-plan__dock', cx: pt.x, cy: pt.y, r: wide ? 9 : 6 });
    });
    this._svg.querySelector('.day-plan__docks').replaceChildren(...this._docks);
    this._activeIndex = -1;
    this.updateProgress();
    this.requestBoat(true);
  }

  // Đường sông đi từ trên xuống nên y tăng theo độ dài; dò nhị phân để tìm độ dài ứng với một y.
  lengthAtY(y) {
    let lo = 0;
    let hi = this._riverLength;
    for (let k = 0; k < 22; k += 1) {
      const mid = (lo + hi) / 2;
      if (this._wake.getPointAtLength(mid).y < y) lo = mid; else hi = mid;
    }
    return lo;
  }

  // Xuồng hướng tới chỗ sông cắt ngang vạch giữa màn hình (cùng vạch dùng để chọn bến đang tới)
  // và lướt nhanh tới đó, nên cuộn bằng con lăn vẫn mượt. Bật giảm chuyển động thì xuồng đậu ở bến đang diễn ra.
  requestBoat(snap = false) {
    if (!this._riverLength) return;
    const reduce = reducedMotion();
    const item = this._items[this._liveIndex];
    const y = reduce && item
      ? item.offsetTop + item.offsetHeight / 2
      : clamp(innerHeight * BOAT_LINE - this._river.getBoundingClientRect().top, this._river.offsetHeight * FADE, this._river.offsetHeight * (1 - FADE));
    this._target = this.lengthAtY(y);
    if (snap || reduce || this._boatLength === undefined) {
      this._boatLength = this._target;
      this.placeBoat();
      return;
    }
    if (!this._gliding) {
      this._gliding = true;
      this._frame = requestAnimationFrame(() => this.glide());
    }
  }

  glide() {
    const diff = this._target - this._boatLength;
    this._boatLength = Math.abs(diff) < 0.5 ? this._target : this._boatLength + diff * 0.25;
    this.placeBoat();
    this._gliding = this._boatLength !== this._target;
    if (this._gliding) this._frame = requestAnimationFrame(() => this.glide());
  }

  placeBoat() {
    const len = this._boatLength;
    const p = this._wake.getPointAtLength(len);
    const q = this._wake.getPointAtLength(Math.min(this._riverLength, len + 1));
    const angle = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
    // Phóng to trong transform (sau dời và xoay), vì CSS scale trên phần tử SVG lấy góc khung làm tâm.
    this._boat.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${angle}) scale(${this._boatScale})`);
    this._wake.style.strokeDashoffset = this._riverLength - len;
  }
}
