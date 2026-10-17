/* theme-mode.js - chế độ sáng, tối của trang.
   Thương hiệu có bảng màu tối khi theme.css (hoặc nháp "Thử chỉnh") khai các biến --dark-<tên biến>, ví dụ --dark-color-bg
   cho --color-bg. Bật chế độ tối thì mỗi biến --dark-* có khai đè lên biến cùng tên; biến không có bản tối giữ màu sáng.
   Đè bằng style trên thẻ <html> để thắng cả theme.css lẫn biến của nháp (nháp cũng gán trên <html>).
   Có bảng màu tối thì <html> có data-modes="dark" để header hiện nút đổi; data-mode là chế độ đang dùng.
   Lựa chọn nhớ ở localStorage cho mọi thương hiệu; lần đầu là sáng, vì đó là màu chính của thương hiệu. */
import { applyDraftTheme } from '../editor/draft.js';

const KEY = 'clauki-mode';
export const MODE_EVENT = 'wl:mode';
// Các biến có thể có bản tối: bảy màu bắt buộc và các biến tuỳ chọn liên quan tới màu (AGENTS.md mục 5).
export const MODE_VARS = [
  '--color-primary', '--color-on-primary', '--color-bg', '--color-surface', '--color-ink', '--color-muted', '--color-accent',
  '--color-tint', '--color-mark', '--card-border', '--card-shadow', '--btn-border', '--btn-shadow', '--btn-shadow-hover',
  '--eyebrow-color',
];
export const darkName = (name) => `--dark-${name.slice(2)}`;

let theme = null;
let applied = [];
let watching = false;

export function readMode() {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function saveMode(mode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // Bộ nhớ bị chặn thì chỉ đổi cho lần xem này.
  }
}

// Thương hiệu có bảng màu tối không: đủ biến nền tối là có (biến khác thiếu thì giữ màu sáng).
export function hasDark() {
  return getComputedStyle(document.documentElement).getPropertyValue(darkName('--color-bg')).trim() !== '';
}

// Gán lại toàn bộ: gỡ màu tối đã đè, trả biến của nháp về đúng giá trị sáng, rồi đè màu tối nếu đang ở chế độ tối.
export function applyMode() {
  const root = document.documentElement;
  applied.forEach((name) => root.style.removeProperty(name));
  applied = [];
  applyDraftTheme(theme);
  const available = hasDark();
  const dark = available && readMode() === 'dark';
  if (available) root.dataset.modes = 'dark';
  else delete root.dataset.modes;
  root.dataset.mode = dark ? 'dark' : 'light';
  if (dark) {
    const style = getComputedStyle(root);
    // Chép màu sáng ra --light-* trước khi đè: vật vốn sáng ngoài đời (giấy note, vé, chữ trên ảnh) dùng lại bảng sáng
    // trong chế độ tối (css/site/theme-mode.css).
    const lights = MODE_VARS.map((name) => [name, style.getPropertyValue(name).trim()]);
    lights.forEach(([name, value]) => {
      if (!value) return;
      root.style.setProperty(`--light-${name.slice(2)}`, value);
      applied.push(`--light-${name.slice(2)}`);
    });
    MODE_VARS.forEach((name) => {
      const value = style.getPropertyValue(darkName(name)).trim();
      if (!value) return;
      root.style.setProperty(name, value);
      applied.push(name);
    });
    // Ô nhập, thanh cuộn của trình duyệt cũng theo nền tối.
    root.style.setProperty('color-scheme', 'dark');
    applied.push('color-scheme');
  }
  document.dispatchEvent(new CustomEvent(MODE_EVENT, { detail: { mode: dark ? 'dark' : 'light', available } }));
}

// core.js gọi mỗi lần dựng trang với theme của nháp (hoặc null). theme.css nạp xong sau đó thì tính lại,
// vì biến --dark-* của thương hiệu chỉ có khi tệp đã tải.
export function applyTheme(next) {
  theme = next ?? null;
  if (!watching) {
    watching = true;
    document.getElementById('brand-theme')?.addEventListener('load', applyMode);
    // Editor đổi chế độ xem trước trong khung bằng sự kiện này (không cần chung bộ nhớ với trang).
    document.addEventListener('wl:set-mode', (e) => setMode(e.detail));
  }
  applyMode();
}

export function setMode(mode) {
  saveMode(mode === 'dark' ? 'dark' : 'light');
  applyMode();
}

export function toggleMode() {
  setMode(readMode() === 'dark' ? 'light' : 'dark');
}
