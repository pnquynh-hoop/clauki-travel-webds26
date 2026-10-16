/* create.js - lời nhắc của trình tạo web /tao (js/create/generate.js): lập hồ sơ, viết chữ theo nhóm, tinh chỉnh mô tả,
   lọc ảnh, chọn kiểu trình bày. Danh sách khối, khối đặc trưng, khung trang vẫn ở create/mix.js, create/rules.js,
   create/generate.js vì code cũng dùng; ở đây chỉ nhận vào để viết thành chữ. */
import { NO_MARKS, NO_CLICHES, NO_INVENT, REFUSE, HEADER_HINT, lineFormat } from './shared.js';

const WRITE_RULES = `Luật:
- Tiếng Việt tự nhiên, giọng riêng của thương hiệu; dùng chi tiết cụ thể của nơi chốn trong hồ sơ.
- ${NO_MARKS} ${NO_CLICHES}; không mở đầu câu bằng "Trải nghiệm".
- ${NO_INVENT} không có trong hồ sơ; câu mẫu nói về điều hồ sơ không có thì viết chung chung hoặc nói về điều hồ sơ có.
- Tên người, tên nơi đúng như hồ sơ. Giá đúng như hồ sơ.`;

const COLOR_RULES = `Luật màu (bắt buộc):
- Nền trang (bg) và nền thẻ (surface) sáng, gần trắng, ngả ấm hay mát nhẹ; chữ (ink) gần đen cùng tông nền, không dùng đen thuần #000000; chữ phụ (muted) là xám cùng tông.
- Màu nút (primary) là màu thương hiệu rõ ràng nhưng không chói: độ bão hoà vừa phải, không dùng màu neon, cyan sáng, hồng sáng, vàng chói. Chọn theo nơi chốn và khí hậu (biển: xanh lam hoặc xanh ngọc đậm; núi, rừng: xanh rêu, nâu đất; nắng gió: cam đất, vàng đất; phố cổ: đỏ gạch, vàng đất; đồng quê: xanh lá trầm).
- Màu nhấn (accent) cùng bảng với màu nút (cùng họ màu hoặc màu bổ sung đã trầm), đủ đậm để dùng làm chữ trên nền sáng. Tổng cộng tối đa hai màu chủ đạo cộng các màu trung tính; không dùng ba màu nhấn khác họ.
- Tương phản từ 4.5: chữ, chữ phụ, màu nhấn trên nền trang và trên nền thẻ; chữ trên nút (onPrimary) trên màu nút (primary).`;

const FONT_HINT = '"montserrat" (hiện đại, gọn, hợp thành phố, resort hiện đại), "lora" (có chân, cổ điển, hợp núi, làng quê, truyền thống), "unbounded" (tròn, vui, trẻ trung, hợp tour ăn uống, bạn bè), "playfair" (sang trọng, hợp nghỉ dưỡng cao cấp)';

/* Lập hồ sơ thương hiệu (một request, trả JSON). frames: khung trang [{ id, label, hint }]; signature: khối đặc trưng AI được
   duyệt [{ key, fit }]; menu: khối chung của trang chủ [[khoá, mô tả]]; footers: kiểu chân trang [[khoá, mô tả]]. */
