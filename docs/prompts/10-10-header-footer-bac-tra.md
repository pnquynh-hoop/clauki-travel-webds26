# 10/10 - Header và footer Bậc Trà (issue #7)

- Người dùng AI: Như Quỳnh
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: commit ae91b75, 6660e3a, df6ecac, 83f08a8, 68d05bb, 83813b1, 65795a6 trên nhánh `feat/7-header-footer-bac-tra`

## Prompt (tóm tắt)

Bạn là kỹ sư frontend kiêm người thiết kế giao diện trong đội làm landing page white label. Hãy làm header kiểu
`overlay` và footer kiểu `columns` cho Bậc Trà:

1. đối chiếu header, footer, hỏi đáp, lời mở hiện có với tài liệu kế hoạch và bản phác, chỉ ra phần nào chưa đúng;
2. làm trên nhánh mới cho issue #7;
3. làm dưới dạng `variant` của `wl-header` và `wl-footer`, không đụng các kiểu đã có (`solid`, `center`, `card`,
   `directions`);
4. header: trong suốt, nằm đè lên ảnh hero, cuộn xuống thì có nền;
5. footer: không làm như thường mà phải đặc biệt, có hàng chữ chạy lặp; nút giữ chỗ phải ấn tượng nhưng tinh tế,
   giữ màu xanh như các nút khác; nền màu matcha; thử trên bản phác trước, duyệt xong mới đưa vào code chính thức;
6. gộp khối "Hẹn bạn trên mây" vào footer: giữ ảnh và lời hẹn, đưa thông tin footer lên trên ảnh cho mềm mại;
   bản chính thức phải giống bản phác;
7. nguồn ảnh hiện dưới dạng dòng "Nguồn ảnh" gập sẵn như các thương hiệu khác;
8. có chú thích đánh dấu từng phần; chú thích ngắn, diễn đạt đơn giản; không ghi tên người trong code;
9. chuyển tiếp giữa các section đang thô cứng, làm cho mạch cảm xúc liên tục: dùng mây như bản phác hoặc tự đề xuất
   cách khác; mây phải đủ dày để che đường nối; bỏ khối intro khỏi Bậc Trà;
10. đọc quy tắc trong `AGENTS.md` và điều chỉnh cho đúng; chạy kiểm thử.

Yêu cầu (theo `AGENTS.md`):

- chữ và ảnh lấy từ `content.json`, màu và font chỉ lấy từ biến CSS; thương hiệu khác dùng hai kiểu này vẫn đúng;
- thiếu trường tuỳ chọn thì bỏ phần đó, không lỗi; chữ dài (email, địa chỉ) không làm vỡ bố cục;
- không đặt thành phần cố định ở góc dưới phải;
- dùng được bằng bàn phím, tôn trọng giảm chuyển động;
- chạy thử ở 1440px, 1024px, 390px và 360px, console không lỗi; ghi vào mục 12 của `AGENTS.md`.

## Phần tự quyết định

- Làm header và footer của Bậc Trà sau khi đối chiếu, vì đây là hai phần bắt buộc còn sai kiểu so với thiết kế.
- Header làm theo cách "trong suốt ở đầu trang, cuộn thì có nền" ghi trong issue #7, không đổi màu chữ theo hero
  như bản phác, để header không phụ thuộc vào khối hero.
- Footer duyệt qua nhiều bản trên bản phác: bỏ bản nút đỏ son có vòng chữ và hai dải băng bắt chéo (lố), bỏ tên
  thương hiệu cỡ lớn ở đáy, bỏ dải sống núi chở tên chặng; chọn dòng tên chặng chữ trắng mảnh chạy trên ảnh.
- Bỏ nút giữ chỗ và dòng ưu đãi trong khối "Hẹn bạn trên mây" vì đã lặp ở nhiều nơi.
- Thử thêm dải mây ở cuối mọi section rồi bỏ vì nhiều mây quá, mây che chữ và trông giả trên nền trắng. Lần sau
  chỉ đặt mây ở hai chỗ nối có nền khác hẳn nhau (sau hero, sau lịch trình), thêm lõi mây đặc để che hẳn đường nối;
  chỗ giáp footer không đặt mây mà cho mép trên ảnh tan dần vào nền trang.
- Muốn ẩn hẳn nguồn ảnh khỏi trang, sau khi biết 15 ảnh dùng giấy phép CC BY, CC BY-SA thì giữ dòng "Nguồn ảnh"
  gập sẵn.
- Đồng ý thêm biến tuỳ chọn `--color-tint` vào `base.css` và phần ảnh nền, lời hẹn, dòng chữ chạy vào `wl-footer.js`.
