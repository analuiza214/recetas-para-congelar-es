const state = document.getElementById('estado');
const token = state.dataset.token || new URLSearchParams(location.search).get('token');
const next = document.getElementById('continuar');
const destinations = new Set(['/upsell/', '/upsell/gracias.html']);
let deadline = Date.now() + 90000;
let timer;
let checking = false;
let finished = false;

async function verifyPayment() {
  if (checking || finished) return;
  clearTimeout(timer);
  if (!token) {
    state.textContent = 'Abre el enlace que recibiste después de pagar.';
    return;
  }
  checking = true;
  try {
    const response = await fetch('/api/checkout/estado?' + new URLSearchParams({ token }));
    if ([400, 404].includes(response.status)) {
      finished = true;
      state.textContent = 'No encontramos esta referencia de pago.';
      return;
    }
    const result = await response.json();
    if (result.status === 'paid' && destinations.has(result.next)) {
      finished = true;
      state.textContent = 'Tu pago está confirmado.';
      next.href = result.next;
      next.hidden = false;
      return;
    }
    if (['refunded', 'chargedback'].includes(result.status)) {
      finished = true;
      state.textContent = 'Este pago ya no está activo.';
      return;
    }
  } catch {} finally { checking = false; }
  if (Date.now() < deadline) timer = setTimeout(verifyPayment, 3000);
  else state.textContent = 'Aún esperamos la confirmación. Si estás pagando en otra pestaña, vuelve aquí al terminar.';
}

window.addEventListener('focus', () => {
  if (Date.now() >= deadline) deadline = Date.now() + 90000;
  verifyPayment();
});
verifyPayment();
