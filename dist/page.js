const asset = (path) => 'https://i.ibb.co/' + path;
const two = (index) => String(index + 1).padStart(2, '0');
const render = (id, entries, template) => {
  document.getElementById(id).innerHTML = entries.map(template).join('');
};
const list = (items, marker = '—') => '<ul>' + items.map(item => '<li><span>' + marker + '</span> ' + item + '</li>').join('') + '</ul>';

const messages = ['Edición limitada · Oferta válida solo hoy', 'Acceso de por vida', '+100 recetas', 'Garantía incondicional de 30 días', 'Entrega digital inmediata'];
render('ticker-track', [0, 1, 2, 3], (_, index) => '<span ' + (index ? 'aria-hidden="true"' : '') + '>' + messages.map(message => '<b>✦</b>' + message).join('') + '</span>');

render('benefits', [
  ['Cocina una sola vez', 'Prepara toda la semana sin renunciar al sabor ni a comer bien.'],
  ['Más de 100 recetas', 'Prácticas y aptas para congelar, conservan su textura y valor nutricional.'],
  ['Calorías y macros', 'Cada receta incluye una tabla con las raciones y cantidades calculadas.'],
  ['Sin gluten · Sin lactosa', 'Encuentra estas opciones de un vistazo gracias a las etiquetas del libro.'],
  ['Guía de recipientes', 'Utensilios, etiquetas y técnicas para guardar tus platos.'],
  ['Menos desperdicio', 'Planifica tus comidas para ahorrar tiempo y dinero.'],
], ([title, desc], index) => '<article><small>' + two(index) + '</small><h3>' + title + '</h3><p>' + desc + '</p></article>');

render('chapters', [
  ['I', 'Carnes y pollo', 'Ricas en proteínas'],
  ['II', 'Pescados y mariscos', 'Bajos en calorías'],
  ['III', 'Guarniciones', 'Nutritivas'],
  ['IV', 'Meriendas y aperitivos', 'Prácticos'],
  ['V', 'Condimentos y salsas', 'Versátiles'],
  ['VI', 'Postres saludables', 'Ligeros'],
], ([chapter, title, label]) => '<article><small>Cap. ' + chapter + '</small><h3>' + title + '</h3><small>' + label + '</small></article>');

const recipes = ['99QZWhwY', 'YB4xqwRB', 'm5GZ44gw', 'G3MFN496', 'mFghrhgS', 'nM05GLW6', 'mVMRNFnD', 'JFtmzWcV', 'r22DGNmF', 'KpkJbfXP', 'Gvj3Dgwy', 'gZ21bfCB'];
render('gallery', recipes, (id, index) => '<img loading="lazy" src="' + asset(id + '/receitas-saudaveis-para-congelar' + (index ? '-' + String(12 - index).padStart(2, '0') : '') + '.png') + '" alt="Receta ' + (index + 1) + '">');

const extras = [
  ['Plan de táperes inteligentes', '3mYyJwDg/marmitas-Me-dia.jpg', 67, ['4 menús completos listos para seguir', 'Más de 30 días de comidas organizadas', 'Lista de la compra pensada para lo imprescindible', 'Sin desperdiciar ingredientes', 'Compatible con todas las recetas del libro']],
  ['Menús semanales listos para usar', 'bjrM7hZp/cardapios-Me-dia.jpg', 47, ['Semanas temáticas planificadas', 'Platos equilibrados', 'Combinaciones pensadas para congelar', 'Formato práctico para imprimir o guardar']],
  ['Guía para organizar el congelador', 'LXpbSLBb/organizacao-freezer-Me-dia.jpg', 39, ['Técnicas de almacenamiento', 'Etiquetado y control de fechas', 'Consejos para aprovechar cada ración', 'Lista de recipientes recomendados']],
];
render('bonuses', extras, ([title, image, value, items], index) => '<article><header><i>Extra ' + two(index) + '</i><small>Gratis hoy</small></header><img src="' + asset(image) + '" loading="lazy" alt="' + title + '"><div class="card-body"><h3>' + title + '</h3>' + list(items) + '<div class="card-value"><small>Valor</small><s>R$ ' + value + '</s></div></div></article>');

