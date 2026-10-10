# 09–10/10 - Khối "Một ngày ở vườn" (`day-plan`) của Mé Rạch

- Người dùng AI: Mị Nương
- Công cụ: Claude Code (Claude Opus 5.5)
- Tệp: `js/components/wl-day-plan.js`, `css/components/day-plan.css`, phần `day-plan` trong
  `brands/me-rach/content.json` và `brands/brand-test/content.json`, dòng `day-plan` trong AGENTS.md mục 12

## Lần 1 (09/10): ý tưởng, trang mẫu và bản đầu của component

Prompt (tóm tắt):

Khối "Một ngày ở vườn" là section riêng của Mé Rạch. Trang mẫu hiện chỉ cho ảnh chuyển dần khi lướt xuống.
Hãy đề xuất cách trình bày ấn tượng hơn, bàn trước khi làm. Ý tôi: liên quan tới chiếc xuồng, người xem cuộn
xuống thì có cảm giác đang trôi trên dòng sông. Chép trang mẫu ra một bản riêng và sửa trên bản đó theo ý mới;
giữ tông màu tươi sáng, dòng sông và xuồng như bản mẫu, thêm hiệu ứng xuồng bơi trên sông.
Sau đó đưa vào repo thành component `wl-day-plan` theo AGENTS.md.

Kết quả: trang mẫu ngoài repo (không nộp); component bản đầu: sông vẽ bằng SVG uốn dọc khối, các bến xen kẽ
hai bờ, xuồng trôi theo độ cuộn, nền đổi màu theo giờ của bến, đánh dấu bến đang diễn ra theo giờ thật ở
`place.timezone`.

## Lần 2 (10/10): làm kỹ phần cuộn, khung bến, mô tả, dòng sông

Prompt (tóm tắt):

Không cần y hệt bản thiết kế. Sửa kỹ việc cuộn tới đâu thì sự kiện tới đó. Mỗi bến là một khung có ảnh,
bấm vào ảnh thì hiện vài dòng mô tả chỗ đó; mỗi bến có số thứ tự thật to, hiện đại, có chất nghệ thuật.
Nói ý tưởng trước khi làm.

Sau khi xem thử: ảnh sáng lên quá trễ, xuồng đã đi gần qua bến thì ảnh mới hiện, tính lại cho kỹ;
CSS lại dòng sông cho trông thật hơn.

Kết quả:

- số, ảnh, chữ của mỗi bến có độ tiến `--p` riêng, tính theo vị trí của chính phần đó trên màn hình;
  bến đang tới là bến gần xuồng nhất;
- số thứ tự rất lớn chỉ có nét viền, nước dâng từ đáy lên theo độ cuộn;
- bấm ảnh thì tấm mô tả (`details`) trượt lên phủ ảnh, bấm lại hoặc Esc thì đóng;
- sông 6 lớp (bờ cỏ, bùn, mép sẫm, nước sâu, nước giữa, dải trời), 3 vệt dòng chảy, ánh lấp lánh, bóng xuồng;
- sửa điểm ngắt về 1024px và màu chữ về `--color-accent` cho đúng AGENTS.md.

## Phần tự làm và tự kiểm tra

- Chọn ý tưởng xuồng trôi trên sông, chọn tấm mô tả phủ lên ảnh và kiểu số nước dâng.
- Xem trên trình duyệt ở `?brand=me-rach`; thử chép khối sang Gành Sớm (có ảnh, không mô tả, không ảnh,
  chữ dài) và Bậc Trà (không có `place`) để xem khối theo màu, font thương hiệu đó và không lỗi.
- Nội dung `details` của 6 bến do AI viết nháp, tự sửa lại cho đúng ý.
