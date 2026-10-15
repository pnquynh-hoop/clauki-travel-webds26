# 15/10 - Tự chuyển sang Gemini 3.1 Flash Lite khi model chính hết lượt

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #177

## Prompt (tóm tắt)

Gemini hết lượt thì tự chuyển sang Gemini 3.1 Flash Lite.

## Kết quả AI trả về

`js/ai/gemini.js`: `FALLBACK_MODEL`, lỗi 429 ở model chính thì gửi lại bằng model dự phòng (khi chưa nhận được dòng nào) và dùng model
dự phòng trong một phút; `usingFallback()` cho trạng thái của `/tao` báo đã chuyển. Thử lúc model chính đang hết lượt: hai lời gọi
JSON và một lượt tạo site đầy đủ đều chạy trên model dự phòng.
