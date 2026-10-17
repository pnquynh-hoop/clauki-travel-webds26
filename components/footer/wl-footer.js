/* wl-footer.js - chân trang: tên thương hiệu, khẩu hiệu, nút CTA, các cột menu, liên hệ, địa chỉ, ghi chú, nguồn ảnh.
   Là khối cố định nên nhận cả content.json (el.data); kiểu trình bày đọc từ footer.variant. */
import { asset } from '../../js/core/core.js';
import { textEl, linkEl, groupEl, telHref } from '../../js/core/dom.js';
import { iconEl } from '../../js/core/icon.js';

// Bật giảm chuyển động thì CSS tắt dòng chữ chạy, JS cũng thôi chỉnh tốc độ.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Một cột: tiêu đề nhỏ (nếu dữ liệu có) rồi tới các dòng. Không có dòng nào thì bỏ cả cột.
function columnEl(title, items) {
  const rows = items.filter(Boolean);
  if (!rows.length) return null;
  return groupEl('footer__col', [textEl('p', 'footer__col-title', title), ...rows]);
}

function columnsEl(content, footer) {
  const contact = content.contact ?? {};
  const nav = (content.nav ?? []).map((item) => linkEl(item.href, item.label, 'footer__link'));
  return groupEl('footer__cols', [
    columnEl(footer.navTitle, nav),
    columnEl(footer.contactTitle, [
      linkEl(telHref(contact.phone), contact.phone, 'footer__link'),
      linkEl(contact.email && `mailto:${contact.email}`, contact.email, 'footer__link'),
    ]),
    columnEl(footer.addressTitle, [plateEl(footer.plate), textEl('p', 'footer__address', contact.address)]),
  ]);
}

// Biển số nhà (footer.plate): số lớn, bên cạnh là tên hẻm, quận; nhãn đầy đủ cho trình đọc màn hình nằm ở label.
function plateEl(plate) {
  if (!plate?.number) return null;
  const box = document.createElement('p');
  box.className = 'footer__plate';
  if (plate.label) {
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', plate.label);
  }
  const lines = document.createElement('span');
  lines.className = 'footer__plate-street';
  (plate.lines ?? []).forEach((line, i) => lines.append(...(i ? [document.createElement('br')] : []), line));
  box.append(textEl('span', 'footer__plate-no', plate.number), lines);
  return box;
}

/* ========= KIỂU HEADLINE =========
   Footer trên nền trang, không ảnh, không tấm thông tin, không nút CTA (nút đã dính ở header): lời hẹn chữ bảng hiệu
   rất lớn, dưới là các cột chữ thường. Cột tour (footer.toursTitle) liệt kê các sản phẩm có trang riêng trong danh mục,
   nên thêm tour vào catalog là footer tự có link; cột liên hệ có icon và giờ mở cửa (footer.hours);
   biển số nhà đứng riêng một cột, không tiêu đề. */

// Icon đứng trước một dòng liên hệ, để đọc nhanh đâu là số, đâu là email, đâu là giờ; chữ đã nói đủ nên icon ẩn với trình đọc.
function withIcon(el, icon) {
  el?.prepend(iconEl(icon, 'footer__icon'));
  return el;
}

function headlineColsEl(content, footer, catalog) {
  const contact = content.contact ?? {};
  const tours = footer.toursTitle ? (catalog?.items ?? []).map((item) => linkEl(item.href, item.name, 'footer__link')) : [];
  const nav = (content.nav ?? []).map((item) => linkEl(item.href, item.label, 'footer__link'));
  const plate = plateEl(footer.plate);
  return groupEl('footer__cols', [
    columnEl(footer.toursTitle, tours),
    columnEl(footer.navTitle, nav),
    columnEl(footer.contactTitle, [
      withIcon(linkEl(telHref(contact.phone), contact.phone, 'footer__link'), 'phone'),
      withIcon(linkEl(contact.email && `mailto:${contact.email}`, contact.email, 'footer__link'), 'mail'),
      withIcon(textEl('p', 'footer__hours', footer.hours), 'clock'),
    ]),
    plate ? groupEl('footer__col footer__col--plate', [plate]) : null,
  ]);
}

// Dây điện chằng chịt (footer.wires: true) vắt ngang chỗ nối trang và footer, khẽ đung đưa; chỉ để trang trí.
const WIRES = ['M0 30 C 360 120, 720 120, 1440 40', 'M0 55 C 400 140, 900 90, 1440 70', 'M0 20 C 500 90, 1000 130, 1440 25',
  'M0 75 C 300 110, 1100 140, 1440 95'];
