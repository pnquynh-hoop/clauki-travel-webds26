/* generate.js - sinh website mới từ một đoạn mô tả (#81):
   1. Hồ sơ brand: một request trả JSON (tên, khẩu hiệu, nơi chốn, chủ nhà, giá, khung trang, màu). Có hồ sơ là hiện tên ngay.
   2. Chép khung (content.json của một thương hiệu có sẵn), tách các trường chữ riêng của brand (bỏ nhãn giao diện,
      thông báo lỗi, mẫu tin nhắn dùng chung), chia vài nhóm chạy song song; mỗi dòng trả về dạng "số|vị trí|chữ",
      code kiểm vị trí khớp số rồi áp ngay; dòng thiếu hoặc lệch thì gửi lại một lần.
   3. Số liệu do code điền từ hồ sơ (giá), ảnh và theme lấy từ khung; AI không tự viết con số ở nhiều chỗ. */
import { streamLines, generateJson, cleanText } from '../ai/gemini.js';
import { contrastRatio, AA } from '../editor/contrast.js';
import { setIn } from '../editor/form.js';

// Khung trang: thương hiệu có sẵn dùng làm bộ khung (bố cục, component, ảnh có giấy phép).
export const FRAMES = [
  { id: 'me-rach', label: 'Homestay, tính tiền theo khách', hint: 'nhà dân, homestay, một chỗ ở, giá theo đầu người' },
  { id: 'ganh-som', label: 'Nghỉ dưỡng nhiều hạng phòng', hint: 'resort, khách sạn, nhà nghỉ có vài hạng phòng giá khác nhau' },
  { id: 'bac-tra', label: 'Tour nhiều ngày theo lịch', hint: 'tour vài ngày, ngày khởi hành cố định, giá theo khách' },
  { id: 'sighgone', label: 'Tour trong ngày', hint: 'tour vài giờ trong thành phố, nhiều chuyến, nhiều phương tiện' },
];

