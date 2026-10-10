## Gành Sớm: bản chốt thương hiệu (issue #3) - Gia Huy

Kế hoạch đầy đủ: [ke-hoach.md](ke-hoach.md).

### Thông tin cốt lõi

| Mục | Nội dung |
|---|---|
| Thương hiệu | **Gành Sớm**, thư mục `brands/ganh-som` |
| Loại hình | Lưu trú nghỉ dưỡng biển: khách ở yên một chỗ, không đi tour |
| Sản phẩm | 24 căn nhà trên một mỏm gành phía nam Quy Nhơn, nhìn về hướng đông: 8 villa sát biển có bể ngâm, 10 nhà đồi, 6 phòng vườn |
| Chiến dịch trên landing page | Đặt sớm hè 2027 (tháng 4 đến tháng 8, mùa biển lặng): đặt trước 31/12/2026, ở 4 đêm chỉ trả 3 |
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
| 2 | `stays`: ba hạng nhà (#16) | `headland`: ảnh mỏm gành tách nền, bấm mốc của một hạng thì ngay trên mốc hiện ảnh cảnh nhìn ra từ ban công | **riêng** |
| 3 | `room-view`: nhìn từ ban công | `climb`; đang ẩn vì cảnh nhìn ra đã gộp vào `stays` | **đặc trưng** |
| 4 | `features`: giá đã gồm (#11) | `numbered`: hàng đánh số; đang ẩn tới khi có component (phần giá đã gồm ghi ở dòng giá của các hạng nhà) | **riêng** |
| 5 | `gallery` | `slices`: sáu ảnh là các dải hẹp trong khung trắng, rê chuột hoặc bấm thì một dải mở lớn | dùng lại |
| 6 | `intro` | mặc định, căn trái; đang ẩn vì chỉ có chữ, lạc giữa hai khối nhiều ảnh | dùng lại |
| 7 | `offer`: ưu đãi đặt sớm hè 2027 | `postcard`: bưu thiếp hẹn hè 2027, dấu bưu điện đếm ngược tới hạn đặt, chọn hạng bằng con tem in giá 4 đêm trả 3, dải tháng của biển | **riêng** |
| 8 | `faq` | `chat`: nhắn tin với chủ nhà, câu hỏi là nút gợi ý; đặt trước form để khách hỏi xong rồi mới đặt | dùng lại |
| 9 | `booking` | `stay`: chọn ngày nhận và trả phòng, hạng nhà, số khách | chung |
| | `footer` | `card` (một thẻ trắng: tên lớn, nút đặt phòng, ba cột menu, liên hệ, địa chỉ) | cố định |
| | `sticky-cta` | | cố định |

Khối chỉ Gành Sớm dùng: `stays`, `offer`, `features` (chưa có). `room-view` đã gộp vào `stays` nên đang ẩn.

### Khung `content.json`

```json
{
  "id": "ganh-som",
  "meta": {
    "title": "Gành Sớm - Nhà nghỉ trên mỏm gành phía nam Quy Nhơn",
    "description": "24 căn nhà trên mỏm gành phía nam Quy Nhơn, quay mặt ra biển hướng đông. Đặt trước 31/12/2026 cho kỳ nghỉ hè 2027: ở 4 đêm, chỉ trả 3.",
    "favicon": "images/favicon.svg"
  },
  "brand": { "name": "Gành Sớm", "logo": "images/logo.svg", "slogan": "Bình minh ngay hiên nhà" },
  "cta": { "label": "Đặt phòng ngay", "href": "#dat-phong", "note": "Từ 2.800.000 đồng một đêm" },
  "nav": [
    { "label": "Các hạng nhà", "href": "#hang-nha" },
    { "label": "Thư viện ảnh", "href": "#thu-vien" },
    { "label": "Ưu đãi", "href": "#uu-dai" },
    { "label": "Hỏi đáp", "href": "#hoi-dap" }
  ],
  "header": { "variant": "solid" },
  "contact": { "phone": "0123 456 789", "email": "dat-phong@ganhsom.clauki", "address": "Phía nam Quy Nhơn" },
  "place": { "name": "Quy Nhơn", "lat": 13.70, "lon": 109.23, "timezone": "Asia/Ho_Chi_Minh" },
  "sections": [
    { "type": "hero", "id": "gioi-thieu", "variant": "coverflow" },
    { "type": "stays", "id": "hang-nha", "variant": "headland" },
    { "type": "room-view", "id": "nhin-ra", "variant": "climb", "hidden": true },
    { "type": "features", "id": "trong-gia", "hidden": true, "variant": "numbered" },
    { "type": "gallery", "id": "thu-vien", "variant": "slices" },
    { "type": "intro", "id": "o-cham", "hidden": true },
    { "type": "offer", "id": "uu-dai", "variant": "postcard" },
    { "type": "faq", "id": "hoi-dap", "variant": "chat" },
    { "type": "booking", "id": "dat-phong", "variant": "stay" }
  ],
  "footer": { "variant": "card" },
  "credits": []
}
```

### Cần đội xác nhận

1. Gành Sớm giữ `stays` làm khối riêng, nên Bậc Trà không dùng `stays`; mỗi ngày trong lịch trình Bậc Trà ghi luôn đêm đó ngủ ở đâu.
2. Khối đặt chỗ có hai chế độ: Bậc Trà chọn chuyến khởi hành (`calendar`), Gành Sớm chọn khoảng ngày ở (`stay`).
