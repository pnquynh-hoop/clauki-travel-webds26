/* translate.js - AI dịch và kiểm tra bản tiếng Anh, dùng Gemini có sẵn (gemini.js). Trạng thái song ngữ và các việc
   còn chờ tính ở i18n-text.js; ở đây chỉ có phần gọi AI, và chỉ gọi khi editor cần:
   - syncTranslation: dịch các câu còn chờ (bấm "Thêm bản tiếng Anh", bật công tắc English);
   - finalCheck: lúc xem thử hoặc xuất bản, gom một lượt: dịch nốt câu chờ và kiểm tra các câu người dùng tự sửa.
   AI lỗi hay hết lượt thì không chặn: câu chưa dịch hiện tiếng Việt, stats.error ghi lý do để editor báo. */
import { streamLines, cleanText } from './gemini.js';
import { translatePrompt, reviewPrompt } from './prompts/translate.js';
import { pendingWork, memoryOf, placeholders } from '../i18n-text.js';

// Tên ngôn ngữ đưa vào lời dặn; ngôn ngữ chưa có ở đây thì Intl tự gọi tên (ví dụ "tiếng Nhật").
const LANG_NAMES = { en: 'tiếng Anh' };
// Khoảng 80 câu mỗi request (về trong khoảng 10 giây), tối đa 3 request cùng lúc: dịch cả một website chỉ tốn vài
// request, không chạm giới hạn 15 request mỗi phút của gói miễn phí.
const LINES_PER_GROUP = 80;
const PARALLEL = 3;

function langName(lang) {
  try {
    return LANG_NAMES[lang] ?? new Intl.DisplayNames(['vi'], { type: 'language' }).of(lang);
  } catch {
    return lang;
  }
}

// Chia thành nhóm liền nhau (câu cùng khối đi chung, đủ ngữ cảnh).
function chunks(list) {
  const out = [];
  for (let i = 0; i < list.length; i += LINES_PER_GROUP) out.push(list.slice(i, i + LINES_PER_GROUP));
  return out;
}

// Chạy các việc với số luồng giới hạn; một nhóm lỗi không làm hỏng các nhóm khác. Trả về lỗi cuối cùng (nếu có).
async function runPool(tasks) {
  let next = 0;
  let error = null;
  const worker = async () => {
    while (next < tasks.length) {
      const task = tasks[next];
      next += 1;
      await task().catch((err) => { error = err; });
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL, tasks.length) }, worker));
  return error;
}

/* Gửi AI dịch các mục (key, text); trả về Map câu tiếng Việt -> bản dịch. Dòng lệch vị trí hoặc mất chỗ {n} thì bỏ,
   gửi lại các câu thiếu một lần. */
async function askTranslate(lang, items, onLine) {
  const got = new Map();
  const ask = (group) => () => streamLines('', translatePrompt(langName(lang), group), (line) => {
    const m = line.match(/^\s*(\d+)\s*\|\s*([^|]+?)\s*\|(.*)$/);
    const item = m && group[Number(m[1]) - 1];
    const value = m ? cleanText(m[3], 1000) : '';
    if (!item || m[2] !== item.key || !value || placeholders(value) !== placeholders(item.text)) return;
    got.set(item.text, value);
    onLine?.();
  });
  let error = await runPool(chunks(items).map(ask));
  const missing = items.filter((e) => !got.has(e.text));
  if (missing.length) error = (await runPool(chunks(missing).map(ask))) ?? error;
  return { got, error };
}

/* Dịch các câu còn chờ của nội dung. memory (tuỳ chọn): Map câu Việt -> câu dịch có sẵn từ nguồn khác, ví dụ bản dịch
   của thương hiệu làm khung (addMemory). on.progress(done, total) báo tiến độ.
   Trả về { translated, stats }: translated là [{ key, text, en }] để ghi bằng applyResults của i18n-text.js;
   stats gồm total, reused (lấy lại từ bộ nhớ), translated (AI dịch), failed (chưa dịch được), error. */
