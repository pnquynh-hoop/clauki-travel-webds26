/* rules.js - luật component cho website AI tạo ở /tao (#81), gom ở một chỗ để cả đội sửa được.
   1. Component đặc trưng: mỗi thương hiệu có vài khối gắn với câu chuyện và ảnh riêng của nó (hành trình con đường và dải mây của
      Bậc Trà, tivi và một ngày ở vườn của Mé Rạch, bưu thiếp ưu đãi của Gành Sớm, đồng hồ, giờ chạy, quầy vé, bảng thành tích của
      SighGone). Khối đặc trưng chỉ được dùng khi hồ sơ nơi chốn thật sự hợp với điều kiện ghi ở SIGNATURE (AI quyết định lúc lập hồ sơ,
      nghi ngờ thì không dùng); riêng khối gắn chặt với ảnh tách nền của thương hiệu khác (hard) thì không bao giờ dùng.
   2. Trộn bộ: website mới không bị khoá vào một thương hiệu. Khung chỉ cho bố cục và dữ liệu nền; kiểu trình bày của từng khối được
      chọn tự do trong các kiểu chung (MIX_VARIANTS), kể cả kiểu vốn của thương hiệu khác, miễn dữ liệu của khối đủ cho kiểu đó.
   Mỗi lần thêm component mới vào hệ thống: nếu nó đặc trưng cho một thương hiệu thì thêm một dòng vào SIGNATURE ở đây. */
import { variantsFor } from '../editor/manifest.js';

// Component đặc trưng. key là loại khối ("journey") hoặc loại và kiểu ("hero:ride"); fit là điều kiện phù hợp, đưa nguyên văn cho AI;
// hard: true là gắn chặt với ảnh tách nền hay dữ liệu riêng của thương hiệu khác, không bao giờ dùng được cho nơi khác.
export const SIGNATURE = [
  { key: 'journey', fit: 'tour nhiều ngày, lịch trình theo từng trạm hay từng ngày trên một tuyến đường dài (đi núi, phượt, hành trình)' },
  { key: 'cloud-band', fit: 'nơi vùng cao có núi, sương, mây thấp' },
  { key: 'process', fit: 'sản phẩm thủ công hay ẩm thực có các bước làm ra rõ ràng (trà, cà phê, gốm, bánh)' },
  { key: 'day-plan', fit: 'một ngày trải nghiệm có nhiều mốc giờ liên tiếp ở nơi có sông nước, vườn, làng' },
  { key: 'host:tv', fit: 'chủ nhà có nhiều câu chuyện riêng để kể, giọng hoài cổ, kể chuyện' },
  { key: 'offer:postcard', fit: 'ưu đãi theo mùa ở nơi nghỉ dưỡng biển có hạn chót rõ ràng' },
  { key: 'clock', fit: 'tour trong thành phố chạy nhiều khung giờ trong ngày, mỗi giờ hợp một việc khác nhau' },
  { key: 'timetable', fit: 'có nhiều chuyến trong ngày, khách cần xem chuyến nào sắp chạy' },
  { key: 'tour-pick', fit: 'có từ bốn tour hay lựa chọn trở lên, khách khó chọn' },
  { key: 'custom-trip', fit: 'khách tự ghép tour từ nhiều chặng hay phương tiện khác nhau' },
  { key: 'tips', fit: 'có mẹo thực tế cho khách (đồ mang, thời tiết, giờ đẹp)' },
  { key: 'policy', fit: 'có chính sách huỷ, hoàn tiền, dời lịch cần nói rõ' },
  { key: 'pictogram', fit: 'doanh nghiệp đã hoạt động lâu, có số liệu để khoe bằng hình' },
  { key: 'medals', fit: 'có thành tích, giải thưởng, chứng nhận thật' },
  { key: 'coins', fit: 'cần nói rõ tiền khách trả đi đâu (cộng đồng, người dân địa phương)' },
  { key: 'booking:wall', fit: 'tour có lịch khởi hành dài nhiều tuần, cần xem theo tờ lịch tháng' },
  { key: 'booking:ticket', fit: 'tour trong ngày đi bằng xe, tàu, thuyền, cần giữ chỗ như đặt vé' },
  { key: 'item-booking:ticket', fit: 'tour trong ngày đi bằng xe, tàu, thuyền, cần giữ chỗ như đặt vé' },
  { key: 'included:receipt', fit: 'tour có danh sách gồm gì, không gồm gì cần trình bày như hoá đơn' },
  { key: 'contact:bell', fit: 'chỗ ở trong hẻm, nhà phố, khách phải gọi hay bấm chuông' },
  { key: 'contact:plate', fit: 'chỗ ở trong hẻm, nhà phố có số nhà làm điểm hẹn' },
  { key: 'cards:badge', fit: 'có đội hướng dẫn viên hay nhân sự cần giới thiệu bằng thẻ đeo' },
  { key: 'hero:ride', hard: true, fit: 'chỉ dùng cho Sài Gòn, cần ảnh các toà nhà tách nền của thành phố' },
  { key: 'stays:headland', hard: true, fit: 'cần ảnh mỏm đá tách nền của đúng chỗ ở đó' },
];
const SIGNATURE_BY_KEY = new Map(SIGNATURE.map((item) => [item.key, item]));

