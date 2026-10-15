/* wl-route.js - hành trình chia chặng của một tour. Kiểu metro: các chặng là ga trên một tuyến dọc;
   chấm ga, nhãn và bóng ảnh tô màu phương tiện của chặng. Cuộn trang thì đường ray tô dần, viên phương tiện
   chạy dọc tuyến, đi qua ga nào thì đổi sang phương tiện của ga đó.
   Chặng đọc từ catalog khi section ghi "item"; thương hiệu không có catalog thì ghi stages, vehicles ngay trong section. */
import { asset, catalogItem } from '../core.js';
import { textEl, clamp } from '../dom.js';
import { iconEl } from '../icon.js';
import { openLightbox } from '../effects/lightbox.js';

const pad = (n) => String(n).padStart(2, '0');

// Thay {tên} trong mẫu chữ bằng giá trị tương ứng.
const fill = (template, values) => (template ?? '').replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));

// Phương tiện của một chặng. Bảng vehicles không có tên cho mã này thì bỏ nhãn, không hiện mã thô.
// Màu đến từ dữ liệu nên kiểm trước khi gán vào CSS.
function vehicleOf(vehicles, id) {
  const v = id ? vehicles[id] : null;
  if (!v?.label) return null;
  const color = v.color && CSS.supports('color', v.color) ? v.color : null;
  return { id, label: v.label, color, icon: v.icon };
}

function setColor(el, vehicle) {
  if (vehicle?.color) el.style.setProperty('--vc', vehicle.color);
  else el.style.removeProperty('--vc');
}

// Nhãn phương tiện: icon và tên trên nền pha màu phương tiện.
function chipEl(vehicle) {
  if (!vehicle) return null;
  const chip = document.createElement('span');
  chip.className = 'route__chip';
  chip.append(...[iconEl(vehicle.icon, 'route__chip-icon'), vehicle.label].filter(Boolean));
  return chip;
}

export class WlRoute extends HTMLElement {
  connectedCallback() {
    if (this._ui) this.start();
  }

  disconnectedCallback() {
    this.stop();
  }

  set data(section) {
    this._data = section;
    this.render();
  }

  get labels() {
    return this._data.labels ?? {};
  }

  render() {
    const section = this._data;
    this.stop();
    this._ui = null;
    this._current = null;
    this._nameMax = null;
    this.className = `route route--${section.variant ?? 'metro'}`;

    // Section ghi stages thì dùng của section, không thì lấy chặng của tour trong catalog.
    const item = section.item ? catalogItem(this.site, section.item) : null;
    const vehicles = { ...this.site?.catalog?.vehicles, ...section.vehicles };
    this._stages = (section.stages ?? item?.stages ?? [])
      .filter((stage) => stage.place)
      .map((stage) => ({ ...stage, ride: vehicleOf(vehicles, stage.vehicle) }));

    // Không có chặng nào (id tour ghi sai, brand không có catalog mà section cũng không ghi stages) thì ẩn cả khối,
    // không để lại tiêu đề "0 ga" hay khoảng trống.
    this.hidden = !this._stages.length;
    if (this.hidden) {
      this.replaceChildren();
      return;
    }

    const kinds = new Set(this._stages.map((stage) => stage.ride?.id).filter(Boolean));
    const head = document.createElement('div');
    head.className = 'route__head';
    head.append(...[
      textEl('p', 'route__eyebrow', section.eyebrow),
      textEl('h2', 'route__title', fill(section.title, { stages: this._stages.length, vehicles: kinds.size })),
      textEl('p', 'route__lead', section.lead),
    ].filter(Boolean));

    const inner = document.createElement('div');
    inner.className = 'container';
    inner.append(head, this.lineEl());
    this.replaceChildren(inner);

    // Giảm chuyển động: ray tô sẵn, mọi ga hiện đủ, không có viên chạy theo cuộn.
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.classList.toggle('is-static', still);
    if (this._ui && !still) {
      this.setVehicle(this._stages[0].ride);
      if (this.isConnected) this.start();
    }
  }

  lineEl() {
    const photos = this._stages.filter((stage) => stage.image?.src);
    const images = photos.map((stage) => ({ ...stage.image, caption: stage.place }));
    const stops = this._stages.map((stage, i) => this.stopEl(stage, i, images, photos.indexOf(stage)));

    const list = document.createElement('ol');
    list.className = 'route__stops';
    list.append(...stops);

    const rail = document.createElement('div');
    rail.className = 'route__rail';
    rail.setAttribute('aria-hidden', 'true');

    // Viên phương tiện chỉ để nhìn: tên phương tiện của từng chặng đã có trong nhãn của ga.
    const token = document.createElement('div');
    token.className = 'route__token';
    token.setAttribute('aria-hidden', 'true');
    const tokenIcon = document.createElement('span');
    tokenIcon.className = 'route__token-icon';
    const tokenName = document.createElement('span');
    tokenName.className = 'route__token-name';
    token.append(tokenIcon, tokenName);

    const line = document.createElement('div');
    line.className = 'route__line';
    line.append(rail, token, list);
    this._ui = { line, token, tokenIcon, tokenName, stops };
    return line;
  }

