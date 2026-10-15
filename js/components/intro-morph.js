/* intro-morph.js - tiêu đề "đọc nhanh" của khối intro (trường morph: from, to, replay).
   Chữ from xếp trên các tấm lật như bảng ga; cuộn tới thì các dấu thanh tách khỏi chữ bay lên thành vòng hơi thở,
   rồi từng tấm lật sang chữ to. Ví dụ SÀI GÒN đọc nhanh thành SIGH GONE: tên thương hiệu tự giải thích.
   Trình đọc màn hình đọc nhãn của tiêu đề, bỏ qua các tấm. Bật giảm chuyển động thì hiện sẵn chữ to. */

const ALPHA = 'ABCDEGHIKLMNOPRSTUVY';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Dấu thanh nào nghiêng về đâu: sắc nghiêng phải, huyền nghiêng trái, dấu khác vẽ thành vạch ngang nhỏ.
const MARKS = { '́': 'acute', '̀': 'grave' };

// Mỗi từ một nhóm tấm; chữ to dài hơn thì có thêm tấm, ẩn tới lúc lật.
function wordEl(from, to) {
  const word = document.createElement('span');
  word.className = 'morph__word';
  const a = [...from];
  const b = [...to];
  const cells = Array.from({ length: Math.max(a.length, b.length) }, (_, i) => {
    const cell = document.createElement('span');
    cell.className = 'morph__cell';
    const ch = document.createElement('span');
    ch.className = 'morph__ch';
    ch.textContent = a[i] ?? '';
    cell.append(ch);
    if (a[i] === undefined) cell.classList.add('is-hidden', 'is-new');
    word.append(cell);
    return { cell, ch, from: a[i] ?? '', to: b[i] ?? '' };
  });
  return { word, cells };
}

// Bỏ dấu khỏi chữ, để lại dấu bay lên; mỗi dấu kéo theo ba vòng hơi thở.
function breathe(title, cells) {
  const box = title.getBoundingClientRect();
  let k = 0;
  cells.forEach(({ cell, ch, from }) => {
    const parts = from.normalize('NFD');
    if (parts.length < 2) return;
    ch.textContent = parts[0];
    [...parts.slice(1)].forEach((m) => {
      const mark = document.createElement('span');
      mark.className = `morph__mark morph__mark--${MARKS[m] ?? 'bar'}`;
      mark.addEventListener('animationend', () => mark.remove());
      cell.append(mark);
      const r = cell.getBoundingClientRect();
      for (let n = 0; n < 3; n++) {
        const ring = document.createElement('span');
        ring.className = 'morph__ring';
        ring.style.left = `${r.left - box.left + r.width / 2}px`;
        ring.style.top = `${r.top - box.top}px`;
        ring.style.animationDelay = `${n * 180 + k * 90}ms`;
        ring.addEventListener('animationend', () => ring.remove());
        title.append(ring);
      }
      k += 1;
    });
  });
}

// Tấm nào khác chữ thì quay vài vòng chữ ngẫu nhiên rồi dừng; tấm sau quay lâu hơn tấm trước.
function flip(cells, delay) {
  return Promise.all(cells.map(async ({ cell, ch, to }, i) => {
    await wait(delay);
    cell.classList.remove('is-hidden');
    if (ch.textContent === to) return;
    const spins = 5 + i * 3;
    for (let s = 0; s < spins; s++) {
      cell.classList.remove('is-flip');
      void cell.offsetWidth;
      ch.textContent = s === spins - 1 ? to : ALPHA[Math.floor(Math.random() * ALPHA.length)];
      cell.classList.add('is-flip');
      await wait(55);
    }
  }));
}

// Trả về tiêu đề h2 và hàm chạy; hàm chạy dựng lại tấm từ đầu nên bấm xem lại bao nhiêu lần cũng được.
export function morphTitle(morph, label) {
  const title = document.createElement('h2');
  title.className = 'intro__title morph';
  title.setAttribute('aria-label', label || `${morph.from}, ${morph.to}`);
  const fromWords = String(morph.from).toUpperCase().split(/\s+/);
  const toWords = String(morph.to).toUpperCase().split(/\s+/);

  let run = 0;
  async function play() {
    const id = ++run;
    const words = fromWords.map((w, i) => wordEl(w, toWords[i] ?? ''));
    const box = document.createElement('span');
    box.className = 'morph__words';
    box.setAttribute('aria-hidden', 'true');
    box.append(...words.map((w) => w.word));
    title.replaceChildren(box);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      words.forEach((w) => w.cells.forEach(({ cell, ch, to }) => { ch.textContent = to; cell.classList.remove('is-hidden'); }));
      return;
    }
    await wait(700);
    if (id !== run) return;
    breathe(title, words.flatMap((w) => w.cells));
    await wait(450);
    if (id !== run) return;
    await Promise.all(words.map((w, i) => flip(w.cells, i * 250)));
  }

  return { title, play };
}
