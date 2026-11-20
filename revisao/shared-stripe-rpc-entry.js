// Preparação para revisão. Não publicar usando um _worker.js local antigo.
// _worker.js deve ser o módulo original obtido do ambiente production atual.
export { default } from './_worker.js';
export { OfertaEspanhaCheckout } from './shared-stripe-extension.js';
