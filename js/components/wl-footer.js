/* wl-footer.js - chân trang: tên thương hiệu, khẩu hiệu, nút CTA, các cột menu, liên hệ, địa chỉ, ghi chú, nguồn ảnh.
   Là khối cố định nên nhận cả content.json (el.data); kiểu trình bày đọc từ footer.variant. */
import { asset } from '../core.js';
import { textEl, linkEl, groupEl, telHref } from '../dom.js';

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
    columnEl(footer.addressTitle, [textEl('p', 'footer__address', contact.address)]),
  ]);
}

// Đường tới chỗ ở: mỗi chặng một nơi (place) và cách đi tới đó (how), theo đúng thứ tự trong dữ liệu.
// Chạy theo dữ liệu, không theo kiểu trình bày: thương hiệu nào ghi footer.directions thì có phần này.
function directionsEl(title, directions = []) {
  const stops = directions.filter((stop) => stop.place);
  if (!stops.length) return null;
  const list = document.createElement('ol');
  list.className = 'footer__route';
  for (const stop of stops) {
    const item = document.createElement('li');
    item.className = 'footer__stop';
    item.append(...[textEl('p', 'footer__stop-place', stop.place), textEl('p', 'footer__stop-how', stop.how)].filter(Boolean));
    list.append(item);
  }
  return groupEl('footer__directions', [textEl('p', 'footer__directions-title', title), list]);
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

    const brand = groupEl('footer__brand', [
      textEl('p', 'footer__name', content.brand?.name),
      textEl('p', 'footer__slogan', content.brand?.slogan),
    ]);
    // Khách đọc tới cuối trang là lúc dễ quyết định nhất, nên footer cũng có nút CTA chung của trang.
    const action = groupEl('footer__action', [
      linkEl(this.site?.cta?.href, this.site?.cta?.label, 'btn footer__cta'),
      textEl('p', 'footer__cta-note', this.site?.cta?.note),
    ]);
    const fine = groupEl('footer__fine', [
      textEl('p', 'footer__note', footer.note),
      creditsEl(footer.creditsTitle, content.credits),
    ]);
    const parts = [
      groupEl('footer__top', [brand, action]),
      directionsEl(footer.directionsTitle, footer.directions),
      columnsEl(content, footer),
      fine,
    ];

    // Không có ảnh và lời hẹn: footer dạng thường, dòng chữ chạy (nếu có) nằm trên cùng.
    const photo = photoEl(footer.image);
    const heading = headingEl(footer.title, footer.titleAccent);
    if (!photo && !heading) {
      this.replaceChildren(...[tickerEl(footer.marquee), groupEl('footer__main container', parts)].filter(Boolean));
    } else {
      const inner = groupEl('footer__inner container', [heading, tickerEl(footer.marquee), groupEl('footer__main footer__panel', parts)]);
      // Có lời hẹn mà không có ảnh thì thêm lớp --plain để CSS đổi sang nền trang, chữ màu mực.
      const sceneClass = photo ? 'footer__scene' : 'footer__scene footer__scene--plain';
      this.replaceChildren(groupEl(sceneClass, [photo, cloudsEl(footer.clouds), inner]));
    }
    this._ticker = this.querySelector('.footer__ticker-track');
    this._photo = this.querySelector('.footer__photo');
    this.movePhoto();
  }
}
