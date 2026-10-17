/* host-tv.js - kiểu "tv" của khối host: một chiếc tivi đời cũ kể các câu chuyện ngắn về chủ nhà.
   Khối ghim trên màn hình trong lúc cuộn; quãng cuộn chia thành các nấc:
   nấc 0 tivi tắt; lướt tới nấc 1 thì nút nguồn lún xuống, tivi bật (vệt sáng bung thành hình), chiếu chuyện 1;
   mỗi nấc sau nút kênh kế tiếp lún xuống, sáng lên, màn hình nhiễu sóng một nhịp rồi sang chuyện mới;
   nấc cuối nút nguồn lún xuống, tivi tắt (thu về vệt rồi chấm sáng), khối thả ra để cuộn tiếp.
   Bấm nút kênh, nút nguồn cũng được: trang cuộn tới đúng nấc đó, nên cuộn và bấm luôn khớp nhau.
   Bật giảm chuyển động thì không ghim, tivi bật sẵn, bấm nút để đổi chuyện, không có hiệu ứng.
   Tivi vẽ bằng CSS, màu pha từ biến của thương hiệu; chữ và ảnh lấy từ section.stories và section.tv. */
import { asset } from '../core/core.js';
import { textEl, groupEl, clamp } from '../core/dom.js';

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Điền mẫu chữ: {n} thay bằng values.n.
const fill = (template, values) => String(template ?? '').replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');

const pad = (n) => String(n).padStart(2, '0');

