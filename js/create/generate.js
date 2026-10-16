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
import { MENU, FOOTERS, composeFooter, composeHome, loadFrames, borrowPages } from './mix.js';
import { sanitizeFrame, choicesFor, MIX_VARIANTS, HEADER_CHOICES, SIGNATURE } from './rules.js';

// Khung trang: thương hiệu có sẵn dùng làm bộ khung (bố cục, component, ảnh có giấy phép).
export const FRAMES = [
  { id: 'me-rach', label: 'Homestay, tính tiền theo khách', hint: 'nhà dân, homestay, một chỗ ở, giá theo đầu người' },
  { id: 'ganh-som', label: 'Nghỉ dưỡng nhiều hạng phòng', hint: 'resort, khách sạn, nhà nghỉ có vài hạng phòng giá khác nhau' },
  { id: 'bac-tra', label: 'Tour nhiều ngày theo lịch', hint: 'tour từ 2 ngày trở lên, có đêm nghỉ, ngày khởi hành cố định, giá theo khách; chỉ chọn khi mô tả nói rõ nhiều ngày' },
  { id: 'sighgone', label: 'Tour trong ngày', hint: 'tour trong một ngày ở bất kỳ nơi nào (thành phố, núi, sông, đảo), chia chặng theo giờ, nhiều chuyến mỗi ngày; chọn khi mô tả không nói nhiều ngày' },
];

// Nhãn giao diện ngắn, chép nguyên là đúng (không nói về nơi chốn): lượt viết lại chữ sót không gửi lại các khoá này.
const UI_KEYS = new Set(['label', 'open', 'close', 'prev', 'next', 'best', 'total', 'availability', 'seatsLeft', 'soldOut', 'home', 'view',
  'group', 'hint', 'phone', 'name', 'book', 'from', 'perNight', 'duration', 'unit', 'left', 'placeholder', 'question']);

// Trường kỹ thuật và dữ liệu có cấu trúc: giữ nguyên, không đưa cho AI. Mọi chữ khác (kể cả nhãn, tin nhắn mẫu, câu báo lỗi, gợi ý)
// là dữ liệu như nhau, đều được viết lại cho nơi mới. vehicles, buoi, topics là bảng tra (id nối với tour), đổi nhãn sẽ lệch nghĩa.
const SKIP = new Set([
  'id', 'type', 'variant', 'href', 'src', 'path', 'file', 'license', 'source', 'author', 'credit', 'credits', 'timezone', 'favicon',
  'logo', 'alt', 'languages', 'currency', 'kind', 'effect', 'date', 'time', 'availability', 'item', 'rating', 'tags', 'vehicles', 'buoi',
  'topics', 'unit', 'phone', 'email',
]);
const NOT_TEXT = /^(https?:|images\/|#|\/|\d{4}-\d{2}|[\d\s.,:+-]+$|page:|tel:|mailto:)/;
// Mã như "can-gio", "len-den" (id tour trong danh sách chọn), không phải chữ.
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)+$/;
// Khoảng 30 dòng mỗi luồng: mỗi luồng xong trong khoảng 15 giây; tối đa 8 luồng để vẫn dưới 15 request mỗi phút.
const FIELDS_PER_GROUP = 30;
const MAX_GROUPS = 8;

// Tên và khẩu hiệu lấy thẳng từ hồ sơ, không đưa AI viết lại lần nữa.
const FROM_PROFILE = ['brand.name', 'brand.slogan'];

// Mọi chuỗi chữ của khung, gộp chuỗi giống hệt nhau (nhãn đặt chỗ lặp ở 7 trang tour) thành một dòng: AI viết một lần, áp cho mọi
// chỗ (paths). Nhờ gộp, đưa cả nhãn cho AI vẫn ít dòng hơn khi tách riêng nhãn giao diện (SighGone 736 dòng thay vì 873).
function extractFields(template) {
  const byValue = new Map();
  const walk = (node, path) => {
    if (Array.isArray(node)) node.forEach((v, i) => walk(v, [...path, i]));
    else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) if (!SKIP.has(k)) walk(v, [...path, k]);
    } else if (typeof node === 'string' && node.trim().length > 1 && !NOT_TEXT.test(node.trim()) && !SLUG.test(node.trim())) {
      const key = path.join('.');
      if (FROM_PROFILE.includes(key)) return;
      const field = byValue.get(node);
      if (field) field.paths.push(key);
      else byValue.set(node, { key, value: node, paths: [key] });
    }
  };
  walk(template, []);
  return [...byValue.values()];
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
- Tiếng Việt tự nhiên, viết đúng giọng trong hồ sơ (giong: xưng hô, từ địa phương, nhịp câu) cho mọi câu nói với khách, kể cả tin nhắn
  mẫu, câu báo lỗi, lời cảm ơn; nhãn nút, nhãn ngắn thì giữ rõ nghĩa, không chêm phương ngữ. Dùng chi tiết cụ thể của nơi chốn trong hồ sơ.
