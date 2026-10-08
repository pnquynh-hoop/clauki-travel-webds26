## Bậc Trà: bản chốt thương hiệu (issue #3) - Như Quỳnh

Kế hoạch đầy đủ: `docs/ke-hoach-thuong-hieu-bac-tra.md`.

### Thông tin cốt lõi

| Mục | Nội dung |
|---|---|
| Thương hiệu | **Bậc Trà**, thư mục `brands/bac-tra` |
| Loại hình | Tour trải nghiệm vùng cao theo chủ đề trà và lúa |
| Sản phẩm | Tour Yên Bái 4 ngày 3 đêm: hồ Thác Bà, Nghĩa Lộ, Suối Giàng, Tú Lệ, đèo Khau Phạ, Mù Cang Chải |
| Chiến dịch trên landing page | Mùa nước đổ 2027, mở giữ chỗ sớm |
| Thời gian | Khởi hành thứ Năm, về Chủ nhật; các chuyến từ 13/05 đến 10/06/2027 |
| Phương tiện | Xe 16 chỗ đón ở phố cổ Hà Nội; thuyền trên hồ Thác Bà |
| Đoàn | Tối đa 12 khách, một trưởng đoàn và người dẫn đường địa phương |
| Giá (giả định) | 5.490.000 đồng một khách |
| Khẩu hiệu | Hái trà trên mây, ngắm lúa trên núi |
| Nút kêu gọi hành động | "Giữ chỗ", dẫn tới `#dat-cho` |

### Màu sắc và font

| Vai trò | Màu |
|---|---|
| Chủ đạo (xanh lá chè) | `#2f5d46` |
| Nhấn (vàng lúa) | `#8a6111` |
| Nền (trắng sương) | `#f2f4ee` |

Font: Lora cho tiêu đề, Be Vietnam Pro cho nội dung. Các cặp màu chữ và nền đã đạt chuẩn tương phản AA.

### Sườn trang

| Thứ tự | Khối | Kiểu trình bày | Loại |
|---|---|---|---|
| | `header` | `overlay` (trong suốt, đè lên hero) | cố định |
| 1 | `hero` | `full` (ảnh phủ kín màn hình) | chung |
| | lớp săn mây trên hero (#9) | | chung (điểm nhấn của cả đội) |
| 2 | `intro` | `center` | dùng lại |
| 3 | `journey`: lịch trình 4 ngày (#13) | `road`: con đường chữ S qua từng trạm | dùng lại, kiểu `road` là của Bậc Trà |
| 4 | `tea-process`: từ búp chè đến chén trà | `steps`: các bước xếp hàng ngang | **đặc trưng** |
| 5 | `gallery` | `mosaic` | dùng lại |
| 6 | `seasons`: lịch mùa 12 tháng | `strip`: dải 12 ô tháng | **đặc trưng** |
| 7 | `booking` | `calendar`: ngày khởi hành dạng thẻ lịch | chung |
| 8 | `faq` | mặc định | dùng lại |
| | `footer` | `columns` | cố định |
| | `sticky-cta` | | cố định |

Giải thích các loại:

- **Cố định:** nằm sẵn trong `index.html` nên trang nào cũng có; lấy dữ liệu từ các khoá ngoài `sections`.
- **Chung:** thương hiệu nào cũng có, nhưng mỗi thương hiệu chọn một kiểu trình bày khác.
- **Dùng lại:** thương hiệu khác cũng có thể dùng. Lịch trình thuộc loại này, vì tour nào cũng cần lịch trình.
- **Riêng:** chỉ Bậc Trà dùng.
- **Đặc trưng:** khối mới gắn với loại hình trà và lúa, nên tự nó cũng là khối riêng; cần tạo issue mới.

Hai khối chỉ Bậc Trà dùng là hai khối mới tự tìm theo loại hình trà và lúa: `tea-process` và `seasons`. Như vậy đủ điều kiện "ít nhất 2 section riêng và ít nhất 1 section đặc trưng".

### Khung `content.json`

`meta`, `brand`, `cta`, `nav` đã có giá trị đề xuất; nội dung từng khối điền sau. Chỉ ghi chú ở các khoá thể hiện ý tưởng riêng của Bậc Trà; tệp thật là JSON thuần, không có chú thích.

```jsonc
{
  "id": "bac-tra",
  "meta": {
    "title": "Bậc Trà · Tour Yên Bái 4 ngày 3 đêm mùa nước đổ 2027",
    "description": "Tour đoàn nhỏ tối đa 12 khách: hái chè Shan tuyết trên mây ở Suối Giàng, tắm suối khoáng Tú Lệ, ngắm ruộng bậc thang Mù Cang Chải mùa nước đổ.",
    "favicon": "images/logo.svg"
  },
  "brand": { "name": "Bậc Trà", "logo": "images/logo.svg", "slogan": "Hái trà trên mây, ngắm lúa trên núi" },
  "cta": { "label": "Giữ chỗ", "href": "#dat-cho", "note": "Từ 5.490.000 đồng một khách" },
  "nav": [
    { "label": "Lịch trình", "href": "#lich-trinh" },
    { "label": "Làm trà", "href": "#tu-bup-den-chen" },
    { "label": "Lịch mùa", "href": "#lich-mua" },
    { "label": "Hỏi đáp", "href": "#hoi-dap" }
  ],
  "header": { "variant": "overlay" },
  "contact": { "phone": "", "email": "", "address": "" },
  "place": { "name": "", "lat": 0, "lon": 0, "timezone": "Asia/Ho_Chi_Minh" },
  "sections": [
    { "type": "hero",        "id": "gioi-thieu",      "variant": "full" },
    { "type": "intro",       "id": "cach-di",         "variant": "center" },
    { "type": "journey",     "id": "lich-trinh",      "variant": "road" },     // con đường chữ S qua từng trạm, xe chạy theo khi cuộn, mỗi trạm ghi độ cao
    { "type": "tea-process", "id": "tu-bup-den-chen", "variant": "steps" },    // 5 bước hái, làm héo, sao, vò, sấy khô; mỗi bước một ảnh, một câu
    { "type": "gallery",     "id": "thu-vien",        "variant": "mosaic" },
    { "type": "seasons",     "id": "lich-mua",        "variant": "strip" },    // dải 12 tháng: mùa nước đổ, lúa chín, mùa hái chè; khách chọn mùa rồi giữ chỗ
    { "type": "booking",     "id": "dat-cho",         "variant": "calendar" },
    { "type": "faq",         "id": "hoi-dap" }
  ],
  "footer": { "variant": "columns" },
  "credits": []
}
```

Mỗi khối trong `sections` có thêm các trường chung `eyebrow`, `title`, `lead`, `hidden`, và các trường riêng do người viết component quy định. Những trường này điền khi component tương ứng đã xong.

### Cần đội xác nhận

1. Có sections trùng nào không và có góp ý thay đổi gì không
