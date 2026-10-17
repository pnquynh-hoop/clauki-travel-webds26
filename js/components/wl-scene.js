/* wl-scene.js - cảnh đáng chờ: ảnh tràn màn hình, nhãn nhỏ, câu tả cảnh chữ lớn nghiêng đè lên góc dưới, giờ đẹp
   nhất; ảnh trôi chậm khi cuộn. Dữ liệu ở section.view (image, text, best), hoặc view của mục danh mục khi section ghi item
   (hạng phòng). Tách từ room-detail. */
import { textEl } from '../core/dom.js';
import { parallax } from '../effects/parallax.js';
import { imgEl, itemSection } from './item-detail.js';

export class WlScene extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  get labels() {
    return this._data.labels ?? {};
  }

  viewEl(view) {
    if (!view?.image?.src) return null;
    const figure = document.createElement('figure');
    figure.className = 'scene__view';
    const img = imgEl(view.image, 'scene__view-img', true);
    const best = view.best && [this.labels.best, view.best].filter(Boolean).join(': ');
    const lines = [
      textEl('p', 'scene__view-label', this.labels.view),
      textEl('p', 'scene__view-text', view.text),
      textEl('p', 'scene__view-best', best),
    ].filter(Boolean);
    figure.append(img);
    if (lines.length) {
      const caption = document.createElement('figcaption');
      caption.className = 'scene__view-caption container';
      caption.append(...lines);
      figure.append(caption);
    }
    parallax(img, 0.12, 1.2);
    return figure;
  }

  render() {
    this.className = this._data.variant ? `scene scene--${this._data.variant}` : 'scene';
    this.replaceChildren(...[this.viewEl(itemSection(this.site, this._data).view)].filter(Boolean));
  }
}
