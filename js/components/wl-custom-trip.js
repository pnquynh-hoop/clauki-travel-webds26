/* wl-custom-trip.js - tự ghép tour riêng: khách chọn chặng lẻ trong kho, xếp thứ tự, xem tạm giờ và giá cho cả nhóm.
   Kho chặng (catalog.legs: tên, phương tiện, số phút, giá) khai một lần trong danh mục (AGENTS.md mục 5), khối chỉ đọc lại.
   Section ghi lộ trình gợi ý (presets), phí đi riêng (surcharge), giờ bắt đầu, ngưỡng cảnh báo và mẫu chữ (labels). */
import { textEl, groupEl } from '../core/dom.js';
import { requestEl } from './custom-trip-request.js';
// Ngày, tiền định dạng theo ngôn ngữ đang hiện (core.js đặt <html lang>).
import { pageLocale } from '../core/i18n.js';

// Thay {tên} trong mẫu chữ bằng giá trị. Mẫu thiếu thì trả về null để bỏ phần đó, không hiện chữ giữ chỗ.
function fill(template, values) {
  if (!template) return null;
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
}

// "07:00" thành 420 phút tính từ nửa đêm, để cộng giờ các chặng cho dễ.
function toMinutes(time) {
  const [h, m] = String(time ?? '').split(':').map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
}

