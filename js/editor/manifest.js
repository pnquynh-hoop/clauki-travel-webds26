/* manifest.js - danh sách khối, kiểu trình bày và lựa chọn giao diện mà editor (#82) cho đổi; AI (#81) dùng chung.
   Chỉ khai những kiểu chạy được với dữ liệu sẵn có của khối: kiểu cần trường riêng thì ghi needs (hàm kiểm dữ liệu),
   dữ liệu thiếu thì editor không cho chọn kiểu đó. Khối không có ở đây vẫn dời, ẩn, xoá được, chỉ không đổi kiểu. */

// [giá trị variant, tên hiện trong editor]; giá trị rỗng là kiểu mặc định (không ghi variant).
export const BLOCKS = {
  hero: {
    label: 'Ảnh đầu trang',
    variants: [['coverflow', 'Chồng thẻ ảnh xoay'], ['full', 'Ảnh phủ kín, mây vén khi cuộn'], ['stacked', 'Chữ trên, ảnh tràn ngang'], ['haze', 'Ảnh phủ sương, rê chuột thì tan'], ['ride', 'Cuộn qua từng ga, thành phố trôi ngang']],
    needs: { ride: (s) => Array.isArray(s.stops) && s.stops.length > 0 },
  },
  intro: { label: 'Đoạn giới thiệu', variants: [['', 'Căn trái'], ['center', 'Căn giữa'], ['headline', 'Tiêu đề rất lớn']] },
  gallery: { label: 'Thư viện ảnh', variants: [['', 'Lưới ảnh'], ['slices', 'Dải ảnh xoè như bình phong'], ['plates', 'Ô biển số nhà, ảnh loang theo con trỏ']] },
  faq: { label: 'Hỏi đáp', variants: [['', 'Danh sách gập mở'], ['chat', 'Khung nhắn tin']] },
  reviews: { label: 'Khách kể', variants: [['postcard', 'Bưu thiếp'], ['notes', 'Tường giấy note']] },
  stays: {
    label: 'Các hạng phòng',
    variants: [['', 'Lưới thẻ'], ['headland', 'Mốc trên ảnh mỏm gành']],
    needs: { headland: (s) => Boolean(s.scene?.image?.src) },
  },
  offer: { label: 'Ưu đãi', variants: [['', 'Hai mặt phẳng'], ['postcard', 'Bưu thiếp nghiêng']] },
  host: {
    label: 'Chủ nhà',
    variants: [['', 'Ảnh và chữ'], ['tv', 'Tivi kể chuyện']],
    needs: { tv: (s) => Array.isArray(s.stories) && s.stories.length > 0 },
  },
  booking: {
    label: 'Đặt chỗ',
    variants: [['calendar', 'Thẻ ngày kiểu lịch xé'], ['wall', 'Tờ lịch treo tường'], ['ticket', 'Quầy vé có máy in vé']],
    // Hai kiểu chọn ngày chỉ dùng được với dữ liệu lịch khởi hành (departures hoặc tours); stay và request có ô nhập khác.
    needs: { calendar: (s) => Array.isArray(s.departures) || Boolean(s.tours), wall: (s) => Array.isArray(s.departures) || Boolean(s.tours), ticket: (s) => Array.isArray(s.departures) || Boolean(s.tours) },
  },
  journey: { label: 'Lịch trình con đường', variants: [] },
  process: { label: 'Các bước', variants: [] },
  'day-plan': { label: 'Một ngày theo giờ', variants: [] },
  'cloud-band': { label: 'Dải mây nối khối', variants: [] },
  clock: { label: 'Đồng hồ 24 giờ', variants: [] },
  tips: { label: 'Thẻ mẹo', variants: [] },
  policy: { label: 'Bảng chính sách', variants: [] },
  'room-detail': { label: 'Chi tiết phòng, tour', variants: [] },
  included: { label: 'Gồm gì', variants: [['', 'Danh sách có icon'], ['receipt', 'Tờ hoá đơn']] },
  'item-cover': { label: 'Ảnh bìa chi tiết', variants: [] },
  'item-booking': {
    label: 'Đặt chỗ chi tiết',
    variants: [['', 'Thẻ đặt'], ['ticket', 'Vé giữ chỗ chọn ngày']],
    needs: { ticket: (s) => Boolean(s.item) },
  },
  'photo-strip': { label: 'Dải ảnh cuộn phim', variants: [] },
  scene: { label: 'Cảnh đáng chờ', variants: [] },
  'catalog-list': { label: 'Danh sách tour, phòng', variants: [['', 'Tiêu đề lớn đầu trang'], ['compact', 'Gọn, cuối trang']] },
  'custom-trip': { label: 'Tự ghép tour riêng', variants: [] },
  breadcrumb: { label: 'Đường dẫn trang', variants: [] },
  backdrop: { label: 'Ảnh nền cố định', variants: [['screen', 'Cao một màn hình'], ['half', 'Dải thấp'], ['tall', 'Cao hơn màn hình']] },
  'tour-pick': { label: 'Gợi ý tour', variants: [['reel', 'Vòng quay chọn cách đi'], ['claw', 'Máy gắp thú']] },
  contact: { label: 'Liên hệ', variants: [['notes', 'Giấy note dán tường'], ['plate', 'Thẻ màu, biển số nhà'], ['bell', 'Bảng chuông cửa']] },
  cards: { label: 'Thẻ trình bày', variants: [['', 'Lưới thẻ'], ['badge', 'Thẻ đeo treo lệch']] },
  pictogram: { label: 'Con số bằng hình', variants: [] },
  medals: { label: 'Bảng thành tựu', variants: [] },
  coins: { label: 'Tiền đi đâu', variants: [] },
  timetable: { label: 'Giờ chạy hôm nay', variants: [['', 'Danh sách trên thẻ'], ['board', 'Bảng giờ nhà ga']] },
};

