const defaultPackages = {
  hour: {
    title: 'Hall 1 Hour',
    price: 'RM60.00',
    amountCents: 6000,
    copy: 'Best for short meetings or quick sessions.',
  },
  four: {
    title: 'Hall 4 Hour',
    price: 'RM180.00',
    amountCents: 18000,
    copy: 'Best value for workshops, classes, and seminars.',
  },
  full: {
    title: 'Hall Full Day',
    price: 'RM300.00',
    amountCents: 30000,
    copy: 'Best value for full-day events and training.',
  },
};

let packages = JSON.parse(JSON.stringify(defaultPackages));

const paymentMethodLabels = {
  billplz: 'Billplz FPX',
  manual: 'Manual transfer',
  qr: 'QR payment',
};

const packageButtons = Array.from(document.querySelectorAll('[data-package]'));
const packageSelect = document.getElementById('package-select');
const paymentMethodSelect = document.getElementById('payment-method-select');
const bookingForm = document.querySelector('.booking-form');
const bookingResult = document.getElementById('booking-result');
const bookingSubmit = document.getElementById('booking-submit');
const selectedTitle = document.getElementById('selected-package-title');
const selectedPrice = document.getElementById('selected-package-price');
const selectedCopy = document.getElementById('selected-package-copy');
const summaryName = document.getElementById('summary-name');
const summaryPrice = document.getElementById('summary-price');
const summaryCopy = document.getElementById('summary-copy');
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

function setResult(content, kind = 'info') {
  if (!bookingResult) return;
  bookingResult.classList.remove('is-empty');
  bookingResult.dataset.kind = kind;
  bookingResult.innerHTML = content;
}

function renderPackageCatalog() {
  packageButtons.forEach((button) => {
    const key = button.dataset.package;
    const data = packages[key];
    if (!data) return;

    const titleNode = button.querySelector('.package-name');
    const priceNode = button.querySelector('.package-price');
    const descNode = button.querySelector('.package-desc');
    const metaNode = button.querySelector('.package-meta');
    const fallbackMeta = key === 'hour' ? 'Hourly' : key === 'four' ? 'Half Day' : 'Full Day';

    if (titleNode) titleNode.textContent = data.title;
    if (priceNode) priceNode.textContent = data.price;
    if (descNode) descNode.textContent = data.copy;
    if (metaNode) metaNode.textContent = data.promoLabel || fallbackMeta;
  });

  if (packageSelect) {
    Array.from(packageSelect.options).forEach((option) => {
      const key = option.value;
      const data = packages[key];
      if (!data) return;
      option.textContent = `${data.title} - ${data.price}`;
    });
  }
}

function setEmptyResult() {
  if (!bookingResult) return;
  bookingResult.classList.add('is-empty');
  bookingResult.dataset.kind = 'empty';
  bookingResult.textContent = 'Fill in the form and choose a payment method to create a live booking request.';
}

function setPackage(key) {
  const data = packages[key];
  if (!data) return;

  packageButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.package === key);
  });

  if (packageSelect) packageSelect.value = key;
  if (selectedTitle) selectedTitle.textContent = data.title;
  if (selectedPrice) selectedPrice.textContent = data.price;
  if (selectedCopy) selectedCopy.textContent = data.copy;
  if (summaryName) summaryName.textContent = data.title;
  if (summaryPrice) summaryPrice.textContent = data.price;
  if (summaryCopy) summaryCopy.textContent = data.copy;
}

async function loadPublicConfig() {
  try {
    const response = await fetch('/api/public-config');
    if (!response.ok) return;
    const config = await response.json();
    if (!config?.packages) return;

    packages = {
      hour: {
        ...defaultPackages.hour,
        price: config.packages.hour?.human_price || defaultPackages.hour.price,
        copy: config.packages.hour?.copy || defaultPackages.hour.copy,
        promoLabel: config.packages.hour?.promo_label || '',
        isPromo: Boolean(config.packages.hour?.is_promo),
      },
      four: {
        ...defaultPackages.four,
        price: config.packages.four?.human_price || defaultPackages.four.price,
        copy: config.packages.four?.copy || defaultPackages.four.copy,
        promoLabel: config.packages.four?.promo_label || '',
        isPromo: Boolean(config.packages.four?.is_promo),
      },
      full: {
        ...defaultPackages.full,
        price: config.packages.full?.human_price || defaultPackages.full.price,
        copy: config.packages.full?.copy || defaultPackages.full.copy,
        promoLabel: config.packages.full?.promo_label || '',
        isPromo: Boolean(config.packages.full?.is_promo),
      },
    };

    renderPackageCatalog();
    setPackage(packageSelect?.value || 'four');
  } catch {
    // Keep the static defaults if the config endpoint is unavailable.
  }
}

function submitButtonState(isLoading) {
  if (!bookingSubmit) return;
  bookingSubmit.disabled = isLoading;
  bookingSubmit.textContent = isLoading ? 'Creating booking...' : 'Request booking';
}

packageButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setPackage(button.dataset.package);
    document.getElementById('pricing').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

if (packageSelect) {
  packageSelect.addEventListener('change', (event) => {
    setPackage(event.target.value);
  });
}

if (bookingForm) {
  bookingForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    submitButtonState(true);
    setResult('Submitting your booking request...', 'info');

    try {
      const formData = new FormData(bookingForm);
      const payload = Object.fromEntries(formData.entries());
      payload.pax = Number(payload.pax || 0);
      payload.package = payload.package || 'four';
      payload.payment_method = payload.payment_method || 'billplz';

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Booking request failed');
      }

      const booking = data.booking || {};
      const paymentUrl = data.payment_url || data.billplz?.paymentUrl || '';
      const emailStatus = data.email?.skipped
        ? 'Email is waiting for your Resend API key.'
        : 'Invoice email sent.';

      const paymentButton = paymentUrl
        ? `<a class="btn btn-primary" href="${escapeHtml(paymentUrl)}" target="_blank" rel="noreferrer">Continue to Billplz FPX</a>`
        : '';

      setResult(`
        <strong>${escapeHtml(booking.reference || 'Booking created')}</strong><br />
        Status: ${escapeHtml(booking.status || 'pending')}<br />
        ${escapeHtml(paymentMethodLabels[payload.payment_method] || 'Payment')} selected.<br />
        ${escapeHtml(emailStatus)}
        <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:12px">
          ${paymentButton}
        </div>
      `, 'success');
    } catch (error) {
      setResult(`
        <strong>Booking could not be created.</strong><br />
        ${escapeHtml(error.message || 'Please check the form and try again.')}
      `, 'error');
    } finally {
      submitButtonState(false);
    }
  });
}

renderPackageCatalog();
setPackage('four');
setEmptyResult();
loadPublicConfig();