// Trường kỹ thuật, chữ giao diện dùng chung và số liệu: giữ nguyên, không đưa cho AI.
const SKIP = new Set([
  'labels', 'errors', 'message', 'id', 'type', 'variant', 'href', 'src', 'currency', 'path', 'alt', 'file', 'license',
  'source', 'author', 'timezone', 'date', 'time', 'kind', 'effect', 'favicon', 'logo', 'credits', 'toTop', 'menu', 'hint',
  'touchHint', 'listLabel', 'reset', 'again', 'you', 'pick', 'done', 'power', 'channel', 'channelHint', 'offHint',
  'scoreLabel', 'dateLabel', 'navTitle', 'contactTitle', 'creditsTitle', 'action', 'availability', 'tags', 'vehicles',
  'buoi', 'topics', 'departures', 'windows', 'traffic', 'chart', 'stamp', 'rating', 'unit', 'item', 'phone', 'email',
]);
const NOT_TEXT = /^(https?:|images\/|#|\/|\d{4}-\d{2}|[\d\s.,:+-]+$|page:|tel:|mailto:)/;
// Khoảng 30 dòng mỗi luồng: mỗi luồng xong trong khoảng 15 giây; tối đa 8 luồng để vẫn dưới 15 request mỗi phút.
const FIELDS_PER_GROUP = 30;
const MAX_GROUPS = 8;

// Tên và khẩu hiệu lấy thẳng từ hồ sơ, không đưa AI viết lại lần nữa.
const FROM_PROFILE = ['brand.name', 'brand.slogan'];

function extractFields(node, path = [], out = []) {
  if (Array.isArray(node)) node.forEach((v, i) => extractFields(v, [...path, i], out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) if (!SKIP.has(k)) extractFields(v, [...path, k], out);
  } else if (typeof node === 'string' && node.trim().length > 1 && !NOT_TEXT.test(node.trim())) {
    out.push({ path, key: path.join('.'), value: node });
  }
  return out;
}

// Chia nhóm liền nhau, số ký tự mỗi nhóm gần bằng nhau. Mỗi dòng mang vị trí đầy đủ (pages.0.sections.2.title),
// nên cắt giữa một khối vẫn đủ ngữ cảnh; chia đều thì không luồng nào kéo dài thời gian của cả trang.
function splitGroups(fields) {
  const count = Math.min(MAX_GROUPS, Math.max(2, Math.ceil(fields.length / FIELDS_PER_GROUP)));
  const total = fields.reduce((s, f) => s + f.value.length, 0);
  const groups = [[]];
  let seen = 0;
  fields.forEach((f, i) => {
    if (seen >= (total / count) * groups.length && groups.length < count) groups.push([]);
    groups.at(-1).push(i);
    seen += f.value.length;
  });
  return groups.filter((g) => g.length);
}

const RULES = `Luật:
- Tiếng Việt tự nhiên, giọng riêng của thương hiệu; dùng chi tiết cụ thể của nơi chốn trong hồ sơ.
- Không dùng dấu chấm giữa hay gạch dài làm dấu ngăn, không HTML. Không cụm sáo rỗng như "trải nghiệm tuyệt vời", "đẳng cấp", "hàng đầu", "không thể bỏ qua"; không mở đầu câu bằng "Trải nghiệm".
- Không bịa tiện nghi, con số, số lượt khách hay điểm đánh giá không có trong hồ sơ; câu mẫu nói về điều hồ sơ không có thì viết chung chung hoặc nói về điều hồ sơ có.
- Tên người, tên nơi đúng như hồ sơ. Giá đúng như hồ sơ.`;

function profilePrompt(brief, frameId) {
  const frames = FRAMES.map((f) => `"${f.id}": ${f.label} (${f.hint})`).join('; ');
  return `Lập hồ sơ cho một thương hiệu du lịch hoặc lưu trú giả tưởng từ mô tả sau. Chỉ dùng thông tin có trong mô tả;
chỗ nào mô tả không nói thì đặt tên hoặc chi tiết hợp lý, nhưng không thêm tiện nghi hay con số mới.
Mô tả không liên quan tới du lịch, lưu trú, hoặc có nội dung không phù hợp thì chỉ trả {"tuChoi": "lý do ngắn, lịch sự, kèm gợi ý cách viết lại"}.

Mô tả: ${brief}

Khung trang có sẵn: ${frames}.${frameId ? ` Người dùng đã chọn khung "${frameId}".` : ' Chọn khung hợp nhất.'}
Màu: chọn bộ màu hợp nơi chốn, mã hex 6 số; chữ (ink), chữ phụ (muted), màu nhấn (accent) trên nền trang (bg) và trên nền thẻ (surface) phải tương phản từ 4.5; chữ trên nút (onPrimary) trên màu nút (primary) từ 4.5.

Tên: ngắn, dễ nhớ, có chất địa phương, không chép nguyên câu mô tả. Khẩu hiệu: tối đa 8 từ, nói một điều cụ thể của nơi này,
không mở đầu bằng "Trải nghiệm". chiTiet: 3 tới 5 chi tiết ngắn có trong mô tả. Viết gọn, JSON một dòng.

Trả về JSON đúng dạng:
{"ten": "", "slogan": "", "noiChon": "", "chuNha": "", "chiTiet": [""], "gia": 0, "donViGia": "", "khung": "",
 "mau": {"primary": "", "onPrimary": "", "bg": "", "surface": "", "ink": "", "muted": "", "accent": ""}}`;
}

function groupPrompt(profile, fields, idx) {
  const lines = idx.map((i) => `${i + 1}\t${fields[i].key}\t${fields[i].value.replace(/\s+/g, ' ')}`).join('\n');
  return `Bạn viết lại chữ của một phần website du lịch cho thương hiệu mới. Khung trang giữ nguyên.

Hồ sơ thương hiệu (bắt buộc theo đúng):
${JSON.stringify(profile)}

Mỗi dòng dưới đây gồm: số, vị trí, chữ của trang mẫu. Viết lại từng dòng cho thương hiệu mới, cùng vai trò, độ dài gần bằng chữ cũ.

Trả về đúng ${idx.length} dòng, mỗi dòng dạng: số|vị trí|chữ mới
Chép lại đúng số và vị trí như đầu vào, theo đúng thứ tự, không thêm chữ nào khác, không xuống dòng trong một giá trị.

${RULES}

${lines}`;
}

/* ---------- Màu ---------- */

// Bộ màu AI chọn: chỉ dùng khi đủ mã hex và đạt AA ở đúng các cặp editor kiểm (manifest.js CONTRAST), kể cả chữ
// trên thẻ (surface); không thì giữ màu của khung.
const PALETTE = { primary: '--color-primary', onPrimary: '--color-on-primary', bg: '--color-bg', surface: '--color-surface',
  ink: '--color-ink', muted: '--color-muted', accent: '--color-accent' };
const PAIRS = [['ink', 'bg'], ['muted', 'bg'], ['accent', 'bg'], ['onPrimary', 'primary'], ['ink', 'surface'], ['accent', 'surface']];

function paletteVars(mau) {
  if (!mau || !PAIRS.every(([a, b]) => (contrastRatio(mau[a], mau[b]) ?? 0) >= AA)) return null;
  return Object.fromEntries(Object.entries(PALETTE).map(([key, name]) => [name, String(mau[key]).toLowerCase()]));
}

/* ---------- Khung, ảnh, số liệu ---------- */

// Ảnh của khung: đổi sang đường dẫn tuyệt đối /brands/<khung>/images/..., để site khách dùng lại ảnh có giấy phép.
// Logo và favicon là của thương hiệu khung nên bỏ: header hiện tên chữ.
function rebase(content, base) {
  const walk = (node) => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if ((k === 'src' || k === 'file') && typeof v === 'string' && v.startsWith('images/')) node[k] = `/brands/${base}/${v}`;
        else walk(v);
      }
    }
  };
  walk(content);
  if (content.brand) content.brand.logo = '';
  if (content.meta) content.meta.favicon = '';
}

