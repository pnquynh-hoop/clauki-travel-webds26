/* ai.js - tab AI của editor (#81, #82): sửa website bằng lời.
   AI không viết lại cả content.json: nó nhận yêu cầu cùng bản tóm tắt trang (khối, kiểu được phép, màu, trang) và trả về
   các thao tác nhỏ dạng JSON Lines. Mỗi thao tác qua cùng bộ kiểm tra với sửa tay (kiểu có trong manifest, khối có thật,
   màu hex, tương phản AA); thao tác đạt mới hiện thành dòng "trước, sau". Bấm Đồng ý thì áp tất cả trong một commit,
   nên một lần Hoàn tác là bỏ hết. Không gửi dữ liệu cá nhân, đơn đặt chỗ hay cả content.json cho AI. */
import { BLOCKS, HEADER_VARIANTS, COLORS, FONTS, variantsFor, fieldsFor } from './manifest.js';
import { addableGroups, makeBlock, addCredits } from './blocks-add.js';
import { headerTarget, checkNewPage, addPage, insertBlock, applyFont } from './ops.js';
import { getIn, setIn } from './form.js';
import { streamLines, aiSource, readDemo, saveDemo, cleanText, DEFAULT_MODEL, usageMark, modelsSince } from '../ai/gemini.js';
import { editSystem, requestPrompt } from '../ai/prompts/editor.js';
import { micButton } from '../ai/speech.js';
import { readLog, addTurn, markLast, clearLog, contextText } from './chat-log.js';
import { iconEl } from '../core/icon.js';
import { confirmAction } from './confirm.js';

const SITE_FIELDS = {
  'brand.name': 'Tên thương hiệu',
  'brand.slogan': 'Khẩu hiệu',
  'cta.label': 'Chữ trên nút chính',
  'cta.note': 'Dòng giá dưới nút',
};
const EXAMPLES = ['Đổi sang tông xanh rêu, chữ dễ đọc', 'Đưa phần khách kể lên ngay sau ảnh đầu', 'Đổi ảnh đầu sang kiểu ảnh phủ kín', 'Thêm trang cẩm nang vào menu', 'Viết lại khẩu hiệu ngắn và vui hơn'];
const MAX_OPS = 12;

let api = null;
let proposal = [];
// Đề xuất gắn với thương hiệu và trang lúc gửi: các thao tác trỏ vào khối của trang đó. Đổi thương hiệu hay trang thì bỏ đề xuất,
// để thao tác không chạy lên trang khác (thêm khối nhầm trang, đổi màu nhầm thương hiệu).
let owner = null;
let busy = false;

const HEX = /^#[0-9a-f]{6}$/i;
const blockLabel = (section) => BLOCKS[section.type]?.label ?? section.type;
// Mốc (#id) các khối trên trang đang mở, để mẫu khối mượn từ thương hiệu khác không giữ liên kết tới mốc không có ở đây.
const anchorsOf = (list) => new Set(list.map((s) => s.id).filter(Boolean));

const variantLabel = (type, value) => (type === 'header' ? HEADER_VARIANTS : BLOCKS[type]?.variants ?? []).find(([v]) => v === (value ?? ''))?.[1] ?? (value || 'mặc định');

/* ---------- Ngữ cảnh gửi cho AI ---------- */

function context() {
  const { state, sections, pageOf, colorOf } = api;
  const list = sections();
  const page = pageOf(state.content);
  return {
    brand: state.content.brand?.name,
    page: state.page,
    pages: (state.content.pages ?? [{ path: '/' }]).map((p) => ({ path: p.path, title: p.title ?? (p.path === '/' ? 'Trang chủ' : p.path) })),
    selected: typeof state.sel === 'number' ? state.sel : null,
    header: { variant: page?.header?.variant ?? state.content.header?.variant ?? 'solid', variants: HEADER_VARIANTS.map(([v, l]) => `${v} (${l})`) },
    blocks: list.map((s, i) => ({
      i,
      type: s.type,
      name: blockLabel(s),
      title: s.title ?? null,
      variant: s.variant ?? '',
      variants: variantsFor(s).map(([v, l]) => `${v || '""'} (${l})`),
      hidden: Boolean(s.hidden),
      text: Object.fromEntries(fieldsFor(s).filter((f) => f.type === 'text' || f.type === 'long').map((f) => [f.key, getIn(s, f.key) ?? ''])),
    })),
    site: Object.fromEntries(Object.keys(SITE_FIELDS).map((k) => [k, k.split('.').reduce((n, key) => n?.[key], state.content) ?? ''])),
    colors: Object.fromEntries(COLORS.map(([name, label]) => [name, `${colorOf(name)} (${label})`])),
    fonts: FONTS.map((f) => `${f.key || '""'} (${f.label})`),
    // Cùng danh sách khối với ô Thêm khối của tab Khối (blocks-add.js), chỉ các khối thêm được ở site này.
    addable: addableGroups(state.content, state.baseId, anchorsOf(list)).flatMap((g) => g.blocks).filter((b) => !b.reason).map((b) => `${b.type} (${b.label})`),
  };
}

