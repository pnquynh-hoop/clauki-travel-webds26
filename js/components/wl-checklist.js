/* wl-checklist.js - khối danh sách ngắn theo nhóm, dùng cho "đã gồm, chưa gồm, nên mang": mỗi nhóm một thẻ,
   thẻ có dải tiêu đề đổi màu theo thứ tự (nhấn chính, cảnh báo, nhấn phụ). Có thể ghi sẵn `groups` trong section,
   hoặc ghi `item` (id trong danh mục) để lấy includes, excludes, bring của sản phẩm đó, khỏi chép lặp.
   Ảnh tách nền (`pictures`) đè lên mép khối cho vui mắt; không có chữ nên ẩn với trình đọc màn hình. */
import { asset, catalogItem } from '../core.js';
import { textEl } from '../dom.js';

// Nhóm lấy từ danh mục: nhãn tiêu đề nằm trong labels của section, thiếu nhãn nào thì bỏ nhóm đó.
function groupsFromCatalog(section, site) {
  const item = section.item ? catalogItem(site, section.item) : null;
  const labels = section.labels ?? {};
  return [['includes', 'includes'], ['excludes', 'excludes'], ['bring', 'bring']]
    .map(([key, labelKey]) => ({ title: labels[labelKey], items: item?.[key] }));
}

export class WlChecklist extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  groupEl(group, index) {
    const items = (group.items ?? []).filter(Boolean);
    if (!group.title || !items.length) return null;
    const card = document.createElement('div');
    card.className = `checklist__group checklist__group--${index % 3}`;
    const list = document.createElement('ul');
    list.className = 'checklist__list';
    items.forEach((text) => list.append(textEl('li', 'checklist__item', text)));
    card.append(textEl('h3', 'checklist__group-title', group.title), list);
    return card;
  }

  pictureEl(picture) {
    if (!picture?.image?.src) return null;
    const img = document.createElement('img');
    img.className = `checklist__pic checklist__pic--${picture.place ?? 'right'}`;
    img.src = asset(picture.image.src);
    img.alt = picture.image.alt ?? '';
    img.loading = 'lazy';
    if (!img.alt) img.setAttribute('aria-hidden', 'true');
    return img;
  }

  render() {
    const section = this._data;
    this.className = section.variant ? `checklist checklist--${section.variant}` : 'checklist';

    const groups = (section.groups ?? groupsFromCatalog(section, this.site)).map((g, i) => this.groupEl(g, i)).filter(Boolean);
    const head = [
      textEl('p', 'checklist__eyebrow', section.eyebrow),
      textEl('h2', 'checklist__title', section.title),
      textEl('p', 'checklist__lead', section.lead),
    ].filter(Boolean);

    const inner = document.createElement('div');
    inner.className = 'checklist__inner container';
    inner.append(...head);
    if (groups.length) {
      const grid = document.createElement('div');
      grid.className = 'checklist__grid';
      grid.append(...groups);
      inner.append(grid);
    }
    const pictures = (section.pictures ?? []).map((p) => this.pictureEl(p)).filter(Boolean);
    this.replaceChildren(inner, ...pictures);
  }
}
