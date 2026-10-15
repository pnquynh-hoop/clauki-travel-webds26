/* wl-reviews.js - khách nói gì về chuyến đi. Kiểu postcard: mỗi đánh giá là một tấm bưu thiếp,
   bên trái là lời nhắn (điểm, lời kể, người gửi), bên phải là tem (con số và tên nơi khách nhắc tới)
   và dấu bưu điện (ngày chuyến đi). Cuộn tới thì các tấm rơi xuống bàn lần lượt.
   Kiểu notes (SighGone): bức tường giấy note dán băng keo, mỗi tờ có lời kể, người gửi và (tuỳ chọn) một thước đo
   "trước chuyến, sau chuyến" vẽ bằng các vòng tròn nhỏ; cuộn tới thì các tờ dán lên lần lượt. */
import { textEl } from '../dom.js';

// Con số trên tem: số thì viết theo kiểu Việt Nam (1.400), chữ thì giữ nguyên.
const formatValue = (value) => (typeof value === 'number' ? value.toLocaleString('vi-VN') : value);

// Điểm: "5/5" in đậm rồi tới chữ đi kèm (ví dụ "điểm"). Không có điểm thì bỏ dòng này.
function scoreEl(rating, max, label) {
  if (!Number.isFinite(rating)) return null;
  const score = document.createElement('p');
  score.className = 'reviews__score';
  score.append(textEl('strong', null, `${rating}/${max}`));
  if (label) score.append(` ${label}`);
  return score;
}

// Người gửi: tên in đậm, sau đó là nơi ở và đi cùng ai, phần nào thiếu thì bỏ.
function fromEl(item) {
  if (!item.name) return null;
  const from = document.createElement('p');
  from.className = 'reviews__from';
  from.append(textEl('strong', null, item.name));
  const where = [item.from, item.note].filter(Boolean).join(' · ');
  if (where) from.append(`, ${where}`);
  return from;
}

// Tem: con số lớn, đơn vị nhỏ, tên nơi in hoa bên dưới.
function stampEl(stamp) {
  if (!stamp || (stamp.value == null && !stamp.label)) return null;
  const el = document.createElement('p');
  el.className = 'reviews__stamp';
  el.append(...[
    stamp.value != null ? textEl('span', 'reviews__stamp-value', String(formatValue(stamp.value))) : null,
    textEl('span', 'reviews__stamp-unit', stamp.unit),
    textEl('span', 'reviews__stamp-label', stamp.label),
  ].filter(Boolean));
  return el;
}

// Dấu bưu điện: vòng tròn nghiêng đè lên góc tem, ghi ngày chuyến đi.
function markEl(date, label) {
  if (!date) return null;
  const mark = document.createElement('p');
  mark.className = 'reviews__mark';
  mark.append(...[textEl('span', null, label), textEl('span', 'reviews__date', date)].filter(Boolean));
  return mark;
}

function cardEl(item, index, section) {
  const li = document.createElement('li');
  li.className = 'reviews__item';
  li.style.setProperty('--i', String(index));

  const msg = document.createElement('div');
  msg.className = 'reviews__msg';
  msg.append(...[
    scoreEl(item.rating, section.ratingMax ?? 5, section.scoreLabel),
    textEl('blockquote', 'reviews__text', item.text),
    fromEl(item),
  ].filter(Boolean));

  // Ba dòng kẻ địa chỉ chỉ để giống bưu thiếp, trình đọc màn hình bỏ qua.
  const lines = document.createElement('div');
  lines.className = 'reviews__lines';
  lines.setAttribute('aria-hidden', 'true');
  lines.append(document.createElement('span'), document.createElement('span'), document.createElement('span'));

  const side = document.createElement('div');
  side.className = 'reviews__side';
  side.append(...[stampEl(item.stamp), markEl(item.date, section.dateLabel), lines].filter(Boolean));

  const card = document.createElement('article');
  card.className = 'reviews__card';
  card.append(msg, side);
  li.append(card);
  return li;
}

// Thước đo của kiểu notes: `meter` (số) là số vòng tròn nhỏ "trước chuyến"; section.meter ghi chữ: before (trước), after (sau),
// label (cho trình đọc màn hình, có {n}). Thiếu số hoặc thiếu section.meter thì bỏ cả dòng.
function meterEl(item, section) {
  const meter = section.meter;
  if (!meter || !Number.isFinite(item.meter) || item.meter < 1) return null;
  const puffs = document.createElement('span');
  puffs.className = 'reviews__puffs';
  if (meter.label) puffs.setAttribute('aria-label', meter.label.replace('{n}', item.meter));
  puffs.append(...Array.from({ length: Math.min(item.meter, 9) }, () => document.createElement('i')));
  const before = document.createElement('span');
  before.append(...[meter.before ? `${meter.before} ` : null, puffs].filter(Boolean));
  const line = document.createElement('p');
  line.className = 'reviews__meter';
  line.append(before, ...[textEl('span', 'reviews__after', meter.after)].filter(Boolean));
  return line;
}

// Một tờ note: lời kể, người gửi (tên, nơi ở, đi cùng ai), thước đo. Màu giấy và độ nghiêng do CSS xoay vòng theo thứ tự.
function noteEl(item, index, section) {
  const li = document.createElement('li');
  li.className = 'reviews__sticky';
  li.style.setProperty('--i', String(index));
  const figure = document.createElement('figure');
  figure.className = 'reviews__note';
  const where = [item.from, item.note].filter(Boolean).join(', ');
  const who = item.name ? textEl('figcaption', 'reviews__who', item.name) : null;
  if (who && where) who.append(textEl('small', null, where));
  figure.append(...[textEl('blockquote', 'reviews__text', item.text), who, meterEl(item, section)].filter(Boolean));
  li.append(figure);
  return li;
}

export class WlReviews extends HTMLElement {
  disconnectedCallback() {
    this._io?.disconnect();
  }

  set data(section) {
    this._data = section;
    this.render();
  }

  render() {
    const section = this._data;
    this.className = `reviews reviews--${section.variant ?? 'postcard'}`;
    const items = (section.items ?? []).filter((item) => item.text);

    const notes = section.variant === 'notes';
    const list = document.createElement('ul');
    list.className = notes ? 'reviews__wall' : 'reviews__list';
    list.append(...items.map((item, i) => (notes ? noteEl(item, i, section) : cardEl(item, i, section))));

    const inner = document.createElement('div');
    inner.className = 'container';
    inner.append(...[
      textEl('p', 'reviews__eyebrow', section.eyebrow),
      textEl('h2', 'reviews__title', section.title),
      textEl('p', 'reviews__lead', section.lead),
      items.length ? list : null,
    ].filter(Boolean));
    this.replaceChildren(inner);

    // Các tấm rơi xuống khi danh sách vào màn hình, chỉ một lần. Vẽ lại (đổi thương hiệu) thì theo dõi danh sách mới.
    this._io?.disconnect();
    this._io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      list.classList.add('is-in');
      this._io.disconnect();
    }, { threshold: 0.2 });
    this._io.observe(list);
  }
}
