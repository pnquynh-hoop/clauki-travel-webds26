/* custom-trip-request.js - form gửi yêu cầu tour riêng của <wl-custom-trip>: ngày đi, giờ bắt đầu, số khách, họ tên,
   số điện thoại, tạm tính; gửi thì kiểm từng ô, báo lỗi ngay dưới ô, hợp lệ thì soạn sẵn tin nhắn kèm nút gửi SMS,
   gọi, chép. Tách khỏi wl-custom-trip.js cho file chính ngắn; mọi chữ vẫn lấy từ section qua trip.text(). */
import { textEl, groupEl, telHref } from '../core/dom.js';

function validPhone(text) {
  return /^(0|\+84)\d{9}$/.test(text.replace(/[\s.]/g, ''));
}

// Ngày hôm nay theo múi giờ của nơi chốn (dạng 2026-10-18), cộng thêm vài ngày nếu cần.
function isoDay(timezone, addDays = 0) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
  const day = new Date(`${today}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + addDays);
  return day.toISOString().slice(0, 10);
}

function viDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Một ô nhập: nhãn, ô, dòng báo lỗi ngay dưới ô. aria-describedby nối ô với dòng lỗi cho trình đọc màn hình.
function fieldEl(id, label, control) {
  const labelEl = document.createElement('label');
  labelEl.htmlFor = id;
  labelEl.textContent = label ?? '';
  control.id = id;
  control.className = 'custom-trip__input';
  const error = document.createElement('p');
  error.className = 'custom-trip__error';
  error.id = `${id}-error`;
  error.hidden = true;
  control.setAttribute('aria-describedby', error.id);
  return { field: groupEl('custom-trip__field', [labelEl, control, error]), control, error };
}

function showError(ref, message, invalid) {
  ref.error.textContent = message ?? '';
  ref.error.hidden = !message;
  if (invalid) ref.control.setAttribute('aria-invalid', 'true');
  else ref.control.removeAttribute('aria-invalid');
}

function input(type, attrs = {}) {
  const el = document.createElement('input');
  el.type = type;
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
}

// Các giờ bắt đầu cho chọn, ví dụ 05:00 tới 11:00 mỗi 30 phút; giờ mặc định của section luôn có trong danh sách.
function startOptions(trip) {
  const range = trip._data.startTimes ?? {};
  const from = trip.minutes(range.from) ?? trip._start;
  const to = trip.minutes(range.to) ?? trip._start;
  const step = range.step > 0 ? range.step : 30;
  const times = new Set([trip._start]);
  for (let m = from; m <= to; m += step) times.add(m);
  return [...times].sort((a, b) => a - b);
}

function messageEl(trip, refs) {
  const m = trip._data.message ?? {};
  const hotline = trip.site?.contact?.phone;
  refs.title = textEl('h4', 'custom-trip__done-title', m.title) ?? document.createElement('h4');
  refs.title.tabIndex = -1;
  refs.draft = document.createElement('p');
  refs.draft.className = 'custom-trip__draft';
  refs.sms = hotline && m.sms ? textEl('a', 'btn', m.sms) : null;
  const callText = trip.fill(m.call, { phone: hotline });
  const call = hotline && callText ? textEl('a', 'btn btn--ghost', callText) : null;
  if (call) call.href = telHref(hotline);

  // Chép tin nhắn vào bộ nhớ tạm; trình duyệt chặn thì chọn sẵn đoạn chữ để khách tự chép.
  const copy = m.copy ? textEl('button', 'btn btn--ghost', m.copy) : null;
  copy?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(refs.draft.textContent);
      copy.textContent = m.copied ?? m.copy;
      setTimeout(() => { copy.textContent = m.copy; }, 2000);
    } catch {
      getSelection().selectAllChildren(refs.draft);
    }
  });
  if (copy) copy.type = 'button';

  const box = groupEl('custom-trip__done', [refs.title, refs.draft, groupEl('custom-trip__done-actions', [refs.sms, call, copy])]);
  box.hidden = true;
  return box;
}

// Kiểm từng ô; ô sai đầu tiên nhận focus để người dùng sửa ngay. Trả về true khi mọi ô hợp lệ.
function check(trip, refs) {
  const errors = trip._data.errors ?? {};
  const today = isoDay(trip.site?.place?.timezone);
  // Đúng sai tính riêng, không dựa vào câu báo lỗi: thương hiệu quên khai errors thì ô sai vẫn bị chặn
  // (ô được đánh dấu aria-invalid, chỉ thiếu dòng chữ giải thích).
  const results = [
    [refs.date, Boolean(refs.date.control.value) && refs.date.control.value >= today, errors.date],
    [refs.name, Boolean(refs.name.control.value.trim()), errors.name],
    [refs.phone, validPhone(refs.phone.control.value), errors.phone],
  ];
  results.forEach(([ref, ok, message]) => showError(ref, ok ? null : message, !ok));
  refs.legsError.textContent = trip._plan.legs.length ? '' : (errors.legs ?? '');
  const firstBad = results.find(([, ok]) => !ok);
  firstBad?.[0].control.focus();
  return !firstBad && trip._plan.legs.length > 0;
}

function submit(trip, refs) {
  if (!check(trip, refs)) return;
  const { legs, minutes, total } = trip.totals();
  const name = refs.name.control.value.trim();
  const phone = refs.phone.control.value.trim();
  const text = trip.fill(trip._data.message?.template, {
    name,
    phone,
    guests: trip._plan.guests,
    date: viDate(refs.date.control.value),
    start: trip.clock(trip._start),
    duration: trip.duration(minutes),
    legs: legs.map((leg) => leg.name).join(', '),
    total: trip.money(total),
  });
  refs.draft.textContent = text ?? '';
  const digits = trip.site?.contact?.phone?.replace(/\s/g, '');
  if (refs.sms) refs.sms.href = `sms:${digits}?body=${encodeURIComponent(refs.draft.textContent)}`;
  refs.done.hidden = false;
  refs.title.focus();
}

// Dựng form; trip.refresh() gọi lại khi chuyến đổi để ẩn tin nhắn cũ (không còn khớp chuyến mới).
export function requestEl(trip) {
  const tz = trip.site?.place?.timezone;
  const refs = {};
  const prefix = trip.id || 'custom-trip';

  refs.date = fieldEl(`${prefix}-date`, trip.text('date'), input('date', { min: isoDay(tz), value: isoDay(tz, 3) }));
  const select = document.createElement('select');
  startOptions(trip).forEach((m) => {
    const option = new Option(trip.clock(m), String(m), false, m === trip._start);
    select.append(option);
  });
  // Đổi giờ bắt đầu thì giờ của từng chặng, giờ về và cảnh báo về muộn tính lại ngay.
  select.addEventListener('change', () => {
    trip._start = Number(select.value);
    trip.refresh();
  });
  refs.start = fieldEl(`${prefix}-start`, trip.text('start'), select);
  refs.name = fieldEl(`${prefix}-name`, trip.text('name'), input('text', { autocomplete: 'name' }));
  refs.phone = fieldEl(`${prefix}-phone`, trip.text('phone'), input('tel', { autocomplete: 'tel', inputmode: 'tel', placeholder: trip.text('phoneExample') ?? '' }));

  refs.legsError = document.createElement('p');
  refs.legsError.className = 'custom-trip__error';
  refs.legsError.setAttribute('role', 'alert');

  const send = textEl('button', 'btn', trip.site?.cta?.label) ?? document.createElement('button');
  send.type = 'submit';

  const form = document.createElement('form');
  form.className = 'custom-trip__form';
  form.noValidate = true;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submit(trip, refs);
  });
  form.append(...[
    groupEl('custom-trip__row', [refs.date.field, refs.start.field, trip.guestsEl()]),
    groupEl('custom-trip__row', [refs.name.field, refs.phone.field]),
    trip._sum,
    refs.legsError,
    send,
  ].filter(Boolean));

  refs.done = messageEl(trip, refs);
  trip._done = refs.done;
  return groupEl('custom-trip__request', [form, refs.done]);
}
