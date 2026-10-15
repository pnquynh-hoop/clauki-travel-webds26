/* wl-cards.js - khối thẻ để trình bày, không gắn với một loại nội dung: người, nơi chốn, cam kết, điểm nổi bật...
   Không có hành vi đặt chỗ hay chọn sản phẩm; thứ có giá hoặc đặt được thì dùng catalog-list, stays, booking.
   Kiểu mặc định: lưới thẻ (ảnh hoặc icon, tiêu đề, dòng phụ, đoạn chữ, các dòng thông tin, câu trích, chip, liên kết).
   Kiểu badge: thẻ đeo có kẹp dây, dải màu đầu thẻ ghi nhãn chung (tag), vòng tròn ảnh hoặc chữ tắt của tiêu đề;
   các thẻ treo lệch nhau, cuộn tới thì đung đưa một lần rồi dừng. */
import { asset } from '../core.js';
import { textEl, linkEl } from '../dom.js';
import { iconEl } from '../icon.js';

// Chữ tắt cho vòng tròn khi thẻ không có ảnh: chữ đầu của hai từ cuối ("Chị Tư Hạnh" thành "TH"),
// vì tên người Việt hay có tiếng xưng hô đứng đầu, phần tên nằm ở cuối.
function initials(title) {
  return String(title).trim().split(/\s+/).slice(-2).map((word) => word[0]).join('').toUpperCase();
}

function imageEl(image, className) {
  if (!image?.src) return null;
  const img = document.createElement('img');
  img.className = className;
  img.src = asset(image.src);
  img.alt = image.alt ?? '';
  img.loading = 'lazy';
  return img;
}

// Các dòng thông tin: nhãn nhỏ và giá trị; dòng thiếu một trong hai bị bỏ.
function factsEl(facts = []) {
  const rows = facts.filter((f) => f.label && f.value);
  if (!rows.length) return null;
  const dl = document.createElement('dl');
  dl.className = 'cards__facts';
  rows.forEach((f) => {
    const row = document.createElement('div');
    row.className = 'cards__fact';
    row.append(textEl('dt', '', f.label), textEl('dd', '', f.value));
    dl.append(row);
  });
  return dl;
}

// Các chip: nhãn ngắn có icon, ví dụ lĩnh vực chuyên môn. Màu chip đến từ dữ liệu nên kiểm trước khi gán vào CSS.
function chipsEl(chips = []) {
  const items = chips.filter((chip) => chip.text).map((chip) => {
    const li = document.createElement('li');
    li.className = 'cards__chip';
    if (chip.color && CSS.supports('color', chip.color)) li.style.setProperty('--chip-color', chip.color);
    li.append(...[iconEl(chip.icon, 'cards__chip-icon'), chip.text].filter(Boolean));
    return li;
  });
  if (!items.length) return null;
  const list = document.createElement('ul');
  list.className = 'cards__chips';
  list.append(...items);
  return list;
}

// Phần hình đầu thẻ. Kiểu badge luôn có vòng tròn: ảnh, không có ảnh thì chữ tắt (chỉ để nhìn, tên đã có ở h3).
function mediaEl(item, badge) {
  if (badge) {
    const face = document.createElement('span');
    face.className = 'cards__face';
    const img = imageEl(item.image, 'cards__face-img');
    if (img) face.append(img);
    else {
      face.setAttribute('aria-hidden', 'true');
      face.textContent = initials(item.title);
    }
    return face;
  }
  return imageEl(item.image, 'cards__image') ?? iconEl(item.icon, 'cards__icon');
}

function cardEl(item, index, section, badge) {
  const card = document.createElement('article');
  card.className = 'cards__card';
  if (item.color && CSS.supports('color', item.color)) card.style.setProperty('--card-color', item.color);

  const parts = [];
  if (badge) {
    const clip = document.createElement('span');
    clip.className = 'cards__clip';
    clip.setAttribute('aria-hidden', 'true');
    parts.push(clip, textEl('p', 'cards__tag', section.tag));
  }
  const quote = item.quote ? document.createElement('blockquote') : null;
  if (quote) {
    quote.className = 'cards__quote';
    quote.textContent = item.quote;
  }
  parts.push(
    mediaEl(item, badge),
    textEl('h3', 'cards__title', item.title),
    textEl('p', 'cards__meta', item.meta),
    textEl('p', 'cards__text', item.text),
    factsEl(item.facts),
    quote,
    chipsEl(item.chips),
    linkEl(item.link?.href, item.link?.label, 'cards__link'),
  );
  card.append(...parts.filter(Boolean));

  const li = document.createElement('li');
  li.className = 'cards__item';
  // Thứ tự thẻ, để các thẻ đung đưa lần lượt chứ không cùng lúc.
  li.style.setProperty('--i', index);
  li.append(card);
  return li;
}

export class WlCards extends HTMLElement {
  disconnectedCallback() {
    this._io?.disconnect();
  }

  set data(section) {
    this._data = section;
    this.render();
  }

  render() {
    this._io?.disconnect();
    const section = this._data;
    const badge = section.variant === 'badge';
    this.className = section.variant ? `cards cards--${section.variant}` : 'cards';
    // Thẻ không có tiêu đề thì không có h3 để trình đọc màn hình gọi tên, nên bỏ.
    const items = (section.items ?? []).filter((item) => item.title);

    const list = document.createElement('ul');
    list.className = 'cards__list';
    list.append(...items.map((item, i) => cardEl(item, i, section, badge)));

    const inner = document.createElement('div');
    inner.className = 'container';
    inner.append(...[
      textEl('p', 'cards__eyebrow', section.eyebrow),
      textEl('h2', 'cards__heading', section.title),
      textEl('p', 'cards__lead', section.lead),
      items.length ? list : null,
    ].filter(Boolean));
    this.replaceChildren(inner);
    if (badge && items.length) this.swingIn(list);
  }

  // Thẻ đeo đung đưa một lần khi danh sách vào màn hình, như vừa được treo lên móc.
  // Giảm chuyển động thì không đung đưa, thẻ đứng yên ở góc nghiêng của mình.
  swingIn(list) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this._io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      this._io.disconnect();
      list.classList.add('is-swinging');
    }, { threshold: 0.2 });
    this._io.observe(list);
  }
}
