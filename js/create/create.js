/* create.js - trình tạo web /tao (#81): mô tả bằng lời, AI viết website mới trên khung có sẵn, xem trước ngay bên cạnh,
   rồi xuất bản thành /<tên>/ (Supabase, js/sites.js). Nháp nằm trên máy (xem ở /nhap/); trang trong khung xem trước
   là chính core.js dựng bằng các component <wl-*>, nhận nháp mới qua sự kiện wl:draft mỗi khi AI viết thêm.
   Giao diện là của ClauKi, dùng chung css/editor.css với editor, không theo thương hiệu nào. */
import { FRAMES, generateSite, refineBrief } from './generate.js';
import { micButton } from '../ai/speech.js';
import { backupInUse, usageMark, modelsSince } from '../ai/gemini.js';
import { readUnsplashKey, saveUnsplashKey } from './photos.js';
import { iconEl } from '../icon.js';
import { readTaoDraft, writeTaoDraft, publishSite, updateSite, publishReady, publicLink, readDemoKey, saveDemoKey, SLUG_RE, RESERVED, DRAFT_SLUG } from '../sites.js';
import { DESKTOP, fitFrame, deviceButtons } from '../editor/preview.js';
import { h, slugify } from '../dom.js';
import { createProgress, swatches, meter } from './progress.js';
import { addEnglish } from './english.js';
import { clearLog } from '../editor/chat-log.js';

const EXAMPLES = [
  { label: 'Homestay Đà Lạt', text: 'Homestay nhà gỗ ở Đà Lạt cho nhóm bạn, có bếp nướng ngoài sân, 450 nghìn mỗi khách một đêm' },
  { label: 'Khu nghỉ Phú Quốc', text: 'Khu nghỉ ven biển ở Phú Quốc, 12 bungalow, ba hạng phòng, rẻ nhất 1,8 triệu một đêm' },
  { label: 'Tour Hà Giang', text: 'Tour ba ngày ở Hà Giang ngắm hoa tam giác mạch, khởi hành sáng thứ Sáu, 3,2 triệu mỗi khách' },
  { label: 'Tour ăn vặt Hội An', text: 'Tour đạp xe ăn vặt ở Hội An buổi chiều, ba tiếng, 550 nghìn mỗi khách' },
];
// Ô mô tả dài tới mức này thì báo; AI vẫn đọc được nhưng càng dài càng chậm.
const BRIEF_SOFT_MAX = 1200;
// Gom các lần ghi nháp liền nhau (AI trả về nhiều dòng mỗi giây) thành một lần mỗi chừng này mili giây.
const PREVIEW_MS = 350;
// Mô tả ngắn hơn chừng này ký tự thì AI khó đoán được nơi chốn, loại hình, giá.
const MIN_BRIEF = 12;

const state = { brands: [], draft: null, busy: false, refining: false, originalBrief: null, device: DESKTOP, timer: 0, pending: null, frameReady: false, english: null, run: 0, armed: false, armTimer: 0 };
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

/* ---------- Độ rộng bảng ---------- */

// Kéo thanh ở mép phải bảng để đổi độ rộng (như bảng chỉnh của editor); nhớ trên máy cho lần mở sau. Chuột, cảm ứng kéo ngang,
// bàn phím mũi tên trái phải (Shift để bước lớn), nhấp đúp về mặc định. Khung xem trước nằm trong iframe nuốt sự kiện chuột
// khi con trỏ đi qua, nên tắt pointer-events của khung lúc đang kéo.
const PANEL_KEY = 'clauki-tao-panel';
const PANEL_MIN = 320;
const PANEL_MAX = 640;
const PANEL_DEFAULT = 416;

function readPanelWidth() {
  try {
    const n = Number(localStorage.getItem(PANEL_KEY));
    return Number.isFinite(n) && n > 0 ? n : PANEL_DEFAULT;
  } catch {
    return PANEL_DEFAULT;
  }
}

