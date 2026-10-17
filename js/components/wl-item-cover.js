/* wl-item-cover.js - ảnh bìa trang chi tiết một tour hay hạng phòng: ảnh gần kín màn hình, nhãn nhỏ, tên chữ rất lớn,
   đáy ảnh là dải thông số mảnh (thời lượng, giờ chạy, số khách...); ảnh phóng chậm khi vào trang và trôi chậm khi cuộn.
   Section ghi "item" thì lấy tên, câu ngắn, ảnh, thông số từ catalog (item-detail.js). Tách từ room-detail. */
import { textEl, groupEl } from '../core/dom.js';
import { iconEl } from '../core/icon.js';
import { parallax } from '../effects/parallax.js';
import { imgEl, itemSection } from './item-detail.js';

export class WlItemCover extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  // Dải thông số ở đáy ảnh bìa: nhãn nhỏ in hoa, giá trị chữ lớn, ngăn nhau bằng vạch mảnh.
  factsEl(facts) {
    const items = facts.filter((f) => f.label && f.value);
    if (!items.length) return null;
    const dl = document.createElement('dl');
    dl.className = 'item-cover__facts container';
    dl.append(...items.map((f) => groupEl('item-cover__fact', [
      groupEl('item-cover__fact-label', [iconEl(f.icon, 'item-cover__fact-icon'), textEl('dt', '', f.label)]),
      textEl('dd', '', f.value),
    ])));
    return dl;
  }

  // Chưa có ảnh thì vẫn có phần chữ và dải thông số, chỉ không có ảnh bìa.
  coverEl(section) {
    const image = section.images?.[0];
    const cover = document.createElement('header');
    cover.className = image?.src ? 'item-cover__cover' : 'item-cover__cover item-cover__cover--plain';
    const img = imgEl(image, 'item-cover__cover-img', false);
    const text = groupEl('item-cover__cover-text container', [
      textEl('p', 'item-cover__eyebrow', section.eyebrow),
      textEl('h2', 'item-cover__title', section.title),
    ]);
    const facts = this.factsEl(section.facts ?? []);
    if (!img && !text && !facts) return null;
    cover.append(...[img, text, facts].filter(Boolean));
    parallax(img, 0.18, 1.18);
    return cover;
  }

  render() {
    const section = itemSection(this.site, this._data);
    this.className = section.variant ? `item-cover item-cover--${section.variant}` : 'item-cover';
    this.replaceChildren(...[this.coverEl(section)].filter(Boolean));
  }
}