- Không dùng dấu chấm giữa hay gạch dài làm dấu ngăn, không HTML. Không cụm sáo rỗng như "trải nghiệm tuyệt vời", "đẳng cấp", "hàng đầu", "không thể bỏ qua"; không mở đầu câu bằng "Trải nghiệm".
- Không bịa tiện nghi, con số, số lượt khách hay điểm đánh giá không có trong hồ sơ; câu mẫu nói về điều hồ sơ không có thì viết chung chung hoặc nói về điều hồ sơ có.
- Tên người, tên nơi đúng như hồ sơ. Giá đúng như hồ sơ.`;

function profilePrompt(brief, frameId) {
  const frames = FRAMES.map((f) => `"${f.id}": ${f.label} (${f.hint})`).join('; ');
  return `Lập hồ sơ cho một thương hiệu du lịch hoặc lưu trú giả tưởng từ mô tả sau. Chỉ dùng thông tin có trong mô tả;
chỗ nào mô tả không nói thì đặt tên hoặc chi tiết hợp lý, nhưng không thêm tiện nghi hay con số mới.
Mô tả không liên quan tới du lịch, lưu trú, hoặc có nội dung không phù hợp thì chỉ trả {"tuChoi": "lý do ngắn, lịch sự, kèm gợi ý cách viết lại"}.

Mô tả: ${brief}

Khung trang có sẵn: ${frames}.${frameId ? ` Người dùng đã chọn khung "${frameId}".` : ' Chọn khung hợp nhất theo loại hình và số ngày; mô tả là tour mà không nói rõ nhiều ngày thì chọn "sighgone", không mặc định "bac-tra".'}
Luật màu (bắt buộc):
- Nền trang (bg) và nền thẻ (surface) sáng, gần trắng, ngả ấm hay mát nhẹ; chữ (ink) gần đen cùng tông nền, không dùng đen thuần #000000; chữ phụ (muted) là xám cùng tông.
- Màu nút (primary) là màu thương hiệu rõ ràng nhưng không chói: độ bão hoà vừa phải, không dùng màu neon, cyan sáng, hồng sáng, vàng chói. Chọn theo nơi chốn và khí hậu (biển: xanh lam hoặc xanh ngọc đậm; núi, rừng: xanh rêu, nâu đất; nắng gió: cam đất, vàng đất; phố cổ: đỏ gạch, vàng đất; đồng quê: xanh lá trầm).
- Màu nhấn (accent) cùng bảng với màu nút (cùng họ màu hoặc màu bổ sung đã trầm), đủ đậm để dùng làm chữ trên nền sáng. Tổng cộng tối đa hai màu chủ đạo cộng các màu trung tính; không dùng ba màu nhấn khác họ.
- Tương phản từ 4.5: chữ, chữ phụ, màu nhấn trên nền trang và trên nền thẻ; chữ trên nút (onPrimary) trên màu nút (primary).
dacTrung: các component đặc trưng chỉ được dùng khi thật sự phù hợp với nơi này. Dưới đây là danh sách (khoá: điều kiện phù hợp). Chỉ chọn khoá nào mà mô tả của người dùng thật sự thoả điều kiện; nghi ngờ thì không chọn; mảng rỗng là bình thường và là lựa chọn mặc định.
${SIGNATURE.filter((s) => !s.hard).map((s) => `- ${s.key}: ${s.fit}`).join('\n')}
trangChu: thứ tự các khối chung của trang chủ, từ 5 tới 8 khoá lấy từ danh sách sau (khoá: mô tả). Khung đã có sẵn các khối riêng của nó (đặt chỗ, danh sách tour...) nên code tự giữ; bạn chỉ chọn khối chung, mỗi loại (phần trước dấu hai chấm) tối đa một lần.
${MENU.map(([key, hint]) => `- ${key}: ${hint}`).join('\n')}
Luật: khoá đầu là một hero; chọn kiểu hợp giọng nơi chốn và trộn các kiểu khác nhau, tối đa MỘT khoá mặc định (phần sau dấu hai chấm để trống, như "faq:"), các khoá còn lại phải chọn kiểu riêng (như "faq:chat", "gallery:slices"); không chọn kiểu đầu tiên cho mọi loại; nên có reviews và faq; tips và policy chỉ chọn khi khoá đó cũng có trong dacTrung.
dauTrang: kiểu đầu trang, một trong "solid" (nền trang), "center" (tên ở giữa), "overlay" (trong suốt đè lên ảnh, chỉ khi hero là "hero:full").
chanTrang: kiểu chân trang, một trong ${FOOTERS.map(([key, hint]) => `"${key}" (${hint})`).join(', ')}. Chọn theo giọng nơi chốn, không mặc định "columns".
phongChu: chọn một kiểu chữ hợp giọng nơi chốn trong các khoá sau: "montserrat" (hiện đại, gọn, hợp thành phố, resort hiện đại), "lora" (có chân, cổ điển, hợp núi, làng quê, truyền thống), "unbounded" (tròn, vui, trẻ trung, hợp tour ăn uống, bạn bè), "playfair" (sang trọng, hợp nghỉ dưỡng cao cấp), hoặc "" để giữ kiểu chữ của khung.