// Khối này có phải đặc trưng không (theo loại, hoặc theo loại và kiểu).
const keyOf = (section) => (section.variant && SIGNATURE_BY_KEY.has(`${section.type}:${section.variant}`) ? `${section.type}:${section.variant}` : section.type);
const signatureOf = (section) => SIGNATURE_BY_KEY.get(keyOf(section)) ?? null;

// Khối đặc trưng bị cấm trừ khi nằm trong tập keep (khoá AI đã duyệt là thật sự hợp); hard thì luôn bị cấm.
export const isBanned = (section, keep) => {
  const sig = signatureOf(section);
  return Boolean(sig) && (sig.hard || !keep.has(sig.key));
};

// Kiểu của khối vẫn dùng được (ví dụ stays có kiểu headland là đặc trưng nhưng stays thường thì không): đổi sang kiểu chung hợp lệ đầu tiên.
const fallbackVariant = (section, keep) => variantsFor(section).map(([value]) => value)
  .find((value) => !isBanned({ ...section, variant: value || undefined }, keep));

// Kiểu chung được trộn ở trang chủ: khối nào có nhiều hơn một kiểu hợp lệ thì AI chọn theo giọng nơi chốn. Giá trị rỗng là kiểu mặc định.
// Hợp lệ còn phụ thuộc dữ liệu của khối (variantsFor kiểm).
export const MIX_VARIANTS = {
  hero: ['coverflow', 'full', 'stacked', 'haze'],
  intro: ['', 'center', 'headline'],
  gallery: ['', 'slices', 'plates'],
  reviews: ['postcard', 'notes'],
  faq: ['', 'chat'],
};

// Kiểu header được chọn: overlay chỉ hợp khi trang chủ mở đầu bằng hero full (ảnh tràn), nên xét riêng ở chooseLayout.
export const HEADER_CHOICES = ['solid', 'center', 'overlay'];

const allowedVariants = (section, keep = new Set()) => variantsFor(section).map(([value]) => value)
  .filter((value) => !isBanned({ ...section, variant: value || undefined }, keep));

// Các kiểu AI được chọn cho một khối: giao của kiểu hợp lệ theo dữ liệu, không bị cấm, và nằm trong danh sách trộn nếu khối có khai.
export function choicesFor(section, keep = new Set()) {
  const mix = MIX_VARIANTS[section.type];
  const ok = allowedVariants(section, keep);
  return mix ? ok.filter((value) => mix.includes(value)) : ok;
}

// Dọn khung (content.json đã chép): bỏ khối đặc trưng không được duyệt (keep), khối có kiểu đặc trưng không được duyệt thì đổi sang kiểu chung
// hợp lệ đầu tiên (không có thì bỏ ghi variant, riêng hero không có kiểu nào thì bỏ khối), bỏ trang chỉ còn đường dẫn trang, bỏ mục menu trỏ
// tới trang đã bỏ và đổi các liên kết còn lại tới trang đó về trang chủ. Trả về { removed, kept, removedPages } để báo cho người dùng.
export function sanitizeFrame(content, keepKeys = []) {
  const keep = new Set(keepKeys.filter((key) => SIGNATURE_BY_KEY.has(key) && !SIGNATURE_BY_KEY.get(key).hard));
  const report = { removed: new Set(), kept: new Set(), removedPages: [] };
  const pages = content.pages ?? [{ path: '/', sections: content.sections ?? [] }];
  for (const page of pages) {
    page.sections = (page.sections ?? []).filter((section) => {
      const sig = signatureOf(section);
      if (!sig) return true;
      if (!isBanned(section, keep)) {
        report.kept.add(sig.key);
        return true;
      }
      // Kiểu đặc trưng của một khối thường (như booking:ticket): đổi kiểu thay vì bỏ khối.
      if (section.variant && sig.key.includes(':')) {
        const next = fallbackVariant(section, keep);
        if (next !== undefined) {
          if (next) section.variant = next;
          else delete section.variant;
          report.removed.add(sig.key);
          return true;
        }
        if (section.type !== 'hero') {
          delete section.variant;
          report.removed.add(sig.key);
          return true;
        }
      }
      report.removed.add(sig.key);
      return false;
    });
  }
  if (content.pages) {
    const kept = [];
    for (const page of content.pages) {
      const real = page.sections.filter((section) => section.type !== 'breadcrumb');
      if (!real.length && page.path !== '/' && page.path !== '404') report.removedPages.push(page.path);
      else kept.push(page);
    }
    content.pages = kept;
    if (report.removedPages.length) redirect(content, report.removedPages);
  }
  return { removed: [...report.removed], kept: [...report.kept], removedPages: report.removedPages };
}

// Trang đã bỏ: gỡ mục menu trỏ tới nó, đổi mọi liên kết page:<trang đã bỏ> còn lại thành page:/ để không có liên kết chết.
function redirect(content, removed) {
  const gone = (href) => typeof href === 'string' && href.startsWith('page:') && removed.includes(href.slice(5).split('#')[0].replace(/^\/+|\/+$/g, ''));
  content.nav = (content.nav ?? []).filter((item) => !gone(item.href));
  const walk = (node) => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if (k === 'href' && gone(v)) node[k] = 'page:/';
        else walk(v);
      }
    }
  };
  walk(content);
}
