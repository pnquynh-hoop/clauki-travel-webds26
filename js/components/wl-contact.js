/* wl-contact.js - trang liên hệ. Kiểu notes: mỗi cách liên hệ là một tờ giấy note dán băng keo
   (gọi, email, điểm hẹn, văn phòng); tờ gọi có đèn báo đang nghe máy hay không theo giờ thật ở nơi đến.
   Kiểu plate: tiêu đề rất lớn, đèn báo mở cửa nằm ngay dưới tiêu đề, các cách liên hệ là thẻ màu viền mực,
   tờ chỉ đường và form nằm cạnh nhau. Có plate thì biển số nhà đứng chỗ ảnh (ở mọi kiểu).
   Tuỳ chọn tờ chỉ đường (directions): các bước đánh số tới điểm hẹn và nút mở bản đồ.
   Bên dưới là tờ giấy kẻ dòng để soạn sẵn tin nhắn rồi gửi bằng SMS hoặc email: trang tĩnh không có máy chủ
   nhận thư, nên tin đi thẳng tới số điện thoại và email thật của thương hiệu. */
import { asset } from '../core.js';
import { textEl, linkEl, telHref } from '../dom.js';
import { iconEl } from '../icon.js';
import { plateEl } from './plate.js';

// Số, email, địa chỉ lấy từ site.contact chứ không chép vào từng tờ, để đổi số điện thoại chỉ phải sửa một chỗ.
export const KINDS = {
  phone: { icon: 'phone', value: (c) => c.phone, href: (c) => telHref(c.phone) },
  email: { icon: 'mail', value: (c) => c.email, href: (c) => (c.email ? `mailto:${c.email}` : null) },
  address: { icon: 'building-2', value: (c) => c.address },
};

// Thay {tên} trong mẫu chữ bằng giá trị tương ứng.
export const fill = (template, values) => (template ?? '').replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');

// "07:30" thành số phút trong ngày; sai dạng thì ra NaN, đèn báo tự bỏ.
export function toMinutes(time) {
  const [h, m] = String(time).split(':').map(Number);
  return h * 60 + m;
}

// Giờ ở nơi đến (place.timezone) chứ không theo đồng hồ máy khách:
// khách mở trang từ nước khác vẫn thấy đúng lúc này gọi có người nghe không.
export function nowMinutes(timeZone) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date());
    const get = (type) => Number(parts.find((p) => p.type === type).value);
    return get('hour') * 60 + get('minute');
  } catch {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }
}

// Ảnh dán băng keo, chú thích viết ở mép dưới như ảnh chụp lấy liền.
function photoEl(image) {
  if (!image?.src) return null;
  const figure = document.createElement('figure');
  figure.className = 'contact__photo';
  const img = document.createElement('img');
  img.src = asset(image.src);
  img.alt = image.alt ?? '';
  img.decoding = 'async';
  figure.append(img);
  const caption = textEl('figcaption', 'contact__caption', image.caption);
  if (caption) figure.append(caption);
  return figure;
}

// Email hết chỗ thì xuống dòng ngay sau @, không ngắt ở dấu gạch giữa tên (đọc thành hai chữ).
function valueEl(value, isEmail) {
  const el = textEl('span', 'contact__value', value);
  const at = value.indexOf('@');
  if (isEmail && at > 0) el.replaceChildren(value.slice(0, at + 1), document.createElement('wbr'), value.slice(at + 1));
  return el;
}

// Một tờ note. Có đường dẫn (gọi, email, bản đồ) thì cả tờ là liên kết; thiếu giá trị thì bỏ tờ đó.
function noteEl(way, contact) {
  const kind = KINDS[way.kind] ?? {};
  const value = way.value ?? kind.value?.(contact);
  if (!value) return null;
  const href = way.href ?? kind.href?.(contact);
  const note = document.createElement(href ? 'a' : 'div');
  note.className = way.kind ? `contact__note contact__note--${way.kind}` : 'contact__note';
  if (href) note.href = href;
  if (href?.startsWith('http')) {
    note.target = '_blank';
    note.rel = 'noopener';
  }
  note.append(...[
    iconEl(way.icon ?? kind.icon, 'contact__icon'),
    textEl('span', 'contact__label', way.label),
    valueEl(String(value), way.kind === 'email'),
    textEl('span', 'contact__text', way.text),
  ].filter(Boolean));
  return note;
}

