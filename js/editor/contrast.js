/* contrast.js - tỉ lệ tương phản WCAG giữa hai màu, dùng chung cho editor, tab AI và trình tạo web. */

// Nhận mã hex 6 số và 3 số (#fff); màu dạng khác (rgb, color-mix) thì không đo được, trả về null.
function luminance(hex) {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(String(hex ?? '').trim());
  if (!m) return null;
  const six = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  const channels = six.match(/../g).map((x) => parseInt(x, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export const AA = 4.5;

export function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
