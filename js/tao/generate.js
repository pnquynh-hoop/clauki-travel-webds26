/* generate.js - sinh website mới từ một đoạn mô tả (#81):
   1. Hồ sơ brand: một request trả JSON (tên, khẩu hiệu, nơi chốn, chủ nhà, giá, khung trang, màu). Có hồ sơ là hiện tên ngay.
   2. Chép khung (content.json của một thương hiệu có sẵn), tách các trường chữ riêng của brand (bỏ nhãn giao diện,
      thông báo lỗi, mẫu tin nhắn dùng chung), chia vài nhóm chạy song song; mỗi dòng trả về dạng "số|vị trí|chữ",
      code kiểm vị trí khớp số rồi áp ngay; dòng thiếu hoặc lệch thì gửi lại một lần.
   3. Số liệu do code điền từ hồ sơ (giá), theme lấy từ khung; AI không tự viết con số ở nhiều chỗ.
   4. Ảnh: tìm ảnh thật theo nơi chốn (photos.js), AI loại ảnh lạc đề và viết mô tả tiếng Việt, rồi thay vào các chỗ ảnh của khung
      (trừ ảnh tách nền và ảnh đại diện); không tìm được thì giữ ảnh của khung. */
import { streamLines, generateJson, cleanText } from '../ai/gemini.js';
import { contrastRatio, AA } from '../editor/contrast.js';
import { setIn } from '../editor/form.js';
import { findPhotos } from './photos.js';
import { FONTS } from '../editor/manifest.js';
import { applyFont } from '../editor/ops.js';

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
Màu: chọn bộ màu hợp nơi chốn và khí hậu, mã hex 6 số; nền trang (bg) và nền thẻ (surface) phải là màu sáng (gần trắng, có thể ngả ấm hay mát); chữ (ink), chữ phụ (muted), màu nhấn (accent) trên nền trang và trên nền thẻ phải tương phản từ 4.5; chữ trên nút (onPrimary) trên màu nút (primary) từ 4.5.
phongChu: chọn một kiểu chữ hợp giọng nơi chốn trong các khoá sau: "montserrat" (hiện đại, gọn, hợp thành phố, resort hiện đại), "lora" (có chân, cổ điển, hợp núi, làng quê, truyền thống), "unbounded" (tròn, vui, trẻ trung, hợp tour ăn uống, bạn bè), "playfair" (sang trọng, hợp nghỉ dưỡng cao cấp), hoặc "" để giữ kiểu chữ của khung.

Tên: ngắn, dễ nhớ, có chất địa phương, không chép nguyên câu mô tả. Khẩu hiệu: tối đa 8 từ, nói một điều cụ thể của nơi này,
không mở đầu bằng "Trải nghiệm". chiTiet: 3 tới 5 chi tiết ngắn có trong mô tả. Viết gọn, JSON một dòng.
anhTimKiem: đúng 5 truy vấn tìm ảnh thật bằng tiếng Anh, mỗi truy vấn 2 tới 5 từ, gồm tên địa danh có thật (tỉnh, huyện, danh thắng) và một cảnh
cụ thể (phong cảnh, đường đi, món ăn, nhà ở); truy vấn đầu là cảnh đẹp nhất của nơi này; không dùng tên thương hiệu giả, không tìm chân dung.

Trả về JSON đúng dạng:
{"ten": "", "slogan": "", "noiChon": "", "chuNha": "", "chiTiet": [""], "gia": 0, "donViGia": "", "khung": "",
 "phongChu": "",
 "anhTimKiem": ["", "", "", "", ""],
 "mau": {"primary": "", "onPrimary": "", "bg": "", "surface": "", "ink": "", "muted": "", "accent": ""}}`;
}

// Hồ sơ đưa cho AI viết chữ: bỏ các truy vấn tìm ảnh (tiếng Anh) kẻo chúng lọt vào chú thích, câu chữ của trang.
const brandProfile = ({ anhTimKiem, ...rest }) => rest;

function groupPrompt(profile, fields, idx) {
  const lines = idx.map((i) => `${i + 1}\t${fields[i].key}\t${fields[i].value.replace(/\s+/g, ' ')}`).join('\n');
  return `Bạn viết lại chữ của một phần website du lịch cho thương hiệu mới. Khung trang giữ nguyên.

Hồ sơ thương hiệu (bắt buộc theo đúng):
${JSON.stringify(brandProfile(profile))}

Mỗi dòng dưới đây gồm: số, vị trí, chữ của trang mẫu. Viết lại từng dòng cho thương hiệu mới, cùng vai trò, độ dài gần bằng chữ cũ.

