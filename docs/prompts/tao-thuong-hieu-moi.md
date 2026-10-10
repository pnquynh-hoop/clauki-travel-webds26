# Prompt tạo bản cấu hình cho một thương hiệu mới

Dùng khi cần một landing page mới cùng chủ đề mà không sửa mã nguồn (gợi ý của BTC ở Biên bản Khai mạc, dòng 84
và 273). AI chỉ viết dữ liệu (`content.json`, `theme.css`); người chạy prompt phải kiểm tra lại theo danh sách ở
cuối file và giải thích được từng trường.

## Gửi kèm cho AI

1. `AGENTS.md` (mục 5 "Dữ liệu thương hiệu", mục 8 "Ảnh và nội dung", mục 12 "Trường riêng của từng section")
2. `brands/me-rach/content.json` và `brands/me-rach/theme.css` làm mẫu
3. Đoạn chú thích đầu `css/base.css` (danh sách biến CSS)

## Prompt

```text
Bạn viết dữ liệu cho một landing page white label. Mã nguồn đã có sẵn, bạn KHÔNG viết HTML, CSS quy tắc hay
JavaScript; chỉ viết hai tệp dữ liệu cho một thương hiệu mới.

Chủ đề bắt buộc: du lịch và dịch vụ lưu trú tại Việt Nam.
Thương hiệu mới: [mô tả 2-3 câu: loại hình, nơi chốn, khách hướng tới, sản phẩm hoặc chiến dịch chính].
id thư mục: [chữ thường, không dấu, nối bằng gạch ngang].

Đọc các tệp gửi kèm: AGENTS.md (mục 5, 8, 12), content.json và theme.css của Mé Rạch làm mẫu, danh sách biến
trong base.css. Tên trường phải đúng y như mục 12 và như tệp mẫu.

Yêu cầu content.json:
- Đủ các khoá cấp đầu như tệp mẫu: id, meta (title, description, favicon), brand (name, logo, slogan),
  cta (label, href, note), toTop, nav, header, contact, place, footer, sections, credits.
- Chọn khối theo bảng dưới. Chỉ dùng các type, variant có trong bảng (khối khác cần toạ độ, ảnh tách nền
  hoặc dữ liệu riêng của từng thương hiệu nên không dùng):

  | Khối | Nói ý gì | Kiểu và khi nào dùng |
  | hero (bắt buộc, đứng đầu) | sản phẩm gì, cho ai, nút CTA | coverflow: có nhiều ảnh đẹp ngang nhau (3-5 ảnh); stacked: một ảnh rộng thật mạnh, chữ nhiều hơn |
  | intro (tuỳ chọn) | một câu khác biệt của nơi này | mặc định: căn trái; center: một câu tuyên ngôn ngắn |
  | reviews (nên có) | khách thật nói gì, bằng chứng tin cậy | postcard: 3-4 lời kể, mỗi lời nhắc một chi tiết cụ thể của sản phẩm |
  | gallery (nên có) | cho thấy nơi chốn bằng ảnh | slices: 5-6 ảnh, mỗi ảnh một cảnh khác nhau |
  | faq (bắt buộc) | gỡ băn khoăn trước khi đặt | chat: giọng chủ nhà thân mật, homestay, nhà nhỏ; bỏ variant: danh sách gọn, khu nghỉ, tour |
  | booking (bắt buộc, gần cuối) | hành động: đặt | stay: tính theo phòng và số đêm, có nhiều hạng phòng; request: tính theo khách, nhà dân, homestay một giá |

  header: overlay khi ảnh hero tối, chữ sáng đè lên; solid khi hero sáng; center khi muốn tên thương hiệu
  làm điểm nhấn. footer: columns, lời hẹn (title, titleAccent) gắn với nơi chốn, marquee là tên các điểm
  quanh đó.

- Mạch trang 5 đến 7 khối: hero (hứa hẹn) -> intro hoặc gallery (cho thấy) -> reviews (tin được)
  -> faq (hết băn khoăn) -> booking (đặt). Không thêm khối chỉ để cho đủ; mỗi khối phải nói một ý khác nhau.
  Trong câu trả lời, ghi một dòng vì sao chọn từng khối và từng kiểu.
- Mỗi section có id viết không dấu; mọi href trong nav và cta.href phải trỏ đúng một id có trong sections;
  cta.href trỏ tới khối booking.
- Chữ tiếng Việt, ít chữ, giọng riêng của thương hiệu; tiêu đề ngắn, mỗi đoạn tối đa khoảng 2 câu;
  không dùng dấu chấm giữa (·) làm dấu ngăn; không chèn HTML.
- Tên thương hiệu, tên người, số điện thoại, email đều là giả tưởng (email đuôi .clauki, số 0123 456 789);
  không dùng tên hay logo của thương hiệu có thật.
- Ảnh: dùng đường dẫn images/<tên-tệp>.webp và viết alt mô tả đúng cảnh. Không bịa nguồn ảnh: mục credits
  để author, license, source là "CẦN ĐIỀN", người làm sẽ tìm ảnh có giấy phép và điền sau.
- Giá, số đêm, số khách phải khớp nhau giữa hero, booking, cta.note, reviews.

Yêu cầu theme.css:
- Dòng đầu @import font Google có hỗ trợ tiếng Việt; sau đó một khối :root, chỉ khai báo biến.
- Đủ biến bắt buộc: --color-primary, --color-on-primary, --color-bg, --color-surface, --color-ink,
  --color-muted, --color-accent, --font-heading, --font-body, --radius; có thể thêm --color-tint.
- Chữ thường trên nền và nhãn trên nút đạt tương phản WCAG AA (4,5:1); ghi tỉ lệ đã tính trong chú thích.
- Bảng màu khác hẳn ba thương hiệu hiện có, có chủ ý theo nơi chốn; không dùng gradient mặc định.

Trả về đúng hai khối mã: content.json (JSON thuần, không chú thích) và theme.css. Sau hai khối mã, viết:
1. mỗi khối đã chọn một dòng: vì sao chọn khối đó và kiểu đó cho thương hiệu này;
2. tên các tệp ảnh cần tìm, mỗi tệp một dòng kèm mô tả cảnh.
```

## Người làm kiểm tra lại trước khi commit

- [ ] JSON hợp lệ; mọi `type`, `variant` có trong danh sách trên; mọi `href` trỏ đúng `id`
- [ ] Tên thương hiệu không trùng thương hiệu có thật (tra Google, tra danh sách thương hiệu trong repo mẫu của BTC)
- [ ] Ảnh thật có giấy phép, điền đủ `credits`; không để lại "CẦN ĐIỀN"
- [ ] Tương phản màu tính lại bằng công cụ, không tin số AI ghi
- [ ] Mở `index.html?brand=<id>` ở 390px và 1440px: không lỗi console, không tràn ngang
- [ ] Ghi vào `docs/ai-log.md`: link file này, chỗ nào AI viết, chỗ nào người sửa
