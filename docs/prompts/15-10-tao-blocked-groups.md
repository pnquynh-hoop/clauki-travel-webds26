# 15/10 - Site AI tạo không còn bỏ dở khi bộ lọc an toàn chặn một nhóm chữ

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Sonnet 5.5)
- Kết quả: PR #176

## Prompt (tóm tắt)

Site tạo thử "Nile Vibe" (khung SighGone) hiện nguyên chữ Sài Gòn: "Tuyến số 1", "Ghé hẻm 42", thẻ hướng dẫn viên Mai Trâm, dòng
trạng thái báo "Yêu cầu bị bộ lọc an toàn chặn". Tìm nguyên nhân và sửa: một nhóm chữ bị Gemini chặn thì cả lượt tạo dừng,
phần còn lại giữ chữ của khung; trang dựng quanh khối của thương hiệu khác (hero ride) và thẻ hướng dẫn viên vẽ riêng của khung
phải bị bỏ khi không hợp.

## Kết quả AI trả về

`generate.js`: nhóm bị chặn được chia đôi và thử lại tới từng dòng, dòng nào vẫn bị chặn thì giữ chữ của khung và báo số dòng;
`rules.js`: bỏ cả trang có khối `hard` ở trang con, thêm cờ `drop` (cards:badge bị cấm thì bỏ khối). Người dùng chạy lại prompt
Nile, kiểm trang chủ, liên hệ, về chúng tôi.

Thêm: dò từng nhóm chữ của SighGone thì chỉ nhóm có tour địa đạo Củ Chi ("miệng hầm bí mật", "bắn súng thể thao") bị chặn ở mức
BLOCK_LOW_AND_ABOVE, gửi riêng từng dòng thì qua; theo quyết định của người dùng, bỏ `safetySettings` trong `js/ai/gemini.js` để dùng mức mặc định của Gemini.
