/* palette.js - phần Màu của tab Giao diện trong editor (#82): trên là khung chat nhờ AI gợi ý bảng màu sáng và tối,
   dưới là bảng màu chia hai nửa Sáng, Tối để tự chỉnh từng màu, kèm kiểm tương phản AA của từng chế độ.
   Màu tối lưu thành biến --dark-<tên> trong theme của nháp (theme-mode.js của trang dùng chúng khi khách bật chế độ tối);
   tải theme.css thì các biến này nằm trong :root như mọi biến khác.
   Có màu tối mà dữ liệu chưa có header.modeLabel thì thêm luôn, để nút sáng, tối hiện trên header của trang.
   AI trả về các thao tác nhỏ dạng JSON Lines như tab AI (#194): dòng scope ghi cách AI hiểu câu nhờ (chế độ, mức đổi, màu giữ),
   rồi các màu, rồi dòng tự kiểm tương phản. Code kiểm câu trả lời theo dòng scope, lỗi tự sửa được thì tự sửa, không thì hỏi lại
   AI một lần; cặp chưa đạt AA thì code chỉ sửa màu của cặp đó cho đạt, không bỏ màu nào và không bắt người dùng tự phối màu.
   Bấm Đồng ý mới áp, một lần Hoàn tác là bỏ hết. Bộ kiểm độ bền với nhiều kiểu câu nhờ: palette-eval.js. */
import { COLORS, CONTRAST } from './manifest.js';
import { contrastRatio, AA } from './contrast.js';
import { darkName } from '../core/theme-mode.js';
import { streamLines, cleanText, usageMark, modelsSince } from '../ai/gemini.js';
import { paletteSystem, paletteRetry, requestPrompt } from '../ai/prompts/editor.js';
import { micButton } from '../ai/speech.js';
import { readLog, addTurn, markLast, clearLog, contextText, historyEl } from './chat-log.js';

