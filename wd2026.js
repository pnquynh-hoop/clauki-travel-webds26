/**
 * ============================================================================
 *  WebDesign2026.js
 *  Thư viện Multi-tenant Data Switcher — Cuộc thi Web Design 2026
 *  (c) Ban Tổ Chức — cấp sẵn cho thí sinh, KHÔNG chỉnh sửa file này.
 * ============================================================================
 *
 * MỤC ĐÍCH
 *  - Cho phép 1 website (đề Phần 2) chạy demo với nhiều bộ dữ liệu khác nhau
 *    (data-1.json, data-2.json, data-3.json...) để BGK kiểm tra tính White Label.
 *  - Sinh viên KHÔNG cần tự viết cơ chế đọc file/tạo UI chọn data, chỉ cần gọi init().
 *  - Việc render lại trang khi đổi data là do THÍ SINH tự làm (xem onChange bên dưới).
 *
 * GIAO DIỆN
 *  - 1 logo tròn nhỏ nép ở góc dưới-phải màn hình (mặc định là fallback chữ cái đầu
 *    tên tổ chức; truyền options.logoSrc để dùng ảnh logo thật của BTC).
 *  - Hover (hoặc chạm, trên mobile) vào logo → hiện 1 nút nhỏ "Đổi dữ liệu demo".
 *  - Bấm nút đó → mở modal (z-index 9999999999, luôn nổi trên mọi thứ) để chọn
 *    Data 1 / Data 2 / Data 3.
 *  - Chọn xong → modal chuyển sang màn thông báo thành công, kèm hộp thoại xác
 *    nhận TỰ VIẾT (không dùng window.confirm) hỏi có muốn tải lại trang không.
 *
 * CÁCH DÙNG (trong file main.js của thí sinh)
 * ----------------------------------------------------------------------------
 *   <script src="webdesign2026.js"></script>
 *   <script src="main.js"></script>
 *
 *   // main.js
 *   WebDesign2026.init({
 *     folder: 'assets-web-design',
 *     files: ['data-1.json', 'data-2.json', 'data-3.json'],
 *     labels: ['Data 1', 'Data 2', 'Data 3'],
 *     defaultIndex: 0,
 *     overrideCss: false,
 *     logoSrc: null,             // (tuỳ chọn) URL logo thật, chưa có thì dùng fallback chữ cái
 *   });
 *
 *   // onChange là OPTIONAL — không bắt buộc phải truyền vào init().
 *   // Nếu không truyền, thí sinh vẫn lấy dữ liệu bằng cách tự lắng nghe event
 *   // 'webdesign2026:datachange' hoặc tự đọc window.DATA_WEB_DESIGN bất cứ lúc nào.
 *
 * TÙY CHỌN overrideCss (mặc định: false)
 *  - false (mặc định): thư viện KHÔNG đụng vào CSS của trang. Nó chỉ đổ dữ liệu
 *    thô ra window.DATA_WEB_DESIGN, kể cả phần data.theme. Thí sinh tự đọc
 *    data-N.json, tự áp dụng theme.colors theo cách của mình.
 *  - true: thư viện tự set data.theme.colors (và darkColors) thành CSS custom
 *    properties trên thẻ <html>, dạng --wd-color-*.
 *
 * SAU KHI INIT
 *  - window.DATA_WEB_DESIGN  → luôn chứa object data đang active (biến toàn cục runtime).
 *  - Sự kiện 'webdesign2026:datachange' được bắn ra trên `document` mỗi khi đổi data,
 *    detail = data mới.
 *  - Lựa chọn đang dùng được lưu vào localStorage (theo TÊN FILE) nên F5 hay đóng mở
 *    lại trình duyệt vẫn giữ nguyên lựa chọn.
 * ============================================================================
 */

