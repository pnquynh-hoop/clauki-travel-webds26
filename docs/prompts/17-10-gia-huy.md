# Prompt của Gia Huy, 17/10

Prompt chính Gia Huy gửi Claude Code cho từng PR trong bảng Gia Huy của [ai-log.md](../ai-log.md), viết lại thành câu hoàn chỉnh từ các tin nhắn trong phiên làm việc: giữ đúng ý, bỏ lỗi gõ và các câu phụ như “merge”, “ok”. Khoá thật không ghi. Việc AI đã làm và phần AI tự quyết định ghi ở cột “Việc nhờ AI làm” của ai-log.

## PR #208

Phiếu giữ chỗ đang ghi điểm đi, điểm đến cố định (xem ảnh chụp). Cho điểm đi, điểm đến đổi theo tour và điểm đón khách chọn.

## PR #207

Nút Tinh chỉnh ở /tao cho AI tự điền dữ liệu mẫu cho các mục còn thiếu: đặt sẵn danh sách thông tin cần có cho tour và cho lưu trú, mục nào người dùng chưa nói thì AI điền giá trị mẫu để người dùng sửa.

## PR #211

Website AI tạo vẫn còn chữ của khung mẫu dù đã kiểm. Kiểm tra hết mọi section và component; thay vì giữ danh sách chữ viết tay, xem mọi chữ trong JSON là dữ liệu bình thường để AI viết lại. Thêm giọng văn vào hồ sơ để prompt hướng phong cách theo vùng miền, ví dụ mô tả nói miền Tây thì viết giọng miền Tây.

## PR #212

Kiểm tra hạn mức Gemini, và ở mọi chỗ có gọi Gemini thì hiện model đã dùng khi trả kết quả.

## PR #219

Làm hai việc còn thiếu: máy demo (có khoá) sửa được trang đã xuất bản, và link xuất bản dùng tên miền con kèm mã QR. Khoá máy demo lưu trên trình duyệt của máy thuyết trình.

## PR #220

Kiểm tra màn xuất bản đã đưa ra link tên miền con và mã QR chưa. Bỏ dòng “Đã xuất bản. Trang đã cố định, chỉ máy demo sửa được.” và làm lại giao diện khối chứa mã QR.

## PR #222

Khi chia sẻ mã QR, thêm nút phóng to để người ngồi dưới quét được; bỏ chữ “máy demo”; đổi nút Thử chỉnh thành nút tròn sát góc và thay chữ W trên nút bằng icon bốn ô vuông. Gộp chung một PR.

## PR #223

Bản phóng to vẫn còn thấy hộp thoại phía sau. Bỏ phóng to, thay bằng làm hộp thoại mã QR to hơn.

## PR #228

Đề xuất cách tổ chức lại thư mục của codebase, rồi làm ngay cả ba mục: tách file lớn theo kiểu trình bày, gom JS và CSS của mỗi component vào một thư mục, sắp lại js/ và css/.

## PR #230

Làm phần gom component của đợt sắp xếp thư mục: mỗi component một thư mục components/<tên>/ chứa JS, CSS và ảnh riêng.

## PR #231

Xoá thương hiệu thử brand-test khỏi repo.

## PR #232

Giải thích vì sao các khoá không đặt trong biến môi trường, rồi đổi thứ tự đường gọi Gemini để khoá của mình (Firebase) được dùng sau cùng, giữ hạn mức cho buổi demo.

## PR #235

Tách wl-booking.js (1.455 dòng) và booking.css (2.133 dòng) theo từng kiểu trình bày, mỗi kiểu một file, rồi viết mô tả PR thật kỹ.

## PR #240

Website Azure Dome tạo ở /tao có khối “Không tìm thấy trang” ngay trên trang chủ, còn site Bắc Cực Xanh hiện các tấm lật chữ SIGHGONE (xem ảnh chụp). Tìm nguyên nhân và sửa.

## PR #241

Viết lại README cho vòng chung kết, đúng với hiện trạng dự án.

## PR #242

Chân trang site Nắng Bali vẫn còn khẩu hiệu “Every sigh, gone.” của SighGone (xem ảnh chụp). Sửa lỗi này.

## PR #246

Dò hết các lỗi tương tự (chữ và dữ liệu của khung mẫu lọt vào website AI tạo) bằng một agent chạy ngầm, rồi sửa các lỗi tìm được.

## PR #250

Soát toàn repo: code sạch, chú thích, tài liệu và tính nhất quán, rồi sửa các lỗi thuộc phần của mình trước giờ nộp.