const TANGLE = 'M700 104 c 20 -30, 60 30, 30 10 s -40 -20, -10 -30 s 40 40, 10 30';
const BIRDS = ['M380 92 q6 -6 12 0 q6 -6 12 0', 'M1010 99 q5 -5 10 0 q5 -5 10 0'];

function wiresEl(on) {
  if (on !== true) return null;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'footer__wires');
  svg.setAttribute('viewBox', '0 0 1440 140');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  const path = (d, cls) => {
    const el = document.createElementNS(ns, 'path');
    el.setAttribute('d', d);
    if (cls) el.setAttribute('class', cls);
    return el;
  };
  svg.append(...WIRES.map((d) => path(d, 'footer__wire')), path(TANGLE, 'footer__wire-tangle'), ...BIRDS.map((d) => path(d, 'footer__bird')));
  return svg;
}

// Ảnh CC BY và CC BY-SA bắt buộc ghi tên tác giả, giấy phép và nguồn trên trang, nên mỗi ảnh một dòng.
// Đặt trong <details> đóng sẵn: footer gọn, ai cần thì bấm "Nguồn ảnh" để mở danh sách.
function creditsEl(title, credits = []) {
  if (!credits.length) return null;
  const list = document.createElement('ul');
  list.className = 'footer__credits';
  for (const credit of credits) {
    const item = document.createElement('li');
    const author = linkEl(credit.source, credit.author, 'footer__credit-link') ?? document.createTextNode(credit.author ?? '');
    const rest = [credit.license, credit.note].filter(Boolean).join(', ');
    item.append(author, document.createTextNode(rest ? `, ${rest}` : ''));
    list.append(item);
  }
  // Không có tiêu đề thì không gập được (thẻ summary cần chữ), nên hiện thẳng danh sách.
  if (!title) return groupEl('footer__credits-wrap', [list]);
  const details = document.createElement('details');
  details.className = 'footer__credits-wrap';
  details.append(textEl('summary', 'footer__credits-title', title), list);
  return details;
}

/* ========= ẢNH KHÉP TRANG, LỜI HẸN, DÒNG CHỮ CHẠY =========
   Chạy theo dữ liệu như phần đường tới chỗ ở: thương hiệu nào ghi footer.image hoặc footer.title thì footer
   có ảnh làm nền, lời hẹn chữ lớn trên ảnh, phần thông tin nằm trên một tấm đè lên ảnh. */

function photoEl(image) {
  if (!image?.src) return null;
  const img = document.createElement('img');
  img.className = 'footer__photo';
  img.src = asset(image.src);
  img.alt = image.alt ?? '';
  img.loading = 'lazy';
  return img;
}

// Lớp mây trôi ngang qua ảnh (footer.clouds: true): hai dải mây, nằm trên ảnh nhưng dưới lời hẹn và tấm thông tin.
function cloudsEl(on) {
  if (on !== true) return null;
  const box = document.createElement('div');
  box.className = 'footer__clouds';
  box.setAttribute('aria-hidden', 'true');
  for (const layer of ['back', 'front']) {
    const band = document.createElement('div');
    band.className = `footer__cloud footer__cloud--${layer}`;
    box.append(band);
  }
  return box;
}

// Lời hẹn: phần đầu (title) chữ đứng, phần sau (titleAccent) xuống dòng và in nghiêng. Có phần nào hiện phần đó.
function headingEl(title, accent) {
  if (!title && !accent) return null;
  const heading = document.createElement('h2');
  heading.className = 'footer__heading';
  if (title) heading.append(title);
  if (accent) heading.append(textEl('em', 'footer__heading-accent', accent));
  return heading;
}

// Dòng chữ chạy (footer.marquee, ví dụ tên các chặng): hai lượt giống hệt nhau nối đuôi, chạy hết một lượt
// (dịch nửa dòng) thì quay về đầu mà không thấy chỗ nối. Chỉ để trang trí nên trình đọc màn hình bỏ qua.
function tickerEl(items = []) {
  const words = items.filter((item) => typeof item === 'string' && item.trim());
  if (!words.length) return null;
  const track = document.createElement('div');
  track.className = 'footer__ticker-track';
  for (let copy = 0; copy < 2; copy += 1) {
    track.append(...words.map((word) => textEl('span', 'footer__ticker-item', word)));
  }
  const ticker = groupEl('footer__ticker', [track]);
  ticker.setAttribute('aria-hidden', 'true');
  return ticker;
}

export class WlFooter extends HTMLElement {
  // Khi cuộn: ảnh nền trôi chậm hơn trang, dòng chữ chạy nhanh lên một chút rồi chậm dần, cuộn ngược thì chạy ngược.
  // Listener gắn vào window nên phải gỡ khi khối bị gỡ.
  connectedCallback() {
    this._onScroll = () => {
      this.movePhoto();
      this.nudgeTicker();
    };
    window.addEventListener('scroll', this._onScroll, { passive: true });
  }

