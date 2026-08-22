const state = {
  adminKey: sessionStorage.getItem('sagax-admin-key') || '',
  settings: null,
  publicConfig: null,
  bookings: [],
  selectedReference: '',
};

const loginBox = document.getElementById('admin-login');
const adminKeyInput = document.getElementById('admin-key');
const unlockButton = document.getElementById('unlock-admin');
const statusBox = document.getElementById('admin-status');
const pricingSection = document.getElementById('pricing');
const bookingsSection = document.getElementById('bookings');
const notificationsSection = document.getElementById('notifications');
const priceGrid = document.getElementById('admin-price-grid');
const bookingsList = document.getElementById('admin-bookings-list');
const bookingDetail = document.getElementById('admin-booking-detail');

const packageOrder = ['hour', 'four', 'full'];

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return char;
    }
  });
}

function formatMyr(amountCents = 0) {
  return `RM${(Number(amountCents || 0) / 100).toFixed(2)}`;
}

function authHeaders() {
  return state.adminKey ? { 'x-admin-key': state.adminKey } : {};
}

function setStatus(message, kind = 'info') {
  if (!statusBox) return;
  statusBox.hidden = false;
  statusBox.className = `admin-status is-${kind}`;
  statusBox.textContent = message;
}

function setVisibleDashboard(isVisible) {
  [pricingSection, bookingsSection, notificationsSection].forEach((section) => {
    if (section) section.hidden = !isVisible;
  });
  if (loginBox) loginBox.hidden = isVisible;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...authHeaders(),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`);
  }
  return data;
}

function packageDisplay(key, data) {
  const current = data?.human_price || 'RM0.00';
  const base = data?.base_human_price || current;
  const promoLabel = data?.promo_label || '';
  const isPromo = Boolean(data?.is_promo);
  return {
    key,
    title: data?.title || key,
    base,
    current,
    promoLabel,
    isPromo,
  };
}

function renderPriceGrid() {
  if (!priceGrid || !state.publicConfig?.packages) return;

  priceGrid.innerHTML = packageOrder
    .map((key) => {
      const data = packageDisplay(key, state.publicConfig.packages[key]);
      const override = state.settings?.package_overrides?.[key] || null;
      const promoValue = override?.amount_cents ? (override.amount_cents / 100).toFixed(2) : '';
      const promoLabel = override?.label || '';

      return `
        <article class="admin-price-card" data-package="${escapeHtml(key)}">
          <div class="admin-price-head">
            <div>
              <p class="admin-kicker">${escapeHtml(data.title)}</p>
              <strong>${escapeHtml(data.current)}</strong>
            </div>
            <span class="badge ${data.isPromo ? 'badge-accent' : 'badge-muted'}">
              ${data.isPromo ? escapeHtml(data.promoLabel || 'Promo active') : 'Default price'}
            </span>
          </div>

          <div class="admin-price-meta">
            <span>Base: ${escapeHtml(data.base)}</span>
            <span>Current: ${escapeHtml(data.current)}</span>
          </div>

          <label>
            Promo price
            <input type="number" min="0" step="0.01" value="${escapeHtml(promoValue)}" placeholder="Leave blank for default" data-promo-amount />
          </label>

          <label>
            Promo label
            <input type="text" value="${escapeHtml(promoLabel)}" placeholder="e.g. Promo March" data-promo-label />
          </label>

          <div class="admin-card-actions">
            <button type="button" class="btn btn-primary" data-save-package="${escapeHtml(key)}">Save promo</button>
            <button type="button" class="btn btn-secondary" data-reset-package="${escapeHtml(key)}">Reset</button>
          </div>
        </article>
      `;
    })
    .join('');

  priceGrid.querySelectorAll('[data-save-package]').forEach((button) => {
    button.addEventListener('click', async () => {
      const card = button.closest('[data-package]');
      if (!card) return;
      const key = card.dataset.package;
      const amountInput = card.querySelector('[data-promo-amount]');
      const labelInput = card.querySelector('[data-promo-label]');
      const rawAmount = String(amountInput?.value || '').trim();
      const amount_cents = rawAmount ? Math.round(Number(rawAmount) * 100) : null;
      const label = String(labelInput?.value || '').trim();

      const packages = {};
      packageOrder.forEach((packageKey) => {
        const current = state.settings?.package_overrides?.[packageKey] || null;
        packages[packageKey] = current
          ? { amount_cents: current.amount_cents, label: current.label }
          : null;
      });

      packages[key] = amount_cents ? { amount_cents, label } : null;
      await savePricing(packages);
    });
  });

  priceGrid.querySelectorAll('[data-reset-package]').forEach((button) => {
    button.addEventListener('click', async () => {
      const card = button.closest('[data-package]');
      if (!card) return;
      const key = card.dataset.package;
      const packages = {};
      packageOrder.forEach((packageKey) => {
        const current = state.settings?.package_overrides?.[packageKey] || null;
        packages[packageKey] = current
          ? { amount_cents: current.amount_cents, label: current.label }
          : null;
      });
      packages[key] = null;
      await savePricing(packages);
    });
  });
}

function renderBookingsList() {
  if (!bookingsList) return;
  if (!state.bookings.length) {
    bookingsList.innerHTML = '<div class="empty-state">No bookings yet.</div>';
    return;
  }

  bookingsList.innerHTML = state.bookings
    .map((booking) => {
      const selected = booking.reference === state.selectedReference;
      return `
        <button type="button" class="admin-booking-item ${selected ? 'is-selected' : ''}" data-ref="${escapeHtml(booking.reference)}">
          <span class="admin-booking-ref">${escapeHtml(booking.reference)}</span>
          <strong>${escapeHtml(booking.name || 'Unnamed')}</strong>
          <span>${escapeHtml(booking.package_title || '')}</span>
          <span>${escapeHtml(booking.event_date || '')} at ${escapeHtml(booking.start_time || '')}</span>
          <span class="badge ${booking.status === 'confirmed' ? 'badge-accent' : 'badge-muted'}">${escapeHtml(booking.status || '')}</span>
          <span>${escapeHtml(formatMyr(booking.amount_cents || 0))}</span>
        </button>
      `;
    })
    .join('');

  bookingsList.querySelectorAll('[data-ref]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedReference = button.dataset.ref;
      renderBookingsList();
      renderBookingDetail();
    });
  });
}

function renderBookingDetail() {
  if (!bookingDetail) return;
  const booking = state.bookings.find((item) => item.reference === state.selectedReference);
  if (!booking) {
    bookingDetail.innerHTML = '<p class="muted-copy">Select a booking to see full details.</p>';
    return;
  }

  const amountValue = (Number(booking.amount_cents || 0) / 100).toFixed(2);

  bookingDetail.innerHTML = `
    <div class="admin-detail-head">
      <div>
        <p class="admin-kicker">${escapeHtml(booking.reference)}</p>
        <h3>${escapeHtml(booking.name || 'Unnamed booking')}</h3>
        <p class="muted-copy">${escapeHtml(booking.package_title || '')}</p>
      </div>
      <span class="badge ${booking.status === 'confirmed' ? 'badge-accent' : 'badge-muted'}">${escapeHtml(booking.status || '')}</span>
    </div>

    <div class="admin-detail-grid">
      <div><span>Package</span><strong>${escapeHtml(booking.package_title || '')}</strong></div>
      <div><span>Event date</span><strong>${escapeHtml(booking.event_date || '')}</strong></div>
      <div><span>Start time</span><strong>${escapeHtml(booking.start_time || '')}</strong></div>
      <div><span>Payment</span><strong>${escapeHtml(booking.payment_method || '')}</strong></div>
      <div><span>Amount</span><strong>${escapeHtml(formatMyr(booking.amount_cents || 0))}</strong></div>
      <div><span>Base price</span><strong>${escapeHtml(formatMyr(booking.base_amount_cents || booking.amount_cents || 0))}</strong></div>
    </div>

    <div class="admin-detail-form">
      <label>
        Booking status
        <select data-field="status">
          ${['pending_payment', 'pending_review', 'confirmed', 'cancelled'].map((status) => `
            <option value="${status}" ${booking.status === status ? 'selected' : ''}>${status}</option>
          `).join('')}
        </select>
      </label>

      <label>
        Custom amount (RM)
        <input type="number" min="0" step="0.01" data-field="amount" value="${escapeHtml(amountValue)}" />
      </label>

      <label>
        Price label
        <input type="text" data-field="price_label" value="${escapeHtml(booking.price_label || '')}" placeholder="Promo, special event, etc." />
      </label>

      <label>
        Admin note
        <textarea rows="4" data-field="admin_note" placeholder="Internal note">${escapeHtml(booking.admin_note || '')}</textarea>
      </label>
    </div>

    <div class="admin-card-actions">
      <button type="button" class="btn btn-primary" data-action="save-booking">Save booking</button>
      <button type="button" class="btn btn-secondary" data-action="resend-booking">Resend invoice</button>
      <button type="button" class="btn btn-secondary" data-action="reset-price">Reset price</button>
      <a class="btn btn-secondary" href="${escapeHtml(booking.whatsapp_alert_url || '#')}" target="_blank" rel="noreferrer" ${booking.whatsapp_alert_url ? '' : 'aria-disabled="true"'}>WhatsApp alert</a>
      <button type="button" class="btn btn-secondary" data-action="copy-alert">Copy alert text</button>
    </div>
  `;

  bookingDetail.querySelector('[data-action="save-booking"]')?.addEventListener('click', saveSelectedBooking);
  bookingDetail.querySelector('[data-action="resend-booking"]')?.addEventListener('click', resendSelectedBooking);
  bookingDetail.querySelector('[data-action="reset-price"]')?.addEventListener('click', resetSelectedPrice);
  bookingDetail.querySelector('[data-action="copy-alert"]')?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(booking.whatsapp_alert_text || '');
    setStatus('WhatsApp alert text copied.', 'success');
  });
}

async function loadDashboard() {
  const config = await api('/api/admin/settings');
  const bookingsResponse = await api('/api/admin/bookings');
  state.settings = config.settings;
  state.publicConfig = config.public;
  state.bookings = bookingsResponse.items || [];
  if (!state.selectedReference && state.bookings[0]) {
    state.selectedReference = state.bookings[0].reference;
  }

  setVisibleDashboard(true);
  renderPriceGrid();
  renderBookingsList();
  renderBookingDetail();
  setStatus('Admin dashboard unlocked.', 'success');
}

async function savePricing(packages) {
  const current = {};
  packageOrder.forEach((key) => {
    current[key] = packages[key] === undefined ? (state.settings?.package_overrides?.[key] || null) : packages[key];
  });

  state.settings = { ...(state.settings || {}), package_overrides: current };
  await api('/api/admin/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ package_overrides: current }),
  });

  setStatus('Promo pricing saved.', 'success');
  await loadDashboard();
}

async function saveSelectedBooking() {
  const booking = state.bookings.find((item) => item.reference === state.selectedReference);
  if (!booking) return;

  const detailInputs = bookingDetail.querySelectorAll('[data-field]');
  const fieldMap = Object.fromEntries(Array.from(detailInputs).map((input) => [input.dataset.field, input]));
  const amount = Number(String(fieldMap.amount?.value || '').trim());
  const payload = {
    status: fieldMap.status?.value,
    amount_cents: Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : undefined,
    price_label: String(fieldMap.price_label?.value || '').trim(),
    admin_note: String(fieldMap.admin_note?.value || '').trim(),
  };

  const updated = await api(`/api/admin/bookings/${encodeURIComponent(booking.reference)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const index = state.bookings.findIndex((item) => item.reference === booking.reference);
  if (index !== -1) state.bookings[index] = updated.booking;
  renderBookingsList();
  renderBookingDetail();
  setStatus(`Booking ${booking.reference} updated.`, 'success');
}

async function resendSelectedBooking() {
  const booking = state.bookings.find((item) => item.reference === state.selectedReference);
  if (!booking) return;

  await api(`/api/admin/bookings/${encodeURIComponent(booking.reference)}/resend`, {
    method: 'POST',
  });

  setStatus(`Invoice resent to ${booking.email}.`, 'success');
}

async function resetSelectedPrice() {
  const booking = state.bookings.find((item) => item.reference === state.selectedReference);
  if (!booking) return;

  const updated = await api(`/api/admin/bookings/${encodeURIComponent(booking.reference)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reset_price: true, price_label: 'Default price' }),
  });

  const index = state.bookings.findIndex((item) => item.reference === booking.reference);
  if (index !== -1) state.bookings[index] = updated.booking;
  renderBookingsList();
  renderBookingDetail();
  setStatus(`Price reset for ${booking.reference}.`, 'success');
}

async function unlockAdmin() {
  const key = String(adminKeyInput?.value || '').trim();
  if (!key) {
    setStatus('Please enter the admin access key first.', 'error');
    return;
  }

  state.adminKey = key;
  sessionStorage.setItem('sagax-admin-key', key);
  setStatus('Checking access key...', 'info');
  await loadDashboard();
}

if (unlockButton) {
  unlockButton.addEventListener('click', () => {
    unlockAdmin().catch((error) => {
      sessionStorage.removeItem('sagax-admin-key');
      state.adminKey = '';
      setVisibleDashboard(false);
      setStatus(error.message || 'Unable to unlock admin.', 'error');
    });
  });
}

if (adminKeyInput && state.adminKey) {
  adminKeyInput.value = state.adminKey;
}

if (state.adminKey) {
  unlockAdmin().catch(() => {
    sessionStorage.removeItem('sagax-admin-key');
    state.adminKey = '';
    setVisibleDashboard(false);
    setStatus('Admin key needs to be re-entered.', 'error');
  });
} else {
  setVisibleDashboard(false);
}
