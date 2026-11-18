/**
 * CONFIGURACIÓN CENTRALIZADA DEL EMBUDO DE UPSELL & DOWNSELLS
 *
 * Puedes cambiar los links de checkout de cada oferta aquí abajo.
 * El script se encarga automáticamente de repasar los parámetros UTM de la URL
 * y de controlar los tiempos de revelación del video (VSL).
 */
window.FUNIL = {
  // Segundos de video antes de mostrar los botones de compra (60s por defecto)
  segundosParaBotao: 60,

  // Símbolo de moneda
  currency: '$',

  // Links de cada etapa del embudo
  ofertas: {
    // 1. Upsell Principal (1 Año de Acceso)
    upsell: {
      checkout: 'https://pay.cakto.com.br/jceiv4a', // Cambia por tu link de checkout
      recusa: '6-meses.html'
    },
    // 2. Downsell 1 (6 Meses)
    ds6: {
      checkout: 'https://pay.cakto.com.br/7qyfs95', // Cambia por tu link de checkout
      recusa: '3-meses.html'
    },
    // 3. Downsell 2 (3 Meses)
    ds3: {
      checkout: 'https://pay.cakto.com.br/39j4qgb', // Cambia por tu link de checkout
      recusa: '1-mes.html'
    },
    // 4. Downsell 3 (1 Mes)
    ds1: {
      checkout: 'https://pay.cakto.com.br/32vngww', // Cambia por tu link de checkout
      recusa: 'gracias.html'
    }
  }
};

/* ---------------- LÓGICA DEL EMBUDO Y VSL ---------------- */
(function () {
  try { history.scrollRestoration = 'manual'; } catch (e) {}
  function topo() { window.scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; }
  topo();
  window.addEventListener('load', topo);
  window.addEventListener('pageshow', topo);

  var teste = /[?&]btn=1/.test(location.search);
  var qs = (location.search || '').replace(/([?&])btn=1(&|$)/, '$1').replace(/[?&]$/, '');
  function comParams(url) {
    if (!url || url.charAt(0) === '#' || !qs) return url;
    return url + (url.indexOf('?') > -1 ? '&' + qs.slice(1) : qs);
  }

  var etapa = document.body.getAttribute('data-oferta');
  var cfg = FUNIL.ofertas[etapa] || {};

  // Enlazar botones de aceptación y rechazo (propagando parámetros UTM)
  document.querySelectorAll('[data-aceitar]').forEach(function (a) {
    if (cfg.checkout) a.href = comParams(cfg.checkout);
  });
  document.querySelectorAll('[data-recusar]').forEach(function (a) {
    if (cfg.recusa) {
      a.href = comParams(cfg.recusa);
      a.addEventListener('click', topo);
    }
  });

  // Si se pega el iframe/código embebido de la pasarela, se ocultan botones estándar
  var slot = document.querySelector('.cakto-slot');
  if (slot && slot.innerHTML.trim().replace(/<!--[\s\S]*?-->/g, '').trim()) {
    document.querySelectorAll('.padrao').forEach(function (el) { el.classList.add('oculto'); });
  }

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

  // Controlador de Video con retraso de oferta (VSL)
  var box = document.querySelector('.video');
  if (!box) return;
  var v = box.querySelector('video');
  var som = box.querySelector('.som');
  var trilho = box.querySelector('.trilho i');
  var chave = 'vsl_upsell_liberado';
  var liberado = false;
  var escondidos = document.querySelectorAll('[data-revelar]');

  function revelar() {
    if (liberado) return;
    liberado = true;
    escondidos.forEach(function (el) { el.classList.remove('oculto'); el.classList.add('aparece'); });
    try { localStorage.setItem(chave, '1'); } catch (e) {}
  }
  try { if (localStorage.getItem(chave) === '1') revelar(); } catch (e) {}
  if (teste) revelar();

  if (v) {
    v.muted = true;
    var p = v.play();
    if (p && p.catch) p.catch(function () {});

    if (som) {
      som.addEventListener('click', function () {
        v.currentTime = 0;
        v.muted = false;
        v.play();
        som.remove();
        som = null;
      });
    }

    v.addEventListener('click', function () {
      if (som) return;
      if (v.paused) {
        v.play();
        box.classList.remove('pausado');
      } else {
        v.pause();
        box.classList.add('pausado');
      }
    });

    var pausaBtn = box.querySelector('.pausa');
    if (pausaBtn) {
      pausaBtn.addEventListener('click', function () {
        v.play();
        box.classList.remove('pausado');
      });
    }

    v.addEventListener('timeupdate', function () {
      if (trilho) {
        var r = v.currentTime / (v.duration || 138);
        trilho.style.width = (Math.pow(r, 0.6) * 100) + '%';
      }
      if (v.currentTime >= FUNIL.segundosParaBotao) revelar();
    });

    v.addEventListener('ended', function () {
      revelar();
      box.classList.add('pausado');
    });
  }
})();