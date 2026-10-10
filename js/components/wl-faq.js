/* wl-faq.js - hỏi đáp: tiêu đề, đoạn dẫn, một dòng mời gọi hotline, rồi danh sách câu hỏi mở và đóng được.
   Mỗi câu là một thẻ <details>: bàn phím (Enter, Space) và trình đọc màn hình dùng được sẵn, không cần JS bắt phím.
   Các thẻ cùng thuộc tính name nên mở câu này thì câu đang mở tự đóng. Chuyển động mở, đóng nằm trong faq.css.
   Kiểu split (Gành Sớm): tiêu đề trái, câu hỏi phải, mỗi câu một thẻ có nút tròn cộng trừ. */
import { textEl, groupEl, telHref } from '../dom.js';

function itemEl(item, group) {
  if (!item.question || !item.answer) return null;
  const details = document.createElement('details');
  details.className = 'faq__item';
  details.name = group;
  const answer = groupEl('faq__answer', [textEl('p', 'faq__answer-text', item.answer)]);
  details.append(textEl('summary', 'faq__question', item.question), answer);
  return details;
}

// Dòng mời gọi: chữ lấy từ askLabel, số điện thoại lấy từ contact.phone và bấm được để gọi.
function askEl(label, phone) {
  if (!label || !phone) return null;
  const p = document.createElement('p');
  p.className = 'faq__ask';
  const link = document.createElement('a');
  link.href = telHref(phone);
  link.textContent = phone;
  p.append(`${label} `, link);
  return p;
}

export class WlFaq extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  render() {
    const section = this._data;
    // Không có variant thì chỉ là dạng cơ bản một cột; mỗi thương hiệu tự thêm kiểu riêng qua class faq--<variant>.
    this.className = section.variant ? `faq faq--${section.variant}` : 'faq';

    const head = groupEl('faq__head', [
      textEl('p', 'faq__eyebrow', section.eyebrow),
      textEl('h2', 'faq__title', section.title),
      textEl('p', 'faq__lead', section.lead),
      askEl(section.askLabel, this.site?.contact?.phone),
    ]);
    const group = `${this.id || 'faq'}-items`;
    const list = groupEl('faq__list', (section.items ?? []).map((item) => itemEl(item, group)));

    this.replaceChildren(...[groupEl('faq__inner container', [head, list])].filter(Boolean));
  }
}
