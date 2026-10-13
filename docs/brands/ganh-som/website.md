# Gành Sớm: website hoàn chỉnh (#90)

Người phụ trách: Gia Huy. Cập nhật: 13/10/2026. Thông tin gốc của brand: [tom-tat.md](tom-tat.md), [ke-hoach.md](ke-hoach.md).

## 1. Phân tích brand

**Khách là ai.** Cặp đôi và gia đình nhỏ ở thành phố, 28 đến 45 tuổi, nghỉ 3 đến 4 đêm. Họ không muốn lịch trình dày; họ muốn một chỗ yên, đẹp, ở là thấy đáng tiền.

**Họ lo gì trước khi đặt.**
- Ảnh có thật như vậy không, nhà có thật nhìn ra biển không.
- Ba hạng nhà khác nhau thế nào, hạng nào đáng tiền với mình.
- Giá đã gồm gì, có phát sinh không, huỷ được không.
- Đi lại thế nào từ sân bay Phù Cát, quanh đó có gì làm.
- Trẻ nhỏ, người lớn tuổi ở có tiện không.

**Cảm xúc chủ đạo.** Bình yên lúc sáng sớm: thức dậy, mở cửa, mặt trời lên ngay trên biển trước hiên. Mọi trang nên giữ cảm giác chậm, rộng, sáng.

**Điểm khác biệt.** Cả 24 căn quay về hướng đông, nên căn nào cũng có bình minh. Khu nhỏ, không ồn. Có sẵn đón sân bay, bữa sáng, xe đạp, chèo ván buổi sáng.

**Sắc thái thiết kế: sang trọng hiện đại.** Nhiều khoảng trắng, ảnh lớn tràn mép, chữ to và thưa, màu cát với một màu nhấn cam đất, chuyển động chậm và êm (ảnh trôi nhẹ khi cuộn, chuyển trang mờ dần). Không dùng hiệu ứng giật hay màu chói.

## 2. Sơ đồ trang

Mỗi trang trả lời một câu hỏi của khách. Đợt 1 dùng các component đã có; đợt 2 thêm trang khi component ở #84 xong.

| Đường dẫn | Trang | Khách hỏi gì | Khối (đợt 1) | Nút chính dẫn tới |
|---|---|---|---|---|
| `/` | Trang chủ | Chỗ này có gì đặc biệt, có đáng tin không | hero `coverflow`, thư viện ảnh `slices`, đánh giá `postcard` | Ba hạng nhà |
| `nha` | Ba hạng nhà | Ở hạng nào, nhìn ra cảnh gì, giá bao nhiêu | các hạng nhà `headland` | Đặt hạng đã chọn |
| `uu-dai` | Ưu đãi hè 2027 | Đặt sớm được lợi gì, điều kiện ra sao | ưu đãi `postcard` | Đặt hạng đã chọn |
| `dat-phong` | Đặt phòng | Còn băn khoăn gì, đặt thế nào | hỏi đáp `chat`, đặt phòng `stay` | Gửi yêu cầu đặt phòng |

Đợt 2 (cần component ở #84):
- `nha/<hạng>` hoặc ba trang chi tiết từng hạng: ảnh lớn, cảnh từ ban công, tiện nghi, giá, ngày trống.
- `quanh-quy-nhon`: Kỳ Co, Eo Gió, chợ cá, đường đi từ chỗ ở.
- `chinh-sach`: huỷ, hoàn, trẻ em, thêm khách.

## 3. Hành trình đặt phòng

1. Vào trang chủ, xem ảnh và lời kể của khách cũ, thấy bình minh là thật.
2. Bấm "Xem các hạng nhà", chọn một hạng trên ảnh mỏm gành, xem cảnh từ ban công và giá.
3. Bấm "Đặt hạng này": sang trang Đặt phòng, form **đã chọn sẵn hạng đó**.
4. Đọc vài câu hỏi đáp nếu còn lo, điền ngày, số khách, họ tên, số điện thoại.
5. Bấm đặt: trang soạn sẵn tin nhắn, gửi SMS hoặc gọi.

Lối tắt: menu "Ưu đãi hè 2027", chọn hạng trên con tem, bấm đặt, cũng sang trang Đặt phòng với hạng đã chọn sẵn.

## 4. Kịch bản dẫn dắt (3 đến 4 phút)

1. **Trang chủ (40 giây).** "Đây là Gành Sớm, khu 24 căn trên mỏm gành phía nam Quy Nhơn. Căn nào cũng quay về hướng đông." Lướt thẻ ảnh hero, cuộn qua thư viện ảnh, dừng ở một tấm bưu thiếp đánh giá.
2. **Ba hạng nhà (60 giây).** Bấm menu, trang chuyển mờ dần. Bấm lần lượt ba mốc trên mỏm gành: "Khách chọn hạng bằng cách nhìn chính cảnh mình sẽ thấy từ ban công."
3. **Ưu đãi (30 giây).** "Đặt trước 31/12, ở 4 đêm trả 3." Chỉ dấu bưu điện đếm ngược, chọn con tem villa.
4. **Đặt phòng (60 giây).** Bấm đặt: sang trang đặt phòng, villa đã chọn sẵn. Hỏi thử một câu trong khung chat, điền ngày, ra tin nhắn soạn sẵn.
5. **Kết (20 giây).** Bấm nút đổi brand của BTC: cả website chuyển sang Bậc Trà, giữ đúng trang đang mở.

## 5. Kiểm trước khi xong

- [ ] Trên điện thoại 390px, đi trọn hành trình ở mục 3 không gặp link hỏng, chữ giữ chỗ hay trang trống
- [ ] Mỗi trang nói được bằng một câu "trang này giúp khách ..."
- [ ] Ảnh mới (nếu có) có giấy phép và dòng trong `credits`
