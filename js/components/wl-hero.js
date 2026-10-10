/* wl-hero.js - màn hình đầu: nhãn nhỏ, tiêu đề h1, đoạn dẫn, nút CTA, liên kết phụ, vài con số, và ảnh.
   Dữ liệu có một ảnh (image) thì dựng một khung ảnh. Có nhiều ảnh (slides) thì dựng chồng thẻ ảnh xoay vòng:
   thẻ giữa là ảnh đang xem, các thẻ hai bên nghiêng ra sau, nền là chính ảnh đó được làm mờ.
   hero.css đổi bố cục theo class hero--<variant>. */
import { asset } from '../core.js';
import { textEl, linkEl, groupEl } from '../dom.js';
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

export class WlHero extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  // Gỡ hiệu ứng (nếu có) khi hero bị gỡ khỏi trang, ví dụ lúc đổi thương hiệu.
  disconnectedCallback() {
    this._detachEffect?.();
    this._detachEffect = null;
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
