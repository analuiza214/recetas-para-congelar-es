(() => {
  const form = document.getElementById('checkout-form');
  const button = document.getElementById('pay');
  const buttonAmount = document.getElementById('pay-amount');
  const error = document.getElementById('error');
  const notice = document.getElementById('notice');
  const plan = new URLSearchParams(location.search).get('plan') || 'basic';
  let config, stripe, elements, token = crypto.randomUUID(), busy = false;

  const showError = message => {
    error.textContent = message;
    error.hidden = false;
    error.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const hideError = () => {
    error.textContent = '';
    error.hidden = true;
  };

  const money = value =>
    new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: config.currency,
      currencyDisplay: 'code'
    }).format(value / 100);

  async function load() {
    try {
      const response = await fetch('/api/checkout/config?' + new URLSearchParams({ plan }));
      if (!response.ok) throw new Error('No encontramos esta oferta. Por favor, vuelve a la página principal.');
      config = await response.json();

      document.getElementById('product-name').textContent = config.name;
      const formattedPrice = money(config.sale);
      document.getElementById('total').textContent = formattedPrice;
      document.getElementById('subtotal').textContent = formattedPrice;
      if (buttonAmount) buttonAmount.textContent = formattedPrice;
      document.getElementById('currency-note').textContent = 'Importe total de esta compra en ' + config.currency + '.';

      if (!config.ready) {
        notice.textContent = 'El pago estará disponible próximamente.';
        notice.hidden = false;
        button.disabled = true;
        return;
      }

      if (config.mode === 'test') {
        notice.textContent = 'Modo de prueba activo. Utiliza únicamente los datos de prueba de Stripe.';
        notice.hidden = false;
      }

      if (!window.Stripe) throw new Error('No se ha podido cargar la pasarela de pago segura. Actualiza la página.');
      stripe = Stripe(config.publishableKey, { locale: 'es' });

      // Inicialização direta do Stripe Elements com Deferred Intent
      elements = stripe.elements({
        mode: 'payment',
        amount: config.sale,
        currency: config.currency.toLowerCase(),
        locale: 'es',
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#214d39',
            colorText: '#292e26',
            colorBackground: '#ffffff',
            colorDanger: '#a1322b',
            borderRadius: '6px',
            fontFamily: 'Inter, Arial, sans-serif',
            fontSizeBase: '14px',
            spacingUnit: '4px'
          },
          rules: {
            '.Input': {
              border: '1px solid #d8dbd1',
              boxShadow: 'none',
              padding: '12px 14px'
            },
            '.Input:focus': {
              borderColor: '#214d39',
              boxShadow: '0 0 0 1px #214d39'
            },
            '.Tab': {
              border: '1px solid #d8dbd1',
              backgroundColor: '#fbfbfa'
            },
            '.Tab--selected': {
              borderColor: '#214d39',
              backgroundColor: '#ffffff'
            }
          }
        }
      });

      const paymentElement = elements.create('payment', {
        layout: 'tabs',
        defaultValues: {
          billingDetails: {
            address: { country: 'ES' }
          }
        }
      });

      const container = document.getElementById('payment-element');
      container.replaceChildren();
      paymentElement.mount('#payment-element');

      paymentElement.on('ready', () => {
        button.disabled = false;
      });

      paymentElement.on('change', () => {
        hideError();
      });

    } catch (e) {
      showError(e.message);
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !config?.ready) return;

    if (!form.reportValidity()) return;

    busy = true;
    hideError();
    button.disabled = true;
    const originalText = button.innerHTML;
    button.innerHTML = '<span>🔒 Procesando pago seguro…</span>';

    try {
      // 1. Validação dos dados do cartão no Stripe Elements
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message || 'Por favor, revisa los datos de tu tarjeta.');
      }

      const name = form.elements.name.value.trim();
      const email = form.elements.email.value.trim().toLowerCase();

      // 2. Criação do PaymentIntent no backend
      const response = await fetch('/api/checkout/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          plan,
          amount: config.sale,
          name,
          email
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'No se ha podido preparar el pago. Inténtalo de nuevo.');
      }

      // 3. Confirmação do pagamento com Stripe
      const { error: paymentError } = await stripe.confirmPayment({
        elements,
        clientSecret: result.clientSecret,
        confirmParams: {
          return_url: location.origin + '/confirmacion?' + new URLSearchParams({ token }),
          payment_method_data: {
            billing_details: {
              name,
              email,
              address: { country: 'ES' }
            }
          }
        },
        redirect: 'if_required'
      });

      if (paymentError) {
        throw new Error(paymentError.message || 'No se pudo completar el pago. Revisa los datos de tu tarjeta.');
      }

      // 4. Sucesso: Transição para verificação e entrega
      form.hidden = true;
      document.getElementById('confirmation').hidden = false;
      document.getElementById('estado').dataset.token = token;

      const script = document.createElement('script');
      script.src = '/confirmacion-pago.js';
      document.body.append(script);

    } catch (e) {
      showError(e.message);
      button.disabled = false;
      button.innerHTML = originalText;
      busy = false;
    }
  });

  load();
})();