Trả về đúng ${idx.length} dòng, mỗi dòng dạng: số|vị trí|chữ mới
Chép lại đúng số và vị trí như đầu vào, theo đúng thứ tự, không thêm chữ nào khác, không xuống dòng trong một giá trị.

${RULES}

${lines}`;
}

/* ---------- Tinh chỉnh mô tả ---------- */

// Viết lại và bổ sung mô tả của người dùng thành một prompt đầy đủ trước khi tạo website: giữ nguyên mọi sự thật và con số người dùng đã
// nói, thêm chi tiết hợp lý về nơi chốn (cảnh quan, mùa đẹp, món, hoạt động, không khí, đối tượng, giọng điệu) để AI ở bước sau có nhiều chất liệu.
// Không bịa con số mới (giá, số phòng, sức chứa, giờ): thiếu thì ghi vào `thieu`; chi tiết đã thêm ghi vào `themVao` để người dùng biết mà sửa.
// Mô tả không phải du lịch hoặc lưu trú thì từ chối, như bước lập hồ sơ.
export async function refineBrief(brief) {
  const out = await generateJson(`Bạn giúp người dùng viết lại và bổ sung mô tả để một AI khác dựng website cho một nơi lưu trú hoặc một tour du lịch (thương hiệu giả tưởng).
Đây là bản mô tả cho AI đọc, không phải lời quảng cáo cho khách.

Mô tả gốc của người dùng: ${brief}

Viết thành một đoạn tiếng Việt đầy đủ, 5 tới 8 câu, khoảng 500 tới 900 ký tự, theo thứ tự: loại hình (ở hay đi tour) và nơi chốn cụ thể, dành cho ai,
điều khiến nơi này riêng biệt, cảnh quan và mùa đẹp, món ăn hoặc hoạt động quanh đó, không khí và giọng điệu của thương hiệu, giá và đơn vị tính (nếu có).
Luật:
- Giữ nguyên mọi sự thật, tên riêng, con số và chi tiết người dùng đã nói (buổi trong ngày, thời lượng, số người, giá, phương tiện). Không đổi, không mâu thuẫn với chúng; sửa chính tả, viết hoa tên địa danh.
- Được bổ sung chi tiết hợp lý, cụ thể cho đúng nơi chốn đó dựa vào hiểu biết thật về địa phương: cảnh quan, khí hậu, mùa đẹp, đặc sản, hoạt động quanh đó, không khí của chỗ ở hay của tour, kiểu khách hợp. Không bịa địa danh không có thật.
- Không thêm con số mới mà người dùng chưa nói: giá, số phòng, sức chứa, số người, khoảng cách, giờ giấc. Thiếu thì ghi vào "thieu" bằng cụm ngắn. Ý cốt lõi gồm: loại hình, nơi chốn cụ thể, đối tượng khách, số lượng, điểm riêng, giá cụ thể ("giá rẻ" chưa phải giá cụ thể).
- Câu khẳng định, cụ thể. Không lời mời gọi ("hãy", "tham gia ngay", "chào đón"), không tiếng lóng, không sáo rỗng ("tuyệt vời", "đẳng cấp"). Không dùng dấu chấm giữa hay gạch dài làm dấu ngăn, không HTML.
- "themVao": các chi tiết bạn đã bổ sung, mỗi chi tiết một cụm ngắn, tối đa 5.
- Mô tả không liên quan tới du lịch hoặc lưu trú, hoặc có nội dung không phù hợp thì chỉ trả {"tuChoi": "lý do ngắn, lịch sự, kèm gợi ý cách viết lại"}.

Ví dụ. Gốc: "homestay đà lạt giá rẻ cho nhóm bạn". Trả về:
{"moTa": "Homestay ở Đà Lạt dành cho nhóm bạn đi chung, giá rẻ. Chỗ ở nằm gần những đồi thông, buổi sáng sương mỏng và trời se lạnh, tối thường nhóm lửa hoặc nướng đồ ngoài sân. Khách có thể đi chợ đêm Đà Lạt, uống cà phê trên đồi và ăn món nóng như bánh tráng nướng, lẩu gà lá é. Không khí thân mật, thoải mái, hợp những chuyến đi tụ tập vài ngày.", "themVao": ["đồi thông và sương sớm", "nhóm lửa, nướng đồ ngoài sân", "chợ đêm, cà phê, món nóng"], "thieu": ["giá cụ thể mỗi đêm", "số phòng và sức chứa", "điểm riêng của chỗ ở"]}

