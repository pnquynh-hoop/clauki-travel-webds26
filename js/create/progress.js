/* progress.js - tiến trình AI dựng website ở /tao: một danh sách các bước dọc (đọc mô tả, chọn khung và màu, ghép bố cục,
   viết chữ, tìm ảnh, hoàn tất), mỗi bước có trạng thái chờ, đang chạy, xong, bỏ qua, lỗi, kèm chi tiết và số giây.
   Viết chữ và tìm ảnh chạy song song nên có thể cùng sáng một lúc. Trình đọc màn hình chỉ nghe một câu tóm tắt mỗi khi một bước
   đổi trạng thái (không đọc từng dòng chữ AI viết). */
import { h } from '../core/dom.js';

export const STEPS = [
  { key: 'profile', title: 'Đọc mô tả', wait: 'Tên, nơi chốn, giá, giọng văn' },
  { key: 'style', title: 'Chọn khung, màu, chữ', wait: 'Khung trang hợp loại hình, bảng màu theo nơi chốn' },
  { key: 'layout', title: 'Ghép bố cục', wait: 'Khối nào, kiểu nào, thứ tự ra sao' },
  { key: 'write', title: 'Viết chữ', wait: 'Viết lại mọi chữ của khung cho nơi này' },
  { key: 'photos', title: 'Tìm ảnh thật', wait: 'Ảnh có giấy phép đúng nơi chốn' },
  { key: 'done', title: 'Hoàn tất', wait: 'Xem trước bên cạnh, rồi xuất bản' },
  { key: 'english', title: 'Dịch tiếng Anh', wait: 'Chạy nền sau khi xong, thêm nút VI, EN cho site' },
];

const LABEL = { wait: 'chờ', run: 'đang làm', done: 'xong', skip: 'bỏ qua', fail: 'lỗi' };

export function createProgress() {
  const items = new Map();
  const live = h('p', { class: 'tao-sr', role: 'status', 'aria-live': 'polite' });
  const list = h('ol', { class: 'tao-progress__list' });
  const el = h('section', { class: 'tao-progress', 'aria-label': 'Tiến trình tạo website', hidden: true }, list, live);
  let t0 = 0;
  let timer = 0;

  for (const [i, step] of STEPS.entries()) {
    const time = h('span', { class: 'tao-progress__time' });
    const detail = h('div', { class: 'tao-progress__detail' });
    const state = h('span', { class: 'tao-sr' });
    const li = h('li', { class: 'tao-progress__step', 'data-state': 'wait' },
      h('span', { class: 'tao-progress__mark', 'aria-hidden': 'true' }, h('span', { text: String(i + 1) })),
      h('div', { class: 'tao-progress__body' },
        h('p', { class: 'tao-progress__title' }, step.title, state, time),
        detail));
    items.set(step.key, { li, time, detail, state, started: 0, step });
    list.append(li);
  }

  const sec = (from) => ((performance.now() - from) / 1000).toFixed(1);
  // Bước đang chạy có đồng hồ chạy; xong thì đứng ở số giây bước đó mất.
  const tick = () => {
    for (const item of items.values()) if (item.li.dataset.state === 'run') item.time.textContent = `${sec(item.started)} giây`;
  };

  function set(key, state, detail) {
    const item = items.get(key);
    if (!item) return;
    const prev = item.li.dataset.state;
    if (state === 'run' && prev !== 'run') item.started = performance.now();
    // Bước xong tức thì (ghép bố cục ngay sau hồ sơ) thì không ghi 0.0 giây.
    if (state !== 'run' && prev === 'run') item.time.textContent = sec(item.started) >= 0.1 ? `${sec(item.started)} giây` : '';
    if (state === 'wait' || state === 'skip') item.time.textContent = '';
    item.li.dataset.state = state;
    item.state.textContent = `, ${LABEL[state]}`;
    if (detail !== undefined) item.detail.replaceChildren(...[].concat(detail).filter(Boolean).map((d) => (typeof d === 'string' ? h('p', { text: d }) : d)));
    if (prev !== state) live.textContent = `${item.step.title}: ${LABEL[state]}.`;
  }

  // Chỉ đổi chi tiết (ví dụ số chỗ đã viết), không báo cho trình đọc màn hình.
  function note(key, detail) {
    const item = items.get(key);
    if (item) item.detail.replaceChildren(...[].concat(detail).filter(Boolean).map((d) => (typeof d === 'string' ? h('p', { text: d }) : d)));
  }

  function start() {
    t0 = performance.now();
    el.hidden = false;
    for (const step of STEPS) set(step.key, 'wait', step.wait);
    live.textContent = '';
    clearInterval(timer);
    timer = setInterval(tick, 200);
    set('profile', 'run');
  }

  // Lỗi giữa chừng: bước đang chạy thành lỗi kèm câu báo, bước chưa tới để nguyên.
  function fail(message) {
    for (const [key, item] of items) if (item.li.dataset.state === 'run') set(key, 'fail', message);
    stop();
  }

  function stop() {
    clearInterval(timer);
    timer = 0;
  }

  const state = (key) => items.get(key)?.li.dataset.state;
  const total = () => sec(t0);

  return { el, start, set, note, fail, stop, state, total };
}

// Mấy ô màu của bảng màu mới, để thấy ngay AI chọn màu gì.
export function swatches(vars = {}) {
  const names = [['--color-primary', 'Màu nút'], ['--color-accent', 'Màu nhấn'], ['--color-bg', 'Nền'], ['--color-ink', 'Chữ']];
  const dots = names.filter(([name]) => vars[name]).map(([name, label]) => h('span', { class: 'tao-swatch', title: `${label} ${vars[name]}`, style: `--swatch: ${vars[name]}` }));
  return dots.length ? h('span', { class: 'tao-swatches', 'aria-hidden': 'true' }, dots) : null;
}

// Thanh nhỏ trong bước viết chữ.
export function meter(done, total) {
  return h('span', { class: 'tao-meter', 'aria-hidden': 'true' }, h('span', { style: `width: ${total ? Math.round((done / total) * 100) : 0}%` }));
}
