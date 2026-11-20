# Oferta ES — integração validada em teste

## Correção posterior — links da página inicial

O proprietário encontrou links Cakto na página inicial após a validação direta do checkout. A conferência anterior não cobriu corretamente o percurso da landing. Arquivos estáticos antigos estavam sendo servidos antes do Worker; preservar assets pela API também preservava a configuração anterior de roteamento.

A correção foi publicada pelo Wrangler 4.158.0 com os arquivos atuais de `dist`, `assets.run_worker_first=true` e `keep_vars=true`. Mantidos secrets, service binding e modo Stripe test. O pacote temporário de overlay deixou de ser necessário. A rota copyanti também foi alinhada ao caminho canônico dos assets, evitando redirecionamento circular.

Os dois botões `Comprar ahora` foram clicados no navegador a partir da página inicial e abriram `/comprar?plan=basic` e `/comprar?plan=premium`, com 9,90 USD e 19,90 USD. Não houve nova compra. Captura: `.wrangler/auditoria/botao-premium-checkout-corrigido.jpg`.

Moeda: USD, confirmada pelo proprietário. Stripe permanece em `test`. Ebook, bônus, aplicativo e entrega ainda serão criados.

## Publicado e verificado

- Chave pública completa e chave secreta existente da conta Receitas Gringa configuradas pelas interfaces Stripe/Cloudflare, sem divulgação dos valores.
- Segredo do destino `we_1UdfIMC11MX8ABq8gA1AaIVx` salvo como `STRIPE_WEBHOOK_SECRET` na oferta. Sem duplicar o destino.
- Checkout com Payment Element em espanhol, servidor de preços, banco e painel compartilhados conectados.
- Backend atual preservado como módulo original; adicionados o entrypoint RPC e uma extensão de painel. Mantidos bindings, secrets, assets, compatibilidade e export default original. Nenhuma migração executada.
- O painel atual é processado a partir da resposta HTML do backend original, preservando sua injeção dinâmica de preços. Os scripts do painel foram comparados com os públicos antes das alterações ES.
- Mensagens de entrega corrigidas: a página final não afirma que um ebook foi enviado ou que a visita à página comprova pagamento.

## Teste ponta a ponta real em ambiente Stripe de teste

Cartão fictício Stripe, sem cobrança real:

- Plano `basic` / Esencial: 9,90 USD.
- PaymentIntent: `pi_3UdfewC11MX8ABq81ZUCbJEk`.
- Referência: `b6446f71-2369-4086-b561-d73911c63a67`.
- Evento: `evt_3UdfewC11MX8ABq81Q4tOe8e`, `payment_intent.succeeded`.
- Stripe mostrou webhook entregue com HTTP 200. Reenvio do mesmo evento também retornou HTTP 200.
- Supabase mostrou exatamente uma linha para o pagamento, `paid`, `basic`, 990 centavos, após o reenvio.
- Navegador mostrou `Tu pago está confirmado.`
- Painel autenticado mostrou `Prueba Oferta ES`, origem OFERTA ESPANHA, Esencial, cartão, Stripe e US$ 9,90.

## Preços, assinatura e integridade

- Tentativa nova com valor adulterado de 1 centavo: HTTP 409, sem criação do pagamento.
- Webhook sem assinatura: HTTP 400, `signature`.
- API administrativa sem autenticação: HTTP 401.
- Preço do básico alterado pelo painel para 9,80 USD e recebido no checkout/API.
- Uma nova tentativa reservou 980 centavos durante esse teste: `fd8dd134-a3ad-4aa6-9fc9-3c307f673172`. Não foi paga.
- A tentativa já paga de 990 centavos continuou retornando 990 durante a alteração de preço.
- Preço do painel restaurado para 9,90 USD; a tentativa iniciada a 9,80 continuou retornando 980 depois da restauração.
- Estado final do banco consultado: 1 pedido pago de teste e 2 reservas de teste. Linha de preço `oferta-espanha:basic`: 9,90 / original 27,00. Nenhum preço de outras ofertas foi editado.
- Cinco testes automatizados passaram. Incluem assinatura, ambiente, valor, repetição, proteção de origem, reembolsos/disputas com mocks e preservação de preços.
- Layout confirmado em desktop e em viewport 390 × 844, com captura móvel feita por emulação do próprio tab. Override removido ao terminar.

## Correções encontradas no teste real

- `redirect: 'error'` é rejeitado pelo runtime Workers antes de enviar a requisição. Alterado para `manual`; respostas não 2xx continuam sendo recusadas. [Documentação Cloudflare](https://developers.cloudflare.com/workers/runtime-apis/request/).
- A API Stripe usada rejeitou `payment_method_types`. Alterado para `allowed_payment_method_types[]=card`, mantendo cartão como método permitido. [API PaymentIntent](https://docs.stripe.com/api/payment_intents/create).
- Namespace de idempotência atualizado para `oferta-espanha-v2-` durante a correção. As tentativas anteriores desse ambiente haviam recebido HTTP 400 e não tinham criado pagamentos. O novo namespace evita reutilizar a resposta 400 armazenada pela Stripe.
- Comparação de casas decimais no painel corrigida para tolerar precisão de ponto flutuante.
- Campos de preço ES identificam USD; demais produtos mantêm BRL. Descontos extras de Pix/recuperação não são aplicados a cartão ES; o desconto ES é a diferença entre original e venda.
- Diagnósticos temporários de stack/stage removidos. A resposta de erro pode incluir somente o status HTTP do gateway, sem mensagens Stripe, chaves ou corpo de requisição.

## Alteração externa observada e manutenção

Durante a validação, o Worker compartilhado foi substituído por outro build (módulos `_worker.js` e `_worker.js.map`). O proprietário informou que não havia outra conversa publicando. Não foi determinada a origem dessa publicação. A integração foi reaplicada à versão nova, preservando seus dois módulos originais e suas configurações. A primeira tentativa de envio dessa reaplicação falhou na validação do MIME do source map; a versão ativa não foi alterada por essa falha. O tipo foi corrigido e a publicação posterior teve sucesso.

Fontes da extensão ficam neste projeto: `shared-stripe-extension.js`, `shared-stripe-current-entry.js`, `admin-auth.js` e o catálogo em `src/offer-catalog.js`. O import do legado aponta para o `_worker.js` original na raiz do pacote remoto.

**Futuras publicações do backend compartilhado devem conservar essa extensão.** Um deploy feito só a partir do checkout antigo Bella Mix pode remover novamente o entrypoint e o painel ES. A pasta de referência Bella Mix não foi editada; a inclusão da extensão no processo de build daquele repositório continua sendo necessária antes do próximo deploy dele. Não usar o patch antigo nem o `shared-stripe-entry.js` antigo como substitutos completos do backend.

## Limites restantes

- Nenhuma venda real foi liberada. Não foram criadas chaves live.
- Ainda faltam os produtos e o mecanismo de entrega. Nenhum envio de ebook ou acesso ao aplicativo foi implementado.
- Reembolso, disputa e autenticação 3DS não foram exercitados ponta a ponta nesta rodada; reembolso/disputa passaram nos testes com mocks.
- Havia um aviso preexistente de limite de consultas de outro gateway no painel; o pedido ES carregou mesmo assim. Não foram feitas mudanças nesse gateway.
- Não existe histórico anterior ES para comparar. A preservação foi comprovada com o pedido e as reservas desta rodada de teste.

Capturas locais em `.wrangler/auditoria/`: pagamento confirmado desktop/móvel e pedido filtrado no painel. Arquivos temporários e capturas continuam ignorados pelo Git.