const SYSTEM = editSystem(MAX_OPS);

/* ---------- Kiểm từng thao tác ---------- */

// Biến một dòng của AI thành đề xuất: { ok, what, from, to, run(state) } hoặc { ok: false, reason }.
// run dùng tham chiếu tới chính object khối lúc kiểm, nên nhiều thao tác áp liền nhau không lệch số thứ tự.
function plan(op) {
  const { state, sections, colorOf } = api;
  const list = sections();
  const section = Number.isInteger(op.block) ? list[op.block] : null;
  const needBlock = ['variant', 'move', 'hide', 'show', 'remove', 'text'].includes(op.op);
  if (needBlock && !section) return { ok: false, reason: `Không có khối số ${op.block} trên trang này.` };
  const name = section ? `${blockLabel(section)}${section.title ? `: ${section.title}` : ''}` : '';
  const at = (s) => sections().indexOf(s);

  switch (op.op) {
    case 'say':
      return { say: cleanText(op.text, 300) };
    case 'variant': {
      const value = op.value ?? '';
      if (!variantsFor(section).some(([v]) => v === value)) return { ok: false, reason: `Khối ${name} không có kiểu "${value}".` };
      return { ok: true, what: `Kiểu của ${name}`, from: variantLabel(section.type, section.variant), to: variantLabel(section.type, value),
        run: () => { if (value) section.variant = value; else delete section.variant; } };
    }
    case 'header': {
      if (!HEADER_VARIANTS.some(([v]) => v === op.value)) return { ok: false, reason: `Đầu trang không có kiểu "${op.value}".` };
      const target = headerTarget(state.content, state.page);
      return { ok: true, what: 'Kiểu đầu trang', from: variantLabel('header', target.variant ?? 'solid'), to: variantLabel('header', op.value),
        run: () => { target.variant = op.value; } };
    }
    case 'move': {
      const to = Math.max(0, Math.min(list.length - 1, Number(op.to)));
      if (!Number.isInteger(to)) return { ok: false, reason: 'Vị trí mới không hợp lệ.' };
      return { ok: true, what: `Vị trí của ${name}`, from: `thứ ${op.block + 1}`, to: `thứ ${to + 1}`,
        run: () => { const s = sections(); s.splice(at(section), 1); s.splice(Math.min(to, s.length), 0, section); } };
    }
    case 'hide':
    case 'show':
      return { ok: true, what: name, from: section.hidden ? 'đang ẩn' : 'đang hiện', to: op.op === 'hide' ? 'ẩn' : 'hiện',
        run: () => { if (op.op === 'hide') section.hidden = true; else delete section.hidden; } };
    case 'remove':
      return { ok: true, what: name, from: 'có trên trang', to: 'xoá',
        run: () => { const s = sections(); if (at(section) >= 0) s.splice(at(section), 1); } };
    case 'add': {
      const made = makeBlock(op.type, state.content, state.baseId, api.images().filter((img) => img.alt), anchorsOf(list));
      if (!made) return { ok: false, reason: `Không thêm được loại khối "${op.type}".` };
      const after = list[Number(op.after)] ?? null;
      return { ok: true, what: `Khối mới: ${BLOCKS[op.type]?.label ?? op.type}`, from: 'chưa có', to: after ? `sau ${blockLabel(after)}` : 'đầu trang',
        run: () => { insertBlock(sections(), made.section, after ? at(after) + 1 : 0); addCredits(state.content, made.credits); } };
    }
    case 'text': {
      const field = fieldsFor(section).find((f) => f.key === op.field && (f.type === 'text' || f.type === 'long'));
      if (!field) return { ok: false, reason: `Khối ${name} không có ô chữ "${op.field}".` };
      const value = cleanText(op.value, field.type === 'long' ? 400 : 120);
      if (!value) return { ok: false, reason: 'Chữ mới rỗng.' };
      return { ok: true, what: `${field.label} của ${blockLabel(section)}`, from: getIn(section, op.field) || '(trống)', to: value,
        run: () => setIn(section, op.field, value) };
    }
    case 'site': {
      if (!SITE_FIELDS[op.field]) return { ok: false, reason: `Không sửa được "${op.field}" bằng AI.` };
      const value = cleanText(op.value, 120);
      if (!value) return { ok: false, reason: 'Chữ mới rỗng.' };
      const [group, key] = op.field.split('.');
      return { ok: true, what: SITE_FIELDS[op.field], from: state.content[group]?.[key] ?? '(trống)', to: value,
        run: () => { (state.content[group] ??= {})[key] = value; } };
    }
    case 'color': {
      const label = COLORS.find(([n]) => n === op.name)?.[1];
      if (!label) return { ok: false, reason: `Không có biến màu "${op.name}".` };
      if (!HEX.test(op.value ?? '')) return { ok: false, reason: `Màu "${op.value}" không phải mã hex 6 số.` };
      return { ok: true, color: op.name, what: label, from: colorOf(op.name), to: op.value.toLowerCase(), swatch: [colorOf(op.name), op.value],
        run: () => { state.theme.vars[op.name] = op.value.toLowerCase(); } };
    }
    case 'font': {
      const pair = FONTS.find((f) => f.key === (op.value ?? ''));
      if (!pair) return { ok: false, reason: `Không có cặp font "${op.value}".` };
      const now = FONTS.find((f) => f.key === (state.theme.font ?? ''));
      return { ok: true, what: 'Font', from: now?.label ?? 'font gốc', to: pair.label, run: () => applyFont(state.theme, pair.key) };
    }
    case 'radius': {
      const px = Math.round(Number(op.value));
      if (!Number.isFinite(px) || px < 0 || px > 32) return { ok: false, reason: 'Bo góc phải từ 0 tới 32px.' };
      return { ok: true, what: 'Bo góc', from: colorOf('--radius') || 'gốc', to: `${px}px`,
        run: () => { state.theme.vars['--radius'] = `${px / 16}rem`; } };
    }
    case 'page': {
      const title = cleanText(op.title, 60);
      const { slug, error } = checkNewPage(state.content, title);
      if (error) return { ok: false, reason: error };
      const onMenu = op.menu !== false;
      return { ok: true, what: 'Trang mới', from: 'chưa có', to: `${title} (/${slug})${onMenu ? ', có trên menu' : ''}`,
        run: () => addPage(state.content, slug, title, onMenu) };
    }
    default:
      return { ok: false, reason: `Thao tác lạ "${op.op}", đã bỏ qua.` };
  }
}

