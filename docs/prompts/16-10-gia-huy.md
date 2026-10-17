# Prompt của Gia Huy, 16/10

Prompt chính Gia Huy gửi Claude Code cho từng PR trong bảng Gia Huy của [ai-log.md](../ai-log.md), viết lại thành câu hoàn chỉnh từ các tin nhắn trong phiên làm việc: giữ đúng ý, bỏ lỗi gõ và các câu phụ như “merge”, “ok”. Khoá thật không ghi. Việc AI đã làm và phần AI tự quyết định ghi ở cột “Việc nhờ AI làm” của ai-log.

## PR #182

Xử lý issue “Chưa nối kho dữ liệu (Supabase), tạm thời chỉ xem nháp trên máy này”: nối nút Xuất bản của /tao với Supabase bằng khoá publishable mình gửi, và giải thích vì sao cần chạy file SQL.

## PR #183

Site khách đã xuất bản vẫn mở được editor khi vào bằng trình duyệt khác (Brave), và bấm Tạo bản sao thì lấy đúng nội dung nhưng lại dùng bộ màu của SighGone. Sửa để site đã xuất bản chỉ đọc và bản sao giữ đúng màu.

## PR #186

Làm lại giao diện /tao để người dùng thấy trực quan AI đang dựng website tới bước nào.

## PR #187

Pexels đã ngừng cấp API, thay nguồn ảnh tuỳ chọn bằng Unsplash.

## PR #192

Thêm hai khoá Gemini của Như Quỳnh và Mị Nương làm khoá dự phòng khi khoá chính hết lượt, tạo issue nhắc xoá các khoá này sau khi thi, rồi mở PR.

## PR #193

Xử lý issue #189: ở trang tạo website bằng AI phải chỉnh tay được ngay, không cần xuất bản rồi mới mở editor; editor của bản sao cũng cần có nút Xuất bản.

## PR #195

Xử lý issue #188: website AI tạo cần có bản tiếng Anh. Xem website là tạo xong khi đủ bản tiếng Việt, còn bước dịch tiếng Anh chạy tiếp ở nền.

## PR #196

Sau khi tạo xong, nút Tạo website đổi thành Tạo lại và phải xác nhận trước khi chạy lại; trong lúc đang tạo thì khoá các nút và ô nhập.

## PR #197

Xem issue #98: website nghỉ dưỡng do AI tạo chỉ có vài khối và một tới ba trang. Tìm nguyên nhân và sửa để có đủ trang.

## PR #198

Cho hạng phòng và trang chi tiết đọc từ catalog.items: khối stays và booking kiểu stay tự lấy hạng phòng từ danh mục khi section không ghi rooms. Cập nhật issue trước rồi làm.

## PR #199

Làm phần dữ liệu của issue #98: thêm danh mục hạng nhà và trang chi tiết cho Gành Sớm, theo cách các thương hiệu lưu trú khác cũng dùng được.

## PR #200

Xem issue #172: website AI tạo còn nhiều khối giữ dữ liệu cũ của khung. Đối chiếu từng dòng với khung SighGone, rồi kiểm tra luôn các khung Bậc Trà, Gành Sớm, Mé Rạch.

## PR #202

Tạo issue và làm: lưu lịch sử chat với AI khi sửa trong editor, gửi kèm vài lượt gần nhất khi nhờ tiếp để AI hiểu những câu như “đổi lại như lúc nãy”.

## PR #203

Cho khách tự đổi logo trong editor (tải logo từ máy hoặc tạo logo chữ); giải thích logo được lưu ở đâu và vì sao không cần thêm kho ảnh trên Supabase.

## PR #204

Khi mở một site khách không có (gõ nhầm hay đã gỡ), hiện một trang trung tính của ClauKi thay cho dòng chữ trơn.

## PR #205

Đổi thương hiệu mặc định của trang gốc từ Bậc Trà sang SighGone, thương hiệu chính của đội.