function setPanelWidth(px, save = true) {
  const width = Math.round(Math.min(PANEL_MAX, Math.max(PANEL_MIN, px)));
  ui.main.style.setProperty('--tao-panel-w', `${width}px`);
  ui.resizer.setAttribute('aria-valuenow', String(width));
  ui.resizer.setAttribute('aria-valuetext', `${width} điểm ảnh`);
  if (save) {
    try {
      localStorage.setItem(PANEL_KEY, String(width));
    } catch {
      // Không lưu được thì lần sau dùng độ rộng mặc định.
    }
  }
}

function resizerEl() {
  const bar = h('div', {
    class: 'tao-resizer', role: 'separator', tabindex: '0', 'aria-orientation': 'vertical',
    'aria-label': 'Độ rộng bảng nhập', 'aria-valuemin': String(PANEL_MIN), 'aria-valuemax': String(PANEL_MAX),
  });
  bar.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    bar.setPointerCapture(e.pointerId);
    bar.classList.add('is-dragging');
    ui.frame.style.pointerEvents = 'none';
    const left = ui.panel.getBoundingClientRect().left;
    const move = (ev) => setPanelWidth(ev.clientX - left, false);
    const stop = () => {
      bar.classList.remove('is-dragging');
      ui.frame.style.pointerEvents = '';
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', stop);
      bar.removeEventListener('pointercancel', stop);
      setPanelWidth(ui.panel.getBoundingClientRect().width);
    };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', stop);
    bar.addEventListener('pointercancel', stop);
  });
  bar.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 64 : 16;
    const now = ui.panel.getBoundingClientRect().width;
    if (e.key === 'ArrowRight') setPanelWidth(now + step);
    else if (e.key === 'ArrowLeft') setPanelWidth(now - step);
    else if (e.key === 'Home') setPanelWidth(PANEL_MIN);
    else if (e.key === 'End') setPanelWidth(PANEL_MAX);
    else return;
    e.preventDefault();
  });
  bar.addEventListener('dblclick', () => setPanelWidth(PANEL_DEFAULT));
  return bar;
}

/* ---------- Ô mô tả ---------- */

// Ô mô tả tự cao theo chữ (tới một mức), kèm số ký tự đang gõ.
function onBriefInput() {
  const box = ui.brief;
  box.style.height = 'auto';
  box.style.height = `${Math.min(box.scrollHeight + 2, 360)}px`;
  const n = box.value.length;
  ui.count.textContent = `${n} ký tự`;
  ui.count.classList.toggle('is-long', n > BRIEF_SOFT_MAX);
}

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
    const mark = usageMark();
    const { text, added, assumed, missing } = await refineBrief(brief);
    state.originalBrief = brief;
    ui.brief.value = text;
    onBriefInput();
    ui.undoRefine.hidden = false;
    showRefineResult(added, assumed, missing, modelsSince(mark));
  } catch (err) {
    ui.refineBox.hidden = true;
    ui.refineNote.textContent = err.message;
  } finally {
    state.refining = false;
    ui.refine.disabled = false;
    ui.refineLabel.textContent = 'Tinh chỉnh';
  }
}

