/* tao.js - trình tạo web /tao (#81): mô tả bằng lời, AI viết website mới trên khung có sẵn, xem trước ngay bên cạnh,
   rồi xuất bản thành /<tên>/ (Supabase, js/sites.js). Nháp nằm trên máy (xem ở /nhap/); trang trong khung xem trước
   là chính core.js dựng bằng các component <wl-*>, nhận nháp mới qua sự kiện wl:draft mỗi khi AI viết thêm.
   Giao diện là của ClauKi, dùng chung css/editor.css với editor, không theo thương hiệu nào. */
import { FRAMES, generateSite, refineBrief } from './generate.js';
import { micButton } from '../ai/speech.js';
import { readPexelsKey, savePexelsKey } from './photos.js';
import { iconEl } from '../icon.js';
import { readTaoDraft, writeTaoDraft, publishSite, publishReady, SLUG_RE, RESERVED, DRAFT_SLUG } from '../sites.js';
import { DESKTOP, fitFrame, deviceButtons } from '../editor/preview.js';
import { h, slugify } from '../dom.js';

const EXAMPLES = [
  'Homestay nhà gỗ ở Đà Lạt cho nhóm bạn, có bếp nướng ngoài sân, 450 nghìn mỗi khách một đêm',
  'Khu nghỉ ven biển ở Phú Quốc, 12 bungalow, ba hạng phòng, rẻ nhất 1,8 triệu một đêm',
  'Tour ba ngày ở Hà Giang ngắm hoa tam giác mạch, khởi hành sáng thứ Sáu, 3,2 triệu mỗi khách',
  'Tour đạp xe ăn vặt ở Hội An buổi chiều, ba tiếng, 550 nghìn mỗi khách',
];
// Gom các lần ghi nháp liền nhau (AI trả về nhiều dòng mỗi giây) thành một lần mỗi chừng này mili giây.
const PREVIEW_MS = 350;
// Mô tả ngắn hơn chừng này ký tự thì AI khó đoán được nơi chốn, loại hình, giá.
const MIN_BRIEF = 12;

const state = { brands: [], draft: null, busy: false, refining: false, originalBrief: null, device: DESKTOP, timer: 0, pending: null, frameReady: false };
const ui = {};

const builtIn = () => state.brands.map((b) => b.id);

/* ---------- Xem trước ---------- */

// Ghi nháp và báo khung dựng lại, gom các lần gọi liền nhau.
function preview(content, theme, now = false) {
  state.pending = { content, theme };
  if (state.timer && !now) return;
  const flush = () => {
    state.timer = 0;
    const draft = { ...state.draft, content: state.pending.content, theme: state.pending.theme, at: new Date().toISOString() };
    state.draft = draft;
    writeTaoDraft(draft);
    if (!state.frameReady) {
      state.frameReady = true;
      ui.frame.src = `/${DRAFT_SLUG}/`;
      ui.empty.hidden = true;
      return;
    }
    // Khung đang tải lại thì chưa có document: lần tải đó tự đọc nháp mới trên máy.
    ui.frame.contentDocument?.dispatchEvent(new CustomEvent('wl:draft', { detail: structuredClone({ content: draft.content, theme: draft.theme }) }));
  };
  if (now) flush();
  else state.timer = setTimeout(flush, PREVIEW_MS);
}

const fit = () => fitFrame(ui.stage, ui.wrap, state.device);

/* ---------- Tinh chỉnh mô tả ---------- */

// Nút Tinh chỉnh: nhờ AI viết lại mô tả cho rõ và đủ ý trước khi tạo website. Bản gốc được giữ để Hoàn tác; những gì mô tả còn thiếu
// hiện ngay dưới ô để người dùng bổ sung. Dùng một yêu cầu AI.
async function refine() {
  if (state.busy || state.refining) return;
  const brief = ui.brief.value.trim();
  if (brief.length < MIN_BRIEF) {
    ui.refineNote.textContent = 'Gõ vài chữ về nơi của bạn trước, rồi mới tinh chỉnh được.';
    ui.brief.focus();
    return;
  }
  state.refining = true;
  ui.refine.disabled = true;
  ui.refineLabel.textContent = 'Đang tinh chỉnh...';
  ui.refineNote.textContent = '';
  try {
    const { text, missing } = await refineBrief(brief);
    state.originalBrief = brief;
    ui.brief.value = text;
    ui.undoRefine.hidden = false;
    ui.refineNote.textContent = missing.length
      ? `Đã viết lại mô tả. Còn thiếu: ${missing.join('; ')}. Thêm vào cho website sát hơn.`
      : 'Đã viết lại mô tả cho rõ hơn. Đọc lại và sửa nếu cần rồi bấm Tạo website.';
  } catch (err) {
    ui.refineNote.textContent = err.message;
  } finally {
    state.refining = false;
    ui.refine.disabled = false;
    ui.refineLabel.textContent = 'Tinh chỉnh';
  }
}

