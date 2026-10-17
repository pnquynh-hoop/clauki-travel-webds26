/* item-detail.js - các hàm dùng chung cho các khối của trang chi tiết một mục trong danh mục (tour, hạng phòng):
   item-cover (ảnh bìa), item-booking (đặt chỗ), photo-strip (dải ảnh), scene (cảnh đáng chờ), và room-detail
   (dựng cả trang bằng cách ghép các khối đó). Không phải component: chỉ là hàm, mỗi khối import phần mình cần.
   Tách từ wl-room-detail.js, giữ nguyên cách xử lý. */
import { asset, catalogItem } from '../core/core.js';
// Ngày, tiền định dạng theo ngôn ngữ đang hiện (core.js đặt <html lang>).
import { pageLocale } from '../core/i18n.js';

export function fill(template, values) {
  return (template ?? '').replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
}

export function imgEl(image, className, lazy) {
  if (!image?.src) return null;
  const img = document.createElement('img');
  img.className = className;
  img.src = asset(image.src);
  img.alt = image.alt ?? '';
  if (lazy) img.loading = 'lazy';
  return img;
}

export const pad = (n) => String(n).padStart(2, '0');

// Số ngày còn chỗ lấy từ danh mục cho thẻ đặt.
const DAYS_SHOWN = 6;

function todayIso(timezone) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

// "2026-10-20" thành "Thứ Ba, 20/10"; tính theo giờ UTC để ngày không lệch theo múi giờ của máy.
function dayLabel(iso) {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  const text = new Intl.DateTimeFormat(pageLocale(), { weekday: 'long', day: 'numeric', month: 'numeric', timeZone: 'UTC' }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// "2026-10-20" thành thứ viết ngắn và ngày tháng cho ô ngày của vé ("Th 3", "20/10"), cũng theo giờ UTC.
export function dayChip(iso) {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return { dow: '', day: iso };
  const dow = new Intl.DateTimeFormat(pageLocale(), { weekday: 'short', timeZone: 'UTC' }).format(date);
  return { dow, day: `${date.getUTCDate()}/${date.getUTCMonth() + 1}` };
}

// Ảnh bìa, rồi ảnh riêng của mục (images: hạng phòng không có chặng), rồi ảnh của từng chặng (chú thích là tên chặng), bỏ ảnh trùng.
function itemImages(item) {
  const seen = new Set();
  const list = [item.image, ...(item.images ?? []), ...(item.stages ?? []).map((st) => st.image && { ...st.image, caption: st.place })];
  return list.filter((image) => image?.src && !seen.has(image.src) && seen.add(image.src));
}

// Ngày còn chỗ ghi theo từng ngày ({ date, left }: tour) hoặc theo khoảng ({ from, to, left }: hạng phòng, cả tuần cùng số căn);
// trải khoảng ra từng ngày để thẻ đặt hiện như nhau. Khoảng dài chỉ trải tối đa 60 ngày cho nhẹ.
const SPREAD_MAX = 60;
export function days(availability = []) {
  const out = [];
  for (const entry of availability) {
    if (entry.date) out.push(entry);
    else if (entry.from && entry.to) {
      const start = new Date(`${entry.from}T00:00:00Z`);
      const end = new Date(`${entry.to}T00:00:00Z`);
      for (let d = start, n = 0; d <= end && n < SPREAD_MAX; d = new Date(d.getTime() + 86400000), n += 1) {
        out.push({ date: d.toISOString().slice(0, 10), left: entry.left });
      }
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// Ghép dữ liệu từ catalog (nếu section ghi item) với dữ liệu riêng của section; của section được ưu tiên.
// Mọi khối của trang chi tiết đọc chung kết quả này, nên cùng một tour ra cùng tên, ảnh, giá, ngày còn chỗ.
export function itemSection(site, section) {
  const item = catalogItem(site, section.item);
  if (!item) return section;
  const today = todayIso(site?.place?.timezone);
  const availability = days(item.availability)
    .filter((day) => day.date >= today)
    .slice(0, DAYS_SHOWN)
    .map((day) => ({ label: dayLabel(day.date), date: day.date, left: day.left }));
  const merged = {
    room: item.id,
    eyebrow: item.tagline,
    title: item.name,
    lead: item.text,
    images: itemImages(item),
    facts: item.facts,
    price: item.price,
    currency: site?.catalog?.currency,
    availability,
    includes: item.includes,
    excludes: item.excludes,
    bring: item.bring,
    // Cảnh nhìn ra (hạng phòng): khối scene đọc view.
    view: item.view,
  };
  return { ...merged, ...section };
}

export function money(amount, currency) {
  return `${amount.toLocaleString(pageLocale())} ${currency ?? ''}`.trim();
}

// Tạo một khối khác ngay bên trong khối đang dựng (room-detail ghép các khối, item-booking lồng lộ trình).
// Phải đăng ký xong rồi mới tạo thẻ và gán dữ liệu: gán trước khi đăng ký thì khối không bao giờ tự vẽ.
export function childEl(tag, Component, site, data) {
  if (!customElements.get(tag)) customElements.define(tag, Component);
  const el = document.createElement(tag);
  el.site = site;
  el.data = data;
  return el;
}

// Như childEl nhưng tải code của khối khi cần (khối ít dùng, như lộ trình, tờ hoá đơn): trả về ô giữ chỗ ngay,
// khối hiện vào ô khi tải xong. CSS của khối con tải kèm khối cha ở app.js.
export function lazyChildEl(className, tag, load, site, data) {
  const slot = document.createElement('div');
  slot.className = className;
  load().then((Component) => slot.replaceChildren(childEl(tag, Component, site, data)));
  return slot;
}
