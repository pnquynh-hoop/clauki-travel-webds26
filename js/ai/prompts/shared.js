/* shared.js - phần lời nhắc dùng chung cho mọi lượt gọi Gemini (#175): luật viết, câu từ chối, định dạng nhiều dòng.
   Các tệp cùng thư mục là lời nhắc của từng phần: create.js (trình tạo web /tao), editor.js (tab AI, gợi ý màu),
   translate.js (dịch, soát bản tiếng Anh). Tệp lời nhắc chỉ nhận dữ liệu và trả chuỗi: không gọi AI, không đọc trang.
   Code gọi AI chỉ ghép dữ liệu và xử lý kết quả. Sửa lời nhắc xong thì tạo thử vài site ở /tao, so với trước. */

// Ba luật lặp lại ở mọi lời nhắc có viết chữ cho trang (tạo web, sửa bằng lời, tinh chỉnh mô tả, dịch).
export const NO_MARKS = 'Không dùng dấu chấm giữa hay gạch dài làm dấu ngăn, không HTML.';
export const NO_CLICHES = 'Không cụm sáo rỗng như "trải nghiệm tuyệt vời", "đẳng cấp", "hàng đầu", "không thể bỏ qua"';
export const NO_INVENT = 'Không bịa tiện nghi, con số, số lượt khách hay điểm đánh giá';

// Câu trả về khi mô tả không phải du lịch, lưu trú (lập hồ sơ, tinh chỉnh mô tả); code đọc khoá tuChoi.
export const REFUSE = 'Mô tả không liên quan tới du lịch, lưu trú, hoặc có nội dung không phù hợp thì chỉ trả {"tuChoi": "lý do ngắn, lịch sự, kèm gợi ý cách viết lại"}.';

// Định dạng "số|vị trí|chữ" của các lượt trả nhiều dòng (viết chữ, dịch): code kiểm vị trí khớp số rồi mới áp.
export function lineFormat(count, value) {
  return `Trả về đúng ${count} dòng, mỗi dòng dạng: số|vị trí|${value}
Chép lại đúng số và vị trí như đầu vào, theo đúng thứ tự, không thêm chữ nào khác, không xuống dòng trong một giá trị.`;
}

// Kiểu đầu trang cho AI chọn khi tạo web (lập hồ sơ, chọn kiểu trình bày).
export const HEADER_HINT = '"solid" (nền trang), "center" (tên ở giữa), "overlay" (trong suốt đè lên ảnh, chỉ hợp khi hero là kiểu "full")';
