/* core.js - lõi white label:
   1. đọc ?brand= trên địa chỉ, chỉ nhận id có trong brands/brands.json (không có thì dùng "default");
   2. nạp brands/<id>/content.json, đổi href của <link id="brand-theme"> thành brands/<id>/theme.css;
   3. điền tiêu đề, mô tả, favicon;
   4. dựng các section trong <main> theo đúng thứ tự mảng "sections", bỏ qua section có "hidden": true;
   5. truyền dữ liệu cho từng component qua el.data. */
