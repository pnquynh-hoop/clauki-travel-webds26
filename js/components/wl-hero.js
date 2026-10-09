/* wl-hero.js - màn hình đầu: nhãn nhỏ, tiêu đề h1, đoạn dẫn, nút CTA, liên kết phụ, vài con số, một ảnh lớn.
   Mọi kiểu trình bày dùng chung HTML này; hero.css đổi bố cục theo class hero--<variant>.
   Lớp trời thật sau này gắn vào khung ảnh .hero__media. */
import { asset } from '../core.js';
import { textEl, linkEl, groupEl } from '../dom.js';

function statsEl(stats) {
  if (!stats?.length) return null;
  const list = document.createElement('dl');
  list.className = 'hero__stats';
  for (const stat of stats) {
    const item = document.createElement('div');
    item.className = 'hero__stat';
    // Trong <dl>, nhãn (dt) phải đứng trước giá trị (dd); CSS đảo lại để con số lớn nằm trên.
    const parts = [textEl('dt', 'hero__stat-label', stat.label), textEl('dd', 'hero__stat-value', stat.value)];
    item.append(...parts.filter(Boolean));
    list.append(item);
  }
  return list;
}

function imageEl(image) {
  if (!image?.src) return null;
  const figure = document.createElement('figure');
  figure.className = 'hero__media';
  const img = document.createElement('img');
  img.src = asset(image.src);
  img.alt = image.alt ?? '';
  // Ảnh hero là thứ khách thấy đầu tiên, nên xin trình duyệt tải nó trước các ảnh khác.
  img.setAttribute('fetchpriority', 'high');
  figure.append(img);
  return figure;
}

export class WlHero extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  render() {
    const section = this._data;
    // effect (ví dụ "sunrise") là hiệu ứng tuỳ chọn, bật bằng dữ liệu như variant.
    const classes = ['hero', `hero--${section.variant ?? 'split'}`];
    if (section.effect) classes.push(`hero--${section.effect}`);
    this.className = classes.join(' ');

    // Nút chính luôn lấy từ site.cta để cả trang dùng chung một lời kêu gọi.
    const actions = groupEl('hero__actions', [
      linkEl(this.site?.cta?.href, this.site?.cta?.label, 'btn'),
      linkEl(section.link?.href, section.link?.label, 'btn btn--ghost'),
    ]);

    const copy = document.createElement('div');
    copy.className = 'hero__copy';
    const copyParts = [
      textEl('p', 'hero__eyebrow', section.eyebrow),
      textEl('h1', 'hero__title', section.title),
      textEl('p', 'hero__lead', section.lead),
      actions,
      statsEl(section.stats),
    ];
    copy.append(...copyParts.filter(Boolean));

    const inner = document.createElement('div');
    inner.className = 'hero__inner container';
    inner.append(...[copy, imageEl(section.image)].filter(Boolean));

    this.replaceChildren(inner);
  }
}
