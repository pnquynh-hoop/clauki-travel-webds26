/* wl-faq.js - hỏi đáp. Hai cấu trúc HTML khác nhau nên rẽ nhánh JS theo variant:
   - không có variant: danh sách câu hỏi, mỗi câu một thẻ <details> (bàn phím, trình đọc màn hình dùng được sẵn),
     mở câu này thì câu đang mở tự đóng; chuyển động mở, đóng nằm trong faq.css;
   - chat (Gành Sớm): khung nhắn tin với chủ nhà. Các câu hỏi là nút gợi ý; bấm một câu thì nó hiện thành tin nhắn
     của khách, chủ nhà "đang nhập" một lúc rồi trả lời. Bên cạnh là thẻ ảnh mời gọi hotline. */
import { asset } from '../core.js';
import { textEl, groupEl, telHref } from '../dom.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function phoneLink(phone) {
  const link = document.createElement('a');
  link.href = telHref(phone);
  link.textContent = phone;
  return link;
}

function imageEl(image, className, lazy) {
  if (!image?.src) return null;
  const img = document.createElement('img');
  img.className = className;
  img.src = asset(image.src);
  img.alt = image.alt ?? '';
  if (lazy) img.loading = 'lazy';
  return img;
}

// Chữ tắt trên ảnh đại diện: chữ cái đầu của từng tiếng trong tên thương hiệu ("Gành Sớm" thành "GS").
function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).map((word) => word[0]).join('').slice(0, 3).toUpperCase();
}

function itemEl(item, group) {
  const details = document.createElement('details');
  details.className = 'faq__item';
  details.name = group;
  const answer = groupEl('faq__answer', [textEl('p', 'faq__answer-text', item.answer)]);
  details.append(textEl('summary', 'faq__question', item.question), answer);
  return details;
}

export class WlFaq extends HTMLElement {
  disconnectedCallback() {
    // Khối bị gỡ (đổi thương hiệu) thì huỷ các tin nhắn đang chờ hiện.
    this._run = (this._run ?? 0) + 1;
  }

  set data(section) {
    this._data = section;
    this.render();
  }

  // Dòng mời gọi của kiểu cơ bản: "Chưa thấy điều bạn cần? Gọi 0123 456 789".
  askLine() {
    const ask = this._data.ask;
    const phone = this.site?.contact?.phone;
    if (!ask?.text || !phone) return null;
    const p = document.createElement('p');
    p.className = 'faq__ask';
    p.append(`${[ask.text, ask.action].filter(Boolean).join(' ')} `, phoneLink(phone));
    return p;
  }

  listEl(items) {
    const group = `${this.id || 'faq'}-items`;
    return groupEl('faq__list', items.map((item) => itemEl(item, group)));
  }

  /* ---------- Kiểu chat ---------- */

  // Thêm một tin nhắn vào khung. instant: hiện ngay không có hiệu ứng (lúc dựng lần đầu).
  message(role, parts, instant) {
    const chat = this._data.chat ?? {};
    const msg = document.createElement('div');
    msg.className = `faq__msg faq__msg--${role}${instant ? '' : ' is-new'}`;
    if (role === 'host') msg.append(textEl('p', 'faq__msg-who', this.site?.brand?.name) ?? '');
    const bubble = document.createElement('p');
    bubble.className = 'faq__bubble';
    // Trình đọc màn hình nghe được ai đang nói: tin của khách có thêm chữ ẩn đứng trước, ví dụ "Bạn hỏi:".
    if (role === 'guest' && chat.you) bubble.append(textEl('span', 'faq__sr', `${chat.you} `));
    bubble.append(...[].concat(parts));
    msg.append(bubble);
    this._log.append(msg);
    this.toBottom(instant);
    return msg;
  }

  // Ba chấm "đang nhập"; ẩn với trình đọc màn hình vì chỉ là hình.
  typing() {
    const msg = document.createElement('div');
    msg.className = 'faq__msg faq__msg--host faq__msg--typing is-new';
    msg.setAttribute('aria-hidden', 'true');
    const bubble = document.createElement('p');
    bubble.className = 'faq__bubble';
    bubble.append(...[0, 1, 2].map(() => textEl('span', 'faq__dot', ' ')));
    msg.append(bubble);
    this._log.append(msg);
    this.toBottom(false);
    return msg;
  }

  toBottom(instant) {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._scroll.scrollTo({ top: this._scroll.scrollHeight, behavior: instant || reduce ? 'auto' : 'smooth' });
  }

  renderChips() {
    const chat = this._data.chat ?? {};
    const items = this._items;
    this._chips.replaceChildren(...items.map((item, i) => {
      if (this._asked.has(i)) return null;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'faq__chip';
      chip.textContent = item.question;
      chip.dataset.i = String(i);
      return chip;
    }).filter(Boolean));
    const left = this._chips.children.length;
    this._chips.hidden = left === 0;
    this._again.hidden = left > 0;
    this._pick.textContent = left ? chat.pick ?? '' : chat.done ?? '';
  }

  // Lần lượt trả lời các câu khách đã bấm: hiện câu hỏi, chờ một chút, ba chấm "đang nhập", rồi câu trả lời.
  // Thời gian gõ dài theo độ dài câu trả lời cho giống người thật, nhưng không quá 1,6 giây.
  async pump() {
    if (this._busy) return;
    this._busy = true;
    const run = this._run;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    while (this._queue.length) {
      const item = this._items[this._queue.shift()];
      this.message('guest', item.question);
      await wait(reduce ? 200 : 420);
      if (run !== this._run) return;
      const dots = this.typing();
      await wait(reduce ? 650 : Math.min(1600, 650 + item.answer.length * 5));
      if (run !== this._run) return;
      dots.remove();
      this.message('host', item.answer);
      if (this._asked.size === this._items.length && !this._queue.length) {
        await wait(reduce ? 300 : 700);
        if (run !== this._run) return;
        const phone = this.site?.contact?.phone;
        const closing = this._data.chat?.closing;
        if (closing && phone) this.message('host', [`${closing} `, phoneLink(phone)]);
      }
    }
    this._busy = false;
  }