export async function syncTranslation({ content, state, memory = new Map(), on = {} }) {
  const { translate } = pendingWork(content, state);
  const known = new Map([...memory, ...memoryOf(content, state)]);
  const translated = [];
  const ask = [];
  translate.forEach((e) => {
    if (known.has(e.text)) translated.push({ key: e.key, text: e.text, en: known.get(e.text) });
    else ask.push(e);
  });
  const reused = translated.length;
  // Câu trùng nhau chỉ gửi một lần.
  const unique = [...new Map(ask.map((e) => [e.text, e])).values()];
  let count = reused;
  on.progress?.(count, translate.length);
  const { got, error } = unique.length
    ? await askTranslate(state.lang, unique, () => on.progress?.(++count, translate.length))
    : { got: new Map(), error: null };
  ask.forEach((e) => {
    if (got.has(e.text)) translated.push({ key: e.key, text: e.text, en: got.get(e.text) });
  });
  const stats = {
    total: translate.length,
    reused,
    translated: translated.length - reused,
    failed: translate.length - translated.length,
    error: error?.message,
  };
  return { translated, stats };
}

/* AI kiểm tra các câu tiếng Anh người dùng tự sửa (pendingWork().review). Trả về { checked, issues, error }:
   checked là [{ key, en }] các câu ổn (ghi bằng applyResults, không gửi kiểm tra lại cho tới khi người dùng sửa tiếp);
   issues là câu có lỗi ({ key, path, text, en, suggestion, reason }) để editor hiện bảng tổng hợp, người dùng chọn
   setChecked(state, key, suggestion) để dùng gợi ý hoặc setChecked(state, key) để giữ nguyên. */
export async function reviewEnglish({ content, state }) {
  const { review } = pendingWork(content, state);
  const issues = [];
  const failed = new Set();
  const ask = (group) => () => streamLines('', reviewPrompt(langName(state.lang), group), (line) => {
    const m = line.match(/^\s*(\d+)\s*\|(.*)\|(.*)$/);
    const item = m && group[Number(m[1]) - 1];
    const suggestion = m ? cleanText(m[2], 1000) : '';
    if (!item || !suggestion || suggestion === item.en || placeholders(suggestion) !== placeholders(item.text)) return;
    issues.push({ ...item, suggestion, reason: cleanText(m[3], 200) });
  }).catch((err) => {
    // Nhóm lỗi thì các câu trong nhóm chưa được kiểm tra, để lượt sau gửi lại.
    group.forEach((e) => failed.add(e.key));
    throw err;
  });
  const error = await runPool(chunks(review).map(ask));
  const flagged = new Set(issues.map((i) => i.key));
  const checked = review.filter((e) => !flagged.has(e.key) && !failed.has(e.key)).map((e) => ({ key: e.key, en: e.en }));
  return { checked, issues, error: error?.message };
}

/* Hành động cuối (xem thử, lưu, xuất bản): dịch nốt câu chờ và kiểm tra câu tự sửa, chạy song song trong một lượt.
   Hai việc đụng hai nhóm câu khác nhau (câu của AI và câu tự sửa) nên chạy cùng lúc được. conflicts (tiếng Việt đã đổi
   mà bản tiếng Anh là của người dùng) và broken (mất chỗ {n}) không cần AI: editor tự tính bằng pendingWork. */
export async function finalCheck({ content, state, memory, on }) {
  const [synced, reviewed] = await Promise.all([
    syncTranslation({ content, state, memory, on }),
    reviewEnglish({ content, state }),
  ]);
  return {
    translated: synced.translated,
    checked: reviewed.checked,
    issues: reviewed.issues,
    stats: { ...synced.stats, reviewed: reviewed.checked.length + reviewed.issues.length, error: synced.stats.error ?? reviewed.error },
  };
}