// Sau khi gom đủ thao tác: thử áp các màu lên bản sao để kiểm tương phản; không đạt thì bỏ các thao tác màu kèm lý do.
function checkColors(items) {
  const colors = items.filter((p) => p.ok && p.color);
  if (!colors.length) return;
  const vars = { ...api.state.theme.vars };
  colors.forEach((p) => { vars[p.color] = p.to; });
  const fails = api.contrastOf(vars).filter((c) => !c.ok);
  if (!fails.length) return;
  colors.forEach((p) => {
    p.ok = false;
    p.reason = `Bộ màu mới chưa đạt tương phản AA: ${fails.map((f) => f.label.toLowerCase()).join(', ')}.`;
  });
}

/* ---------- Giao diện tab: khung chat ---------- */

let pane = null;
// Tin trả lời của AI cho lượt đang chạy hay đang chờ Đồng ý: renderProposal vẽ vào đây, các lượt cũ chỉ để đọc.
let out = null;
let thread = null;
let input = null;
let sendBtn = null;
let clearBtn = null;
// Lượt đang chạy hay đang chờ Đồng ý: { text, logged }. logged: đã ghi vào lịch sử (khi AI trả lời xong), nên khi vẽ lịch sử
// thì bỏ lượt cuối, để lượt này chỉ hiện một lần, bằng tin out có nút Đồng ý.
let live = null;

const KIND = 'ai';
const short = (value) => String(value ?? '').replace(/\s+/g, ' ').slice(0, 60);
const TAGS = { applied: 'Đã áp', rejected: 'Đã bỏ', proposed: 'Chưa áp' };

