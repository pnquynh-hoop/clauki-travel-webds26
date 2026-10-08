# 08/10 - Đề xuất thương hiệu miền Tây "Mé Rạch"

- Người dùng AI: Mị Nương
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: [comment ở issue #3](https://github.com/pnquynh-hoop/clauki-travel-webds26/issues/3#issuecomment-6052146644)

## Prompt (tóm tắt)

Bạn là chuyên gia tư vấn thương hiệu và thiết kế landing page du lịch. Đội đang làm landing page white label
chủ đề "Du lịch & Dịch vụ lưu trú" và đã có Bậc Trà (tour trải nghiệm vùng cao Tây Bắc) và Gành Sớm
(nghỉ dưỡng biển Quy Nhơn). Hãy đề xuất thương hiệu thứ ba ở miền Tây:

1. chọn loại hình khác rõ hai thương hiệu kia và giải thích vì sao;
2. lên ý tưởng đầy đủ: tên, sản phẩm, chiến dịch, giá, khẩu hiệu, nút kêu gọi hành động, bảng màu, cặp font,
   sườn trang (section, thứ tự, kiểu trình bày, section dùng riêng) và khung `content.json`.

Yêu cầu:

- tên giả, không trùng thương hiệu có thật; có tên dự phòng;
- mọi cặp màu đạt tương phản AA; màu chủ đạo khác hẳn hai thương hiệu kia;
- cặp font trên Google Fonts có bộ ký tự tiếng Việt, khác font của Bậc Trà và Gành Sớm;
- ít nhất 2 section mà hai thương hiệu kia không dùng, làm nhẹ để kịp hạn;
- `content.json` là JSON thuần, tên `type` khớp `brand-test`, có `place` cho lớp trời thật;
- thông tin liên hệ giả: số 0123 456 789, email đuôi `.example`; link trong `nav` khớp `id` trong `sections`;
- trình bày theo khung comment của Bậc Trà và Gành Sớm ở issue #3.

## Kết quả và phần tự kiểm tra

- AI đề xuất homestay nhà vườn ven rạch ở Cần Thơ, tên Mé Rạch, tên dự phòng Hiên Rạch.
- Chọn tên AI gợi ý, đã kiểm tra tên và concept không phải các thương hiệu có thật
- Một phiên Claude Code khác kiểm lại: tương phản 6 cặp màu khớp số đã ghi; chỉ ra header, hero, booking,
  footer đang trùng kiểu trình bày với hai thương hiệu kia, trái AGENTS.md mục 5; đề xuất tên thư mục `me-rach`
  và nhãn hiển thị cho cả ba thương hiệu.
- Đã đăng thành comment ở issue #3.