// Kết quả tinh chỉnh: chi tiết AI đã thêm (để người dùng biết mà sửa hay xoá) và ý còn thiếu; bấm một ý thiếu thì chèn sẵn dòng
// "ý đó: " vào cuối mô tả để điền tiếp.
function showRefineResult(added, assumed, missing, model = '') {
  const group = (title, chips) => (chips.length ? h('div', { class: 'tao-refine-box__group' }, h('p', { class: 'tao-refine-box__label', text: title }), h('div', { class: 'tao-chips' }, chips)) : null);
  const addedChips = added.map((text) => h('span', { class: 'tao-chip', text }));
  // Giá trị mẫu AI tự điền cho mục người dùng chưa nói (giá, thời lượng, hạng phòng...): bấm thì bôi đen đúng cụm đó trong ô mô tả để gõ đè.
  const assumedChips = assumed.map((g) => h('button', { type: 'button', class: 'tao-chip tao-chip--assumed', title: 'Bấm để chọn cụm này trong mô tả rồi gõ giá trị của bạn',
    onclick: () => {
      const at = ui.brief.value.indexOf(g.value);
      ui.brief.focus();
      if (at >= 0) ui.brief.setSelectionRange(at, at + g.value.length);
    } }, h('strong', { text: `${g.label}: ` }), g.value));
  const missingChips = missing.map((text) => h('button', { type: 'button', class: 'tao-chip tao-chip--missing', title: 'Bấm để thêm dòng này vào mô tả', text,
    onclick: (e) => {
      ui.brief.value = `${ui.brief.value.trimEnd()}\n${text}: `;
      onBriefInput();
      e.currentTarget.remove();
      ui.brief.focus();
      ui.brief.setSelectionRange(ui.brief.value.length, ui.brief.value.length);
    } }));
  ui.refineBox.replaceChildren(
    h('p', { class: 'tao-refine-box__lead', text: assumed.length
      ? 'Đã viết lại, bổ sung và điền giá trị mẫu cho các mục còn thiếu. Bấm một giá trị mẫu để sửa thành số của bạn, rồi bấm Tạo website.'
      : 'Đã viết lại và bổ sung mô tả. Đọc lại, sửa hay xoá phần không đúng ý rồi bấm Tạo website.' }),
    ...[group('AI đã thêm', addedChips), group('Giá trị mẫu AI điền, bấm để sửa', assumedChips), group('Còn thiếu, bấm để thêm vào mô tả', missingChips),
      model ? h('p', { class: 'ed-model', text: `Model: ${model}` }) : null].filter(Boolean),
  );
  ui.refineBox.hidden = false;
}

