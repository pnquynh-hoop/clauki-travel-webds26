# 14/10 - Sửa website bằng lời, trình tạo web /tao, xuất bản (issue #81)

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #121

## Prompt (tóm tắt)

Làm #81 theo thiết kế đã thử hôm 12/10 (Gemini qua Firebase AI Logic, gói Spark; Supabase làm kho dữ liệu):

1. tab AI trong editor: gõ hoặc nói yêu cầu ("đổi màu xanh rêu", "đưa hỏi đáp lên trên", "thêm trang cẩm nang");
   AI trả về thao tác nhỏ, mỗi thao tác qua cùng bộ kiểm tra với sửa tay, hiện trước và sau, bấm Đồng ý mới áp;
   yêu cầu ngoài chủ đề du lịch thì từ chối;
2. cấu hình: project công khai để trong mã, project của máy demo dán vào trình duyệt, không commit;
   hết lượt, quá tải, mất mạng thì báo rõ, không treo;
3. trình tạo web `/tao`: mô tả bằng lời ra website mới trên khung của một brand có sẵn, trang hiện dần khi AI viết,
   dòng đầu dưới 5 giây, xong dưới 25 giây; giá do code điền từ hồ sơ; bộ màu phải đạt AA;
4. nút xuất bản: ghi lên Supabase, có trang `/<tên>/`; tên dành riêng và tên trùng bị chặn.

## Phần tự quyết định

- Đưa cấu hình web của project `clauki-public` để chạy thật.
- Gọi thử thật, phát hiện tab AI báo "hết lượt" sai (thật ra là máy chủ quá tải).
- Chọn làm trình tạo web và nút xuất bản ngay sau tab AI.
- Khoá Supabase chưa điền: nút xuất bản tạm khoá.
