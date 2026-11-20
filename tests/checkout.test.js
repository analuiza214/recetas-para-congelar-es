import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createHmac } from 'node:crypto';
import worker from '../src/worker.js';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const origin = 'https://oferta.example';
const token = '12345678-1234-4234-8234-123456789012';
const secret = 'whsec_test_fixture';
function setup() {
  const quotes = new Map(), orders = new Map(), calls = [];
  let price = 990;
  const env = { STRIPE_MODE: 'test', STRIPE_SECRET_KEY: 'sk_test_fixture', STRIPE_PUBLISHABLE_KEY: 'pk_test_fixture', STRIPE_WEBHOOK_SECRET: secret,
    ASSETS: { fetch: async () => new Response('<h1>Checkout</h1>') },
    BELLA_CHECKOUT: {
      price: async () => ({ sale: price, original: 2700 }),
      quote: async id => quotes.get(id),
      reserve: async q => { const row = { callback: q.callback, plan: q.key, amount_cents: q.amount, buyer_name: q.name, buyer_email: q.email }; quotes.set(q.callback, row); return row; },
      record: async o => { orders.set(o.transaction, o); return 'ok'; },
      status: async () => ({ key: 'basic', status: orders.get('pi_fixture')?.status || 'pending' }),
    } };
  const intent = { id: 'pi_fixture', status: 'succeeded', amount: 990, amount_received: 990, currency: 'usd',
    created: 1795090000, livemode: false, client_secret: 'pi_fixture_secret_fixture',
    metadata: { store_id: 'oferta-espanha', plan: 'basic', checkout_token: token }, latest_charge: { refunded: false, disputed: false } };
  globalThis.fetch = async (url, options) => { calls.push([url, options]); return Response.json(intent); };
  const request = (path, options) => worker.fetch(new Request(origin + path, options), env);
  const create = (overrides = {}) => request('/api/checkout/intent', { method: 'POST', headers: { Origin: origin }, body: JSON.stringify({
    token, plan: 'basic', amount: price, name: 'Ana Teste', email: 'ana@example.com', ...overrides,
  }) });
  const notify = (signatureSecret = secret, age = 0) => {
    const raw = JSON.stringify({ id: 'evt_fixture', type: 'payment_intent.succeeded', livemode: false, data: { object: { id: 'pi_fixture' } } });
    const timestamp = Math.floor(Date.now() / 1000) - age;
    return request('/api/checkout/stripe', { method: 'POST', headers: { 'Stripe-Signature': 't=' + timestamp + ',v1=' + createHmac('sha256', signatureSecret).update(timestamp + '.' + raw).digest('hex') }, body: raw });
  };
  return { env, intent, calls, quotes, orders, request, create, notify, changePrice: p => { price = p; } };
}
test('shows a checkout before secrets are configured and exposes only a publishable key', async () => {
  const f = setup();
  assert.equal((await f.request('/comprar?plan=basic')).status, 200);
  const config = await (await f.request('/api/checkout/config?plan=basic')).json();
  assert.equal(config.ready, true);
  assert.equal(config.publishableKey, 'pk_test_fixture');
  assert.doesNotMatch(JSON.stringify(config), /sk_test|whsec/);
  f.env.STRIPE_SECRET_KEY = 'rk_test_restricted_fixture';
  assert.equal((await (await f.request('/api/checkout/config?plan=basic')).json()).ready, true);
  f.env.STRIPE_SECRET_KEY = 'sk_live_wrongmode';
  assert.equal((await (await f.request('/api/checkout/config?plan=basic')).json()).ready, false);
});
test('creates server-priced intents with stable idempotency, and preserves old prices on retries', async () => {
  const f = setup();
  assert.equal((await f.create({ amount: 1 })).status, 409);
  assert.equal(f.calls.length, 0);
  assert.equal((await f.create()).status, 200);
  f.changePrice(1090);
  assert.equal((await f.create()).status, 200);
  for (const [, options] of f.calls) {
    assert.equal(options.redirect, 'manual');
    assert.equal(options.headers['Idempotency-Key'], 'oferta-espanha-v2-' + token);
    assert.equal(options.body.get('amount'), '990');
    assert.equal(options.body.get('allowed_payment_method_types[]'), 'card');
  }
  assert.equal((await f.create({ email: 'other@example.com' })).status, 409);
});

test('only enables live checkout after Stripe confirms the account can process charges', async () => {
  const f = setup();
  f.env.STRIPE_MODE = 'live';
  f.env.STRIPE_SECRET_KEY = 'rk_live_restricted_fixture';
  f.env.STRIPE_PUBLISHABLE_KEY = 'pk_live_fixture';
  let enabled = false;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.stripe.com/v1/account');
    assert.equal(options.method, 'GET');
    return Response.json({ charges_enabled: enabled });
  };
  assert.equal((await (await f.request('/api/checkout/config?plan=basic')).json()).ready, false);
  enabled = true;
  assert.equal((await (await f.request('/api/checkout/config?plan=basic')).json()).ready, true);
});
test('authenticates webhook raw bodies, verifies canonical amount and deduplicates payment records', async () => {
  const f = setup();
  await f.create();
  assert.equal((await f.notify('wrong')).status, 400);
  assert.equal((await f.notify(secret, 400)).status, 400);
  assert.equal((await f.notify()).status, 200);
  assert.equal((await f.notify()).status, 200);
  assert.equal(f.orders.size, 1);
  assert.equal((await (await f.request('/api/checkout/estado?token=' + token)).json()).status, 'paid');
  f.intent.amount = 1;
  assert.equal((await f.notify()).status, 422);
});
test('handles refunds and disputes using current Stripe state rather than event arrival order', async () => {
  const f = setup();
  await f.create();
  f.intent.latest_charge.disputed = true;
  assert.equal((await f.notify()).status, 200);
  assert.equal(f.orders.get('pi_fixture').status, 'chargedback');
  f.intent.latest_charge.refunded = true;
  assert.equal((await f.notify()).status, 200);
  assert.equal(f.orders.get('pi_fixture').status, 'refunded');
});
test('blocks cross-origin creation and validates buyer data', async () => {
  const f = setup();
  assert.equal((await f.request('/api/checkout/intent', { method: 'POST', body: '{}' })).status, 403);
  assert.equal((await f.create({ email: 'invalid' })).status, 400);
  assert.equal(f.calls.length, 0);
});