export function profilePrompt({ brief, frameId, frames, signature, menu, footers }) {
  const frameList = frames.map((f) => `"${f.id}": ${f.label} (${f.hint})`).join('; ');
  return `Lập hồ sơ cho một thương hiệu du lịch hoặc lưu trú giả tưởng từ mô tả sau. Chỉ dùng thông tin có trong mô tả;
chỗ nào mô tả không nói thì đặt tên hoặc chi tiết hợp lý, nhưng không thêm tiện nghi hay con số mới.
${REFUSE}

Mô tả: ${brief}

Khung trang có sẵn: ${frameList}.${frameId ? ` Người dùng đã chọn khung "${frameId}".` : ' Chọn khung hợp nhất theo loại hình và số ngày; mô tả là tour mà không nói rõ nhiều ngày thì chọn "sighgone", không mặc định "bac-tra".'}
${COLOR_RULES}
dacTrung: các component đặc trưng chỉ được dùng khi thật sự phù hợp với nơi này. Dưới đây là danh sách (khoá: điều kiện phù hợp). Chỉ chọn khoá nào mà mô tả của người dùng thật sự thoả điều kiện; nghi ngờ thì không chọn; mảng rỗng là bình thường và là lựa chọn mặc định.
${signature.map((s) => `- ${s.key}: ${s.fit}`).join('\n')}
trangChu: thứ tự các khối chung của trang chủ, từ 5 tới 8 khoá lấy từ danh sách sau (khoá: mô tả). Khung đã có sẵn các khối riêng của nó (đặt chỗ, danh sách tour...) nên code tự giữ; bạn chỉ chọn khối chung, mỗi loại (phần trước dấu hai chấm) tối đa một lần.
${menu.map(([key, hint]) => `- ${key}: ${hint}`).join('\n')}
Luật: khoá đầu là một hero; chọn kiểu hợp giọng nơi chốn và trộn các kiểu khác nhau, tối đa MỘT khoá mặc định (phần sau dấu hai chấm để trống, như "faq:"), các khoá còn lại phải chọn kiểu riêng (như "faq:chat", "gallery:slices"); không chọn kiểu đầu tiên cho mọi loại; nên có reviews và faq; tips và policy chỉ chọn khi khoá đó cũng có trong dacTrung.
dauTrang: kiểu đầu trang, một trong ${HEADER_HINT}.
chanTrang: kiểu chân trang, một trong ${footers.map(([key, hint]) => `"${key}" (${hint})`).join(', ')}. Chọn theo giọng nơi chốn, không mặc định "columns".
phongChu: chọn một kiểu chữ hợp giọng nơi chốn trong các khoá sau: ${FONT_HINT}, hoặc "" để giữ kiểu chữ của khung.

Tên: ngắn, dễ nhớ, có chất địa phương, không chép nguyên câu mô tả. Khẩu hiệu: tối đa 8 từ, nói một điều cụ thể của nơi này,
không mở đầu bằng "Trải nghiệm". chiTiet: 3 tới 5 chi tiết ngắn có trong mô tả. Viết gọn, JSON một dòng.
gia: giá thấp nhất (một khách, hay một đêm nếu là chỗ ở) bằng đồng Việt Nam, số nguyên đủ các số 0 ("1 triệu 2" là 1200000, "45 triệu" là 45000000);
mô tả ghi giá ngoại tệ thì đổi sang đồng theo tỉ giá gần đúng; mô tả không nói giá thì 0 (giữ giá của khung), không tự đặt giá.
donViGia: đơn vị tính, không kèm tiền tệ: "khách", "đêm", "phòng", "nhóm".
anhTimKiem: đúng 5 truy vấn tìm ảnh thật bằng tiếng Anh, mỗi truy vấn 2 tới 5 từ, gồm tên địa danh có thật (tỉnh, huyện, danh thắng) đứng ĐẦU truy vấn rồi tới một cảnh
cụ thể (phong cảnh, đường đi, món ăn, nhà ở); truy vấn đầu là cảnh đẹp nhất của nơi này; không dùng tên thương hiệu giả, không tìm chân dung.

Trả về JSON đúng dạng:
{"ten": "", "slogan": "", "noiChon": "", "chuNha": "", "chiTiet": [""], "gia": 0, "donViGia": "", "khung": "",
 "phongChu": "",
 "dacTrung": [],
 "trangChu": ["", "", "", "", ""],
 "dauTrang": "",
 "chanTrang": "",
 "anhTimKiem": ["", "", "", "", ""],
 "mau": {"primary": "", "onPrimary": "", "bg": "", "surface": "", "ink": "", "muted": "", "accent": ""}}`;
}

// Khung mẫu là website của một thương hiệu khác: names là tên nó, nơi chốn và các sản phẩm của nó, để AI biết chữ nào của nơi cũ phải đổi.
export function frameNote(names) {
  if (!names.length) return '';
  return `Trang mẫu vốn là website của một thương hiệu khác (${names.join(', ')}). Mọi chữ nói về nơi chốn, địa danh, món ăn, phương tiện, lịch trình, con người, câu chuyện của trang mẫu phải đổi hẳn sang nơi mới, kể cả danh sách đã gồm, nên mang, các chặng; chỉ được chép nguyên chữ giao diện chung không nói về nơi chốn (tên nút, nhãn ngắn như "Đóng", "Trang chủ", "Hết chỗ").`;
}

/* Viết lại chữ của một nhóm dòng. profile: hồ sơ đã bỏ các khoá không dành cho viết chữ; lines: [{ n, key, value }] (n đánh từ 1);
   note: frameNote; redo: lượt viết lại các dòng mà lượt trước chép y nguyên chữ của trang mẫu. */
export function groupPrompt({ profile, lines, note = '', redo = false }) {
  const rows = lines.map((l) => `${l.n}\t${l.key}\t${l.value.replace(/\s+/g, ' ')}`).join('\n');
  return `Bạn viết lại chữ của một phần website du lịch cho thương hiệu mới. Khung trang giữ nguyên.

Hồ sơ thương hiệu (bắt buộc theo đúng):
${JSON.stringify(profile)}

${note}
${redo ? 'Các dòng dưới đây ở lượt trước bị chép y nguyên chữ của trang mẫu. Viết lại cho nơi mới; chỉ dòng nào đúng là chữ giao diện chung, không nói gì về nơi chốn, mới được chép lại y nguyên.\n' : ''}
Mỗi dòng dưới đây gồm: số, vị trí, chữ của trang mẫu. Viết lại từng dòng cho thương hiệu mới, cùng vai trò, độ dài gần bằng chữ cũ.

${lineFormat(lines.length, 'chữ mới')}

${WRITE_RULES}

${rows}`;
}

