/* wl-hero.js - màn hình đầu: nhãn nhỏ, tiêu đề h1, đoạn dẫn, nút CTA, liên kết phụ, vài con số, và ảnh.
   Dữ liệu có một ảnh (image) thì dựng một khung ảnh. Có nhiều ảnh (slides) thì dựng chồng thẻ ảnh xoay vòng:
   thẻ giữa là ảnh đang xem, các thẻ hai bên nghiêng ra sau, nền là chính ảnh đó được làm mờ.
   hero.css đổi bố cục theo class hero--<variant>. */
import { asset } from '../core.js';
import { textEl, linkEl, groupEl, clamp, smooth } from '../dom.js';
import { attachReveal } from '../effects/hero-reveal.js';

function statsEl(stats) {
  if (!stats?.length) return null;
  const list = document.createElement('dl');
  list.className = 'hero__stats';
  for (const stat of stats) {
    const item = document.createElement('div');
    item.className = 'hero__stat';
    // Trong <dl>, nhãn (dt) phải đứng trước giá trị (dd); CSS đảo lại để con số lớn nằm trên.
    const parts = [textEl('dt', 'hero__stat-label', stat.label), textEl('dd', 'hero__stat-value', stat.value)];
    item.append(...parts.filter(Boolean));
    list.append(item);
  }
  return list;
}

function imgEl(image, alt) {
  const img = document.createElement('img');
  img.src = asset(image.src);
  img.alt = alt;
  return img;
}

function imageEl(image) {
  if (!image?.src) return null;
  const figure = document.createElement('figure');
  figure.className = 'hero__media';
  const img = imgEl(image, image.alt ?? '');
  // Ảnh hero là thứ khách thấy đầu tiên, nên xin trình duyệt tải nó trước các ảnh khác.
  img.setAttribute('fetchpriority', 'high');
  figure.append(img);
  return figure;
}

