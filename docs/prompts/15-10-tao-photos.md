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