Tên: ngắn, dễ nhớ, có chất địa phương, không chép nguyên câu mô tả. Khẩu hiệu: tối đa 8 từ, nói một điều cụ thể của nơi này,
không mở đầu bằng "Trải nghiệm". chiTiet: 3 tới 5 chi tiết ngắn có trong mô tả. Viết gọn, JSON một dòng.
giong: một câu tả giọng văn của website, theo vùng miền và loại khách trong mô tả: xưng hô với khách (mình, bạn, anh chị, cô chú...),
mức dùng từ địa phương, nhịp câu. Ví dụ miền Tây: "thân tình kiểu miệt vườn, xưng tụi mình, gọi khách là bạn, chêm vừa phải nè, nhen,
ghe, xuồng"; nghỉ dưỡng cao cấp: "trang nhã, xưng chúng tôi, gọi quý khách, câu ngắn, không chêm phương ngữ"; tour cho bạn trẻ ở phố:
"trẻ, vui, xưng tụi mình, câu ngắn". Mô tả có nói giọng hay vùng miền thì theo đúng mô tả.
gia: giá thấp nhất (một khách, hay một đêm nếu là chỗ ở) bằng đồng Việt Nam, số nguyên đủ các số 0 ("1 triệu 2" là 1200000, "45 triệu" là 45000000);
mô tả ghi giá ngoại tệ thì đổi sang đồng theo tỉ giá gần đúng; mô tả không nói giá thì 0 (giữ giá của khung), không tự đặt giá.
donViGia: đơn vị tính, không kèm tiền tệ: "khách", "đêm", "phòng", "nhóm".
anhTimKiem: đúng 5 truy vấn tìm ảnh thật bằng tiếng Anh, mỗi truy vấn 2 tới 5 từ, gồm tên địa danh có thật (tỉnh, huyện, danh thắng) đứng ĐẦU truy vấn rồi tới một cảnh
cụ thể (phong cảnh, đường đi, món ăn, nhà ở); truy vấn đầu là cảnh đẹp nhất của nơi này; không dùng tên thương hiệu giả, không tìm chân dung.

Trả về JSON đúng dạng:
{"ten": "", "slogan": "", "noiChon": "", "chuNha": "", "chiTiet": [""], "giong": "", "gia": 0, "donViGia": "", "khung": "",
 "phongChu": "",
 "dacTrung": [],
 "trangChu": ["", "", "", "", ""],
 "dauTrang": "",
 "chanTrang": "",
 "anhTimKiem": ["", "", "", "", ""],
 "mau": {"primary": "", "onPrimary": "", "bg": "", "surface": "", "ink": "", "muted": "", "accent": ""}}`;
}

// Hồ sơ đưa cho AI viết chữ: bỏ các truy vấn tìm ảnh (tiếng Anh) kẻo chúng lọt vào chú thích, câu chữ của trang.
const brandProfile = ({ anhTimKiem, dacTrung, trangChu, dauTrang, chanTrang, ...rest }) => rest;

// Tên thương hiệu, nơi chốn và tên sản phẩm trong catalog của mọi khung (trang và khối mượn từ khung khác cũng mang chữ của khung đó),
// lấy thẳng từ dữ liệu, để dò chữ còn sót của nơi cũ sau khi AI viết. pool: { id khung: content }.
// Cụm nào có trong chữ của hồ sơ mới (site mới cũng ở Sài Gòn) thì không coi là chữ cũ; chỉ xét trường chữ, vì khung (khung: "sighgone")
// hay khoá khối cũng nằm trong hồ sơ.
function oldNamesOf(pool, profile = {}) {
  const own = [profile.ten, profile.slogan, profile.noiChon, profile.chuNha, ...(Array.isArray(profile.chiTiet) ? profile.chiTiet : [])].join(' ').toLowerCase();
  const names = Object.values(pool).flatMap((f) => [f?.brand?.name, f?.place?.name, ...(f?.catalog?.items ?? []).map((item) => item.name)])
    .filter((n) => typeof n === 'string' && n.trim().length > 2 && !own.includes(n.toLowerCase()));
  // Khớp nguyên từ ("ghe" không khớp trong "nghe", "Quận 1" không khớp "Quận 10"); \b của JS không hiểu chữ có dấu nên dùng \p{L}.
  const list = [...new Set(names)].map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return names.length ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${list})(?![\\p{L}\\p{N}])`, 'u') : null;
}

// Chỗ giữ chỗ trong ngoặc nhọn ({name}, {n}...) code điền lúc chạy: chữ mới phải giữ đúng bộ đó, thiếu hay thừa thì bỏ dòng.
const holes = (text) => (text.match(/\{\w+\}/g) ?? []).sort().join(' ');

// Khung mẫu là website của một thương hiệu khác: nêu tên nó, nơi chốn và các sản phẩm của nó để AI biết chữ nào là của nơi cũ phải đổi.
function frameNote(template) {
  const names = [template.brand?.name, template.place?.name, ...(template.catalog?.items ?? []).map((item) => item.name)].filter(Boolean).slice(0, 12);
  if (!names.length) return '';
  return `Trang mẫu vốn là website của một thương hiệu khác (${names.join(', ')}). Mọi chữ nói về nơi chốn, địa danh, món ăn, phương tiện, lịch trình, con người, câu chuyện của trang mẫu phải đổi hẳn sang nơi mới, kể cả danh sách đã gồm, nên mang, các chặng; chỉ được chép nguyên chữ giao diện chung không nói về nơi chốn (tên nút, nhãn ngắn như "Đóng", "Trang chủ", "Hết chỗ").`;
}

