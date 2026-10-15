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

// Biến màu cho chỉnh, theo đúng tên biến bắt buộc ở AGENTS.md mục 5.
export const COLORS = [
  ['--color-primary', 'Nền nút chính'],
  ['--color-on-primary', 'Chữ trên nút chính'],
  ['--color-bg', 'Nền trang'],
  ['--color-surface', 'Nền thẻ'],
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
   text (một dòng), long (đoạn), image ({ src, alt }, chọn trong kho ảnh của thương hiệu), select (options),
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
  'room-detail': [
    { key: 'lead', label: 'Câu dẫn', type: 'long', optional: true },
    { key: 'priceNote', label: 'Ghi chú giá', type: 'text', optional: true },
  ],
};

export function fieldsFor(section) {
  return FIELDS[section.type] ?? HEAD;
}

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
