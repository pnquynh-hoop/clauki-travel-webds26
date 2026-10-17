/* form.js - form sửa nội dung một khối trong editor (#82), sinh tự động theo FIELDS ở manifest.js.
   Form không tự sửa dữ liệu: mỗi thay đổi gọi ctx.set (đặt một giá trị) hoặc ctx.list (thêm, bớt, dời một mục),
   editor.js đưa chúng qua commit() để có hoàn tác và nháp. Chữ luôn qua textContent hoặc value, không ghép HTML. */
import { fieldsFor } from './manifest.js';
import { iconEl } from '../core/icon.js';
import { confirmAction } from './confirm.js';

export function getIn(obj, path) {
  if (!path) return obj;
  return path.split('.').reduce((node, key) => node?.[key], obj);
}

// Đặt giá trị theo đường dẫn "a.b.0.c"; thiếu nhánh nào thì tạo object rỗng.
export function setIn(obj, path, value) {
  const keys = path.split('.');
  let node = obj;
  for (const key of keys.slice(0, -1)) node = node[key] ??= {};
  node[keys.at(-1)] = value;
}

const join = (...parts) => parts.filter((p) => p !== '' && p !== undefined).join('.');
const fileName = (src) => src.split('/').pop();

// Kho ảnh của thương hiệu: mọi ảnh { src, alt } đã có trong content.json (kèm mô tả), cộng ảnh trong credits.
// Chỉ chọn trong kho này: không dán link ảnh tự do, ảnh nào cũng có giấy phép và dòng credits.
export function imageLibrary(content) {
  const found = new Map();
  const walk = (node) => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') {
      if (typeof node.src === 'string' && /^(images\/|\/brands\/|https:\/\/)/.test(node.src) && !node.src.endsWith('.svg')) {
        const old = found.get(node.src);
        if (!old || (!old.alt && node.alt)) found.set(node.src, { src: node.src, alt: node.alt ?? '' });
      }
      Object.values(node).forEach(walk);
    }
  };
  walk(content);
  for (const credit of content.credits ?? []) {
    if (credit.file && !found.has(credit.file) && !credit.file.endsWith('.svg')) found.set(credit.file, { src: credit.file, alt: '' });
  }
  return [...found.values()];
}

// Ô chữ: đổi giá trị khi rời ô. Đợi con trỏ sang ô mới rồi mới ghi, để editor vẽ lại xong trả con trỏ về đúng ô vừa bấm.
function textInput(ctx, path, value, long, label) {
  const attrs = { class: 'ed-input', 'data-ed-key': `${ctx.key}:${path}` };
  const input = long ? ctx.h('textarea', { ...attrs, rows: '3' }) : ctx.h('input', attrs);
  input.value = value ?? '';
  input.addEventListener('change', () => {
    const next = input.value.trim();
    setTimeout(() => ctx.set(path, next, `Sửa ${label.toLowerCase()}`));
  });
  return input;
}

function selectInput(ctx, path, value, options, label) {
  const select = ctx.h('select', { class: 'ed-select', 'data-ed-key': `${ctx.key}:${path}` },
    options.map(([v, text]) => ctx.h('option', { value: v, text, selected: v === value })));
  select.addEventListener('change', () => ctx.set(path, select.value, `Đổi ${label.toLowerCase()}`));
  return select;
}

// Ô số (giá, số chỗ, phí): ghi đúng kiểu số vào dữ liệu, vì component cộng trừ, định dạng tiền từ số; ghi chuỗi "390000"
// thì phần tính tiền hỏng. Ô trống, gõ sai, ngoài khoảng min, max, hay số lẻ (giá, số chỗ là số nguyên) thì không ghi và trả lại
// giá trị cũ.
function numberInput(ctx, path, value, field) {
  const input = ctx.h('input', { class: 'ed-input', type: 'number', inputmode: 'numeric', 'data-ed-key': `${ctx.key}:${path}`,
    min: field.min ?? 0, max: field.max, step: field.step ?? 1 });
  input.value = typeof value === 'number' ? String(value) : '';
  input.addEventListener('change', () => {
    const next = Number(input.value);
    const ok = input.value.trim() !== '' && Number.isInteger(next) && next >= (field.min ?? 0) && (field.max === undefined || next <= field.max);
    if (!ok) {
      input.value = typeof value === 'number' ? String(value) : '';
      return;
    }
    setTimeout(() => ctx.set(path, next, `Sửa ${field.label.toLowerCase()}`));
  });
  return input;
}

