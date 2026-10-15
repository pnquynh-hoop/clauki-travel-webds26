/* palette.js - phần Màu của tab Giao diện trong editor (#82): trên là khung chat nhờ AI gợi ý bảng màu sáng và tối,
   dưới là bảng màu chia hai nửa Sáng, Tối để tự chỉnh từng màu, kèm kiểm tương phản AA của từng chế độ.
   Màu tối lưu thành biến --dark-<tên> trong theme của nháp (theme-mode.js của trang dùng chúng khi khách bật chế độ tối);
   tải theme.css thì các biến này nằm trong :root như mọi biến khác.
   Có màu tối mà dữ liệu chưa có header.modeLabel thì thêm luôn, để nút sáng, tối hiện trên header của trang.
   AI trả về các thao tác nhỏ dạng JSON Lines như tab AI; thao tác nào cũng qua cùng bộ kiểm với sửa tay (tên biến được
   phép, mã hex, tương phản AA của cả chế độ), bấm Đồng ý mới áp, một lần Hoàn tác là bỏ hết. */
import { COLORS, CONTRAST } from './manifest.js';
import { contrastRatio, AA } from './contrast.js';
import { darkName } from '../theme-mode.js';
import { streamLines, cleanText } from '../ai/gemini.js';
import { micButton } from '../ai/speech.js';

const HEX = /^#[0-9a-f]{6}$/i;
const MODE_LABEL = 'Chế độ tối';
const EXAMPLES = [
  'Gợi ý bảng màu tối hợp với thương hiệu',
  'Chế độ tối dịu mắt, giữ màu nút',
  'Cả hai chế độ theo tông xanh biển',
  'Chế độ sáng ấm hơn, chữ vẫn dễ đọc',
];
const PLACEHOLDER = 'Mô tả không khí và màu muốn có. Nói rõ chế độ (sáng, tối hay cả hai) và màu nào muốn giữ. '
  + 'Ví dụ: gợi ý bảng màu tối cho buổi tối, nền xanh đêm, chữ trắng ngà, giữ nút vàng của thương hiệu.';

let api = null;
let text = '';
let proposal = null;
let busy = false;
let out = null;

/* ---------- Đọc màu ---------- */

const light = (name, vars = api.state.theme.vars) => vars[name] ?? api.state.base[name] ?? '';
const darkOnly = (name, vars = api.state.theme.vars) => vars[darkName(name)] ?? api.state.base[darkName(name)] ?? '';
// Màu tối của một biến; biến chưa có bản tối thì trang giữ màu sáng, nên kiểm tương phản cũng dùng màu sáng.
const dark = (name, vars) => darkOnly(name, vars) || light(name, vars);
const hasDark = (vars) => Boolean(darkOnly('--color-bg', vars));

function checks(get) {
  return CONTRAST.map(([fg, bg, label]) => {
    const r = contrastRatio(get(fg), get(bg));
    return { label, r, ok: r === null || r >= AA };
  });
}

/* ---------- Pha màu tối từ màu sáng ---------- */

