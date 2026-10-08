# 08/10 - Đề xuất thương hiệu miền Bắc "Bậc Trà" (issue #3)

- Người dùng AI: Như Quỳnh
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: commit 782a1de, 4664d58, fd5fdb9, a7db6b7 (PR #20), [comment ở issue #3](https://github.com/pnquynh-hoop/clauki-travel-webds26/issues/3#issuecomment-6051395000)

## Prompt (tóm tắt)

Bạn là chuyên gia tư vấn thương hiệu và thiết kế landing page du lịch. Đội làm landing page white label chủ đề
"Du lịch & Dịch vụ lưu trú", mỗi người phụ trách một loại hình và một doanh nghiệp. Tôi muốn làm tour núi
miền Bắc, có thác nước xanh ngọc, thiên nhiên, văn hoá con người, ruộng bậc thang và hái trà trên mây. Hãy:

1. đề xuất hướng tour hợp với những đặc điểm trên;
2. đề xuất tên doanh nghiệp và lên kế hoạch: loại hình, tour, thời gian, phương tiện, lịch trình, thông tin
   cốt lõi, màu chủ đạo, dữ liệu hình ảnh;
3. lên sườn trang theo issue #3 và `AGENTS.md`: các section, thứ tự, khung `content.json`; chỉ rõ khối dùng
   chung và khối riêng của loại hình này;
4. dẫn dắt trang như một câu chuyện hành trình qua các section, để người xem không chỉ thấy một trang giới
   thiệu thương mại mà rời đi còn thêm yêu Việt Nam.

Yêu cầu:

- viết thành bản kế hoạch cụ thể, người khác đọc là hiểu, không cần giải thích lại;
- diễn đạt đơn giản, tự nhiên, chỉn chu, không viết tắt gây hiểu sai;
- viết cho người lạ đọc: bỏ các ý về tiêu chí cuộc thi; khách hàng chỉ ghi sở thích, không ghi tuổi;
- bản thiết kế chỉ cho landing page;

## Kết quả và phần tự làm

- Tự đưa định hướng tour và chọn các phương án AI đưa ra.
- Ý tưởng con đường chữ S cho lịch trình (kiểu `road`) lấy từ bản phác lúc brainstorm của mình.
- Muốn có khối lịch mùa (`seasons`), chọn giữ cả hai khối mới: lịch mùa và quy trình làm trà.
- AI gợi ý tuyến đi và tên doanh nghiệp, tra cứu số liệu trên mạng (quãng đường, mùa vụ, địa danh), soạn
  lịch trình, bảng màu và tính tương phản, sườn trang, khung `content.json`; viết
  `docs/ke-hoach-thuong-hieu-bac-tra.md` và bản tóm tắt để đăng ở issue #3.
- Tự đọc lại, yêu cầu sửa cách viết và tự đăng bản tóm tắt lên issue #3.
