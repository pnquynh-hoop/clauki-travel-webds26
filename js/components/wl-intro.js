/* wl-intro.js - khối chỉ có chữ: nhãn nhỏ, tiêu đề, câu dẫn (ba trường chung của mọi section).
   core.js đưa thông tin chung (el.site) trước, rồi đưa dữ liệu của khối (el.data) để vẽ.
   Khối này không cần el.site; khối có nút (như hero) thì lấy nút từ this.site.cta. */

// Trường nào trống thì trả về null để bỏ qua, không tạo thẻ rỗng.
function textEl(tag, className, text) {
  if (!text) return null;
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  return el;
}

export class WlIntro extends HTMLElement {
  // "set data" tự chạy mỗi khi có dòng el.data = ... (core.js làm việc này).
  // Nó lưu dữ liệu rồi vẽ ngay, nên đổi thương hiệu là khối tự vẽ lại.
  set data(section) {
    this._data = section;
    this.render();
  }

  render() {
    const section = this._data;

    // Có variant (ví dụ "center") thì thêm class intro--center để CSS đổi bố cục.
    this.className = section.variant ? `intro intro--${section.variant}` : 'intro';

    const eyebrow = textEl('p', 'intro__eyebrow', section.eyebrow);
    const title = textEl('h2', 'intro__title', section.title);
    const lead = textEl('p', 'intro__lead', section.lead);

    // Trường nào thiếu thì textEl trả về null; chỉ giữ lại những thẻ đã tạo được.
    const parts = [eyebrow, title, lead].filter((el) => el !== null);

    // Xoá nội dung cũ rồi đặt nội dung mới, nên vẽ lại bao nhiêu lần cũng không bị lặp chữ.
    this.replaceChildren(...parts);
  }
}
