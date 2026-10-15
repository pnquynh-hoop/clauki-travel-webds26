# 15/10 - Hero kiểu ride và trang Tuyến số 1 của SighGone

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #128 (component), PR #130 (dữ liệu và ảnh SighGone)

## Prompt (tóm tắt)

Làm landing page cho chiến dịch "Tuyến số 1" của SighGone (tour mới, chuyến đầu 01/11/2026, giá mở bán 690.000 đồng):
cuộn dọc thì đi qua từng ga trên một tuyến, mỗi ga một công trình tách nền kèm biển ga, trời đổi từ chiều sang đêm.
Người dùng đã xem nhiều bản mẫu và chọn ý tưởng "đi tàu theo cuộn", yêu cầu: màn mở đầu gọn (không tàu, không nhà phố,
chỉ poster, chữ, giá, nút), giữ phong cách bảng hiệu (vàng taxi, xanh biển số, viền mực, bóng đổ cứng), font Phudu cho tiêu đề.

Ràng buộc: kiểu trình bày chạy bằng dữ liệu của `content.json`, màu và font qua biến CSS, đổi thương hiệu thì dựng lại không
nhân đôi; giảm chuyển động thì tắt hiệu ứng; đúng ở 390px và 1440px.

## Phần tự quyết định

- Tuyến sắp lại theo thực tế (chợ Bến Thành trước Dinh Độc Lập, hoàng hôn Bitexco lúc 17:30) thay vì 18:00.
- Tách thành hai PR: component `hero-ride`, rồi dữ liệu và ảnh của SighGone.