function undoRefine() {
  if (state.originalBrief == null) return;
  ui.brief.value = state.originalBrief;
  state.originalBrief = null;
  onBriefInput();
  ui.undoRefine.hidden = true;
  ui.refineBox.hidden = true;
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
  lock(true);
  ui.publish.hidden = true;
  setStatus([]);
  const steps = ui.progress;
  // Lượt tạo mới: lượt dịch nền của website cũ (nếu còn chạy) không được ghi vào bảng tiến trình mới.
  state.run += 1;
  state.english = null;
  // Website mới thì lịch sử nhờ AI của bản nháp cũ không còn đúng.
  clearLog(DRAFT_SLUG);
  steps.start();
  const photosOn = ui.photoOn.checked;
  if (!photosOn) steps.set('photos', 'skip', 'Đã tắt, giữ ảnh của khung');
  if (!ui.enOn.checked) steps.set('english', 'skip', 'Đã tắt, site chỉ có tiếng Việt');
  let ruleNote = '';
  // Bảng cuộn riêng: đưa tiến trình vào tầm nhìn để thấy ngay khi bấm Tạo.
  steps.el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  try {
    const frameId = ui.framePick.value;
    const mark = usageMark();
    const result = await generateSite({
      brief,
      frameId,
      slug: DRAFT_SLUG,
      frames: FRAMES.map((f) => f.id).filter((id) => builtIn().includes(id)),
      photos: { on: photosOn, unsplashKey: ui.unsplashKey.value.trim() },
      on: {
        profile: (p, info) => {
          steps.set('profile', 'done', `${p.ten}: ${p.slogan}`);
          steps.set('style', 'done', [
            `Khung: ${FRAMES.find((f) => f.id === info.frame)?.label}`,
            h('p', { class: 'tao-progress__row' }, swatches(info.vars), info.palette ? 'Bộ màu riêng theo nơi chốn' : 'Giữ bộ màu của khung'),
            info.font ? `Kiểu chữ: ${info.font}` : 'Giữ kiểu chữ của khung',
          ]);
          steps.set('layout', 'run');
          steps.set('write', 'run', 'Chia chữ thành nhiều luồng viết song song');
          state.draft = { brief, profile: p };
        },
        rules: (r) => {
          ruleNote = [
            r.kept.length ? `Khối đặc trưng hợp nơi này: ${r.kept.join(', ')}` : 'Không dùng khối đặc trưng của thương hiệu khác',
            r.removedPages.length ? `Bỏ trang: ${r.removedPages.join(', ')}` : '',
            r.borrowed?.length ? `Thêm trang từ khung khác: ${r.borrowed.join(', ')}` : '',
          ].filter(Boolean).join('. ');
        },
        layout: (l) => {
          const picked = Object.entries(l.picked).map(([type, variant]) => `${type} ${variant}`).join(', ');
          steps.set('layout', 'done', [picked && `Trang chủ: ${picked}`, l.header && `Đầu trang: ${l.header}`, ruleNote]);
        },
        photoStage: (stage, info) => {
          if (stage === 'search') steps.set('photos', 'run', `Đang tìm trên ${info.source}`);
          else if (stage === 'vet') steps.note('photos', `Tìm được ${info.found} ảnh, AI đang loại ảnh lạc đề`);
          else steps.set('photos', 'skip', 'Không đủ ảnh hợp nơi chốn, giữ ảnh của khung');
        },
        photos: (info) => steps.set('photos', 'done', `${info.photos} ảnh từ ${info.source}, thay vào ${info.slots} chỗ, nguồn ghi ở cuối trang`),
        redo: (n) => steps.note('write', `Viết lại thêm ${n} chỗ còn chép y chữ của trang mẫu`),
        field: (done, total) => {
          steps.note('write', [`${done}/${total} chỗ`, meter(done, total)]);
          ui.bar.value = done / total;
        },
        update: (content, theme) => preview(content, theme),
      },
    });
    preview(result.content, result.theme, true);
    const s = result.stats;
    if (steps.state('layout') !== 'done') steps.set('layout', 'done', ruleNote);
    steps.set('write', 'done', [`${s.written}/${s.fields} chỗ, ${s.groups} luồng song song`,
      s.leftover ? `Viết lại ${s.redone}/${s.leftover} chỗ AI chép y chữ của trang mẫu` : '',
      s.written < s.fields ? `${s.fields - s.written} chỗ giữ chữ của khung${s.blocked ? ` (${s.blocked} dòng bị bộ lọc an toàn chặn)` : ''}, sửa sau bằng editor` : '']);
    if (['run', 'wait'].includes(steps.state('photos'))) steps.set('photos', 'skip', 'Không tìm được ảnh, giữ ảnh của khung');
    steps.set('done', 'done', [`Xong sau ${steps.total()} giây, xem trước bên cạnh, chỉnh tay hay xuất bản được ngay`,
      modelsSince(mark) ? `Model đã dùng: ${modelsSince(mark)}` : '',
      backupInUse() ? `Khoá chính hết lượt nên đã dùng khoá dự phòng ${backupInUse()}` : '']);
    ui.slug.value = slugify(result.profile.ten);
    showPublish();
    // Website coi như xong khi đủ bản tiếng Việt; bản tiếng Anh dịch tiếp phía sau, lỗi thì site vẫn dùng được bằng tiếng Việt.
    if (ui.enOn.checked) state.english = translateInBackground(result, steps);
  } catch (err) {
    steps.fail(err.message);
  } finally {
    if (!state.english) steps.stop();
    state.busy = false;
    lock(false);
  }
}

/* ---------- Nút Tạo, khoá khi đang tạo ---------- */

const ARM_MS = 5000;
const hasSite = () => Boolean(state.draft?.content);

// Đang tạo thì khoá mọi ô nhập và nút trong bảng (fieldset disabled), nút Tạo hiện "Đang tạo...".
function lock(on) {
  ui.fields.disabled = on;
  ui.create.disabled = on;
  updateCreate();
}

function updateCreate() {
  ui.create.textContent = state.busy ? 'Đang tạo...' : state.armed ? 'Bấm lần nữa để tạo lại' : hasSite() ? 'Tạo lại' : 'Tạo website';
  ui.create.classList.toggle('is-armed', Boolean(state.armed));
  ui.createNote.textContent = state.armed
    ? (state.draft?.edited ? 'Website đang có chỗ đã chỉnh tay. Tạo lại sẽ thay toàn bộ website hiện tại.' : 'Tạo lại sẽ thay website hiện tại bằng một bản mới.')
    : '';
}

function disarm() {
  clearTimeout(state.armTimer);
  state.armed = false;
  updateCreate();
}