const toRgb = (hex) => hex.slice(1).match(/../g).map((x) => parseInt(x, 16));
const toHex = (rgb) => `#${rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, t) => toHex(toRgb(a).map((v, i) => v + (toRgb(b)[i] - v) * t));

// Pha dần màu về phía trắng tới khi đủ tương phản với các nền cho trước.
function lift(color, backgrounds) {
  for (let t = 0; t <= 1; t += 0.05) {
    const next = mix(color, '#ffffff', t);
    if (backgrounds.every((bg) => (contrastRatio(next, bg) ?? 0) >= AA)) return next;
  }
  return '#ffffff';
}

// Bảng tối khởi đầu: nền lấy từ màu chữ (thường gần đen) pha chút màu nhấn, chữ lấy từ nền sáng, nút giữ màu thương hiệu,
// chữ phụ và màu nhấn sáng dần tới khi đạt AA. Chỉ là điểm xuất phát để chỉnh tiếp bằng tay hoặc nhờ AI.
function deriveDark() {
  const pick = (name, fallback) => (HEX.test(light(name)) ? light(name) : fallback);
  const ink = pick('--color-ink', '#111114');
  const paper = pick('--color-bg', '#f4f4f5');
  const accent = pick('--color-accent', '#3b82f6');
  const bg = mix(mix(ink, '#000000', 0.25), accent, 0.06);
  const surface = mix(bg, '#ffffff', 0.07);
  const text = (contrastRatio(paper, bg) ?? 0) >= AA ? paper : '#f4f4f5';
  return {
    '--color-bg': bg,
    '--color-surface': surface,
    '--color-ink': text,
    '--color-muted': lift(mix(text, bg, 0.35), [bg, surface]),
    '--color-accent': lift(accent, [bg, surface]),
    '--color-primary': pick('--color-primary', accent),
    '--color-on-primary': pick('--color-on-primary', '#111114'),
  };
}

/* ---------- Ghi màu ---------- */

function ensureModeLabel() {
  const content = api.state.content;
  if (!hasDark() || content.header?.modeLabel) return;
  content.header = { ...(content.header ?? {}), modeLabel: MODE_LABEL };
}

function put(name, value) {
  const vars = api.state.theme.vars;
  if (value === api.state.base[name]) delete vars[name];
  else vars[name] = value;
}

function setColor(name, value, label) {
  api.commit(label, () => {
    put(name, value);
    ensureModeLabel();
  });
}

// Xem trước trong khung theo chế độ; trang trong khung tự nhớ lựa chọn (theme-mode.js).
function preview(mode) {
  api.frameDoc()?.dispatchEvent(new CustomEvent('wl:set-mode', { detail: mode }));
  api.state.previewMode = mode;
  api.rerender();
}

function createDark() {
  const values = deriveDark();
  api.commit('Tạo bảng màu tối từ màu sáng', () => {
    Object.entries(values).forEach(([name, value]) => put(darkName(name), value));
    ensureModeLabel();
  });
  preview('dark');
}

/* ---------- AI gợi ý màu ---------- */

const ALLOWED = new Map(COLORS.flatMap(([name, label]) => [[name, { name, label, mode: 'light' }], [darkName(name), { name, label, mode: 'dark' }]]));

const SYSTEM = `Bạn là nhà thiết kế màu cho website của một thương hiệu du lịch. Người dùng nhờ gợi ý bảng màu cho chế độ sáng, chế độ tối hoặc cả hai.
Chỉ trả về JSON Lines: mỗi dòng một object JSON, không có chữ nào khác, không dùng khối mã.
{"op":"say","text":"một câu tiếng Việt nói ngắn ý tưởng của bảng màu"}
{"op":"color","name":"--color-bg","value":"#f2eee4"}  màu chế độ sáng
{"op":"color","name":"--dark-color-bg","value":"#121318"}  màu chế độ tối (tên có thêm dark-)
Tên được phép: ${[...ALLOWED.keys()].join(', ')}.
Ý nghĩa: ${COLORS.map(([n, l]) => `${n} là ${l}`).join('; ')}.
Quy tắc:
- Mỗi chế độ phải đạt tương phản tối thiểu 4.5 cho các cặp: ${CONTRAST.map(([a, b]) => `${a} trên ${b}`).join(', ')}.
- Chế độ tối: nền tối, chữ sáng; màu nhấn sáng hơn bản sáng để đủ tương phản; nút có thể giữ màu thương hiệu.
- Giữ nhận diện thương hiệu; chỉ trả các màu cần đổi; mã hex đủ 6 số.
- Người dùng chỉ nói một chế độ thì chỉ đổi chế độ đó. Câu say không dùng dấu chấm giữa hay gạch dài.`;

function context() {
  const pick = (get) => Object.fromEntries(COLORS.map(([name]) => [name, get(name) || null]));
  return {
    brand: api.state.content.brand?.name,
    light: pick((n) => light(n)),
    dark: hasDark() ? pick((n) => darkOnly(n)) : 'chưa có bảng màu tối',
  };
}

function plan(op) {
  if (op?.op === 'say') return { say: cleanText(op.text, 200) };
  if (op?.op !== 'color') return null;
  const meta = ALLOWED.get(op.name);
  if (!meta || !HEX.test(op.value ?? '')) return { ok: false, reason: `Màu không hợp lệ (${String(op.name)}), đã bỏ qua.` };
  const from = meta.mode === 'dark' ? darkOnly(meta.name) : light(meta.name);
  const to = op.value.toLowerCase();
  // Trùng màu đang dùng: không cần đổi, chỉ đếm để báo cho người dùng biết bảng màu đã hợp.
  if (from.toLowerCase() === to) return { same: true };
  return { ok: true, key: op.name, mode: meta.mode, label: meta.label, from, to };
}

// Thử áp các màu lên bản sao; chế độ nào chưa đạt AA thì bỏ các màu của chế độ đó kèm lý do.
function checkProposal(items) {
  const vars = { ...api.state.theme.vars };
  items.filter((p) => p.ok).forEach((p) => { vars[p.key] = p.to; });
  [['light', (n) => light(n, vars)], ['dark', (n) => dark(n, vars)]].forEach(([mode, get]) => {
    if (mode === 'dark' && !hasDark(vars)) return;
    const fails = checks(get).filter((c) => !c.ok);
    if (!fails.length) return;
    items.filter((p) => p.ok && p.mode === mode).forEach((p) => {
      p.ok = false;
      p.reason = `Chế độ ${mode === 'dark' ? 'tối' : 'sáng'} chưa đạt tương phản AA: ${fails.map((f) => f.label.toLowerCase()).join(', ')}.`;
    });
  });
}

async function send(value) {
  if (busy || !value.trim()) return;
  busy = true;
  text = value;
  proposal = { say: '', items: [], same: 0, done: false, error: '' };
  renderOut();
  const prompt = `Yêu cầu: ${value.trim()}\n\nBảng màu hiện tại (JSON):\n${JSON.stringify(context())}`;
  try {
    await streamLines(SYSTEM, prompt, (line) => {
      let op;
      try {
        op = JSON.parse(line.replace(/^```(json)?|```$/g, '').trim());
      } catch {
        return;
      }
      const item = plan(op);
      if (!item) return;
      if (item.say !== undefined) proposal.say = item.say;
      else if (item.same) proposal.same += 1;
      else if (proposal.items.length < 20) proposal.items.push(item);
      renderOut();
    });
    checkProposal(proposal.items);
  } catch (err) {
    proposal.error = err.message;
  } finally {
    proposal.done = true;
    busy = false;
    renderOut();
  }
}

function accept() {
  const ok = proposal.items.filter((p) => p.ok);
  if (!ok.length) return;
  const toDark = ok.some((p) => p.mode === 'dark');
  api.commit(`AI màu: ${text.trim().slice(0, 40)}`, () => {
    ok.forEach((p) => put(p.key, p.to));
    ensureModeLabel();
  });
  proposal = { say: `Đã áp ${ok.length} màu. Bấm Hoàn tác nếu muốn bỏ.`, items: [], done: true, applied: true };
  preview(toDark ? 'dark' : 'light');
}

/* ---------- Giao diện ---------- */

function swatch(color) {
  return api.h('i', { class: 'ed-swatch', style: `background:${HEX.test(color) ? color : 'transparent'}` });
}

function renderOut() {
  if (!out || !proposal) return;
  const { h } = api;
  const { say, items, same, done, error, applied } = proposal;
  const ok = items.filter((p) => p.ok);
  const group = (mode, title) => {
    const rows = items.filter((p) => p.mode === mode);
    if (!rows.length) return null;
    return h('div', {}, h('p', { class: 'ed-palette__group', text: title }), h('ul', { class: 'ed-diff' }, rows.map((p) => (p.ok
      // Chỉ hiện màu được gợi ý; màu đang dùng đã thấy ở bảng màu bên dưới.
      ? h('li', {}, h('strong', { text: p.label }), h('span', { class: 'ed-diff__to' }, swatch(p.to), p.to))
      : h('li', { class: 'is-skip' }, h('strong', { text: `${p.label}: bỏ qua` }), h('span', { text: p.reason }))))));
  };
  const skipped = items.filter((p) => !p.mode);
  out.replaceChildren(...[
    say ? h('p', { class: applied ? 'ed-ok' : 'ed-ai__say', text: say }) : null,
    group('light', 'Chế độ sáng'),
    group('dark', 'Chế độ tối'),
    skipped.length ? h('ul', { class: 'ed-diff' }, skipped.map((p) => h('li', { class: 'is-skip' }, h('span', { text: p.reason })))) : null,
    !done ? h('p', { class: 'ed-hint', text: 'AI đang gợi ý...' }) : null,
    error ? h('p', { class: 'ed-err', text: error }) : null,
    done && ok.length ? h('div', { class: 'ed-row' },
      h('button', { type: 'button', class: 'ed-btn', onclick: accept, text: `Đồng ý (${ok.length} màu)` }),
      h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', onclick: () => { proposal = null; out.replaceChildren(); }, text: 'Bỏ' })) : null,
    done && !applied && !ok.length && !error ? noteEl(items.length, same) : null,
  ].filter(Boolean));
}

// Không có màu nào để áp: nói rõ vì sao. Màu gợi ý trùng màu đang dùng là chuyện tốt (bảng màu đã hợp), không phải lỗi.
function noteEl(rejected, same) {
  const { h } = api;
  if (rejected) return h('p', { class: 'ed-err', text: 'Các màu AI gợi ý chưa áp được, lý do ghi ở từng dòng phía trên. Bấm Gợi ý màu để thử lại.' });
  if (same) return h('p', { class: 'ed-hint', text: 'Bảng màu hiện tại đã đúng như AI gợi ý, không cần đổi màu nào.' });
  return h('p', { class: 'ed-err', text: 'AI chưa gợi ý màu nào. Thử viết cụ thể hơn, ví dụ: nền tối hơn, chữ trắng ngà, giữ nút vàng.' });
}

function fill(area, example) {
  area.value = example;
  text = example;
  area.focus();
  area.setSelectionRange(example.length, example.length);
}

function aiEl() {
  const { h } = api;
  const area = h('textarea', { class: 'ed-input', rows: '4', id: 'ed-palette-ai', placeholder: PLACEHOLDER });
  area.value = text;
  area.addEventListener('input', () => { text = area.value; });
  area.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(area.value);
  });
  out = h('div', { class: 'ed-ai__out', 'aria-live': 'polite' });
  renderOut();
  return h('div', { class: 'ed-palette__ai' },
    h('label', { class: 'ed-field', for: 'ed-palette-ai' }, h('span', { text: 'Nhờ AI gợi ý màu sáng, tối' })),
    area,
    h('div', { class: 'ed-row' },
      h('button', { type: 'button', class: 'ed-btn', disabled: busy, onclick: () => send(area.value), text: busy ? 'Đang gợi ý...' : 'Gợi ý màu' }),
      micButton(h, area)),
    // Câu mẫu chỉ điền vào ô để sửa thêm, chưa gửi: người dùng bấm Gợi ý màu khi đã viết xong.
    h('div', { class: 'ed-chips' }, EXAMPLES.map((example) => h('button', { type: 'button', onclick: () => fill(area, example), text: example }))),
    out);
}

function colorInput(name, label, value, mode) {
  const { h } = api;
  const key = mode === 'dark' ? darkName(name) : name;
  const input = h('input', { type: 'color', value: HEX.test(value) ? value : '#000000', 'aria-label': `${label}, chế độ ${mode === 'dark' ? 'tối' : 'sáng'}`, 'data-ed-key': `c:${key}` });
  input.addEventListener('change', () => {
    setColor(key, input.value, `Đổi ${label.toLowerCase()} (${mode === 'dark' ? 'tối' : 'sáng'})`);
    if (mode !== api.state.previewMode) preview(mode);
  });
  const changed = api.state.theme.vars[key] !== undefined;
  return h('label', { class: `ed-palette__cell${changed ? ' is-changed' : ''}${value ? '' : ' is-empty'}` }, input,
    h('small', { text: value || 'chưa có' }));
}

function checksEl(title, list) {
  const { h } = api;
  return h('div', {}, h('p', { class: 'ed-palette__group', text: title }),
    h('ul', { class: 'ed-checks', 'aria-live': 'polite' }, list.map((x) => h('li', { class: x.ok ? 'ok' : 'bad' },
      h('span', { text: x.label }),
      h('b', { text: x.r === null ? 'không đo được' : `${x.r.toFixed(2)} ${x.ok ? 'đạt AA' : 'chưa đạt, cần từ 4,5'}` })))));
}

// api: h, state, commit, frameDoc, rerender. state.previewMode nhớ chế độ đang xem trong khung.
export function paletteEl(options) {
  api = options;
  const { h, state } = api;
  state.previewMode ??= 'light';
  const withDark = hasDark();
  const seg = (mode, label) => h('button', { type: 'button', class: 'ed-seg', 'aria-pressed': String(state.previewMode === mode), onclick: () => preview(mode), text: label });
  const rows = COLORS.map(([name, label]) => h('div', { class: 'ed-palette__row' },
    h('span', { class: 'ed-palette__name', text: label }),
    colorInput(name, label, light(name), 'light'),
    withDark ? colorInput(name, label, darkOnly(name), 'dark') : null));
  return h('div', { class: 'ed-palette' },
    aiEl(),
    h('div', { class: 'ed-row ed-palette__view' }, h('span', { class: 'ed-hint', text: 'Xem trước:' }), seg('light', 'Sáng'), seg('dark', 'Tối')),
    h('div', { class: `ed-palette__grid${withDark ? '' : ' is-light-only'}` },
      h('div', { class: 'ed-palette__row ed-palette__head' }, h('span', {}), h('span', { text: 'Sáng' }), withDark ? h('span', { text: 'Tối' }) : null),
      rows),
    withDark ? null : h('div', {},
      h('p', { class: 'ed-hint', text: 'Thương hiệu chưa có bảng màu tối. Tạo từ màu sáng rồi chỉnh tiếp, hoặc nhờ AI gợi ý ở trên.' }),
      h('button', { type: 'button', class: 'ed-btn', onclick: createDark, text: 'Tạo bảng màu tối' })),
    checksEl('Tương phản chế độ sáng', checks((n) => light(n))),
    withDark ? checksEl('Tương phản chế độ tối', checks((n) => dark(n))) : null);
}