  disconnectedCallback() {
    window.removeEventListener('scroll', this._onScroll);
    cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  set data(content) {
    this._data = content;
    this.render();
  }

  // Ảnh nền lệch ngược chiều cuộn 12% quãng đường so với giữa màn hình, nên trôi chậm hơn trang như cảnh ở xa.
  // Chỉ tính khi footer đang trong màn hình.
  movePhoto() {
    const photo = this._photo;
    if (!photo || reduceMotion.matches) return;
    const box = photo.parentElement.getBoundingClientRect();
    if (box.bottom < 0 || box.top > window.innerHeight) return;
    const shift = (box.top + box.height / 2 - window.innerHeight / 2) * -0.12;
    photo.style.transform = `translateY(${shift.toFixed(1)}px)`;
  }

  // Mỗi lần cuộn: lấy hướng cuộn làm chiều chạy, cuộn càng mạnh thì đà càng lớn (tối đa gấp 4 nhịp thường).
  nudgeTicker() {
    const y = window.scrollY;
    const dy = y - (this._lastY ?? y);
    this._lastY = y;
    const anim = this._ticker?.getAnimations()[0];
    if (!anim || !dy || reduceMotion.matches) return;
    this._anim = anim;
    this._dir = Math.sign(dy);
    this._boost = Math.max(this._boost ?? 0, Math.min(3, Math.abs(dy) / 30));
    if (!this._raf) this._raf = requestAnimationFrame(() => this.easeTicker());
  }

  // Mỗi khung hình đà giảm một chút cho tới khi gần như hết thì dừng vòng lặp.
  easeTicker() {
    this._boost *= 0.95;
    this._anim.playbackRate = this._dir * (1 + this._boost);
    this._raf = this._boost > 0.02 ? requestAnimationFrame(() => this.easeTicker()) : 0;
  }

  render() {
    const content = this._data;
    const footer = content.footer ?? {};
    this.className = `footer footer--${footer.variant ?? 'columns'}`;

    const fine = groupEl('footer__fine', [
      textEl('p', 'footer__note', footer.note),
      creditsEl(footer.creditsTitle, content.credits),
    ]);

    // Kiểu headline khác hẳn cấu trúc (không ảnh, không tấm thông tin, không nút CTA) nên dựng riêng.
    if (footer.variant === 'headline') {
      const main = groupEl('footer__main container', [
        headingEl(footer.title, footer.titleAccent),
        headlineColsEl(content, footer, this.site?.catalog),
        fine,
      ]);
      this.replaceChildren(...[wiresEl(footer.wires), tickerEl(footer.marquee), main].filter(Boolean));
      this._ticker = this.querySelector('.footer__ticker-track');
      this._photo = null;
      return;
    }

    const brand = groupEl('footer__brand', [
      textEl('p', 'footer__name', content.brand?.name),
      textEl('p', 'footer__slogan', content.brand?.slogan),
    ]);
    // Khách đọc tới cuối trang là lúc dễ quyết định nhất, nên footer cũng có nút CTA chung của trang.
    const action = groupEl('footer__action', [
      linkEl(this.site?.cta?.href, this.site?.cta?.label, 'btn footer__cta'),
      textEl('p', 'footer__cta-note', this.site?.cta?.note),
    ]);
    const parts = [
      groupEl('footer__top', [brand, action]),
      columnsEl(content, footer),
      fine,
    ];

    // Không có ảnh và lời hẹn: footer dạng thường, dòng chữ chạy (nếu có) nằm trên cùng.
    const photo = photoEl(footer.image);
    const heading = headingEl(footer.title, footer.titleAccent);
    if (!photo && !heading) {
      this.replaceChildren(...[wiresEl(footer.wires), tickerEl(footer.marquee), groupEl('footer__main container', parts)].filter(Boolean));
    } else {
      const inner = groupEl('footer__inner container', [heading, tickerEl(footer.marquee), groupEl('footer__main footer__panel', parts)]);
      // Có lời hẹn mà không có ảnh thì thêm lớp --plain để CSS đổi sang nền trang, chữ màu mực.
      const sceneClass = photo ? 'footer__scene' : 'footer__scene footer__scene--plain';
      this.replaceChildren(...[wiresEl(footer.wires), groupEl(sceneClass, [photo, cloudsEl(footer.clouds), inner])].filter(Boolean));
    }
    this._ticker = this.querySelector('.footer__ticker-track');
    this._photo = this.querySelector('.footer__photo');
    this.movePhoto();
  }
}
