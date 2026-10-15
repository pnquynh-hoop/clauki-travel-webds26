/* wl-room-detail.js - trang chi tiết một hạng phòng hoặc một tour, dàn như một trang tạp chí:
   - ảnh bìa gần kín màn hình, tên hạng chữ rất lớn; đáy ảnh là dải thông số mảnh (diện tích, số khách...);
     ảnh phóng chậm khi vào trang và trôi chậm khi cuộn;
   - câu dẫn chữ lớn, tiện nghi; bên cạnh là thẻ đặt phòng (giá, ghi chú giá, nút đặt, ngày còn trống) dính khi cuộn;
   - dải phim ảnh: từ 1024px khối ghim lại, cuộn dọc thì dải trôi ngang như đi một vòng quanh phòng;
     điện thoại thì vuốt ngang; bấm ảnh thì xem lớn toàn màn hình;
   - dải "nhìn ra từ hiên" tràn màn hình có câu chữ đè lên;
   - thẻ ảnh dẫn sang các hạng khác, liên kết không có ảnh thành một dòng chữ bên dưới.
   Nút đặt lấy từ site.cta và phát wl:choose-room (detail.id = room) để form đặt chỗ chọn sẵn hạng này,
   kể cả khi form nằm ở trang khác (core.js giữ lựa chọn rồi phát lại).
   Section ghi "item" thì lấy tour hoặc hạng phòng trong catalog: tên, ảnh (ảnh bìa rồi ảnh các chặng), giá, thông số,
   ngày còn chỗ, gồm, chưa gồm, nên mang, và các mục khác cùng buổi; trường nào section ghi riêng thì dùng của section. */
import { asset, catalogItem } from '../core.js';
import { textEl, groupEl } from '../dom.js';
import { iconEl } from '../icon.js';
import { parallax } from '../effects/parallax.js';
import { pinHorizontal } from '../effects/pin-scroll.js';
import { openLightbox } from '../effects/lightbox.js';

function fill(template, values) {
  return (template ?? '').replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
}

function imgEl(image, className, lazy) {
  if (!image?.src) return null;
  const img = document.createElement('img');
  img.className = className;
  img.src = asset(image.src);
  img.alt = image.alt ?? '';
  if (lazy) img.loading = 'lazy';
  return img;
}

const pad = (n) => String(n).padStart(2, '0');
// Số ngày còn chỗ hiện trong thẻ đặt, và số mục khác cùng gu ở cuối trang.
const DAYS_SHOWN = 6;
const OTHERS_SHOWN = 3;

function todayIso(timezone) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

