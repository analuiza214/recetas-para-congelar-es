(() => {
  const buttons = [...document.querySelectorAll('a[data-checkout-plan]')];
  if (!buttons.length) return;
  const format = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', currencyDisplay: 'code' });
  const current = new URLSearchParams(location.search);
  const plans = new Set(buttons.map((button) => button.dataset.checkoutPlan));
  const query = new URLSearchParams();
  plans.forEach((plan) => query.append('plan', plan));

  async function refreshPrices() {
    const response = await fetch('/api/checkout/precios?' + query);
    if (!response.ok) return;
    const { offers } = await response.json();
    for (const [plan, price] of Object.entries(offers)) {
      for (const field of ['sale', 'original']) {
        const amount = format.format(price[field] / 100);
        document.querySelectorAll(`[data-checkout-price="${plan}-${field}"]`).forEach((node) => {
          node.textContent = amount;
        });
      }
      buttons.filter((button) => button.dataset.checkoutPlan === plan).forEach((button) => {
        const params = new URLSearchParams(current);
        params.set('plan', plan);
        params.set('price', price.sale);
        if (price.available) {
          button.href = '/comprar?' + params;
          button.removeAttribute('aria-disabled');
          button.removeAttribute('title');
        } else {
          button.removeAttribute('href');
          button.setAttribute('aria-disabled', 'true');
          button.title = 'Oferta temporalmente no disponible';
        }
      });
    }
  }

  for (const button of buttons) {
    const keys = new URL(button.href).searchParams;
    const params = new URLSearchParams(current);
    for (const [name, value] of keys) params.set(name, value);
    button.href = '/comprar?' + params;
  }
  const refresh = () => refreshPrices().catch(() => {});
  refresh();
  window.addEventListener('pageshow', (event) => { if (event.persisted) refresh(); });
})();
