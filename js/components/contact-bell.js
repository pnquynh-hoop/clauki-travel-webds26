/* contact-bell.js - kiểu bell của khối contact: bảng chuông cửa.
   Bên trái là bảng chuông như ở cửa nhà phố: hộp đèn báo mở cửa sáng theo giờ thật ở nơi đến (tắt khi ngoài giờ),
   biển số nhà, mỗi cách liên hệ (ways) là một nút chuông có nhãn dán. Bấm nút nào thì nút lún, đèn nhỏ cạnh nút sáng,
   màn hình bên phải "đổ chuông" một nhịp rồi hiện đúng thông tin của cách đó.
   Cách kind "message" mở khung soạn tin: gõ tới đâu, bong bóng tin nhắn trên màn hình điện thoại hiện tới đó,
   để khách thấy rõ trang chỉ soạn sẵn tin, không có máy chủ nhận thư. */
import { textEl, linkEl } from '../core/dom.js';
import { plateEl } from './plate.js';
import { KINDS, fill, toMinutes, nowMinutes } from './wl-contact.js';

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function el(tag, className, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children.filter(Boolean));
  return node;
}

// Link ra trang ngoài (bản đồ) mở tab mới để khách không rời trang liên hệ.
function actionEl(href, label, ghost) {
  const link = linkEl(href, label, ghost ? 'btn btn--ghost' : 'btn');
  if (link && href.startsWith('http')) {
    link.target = '_blank';
    link.rel = 'noopener';
  }
  return link;
}

function hoursOk(hours) {
  return !Number.isNaN(toMinutes(hours?.from)) && !Number.isNaN(toMinutes(hours?.to));
}

// Hộp đèn: chữ sáng khi đang mở, tắt khi ngoài giờ; dòng dưới là giờ hiện tại và câu báo của dữ liệu.
function neonEl(section) {
  const sign = el('span', 'bell__sign');
  const clock = el('span', 'bell__clock');
  const sub = el('span', 'bell__sub');
  const box = el('div', 'bell__neon', [sign, el('span', 'bell__line', [clock, sub])]);
  return { box, sign, clock, sub };
}

function stepsEl(directions) {
  const steps = (directions?.steps ?? []).map((step) => textEl('li', 'bell__step', step)).filter(Boolean);
  if (!steps.length) return null;
  return el('ol', 'bell__steps', steps);
}

export function renderBell(host, section) {
  const site = host.site ?? {};
  const contact = site.contact ?? {};
  const bell = section.bell ?? {};
  const tz = site.place?.timezone;
  const hasHours = hoursOk(section.hours) && section.labels;
  const isOpen = () => {
    const now = nowMinutes(tz);
    return now >= toMinutes(section.hours.from) && now < toMinutes(section.hours.to);
  };

  // Mỗi cách liên hệ thành một nút; cách không có giá trị (thiếu số, thiếu email) thì bỏ, trừ khung soạn tin.
  const ways = (section.ways ?? []).map((way) => {
    if (way.kind === 'message') return section.message && (contact.phone || contact.email) ? { way } : null;
    const kind = KINDS[way.kind] ?? {};
    const value = way.value ?? kind.value?.(contact);
    return value ? { way, value: String(value), href: way.href ?? kind.href?.(contact) } : null;
  }).filter(Boolean);

  const screen = el('div', 'bell__screen');
  screen.setAttribute('aria-live', 'polite');
  let ringTimer = 0;

  // Mỗi cách một màn hình. Gọi ngoài giờ thì báo không ai nghe và chỉ sang nút nhắn tin nếu có.
  const views = {
    message: (item) => composerEl(item.way, section, contact, site.brand?.name, bell),
    address: (item) => [
      textEl('p', 'bell__big', item.value),
      textEl('p', 'bell__text', item.way.text),
      stepsEl(section.directions),
      actionEl(section.directions?.link?.href ?? item.href, section.directions?.link?.label ?? item.way.action, true),
    ],
    phone: (item) => {
      const closed = hasHours && !isOpen();
      const message = ways.find((w) => w.way.kind === 'message');
      const jump = closed && message ? el('button', 'btn', [message.way.label]) : null;
      jump?.setAttribute('type', 'button');
      jump?.addEventListener('click', () => press(message));
      return [
        textEl('p', 'bell__big', item.value),
        textEl('p', 'bell__text', closed ? fill(bell.missed, section.hours) : item.way.text),
        closed ? jump : actionEl(item.href, item.way.action),
      ];
    },
    other: (item) => [
      textEl('p', 'bell__big', item.value),
      textEl('p', 'bell__text', item.way.text),
      actionEl(item.href, item.way.action),
    ],
  };

  const show = (item) => {
    const view = views[item.way.kind] ?? views.other;
    screen.replaceChildren(...[textEl('p', 'bell__tag', item.way.label), ...view(item)].filter(Boolean));
  };

  const keys = ways.map((item) => {
    const key = el('button', 'bell__key', [
      textEl('span', 'bell__key-label', item.way.label),
      el('span', 'bell__button'),
      el('span', 'bell__led'),
      textEl('span', 'bell__key-text', item.way.hint),
    ]);
    key.type = 'button';
    key.setAttribute('aria-pressed', 'false');
    key.addEventListener('click', () => press(item));
    item.key = key;
    return key;
  });

  // Đổ chuông một nhịp ngắn rồi mới hiện, như bấm chuông thật; khung soạn tin hiện ngay để khách gõ luôn.
  function press(item) {
    ways.forEach((w) => w.key.setAttribute('aria-pressed', String(w === item)));
    clearTimeout(ringTimer);
    if (reduce() || item.way.kind === 'message' || !bell.ringing) {
      show(item);
      return;
    }
    screen.replaceChildren(textEl('p', 'bell__tag', bell.ringing), el('span', 'bell__dots', [el('i'), el('i'), el('i')]));
    ringTimer = setTimeout(() => host.isConnected && show(item), 550);
  }

  const neon = hasHours ? neonEl(section) : null;
  let lastOpen = null;
  const tick = () => {
    if (!neon) return;
    const open = isOpen();
    const now = nowMinutes(tz);
    neon.clock.textContent = `${String(Math.floor(now / 60)).padStart(2, '0')}:${String(now % 60).padStart(2, '0')}`;
    neon.sign.textContent = open ? bell.open : bell.closed;
    neon.sub.textContent = fill(open ? section.labels.open : section.labels.closed, section.hours);
    // Đổi trạng thái thì cho đèn chớp lại như lúc mới bật.
    if (open !== lastOpen) {
      neon.box.classList.remove('is-open');
      void neon.box.offsetWidth;
      neon.box.classList.toggle('is-open', open);
      lastOpen = open;
    }
  };

  const keyGroup = keys.length ? el('div', 'bell__keys', keys) : null;
  keyGroup?.setAttribute('role', 'group');
  if (bell.keys) keyGroup?.setAttribute('aria-label', bell.keys);
  const panel = el('div', 'bell__panel', [
    el('span', 'bell__screws'),
    neon?.box,
    plateEl(section.plate, 'bell__plate'),
    keyGroup,
  ]);

  const head = el('div', 'contact__head', [
    textEl('p', 'contact__eyebrow', section.eyebrow),
    textEl('h2', 'contact__title', section.title),
    textEl('p', 'contact__lead', section.lead),
  ]);
  const inner = el('div', 'container', [head, el('div', 'bell__layout', [panel, ways.length ? screen : null])]);
  host.replaceChildren(inner);

  tick();
  const first = (hasHours && !isOpen() && ways.find((w) => w.way.kind === 'message')) || ways[0];
  if (first) {
    ways.forEach((w) => w.key.setAttribute('aria-pressed', String(w === first)));
    show(first);
  }
  return neon ? setInterval(tick, 30000) : 0;
}

