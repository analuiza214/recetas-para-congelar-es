const OFFER_CONFIG = { currency: '$', bonusesTotalValue: '47' };

document.addEventListener('DOMContentLoaded', () => {
  // 1. APLICAR CONFIGURACIÓN DE PRECIOS Y MONEDA AL DOM
  applyPricingConfig();

  // 3. INICIALIZAR EL ACORDEÓN DE PREGUNTAS FRECUENTES (FAQ)
  initFaqAccordion();

  // 4. CONTROLADOR DE LA BARRA FLOTANTE MÓVIL (STICKY BAR)
  initMobileStickyBar();
});

/**
 * Aplica los valores de OFFER_CONFIG en todos los elementos correspondientes
 */
function applyPricingConfig() {
  const bonusHeader = document.querySelector('[data-bonus-total-header]');
  if (bonusHeader) bonusHeader.textContent = OFFER_CONFIG.currency + OFFER_CONFIG.bonusesTotalValue;
}

/**
 * Acordeón interactivo suave para preguntas frecuentes
 */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach((item) => {
    const questionBtn = item.querySelector('.faq-question');
    if (!questionBtn) return;

    questionBtn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Cerrar otros acordeones si se desea comportamiento único
      faqItems.forEach((other) => {
        if (other !== item) {
          other.classList.remove('active');
        }
      });

      // Alternar el actual
      if (isActive) {
        item.classList.remove('active');
      } else {
        item.classList.add('active');
      }
    });
  });
}

/**
 * Barra flotante en móviles con llamada a la acción
 */
function initMobileStickyBar() {
  const bar = document.getElementById('sticky-bar');
  const ofertasSection = document.getElementById('ofertas');
  if (!bar) return;

  const handleScroll = () => {
    // Si estamos en pantallas medianas o grandes, la barra se oculta via CSS (md:hidden)
    if (window.innerWidth >= 768) return;

    const scrollY = window.scrollY || window.pageYOffset;
    let isOfertasInView = false;

    if (ofertasSection) {
      const rect = ofertasSection.getBoundingClientRect();
      // Detectar si la sección de ofertas está actualmente en pantalla
      isOfertasInView = rect.top < window.innerHeight && rect.bottom > 0;
    }

    // Mostrar barra si se ha scrolleado más de 500px y no estamos tapando las ofertas
    if (scrollY > 500 && !isOfertasInView) {
      bar.classList.remove('translate-y-full');
      bar.classList.add('translate-y-0');
    } else {
      bar.classList.add('translate-y-full');
      bar.classList.remove('translate-y-0');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleScroll, { passive: true });
  handleScroll();
}
