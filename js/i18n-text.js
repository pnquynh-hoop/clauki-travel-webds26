/* i18n-text.js - phần không dùng AI của song ngữ trong editor: rút chữ cần dịch, theo dõi bản dịch, dựng lại file bản dịch.
   Người dùng sửa tiếng Việt; bản tiếng Anh do AI dịch, người dùng sửa tay được. Trong lúc sửa không gọi AI: mã chỉ ghi lại
   câu nào đã đổi, tới lúc xem thử hoặc xuất bản mới gom lại gọi AI một lượt (js/ai/translate.js).

   Trạng thái song ngữ (state) là object JSON nhỏ, editor cất cùng nháp:
   - en: vị trí -> câu đã dịch; source: vị trí -> câu tiếng Việt lúc có câu dịch đó (để biết tiếng Việt đã đổi chưa);
   - manual: các vị trí người dùng tự sửa (AI không ghi đè); checked: vị trí -> câu tự sửa đã được AI kiểm tra.
   Vị trí ghi theo khoá như pages[tour].sections[danh-sach].title, nên đổi thứ tự khối không làm lệch.
   Lúc xuất bản, toContent ghi bản dịch vào translations.<lang> (cùng dạng brands/<id>/content.en.json) và danh sách câu
   tự sửa vào translationNotes.<lang>.manual; phần còn lại của state chỉ cần trong lúc chỉnh. */

