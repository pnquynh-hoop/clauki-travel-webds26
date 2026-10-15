# 15/10 - Breadcrumb cho mọi thương hiệu

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #154

## Prompt (tóm tắt)

Hỏi breadcrumb đã có trên toàn web chưa. Kiểm tra thì mới có ở SighGone.

## Phần tự quyết định

- Chỉ là dữ liệu: thêm khối `breadcrumb` ở đầu các trang con, không sửa component.
- Không đặt ở landing (Bậc Trà `tour-moi`, brand-test `dem-cuc-quang`) và trang 404, giống SighGone `tuyen-so-1`.
- Tour mùa của Bậc Trà có thêm bước "Các tour" trỏ tới `page:/#cac-tour` (danh sách ở trang chủ), vì Bậc Trà không có trang danh sách tour riêng.
- Mé Rạch chỉ có trang chủ nên không có gì để thêm.
