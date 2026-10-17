/* speech.js - nút "Nói": nói tiếng Việt thay vì gõ (Web Speech API, có ở Chrome, Edge).
   Bấm Nói thì bắt đầu nghe, nút thành Dừng (bấm để dừng ngay; trình duyệt cũng tự dừng khi người nói ngừng một lúc).
   Chữ nghe được nối sau chữ đã có trong ô, không xoá chữ đã gõ, và báo sự kiện input như khi gõ để nơi gọi (đếm chữ,
   nhớ chữ đang soạn) biết ô đã đổi. Không nghe được (chưa cho phép micro, không có micro, mất mạng tới dịch vụ giọng nói
   của trình duyệt) thì ghi lý do ngay cạnh nút thay vì im lặng trở về Nói.
   Trả về một khối display: contents gồm nút và dòng báo, nên nơi gọi đặt vào hàng nút như một nút thường.
   Trình duyệt không hỗ trợ thì trả về null, nơi gọi bỏ qua nút. */
import { iconEl } from '../core/icon.js';

// Mã lỗi của Web Speech API sang câu báo ngắn.
const ERRORS = {
  'not-allowed': 'Chưa được phép dùng micro',
  'service-not-allowed': 'Trình duyệt không cho nhận giọng nói',
  'audio-capture': 'Không tìm thấy micro',
  network: 'Không kết nối được dịch vụ nhận giọng nói',
  'no-speech': 'Chưa nghe thấy tiếng nói',
  'language-not-supported': 'Trình duyệt chưa nhận được tiếng Việt',
};

export function micButton(h, target) {
  const Speech = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!Speech) return null;
  // Dựng sẵn cả hai trạng thái (icon micro và chữ Nói, icon dừng và chữ Dừng) chồng lên nhau, CSS chỉ ẩn hiện theo .is-on:
  // nút luôn rộng bằng chữ dài hơn nên không co giãn đẩy các nút bên cạnh, và icon dừng đã tải sẵn trước lần bấm đầu.
  const button = h('button', { type: 'button', class: 'ed-btn ed-btn--ghost ed-btn--icon ed-mic' },
    iconEl('mic', 'ed-icon ed-mic__mic'), iconEl('square', 'ed-icon ed-mic__stop'),
    h('span', { class: 'ed-mic__label' }, h('span', { text: 'Nói' }), h('span', { text: 'Dừng' })));
  const note = h('span', { class: 'ed-mic__note', role: 'status' });
  let rec = null;
  const show = (listening) => button.classList.toggle('is-on', listening);
  button.addEventListener('click', () => {
    // Đang nghe thì bấm là dừng; onend bên dưới trả nút về Nói.
    if (rec) {
      rec.stop();
      return;
    }
    note.textContent = '';
    rec = new Speech();
    rec.lang = 'vi-VN';
    rec.interimResults = true;
    const before = target.value.trim();
    rec.onresult = (e) => {
      const said = [...e.results].map((r) => r[0].transcript).join(' ').trim();
      target.value = [before, said].filter(Boolean).join(' ');
      target.dispatchEvent(new Event('input', { bubbles: true }));
    };
    // Bấm Dừng thì trình duyệt báo lỗi "aborted": người dùng tự dừng, không báo gì.
    rec.onerror = (e) => {
      if (e.error === 'aborted') return;
      note.textContent = ERRORS[e.error] ?? `Không nghe được (${e.error})`;
    };
    // Sau lỗi trình duyệt cũng gọi onend, nên chỉ cần trả nút về ở đây.
    rec.onend = () => {
      rec = null;
      show(false);
    };
    try {
      rec.start();
      show(true);
    } catch (err) {
      rec = null;
      note.textContent = `Không bật được micro (${err.message})`;
    }
  });
  return h('span', { class: 'ed-mic-wrap' }, button, note);
}
