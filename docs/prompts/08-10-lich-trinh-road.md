# 08–09/10 - Lịch trình kiểu road cho Bậc Trà (issue #13)

- Người dùng AI: Như Quỳnh
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: commit 94a1fe9, 0bc94a2 trên nhánh `feat/13-lich-trinh-road`

## Prompt (tóm tắt)

Bạn là kỹ sư frontend trong đội làm landing page white label. Làm issue #13: component `wl-journey` kiểu
`road` theo bản phác 2 của Bậc Trà:

1. dựng tiêu đề và danh sách trạm từ `content.json`: giờ, tên, độ cao, một câu mô tả, ảnh, nơi ngủ đêm đó;
2. con đường chữ S đi qua các chấm trạm, xe chạy dọc đường theo độ cuộn, trạm xe vừa tới được làm nổi bật;
3. màu trời đổi theo giờ của trạm, chặng đêm có sao và xe bật đèn; đồng hồ độ cao chạy số theo vị trí xe,
   kèm biểu đồ độ cao nhỏ;
4. mây phủ ảnh trạm, tan dần khi trạm vào khung nhìn; bật giảm chuyển động thì xe đứng yên, bỏ mây phủ;
5. thêm, bớt, đổi thứ tự trạm thì đường tự vẽ lại; đổi thương hiệu bằng nút của BTC không bị nhân đôi khối;
   đúng ở 390px và 1440px.

Sau khi xem bản đầu, yêu cầu chỉnh thêm:

6. khối chưa giống bản thiết kế, còn ít thông tin, CSS chưa đẹp bằng: đưa về đúng bản phác 2 (màu trời theo
   giờ, mặt đường nhựa sẫm, đèn xe, danh sách các ngày và ghi chú nguồn độ cao dưới đồng hồ);
7. nền phía sau các thẻ còn đơn giản: thêm một lớp nền gắn với cả tour; làm thử các kiểu nền trên bản phác
   trước, có nút để chọn, kiểu nào được duyệt mới đưa vào repo;
8. bỏ con số độ cao viền rỗng phía sau thẻ;
9. trên `brand-test` xe không tới được trạm cuối như Bậc Trà, tức chưa đảm bảo white label: tìm nguyên nhân
   và sửa cho mọi bộ dữ liệu.

Yêu cầu:

- làm và thử trên `brand-test` trước, giữ tên trường đang có; ghi trường riêng vào mục 12 của `AGENTS.md`;
- không ghi cứng chữ, màu; chữ lấy từ `content.json`, màu và font lấy từ biến CSS;
- chạy thử sau mỗi lần sửa: chặng đêm, giảm chuyển động, đổi thương hiệu qua lại, không cuộn ngang ở 390px
  và 1440px, không có lỗi JS;
- chưa commit khi chưa được duyệt.

## Phần tự quyết định

- Đưa ra ý tưởng con đường chữ S và chiếc xe chạy theo cuộn từ lúc brainstorm (bản phác 2).
- Tự đối chiếu khối với issue #13 và với bản phác, chỉ ra chỗ thiếu thông tin và chỗ CSS chưa đẹp.
- Xem các kiểu nền thử trong repo (đường đồng mức, hoa văn hình thoi, họa tiết lá chè, bông lúa, mây, nước,
  ảnh trạm làm nhoè), thấy đều không đẹp nên cho khôi phục lại ban đầu và chuyển sang thử trên bản phác.
- Chọn kiểu núi theo độ cao trong 4 kiểu nền thử trên bản phác (biển mây, núi theo độ cao, tên địa danh, theo
  ngày), hỏi lại cơ chế cho tới khi hiểu rồi mới cho đưa vào repo.
- Bỏ số độ cao viền rỗng sau thẻ.
- Tự thử trên `brand-test` và phát hiện xe không tới được trạm cuối. Nguyên nhân là khối nằm cuối trang nên
  trang hết chỗ cuộn trước khi trạm cuối lên tới giữa màn hình; lỗi được sửa ở commit 0bc94a2.
- Giữ bản phác 2 và các kiểu nền thử ở máy (`bac-tra-phac-thao-v2`), không đưa vào repo.
