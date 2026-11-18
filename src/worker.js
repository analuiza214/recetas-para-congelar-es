export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Rota dedicada para a nova copy (/copyanti)
    if (url.pathname === '/copyanti' || url.pathname === '/copyanti/') {
      return env.ASSETS.fetch(new Request(new URL('/copyanti/index.html', request.url), request));
    }
    
    // Serve all static assets from dist/ via Assets binding
    return env.ASSETS.fetch(request);
  }
};
