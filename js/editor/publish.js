/* publish.js - hộp thoại Xuất bản của editor: đặt tên trang rồi xuất bản ngay tại đây, không phải quay về /tao.
   - Thương hiệu có sẵn: bản đang chỉnh thành một site khách mới, dựng trên khung là chính thương hiệu đó (theme.css, ảnh của
     thương hiệu), kèm màu, font đã đổi. Thương hiệu gốc trong repo không đổi.
   - Nháp /nhap/ của trình tạo web: xuất bản đúng nháp đó; nháp mở từ "Sửa trang này" (máy demo) giữ tên cũ thì là cập nhật.
   Các bước kiểm tên, dịch nốt tiếng Anh, ghi Supabase dùng chung với /tao (js/site/publish.js). Tệp này chỉ tải khi bấm Xuất bản. */
import { h, slugify } from '../core/dom.js';
import { toContent } from '../core/i18n-text.js';
import { publicLink, publishReady, readTaoDraft, DRAFT_SLUG } from '../site/sites.js';
import { slugError, isUpdate, publishContent } from '../site/publish.js';

const STAGES = {
  translate: () => 'Đang dịch nốt các chỗ vừa sửa sang tiếng Anh...',
  send: (update) => (update ? 'Đang cập nhật...' : 'Đang xuất bản...'),
};

// Tên gợi ý: nháp của trình tạo web lấy theo tên site AI đặt (hoặc tên cũ khi đang sửa, tên kèm -copy khi là bản sao);
// thương hiệu có sẵn thì tên thương hiệu là tên dành riêng, nên gợi ý kèm -ban-sao.
function suggestSlug(state) {
  if (state.id !== DRAFT_SLUG) return `${state.id.slice(0, 22)}-ban-sao`;
  const draft = readTaoDraft() ?? {};
  if (draft.editOf) return draft.editOf;
  if (draft.copyOf) return `${draft.copyOf.slice(0, 24)}-copy`;
  return slugify(draft.profile?.ten ?? state.content.brand?.name ?? '');
}

// Ảnh của thương hiệu ghi đường dẫn tính từ thư mục thương hiệu (images/...), core.js ghép với id của site đang mở. Site mới mang
// tên mới nên phải đổi sang đường dẫn đầy đủ /brands/<khung>/images/..., như trình tạo web làm với ảnh của khung (rebase trong
// generate.js). Đổi mọi chuỗi bắt đầu bằng images/, nên logo, logo tối, favicon, cột file của credits cũng đúng.
function absoluteImages(node, base) {
  if (Array.isArray(node)) return node.map((v) => absoluteImages(v, base));
  if (node && typeof node === 'object') return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, absoluteImages(v, base)]));
  return typeof node === 'string' && node.startsWith('images/') ? `/brands/${base}/${node}` : node;
}

// Nội dung gửi đi: bản đang chỉnh, kèm bản tiếng Anh đang có (translations.en), để lỡ AI không dịch nốt được thì vẫn đủ hai thứ tiếng.
// Theme luôn ghi base (thương hiệu làm khung), vì site khách lấy theme.css và ảnh từ đó.
function payload(state) {
  const content = absoluteImages(state.tr ? toContent(state.content, state.tr) : state.content, state.baseId);
  delete content.id;
  return { content, theme: { ...structuredClone(state.theme), base: state.baseId }, i18n: state.tr ?? null };
}

export function openPublish(state) {
  const fromBrand = state.id !== DRAFT_SLUG;
  const editOf = fromBrand ? '' : readTaoDraft()?.editOf ?? '';
  const builtIn = state.brands.map((b) => b.id);
  const brandName = state.brands.find((b) => b.id === state.id)?.label ?? state.content.brand?.name ?? state.id;

  const slug = h('input', { class: 'ed-input', id: 'ed-publish-slug', maxlength: '30', autocomplete: 'off', spellcheck: 'false' });
  slug.value = suggestSlug(state);
  const url = h('code', { class: 'ed-dialog__url' });
  const note = h('p', { class: 'ed-dialog__note', 'aria-live': 'polite' });
  const share = h('div');
  const button = h('button', { type: 'button', class: 'ed-btn' });
  const close = h('button', { type: 'button', class: 'ed-btn ed-btn--ghost', text: 'Đóng' });

  const update = () => isUpdate(editOf, slug.value.trim());
  const sync = () => {
    url.textContent = publicLink(slug.value || '...');
    button.textContent = update() ? `Cập nhật /${slug.value}/` : 'Xuất bản';
  };
  slug.addEventListener('input', () => {
    slug.value = slug.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    note.textContent = '';
    sync();
  });

  async function publish() {
    const name = slug.value.trim();
    const problem = slugError(name, builtIn);
    note.textContent = problem;
    if (problem) {
      slug.focus();
      return;
    }
    const isUpdating = update();
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    share.replaceChildren();
    try {
      const { model } = await publishContent({
        slug: name, update: isUpdating, ...payload(state),
        on: { stage: (step) => { note.textContent = STAGES[step](isUpdating); } },
      });
      note.textContent = [isUpdating ? 'Đã cập nhật trang.' : 'Đã xuất bản.', model ? `Dịch nốt tiếng Anh bằng ${model}.` : ''].filter(Boolean).join(' ');
      // Link công khai (tên miền con trên web thật), mã QR, chép, chia sẻ: cùng khối với màn xuất bản của /tao.
      const { shareEl } = await import('../site/share.js');
      share.replaceChildren(shareEl(publicLink(name), { name, title: state.content.brand?.name ?? '' }));
    } catch (err) {
      note.textContent = err.message;
    } finally {
      button.disabled = !publishReady();
      button.setAttribute('aria-busy', 'false');
    }
  }
  button.addEventListener('click', publish);
  slug.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') publish();
  });

  const lead = fromBrand
    ? `Đưa bản đang chỉnh của ${brandName} lên mạng thành một website riêng, ở địa chỉ mới. ${brandName} gốc không đổi.`
    : 'Đưa website đang chỉnh lên mạng.';
  // Cùng khung với hộp xác nhận (confirm.js), rộng hơn vì có ô tên và mã QR.
  const dialog = h('dialog', { class: 'ed-dialog ed-dialog--publish', 'aria-labelledby': 'ed-publish-title' },
    h('div', { class: 'ed-dialog__box' },
      h('div', { class: 'ed-dialog__head' },
        h('h2', { class: 'ed-dialog__title', id: 'ed-publish-title', text: 'Xuất bản' }),
        close),
      h('p', { class: 'ed-dialog__note', text: lead }),
      h('label', { class: 'ed-field', for: 'ed-publish-slug' }, h('span', { text: 'Tên trang (địa chỉ)' })),
      slug,
      h('p', { class: 'ed-dialog__note' }, 'Địa chỉ: ', url),
      h('p', { class: 'ed-dialog__note', text: editOf
        ? 'Giữ đúng tên cũ là ghi đè trang đã xuất bản; đổi tên là xuất bản thành trang mới.'
        : 'Xuất bản xong là cố định, muốn đổi thì xuất bản bản mới với tên khác.' }),
      h('div', { class: 'ed-row' }, button),
      note,
      share));
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => dialog.remove());
  sync();
  button.disabled = !publishReady();
  if (!publishReady()) note.textContent = 'Chưa nối kho dữ liệu (Supabase), tạm thời chưa xuất bản được.';
  document.body.append(dialog);
  dialog.showModal();
  slug.select();
}
