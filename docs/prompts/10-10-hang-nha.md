# 10/10 - Khối các hạng nhà (#16), kiểu `headland` cho Gành Sớm (làm từ kiểu `sunrise` rồi đổi dần)

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: commit 3fc7d91, 9f4e595, 75a9d3d (đã gom từ nhiều lần sửa, các mục dưới ghi lại từng lần)

## Prompt (tóm tắt)

Bạn là kỹ sư frontend kiêm người thiết kế giao diện. Trang Gành Sớm chưa có chi tiết nào về mỏm gành. Hãy làm khối `stays` (#16)
thành cảnh "bình minh trên mỏm gành":

1. tìm ảnh thật một mỏm đá nhô ra biển nhìn ngang, giấy phép dùng được, rồi tách nền (bỏ trời và biển);
   ghi đúng nơi chụp trong nguồn ảnh, không nói đó là mỏm gành của Gành Sớm;
2. trời, mặt trời, biển vẽ bằng CSS, chỉ pha từ biến màu; cuộn tới đâu mặt trời nhô lên tới đó, trời từ tối sang ráng cam
   rồi sáng hẳn, ảnh mỏm đá từ bóng đen sáng dần; màn rộng thì cảnh ghim lại trong lúc cuộn;
3. mốc ba hạng nhà nằm trên ảnh mỏm đá (nhà đồi trên đỉnh, phòng vườn giữa sườn, villa sát mép nước), sáng lần lượt
   từ cao xuống thấp; bấm mốc thì thẻ bên cạnh hiện ảnh, số căn, diện tích, sức chứa, giá;
4. nút "đặt hạng này" chọn sẵn hạng đó trong khối đặt chỗ;
5. không có `variant` thì hiện lưới thẻ cơ bản; bật giảm chuyển động thì cảnh sáng sẵn, không ghim.

Yêu cầu: kiểm ở 390px, 1366x768 và 1440x900; khung chữ không che mỏm đá.

## Làm lại cho đẹp hơn (tóm tắt prompt)

Bản trời vẽ bằng CSS ra màu nâu xám đục, mặt trời tròn phẳng như hình vẽ. Dùng ảnh trời và biển thật làm nền:
ảnh trời tím trước bình minh chuyển dần sang ảnh mặt trời mọc theo cuộn (lật ngang hai ảnh để mặt trời không bị mỏm đá che,
ghi rõ trong nguồn ảnh); tiêu đề chữ sáng góc trên, thông tin hạng nhà trong thẻ kính tối góc dưới, chừa giữa cho mặt trời.

## Sửa cho đỡ rối (tóm tắt prompt)

Khách vừa chọn hạng nhà vừa cuộn thì trời đổi buổi, hai việc không liên quan nên rối. Cho bình minh chạy một lần khi khối
hiện ra rồi đứng yên (có nút xem lại, không ghim màn hình); việc của khách chỉ là chọn hạng: bấm mốc thì cảnh phóng gần về
chỗ hạng đó trên mỏm đá.

## Gộp với khối nhìn từ ban công, ảnh nét hơn (tóm tắt prompt)

Khối các hạng nhà và khối nhìn từ ban công cùng kể về ba hạng nên bị trùng. Gộp lại: thẻ của mỗi hạng dùng ảnh cảnh nhìn ra
từ ban công, kèm câu tả cảnh và giờ đẹp nhất; ẩn khối `room-view` của Gành Sớm, mục menu của nó đổi thành Thư viện ảnh.
Ảnh trời đang mờ: xuất lại từ ảnh gốc với độ phân giải cao hơn, giữ đường chân trời hai ảnh trùng nhau.

## Một ảnh biển nét làm nền (tóm tắt prompt)

Nền chỉ cần một ảnh biển lúc mặt trời mọc, thật nét, không có đồi hay đất liền. Tìm ảnh có giấy phép dùng được, cắt khung
cho vùng sáng nằm giữa khung chữ và mỏm đá, bỏ hai ảnh trời cũ. Kiểm lại ở 1366x768: thẻ hạng nhà nào cũng phải nằm gọn trong cảnh.

## Ảnh cảnh nhìn ra ngay trên mốc, bỏ ảnh nền (tóm tắt prompt)

Ảnh cảnh nhìn ra trong thẻ còn bé quá; ảnh cần nằm ngay trên mốc. Mỏm đá đã tách nền thì không cần ảnh nền: đặt thẳng lên
nền màu cát của trang. Bỏ luôn hiệu ứng bình minh, nút xem lại và phóng gần vì không còn trời; đổi tên kiểu thành `headland`.
Bấm mốc thì khung ảnh cảnh nhìn ra (kèm câu tả cảnh, giờ đẹp nhất) hiện ngay phía trên mốc, có vạch nối xuống mốc; thẻ bên
trái chỉ còn tên, mô tả, các con số, giá. Kiểm ở 360px, 390px, 820px, 1280x720, 1366x768, 1920x1080: khung ảnh không bị cắt.
Sửa thêm: ở màn rộng mà thấp (hoặc trình duyệt phóng to) mép trên khung ảnh bị cắt. Cảnh chừa sẵn phía trên mỏm đá theo
bề ngang khung ảnh; màn rộng xếp hai cột (tiêu đề và thẻ bên trái, cảnh bên phải) thay cho đặt đè theo chiều cao màn hình.
Mốc đang chọn ẩn tên hạng (vẫn giữ tên cho trình đọc màn hình), để vạch nối chạy thẳng xuống chấm.

## Phần tự quyết định

- Đưa chi tiết mỏm gành vào khối các hạng nhà.
- Bỏ bản sơ đồ vẽ nét; yêu cầu ảnh thật tách nền đặt thật to.
- Thấy chỉ đặt ảnh và ba mốc thì chưa thú vị, chọn hướng cảnh bình minh chạy theo cuộn.
- Thấy bản đầu sáng tạo nhưng chưa đẹp, yêu cầu làm lại cho đẹp hơn.
- Thấy chọn hạng mà cuộn lại đổi buổi thì rối, yêu cầu sửa.
- Thấy hai khối các hạng nhà và nhìn từ ban công trùng nhau, đồng ý gộp.
- Yêu cầu ảnh nét hơn.
- Yêu cầu nền chỉ một ảnh biển nét, không có đồi.
- Thấy ảnh cảnh nhìn ra còn bé, yêu cầu đặt ảnh ngay trên mốc.
- Đề xuất bỏ ảnh nền vì mỏm đá đã tách nền.
- Yêu cầu ẩn tên của mốc đang chọn.