const HEX = /^#[0-9a-f]{6}$/i;
const MODE_LABEL = 'Chế độ tối';
const EXAMPLES = [
  'Tự phối màu giúp tôi',
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
let historyBox = null;
// Lịch sử khung chat màu tách riêng khỏi tab AI (#201).
const KIND = 'palette';

function renderHistory() {
  if (!historyBox) return;
  const id = api.state.id;
  historyBox.replaceChildren(...[historyEl(api.h, readLog(id, KIND), {
    onClear: () => { clearLog(id, KIND); renderHistory(); },
    onPick: (value) => { const area = document.getElementById('ed-palette-ai'); if (area) fill(area, value); },
  })].filter(Boolean));
}

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

// Tương phản thấp nhất của một màu với các nền; cặp không đo được (màu không phải mã hex) coi như đạt, giống bảng kiểm bên dưới.
const minRatio = (color, backgrounds) => Math.min(...backgrounds.map((bg) => contrastRatio(color, bg) ?? Infinity));

// Pha dần màu về phía đen (nền sáng) hay phía trắng (nền tối) tới khi đủ tương phản với mọi nền cho trước.
// Tới đen, trắng vẫn chưa đạt (thường do hai nền một sáng một tối) thì trả null.
function toPass(color, backgrounds) {
  if (!HEX.test(color)) return null;
  const pole = minRatio('#000000', backgrounds) >= minRatio('#ffffff', backgrounds) ? '#000000' : '#ffffff';
  for (let step = 0; step <= 20; step += 1) {
    const next = mix(color, pole, step / 20);
    if (minRatio(next, backgrounds) >= AA) return next;
  }
  return null;
}

// Bảng tối khởi đầu: nền lấy từ màu chữ (thường gần đen) pha chút màu nhấn, chữ lấy từ nền sáng, nút giữ màu thương hiệu,
// chữ phụ và màu nhấn sáng dần tới khi đạt AA. Chỉ là điểm xuất phát để chỉnh tiếp bằng tay hoặc nhờ AI.
function deriveDark(vars = api.state.theme.vars) {
  const pick = (name, fallback) => (HEX.test(light(name, vars)) ? light(name, vars) : fallback);
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
    '--color-muted': toPass(mix(text, bg, 0.35), [bg, surface]) ?? '#ffffff',
    '--color-accent': toPass(accent, [bg, surface]) ?? '#ffffff',
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

// Lời nhắc nêu nguyên tắc chứ không liệt kê từng kiểu câu nhờ, để chịu được câu mơ hồ, sai chính tả, tiếng Anh, lạc đề.
// AI ghi cách nó hiểu câu nhờ ra dòng scope; code kiểm các điều đo được trên dòng đó (problemsOf, keepInScope) nên dev biết
// chính xác khi nào kết quả bị lọc hay AI bị hỏi lại.
// Làm sạch câu nhờ trước khi gửi AI: bỏ ký tự điều khiển, gộp khoảng trắng, cắt còn 600 ký tự (câu nhờ thường vài chục chữ;
// dán cả trang chữ vào chỉ tốn lượt AI và dễ lẫn lệnh lạ).
const cleanInput = (value) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600);

const SYSTEM = paletteSystem({ allowed: [...ALLOWED.keys()], colors: COLORS, contrast: CONTRAST });

// Tỉ số tương phản hiện tại của từng cặp ở một chế độ (chế độ tối chưa có thì rỗng): gửi cho AI để biết bảng màu đã đạt chưa
// trước khi đổi, và để code biết cặp nào đang chưa đạt khi lọc trường hợp fix.
function pairs(mode) {
  if (mode === 'dark' && !hasDark()) return [];
  const get = (n) => (mode === 'dark' ? dark(n) : light(n));
  return CONTRAST.map(([fg, bg]) => {
    const r = contrastRatio(get(fg), get(bg));
    return { fg, bg, r, ok: r === null || r >= AA };
  });
}

function context() {
  const pick = (get) => Object.fromEntries(COLORS.map(([name]) => [name, get(name) || null]));
  const report = (mode) => pairs(mode).map((c) => ({ pair: `${c.fg} trên ${c.bg}`, ratio: c.r === null ? null : Number(c.r.toFixed(2)), pass: c.ok }));
  return {
    brand: api.state.content.brand?.name,
    light: pick((n) => light(n)),
    dark: hasDark() ? pick((n) => darkOnly(n)) : null,
    hasDarkMode: hasDark(),
    contrast: { light: report('light'), dark: hasDark() ? report('dark') : null },
  };
}

/* ---------- Dòng scope: AI hiểu câu nhờ thế nào ---------- */

const MODES = ['light', 'dark'];
const CHANGES = { none: 'Không đổi màu', fix: 'Sửa cho dễ đọc', tweak: 'Chỉnh vài màu', new: 'Bảng màu mới', ask: 'Cần hỏi thêm' };
// Mức đổi không áp màu nào: chỉ trả lời, hoặc hỏi lại người dùng khi câu nhờ chưa đủ thông tin.
const NO_COLOR = ['none', 'ask'];
// Hỏi lại rồi vẫn thiếu dòng scope thì coi như chỉnh vài màu ở mọi chế độ, tức không lọc thêm gì.
const ANY_SCOPE = { modes: MODES, change: 'tweak', keep: [], target: '' };

// Chuẩn hoá dòng scope. Muốn chế độ tối mà thương hiệu chưa có thì phải dựng bảng màu tối, nên không thể là none hay fix.
function readScope(op) {
  const modes = (Array.isArray(op.modes) ? op.modes : []).filter((m) => MODES.includes(m));
  const keep = (Array.isArray(op.keep) ? op.keep : []).filter((k) => ALLOWED.has(k));
  const scope = { modes: modes.length ? modes : MODES, change: CHANGES[op.change] ? op.change : 'tweak', keep, target: cleanText(op.target ?? '', 120) };
  if (scope.modes.includes('dark') && !hasDark() && (scope.change === 'none' || scope.change === 'fix')) scope.change = 'new';
  return scope;
}

const kept = (scope, p) => scope.keep.includes(p.key) || scope.keep.includes(p.name);

// Lọc màu AI trả theo đúng dòng scope của nó: bỏ màu của chế độ không được chọn và màu người dùng bảo giữ; none, ask thì không đổi gì;
// fix thì chỉ giữ màu chữ của cặp đang chưa đạt.
function keepInScope(items, scope) {
  return items.filter((p) => scope.modes.includes(p.mode) && !kept(scope, p) && !NO_COLOR.includes(scope.change)
    && (scope.change !== 'fix' || pairs(p.mode).some((c) => !c.ok && c.fg === p.name)));
}

const modeNames = (modes) => modes.map((m) => (m === 'dark' ? 'tối' : 'sáng')).join(' và ');

/* ---------- Kiểm câu trả lời, hỏi lại khi cần ---------- */

// Khoảng cách màu theo mắt người (CIE76 trên không gian Lab): khoảng 2 là vừa nhận ra, từ 20 là thấy rõ hai màu khác nhau.
function toLab(hex) {
  const lin = toRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const xyz = [[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]]
    .map((row) => row.reduce((sum, k, i) => sum + k * lin[i], 0));
  const [fx, fy, fz] = [xyz[0] / 0.95047, xyz[1], xyz[2] / 1.08883].map((t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116));
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const deltaE = (a, b) => Math.hypot(...toLab(a).map((v, i) => v - toLab(b)[i]));

// Màu dễ thấy nhất của trang để đo "khác rõ" khi change là new: màu nút, người dùng bảo giữ thì màu nhấn, rồi nền trang.
const VISIBLE = ['--color-primary', '--color-accent', '--color-bg'];
const NEW_MIN = 20;

// Những lỗi code không tự sửa được nên phải hỏi lại AI: thiếu dòng scope; muốn đổi mà không có màu nào; bảng màu mới gần như
// không khác bảng cũ. Lỗi khác (sai chế độ, đổi màu bảo giữ, khó đọc) thì code tự lọc, tự chỉnh, không cần hỏi lại.
function problemsOf({ scope, items, same }) {
  if (!scope) return ['Thiếu dòng scope ở đầu câu trả lời.'];
  const inScope = keepInScope(items, scope);
  if ((scope.change === 'tweak' || scope.change === 'new') && !inScope.length && !same) {
    return [`change là ${scope.change} nhưng không có dòng color nào hợp lệ trong modes.`];
  }
  if (scope.change !== 'new') return [];
  return scope.modes.flatMap((mode) => {
    if (mode === 'dark' && !hasDark()) return [];
    const name = VISIBLE.find((n) => !kept(scope, { name: n, key: keyOf(n, mode) }));
    const before = name && (mode === 'dark' ? dark(name) : light(name));
    if (!HEX.test(before ?? '')) return [];
    const after = inScope.find((p) => p.key === keyOf(name, mode))?.to ?? before;
    const d = deltaE(before, after);
    return d >= NEW_MIN ? [] : [`change là new nhưng ${LABELS.get(name).toLowerCase()} chế độ ${mode === 'dark' ? 'tối' : 'sáng'} chỉ khác màu cũ ${Math.round(d)} đơn vị Lab (cần từ ${NEW_MIN} để người dùng thấy rõ trang đã đổi).`];
  });
}

// Dòng check chỉ để AI tự soát tỉ số trước khi chốt màu; code vẫn tự đo lại khi kiểm, nên không đọc tỉ số AI ghi.
// Tên biến lạ hay mã màu sai là lỗi của AI, người dùng không sửa được: bỏ qua lặng lẽ.
function plan(op) {
  if (op?.op === 'scope') return { scope: readScope(op) };
  if (op?.op === 'say') return { say: cleanText(op.text, 200) };
  if (op?.op !== 'color') return null;
  const meta = ALLOWED.get(op.name);
  if (!meta || !HEX.test(op.value ?? '')) return null;
  const from = meta.mode === 'dark' ? darkOnly(meta.name) : light(meta.name);
  const to = op.value.toLowerCase();
  // Trùng màu đang dùng: không cần đổi, chỉ đếm để báo cho người dùng biết bảng màu đã hợp.
  if (from.toLowerCase() === to) return { same: true, key: op.name };
  return { key: op.name, name: meta.name, mode: meta.mode, label: meta.label, from, to, ai: to };
}

// AI sửa lại màu sau khi tự kiểm thì dòng sau thay dòng trước cùng tên; sửa về đúng màu đang dùng thì bỏ dòng trước.
function addItem(items, item) {
  const i = items.findIndex((p) => p.key === item.key);
  if (item.same) {
    if (i >= 0) items.splice(i, 1);
  } else if (i >= 0) items[i] = item;
  else if (items.length < 20) items.push(item);
}

/* ---------- Tự chỉnh cho dễ đọc (#194) ---------- */

// Người dùng không rành phối màu nên không bắt họ tự sửa: cặp nào chưa đạt AA thì code chỉ sửa màu của cặp đó, không bỏ màu nào.

// Mỗi màu chữ cùng các nền nó phải đọc được, gom từ CONTRAST: chữ, chữ phụ, màu nhấn trên nền trang và nền thẻ; chữ trên nút trên nền nút.
const TEXTS = [...new Set(CONTRAST.map(([fg]) => fg))].map((fg) => [fg, CONTRAST.filter(([f]) => f === fg).map(([, bg]) => bg)]);
const LABELS = new Map(COLORS);
// Chữ, chữ phụ là màu trung tính nên không cần giữ sắc AI chọn.
const NEUTRAL = ['--color-ink', '--color-muted'];
const keyOf = (name, mode) => (mode === 'dark' ? darkName(name) : name);
// Màu sáng: chữ đen đọc rõ trên nó hơn chữ trắng.
const isLight = (color) => (contrastRatio(color, '#000000') ?? 0) >= (contrastRatio(color, '#ffffff') ?? 0);

function draftVars(items) {
  const vars = { ...api.state.theme.vars };
  items.forEach((p) => { vars[p.key] = p.to; });
  return vars;
}

// Ghi màu đã chỉnh vào bản sao và vào đề xuất. Màu AI gợi ý thì sửa ngay trên dòng đó (màu gốc giữ ở p.ai để báo);
// màu AI không đổi thì thêm một dòng, auto ghi lý do: 'read' cho dễ đọc, 'dark' để có chế độ tối.
function setFixed(items, vars, name, mode, value, auto) {
  const key = keyOf(name, mode);
  vars[key] = value;
  const item = items.find((p) => p.key === key);
  if (item) item.to = value;
  else items.push({ auto, key, name, mode, label: LABELS.get(name), from: mode === 'dark' ? darkOnly(name) : light(name), to: value });
}

// Nền thẻ một phía sáng tối, nền trang phía kia thì không màu chữ nào đọc được trên cả hai: dựng lại nền thẻ từ nền trang,
// sáng hơn nền trang một chút như nút Tạo bảng màu tối. Nền trang là phần lớn của trang nên làm chuẩn.
function fixSurface(items, vars, mode, get) {
  const bg = get('--color-bg');
  const surface = get('--color-surface');
  if (!HEX.test(bg) || !HEX.test(surface) || isLight(bg) === isLight(surface)) return;
  setFixed(items, vars, '--color-surface', mode, mix(bg, '#ffffff', isLight(bg) ? 0.7 : 0.07), 'read');
}

// Chữ chưa đủ tương phản thì kéo đậm hay nhạt dần tới khi đạt; màu nhấn, chữ trên nút giữ sắc AI chọn. Chữ, chữ phụ cùng phía
// sáng tối với nền (chữ sáng trên nền sáng, thường do AI nhầm chế độ) thì dựng lại từ nền trang, vì kéo màu đó chỉ ra một màu
// xám vừa đủ AA làm chữ cả trang nhạt. Hai nền đã cùng phía nên kéo tới đen hay trắng là luôn đạt.
function fixTexts(items, vars, mode, get) {
  const bg = get('--color-bg');
  TEXTS.forEach(([fg, bgs]) => {
    const backs = bgs.map(get);
    const value = get(fg);
    if (minRatio(value, backs) >= AA) return;
    const flipped = NEUTRAL.includes(fg) && HEX.test(bg) && backs.every((b) => isLight(b) === isLight(value));
    const start = flipped ? mix(bg, isLight(bg) ? '#000000' : '#ffffff', fg === '--color-ink' ? 0.9 : 0.6) : value;
    const next = toPass(start, backs);
    if (next) setFixed(items, vars, fg, mode, next, 'read');
  });
}

function fixMode(items, vars, mode) {
  const get = (name) => (mode === 'dark' ? dark(name, vars) : light(name, vars));
  fixSurface(items, vars, mode, get);
  fixTexts(items, vars, mode, get);
}

// AI gợi ý màu tối mà thương hiệu chưa có chế độ tối (chưa có nền tối) thì màu đó không dùng tới được: dựng bảng màu tối như nút
// Tạo bảng màu tối rồi giữ màu AI đã gợi ý lên trên.
function ensureDark(items, vars) {
  if (hasDark(vars) || !items.some((p) => p.mode === 'dark')) return;
  Object.entries(deriveDark(vars)).forEach(([name, value]) => {
    if (!items.some((p) => p.key === darkName(name))) setFixed(items, vars, name, 'dark', value, 'dark');
  });
}

// Thử áp các màu lên bản sao rồi chỉnh các chế độ đã chọn; chế độ không được chọn thì để nguyên, kể cả khi đang chưa đạt.
// Chế độ sáng làm trước vì chế độ tối mượn màu sáng của biến chưa có bản tối.
function settle(items, modes) {
  const vars = draftVars(items);
  if (modes.includes('light')) fixMode(items, vars, 'light');
  if (!modes.includes('dark')) return;
  ensureDark(items, vars);
  if (hasDark(vars)) fixMode(items, vars, 'dark');
}

// Gọi AI một lượt và đọc các dòng thành đề xuất; onUpdate để giao diện hiện dần trong lúc AI trả lời.
async function askOnce(prompt, onUpdate) {
  const result = { say: '', items: [], same: 0, scope: null, lines: [] };
  await streamLines(SYSTEM, prompt, (line) => {
    result.lines.push(line);
    let op;
    try {
      op = JSON.parse(line.replace(/^```(json)?|```$/g, '').trim());
    } catch {
      return;
    }
    const item = plan(op);
    if (!item) return;
    if (item.scope) result.scope = item.scope;
    else if (item.say !== undefined) result.say = item.say;
    else {
      if (item.same) result.same += 1;
      addItem(result.items, item);
    }
    onUpdate?.(result);
  });
  return result;
}

// Nhờ AI gợi ý màu, không đụng giao diện nên bộ kiểm độ bền (palette-eval.js) gọi thẳng được. Câu trả lời có lỗi mà code không
// tự sửa được (problemsOf) thì gửi lại AI đúng lỗi đó kèm số đo, tối đa một lần; retried ghi các lỗi đã khiến phải hỏi lại.
// Sau đó lọc theo dòng scope và tự chỉnh cho dễ đọc. history: false để không gửi kèm lịch sử chat (khi chạy bộ kiểm).
export async function suggest(request, { onUpdate, history = true } = {}) {
  const past = history ? contextText(readLog(api.state.id, KIND)) : '';
  request = cleanInput(request);
  const prompt = requestPrompt({ history: past, request, label: 'Bảng màu hiện tại', data: context() });
  let result = await askOnce(prompt, onUpdate);
  const problems = problemsOf(result);
  if (problems.length) {
    result = await askOnce(paletteRetry({ prompt, previous: result.lines, problems }), onUpdate);
    result.retried = problems;
  }
  // problems: lỗi còn lại sau khi hỏi lại, để bộ kiểm độ bền đếm.
  result.problems = problemsOf(result);
  result.scope ??= { ...ANY_SCOPE, missing: true };
  result.items = keepInScope(result.items, result.scope);
  if (!NO_COLOR.includes(result.scope.change)) settle(result.items, result.scope.modes);
  return result;
}

// Tương phản của từng chế độ sau khi áp các màu đề xuất (chế độ tối chưa có thì rỗng), để bộ kiểm độ bền xác nhận mọi cặp đạt.
export function checksAfter(items) {
  const vars = draftVars(items);
  return { light: checks((n) => light(n, vars)), dark: hasDark(vars) ? checks((n) => dark(n, vars)) : [] };
}

async function send(value) {
  if (busy || !cleanInput(value)) return;
  busy = true;
  text = value;
  proposal = { say: '', items: [], same: 0, done: false, error: '', model: '' };
  renderOut();
  const mark = usageMark();
  try {
    const result = await suggest(value, { onUpdate: (r) => { Object.assign(proposal, { say: r.say, items: r.items, same: r.same }); renderOut(); } });
    Object.assign(proposal, result);
  } catch (err) {
    proposal.error = err.message;
  } finally {
    proposal.done = true;
    proposal.model = modelsSince(mark);
    busy = false;
    const { items } = proposal;
    addTurn(api.state.id, KIND, {
      text: cleanInput(value), say: proposal.error || proposal.say,
      changes: items.map((p) => `${p.label} (${p.mode === 'dark' ? 'tối' : 'sáng'}): ${p.from || 'chưa có'} -> ${p.to}`),
      status: proposal.error ? 'error' : items.length ? 'proposed' : 'empty', model: proposal.model,
    });
    renderOut();
    renderHistory();
  }
}

function accept() {
  const { items } = proposal;
  if (!items.length) return;
  const toDark = items.some((p) => p.mode === 'dark');
  api.commit(`AI màu: ${text.trim().slice(0, 40)}`, () => {
    items.forEach((p) => put(p.key, p.to));
    ensureModeLabel();
  });
  markLast(api.state.id, KIND, 'applied');
  proposal = { say: `Đã áp ${items.length} màu. Bấm Hoàn tác nếu muốn bỏ.`, items: [], done: true, applied: true };
  preview(toDark ? 'dark' : 'light');
}

/* ---------- Giao diện ---------- */

function swatch(color) {
  return api.h('i', { class: 'ed-swatch', style: `background:${HEX.test(color) ? color : 'transparent'}` });
}

function renderOut() {
  if (!out || !proposal) return;
  const { h } = api;
  const { say, items, same, done, error, applied, scope, model } = proposal;
  const group = (mode, title) => {
    const rows = items.filter((p) => p.mode === mode);
    if (!rows.length) return null;
    // Chỉ hiện màu được gợi ý; màu đang dùng đã thấy ở bảng màu bên dưới.
    return h('div', {}, h('p', { class: 'ed-palette__group', text: title }), h('ul', { class: 'ed-diff' }, rows.map((p) => h('li', {},
      h('strong', { text: p.label }),
      h('span', { class: 'ed-diff__to' }, swatch(p.to), p.to),
      fixNote(p)))));
  };
  out.replaceChildren(...[
    // Không còn màu nào để áp thì câu AI nói (hay kể đã chỉnh gì) dễ gây hiểu lầm, nên ẩn, để dòng "không cần đổi" nói thay;
    // trừ khi AI đang trả lời câu nhờ không về màu.
    say && !(done && !applied && !items.length && !NO_COLOR.includes(scope?.change)) ? h('p', { class: applied ? 'ed-ok' : 'ed-ai__say', text: say }) : null,
    // Cho người dùng thấy AI hiểu yêu cầu thế nào: kiểm tra hay đổi theo ý, ở chế độ nào.
    done && scope && !applied && scope.change !== 'ask' ? h('p', { class: 'ed-hint', text: `${CHANGES[scope.change]}, chế độ ${modeNames(scope.modes)}${scope.target ? `: ${scope.target}` : ''}` }) : null,
    group('light', 'Chế độ sáng'),
    group('dark', 'Chế độ tối'),
    !done ? h('p', { class: 'ed-hint', text: 'AI đang gợi ý...' }) : null,
    error ? h('p', { class: 'ed-err', text: error }) : null,
    done && items.length ? h('div', { class: 'ed-row' },
      h('button', { type: 'button', class: 'ed-btn', onclick: accept, text: `Đồng ý (${items.length} màu)` }),
      h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', onclick: () => { markLast(api.state.id, KIND, 'rejected'); renderHistory(); proposal = null; out.replaceChildren(); }, text: 'Bỏ' })) : null,
    done && !applied && !items.length && !error ? noteEl(same, scope) : null,
    done && !applied && model ? h('p', { class: 'ed-model', text: `Model: ${model}` }) : null,
  ].filter(Boolean));
}

// Màu code đã chỉnh hay tự thêm: ghi chú nhỏ bằng lời thường dưới tên, để người dùng biết vì sao khác màu AI nói mà không cần
// hiểu tương phản là gì.
function fixNote(p) {
  if (p.auto === 'dark') return api.h('small', { text: 'Tự thêm để có chế độ tối' });
  if (p.auto) return api.h('small', { text: 'Tự thêm cho chữ dễ đọc' });
  if (p.to !== p.ai) return api.h('small', { text: `AI gợi ý ${p.ai}, đã chỉnh cho dễ đọc` });
  return null;
}

// Không có màu nào để áp: nói rõ vì sao. Tự phối mà không còn màu nào nghĩa là bảng màu đã đạt hết (cặp chưa đạt thì code đã
// tự chỉnh); màu gợi ý trùng màu đang dùng cũng là bảng màu đã hợp, không phải lỗi.
function noteEl(same, scope) {
  const { h } = api;
  if (scope?.change === 'ask') return h('p', { class: 'ed-hint', text: 'Trả lời vào ô bên trên rồi bấm Gợi ý màu.' });
  if (scope?.change === 'none' || scope?.change === 'fix') return h('p', { class: 'ed-hint', text: `Bảng màu chế độ ${modeNames(scope.modes)} không cần đổi màu nào.` });
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
  historyBox = h('div', { class: 'ed-ai__history' });
  renderOut();
  renderHistory();
  return h('div', { class: 'ed-palette__ai' },
    h('label', { class: 'ed-field', for: 'ed-palette-ai' }, h('span', { text: 'Nhờ AI gợi ý màu sáng, tối' })),
    area,
    h('div', { class: 'ed-row' },
      h('button', { type: 'button', class: 'ed-btn', disabled: busy, onclick: () => send(area.value), text: busy ? 'Đang gợi ý...' : 'Gợi ý màu' }),
      micButton(h, area)),
    // Câu mẫu chỉ điền vào ô để sửa thêm, chưa gửi: người dùng bấm Gợi ý màu khi đã viết xong.
    h('div', { class: 'ed-chips' }, EXAMPLES.map((example) => h('button', { type: 'button', onclick: () => fill(area, example), text: example }))),
    out,
    historyBox);
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
    h('div', { class: 'ed-row ed-palette__view' }, h('span', { class: 'ed-hint', text: 'Xem trước' }),
      h('span', { class: 'ed-palette__modes', role: 'group', 'aria-label': 'Chế độ xem trước' }, seg('light', 'Sáng'), seg('dark', 'Tối'))),
    h('div', { class: `ed-palette__grid${withDark ? '' : ' is-light-only'}` },
      h('div', { class: 'ed-palette__row ed-palette__head' }, h('span', {}), h('span', { text: 'Sáng' }), withDark ? h('span', { text: 'Tối' }) : null),
      rows),
    withDark ? null : h('div', {},
      h('p', { class: 'ed-hint', text: 'Thương hiệu chưa có bảng màu tối. Tạo từ màu sáng rồi chỉnh tiếp, hoặc nhờ AI gợi ý ở trên.' }),
      h('button', { type: 'button', class: 'ed-btn', onclick: createDark, text: 'Tạo bảng màu tối' })),
    checksEl('Tương phản chế độ sáng', checks((n) => light(n))),
    withDark ? checksEl('Tương phản chế độ tối', checks((n) => dark(n))) : null);
}
