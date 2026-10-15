/* wl-intro.js - khối chỉ có chữ: nhãn nhỏ, tiêu đề, câu dẫn (ba trường chung của mọi section).
   Tuỳ chọn thêm hai hình nhỏ cho trang ngắn một ý (ví dụ trang 404): biển số nhà phía trên tiêu đề (plate)
   và con đường kẻ đứt có một phương tiện chạy qua lại phía dưới (road), dẫn mắt xuống khối tiếp theo.
   core.js đưa thông tin chung (el.site) trước, rồi đưa dữ liệu của khối (el.data) để vẽ.
   Khối này không cần el.site; khối có nút (như hero) thì lấy nút từ this.site.cta. */

// textEl dùng chung trong dom.js: trường nào trống thì trả về null để bỏ qua, không tạo thẻ rỗng.
import { textEl } from '../dom.js';
import { iconEl } from '../icon.js';
import { plateEl } from './plate.js';
import { morphTitle } from './intro-morph.js';

// Con đường chỉ để nhìn: trình đọc màn hình bỏ qua. Không có icon thì không có đường.
function roadEl(road) {
  const icon = iconEl(road?.icon, 'intro__rider');
  if (!icon) return null;
  const line = document.createElement('div');
  line.className = 'intro__road';
  line.setAttribute('aria-hidden', 'true');
  line.append(icon);
  return line;
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

    const plate = plateEl(section.plate, 'intro__plate');
    const eyebrow = textEl('p', 'intro__eyebrow', section.eyebrow);
    const morph = section.morph?.from && section.morph?.to ? morphTitle(section.morph, section.title) : null;
    const title = morph ? morph.title : textEl('h2', 'intro__title', section.title);
    const lead = textEl('p', 'intro__lead', section.lead);
    const replay = morph ? this.replayEl(section.morph.replay, morph.play) : null;

    // Trường nào thiếu thì trả về null; chỉ giữ lại những thẻ đã tạo được.
    const parts = [plate, eyebrow, title, lead, replay, roadEl(section.road)].filter((el) => el !== null);

    // Xoá nội dung cũ rồi đặt nội dung mới, nên vẽ lại bao nhiêu lần cũng không bị lặp chữ.
    this.replaceChildren(...parts);
    this.watchMorph(morph);
  }

  // Tiêu đề lật chạy khi lọt vào màn hình, một lần; vẽ lại thì bỏ lần theo dõi cũ.
  watchMorph(morph) {
    this._io?.disconnect();
    if (!morph) return;
    this._io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      this._io.disconnect();
      morph.play();
    }, { threshold: 0.4 });
    this._io.observe(morph.title);
  }

  replayEl(label, play) {
    if (!label) return null;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn--ghost intro__replay';
    button.textContent = label;
    button.addEventListener('click', play);
    return button;
  }

  disconnectedCallback() {
    this._io?.disconnect();
  }
}
