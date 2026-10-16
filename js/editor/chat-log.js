/* chat-log.js - lịch sử nhờ AI trong editor (#201): tab AI (kind "ai") và khung chat gợi ý màu (kind "palette") mỗi bên một
   lịch sử riêng, theo từng thương hiệu hay site (localStorage clauki-ai-log:<id>), nên tải lại trang hay mở lại editor vẫn còn.
   Mỗi lượt: câu đã gõ, câu tóm tắt của AI, các thay đổi AI đề xuất (dạng gọn "chỗ: cũ -> mới"), trạng thái (đã áp, bỏ, lỗi,
   chưa áp), model đã dùng và giờ. Lưu tối đa KEEP lượt; khi nhờ tiếp chỉ gửi SEND lượt gần nhất (cắt lượt cũ trước cho vừa SEND_CHARS ký tự)
   để AI hiểu những câu như "đổi lại như lúc nãy". Chỉ lưu những gì đã gửi AI, không có dữ liệu khách hay đơn đặt chỗ.
   Bộ nhớ bị chặn thì vẫn chat được, chỉ không lưu. */

const PREFIX = 'clauki-ai-log:';
const KEEP = 50;
const SEND = 5;
const SEND_CHARS = 2000;
const STATUS = { applied: 'đã áp', rejected: 'đã bỏ', proposed: 'chưa áp', error: 'lỗi', empty: 'không có thay đổi', reset: 'về bản gốc' };

function readAll(id) {
  try {
    const data = JSON.parse(localStorage.getItem(PREFIX + id) ?? 'null');
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function writeAll(id, data) {
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify(data));
  } catch {
    // Bộ nhớ bị chặn hay đầy: bỏ qua, lịch sử chỉ không được lưu.
  }
}

export function readLog(id, kind) {
  const list = readAll(id)[kind];
  return Array.isArray(list) ? list : [];
}

export function addTurn(id, kind, turn) {
  if (!id) return;
  const data = readAll(id);
  data[kind] = [...(data[kind] ?? []), { at: new Date().toISOString(), ...turn }].slice(-KEEP);
  writeAll(id, data);
}

// Đổi trạng thái lượt cuối (bấm Đồng ý hay Bỏ sau khi AI trả lời).
export function markLast(id, kind, status) {
  const data = readAll(id);
  const last = data[kind]?.at(-1);
  if (!last) return;
  last.status = status;
  writeAll(id, data);
}

export function clearLog(id, kind = null) {
  if (!id) return;
  if (!kind) {
    try {
      localStorage.removeItem(PREFIX + id);
    } catch {
      // Không xoá được thì thôi.
    }
    return;
  }
  const data = readAll(id);
  delete data[kind];
  writeAll(id, data);
}

// Đoạn gửi kèm cho AI: SEND lượt gần nhất, cũ tới mới, mỗi lượt một dòng gọn; dài quá SEND_CHARS thì bỏ dần lượt cũ.
export function contextText(turns) {
  const lines = turns.slice(-SEND).map((t) => {
    const changes = (t.changes ?? []).join('; ');
    return `- Người dùng: "${t.text}". AI: ${t.say || '(không có tóm tắt)'}${changes ? `. Thay đổi: ${changes}` : ''}. Trạng thái: ${STATUS[t.status] ?? t.status}.`;
  });
  while (lines.length > 1 && lines.join('\n').length > SEND_CHARS) lines.shift();
  return lines.length ? `Các lượt trước trong phiên chỉnh này (cũ tới mới):\n${lines.join('\n')}\n\n` : '';
}

const time = (iso) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
};

// Khối "Lịch sử" gập sẵn dưới khung chat; onPick(text) để bấm vào một lượt thì chép lại câu đã gõ vào ô nhập.
export function historyEl(h, turns, { onClear, onPick } = {}) {
  if (!turns.length) return null;
  return h('details', { class: 'ed-history' },
    h('summary', { text: `Lịch sử nhờ AI (${turns.length})` }),
    h('ol', { class: 'ed-history__list' }, [...turns].reverse().map((t) => h('li', { class: `ed-history__item is-${t.status}` },
      h('p', { class: 'ed-history__meta' }, h('span', { text: time(t.at) }), t.model ? h('span', { text: t.model }) : null,
        h('span', { class: 'ed-history__status', text: STATUS[t.status] ?? t.status })),
      onPick && t.status !== 'reset'
        ? h('button', { type: 'button', class: 'ed-history__text', title: 'Chép lại vào ô yêu cầu', onclick: () => onPick(t.text), text: t.text })
        : h('p', { class: 'ed-history__text', text: t.text }),
      t.say ? h('p', { class: 'ed-hint', text: t.say }) : null,
      t.changes?.length ? h('ul', { class: 'ed-history__changes' }, t.changes.map((c) => h('li', { text: c }))) : null))),
    onClear ? h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', onclick: onClear, text: 'Xoá lịch sử' }) : null);
}
