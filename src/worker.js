export default {
  async fetch(request, env) {
    // Serve all static assets from dist/ via Assets binding
    return env.ASSETS.fetch(request);
  }
};