// redo: lượt viết lại các dòng mà lượt trước chép y nguyên chữ của trang mẫu; banned: các cụm của trang mẫu còn trong các dòng đó.
function groupPrompt(profile, fields, idx, note = '', redo = false, banned = []) {
  const lines = idx.map((i) => `${i + 1}\t${fields[i].key}\t${fields[i].value.replace(/\s+/g, ' ')}`).join('\n');
  return `Bạn viết lại chữ của một phần website du lịch cho thương hiệu mới. Khung trang giữ nguyên.

Hồ sơ thương hiệu (bắt buộc theo đúng):
${JSON.stringify(brandProfile(profile))}

${note}
${redo ? 'Các dòng dưới đây ở lượt trước bị chép y nguyên chữ của trang mẫu. Viết lại cho nơi mới; chỉ dòng nào đúng là chữ giao diện chung, không nói gì về nơi chốn, mới được chép lại y nguyên.\n' : ''}${banned.length ? `Các cụm sau là của trang mẫu và không được còn trong dòng nào, kể cả nhãn ngắn: ${banned.join(', ')}. Viết lại cả câu cho hợp nơi mới, không chỉ xoá cụm đó.\n` : ''}
Mỗi dòng dưới đây gồm: số, vị trí, chữ của trang mẫu. Viết lại từng dòng cho thương hiệu mới, cùng vai trò, độ dài gần bằng chữ cũ.

Trả về đúng ${idx.length} dòng, mỗi dòng dạng: số|vị trí|chữ mới
Chép lại đúng số và vị trí như đầu vào, theo đúng thứ tự, không thêm chữ nào khác, không xuống dòng trong một giá trị.
Chỗ trong ngoặc nhọn như {name}, {n}, {price} là chỗ code tự điền: giữ đúng y nguyên, không dịch, không bỏ, không thêm.

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

// Luật độ chói áp bằng mã ngoài lời nhắc cho AI (AI hay vẫn chọn màu gắt): màu nút và màu nhấn bị hạ độ bão hoà xuống tối đa 70% và
// giữ độ sáng trong khoảng 22% tới 52%.
function toHsl(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

function fromHsl([h, s, l]) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor(h / 60) % 6];
  return `#${[r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('')}`;
}

function soften(hex) {
  const [h, s, l] = toHsl(hex);
  return fromHsl([h, Math.min(s, 0.7), Math.min(0.52, Math.max(0.22, l))]);
}

function paletteVars(mau, withDark = false) {
  if (!mau) return null;
  const m = Object.fromEntries(Object.keys(PALETTE).map((k) => [k, String(mau[k] ?? '').trim().toLowerCase()]));
  if (!Object.values(m).every((v) => HEX.test(v))) return null;
  if ((contrastRatio(m.bg, WHITE) ?? 9) > 1.6 || (contrastRatio(m.surface, WHITE) ?? 9) > 1.6) return null;
  m.primary = soften(m.primary);
  m.accent = soften(m.accent);
  // Màu nhấn khác họ với màu nút (xanh lá với nâu) làm trang lệch pha: giữ độ đậm nhạt của màu nhấn nhưng kéo về sắc của màu nút.
  const [hp] = toHsl(m.primary);
  const [ha, sa, la] = toHsl(m.accent);
  if (sa > 0.15 && Math.min(Math.abs(ha - hp), 360 - Math.abs(ha - hp)) > 35) m.accent = fromHsl([hp, sa, la]);
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
  return { ...Object.fromEntries(Object.entries(PALETTE).map(([key, name]) => [name, m[key]])), ...extraVars(m, withDark) };
}

const lightenToPass = (fg, bgs) => {
  let color = fg;
  for (let step = 0; step < 20 && !bgs.every((bg) => (contrastRatio(color, bg) ?? 0) >= AA + 0.05); step += 1) color = mixToward(color, WHITE, 0.08);
  return color;
};

