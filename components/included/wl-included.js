/* wl-included.js - khối "gồm gì": đã gồm, chưa gồm, nên mang của một tour hay hạng phòng.
   Section ghi "item" thì đọc ba danh sách, tên, giá, câu giới thiệu từ catalog (AGENTS.md mục 5); thương hiệu không có
   catalog thì ghi includes, excludes, bring ngay trong section. Trường section ghi riêng được ưu tiên.
   Kiểu mặc định: ba nhóm danh sách có icon cạnh nhau. Kiểu receipt: tờ hoá đơn in nhiệt (tổng một khách, lời cảm ơn),
   câu giới thiệu chữ lớn đứng bên cạnh. Tách khỏi room-detail để landing, trang đặt chỗ, trang tour dùng lại được. */
import { catalogItem } from '../../js/core/core.js';
import { textEl, groupEl } from '../../js/core/dom.js';
import { iconEl } from '../../js/core/icon.js';
// Ngày, tiền định dạng theo ngôn ngữ đang hiện (core.js đặt <html lang>).
import { pageLocale } from '../../js/core/i18n.js';

// Ba nhóm theo thứ tự hiện, kèm icon của kiểu mặc định (tên icon Lucide).
const GROUPS = [['includes', 'check'], ['excludes', 'x'], ['bring', 'backpack']];

export class WlIncluded extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  get labels() {
    return this._data.labels ?? {};
  }

  // Ghép dữ liệu từ catalog với dữ liệu riêng của section; của section được ưu tiên.
  withItem(section) {
    const item = section.item ? catalogItem(this.site, section.item) : null;
    if (!item) return section;
    return {
      name: item.name,
      lead: item.text,
      price: item.price,
      includes: item.includes,
      excludes: item.excludes,
      bring: item.bring,
      ...section,
    };
  }

  money(amount) {
    return `${amount.toLocaleString(pageLocale())} ${this.site?.catalog?.currency ?? ''}`.trim();
  }

  // Kiểu receipt dùng dấu in (+, -, *) do CSS vẽ nên không cần icon.
  listsEl(section, withIcons) {
    const groups = GROUPS.map(([key, icon]) => {
      const items = (section[key] ?? []).filter(Boolean);
      if (!items.length) return null;
      const list = document.createElement('ul');
      list.className = `included__list included__list--${key}`;
      list.append(...items.map((text) => {
        const li = document.createElement('li');
        li.append(...[withIcons ? iconEl(icon, 'included__icon') : null, textEl('span', '', text)].filter(Boolean));
        return li;
      }));
      return groupEl('included__group', [textEl('h3', 'included__subtitle', this.labels[key]), list]);
    });
    return groupEl('included__lists', groups);
  }

  // Tờ hoá đơn: tiêu đề, tên tour, ba danh sách, dòng tổng một khách, lời cảm ơn.
  billEl(section) {
    const lists = this.listsEl(section, false);
    if (!lists) return null;
    const total = Number.isFinite(section.price) && this.labels.total
      ? groupEl('included__total', [textEl('span', '', this.labels.total), textEl('span', '', this.money(section.price))])
      : null;
    return groupEl('included__bill', [
      textEl('h2', 'included__bill-title', section.title),
      textEl('p', 'included__bill-sub', section.name),
      lists,
      total,
      textEl('p', 'included__thanks', this.labels.thanks),
    ]);
  }

  render() {
    const section = this.withItem(this._data);
    this.className = section.variant ? `included included--${section.variant}` : 'included';
    if (section.variant === 'receipt') {
      this.replaceChildren(...[groupEl('included__inner container', [
        this.billEl(section),
        textEl('p', 'included__lead', section.lead),
      ])].filter(Boolean));
      return;
    }
    const head = groupEl('included__head', [
      textEl('p', 'included__eyebrow', section.eyebrow),
      textEl('h2', 'included__title', section.title),
      textEl('p', 'included__lead', section.lead),
    ]);
    this.replaceChildren(...[groupEl('included__inner container', [head, this.listsEl(section, true)])].filter(Boolean));
  }
}