// Đã có website thì phải bấm hai lần (lần đầu chỉ báo sẽ thay website hiện tại), tránh lỡ tay mất bản đang có; 5 giây không
// bấm tiếp hay bấm Esc thì thôi.
function onCreateClick() {
  if (state.busy) return;
  if (hasSite() && !state.armed) {
    state.armed = true;
    updateCreate();
    clearTimeout(state.armTimer);
    state.armTimer = setTimeout(disarm, ARM_MS);
    return;
  }
  disarm();
  create();
}

/* Dịch bản tiếng Anh sau khi website đã xong. Chỉ ghi kết quả vào nháp khi nháp vẫn là đúng website vừa tạo (chưa tạo lại,
   chưa chỉnh tay); ngược lại bỏ kết quả, phần dịch còn thiếu sẽ được dịch lúc xuất bản. Trả về promise để Xuất bản chờ. */
async function translateInBackground(result, steps) {
  const made = state.draft?.content;
  const run = state.run;
  const mine = () => run === state.run;
  steps.set('english', 'run', 'Chạy nền: dịch theo lô, chữ giao diện lấy lại từ bản tiếng Anh của khung');
  const mark = usageMark();
  try {
    const en = await addEnglish(made, {
      frame: result.profile.khung,
      on: { progress: (done, total) => mine() && steps.note('english', [`${done}/${total} câu`, meter(done, total)]) },
    });
    if (!mine()) return;
    if (state.draft?.content !== made) {
      steps.set('english', 'skip', 'Website đã đổi trong lúc dịch, phần tiếng Anh sẽ được dịch lúc xuất bản');
      return;
    }
    state.draft = { ...state.draft, i18n: en.i18n };
    preview(en.content, result.theme, true);
    const t = en.stats;
    steps.set('english', t.failed && !t.translated && !t.reused ? 'skip' : 'done', [
      `${t.translated} câu AI dịch, ${t.reused} câu lấy lại; nút VI, EN đã có trên site`,
      t.failed ? `${t.failed} câu chưa dịch được nên hiện tiếng Việt${t.error ? ` (${t.error})` : ''}` : '',
      modelsSince(mark) ? `Model đã dùng: ${modelsSince(mark)}` : '',
    ]);
  } catch (err) {
    if (mine()) steps.set('english', 'skip', `Chưa dịch được (${err.message}), site chỉ có tiếng Việt`);
  } finally {
    if (mine()) {
      steps.stop();
      state.english = null;
    }
  }
}

/* ---------- Xuất bản ---------- */

function slugError(slug) {
  if (!SLUG_RE.test(slug)) return 'Tên từ 3 tới 30 ký tự, chỉ gồm chữ thường không dấu, số và dấu gạch ngang.';
  if (RESERVED.includes(slug) || builtIn().includes(slug)) return `Tên /${slug}/ là tên dành riêng, hãy chọn tên khác.`;
  return '';
}

// Máy demo đang sửa một site đã xuất bản (nháp có editOf, mở từ "Sửa trang này") và giữ đúng tên cũ: Xuất bản là cập nhật trang đó.
const isUpdate = () => Boolean(state.draft?.editOf && ui.slug.value.trim() === state.draft.editOf && readDemoKey());

function syncSlug() {
  ui.url.textContent = publicLink(ui.slug.value || '...');
  ui.publishBtn.textContent = isUpdate() ? `Cập nhật /${ui.slug.value}/` : 'Xuất bản';
}

function showPublish() {
  ui.publish.hidden = !state.draft?.content;
  syncSlug();
  ui.publishBtn.disabled = !publishReady();
  ui.publishNote.textContent = publishReady() ? '' : 'Chưa nối kho dữ liệu (Supabase), tạm thời chỉ xem nháp trên máy này.';
}

