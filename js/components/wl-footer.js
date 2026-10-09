/* wl-footer.js - chân trang: tên thương hiệu, khẩu hiệu, liên hệ, menu, nút CTA, ghi chú thương hiệu giả tưởng, nguồn ảnh.
   Là khối cố định nên nhận cả content.json (el.data); kiểu trình bày đọc từ footer.variant. */
import { textEl, linkEl, groupEl, telHref } from '../dom.js';

function contactEl(contact = {}) {
  return groupEl('footer__contact', [
    linkEl(telHref(contact.phone), contact.phone, 'footer__link'),
    linkEl(contact.email && `mailto:${contact.email}`, contact.email, 'footer__link'),
    textEl('p', 'footer__address', contact.address),
  ]);
}

function navEl(nav = []) {
  const links = nav.map((item) => linkEl(item.href, item.label, 'footer__link'));
  return groupEl('footer__nav', links);
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
    this.className = `footer footer--${footer.variant ?? 'compact'}`;

    const brand = groupEl('footer__brand', [
      textEl('p', 'footer__name', content.brand?.name),
      textEl('p', 'footer__slogan', content.brand?.slogan),
    ]);
    // Khách đọc tới cuối trang là lúc dễ quyết định nhất, nên footer cũng có nút CTA chung của trang.
    const cta = linkEl(this.site?.cta?.href, this.site?.cta?.label, 'btn footer__cta');
    const main = groupEl('footer__main container', [brand, contactEl(content.contact), navEl(content.nav), cta]);
    const fine = groupEl('footer__fine container', [
      textEl('p', 'footer__note', footer.note),
      creditsEl(footer.creditsTitle, content.credits),
    ]);

    this.replaceChildren(...[main, fine].filter(Boolean));
  }
}