(function (window, document) {
  'use strict';

  const STORAGE_KEY = 'wd2026_active_file';
  const EVENT_NAME = 'webdesign2026:datachange';

  let initialized = false;

  const WebDesign2026 = {
    /**
     * Khởi tạo thư viện.
     * @param {Object} options
     * @param {string} options.folder          Thư mục chứa file JSON (mặc định 'assets-web-design')
     * @param {string[]} options.files          Danh sách tên file JSON, theo thứ tự
     * @param {string[]} [options.labels]        Tên hiển thị tương ứng từng file
     * @param {number} [options.defaultIndex]    Index load sẵn khi vào trang (mặc định 0)
     * @param {boolean} [options.overrideCss]    true = thư viện tự set CSS variable màu theo data.theme
     * @param {string} [options.logoSrc]         URL logo hiển thị trên nút góc dưới-phải (chưa có thì dùng fallback)
     * @param {Function} [options.onChange]      (OPTIONAL) Callback(data) mỗi khi đổi bộ data
     */
    init(options) {
      if (initialized) {
        console.warn('[WebDesign2026] init() đã được gọi trước đó, bỏ qua lần gọi này.');
        return;
      }
      initialized = true;

      const cfg = Object.assign(
        {
          folder: 'assets-web-design',
          files: ['data-1.json', 'data-2.json', 'data-3.json'],
          labels: null,
          defaultIndex: 0,
          overrideCss: false,
          logoSrc: null,
          onChange: null,
        },
        options || {}
      );

      cfg.labels = cfg.labels || cfg.files.map((_, i) => `Data ${i + 1}`);

      this._cfg = cfg;
      this._modalView = 'list'; // 'list' | 'confirm'
      this._lastLoadedLabel = '';

      this._injectStyles();
      this._buildFab();
      this._buildModal();

      const saved = localStorage.getItem(STORAGE_KEY);
      const savedIndex = saved ? cfg.files.indexOf(saved) : -1;
      const startIndex = savedIndex !== -1 ? savedIndex : cfg.defaultIndex;

      this.load(startIndex);
    },

    /**
     * Tải 1 bộ data theo index và cập nhật toàn bộ runtime.
     * @param {number} index
     * @param {Object} [opts]
     * @param {boolean} [opts.interactive]  true nếu được gọi từ thao tác chọn trong modal
     *                                      (sẽ hiện màn xác nhận sau khi tải xong).
     */
    async load(index, opts) {
      const cfg = this._cfg;
      const interactive = !!(opts && opts.interactive);

      if (!cfg.files[index]) {
        console.error(`[WebDesign2026] Không tìm thấy file ở index ${index}`);
        return;
      }

      const path = `${cfg.folder}/${cfg.files[index]}`;

      try {
        this._setModalLoading(true);
        const res = await fetch(path, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status} khi tải ${path}`);
        const data = await res.json();

        window.DATA_WEB_DESIGN = data;

        this._activeIndex = index;
        this._lastLoadedLabel = cfg.labels[index];
        localStorage.setItem(STORAGE_KEY, cfg.files[index]);
        this._updateFabFallbackLetter(data);
        this._renderListView(); // cập nhật trạng thái active trong modal (nếu đang mở)

        if (cfg.overrideCss) {
          this._applyTheme(data.theme);
        }

        document.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: data }));

        if (typeof cfg.onChange === 'function') {
          cfg.onChange(data);
        }

        if (interactive) {
          this._renderConfirmView(this._lastLoadedLabel);
        }
      } catch (err) {
        console.error('[WebDesign2026] Lỗi khi tải data:', err);
        if (interactive) {
          this._renderErrorView(err);
        }
      } finally {
        this._setModalLoading(false);
      }
    },

    getCurrentData() {
      return window.DATA_WEB_DESIGN || null;
    },

    _applyTheme(theme) {
      if (!theme || typeof theme !== 'object') return;
      const root = document.documentElement;
      if (theme.colors) {
        Object.entries(theme.colors).forEach(([key, value]) => {
          root.style.setProperty(`--wd-color-${key}`, value);
        });
      }
      if (theme.darkColors) {
        Object.entries(theme.darkColors).forEach(([key, value]) => {
          root.style.setProperty(`--wd-color-dark-${key}`, value);
        });
      }
    },

    // ------------------------------------------------------------------
    // CSS
    // ------------------------------------------------------------------
    _injectStyles() {
      const style = document.createElement('style');
      style.textContent = `
        .wd2026-fab-wrap {
          position: fixed;
          right: 10px;
          bottom: 10px;
          z-index: 999999;
          display: flex;
          flex-direction: row-reverse;
          align-items: center;
          gap: 10px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .wd2026-fab-wrap:hover {
          opacity: 1;
        }
        .wd2026-fab {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #111827;
          border: 2px solid #ffffff;
          box-shadow: 0 8px 22px rgba(0,0,0,0.28);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          padding: 0;
        }
        .wd2026-fab img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .wd2026-fab-fallback { color: #fff; font-weight: 700; font-size: 18px; }

        .wd2026-trigger {
          opacity: 0;
          transform: translateX(8px) scale(0.92);
          pointer-events: none;
          transition: opacity 0.18s ease, transform 0.18s ease;
          background: #111827;
          color: #fff;
          border: none;
          border-radius: 999px;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          box-shadow: 0 6px 16px rgba(0,0,0,0.22);
        }
        .wd2026-fab-wrap:hover .wd2026-trigger,
        .wd2026-fab-wrap:focus-within .wd2026-trigger,
        .wd2026-fab-wrap.wd2026-force-open .wd2026-trigger {
          opacity: 1;
          transform: translateX(0) scale(1);
          pointer-events: auto;
        }

        .wd2026-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 17, 21, 0.55);
          z-index: 9999999999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .wd2026-overlay.wd2026-open { opacity: 1; pointer-events: auto; }

        .wd2026-modal {
          background: #ffffff;
          color: #111827;
          width: 100%;
          max-width: 400px;
          border-radius: 16px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.35);
          overflow: hidden;
          transform: translateY(14px) scale(0.98);
          transition: transform 0.2s ease;
        }
        .wd2026-overlay.wd2026-open .wd2026-modal { transform: translateY(0) scale(1); }

        .wd2026-modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 18px; border-bottom: 1px solid #eef0f2;
        }
        .wd2026-modal-header h3 { margin: 0; font-size: 15px; font-weight: 700; }
        .wd2026-modal-close {
          width: 28px; height: 28px; border-radius: 50%;
          border: none; background: none; color: #6b7280;
          font-size: 16px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .wd2026-modal-close:hover { background: #f3f4f6; color: #111827; }

        .wd2026-modal-body { padding: 16px 18px 20px; display: flex; flex-direction: column; gap: 8px; }
        .wd2026-hint { font-size: 12px; color: #6b7280; margin: 0 0 4px; }

        .wd2026-option {
          display: flex; align-items: center; gap: 10px;
          border: 1px solid #e5e7eb; border-radius: 10px;
          padding: 12px 14px; cursor: pointer; background: #fff;
          font-size: 14px; font-weight: 600; color: #111827; text-align: left;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .wd2026-option:hover { border-color: #2563eb; background: #f5f8ff; }
        .wd2026-option.wd2026-active { border-color: #2563eb; background: #eff4ff; }
        .wd2026-option[disabled] { opacity: 0.55; cursor: wait; }
        .wd2026-option .wd2026-dot { width: 8px; height: 8px; border-radius: 50%; background: #d1d5db; flex-shrink: 0; }
        .wd2026-option.wd2026-active .wd2026-dot { background: #2563eb; }

        .wd2026-confirm { text-align: center; padding: 4px 2px 0; }
        .wd2026-confirm-icon {
          width: 46px; height: 46px; margin: 0 auto 12px;
          border-radius: 50%; background: #ecfdf3; color: #16a34a;
          display: flex; align-items: center; justify-content: center; font-size: 20px;
        }
        .wd2026-confirm p { margin: 0 0 16px; font-size: 13.5px; color: #374151; line-height: 1.55; }
        .wd2026-confirm-actions { display: flex; gap: 8px; }
        .wd2026-btn {
          flex: 1; padding: 10px 12px; border-radius: 8px;
          font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent;
        }
        .wd2026-btn-primary { background: #111827; color: #fff; }
        .wd2026-btn-primary:hover { background: #000; }
        .wd2026-btn-secondary { background: #f3f4f6; color: #111827; }
        .wd2026-btn-secondary:hover { background: #e5e7eb; }

        .wd2026-error { color: #dc2626; font-size: 13px; text-align: center; padding: 8px 0; }
      `;
      document.head.appendChild(style);
    },

    // ------------------------------------------------------------------
    // FAB (logo góc dưới-phải) + nút trigger hiện khi hover
    // ------------------------------------------------------------------
    _buildFab() {
      const cfg = this._cfg;

      const wrap = document.createElement('div');
      wrap.className = 'wd2026-fab-wrap';

      const fab = document.createElement('button');
      fab.type = 'button';
      fab.className = 'wd2026-fab';
      fab.setAttribute('aria-label', 'Đổi bộ dữ liệu demo');
      this._renderFabContent(fab, null);
      // Fallback cho thiết bị cảm ứng (không có hover): bấm logo để hiện nút trigger
      fab.addEventListener('click', () => wrap.classList.toggle('wd2026-force-open'));

      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'wd2026-trigger';
      trigger.textContent = 'Đổi dữ liệu demo';
      trigger.addEventListener('click', () => this._openModal());

      wrap.appendChild(fab);
      wrap.appendChild(trigger);
      document.body.appendChild(wrap);

      this._fabEl = fab;
      this._wrapEl = wrap;
    },

    _renderFabContent(fab, data) {
      const cfg = this._cfg;
      fab.innerHTML = '';
      if (cfg.logoSrc) {
        const img = document.createElement('img');
        img.src = cfg.logoSrc;
        img.alt = 'Logo';
        fab.appendChild(img);
        return;
      }
      const letter = document.createElement('span');
      letter.className = 'wd2026-fab-fallback';
      const orgName = data && data.organization && data.organization.shortName;
      letter.textContent = (orgName ? orgName.charAt(0) : 'W').toUpperCase();
      fab.appendChild(letter);
    },

    _updateFabFallbackLetter(data) {
      if (this._cfg.logoSrc || !this._fabEl) return;
      this._renderFabContent(this._fabEl, data);
    },

    // ------------------------------------------------------------------
    // MODAL
    // ------------------------------------------------------------------
    _buildModal() {
      const overlay = document.createElement('div');
      overlay.className = 'wd2026-overlay';

      const modal = document.createElement('div');
      modal.className = 'wd2026-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');

      const header = document.createElement('div');
      header.className = 'wd2026-modal-header';
      header.innerHTML = `<h3>Chọn bộ dữ liệu demo</h3>`;
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'wd2026-modal-close';
      closeBtn.setAttribute('aria-label', 'Đóng');
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', () => this._closeModal());
      header.appendChild(closeBtn);

      const body = document.createElement('div');
      body.className = 'wd2026-modal-body';

      modal.appendChild(header);
      modal.appendChild(body);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this._closeModal();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('wd2026-open')) this._closeModal();
      });

      this._overlayEl = overlay;
      this._modalBodyEl = body;
      this._closeBtnEl = closeBtn;

      this._renderListView();
    },

    _openModal() {
      this._modalView = 'list';
      this._renderListView();
      this._overlayEl.classList.add('wd2026-open');
      this._closeBtnEl.focus();
    },

    _closeModal() {
      this._overlayEl.classList.remove('wd2026-open');
      this._wrapEl.classList.remove('wd2026-force-open');
    },

    _renderListView() {
      const body = this._modalBodyEl;
      if (!body) return;
      this._modalView = 'list';

      const cfg = this._cfg;
      body.innerHTML = '';
      const hint = document.createElement('p');
      hint.className = 'wd2026-hint';
      hint.textContent = 'BGK có thể đổi qua lại để kiểm tra khả năng White Label của trang.';
      body.appendChild(hint);

      cfg.files.forEach((file, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'wd2026-option' + (i === this._activeIndex ? ' wd2026-active' : '');
        btn.innerHTML = `<span class="wd2026-dot"></span><span>${cfg.labels[i]}</span>`;
        btn.addEventListener('click', () => this.load(i, { interactive: true }));
        body.appendChild(btn);
      });
    },

    _renderConfirmView(label) {
      this._modalView = 'confirm';
      const body = this._modalBodyEl;
      body.innerHTML = `
        <div class="wd2026-confirm">
          <div class="wd2026-confirm-icon">✓</div>
          <p><strong>Đã chuyển sang “${label}” thành công!</strong><br>Bạn có muốn tải lại trang để đảm bảo toàn bộ giao diện được áp dụng đầy đủ không?</p>
          <div class="wd2026-confirm-actions">
            <button type="button" class="wd2026-btn wd2026-btn-secondary" id="wd2026BtnLater">Để sau</button>
            <button type="button" class="wd2026-btn wd2026-btn-primary" id="wd2026BtnReload">Tải lại trang</button>
          </div>
        </div>
      `;
      body.querySelector('#wd2026BtnLater').addEventListener('click', () => this._closeModal());
      body.querySelector('#wd2026BtnReload').addEventListener('click', () => window.location.reload());
    },

    _renderErrorView(err) {
      this._modalView = 'error';
      const body = this._modalBodyEl;
      body.innerHTML = `<p class="wd2026-error">Không tải được dữ liệu: ${String((err && err.message) || err)}</p>`;
    },

    _setModalLoading(isLoading) {
      const body = this._modalBodyEl;
      if (!body) return;
      body.querySelectorAll('.wd2026-option').forEach((btn) => {
        btn.disabled = isLoading;
      });
    },
  };

  window.WebDesign2026 = WebDesign2026;
})(window, document);