function navButton(label, className, onClick) {
  if (!label) return null;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `hero__nav ${className}`;
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

// Bộ đếm hiện hai chữ số, ví dụ "01 / 05".
const pad = (n) => String(n).padStart(2, '0');

/* Bắt đầu kiểu full: các hằng số và hàm phụ. */

// Người xem bật "giảm chuyển động" trong máy thì ảnh đứng yên, sương mở sẵn, không có mây.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Ba lớp ảnh đặt ở ba độ sâu (px) trong không gian 3D. Khoảng nhìn 1000px phải khớp perspective trong hero.css.
const LAYERS = [{ name: 'far', depth: -1800 }, { name: 'mid', depth: -900 }, { name: 'near', depth: -320 }];
const PERSPECTIVE = 1000;
// Độ dày lớp sương lúc đầu và lúc đã vén xong (0 là trong hẳn).
const MIST_START = 0.62;
const MIST_END = 0.25;

// Chỗ ngẫu nhiên cho một đám mây, trải rộng quanh giữa màn hình.
function cloudSpot() {
  return { x: (Math.random() * 2 - 1) * 900, y: (Math.random() * 2 - 1) * 360 };
}

// Lớp chỉ để trang trí (sương, mây, nắng): ẩn với trình đọc màn hình.
function decorEl(className) {
  const el = document.createElement('div');
  el.className = className;
  el.setAttribute('aria-hidden', 'true');
  return el;
}

/* Hết phần hàm phụ của kiểu full. */

export class WlHero extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  // Gỡ hiệu ứng (nếu có) khi hero bị gỡ khỏi trang, ví dụ lúc đổi thương hiệu.
  // Kiểu full: tắt luôn chuyển động và theo dõi chuột để khối cũ không chạy ngầm.
  disconnectedCallback() {
    this._detachEffect?.();
    this._detachEffect = null;
    this.stop();
  }

  // Hiệu ứng bật thêm lên bố cục, tách tệp riêng; dựng lại hero thì gỡ hiệu ứng cũ trước khi gắn lại.
  attachEffect(section) {
    this._detachEffect?.();
    this._detachEffect = section.effect === 'reveal' ? attachReveal(this, section, this.site) : null;
  }

  // Đặt từng thẻ theo khoảng cách tới thẻ đang xem: 0 ở giữa, số âm bên trái, số dương bên phải.
  // Tính theo vòng tròn nên với số thẻ lẻ, hai bên luôn có số thẻ bằng nhau; CSS chỉ hiện các thẻ từ -2 tới 2.
  select(index) {
    const count = this._cards.length;
    this._active = (index + count) % count;
    this._cards.forEach((card, i) => {
      let pos = (i - this._active + count) % count;
      if (pos > count / 2) pos -= count;
      // Thẻ đổi từ mép này sang mép kia thì tắt chuyển động, để nó không bay ngang qua thẻ giữa.
      const before = Number(card.dataset.pos ?? pos);
      card.classList.toggle('is-jump', Math.abs(pos - before) > 2);
      card.dataset.pos = String(pos);
      card.setAttribute('aria-hidden', String(pos !== 0));
      this._backdrops[i].classList.toggle('is-active', pos === 0);
    });
    const caption = this._slides[this._active].caption;
    this._caption.textContent = caption ?? '';
    this._caption.hidden = !caption;
    this._count.textContent = `${pad(this._active + 1)} / ${pad(count)}`;
  }

  deckEl(section, slides) {
    this._slides = slides;
    this._cards = [];
    this._backdrops = [];

    const backdrop = document.createElement('div');
    backdrop.className = 'hero__backdrop';
    backdrop.setAttribute('aria-hidden', 'true');

    const deck = document.createElement('div');
    deck.className = 'hero__deck';
    // tabindex để dùng được phím mũi tên trái phải khi Tab tới chồng ảnh.
    deck.tabIndex = 0;
    if (section.slidesLabel) deck.setAttribute('aria-label', section.slidesLabel);

    slides.forEach((slide, i) => {
      const card = document.createElement('figure');
      card.className = 'hero__card';
      const img = imgEl(slide.image, slide.image.alt ?? '');
      if (i === 0) img.setAttribute('fetchpriority', 'high');
      card.append(img);
      // Bấm thẻ bên cạnh thì đưa nó vào giữa; bấm ngay sau khi vuốt thì bỏ qua.
      card.addEventListener('click', () => {
        if (!this._swiped && card.dataset.pos !== '0') this.select(i);
      });
      deck.append(card);
      this._cards.push(card);
      this._backdrops.push(imgEl(slide.image, ''));
    });
    backdrop.append(...this._backdrops);

    this._caption = document.createElement('p');
    this._caption.className = 'hero__caption';
    this._caption.setAttribute('aria-live', 'polite');
    deck.append(this._caption);

    deck.addEventListener('keydown', (e) => {
      const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
      if (!step) return;
      e.preventDefault();
      this.select(this._active + step);
    });

    // Vuốt ngang trên điện thoại: kéo quá 40px theo chiều ngang thì chuyển thẻ.
    deck.addEventListener('pointerdown', (e) => {
      this._start = { x: e.clientX, y: e.clientY };
    });
    deck.addEventListener('pointerup', (e) => {
      if (!this._start) return;
      const dx = e.clientX - this._start.x;
      const dy = e.clientY - this._start.y;
      this._start = null;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
      this._swiped = true;
      setTimeout(() => { this._swiped = false; }, 50);
      this.select(this._active + (dx < 0 ? 1 : -1));
    });

    this._count = document.createElement('span');
    this._count.className = 'hero__count';
    const controls = groupEl('hero__controls', [
      navButton(section.prevLabel, 'hero__nav--prev', () => this.select(this._active - 1)),
      this._count,
      navButton(section.nextLabel, 'hero__nav--next', () => this.select(this._active + 1)),
    ]);

    return { backdrop, deck, controls };
  }

  /* =========================================================
  VARIANT: FULL
  Ảnh phủ kín màn hình, có lớp sương phủ bên trên.
  Khối cao hơn màn hình, ảnh được giữ cố định khi cuộn.
  Khi cuộn: ảnh phóng gần dần, sương tách sang hai bên,
  mây bay qua, chữ chuyển sang màu sáng.
  Giảm chuyển động: ảnh đứng yên, sương mở sẵn, không có mây.
  ========================================================= */


  // Khi khối được gắn vào trang: kiểu full bắt đầu chạy chuyển động. Khi bị gỡ thì disconnectedCallback ở trên tắt.
  connectedCallback() {
    if (this._stage) this.play();
  }

  // Dựng sân khấu: ba lớp ảnh, vệt nắng, sương, hai mảng sương, mây, lớp tối, rồi tới phần chữ và dòng gợi ý cuộn.
  stageEl(section, inner) {
    const image = section.image ?? (section.slides ?? []).find((slide) => slide.image?.src)?.image;
    // Cùng một ảnh đặt ở ba độ sâu. Lớp xa là ảnh thật (có alt); hai lớp sau chỉ để tạo chiều sâu nên ẩn với trình đọc màn hình.
    this._layers = image?.src ? LAYERS.map((layerInfo, i) => {
      const layer = document.createElement('div');
      layer.className = `hero__layer hero__layer--${layerInfo.name}`;
      const img = imgEl(image, i === 0 ? image.alt ?? '' : '');
      if (i === 0) img.setAttribute('fetchpriority', 'high');
      else layer.setAttribute('aria-hidden', 'true');
      layer.append(img);
      return layer;
    }) : [];

    // Mười đám mây to nhỏ, vị trí và độ sâu ngẫu nhiên; mỗi khung hình chúng trôi dần về phía người xem.
    this._clouds = Array.from({ length: 10 }, () => {
      const node = decorEl('hero__cloud');
      const size = 300 + Math.random() * 600;
      node.style.width = `${size}px`;
      node.style.height = `${size / 2}px`;
      node.style.margin = `${-size / 4}px 0 0 ${-size / 2}px`;
      return { node, ...cloudSpot(), z: -3400 + Math.random() * 3600 };
    });

    this._glow = decorEl('hero__glow');
    this._veil = decorEl('hero__veil');
    this._banks = [decorEl('hero__bank hero__bank--left'), decorEl('hero__bank hero__bank--right')];
    this._hint = textEl('p', 'hero__hint', section.hint);
    // Vị trí chuột từ -1 tới 1; góc nhìn và vệt nắng đuổi theo nó với tốc độ khác nhau.
    this._pointer = { x: 0, y: 0 };
    this._view = { x: 0, y: 0 };
    this._sun = { x: 0, y: 0 };

    return groupEl('hero__stage', [
      groupEl('hero__world', this._layers),
      this._glow,
      this._veil,
      ...this._banks,
      groupEl('hero__clouds', this._clouds.map((cloud) => cloud.node)),
      decorEl('hero__shade'),
      inner,
      this._hint,
    ]);
  }

  // Mây tự trôi cả khi không cuộn, nên kiểu full cập nhật ở mọi khung hình chứ không chỉ lúc cuộn.
  play() {
    this.stop();
    this._onPointer = (e) => {
      this._pointer = { x: (e.clientX / window.innerWidth) * 2 - 1, y: (e.clientY / window.innerHeight) * 2 - 1 };
    };
    window.addEventListener('pointermove', this._onPointer, { passive: true });
    const tick = (now) => {
      if (!this._stage) return;
      this.update(now);
      this._frame = requestAnimationFrame(tick);
    };
    this._frame = requestAnimationFrame(tick);
  }

  stop() {
    cancelAnimationFrame(this._frame);
    window.removeEventListener('pointermove', this._onPointer);
  }

  // Mỗi khung hình: tính đã cuộn được bao nhiêu phần của khối (0 tới 1), rồi đặt ảnh, sương, chữ, mây theo đó.
  update(now) {
    const dt = Math.min(0.05, (now - (this._time ?? now)) / 1000);
    this._time = now;
    // Khối đã ra khỏi màn hình thì không cần vẽ.
    const box = this.getBoundingClientRect();
    if (box.bottom < 0 || box.top > window.innerHeight) return;

    const still = reducedMotion.matches;
    this.classList.toggle('is-static', still);
    const progress = still ? 0 : clamp(-box.top / Math.max(1, this.offsetHeight - window.innerHeight), 0, 1);
    // Sương vén xong ở 42% quãng cuộn; giảm chuyển động thì sương mở sẵn.
    const open = still ? 1 : smooth(0, 0.42, progress);
    // Cuộn hết khối thì máy quay đã bay vào 760px.
    const camera = progress * 760;

    this.followPointer(still);
    this.moveLayers(camera);
    this.clearMist(open, progress, still);
    this.moveClouds(dt, camera, open, still);
  }

  // Góc nhìn đuổi theo chuột nhanh, vệt nắng đuổi chậm hơn nên luôn trễ một nhịp.
  followPointer(still) {
    const target = still ? { x: 0, y: 0 } : this._pointer;
    this._view.x += (target.x - this._view.x) * 0.08;
    this._view.y += (target.y - this._view.y) * 0.08;
    this._sun.x += (target.x - this._sun.x) * 0.03;
    this._sun.y += (target.y - this._sun.y) * 0.03;
    this._glow.style.transform = `translate(${this._sun.x * -70}px, ${this._sun.y * -45}px)`;
  }

  // Ba lớp ảnh tiến lại theo máy quay và lệch nhẹ theo chuột.
  // Lớp càng xa thì phóng to càng nhiều, để lúc chưa cuộn ba lớp khớp nhau như một ảnh phẳng.
  moveLayers(camera) {
    this._layers.forEach((layer, i) => {
      const z = LAYERS[i].depth + camera;
      const fit = (PERSPECTIVE - LAYERS[i].depth) / PERSPECTIVE;
      layer.style.transform = `translate3d(${this._view.x * -28}px, ${this._view.y * -16}px, ${z}px) scale(${fit})`;
      // Lớp gần nhất bay qua ống kính thì mờ đi.
      if (i === LAYERS.length - 1) layer.style.opacity = String(clamp(1 - (z - 100) / 240, 0, 1));
    });
  }

  // Sương mỏng dần, hai mảng sương dạt ra hai bên, dòng gợi ý mờ đi ngay khi bắt đầu cuộn.
  // Lớp tối dưới chữ hiện dần trong khoảng 10% tới 26% quãng cuộn. Chữ đổi sang màu sáng một lần khi lớp tối
  // đã hiện được nửa, thay vì đổi dần qua màu xám khó đọc.
  clearMist(open, progress, still) {
    this._veil.style.opacity = String(MIST_START + (MIST_END - MIST_START) * open);
    this._banks[0].style.transform = `translateX(${-open * 70}vw)`;
    this._banks[1].style.transform = `translateX(${open * 70}vw)`;
    this._banks.forEach((bank) => { bank.style.opacity = String(0.8 - open * 0.6); });
    const light = still ? 1 : smooth(0.1, 0.26, progress);
    this.style.setProperty('--hero-light', light.toFixed(3));
    this.classList.toggle('is-light', light > 0.5);
    if (this._hint) this._hint.style.opacity = String(1 - clamp(progress * 5, 0, 1));
  }

  // Mây trôi về phía người xem, cộng thêm quãng máy quay đã bay; bay qua ống kính thì quay lại phía xa ở chỗ mới.
  // Sương càng tan thì mây càng thưa.
  moveClouds(dt, camera, open, still) {
    this._clouds.forEach((cloud) => {
      if (!still) cloud.z += dt * 90;
      let z = cloud.z + camera;
      if (z > 900) {
        Object.assign(cloud, cloudSpot());
        cloud.z -= 4000;
        z = cloud.z + camera;
      }
      // Mây hiện dần khi từ xa tới, mờ đi khi sắp chạm ống kính.
      const fade = clamp((z + 3400) / 900, 0, 1) * clamp((880 - z) / 380, 0, 1);
      cloud.node.style.transform = `translate3d(${cloud.x + this._view.x * -40}px, ${cloud.y + this._view.y * -22}px, ${z}px)`;
      cloud.node.style.opacity = still ? '0' : String(fade * (0.45 + 0.55 * (1 - open * 0.6)));
    });
  }

  /* Hết phần kiểu full. */

  render() {
    const section = this._data;
    this.className = `hero hero--${section.variant ?? 'coverflow'}`;

    // Nút chính luôn lấy từ site.cta để cả trang dùng chung một lời kêu gọi.
    const actions = groupEl('hero__actions', [
      linkEl(this.site?.cta?.href, this.site?.cta?.label, 'btn'),
      linkEl(section.link?.href, section.link?.label, 'btn btn--ghost'),
    ]);

    const copy = document.createElement('div');
    copy.className = 'hero__copy';
    const copyParts = [
      textEl('p', 'hero__eyebrow', section.eyebrow),
      textEl('h1', 'hero__title', section.title),
      textEl('p', 'hero__lead', section.lead),
      actions,
      textEl('p', 'hero__note', this.site?.cta?.note),
      statsEl(section.stats),
    ];
    copy.append(...copyParts.filter(Boolean));

    const inner = document.createElement('div');
    inner.className = 'hero__inner container';
    inner.append(copy);

    // Kiểu full: dựng sân khấu riêng thay cho khung ảnh; xem phần kiểu full ở trên.
    this.stop();
    this._stage = section.variant === 'full' ? this.stageEl(section, inner) : null;
    if (this._stage) {
      this.replaceChildren(this._stage);
      if (this.isConnected) this.play();
      this.attachEffect(section);
      return;
    }

    // Từ hai ảnh trở lên mới cần chồng thẻ; một ảnh thì dùng khung ảnh thường.
    const slides = (section.slides ?? []).filter((slide) => slide.image?.src);
    this._cards = [];
    if (slides.length > 1) {
      const { backdrop, deck, controls } = this.deckEl(section, slides);
      inner.append(deck, controls);
      this.replaceChildren(backdrop, inner);
      this.select(0);
      this.attachEffect(section);
      return;
    }

    const media = imageEl(section.image ?? slides[0]?.image);
    if (media) inner.append(media);
    this.replaceChildren(inner);
    this.attachEffect(section);
  }
}
