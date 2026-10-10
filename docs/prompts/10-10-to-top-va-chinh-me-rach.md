# 10/10 - Nút lên đầu trang, thẻ con số hero, hỏi đáp kiểu chat và vài chỉnh sửa dữ liệu Mé Rạch

- Người dùng AI: Mị Nương
- Công cụ: Claude Code (Claude Opus 5.5)
- Tệp: `js/components/wl-to-top.js`, `css/components/to-top.css` (mới); một dòng trong `index.html`,
  `FIXED_TAGS` của `js/core.js`, `js/app.js`, `css/components.css`; khối `.hero--stacked .hero__stats` trong
  `css/components/hero.css`; `brands/me-rach/content.json`, `brands/brand-test/content.json`; AGENTS.md mục 3 và 12

## Prompt (tóm tắt)

1. Thẻ con số dưới ảnh hero đang lệch, chỉnh lại cho cân, canh giữa.
2. Bỏ dải thông tin trên cùng của header Mé Rạch; bỏ khối intro.
3. Nút CTA nằm ở đâu, các chỗ dùng nó gọi thế nào (giải thích, không sửa mã).
4. Làm nút lên đầu trang; đặt bên phải, ngay phía trên nút tròn đổi thương hiệu của BTC.
5. Thương hiệu khác tự thêm nếu muốn: bỏ khoá `toTop` khỏi dữ liệu Bậc Trà, Gành Sớm.
6. Hỏi đáp của Mé Rạch dùng kiểu chat của Huy.

## Kết quả

- thẻ con số kiểu `stacked`: các cột chia đều, canh giữa, đệm hai bên như nhau, thẻ nằm giữa theo bề ngang;
- dữ liệu Mé Rạch: bỏ `header.note`, intro thêm `"hidden": true`, hỏi đáp thêm `"variant": "chat"` cùng chữ khung chat
  theo giọng cô Út và thẻ ảnh mời gọi;
- `<wl-to-top>`: khối cố định mới, nhận dữ liệu như header; nút tròn đặt thẳng tâm, cách 10px phía trên nút BTC (đo theo
  vị trí nút BTC trong `wd2026.js`), chỉ hiện khi đã cuộn quá một màn hình, vòng tiến độ quanh nút, bấm thì cuộn mượt
  lên đầu; chỉ có khi `content.json` có `toTop.label` (Mé Rạch, brand-test).
- Commit `7f0d783` chứa cả AGENTS.md lẫn dữ liệu của Mé Rạch, brand-test (gộp lúc commit).

## Phần tự làm và tự kiểm tra

- Chọn vị trí nút lên đầu trang sau khi được nhắc luật góc dưới phải; quyết định để thương hiệu khác tự bật nút.
- Chạy thử bằng thao tác thật ở 1440px và 390px: nút hiện, ẩn đúng, không chồng nút BTC, bấm về đầu trang;
  khung chat trả lời đúng câu; không lỗi console. Báo đội về thay đổi `index.html`, `core.js`.
