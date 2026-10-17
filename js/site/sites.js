/* sites.js - site khách tạo bằng trình tạo web /tao (#81): đọc và xuất bản trên Supabase, nháp nằm trên máy.
   Một site là { content, theme }: content cùng dạng content.json của thương hiệu có sẵn, theme gồm base (thư mục
   thương hiệu làm khung, lấy theme.css và ảnh của khung) và vars (biến CSS ghi đè). Địa chỉ: /<tên>/<trang>.
   Supabase chỉ làm kho dữ liệu: bảng sites cho ai cũng thêm, đọc; xuất bản xong là cố định, không ai sửa hay xoá
   được (trừ máy demo: updateSite, xem supabase/sites.sql). Khoá dưới đây là khoá công khai (publishable), quyền do RLS quyết định. */

export { SITE_SLUG_RE as SLUG_RE } from '../core/core.js';

const SUPABASE = {
  url: 'https://xpiopwkdtvhmqhwnhvdx.supabase.co',
  key: 'sb_publishable_rvm6H4aYw0i_sbk1M2CHTQ_P15BH761',
};

// Nháp của trình tạo web: chỉ trên máy này, xem ở /nhap/.
export const DRAFT_SLUG = 'nhap';
const DRAFT_KEY = 'clauki-tao';

// Tên không được dùng: thư mục của site, trang công cụ, tên miền con có sẵn; khớp danh sách trong supabase/sites.sql.
// Thương hiệu có sẵn kiểm riêng theo brands.json (SQL cũng chặn).
export const RESERVED = ['nhap', 'tao', 'sua', 's', 'css', 'js', 'brands', 'docs', 'supabase', 'editor', 'www', 'clauki', 'timider', 'api', 'admin', 'mail'];

// Bộ nhớ bị chặn hoặc nháp hỏng thì coi như chưa có nháp.
export function readTaoDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null');
  } catch {
    return null;
  }
}

// Ghi không được (bộ nhớ bị chặn, đầy) thì trả false: khung xem trước vẫn nhận nháp qua sự kiện, chỉ mất khi tải lại.
export function writeTaoDraft(draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

function headers(extra = {}) {
  return { apikey: SUPABASE.key, Authorization: `Bearer ${SUPABASE.key}`, ...extra };
}

export const publishReady = () => Boolean(SUPABASE.key);

// Địa chỉ công khai của site khách: trên web thật là tên miền con (abc.xachbalo.com, Cloudflare chuyển sang /s/abc/ của web này),
// chạy trên máy thì là /abc/ của máy. Mọi chỗ đưa link ra ngoài (màn xuất bản, QR, chép, chia sẻ) dùng hàm này.
const APP_HOST = 'clauki.xachbalo.com';
const ROOT_DOMAIN = 'xachbalo.com';
export function publicLink(slug, page = '') {
  const path = String(page).replace(/^\/+/, '');
  return location.hostname === APP_HOST ? `https://${slug}.${ROOT_DOMAIN}/${path}` : `${location.origin}/${slug}/${path}`;
}

// Khoá máy demo: chỉ máy thuyết trình dán vào (Tuỳ chọn ở /tao), lưu trên trình duyệt đó, không nằm trong repo. Có khoá thì sửa được
// site đã xuất bản: database (policy sua trong supabase/sites.sql) so mã băm của header x-demo-key với mã băm đã lưu.
const DEMO_KEY = 'clauki-demo-key';
export function readDemoKey() {
  try {
    return localStorage.getItem(DEMO_KEY) ?? '';
  } catch {
    return '';
  }
}
export function saveDemoKey(value) {
  try {
    if (value) localStorage.setItem(DEMO_KEY, value);
    else localStorage.removeItem(DEMO_KEY);
  } catch {
    // Bộ nhớ bị chặn: máy này không sửa được site đã xuất bản.
  }
}

// Site để dựng ở /<tên>/: nháp trên máy hoặc bản đã xuất bản. Không có thì trả về null.
export async function loadSite(slug) {
  if (slug === DRAFT_SLUG) {
    const draft = readTaoDraft();
    return draft?.content ? { content: draft.content, theme: draft.theme ?? {} } : null;
  }
  if (!publishReady()) return null;
  const res = await fetch(`${SUPABASE.url}/rest/v1/public_sites?slug=eq.${encodeURIComponent(slug)}&select=content,theme`, { headers: headers() });
  if (!res.ok) throw new Error(`Không tải được trang ${slug} (mã ${res.status}).`);
  const rows = await res.json();
  return rows[0] ?? null;
}

// Máy demo sửa site đã xuất bản: PATCH kèm x-demo-key. Khoá sai thì RLS cho 0 dòng (không báo lỗi), nên xin trả lại dòng đã sửa
// để biết có sửa được không.
export async function updateSite(slug, content, theme) {
  const res = await fetch(`${SUPABASE.url}/rest/v1/sites?slug=eq.${encodeURIComponent(slug)}&select=slug`, {
    method: 'PATCH',
    headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=representation', 'x-demo-key': readDemoKey() }),
    body: JSON.stringify({ content, theme, updated_at: new Date().toISOString() }),
  });
  const text = await res.text().catch(() => '');
  if (res.status === 400 || /check|violat/i.test(text)) throw new Error('Nội dung chưa qua kiểm tra (link, ảnh hoặc tên không được phép).');
  if (!res.ok) throw new Error(`Cập nhật chưa được (mã ${res.status}). Hãy thử lại.`);
  let rows = [];
  try {
    rows = JSON.parse(text);
  } catch {
    // Không đọc được kết quả: coi như chưa sửa được.
  }
  if (!rows.length) throw new Error('Không cập nhật được: khoá máy demo không đúng, hoặc trang này không còn.');
}

// Xuất bản: thêm một dòng. Trùng tên thì Supabase trả 409; nội dung không qua kiểm tra (link, ảnh lạ, quá lớn) trả 400.
export async function publishSite(slug, content, theme) {
  const res = await fetch(`${SUPABASE.url}/rest/v1/sites`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify({ slug, content, theme }),
  });
  if (res.ok) return;
  const text = await res.text().catch(() => '');
  if (res.status === 409) throw new Error('Tên này đã có người dùng, hãy chọn tên khác.');
  if (res.status === 400 || /check|violat/i.test(text)) throw new Error('Nội dung chưa qua kiểm tra (link, ảnh hoặc tên không được phép).');
  throw new Error(`Xuất bản chưa được (mã ${res.status}). Hãy thử lại.`);
}
