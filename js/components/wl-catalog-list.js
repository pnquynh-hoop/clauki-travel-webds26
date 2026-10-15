/* wl-catalog-list.js - lưới thẻ các mục trong danh mục sản phẩm (tour, hạng phòng) của thương hiệu.
   Tour khai một lần ở catalog (AGENTS.md mục 5), khối này chỉ đọc lại qua this.site.catalog, nên giá hay ảnh
   sửa một chỗ là mọi trang cùng đổi. Section chỉ ghi tiêu đề, mẫu chữ trên thẻ (labels) và tuỳ chọn pick
   (danh sách id) khi chỉ muốn hiện vài mục, ví dụ ba tour gợi ý ở trang 404. */
import { asset, catalogItem } from '../core.js';
import { textEl, groupEl } from '../dom.js';

// Thay {tên} trong mẫu chữ bằng giá trị. Mẫu thiếu thì trả về null để bỏ phần đó, không hiện chữ giữ chỗ.
function fill(template, values) {
  if (!template) return null;
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
}

// Ngày hôm nay theo múi giờ của nơi chốn (dạng 2026-10-20, giống availability), không theo giờ máy của khách.
function today(timezone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
}

// Chuyến gần nhất từ hôm nay còn chỗ. Ngày đã qua hay đã hết chỗ thì bỏ qua.
function nextDeparture(item, from) {
  return (item.availability ?? []).find((day) => day.date >= from && day.left > 0);
}

// Một tour đi qua nhiều chặng, nhiều chặng cùng một phương tiện: chỉ lấy mỗi phương tiện một lần, giữ thứ tự đi.
function vehiclesOf(item) {
  return [...new Set((item.stages ?? []).map((stage) => stage.vehicle).filter(Boolean))];
}

// Mục thiếu id, tên hoặc giá thì bỏ, vì thẻ không có gì để khách so sánh.
function isComplete(item) {
  return Boolean(item?.id && item.name && Number.isFinite(item.price));
}

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
    p.append(before, textEl('span', 'catalog-list__count-n', String(n)), after);
    return p;
  }

  chipEl(id) {
    const vehicle = this.site.catalog.vehicles?.[id];
    const chip = textEl('span', 'catalog-list__chip', vehicle?.label);
    if (chip && vehicle.color) chip.style.setProperty('--vc', vehicle.color);
    return chip;
  }

  mediaEl(item) {
    if (!item.image?.src) return null;
    const img = document.createElement('img');
    img.src = asset(item.image.src);
    img.alt = item.image.alt ?? '';
    img.loading = 'lazy';
    img.decoding = 'async';
    return groupEl('catalog-list__media', [img]);
  }

  priceEl(item) {
    const catalog = this.site.catalog;
    const price = `${item.price.toLocaleString('vi-VN')} ${catalog.currency ?? ''}`.trim();
    const note = fill(this._data.labels?.priceNote, {
      unit: item.unit,
      buoi: catalog.buoi?.[item.tags?.buoi]?.toLowerCase(),
    });
    const el = textEl('p', 'catalog-list__price', price);
    if (note) el.append(' ', textEl('small', '', note));
    return el;
  }

  // Chỉ báo khi chuyến gần nhất còn ít chỗ (mặc định từ 3 chỗ trở xuống), để nhãn này có ý nghĩa thúc khách đặt sớm.
  seatsEl(item) {
    const trip = nextDeparture(item, today(this.site.place?.timezone));
    if (!trip || trip.left > (this._data.fewSeats ?? 3)) return null;
    const [, month, day] = trip.date.split('-');
    return textEl('p', 'catalog-list__few', fill(this._data.labels?.seatsLeft, { date: `${day}/${month}`, n: trip.left }));
  }

  // Mục có trang chi tiết thì cả thẻ là liên kết; mục chưa có trang thì là thẻ thường, không dẫn vào trang trống.
  cardEl(item) {
    const card = document.createElement(item.href ? 'a' : 'article');
    card.className = 'catalog-list__card';
    if (item.href) card.href = item.href;
    const time = item.start && item.end ? `${item.start} - ${item.end}` : null;
    const chips = vehiclesOf(item).map((id) => this.chipEl(id));
    card.append(...[
      this.mediaEl(item),
      textEl('span', 'catalog-list__time', time),
      groupEl('catalog-list__body', [
        textEl('h3', 'catalog-list__name', item.name),
        textEl('p', 'catalog-list__tagline', item.tagline),
        groupEl('catalog-list__chips', chips),
        groupEl('catalog-list__foot', [this.priceEl(item), this.seatsEl(item)]),
      ]),
    ].filter(Boolean));
    return card;
  }

  render() {
    const section = this._data;
    this.className = section.variant ? `catalog-list catalog-list--${section.variant}` : 'catalog-list';
    const items = this.items();
    const head = groupEl('catalog-list__head', [
      textEl('p', 'catalog-list__eyebrow', section.eyebrow),
      textEl('h2', 'catalog-list__title', section.title),
      textEl('p', 'catalog-list__lead', section.lead),
      this.countEl(items.length),
    ]);
    const grid = groupEl('catalog-list__grid', items.map((item) => this.cardEl(item)));
    this.replaceChildren(...[groupEl('catalog-list__inner container', [head, grid])].filter(Boolean));
  }
}