// Đường dẫn không dùng được cho trang thêm mới: trùng thư mục của site, trang công cụ hay trang đặc biệt.
export const PAGE_RESERVED = ['404', 'css', 'js', 'brands', 'tao', 'sua', 'nhap', 'editor', 'supabase', 'docs'];

export const HEADER_VARIANTS = [['solid', 'Nền trang'], ['center', 'Tên ở giữa'], ['overlay', 'Trong suốt đè lên ảnh'], ['minimal', 'Rút gọn (logo và nút đặt)']];

// Kiểu nào chọn được với dữ liệu hiện có của khối.
export function variantsFor(section) {
  const block = BLOCKS[section.type];
  if (!block) return [];
  return block.variants.filter(([value]) => !block.needs?.[value] || block.needs[value](section));
}

// Biến màu cho chỉnh: bảy màu bắt buộc ở AGENTS.md mục 5, cộng nền phụ --color-tint (tuỳ chọn; tấm thông tin ở chân trang).
// Thương hiệu khai cứng nền phụ (Bậc Trà: xanh matcha sáng) mà không có bản tối thì chế độ tối giữ nền phụ sáng dưới chữ sáng,
// nên nền phụ phải nằm trong bảng màu và bộ kiểm tương phản như các màu khác. Không khai thì base.css tự pha từ nút và nền trang.
export const COLORS = [
  ['--color-primary', 'Nền nút chính'],
  ['--color-on-primary', 'Chữ trên nút chính'],
  ['--color-bg', 'Nền trang'],
  ['--color-surface', 'Nền thẻ'],
  ['--color-tint', 'Nền phụ (chân trang)'],
  ['--color-ink', 'Chữ'],
  ['--color-muted', 'Chữ phụ'],
  ['--color-accent', 'Màu nhấn (chữ, liên kết)'],
];

// Cặp màu phải đạt tương phản AA (từ 4,5): [chữ, nền, mô tả].
export const CONTRAST = [
  ['--color-ink', '--color-bg', 'Chữ trên nền trang'],
  ['--color-muted', '--color-bg', 'Chữ phụ trên nền trang'],
  ['--color-accent', '--color-bg', 'Màu nhấn trên nền trang'],
  ['--color-on-primary', '--color-primary', 'Chữ trên nút chính'],
  ['--color-ink', '--color-surface', 'Chữ trên thẻ'],
  ['--color-accent', '--color-surface', 'Màu nhấn trên thẻ'],
  ['--color-ink', '--color-tint', 'Chữ trên nền phụ'],
];