// Ô nhập cao theo số dòng đã gõ, tối đa khoảng 6 dòng rồi cuộn trong ô.
function grow() {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
}

function syncSend() {
  sendBtn.disabled = busy || !input.value.trim();
}

// Tin của người dùng là nút: bấm thì chép lại câu đó vào ô nhập để sửa rồi gửi lại.
function mineEl(text) {
  return api.h('button', { type: 'button', class: 'ed-msg ed-msg--me', title: 'Chép lại vào ô nhập', text,
    onclick: () => { input.value = text; grow(); syncSend(); input.focus(); } });
}

function metaEl(tag, status, model) {
  const { h } = api;
  if (!tag && !model) return null;
  return h('p', { class: 'ed-msg__meta' },
    tag ? h('span', { class: `ed-msg__tag is-${status}`, text: tag }) : null,
    model ? h('span', { text: model }) : null);
}

// Một lượt đã lưu: tin của người dùng, tin trả lời của AI (tóm tắt, các thay đổi, trạng thái). Mốc Về bản gốc là một dòng giữa khung.
function turnEls(t) {
  const { h } = api;
  if (t.status === 'reset') return [h('p', { class: 'ed-chat__mark', text: t.text })];
  const say = t.say || (t.status === 'empty' ? 'AI chưa đưa ra thay đổi nào. Hãy viết yêu cầu cụ thể hơn.' : '');
  return [mineEl(t.text), h('div', { class: `ed-msg ed-msg--ai${t.status === 'error' ? ' is-error' : ''}` },
    say ? h('p', { text: say }) : null,
    t.changes?.length ? h('ul', { class: 'ed-msg__changes' }, t.changes.map((c) => h('li', { text: c.replace(' -> ', ' thành ') }))) : null,
    metaEl(TAGS[t.status], t.status, t.model))];
}

function emptyEl() {
  const { h } = api;
  return h('div', { class: 'ed-chat__empty' },
    h('p', { class: 'ed-chat__hello', text: 'Bạn muốn đổi gì trên trang này?' }),
    h('p', { class: 'ed-chat__sub', text: 'AI đề xuất, bạn bấm Đồng ý mới áp.' }),
    h('div', { class: 'ed-chips' }, EXAMPLES.map((text) => h('button', { type: 'button', onclick: () => send(text), text }))));
}

// Vẽ lại khung chat từ lịch sử của thương hiệu đang mở (#201), cộng lượt đang chạy; luôn cuộn xuống tin mới nhất.
function renderThread() {
  if (!thread) return;
  let turns = readLog(api.state.id, KIND);
  if (live?.logged) turns = turns.slice(0, -1);
  thread.replaceChildren(
    ...(turns.length || live ? [] : [emptyEl()]),
    ...turns.flatMap(turnEls),
    ...(live ? [mineEl(live.text), out] : []));
  thread.scrollTop = thread.scrollHeight;
  clearBtn.hidden = !turns.length;
}

export function refreshAiHistory() {
  dropStale();
  renderThread();
}

