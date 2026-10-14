# SighGone: website chính (issue #88, #105)

## Thương hiệu
- **SighGone**, thư mục `brands/sighgone`. Đọc lên gần như "Sài Gòn"; khẩu hiệu *Every sigh, gone.*: đi một chuyến, thở phào.
- Công ty tour trong ngày quanh Sài Gòn, đổi nhiều cách đi: đi bộ, xích lô, xe đạp, xe máy có tài xế, thuyền, phà, ca nô, xe đưa đón.
- Nhóm tối đa 8 khách, đón ở trung tâm, không cần cọc. Tour riêng dự kiến cộng khoảng 30% so với tour ghép (#110).
- Khách chính: người ở tỉnh khác và khách công tác có nửa ngày trống, cặp đôi, nhóm bạn, gia đình.

## Màu và font
- Nền giấy báo cũ `#f2eee4`, nút vàng taxi `#ffcc1d`, chữ nhấn xanh biển số nhà `#1f4fbf`, mực `#111114`.
- Bricolage Grotesque cho tiêu đề, Be Vietnam Pro cho chữ thường, Bungee (chữ bảng hiệu) cho dòng nhấn.
- Tương phản ghi ở đầu `theme.css`, đều đạt AA.

## Sản phẩm (`catalog`, 7 tour)
| id | Tour | Phương tiện chính | Giờ | Giá một khách |
|---|---|---|---|---|
| `thuc-giac` | Sài Gòn thức giấc | đi bộ | 06:30 đến 09:30 | 390.000 |
| `cho-lon` | Hẻm Chợ Lớn | xích lô | 07:00 đến 11:00 | 590.000 |
| `thanh-da` | Đạp xe Thanh Đa | xe đạp, đò | 15:00 đến 18:00 | 490.000 |
| `song-chieu` | Sông Sài Gòn chiều | thuyền | 16:30 đến 19:30 | 690.000 |
| `len-den` | Sài Gòn lên đèn | xe máy | 18:00 đến 22:00 | 890.000 |
| `cu-chi` | Củ Chi sớm | xe | 06:00 đến 12:30 | 790.000 |
| `can-gio` | Rừng Sác Cần Giờ | xe, phà, ca nô | 07:00 đến 17:00 | 1.290.000 |

Mỗi tour có `stages` (giờ, nơi, phương tiện, ảnh), `includes`, `excludes`, `bring`, `availability` (chỗ còn theo ngày).

## Sơ đồ trang
| Đường dẫn | Nội dung hiện tại | Issue |
|---|---|---|
| `/` | hero, giới thiệu, bảy cách đi, khách kể | #108 |
| `dat-tour` | đặt tour Sài Gòn lên đèn (`booking calendar`) | #107 |
| `hoi-dap` | hỏi đáp kiểu nhắn tin chia bốn nhóm, bảng chính sách huỷ (`policy`) | #114 |
| `cam-nang` | đồng hồ 24 giờ (`clock`), mẹo mặc gì, tháng nào mưa, tránh giờ nào (`tips`) | #114 |
| `tour/can-gio`, `tour/len-den`, `tour/cho-lon` | chi tiết tour (`room-detail` đọc `catalog` qua `item`) | #112 |
| `tour`, `tour-rieng`, `dem-nay`, `gioi-thieu`, `lien-he`, `404` | mới có một đoạn giới thiệu, chưa lên menu | #109, #110, #113, #111, #114 |

Trang nào có khối thật thì thêm vào `nav` trong `content.json`.

## Kịch bản dẫn dắt
1. Trang chủ: thấy bảy cách đi, đọc khách kể, bấm "Đặt tour".
2. Kế hoạch: landing `dem-nay` một mục tiêu, header rút gọn, đi thẳng tới giữ chỗ (#113).
3. Kế hoạch: tour, chi tiết tour, đặt tour với tour đã chọn sẵn (#109, #107).

## Phần riêng của SighGone
- Hero `haze`: ảnh ngã tư Sài Gòn về đêm phủ sương, rê chuột để "thở ra", sương tan thì chữ "sigh" bay mất, con dấu "Đã thở ra".
- Footer: dây điện vắt ngang (`wires`), biển số nhà "8, Hẻm 42, Quận 1" ở cột điểm hẹn (`plate`).
- Logo: dấu hình biển số nhà xanh với ba vòng hơi thở bay lên, chữ SighGone (Bricolage Grotesque 800) đã đổi sang nét vẽ; điện thoại chỉ hiện dấu hình.
- Nút: viền mực, bóng in lệch, rê chuột thì nhấc lên (biến `--btn-*` trong `theme.css`).

Tour chưa có trang chi tiết (`thuc-giac`, `thanh-da`, `song-chieu`, `cu-chi`) không có `href` trong `catalog`, nên các khối tự bỏ liên kết tới chúng.