function undoRefine() {
  if (state.originalBrief == null) return;
  ui.brief.value = state.originalBrief;
  state.originalBrief = null;
  ui.undoRefine.hidden = true;
  ui.refineNote.textContent = 'Đã về mô tả ban đầu.';
}

/* ---------- Tạo ---------- */

function setStatus(lines, kind = '') {
  ui.status.className = `tao-status${kind ? ` is-${kind}` : ''}`;
  ui.status.replaceChildren(...lines.filter(Boolean).map((text) => h('p', { text })));
}

async function create() {
  const brief = ui.brief.value.trim();
  if (state.busy) return;
  if (brief.length < MIN_BRIEF) {
    setStatus(['Mô tả thêm một chút: nơi nào, cho ai, ở hay đi tour, giá khoảng bao nhiêu.'], 'error');
    ui.brief.focus();
    return;
  }
  state.busy = true;
  ui.create.disabled = true;
  ui.publish.hidden = true;
  const t0 = performance.now();
  const sec = () => ((performance.now() - t0) / 1000).toFixed(1);
  let head = [];
  let progress = '';
  let photoNote = '';
  const tick = setInterval(() => setStatus([...head, progress || `Đang lập hồ sơ thương hiệu... ${sec()} giây`]), 200);
  try {
    const frameId = ui.framePick.value;
    const result = await generateSite({
      brief,
      frameId,
      slug: DRAFT_SLUG,
      frames: FRAMES.map((f) => f.id).filter((id) => builtIn().includes(id)),
      photos: { on: ui.photoOn.checked, pexelsKey: ui.pexelsKey.value.trim() },
      on: {
        photos: (info) => { photoNote = `Ảnh: ${info.photos} ảnh thật theo nơi chốn từ ${info.source}, thay vào ${info.slots} chỗ; nguồn ảnh ghi ở cuối trang.`; },
        profile: (p, info) => {
          head = [`${p.ten}: ${p.slogan}`, `Khung: ${FRAMES.find((f) => f.id === info.frame)?.label}. ${info.palette ? 'Bộ màu riêng theo nơi chốn.' : 'Giữ bộ màu của khung.'} ${info.font ? `Kiểu chữ: ${info.font}.` : 'Giữ kiểu chữ của khung.'}`];
          state.draft = { brief, profile: p };
        },
        field: (done, total) => {
          progress = `Đang viết chữ: ${done}/${total} chỗ, ${sec()} giây`;
          ui.bar.value = done / total;
        },
        update: (content, theme) => preview(content, theme),
      },
    });
    preview(result.content, result.theme, true);
    const s = result.stats;
    setStatus([...head, photoNote || (ui.photoOn.checked ? 'Không tìm được ảnh hợp nơi chốn nên giữ ảnh của khung.' : ''), `Xong sau ${s.total} giây: hồ sơ lúc ${s.profile} giây, dòng chữ đầu tiên lúc ${s.first} giây, viết ${s.written}/${s.fields} chỗ, ${s.groups} luồng song song.`,
      s.written < s.fields ? `${s.fields - s.written} chỗ giữ chữ của khung, sửa sau bằng editor.` : ''], 'ok');
    ui.slug.value = slugify(result.profile.ten);
    showPublish();
  } catch (err) {
    setStatus([...head, err.message], err.kind === 'refused' ? 'warn' : 'error');
  } finally {
    clearInterval(tick);
    state.busy = false;
    ui.create.disabled = false;
  }
}

/* ---------- Xuất bản ---------- */

function slugError(slug) {
  if (!SLUG_RE.test(slug)) return 'Tên từ 3 tới 30 ký tự, chỉ gồm chữ thường không dấu, số và dấu gạch ngang.';
  if (RESERVED.includes(slug) || builtIn().includes(slug)) return `Tên /${slug}/ là tên dành riêng, hãy chọn tên khác.`;
  return '';
}

function showPublish() {
  ui.publish.hidden = !state.draft?.content;
  ui.url.textContent = `${location.origin}/${ui.slug.value || '...'}/`;
  ui.publishBtn.disabled = !publishReady();
  ui.publishNote.textContent = publishReady() ? '' : 'Chưa nối kho dữ liệu (Supabase), tạm thời chỉ xem nháp trên máy này.';
}

