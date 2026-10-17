/* wl-policy.js - bảng điều khoản ngắn (huỷ, hoàn, dời lịch): mỗi dòng một trường hợp và kết quả. Kết quả có mức
   (tone: ok, mid, no) để tô màu, nhưng chữ luôn ghi rõ, nên không dựa vào màu để hiểu. */
import { textEl, groupEl } from '../core/dom.js';

const TONES = ['ok', 'mid', 'no'];

export class WlPolicy extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  render() {
    const section = this._data;
    this.className = 'policy';
    const head = groupEl('policy__head', [
      textEl('p', 'policy__eyebrow', section.eyebrow),
      textEl('h2', 'policy__title', section.title),
      textEl('p', 'policy__lead', section.lead),
    ]);
    const rows = (section.rows ?? []).filter((row) => row.when && row.what);
    let list = null;
    if (rows.length) {
      list = document.createElement('dl');
      list.className = 'policy__rows';
      list.append(...rows.map((row) => {
        const tone = TONES.includes(row.tone) ? row.tone : 'mid';
        return groupEl(`policy__row policy__row--${tone}`, [textEl('dt', 'policy__when', row.when), textEl('dd', 'policy__what', row.what)]);
      }));
    }
    this.replaceChildren(...[groupEl('policy__inner container', [head, list, textEl('p', 'policy__note', section.note)])].filter(Boolean));
  }
}
