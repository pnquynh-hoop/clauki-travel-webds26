/* translate.js - lời nhắc dịch và soát bản tiếng Anh (js/ai/translate.js). */
import { NO_MARKS, lineFormat } from './shared.js';

const TRANSLATE_RULES = `Luật:
- Dịch sát nghĩa, tự nhiên, ngắn gọn như chữ trên một website du lịch; giữ vai trò của câu (chữ nút ngắn, tiêu đề gọn).
- Giữ nguyên tên thương hiệu và tên người. Địa danh Việt Nam viết theo cách quen thuộc với người đọc ngôn ngữ đó (tiếng Anh: bỏ dấu, ví dụ Cho Lon, Ben Thanh, Can Gio).
- Giữ nguyên mọi chỗ trong ngoặc nhọn như {n}, {price}, {name}: không dịch, không thêm, không bớt.
- Giữ nguyên con số, giờ, giá. Đơn vị tiền "đồng" hoặc "đ" viết là VND.
- ${NO_MARKS}`;

const oneLine = (text) => String(text).replace(/\s+/g, ' ');

// Dịch một nhóm câu. language: tên ngôn ngữ đích bằng tiếng Việt ("tiếng Anh"); items: [{ key, text }].
export function translatePrompt(language, items) {
  const lines = items.map((e, i) => `${i + 1}|${e.key}|${oneLine(e.text)}`).join('\n');
  return `Dịch chữ của một website du lịch từ tiếng Việt sang ${language}.

Mỗi dòng dưới đây gồm: số, vị trí, chữ tiếng Việt.
${lineFormat(items.length, 'bản dịch')}

${TRANSLATE_RULES}

${lines}`;
}

// Soát các câu người dùng tự viết bằng ngôn ngữ đích. items: [{ text: câu tiếng Việt, en: câu người dùng viết }].
export function reviewPrompt(language, items) {
  const lines = items.map((e, i) => `${i + 1}|${oneLine(e.text)}|${oneLine(e.en)}`).join('\n');
  return `Người dùng tự viết bản ${language} cho chữ của một website du lịch. Kiểm tra từng câu.

Mỗi dòng dưới đây gồm: số, câu tiếng Việt gốc, câu người dùng viết.
Chỉ báo câu có lỗi thật: sai chính tả, sai ngữ pháp, hoặc sai nghĩa rõ so với câu tiếng Việt. Câu viết khác cách dịch thông thường nhưng vẫn đúng và đúng ý thì coi là ổn, không báo.
Mỗi câu có lỗi trả về một dòng dạng: số|câu đã sửa|lý do ngắn bằng tiếng Việt
Câu đã sửa chỉ sửa chỗ sai, giữ cách viết của người dùng, giữ nguyên các chỗ trong ngoặc nhọn như {n}.
Không có câu nào lỗi thì trả về đúng một dòng: OK

${lines}`;
}
