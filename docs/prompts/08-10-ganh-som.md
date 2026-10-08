# 08/10 - Đề xuất thương hiệu miền Trung "Gành Sớm"

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: [comment ở issue #3](https://github.com/pnquynh-hoop/clauki-travel-webds26/issues/3#issuecomment-6051703384)

## Prompt (tóm tắt)

Bạn là chuyên gia tư vấn thương hiệu và thiết kế landing page du lịch. Đội đang làm landing page white label
chủ đề "Du lịch & Dịch vụ lưu trú" và đã có thương hiệu Bậc Trà (tour trải nghiệm vùng cao Tây Bắc). Hãy:

1. chọn loại hình cho thương hiệu thứ hai ở miền Trung, khác rõ Bậc Trà, bổ sung cho vế "lưu trú" của đề,
   và giải thích vì sao;
2. lên ý tưởng đầy đủ: tên, sản phẩm, chiến dịch, giá, khẩu hiệu, nút kêu gọi hành động, bảng màu, cặp font,
   sườn trang (section, thứ tự, kiểu trình bày, section dùng riêng) và khung `content.json`.

Yêu cầu:

- tên giả, không trùng thương hiệu có thật;
- chỉ dùng địa danh, không dùng tên tỉnh đã sáp nhập năm 2025;
- mọi cặp màu đạt tương phản AA;
- cặp font trên Google Fonts có bộ ký tự tiếng Việt, khác font của Bậc Trà;
- ít nhất 2 section mà Bậc Trà không dùng, nhưng chỉ 1 component mới; section dùng chung, header và footer
  chọn kiểu trình bày khác Bậc Trà;
- `content.json` là JSON thuần, tên `type` khớp với `brand-test`, có `place` (vĩ độ, kinh độ, múi giờ)
  cho lớp trời thật;
- thông tin liên hệ là dữ liệu giả: số 0123 456 789, email đuôi `.example`;
- mọi link trong `nav` khớp `id` trong `sections`;
- trình bày theo khung comment Bậc Trà ở issue #3, có thêm mục "Cần đội xác nhận" cho những chỗ đụng tới
  thương hiệu khác.

## Kết quả và phần đội tự kiểm tra

- AI đề xuất nghỉ dưỡng biển Quy Nhơn, tên Gành Sớm.
- Đội hỏi lại nghĩa tên, cân nhắc các tên thay thế (Hiên Sớm, Gành Nắng, Mỏm Đông) rồi giữ Gành Sớm.
- Đội đã kiểm tra lại: tính lại tương phản từng cặp màu, tra web tên thương hiệu, đối chiếu địa danh sau
  đợt sáp nhập tỉnh.
- Các điểm đã báo cho đội: Bậc Trà bỏ `stays` và ghi chỗ ngủ trong lịch trình; khối đặt chỗ cần hai chế độ.
- Đã đăng thành comment ở issue #3.
