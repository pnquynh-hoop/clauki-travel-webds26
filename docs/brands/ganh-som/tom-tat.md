## Gành Sớm: bản chốt thương hiệu (issue #3) - Gia Huy

Kế hoạch đầy đủ: [ke-hoach.md](ke-hoach.md).

### Thông tin cốt lõi

| Mục | Nội dung |
|---|---|
| Thương hiệu | **Gành Sớm**, thư mục `brands/ganh-som` |
| Loại hình | Lưu trú nghỉ dưỡng biển: khách ở yên một chỗ, không đi tour |
| Sản phẩm | 24 căn nhà trên một mỏm gành phía nam Quy Nhơn, nhìn về hướng đông: 8 villa sát biển có bể ngâm, 10 nhà đồi, 6 phòng vườn |
| Chiến dịch trên landing page | Đặt sớm hè 2027 (tháng 4 đến tháng 8, mùa biển lặng): đặt trước 31/12/2026, ở 3 đêm tặng đêm thứ tư |
| Giá (giả định, 2 khách, có bữa sáng) | Phòng vườn 2.800.000 đồng, nhà đồi 3.900.000 đồng, villa sát biển 6.200.000 đồng một đêm |
| Có sẵn trong giá | Đón sân bay Phù Cát, bữa sáng, xe đạp, chèo ván đứng (SUP) buổi sáng |
| Khẩu hiệu | Bình minh ngay hiên nhà |
| Nút kêu gọi hành động | "Đặt phòng ngay", dẫn tới `#dat-phong` |

### Màu sắc và font

| Vai trò | Màu |
|---|---|
| Chủ đạo (cam nắng sớm, nền nút bấm) | `#e8743b` |
| Nhấn (cam đất đậm, chữ nhấn) | `#a3431a` |
| Nền (màu cát) | `#f3eee6` |

Font: Montserrat cho cả tiêu đề và nội dung. Mọi cặp màu chữ và nền đạt chuẩn tương phản AA; màu chủ đạo chỉ làm nền nút, không làm màu chữ.

### Sườn trang

| Thứ tự | Khối | Kiểu trình bày | Loại |
|---|---|---|---|
| | `header` | `solid` (nền màu cát hơi trong, nút đặt phòng nhỏ hiện cả trên điện thoại) | cố định |
| 1 | `hero` + lớp trời thật (#9) | `coverflow` (chồng 5 thẻ ảnh xoay vòng, tiêu đề lớn đè lên giữa) | chung |
| 2 | `stays`: ba hạng nhà (#16) | `rows`: hàng lớn ảnh và chữ xen kẽ trái phải | **riêng** |
| 3 | `room-view`: nhìn từ ban công | `tabs`: bấm hạng nhà thì đổi ảnh toàn cảnh nhìn ra từ ban công | **đặc trưng** |
| 4 | `features`: giá đã gồm (#11) | `numbered`: hàng đánh số | **riêng** |
| 5 | `gallery` | `strip`: dải ảnh vuốt ngang | dùng lại |
| 6 | `intro` | mặc định, căn trái | dùng lại |
| 7 | `booking` | `stay`: chọn ngày nhận và trả phòng, hạng nhà, số khách | chung |
| 8 | `faq` | mặc định | dùng lại |
| | `footer` | `card` (một thẻ trắng: tên lớn, nút đặt phòng, ba cột menu, liên hệ, địa chỉ) | cố định |
| | `sticky-cta` | | cố định |

Ba khối chỉ Gành Sớm dùng: `stays`, `room-view`, `features`. Chỉ `room-view` là khối mới, cần tạo issue.

### Khung `content.json`

```json
{
  "id": "ganh-som",
  "meta": {
    "title": "Gành Sớm - Nhà nghỉ trên mỏm gành phía nam Quy Nhơn",
    "description": "24 căn nhà nhìn thẳng ra biển hướng đông, mở cửa là thấy mặt trời mọc. Đặt sớm hè 2027: ở 3 đêm, tặng đêm thứ tư.",
    "favicon": "images/logo.svg"
  },
  "brand": { "name": "Gành Sớm", "logo": "images/logo.svg", "slogan": "Bình minh ngay hiên nhà" },
  "cta": { "label": "Đặt phòng ngay", "href": "#dat-phong", "note": "Từ 2.800.000 đồng một đêm" },
  "nav": [
    { "label": "Các hạng nhà", "href": "#hang-nha" },
    { "label": "Nhìn từ ban công", "href": "#nhin-ra" },
    { "label": "Giá đã gồm", "href": "#trong-gia" },
    { "label": "Hỏi đáp", "href": "#hoi-dap" }
  ],
  "header": { "variant": "solid" },
  "contact": { "phone": "0123 456 789", "email": "dat-phong@ganhsom.clauki", "address": "Phía nam Quy Nhơn" },
  "place": { "name": "Quy Nhơn", "lat": 13.70, "lon": 109.23, "timezone": "Asia/Ho_Chi_Minh" },
  "sections": [
    { "type": "hero", "id": "gioi-thieu", "variant": "coverflow" },
    { "type": "stays", "id": "hang-nha", "variant": "rows" },
    { "type": "room-view", "id": "nhin-ra", "variant": "tabs" },
    { "type": "features", "id": "trong-gia", "variant": "numbered" },
    { "type": "gallery", "id": "thu-vien", "variant": "strip" },
    { "type": "intro", "id": "o-cham" },
    { "type": "booking", "id": "dat-phong", "variant": "stay" },
    { "type": "faq", "id": "hoi-dap" }
  ],
  "footer": { "variant": "card" },
  "credits": []
}
```

### Cần đội xác nhận

1. Gành Sớm giữ `stays` làm khối riêng, nên Bậc Trà không dùng `stays`; mỗi ngày trong lịch trình Bậc Trà ghi luôn đêm đó ngủ ở đâu.
2. Khối đặt chỗ có hai chế độ: Bậc Trà chọn chuyến khởi hành (`calendar`), Gành Sớm chọn khoảng ngày ở (`stay`).
