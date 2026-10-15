# 15/10 - Ảnh thật theo nơi chốn cho website tạo mới

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #165

## Prompt (tóm tắt)

Hỏi phần ảnh khi tạo website mới ở `/tao` thì sao. Trình tạo dùng ảnh của khung nên lệch nơi chốn (tour Hà Giang ra ảnh Sài Gòn). Người dùng chọn hướng dùng API ảnh miễn phí lúc tạo site.

## Phần tự quyết định

- Nguồn chính là Wikimedia Commons vì gọi được từ trình duyệt, không cần khoá, giấy phép đọc được từ dữ liệu ảnh. Pexels là nguồn tuỳ chọn khi người dùng tự dán khoá (khoá không được nằm trong repo). Chưa dùng Unsplash vì điều khoản API yêu cầu thêm bước báo lượt tải.
- Commons tìm theo kiểu mọi từ cùng có mặt nên truy vấn dài hay trả rỗng: bỏ dần từ cuối cho tới hai từ.
- AI vừa loại ảnh lạc đề vừa viết mô tả tiếng Việt từ mô tả gốc; lỗi thì dùng mô tả gốc có tên nơi chốn.
- Không thay ảnh tách nền (scene, poster, ga của hero ride), thẻ hướng dẫn viên và ảnh đại diện; không đủ 3 ảnh thì giữ ảnh của khung.
- Truy vấn tìm ảnh bị lọt vào chú thích trang ở lần thử đầu: bỏ khỏi hồ sơ gửi cho AI viết chữ.
- `sites.sql` phải thêm máy chủ Wikimedia và Pexels vào danh sách cho phép, nếu không bản xuất bản bị từ chối; chưa nối Supabase nên chưa thử được bước xuất bản.

## Bổ sung: bộ màu và kiểu chữ

Người dùng hỏi trình tạo có chọn bộ màu và kiểu chữ không. Kiểm tra thì: bộ màu AI đề ra thường lệch một cặp tương phản (màu nhấn 2,8 trên nền, chữ trắng 3,2 trên nút) nên bị bỏ cả bộ và trang giữ màu của khung; kiểu chữ thì chưa có.

- Sửa màu thay vì bỏ: tối dần chữ, chữ phụ, màu nhấn cho đạt 4,5 trên cả nền trang và nền thẻ; chữ trên nút chọn trắng hay mực theo bên nào tương phản hơn, vẫn chưa đạt thì tối màu nút.
- Nền tối vẫn bị bỏ vì các khung thiết kế cho nền sáng; prompt yêu cầu nền sáng nên hiếm khi xảy ra.
- Kiểu chữ: AI chọn một khoá trong `FONTS` của editor (đều có đủ dấu tiếng Việt) theo giọng nơi chốn, hoặc để rỗng giữ chữ của khung.
