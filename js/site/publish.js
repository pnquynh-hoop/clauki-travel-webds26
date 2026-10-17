/* publish.js - các bước xuất bản một site khách, dùng chung cho trình tạo web /tao và editor (nút Xuất bản ở thanh trên):
   kiểm tên trang, dịch nốt bản tiếng Anh, đặt id và email theo tên, rồi ghi lên Supabase (thêm mới, hoặc cập nhật khi là máy demo).
   Giao diện (ô tên, nút, khối chia sẻ) nằm ở nơi gọi; tệp này không dựng gì trên trang. */
import { publishSite, updateSite, readDemoKey, SLUG_RE, RESERVED } from './sites.js';
import { usageMark, modelsSince } from '../ai/gemini.js';

// builtIn: id các thương hiệu có sẵn (brands.json), cũng là tên không được dùng.
export function slugError(slug, builtIn = []) {
  if (!SLUG_RE.test(slug)) return 'Tên từ 3 tới 30 ký tự, chỉ gồm chữ thường không dấu, số và dấu gạch ngang.';
  if (RESERVED.includes(slug) || builtIn.includes(slug)) return `Tên /${slug}/ là tên dành riêng, hãy chọn tên khác.`;
  return '';
}

// Máy demo đang sửa một site đã xuất bản (nháp có editOf, mở từ "Sửa trang này") và giữ đúng tên cũ: xuất bản là cập nhật trang đó.
export const isUpdate = (editOf, slug) => Boolean(editOf && slug === editOf && readDemoKey());

/* content: nội dung đã có bản dịch đang có (translations.en); i18n: trạng thái song ngữ để chỉ dịch các câu đã đổi sau lần dịch
   trước. on.stage('translate' | 'send'): báo bước đang làm cho nơi gọi hiện chữ. Trả về { model } (model AI đã dùng khi dịch nốt).
   Lỗi (trùng tên, nội dung không qua kiểm tra, mạng) thì ném Error có câu báo tiếng Việt. */
export async function publishContent({ slug, content, theme, i18n = null, update = false, on = {} }) {
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
  else await publishSite(slug, out, theme);
  return { model };
}
