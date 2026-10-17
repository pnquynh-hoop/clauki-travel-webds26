/* hero-ride.js - kiểu "ride" của <wl-hero>: poster mở đầu, rồi cuộn dọc thì cả thành phố trôi ngang qua từng ga.
   Mỗi ga là một công trình tách nền kèm biển ga; bầu trời đổi từ nắng chiều sang hoàng hôn rồi đêm, dãy nhà vẽ bằng SVG
   bật đèn dần. Cả cảnh nằm trong một khung ghim (sticky) cao nhiều màn hình, tiến độ cuộn quyết định mọi thứ.
   Tách tệp riêng vì HTML và hành vi khác hẳn các kiểu còn lại của hero. Giảm chuyển động hoặc chưa chạy JS thì
   chỉ hiện poster và các ga xếp thành dãy thẻ (xem hero-ride.css). */
import { asset } from '../../js/core/core.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const SVG_NS = 'http://www.w3.org/2000/svg';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const ease = (t) => 1 - (1 - t) ** 3;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function decor(tag, className) {
  const node = el(tag, className);
  node.setAttribute('aria-hidden', 'true');
  return node;
}

// "14:30" thành số phút trong ngày; sai định dạng thì trả 0 để thanh giờ không hỏng.
function toMinutes(time) {
  const [h, m] = String(time ?? '').split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : 0;
}

const clockText = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

function imageEl(image, className) {
  if (!image?.src) return null;
  const img = el('img', className);
  img.src = asset(image.src);
  img.alt = image.alt ?? '';
  img.decoding = 'async';
  if (image.width && image.height) {
    img.width = image.width;
    img.height = image.height;
  }
  return img;
}