// Giá: nhân mọi trường giá của khung theo tỉ lệ giá trong hồ sơ so với giá thấp nhất của khung, làm tròn 10.000;
// nhờ vậy khung nhiều hạng phòng vẫn giữ chênh lệch giữa các hạng.
const PRICE_KEYS = new Set(['price', 'childPrice', 'extraGuestPrice', 'deposit', 'amount']);

function scalePrices(content, price) {
  const found = [];
  const walk = (node, fn) => {
    if (Array.isArray(node)) node.forEach((v) => walk(v, fn));
    else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if (PRICE_KEYS.has(k) && typeof v === 'number' && v > 0) fn(node, k, v);
        else walk(v, fn);
      }
    }
  };
  walk(content, (node, k, v) => { if (k === 'price') found.push(v); });
  const base = Math.min(...found);
  if (!found.length || !(price > 0) || !Number.isFinite(base)) return;
  const ratio = price / base;
  walk(content, (node, k, v) => { node[k] = Math.max(10000, Math.round((v * ratio) / 10000) * 10000); });
}

function applyProfile(content, profile, slug) {
  content.id = slug;
  if (content.place && profile.noiChon) content.place.name = profile.noiChon;
  content.contact = { ...content.contact, phone: '0123 456 789', email: `xin-chao@${slug}.clauki` };
  if (content.brand) {
    content.brand.name = profile.ten || content.brand.name;
    content.brand.slogan = profile.slogan || content.brand.slogan;
  }
  scalePrices(content, Number(profile.gia));
}

/* ---------- Chạy ---------- */

// on.profile(profile, info) khi có hồ sơ, on.field(done, total) mỗi dòng chữ nhận được, on.update(content, theme)
// mỗi lần dữ liệu đổi (trang xem trước dựng lại). Trả về { content, theme, profile, stats }.
export async function generateSite({ brief, frameId, slug, frames, on }) {
  const t0 = performance.now();
  const sec = () => Number(((performance.now() - t0) / 1000).toFixed(1));
  const profile = await generateJson(profilePrompt(brief, frameId));
  if (profile.tuChoi) {
    const err = new Error(profile.tuChoi);
    err.kind = 'refused';
    throw err;
  }
  const frame = frames.includes(frameId) ? frameId : (frames.includes(profile.khung) ? profile.khung : frames[0]);
  profile.khung = frame;
  const res = await fetch(`/brands/${frame}/content.json`);
  if (!res.ok) throw new Error(`Không tải được khung ${frame} (mã ${res.status}).`);
  const template = await res.json();
  const content = structuredClone(template);
  const fields = extractFields(template).filter((f) => !FROM_PROFILE.includes(f.key));
  rebase(content, frame);
  applyProfile(content, profile, slug);
  const vars = paletteVars(profile.mau);
  const theme = { base: frame, vars: vars ?? {} };
  const profileSec = sec();
  on.profile?.(profile, { sec: profileSec, frame, palette: Boolean(vars) });
  on.update?.(content, theme);

  const got = new Set();
  let first = 0;
  let mismatched = 0;
  const handle = (line) => {
    const m = line.match(/^\s*(\d+)\s*\|\s*([^|]+?)\s*\|(.*)$/);
    const i = m ? Number(m[1]) - 1 : -1;
    // Vị trí chép lại phải khớp số thứ tự; lệch thì để gửi lại, không áp nhầm chỗ.
    if (!m || !fields[i] || m[2] !== fields[i].key || got.has(i)) {
      mismatched += 1;
      return;
    }
    const value = cleanText(m[3], 600);
    if (!value) return;
    got.add(i);
    if (!first) first = sec();
    setIn(content, fields[i].key, value);
    on.field?.(got.size, fields.length);
    on.update?.(content, theme);
  };
  const groups = splitGroups(fields);
  await Promise.all(groups.map((idx) => streamLines('', groupPrompt(profile, fields, idx), handle)));
  const missing = fields.map((_, i) => i).filter((i) => !got.has(i));
  // Lượt gửi lại hỏng thì thôi: các chỗ thiếu giữ chữ của khung, người dùng sửa sau bằng editor.
  if (missing.length) await streamLines('', groupPrompt(profile, fields, missing), handle).catch(() => {});
  on.update?.(content, theme);
  const stats = { profile: profileSec, first, total: sec(), fields: fields.length, written: got.size, groups: groups.length, mismatched };
  return { content, theme, profile, stats };
}
