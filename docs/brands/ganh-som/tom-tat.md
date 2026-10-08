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
| Nút kêu gọi hành động | "Đặt phòng", dẫn tới `#dat-phong` |

### Màu sắc và font

| Vai trò | Màu |
|---|---|
| Chủ đạo (xanh biển sâu) | `#1d4f73` |
| Nhấn (đỏ gạch san hô) | `#a8461f` |
| Nền (trắng cát) | `#f6f2ea` |

Font: Josefin Sans cho tiêu đề, Nunito cho nội dung. Mọi cặp màu chữ và nền đạt chuẩn tương phản AA.

### Sườn trang

| Thứ tự | Khối | Kiểu trình bày | Loại |
|---|---|---|---|
| | `header` | `solid` (nền đặc, dòng nhỏ phía trên ghi giờ nhận phòng và số điện thoại) | cố định |
| 1 | `hero` + lớp trời thật (#9) | `split` (chữ bên trái, ảnh trong khung bên phải) | chung |
| 2 | `stays`: ba hạng nhà (#16) | `rows`: hàng lớn ảnh và chữ xen kẽ trái phải | **riêng** |
| 3 | `room-view`: nhìn từ ban công | `tabs`: bấm hạng nhà thì đổi ảnh toàn cảnh nhìn ra từ ban công | **đặc trưng** |
| 4 | `features`: có gì trong giá (#11) | `numbered`: hàng đánh số | **riêng** |
| 5 | `gallery` | `strip`: dải ảnh vuốt ngang | dùng lại |
| 6 | `intro` | mặc định, căn trái | dùng lại |
| 7 | `booking` | `stay`: chọn ngày nhận và trả phòng, hạng nhà, số khách | chung |
| 8 | `faq` | mặc định | dùng lại |
| | `footer` | `compact` (gọn một hàng) | cố định |
| | `sticky-cta` | | cố định |

Ba khối chỉ Gành Sớm dùng: `stays`, `room-view`, `features`. Chỉ `room-view` là khối mới, cần tạo issue.

### Khung `content.json`

```json
{
  "id": "ganh-som",
  "meta": {
    "title": "Gành Sớm · Nhà nghỉ trên mỏm gành phía nam Quy Nhơn",
    "description": "24 căn nhà nhìn thẳng ra biển hướng đông, mở cửa là thấy mặt trời mọc. Đặt sớm hè 2027: ở 3 đêm, tặng đêm thứ tư.",
    "favicon": "images/logo.svg"
  },
  "brand": { "name": "Gành Sớm", "logo": "images/logo.svg", "slogan": "Bình minh ngay hiên nhà" },
  "cta": { "label": "Đặt phòng", "href": "#dat-phong", "note": "Từ 2.800.000 đồng một đêm" },
  "nav": [
    { "label": "Các hạng nhà", "href": "#hang-nha" },
    { "label": "Nhìn từ ban công", "href": "#nhin-ra" },
    { "label": "Có gì trong giá", "href": "#trong-gia" },
    { "label": "Hỏi đáp", "href": "#hoi-dap" }
  ],
  "header": { "variant": "solid" },
  "contact": { "phone": "0123 456 789", "email": "dat-phong@ganhsom.example", "address": "Phía nam Quy Nhơn" },
  "place": { "name": "Quy Nhơn", "lat": 13.70, "lon": 109.23, "timezone": "Asia/Ho_Chi_Minh" },
  "sections": [
    { "type": "hero", "id": "gioi-thieu", "variant": "split" },
    { "type": "stays", "id": "hang-nha", "variant": "rows" },
    { "type": "room-view", "id": "nhin-ra", "variant": "tabs" },
    { "type": "features", "id": "trong-gia", "variant": "numbered" },
    { "type": "gallery", "id": "thu-vien", "variant": "strip" },
    { "type": "intro", "id": "o-cham" },
    { "type": "booking", "id": "dat-phong", "variant": "stay" },
    { "type": "faq", "id": "hoi-dap" }
  ],
  "footer": { "variant": "compact" },
  "credits": []
}
```

### Cần đội xác nhận

1. Gành Sớm giữ `stays` làm khối riêng, nên Bậc Trà không dùng `stays`; mỗi ngày trong lịch trình Bậc Trà ghi luôn đêm đó ngủ ở đâu.
2. Khối đặt chỗ có hai chế độ: Bậc Trà chọn chuyến khởi hành (`calendar`), Gành Sớm chọn khoảng ngày ở (`stay`).