// ---------- Dãy nhà vẽ bằng SVG ----------
// Số ngẫu nhiên có hạt giống: dãy phố giữ nguyên hình dáng giữa các lần dựng.
function mulberry(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Màu của cảnh tham chiếu thẳng biến CSS (khai ở hero-ride.css, pha từ màu thương hiệu): theme.css tải bất đồng bộ,
// đọc giá trị một lần lúc dựng có thể ra màu của thương hiệu trước; để var() thì trình duyệt tự cập nhật khi theme áp xong.
function readPalette() {
  return {
    facades: [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `var(--ride-facade-${i})`),
    boards: [1, 2, 3, 4].map((i) => `var(--ride-board-${i})`),
    ink: 'var(--ride-ink)',
    dark: 'var(--ride-dark)',
  };
}

const rect = (x, y, w, h) => ({ tag: 'rect', attrs: { x: x.toFixed(1), y: y.toFixed(1), width: w.toFixed(1), height: h.toFixed(1) } });

// Mỗi hình có ba lớp màu: ban ngày, phủ tối ban đêm, đèn. Màu null thì lớp đó không có hình.
function farCity() {
  const r = mulberry(81);
  const shapes = [];
  const W = 1000;
  const H = 100;
  [[0.55, '#bccbe0', '#1a1f3d', 0.25], [1, '#93a9c7', '#121633', 0.4]].forEach(([scale, day, night, litP]) => {
    let x = -4;
    while (x < W) {
      const w = 12 + r() * 34;
      const hh = (18 + r() * 62 + (r() < 0.12 ? 18 : 0)) * scale + (scale < 1 ? 30 : 0);
      const y = H - hh;
      shapes.push({ ...rect(x, y, w, hh), day, night });
      if (r() < 0.3) shapes.push({ ...rect(x + w * 0.2, y - 6, w * 0.6, 6), day, night });
      if (r() < 0.18) shapes.push({ ...rect(x + w / 2, y - 16, 0.8, 16), day, night });
      for (let wy = y + 4; wy < H - 4; wy += 5.5) {
        for (let wx = x + 2.5; wx < x + w - 3; wx += 4.2) {
          if (r() < litP) shapes.push({ ...rect(wx, wy, 1.6, 2.2), lit: r() < 0.8 ? '#ffd77a' : '#fff1c8' });
        }
      }
      x += w + r() * 3;
    }
  });
  return { w: W, h: H, shapes, speed: 0.22, nightMax: 0.92, litFrom: 0.78 };
}

function nearStreet(pal) {
  const r = mulberry(1975);
  const shapes = [];
  const W = 1200;
  const H = 100;
  const G = 86;
  const litOf = ['#ffe27a', '#ff5a3c', '#5d8bff', '#3fe0a0'];
  let x = 0;
  let n = 0;
  const trees = [];
  const poles = [];
  while (x < W - 30) {
    const w = Math.min(W - x, 34 + r() * 30);
    const hh = 44 + r() * 40;
    const y = G - hh;
    shapes.push({ ...rect(x, y, w, hh), day: pal.facades[Math.floor(r() * pal.facades.length)], night: pal.dark });
    shapes.push({ ...rect(x - 1, y - 2.5, w + 2, 3.5), day: pal.ink, night: '#05060c' });
    for (let fy = y + 5; fy < G - 22; fy += 13) {
      const cols = w > 48 ? 3 : 2;
      const cw = (w - 8) / cols;
      for (let c = 0; c < cols; c++) {
        const lit = r() < 0.6 ? (r() < 0.7 ? '#ffcf66' : '#ffe9b0') : null;
        shapes.push({ ...rect(x + 4 + c * cw + 1.5, fy, cw - 3, 7), day: '#2a2730', lit });
      }
      shapes.push({ ...rect(x + 2, fy + 8, w - 4, 1.6), day: pal.ink });
    }
    // Biển hiệu và cửa tầng trệt.
    const board = Math.floor(r() * pal.boards.length);
    shapes.push({ ...rect(x + 3, G - 20, w - 6, 7), day: pal.boards[board], lit: litOf[board] });
    shapes.push({ ...rect(x + 3, G - 12, w - 6, 12), day: '#1c1c22', lit: r() < 0.7 ? 'rgba(255,200,110,.75)' : null });
    if (n % 3 === 1) trees.push(x + w - 2);
    if (n % 2 === 0) poles.push(x + 2);
    x += w;
    n++;
  }
  shapes.push({ ...rect(0, G, W, H - G), day: '#26242b', night: '#06070c' });
  shapes.push({ ...rect(0, G, W, 2.5), day: '#9b958a' });
  for (let lx = 6; lx < W; lx += 26) shapes.push({ ...rect(lx, G + 8, 12, 1.4), day: pal.facades[0] });
  // Cột điện và dây điện chằng chịt, hàng me ở vỉa hè.
  poles.forEach((px, i) => {
    shapes.push({ ...rect(px, 22, 1.6, G - 22), day: '#3a3740', night: '#05060c' });
    shapes.push({ tag: 'circle', attrs: { cx: px + 0.8, cy: 23, r: 2.8 }, lit: 'rgba(255,220,140,.9)' });
    const next = poles[i + 1] ?? px + 80;
    [26, 29, 33].forEach((wy, j) => {
      shapes.push({ tag: 'path', attrs: { d: `M${px} ${wy} Q${(px + next) / 2} ${wy + 7 + j * 2} ${next} ${wy}` }, stroke: 0.6, day: '#1a1a1f', night: '#05060c' });
    });
  });
  trees.forEach((tx) => {
    shapes.push({ ...rect(tx - 1.5, G - 26, 3, 26), day: '#3b2a20', night: '#05060c' });
    const greens = ['#245738', '#2f6b45', '#3b7d52'];
    for (let i = 0; i < 6; i++) {
      const attrs = { cx: (tx + (r() - 0.5) * 26).toFixed(1), cy: (G - 34 - r() * 16).toFixed(1), r: (7 + r() * 8).toFixed(1) };
      shapes.push({ tag: 'circle', attrs, day: greens[i % 3], night: '#060d0a' });
    }
  });
  return { w: W, h: H, shapes, speed: 1.7, nightMax: 0.84, litFrom: 0.76 };
}

// Một bộ lặp gồm ba lớp SVG chồng nhau (ngày, phủ tối, đèn); dải gồm ba bộ để trôi liền không đứt.
function buildStrip(host, geo) {
  const layer = (mode) => {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${geo.w} ${geo.h}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    geo.shapes.forEach((s) => {
      const paint = s[mode];
      if (paint == null) return;
      const node = document.createElementNS(SVG_NS, s.tag);
      Object.entries(s.attrs).forEach(([k, v]) => node.setAttribute(k, v));
      if (s.stroke) {
        node.setAttribute('fill', 'none');
        node.setAttribute('stroke-width', s.stroke);
        node.style.stroke = paint;
      } else {
        node.style.fill = paint;
      }
      svg.append(node);
    });
    return svg;
  };
  const set = el('div', 'ride__strip-set');
  set.style.aspectRatio = `${geo.w}/${geo.h}`;
  set.append(layer('day'), layer('night'), layer('lit'));
  host.replaceChildren(set, set.cloneNode(true), set.cloneNode(true));
  const sets = [...host.children];
  // Điều khiển cùng lúc lớp thứ index của cả ba bộ lặp qua một đối tượng có .style.opacity, như một phần tử thật.
  const group = (index) => ({ style: { set opacity(v) { sets.forEach((s) => { s.children[index].style.opacity = v; }); } } });
  return { el: host, sets, speed: geo.speed, nightMax: geo.nightMax, litFrom: geo.litFrom, w: 1, night: group(1), lights: group(2) };
}

// ---------- DOM ----------
function signEl(stop, index) {
  const sign = el('div', 'ride__sign');
  const body = el('span', 'ride__sign-body');
  body.append(
    el('span', 'ride__sign-time', stop.time),
    el('strong', 'ride__sign-name', stop.place),
    el('span', 'ride__sign-note', stop.note),
    el('span', 'ride__sign-how', stop.how),
  );
  sign.append(el('span', 'ride__sign-no', String(index + 2).padStart(2, '0')), body);
  return sign;
}

// Mỗi ga: công trình tách nền (lớp phủ hoàng hôn, đêm, đèn cắt theo hình ảnh) và biển ga.
function stationEl(stop, index) {
  const li = el('li', `ride__stn ride__stn--${stop.effect ?? 'plain'}`);
  li.dataset.k = index + 1;
  li.dataset.speed = stop.scene?.speed ?? 1;
  const art = el('div', 'ride__art');
  const scene = stop.scene ?? {};
  const set = (name, value) => value != null && art.style.setProperty(name, value);
  set('--h', `${scene.h ?? 50}svh`);
  set('--hm', `${scene.hm ?? scene.h ?? 50}svh`);
  set('--b', `${scene.b ?? 20}svh`);
  set('--bm', `${scene.bm ?? scene.b ?? 20}svh`);
  set('--fa', `${scene.fade ?? 80}%`);
  set('--z', scene.z ?? 5);
  set('--dx', `${scene.dx ?? 0}vw`);
  if (stop.image?.width && stop.image?.height) art.style.setProperty('--ar', `${stop.image.width} / ${stop.image.height}`);
  const img = imageEl(stop.image, 'ride__art-img');
  const parts = [img, decor('i', 'ride__tint ride__tint--dusk'), decor('i', 'ride__tint ride__tint--night')];
  if (stop.effect === 'grid') parts.push(decor('i', 'ride__lit ride__lit--grid'), decor('i', 'ride__beacon'));
  if (stop.effect === 'floors') {
    const rise = decor('span', 'ride__rise');
    rise.append(decor('i', 'ride__lit ride__lit--floors'));
    parts.push(decor('i', 'ride__halo'), decor('i', 'ride__beam'), decor('i', 'ride__beam ride__beam--b'), rise);
  }
  art.append(...parts.filter(Boolean));
  const sign = signEl(stop, index);
  sign.style.setProperty('--gap', `${scene.signGap ?? 11}vw`);
  sign.style.setProperty('--sy', `${scene.signY ?? 37}svh`);
  li.append(art, sign);
  return li;
}

function buildStage(section, site) {
  const stops = (section.stops ?? []).filter((s) => s.place && s.time);
  const stage = el('div', 'ride__stage');

  const sun = decor('i', 'ride__sun');
  sun.append(decor('i', 'ride__sun-red'));
  const sunWrap = decor('div', 'ride__sun-wrap');
  sunWrap.append(sun);
  const sky = decor('div', 'ride__sky');
  sky.append(decor('i', 'ride__sky-layer ride__sky-day'), decor('i', 'ride__sky-layer ride__sky-dusk'), decor('i', 'ride__sky-layer ride__sky-night'), decor('i', 'ride__sky-layer ride__stars'), sunWrap);

  const names = decor('div', 'ride__names');
  stops.forEach((s, i) => {
    const name = el('span', '', s.title ?? s.place);
    name.dataset.k = i + 1;
    names.append(name);
  });

  const far = decor('div', 'ride__strip ride__strip--far');
  const near = decor('div', 'ride__strip ride__strip--near');
  const world = el('ol', 'ride__world');
  world.setAttribute('aria-label', section.stopsLabel ?? 'Các ga');
  world.append(...stops.map(stationEl));

  // Màn mở đầu: poster (mặt trời và công trình nổi bật), nhãn, tiêu đề chia từng chữ để bung ra khi cuộn, giá và nút.
  const intro = el('div', 'ride__intro');
  const poster = decor('div', 'ride__poster');
  const group = el('div', 'ride__poster-group');
  group.append(el('i', 'ride__poster-sun'), imageEl(section.poster?.image, 'ride__poster-img') ?? '');
  poster.append(group);
  const title = el('h1', 'ride__title');
  (section.title ?? '').split(/\s+/).filter(Boolean).forEach((w) => title.append(el('span', 'ride__word', w), ' '));
  if (section.mark) title.append(el('span', 'ride__mark', section.mark));
  const price = el('p', 'ride__price');
  price.append(el('b', 'ride__price-now', section.price?.now), el('s', 'ride__price-was', section.price?.was));
  const cta = el('a', 'btn');
  cta.href = site?.cta?.href ?? '#';
  cta.textContent = site?.cta?.label ?? '';
  const offer = el('div', 'ride__offer');
  offer.append(...[section.price?.now ? price : null, site?.cta?.label ? cta : null].filter(Boolean));
  const row = el('div', 'ride__row');
  row.append(...[section.lead ? el('p', 'ride__lead', section.lead) : null, offer].filter(Boolean));
  intro.append(poster, ...[section.eyebrow ? el('p', 'ride__eyebrow', section.eyebrow) : null, title, row].filter(Boolean));

  // Bảng giờ và tuyến thu nhỏ ở trên cùng; thẻ ga cuối hiện khi tới đích.
  const hud = decor('div', 'ride__hud');
  const map = el('div', 'ride__map');
  const mapStops = el('ol', 'ride__map-stops');
  [section.start ?? { short: '', time: '' }, ...stops].forEach((s) => {
    const li = el('li');
    li.append(el('b'), el('span', '', s.short ?? s.place));
    mapStops.append(li);
  });
  map.append(el('i', 'ride__map-line'), el('i', 'ride__map-fill'), mapStops, el('i', 'ride__map-mark'));
  hud.append(el('span', 'ride__clock', section.start?.time ?? stops[0]?.time), map);

  const end = el('div', 'ride__end');
  end.append(...[
    section.end?.kicker ? el('p', 'ride__end-kicker', section.end.kicker) : null,
    section.end?.title ? el('p', 'ride__end-title', section.end.title) : null,
    section.price?.now ? el('p', 'ride__end-price', section.price.now) : null,
    site?.cta?.label ? cta.cloneNode(true) : null,
  ].filter(Boolean));

  stage.append(sky, names, far, world, near, intro, hud, end);
  const track = el('div', 'ride__track');
  track.style.setProperty('--n', stops.length);
  track.append(stage);
  return { track, stage, far, near, stops };
}

// ---------- Chuyển động ----------
function run(host, parts, section) {
  const { track, stage, far, near, stops } = parts;
  const N = stops.length;
  if (!N) return () => {};
  const times = [section.start?.time ?? stops[0].time, ...stops.map((s) => s.time)].map(toMinutes);
  const pal = readPalette();
  const strips = [buildStrip(far, farCity()), buildStrip(near, nearStreet(pal))];
  const q = (sel, root = stage) => root.querySelector(sel);

  const stations = [...stage.querySelectorAll('.ride__stn')].map((li) => {
    const art = q('.ride__art', li);
    const img = q('img', art);
    // Lớp phủ chỉ tô trên hình công trình: mặt nạ lấy chính ảnh, mờ dần ở chân để không lộ mép cắt.
    const mask = `url("${img?.src ?? ''}"), linear-gradient(#000 ${art.style.getPropertyValue('--fa') || '85%'}, transparent 97%)`;
    art.querySelectorAll('.ride__tint, .ride__lit').forEach((layer) => { layer.style.maskImage = mask; });
    return {
      k: Number(li.dataset.k), speed: Number(li.dataset.speed), art, sign: q('.ride__sign', li),
      dusk: q('.ride__tint--dusk', art), night: q('.ride__tint--night', art), grid: q('.ride__lit--grid', art), beacon: q('.ride__beacon', art),
      rise: q('.ride__rise', art), halo: q('.ride__halo', art), beams: [...art.querySelectorAll('.ride__beam')],
    };
  });
  const names = [...stage.querySelectorAll('.ride__names span')].map((n) => ({ el: n, k: Number(n.dataset.k) }));
  const sky = { dusk: q('.ride__sky-dusk'), night: q('.ride__sky-night'), stars: q('.ride__stars'), sun: q('.ride__sun'), sunRed: q('.ride__sun-red') };
  const intro = q('.ride__intro');
  const words = [...intro.querySelectorAll('.ride__word')];
  const mark = q('.ride__mark', intro);
  const bits = [q('.ride__eyebrow', intro), q('.ride__row', intro)].filter(Boolean);
  const hud = q('.ride__hud');
  const clock = q('.ride__clock', hud);
  const fill = q('.ride__map-fill', hud);
  const marker = q('.ride__map-mark', hud);
  const map = q('.ride__map', hud);
  const mapStops = [...hud.querySelectorAll('.ride__map-stops li')];
  const end = q('.ride__end');

  let W = 0;
  let H = 0;
  let S = 0;
  let VX = 0;
  let mapW = 0;
  const measure = () => {
    W = stage.clientWidth;
    H = stage.clientHeight;
    S = clamp(W * 1.05, 560, 1700);
    VX = W >= 800 ? W * 0.64 : W * 0.5;
    mapW = map.clientWidth;
    strips.forEach((s) => { s.w = s.sets[0].getBoundingClientRect().width; });
  };

  // Chỉ ghi vào DOM khi giá trị đổi: mỗi khung hình có hàng trăm thuộc tính, ghi thừa sẽ giật trên điện thoại.
  const cache = new WeakMap();
  const setO = (node, v) => {
    const value = Math.round(v * 1000) / 1000;
    if (cache.get(node) !== value) { cache.set(node, value); node.style.opacity = value; }
  };
  const setT = (node, t) => {
    if (cache.get(node) !== t) { cache.set(node, t); node.style.transform = t; }
  };

  // Tiến độ p (0..1) sang vị trí trên tuyến (0..N); mỗi ga dừng một nhịp để đọc biển.
  const toPos = (p) => {
    const x = clamp((p - 0.07) / 0.86) * N;
    const k = Math.min(N - 1, Math.floor(x));
    return k + smooth(clamp((x - k - 0.18) / 0.64));
  };

  let target = 0;
  let cur = -1;
  let raf = 0;
  let last = performance.now();
  const readScroll = () => {
    const r = track.getBoundingClientRect();
    target = clamp(-r.top / Math.max(1, r.height - H));
  };

  function render(p) {
    const pos = toPos(p);
    const f = pos / N;
    // Màn mở đầu: chữ bung ra, poster mờ đi, rồi thành phố hiện dần (--calm chạy từ 1 về 0).
    const it = ease(clamp((p - 0.006) / 0.07));
    if (words[0]) setT(words[0], `translate3d(${-it * 38}vw, ${-it * 10}svh, 0) rotate(${-it * 10}deg)`);
    if (words[1]) setT(words[1], `translate3d(${it * 14}vw, ${-it * 30}svh, 0) rotate(${it * 6}deg)`);
    if (mark) setT(mark, `translate3d(${it * 30}vw, ${-it * 8}svh, 0) rotate(${it * 220}deg) scale(${1 + it * 0.7})`);
    bits.forEach((b, i) => { setT(b, `translate3d(0, ${it * (i === 1 ? 60 : -40)}px, 0)`); setO(b, 1 - it * 1.6); });
    setO(intro, 1 - clamp((it - 0.55) / 0.45));
    intro.classList.toggle('is-gone', it > 0.995);
    stage.classList.toggle('is-calm', it < 0.999);
    stage.style.setProperty('--calm', (1 - it).toFixed(3));

    // Bầu trời theo tiến độ: dusk và night là hai lớp phủ, mặt trời lặn dần về chân trời.
    const duskT = clamp((f - 0.26) / 0.34);
    const nightT = clamp((f - 0.7) / 0.26);
    setO(sky.dusk, duskT);
    setO(sky.night, nightT);
    setO(sky.stars, clamp((f - 0.84) / 0.16));
    const sunT = clamp(f / 0.92);
    setT(sky.sun, `translate3d(${-sunT * W * 0.06}px, ${sunT * H * 0.52}px, 0) scale(${1 + sunT * 0.25})`);
    setO(sky.sun, 1 - clamp((f - 0.82) / 0.12));
    setO(sky.sunRed, clamp((f - 0.32) / 0.36));

    // Lớp xa trôi chậm, lớp gần trôi nhanh: tạo chiều sâu.
    strips.forEach((s) => {
      const x = (((pos * S * s.speed) % s.w) + s.w) % s.w - s.w;
      setT(s.el, `translate3d(${x.toFixed(1)}px, 0, 0)`);
      setO(s.night, nightT * s.nightMax);
      setO(s.lights, clamp((f - s.litFrom) / 0.16));
    });

    const tintDusk = duskT * (1 - nightT);
    const endT = clamp((p - 0.945) / 0.035);
    stations.forEach((st) => {
      const d = pos - st.k;
      setT(st.art, `translate3d(${(VX + d * S * st.speed).toFixed(1)}px, 0, 0)`);
      const a = clamp(1 - (Math.abs(d) - 0.12) / 0.4) * (st.k === N ? 1 - clamp(endT * 2.5) : 1);
      setT(st.sign, `translate3d(${(VX + d * S * Math.max(st.speed, 0.85)).toFixed(1)}px, 0, 0) perspective(700px) rotateX(${((1 - a) * -100).toFixed(1)}deg)`);
      setO(st.sign, a);
      setO(st.dusk, tintDusk);
      setO(st.night, nightT * 0.78);
      if (st.grid) { const g = clamp((f - 0.74) / 0.16); setO(st.grid, g); setO(st.beacon, g); }
      if (st.rise) {
        const r = smooth(clamp((f - 0.88) / 0.11));
        setT(st.rise, `translate3d(0, ${(1 - r) * 100}%, 0)`);
        setT(st.rise.firstElementChild, `translate3d(0, ${-(1 - r) * 100}%, 0)`);
        const glow = clamp((f - 0.95) / 0.05);
        setO(st.halo, glow);
        st.beams.forEach((b) => setO(b, glow));
      }
    });
    names.forEach(({ el: node, k }) => {
      const d = pos - k;
      setT(node, `translate3d(${(VX + d * S * 0.32).toFixed(1)}px, 0, 0)`);
      setO(node, clamp(1 - Math.abs(d) / 0.6) * (k === N ? 1 - endT * 0.6 : 1));
    });

    // Bảng giờ, tuyến thu nhỏ, thẻ ga cuối.
    setO(hud, clamp((p - 0.05) / 0.04));
    const k = Math.min(N - 1, Math.floor(pos));
    const mins = Math.round(times[k] + (times[k + 1] - times[k]) * (pos - k));
    const text = clockText(mins);
    if (clock.textContent !== text) clock.textContent = text;
    setT(fill, `scaleX(${(pos / N).toFixed(4)})`);
    setT(marker, `translate3d(${(pos / N * mapW).toFixed(1)}px, 0, 0)`);
    const near2 = Math.round(pos);
    mapStops.forEach((li, i) => {
      li.classList.toggle('is-past', i <= pos + 0.001);
      li.classList.toggle('is-on', i === near2 && Math.abs(pos - near2) < 0.3);
    });
    setO(end, endT);
    setT(end, `translate3d(0, ${((1 - endT) * 40).toFixed(1)}px, 0)`);
    end.classList.toggle('is-in', endT > 0.01);
  }

  // Làm mượt tiến độ để cuộn chuột nấc không làm cảnh giật; dừng vòng lặp khi đã đứng yên.
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (cur < 0) cur = target;
    cur += (target - cur) * (1 - Math.exp(-dt / 0.085));
    if (Math.abs(target - cur) < 0.00005) cur = target;
    render(cur);
    raf = cur !== target ? requestAnimationFrame(frame) : 0;
  }
  const kick = () => {
    readScroll();
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  };
  const resize = () => { measure(); cur = -1; kick(); };

  measure();
  readScroll();
  cur = target;
  render(cur);
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', resize);
  addEventListener('load', resize);
  return () => {
    cancelAnimationFrame(raf);
    removeEventListener('scroll', kick);
    removeEventListener('resize', resize);
    removeEventListener('load', resize);
  };
}

// Dựng hero kiểu ride. Trả về khung và hàm detach (dựng lại hoặc gỡ khối thì tắt vòng lặp và các listener).
export function buildRide(host, section, site) {
  const parts = buildStage(section, site);
  const stage = el('div', 'ride');
  stage.append(parts.track);
  let stop = () => {};
  const start = () => {
    stop();
    stop = () => {};
    if (reducedMotion.matches || !host.isConnected) {
      stage.classList.remove('ride--live');
      return;
    }
    stage.classList.add('ride--live');
    stop = run(host, parts, section);
  };
  // Chờ gắn vào trang rồi mới đo kích thước; đổi cài đặt giảm chuyển động giữa chừng thì chạy lại.
  requestAnimationFrame(start);
  reducedMotion.addEventListener('change', start);
  return {
    stage,
    detach: () => {
      stop();
      reducedMotion.removeEventListener('change', start);
    },
  };
}
