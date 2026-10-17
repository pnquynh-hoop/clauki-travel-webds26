/* mix.js - ghép section từ nhiều khung cho website AI tạo ở /tao.
   Khung (một thương hiệu có sẵn) giữ các khối gắn với dữ liệu và trang của nó (đặt chỗ, danh sách tour, lịch trình...). Các khối chung
   (MIX_TYPES: hero, intro, gallery, reviews, faq, host, tips, policy) AI chọn tự do, kể cả khối và kiểu vốn của khung khác: AI trả
   danh sách "loại:kiểu" ở hồ sơ (trangChu), code lấy dữ liệu của khối đó từ khung nào có nó, đổi đường dẫn ảnh, rồi xếp vào chỗ của các
   khối chung trong trang chủ của khung. Khối đặc trưng vẫn theo luật ở rules.js. Mỗi lần thêm khối chung mới: thêm một dòng vào MENU. */
import { variantsFor } from '../editor/manifest.js';
import { isBanned, sanitizeFrame } from './rules.js';

// Khối chung được ghép: [loại:kiểu, mô tả cho AI]. Kiểu rỗng là kiểu mặc định.
export const MENU = [
  ['hero:coverflow', 'chồng thẻ ảnh xoay, nhiều ảnh, hợp nghỉ dưỡng và điểm đến nhiều cảnh'],
  ['hero:full', 'một ảnh phủ kín, mây vén khi cuộn, hợp thiên nhiên và núi'],
  ['hero:stacked', 'chữ trên, ảnh tràn ngang, gọn, hiện đại'],
  ['hero:haze', 'ảnh phủ sương, rê chuột thì tan, huyền ảo, hợp đêm và thành phố'],
  ['intro:', 'đoạn giới thiệu căn trái'],
  ['intro:center', 'đoạn giới thiệu căn giữa'],
  ['intro:headline', 'tiêu đề rất lớn, mạnh'],
  ['gallery:', 'lưới ảnh'],
  ['gallery:slices', 'dải ảnh xoè như bình phong'],
  ['gallery:plates', 'ô biển số, ảnh loang theo con trỏ, hợp nhiều lựa chọn ngắn'],
  ['reviews:postcard', 'đánh giá bưu thiếp nghiêng, ấm'],
  ['reviews:notes', 'đánh giá giấy note dán, trẻ trung, vui'],
  ['faq:', 'hỏi đáp danh sách gập mở, gọn'],
  ['faq:chat', 'hỏi đáp như nhắn tin với chủ nhà, thân mật'],
  ['host:', 'giới thiệu chủ nhà hay đội ngũ, có ảnh và lời kể'],
  ['tips:', 'mẹo thực tế cho khách (cần duyệt đặc trưng "tips")'],
  ['policy:', 'chính sách huỷ, hoàn tiền (cần duyệt đặc trưng "policy")'],
];
const MENU_KEYS = new Set(MENU.map(([key]) => key));
export const MIX_TYPES = new Set(MENU.map(([key]) => key.split(':')[0]));
const keyOf = (section) => `${section.type}:${section.variant ?? ''}`;
const homeOf = (content) => (content.pages ? content.pages.find((p) => !p.path || p.path === '/') ?? content.pages[0] : content);

// Tải content.json của mọi khung (một lần, song song với việc lập hồ sơ); khung lỗi thì bỏ qua.
export async function loadFrames(ids) {
  const entries = await Promise.all(ids.map(async (id) => {
    try {
      const res = await fetch(`/brands/${id}/content.json`);
      return res.ok ? [id, await res.json()] : null;
    } catch {
      return null;
    }
  }));
  return Object.fromEntries(entries.filter(Boolean));
}

// Đường dẫn ảnh tính từ thư mục thương hiệu (images/...) thành đường dẫn tuyệt đối của thương hiệu gốc, để khối mượn sang chỗ khác
// vẫn trỏ đúng ảnh. Editor dùng chung khi thêm khối lấy từ thương hiệu khác (editor/blocks-add.js).
export const absolute = (node, origin) => {
  const walk = (n) => {
    if (Array.isArray(n)) n.forEach(walk);
    else if (n && typeof n === 'object') {
      for (const [k, v] of Object.entries(n)) {
        if ((k === 'src' || k === 'file') && typeof v === 'string' && v.startsWith('images/')) n[k] = `/brands/${origin}/${v}`;
        else walk(v);
      }
    }
  };
  walk(node);
};