// Một ô nhập kèm nhãn và chỗ báo lỗi ngay dưới ô.
function fieldEl(id, key, label, tag) {
  const control = document.createElement(tag);
  control.className = 'contact__input';
  control.id = `${id}-${key}`;
  control.name = key;
  if (tag === 'textarea') control.rows = 4;
  if (key === 'name') control.autocomplete = 'name';
  const error = document.createElement('p');
  error.className = 'contact__error';
  error.id = `${control.id}-error`;
  error.hidden = true;
  control.setAttribute('aria-describedby', error.id);
  const labelEl = textEl('label', 'contact__field-label', label);
  labelEl?.setAttribute('for', control.id);
  const wrap = document.createElement('div');
  wrap.className = 'contact__field';
  wrap.append(...[labelEl, control, error].filter(Boolean));
  return { key, wrap, control, error };
}

function setError(field, message) {
  field.error.textContent = message ?? '';
  field.error.hidden = !message;
  if (message) field.control.setAttribute('aria-invalid', 'true');
  else field.control.removeAttribute('aria-invalid');
}

export class WlContact extends HTMLElement {
  disconnectedCallback() {
    this._io?.disconnect();
    clearInterval(this._timer);
  }

  set data(section) {
    this._data = section;
    this.render();
  }

  render() {
    const section = this._data;
    this.className = `contact contact--${section.variant ?? 'notes'}`;
    this._io?.disconnect();
    clearInterval(this._timer);
    this._status = null;
    // Kiểu bell (bảng chuông cửa) khác hẳn cấu trúc HTML nên dựng ở tệp riêng, chỉ tải khi dùng.
    if (section.variant === 'bell') {
      import('./contact-bell.js').then(({ renderBell }) => {
        if (this._data === section) this._timer = renderBell(this, section);
      });
      return;
    }

    const head = document.createElement('div');
    head.className = 'contact__head';
    head.append(...[
      textEl('p', 'contact__eyebrow', section.eyebrow),
      textEl('h2', 'contact__title', section.title),
      textEl('p', 'contact__lead', section.lead),
      // Kiểu plate: đèn báo là một nhãn riêng dưới tiêu đề, thấy ngay khi mở trang, không nằm trong thẻ gọi.
      section.variant === 'plate' ? this.statusEl() : null,
    ].filter(Boolean));

    const inner = document.createElement('div');
    inner.className = 'container contact__inner';
    const visual = plateEl(section.plate, 'contact__plate') ?? photoEl(section.image);
    inner.append(...[head, visual, this.waysEl(), this.directionsEl(), this.messageEl()].filter(Boolean));
    this.replaceChildren(inner);
    this.startStatus();
  }