// Khung soạn tin: hai ô bên trái, màn hình điện thoại bên phải có bong bóng tin nhắn đang soạn.
function composerEl(way, section, contact, brandName, bell) {
  const message = section.message;
  const errors = section.errors ?? {};
  const field = (key, label, tag) => {
    const control = document.createElement(tag);
    control.className = 'bell__input';
    control.name = key;
    control.id = `bell-${key}`;
    if (key === 'name') control.autocomplete = 'name';
    if (tag === 'textarea') {
      control.rows = 4;
      control.placeholder = message.placeholder ?? '';
    }
    const error = el('p', 'bell__error');
    error.id = `${control.id}-error`;
    error.hidden = true;
    control.setAttribute('aria-describedby', error.id);
    const labelEl = textEl('label', 'bell__label', label);
    labelEl?.setAttribute('for', control.id);
    return { key, control, error, wrap: el('div', 'bell__field', [labelEl, control, error]) };
  };
  const fields = [field('name', message.name, 'input'), field('text', message.text, 'textarea')];

  const bubble = el('div', 'bell__bubble');
  const thread = el('div', 'bell__thread', [bubble, textEl('span', 'bell__draft', bell.draft)]);
  const phone = el('div', 'bell__phone', [
    el('p', 'bell__to', [textEl('b', '', brandName), contact.phone ?? contact.email]),
    thread,
  ]);
  phone.setAttribute('aria-hidden', 'true');

  const values = () => Object.fromEntries(fields.map((f) => [f.key, f.control.value.trim()]));
  const update = () => {
    const v = values();
    const text = v.name || v.text ? fill(message.template, v) : '';
    bubble.classList.toggle('is-empty', !text);
    bubble.textContent = text || bell.empty || '';
  };
  fields.forEach((f) => f.control.addEventListener('input', update));
  update();

  const actions = el('div', 'bell__actions');
  const button = (value, label, className) => {
    if (!label) return;
    const b = el('button', className, [label]);
    b.type = 'submit';
    b.value = value;
    actions.append(b);
  };
  if (contact.phone) button('sms', message.sms, 'btn');
  if (contact.email) button('email', message.email, contact.phone ? 'btn btn--ghost' : 'btn');

  const form = el('form', 'bell__form', [...fields.map((f) => f.wrap), actions]);
  form.noValidate = true;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const empty = fields.filter((f) => !f.control.value.trim());
    fields.forEach((f) => {
      const msg = empty.includes(f) ? errors[f.key] ?? '' : '';
      f.error.textContent = msg;
      f.error.hidden = !msg;
      f.control.toggleAttribute('aria-invalid', Boolean(msg));
    });
    if (empty.length) {
      empty[0].control.focus();
      return;
    }
    const v = values();
    const body = fill(message.template, v) || v.text;
    const via = event.submitter?.value ?? (contact.phone ? 'sms' : 'email');
    window.location.href = via === 'email'
      ? `mailto:${contact.email}?subject=${encodeURIComponent(fill(message.subject, v))}&body=${encodeURIComponent(body)}`
      : `sms:${contact.phone.replace(/\s/g, '')}?body=${encodeURIComponent(body)}`;
  });

  return [textEl('p', 'bell__text', way.text), el('div', 'bell__compose', [form, phone])];
}
