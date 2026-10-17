/* wl-tips.js - các thẻ mẹo ngắn (mặc gì, tháng nào mưa, tránh giờ nào): tiêu đề, một đoạn chữ, tuỳ chọn một biểu đồ
   cột nhỏ (chart) và một liên kết sang tour hay trang khác. Biểu đồ chỉ để nhìn nhanh; con số đầy đủ nằm trong
   chart.label để trình đọc màn hình đọc thay cho các cột. */
import { textEl, linkEl, groupEl } from '../../js/core/dom.js';

function chartEl(chart) {
  const values = (chart?.values ?? []).filter((v) => Number.isFinite(v));
  if (!values.length) return null;
  const max = chart.max ?? Math.max(...values);
  const box = document.createElement('div');
  box.className = 'tips__chart';
  box.setAttribute('role', 'img');
  if (chart.label) box.setAttribute('aria-label', chart.label);
  values.forEach((value, i) => {
    const bar = document.createElement('span');
    bar.className = 'tips__bar';
    bar.style.setProperty('--v', String(max ? value / max : 0));
    bar.append(document.createElement('i'), textEl('small', '', chart.labels?.[i]) ?? '');
    box.append(bar);
  });
  return box;
}

export class WlTips extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  render() {
    const section = this._data;
    this.className = section.variant ? `tips tips--${section.variant}` : 'tips';
    const head = groupEl('tips__head', [
      textEl('p', 'tips__eyebrow', section.eyebrow),
      textEl('h2', 'tips__title', section.title),
      textEl('p', 'tips__lead', section.lead),
    ]);
    const cards = (section.items ?? []).filter((item) => item.title || item.text).map((item, i) => {
      const card = groupEl('tips__card', [
        textEl('h3', 'tips__card-title', item.title),
        textEl('p', 'tips__card-text', item.text),
        chartEl(item.chart),
        linkEl(item.link?.href, item.link?.label, 'tips__link'),
      ]);
      card.style.setProperty('--i', String(i));
      return card;
    });
    this.replaceChildren(...[groupEl('tips__inner container', [head, cards.length ? groupEl('tips__grid', cards) : null])].filter(Boolean));
  }
}
