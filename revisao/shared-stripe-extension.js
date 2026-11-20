import { WorkerEntrypoint } from 'cloudflare:workers';
import legacy from '../_worker.js';
import { offers, currency } from '../src/offer-catalog.js';
import { verifyAdminToken } from './admin-auth.js';

async function db(env, table, query = '', method = 'GET', body) {
  const response = await fetch(String(env.SUPABASE_URL).replace(/\/+$/, '') + '/rest/v1/' + table + query, {
    method, headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json', Prefer: 'return=representation' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Banco indisponível.');
  return response.json();
}
const response = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
function validPlan(plan) { if (!Object.hasOwn(offers, plan)) throw new Error('Plano inválido.'); }
async function products(env) {
  const rows = await db(env, 'gokoco_product_prices', '?id=like.oferta-espanha:*&select=*');
  return Object.entries(offers).map(([plan, item]) => {
    const id = 'oferta-espanha:' + plan, row = rows.find(r => r.id === id);
    return { id, name: 'Oferta Espanha · ' + item.name, salePrice: row ? Number(row.sale_price) : item.sale / 100,
      originalPrice: row ? Number(row.original_price) : item.original / 100, pixDiscountPercent: 0,
      recoveryDiscountPercent: 0, scope: 'oferta-espanha', currency, version: row?.version || null };
  });
}
async function price(env, plan) {
  validPlan(plan);
  const item = (await products(env)).find(p => p.id === 'oferta-espanha:' + plan);
  return { sale: Math.round(item.salePrice * 100), original: Math.round(item.originalPrice * 100) };
}
async function quote(env, token) {
  const rows = await db(env, 'oferta_espanha_checkout', '?callback=eq.' + encodeURIComponent(token) + '&select=*&limit=1');
  return rows[0] || null;
}
export class OfertaEspanhaCheckout extends WorkerEntrypoint {
  price(plan) { return price(this.env, plan); }
  quote(token) { return quote(this.env, token); }
  async reserve({ callback, key, amount, name, email }) {
    const expected = await price(this.env, key);
    if (expected.sale !== amount) throw new Error('Preço alterado.');
    const row = { callback, plan: key, amount_cents: amount, offer_id: callback, buyer_name: name, buyer_email: email };
    try { await db(this.env, 'oferta_espanha_checkout', '', 'POST', row); return row; }
    catch {
      const old = await quote(this.env, callback);
      if (old?.plan === key && old.amount_cents === amount && old.buyer_name === name && old.buyer_email === email) return old;
      throw new Error('Checkout concorrente ou indisponível.');
    }
  }
  record({ callback, offerId, transaction, status, amount, created, name, email, method }) {
    return db(this.env, 'rpc/oferta_espanha_record_payment', '', 'POST', { p_callback: callback, p_offer: offerId,
      p_transaction: transaction, p_status: status, p_amount: amount, p_created: created, p_name: name, p_email: email, p_method: method });
  }
  async status(token) {
    const q = await quote(this.env, token);
    if (!q) return null;
    const rows = await db(this.env, 'oferta_espanha_orders', '?callback=eq.' + encodeURIComponent(token) + '&select=status&limit=1');
    return { key: q.plan, status: rows[0]?.status || 'pending' };
  }
}
async function savePrice(request, env) {
  const body = await request.json(), plan = String(body.id).slice(15);
  validPlan(plan);
  const { originalPrice: original, salePrice: sale } = body;
  if (![original, sale].every(v => typeof v === 'number' && Number.isFinite(v) && Math.abs(Math.round(v * 100) - v * 100) < 0.000001) ||
      sale < .5 || original < sale || original > 999999.99 || body.pixDiscountPercent !== 0 || body.recoveryDiscountPercent !== 0) return response({ error: 'Preços inválidos.' }, 400);
  const current = (await products(env)).find(p => p.id === body.id);
  if ((body.version || null) !== current.version) return response({ error: 'O preço mudou. Atualize a página.' }, 409);
  const version = crypto.randomUUID();
  try {
    const rows = await db(env, 'gokoco_product_prices', current.version ? '?id=eq.' + encodeURIComponent(body.id) + '&version=eq.' + encodeURIComponent(current.version) : '',
      current.version ? 'PATCH' : 'POST', { id: body.id, original_price: original, sale_price: sale,
        pix_discount_percent: 0, recovery_discount_percent: 0, version, updated_at: new Date().toISOString() });
    if (!rows.length) return response({ error: 'O preço mudou. Atualize a página.' }, 409);
    return response({ product: { ...current, originalPrice: original, salePrice: sale, version } });
  } catch { return response({ error: 'Não foi possível salvar. Atualize a página.' }, 409); }
}
export function withOfferAdmin(assets) {
  return {
    ...legacy,
    async fetch(request, env, ctx) {
      const url = new URL(request.url), path = url.pathname;
      if (Object.hasOwn(assets, path) && ['GET', 'HEAD'].includes(request.method)) return new Response(request.method === 'HEAD' ? null : assets[path], {
        headers: { 'Content-Type': path.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' },
      });
      if (path === '/api/admin/oferta-espanha-orders' || (path === '/api/admin/product-prices' && request.method === 'PATCH')) {
        if (!(await verifyAdminToken(request, env)).valid) return response({ error: 'Não autorizado.' }, 401);
        if (path.endsWith('/product-prices')) {
          const body = await request.clone().json();
          if (String(body.id).startsWith('oferta-espanha:')) return savePrice(request, env);
          return legacy.fetch(request, env, ctx);
        }
        if (request.method !== 'GET') return response({ error: 'Método inválido.' }, 405);
        const offset = Number(url.searchParams.get('offset') || 0), before = url.searchParams.get('before');
        if (!Number.isSafeInteger(offset) || offset < 0 || offset % 200 || (before && !Number.isFinite(Date.parse(before)))) return response({ error: 'Página inválida.' }, 400);
        const params = new URLSearchParams({ select: 'id,plan,amount_cents,status,created_at,name,email', order: 'created_at.desc,id.desc', limit: '200', offset: String(offset) });
        if (before) params.set('created_at', 'lte.' + new Date(before).toISOString());
        const rows = await db(env, 'oferta_espanha_orders', '?' + params);
        return response({ orders: rows.map(row => ({ ...row, transaction_id: row.id, amount: row.amount_cents / 100,
          currency, siteVariant: 'oferta-espanha', productId: row.plan, gateway: 'stripe', paymentMethod: 'card',
          products: [{ name: offers[row.plan].name, quantity: 1 }] })) });
      }
      const result = await legacy.fetch(request, env, ctx);
      if (['/admin', '/admin.html'].includes(path) && result.ok && result.headers.get('Content-Type')?.includes('text/html')) {
        let html = await result.text();
        if (!html.includes('value="oferta-espanha"')) {
          const options = '<option value="oferta-espanha">Oferta Espanha</option>' + Object.entries(offers)
            .map(([key, item]) => '<option value="oferta-espanha:' + key + '">Oferta Espanha · ' + item.name + '</option>').join('');
          html = html.replace('<option value="forja">Forja Ferramentas</option>', '<option value="forja">Forja Ferramentas</option>' + options);
          html = html.replace('</nav>\n      <nav class="status-filters fee-filters" id="fee-filters"', '<button data-site="oferta-espanha">Oferta Espanha <span id="site-oferta-espanha">0</span></button></nav>\n      <nav class="status-filters fee-filters" id="fee-filters"');
          html = html.replace(/src="\/admin.js[^\"]*"/, 'src="/admin.js?v=oferta-espanha2"')
            .replace(/src="\/js\/admin-pricing.js[^\"]*"/, 'src="/js/admin-pricing.js?v=oferta-espanha2"');
        }
        const headers = new Headers(result.headers);
        headers.delete('Content-Length');
        headers.set('Cache-Control', 'no-store');
        return new Response(html, { status: result.status, headers });
      }
      if (path === '/api/admin/product-prices' && request.method === 'GET' && result.ok) {
        const body = await result.json();
        return response({ ...body, products: [...body.products, ...await products(env)] });
      }
      return result;
    },
  };
}
