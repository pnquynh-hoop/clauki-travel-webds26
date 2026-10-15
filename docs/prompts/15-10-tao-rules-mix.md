# 15/10 - Luật màu, component đặc trưng và trộn bộ cho phần tạo web bằng AI

- Người dùng AI: Gia Huy
- Công cụ: Claude Code (Claude Opus 5.5)
- Kết quả: PR #171

## Prompt (tóm tắt)

Phần tạo bằng AI cần cung cấp luật màu; component nào đặc trưng thì không được dùng; một web mới có thể trộn lẫn các component, không nhất thiết chung một bộ. Bổ sung: các section đặc trưng chỉ được dùng nếu phù hợp thật sự.

## Phần tự quyết định

- Lần đầu mình cấm hẳn các khối đặc trưng; bạn chỉnh lại thành "chỉ dùng khi phù hợp thật sự". Nên mỗi khối đặc trưng có một điều kiện phù hợp (`fit`); AI quyết định lúc lập hồ sơ (không thêm yêu cầu AI), mặc định không dùng, nghi ngờ thì không chọn.
- Riêng khối gắn với ảnh tách nền của thương hiệu khác (hero ride, stays headland) không bao giờ hợp với nơi khác nên cấm hẳn.
- Bỏ khối làm trang rỗng thì bỏ trang, và dọn mục menu và liên kết trỏ tới trang đó để không có liên kết chết.
- Trộn bộ: một yêu cầu AI nhỏ chọn kiểu của các khối ở trang chủ (hero, giới thiệu, thư viện ảnh, khách kể, hỏi đáp) và kiểu đầu trang trong các kiểu chung, kiểm lại bằng dữ liệu của khối (`variantsFor`), nên không bao giờ chọn kiểu mà dữ liệu không đủ; overlay chỉ cho khi hero là full.
- Luật màu viết vào lời nhắc và ép thêm bằng code (hạ độ bão hoà), vì AI hay vẫn chọn màu gắt.
- Chưa làm: thêm khối mới ngoài khung (ví dụ chèn thêm khối khách kể vào trang không có), vì cần dữ liệu mẫu cho từng khối.