async function publish() {
  const slug = ui.slug.value.trim();
  const problem = slugError(slug);
  ui.publishNote.textContent = problem;
  if (problem || !state.draft?.content) return;
  const update = isUpdate();
  ui.publishBtn.disabled = true;
  ui.shareBox.replaceChildren();
  ui.publishNote.textContent = update ? 'Đang cập nhật...' : 'Đang xuất bản...';
  try {
    // Bản tiếng Anh còn đang dịch nền: chờ xong rồi xuất bản luôn cả hai thứ tiếng.
    if (state.english) {
      ui.publishNote.textContent = 'Đang chờ dịch xong bản tiếng Anh...';
      await state.english;
    }
    let content = { ...structuredClone(state.draft.content), id: slug };
    // Site có bản tiếng Anh: dịch nốt các câu đã đổi sau lần dịch trước (chỉnh tay, AI sửa trong editor) rồi mới xuất bản.
    if (content.languages?.includes('en')) {
      ui.publishNote.textContent = 'Đang dịch nốt các chỗ vừa sửa sang tiếng Anh...';
      try {
        const mark = usageMark();
        content = (await addEnglish(content, { state: state.draft.i18n ?? null })).content;
        state.publishModel = modelsSince(mark);
      } catch {
        // Không dịch được thì xuất bản với bản tiếng Anh đang có; câu thiếu hiện tiếng Việt.
      }
      ui.publishNote.textContent = 'Đang xuất bản...';
    }
    content.contact = { ...content.contact, email: `xin-chao@${slug}.clauki` };
    if (update) await updateSite(slug, content, state.draft.theme);
    else await publishSite(slug, content, state.draft.theme);
    // Xuất bản mới: khối chia sẻ bên dưới đã đủ báo xong; cập nhật (máy demo) thì báo một câu ngắn.
    ui.publishNote.textContent = [update ? 'Đã cập nhật trang.' : '', state.publishModel ? `Dịch nốt tiếng Anh bằng ${state.publishModel}.` : ''].filter(Boolean).join(' ');
    state.publishModel = '';
    // Link công khai (tên miền con trên web thật), mã QR, chép, chia sẻ.
    const { shareEl } = await import('../share.js');
    ui.shareBox.replaceChildren(shareEl(publicLink(slug), { name: slug, title: content.brand?.name ?? '' }));
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
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onCreateClick();
  });
  ui.framePick = h('select', { class: 'ed-select', id: 'tao-frame' },
    h('option', { value: '', text: 'Để AI chọn theo mô tả' }),
    FRAMES.map((f) => h('option', { value: f.id, text: f.label })));
  ui.brief.addEventListener('input', onBriefInput);
  ui.count = h('span', { class: 'tao-count', 'aria-hidden': 'true' });
  ui.refineBox = h('div', { class: 'tao-refine-box', hidden: true });
  ui.refineLabel = h('span', { text: 'Tinh chỉnh' });
  ui.refine = h('button', { type: 'button', class: 'ed-btn ed-btn--ghost tao-refine', title: 'Nhờ AI viết lại mô tả cho rõ và đủ ý trước khi tạo website', onclick: refine },
    iconEl('wand-sparkles', 'tao-refine__icon'), ui.refineLabel);
  ui.undoRefine = h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', hidden: true, onclick: undoRefine, text: 'Hoàn tác' });
  ui.refineNote = h('p', { class: 'tao-note', 'aria-live': 'polite' });
  ui.photoOn = h('input', { type: 'checkbox', role: 'switch', checked: true, 'aria-label': 'Tìm ảnh thật theo nơi chốn' });
  ui.enOn = h('input', { type: 'checkbox', role: 'switch', checked: true, 'aria-label': 'Kèm bản tiếng Anh' });
  ui.unsplashKey = h('input', { class: 'ed-input', type: 'password', autocomplete: 'off', placeholder: 'Dán Access Key của Unsplash', 'aria-label': 'Khoá Unsplash' });
  ui.unsplashKey.value = readUnsplashKey();
  ui.unsplashKey.addEventListener('change', () => saveUnsplashKey(ui.unsplashKey.value.trim()));
  ui.demoKey = h('input', { class: 'ed-input', type: 'password', autocomplete: 'off', placeholder: 'Dán khoá máy demo', 'aria-label': 'Khoá máy demo' });
  ui.demoKey.value = readDemoKey();
  ui.demoKey.addEventListener('change', () => {
    saveDemoKey(ui.demoKey.value.trim());
    syncSlug();
  });
  ui.create = h('button', { type: 'button', class: 'ed-btn tao-create', onclick: onCreateClick, text: 'Tạo website' });
  ui.createNote = h('p', { class: 'tao-create-note', 'aria-live': 'polite' });
  ui.bar = h('progress', { class: 'tao-bar', max: '1', value: '0', 'aria-label': 'Tiến độ viết chữ' });
  ui.status = h('div', { class: 'tao-status', role: 'status', 'aria-live': 'polite' });
  ui.progress = createProgress();

  ui.slug = h('input', { class: 'ed-input', id: 'tao-slug', maxlength: '30', autocomplete: 'off' });
  ui.slug.addEventListener('input', () => {
    ui.slug.value = ui.slug.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    syncSlug();
    ui.publishNote.textContent = '';
  });
  ui.url = h('code', { class: 'tao-url' });
  ui.publishBtn = h('button', { type: 'button', class: 'ed-btn', onclick: publish, text: 'Xuất bản' });
  ui.publishNote = h('p', { class: 'tao-note', 'aria-live': 'polite' });
  ui.shareBox = h('div', { class: 'tao-share' });
  ui.publish = h('section', { class: 'tao-publish', 'aria-labelledby': 'tao-publish-h', hidden: true },
    h('h2', { class: 'ed-h', id: 'tao-publish-h', text: 'Xuất bản' }),
    h('label', { class: 'ed-field', for: 'tao-slug' }, h('span', { text: 'Tên trang (địa chỉ)' })),
    ui.slug,
    h('p', { class: 'tao-hint' }, 'Địa chỉ: ', ui.url),
    h('div', { class: 'ed-row' }, ui.publishBtn,
      // Chỉnh tay ngay trên nháp (editor sửa thẳng nháp của trang này), xong bấm Xuất bản trong editor là quay lại đây.
      h('a', { class: 'ed-btn ed-btn--ghost', href: `/${DRAFT_SLUG}/?sua`, text: 'Chỉnh tay' }),
      h('a', { class: 'ed-btn ed-btn--ghost', href: `/${DRAFT_SLUG}/`, target: '_blank', rel: 'noopener', text: 'Mở nháp trong tab mới' })),
    ui.publishNote,
    ui.shareBox);

  ui.resizer = resizerEl();
  const step = (n, title, forId) => h('h2', { class: 'tao-step__title' }, h('span', { class: 'tao-step__no', 'aria-hidden': 'true', text: String(n) }), forId ? h('label', { for: forId, text: title }) : title);
  const form = h('aside', { class: 'tao-panel', 'aria-label': 'Tạo website' },
    h('div', { class: 'tao-panel__body' },
      h('header', { class: 'tao-head' },
        h('h1', { class: 'tao-title', text: 'Tạo website bằng lời' }),
        h('p', { class: 'tao-lead', text: 'Kể về nơi của bạn, AI dựng website trên một khung có sẵn (bố cục, ảnh có giấy phép), trang hiện dần bên cạnh.' })),
      ui.fields = h('fieldset', { class: 'tao-fields' },
      h('section', { class: 'tao-step' },
        step(1, 'Kể về nơi của bạn', 'tao-brief'),
        h('div', { class: 'tao-brief' }, ui.brief,
          h('div', { class: 'tao-tools' }, ui.refine, micButton(h, ui.brief), ui.undoRefine, ui.count)),
        ui.refineNote,
        ui.refineBox,
        h('div', { class: 'tao-examples' }, h('span', { class: 'tao-examples__label', text: 'Thử ví dụ' }),
          EXAMPLES.map((ex) => h('button', { type: 'button', class: 'tao-chip tao-chip--example', title: ex.text,
            onclick: () => { ui.brief.value = ex.text; onBriefInput(); } , text: ex.label })))),
      h('section', { class: 'tao-step' },
        step(2, 'Tuỳ chọn'),
        h('div', { class: 'tao-option' },
          h('label', { class: 'tao-option__label', for: 'tao-frame', text: 'Khung trang' }), ui.framePick),
        h('label', { class: 'tao-toggle' },
          h('span', { class: 'tao-toggle__text' }, h('strong', { text: 'Ảnh thật theo nơi chốn' }), h('small', { text: 'Wikimedia Commons hoặc Unsplash, có ghi nguồn' })),
          ui.photoOn),
        h('label', { class: 'tao-toggle' },
          h('span', { class: 'tao-toggle__text' }, h('strong', { text: 'Kèm bản tiếng Anh' }), h('small', { text: 'AI dịch sau khi viết xong, site có nút VI, EN' })),
          ui.enOn),
        h('details', { class: 'tao-photo-key' }, h('summary', { text: 'Khoá Unsplash (tuỳ chọn)' }),
          h('p', { class: 'ed-hint', text: 'Có khoá thì tìm ảnh ở Unsplash trước, truy vấn nào Unsplash không ra thì tìm trên Wikimedia Commons. Khoá chỉ lưu trên trình duyệt này, không gửi đi đâu khác.' }),
          ui.unsplashKey),
        h('details', { class: 'tao-photo-key', id: 'cau-hinh' }, h('summary', { text: 'Khoá máy demo' }),
          h('p', { class: 'ed-hint', text: 'Chỉ máy thuyết trình của đội: có khoá thì trang đã xuất bản có thêm mục Sửa trang này, xuất bản lại đúng tên cũ là cập nhật trang đó. Khoá chỉ lưu trên trình duyệt này, database so mã băm của khoá.' }),
          ui.demoKey))),
      ui.status,
      ui.progress.el,
      ui.publish),
    h('div', { class: 'tao-panel__foot' }, ui.bar, ui.createNote, ui.create),
    ui.resizer);

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
  ui.panel = form;
  ui.main = h('div', { class: 'ed-main tao-main' }, form, ui.stage);
  document.body.replaceChildren(h('div', { class: 'ed tao' }, top, ui.main));
  setPanelWidth(readPanelWidth(), false);
  new ResizeObserver(fit).observe(ui.stage);
}

