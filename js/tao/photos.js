/* photos.js - tìm ảnh thật theo nơi chốn cho website tạo mới (#81), để ảnh khớp với chữ AI viết thay vì dùng ảnh của khung.
   Hai nguồn, đều gọi từ trình duyệt:
   - Wikimedia Commons (không cần khoá): chỉ nhận ảnh CC BY, CC BY-SA, CC0, phạm vi công cộng, đúng luật thi; tên tác giả, giấy phép
     và trang nguồn lấy từ chính dữ liệu của ảnh để ghi vào credits;
   - Pexels (tuỳ chọn, khi máy có khoá do người dùng tự dán, chỉ nằm trên trình duyệt, không nằm trong repo): giấy phép Pexels.
   Trả về danh sách { src, alt, credit } đã lọc ảnh ngang, đủ lớn, bỏ bản đồ, logo, sơ đồ. */

const COMMONS = 'https://commons.wikimedia.org/w/api.php';
const PEXELS = 'https://api.pexels.com/v1/search';
// Giấy phép luật thi cho phép (AGENTS.md mục 8); ND, NC không có trong danh sách nên bị loại.
const OK_LICENSE = /^(CC[ -]BY(?:[ -]SA)?[ -]\d\.\d|CC0|Public domain|PD)/i;
const BAD_TITLE = /(logo|map|flag|diagram|coat of arms|emblem|stamp|poster|screenshot|chart|montage|collage|aerial view of a map|\.svg|\.gif|\.pdf|\.tif)/i;
const MIN_WIDTH = 1400;

const plain = (html) => (html ? new DOMParser().parseFromString(String(html), 'text/html').body.textContent.replace(/\s+/g, ' ').trim() : '');

async function searchCommons(query, limit = 20) {
  const url = new URL(COMMONS);
  const params = {
    action: 'query', format: 'json', origin: '*', generator: 'search', gsrsearch: `${query} filetype:bitmap`, gsrnamespace: 6, gsrlimit: limit,
    prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: 1600, iiextmetadatafilter: 'LicenseShortName|Artist|ImageDescription|ObjectName',
  };
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url);
  if (!res.ok) return [];
  const pages = Object.values((await res.json()).query?.pages ?? {}).sort((a, b) => a.index - b.index);
  const found = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    const meta = info?.extmetadata ?? {};
    const license = plain(meta.LicenseShortName?.value);
    if (!info?.thumburl || !/^image\/(jpeg|png)$/.test(info.mime) || info.width < MIN_WIDTH) continue;
    const ratio = info.width / info.height;
    if (ratio < 1.25 || ratio > 2.3 || BAD_TITLE.test(page.title) || !OK_LICENSE.test(license)) continue;
    const description = plain(meta.ImageDescription?.value) || plain(meta.ObjectName?.value) || page.title.replace(/^File:|\.\w+$/g, '');
    found.push({
      src: info.thumburl.split('?')[0],
      alt: description.slice(0, 160),
      credit: { file: info.thumburl.split('?')[0], author: plain(meta.Artist?.value) || 'Wikimedia Commons', license, source: info.descriptionurl, note: 'Wikimedia Commons, đã thu nhỏ' },
    });
  }
  return found;
}

// Tìm kiếm của Commons yêu cầu mọi từ cùng có mặt, nên truy vấn dài ("Ha Giang buckwheat fields") hay không ra gì. Không đủ ảnh thì bỏ dần
// từ cuối (giữ tên địa danh ở đầu) cho tới còn hai từ.
async function searchCommonsLoose(query) {
  const words = query.trim().split(/\s+/);
  let best = [];
  for (let n = words.length; n >= Math.min(2, words.length); n -= 1) {
    const found = await searchCommons(words.slice(0, n).join(' '));
    if (found.length >= 3) return found;
    if (found.length > best.length) best = found;
  }
  return best;
}

async function searchPexels(query, key, limit = 12) {
  const url = `${PEXELS}?query=${encodeURIComponent(query)}&orientation=landscape&per_page=${limit}`;
  const res = await fetch(url, { headers: { Authorization: key } });
  if (!res.ok) return [];
  return ((await res.json()).photos ?? []).filter((p) => p.width >= MIN_WIDTH).map((p) => ({
    src: p.src.large2x,
    alt: (p.alt || '').slice(0, 160),
    credit: { file: p.src.large2x, author: p.photographer, license: 'Pexels', source: p.url, note: 'Pexels' },
  }));
}

// Mỗi truy vấn lấy tối đa `each` ảnh đầu tiên đạt chuẩn rồi xen kẽ giữa các truy vấn, để bộ ảnh đa dạng và ảnh đầu (dùng cho ảnh bìa)
// là ảnh tốt nhất của truy vấn đầu. Lỗi mạng ở một truy vấn thì bỏ truy vấn đó, không làm hỏng cả lượt.
export async function findPhotos(queries, { pexelsKey = '', want = 14, each = 4 } = {}) {
  const lists = await Promise.all(queries.map((q) => (pexelsKey ? searchPexels(q, pexelsKey) : searchCommonsLoose(q)).catch(() => [])));
  const seen = new Set();
  const out = [];
  for (let round = 0; round < each && out.length < want; round += 1) {
    for (const list of lists) {
      const pick = list.find((p) => !seen.has(p.src));
      if (pick && out.length < want) {
        seen.add(pick.src);
        out.push(pick);
      }
    }
  }
  return out;
}

export const PEXELS_KEY = 'clauki-pexels';
export const readPexelsKey = () => {
  try {
    return localStorage.getItem(PEXELS_KEY) ?? '';
  } catch {
    return '';
  }
};
export const savePexelsKey = (key) => {
  try {
    if (key) localStorage.setItem(PEXELS_KEY, key);
    else localStorage.removeItem(PEXELS_KEY);
  } catch {
    // Bộ nhớ bị chặn: khoá chỉ dùng được trong lần này.
  }
};
