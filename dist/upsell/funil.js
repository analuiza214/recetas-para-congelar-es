(() => {
  try { history.scrollRestoration = 'manual'; } catch {}
  function topo() { window.scrollTo(0, 0); }
  topo();
  window.addEventListener('load', topo);
  window.addEventListener('pageshow', topo);

  const params = new URLSearchParams(location.search);
  params.delete('btn');
  document.querySelectorAll('a[data-recusar]').forEach((link) => {
    const destination = new URL(link.href);
    if (destination.origin !== location.origin) return;
    for (const [key, value] of params) destination.searchParams.append(key, value);
    link.href = destination.href;
    link.addEventListener('click', topo);
  });

  // Loader de transición suave entre propuestas de downsell
  var ld = document.querySelector('.loader');
  if (ld) {
    var itens = ld.querySelectorAll('li');
    var barra = ld.querySelector('.trilho2 i');
    var total = 3600;
    document.body.style.overflow = 'hidden';
    topo();
    if (barra) {
      barra.style.transitionDuration = (total - 300) + 'ms';
      setTimeout(function () { barra.style.width = '100%'; }, 50);
    }
    itens.forEach(function (li, i) {
      setTimeout(function () { li.classList.add('ok'); }, 600 + i * ((total - 1000) / itens.length));
    });
    setTimeout(function () {
      topo();
      ld.classList.add('some');
      document.body.style.overflow = '';
      setTimeout(function () { ld.remove(); }, 450);
    }, total);
  }

})();
