# ClauKi - Web Design 2026

Landing page white label cho chủ đề **Du lịch & Dịch vụ lưu trú**. Ba thương hiệu giả tưởng dùng chung
một mã nguồn; đổi thương hiệu chỉ là đổi dữ liệu, không sửa dòng mã nào.

HTML, CSS, JavaScript thuần: không framework, không bước build, không backend.

## Chạy

Mở bằng **Live Server** của VS Code, hoặc:

```bash
python3 -m http.server 5500
```

Nếu mở bằng cách nhấp đúp vào file, trình duyệt sẽ chặn việc đọc JSON.

Đổi thương hiệu bằng nút tròn ở góc dưới phải (của BTC, trong `wd2026.js`), hoặc bằng tham số trên
địa chỉ: `index.html?brand=ganh-som`.

## Cấu trúc

```
index.html              vỏ trang: không chứa chữ của thương hiệu nào
wd2026.js               thư viện đổi dữ liệu của BTC, giữ nguyên
css/
  base.css              reset, kiểu chữ, bố cục, responsive; chỉ dùng biến CSS
  components.css        @import style của từng component
  components/           mỗi component một file
js/
  core.js               chọn thương hiệu, gọi wd2026.js, đổi theme.css và meta, dựng các section
  app.js                đăng ký các component <wl-*>
  dom.js                hàm nhỏ dựng thẻ HTML dùng chung cho các component
  components/           mỗi component một file: wl-<tên>.js
brands/
  brands.json           danh sách thương hiệu (id, tên hiện trong nút đổi dữ liệu) và thương hiệu mặc định
  <id>/content.json     nội dung, ảnh, bố cục (thứ tự, ẩn hiện, kiểu trình bày section)
  <id>/theme.css        màu, font, bo góc của thương hiệu (chỉ biến CSS)
  <id>/images/          ảnh của thương hiệu
docs/ai-log.md          nhật ký dùng AI
docs/prompts/           prompt đầy đủ của các lần dùng AI, link từ ai-log.md
```

## Quy ước

- Component không ghi cứng chữ, màu hay đường dẫn ảnh: mọi thứ lấy từ `content.json` và biến CSS.
- Thứ tự section nằm trong mảng `sections` của `content.json`; `index.html` không liệt kê section.
- Commit theo Conventional Commits. Phần có dùng AI thì ghi rõ trong scope, ví dụ:
  `feat(AI/hero): thêm kiểu trình bày split`, và ghi thêm vào `docs/ai-log.md`.

## Nguồn ảnh và thư viện

Tác giả và giấy phép của từng ảnh nằm trong `credits` của mỗi `content.json`, hiện ở chân trang.

`wd2026.js` do BTC cấp (lấy từ repo mẫu `konya007/demo-wd-26`), giữ nguyên, không sửa.
