/* publish.js - các bước xuất bản một site khách, dùng chung cho trình tạo web /tao và editor (nút Xuất bản ở thanh trên):
   kiểm tên trang, dịch nốt bản tiếng Anh, đặt id và email theo tên, rồi ghi lên Supabase (thêm mới, hoặc cập nhật khi là máy demo).
   Ô tên tác giả (bắt buộc khi xuất bản mới) dựng ở đây để /tao và editor cùng một câu chữ; ô tên trang, nút, khối chia sẻ nằm ở
   nơi gọi. */
import { h } from '../core/dom.js';
import { publishSite, updateSite, readDemoKey, SLUG_RE, RESERVED } from './sites.js';
import { usageMark, modelsSince } from '../ai/gemini.js';

// builtIn: id các thương hiệu có sẵn (brands.json), cũng là tên không được dùng.
export function slugError(slug, builtIn = []) {
  if (!SLUG_RE.test(slug)) return 'Tên từ 3 tới 30 ký tự, chỉ gồm chữ thường không dấu, số và dấu gạch ngang.';
  if (RESERVED.includes(slug) || builtIn.includes(slug)) return `Tên /${slug}/ là tên dành riêng, hãy chọn tên khác.`;
  return '';
}

/* ---------- Tác giả ---------- */

// Tên tác giả lưu vào cột author của bảng sites (không nằm trong nội dung, không hiện trên website). Nhớ trên máy để lần sau điền sẵn.
const AUTHOR_KEY = 'clauki-author';
const AUTHOR_MAX = 80;

export function authorError(name) {
  const value = name.trim();
  if (value.length < 2) return 'Hãy nhập tên tác giả (từ 2 ký tự) để xuất bản.';
  if (value.length > AUTHOR_MAX) return `Tên tác giả tối đa ${AUTHOR_MAX} ký tự.`;
  return '';
}

function readAuthor() {
  try {
    return localStorage.getItem(AUTHOR_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveAuthor(name) {
  try {
    localStorage.setItem(AUTHOR_KEY, name);
  } catch {
    // Trình duyệt chặn lưu thì lần sau nhập lại.
  }
}

// Nhãn, ô nhập và lời giải thích vì sao cần tên thật. onInput: nơi gọi xoá câu báo lỗi cũ.
export function authorField(id, onInput) {
  const input = h('input', { class: 'ed-input', id, maxlength: String(AUTHOR_MAX), autocomplete: 'name', required: true,
    placeholder: 'Ví dụ: Nguyễn Minh Anh, hoặc Homestay Nhà Gỗ', 'aria-describedby': `${id}-why` });
  input.value = readAuthor();
  input.addEventListener('input', () => onInput?.());
  const box = h('div', { class: 'ed-author' },
    h('label', { class: 'ed-field', for: id }, h('span', { text: 'Tên tác giả (bắt buộc)' })),
    input,
    h('p', { class: 'ed-hint', id: `${id}-why`, text: 'Tên của bạn, hoặc của nhóm, doanh nghiệp làm website này. ClauKi ghi nhận tác giả của từng website '
      + 'để hỗ trợ khi website gặp sự cố, và để phân tích, thống kê ai đang dùng công cụ, dùng cho việc gì, từ đó làm ClauKi tốt hơn. '
      + 'Tên chỉ lưu trong kho dữ liệu của ClauKi, không hiện trên website.' }));
  return { box, input };
}

// Máy demo đang sửa một site đã xuất bản (nháp có editOf, mở từ "Sửa trang này") và giữ đúng tên cũ: xuất bản là cập nhật trang đó.
export const isUpdate = (editOf, slug) => Boolean(editOf && slug === editOf && readDemoKey());

/* content: nội dung đã có bản dịch đang có (translations.en); i18n: trạng thái song ngữ để chỉ dịch các câu đã đổi sau lần dịch
   trước. on.stage('translate' | 'send'): báo bước đang làm cho nơi gọi hiện chữ. Trả về { model } (model AI đã dùng khi dịch nốt).
   Lỗi (trùng tên, nội dung không qua kiểm tra, mạng) thì ném Error có câu báo tiếng Việt. */
export async function publishContent({ slug, content, theme, author = '', i18n = null, update = false, on = {} }) {
  let out = { ...structuredClone(content), id: slug };
  let model = '';
  // Site có bản tiếng Anh: dịch nốt các câu đã đổi (chỉnh tay, AI sửa trong editor) rồi mới xuất bản. Không dịch được thì xuất bản
  // với bản tiếng Anh đang có; câu thiếu hiện tiếng Việt.
  if (out.languages?.includes('en')) {
    on.stage?.('translate');
    try {
      const mark = usageMark();
      const { addEnglish } = await import('../create/english.js');
      out = (await addEnglish(out, { state: i18n })).content;
      model = modelsSince(mark);
    } catch {
      // Giữ bản dịch đang có trong out.
    }
  }
  on.stage?.('send');
  out.contact = { ...out.contact, email: `xin-chao@${slug}.clauki` };
  if (update) await updateSite(slug, out, theme);
  else {
    await publishSite(slug, out, theme, author.trim());
    saveAuthor(author.trim());
  }
  return { model };
}