// Lấy bản của khối "loại:kiểu": của chính khung đang dùng nếu có, không thì của khung đầu tiên có nó. Trả về { section, credits } hoặc null.
// Tìm ở trang chủ của mọi khung trước (khung đang dùng đứng đầu, kể cả khối đang ẩn ở đó); không trang chủ nào có thì mới tìm ở trang
// khác, bỏ trang 404. Khối ở trang khác mang chữ của đúng trang ấy (intro center của Bậc Trà chỉ có ở trang 404, "Không tìm thấy trang";
// intro thường của SighGone ở trang Tối nay, "Tối nay ăn gì?"), nên chỉ dùng khi không còn cách nào; hero full, faq, tips, policy chỉ có ở
// trang khác.
function findSection(key, frames, base) {
  const order = [base, ...Object.keys(frames).filter((f) => f !== base)].filter((id) => frames[id]);
  const isHome = (p) => (p.path ?? '/').replace(/^\/+|\/+$/g, '') === '';
  const pagesOf = (id) => frames[id].pages ?? [{ sections: frames[id].sections ?? [] }];
  const tries = [
    ...order.map((id) => [id, pagesOf(id).filter(isHome), true]),
    ...order.map((id) => [id, pagesOf(id).filter((p) => !isHome(p) && p.path !== '404'), false]),
  ];
  for (const [id, pages, home] of tries) {
    const data = frames[id];
    for (const page of pages) {
      const hit = (page.sections ?? []).find((s) => keyOf(s) === key && (home || !s.hidden));
      if (!hit) continue;
      const section = structuredClone(hit);
      const own = id === base;
      if (!own) absolute(section, id);
      const files = new Set();
      const collect = (n) => {
        if (Array.isArray(n)) n.forEach(collect);
        else if (n && typeof n === 'object') Object.values(n).forEach(collect);
        else if (typeof n === 'string' && /^(\/brands\/|images\/)/.test(n)) files.add(n);
      };
      collect(section);
      const credits = own ? [] : (data.credits ?? []).filter((c) => files.has(`/brands/${id}/${c.file}`)).map((c) => ({ ...c, file: `/brands/${id}/${c.file}` }));
      return { section, credits };
    }
  }
  return null;
}

