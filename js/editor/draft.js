/* draft.js - bản nháp "Thử chỉnh" (#82) của một thương hiệu có sẵn, chỉ nằm trên máy này (localStorage).
   Nháp gồm content (bản sao content.json đã sửa) và theme (biến CSS ghi đè lên theme.css, font thêm nếu đổi cặp font).
   core.js đọc nháp mỗi lần dựng trang: có nháp thì dựng theo nháp, nên thoát editor rồi tải lại vẫn thấy bản đang thử.
   Tệp này nhỏ và không có giao diện; giao diện editor nằm ở editor.js, chỉ tải khi mở editor. */

const PREFIX = 'clauki-thu:';
// Ghi nhớ các biến đã gán lên <html> để gỡ đúng chúng khi nháp đổi hoặc bị xoá.
let applied = [];

// Dấu vân tay ngắn của content.json gốc lúc tạo nháp. Đội sửa và deploy content.json mới thì dấu khác:
// nháp cũ bị bỏ qua, không che mất bản mới.
export function fingerprint(raw) {
  const text = JSON.stringify(raw ?? null);
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  return `${text.length}-${hash.toString(36)}`;
}

// localStorage có thể bị chặn (cửa sổ ẩn danh, chặn cookie) hoặc chứa dữ liệu hỏng: coi như không có nháp.
// Có raw thì chỉ nhận nháp tạo từ đúng bản content.json đó.
export function readDraft(id, raw) {
  if (!id) return null;
  try {
    const text = localStorage.getItem(PREFIX + id);
    const draft = text ? JSON.parse(text) : null;
    if (draft?.content?.id !== id) return null;
    if (raw && draft.base !== fingerprint(raw)) return null;
    return draft;
  } catch {
    return null;
  }
}

export function writeDraft(id, draft) {
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify({ ...draft, at: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(id) {
  try {
    localStorage.removeItem(PREFIX + id);
  } catch {
    // Bộ nhớ bị chặn thì cũng không có nháp nào để xoá.
  }
}

// Gán biến của nháp lên <html> (đè theme.css vì style trên thẻ mạnh hơn) và nạp font của cặp font đã chọn.
// Gọi với theme rỗng thì gỡ hết, trang về đúng theme.css.
export function applyDraftTheme(theme) {
  const root = document.documentElement.style;
  applied.forEach((name) => root.removeProperty(name));
  applied = [];
  for (const [name, value] of Object.entries(theme?.vars ?? {})) {
    if (!name.startsWith('--') || typeof value !== 'string') continue;
    root.setProperty(name, value);
    applied.push(name);
  }
  const url = theme?.fontUrl;
  let link = document.getElementById('draft-font');
  // Chỉ nhận font của Google Fonts, đúng như theme.css được phép @import.
  if (!url || !url.startsWith('https://fonts.googleapis.com/')) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement('link');
    link.rel = 'stylesheet';
    link.id = 'draft-font';
    document.head.append(link);
  }
  if (link.href !== url) link.href = url;
}