// Tin trả lời của lượt đang chạy: ba chấm khi AI chưa nói gì, rồi tóm tắt, các thay đổi trước và sau, nút Đồng ý, Bỏ.
// model: chuỗi model đã dùng cho lượt này (modelsSince), hiện nhỏ cuối tin khi AI trả lời xong.
function renderProposal(say, items, done, error, model = '') {
  const { h } = api;
  const ok = items.filter((p) => p.ok);
  out.classList.toggle('is-error', Boolean(error));
  out.replaceChildren(...[
    say ? h('p', { text: say }) : null,
    items.length ? h('ul', { class: 'ed-diff' }, items.map((p) => (p.ok
      ? h('li', {}, h('strong', { text: p.what }),
        h('span', { class: 'ed-diff__from' }, p.swatch ? h('i', { class: 'ed-swatch', style: `background:${p.swatch[0]}` }) : null, String(p.from)),
        h('span', { class: 'ed-diff__to' }, p.swatch ? h('i', { class: 'ed-swatch', style: `background:${p.swatch[1]}` }) : null, String(p.to)))
      : h('li', { class: 'is-skip' }, h('strong', { text: 'Bỏ qua' }), h('span', { text: p.reason })))) ) : null,
    !done && !error ? h('span', { class: 'ed-typing', role: 'img', 'aria-label': 'AI đang trả lời' }, h('i'), h('i'), h('i')) : null,
    error ? h('p', { text: error }) : null,
    done && ok.length ? h('div', { class: 'ed-row' },
      h('button', { type: 'button', class: 'ed-btn', 'data-ed-key': 'ai:accept', onclick: accept, text: `Đồng ý (${ok.length} thay đổi)` }),
      h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', onclick: reject, text: 'Bỏ' })) : null,
    done && model ? metaEl('', '', model) : null,
  ].filter(Boolean));
  thread.scrollTop = thread.scrollHeight;
}

const ownerNow = () => `${api.state.id}|${api.state.page}`;

// Đã sang thương hiệu hay trang khác: bỏ đề xuất cũ khỏi khung. Trả true khi đã bỏ.
function dropStale() {
  if (!proposal.length || owner === ownerNow()) return false;
  proposal = [];
  live = null;
  return true;
}

function accept() {
  if (dropStale()) {
    renderThread();
    return;
  }
  const ok = proposal.filter((p) => p.ok);
  if (!ok.length) return;
  api.commit(`AI: ${live?.text.slice(0, 40) ?? ''}`, () => ok.forEach((p) => p.run()));
  markLast(api.state.id, KIND, 'applied');
  proposal = [];
  live = null;
  renderThread();
}

function reject() {
  markLast(api.state.id, KIND, 'rejected');
  proposal = [];
  live = null;
  renderThread();
}

async function send(text) {
  if (busy || !text.trim()) return;
  busy = true;
  proposal = [];
  owner = ownerNow();
  const sentFor = owner;
  const sentId = api.state.id;
  let say = '';
  // Gửi kèm vài lượt gần nhất để AI hiểu những câu như "đổi lại như lúc nãy".
  const prompt = requestPrompt({ history: contextText(readLog(api.state.id, KIND)), request: text, label: 'Trang hiện tại', data: context() });
  live = { text: text.trim(), logged: false };
  input.value = '';
  grow();
  syncSend();
  renderProposal('', [], false);
  renderThread();
  let failed = '';
  const mark = usageMark();
  try {
    await streamLines(SYSTEM, prompt, (line) => {
      let op;
      try {
        op = JSON.parse(line.replace(/^```(json)?|```$/g, '').trim());
      } catch {
        return;
      }
      if (proposal.length >= MAX_OPS || ownerNow() !== sentFor) return;
      const item = plan(op);
      if (item.say !== undefined) say = item.say;
      // Bỏ thao tác không đổi gì (AI hay liệt kê lại màu giữ nguyên), danh sách chỉ còn thay đổi thật.
      else if (!(item.ok && String(item.from).toLowerCase() === String(item.to).toLowerCase())) proposal.push(item);
      renderProposal(say, proposal, false);
    });
    if (ownerNow() !== sentFor) proposal = [];
    else checkColors(proposal);
  } catch (err) {
    failed = err.message;
  } finally {
    busy = false;
    const ok = proposal.filter((p) => p.ok);
    addTurn(sentId, KIND, {
      text: text.trim(), say: failed || say, changes: ok.map((p) => `${p.what}: ${short(p.from)} -> ${short(p.to)}`),
      status: failed ? 'error' : ok.length ? 'proposed' : 'empty', model: modelsSince(mark),
    });
    // Có thay đổi để duyệt thì tin out ở lại với nút Đồng ý; không thì lượt đã xong (lỗi, không thay đổi, đã sang trang khác),
    // vẽ như các lượt cũ.
    if (ok.length && ownerNow() === sentFor) {
      live.logged = true;
      renderProposal(say, proposal, true, '', modelsSince(mark));
    } else live = null;
    renderThread();
    syncSend();
  }
}

// Cấu hình máy demo: dán cấu hình web Firebase của project demo; chỉ lưu trên máy này, không nằm trong repo.
function configEl() {
  const { h } = api;
  const demo = readDemo();
  const area = h('textarea', { class: 'ed-input', rows: '4', placeholder: '{"apiKey":"...","authDomain":"...","projectId":"...","appId":"..."}', 'aria-label': 'Cấu hình Firebase của máy demo' });
  area.value = demo ? JSON.stringify(demo.config) : '';
  const model = h('input', { class: 'ed-input', value: demo?.model ?? DEFAULT_MODEL, 'aria-label': 'Tên model' });
  const note = h('p', { class: 'ed-hint', 'aria-live': 'polite' });
  const save = h('button', { type: 'button', class: 'ed-btn', text: 'Lưu trên máy này' });
  save.addEventListener('click', () => {
    try {
      const config = JSON.parse(area.value);
      if (!config.apiKey || !config.projectId) throw new Error('thiếu apiKey hoặc projectId');
      note.textContent = saveDemo({ config, model: model.value.trim() }) ? 'Đã lưu. Tab AI dùng cấu hình này.' : 'Trình duyệt chặn bộ nhớ, chưa lưu được.';
      renderStatus();
    } catch (err) {
      note.textContent = `Cấu hình chưa đúng: ${err.message}.`;
    }
  });
  const clear = h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', text: 'Xoá' });
  clear.addEventListener('click', async () => {
    if (!await confirmAction('Xoá cấu hình AI của máy này?', { note: 'Không lấy lại được.', danger: true })) return;
    saveDemo(null);
    area.value = '';
    note.textContent = 'Đã xoá cấu hình demo khỏi máy này.';
    renderStatus();
  });
  return h('div', { class: 'ed-chat__settings', id: 'ed-ai-settings', hidden: true },
    h('p', { class: 'ed-chat__settings-title', text: 'Cấu hình AI (máy demo)' }),
    h('p', { class: 'ed-ai__status' }),
    h('p', { class: 'ed-hint', text: 'Cấu hình web của project Firebase dành cho máy thuyết trình. Chỉ lưu trong trình duyệt này, không đưa vào repo.' }),
    area, model, h('div', { class: 'ed-row' }, save, clear), note);
}

function renderStatus() {
  const source = aiSource();
  const status = pane.querySelector('.ed-ai__status');
  status.textContent = source === 'demo' ? 'Đang dùng: project máy demo' : 'Đang dùng: project công khai';
  api.tab.classList.toggle('is-demo', source === 'demo');
}

export function mountAi(target, options) {
  api = options;
  pane = target;
  const { h } = api;
  pane.classList.add('ed-pane--chat');
  input = h('textarea', { class: 'ed-chat__input', rows: '1', id: 'ed-ai-input', 'aria-label': 'Yêu cầu cho AI', placeholder: 'Nhắn yêu cầu cho AI...' });
  input.addEventListener('input', () => { grow(); syncSend(); });
  // Enter là gửi, Shift+Enter xuống dòng, như các ứng dụng chat; đang gõ dấu bằng bộ gõ (isComposing) thì Enter là của bộ gõ.
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
    e.preventDefault();
    send(input.value);
  });
  sendBtn = h('button', { type: 'button', class: 'ed-chat__send', 'aria-label': 'Gửi', title: 'Gửi (Enter)', disabled: true, onclick: () => send(input.value) },
    iconEl('arrow-up', 'ed-icon'));
  out = h('div', { class: 'ed-msg ed-msg--ai', 'aria-live': 'polite' });
  thread = h('div', { class: 'ed-chat__thread', role: 'log', 'aria-label': 'Trò chuyện với AI' });
  const settings = configEl();
  const settingsBtn = h('button', { type: 'button', class: 'ed-icon-btn', 'aria-label': 'Cấu hình AI', title: 'Cấu hình AI (máy demo)', 'aria-expanded': 'false', 'aria-controls': 'ed-ai-settings' },
    iconEl('settings', 'ed-icon'));
  settingsBtn.addEventListener('click', () => {
    settings.hidden = !settings.hidden;
    settingsBtn.setAttribute('aria-expanded', String(!settings.hidden));
  });
  clearBtn = h('button', { type: 'button', class: 'ed-icon-btn is-danger', 'aria-label': 'Xoá lịch sử trò chuyện', title: 'Xoá lịch sử trò chuyện' },
    iconEl('trash-2', 'ed-icon'));
  clearBtn.addEventListener('click', async () => {
    if (!await confirmAction('Xoá lịch sử nhờ AI?', { note: 'Không lấy lại được.', danger: true })) return;
    clearLog(api.state.id, KIND);
    proposal = [];
    live = null;
    renderThread();
  });
  pane.replaceChildren(
    h('div', { class: 'ed-chat__bar' }, clearBtn, settingsBtn),
    settings,
    thread,
    h('div', { class: 'ed-chat__composer' }, input, h('div', { class: 'ed-chat__tools' }, micButton(h, input), sendBtn)));
  renderStatus();
  renderThread();
}
