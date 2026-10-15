# 15/10 - Editor dễ dùng hơn

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #148

## Prompt (tóm tắt)

Editor "Thử chỉnh" hơi khó dùng. Hỏi lại thì người dùng chọn hai chỗ: danh sách khối và form dài khó tìm; điện thoại chật.

## Phần tự quyết định

- Danh sách khối: mỗi khối một dòng gọn, chỉ khối đang chọn mở rộng và form nội dung nằm ngay dưới dòng đó (trước đây form nằm trên cùng, đẩy danh sách xuống và phải cuộn mới tìm được khối khác).
- Thanh công cụ nổi trên trang bỏ các nút Lên, Xuống, Ẩn, Nhân đôi, Xoá (đã có ở bảng bên phải), vì nó che tiêu đề của khối.
- Điện thoại: thanh trên gọn một hàng; tên thương hiệu và trạng thái chỉ hiện khi có bản nháp.
- Không dùng scrollIntoView để cuộn bảng vì nó cuộn cả trang editor khi tấm trượt cố định; tự tính vị trí cuộn.
