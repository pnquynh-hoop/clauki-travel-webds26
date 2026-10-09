/* wl-room-view.js - "nhìn từ ban công": mỗi hạng phòng một cảnh nhìn ra, xếp theo độ cao từ thấp lên cao.
   Khối được ghim trên màn hình trong lúc cuộn; cuộn tới đâu thì góc nhìn leo dốc tới đó: cảnh đang xem trôi xuống
   và mờ đi, cảnh của hạng cao hơn trôi từ trên vào. Thanh độ cao bên phải khung chạy theo; bấm một mốc thì cuộn tới hạng đó.
   Người dùng bật giảm chuyển động thì không ghim: bấm mốc là đổi cảnh ngay. */
import { asset } from '../core.js';
import { textEl, linkEl, groupEl } from '../dom.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Mỗi hạng đứng yên một quãng rồi mới chuyển sang hạng kế: phần lẻ của vị trí được ép phẳng ở hai đầu.
function settle(position) {
  const step = Math.floor(position);
  const x = clamp((position - step - 0.2) / 0.6, 0, 1);
  return step + x * x * (3 - 2 * x);
}

function layerEl(view, first) {
  const img = document.createElement('img');
  img.className = 'room-view__layer';
  img.src = asset(view.image.src);
  img.alt = view.image.alt ?? '';
  if (!first) img.loading = 'lazy';
  return img;
}

export class WlRoomView extends HTMLElement {
  connectedCallback() {
    this._reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Cuộn thì chỉ đánh dấu, đợi khung hình kế của trình duyệt mới tính lại, để không tính nhiều lần trong một khung hình.
    this._onScroll = () => {
      if (this._frame) return;
      this._frame = requestAnimationFrame(() => {
        this._frame = null;
        this.update();
      });
    };
    window.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('resize', this._onScroll);
    this.update();
  }

  disconnectedCallback() {
    window.removeEventListener('scroll', this._onScroll);
    window.removeEventListener('resize', this._onScroll);
    cancelAnimationFrame(this._frame);
  }

  set data(section) {
    this._data = section;
    this.render();
  }

  get isStatic() {
    return this._reduced?.matches ?? false;
  }

  // Quãng cuộn của khối: từ lúc mép trên khối chạm đầu màn hình tới lúc mép dưới khối chạm đáy màn hình.
  scrollRange() {
    const top = this.getBoundingClientRect().top + window.scrollY;
    return { top, length: Math.max(1, this.offsetHeight - window.innerHeight) };
  }

  update() {
    if (!this._layers?.length) return;
    this.classList.toggle('is-static', this.isStatic);
    const last = this._layers.length - 1;
    let position = this._static ?? 0;
    if (!this.isStatic) {
      const { top, length } = this.scrollRange();
      const progress = clamp((window.scrollY - top) / length, 0, 1);
      position = settle(progress * last);
      this.classList.toggle('is-moving', progress > 0.02);
    }
    this.show(position);
  }

  // position chạy liên tục từ 0 (hạng thấp nhất) tới số hạng trừ 1. Mọi ảnh trôi xuống khi vị trí đi lên, như máy quay
  // đang đi lên. Ảnh của hạng cao hơn nằm đè lên và hiện dần khi tới gần, ảnh bên dưới giữ nguyên độ đậm,
  // nên lúc chuyển không có khoảnh khắc cả hai ảnh cùng mờ làm khung tối đi.
  show(position) {
    const last = this._layers.length - 1;
    this._layers.forEach((layer, i) => {
      const d = position - i;
      layer.style.opacity = String(clamp(1 + d, 0, 1));
      layer.style.transform = `translateY(${d * 16}%) scale(${1 + Math.abs(d) * 0.06})`;
    });
    this._fill.style.height = `${last ? (position / last) * 100 : 100}%`;

    const active = Math.round(position);
    if (active === this._active) return;
    this._active = active;
    const view = this._views[active];
    const best = view.best && (this._bestLabel ? `${this._bestLabel}: ${view.best}` : view.best);
    this._name.textContent = view.label;
    this._text.textContent = view.text ?? '';
    this._best.textContent = best ?? '';
    this._layers.forEach((layer, i) => layer.setAttribute('aria-hidden', String(i !== active)));
    this._stops.forEach((stop, i) => {
      if (i === active) stop.setAttribute('aria-current', 'true');
      else stop.removeAttribute('aria-current');
    });
  }

  // Bấm một mốc độ cao: đang ghim thì cuộn trang tới đoạn của hạng đó; giảm chuyển động thì đổi cảnh ngay.
  goTo(index) {
    if (this.isStatic) {
      this._static = index;
      this.update();
      return;
    }
    const { top, length } = this.scrollRange();
    const last = this._layers.length - 1;
    window.scrollTo({ top: top + (last ? (index / last) * length : 0), behavior: 'smooth' });
  }

  render() {
    const section = this._data;
    this.className = `room-view room-view--${section.variant ?? 'climb'}`;

    this._views = (section.views ?? []).filter((view) => view.label && view.image?.src);
    this._bestLabel = section.bestLabel;
    this._active = null;
    this._static = 0;
    // Mỗi hạng một quãng cuộn bằng một màn hình; CSS đọc --steps để tính chiều cao khối.
    this.style.setProperty('--steps', String(Math.max(1, this._views.length)));

    this._layers = this._views.map((view, i) => layerEl(view, i === 0));
    const frame = groupEl('room-view__frame', this._layers);

    // Thanh độ cao: mốc của hạng thấp nhất ở dưới cùng, hạng cao nhất ở trên cùng; vạch màu chủ đạo dâng lên theo vị trí.
    this._fill = document.createElement('div');
    this._fill.className = 'room-view__fill';
    const track = groupEl('room-view__track', [this._fill]);
    const last = Math.max(1, this._views.length - 1);
    this._stops = this._views.map((view, i) => {
      const stop = document.createElement('button');
      stop.type = 'button';
      stop.className = 'room-view__stop';
      stop.style.setProperty('--at', `${(i / last) * 100}%`);
      stop.append(...[textEl('span', 'room-view__level', view.level), textEl('span', 'room-view__stop-name', view.label)].filter(Boolean));
      stop.addEventListener('click', () => this.goTo(i));
      return stop;
    });
    const gauge = groupEl('room-view__gauge', [track, ...this._stops]);
    if (frame && gauge && this._views.length > 1) frame.append(gauge);
    const hint = textEl('p', 'room-view__hint', section.hint);
    if (frame && hint) frame.append(hint);

    this._name = document.createElement('p');
    this._name.className = 'room-view__name';
    this._text = document.createElement('p');
    this._text.className = 'room-view__text';
    this._best = document.createElement('p');
    this._best.className = 'room-view__best';
    const info = groupEl('room-view__info', [this._name, this._text, this._best]);

    const head = groupEl('room-view__head', [
      textEl('p', 'room-view__eyebrow', section.eyebrow),
      textEl('h2', 'room-view__title', section.title),
      textEl('p', 'room-view__lead', section.lead),
    ]);
    const cta = linkEl(this.site?.cta?.href, this.site?.cta?.label, 'btn room-view__cta');
    const hasViews = this._views.length > 0;
    const sticky = groupEl('room-view__sticky container', [head, hasViews ? frame : null, hasViews ? info : null, cta]);

    this.replaceChildren(...[sticky].filter(Boolean));
    this.update();
  }
}
