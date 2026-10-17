/* blocks-add.js - danh sách khối thêm được ở tab Khối và tab AI (#237).
   Mọi khối khai trong BLOCKS của manifest.js, trừ khối đặc trưng của một thương hiệu (SIGNATURE ở create/rules.js; kiểu đặc trưng
   như host tv thì đổi sang kiểu thường). Bảy khối có mẫu trống (TEMPLATES) dùng mẫu đó. Khối khác lấy bản có sẵn trong content.json:
   của thương hiệu đang mở (hay khung của site khách) trước, không có thì của thương hiệu khác, trang chủ trước, bỏ trang 404; mẫu
   lấy từ thương hiệu khác thì đường dẫn ảnh đổi sang thư mục thương hiệu đó và kèm dòng credits của ảnh, như composeHome, borrowPages
   của /tao. Khối đọc danh mục (item, items, tours, pick, related) chỉ lấy mẫu của thương hiệu có danh mục cùng loại (tour hay phòng)
   rồi gắn sang sản phẩm của site đang sửa; site không có danh mục, hay chỉ có mẫu khác loại, thì khối đó khoá lại, ghi lý do. Liên kết của mẫu trỏ tới trang không có ở site đang sửa thì đổi về nút hành động chính. */
import { BLOCKS, TEMPLATES, variantsFor } from './manifest.js';
import { norm } from './ops.js';
import { isBanned } from '../create/rules.js';
import { loadFrames, absolute } from '../create/mix.js';

// Nhóm trong ô chọn khối, theo việc khối làm trên trang. Khối có trong BLOCKS mà chưa xếp nhóm thì vào nhóm Khác.
const GROUPS = [
  ['Mở đầu', ['hero', 'intro', 'breadcrumb']],
  ['Ảnh', ['gallery', 'backdrop', 'photo-strip', 'scene']],
  ['Nội dung', ['cards', 'host', 'reviews', 'faq', 'tips', 'policy', 'included']],
  ['Đặt chỗ, danh mục', ['catalog-list', 'booking', 'stays', 'offer', 'room-detail', 'item-cover', 'item-booking']],
  ['Liên hệ', ['contact']],
];
// Khối đọc thẳng danh mục dù section không ghi khoá nào.
const READS_CATALOG = new Set(['catalog-list']);
// Editor không duyệt khối đặc trưng nào (khác /tao, nơi AI duyệt theo hồ sơ nơi chốn).
const NO_KEEP = new Set();
const NEED_CATALOG = 'cần danh mục';

let frames = {};
let loading = null;

// Tải content.json của các thương hiệu có sẵn một lần; xong thì gọi lại để vẽ lại ô chọn khối.
export function loadLibrary(ids) {
  loading ??= loadFrames(ids).then((data) => { frames = data; });
  return loading;
}

const catalogIds = (content) => (content.catalog?.items ?? []).map((item) => item.id).filter(Boolean);
// Danh mục là phòng (giá theo đêm, có diện tích, số căn, cảnh nhìn ra) hay tour: mẫu đọc danh mục chỉ dùng cho site có danh mục cùng
// loại, để khối ưu đãi theo hạng phòng của Gành Sớm không gắn nhầm vào tour của Bậc Trà.
const kindOf = (content) => ((content.catalog?.items ?? []).some((item) => item.area || item.count || item.view || /đêm/i.test(item.unit ?? '')) ? 'stay' : 'tour');
const NEED_KIND = { stay: 'cần danh mục phòng', tour: 'cần danh mục tour' };
// Khối chỉ đọc trường chung của mọi sản phẩm (tên, ảnh, đã gồm, chưa gồm), dùng được với cả tour lẫn phòng.
const ANY_KIND = new Set(['included', 'item-cover', 'photo-strip']);
const idList = (value) => Array.isArray(value) && value.length > 0 && value.every((x) => typeof x === 'string');

// Khối có đọc sản phẩm trong danh mục không. items của breadcrumb, cards là mảng object nên không tính.
const usesCatalog = (s) => READS_CATALOG.has(s.type) || typeof s.item === 'string' || typeof s.related === 'string'
  || s.items === true || idList(s.items) || s.tours === true || idList(s.tours) || idList(s.pick);

// Đổi id sản phẩm của thương hiệu mẫu sang sản phẩm của site đang sửa.
function bindCatalog(s, ids) {
  if (typeof s.item === 'string') s.item = ids[0];
  if (typeof s.related === 'string') s.related = ids[0];
  if (idList(s.items)) s.items = true;
  if (idList(s.tours)) s.tours = true;
  if (idList(s.pick)) s.pick = ids.slice(0, 3);
}

// Kiểu đặc trưng (host tv, contact bell...) đổi sang kiểu thường đầu tiên còn hợp với dữ liệu; không có thì trả false.
function plainVariant(s) {
  if (!isBanned(s, NO_KEEP)) return true;
  const ok = variantsFor(s).map(([value]) => value).filter((value) => !isBanned({ ...s, variant: value || undefined }, NO_KEEP));
  if (!ok.length) return false;
  if (ok[0]) s.variant = ok[0];
  else delete s.variant;
  return true;
}