  // Một ga: chấm, giờ, tên nơi, câu tả, nhãn phương tiện; bên cạnh là ảnh (bấm để xem lớn) hoặc số thứ tự lớn.
  stopEl(stage, index, images, photoIndex) {
    const li = document.createElement('li');
    li.className = 'route__stop';
    setColor(li, stage.ride);

    const dot = document.createElement('span');
    dot.className = 'route__dot';
    dot.setAttribute('aria-hidden', 'true');

    const body = document.createElement('div');
    body.className = 'route__body';
    body.append(...[
      textEl('p', 'route__time', stage.time),
      textEl('h3', 'route__place', stage.place),
      textEl('p', 'route__text', stage.text),
      chipEl(stage.ride),
    ].filter(Boolean));

    li.append(dot, body, photoIndex >= 0 ? this.photoEl(stage, images, photoIndex) : this.numberEl(index));
    return li;
  }

  photoEl(stage, images, photoIndex) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'route__photo';
    const label = fill(this.labels.open, { place: stage.place });
    if (label) button.setAttribute('aria-label', label);
    const img = document.createElement('img');
    img.src = asset(stage.image.src);
    img.alt = stage.image.alt ?? '';
    img.loading = 'lazy';
    button.append(img);
    button.addEventListener('click', () => openLightbox(images, photoIndex, this.labels.lightbox ?? {}));
    return button;
  }

  numberEl(index) {
    const no = document.createElement('span');
    no.className = 'route__no';
    no.setAttribute('aria-hidden', 'true');
    no.textContent = pad(index + 1);
    return no;
  }

  // Chỉ nghe cuộn khi tuyến đang ở trong màn hình, để trang dài không tốn công tính lại.
  start() {
    this.stop();
    if (!this._ui || this.classList.contains('is-static')) return;
    this._onScroll ??= () => {
      cancelAnimationFrame(this._frame);
      this._frame = requestAnimationFrame(() => this.update());
    };
    // Đổi cỡ cửa sổ thì lề đổi theo: đo lại bề ngang nhãn ở lần cập nhật sau.
    this._onResize ??= () => {
      this._nameMax = null;
      this._onScroll();
    };
    this._io = new IntersectionObserver(([entry]) => {
      const method = entry.isIntersecting ? 'addEventListener' : 'removeEventListener';
      window[method]('scroll', this._onScroll, { passive: true });
      window[method]('resize', this._onResize);
      if (entry.isIntersecting) this.update();
    });
    this._io.observe(this._ui.line);
    // Font chữ bảng hiệu tải xong thì nhãn rộng ra: đo lại.
    document.fonts?.ready.then(() => this._onResize());
  }

  stop() {
    this._io?.disconnect();
    if (this._onScroll) {
      window.removeEventListener('scroll', this._onScroll);
      window.removeEventListener('resize', this._onResize);
    }
    cancelAnimationFrame(this._frame);
  }

  // Viên đi theo tâm màn hình; ga nào nằm trên vị trí của viên thì coi là đã qua.
  update() {
    const { line, token, stops } = this._ui;
    const box = line.getBoundingClientRect();
    const y = clamp(window.innerHeight * 0.5 - box.top, 0, Math.max(0, box.height - token.offsetHeight));
    token.style.transform = `translateY(${y}px)`;
    line.style.setProperty('--fill', `${y}px`);
    let active = 0;
    stops.forEach((stop, i) => {
      const passed = stop.offsetTop <= y + 10;
      stop.classList.toggle('is-passed', passed);
      if (passed) active = i;
    });
    this.setVehicle(this._stages[active].ride);
    this.fitName();
  }

  // Nhãn tên phương tiện nằm ở lề trái ngoài khung nội dung: chỉ hiện khi khoảng từ mép màn hình tới viên tròn
  // chứa được nhãn dài nhất của tuyến (chừa 8px cạnh viên, 16px tới mép màn hình), màn hẹp thì ẩn.
  // Xét nhãn dài nhất để nhãn không lúc hiện lúc ẩn khi đổi sang phương tiện tên dài hơn.
  fitName() {
    const { line, tokenIcon } = this._ui;
    this._nameMax ??= this.widestName();
    const free = tokenIcon.getBoundingClientRect().left - 8;
    line.classList.toggle('has-room', this._nameMax + 16 <= free);
  }

  // Đo lần lượt tên các phương tiện của tuyến trong chính ô nhãn rồi trả lại tên đang hiện.
  widestName() {
    const { tokenName } = this._ui;
    const current = tokenName.textContent;
    let max = 0;
    new Set(this._stages.map((stage) => stage.ride?.label).filter(Boolean)).forEach((label) => {
      tokenName.textContent = label;
      max = Math.max(max, tokenName.offsetWidth);
    });
    tokenName.textContent = current;
    return max;
  }

  // Đổi icon, tên, màu của viên khi sang chặng đi bằng phương tiện khác; chặng không ghi phương tiện thì giữ nguyên.
  setVehicle(vehicle) {
    if (!vehicle || vehicle.id === this._current) return;
    const first = this._current === null;
    this._current = vehicle.id;
    const { token, tokenIcon, tokenName } = this._ui;
    setColor(token, vehicle);
    const icon = iconEl(vehicle.icon, 'route__token-svg');
    tokenIcon.replaceChildren(...(icon ? [icon] : []));
    tokenName.textContent = vehicle.label;
    if (first) return;
    // Bỏ lớp rồi đọc offsetWidth để trình duyệt chạy lại hiệu ứng lật từ đầu.
    token.classList.remove('is-swap');
    void token.offsetWidth;
    token.classList.add('is-swap');
  }
}