async function publish() {
  const slug = ui.slug.value.trim();
  const problem = slugError(slug);
  ui.publishNote.textContent = problem;
  if (problem || !state.draft?.content) return;
  ui.publishBtn.disabled = true;
  ui.publishNote.textContent = 'Đang xuất bản...';
  try {
    const content = { ...structuredClone(state.draft.content), id: slug };
    content.contact = { ...content.contact, email: `xin-chao@${slug}.clauki` };
    await publishSite(slug, content, state.draft.theme);
    const url = `${location.origin}/${slug}/`;
    ui.publishNote.replaceChildren('Đã xuất bản: ', h('a', { href: url, target: '_blank', rel: 'noopener', text: url }),
      '. Trang đã cố định, chỉ máy demo sửa được.');
  } catch (err) {
    ui.publishNote.textContent = err.message;
  } finally {
    ui.publishBtn.disabled = !publishReady();
  }
}

/* ---------- Dựng trang ---------- */

function build() {
  document.head.append(
    h('link', { rel: 'stylesheet', href: '/css/editor.css' }),
    h('link', { rel: 'stylesheet', href: '/css/tao.css' }),
    h('link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700&display=swap' }),
  );
  document.title = 'Tạo website - ClauKi';

  ui.brief = h('textarea', { class: 'ed-input', id: 'tao-brief', rows: '5', placeholder: 'Ví dụ: homestay nhà gỗ ở Đà Lạt cho nhóm bạn, có bếp nướng, 450 nghìn mỗi khách' });
  ui.brief.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) create();
  });
  ui.framePick = h('select', { class: 'ed-select', id: 'tao-frame' },
    h('option', { value: '', text: 'Để AI chọn theo mô tả' }),
    FRAMES.map((f) => h('option', { value: f.id, text: f.label })));
  ui.refineLabel = h('span', { text: 'Tinh chỉnh' });
  ui.refine = h('button', { type: 'button', class: 'ed-btn ed-btn--ghost tao-refine', title: 'Nhờ AI viết lại mô tả cho rõ và đủ ý trước khi tạo website', onclick: refine },
    iconEl('wand-sparkles', 'tao-refine__icon'), ui.refineLabel);
  ui.undoRefine = h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', hidden: true, onclick: undoRefine, text: 'Hoàn tác' });
  ui.refineNote = h('p', { class: 'tao-note', 'aria-live': 'polite' });
  ui.photoOn = h('input', { type: 'checkbox', checked: true });
  ui.pexelsKey = h('input', { class: 'ed-input', type: 'password', autocomplete: 'off', placeholder: 'Dán khoá Pexels', 'aria-label': 'Khoá Pexels' });
  ui.pexelsKey.value = readPexelsKey();
  ui.pexelsKey.addEventListener('change', () => savePexelsKey(ui.pexelsKey.value.trim()));
  ui.create = h('button', { type: 'button', class: 'ed-btn tao-create', onclick: create, text: 'Tạo website' });
  ui.bar = h('progress', { class: 'tao-bar', max: '1', value: '0', 'aria-label': 'Tiến độ viết chữ' });
  ui.status = h('div', { class: 'tao-status', role: 'status', 'aria-live': 'polite' });

  ui.slug = h('input', { class: 'ed-input', id: 'tao-slug', maxlength: '30', autocomplete: 'off' });
  ui.slug.addEventListener('input', () => {
    ui.slug.value = ui.slug.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    ui.url.textContent = `${location.origin}/${ui.slug.value || '...'}/`;
    ui.publishNote.textContent = '';
  });
  ui.url = h('code', { class: 'tao-url' });
  ui.publishBtn = h('button', { type: 'button', class: 'ed-btn', onclick: publish, text: 'Xuất bản' });
  ui.publishNote = h('p', { class: 'tao-note', 'aria-live': 'polite' });
  ui.publish = h('section', { class: 'tao-publish', 'aria-labelledby': 'tao-publish-h', hidden: true },
    h('h2', { class: 'ed-h', id: 'tao-publish-h', text: 'Xuất bản' }),
    h('label', { class: 'ed-field', for: 'tao-slug' }, h('span', { text: 'Tên trang (địa chỉ)' })),
    ui.slug,
    h('p', { class: 'tao-hint' }, 'Địa chỉ: ', ui.url),
    h('div', { class: 'ed-row' }, ui.publishBtn,
      h('a', { class: 'ed-btn ed-btn--ghost', href: `/${DRAFT_SLUG}/`, target: '_blank', rel: 'noopener', text: 'Mở nháp trong tab mới' })),
    ui.publishNote);

  const form = h('aside', { class: 'tao-panel', 'aria-label': 'Tạo website' },
    h('h1', { class: 'tao-title', text: 'Tạo website du lịch bằng lời' }),
    h('p', { class: 'ed-hint', text: 'Kể về nơi của bạn: ở đâu, cho ai, ở hay đi tour, giá khoảng bao nhiêu. AI viết trên một khung có sẵn (bố cục, ảnh có giấy phép), trang hiện dần bên cạnh.' }),
    h('label', { class: 'ed-field', for: 'tao-brief' }, h('span', { text: 'Mô tả nơi của bạn' })),
    ui.brief,
    h('div', { class: 'ed-row' }, micButton(h, ui.brief), ui.refine, ui.undoRefine),
    ui.refineNote,
    h('div', { class: 'ed-chips' }, EXAMPLES.map((text) => h('button', { type: 'button', onclick: () => { ui.brief.value = text; }, text }))),
    h('label', { class: 'ed-field', for: 'tao-frame' }, h('span', { text: 'Khung trang' })),
    ui.framePick,
    h('label', { class: 'ed-check' }, ui.photoOn, ' Tìm ảnh thật theo nơi chốn (Wikimedia Commons, có ghi nguồn)'),
    h('details', { class: 'tao-photo-key' }, h('summary', { text: 'Khoá Pexels (tuỳ chọn)' }),
      h('p', { class: 'ed-hint', text: 'Có khoá thì tìm ảnh ở Pexels thay vì Wikimedia Commons. Khoá chỉ lưu trên trình duyệt này, không gửi đi đâu khác.' }),
      ui.pexelsKey),
    ui.create,
    ui.bar,
    ui.status,
    ui.publish);

  ui.frame = h('iframe', { class: 'ed-frame', title: 'Xem trước website đang tạo', 'data-ed-frame': true });
  ui.wrap = h('div', { class: 'ed-frame-wrap' }, ui.frame);
  ui.empty = h('p', { class: 'tao-empty', text: 'Website sẽ hiện ở đây khi AI bắt đầu viết.' });
  ui.stage = h('div', { class: 'ed-stage' }, ui.wrap, ui.empty);
  ui.devices = deviceButtons(h, DESKTOP, (width) => {
    state.device = width;
    fit();
  });

  const top = h('header', { class: 'ed-top' },
    h('div', { class: 'ed-top__who' }, h('strong', { class: 'ed-top__brand', text: 'ClauKi' }), h('span', { class: 'ed-top__status', text: 'Tạo website' })),
    h('div', { class: 'ed-top__group ed-top__wide', role: 'group', 'aria-label': 'Khổ màn hình' }, ui.devices),
    h('div', { class: 'ed-top__group ed-top__end' }, h('a', { class: 'ed-btn ed-btn--ghost', href: '/', text: 'Về trang chủ' })));

  document.body.className = 'ed-body';
  document.body.replaceChildren(h('div', { class: 'ed tao' }, top, h('div', { class: 'ed-main tao-main' }, form, ui.stage)));
  new ResizeObserver(fit).observe(ui.stage);
}

export function openBuilder({ brands }) {
  state.brands = brands;
  build();
  // Có nháp từ lần trước thì hiện lại, để tải lại trang không mất website đang làm.
  const draft = readTaoDraft();
  if (draft?.content) {
    state.draft = draft;
    state.frameReady = true;
    ui.frame.src = `/${DRAFT_SLUG}/`;
    ui.empty.hidden = true;
    ui.brief.value = draft.brief ?? '';
    if (draft.profile) {
      setStatus([`${draft.profile.ten}: ${draft.profile.slogan}`, 'Nháp lần trước, còn trên máy này.'], 'ok');
      ui.slug.value = slugify(draft.profile.ten);
    } else if (draft.copyOf) {
      // Bản sao của một site đã xuất bản (nút Tạo bản sao): gợi ý tên mới để khỏi trùng với bản gốc.
      setStatus([`Bản sao của /${draft.copyOf}/, còn trên máy này.`, 'Đặt tên mới rồi xuất bản, hoặc mở nháp để xem.'], 'ok');
      ui.slug.value = `${draft.copyOf.slice(0, 24)}-copy`;
    }
    showPublish();
  }
}