// Thông tin một website cần theo loại hình: thiếu mục nào thì AI điền giá trị mẫu hợp lý (ghi vào giaDinh để người dùng thấy và sửa),
// để bước tạo website có đủ dữ liệu (giá, thời lượng, hạng phòng...) thay vì giữ số liệu của khung.
const NEEDS = {
  tour: ['nơi chốn cụ thể', 'thời lượng (số giờ hoặc số ngày đêm)', 'giá mỗi khách', 'số khách tối đa mỗi đoàn', 'phương tiện di chuyển',
    'giờ hoặc ngày khởi hành', 'điểm đón', 'những gì đã gồm trong giá', 'đối tượng khách'],
  luuTru: ['nơi chốn cụ thể', 'loại chỗ ở (homestay, khu nghỉ, khách sạn)', 'số phòng hoặc các hạng phòng', 'giá mỗi đêm (hoặc mỗi khách mỗi đêm)',
    'sức chứa mỗi phòng', 'tiện nghi chính', 'ăn uống (bữa sáng, bếp)', 'giờ nhận, trả phòng', 'đối tượng khách'],
};

// Tinh chỉnh mô tả: viết lại và bổ sung mô tả của người dùng trước khi tạo website (nút Tinh chỉnh); mục loại hình cần mà người dùng
// chưa nói thì điền giá trị mẫu, ghi vào giaDinh.
export function refinePrompt(brief) {
  return `Bạn giúp người dùng viết lại và bổ sung mô tả để một AI khác dựng website cho một nơi lưu trú hoặc một tour du lịch (thương hiệu giả tưởng).
Đây là bản mô tả cho AI đọc, không phải lời quảng cáo cho khách.

Mô tả gốc của người dùng: ${brief}

Trước hết xác định loại hình: tour hay lưu trú. Website cần đủ các mục sau:
- Tour: ${NEEDS.tour.join('; ')}.
- Lưu trú: ${NEEDS.luuTru.join('; ')}.

Viết thành một đoạn tiếng Việt đầy đủ, 6 tới 10 câu, khoảng 600 tới 1100 ký tự, có đủ mọi mục của loại hình đó, theo thứ tự: loại hình và nơi chốn,
dành cho ai, điều khiến nơi này riêng biệt, cảnh quan và mùa đẹp, món ăn hoặc hoạt động quanh đó, rồi các thông tin cụ thể (thời lượng, giá, số khách,
phương tiện, giờ khởi hành hay các hạng phòng, tiện nghi, giờ nhận trả phòng), cuối cùng là không khí và giọng điệu của thương hiệu.
Luật:
- Giữ nguyên mọi sự thật, tên riêng, con số và chi tiết người dùng đã nói. Không đổi, không mâu thuẫn với chúng; sửa chính tả, viết hoa tên địa danh.
- Mục nào người dùng chưa nói thì tự điền một giá trị mẫu hợp lý, sát giá và cách làm phổ biến ở Việt Nam năm 2026 cho đúng loại hình và nơi chốn
  (ví dụ tour ăn đêm 4 giờ khoảng 500 tới 800 nghìn mỗi khách; homestay Đà Lạt khoảng 400 tới 700 nghìn mỗi khách mỗi đêm). Ghi từng mục đã điền
  vào "giaDinh" dạng {"muc": "tên mục ngắn", "giaTri": "đúng cụm chữ đã viết trong moTa"} để người dùng thấy và sửa. Chỉ có một giá trị cho mỗi mục.
- Được bổ sung chi tiết cụ thể đúng nơi chốn dựa vào hiểu biết thật về địa phương: cảnh quan, khí hậu, mùa đẹp, đặc sản, hoạt động. Không bịa địa danh không có thật.
- Câu khẳng định, cụ thể. Không lời mời gọi ("hãy", "tham gia ngay", "chào đón"), không tiếng lóng. ${NO_CLICHES}. ${NO_MARKS}
- "themVao": các chi tiết về nơi chốn bạn đã bổ sung (cảnh, món, hoạt động), mỗi chi tiết một cụm ngắn, tối đa 5.
- ${REFUSE}

Ví dụ. Gốc: "homestay đà lạt cho nhóm bạn". Trả về:
{"loai": "luuTru", "moTa": "Homestay ở Đà Lạt dành cho nhóm bạn đi chung. Chỗ ở nằm gần những đồi thông, buổi sáng sương mỏng và trời se lạnh, tối thường nhóm lửa nướng đồ ngoài sân. Nhà có 4 phòng, mỗi phòng 4 khách, giá 450 nghìn mỗi khách một đêm, đã gồm bữa sáng. Có bếp chung, sân nướng, wifi và chỗ đậu xe máy. Nhận phòng từ 14 giờ, trả phòng trước 12 giờ. Khách hay đi chợ đêm Đà Lạt, uống cà phê trên đồi, ăn bánh tráng nướng, lẩu gà lá é. Không khí thân mật, thoải mái, hợp những chuyến tụ tập vài ngày.", "themVao": ["đồi thông và sương sớm", "chợ đêm, cà phê, món nóng"], "giaDinh": [{"muc": "Số phòng", "giaTri": "4 phòng, mỗi phòng 4 khách"}, {"muc": "Giá", "giaTri": "450 nghìn mỗi khách một đêm"}, {"muc": "Tiện nghi", "giaTri": "bếp chung, sân nướng, wifi và chỗ đậu xe máy"}, {"muc": "Giờ nhận, trả phòng", "giaTri": "Nhận phòng từ 14 giờ, trả phòng trước 12 giờ"}]}

Trả về JSON một dòng: {"loai": "", "moTa": "", "themVao": [""], "giaDinh": [{"muc": "", "giaTri": ""}]}`;
}