export function openBuilder({ brands }) {
  state.brands = brands;
  build();
  onBriefInput();
  ui.create.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.armed) disarm(); });
  // /tao#cau-hinh: mở sẵn ô khoá máy demo (máy thuyết trình dán khoá trước buổi thi).
  if (location.hash === '#cau-hinh') {
    ui.demoKey.closest('details').open = true;
    ui.demoKey.focus();
  }
  // Có nháp từ lần trước thì hiện lại, để tải lại trang không mất website đang làm.
  const draft = readTaoDraft();
  if (draft?.content) {
    state.draft = draft;
    state.frameReady = true;
    ui.frame.src = `/${DRAFT_SLUG}/`;
    ui.empty.hidden = true;
    ui.brief.value = draft.brief ?? '';
    onBriefInput();
    if (draft.profile) {
      setStatus([`${draft.profile.ten}: ${draft.profile.slogan}`, draft.edited ? 'Nháp đã chỉnh tay, còn trên máy này.' : 'Nháp lần trước, còn trên máy này.'], 'ok');
      ui.slug.value = slugify(draft.profile.ten);
    } else if (draft.editOf) {
      // Máy demo đang sửa một site đã xuất bản (mục Sửa trang này): giữ tên cũ để Xuất bản là cập nhật.
      setStatus([`Đang sửa /${draft.editOf}/, còn trên máy này.`, 'Chỉnh tay xong, bấm Cập nhật để ghi đè trang đã xuất bản.'], 'ok');
      ui.slug.value = draft.editOf;
    } else if (draft.copyOf) {
      // Bản sao của một site đã xuất bản (nút Tạo bản sao): gợi ý tên mới để khỏi trùng với bản gốc.
      setStatus([`Bản sao của /${draft.copyOf}/, còn trên máy này.`, 'Đặt tên mới rồi xuất bản, hoặc mở nháp để xem.'], 'ok');
      ui.slug.value = `${draft.copyOf.slice(0, 24)}-copy`;
    }
    showPublish();
    // Từ editor bấm Xuất bản: đưa phần xuất bản vào tầm nhìn, con trỏ ở ô tên trang.
    if (location.hash === '#xuat-ban') {
      ui.publish.scrollIntoView({ block: 'center' });
      ui.slug.focus();
    }
  }
  updateCreate();
}
