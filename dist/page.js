/**
 * RECETAS SALUDABLES PARA CONGELAR — SCRIPT DE OFERTA Y LOCALIZACIÓN
 * 
 * Configuración centralizada para vender en el mercado hispanohablante ("vender na gringa").
 * Puedes cambiar los precios, moneda y links de checkout directamente aquí abajo.
 */

const OFFER_CONFIG = {
  // Símbolo de moneda (ej: '$' para USD en Latam/EEUU, o '€' para España)
  currency: '$',

  // Precios del Plan Esencial
  priceBasicOld: '27',
  priceBasicCurrent: '9.90',

  // Precios del Plan Completo / Premium (Más Elegido)
  pricePremiumOld: '47',
  pricePremiumCurrent: '19.90',

  // Valor total de los bonos de regalo
  bonusesTotalValue: '47',

  // URLs de Checkout directas (Cakto, Hotmart, Stripe, etc.)
  checkoutUrlBasic: 'https://pay.cakto.com.br/qnjh4wc',
  checkoutUrlPremium: 'https://pay.cakto.com.br/oaeedp7',

  // Opcional: Pixel de Meta / Facebook (coloca tu ID si deseas activarlo automáticamente)
  metaPixelId: '',
};

document.addEventListener('DOMContentLoaded', () => {
  // 1. APLICAR CONFIGURACIÓN DE PRECIOS Y MONEDA AL DOM
  applyPricingConfig();

  // 2. ADJUNTAR PARÁMETROS UTM AUTOMÁTICAMENTE A LOS LINKS DE CHECKOUT
  attachUtmToCheckoutLinks();

  // 3. INICIALIZAR EL ACORDEÓN DE PREGUNTAS FRECUENTES (FAQ)
  initFaqAccordion();

  // 4. CONTROLADOR DE LA BARRA FLOTANTE MÓVIL (STICKY BAR)
  initMobileStickyBar();

  // 5. INICIALIZAR PIXEL OPCIONAL SI ESTÁ CONFIGURADO
  if (OFFER_CONFIG.metaPixelId) {
    initMetaPixel(OFFER_CONFIG.metaPixelId);
  }
});

/**
 * Aplica los valores de OFFER_CONFIG en todos los elementos correspondientes
 */
function applyPricingConfig() {
  const c = OFFER_CONFIG.currency;

  // Hero
  const heroOld = document.querySelector('[data-price-hero-old]');
  const heroCurrent = document.querySelector('[data-price-hero-current]');
  if (heroOld) heroOld.textContent = `${c}${OFFER_CONFIG.priceBasicOld}`;
  if (heroCurrent) heroCurrent.textContent = `${c}${OFFER_CONFIG.priceBasicCurrent}`;

  // Encabezado de bonos
  const bonusHeader = document.querySelector('[data-bonus-total-header]');
  if (bonusHeader) bonusHeader.textContent = `${c}${OFFER_CONFIG.bonusesTotalValue}`;

  // Plan Esencial en Ofertas
  const basicOld = document.querySelector('[data-price-basic-old]');
  const basicCurrent = document.querySelector('[data-price-basic-current]');
  if (basicOld) basicOld.textContent = `${c}${OFFER_CONFIG.priceBasicOld}`;
  if (basicCurrent) basicCurrent.textContent = `${c}${OFFER_CONFIG.priceBasicCurrent}`;

  // Plan Premium en Ofertas
  const premiumOld = document.querySelector('[data-price-premium-old]');
  const premiumCurrent = document.querySelector('[data-price-premium-current]');
  if (premiumOld) premiumOld.textContent = `${c}${OFFER_CONFIG.pricePremiumOld}`;
  if (premiumCurrent) premiumCurrent.textContent = `${c}${OFFER_CONFIG.pricePremiumCurrent}`;

  // Barra flotante móvil
  const stickyOld = document.querySelector('[data-sticky-old]');
  const stickyCurrent = document.querySelector('[data-sticky-current]');
  if (stickyOld) stickyOld.textContent = `${c}${OFFER_CONFIG.priceBasicOld}`;
  if (stickyCurrent) stickyCurrent.textContent = `${c}${OFFER_CONFIG.priceBasicCurrent}`;
}

/**
 * Lee los parámetros UTM de la URL actual y los propaga a los links de compra
 */
function attachUtmToCheckoutLinks() {
  const currentParams = window.location.search;
  const basicBtn = document.querySelector('.checkout-btn[data-plan="basic"]');
  const premiumBtn = document.querySelector('.checkout-btn[data-plan="premium"]');

  if (basicBtn) {
    basicBtn.href = appendParams(OFFER_CONFIG.checkoutUrlBasic, currentParams);
  }

  if (premiumBtn) {
    premiumBtn.href = appendParams(OFFER_CONFIG.checkoutUrlPremium, currentParams);
  }
}

function appendParams(url, search) {
  if (!search || search.length <= 1) return url;
  const cleanSearch = search.startsWith('?') ? search.substring(1) : search;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${cleanSearch}`;
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

/**
 * Helper para Meta Pixel opcional
 */
function initMetaPixel(pixelId) {
  if (!pixelId) return;
  /* eslint-disable */
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', pixelId);
  fbq('track', 'PageView');
}