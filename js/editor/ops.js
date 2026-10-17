/* ops.js - thao tác sửa dữ liệu thuần trên content và theme, dùng chung cho sửa tay (editor.js) và sửa bằng lời
   (ai.js): cùng một hàm nên hai cách sửa ra cùng kết quả. Các hàm sửa thẳng object được truyền vào;
   editor gọi chúng bên trong commit() để có hoàn tác. */
import { FONTS, PAGE_RESERVED } from './manifest.js';
import { slugify } from '../core/dom.js';

export const MAX_NEW_PAGES = 8;

export const norm = (path) => String(path ?? '').replace(/^\/+|\/+$/g, '') || '/';

// Không tự lùi về trang chủ khi không thấy trang: sửa nhầm trang chủ còn tệ hơn không sửa được gì.
export function pageAt(content, path) {
  if (!content.pages) return norm(path) === '/' ? { path: '/', sections: (content.sections ??= []) } : null;
  return content.pages.find((p) => norm(p.path) === norm(path)) ?? null;
}

// Kiểu header ghi ở trang nếu trang đã khai header riêng (landing page), không thì ở header chung của brand.
export function headerTarget(content, path) {
  const page = pageAt(content, path);
  return page?.header?.variant ? page.header : (content.header ??= {});
}

// Kiểm tên trang mới: trả về { slug } hoặc { error } để hiện cho người dùng.
export function checkNewPage(content, title) {
  const slug = slugify(title);
  const pages = content.pages ?? [{ path: '/' }];
  if (!slug) return { error: 'Nhập tên trang.' };
  if (PAGE_RESERVED.includes(slug) || pages.some((p) => norm(p.path) === slug)) return { error: `Đường dẫn /${slug} đã có hoặc là tên dành riêng.` };
  if (pages.filter((p) => p.added).length >= MAX_NEW_PAGES) return { error: `Editor cho thêm tối đa ${MAX_NEW_PAGES} trang.` };
  return { slug };
}

// Thương hiệu một trang (chỉ có sections) chuyển sang dạng pages trước: sections cũ thành trang chủ.
// cloneFrom (tuỳ chọn): đường dẫn một trang có sẵn; có thì trang mới bắt đầu bằng bản sao các khối của trang đó, không thì chỉ có một khối tiêu đề.
export function addPage(content, slug, title, onMenu, cloneFrom) {
  if (!content.pages) {
    content.pages = [{ path: '/', sections: content.sections ?? [] }];
    delete content.sections;
  }
  const source = cloneFrom ? pageAt(content, cloneFrom) : null;
  const sections = source?.sections?.length
    ? JSON.parse(JSON.stringify(source.sections))
    : [{ type: 'intro', id: 'gioi-thieu', eyebrow: content.brand?.name ?? '', title }];
  content.pages.push({ path: slug, title, added: true, sections });
  if (onMenu) (content.nav ??= []).push({ label: title, href: `page:${slug}` });
}

// Chèn khối mới (dựng sẵn bằng makeBlock của blocks-add.js) vào vị trí at, id không trùng khối nào trên trang.
export function insertBlock(sections, block, at) {
  const taken = new Set(sections.map((s) => s.id));
  let n = 1;
  while (taken.has(`${block.type}-${n}`)) n += 1;
  block.id = `${block.type}-${n}`;
  sections.splice(at, 0, block);
}

// Cặp font rỗng (giữ font gốc) thì gỡ hết biến font khỏi theme.
export function applyFont(theme, key) {
  const pair = FONTS.find((f) => f.key === key);
  if (!pair?.url) {
    delete theme.vars['--font-heading'];
    delete theme.vars['--font-body'];
    delete theme.fontUrl;
    delete theme.font;
    return;
  }
  theme.vars['--font-heading'] = pair.heading;
  theme.vars['--font-body'] = pair.body;
  theme.fontUrl = pair.url;
  theme.font = pair.key;
}