// Ảnh: xem trước, chọn trong kho, mô tả ảnh (bắt buộc). Chọn ảnh khác thì lấy luôn mô tả đã có của ảnh đó.
function imageInput(ctx, path, value, label) {
  const image = value ?? {};
  const options = [['', 'Chọn ảnh'], ...ctx.images.map((img) => [img.src, fileName(img.src)])];
  const select = ctx.h('select', { class: 'ed-select', 'aria-label': `${label}: chọn ảnh`, 'data-ed-key': `${ctx.key}:${path}:src` },
    options.map(([v, text]) => ctx.h('option', { value: v, text, selected: v === (image.src ?? '') })));
  select.addEventListener('change', () => {
    const picked = ctx.images.find((img) => img.src === select.value);
    ctx.set(path, { ...image, src: select.value, alt: picked?.alt || image.alt || '' }, `Đổi ${label.toLowerCase()}`);
  });
  const alt = ctx.h('input', { class: 'ed-input', 'aria-label': `${label}: mô tả ảnh`, placeholder: 'Mô tả ảnh cho người không nhìn thấy', 'data-ed-key': `${ctx.key}:${path}:alt` });
  alt.value = image.alt ?? '';
  alt.addEventListener('change', () => {
    const next = alt.value.trim();
    setTimeout(() => ctx.set(path, { ...image, alt: next }, `Sửa mô tả ${label.toLowerCase()}`));
  });
  return ctx.h('div', { class: 'ed-image' },
    image.src ? ctx.h('img', { class: 'ed-image__thumb', src: ctx.assetUrl(image.src), alt: '' }) : ctx.h('span', { class: 'ed-image__thumb ed-image__thumb--empty', text: 'Chưa có ảnh' }),
    ctx.h('div', { class: 'ed-image__fields' }, select, alt,
      image.src && !image.alt ? ctx.h('p', { class: 'ed-err', text: 'Cần mô tả ảnh.' }) : null));
}

function fieldEl(ctx, section, field, base = '') {
  const path = join(base, field.key);
  const value = getIn(section, path);
  if (field.type === 'list') return listEl(ctx, section, field, path, value ?? []);
  let control;
  if (field.type === 'image') control = imageInput(ctx, path, value, field.label);
  else if (field.type === 'select') control = selectInput(ctx, path, value, field.options, field.label);
  else if (field.type === 'number') control = numberInput(ctx, path, value, field);
  else control = textInput(ctx, path, value, field.type === 'long', field.label);
  return ctx.h(field.type === 'image' ? 'div' : 'label', { class: 'ed-field' }, ctx.h('span', { text: field.label }), control);
}

// Nút icon của một mục (mũi tên lên, xuống, thùng rác), cùng kiểu với nút của danh sách khối: title là tên việc ngắn
// hiện khi rê chuột, aria-label đọc kèm tên mục cho trình đọc màn hình.
function itemIcon(ctx, icon, title, onclick, { label = title, key, disabled = false, danger = false } = {}) {
  return ctx.h('button', { type: 'button', class: `ed-icon-btn${danger ? ' is-danger' : ''}`, 'data-ed-key': key, disabled, onclick, 'aria-label': label, title },
    iconEl(icon, 'ed-icon'));
}

// Danh sách: mỗi mục một khung có các trường con và nút lên, xuống, xoá ngang hàng tên mục; cuối danh sách có nút Thêm.
function listEl(ctx, section, field, path, items) {
  const rows = items.map((_, i) => {
    const name = `${field.label} ${i + 1}`;
    return ctx.h('fieldset', { class: 'ed-item' },
      ctx.h('legend', { class: 'ed-item__head' },
        ctx.h('span', { text: name }),
        ctx.h('span', { class: 'ed-block__acts' },
          itemIcon(ctx, 'arrow-up', 'Đưa lên', () => ctx.list(path, 'up', i), { label: `Đưa ${name} lên`, key: `${ctx.key}:${path}:${i}:up`, disabled: i === 0 }),
          itemIcon(ctx, 'arrow-down', 'Đưa xuống', () => ctx.list(path, 'down', i), { label: `Đưa ${name} xuống`, key: `${ctx.key}:${path}:${i}:down`, disabled: i === items.length - 1 }),
          itemIcon(ctx, 'trash-2', 'Xoá', async () => {
            if (await confirmAction(`Xoá ${name.toLowerCase()}?`, { note: 'Hoàn tác được.', danger: true })) ctx.list(path, 'remove', i);
          }, { label: `Xoá ${name}`, danger: true }))),
      field.fields.map((sub) => fieldEl(ctx, section, sub, join(path, String(i)))));
  });
  return ctx.h('div', { class: 'ed-list' },
    ctx.h('p', { class: 'ed-list__head', text: `${field.label} (${items.length})` }),
    rows,
    ctx.h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', 'data-ed-key': `${ctx.key}:${path}:add`, onclick: () => ctx.list(path, 'add', items.length, field.item), text: `Thêm ${field.label.toLowerCase()}` }));
}

// Form cho một object bất kỳ theo danh sách trường: dùng chung cho khối (buildForm) và mục trong danh mục (tab Danh mục).
// Trường optional chỉ hiện khi dữ liệu đã có.
export function buildFields(data, fields, ctx) {
  const shown = fields.filter((f) => !f.optional || getIn(data, f.key) !== undefined);
  return shown.length ? ctx.h('div', { class: 'ed-form' }, shown.map((f) => fieldEl(ctx, data, f))) : null;
}

export function buildForm(section, ctx) {
  return buildFields(section, fieldsFor(section), ctx)
    ?? ctx.h('p', { class: 'ed-hint', text: 'Khối này chưa có trường sửa được trong editor.' });
}