  waysEl() {
    const contact = this.site?.contact ?? {};
    const notes = (this._data.ways ?? []).map((way) => [way, noteEl(way, contact)]).filter(([, note]) => note);
    if (!notes.length) return null;
    const list = document.createElement('ul');
    list.className = 'contact__ways';
    notes.forEach(([way, note], i) => {
      // Đèn báo đã nằm dưới tiêu đề (kiểu plate) thì tờ gọi không có đèn thứ hai.
      const status = way.kind === 'phone' && !this._status ? this.statusEl() : null;
      if (status) note.append(status);
      const li = document.createElement('li');
      li.className = 'contact__way';
      li.style.setProperty('--i', String(i));
      li.append(note);
      list.append(li);
    });
    // Các tờ được dán lên lần lượt khi danh sách vào màn hình, chỉ một lần.
    this._io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      list.classList.add('is-in');
      this._io.disconnect();
    }, { threshold: 0.2 });
    this._io.observe(list);
    return list;
  }

  // Đèn báo trên tờ gọi: chỉ có khi dữ liệu khai giờ nghe máy hợp lệ.
  statusEl() {
    const { hours, labels } = this._data;
    if (!labels || Number.isNaN(toMinutes(hours?.from)) || Number.isNaN(toMinutes(hours?.to))) return null;
    const lamp = document.createElement('span');
    lamp.className = 'contact__lamp';
    lamp.setAttribute('aria-hidden', 'true');
    this._statusText = document.createElement('span');
    this._status = document.createElement('span');
    this._status.className = 'contact__status';
    this._status.append(lamp, this._statusText);
    return this._status;
  }

  // Cập nhật mỗi phút, để trang mở lâu qua giờ đóng máy thì đèn vẫn đúng.
  startStatus() {
    if (!this._status) return;
    this.updateStatus();
    this._timer = setInterval(() => this.updateStatus(), 60000);
  }

  updateStatus() {
    const { hours, labels } = this._data;
    const now = nowMinutes(this.site?.place?.timezone);
    const open = now >= toMinutes(hours.from) && now < toMinutes(hours.to);
    this._status.classList.toggle('is-open', open);
    this._statusText.textContent = fill(open ? labels.open : labels.closed, hours);
  }

  // Tờ chỉ đường tới điểm hẹn: các bước đánh số, nút mở bản đồ. Không có bước nào thì không có tờ này.
  directionsEl() {
    const directions = this._data.directions;
    const steps = (directions?.steps ?? []).map((step) => textEl('li', 'contact__step', step)).filter(Boolean);
    if (!steps.length) return null;
    const list = document.createElement('ol');
    list.className = 'contact__steps';
    list.append(...steps);
    const href = directions.link?.href;
    const link = linkEl(href, directions.link?.label, 'btn btn--ghost contact__map');
    // Bản đồ là trang ngoài: mở tab mới để khách không rời trang liên hệ.
    if (link && href.startsWith('http')) {
      link.target = '_blank';
      link.rel = 'noopener';
    }
    const box = document.createElement('div');
    box.className = 'contact__directions';
    box.append(...[textEl('h3', 'contact__directions-title', directions.title), list, link].filter(Boolean));
    return box;
  }

  // Tờ soạn tin nhắn: bên trái lời dặn nên nhắn kèm gì, bên phải ô nhập và nút gửi.
  messageEl() {
    const message = this._data.message;
    const { phone, email } = this.site?.contact ?? {};
    if (!message || (!phone && !email)) return null;

    const tips = (message.tips ?? []).map((tip) => textEl('li', 'contact__tip', tip)).filter(Boolean);
    const tipList = document.createElement('ul');
    tipList.className = 'contact__tips';
    tipList.append(...tips);

    const intro = document.createElement('div');
    intro.className = 'contact__message-head';
    intro.append(...[
      textEl('h3', 'contact__message-title', message.title),
      textEl('p', 'contact__message-lead', message.lead),
      tips.length ? textEl('p', 'contact__tips-title', message.tipsTitle) : null,
      tips.length ? tipList : null,
    ].filter(Boolean));

    const id = this.id || 'contact';
    const fields = [fieldEl(id, 'name', message.name, 'input'), fieldEl(id, 'text', message.text, 'textarea')];
    fields[1].control.placeholder = message.placeholder ?? '';

    const actions = document.createElement('div');
    actions.className = 'contact__actions';
    if (phone) actions.append(this.sendButton('sms', message.sms, 'btn'));
    if (email) actions.append(this.sendButton('email', message.email, phone ? 'btn btn--ghost' : 'btn'));

    const form = document.createElement('form');
    form.className = 'contact__form';
    form.noValidate = true;
    form.append(...fields.map((f) => f.wrap), actions);
    form.addEventListener('submit', (e) => this.send(e, fields));

    const box = document.createElement('div');
    box.className = 'contact__message';
    box.append(intro, form);
    return box;
  }

  sendButton(value, label, className) {
    const button = document.createElement('button');
    button.type = 'submit';
    button.value = value;
    button.className = className;
    button.textContent = label ?? value;
    return button;
  }

  // Thiếu ô nào thì báo ngay dưới ô đó; đủ thì mở ứng dụng tin nhắn hoặc email với nội dung soạn sẵn.
  send(event, fields) {
    event.preventDefault();
    const errors = this._data.errors ?? {};
    const empty = fields.filter((f) => !f.control.value.trim());
    fields.forEach((f) => setError(f, empty.includes(f) ? errors[f.key] ?? '' : ''));
    if (empty.length) {
      empty[0].control.focus();
      return;
    }

    const message = this._data.message;
    const values = Object.fromEntries(fields.map((f) => [f.key, f.control.value.trim()]));
    const body = fill(message.template, values) || values.text;
    const { phone, email } = this.site.contact;
    // Bấm Enter trong ô tên thì trình duyệt coi như bấm nút gửi đầu tiên.
    const via = event.submitter?.value ?? (phone ? 'sms' : 'email');
    window.location.href = via === 'email'
      ? `mailto:${email}?subject=${encodeURIComponent(fill(message.subject, values))}&body=${encodeURIComponent(body)}`
      : `sms:${phone.replace(/\s/g, '')}?body=${encodeURIComponent(body)}`;
  }
}