// Cặp font có sẵn (Google Fonts, có dấu tiếng Việt). Giá trị rỗng: giữ font trong theme.css.
export const FONTS = [
  { key: '', label: 'Giữ font gốc của thương hiệu' },
  { key: 'montserrat', label: 'Montserrat (hiện đại, gọn)', heading: "'Montserrat', system-ui, sans-serif", body: "'Montserrat', system-ui, sans-serif", url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;800&display=swap' },
  { key: 'lora', label: 'Lora và Be Vietnam Pro (có chân, cổ điển)', heading: "'Lora', Georgia, serif", body: "'Be Vietnam Pro', system-ui, sans-serif", url: 'https://fonts.googleapis.com/css2?family=Lora:wght@500;700&family=Be+Vietnam+Pro:wght@400;600&display=swap' },
  { key: 'unbounded', label: 'Unbounded và Nunito (tròn, vui)', heading: "'Unbounded', system-ui, sans-serif", body: "'Nunito', system-ui, sans-serif", url: 'https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700&family=Nunito:wght@400;700&display=swap' },
  { key: 'playfair', label: 'Playfair Display và Inter (sang trọng)', heading: "'Playfair Display', Georgia, serif", body: "'Inter', system-ui, sans-serif", url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;800&family=Inter:wght@400;600&display=swap' },
];

/* ---------- Trường sửa được của từng loại khối (form tự sinh) ----------
   Mỗi trường: key (đường dẫn trong section, ví dụ "link.label"; rỗng là chính mục đó), label, type:
   text (một dòng), long (đoạn), number (số: giá, số chỗ; min, max, step), image ({ src, alt }, chọn trong kho ảnh của
   thương hiệu), select (options),
   list (mảng; fields là trường của mỗi mục, item là mục mới khi bấm Thêm). optional: chỉ hiện khi dữ liệu đã có. */

const HEAD = [
  { key: 'eyebrow', label: 'Nhãn nhỏ', type: 'text' },
  { key: 'title', label: 'Tiêu đề', type: 'text' },
  { key: 'lead', label: 'Đoạn dẫn', type: 'long' },
];

const FIELDS = {
  hero: [
    ...HEAD,
    { key: 'link.label', label: 'Chữ trên nút phụ', type: 'text', optional: true },
    { key: 'image', label: 'Ảnh', type: 'image', optional: true },
    { key: 'price.now', label: 'Giá hiện tại', type: 'text', optional: true },
    { key: 'price.was', label: 'Giá thường', type: 'text', optional: true },
    {
      // Kiểu ride: mỗi ga một dòng. Cỡ và chỗ đặt công trình (scene) là số chỉnh tay theo từng ảnh nên không đưa vào form.
      key: 'stops', label: 'Các ga', type: 'list', optional: true,
      fields: [
        { key: 'time', label: 'Giờ (HH:MM)', type: 'text' },
        { key: 'place', label: 'Tên ga', type: 'text' },
        { key: 'note', label: 'Ghi chú', type: 'text' },
        { key: 'how', label: 'Phương tiện', type: 'text' },
        { key: 'image', label: 'Ảnh công trình tách nền', type: 'image' },
      ],
      item: { time: '12:00', place: 'Ga mới', note: '', how: '', image: { src: '', alt: '' } },
    },
    {
      key: 'slides', label: 'Các ảnh', type: 'list', optional: true,
      fields: [{ key: 'image', label: 'Ảnh', type: 'image' }, { key: 'caption', label: 'Chú thích', type: 'text' }],
      item: { image: { src: '', alt: '' }, caption: '' },
    },
  ],
  intro: HEAD,
  breadcrumb: [
    { key: 'home', label: 'Chữ bước đầu (trang chủ)', type: 'text' },
    {
      key: 'items', label: 'Các bước', type: 'list',
      fields: [{ key: 'label', label: 'Chữ', type: 'text' }, { key: 'href', label: 'Liên kết (ví dụ page:tour), bỏ trống ở bước cuối', type: 'text' }],
      item: { label: 'Bước mới', href: '' },
    },
  ],
  backdrop: [
    ...HEAD,
    { key: 'image', label: 'Ảnh nền', type: 'image' },
    { key: 'focus', label: 'Vùng giữ lại khi cắt ảnh (ví dụ 50% 30%)', type: 'text', optional: true },
    { key: 'credit', label: 'Ghi nguồn nhỏ ở góc', type: 'text', optional: true },
  ],
  gallery: [
    ...HEAD,
    {
      key: 'images', label: 'Ảnh', type: 'list',
      fields: [{ key: '', label: 'Ảnh', type: 'image' }, { key: 'caption', label: 'Chú thích', type: 'text' }, { key: 'note', label: 'Dòng phụ (kiểu ô biển số)', type: 'text', optional: true }, { key: 'href', label: 'Liên kết (ví dụ page:tour)', type: 'text', optional: true }],
      item: { src: '', alt: '', caption: '' },
    },
  ],
  faq: [
    ...HEAD,
    {
      key: 'items', label: 'Câu hỏi', type: 'list',
      fields: [{ key: 'question', label: 'Câu hỏi', type: 'text' }, { key: 'answer', label: 'Trả lời', type: 'long' }],
      item: { question: 'Câu hỏi mới?', answer: 'Câu trả lời.' },
    },
  ],
  reviews: [
    ...HEAD,
    {
      key: 'items', label: 'Lời kể', type: 'list',
      fields: [{ key: 'text', label: 'Lời kể', type: 'long' }, { key: 'name', label: 'Tên', type: 'text' }, { key: 'from', label: 'Đến từ', type: 'text' }],
      item: { text: 'Lời kể của khách.', name: 'Tên khách', from: 'Nơi ở' },
    },
  ],
  tips: [
    ...HEAD,
    {
      key: 'items', label: 'Thẻ mẹo', type: 'list',
      fields: [{ key: 'title', label: 'Tiêu đề', type: 'text' }, { key: 'text', label: 'Nội dung', type: 'long' }],
      item: { title: 'Mẹo mới', text: 'Một hai câu.' },
    },
  ],
  policy: [
    ...HEAD,
    {
      key: 'rows', label: 'Dòng', type: 'list',
      fields: [
        { key: 'when', label: 'Trường hợp', type: 'text' },
        { key: 'what', label: 'Kết quả', type: 'text' },
        { key: 'tone', label: 'Mức', type: 'select', options: [['ok', 'Tốt cho khách'], ['mid', 'Một phần'], ['no', 'Không']] },
      ],
      item: { when: 'Trường hợp', what: 'Kết quả', tone: 'ok' },
    },
    { key: 'note', label: 'Ghi chú', type: 'long', optional: true },
  ],
  // Các khối dưới đây chỉ mở ô chữ; số (giá, phí, phần trăm, số chỗ), id tour, icon, màu giữ nguyên vì form chưa có kiểu số và ô
  // chọn. Mục thêm mới mang sẵn số hợp lệ, để khối không bỏ qua mục đó.
  pictogram: [
    ...HEAD,
    {
      key: 'items', label: 'Con số', type: 'list',
      fields: [
        { key: 'label', label: 'Nhãn', type: 'text' },
        { key: 'text', label: 'Câu ngắn', type: 'text' },
        { key: 'markLabel', label: 'Chú thích hình tô nổi', type: 'text' },
        { key: 'fadedLabel', label: 'Chú thích hình mờ', type: 'text' },
      ],
      item: { value: 3, icon: 'user', label: 'Con số mới', text: '' },
    },
  ],
  medals: [
    ...HEAD,
    { key: 'progress', label: 'Chữ thanh kinh nghiệm (có {n}, {total})', type: 'text', optional: true },
    { key: 'unlocked', label: 'Nhãn đã mở khoá', type: 'text', optional: true },
    {
      key: 'items', label: 'Huy chương', type: 'list',
      fields: [
        { key: 'title', label: 'Tên', type: 'text' },
        { key: 'text', label: 'Giải thích', type: 'long' },
        { key: 'value', label: 'Con số chốt', type: 'text' },
        { key: 'valueLabel', label: 'Chữ sau con số', type: 'text' },
      ],
      item: { title: 'Cam kết mới', text: '' },
    },
  ],
  coins: [
    ...HEAD,
    {
      key: 'parts', label: 'Phần', type: 'list',
      fields: [{ key: 'label', label: 'Tên phần', type: 'text' }, { key: 'text', label: 'Câu ngắn', type: 'text' }],
      item: { label: 'Phần mới', value: 5, text: '' },
    },
  ],
  timetable: [
    ...HEAD,
    { key: 'note', label: 'Chú thích cuối bảng', type: 'text', optional: true },
  ],
  // Gợi ý tour: mỗi lựa chọn trỏ tới id tour trong catalog (không sửa ở đây); lựa chọn không có tour nào thì khối bỏ qua.
  'tour-pick': [
    ...HEAD,
    { key: 'labels.spin', label: 'Chữ nút quay, gắp', type: 'text', optional: true },
    { key: 'labels.again', label: 'Chữ nút quay lại', type: 'text', optional: true },
    { key: 'labels.sign', label: 'Chữ trên biển máy gắp', type: 'text', optional: true },
    { key: 'options', label: 'Lựa chọn', type: 'list', optional: true, fields: [{ key: 'label', label: 'Chữ', type: 'text' }], item: { label: 'Lựa chọn mới', items: [] } },
  ],
  // Tự ghép tour: chặng lẻ nằm trong catalog.legs; lộ trình gợi ý chỉ sửa tên và ghi chú (các chặng giữ nguyên).
  'custom-trip': [
    ...HEAD,
    {
      key: 'presets', label: 'Lộ trình gợi ý', type: 'list', optional: true,
      fields: [{ key: 'name', label: 'Tên', type: 'text' }, { key: 'note', label: 'Ghi chú', type: 'text' }],
      item: { name: 'Lộ trình mới', note: '', legs: [] },
    },
    {
      key: 'badges', label: 'Huy hiệu', type: 'list', optional: true,
      fields: [{ key: 'label', label: 'Chữ', type: 'text' }],
      item: { min: 9, label: 'Huy hiệu mới' },
    },
  ],
  // Đặt chỗ: chữ khách đọc (gồm, chưa gồm, điều khoản, ưu đãi, điểm đón) và các số của section (giá, cọc, giá trẻ em, số khách);
  // ngày khởi hành, số chỗ theo ngày, phí điểm đón chưa có ô.
  booking: [
    ...HEAD,
    { key: 'image', label: 'Ảnh', type: 'image', optional: true },
    { key: 'price', label: 'Giá mỗi khách (đồng; kiểu chọn tour từ danh mục thì giá lấy từ Danh mục)', type: 'number', step: 1000, optional: true },
    { key: 'priceNote', label: 'Chữ sau giá', type: 'text', optional: true },
    { key: 'deposit', label: 'Tiền cọc mỗi khách (đồng)', type: 'number', step: 1000, optional: true },
    { key: 'childPrice', label: 'Giá trẻ em (đồng, 0 là miễn phí)', type: 'number', step: 1000, optional: true },
    { key: 'extraGuestPrice', label: 'Phụ thu mỗi khách thêm (đồng)', type: 'number', step: 1000, optional: true },
    { key: 'maxGuests', label: 'Số khách tối đa', type: 'number', min: 1, max: 99, optional: true },
    { key: 'maxNights', label: 'Số đêm tối đa', type: 'number', min: 1, max: 30, optional: true },
    { key: 'deal.label', label: 'Dòng ưu đãi', type: 'text', optional: true },
    { key: 'offer.label', label: 'Tên ưu đãi', type: 'text', optional: true },
    { key: 'offer.note', label: 'Ghi chú ưu đãi', type: 'text', optional: true },
    { key: 'includes', label: 'Đã gồm', type: 'list', optional: true, fields: [{ key: '', label: 'Mục', type: 'text' }], item: 'Mục mới' },
    { key: 'excludes', label: 'Chưa gồm', type: 'list', optional: true, fields: [{ key: '', label: 'Mục', type: 'text' }], item: 'Mục mới' },
    { key: 'bring', label: 'Nên mang', type: 'list', optional: true, fields: [{ key: '', label: 'Mục', type: 'text' }], item: 'Mục mới' },
    {
      key: 'policies', label: 'Nhóm điều khoản', type: 'list', optional: true,
      fields: [
        { key: 'title', label: 'Tên nhóm', type: 'text' },
        {
          key: 'items', label: 'Điều khoản', type: 'list',
          fields: [{ key: 'label', label: 'Nhãn', type: 'text' }, { key: 'text', label: 'Nội dung', type: 'long' }],
          item: { label: 'Điều khoản', text: '' },
        },
      ],
      item: { title: 'Nhóm mới', items: [] },
    },
    {
      key: 'pickups', label: 'Điểm đón', type: 'list', optional: true,
      fields: [{ key: 'label', label: 'Tên điểm đón', type: 'text' }],
      item: { id: 'diem-don-moi', label: 'Điểm đón mới', fee: 0 },
    },
    {
      key: 'perks', label: 'Ưu đãi theo số đêm', type: 'list', optional: true,
      fields: [{ key: 'text', label: 'Nội dung', type: 'text' }],
      item: { minNights: 2, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], text: 'Ưu đãi mới' },
    },
  ],
  // Trang chi tiết dựng trong một khối (Bậc Trà). Mọi trường đều tuỳ chọn: section ghi "item" thì phần lớn
  // dữ liệu lấy từ catalog, chỉ hiện ô cho trường section tự ghi, để không vô tình ghi đè danh mục.
  // Số chỗ còn theo đợt (availability) chưa có ô.
  'room-detail': [
    { key: 'eyebrow', label: 'Nhãn nhỏ', type: 'text', optional: true },
    { key: 'title', label: 'Tên', type: 'text', optional: true },
    { key: 'lead', label: 'Câu dẫn', type: 'long', optional: true },
    { key: 'price', label: 'Giá (đồng)', type: 'number', step: 1000, optional: true },
    { key: 'priceNote', label: 'Ghi chú giá', type: 'text', optional: true },
    {
      key: 'images', label: 'Ảnh', type: 'list', optional: true,
      fields: [{ key: '', label: 'Ảnh', type: 'image' }, { key: 'caption', label: 'Chú thích', type: 'text' }],
      item: { src: '', alt: '', caption: '' },
    },
    {
      key: 'facts', label: 'Thông số', type: 'list', optional: true,
      fields: [{ key: 'label', label: 'Nhãn', type: 'text' }, { key: 'value', label: 'Giá trị', type: 'text' }],
      item: { label: 'Thông số', value: '' },
    },
    {
      key: 'amenities', label: 'Tiện nghi', type: 'list', optional: true,
      fields: [{ key: 'text', label: 'Tiện nghi', type: 'text' }],
      item: { text: 'Tiện nghi mới' },
    },
    { key: 'view.text', label: 'Cảnh đáng chờ', type: 'long', optional: true },
    { key: 'view.best', label: 'Giờ đẹp nhất', type: 'text', optional: true },
    { key: 'view.image', label: 'Ảnh cảnh đáng chờ', type: 'image', optional: true },
  ],
  // Chủ nhà, câu chuyện. Khối không hiện đoạn dẫn nên không có ô lead. Kiểu tv đọc thêm stories (mỗi kênh một chuyện).
  host: [
    { key: 'eyebrow', label: 'Nhãn nhỏ', type: 'text' },
    { key: 'title', label: 'Tiêu đề', type: 'text' },
    { key: 'story', label: 'Đoạn kể', type: 'list', optional: true, fields: [{ key: '', label: 'Đoạn', type: 'long' }], item: 'Một đoạn kể mới.' },
    { key: 'quote.text', label: 'Câu trích', type: 'long', optional: true },
    { key: 'quote.by', label: 'Người nói', type: 'text', optional: true },
    {
      key: 'facts', label: 'Con số', type: 'list', optional: true,
      fields: [{ key: 'value', label: 'Con số', type: 'text' }, { key: 'label', label: 'Nhãn', type: 'text' }],
      item: { value: '1', label: 'Nhãn' },
    },
    { key: 'image', label: 'Ảnh lớn', type: 'image', optional: true },
    { key: 'imageSecond', label: 'Ảnh nhỏ', type: 'image', optional: true },
    {
      key: 'stories', label: 'Chuyện trên tivi', type: 'list', optional: true,
      fields: [
        { key: 'title', label: 'Tên chuyện', type: 'text' },
        { key: 'text', label: 'Nội dung', type: 'long' },
        { key: 'quote.text', label: 'Câu trích', type: 'text' },
        { key: 'quote.by', label: 'Người nói', type: 'text' },
        { key: 'image', label: 'Ảnh', type: 'image' },
      ],
      item: { title: 'Chuyện mới', text: '', quote: { text: '', by: '' }, image: { src: '', alt: '' } },
    },
  ],
  // Thẻ người, nơi chốn, cam kết. Liên kết của thẻ cần có địa chỉ mới hiện nên chưa đưa vào form.
  cards: [
    ...HEAD,
    { key: 'tag', label: 'Nhãn trên dải màu (kiểu thẻ đeo)', type: 'text', optional: true },
    {
      key: 'items', label: 'Thẻ', type: 'list',
      fields: [
        { key: 'title', label: 'Tên', type: 'text' },
        { key: 'meta', label: 'Dòng phụ', type: 'text' },
        { key: 'text', label: 'Đoạn chữ', type: 'long' },
        { key: 'quote', label: 'Câu trích', type: 'long' },
        { key: 'image', label: 'Ảnh', type: 'image' },
      ],
      item: { title: 'Thẻ mới', text: '' },
    },
  ],
  // Ưu đãi. Hạn đặt, mùa ưu đãi là ngày, số đêm và giá các hạng là số: chưa có ô (form chưa có kiểu ngày, số); không cho thêm
  // hạng vì hạng thiếu giá làm hỏng con tem giá.
  offer: [
    ...HEAD,
    { key: 'titleAccent', label: 'Phần cuối tiêu đề (màu nhấn)', type: 'text', optional: true },
    { key: 'image', label: 'Ảnh mặt trước', type: 'image', optional: true },
    { key: 'caption', label: 'Chú thích ảnh', type: 'text', optional: true },
    { key: 'captionPlace', label: 'Nơi chụp', type: 'text', optional: true },
    { key: 'note.label', label: 'Nhãn mặt sau', type: 'text', optional: true },
    { key: 'note.greeting', label: 'Lời chào', type: 'text', optional: true },
    { key: 'note.text', label: 'Lời nhắn', type: 'long', optional: true },
    { key: 'note.sign', label: 'Chữ ký', type: 'text', optional: true },
    {
      key: 'facts', label: 'Điều kiện', type: 'list', optional: true,
      fields: [{ key: 'label', label: 'Nhãn', type: 'text' }, { key: 'value', label: 'Nội dung', type: 'text' }],
      item: { label: 'Điều kiện', value: '' },
    },
  ],
  // Các hạng phòng. Mỏm đá tách nền và vị trí mốc (kiểu headland) là dữ liệu vẽ riêng nên không đưa vào form.
  stays: [
    ...HEAD,
    { key: 'hint', label: 'Gợi ý bấm mốc', type: 'text', optional: true },
    { key: 'priceNote', label: 'Ghi chú giá', type: 'text', optional: true },
    {
      key: 'rooms', label: 'Hạng', type: 'list', optional: true,
      fields: [
        { key: 'label', label: 'Tên hạng', type: 'text' },
        { key: 'text', label: 'Mô tả', type: 'long' },
        { key: 'area', label: 'Diện tích', type: 'text' },
        { key: 'image', label: 'Ảnh', type: 'image' },
        { key: 'view.text', label: 'Cảnh nhìn ra', type: 'text' },
        { key: 'view.best', label: 'Giờ đẹp nhất', type: 'text' },
      ],
      item: { id: 'hang-moi', label: 'Hạng mới', text: '', image: { src: '', alt: '' } },
    },
  ],
  // Gồm gì. Thường lấy từ catalog (section ghi item); chỉ hiện ô khi section tự ghi danh sách.
  included: [
    { key: 'eyebrow', label: 'Nhãn nhỏ', type: 'text', optional: true },
    { key: 'title', label: 'Tiêu đề', type: 'text', optional: true },
    { key: 'lead', label: 'Câu dẫn', type: 'long', optional: true },
    { key: 'includes', label: 'Đã gồm', type: 'list', optional: true, fields: [{ key: '', label: 'Mục', type: 'text' }], item: 'Mục mới' },
    { key: 'excludes', label: 'Chưa gồm', type: 'list', optional: true, fields: [{ key: '', label: 'Mục', type: 'text' }], item: 'Mục mới' },
    { key: 'bring', label: 'Nên mang', type: 'list', optional: true, fields: [{ key: '', label: 'Mục', type: 'text' }], item: 'Mục mới' },
  ],
  // Ảnh bìa trang chi tiết. Thường lấy tên, ảnh, thông số từ catalog; chỉ hiện ô khi section tự ghi.
  'item-cover': [
    { key: 'eyebrow', label: 'Nhãn nhỏ', type: 'text', optional: true },
    { key: 'title', label: 'Tên', type: 'text', optional: true },
    {
      key: 'images', label: 'Ảnh', type: 'list', optional: true,
      fields: [{ key: '', label: 'Ảnh', type: 'image' }, { key: 'caption', label: 'Chú thích', type: 'text' }],
      item: { src: '', alt: '', caption: '' },
    },
    {
      key: 'facts', label: 'Thông số', type: 'list', optional: true,
      fields: [{ key: 'label', label: 'Nhãn', type: 'text' }, { key: 'value', label: 'Giá trị', type: 'text' }],
      item: { label: 'Thông số', value: '' },
    },
  ],
  // Cảnh đáng chờ: section ghi view thì dùng của section, không thì lấy view của mục trong catalog.
  scene: [
    { key: 'view.text', label: 'Câu tả cảnh', type: 'long', optional: true },
    { key: 'view.best', label: 'Giờ đẹp nhất', type: 'text', optional: true },
    { key: 'view.image', label: 'Ảnh', type: 'image', optional: true },
  ],
  // Lịch trình con đường. Giờ của trạm dạng HH:MM (trời đổi theo giờ); độ cao là số nên chưa có ô.
  journey: [
    ...HEAD,
    { key: 'note', label: 'Ghi chú dưới đồng hồ', type: 'text', optional: true },
    { key: 'planLabel', label: 'Chữ nút mở mây', type: 'text', optional: true },
    {
      key: 'days', label: 'Ngày', type: 'list', optional: true,
      fields: [{ key: 'title', label: 'Tên ngày', type: 'text' }, { key: 'text', label: 'Mô tả', type: 'text' }],
      item: { title: 'Ngày mới', text: '' },
    },
    {
      key: 'stops', label: 'Trạm', type: 'list', optional: true,
      fields: [
        { key: 'time', label: 'Giờ (HH:MM)', type: 'text' },
        { key: 'title', label: 'Tên trạm', type: 'text' },
        { key: 'text', label: 'Mô tả', type: 'long' },
        { key: 'night', label: 'Nơi ngủ đêm (nếu có)', type: 'text' },
        { key: 'image', label: 'Ảnh', type: 'image' },
        {
          key: 'plan', label: 'Mốc giờ trong mây', type: 'list',
          fields: [{ key: 'time', label: 'Giờ (HH:MM)', type: 'text' }, { key: 'text', label: 'Việc', type: 'text' }],
          item: { time: '12:00', text: 'Việc mới' },
        },
      ],
      item: { time: '12:00', title: 'Trạm mới', text: '', image: { src: '', alt: '' } },
    },
    { key: 'finish.eyebrow', label: 'Nhãn ô cuối đường', type: 'text', optional: true },
    { key: 'finish.title', label: 'Tiêu đề ô cuối đường', type: 'text', optional: true },
    { key: 'finish.text', label: 'Chữ ô cuối đường', type: 'long', optional: true },
  ],
  // Một ngày theo giờ (sông và bến). Múi giờ lấy từ nơi chốn của thương hiệu.
  'day-plan': [
    { key: 'eyebrow', label: 'Nhãn nhỏ', type: 'text' },
    { key: 'title', label: 'Tiêu đề', type: 'text' },
    { key: 'hint', label: 'Gợi ý cuộn', type: 'text', optional: true },
    { key: 'nowLabel', label: 'Chữ trước giờ thật', type: 'text', optional: true },
    { key: 'liveLabel', label: 'Nhãn bến đang diễn ra', type: 'text', optional: true },
    { key: 'moreLabel', label: 'Nhãn góc ảnh', type: 'text', optional: true },
    {
      key: 'stops', label: 'Bến', type: 'list', optional: true,
      fields: [
        { key: 'time', label: 'Giờ (HH:MM)', type: 'text' },
        { key: 'title', label: 'Tên bến', type: 'text' },
        { key: 'text', label: 'Mô tả', type: 'long' },
        { key: 'image', label: 'Ảnh', type: 'image' },
        {
          key: 'details', label: 'Chi tiết', type: 'list',
          fields: [{ key: 'label', label: 'Nhãn', type: 'text' }, { key: 'value', label: 'Nội dung', type: 'text' }],
          item: { label: 'Nhãn', value: '' },
        },
      ],
      item: { time: '12:00', title: 'Bến mới', text: '', image: { src: '', alt: '' } },
    },
  ],
  // Các bước. Hình SVG và màu của từng bước là dữ liệu vẽ nên không đưa vào form; bước thêm mới không có hình thì khối
  // chuyển sang cách hiện tĩnh (đã có sẵn trong component).
  process: [
    ...HEAD,
    {
      key: 'steps', label: 'Bước', type: 'list', optional: true,
      fields: [{ key: 'name', label: 'Tên bước', type: 'text' }, { key: 'text', label: 'Mô tả', type: 'long' }, { key: 'image', label: 'Ảnh', type: 'image' }],
      item: { name: 'Bước mới', text: '', image: { src: '', alt: '' } },
    },
  ],
  // Liên hệ. Cách liên hệ có kind (điện thoại, email, địa chỉ) lấy số, email, địa chỉ từ Thông tin chung; ô "Thông tin riêng"
  // chỉ dành cho cách liên hệ thêm mới (ví dụ Zalo), vì khối ưu tiên value của mục hơn Thông tin chung.
  contact: [
    ...HEAD,
    { key: 'image', label: 'Ảnh', type: 'image', optional: true },
    { key: 'image.caption', label: 'Chú thích ảnh', type: 'text', optional: true },
    { key: 'hours.from', label: 'Giờ mở cửa (HH:MM)', type: 'text', optional: true },
    { key: 'hours.to', label: 'Giờ đóng cửa (HH:MM)', type: 'text', optional: true },
    {
      key: 'ways', label: 'Cách liên hệ', type: 'list', optional: true,
      fields: [
        { key: 'label', label: 'Nhãn', type: 'text' },
        { key: 'text', label: 'Dòng giải thích', type: 'text' },
        { key: 'value', label: 'Thông tin riêng (để trống với điện thoại, email, địa chỉ)', type: 'text' },
      ],
      item: { label: 'Zalo', text: 'Nhắn tin bất cứ lúc nào', value: '0123 456 789' },
    },
    { key: 'directions.title', label: 'Tiêu đề chỉ đường', type: 'text', optional: true },
    { key: 'directions.steps', label: 'Bước chỉ đường', type: 'list', optional: true, fields: [{ key: '', label: 'Bước', type: 'text' }], item: 'Bước mới.' },
    { key: 'message.title', label: 'Tiêu đề tờ nhắn tin', type: 'text', optional: true },
    { key: 'message.lead', label: 'Lời dẫn tờ nhắn tin', type: 'long', optional: true },
    { key: 'message.tipsTitle', label: 'Tiêu đề lời dặn', type: 'text', optional: true },
    { key: 'message.tips', label: 'Lời dặn', type: 'list', optional: true, fields: [{ key: '', label: 'Lời dặn', type: 'text' }], item: 'Điều nên nhắn kèm.' },
    { key: 'plate.number', label: 'Số nhà trên biển', type: 'text', optional: true },
    { key: 'plate.label', label: 'Nhãn biển số (trình đọc màn hình)', type: 'text', optional: true },
  ],
};

export function fieldsFor(section) {
  return FIELDS[section.type] ?? HEAD;
}

/* Trường sửa được của một tour hay hạng phòng trong danh mục (catalog.items, AGENTS.md mục 5), cho tab Danh mục của editor.
   Sửa một lần thì mọi khối đọc danh mục (danh sách, trang chi tiết, đặt chỗ, bảng giờ, gợi ý tour) cùng đổi. Tên và giá luôn có;
   các trường khác chỉ hiện khi mục đã có. id, đường dẫn trang chi tiết, giờ chạy, các chặng, ngày còn chỗ giữ nguyên: đổi id
   hay đường dẫn làm gãy liên kết và đặt chỗ đang trỏ tới mục đó. */
export const CATALOG_FIELDS = [
  { key: 'name', label: 'Tên', type: 'text' },
  { key: 'tagline', label: 'Câu ngắn', type: 'text', optional: true },
  { key: 'text', label: 'Mô tả', type: 'long', optional: true },
  { key: 'image', label: 'Ảnh đại diện', type: 'image', optional: true },
  { key: 'price', label: 'Giá (đồng)', type: 'number', step: 1000 },
  { key: 'unit', label: 'Đơn vị giá (khách, đêm...)', type: 'text', optional: true },
  { key: 'maxGuests', label: 'Số khách tối đa', type: 'number', min: 1, max: 99, optional: true },
  { key: 'area', label: 'Diện tích', type: 'text', optional: true },
  {
    key: 'facts', label: 'Thông số', type: 'list', optional: true,
    fields: [{ key: 'label', label: 'Nhãn', type: 'text' }, { key: 'value', label: 'Giá trị', type: 'text' }],
    item: { label: 'Thông số', value: '' },
  },
  { key: 'includes', label: 'Đã gồm', type: 'list', optional: true, fields: [{ key: '', label: 'Mục', type: 'text' }], item: 'Mục mới' },
  { key: 'excludes', label: 'Chưa gồm', type: 'list', optional: true, fields: [{ key: '', label: 'Mục', type: 'text' }], item: 'Mục mới' },
  { key: 'bring', label: 'Nên mang', type: 'list', optional: true, fields: [{ key: '', label: 'Mục', type: 'text' }], item: 'Mục mới' },
  { key: 'view.text', label: 'Cảnh đáng chờ', type: 'long', optional: true },
  { key: 'view.best', label: 'Giờ đẹp nhất', type: 'text', optional: true },
];

// Khối thêm mới: dữ liệu mẫu tối thiểu để khối hiện được ngay, người dùng sửa tiếp trong form.
// gallery lấy ảnh từ kho ảnh của thương hiệu (images: [{ src, alt }]) lúc thêm.
export const TEMPLATES = [
  { type: 'intro', label: 'Đoạn giới thiệu', make: () => ({ type: 'intro', eyebrow: 'Nhãn nhỏ', title: 'Tiêu đề mới', lead: 'Một hai câu giới thiệu.' }) },
  { type: 'gallery', label: 'Thư viện ảnh', make: (images) => ({ type: 'gallery', variant: 'slices', title: 'Thư viện ảnh', images: images.slice(0, 4).map((img) => ({ ...img, caption: '' })) }) },
  { type: 'faq', label: 'Hỏi đáp', make: () => ({ type: 'faq', title: 'Hỏi đáp', items: [{ question: 'Câu hỏi?', answer: 'Câu trả lời.' }] }) },
  { type: 'reviews', label: 'Khách kể', make: () => ({ type: 'reviews', variant: 'postcard', title: 'Khách kể', items: [{ text: 'Lời kể của khách.', name: 'Tên khách', from: 'Nơi ở' }] }) },
  { type: 'tips', label: 'Thẻ mẹo', make: () => ({ type: 'tips', title: 'Mẹo nhỏ', items: [{ title: 'Mẹo đầu tiên', text: 'Một hai câu.' }] }) },
  { type: 'policy', label: 'Bảng chính sách', make: () => ({ type: 'policy', title: 'Chính sách', rows: [{ when: 'Trường hợp', what: 'Kết quả', tone: 'ok' }] }) },
  { type: 'catalog-list', label: 'Danh sách tour, phòng', make: () => ({ type: 'catalog-list', title: 'Tất cả tour', labels: { count: '{n} mục đang hiện' } }) },
];
