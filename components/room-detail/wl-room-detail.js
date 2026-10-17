/* wl-room-detail.js - trang chi tiết một hạng phòng hoặc một tour dựng sẵn trong một khối, dàn như trang tạp chí.
   Khối này chỉ ghép các khối riêng theo thứ tự: item-cover (ảnh bìa), item-booking (cột trái và thẻ đặt),
   photo-strip (dải ảnh), included (tờ hoá đơn, chỉ ở kiểu ticket), scene (cảnh đáng chờ), rồi tự dựng phần cuối là thẻ
   ảnh các mục khác cùng buổi. Mỗi khối con nhận cùng dữ liệu của section và tự lấy phần mình cần.
   Trang muốn sắp xếp, ẩn, đổi kiểu từng phần thì dùng thẳng các khối riêng đó trong sections (như trang tour SighGone);
   khối này giữ cho các trang đã viết theo kiểu một khối (Bậc Trà) chạy như cũ.
   Section ghi "item" thì lấy tour hoặc hạng phòng trong catalog; trường nào section ghi riêng thì dùng của section. */
import { catalogItem } from '../../js/core/core.js';
import { textEl, groupEl } from '../../js/core/dom.js';
import { imgEl, childEl, lazyChildEl } from '../shared/item-detail.js';
import { WlItemCover } from '../item-cover/wl-item-cover.js';
import { WlItemBooking } from '../item-booking/wl-item-booking.js';
import { WlPhotoStrip } from '../photo-strip/wl-photo-strip.js';
import { WlScene } from '../scene/wl-scene.js';

const OTHERS_SHOWN = 3;

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

  render() {
    const section = this._data;
    this.className = section.variant ? `room-detail room-detail--${section.variant}` : 'room-detail';
    const item = catalogItem(this.site, section.item);
    const others = section.others ?? (item ? itemOthers(this.site?.catalog, item) : []);
    const ticket = section.variant === 'ticket';
    this.replaceChildren(...[
      childEl('wl-item-cover', WlItemCover, this.site, section),
      childEl('wl-item-booking', WlItemBooking, this.site, section),
      childEl('wl-photo-strip', WlPhotoStrip, this.site, section),
      // Kiểu ticket: đã gồm, chưa gồm thành tờ hoá đơn, mượn khối included (tải khi cần).
      ticket ? lazyChildEl('room-detail__included', 'wl-included', () => import('../included/wl-included.js').then((m) => m.WlIncluded),
        this.site, { type: 'included', variant: 'receipt', item: section.item, title: this.labels.receipt, labels: this.labels }) : null,
      section.view ? childEl('wl-scene', WlScene, this.site, section) : null,
      this.othersEl(others),
    ].filter(Boolean));
  }
}