// Liên kết lỡ trỏ tới trang hay mốc không còn trong website mới: mục menu thì bỏ, liên kết thường đổi về nút hành động chính của khung.
function fixLinks(content, home) {
  const paths = new Set((content.pages ?? [{ path: '/' }]).map((p) => (p.path || '/').replace(/^\/+|\/+$/g, '') || '/'));
  const ids = new Set(home.sections.map((s) => s.id).filter(Boolean));
  const dead = (href) => {
    if (typeof href !== 'string') return false;
    const page = href.match(/^page:([^#]*)(?:#(.*))?$/);
    if (page) {
      const path = page[1].replace(/^\/+|\/+$/g, '') || '/';
      if (!paths.has(path)) return true;
      return path === '/' && Boolean(page[2]) && !page[2].includes('=') && !ids.has(page[2]);
    }
    const local = href.match(/^#(.+)$/);
    return Boolean(local) && !ids.has(local[1]);
  };
  content.nav = (content.nav ?? []).filter((item) => !dead(item.href));
  const fallback = content.cta?.href && !dead(content.cta.href) ? content.cta.href : 'page:/';
  const walk = (node) => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if (k === 'href' && dead(v)) node[k] = fallback;
        else walk(v);
      }
    }
  };
  walk(home.sections);
}

// Xếp lại trang chủ của khung (đã qua sanitizeFrame): khối chung lấy theo picks (thứ tự do AI chọn), khối khác của khung ở yên chỗ.
// Chỗ của khối chung trong khung được lấp lần lượt; còn thừa thì nối tiếp sau chỗ cuối. Trả về { picked, hero } (các khoá loại:kiểu đã ghép, kiểu hero) hoặc null khi picks
// không dùng được (quá ít khối hợp lệ), khi đó trang chủ giữ nguyên.
export function composeHome(content, picks, frames, base, keepKeys = []) {
  if (!Array.isArray(picks)) return null;
  const keep = new Set(keepKeys);
  const home = homeOf(content);
  const original = home.sections ?? [];
  const valid = [];
  const seen = new Set();
  for (const raw of picks) {
    // AI hay viết "intro::" hay "intro" cho kiểu mặc định: chuẩn hoá về "loại:kiểu".
    const [head, ...rest] = (typeof raw === 'string' ? raw : '').split(':');
    const type = head.trim();
    const variant = rest.map((v) => v.trim()).find(Boolean) ?? '';
    const key = `${type}:${variant}`;
    if (!MENU_KEYS.has(key)) continue;
    if (seen.has(type)) continue;
    if (isBanned({ type, variant: variant || undefined }, keep)) continue;
    const found = findSection(key, frames, base);
    if (!found) continue;
    const options = variantsFor(found.section);
    if (options.length && !options.some(([value]) => value === (found.section.variant ?? ''))) continue;
    seen.add(type);
    valid.push({ key, ...found });
  }
  if (valid.length < 3) return null;
  const heroAt = valid.findIndex((v) => v.key.startsWith('hero:'));
  if (heroAt > 0) valid.unshift(...valid.splice(heroAt, 1));
  const slots = original.filter((s) => MIX_TYPES.has(s.type)).length;
  const used = new Set(original.filter((s) => !MIX_TYPES.has(s.type)).map((s) => s.id).filter(Boolean));
  const credits = [];
  const make = ({ section, credits: more }) => {
    delete section.hidden;
    let id = section.id;
    for (let n = 2; id && used.has(id); n += 1) id = `${section.id}-${n}`;
    if (id) {
      section.id = id;
      used.add(id);
    }
    credits.push(...more);
    return section;
  };
  const sections = [];
  let slot = 0;
  let tail = -1;
  for (const section of original) {
    if (!MIX_TYPES.has(section.type)) {
      sections.push(section);
      continue;
    }
    if (slot < valid.length) sections.push(make(valid[slot]));
    slot += 1;
    tail = sections.length;
  }
  if (valid.length > slots) sections.splice(tail < 0 ? sections.length : tail, 0, ...valid.slice(slots).map(make));
  home.sections = sections;
  content.credits = [...(content.credits ?? []), ...credits.filter((c) => !(content.credits ?? []).some((x) => x.file === c.file))];
  fixLinks(content, home);
  return { picked: valid.map((v) => v.key), hero: valid[0].key.startsWith('hero:') ? valid[0].key.split(':')[1] : '' };
}

// Chân trang cũng trộn được: kiểu columns (ảnh nền lớn, lời hẹn, dòng chữ chạy địa danh) hay headline (lời hẹn chữ bảng hiệu, không ảnh nền).
// Dữ liệu lấy từ khung có kiểu đó (ưu tiên khung đang dùng); mây (clouds) chỉ giữ khi đã duyệt cloud-band, ô số nhà và dây điện chỉ giữ khi
// đã duyệt contact:plate, cột tour của headline chỉ có khi khung có catalog.
export const FOOTERS = [
  ['columns', 'ảnh nền lớn, lời hẹn chữ lớn, dòng chữ chạy các địa danh, cột liên kết; hợp nơi có ảnh phong cảnh đẹp'],
  ['headline', 'lời hẹn chữ rất lớn kiểu bảng hiệu, không ảnh nền, gọn; hợp thành phố, tour ngắn, giọng vui'],
];

export function composeFooter(content, kind, frames, base, keepKeys = []) {
  if (!FOOTERS.some(([key]) => key === kind)) return null;
  const keep = new Set(keepKeys);
  let footer = null;
  let credits = [];
  if ((content.footer?.variant ?? 'columns') === kind) footer = content.footer;
  else {
    const donor = [base, ...Object.keys(frames).filter((f) => f !== base)].find((id) => id !== base && (frames[id]?.footer?.variant ?? 'columns') === kind);
    if (!donor) return null;
    footer = structuredClone(frames[donor].footer);
    absolute(footer, donor);
    if (footer.navTitle === frames[donor].brand?.name) footer.navTitle = content.brand?.name ?? footer.navTitle;
    delete footer.hours;
    const files = new Set();
    const collect = (n) => {
      if (Array.isArray(n)) n.forEach(collect);
      else if (n && typeof n === 'object') Object.values(n).forEach(collect);
      else if (typeof n === 'string' && n.startsWith(`/brands/${donor}/`)) files.add(n);
    };
    collect(footer);
    credits = (frames[donor].credits ?? []).filter((c) => files.has(`/brands/${donor}/${c.file}`)).map((c) => ({ ...c, file: `/brands/${donor}/${c.file}` }));
  }
  if (!keep.has('cloud-band')) delete footer.clouds;
  if (!keep.has('contact:plate')) {
    delete footer.plate;
    delete footer.wires;
  }
  if (!(content.catalog?.items ?? []).length) delete footer.toursTitle;
  content.footer = footer;
  content.credits = [...(content.credits ?? []), ...credits.filter((c) => !(content.credits ?? []).some((x) => x.file === c.file))];
  return kind;
}

// Trang cơ bản mà khung chưa có (khung nghỉ dưỡng Gành Sớm không có trang liên hệ, giới thiệu, 404): mượn từ khung khác, lấy bản
// còn nhiều khối nhất sau khi dọn theo luật đặc trưng; bỏ các khối gắn với danh mục, đặt chỗ của khung kia (chúng cần dữ liệu không có ở
// site mới). Chữ của trang mượn được AI viết lại như mọi chữ khác. Trả về danh sách đường dẫn đã mượn.
const BORROW = ['lien-he', 've-chung-toi', '404'];
const BOUND = new Set(['stays', 'booking', 'catalog-list', 'item-cover', 'item-booking', 'photo-strip', 'included', 'scene', 'room-detail',
  'route', 'tour-pick', 'timetable', 'custom-trip', 'clock', 'journey', 'process', 'day-plan', 'cloud-band', 'offer']);

export function borrowPages(content, frames, base, keepKeys = []) {
  if (!Array.isArray(content.pages)) return [];
  const has = new Set(content.pages.map((p) => p.path));
  const borrowed = [];
  for (const path of BORROW.filter((p) => !has.has(p))) {
    let best = null;
    for (const id of Object.keys(frames).filter((f) => f !== base)) {
      if (!frames[id]?.pages?.some((p) => p.path === path)) continue;
      const copy = structuredClone(frames[id]);
      sanitizeFrame(copy, keepKeys);
      const page = copy.pages?.find((p) => p.path === path);
      if (!page) continue;
      page.sections = page.sections.filter((s) => !s.hidden && !BOUND.has(s.type));
      const real = page.sections.filter((s) => s.type !== 'breadcrumb').length;
      if (real && (!best || real > best.real)) best = { id, page, real, credits: copy.credits ?? [] };
    }
    if (!best) continue;
    absolute(best.page, best.id);
    const files = new Set();
    const collect = (n) => {
      if (Array.isArray(n)) n.forEach(collect);
      else if (n && typeof n === 'object') Object.values(n).forEach(collect);
      else if (typeof n === 'string' && n.startsWith(`/brands/${best.id}/`)) files.add(n);
    };
    collect(best.page);
    const credits = best.credits.filter((c) => files.has(`/brands/${best.id}/${c.file}`)).map((c) => ({ ...c, file: `/brands/${best.id}/${c.file}` }));
    content.credits = [...(content.credits ?? []), ...credits.filter((c) => !(content.credits ?? []).some((x) => x.file === c.file))];
    // Trang 404 đứng cuối; trang khác chèn trước 404 nếu có.
    const at = content.pages.findIndex((p) => p.path === '404');
    if (path === '404' || at < 0) content.pages.push(best.page);
    else content.pages.splice(at, 0, best.page);
    if (path !== '404' && !(content.nav ?? []).some((item) => item.href === `page:${path}`)) {
      (content.nav ??= []).push({ label: best.page.title ?? path, href: `page:${path}` });
    }
    borrowed.push(path);
  }
  return borrowed;
}
