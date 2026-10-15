/* wl-catalog-list.js - lưới thẻ các mục trong danh mục sản phẩm (tour, hạng phòng) của thương hiệu.
   Tour khai một lần ở catalog (AGENTS.md mục 5), khối này chỉ đọc lại qua this.site.catalog, nên giá hay ảnh
   sửa một chỗ là mọi trang cùng đổi. Section chỉ ghi tiêu đề, mẫu chữ trên thẻ (labels) và tuỳ chọn pick
   (danh sách id) khi chỉ muốn hiện vài mục, ví dụ ba tour gợi ý ở trang 404. */
import { catalogItem } from '../core.js';
import { textEl, linkEl, groupEl } from '../dom.js';
// Thẻ tour và vài hàm nhỏ dùng chung với khối gợi ý tour (tour-pick).
import { cardEl, vehiclesOf, isComplete } from './catalog-card.js';

// Ba nhóm lọc. key là tên trên địa chỉ (#di=thuyen&buoi=toi), label là khoá chữ trong section.filters,
// names lấy tên hiện ra từ danh mục, match cho biết một tour có hợp lựa chọn không.
const GROUPS = [
  {
    key: 'di', label: 'vehicle',
    names: (catalog) => Object.fromEntries(Object.entries(catalog.vehicles ?? {}).map(([id, v]) => [id, v.label])),
    match: (item, value) => vehiclesOf(item).includes(value),
  },
  { key: 'buoi', label: 'buoi', names: (catalog) => catalog.buoi ?? {}, match: (item, value) => item.tags?.buoi === value },
  { key: 'thich', label: 'topic', names: (catalog) => catalog.topics ?? {}, match: (item, value) => (item.tags?.topics ?? []).includes(value) },
];

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export class WlCatalogList extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  // pick giữ đúng thứ tự người viết dữ liệu chọn; không có pick thì hiện cả danh mục.
  items() {
    const all = this.site?.catalog?.items ?? [];
    const picked = this._data.pick ? this._data.pick.map((id) => catalogItem(this.site, id)) : all;
    return picked.filter(isComplete);
  }

  // Con số nằm trong thẻ riêng để CSS tô nổi như nhãn dán; phần chữ trước và sau {n} giữ nguyên.
  countEl(n) {
    const template = this._data.labels?.count;
    if (!template?.includes('{n}')) return null;
    const [before, after] = template.split('{n}');
    const p = document.createElement('p');
    p.className = 'catalog-list__count';
    p.setAttribute('aria-live', 'polite');
    // Giữ lại thẻ con số: lọc thì chỉ đổi số trong thẻ này, trình đọc màn hình đọc lại dòng đếm mới.
    this._countN = textEl('span', 'catalog-list__count-n', String(n));
    p.append(before, this._countN, after);
    return p;
  }

  cardEl(item) {
    return cardEl(item, { site: this.site, labels: this._data.labels, fewSeats: this._data.fewSeats, transition: Boolean(this._data.filters) });
  }

  // Chỉ hiện lựa chọn có ít nhất một tour, để không có phím bấm vào là trống ngay.
  options(group) {
    return Object.entries(group.names(this.site?.catalog ?? {})).filter(([id]) => this._items.some((item) => group.match(item, id)));
  }

  // Lọc đọc từ địa chỉ: trang chủ dẫn vào sẵn bằng /tour#di=thuyen, khách chép link đã lọc gửi bạn được.
  // Giá trị lạ trên địa chỉ thì bỏ qua.
  readHash() {
    const params = new URLSearchParams(location.hash.slice(1));
    this._filter = Object.fromEntries(GROUPS.map((group) => {
      const value = params.get(group.key) ?? '';
      return [group.key, this.options(group).some(([id]) => id === value) ? value : ''];
    }));
  }

  // replaceState: đổi địa chỉ mà không thêm bước vào lịch sử, bấm Back vẫn về trang trước chứ không lùi từng lần lọc.
  writeHash() {
    const params = new URLSearchParams(Object.entries(this._filter).filter(([, value]) => value));
    const hash = params.toString();
    history.replaceState(history.state, '', `${location.pathname}${location.search}${hash ? `#${hash}` : ''}`);
  }

  matches(item) {
    return GROUPS.every((group) => !this._filter[group.key] || group.match(item, this._filter[group.key]));
  }

  // Một hàng phím cho mỗi nhóm có chữ trong section.filters; bấm phím đang chọn thì bỏ chọn.
  rowEl(group) {
    const label = this._data.filters[group.label];
    const options = this.options(group);
    if (!label || options.length < 2) return null;
    const keys = options.map(([id, name]) => {
      const key = textEl('button', 'catalog-list__key', name);
      key.type = 'button';
      key.dataset.group = group.key;
      key.dataset.value = id;
      const color = group.key === 'di' ? this.site.catalog.vehicles[id]?.color : null;
      if (color) key.style.setProperty('--kc', color);
      key.addEventListener('click', () => {
        this._filter[group.key] = this._filter[group.key] === id ? '' : id;
        this.update();
      });
      return key;
    });
    const row = groupEl('catalog-list__row', [textEl('p', 'catalog-list__row-label', label), groupEl('catalog-list__keys', keys)]);
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', label);
    return row;
  }

  filtersEl() {
    const filters = this._data.filters;
    if (!filters || this._items.length < 2) return null;
    const rows = GROUPS.map((group) => this.rowEl(group));
    const reset = textEl('button', 'catalog-list__reset', filters.reset);
    if (reset) {
      reset.type = 'button';
      reset.addEventListener('click', () => {
        GROUPS.forEach((group) => { this._filter[group.key] = ''; });
        this.update();
      });
    }
    const panel = groupEl('catalog-list__filters', [...rows, reset]);
    if (panel && filters.label) panel.setAttribute('aria-label', filters.label);
    return panel;
  }

  // Không còn tour nào hợp lựa chọn thì gợi ý một lối khác (ví dụ tự ghép tour riêng), không để trang trống.
  emptyEl() {
    const empty = this._data.empty;
    return groupEl('catalog-list__empty', [
      textEl('p', 'catalog-list__empty-text', empty?.text),
      linkEl(empty?.link?.href, empty?.link?.label, 'btn'),
    ]);
  }

  // Dựng lại riêng lưới kết quả, số đếm và trạng thái phím; phần đầu và bộ lọc giữ nguyên nên phím không mất focus.
  showResults() {
    const found = this._items.filter((item) => this.matches(item));
    if (this._countN) this._countN.textContent = String(found.length);
    this._grid.replaceChildren(...(found.length ? found.map((item) => this.cardEl(item)) : [this.emptyEl()].filter(Boolean)));
    this.querySelectorAll('.catalog-list__key').forEach((key) => {
      key.setAttribute('aria-pressed', String(this._filter[key.dataset.group] === key.dataset.value));
    });
  }

  update() {
    this.writeHash();
    if (!document.startViewTransition || reducedMotion()) {
      this.showResults();
      return;
    }
    document.startViewTransition(() => this.showResults());
  }

  render() {
    const section = this._data;
    this.className = section.variant ? `catalog-list catalog-list--${section.variant}` : 'catalog-list';
    this._items = this.items();
    this.readHash();
    const head = groupEl('catalog-list__head', [
      textEl('p', 'catalog-list__eyebrow', section.eyebrow),
      textEl('h2', 'catalog-list__title', section.title),
      textEl('p', 'catalog-list__lead', section.lead),
      this.countEl(this._items.length),
    ]);
    this._grid = document.createElement('div');
    this._grid.className = 'catalog-list__grid';
    this.replaceChildren(...[groupEl('catalog-list__inner container', [head, this.filtersEl(), this._grid])].filter(Boolean));
    this.showResults();
  }
}
