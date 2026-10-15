/* catalog-card.js - thẻ một mục trong danh mục (tour, hạng phòng): ảnh, nhãn giờ chạy và thời lượng, tên, câu ngắn,
   chip phương tiện, giá, báo chuyến còn ít chỗ. Dùng chung cho <wl-catalog-list> (lưới tour) và <wl-tour-pick>
   (thẻ kết quả gợi ý), nên thẻ ở hai nơi luôn giống nhau. Giao diện nằm trong css/components/catalog-list.css. */
import { asset } from '../core.js';
import { textEl, groupEl } from '../dom.js';

// Thay {tên} trong mẫu chữ bằng giá trị. Mẫu thiếu thì trả về null để bỏ phần đó, không hiện chữ giữ chỗ.
export function fill(template, values) {
  if (!template) return null;
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
}

// Một tour đi qua nhiều chặng, nhiều chặng cùng một phương tiện: chỉ lấy mỗi phương tiện một lần, giữ thứ tự đi.
export function vehiclesOf(item) {
  return [...new Set((item.stages ?? []).map((stage) => stage.vehicle).filter(Boolean))];
}

// Mục thiếu id, tên hoặc giá thì bỏ, vì thẻ không có gì để khách so sánh.
export function isComplete(item) {
  return Boolean(item?.id && item.name && Number.isFinite(item.price));
}

// Ngày hôm nay theo múi giờ của nơi chốn (dạng 2026-10-20, giống availability), không theo giờ máy của khách.
function today(timezone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
}

// Chuyến gần nhất từ hôm nay còn chỗ. Ngày đã qua hay đã hết chỗ thì bỏ qua.
function nextDeparture(item, from) {
  return (item.availability ?? []).find((day) => day.date >= from && day.left > 0);
}

// Số giờ từ giờ đi tới giờ về, ví dụ 06:00 tới 12:30 là "6,5". Tính từ start, end để khỏi khai thêm trường.
function hours(start, end) {
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  const n = (h2 * 60 + m2 - h1 * 60 - m1) / 60;
  return n > 0 ? n.toLocaleString('vi-VN') : null;
}

function chipEl(catalog, id) {
  const vehicle = catalog.vehicles?.[id];
  const chip = textEl('span', 'catalog-list__chip', vehicle?.label);
  if (chip && vehicle.color) chip.style.setProperty('--vc', vehicle.color);
  return chip;
}

function mediaEl(item) {
  if (!item.image?.src) return null;
  const img = document.createElement('img');
  img.src = asset(item.image.src);
  img.alt = item.image.alt ?? '';
  img.loading = 'lazy';
  img.decoding = 'async';
  return groupEl('catalog-list__media', [img]);
}

function priceEl(item, catalog, labels) {
  const price = `${item.price.toLocaleString('vi-VN')} ${catalog.currency ?? ''}`.trim();
  const note = fill(labels.priceNote, {
    unit: item.unit,
    buoi: catalog.buoi?.[item.tags?.buoi]?.toLowerCase(),
  });
  const el = textEl('p', 'catalog-list__price', price);
  if (note) el.append(' ', textEl('small', '', note));
  return el;
}

// Chỉ báo khi chuyến gần nhất còn ít chỗ (mặc định từ 3 chỗ trở xuống), để nhãn này có ý nghĩa thúc khách đặt sớm.
function seatsEl(item, site, labels, fewSeats) {
  const trip = nextDeparture(item, today(site.place?.timezone));
  if (!trip || trip.left > (fewSeats ?? 3)) return null;
  const [, month, day] = trip.date.split('-');
  return textEl('p', 'catalog-list__few', fill(labels.seatsLeft, { date: `${day}/${month}`, n: trip.left }));
}

// Mục có trang chi tiết thì cả thẻ là liên kết; mục chưa có trang thì là thẻ thường, không dẫn vào trang trống.
// options: site (el.site của khối), labels (mẫu chữ duration, priceNote, seatsLeft), fewSeats,
// transition (true thì đặt view-transition-name để thẻ trượt về chỗ khi lọc).
export function cardEl(item, { site, labels = {}, fewSeats, transition = false }) {
  const catalog = site.catalog;
  const card = document.createElement(item.href ? 'a' : 'article');
  card.className = 'catalog-list__card';
  if (item.href) card.href = item.href;
  // Hai thẻ cùng tên trên một trang thì trình duyệt bỏ cả hiệu ứng chuyển trang, nên chỉ đặt khi khối cần.
  if (transition) card.style.viewTransitionName = `catalog-${item.id.replace(/[^a-z0-9-]/gi, '')}`;
  const span = item.start && item.end ? hours(item.start, item.end) : null;
  const duration = span ? fill(labels.duration, { n: span }) : null;
  const time = item.start && item.end ? [`${item.start} - ${item.end}`, duration].filter(Boolean).join(', ') : null;
  const chips = vehiclesOf(item).map((id) => chipEl(catalog, id));
  card.append(...[
    mediaEl(item),
    textEl('span', 'catalog-list__time', time),
    groupEl('catalog-list__body', [
      textEl('h3', 'catalog-list__name', item.name),
      textEl('p', 'catalog-list__tagline', item.tagline),
      groupEl('catalog-list__chips', chips),
      groupEl('catalog-list__foot', [priceEl(item, catalog, labels), seatsEl(item, site, labels, fewSeats)]),
    ]),
  ].filter(Boolean));
  return card;
}
