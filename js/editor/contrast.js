/* contrast.js - tỉ lệ tương phản WCAG giữa hai màu, dùng chung cho editor, tab AI và trình tạo web; và số đo OKLCH của một màu
   (độ sáng L, độ rực C, sắc độ H theo cảm nhận của mắt) để AI phối màu hiểu "chói", "nhạt", "ấm" thành số đo được. */

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

// OKLCH của mã hex 6 số (công thức OKLab của Björn Ottosson): L 0 tới 100, C 0 (xám) tới khoảng 0.37 (rực nhất), H độ 0 tới 360.
// Màu không phải hex thì null.
export function oklch(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(String(hex ?? ''))) return null;
  const [r, g, b] = hex.slice(1).match(/../g).map((x) => parseInt(x, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  return { l: Math.round(L * 100), c: Math.round(C * 1000) / 1000, h: C < 0.01 ? 0 : Math.round(((Math.atan2(B, A) * 180) / Math.PI + 360) % 360) };
}
