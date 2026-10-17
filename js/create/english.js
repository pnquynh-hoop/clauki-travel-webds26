/* english.js - bản tiếng Anh cho site AI tạo ở /tao (#188). Không viết cách dịch mới: dùng lại phần song ngữ của editor
   (i18n-text.js: rút chữ, theo dõi câu nào cần dịch, ghi translations.en; ai/translate.js: gọi AI dịch theo lô).
   - Tạo xong bản tiếng Việt thì dịch cả site một lượt; chữ giao diện có sẵn bản tiếng Anh của thương hiệu khung (nếu khung
     có content.en.json) thì lấy lại, không gọi AI.
   - Lúc xuất bản thì dịch nốt các câu đã đổi sau đó (chỉnh tay, AI sửa trong editor): i18n-text.js so câu tiếng Việt hiện tại
     với câu lúc dịch (state.source), chỉ câu khác mới gửi AI.
   AI lỗi hay hết lượt thì không chặn: câu chưa dịch hiện tiếng Việt. */
import { translationState, applyResults, toContent, withLanguage, addMemory } from '../core/i18n-text.js';
import { syncTranslation } from '../ai/translate.js';

const LANG = 'en';

async function fetchJson(url) {
  try {
    const res = await fetch(url);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

// Bộ nhớ dịch từ thương hiệu khung: câu tiếng Việt của khung -> câu tiếng Anh của khung.
async function frameMemory(frame) {
  if (!frame) return new Map();
  const content = await fetchJson(`/brands/${frame}/content.json`);
  if (!content?.languages?.includes(LANG)) return new Map();
  return addMemory(new Map(), content, await fetchJson(`/brands/${frame}/content.${LANG}.json`));
}

// Trả về { content (có languages, header.lang, translations.en), i18n (trạng thái để editor và lần xuất bản sau dùng), stats }.
// state: trạng thái song ngữ đang có (nháp đã chỉnh trong editor), để chỉ dịch các câu đã đổi.
export async function addEnglish(content, { frame = '', state = null, on = {} } = {}) {
  const base = withLanguage(content, LANG);
  const current = state ?? translationState(base, LANG);
  const memory = await frameMemory(frame);
  const result = await syncTranslation({ content: base, state: current, memory, on });
  const next = applyResults(current, base, result);
  return { content: toContent(base, next), i18n: next, stats: result.stats };
}