// Khoá kỹ thuật: giá trị là mã, đường dẫn, tên icon, không phải chữ hiện ra trang.
const SKIP_KEYS = new Set([
  'id', 'type', 'variant', 'href', 'src', 'path', 'item', 'icon', 'vehicle', 'color', 'file', 'source', 'license',
  'timezone', 'kind', 'effect', 'favicon', 'logo', 'tone', 'buoi', 'topics', 'pick', 'related', 'focus', 'email',
  'languages', 'translations', 'translationNotes',
]);
// Giá trị không phải chữ: địa chỉ, ngày giờ, con số, mã kiểu "can-gio", màu, email.
const NOT_TEXT = /^(https?:|images\/|#|\/|\d{4}-\d{2}|[\d\s.,:+%-]+$|page:|tel:|mailto:|[a-z0-9]+(-[a-z0-9]+)*$|\S+@\S+$)/;

function isText(value) {
  return typeof value === 'string' && /\p{L}/u.test(value) && !NOT_TEXT.test(value.trim());
}

/* ---------- Vị trí theo khoá ---------- */

// Khoá nhận diện giống i18n.js: phần tử trong mảng khớp theo path, rồi id, rồi type.
function keyField(item) {
  if (!item || typeof item !== 'object') return null;
  return ['path', 'id', 'type'].find((k) => item[k] !== undefined && item[k] !== null) ?? null;
}

const keyOf = (item) => (keyField(item) ? item[keyField(item)] : null);

// Mảng ghi vị trí theo khoá khi mọi phần tử có khoá và không trùng nhau; không thì theo thứ tự.
function isKeyed(list) {
  const keys = list.map(keyOf);
  return keys.length > 0 && keys.every((k) => k !== null) && new Set(keys).size === keys.length;
}

const step = (list, i) => (isKeyed(list) ? `[${keyOf(list[i])}]` : `.${i}`);
const join = (key, k) => (key ? `${key}.${k}` : k);

// Mọi chữ cần dịch của nội dung: mỗi mục gồm vị trí theo khoá (key), đường đi thật (path) và chữ tiếng Việt (text).
export function textEntries(content) {
  const out = [];
  const walk = (node, path, key) => {
    if (Array.isArray(node)) node.forEach((v, i) => walk(v, [...path, i], key + step(node, i)));
    else if (node && typeof node === 'object') {
      Object.entries(node).forEach(([k, v]) => {
        if (!SKIP_KEYS.has(k)) walk(v, [...path, k], join(key, k));
      });
    } else if (isText(node)) out.push({ key, path, text: node });
  };
  walk(content, [], '');
  return out;
}

/* ---------- Đọc và dựng file bản dịch ---------- */

/* Đọc một bản dịch (cùng dạng content.en.json) thành Map vị trí -> câu dịch. Đi song song nội dung và bản dịch, khớp
   phần tử mảng đúng như mergeTranslation của i18n.js (có khoá thì theo khoá, không thì theo thứ tự), nên đọc được cả
   file viết tay. */
export function readTranslation(content, translation) {
  const out = new Map();
  const walk = (node, over, key) => {
    if (over === null || over === undefined) return;
    if (Array.isArray(node) && Array.isArray(over)) {
      const byKey = over.some((o) => keyOf(o) !== null);
      node.forEach((item, i) => {
        const match = byKey ? over.find((o) => keyOf(o) !== null && keyOf(o) === keyOf(item)) : over[i];
        walk(item, match, key + step(node, i));
      });
    } else if (node && typeof node === 'object' && typeof over === 'object') {
      Object.entries(node).forEach(([k, v]) => {
        if (!SKIP_KEYS.has(k)) walk(v, over[k], join(key, k));
      });
    } else if (isText(node) && typeof over === 'string') out.set(key, over);
  };
  walk(content, translation, '');
  return out;
}

/* Dựng file bản dịch từ nội dung và các câu đã dịch (Map hoặc object vị trí -> chữ). Chỉ giữ nhánh có chữ đã dịch;
   phần tử của mảng có khoá thì mang theo khoá của nó, mảng theo thứ tự thì để null ở chỗ không có gì (i18n.js giữ
   bản gốc ở đó). Vị trí không còn trong nội dung (khối đã xoá) tự rơi khỏi bản dịch. */
export function buildTranslation(content, done) {
  const get = done instanceof Map ? (k) => done.get(k) : (k) => done[k];
  const build = (node, key) => {
    if (Array.isArray(node)) return buildArray(node, key);
    if (node && typeof node === 'object') {
      const out = {};
      Object.entries(node).forEach(([k, v]) => {
        if (SKIP_KEYS.has(k)) return;
        const child = build(v, join(key, k));
        if (child !== undefined) out[k] = child;
      });
      return Object.keys(out).length ? out : undefined;
    }
    return isText(node) ? get(key) : undefined;
  };
  const buildArray = (list, key) => {
    const keyed = isKeyed(list);
    const items = list.map((item, i) => {
      const child = build(item, key + step(list, i));
      if (child === undefined) return null;
      return keyed ? { [keyField(item)]: keyOf(item), ...child } : child;
    });
    if (keyed) {
      const kept = items.filter((x) => x !== null);
      return kept.length ? kept : undefined;
    }
    while (items.length && items.at(-1) === null) items.pop();
    return items.length ? items : undefined;
  };
  return build(content, '') ?? {};
}

/* ---------- Trạng thái song ngữ trong editor ---------- */

/* Trạng thái lúc mở editor, đọc từ nội dung: bản dịch có sẵn coi như đã khớp với tiếng Việt hiện tại (lúc xuất bản
   luôn dịch cho khớp rồi mới lưu); câu tự sửa đã qua kiểm tra lúc xuất bản nên coi như đã kiểm tra. */
export function translationState(content, lang) {
  const en = readTranslation(content, content.translations?.[lang]);
  const vi = new Map(textEntries(content).map((e) => [e.key, e.text]));
  const manual = (content.translationNotes?.[lang]?.manual ?? []).filter((k) => en.has(k));
  return {
    lang,
    en: Object.fromEntries(en),
    source: Object.fromEntries([...en.keys()].map((k) => [k, vi.get(k)])),
    manual,
    checked: Object.fromEntries(manual.map((k) => [k, en.get(k)])),
  };
}

// Các chỗ {n}, {price} trong câu: bản dịch phải giữ đủ, không thì component không điền được số.
export function placeholders(text) {
  return [...String(text).matchAll(/\{[a-zA-Z]+\}/g)].map((m) => m[0]).sort().join(' ');
}

/* Việc còn chờ, tính lại mỗi lần cần (không gọi AI):
   - translate: câu chưa có bản dịch, hoặc tiếng Việt đã đổi mà bản dịch là của AI;
   - conflicts: tiếng Việt đã đổi mà bản tiếng Anh là người dùng tự sửa, cần người dùng chọn dịch lại hay giữ;
   - review: câu tự sửa chưa được AI kiểm tra (hoặc sửa tiếp sau lần kiểm tra);
   - broken: câu dịch thiếu hoặc thừa chỗ {n} so với tiếng Việt, mã tự thấy nên báo được ngay. */
export function pendingWork(content, state) {
  const manual = new Set(state.manual);
  const out = { translate: [], conflicts: [], review: [], broken: [] };
  textEntries(content).forEach((entry) => {
    const en = state.en[entry.key];
    const changed = state.source[entry.key] !== entry.text;
    if (en === undefined || (changed && !manual.has(entry.key))) {
      out.translate.push(entry);
      return;
    }
    const item = { ...entry, en };
    if (changed) out.conflicts.push(item);
    else if (manual.has(entry.key) && state.checked[entry.key] !== en) out.review.push(item);
    if (placeholders(en) !== placeholders(entry.text)) out.broken.push(item);
  });
  return out;
}

// Người dùng sửa tay một câu tiếng Anh: AI không ghi đè câu này nữa, và câu sẽ được kiểm tra ở lượt gom tới.
export function setManual(state, key, text) {
  return { ...state, en: { ...state.en, [key]: text }, manual: [...new Set([...state.manual, key])] };
}

/* Ghi kết quả AI vào trạng thái mới nhất. AI trả lời mất vài giây, trong lúc đó người dùng có thể sửa tiếp, nên mỗi kết
   quả mang theo chữ lúc gửi đi và chỉ được ghi khi chỗ đó chưa đổi:
   - translated: [{ key, text, en }]: câu AI dịch từ câu tiếng Việt text; tiếng Việt đã đổi hoặc người dùng đã tự sửa
     câu đó trong lúc chờ thì bỏ, lượt sau dịch lại;
   - checked: [{ key, en }]: câu tự sửa AI xem là ổn; người dùng đã sửa tiếp thì bỏ, lượt sau kiểm tra lại. */
export function applyResults(state, content, { translated = [], checked = [] }) {
  const vi = new Map(textEntries(content).map((e) => [e.key, e.text]));
  const en = { ...state.en };
  const source = { ...state.source };
  const done = { ...state.checked };
  const manual = new Set(state.manual);
  translated.forEach((r) => {
    if (vi.get(r.key) !== r.text || manual.has(r.key)) return;
    en[r.key] = r.en;
    source[r.key] = r.text;
  });
  checked.forEach((r) => {
    if (en[r.key] === r.en) done[r.key] = r.en;
  });
  return { ...state, en, source, checked: done };
}

// Câu có tiếng Việt đã đổi: người dùng chọn giữ bản tiếng Anh của mình (coi như đã khớp với tiếng Việt mới).
export function keepManual(state, content, key) {
  const entry = textEntries(content).find((e) => e.key === key);
  return entry ? { ...state, source: { ...state.source, [key]: entry.text } } : state;
}

// Câu có tiếng Việt đã đổi: người dùng chọn cho AI dịch lại; câu thành của AI, sẽ được dịch ở lượt gom tới.
export function dropManual(state, key) {
  const source = { ...state.source };
  delete source[key];
  return { ...state, source, manual: state.manual.filter((k) => k !== key) };
}

// Ghi kết quả kiểm tra: câu đã xem (dùng gợi ý thì đổi câu luôn) không bị gửi kiểm tra lại cho tới khi sửa tiếp.
export function setChecked(state, key, text = state.en[key]) {
  return { ...state, en: { ...state.en, [key]: text }, checked: { ...state.checked, [key]: text } };
}

// Bộ nhớ dịch: câu tiếng Việt -> câu đã dịch, từ trạng thái hiện tại; câu trùng (khối sao chép, chữ giao diện lặp lại)
// lấy lại bản đã có thay vì gọi AI. Có thể gộp thêm bản dịch của thương hiệu làm khung bằng addMemory.
export function memoryOf(content, state) {
  const memory = new Map();
  textEntries(content).forEach((e) => {
    const en = state.en[e.key];
    if (en !== undefined && state.source[e.key] === e.text && !memory.has(e.text)) memory.set(e.text, en);
  });
  return memory;
}

export function addMemory(memory, content, translation) {
  if (!content || !translation) return memory;
  const en = readTranslation(content, translation);
  textEntries(content).forEach((e) => {
    if (en.has(e.key) && !memory.has(e.text)) memory.set(e.text, en.get(e.key));
  });
  return memory;
}

// Ghi bản dịch vào nội dung để lưu hoặc xuất bản: translations.<lang> và danh sách câu tự sửa.
export function toContent(content, state) {
  const translation = buildTranslation(content, state.en);
  const keys = new Set(textEntries(content).map((e) => e.key));
  const manual = state.manual.filter((k) => keys.has(k));
  const out = { ...content, translations: { ...content.translations, [state.lang]: translation } };
  const notes = { ...content.translationNotes };
  if (manual.length) notes[state.lang] = { manual };
  else delete notes[state.lang];
  if (Object.keys(notes).length) out.translationNotes = notes;
  else delete out.translationNotes;
  return out;
}

/* ---------- Bật, tắt ngôn ngữ ---------- */

// Bật một ngôn ngữ: thêm vào languages và chữ cho nút đổi ngôn ngữ ở header (chữ "Ngôn ngữ" được dịch như mọi chữ khác).
// Trả về bản sao, không sửa nội dung truyền vào.
export function withLanguage(content, lang, base = 'vi') {
  const languages = [...new Set([base, ...(content.languages ?? []), lang])];
  const names = { label: 'Ngôn ngữ', ...content.header?.lang };
  languages.forEach((code) => { names[code] ??= code.toUpperCase(); });
  return { ...content, languages, header: { ...content.header, lang: names } };
}

// Tắt một ngôn ngữ: bỏ khỏi languages, bỏ bản dịch đi kèm; còn một ngôn ngữ thì bỏ luôn nút ở header.
export function withoutLanguage(content, lang) {
  const out = { ...content, languages: (content.languages ?? []).filter((code) => code !== lang) };
  ['translations', 'translationNotes'].forEach((field) => {
    const rest = { ...content[field] };
    delete rest[lang];
    if (Object.keys(rest).length) out[field] = rest;
    else delete out[field];
  });
  if (out.languages.length < 2) {
    delete out.languages;
    if (out.header?.lang) {
      out.header = { ...out.header };
      delete out.header.lang;
    }
  }
  return out;
}
