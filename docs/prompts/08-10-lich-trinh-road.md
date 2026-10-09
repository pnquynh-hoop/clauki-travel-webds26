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

Yêu cầu: làm và thử trên `brand-test` trước, giữ tên trường đang có; ghi trường riêng vào mục 12 của
`AGENTS.md`; không ghi cứng chữ, màu; chưa commit.

Các lần yêu cầu chỉnh sau đó:

- "Giao diện không giống bản thiết kế, ít thông tin, CSS không đẹp bằng": đưa khối về đúng bản phác 2 (màu
  trời thật theo giờ, mặt đường nhựa sẫm, đèn xe, danh sách các ngày và ghi chú nguồn độ cao dưới đồng hồ).
- "Nền phía sau các thẻ còn đơn giản, thêm gì liên quan tới cả tour": AI thử lần lượt đường đồng mức, hoa
  văn hình thoi, họa tiết lá chè, bông lúa, mây, nước, rồi ảnh trạm làm nhoè; mình thấy đều không đẹp và yêu
  cầu khôi phục lại ban đầu.
- "Sửa background trên bản thiết kế để tôi coi trước, khi nào thấy ổn thì áp lên repo": AI làm 4 kiểu nền
  chọn bằng nút trên bản phác (biển mây, núi theo độ cao, tên địa danh, theo ngày).
- Chọn "núi theo độ cao", hỏi lại cơ chế cho tới khi hiểu, rồi cho đưa vào repo.
- "Bỏ con số độ cao phía sau tấm ảnh".
- "Test trên brand-test thì xe không đi tới được trạm cuối như Bậc Trà, vậy là chưa đảm bảo white label":
  AI dựng lại lỗi (cả Bậc Trà cũng thiếu một đoạn), tìm ra nguyên nhân là khối nằm cuối trang nên trang hết
  chỗ cuộn trước khi trạm cuối lên giữa màn hình; sửa bằng cách kéo dần mốc của xe xuống ở nửa màn hình cuộn
  cuối cùng (commit 0bc94a2).

## Kết quả và phần tự làm

- Ý tưởng con đường chữ S và chiếc xe chạy theo cuộn là của mình từ lúc brainstorm (bản phác 2).
- Tự đối chiếu khối với issue #13 và với bản phác, chỉ ra chỗ thiếu thông tin và chỗ CSS chưa đẹp.
- Tự thử trên `brand-test` và phát hiện xe không tới được trạm cuối.
- Tự xem từng bản trên trình duyệt và quyết định giữ hay bỏ: bỏ các kiểu nền thử trong repo, chuyển sang thử
  trên bản phác trước; chọn kiểu núi theo độ cao trong 4 kiểu; bỏ số độ cao viền rỗng sau thẻ.
- AI viết `js/components/wl-journey.js`, `css/components/journey.css`, đăng ký trong `js/app.js` và
  `css/components.css`, sửa dữ liệu journey của `brand-test` (kiểu `road`, `altitude`, `night`,
  `days`, `note`), ghi dòng `journey` vào mục 12 của `AGENTS.md`.
- AI chạy thử bằng Chrome headless sau mỗi lần sửa: chặng đêm, giảm chuyển động, đổi thương hiệu qua lại,
  không cuộn ngang ở 390px và 1440px, không có lỗi JS.
- Bản phác 2 và 4 kiểu nền thử lưu ở máy (`bac-tra-phac-thao-v2`), không nằm trong repo.