// "2026-10-20" thành "Thứ Ba, 20/10"; tính theo giờ UTC để ngày không lệch theo múi giờ của máy.
function dayLabel(iso) {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  const text = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', timeZone: 'UTC' }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Ảnh bìa rồi ảnh của từng chặng (chú thích là tên chặng), bỏ ảnh trùng.
function itemImages(item) {
  const seen = new Set();
  const list = [item.image, ...(item.stages ?? []).map((st) => st.image && { ...st.image, caption: st.place })];
  return list.filter((image) => image?.src && !seen.has(image.src) && seen.add(image.src));
}

// Mục khác cùng buổi trước, rồi tới mục chung chủ đề; chỉ lấy mục có trang (href).
function itemOthers(catalog, item) {
  const topics = item.tags?.topics ?? [];
  const score = (other) => (other.tags?.buoi === item.tags?.buoi ? 2 : 0)
    + (other.tags?.topics ?? []).filter((t) => topics.includes(t)).length;
  return (catalog?.items ?? [])
    .filter((other) => other.id !== item.id && other.href)
    .sort((a, b) => score(b) - score(a))
    .slice(0, OTHERS_SHOWN)
    .map((other) => ({ label: other.name, href: other.href, image: other.image, note: other.tagline }));
}

export class WlRoomDetail extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  get labels() {
    return this._data.labels ?? {};
  }

  money(amount) {
    return `${amount.toLocaleString('vi-VN')} ${this._section.currency ?? ''}`.trim();
  }

  /* ---------- Ảnh bìa ---------- */

  // Chưa có ảnh thì vẫn có phần chữ và dải thông số, chỉ không có ảnh bìa.
  coverEl(section) {
    const image = section.images?.[0];
    const cover = document.createElement('header');
    cover.className = image?.src ? 'room-detail__cover' : 'room-detail__cover room-detail__cover--plain';
    const img = imgEl(image, 'room-detail__cover-img', false);
    const text = groupEl('room-detail__cover-text container', [
      textEl('p', 'room-detail__eyebrow', section.eyebrow),
      textEl('h2', 'room-detail__title', section.title),
    ]);
    const facts = this.factsEl(section.facts ?? []);
    if (!img && !text && !facts) return null;
    cover.append(...[img, text, facts].filter(Boolean));
    parallax(img, 0.18, 1.18);
    return cover;
  }

  // Dải thông số ở đáy ảnh bìa: nhãn nhỏ in hoa, giá trị chữ lớn, ngăn nhau bằng vạch mảnh.
  factsEl(facts) {
    const items = facts.filter((f) => f.label && f.value);
    if (!items.length) return null;
    const dl = document.createElement('dl');
    dl.className = 'room-detail__facts container';
    dl.append(...items.map((f) => groupEl('room-detail__fact', [
      groupEl('room-detail__fact-label', [iconEl(f.icon, 'room-detail__fact-icon'), textEl('dt', '', f.label)]),
      textEl('dd', '', f.value),
    ])));
    return dl;
  }

  /* ---------- Câu dẫn, tiện nghi, thẻ đặt phòng ---------- */

  amenitiesEl(amenities) {
    const items = amenities.filter((a) => a.text);
    if (!items.length) return null;
    const list = document.createElement('ul');
    list.className = 'room-detail__amenities';
    list.append(...items.map((a) => {
      const li = document.createElement('li');
      li.className = 'room-detail__amenity';
      li.append(...[iconEl(a.icon, 'room-detail__icon'), textEl('span', '', a.text)].filter(Boolean));
      return li;
    }));
    return groupEl('room-detail__block', [textEl('h3', 'room-detail__subtitle', this.labels.amenities), list]);
  }

  // Gồm, chưa gồm, nên mang (của tour trong catalog): mỗi nhóm một danh sách ngắn có tiêu đề.
  listsEl(section) {
    const groups = [['includes', 'check'], ['excludes', 'x'], ['bring', 'backpack']].map(([key, icon]) => {
      const items = (section[key] ?? []).filter(Boolean);
      if (!items.length) return null;
      const list = document.createElement('ul');
      list.className = `room-detail__list room-detail__list--${key}`;
      list.append(...items.map((text) => {
        const li = document.createElement('li');
        li.append(...[iconEl(icon, 'room-detail__icon'), textEl('span', '', text)].filter(Boolean));
        return li;
      }));
      return groupEl('room-detail__block', [textEl('h3', 'room-detail__subtitle', this.labels[key]), list]);
    });
    return groupEl('room-detail__lists', groups);
  }

  priceEl(section) {
    if (!section.price) return null;
    return groupEl('room-detail__price', [
      textEl('p', 'room-detail__from', this.labels.from),
      groupEl('room-detail__amount-row', [
        textEl('strong', 'room-detail__amount', this.money(section.price)),
        textEl('span', 'room-detail__per', this.labels.perNight),
      ]),
      textEl('p', 'room-detail__price-note', section.priceNote),
    ]);
  }

  // Nút đặt mặc định theo site.cta; section ghi book (label, href) thì dùng nút riêng, ví dụ gọi điện khi
  // trang đặt chỗ chưa nhận sản phẩm này.
  bookEl(section) {
    const cta = this.site?.cta;
    const href = section.book?.href ?? cta?.href;
    const label = section.book?.label ?? this.labels.book ?? cta?.label;
    if (!href || !label) return null;
    const a = document.createElement('a');
    a.className = 'btn room-detail__book';
    a.href = href;
    a.textContent = label;
    if (section.room && !section.book) {
      a.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('wl:choose-room', { detail: { id: section.room } }));
      });
    } else if (section.item && !section.book) {
      // Trang chi tiết lấy từ danh mục: phát wl:choose (core.js giữ lại nếu khối đặt chỗ ở trang khác) để chọn sẵn tour này.
      a.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('wl:choose', { detail: { id: section.item } }));
      });
    }
    return a;
  }

  // Khoảng ngày còn trống: "1 đến 15/5: còn 3 căn"; hết căn thì gạch khoảng ngày và ghi nhãn hết phòng.
  availabilityEl(ranges) {
    const items = ranges.filter((r) => r.label);
    if (!items.length) return null;
    const list = document.createElement('ul');
    list.className = 'room-detail__dates';
    list.append(...items.map((r) => {
      const li = document.createElement('li');
      const soldOut = Number(r.left) === 0;
      li.className = soldOut ? 'room-detail__date is-sold-out' : 'room-detail__date';
      li.append(...[
        textEl('span', 'room-detail__date-label', r.label),
        textEl('span', 'room-detail__date-left', soldOut ? this.labels.soldOut : fill(this.labels.left, { n: r.left })),
      ].filter(Boolean));
      return li;
    }));
    return groupEl('room-detail__availability', [textEl('p', 'room-detail__card-title', this.labels.availability), list]);
  }

  cardEl(section) {
    return groupEl('room-detail__card', [
      this.priceEl(section),
      this.bookEl(section),
      this.availabilityEl(section.availability ?? []),
    ]);
  }

  /* ---------- Dải phim ảnh ---------- */

  // Mỗi khung là một nút mở hộp xem ảnh lớn ở đúng ảnh đó; dưới ảnh là số thứ tự và chú thích (nếu có).
  filmEl(images) {
    if (images.length < 2) return null;
    const track = document.createElement('ol');
    track.className = 'room-detail__film-track';
    track.append(...images.map((image, i) => {
      const li = document.createElement('li');
      li.className = 'room-detail__frame';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'room-detail__frame-btn';
      button.setAttribute('aria-label', fill(this.labels.open, { n: i + 1 }) || image.alt || '');
      // Không lazy: dải bị dịch ngang bằng transform nên trình duyệt có thể không nạp kịp ảnh ở cuối dải.
      button.append(imgEl(image, 'room-detail__frame-img', false));
      button.addEventListener('click', () => openLightbox(images, i, this.labels.lightbox ?? {}));
      li.append(button, groupEl('room-detail__frame-caption', [
        textEl('span', 'room-detail__frame-no', pad(i + 1)),
        textEl('span', '', image.caption),
      ]));
      return li;
    }));
    const head = groupEl('room-detail__film-head container', [
      textEl('h3', 'room-detail__film-title', this.labels.gallery),
      textEl('p', 'room-detail__film-count', pad(images.length)),
    ]);
    const stage = groupEl('room-detail__film-stage', [head, groupEl('room-detail__film-window', [track])]);
    const film = document.createElement('section');
    film.className = 'room-detail__film';
    if (this.labels.gallery) film.setAttribute('aria-label', this.labels.gallery);
    film.append(stage);
    pinHorizontal(film, track);
    return film;
  }

  /* ---------- Phần dưới ---------- */

  // Dải ảnh tràn màn hình, câu tả cảnh chữ lớn nghiêng đè lên góc dưới, ảnh trôi chậm khi cuộn.
  viewEl(view) {
    if (!view?.image?.src) return null;
    const figure = document.createElement('figure');
    figure.className = 'room-detail__view';
    const img = imgEl(view.image, 'room-detail__view-img', true);
    const best = view.best && [this.labels.best, view.best].filter(Boolean).join(': ');
    const lines = [
      textEl('p', 'room-detail__view-label', this.labels.view),
      textEl('p', 'room-detail__view-text', view.text),
      textEl('p', 'room-detail__view-best', best),
    ].filter(Boolean);
    figure.append(img);
    if (lines.length) {
      const caption = document.createElement('figcaption');
      caption.className = 'room-detail__view-caption container';
      caption.append(...lines);
      figure.append(caption);
    }
    parallax(img, 0.12, 1.2);
    return figure;
  }

  // Hạng khác có ảnh thành thẻ ảnh đứng (cả thẻ là liên kết); liên kết không có ảnh thành dòng chữ dưới các thẻ.
  othersEl(others) {
    const valid = others.filter((o) => o.href && o.label);
    if (!valid.length) return null;
    const cards = valid.filter((o) => o.image?.src).map((o) => {
      const a = document.createElement('a');
      a.className = 'room-detail__other';
      a.href = o.href;
      a.append(
        groupEl('room-detail__other-media', [imgEl(o.image, 'room-detail__other-img', true)]),
        groupEl('room-detail__other-text', [textEl('span', 'room-detail__other-name', o.label), textEl('span', 'room-detail__other-note', o.note)]),
      );
      return a;
    });
    const links = valid.filter((o) => !o.image?.src).map((o) => {
      const a = document.createElement('a');
      a.className = 'room-detail__other-link';
      a.href = o.href;
      a.textContent = o.label;
      return a;
    });
    const nav = document.createElement('nav');
    nav.className = 'room-detail__others container';
    if (this.labels.others) nav.setAttribute('aria-label', this.labels.others);
    nav.append(...[
      textEl('h3', 'room-detail__subtitle', this.labels.others),
      cards.length ? groupEl('room-detail__others-grid', cards) : null,
      links.length ? groupEl('room-detail__others-links', links) : null,
    ].filter(Boolean));
    return nav;
  }

  // Ghép dữ liệu từ catalog (nếu section ghi item) với dữ liệu riêng của section; của section được ưu tiên.
  withItem(section) {
    const item = catalogItem(this.site, section.item);
    if (!item) return section;
    const today = todayIso(this.site?.place?.timezone);
    const availability = (item.availability ?? [])
      .filter((day) => day.date >= today)
      .slice(0, DAYS_SHOWN)
      .map((day) => ({ label: dayLabel(day.date), left: day.left }));
    const merged = {
      room: item.id,
      eyebrow: item.tagline,
      title: item.name,
      lead: item.text,
      images: itemImages(item),
      facts: item.facts,
      price: item.price,
      currency: this.site?.catalog?.currency,
      availability,
      includes: item.includes,
      excludes: item.excludes,
      bring: item.bring,
      others: itemOthers(this.site?.catalog, item),
    };
    return { ...merged, ...section };
  }

  render() {
    const section = this.withItem(this._data);
    this._section = section;
    this.className = section.variant ? `room-detail room-detail--${section.variant}` : 'room-detail';
    const body = groupEl('room-detail__layout container', [
      groupEl('room-detail__content', [
        textEl('p', 'room-detail__lead', section.lead),
        this.amenitiesEl(section.amenities ?? []),
        this.listsEl(section),
      ]),
      this.cardEl(section),
    ]);
    this.replaceChildren(...[
      this.coverEl(section),
      body,
      this.filmEl(section.images ?? []),
      this.viewEl(section.view),
      this.othersEl(section.others ?? []),
    ].filter(Boolean));
  }
}