// Biến màu phụ và bảng màu tối của khung (nền nhạt, dấu nhấn, chữ nhãn, --dark-*) vẫn mang màu thương hiệu khung (vàng, đỏ, xanh của
// SighGone) nên lệch với bảng màu mới: dựng lại cả từ màu nút và màu nhấn, cùng sắc, đủ tương phản.
function extraVars(m, withDark) {
  const [h, s] = toHsl(m.primary);
  const dark = { bg: fromHsl([h, Math.min(s, 0.18), 0.08]), surface: fromHsl([h, Math.min(s, 0.16), 0.12]) };
  const darkBgs = [dark.bg, dark.surface];
  const darkPrimary = fromHsl([h, Math.min(s, 0.6), 0.62]);
  const darkOn = (contrastRatio(INK, darkPrimary) ?? 0) >= (contrastRatio(WHITE, darkPrimary) ?? 0) ? INK : WHITE;
  const darkAccent = lightenToPass(m.accent, darkBgs);
  const darkInk = fromHsl([h, 0.12, 0.93]);
  const light = {
    '--color-tint': mixToward(m.bg, m.primary, 0.12),
    '--color-mark': m.accent,
    '--eyebrow-color': m.accent,
  };
  // Bảng màu tối chỉ dựng khi khung có chế độ tối (theme.css khai --dark-*); khung khác chưa thiết kế cho nền tối.
  if (!withDark) return light;
  return {
    ...light,
    '--dark-color-bg': dark.bg,
    '--dark-color-surface': dark.surface,
    '--dark-color-ink': darkInk,
    '--dark-color-muted': lightenToPass(fromHsl([h, 0.08, 0.7]), darkBgs),
    '--dark-color-accent': darkAccent,
    '--dark-color-primary': darkPrimary,
    '--dark-color-on-primary': darkOn,
    '--dark-color-tint': fromHsl([h, Math.min(s, 0.16), 0.16]),
    '--dark-color-mark': darkAccent,
    '--dark-eyebrow-color': darkAccent,
  };
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
  // Ảnh logo, favicon của thương hiệu khung dùng ở chỗ khác (ảnh đại diện trong khung chat hỏi đáp): bỏ, component hiện chữ tắt của tên mới.
  const dropMarks = (node) => {
    if (Array.isArray(node)) node.forEach(dropMarks);
    else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if (v && typeof v === 'object' && typeof v.src === 'string' && /\/(favicon|logo)[^/]*$/i.test(v.src)) delete node[k];
        else dropMarks(v);
      }
    }
  };
  dropMarks(content.pages ?? content.sections);
  // Logo (cả bản cho chế độ tối) là của thương hiệu khung: bỏ, header hiện tên chữ tới khi người dùng tải logo hay tạo logo chữ.
  if (content.brand) {
    content.brand.logo = '';
    delete content.brand.logoDark;
  }
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
  // Giá gốc để so là giá thấp nhất của các tour, phòng chính (catalog); giá phụ như chặng ghép 50.000 đồng mà làm gốc thì tour bị nhân lên
  // hàng chục triệu.
  const main = (content.catalog?.items ?? []).map((item) => item.price).filter((v) => typeof v === 'number' && v > 0);
  const base = Math.min(...(main.length ? main : found));
  // Giá dưới 50.000 đồng là AI ghi sai đơn vị ("45" thay cho 45 triệu, hay ghi theo ngoại tệ): bỏ qua, giữ giá của khung.
  if (!found.length || !(price >= 50000) || !Number.isFinite(base)) return;
  const ratio = price / base;
  walk(content, (node, k, v) => { node[k] = Math.max(10000, Math.round((v * ratio) / 10000) * 10000); });
}

// Ngôn ngữ của khung (SighGone có tiếng Anh) không đi theo: bản dịch của khung không khớp chữ mới. Bỏ trên khung trước khi tách
// chữ cho AI viết; bản tiếng Anh của site mới do bước dịch ở /tao thêm vào (english.js).
function dropLanguages(content) {
  delete content.languages;
  delete content.translations;
  delete content.translationNotes;
  if (content.header?.lang) delete content.header.lang;
}

function applyProfile(content, profile, slug) {
  content.id = slug;
  if (content.place && profile.noiChon) content.place.name = profile.noiChon;
  content.contact = { ...content.contact, phone: '0123 456 789', email: `xin-chao@${slug}.clauki` };
  // Nhãn cột menu ở chân trang của khung có thể là tên thương hiệu khung (SighGone), mà nhãn không qua AI viết lại: đổi theo tên mới.
  if (content.footer?.navTitle && content.footer.navTitle === content.brand?.name) content.footer.navTitle = profile.ten || content.footer.navTitle;
  if (content.brand) {
    content.brand.name = profile.ten || content.brand.name;
    content.brand.slogan = profile.slogan || content.brand.slogan;
  }
  scalePrices(content, Number(profile.gia));
  // Link chỉ đường của khung (Google Maps tìm "Nhà hát Thành phố Hồ Chí Minh") không qua AI viết lại: đổi sang tìm nơi chốn mới.
  if (profile.noiChon) {
    const query = encodeURIComponent(profile.noiChon);
    const walk = (node) => {
      if (Array.isArray(node)) node.forEach(walk);
      else if (node && typeof node === 'object') {
        for (const [k, v] of Object.entries(node)) {
          if (typeof v === 'string' && v.startsWith('https://www.google.com/maps/search/')) node[k] = `https://www.google.com/maps/search/?api=1&query=${query}`;
          else walk(v);
        }
      }
    };
    walk(content);
  }
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
  // Trang chi tiết (catalog) và chân trang cũng có ảnh của khung; để nguyên thì tour mới hiện ảnh món ăn, phố của khung.
  walk(content.catalog, [], { type: 'catalog' });
  walk(content.footer, [], { type: 'footer' });
  return slots;
}