  // Bắt đầu lại cuộc trò chuyện: huỷ tin đang chờ, xoá khung, chủ nhà chào trước.
  restart(instant) {
    this._run = (this._run ?? 0) + 1;
    this._queue = [];
    this._busy = false;
    this._asked = new Set();
    this._log.replaceChildren();
    const greeting = this._data.chat?.greeting;
    if (greeting) this.message('host', greeting, instant);
  }

  ask(chip) {
    const i = Number(chip.dataset.i);
    const siblings = [...this._chips.children];
    const pos = siblings.indexOf(chip);
    this._asked.add(i);
    this._queue.push(i);
    chip.remove();
    // Đưa con trỏ bàn phím sang nút kế bên, để người dùng bàn phím hỏi tiếp không phải Tab lại từ đầu.
    const rest = [...this._chips.children];
    if (rest.length) {
      (rest[pos] ?? rest[pos - 1]).focus({ preventScroll: true });
    } else {
      this.renderChips();
      this._again.focus({ preventScroll: true });
    }
    this.pump();
  }

  chatEl() {
    const chat = this._data.chat ?? {};
    const brand = this.site?.brand ?? {};

    const head = groupEl('faq__chat-head', [
      imageEl(chat.cover, 'faq__chat-cover', true),
      textEl('span', 'faq__avatar', initials(brand.name)),
      groupEl('faq__chat-who', [textEl('p', 'faq__chat-name', brand.name), textEl('p', 'faq__chat-tag', brand.slogan)]),
    ]);
    head.querySelector('.faq__avatar')?.setAttribute('aria-hidden', 'true');
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'faq__reset';
    reset.textContent = chat.reset ?? '';
    reset.addEventListener('click', () => {
      this.restart(false);
      this.renderChips();
    });
    if (chat.reset) head.append(reset);

    // Khung tin nhắn là role="log": trình đọc màn hình đọc từng tin mới thêm vào.
    this._log = document.createElement('div');
    this._log.className = 'faq__log';
    this._log.setAttribute('role', 'log');
    this._log.setAttribute('aria-live', 'polite');
    this._scroll = groupEl('faq__scroll', [this._log]);

    this._pick = document.createElement('p');
    this._pick.className = 'faq__pick';
    this._pick.id = `${this.id || 'faq'}-pick`;
    this._chips = document.createElement('div');
    this._chips.className = 'faq__chips';
    this._chips.setAttribute('role', 'group');
    this._chips.setAttribute('aria-labelledby', this._pick.id);
    this._chips.addEventListener('click', (e) => {
      const chip = e.target.closest('.faq__chip');
      if (chip) this.ask(chip);
    });
    this._again = document.createElement('button');
    this._again.type = 'button';
    this._again.className = 'faq__again';
    this._again.textContent = chat.again ?? '';
    this._again.addEventListener('click', () => {
      this.restart(false);
      this.renderChips();
      this._chips.firstElementChild?.focus({ preventScroll: true });
    });

    const box = groupEl('faq__chat', [head, this._scroll, groupEl('faq__tray', [this._pick, this._chips, this._again])]);
    box.setAttribute('role', 'region');
    if (chat.label) box.setAttribute('aria-label', chat.label);
    return groupEl('faq__chat-wrap', [box]);
  }

  // Thẻ ảnh mời gọi: ảnh, câu hỏi nhỏ, rồi "Gọi" kèm số điện thoại bấm được.
  callEl() {
    const ask = this._data.ask;
    const phone = this.site?.contact?.phone;
    if (!ask?.text || !phone) return null;
    const text = document.createElement('p');
    text.className = 'faq__call-text';
    const line = textEl('span', 'faq__call-line', ask.action ? `${ask.action} ` : ' ');
    line.append(phoneLink(phone));
    text.append(textEl('span', 'faq__call-ask', ask.text), line);
    const figure = document.createElement('figure');
    figure.className = 'faq__call';
    figure.append(...[imageEl(ask.image, 'faq__call-img', true), text].filter(Boolean));
    return figure;
  }

  render() {
    const section = this._data;
    const variant = section.variant;
    this.className = variant ? `faq faq--${variant}` : 'faq';
    this._items = (section.items ?? []).filter((item) => item.question && item.answer);

    const head = groupEl('faq__head', [
      textEl('p', 'faq__eyebrow', section.eyebrow),
      textEl('h2', 'faq__title', section.title),
      textEl('p', 'faq__lead', section.lead),
      variant === 'chat' ? null : this.askLine(),
    ]);

    if (variant !== 'chat' || !this._items.length) {
      this.replaceChildren(...[groupEl('faq__inner container', [head, this.listEl(this._items)])].filter(Boolean));
      return;
    }

    const inner = groupEl('faq__inner container', [head, this.chatEl(), this.callEl()]);
    this.replaceChildren(inner);
    // Mở sẵn: lời chào và câu đầu tiên đã được trả lời, để khách thấy ngay cách dùng.
    this.restart(true);
    this._asked.add(0);
    this.message('guest', this._items[0].question, true);
    this.message('host', this._items[0].answer, true);
    this.renderChips();
    requestAnimationFrame(() => this.toBottom(true));
  }
}
