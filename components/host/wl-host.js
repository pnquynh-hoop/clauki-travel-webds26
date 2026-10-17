/* wl-host.js - giới thiệu chủ nhà: ảnh lớn kèm một ảnh nhỏ, vài đoạn chuyện ngắn, câu nói của chủ nhà, vài con số.
   Tên khối theo chức năng, nên thương hiệu nào cũng dùng được để giới thiệu chủ nhà hay người dẫn đường.
   Kiểu "tv" có HTML và hành vi khác hẳn (tivi đời cũ kể chuyện theo cuộn), nên nằm ở tệp riêng host-tv.js. */
import { asset } from '../../js/core/core.js';
import { textEl, groupEl } from '../../js/core/dom.js';
import { buildTv } from './host-tv.js';

function imageEl(image, className) {
  if (!image?.src) return null;
  const img = document.createElement('img');
  img.className = className;
  img.src = asset(image.src);
  img.alt = image.alt ?? '';
  // Khối nằm dưới màn hình đầu, để trình duyệt tải hero trước.
  img.loading = 'lazy';
  return img;
}

// Câu nói kèm tên người nói: figure gom hai phần lại, để trình đọc màn hình biết ai nói câu nào.
function quoteEl(quote) {
  if (!quote?.text) return null;
  const figure = document.createElement('figure');
  figure.className = 'host__quote';
  const block = document.createElement('blockquote');
  block.append(textEl('p', 'host__quote-text', quote.text));
  figure.append(block);
  const by = textEl('figcaption', 'host__quote-by', quote.by);
  if (by) figure.append(by);
  return figure;
}

function factsEl(facts) {
  if (!facts?.length) return null;
  const list = document.createElement('dl');
  list.className = 'host__facts';
  for (const fact of facts) {
    // Trong <dl>, nhãn (dt) đứng trước giá trị (dd); CSS đảo lại để con số lớn nằm trên.
    const item = groupEl('host__fact', [
      textEl('dt', 'host__fact-label', fact.label),
      textEl('dd', 'host__fact-value', fact.value),
    ]);
    if (item) list.append(item);
  }
  return list;
}

export class WlHost extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  // Kiểu tv gắn listener cuộn vào window; khối bị gỡ (đổi thương hiệu) thì gỡ theo.
  disconnectedCallback() {
    this._detachTv?.();
    this._detachTv = null;
  }

  render() {
    const section = this._data;
    this.className = section.variant ? `host host--${section.variant}` : 'host';
    this._detachTv?.();
    this._detachTv = null;
    // Kiểu tv thiếu dữ liệu câu chuyện thì buildTv trả về null, khối quay về kiểu mặc định bên dưới.
    if (section.variant === 'tv') {
      this._detachTv = buildTv(this, section);
      if (this._detachTv) return;
    }

    const media = groupEl('host__media', [
      imageEl(section.image, 'host__main'),
      imageEl(section.imageSecond, 'host__second'),
    ]);

    const story = groupEl('host__story', (section.story ?? []).map((text) => textEl('p', 'host__para', text)));

    const copy = groupEl('host__copy', [
      textEl('p', 'host__eyebrow', section.eyebrow),
      textEl('h2', 'host__title', section.title),
      story,
      quoteEl(section.quote),
      factsEl(section.facts),
    ]);

    const inner = groupEl('host__inner container', [media, copy]);
    // Dữ liệu trống hoàn toàn thì khối rỗng, không lỗi.
    this.replaceChildren(...[inner].filter(Boolean));
  }
}
