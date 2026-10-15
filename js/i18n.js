/* i18n.js - song ngữ: chọn ngôn ngữ và ghép bản dịch vào nội dung của thương hiệu.
   Bản gốc là brands/<id>/content.json (tiếng Việt). Thương hiệu có bản dịch thì khai "languages": ["vi", "en"] trong
   content.json và đặt brands/<id>/content.en.json: file này chỉ chứa chữ đã dịch, cùng cấu trúc với bản gốc. Khi khách
   chọn EN, chữ trong file dịch được ghép đè lên đúng vị trí của bản gốc; giá, ảnh, id, ngày còn chỗ vẫn lấy từ bản gốc
   nên hai thứ tiếng không bao giờ lệch nhau. Thêm một ngôn ngữ là thêm một file, không sửa mã. */

const STORAGE_KEY = 'clauki-lang';
export const BASE_LANG = 'vi';
// Mã ngôn ngữ cho Intl (ngày, tiền): tiếng Anh dùng kiểu Anh (20 October), gần cách viết ngày của người Việt.
const LOCALES = { vi: 'vi-VN', en: 'en-GB' };
// Chỉ nhận mã ngôn ngữ ngắn, để giá trị trên địa chỉ không trỏ được tới tệp nào khác.
const VALID = /^[a-z]{2}$/;

// Ngôn ngữ khách chọn: ?lang=en trên địa chỉ (link chia sẻ) được ưu tiên và nhớ lại, rồi tới lần chọn trước.
export function currentLang() {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (fromUrl && VALID.test(fromUrl)) {
    saveLang(fromUrl);
    return fromUrl;
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && VALID.test(saved)) return saved;
  } catch {
    // Trình duyệt chặn bộ nhớ (chế độ riêng tư): dùng tiếng Việt.
  }
  return BASE_LANG;
}

function saveLang(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Không lưu được thì lần sau về tiếng Việt, trang vẫn chạy.
  }
}

// Đổi ngôn ngữ: lưu lại, bỏ ?lang cũ trên địa chỉ (nếu có) rồi báo core.js dựng lại trang.
export function setLang(lang) {
  if (!VALID.test(lang)) return;
  saveLang(lang);
  const url = new URL(location.href);
  if (url.searchParams.has('lang')) {
    url.searchParams.delete('lang');
    history.replaceState(history.state, '', url);
  }
  document.dispatchEvent(new CustomEvent('wl:lang', { detail: { lang } }));
}

// Ngôn ngữ thật sự dùng cho một thương hiệu: thương hiệu không có bản dịch đó thì về tiếng Việt.
export function langFor(raw) {
  const lang = currentLang();
  return (raw?.languages ?? []).includes(lang) ? lang : BASE_LANG;
}

export function localeOf(lang) {
  return LOCALES[lang] ?? LOCALES[BASE_LANG];
}

// Locale cho định dạng ngày, tiền trong component: đọc từ <html lang> mà core.js đặt mỗi lần dựng trang.
export function pageLocale() {
  return localeOf(document.documentElement.lang || BASE_LANG);
}

/* ---------- Ghép bản dịch ---------- */

// Phần tử trong mảng được khớp theo khoá nhận diện, không theo thứ tự, để dời thứ tự section hay tour trong bản gốc
// thì bản dịch không bị lệch sang khối khác: trang theo path, section và tour theo id. Section không có id (ví dụ
// breadcrumb) thì theo type. Mảng không có khoá nào (menu, các dòng đã gồm) thì khớp theo thứ tự.
function keyOf(item) {
  if (!item || typeof item !== 'object') return null;
  return item.path ?? item.id ?? item.type ?? null;
}

function mergeArray(base, over, path, report) {
  const keyed = over.some((item) => keyOf(item) !== null);
  if (!keyed) {
    return base.map((item, i) => (i < over.length ? mergeValue(item, over[i], `${path}[${i}]`, report) : item));
  }
  over.forEach((item) => {
    if (!base.some((b) => keyOf(b) === keyOf(item))) report(`${path}: không có mục "${keyOf(item)}" trong bản gốc`);
  });
  return base.map((item) => {
    const match = over.find((o) => keyOf(o) === keyOf(item));
    return match ? mergeValue(item, match, `${path}[${keyOf(item)}]`, report) : item;
  });
}

function mergeValue(base, over, path, report) {
  if (over === null || over === undefined) return base;
  if (Array.isArray(base) && Array.isArray(over)) return mergeArray(base, over, path, report);
  if (base && typeof base === 'object' && over && typeof over === 'object' && !Array.isArray(over)) {
    const out = { ...base };
    Object.entries(over).forEach(([key, value]) => {
      if (!(key in base)) {
        report(`${path}.${key}: bản gốc không có khoá này`);
        return;
      }
      out[key] = mergeValue(base[key], value, `${path}.${key}`, report);
    });
    return out;
  }
  // Chỉ thay chữ bằng chữ: bản dịch ghi nhầm vào chỗ là số, ảnh, cấu trúc thì giữ bản gốc.
  if (typeof base === 'string' && typeof over === 'string') return over;
  report(`${path}: bản dịch không phải chữ hoặc bản gốc không phải chữ, giữ bản gốc`);
  return base;
}

// Ghép bản dịch vào nội dung; những chỗ không khớp được báo trong console để người dịch sửa, trang vẫn chạy.
export function mergeTranslation(raw, translation) {
  const problems = [];
  const merged = mergeValue(raw, translation, raw.id, (msg) => problems.push(msg));
  if (problems.length) console.warn(`Bản dịch ${raw.id} có ${problems.length} chỗ không khớp:`, problems);
  return merged;
}

const cache = new Map();

// Tải bản dịch của thương hiệu (một lần, giữ lại cho các lần dựng sau). Lỗi mạng, thiếu file thì dùng bản gốc.
async function loadTranslation(dataRoot, id, lang) {
  const key = `${id}:${lang}`;
  if (!cache.has(key)) {
    cache.set(key, fetch(`${dataRoot}/${id}/content.${lang}.json`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .catch((err) => {
        console.warn(`Không tải được bản dịch ${key}, dùng bản gốc:`, err);
        cache.delete(key);
        return null;
      }));
  }
  return cache.get(key);
}

// Nội dung theo ngôn ngữ đang chọn: tiếng Việt hoặc thương hiệu chưa có bản dịch thì trả nguyên bản gốc.
export async function localize(raw, dataRoot) {
  const lang = langFor(raw);
  if (lang === BASE_LANG) return raw;
  const translation = await loadTranslation(dataRoot, raw.id, lang);
  return translation ? mergeTranslation(raw, translation) : raw;
}
