/* wl-room-view.js - "nhìn từ ban công": mỗi hạng phòng một cảnh nhìn ra từ cửa.
   Một khung ảnh ngang lớn có hai mặt; chọn hạng khác thì khung lật quanh trục dọc như cánh cửa,
   mặt sau hiện cảnh của hạng mới. Chọn bằng hàng nút tên hạng (mẫu tabs của WAI-ARIA, dùng được bằng bàn phím)
   hoặc vuốt ngang trên khung ảnh. */
import { asset } from '../core.js';
import { textEl, linkEl, groupEl } from '../dom.js';

function faceEl() {
  const face = document.createElement('figure');
  face.className = 'room-view__face';
  const img = document.createElement('img');
  img.loading = 'lazy';
  face.append(img);
  return face;
}

function setFace(face, view) {
  const img = face.querySelector('img');
  img.src = asset(view.image.src);
  img.alt = view.image.alt ?? '';
}

export class WlRoomView extends HTMLElement {
  // Khung chỉ hiện ra khi khối cuộn tới màn hình, để khách thấy lúc khung mở thay vì nó chạy từ lúc tải trang.
  connectedCallback() {
    this._observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      this._seen = true;
      this.classList.add('is-visible');
      this._observer.disconnect();
    }, { threshold: 0.3 });
    this._observer.observe(this);
  }

  disconnectedCallback() {
    this._observer?.disconnect();
  }

  set data(section) {
    this._data = section;
    this.render();
  }

  // Lật khung sang cảnh của hạng index. Ảnh mới được đặt vào mặt đang quay lưng lại,
  // rồi cả khung quay thêm nửa vòng theo hướng bấm (sang phải thì lật sang phải), nên mặt đó quay ra trước.
  select(index, focus = false) {
    const count = this._views.length;
    const next = (index + count) % count;
    if (next !== this._active) {
      const direction = next > this._active ? 1 : -1;
      this._turns += direction;
      const shown = this._faces[Math.abs(this._turns) % 2];
      const hidden = this._faces[(Math.abs(this._turns) + 1) % 2];
      setFace(shown, this._views[next]);
      shown.removeAttribute('aria-hidden');
      hidden.setAttribute('aria-hidden', 'true');
      this._door.style.setProperty('--turn', `${this._turns * 180}deg`);
      this._active = next;
    }

    const view = this._views[this._active];
    const best = view.best && (this._bestLabel ? `${this._bestLabel}: ${view.best}` : view.best);
    this._text.textContent = view.text ?? '';
    this._best.textContent = best ?? '';
    this._tabs.forEach((tab, i) => {
      const on = i === this._active;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
    });
    this._panel.setAttribute('aria-labelledby', this._tabs[this._active].id);
    if (focus) this._tabs[this._active].focus();
  }

  render() {
    const section = this._data;
    this.className = `room-view room-view--${section.variant ?? 'flip'}`;
    // Gán className xoá mất is-visible; khối đã từng hiện thì giữ lại để khung không ẩn đi khi đổi thương hiệu.
    if (this._seen) this.classList.add('is-visible');

    this._views = (section.views ?? []).filter((view) => view.label && view.image?.src);
    this._bestLabel = section.bestLabel;
    const prefix = this.id || 'room-view';

    const tablist = document.createElement('div');
    tablist.className = 'room-view__tabs';
    tablist.setAttribute('role', 'tablist');
    if (section.title) tablist.setAttribute('aria-label', section.title);

    this._panel = document.createElement('div');
    this._panel.className = 'room-view__panel';
    this._panel.id = `${prefix}-panel`;
    this._panel.setAttribute('role', 'tabpanel');

    this._tabs = this._views.map((view, i) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'room-view__tab';
      tab.id = `${prefix}-tab-${i}`;
      tab.textContent = view.label;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', this._panel.id);
      tab.addEventListener('click', () => this.select(i));
      return tab;
    });
    tablist.append(...this._tabs);

    // Phím mũi tên, Home, End đi qua các nút như hướng dẫn của WAI-ARIA cho tabs.
    tablist.addEventListener('keydown', (e) => {
      const current = this._tabs.indexOf(document.activeElement);
      if (current < 0) return;
      const last = this._tabs.length - 1;
      const next = { ArrowRight: current + 1, ArrowDown: current + 1, ArrowLeft: current - 1, ArrowUp: current - 1, Home: 0, End: last }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      this.select(next, true);
    });

    // Khung hai mặt: mặt trước và mặt sau quay lưng vào nhau, cả khung xoay theo biến --turn.
    this._faces = [faceEl(), faceEl()];
    this._faces[1].classList.add('room-view__face--back');
    this._faces[1].setAttribute('aria-hidden', 'true');
    this._door = groupEl('room-view__door', this._faces);
    const frame = groupEl('room-view__frame', [this._door]);

    // Vuốt ngang trên khung: kéo quá 40px theo chiều ngang thì sang hạng bên cạnh.
    frame.addEventListener('pointerdown', (e) => {
      this._start = { x: e.clientX, y: e.clientY };
    });
    frame.addEventListener('pointerup', (e) => {
      if (!this._start) return;
      const dx = e.clientX - this._start.x;
      const dy = e.clientY - this._start.y;
      this._start = null;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
      this.select(this._active + (dx < 0 ? 1 : -1));
    });

    this._text = document.createElement('p');
    this._text.className = 'room-view__text';
    this._best = document.createElement('p');
    this._best.className = 'room-view__best';
    this._panel.append(frame, this._text, this._best);

    const head = groupEl('room-view__head', [
      textEl('p', 'room-view__eyebrow', section.eyebrow),
      textEl('h2', 'room-view__title', section.title),
      textEl('p', 'room-view__lead', section.lead),
    ]);
    const cta = linkEl(this.site?.cta?.href, this.site?.cta?.label, 'btn room-view__cta');
    const hasViews = this._views.length > 0;
    const inner = groupEl('room-view__inner container', [
      head,
      this._views.length > 1 ? tablist : null,
      hasViews ? this._panel : null,
      cta,
    ]);
    this.replaceChildren(...[inner].filter(Boolean));
    if (!hasViews) return;

    // Lần dựng đầu: mặt trước hiện hạng đầu tiên, khung đứng thẳng, không có chuyển động.
    this._turns = 0;
    this._active = 0;
    setFace(this._faces[0], this._views[0]);
    this._door.style.setProperty('--turn', '0deg');
    this.select(0);
  }
}