// Lọc ảnh tìm được: giữ ảnh đúng nơi chốn, viết mô tả tiếng Việt. photos: [{ i, alt }] với alt là mô tả gốc của ảnh.
export function vetPhotosPrompt(place, photos) {
  const list = photos.map((p) => `${p.i}\t${p.alt.replace(/\s+/g, ' ')}`).join('\n');
  return `Nơi chốn của website: ${place}. Dưới đây là danh sách ảnh (số, mô tả gốc thường bằng tiếng Anh).
Giữ lại ảnh có vẻ chụp đúng nơi chốn hoặc một cảnh hợp với nơi đó; bỏ ảnh chụp ở nơi khác (kể cả cảnh giống nhưng tỉnh khác, ví dụ ruộng bậc thang Hà Giang cho site An Giang), chân dung cận mặt, ảnh không rõ nội dung.
Với mỗi ảnh giữ lại, viết mô tả tiếng Việt ngắn (tối đa 110 ký tự) cho người không nhìn thấy ảnh, chỉ nói điều có trong mô tả gốc, không bịa.
Trả JSON một dòng: {"giu": [{"i": 0, "alt": ""}]}

${list}`;
}

// Gợi ý cho AI về từng kiểu trình bày khi chọn kiểu cho các khối ở trang chủ.
const MIX_HINT = {
  hero: 'coverflow (chồng thẻ ảnh xoay, nhiều ảnh), full (một ảnh phủ kín, mây vén khi cuộn, hợp thiên nhiên), stacked (chữ trên, ảnh tràn ngang, gọn, hiện đại), haze (ảnh phủ sương, rê chuột thì tan, huyền ảo, hợp đêm)',
  intro: '"" (căn trái), center (căn giữa), headline (tiêu đề rất lớn, mạnh)',
  gallery: '"" (lưới ảnh), slices (dải ảnh xoè như bình phong), plates (ô biển số, ảnh loang theo con trỏ, hợp nhiều lựa chọn ngắn)',
  reviews: 'postcard (bưu thiếp nghiêng, ấm), notes (giấy note dán, trẻ trung, vui)',
  faq: '"" (danh sách gập mở, gọn), chat (khung nhắn tin với chủ nhà, thân mật)',
};

// Chọn kiểu trình bày cho các khối ở trang chủ. blocks: [{ i, type, options }] với options là các kiểu chọn được ("" là mặc định).
export function layoutPrompt(profile, blocks) {
  const list = blocks.map((b) => `${b.i}\t${b.type}\tkiểu có thể chọn: ${b.options.map((o) => o || '""').join(', ')}\tgợi ý: ${MIX_HINT[b.type] ?? ''}`).join('\n');
  return `Chọn kiểu trình bày cho các khối ở trang chủ một website du lịch, hợp giọng nơi chốn, theo hồ sơ:
${JSON.stringify(profile)}

Danh sách khối (số, loại, các kiểu chọn được, gợi ý):
${list}

Luật: mỗi khối chỉ chọn một kiểu trong danh sách "kiểu có thể chọn" của nó. Trộn các kiểu khác nhau cho trang có nhịp, không chọn kiểu đầu tiên cho mọi khối; hero hợp với cảnh và giọng của nơi chốn.
Header: ${HEADER_HINT}.
Trả JSON một dòng: {"kieu": {"số khối": "kiểu"}, "header": ""}`;
}
