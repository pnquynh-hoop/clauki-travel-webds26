/* speech.js - nút "Nói": nói tiếng Việt thay vì gõ (Web Speech API, có ở Chrome, Edge).
   Trình duyệt không hỗ trợ thì trả về null, nơi gọi bỏ qua nút. */

export function micButton(h, target) {
  const Speech = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!Speech) return null;
  const button = h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', text: 'Nói' });
  const idle = () => { button.textContent = 'Nói'; };
  button.addEventListener('click', () => {
    const rec = new Speech();
    rec.lang = 'vi-VN';
    rec.interimResults = true;
    button.textContent = 'Đang nghe...';
    rec.onresult = (e) => { target.value = [...e.results].map((r) => r[0].transcript).join(' '); };
    rec.onend = idle;
    rec.onerror = idle;
    rec.start();
  });
  return button;
}