// Gửi danh sách ảnh tìm được cho AI: giữ ảnh đúng nơi chốn, bỏ ảnh lạc đề (nước khác, cảnh không liên quan), viết mô tả ngắn tiếng Việt
// chỉ dựa vào mô tả có sẵn của ảnh. AI lỗi thì dùng tạm mô tả gốc, vẫn có ảnh.
async function vetPhotos(profile, photos) {
  const list = photos.map((p, i) => `${i}\t${p.alt.replace(/\s+/g, ' ')}`).join('\n');
  try {
    const out = await generateJson(`Nơi chốn của website: ${profile.noiChon}. Dưới đây là danh sách ảnh (số, mô tả gốc thường bằng tiếng Anh).
Giữ lại ảnh có vẻ chụp đúng nơi chốn hoặc một cảnh hợp với nơi đó; bỏ ảnh chụp ở nơi khác (kể cả cảnh giống nhưng tỉnh khác, ví dụ ruộng bậc thang Hà Giang cho site An Giang), chân dung cận mặt, ảnh không rõ nội dung.
Với mỗi ảnh giữ lại, viết mô tả tiếng Việt ngắn (tối đa 110 ký tự) cho người không nhìn thấy ảnh, chỉ nói điều có trong mô tả gốc, không bịa.
Trả JSON một dòng: {"giu": [{"i": 0, "alt": ""}]}

${list}`);
    const kept = (out.giu ?? []).filter((g) => photos[g.i] && typeof g.alt === 'string' && g.alt.trim())
      .map((g) => ({ ...photos[g.i], alt: cleanText(g.alt, 140) }));
    // AI chỉ giữ được vài ảnh thì vẫn dùng cả danh sách: ảnh tìm theo tên địa danh mới, đúng nơi hơn ảnh của khung (trước đây giữ dưới
    // 3 ảnh là bỏ hết, site Phú Quốc còn nguyên ảnh Quy Nhơn).
    if (kept.length >= 3) return kept;
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
  // Chú thích tác giả hiện ngay cạnh ảnh (credit của ảnh trong gallery, của khối backdrop) phải theo ảnh mới, không giữ tên tác giả ảnh cũ.
  const byPhoto = new Map(photos.map((p) => [p.src, p.credit]));
  const recredit = (node) => {
    if (Array.isArray(node)) node.forEach(recredit);
    else if (node && typeof node === 'object') {
      const credit = byPhoto.get(node.src ?? node.image?.src);
      if (credit && typeof node.credit === 'string') node.credit = `Ảnh: ${credit.author}, ${credit.license}`;
      Object.entries(node).forEach(([k, v]) => { if (k !== 'credits') recredit(v); });
    }
  };
  recredit(content);
  return slots.length;
}

// Không có ảnh mới: ảnh của trang hay khối mượn từ khung khác (ruộng bậc thang Mù Cang Chải, xích lô Sài Gòn trong site biển) đổi sang
// ảnh của chính khung, để site không lẫn ảnh của ba nơi.
function localizeBorrowed(content, frame) {
  const slots = imageSlots(content);
  const own = slots.filter((s) => s.src.startsWith(`/brands/${frame}/`)).map((s) => ({ src: s.src, alt: s.alt }));
  if (!own.length) return;
  slots.filter((s) => /^\/brands\//.test(s.src) && !s.src.startsWith(`/brands/${frame}/`)).forEach((slot, i) => Object.assign(slot, own[i % own.length]));
}

async function photoTask({ profile, content, theme, photos, on }) {
  const queries = (Array.isArray(profile.anhTimKiem) ? profile.anhTimKiem : []).filter((q) => typeof q === 'string' && q.trim()).slice(0, 6);
  if (!photos?.on) return 0;
  const source = photos.unsplashKey ? 'Unsplash' : 'Wikimedia Commons';
  // on.photoStage báo từng nấc (tìm, lọc, không đủ ảnh) cho bảng tiến trình của /tao.
  if (!queries.length) {
    on.photoStage?.('none', { found: 0 });
    return 0;
  }
  on.photoStage?.('search', { source, queries });
  const found = await findPhotos(queries, { unsplashKey: photos.unsplashKey });
  if (found.length < 3) {
    on.photoStage?.('none', { found: found.length });
    return 0;
  }
  on.photoStage?.('vet', { found: found.length });
  const kept = await vetPhotos(profile, found);
  if (kept.length < 3) {
    on.photoStage?.('none', { found: kept.length });
    return 0;
  }
  const count = applyPhotos(content, kept);
  on.update?.(content, theme);
  // Có truy vấn Unsplash không ra ảnh thì truy vấn đó lấy từ Commons: báo đúng các nguồn thật sự dùng.
  const used = [...new Set(kept.map((p) => (p.credit?.note === 'Unsplash' ? 'Unsplash' : 'Wikimedia Commons')))].join(' và ');
  on.photos?.({ photos: kept.length, slots: count, source: used || source });
  return kept.length;
}

/* ---------- Trộn bộ: chọn kiểu trình bày ---------- */

const MIX_HINT = {
  hero: 'coverflow (chồng thẻ ảnh xoay, nhiều ảnh), full (một ảnh phủ kín, mây vén khi cuộn, hợp thiên nhiên), stacked (chữ trên, ảnh tràn ngang, gọn, hiện đại), haze (ảnh phủ sương, rê chuột thì tan, huyền ảo, hợp đêm)',
  intro: '"" (căn trái), center (căn giữa), headline (tiêu đề rất lớn, mạnh)',
  gallery: '"" (lưới ảnh), slices (dải ảnh xoè như bình phong), plates (ô biển số, ảnh loang theo con trỏ, hợp nhiều lựa chọn ngắn)',
  reviews: 'postcard (bưu thiếp nghiêng, ấm), notes (giấy note dán, trẻ trung, vui)',
  faq: '"" (danh sách gập mở, gọn), chat (khung nhắn tin với chủ nhà, thân mật)',
};

// Khung chỉ cho bố cục và dữ liệu nền; kiểu trình bày của từng khối ở trang chủ do AI chọn trong các kiểu chung (kể cả kiểu vốn của thương hiệu
// khác), theo giọng nơi chốn, và trộn các kiểu khác nhau. Kiểu không hợp lệ, hay bị cấm, không bao giờ được áp.
async function layoutTask({ profile, content, theme, on }) {
  const home = (content.pages ?? [{ sections: content.sections ?? [] }]).find((p) => !p.path || p.path === '/') ?? content.pages?.[0];
  if (!home) return null;
  const entries = home.sections.map((section, i) => ({ i, section, options: choicesFor(section) }))
    .filter((e) => MIX_VARIANTS[e.section.type] && e.options.length > 1);
  if (!entries.length) return null;
  const list = entries.map((e) => `${e.i}\t${e.section.type}\tkiểu có thể chọn: ${e.options.map((o) => o || '""').join(', ')}\tgợi ý: ${MIX_HINT[e.section.type] ?? ''}`).join('\n');
  const out = await generateJson(`Chọn kiểu trình bày cho các khối ở trang chủ một website du lịch, hợp giọng nơi chốn, theo hồ sơ:
${JSON.stringify(brandProfile(profile))}

Danh sách khối (số, loại, các kiểu chọn được, gợi ý):
${list}

Luật: mỗi khối chỉ chọn một kiểu trong danh sách "kiểu có thể chọn" của nó. Trộn các kiểu khác nhau cho trang có nhịp, không chọn kiểu đầu tiên cho mọi khối; hero hợp với cảnh và giọng của nơi chốn.
Header: "solid" (nền trang), "center" (tên ở giữa), "overlay" (trong suốt đè lên ảnh, chỉ hợp khi hero chọn "full").
Trả JSON một dòng: {"kieu": {"số khối": "kiểu"}, "header": ""}`);
  const picked = {};
  for (const e of entries) {
    const value = out.kieu?.[e.i];
    if (typeof value === 'string' && e.options.includes(value)) {
      if (value) e.section.variant = value;
      else delete e.section.variant;
      picked[e.section.type] = value || 'mặc định';
    }
  }
  const hero = home.sections.find((s) => s.type === 'hero');
  let header = HEADER_CHOICES.includes(out.header) ? out.header : null;
  if (header === 'overlay' && hero?.variant !== 'full') header = 'solid';
  if (header) (content.header ??= {}).variant = header;
  on.update?.(content, theme);
  on.layout?.({ picked, header });
  return picked;
}

// Trang chủ đã ghép từ nhiều khung: kiểu của từng khối đã nằm trong khoá AI chọn, chỉ còn kiểu đầu trang (overlay chỉ hợp hero full).
function applyMixed({ mixed, profile, content, theme, on }) {
  let header = HEADER_CHOICES.includes(profile.dauTrang) ? profile.dauTrang : (mixed.hero === 'full' ? 'overlay' : 'solid');
  if (header === 'overlay' && mixed.hero !== 'full') header = 'solid';
  (content.header ??= {}).variant = header;
  on.update?.(content, theme);
  on.layout?.({ picked: Object.fromEntries(mixed.picked.map((key) => key.split(':')).map(([type, variant]) => [type, variant || 'mặc định'])), header });
  return Promise.resolve(mixed);
}

/* ---------- Chạy ---------- */

// on.profile(profile, info) khi có hồ sơ, on.field(done, total) mỗi dòng chữ nhận được, on.update(content, theme)
// mỗi lần dữ liệu đổi (trang xem trước dựng lại). Trả về { content, theme, profile, stats }.
export async function generateSite({ brief, frameId, slug, frames, photos, on }) {
  const t0 = performance.now();
  const sec = () => Number(((performance.now() - t0) / 1000).toFixed(1));
  const framesRun = loadFrames(frames).catch(() => ({}));
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
  // Luật component: bỏ khối đặc trưng của thương hiệu khung, đổi kiểu bị cấm (rules.js) trước khi tách chữ cho AI viết.
  dropLanguages(template);
  const rules = sanitizeFrame(template, Array.isArray(profile.dacTrung) ? profile.dacTrung : []);
  // Ghép khối chung từ nhiều khung theo trangChu của AI; không dùng được thì giữ trang chủ của khung và để layoutTask chọn kiểu.
  const pool = { ...(await framesRun), [frame]: template };
  const approved = Array.isArray(profile.dacTrung) ? profile.dacTrung : [];
  const mixed = composeHome(template, profile.trangChu, pool, frame, approved);
  composeFooter(template, profile.chanTrang, pool, frame, approved);
  const borrowed = borrowPages(template, pool, frame, approved);
  if (borrowed.length) rules.borrowed = borrowed;
  const content = structuredClone(template);
  const oldNames = oldNamesOf(pool, profile);
  const fields = extractFields(template);
  rebase(content, frame);
  applyProfile(content, profile, slug);
  const frameCss = await fetch(`/brands/${frame}/theme.css`).then((r) => (r.ok ? r.text() : '')).catch(() => '');
  const vars = paletteVars(profile.mau, frameCss.includes('--dark-color-bg'));
  const theme = { base: frame, vars: vars ?? {} };
  // Kiểu chữ AI chọn (khoá có trong danh sách của editor); khoá lạ hay rỗng thì giữ kiểu chữ của khung.
  const font = FONTS.find((f) => f.key && f.key === profile.phongChu);
  if (font) applyFont(theme, font.key);
  const profileSec = sec();
  on.profile?.(profile, { sec: profileSec, frame, palette: Boolean(vars), vars: theme.vars, font: font?.label ?? null });
  on.rules?.(rules);
  on.update?.(content, theme);

  // Tìm ảnh chạy song song với việc viết chữ; lỗi mạng hay không tìm được thì giữ ảnh của khung.
  const photoRun = photoTask({ profile, content, theme, photos, on }).catch(() => 0).then((count) => {
    if (!count) localizeBorrowed(content, frame);
    return count;
  });
  // Chọn kiểu trình bày của các khối ở trang chủ (trộn bộ), song song với việc viết chữ.
  const layoutRun = mixed ? applyMixed({ mixed, profile, content, theme, on }) : layoutTask({ profile, content, theme, on }).catch(() => null);
  const got = new Set();
  let first = 0;
  let mismatched = 0;
  const note = frameNote(template);
  const written = new Map();
  const redoing = new Set();
  const handle = (line) => {
    const m = line.match(/^\s*(\d+)\s*\|\s*([^|]+?)\s*\|(.*)$/);
    const i = m ? Number(m[1]) - 1 : -1;
    // Vị trí chép lại phải khớp số thứ tự; lệch thì để gửi lại, không áp nhầm chỗ.
    if (!m || !fields[i] || m[2] !== fields[i].key || (got.has(i) && !redoing.has(i))) {
      mismatched += 1;
      return;
    }
    const value = cleanText(m[3], 600);
    if (!value || holes(value) !== holes(fields[i].value)) return;
    got.add(i);
    redoing.delete(i);
    written.set(i, value);
    if (!first) first = sec();
    for (const path of fields[i].paths) setIn(content, path, value);
    on.field?.(got.size, fields.length);
    on.update?.(content, theme);
  };
  const groups = splitGroups(fields);
  // Bộ lọc an toàn của AI đôi khi chặn cả nhóm vì một dòng chữ mẫu vô hại: chia đôi nhóm rồi thử lại cho tới từng dòng, dòng nào vẫn bị chặn
  // thì giữ chữ của khung (không bỏ cả website vì một dòng).
  const blocked = [];
  const runGroup = async (idx) => {
    const todo = idx.filter((i) => !got.has(i));
    if (!todo.length) return;
    try {
      await streamLines('', groupPrompt(profile, fields, todo, note), handle);
    } catch (err) {
      // Hết lượt mọi khoá thì dừng hẳn (báo cho người dùng); lỗi lẻ của một nhóm (AI im quá lâu, quá tải, mạng) thì để các
      // chỗ đó cho lượt gửi lại ở cuối, không bỏ cả website.
      if (err.kind === 'quota') throw err;
      if (err.kind !== 'blocked') return;
      if (todo.length === 1) {
        blocked.push(fields[todo[0]].key);
        return;
      }
      const mid = Math.ceil(todo.length / 2);
      await Promise.all([runGroup(todo.slice(0, mid)), runGroup(todo.slice(mid))]);
    }
  };
  await Promise.all(groups.map(runGroup));
  const missing = fields.map((_, i) => i).filter((i) => !got.has(i) && !blocked.includes(fields[i].key));
  // Lượt gửi lại hỏng thì thôi: các chỗ thiếu giữ chữ của khung, người dùng sửa sau bằng editor.
  if (missing.length) await runGroup(missing).catch(() => {});
  if (blocked.length) console.warn('Dòng bị bộ lọc an toàn chặn, giữ chữ của khung:', blocked);
  // Dòng AI chép y nguyên chữ của trang mẫu (từ 12 ký tự, không phải nhãn giao diện ngắn) thường là chữ riêng của nơi cũ còn sót
  // (đã gồm, các chặng, món theo giờ...): gửi lại một lượt với lời dặn gắt hơn. Lỗi thì thôi, giữ như cũ.
  // Dòng còn cụm chữ của khung (oldNames: "thở dài", "Quận 1", tên tour cũ) thì luôn gửi lại, kể cả nhãn ngắn hay khi AI đã đổi chữ khác đi.
  const leftover = fields.map((f, i) => i).filter((i) => !blocked.includes(fields[i].key) && ((written.get(i) === fields[i].value && fields[i].value.length >= 12
    && !UI_KEYS.has(fields[i].key.split('.').filter((k) => !/^\d+$/.test(k)).at(-1))) || oldNames?.test(written.get(i) ?? fields[i].value)));
  if (leftover.length) {
    leftover.forEach((i) => redoing.add(i));
    on.redo?.(leftover.length);
    const bannedIn = (idx) => [...new Set(idx.flatMap((i) => (written.get(i) ?? fields[i].value).match(new RegExp(oldNames?.source ?? '$^', 'gu')) ?? []))];
    await Promise.all(splitGroups(leftover.map((i) => fields[i])).map((g) => {
      const idx = g.map((k) => leftover[k]);
      return streamLines('', groupPrompt(profile, fields, idx, note, true, bannedIn(idx)), handle).catch(() => {});
    }));
  }
  const redone = leftover.filter((i) => written.get(i) !== fields[i].value).length;
  const photoCount = await photoRun;
  await layoutRun;
  on.update?.(content, theme);
  const stats = { profile: profileSec, first, total: sec(), fields: fields.length, written: got.size, groups: groups.length, mismatched, photos: photoCount, blocked: blocked.length, leftover: leftover.length, redone };
  return { content, theme, profile, stats };
}