Trả về JSON một dòng: {"moTa": "", "themVao": [""], "thieu": [""]}`);
  if (out.tuChoi) {
    const err = new Error(cleanText(out.tuChoi, 300));
    err.kind = 'refused';
    throw err;
  }
  const text = cleanText(out.moTa, 1200);
  if (!text) throw new Error('AI chưa viết lại được, hãy thử lại.');
  const list = (v) => (Array.isArray(v) ? v : []).map((s) => cleanText(s, 60)).filter(Boolean).slice(0, 5);
  return { text, added: list(out.themVao), missing: list(out.thieu) };
}

/* ---------- Màu ---------- */

// Bộ màu AI chọn hay lệch một cặp (nhất là màu nhấn trên nền sáng, chữ trắng trên nút vàng cam); bỏ cả bộ vì một cặp thì phí, nên sửa:
// chữ, chữ phụ, màu nhấn được tối dần cho tới khi đạt AA (4,5) trên cả nền trang và nền thẻ; chữ trên nút chọn trắng hay mực theo
// bên nào tương phản hơn, nếu vẫn chưa đạt thì tối màu nút. Nền tối thì bỏ (các khung thiết kế cho nền sáng), giữ màu của khung.
const PALETTE = { primary: '--color-primary', onPrimary: '--color-on-primary', bg: '--color-bg', surface: '--color-surface',
  ink: '--color-ink', muted: '--color-muted', accent: '--color-accent' };
const WHITE = '#ffffff';
const INK = '#111111';
const HEX = /^#[0-9a-f]{6}$/i;

function mixToward(hex, target, t) {
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = rgb(hex);
  const b = rgb(target);
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

// Tối màu fg dần (mỗi bước 8%) cho tới khi tương phản với mọi nền trong bgs từ AA; tối đa 20 bước.
function darkenToPass(fg, bgs) {
  let color = fg;
  for (let step = 0; step < 20; step += 1) {
    if (bgs.every((bg) => (contrastRatio(color, bg) ?? 0) >= AA + 0.05)) return color;
    color = mixToward(color, '#000000', 0.08);
  }
  return color;
}

function paletteVars(mau) {
  if (!mau) return null;
  const m = Object.fromEntries(Object.keys(PALETTE).map((k) => [k, String(mau[k] ?? '').trim().toLowerCase()]));
  if (!Object.values(m).every((v) => HEX.test(v))) return null;
  if ((contrastRatio(m.bg, WHITE) ?? 9) > 1.6 || (contrastRatio(m.surface, WHITE) ?? 9) > 1.6) return null;
  const bgs = [m.bg, m.surface];
  m.ink = darkenToPass(m.ink, bgs);
  m.muted = darkenToPass(m.muted, bgs);
  m.accent = darkenToPass(m.accent, bgs);
  const onWhite = contrastRatio(WHITE, m.primary) ?? 0;
  const onInk = contrastRatio(INK, m.primary) ?? 0;
  if (Math.max(onWhite, onInk) >= AA + 0.05) m.onPrimary = onWhite >= onInk ? WHITE : INK;
  else {
    m.onPrimary = WHITE;
    m.primary = darkenToPass(m.primary, [WHITE]);
  }
  return Object.fromEntries(Object.entries(PALETTE).map(([key, name]) => [name, m[key]]));
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

/* ---------- Ảnh theo nơi chốn ---------- */

// Chỗ nào không thay ảnh: ảnh tách nền (scene, poster, các ga của hero ride, thẻ hướng dẫn viên) và ảnh đại diện nhỏ.
const KEEP_KEYS = new Set(['avatar', 'scene', 'poster']);
const KEEP_SECTIONS = new Set(['cards']);
const IMAGE_FILE = /\.(jpe?g|png|webp)(\?|$)/i;

function imageSlots(content) {
  const slots = [];
  const walk = (node, keys, section) => {
    if (Array.isArray(node)) node.forEach((v, i) => walk(v, [...keys, String(i)], section));
    else if (node && typeof node === 'object') {
      const blocked = keys.some((k) => KEEP_KEYS.has(k)) || (section.type === 'hero' && keys.includes('stops')) || KEEP_SECTIONS.has(section.type);
      if (!blocked && typeof node.src === 'string' && IMAGE_FILE.test(node.src) && !/favicon|logo/i.test(node.src)) slots.push(node);
      for (const [k, v] of Object.entries(node)) walk(v, [...keys, k], section);
    }
  };
  for (const page of content.pages ?? [{ sections: content.sections ?? [] }]) for (const section of page.sections ?? []) walk(section, [], section);
  return slots;
}

// Gửi danh sách ảnh tìm được cho AI: giữ ảnh đúng nơi chốn, bỏ ảnh lạc đề (nước khác, cảnh không liên quan), viết mô tả ngắn tiếng Việt
// chỉ dựa vào mô tả có sẵn của ảnh. AI lỗi thì dùng tạm mô tả gốc, vẫn có ảnh.
async function vetPhotos(profile, photos) {
  const list = photos.map((p, i) => `${i}\t${p.alt.replace(/\s+/g, ' ')}`).join('\n');
  try {
    const out = await generateJson(`Nơi chốn của website: ${profile.noiChon}. Dưới đây là danh sách ảnh (số, mô tả gốc thường bằng tiếng Anh).
