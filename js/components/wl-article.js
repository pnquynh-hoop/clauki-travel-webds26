/* wl-article.js - bài viết dài: tiêu đề, đoạn dẫn, rồi các khối nối tiếp nhau:
   - text: tiêu đề nhỏ và các đoạn văn (cách đoạn bằng một dòng trống trong body);
   - image: ảnh lớn có chú thích;
   - places: danh sách địa điểm (tên, khoảng cách, đi bằng gì, link mở bản đồ);
   - quote: câu trích nổi bật kèm người nói.
   Một khối text đứng ngay trước một khối image thì ghép thành một hàng: từ 1024px chữ một bên, ảnh một bên,
   các hàng đổi bên xen kẽ. Các khối hiện dần khi cuộn tới (giảm chuyển động thì hiện ngay). */
import { asset } from '../core.js';
import { textEl, groupEl } from '../dom.js';

function paragraphs(body) {
  return String(body ?? '').split(/\n\s*\n/).map((p) => textEl('p', 'article__p', p.trim())).filter(Boolean);
}

export class WlArticle extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  disconnectedCallback() {
    this._observer?.disconnect();
  }

  textBlock(block) {
    return groupEl('article__text', [textEl('h3', 'article__heading', block.title), ...paragraphs(block.body)]);
  }

  imageBlock(block) {
    if (!block.src) return null;
    const figure = document.createElement('figure');
    figure.className = 'article__figure';
    const img = document.createElement('img');
    img.src = asset(block.src);
    img.alt = block.alt ?? '';
    img.loading = 'lazy';
    figure.append(img);
    const caption = textEl('figcaption', 'article__caption', block.caption);
    if (caption) figure.append(caption);
    return figure;
  }

  placesBlock(block) {
    const items = (block.items ?? []).filter((p) => p.name).map((p) => {
      const li = document.createElement('li');
      li.className = 'article__place';
      // "Khoảng cách, đi bằng gì": trường nào thiếu thì bỏ.
      const meta = [p.distance, p.by].filter(Boolean).join(', ');
      li.append(...[
        textEl('h4', 'article__place-name', p.name),
        textEl('p', 'article__place-text', p.text),
        textEl('p', 'article__place-meta', meta),
        this.mapLink(p.map),
      ].filter(Boolean));
      return li;
    });
    if (!items.length) return null;
    const list = document.createElement('ul');
    list.className = 'article__places';
    list.append(...items);
    return groupEl('article__places-block', [textEl('h3', 'article__heading', block.title), list]);
  }

  // Bản đồ mở ở tab mới để khách không rời trang đang đọc.
  mapLink(href) {
    const label = this._data.labels?.map;
    if (!href || !label) return null;
    const a = document.createElement('a');
    a.className = 'article__map';
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener nofollow';
    a.textContent = label;
    return a;
  }

  quoteBlock(block) {
    if (!block.text) return null;
    const quote = document.createElement('blockquote');
    quote.className = 'article__quote';
    quote.append(...[textEl('p', 'article__quote-text', block.text), textEl('cite', 'article__quote-by', block.by)].filter(Boolean));
    return quote;
  }

  blockEl(block) {
    const make = { text: this.textBlock, image: this.imageBlock, places: this.placesBlock, quote: this.quoteBlock }[block.type];
    return make ? make.call(this, block) : null;
  }

  // Ghép text liền trước image thành một hàng; hàng thứ hai, tư, ... đổi bên ảnh.
  bodyEls(blocks) {
    const out = [];
    let rows = 0;
    for (let i = 0; i < blocks.length; i += 1) {
      const block = blocks[i];
      const next = blocks[i + 1];
      if (block.type === 'text' && next?.type === 'image') {
        const row = groupEl('article__row', [this.textBlock(block), this.imageBlock(next)]);
        if (row) {
          if (rows % 2 === 1) row.classList.add('article__row--flip');
          rows += 1;
          out.push(row);
        }
        i += 1;
      } else {
        out.push(this.blockEl(block));
      }
    }
    return out.filter(Boolean);
  }

  // Các khối hiện dần khi cuộn tới. Không có IntersectionObserver thì để nguyên, khối vẫn hiện bình thường.
  reveal(els) {
    this._observer?.disconnect();
    if (!('IntersectionObserver' in window)) return;
    this._observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        this._observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -10% 0px' });
    for (const el of els) {
      el.classList.add('article__reveal');
      this._observer.observe(el);
    }
  }

  render() {
    const section = this._data;
    this.className = section.variant ? `article article--${section.variant}` : 'article';
    const head = groupEl('article__head', [
      textEl('p', 'article__eyebrow', section.eyebrow),
      textEl('h2', 'article__title', section.title),
      textEl('p', 'article__lead', section.lead),
    ]);
    const body = this.bodyEls(section.blocks ?? []);
    this.replaceChildren(...[head, groupEl('article__body container', body)].filter(Boolean));
    this.reveal(body);
  }
}
