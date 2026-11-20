import { offers, currency } from './offer-catalog.js';

const uuid = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;
const encoder = new TextEncoder();
const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
const json = (body, status = 200) => Response.json(body, { status, headers });
const keyMode = key => /^(?:sk|rk)_test_/.test(key || '') ? 'test' : /^(?:sk|rk)_live_/.test(key || '') ? 'live' : null;
const configured = env => keyMode(env.STRIPE_SECRET_KEY) === (env.STRIPE_MODE || 'test') &&
  String(env.STRIPE_PUBLISHABLE_KEY || '').startsWith('pk_' + (env.STRIPE_MODE || 'test') + '_') &&
  env.BELLA_CHECKOUT && env.STRIPE_WEBHOOK_SECRET;

async function stripe(env, path, body, idempotency) {
  const response = await fetch('https://api.stripe.com/v1/' + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'Stripe-Version': '2026-10-28.endive',
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(idempotency ? { 'Idempotency-Key': idempotency } : {}) },
    ...(body ? { body: new URLSearchParams(body) } : {}),
    redirect: 'manual', signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    const failure = new Error('stripe_request_failed');
    failure.gatewayStatus = response.status;
    throw failure;
  }
  return response.json();
}

async function readBody(request, limit = 65536) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('body_missing');
  let size = 0;
  const chunks = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) { await reader.cancel(); throw new Error('body_too_large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(bytes);
}

async function validSignature(raw, header, secret) {
  const fields = String(header || '').split(',').map(v => v.split('='));
  const timestamp = fields.find(([key]) => key === 't')?.[1];
  if (!/^\d{10}$/.test(timestamp || '') || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  for (const [version, signature] of fields) {
    if (version !== 'v1' || !/^[a-f0-9]{64}$/i.test(signature || '')) continue;
    const digest = Uint8Array.from(signature.match(/../g), hex => parseInt(hex, 16));
    if (await crypto.subtle.verify('HMAC', key, digest, encoder.encode(timestamp + '.' + raw))) return true;
  }
  return false;
}

async function webhook(request, env) {
  if (!configured(env)) return json({ error: 'unavailable' }, 503);
  const raw = await readBody(request);
  if (!await validSignature(raw, request.headers.get('Stripe-Signature'), env.STRIPE_WEBHOOK_SECRET)) return json({ error: 'signature' }, 400);
  const event = JSON.parse(raw);
  if (event.livemode !== (env.STRIPE_MODE === 'live')) return json({ error: 'mode' }, 400);
  if (!['payment_intent.succeeded', 'charge.refunded', 'charge.dispute.created', 'charge.dispute.closed'].includes(event.type)) return json({ received: true });
  const object = event.data?.object;
  const id = event.type === 'payment_intent.succeeded' ? object?.id : object?.payment_intent;
  if (!/^pi_[a-zA-Z0-9]+$/.test(id || '')) return json({ received: true });
  const intent = await stripe(env, 'payment_intents/' + id + '?expand[]=latest_charge');
  const token = intent.metadata?.checkout_token;
  if (intent.metadata?.store_id !== 'oferta-espanha' || !uuid.test(token)) return json({ received: true });
  const quote = await env.BELLA_CHECKOUT.quote(token);
  if (!quote || quote.plan !== intent.metadata.plan || quote.amount_cents !== intent.amount ||
      intent.amount_received !== intent.amount || intent.currency !== currency.toLowerCase() ||
      intent.status !== 'succeeded' || intent.livemode !== event.livemode) return json({ error: 'payment_mismatch' }, 422);
  const charge = intent.latest_charge;
  let status = charge?.refunded ? 'refunded' : charge?.disputed ? 'chargedback' : 'paid';
  // Partial refunds retain paid status and need manual review in Stripe.
  const result = await env.BELLA_CHECKOUT.record({
    callback: token, offerId: token, transaction: intent.id, amount: intent.amount, status,
    created: new Date(intent.created * 1000).toISOString(), name: quote.buyer_name,
    email: quote.buyer_email, method: 'card',
  });
  if (result !== 'ok') return json({ error: 'snapshot_mismatch' }, 422);
  return json({ received: true });
}

export async function checkoutRoute(request, env, url) {
  if (url.pathname === '/comprar') {
    if (!['GET', 'HEAD'].includes(request.method)) return json({ error: 'method' }, 405);
    const plan = url.searchParams.get('plan') || 'basic';
    if (!Object.hasOwn(offers, plan)) return json({ error: 'plan' }, 404);
    const asset = await env.ASSETS.fetch(new Request(new URL('/checkout.html', url)));
    const response = new Response(asset.body, asset);
    for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
    return response;
  }
  if (!url.pathname.startsWith('/api/checkout/')) return null;
  try {
    if (url.pathname === '/api/checkout/stripe') return request.method === 'POST' ? await webhook(request, env) : json({ error: 'method' }, 405);
    if (url.pathname === '/api/checkout/config' && request.method === 'GET') {
      const plan = url.searchParams.get('plan') || 'basic';
      if (!Object.hasOwn(offers, plan)) return json({ error: 'plan' }, 404);
      const price = env.BELLA_CHECKOUT ? await env.BELLA_CHECKOUT.price(plan) : offers[plan];
      let accountEnabled = false;
      if (configured(env) && env.STRIPE_MODE === 'live') {
        const account = await stripe(env, 'account');
        accountEnabled = account.charges_enabled === true;
      }
      return json({ plan, name: offers[plan].name, currency, ...price,
        ready: !!configured(env) && env.OFERTA_ESPANHA_PAUSE !== 'true' && (env.STRIPE_MODE !== 'live' || accountEnabled),
        publishableKey: configured(env) ? env.STRIPE_PUBLISHABLE_KEY : null, mode: env.STRIPE_MODE || 'test' });
    }
    if (url.pathname === '/api/checkout/precios' && request.method === 'GET') {
      const plans = [...new Set(url.searchParams.getAll('plan'))];
      if (!plans.length || plans.some(plan => !Object.hasOwn(offers, plan))) return json({ error: 'plan' }, 400);
      const entries = await Promise.all(plans.map(async plan => [plan, {
        ...(env.BELLA_CHECKOUT ? await env.BELLA_CHECKOUT.price(plan) : offers[plan]), available: true,
      }]));
      return json({ currency, offers: Object.fromEntries(entries) });
    }
    if (url.pathname === '/api/checkout/intent' && request.method === 'POST') {
      if (request.headers.get('Origin') !== url.origin) return json({ error: 'origin' }, 403);
      if (!configured(env) || env.OFERTA_ESPANHA_PAUSE === 'true') return json({ error: 'El pago todavía no está disponible.' }, 503);
      const body = JSON.parse(await readBody(request, 4096));
      if (!Object.hasOwn(offers, body.plan) || !uuid.test(body.token) || typeof body.name !== 'string' ||
          body.name.trim().length < 3 || body.name.length > 150 || typeof body.email !== 'string' ||
          body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return json({ error: 'Revisa tu nombre y correo electrónico.' }, 400);
      const old = await env.BELLA_CHECKOUT.quote(body.token);
      if (old && Date.now() - Date.parse(old.created_at) > 23 * 60 * 60 * 1000) return json({ error: 'Esta sesión ha caducado. Actualiza la página para iniciar otra compra.' }, 409);
      if (old && (old.plan !== body.plan || old.buyer_name !== body.name.trim() || old.buyer_email !== body.email.trim().toLowerCase())) return json({ error: 'Inicia una nueva compra para cambiar los datos.' }, 409);
      const price = old ? { sale: old.amount_cents } : await env.BELLA_CHECKOUT.price(body.plan);
      if (!Number.isInteger(price.sale) || price.sale < 50 || price.sale > 99999999) return json({ error: 'Precio no disponible.' }, 503);
      if (!old && price.sale !== body.amount) return json({ error: 'El precio ha cambiado. Actualiza la página.' }, 409);
      const quote = old || await env.BELLA_CHECKOUT.reserve({
        callback: body.token, key: body.plan, amount: price.sale, name: body.name.trim(), email: body.email.trim().toLowerCase(),
      });
      const intent = await stripe(env, 'payment_intents', {
        amount: String(quote.amount_cents), currency: currency.toLowerCase(),
        'allowed_payment_method_types[]': 'card', description: offers[body.plan].name,
        'metadata[store_id]': 'oferta-espanha', 'metadata[plan]': body.plan,
        'metadata[checkout_token]': body.token, receipt_email: quote.buyer_email,
      }, 'oferta-espanha-v2-' + body.token);
      return json({ clientSecret: intent.client_secret, token: body.token, amount: intent.amount });
    }
    if (url.pathname === '/api/checkout/estado' && request.method === 'GET') {
      const token = url.searchParams.get('token');
      if (!uuid.test(token)) return json({ error: 'token' }, 400);
      if (!env.BELLA_CHECKOUT) return json({ error: 'unavailable' }, 503);
      const order = await env.BELLA_CHECKOUT.status(token);
      if (!order) return json({ status: 'unknown' }, 404);
      return json({ status: order.status, ...(order.status === 'paid' ? { next: ['basic', 'premium'].includes(order.key) ? '/upsell/' : '/upsell/gracias.html' } : {}) });
    }
    return json({ error: 'not_found' }, 404);
  } catch (error) {
    return json({ error: 'No hemos podido completar la operación. Inténtalo de nuevo.', ...(Number.isInteger(error.gatewayStatus) ? { gatewayStatus: error.gatewayStatus } : {}) }, 503);
  }
}