Giữ lại ảnh có vẻ chụp đúng nơi chốn hoặc một cảnh hợp với nơi đó; bỏ ảnh chụp ở nơi khác, chân dung cận mặt, ảnh không rõ nội dung.
Với mỗi ảnh giữ lại, viết mô tả tiếng Việt ngắn (tối đa 110 ký tự) cho người không nhìn thấy ảnh, chỉ nói điều có trong mô tả gốc, không bịa.
Trả JSON một dòng: {"giu": [{"i": 0, "alt": ""}]}

${list}`);
    const kept = (out.giu ?? []).filter((g) => photos[g.i] && typeof g.alt === 'string' && g.alt.trim())
      .map((g) => ({ ...photos[g.i], alt: cleanText(g.alt, 140) }));
    if (kept.length) return kept;
  } catch {
    // Không vet được: dùng nguyên danh sách.
  }
  return photos.map((p) => ({ ...p, alt: `${profile.noiChon}: ${p.alt}`.slice(0, 140) }));
}

// Thay ảnh vào các chỗ ảnh của khung theo thứ tự (ảnh đầu vào ảnh bìa), lặp vòng nếu chỗ nhiều hơn ảnh; credits chỉ giữ ảnh còn dùng
// của khung và thêm ảnh mới.
function applyPhotos(content, photos) {
  const slots = imageSlots(content);
  slots.forEach((slot, i) => {
    const photo = photos[i % photos.length];
    slot.src = photo.src;
    slot.alt = photo.alt;
  });
  const used = new Set();
  const collect = (node) => {
    if (Array.isArray(node)) node.forEach(collect);
    else if (node && typeof node === 'object') {
      if (typeof node.src === 'string') used.add(node.src);
      Object.entries(node).forEach(([k, v]) => { if (k !== 'credits') collect(v); });
    }
  };
  collect(content);
  const fresh = photos.filter((p) => used.has(p.src)).map((p) => p.credit);
  content.credits = [...(content.credits ?? []).filter((c) => used.has(c.file)), ...fresh];
  return slots.length;
}

async function photoTask({ profile, content, theme, photos, on }) {
  const queries = (Array.isArray(profile.anhTimKiem) ? profile.anhTimKiem : []).filter((q) => typeof q === 'string' && q.trim()).slice(0, 6);
  if (!photos?.on || !queries.length) return 0;
  const found = await findPhotos(queries, { pexelsKey: photos.pexelsKey });
  if (found.length < 3) return 0;
  const kept = await vetPhotos(profile, found);
  if (kept.length < 3) return 0;
  const count = applyPhotos(content, kept);
  on.update?.(content, theme);
  on.photos?.({ photos: kept.length, slots: count, source: photos.pexelsKey ? 'Pexels' : 'Wikimedia Commons' });
  return kept.length;
}

/* ---------- Chạy ---------- */

// on.profile(profile, info) khi có hồ sơ, on.field(done, total) mỗi dòng chữ nhận được, on.update(content, theme)
// mỗi lần dữ liệu đổi (trang xem trước dựng lại). Trả về { content, theme, profile, stats }.
export async function generateSite({ brief, frameId, slug, frames, photos, on }) {
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
  // Kiểu chữ AI chọn (khoá có trong danh sách của editor); khoá lạ hay rỗng thì giữ kiểu chữ của khung.
  const font = FONTS.find((f) => f.key && f.key === profile.phongChu);
  if (font) applyFont(theme, font.key);
  const profileSec = sec();
  on.profile?.(profile, { sec: profileSec, frame, palette: Boolean(vars), font: font?.label ?? null });
  on.update?.(content, theme);

  // Tìm ảnh chạy song song với việc viết chữ; lỗi mạng hay không tìm được thì giữ ảnh của khung.
  const photoRun = photoTask({ profile, content, theme, photos, on }).catch(() => 0);
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
  const photoCount = await photoRun;
  on.update?.(content, theme);
  const stats = { profile: profileSec, first, total: sec(), fields: fields.length, written: got.size, groups: groups.length, mismatched, photos: photoCount };
  return { content, theme, profile, stats };
}
