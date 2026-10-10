/* wl-footer.js - chân trang: tên thương hiệu, khẩu hiệu, nút CTA, các cột menu, liên hệ, địa chỉ, ghi chú, nguồn ảnh.
   Là khối cố định nên nhận cả content.json (el.data); kiểu trình bày đọc từ footer.variant. */
import { textEl, linkEl, groupEl, telHref } from '../dom.js';

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

export class WlFooter extends HTMLElement {
  set data(content) {
    this._data = content;
    this.render();
  }

  render() {
    const content = this._data;
    const footer = content.footer ?? {};
    this.className = `footer footer--${footer.variant ?? 'card'}`;

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
    const main = groupEl('footer__main container', [
      groupEl('footer__top', [brand, action]),
      directionsEl(footer.directionsTitle, footer.directions),
      columnsEl(content, footer),
      fine,
    ]);

    this.replaceChildren(...[main].filter(Boolean));
  }
}