const included = ['Más de 100 recetas saludables para congelar', 'Asistencia y garantía de 30 días', 'Acceso de por vida', 'Tabla de calorías y macros', 'Guía de utensilios y recipientes', 'Recetas sin gluten y sin lactosa identificadas'];
const extraNames = ['Plan de táperes inteligentes (+30 días)', ...extras.slice(1).map(extra => extra[0])];
// Set each URL to the seller's own Spanish checkout before accepting orders.
const plans = [
  { name: 'Kit de congelación esencial', label: 'Edición esencial', before: '147', price: '18,90', checkoutUrl: '' },
  { name: 'Congelador inteligente prémium', label: 'Edición completa', before: '247', price: '29,90', checkoutUrl: '' },
];
render('plans', plans, ({name, label, before, price, checkoutUrl}, index) => {
  const features = index ? [0, 3, 4, 5, 1, 2].map(i => included[i]) : included;
  const bonuses = index ? [...extraNames, 'Actualizaciones de por vida'] : extraNames;
  const purchase = checkoutUrl
    ? '<a class="cta" href="' + checkoutUrl + '">Comprar ahora →</a>'
    : '<button class="cta" data-plan="' + index + '">Comprar ahora →</button>';
  return '<article class="plan ' + (index ? 'premium' : '') + '">' + (index ? '<span class="ribbon">La más elegida</span>' : '') +
    '<small>' + label + '</small><h3>' + name + '</h3>' + list(features) +
    '<div class="plan-extras ' + (index ? '' : 'excluded') + '"><small>+ Extras incluidos</small>' + list(bonuses, index ? '✦' : '×') + '</div>' +
    '<div class="price"><s>R$ ' + before + '</s> <strong>R$ ' + price + '</strong> <i>pago único</i></div>' +
    purchase + '<small class="secure">Compra segura · Garantía de 30 días</small></article>';
});
const checkoutDialog = document.getElementById('checkout-dialog');
document.querySelectorAll('[data-plan]').forEach(button => button.addEventListener('click', () => {
  document.getElementById('checkout-title').textContent = plans[Number(button.dataset.plan)].name;
  checkoutDialog.showModal();
}));

render('reviews', [
  ['Carolina Mendes', 'São Paulo · SP', 'Preparé el pollo al limón, lo congelé y me dio para toda la semana. Al sacarlo del congelador sabía a recién hecho.'],
  ['Paula Santos', 'Curitiba · PR', 'El plan de táperes me cambió la vida. Salgo del trabajo y la cena ya está lista. Cero estrés.'],
  ['Mariana Costa', 'Belo Horizonte · MG', 'Pensé que me costaría porque no tengo experiencia en la cocina, pero las recetas son muy sencillas. Lo hice todo el domingo.'],
  ['Júlia Oliveira', 'Porto Alegre · RS', 'Ya no desperdicio comida. La lista de la compra es genial. Este mes he ahorrado mucho.'],
  ['Fernanda Lima', 'Recife · PE', 'Tengo intolerancia a la lactosa y encontrar las recetas señaladas me ha facilitado mucho el día a día.'],
  ['Beatriz Alves', 'Rio de Janeiro · RJ', 'Perdí 4 kg en un mes comiendo los platos del libro. Saludable, práctico y delicioso.'],
], ([name, location, quote], index) => {
  const photo = [1239291, 762020, 1065084, 1181686, 1181424, 1181690][index];
  return '<article><div class="review-person"><img loading="lazy" alt="" src="https://images.pexels.com/photos/' + photo +
    '/pexels-photo-' + photo + '.jpeg?auto=compress&cs=tinysrgb&w=200"><div><strong>' + name + '</strong><small>' + location +
    '</small></div></div><span class="verified">✓ Compra verificada en la página original</span><blockquote>«' + quote +
    '»</blockquote><span class="stars" aria-label="5 estrellas">★★★★★</span></article>';
});

render('questions', [
  ['¿Cómo recibo el acceso?', 'Cuando se confirma el pago, recibes las recetas por WhatsApp y correo electrónico. La entrega es digital e inmediata.'],
  ['¿Tengo que saber cocinar para usar el método?', 'Las recetas están pensadas para quienes tienen poco tiempo o están empezando a cocinar. Cada receta incluye instrucciones sencillas.'],
  ['¿Las recetas son aptas para distintas dietas?', 'Todas incluyen una tabla de calorías y macros. El libro señala las opciones bajas en carbohidratos, sin gluten y sin lactosa.'],
  ['¿Necesito algún equipo especial?', 'Puedes utilizar lo que ya tienes en casa. La guía de utensilios recoge las opciones más adecuadas.'],
  ['¿Cuánto duran los platos en el congelador?', 'El libro indica el tiempo máximo para cada receta, normalmente entre 30 y 90 días. Las técnicas del método ayudan a conservar el sabor y la textura.'],
  ['¿Y si el producto no me gusta?', 'Tienes 30 días de garantía incondicional. Contacta por WhatsApp dentro del plazo para solicitar la devolución del importe íntegro.'],
], ([question, answer], index) => '<details name="faq"><summary><span>' + two(index) + '</span>' + question + '</summary><p>' + answer + '</p></details>');
