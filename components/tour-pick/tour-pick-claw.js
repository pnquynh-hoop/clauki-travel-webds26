/* tour-pick-claw.js - kiểu claw của <wl-tour-pick>: máy gắp thú vẽ bằng CSS. Trong tủ kính là đống viên nang tròn,
   mỗi viên chứa ảnh một tour của các lựa chọn (options); bấm gắp thì móc chạy tới viên trúng, thả dây xuống, khép móc,
   kéo lên, chạy về ô nhả quà rồi thả rơi, xong mới hiện thẻ tour. Máy chỉ để nhìn (aria-hidden): kết quả đọc qua
   dòng ghi chú. */
import { asset } from '../../js/core/core.js';
import { textEl, groupEl } from '../../js/core/dom.js';

// Thời gian từng bước (ms), khớp với transition trong tour-pick.css.
const MOVE = 700;
const DROP = 500;
const CLOSE = 250;
const FALL = 450;

function span(className) {
  const el = document.createElement('span');
  el.className = className;
  return el;
}

// Viên nang: khung tròn viền mực chứa ảnh tour; tour chưa có ảnh thì là viên trơn màu theo tông.
function capsuleEl(tour, tone) {
  const capsule = document.createElement('span');
  capsule.className = 'tour-pick__prize';
  capsule.dataset.tone = String(tone);
  if (tour.image?.src) {
    const img = document.createElement('img');
    img.src = asset(tour.image.src);
    img.alt = '';
    img.loading = 'lazy';
    capsule.append(img);
  }
  return capsule;
}

// Dựng máy: biển tên, tủ kính (thanh ray, móc gắp, đống viên nang), phần đế (nút trang trí, ô nhả quà).
// prizes là danh sách { option, tour }, mỗi tour một viên. Trả về các phần cần điều khiển khi gắp.
export function machineEl(prizes, sign) {
  const claw = span('tour-pick__claw');
  const cable = span('tour-pick__cable');
  const held = span('tour-pick__held');
  claw.append(cable, span('tour-pick__head'), span('tour-pick__prong tour-pick__prong--l'), span('tour-pick__prong tour-pick__prong--r'), held);

  // Ba tông màu xoay vòng làm viền trong của viên nang; viên móc đang giữ là bản sao của viên gốc.
  const capsules = prizes.map((prize, i) => capsuleEl(prize.tour, i % 3));
  const glass = groupEl('tour-pick__glass', [span('tour-pick__rail'), claw, groupEl('tour-pick__prizes', capsules)]);
  const chute = span('tour-pick__chute');
  const base = groupEl('tour-pick__base', [chute, groupEl('tour-pick__knobs', [span('tour-pick__knob'), span('tour-pick__knob'), span('tour-pick__stick')])]);
  const machine = groupEl('tour-pick__machine', [textEl('p', 'tour-pick__sign', sign), glass, base]);
  machine.setAttribute('aria-hidden', 'true');
  return { machine, glass, claw, cable, held, chute, prizes: capsules };
}

// Toạ độ ngang của tâm một phần tử, tính từ mép trái tủ kính, để đặt móc thẳng trên nó.
function centerX(el, glass) {
  const box = el.getBoundingClientRect();
  return box.left + box.width / 2 - glass.getBoundingClientRect().left;
}

// Chạy cả lượt gắp viên thứ index; xong thì gọi done(). Trả về danh sách hẹn giờ để khối huỷ khi bị gỡ khỏi trang.
// Giảm chuyển động thì bỏ hết bước chạy, gọi done() ngay.
export function grab(parts, index, animate, done) {
  const { glass, claw, cable, held, chute, prizes } = parts;
  prizes.forEach((prize) => prize.classList.remove('is-taken'));
  held.classList.remove('is-dropping');
  claw.classList.remove('is-holding', 'is-closed');
  if (!animate) {
    done();
    return [];
  }
  const prize = prizes[index];
  // Độ dài dây khi thả: từ thanh ray tới đỉnh viên quà, trừ phần đầu móc.
  const reach = prize.getBoundingClientRect().top - glass.getBoundingClientRect().top - 34;
  const steps = [
    [0, () => { claw.style.left = `${centerX(prize, glass)}px`; }],
    [MOVE, () => { cable.style.height = `${Math.max(16, reach)}px`; }],
    [MOVE + DROP, () => {
      claw.classList.add('is-closed', 'is-holding');
      held.dataset.tone = prize.dataset.tone;
      held.replaceChildren(...[...prize.children].map((child) => child.cloneNode(true)));
      prize.classList.add('is-taken');
    }],
    [MOVE + DROP + CLOSE, () => { cable.style.height = ''; }],
    [MOVE + DROP * 2 + CLOSE, () => { claw.style.left = `${centerX(chute, glass)}px`; }],
    [MOVE * 2 + DROP * 2 + CLOSE, () => {
      claw.classList.remove('is-closed');
      held.classList.add('is-dropping');
    }],
    [MOVE * 2 + DROP * 2 + CLOSE + FALL, () => {
      claw.classList.remove('is-holding');
      done();
    }],
  ];
  return steps.map(([at, step]) => setTimeout(step, at));
}
