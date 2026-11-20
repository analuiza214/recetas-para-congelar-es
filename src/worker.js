import { checkoutRoute } from './checkout.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const checkout = await checkoutRoute(request, env, url);
    if (checkout) return checkout;
    if (url.pathname === '/confirmacion') {
      const asset = await env.ASSETS.fetch(new Request(new URL('/confirmacion-pago', request.url), request));
      const response = new Response(asset.body, asset);
      response.headers.set('Referrer-Policy', 'no-referrer');
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }
    
    // Rota dedicada para a nova copy (/copyanti)
    if (url.pathname === '/copyanti' || url.pathname === '/copyanti/') {
      return env.ASSETS.fetch(new Request(new URL('/copyanti/', request.url), request));
    }
    
    // Serve all static assets from dist/ via Assets binding
    return env.ASSETS.fetch(request);
  }
};
