/* rooms.js - danh sách hạng phòng dùng chung cho stays, booking kiểu stay và offer (#98).
   Hạng phòng là sản phẩm nên khai một lần trong catalog.items (như tour), section chỉ ghi "items": true (mọi mục của danh mục) hoặc
   mảng id. Khi đó "rooms" của section (nếu có) chỉ ghi phần riêng của khối, ghép đè lên hạng cùng id, ví dụ toạ độ mốc x, y, short
   của kiểu headland. Section không ghi items thì dùng nguyên "rooms" như trước: danh sách chỉ để trưng, không bán (nhà đón khách của
   Bậc Trà), hay thương hiệu không có catalog. */

// Một mục danh mục thành hạng phòng theo tên trường các khối đang đọc (label thay cho name).
function toRoom(item) {
  return {
    id: item.id, label: item.name, text: item.text, price: item.price, maxGuests: item.maxGuests, area: item.area,
    count: item.count, image: item.image, view: item.view, href: item.href,
  };
}

export function roomsOf(section, site) {
  const own = Array.isArray(section.rooms) ? section.rooms : [];
  if (!section.items) return own;
  const pick = Array.isArray(section.items) ? section.items : null;
  const items = (site?.catalog?.items ?? []).filter((item) => item.id && item.name && (!pick || pick.includes(item.id)));
  if (pick) items.sort((a, b) => pick.indexOf(a.id) - pick.indexOf(b.id));
  const extra = new Map(own.filter((r) => r.id).map((r) => [r.id, r]));
  return items.map((item) => ({ ...toRoom(item), ...(extra.get(item.id) ?? {}) }));
}