// 420 thành "07:00"; qua nửa đêm thì quay về 00:00 như đồng hồ.
function clock(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// Chặng thiếu tên, số phút hay giá thì bỏ, vì không cộng được giờ và giá.
function isLeg(leg) {
  return Boolean(leg?.id && leg.name && leg.minutes > 0 && Number.isFinite(leg.price));
}

// Nút có thể không có chữ sẵn (chữ ghép từ nhiều thẻ con), nên không dùng textEl vốn trả về null khi chữ trống.
function button(className, text, onClick) {
  const el = document.createElement('button');
  el.className = className;
  if (text) el.textContent = text;
  el.type = 'button';
  el.addEventListener('click', onClick);
  return el;
}

export class WlCustomTrip extends HTMLElement {
  set data(section) {
    this._data = section;
    this.render();
  }

  get labels() {
    return this._data.labels ?? {};
  }

  // Mấy hàm nhỏ để custom-trip-request.js (form) dùng chung cách ghép chữ, đọc giờ với file này.
  fill(template, values) {
    return fill(template, values);
  }

  text(key, values = {}) {
    return fill(this.labels[key], values);
  }

  minutes(time) {
    return toMinutes(time);
  }

  clock(minutes) {
    return clock(minutes);
  }

  leg(id) {
    return this._legs.find((leg) => leg.id === id);
  }

  // 195 phút thành "3 giờ 15 phút"; chữ "giờ", "phút" lấy từ labels để thương hiệu khác đổi được.
  duration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return [h ? fill(this.labels.hours, { n: h }) : null, m ? fill(this.labels.minutes, { n: m }) : null].filter(Boolean).join(' ');
  }

  money(amount) {
    return `${amount.toLocaleString(pageLocale())} ${this.site.catalog.currency ?? ''}`.trim();
  }

  vehicle(id) {
    return this.site.catalog.vehicles?.[id];
  }

  // Bấm lộ trình gợi ý thì thay cả chuyến bằng các chặng của lộ trình đó; id không có trong kho thì bỏ qua.
  // Lộ trình không có chặng nào trong kho (brand chưa khai legs, id ghi sai) thì không hiện, kẻo bấm vào không ra gì.
  presetsEl() {
    const presets = (this._data.presets ?? []).filter((p) => p.name && p.legs?.some((id) => this.leg(id)));
    const buttons = presets.map((preset) => {
      const el = button('custom-trip__preset', null, () => {
        this._plan.legs = preset.legs.filter((id) => this.leg(id));
        this.refresh();
      });
      el.append(textEl('strong', '', preset.name), textEl('small', '', preset.note) ?? '');
      return el;
    });
    if (!buttons.length) return null;
    return groupEl('custom-trip__presets', [textEl('p', 'custom-trip__label', this.labels.presets), groupEl('custom-trip__preset-list', buttons)]);
  }

  // Kho chặng: mỗi chặng là một nút, bấm là thêm vào cuối chuyến; viền trái màu của phương tiện.
  libraryEl() {
    const items = this._legs.map((leg) => {
      const vehicle = this.vehicle(leg.vehicle);
      const meta = [vehicle?.label, this.duration(leg.minutes), leg.area].filter(Boolean).join(', ');
      const el = button('custom-trip__chunk', null, () => {
        this._plan.legs.push(leg.id);
        this.refresh();
        // Gỡ rồi gắn lại class để dấu cộng nảy lên mỗi lần bấm, kể cả bấm liên tiếp.
        el.classList.remove('is-added');
        void el.offsetWidth;
        el.classList.add('is-added');
      });
      el.setAttribute('aria-label', fill(this.labels.add, { name: leg.name }) ?? leg.name);
      if (vehicle?.color) el.style.setProperty('--vc', vehicle.color);
      const plus = textEl('span', 'custom-trip__plus', '+');
      plus.setAttribute('aria-hidden', 'true');
      el.append(textEl('span', 'custom-trip__chunk-name', leg.name), textEl('span', 'custom-trip__chunk-meta', meta), plus);
      return el;
    });
    return groupEl('custom-trip__library', [textEl('h3', 'custom-trip__heading', this.labels.library), groupEl('custom-trip__chunks', items)]);
  }

  // Một dòng trong chuyến: giờ đi, giờ xong, tên, phương tiện, và ba nút Lên, Xuống, Bỏ.
  legEl(leg, index, from) {
    const name = leg.name;
    const tools = [
      ['up', this.labels.up, this.labels.upLabel, index === 0],
      ['down', this.labels.down, this.labels.downLabel, index === this._plan.legs.length - 1],
    ].map(([act, text, aria, disabled]) => {
      const el = button('custom-trip__tool', text, () => this.move(index, act === 'up' ? -1 : 1));
      el.dataset.act = act;
      el.disabled = disabled;
      el.setAttribute('aria-label', fill(aria, { name }) ?? text);
      return el;
    });
    const remove = button('custom-trip__tool custom-trip__tool--remove', this.labels.remove, () => this.remove(index));
    remove.dataset.act = 'remove';
    remove.setAttribute('aria-label', fill(this.labels.removeLabel, { name }) ?? this.labels.remove);

    const li = document.createElement('li');
    li.className = 'custom-trip__leg';
    const color = this.vehicle(leg.vehicle)?.color;
    if (color) li.style.setProperty('--vc', color);
    const time = textEl('span', 'custom-trip__leg-time', clock(from));
    time.append(textEl('small', '', clock(from + leg.minutes)));
    const meta = [this.vehicle(leg.vehicle)?.label, this.duration(leg.minutes)].filter(Boolean).join(', ');
    const title = textEl('span', 'custom-trip__leg-name', name);
    title.append(textEl('small', '', meta) ?? '');
    li.append(time, title, groupEl('custom-trip__tools', [...tools, remove]));
    return li;
  }

  move(index, step) {
    const legs = this._plan.legs;
    [legs[index], legs[index + step]] = [legs[index + step], legs[index]];
    this.refresh({ act: step < 0 ? 'up' : 'down', index: index + step });
  }

  remove(index) {
    this._plan.legs.splice(index, 1);
    this.refresh({ act: 'remove', index });
  }

  // Danh sách dựng lại sau mỗi lần bấm nên nút vừa bấm biến mất: đưa focus về nút tương ứng ở vị trí mới,
  // để người dùng bàn phím bấm tiếp được mà không phải Tab lại từ đầu.
  restoreFocus(focus) {
    const rows = this._list.querySelectorAll('.custom-trip__leg');
    const row = rows[Math.min(focus.index, rows.length - 1)];
    if (!row) {
      this._planTitle.focus();
      return;
    }
    const wanted = row.querySelector(`[data-act="${focus.act}"]`);
    const target = wanted && !wanted.disabled ? wanted : row.querySelector('button:not(:disabled)');
    target?.focus();
  }

  guestsEl() {
    const g = this._data.guests ?? {};
    const step = (delta) => {
      this._plan.guests = Math.min(g.max ?? 20, Math.max(g.min ?? 1, this._plan.guests + delta));
      this.refresh();
      // Chạm giới hạn thì nút vừa bấm bị khoá và mất focus: chuyển focus sang nút còn lại cho người dùng bàn phím.
      const pressed = delta < 0 ? this._less : this._more;
      if (pressed.disabled) (delta < 0 ? this._more : this._less).focus();
    };
    this._less = button('custom-trip__step', '-', () => step(-1));
    this._less.setAttribute('aria-label', this.labels.guestsLess ?? '-');
    this._more = button('custom-trip__step', '+', () => step(1));
    this._more.setAttribute('aria-label', this.labels.guestsMore ?? '+');
    this._guestsOut = document.createElement('output');
    this._guestsOut.className = 'custom-trip__guests-n';
    const box = groupEl('custom-trip__guests', [
      textEl('span', '', this.labels.guests),
      groupEl('custom-trip__stepper', [this._less, this._guestsOut, this._more]),
    ]);
    box.setAttribute('role', 'group');
    if (this.labels.guests) box.setAttribute('aria-label', this.labels.guests);
    return box;
  }

  row(className, left, right) {
    return groupEl(className, [textEl('span', '', left), textEl('span', '', right)]);
  }

  // Tổng giờ, giá: giá một khách là tổng giá các chặng cộng phí đi riêng, làm tròn tới nghìn đồng cho dễ đọc.
  totals() {
    const legs = this._plan.legs.map((id) => this.leg(id));
    const minutes = legs.reduce((sum, leg) => sum + leg.minutes, 0);
    const base = legs.reduce((sum, leg) => sum + leg.price, 0);
    const perGuest = Math.round((base * (1 + (this._data.surcharge ?? 0))) / 1000) * 1000;
    return { legs, minutes, perGuest, total: perGuest * this._plan.guests };
  }

  warnings(minutes, end) {
    const max = this._data.maxHours;
    const endBy = toMinutes(this._data.endBy);
    return [
      max && minutes > max * 60 ? fill(this.labels.tooLong, { duration: this.duration(minutes), max }) : null,
      endBy !== null && end > endBy ? fill(this.labels.tooLate, { end: clock(end), endBy: clock(endBy) }) : null,
    ].filter(Boolean).join(' ');
  }

  // Trục giờ của thước: từ dayStart tới endBy (ví dụ 05:00 tới 23:00), mỗi hai tiếng một vạch.
  rulerEl() {
    this._track = null;
    this._dayFrom = toMinutes(this._data.dayStart) ?? 5 * 60;
    this._dayTo = toMinutes(this._data.endBy) ?? 23 * 60;
    if (this._dayTo <= this._dayFrom) return null;
    const ticks = document.createElement('div');
    ticks.className = 'custom-trip__ticks';
    for (let m = this._dayFrom; m <= this._dayTo; m += 120) {
      const tick = textEl('span', '', this.text('tick', { n: Math.floor(m / 60) }));
      if (!tick) continue;
      tick.style.setProperty('--at', `${((m - this._dayFrom) / (this._dayTo - this._dayFrom)) * 100}%`);
      ticks.append(tick);
    }
    this._track = document.createElement('div');
    this._track.className = 'custom-trip__track';
    // Số giờ trên trục, để CSS kẻ đúng một ô mỗi giờ dù thương hiệu chọn khung giờ khác.
    this._track.style.setProperty('--hours', String((this._dayTo - this._dayFrom) / 60));
    // Thước chỉ để nhìn nhanh; giờ từng chặng đã ghi bằng chữ trong danh sách nên trình đọc màn hình bỏ qua.
    const ruler = groupEl('custom-trip__ruler', [ticks, this._track]);
    ruler.setAttribute('aria-hidden', 'true');
    return ruler;
  }

  // Trên đường giờ mảnh: mỗi chặng là một đoạn màu phương tiện dài theo số phút, đầu mỗi chặng là một chấm
  // đánh số thứ tự dừng, cuối chuyến một chấm đặc là giờ về. Đoạn tràn qua endBy thì kẻ sọc.
  drawRuler(legs) {
    if (!this._track) return;
    const span = this._dayTo - this._dayFrom;
    // Giữ mọi vị trí trong khoảng của thước: giờ bắt đầu sớm hơn đầu thước hay chuyến kéo quá cuối thước
    // thì đoạn màu dừng ở mép, không tràn ra ngoài thẻ.
    const inside = (minutes) => Math.min(this._dayTo, Math.max(this._dayFrom, minutes));
    const pos = (minutes) => `${((inside(minutes) - this._dayFrom) / span) * 100}%`;
    let at = this._start;
    const parts = legs.flatMap((leg, index) => {
      const color = this.vehicle(leg.vehicle)?.color;
      const block = document.createElement('span');
      block.className = at + leg.minutes > this._dayTo ? 'custom-trip__block is-over' : 'custom-trip__block';
      block.style.left = pos(at);
      block.style.width = `${((inside(at + leg.minutes) - inside(at)) / span) * 100}%`;
      const stop = textEl('span', 'custom-trip__stop', String(index + 1));
      stop.style.left = pos(at);
      if (color) {
        block.style.setProperty('--vc', color);
        stop.style.setProperty('--vc', color);
      }
      at += leg.minutes;
      return [block, stop];
    });
    if (legs.length) {
      const end = document.createElement('span');
      end.className = 'custom-trip__stop custom-trip__stop--end';
      end.style.left = pos(at);
      parts.push(end);
    }
    this._track.replaceChildren(...parts);
  }

  // Huy hiệu theo số phương tiện khác nhau trong chuyến: chọn mức cao nhất mà chuyến đạt.
  drawBadge(legs) {
    if (!this._badge) return;
    const count = new Set(legs.map((leg) => leg.vehicle)).size;
    const badge = [...(this._data.badges ?? [])].sort((a, b) => b.min - a.min).find((b) => count >= b.min);
    this._badge.replaceChildren(...(badge && count ? [this.text('badge', { n: count }) ?? '', ' ', textEl('strong', '', badge.label) ?? ''] : []));
  }

  refresh(focus) {
    const { legs, minutes, perGuest, total } = this.totals();
    const start = this._start;
    this.drawRuler(legs);
    this.drawBadge(legs);
    // Chuyến vừa đổi thì tin nhắn đã soạn không còn khớp: ẩn đi, khách bấm gửi lại để soạn bản mới.
    if (this._done) this._done.hidden = true;
    let at = start;
    const rows = legs.map((leg, index) => {
      const li = this.legEl(leg, index, at);
      at += leg.minutes;
      return li;
    });
    const empty = textEl('li', 'custom-trip__leg custom-trip__leg--empty', this.labels.empty);
    this._list.replaceChildren(...(rows.length ? rows : [empty].filter(Boolean)));
    this._warn.textContent = legs.length ? this.warnings(minutes, start + minutes) : '';

    const g = this._data.guests ?? {};
    this._guestsOut.textContent = String(this._plan.guests);
    this._less.disabled = this._plan.guests <= (g.min ?? 1);
    this._more.disabled = this._plan.guests >= (g.max ?? 20);

    this._sum.replaceChildren(...(legs.length ? [
      this.row('custom-trip__sum-row', fill(this.labels.summary, { n: legs.length, duration: this.duration(minutes) }), fill(this.labels.span, { from: clock(start), to: clock(start + minutes) })),
      this.row('custom-trip__sum-row', this.labels.perGuest, this.money(perGuest)),
      this.row('custom-trip__sum-row custom-trip__sum-row--total', fill(this.labels.total, { n: this._plan.guests }), this.money(total)),
    ].filter(Boolean) : []));
    if (focus) this.restoreFocus(focus);
  }

  render() {
    const section = this._data;
    this.className = section.variant ? `custom-trip custom-trip--${section.variant}` : 'custom-trip';
    this._legs = (this.site?.catalog?.legs ?? []).filter(isLeg);
    this._start = toMinutes(section.start) ?? 7 * 60;
    const preset = (section.presets ?? []).find((p) => p.default);
    const guests = section.guests ?? {};
    this._plan = { legs: (preset?.legs ?? []).filter((id) => this.leg(id)), guests: guests.default ?? guests.min ?? 2 };

    const head = groupEl('custom-trip__head', [
      textEl('p', 'custom-trip__eyebrow', section.eyebrow),
      textEl('h2', 'custom-trip__title', section.title),
      textEl('p', 'custom-trip__lead', section.lead),
      this.presetsEl(),
    ]);
    // Thương hiệu chưa khai kho chặng thì chỉ hiện phần đầu, không dựng khung ghép trống.
    if (!this._legs.length) {
      this.replaceChildren(...[groupEl('custom-trip__inner container', [head])].filter(Boolean));
      return;
    }

    this._planTitle = textEl('h3', 'custom-trip__heading', this.labels.plan) ?? document.createElement('h3');
    this._planTitle.tabIndex = -1;
    this._list = document.createElement('ol');
    this._list.className = 'custom-trip__list';
    this._warn = document.createElement('p');
    this._warn.className = 'custom-trip__warn';
    this._warn.setAttribute('role', 'status');
    this._sum = document.createElement('div');
    this._sum.className = 'custom-trip__sum';
    this._sum.setAttribute('aria-live', 'polite');
    this._badge = document.createElement('p');
    this._badge.className = 'custom-trip__badge';
    const top = groupEl('custom-trip__plan-top', [this._planTitle, this._badge]);
    // Form tách file riêng; nó đặt số khách và phần tạm tính (this._sum) vào trong form, cạnh ngày giờ.
    const plan = groupEl('custom-trip__plan', [top, this.rulerEl(), this._list, this._warn, requestEl(this)]);

    this.replaceChildren(groupEl('custom-trip__inner container', [head, groupEl('custom-trip__layout', [this.libraryEl(), plan])]));
    this.refresh();
  }
}