// Ảnh nhiễu sóng: vẽ một lần các chấm xám ngẫu nhiên lên canvas nhỏ, dùng làm nền lặp của lớp nhiễu.
// Nhỏ (96 x 72) nên vẽ rất nhanh; CSS dịch vị trí nền theo từng bước để nhiễu nhấp nháy.
function noiseUrl() {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 72;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(canvas.width, canvas.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

function imageEl(image, className) {
  if (!image?.src) return null;
  const img = document.createElement('img');
  img.className = className;
  img.src = asset(image.src);
  img.alt = image.alt ?? '';
  img.loading = 'lazy';
  return img;
}

function quoteEl(quote) {
  if (!quote?.text) return null;
  const figure = document.createElement('figure');
  figure.className = 'host-tv__quote';
  const block = document.createElement('blockquote');
  block.append(textEl('p', 'host-tv__quote-text', quote.text));
  figure.append(block);
  const by = textEl('figcaption', 'host-tv__quote-by', quote.by);
  if (by) figure.append(by);
  return figure;
}

// Thân tivi: màn hình (các ảnh chồng nhau, lớp nhiễu, vạch quét, ánh phản chiếu) và cột bên có núm vặn, lưới loa, đèn nguồn.
function setEl(stories) {
  const pictures = stories.map((story) => imageEl(story.image, 'host-tv__picture') ?? document.createElement('span'));
  const picture = groupEl('host-tv__pictures', pictures);
  const layer = (className) => {
    const el = document.createElement('div');
    el.className = className;
    el.setAttribute('aria-hidden', 'true');
    return el;
  };
  const noise = layer('host-tv__static');
  noise.style.setProperty('--noise', `url(${noiseUrl()})`);
  const screen = groupEl('host-tv__screen', [picture, noise, layer('host-tv__scan'), layer('host-tv__glare')]);
  const led = layer('host-tv__led');
  const side = layer('host-tv__side');
  side.append(layer('host-tv__knob'), layer('host-tv__knob'), layer('host-tv__grill'), led);
  const set = groupEl('host-tv__set', [groupEl('host-tv__cabinet', [groupEl('host-tv__bezel', [screen]), side]), layer('host-tv__legs')]);
  return { set, screen, pictures, noise, led };
}

// Bảng điều khiển: nút kênh (ảnh nhỏ kèm số) và nút nguồn, kèm hai dòng gợi ý.
function remoteEl(stories, tv, onChannel, onPower) {
  const channels = stories.map((story, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'host-tv__channel';
    button.setAttribute('aria-label', fill(tv.channel, { n: i + 1, title: story.title }));
    button.setAttribute('aria-pressed', 'false');
    const thumb = story.image?.src ? imageEl({ src: story.image.src, alt: '' }, 'host-tv__thumb') : null;
    button.append(...[thumb, textEl('span', 'host-tv__channel-num', pad(i + 1))].filter(Boolean));
    button.addEventListener('click', () => onChannel(i + 1));
    return button;
  });
  const power = document.createElement('button');
  power.type = 'button';
  power.className = 'host-tv__power';
  power.setAttribute('aria-label', tv.power ?? '');
  power.setAttribute('aria-pressed', 'false');
  power.addEventListener('click', onPower);
  const remote = groupEl('host-tv__remote', [
    textEl('p', 'host-tv__note host-tv__note--channel', tv.channelHint),
    groupEl('host-tv__channels', channels),
    power,
    textEl('p', 'host-tv__note host-tv__note--off', tv.offHint),
  ]);
  return { remote, channels, power };
}

// Gắn kiểu tivi vào thẻ host. Trả về hàm gỡ: wl-host gọi khi dựng lại hoặc khi bị gỡ khỏi trang
// (đổi thương hiệu không tải lại trang, không được để listener cuộn cũ chạy tiếp).
export function buildTv(host, section) {
  const stories = (section.stories ?? []).filter((story) => story.title || story.image?.src);
  if (!stories.length) return null;
  const tv = section.tv ?? {};
  const count = stories.length;
  const still = reducedMotion();

  const { set, screen, pictures, noise, led } = setEl(stories);
  const storyBox = document.createElement('div');
  storyBox.className = 'host-tv__story';
  // Trình đọc màn hình đọc lại câu chuyện mỗi khi đổi kênh.
  storyBox.setAttribute('aria-live', 'polite');
  const hint = textEl('p', 'host-tv__hint', tv.hint);

  let step = -1;
  const track = document.createElement('div');
  track.className = 'host-tv';

  // Nấc k (0 tới count + 1) ứng với một vị trí cuộn ở giữa quãng của nấc đó.
  const scrollToStep = (k) => {
    if (still) {
      show(k, true);
      return;
    }
    const top = track.getBoundingClientRect().top + scrollY;
    const range = track.offsetHeight - innerHeight;
    scrollTo({ top: top + range * ((k + 0.5) / (count + 2)), behavior: 'smooth' });
  };
  const { remote, channels, power } = remoteEl(stories, tv, (k) => scrollToStep(k), () => scrollToStep(step >= 1 && step <= count ? count + 1 : 1));

  const copy = groupEl('host-tv__copy', [
    textEl('p', 'host-tv__eyebrow', section.eyebrow),
    textEl('h2', 'host-tv__title', section.title),
    storyBox,
  ]);
  const stage = groupEl('host-tv__stage', [groupEl('host-tv__inner container', [set, copy, remote]), hint]);
  track.append(stage);
  host.replaceChildren(track);

  // Nhấn nút: lún xuống một nhịp như có người ấn (gỡ lớp rồi gắn lại để hiệu ứng chạy lại từ đầu).
  const press = (button) => {
    button.classList.remove('is-press');
    void button.offsetWidth;
    button.classList.add('is-press');
  };

  const storyContent = (k) => {
    const story = stories[k - 1];
    return [
      textEl('p', 'host-tv__num', `${pad(k)} / ${pad(count)}`),
      textEl('h3', 'host-tv__story-title', story.title),
      textEl('p', 'host-tv__text', story.text),
      quoteEl(story.quote),
    ].filter(Boolean);
  };

  // Chuyển sang nấc k: bật, đổi kênh hoặc tắt tivi, kèm nút tương ứng lún xuống.
  // instant: lần dựng đầu hoặc giảm chuyển động, đặt thẳng trạng thái, không chạy hiệu ứng.
  function show(k, instant = false) {
    if (k === step) return;
    const wasOn = step >= 1 && step <= count;
    const on = k >= 1 && k <= count;
    step = k;
    screen.classList.toggle('is-instant', instant);
    if (on) {
      if (!wasOn) {
        if (!instant) press(power);
        screen.classList.remove('is-off');
        screen.classList.add('is-on');
      } else if (!instant) {
        press(channels[k - 1]);
        noise.classList.remove('is-static');
        void noise.offsetWidth;
        noise.classList.add('is-static');
      }
      pictures.forEach((pic, i) => pic.classList.toggle('is-active', i === k - 1));
      storyBox.replaceChildren(...storyContent(k));
    } else if (wasOn) {
      if (!instant) press(power);
      screen.classList.remove('is-on');
      screen.classList.add('is-off');
    }
    channels.forEach((button, i) => {
      const active = on && i === k - 1;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    power.setAttribute('aria-pressed', String(on));
    power.classList.toggle('is-on', on);
    led.classList.toggle('is-on', on);
    host.classList.toggle('is-tv-on', on);
    // Gợi ý "lướt để bật" chỉ hiện khi tivi chưa bật lần nào.
    if (hint) hint.hidden = k !== 0;
  }

  if (still) {
    track.classList.add('host-tv--still');
    show(1, true);
    return () => {};
  }

  track.style.setProperty('--steps', String(count + 2));
  let frame = 0;
  const update = () => {
    frame = 0;
    const rect = track.getBoundingClientRect();
    const range = track.offsetHeight - innerHeight;
    const p = range > 0 ? clamp(-rect.top / range, 0, 0.9999) : 0;
    show(Math.floor(p * (count + 2)), step === -1);
  };
  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  show(0, true);
  requestAnimationFrame(update);

  return () => {
    removeEventListener('scroll', onScroll);
    removeEventListener('resize', onScroll);
    cancelAnimationFrame(frame);
  };
}
