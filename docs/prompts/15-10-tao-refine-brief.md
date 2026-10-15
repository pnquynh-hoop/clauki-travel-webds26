# 15/10 - Nút Tinh chỉnh mô tả

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #168 (issue #167)

## Prompt (tóm tắt)

Người dùng nhập mô tả xong bấm icon tinh chỉnh để nhờ Gemini viết lại prompt chuẩn hơn trước khi gửi tạo web.

## Phần tự quyết định

- Đặt nút cạnh nút Nói, thay trực tiếp nội dung ô mô tả, giữ bản gốc để Hoàn tác; ý còn thiếu hiện dưới ô để người dùng tự bổ sung thay vì để AI bịa.
- Lần thử đầu AI viết lời quảng cáo ("hãy", "chào đón", "siêu hạt dẻ") và thêm ý không có (phong cách trẻ trung), làm lệch sự thật. Sửa prompt: bản mô tả là cho AI đọc, trung tính, chỉ ý đã có; có ví dụ mẫu một cặp gốc và kết quả; yêu cầu liệt kê ý cốt lõi còn thiếu ("giá rẻ" chưa phải giá cụ thể).
- Lần thử sau mất chi tiết "buổi chiều": thêm luật không bỏ chi tiết nào (buổi trong ngày, thời lượng, số người, món, phương tiện).
- Từ chối mô tả không liên quan du lịch theo cùng cách của bước lập hồ sơ.
