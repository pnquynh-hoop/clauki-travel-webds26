# 10/10 - Rà soát toàn bộ trang Gành Sớm

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: commit e118a27 (giao diện, code), 0491575 (nội dung, ảnh, logo)

## Prompt (tóm tắt)

Xem lại toàn bộ trang Gành Sớm: responsive, code sạch, độ rộng nội dung, dấu hiệu "AI slop" trong code lẫn giao diện,
các quy định của BTC. Tinh chỉnh cho trang mạch lạc, liền lạc hơn: bố cục, thứ tự các khối, các khoảng trống nền, câu chữ,
các lỗi UI/UX.

Cách làm: cho 3 agent soi song song, chỉ đọc, không sửa repo:

1. giao diện: chụp trang ở 360, 390, 768, 1024, 1366, 1440, 1920px, đo lề, khoảng trống giữa các khối, vùng bấm, chữ rơi dòng;
2. code: soi các component của Gành Sớm theo AGENTS.md (code thừa, hàm trùng, điểm ngắt, chữ ghi cứng, lỗi khi thiếu dữ liệu);
3. nội dung: soi `content.json` theo tài liệu thương hiệu và luật BTC (số liệu khớp nhau, lặp ý, văn phong, ảnh, giấy phép, logo).

Sau đó sửa theo thứ tự lỗi nặng trước:

- ảnh: ảnh hiên gỗ đang hiện ở 5 khối, ảnh hero lặp trong thư viện ảnh; tìm thêm 4 ảnh thật ở Quy Nhơn có giấy phép
  (Kỳ Co, Nhơn Lý, Bãi Đá Trứng, bãi biển Quy Nhơn), cắt bỏ dòng chữ ghi tên ảnh, ghi `credits`; bỏ ảnh hồ bơi (kế hoạch không có hồ bơi);
- logo và favicon: vẽ SVG theo mô tả ở kế hoạch (nửa mặt trời, mỏm gành, chữ Montserrat đổi thành nét, giấy phép OFL);
  header điện thoại chỉ hiện phần dấu hình;
- ưu đãi viết một cách: "ở 4 đêm, chỉ trả 3"; dòng ngày ưu đãi ghi đúng là ngày nhận phòng;
- thứ tự: hỏi đáp lên trước đặt phòng; ẩn khối giá đã gồm (chưa có component), phần đã gồm ghi ở dòng giá các hạng nhà;
- khoảng cách: `--space-section` của Gành Sớm co giãn trong `theme.css`, khối các hạng nhà có lại khoảng trên;
  bấm menu thì tiêu đề khối nằm ngay dưới header (`scroll-margin-top` âm);
- điện thoại: header không nhảy khi mở menu, nút cao đủ 44px, tạm tính đặt phòng không vỡ dòng, thẻ chọn hạng một cột,
  mốc trên mỏm đá có nhãn ngắn, giá trên tem không ngắt chữ "đêm";
- code: điểm ngắt về 760/1024, quy tắc bố cục của `headland` có tiền tố variant, hạng thiếu giá bị bỏ qua thay vì làm trắng trang,
  bỏ kính mờ và tấm nền nghiêng trang trí, nút "Bắt đầu lại" chỉ hiện sau câu hỏi đầu, đổi tên `sunrise` thành `nightsNote`;
- câu chữ: thương hiệu tự xưng "Gành Sớm" thay "Chúng tôi", câu trả lời hỏi đáp rõ hơn, tiêu đề thư viện ảnh khớp ảnh;
- AGENTS.md mục 12 và tài liệu thương hiệu cập nhật theo.

## Phần tự quyết định

- Yêu cầu rà soát toàn bộ trang Gành Sớm: responsive, code sạch, độ rộng, AI slop, quy định BTC, bố cục, thứ tự khối, khoảng trống, câu chữ, lỗi UI/UX.
