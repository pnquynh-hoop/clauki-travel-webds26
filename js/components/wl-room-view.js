/* wl-room-view.js - "nhìn từ ban công": các hạng phòng xếp thành dải thẻ ảnh đứng. Thẻ giữa là hạng đang chọn,
   hai thẻ bên nghiêng ra sau tạo chiều sâu; nền cả khối là chính ảnh đang chọn được làm mờ.
   Chọn bằng hàng nút tên hạng phòng (mẫu tabs của WAI-ARIA, dùng được bằng bàn phím),
   hoặc bấm thẻ bên cạnh, hoặc vuốt ngang trên điện thoại. */
import { asset } from '../core.js';
import { textEl, linkEl, groupEl } from '../dom.js';

function imgEl(image, alt) {
  const img = document.createElement('img');
  img.src = asset(image?.src ?? '');
  img.alt = alt;
  img.loading = 'lazy';
  return img;
}

function cardEl(view, ids, bestLabel) {
  const card = document.createElement('figure');
  card.className = 'room-view__card';
  card.id = ids.card;
  card.setAttribute('role', 'tabpanel');
  card.setAttribute('aria-labelledby', ids.tab);

  const best = view.best && (bestLabel ? `${bestLabel}: ${view.best}` : view.best);
  const caption = document.createElement('figcaption');
  caption.className = 'room-view__caption';
  caption.append(...[
    textEl('p', 'room-view__name', view.label),
    textEl('p', 'room-view__text', view.text),
    textEl('p', 'room-view__best', best),
  ].filter(Boolean));

  card.append(imgEl(view.image, view.image?.alt ?? ''), caption);
  return card;
}

export class WlRoomView extends HTMLElement {
  // Thẻ chỉ xoè ra khi khối cuộn tới màn hình, để khách thấy lúc xoè thay vì nó chạy từ lúc tải trang.
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

  // Đặt mỗi thẻ vào vị trí so với thẻ đang chọn: 0 ở giữa, -1 bên trái, 1 bên phải, xa hơn thì ẩn.
  // Tính theo vòng tròn, nên đứng ở thẻ cuối bấm sang phải sẽ quay về thẻ đầu.
  select(index, focus = false) {
    const count = this._cards.length;
    this._active = (index + count) % count;
    this._cards.forEach((card, i) => {
      let pos = i - this._active;
      if (pos > count / 2) pos -= count;
      if (pos < -count / 2) pos += count;
      const on = pos === 0;
      card.dataset.pos = String(Math.max(-2, Math.min(2, pos)));
      card.setAttribute('aria-hidden', String(!on));
      this._tabs[i].setAttribute('aria-selected', String(on));
      this._tabs[i].tabIndex = on ? 0 : -1;
      this._backdrops[i].classList.toggle('is-active', on);
    });
    if (focus) this._tabs[this._active].focus();
  }

  render() {
    const section = this._data;
    this.className = `room-view room-view--${section.variant ?? 'coverflow'}`;
    // Gán className xoá mất is-visible; khối đã từng hiện thì giữ lại để thẻ vẫn xoè khi đổi thương hiệu.
    if (this._seen) this.classList.add('is-visible');

    const views = (section.views ?? []).filter((view) => view.label && view.image?.src);
    const prefix = this.id || 'room-view';

    const backdrop = document.createElement('div');
    backdrop.className = 'room-view__backdrop';
    backdrop.setAttribute('aria-hidden', 'true');

    const stage = document.createElement('div');
    stage.className = 'room-view__stage';

    const tablist = document.createElement('div');
    tablist.className = 'room-view__tabs';
    tablist.setAttribute('role', 'tablist');
    if (section.title) tablist.setAttribute('aria-label', section.title);

    this._tabs = [];
    this._cards = [];
    this._backdrops = [];
    views.forEach((view, i) => {
      const ids = { tab: `${prefix}-tab-${i}`, card: `${prefix}-card-${i}` };
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'room-view__tab';
      tab.id = ids.tab;
      tab.textContent = view.label;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', ids.card);
      tab.addEventListener('click', () => this.select(i));
      tablist.append(tab);
      this._tabs.push(tab);

      const card = cardEl(view, ids, section.bestLabel);
      // Bấm thẻ bên cạnh thì đưa nó vào giữa; thẻ giữa thì không làm gì.
      card.addEventListener('click', () => {
        if (card.dataset.pos !== '0') this.select(i);
      });
      stage.append(card);
      this._cards.push(card);

      const blurred = imgEl(view.image, '');
      backdrop.append(blurred);
      this._backdrops.push(blurred);
    });

    // Phím mũi tên, Home, End đi qua các nút như hướng dẫn của WAI-ARIA cho tabs.
    tablist.addEventListener('keydown', (e) => {
      const current = this._tabs.indexOf(document.activeElement);
      if (current < 0) return;
      const last = this._tabs.length - 1;
      const next = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: last }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      this.select(next, true);
    });

    // Vuốt ngang trên điện thoại: kéo quá 40px thì chuyển thẻ, kéo ít hơn coi như bấm.
    stage.addEventListener('pointerdown', (e) => {
      this._startX = e.clientX;
    });
    stage.addEventListener('pointerup', (e) => {
      const dx = e.clientX - (this._startX ?? e.clientX);
      if (Math.abs(dx) > 40) this.select(this._active + (dx < 0 ? 1 : -1));
    });

    const head = groupEl('room-view__head', [
      textEl('p', 'room-view__eyebrow', section.eyebrow),
      textEl('h2', 'room-view__title', section.title),
      textEl('p', 'room-view__lead', section.lead),
    ]);
    const cta = linkEl(this.site?.cta?.href, this.site?.cta?.label, 'btn room-view__cta');
    const inner = groupEl('room-view__inner container', [head, views.length ? stage : null, views.length > 1 ? tablist : null, cta]);

    this.replaceChildren(...[views.length ? backdrop : null, inner].filter(Boolean));
    if (this._cards.length) this.select(0);
  }
}