// Liên kết trỏ tới trang hay mốc không có ở site đang sửa (của thương hiệu mẫu) thì đổi về nút hành động chính.
function fixLinks(section, content, anchors) {
  const paths = new Set((content.pages ?? [{ path: '/' }]).map((p) => norm(p.path)));
  const fallback = content.cta?.href ?? 'page:/';
  const dead = (href) => {
    const page = /^page:([^#]*)/.exec(href);
    if (page) return !paths.has(norm(page[1]));
    const local = /^#(.+)$/.exec(href);
    return Boolean(local) && !anchors.has(local[1]);
  };
  const walk = (node) => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        if (key === 'href' && typeof value === 'string' && dead(value)) node[key] = fallback;
        else walk(value);
      }
    }
  };
  walk(section);
}

// Dòng credits cho các ảnh của mẫu (đã đổi sang /brands/<id>/...).
function creditsOf(section, id, data) {
  const files = new Set();
  const collect = (node) => {
    if (Array.isArray(node)) node.forEach(collect);
    else if (node && typeof node === 'object') Object.values(node).forEach(collect);
    else if (typeof node === 'string' && node.startsWith(`/brands/${id}/`)) files.add(node);
  };
  collect(section);
  return (data.credits ?? []).filter((c) => files.has(`/brands/${id}/${c.file}`)).map((c) => ({ ...c, file: `/brands/${id}/${c.file}` }));
}

const isHome = (page) => norm(page.path) === '/';

// Các bản có sẵn của một loại khối, theo thứ tự ưu tiên: thương hiệu đang mở (base) trước, trang chủ trước, bỏ trang 404.
function candidates(type, base) {
  const out = [];
  for (const id of [base, ...Object.keys(frames).filter((f) => f !== base)]) {
    const data = frames[id];
    if (!data) continue;
    const all = data.pages ?? [{ path: '/', sections: data.sections ?? [] }];
    for (const page of [...all.filter(isHome), ...all.filter((p) => !isHome(p) && p.path !== '404')]) {
      (page.sections ?? []).filter((s) => s.type === type && !s.hidden).forEach((s) => out.push({ id, data, section: s }));
    }
  }
  return out;
}

// Mẫu dùng được của một loại khối cho site đang sửa: { section, credits } hoặc { reason }, null khi không có mẫu nào.
// Ưu tiên bản không phải kiểu đặc trưng; bản đọc danh mục chỉ dùng khi site có danh mục.
function sampleOf(type, content, base, anchors) {
  const ids = catalogIds(content);
  let needCatalog = false;
  let needKind = null;
  const list = candidates(type, base);
  for (const plainOnly of [true, false]) {
    for (const { id, data, section } of list) {
      if (plainOnly && isBanned(section, NO_KEEP)) continue;
      const copy = structuredClone(section);
      if (!plainVariant(copy)) continue;
      if (usesCatalog(copy)) {
        if (!ids.length) {
          needCatalog = true;
          continue;
        }
        if (!ANY_KIND.has(type) && kindOf(data) !== kindOf(content)) {
          needKind = kindOf(data);
          continue;
        }
        bindCatalog(copy, ids);
      }
      delete copy.id;
      const own = id === base;
      if (!own) absolute(copy, id);
      fixLinks(copy, content, anchors);
      return { section: copy, credits: own ? [] : creditsOf(copy, id, data) };
    }
  }
  if (needCatalog) return { reason: NEED_CATALOG };
  return needKind ? { reason: NEED_KIND[needKind] } : null;
}

// Một khối thêm được: mẫu trống (TEMPLATES) hay bản lấy từ thương hiệu. Khối đặc trưng không thêm được.
function entryOf(type, content, base, anchors) {
  const template = TEMPLATES.find((t) => t.type === type);
  if (template) return READS_CATALOG.has(type) && !catalogIds(content).length ? { reason: NEED_CATALOG } : { template };
  if (isBanned({ type }, NO_KEEP) && !variantsFor({ type }).some(([value]) => !isBanned({ type, variant: value || undefined }, NO_KEEP))) return null;
  return sampleOf(type, content, base, anchors);
}

// Ô chọn khối: [{ group, blocks: [{ type, label, reason }] }]; reason là lý do chưa thêm được (null khi thêm được).
export function addableGroups(content, base, anchors = new Set()) {
  const grouped = new Set(GROUPS.flatMap(([, types]) => types));
  const others = Object.keys(BLOCKS).filter((type) => !grouped.has(type));
  return [...GROUPS, ['Khác', others]].map(([group, types]) => ({
    group,
    blocks: types.map((type) => {
      const entry = entryOf(type, content, base, anchors);
      return entry && { type, label: BLOCKS[type]?.label ?? type, reason: entry.reason ?? null };
    }).filter(Boolean),
  })).filter((g) => g.blocks.length);
}

// Dựng khối mới để chèn: { section, credits } hoặc null khi loại này chưa thêm được ở site đang sửa.
export function makeBlock(type, content, base, images, anchors = new Set()) {
  const entry = entryOf(type, content, base, anchors);
  if (!entry || entry.reason) return null;
  if (entry.template) return { section: entry.template.make(images), credits: [] };
  return { section: entry.section, credits: entry.credits };
}

// Thêm dòng credits của ảnh mượn vào nội dung, bỏ dòng trùng ảnh đã có.
export function addCredits(content, credits) {
  if (!credits.length) return;
  const have = new Set((content.credits ?? []).map((c) => c.file));
  content.credits = [...(content.credits ?? []), ...credits.filter((c) => !have.has(c.file))];
}
