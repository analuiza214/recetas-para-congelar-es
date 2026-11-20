# Oferta ES — estado verificado em 19/11/2026

Esta auditoria substitui os relatos de conclusão anteriores. Nenhuma publicação de código, alteração do backend compartilhado, alteração do painel ou escrita no banco foi feita nesta revisão.

## Decisões do proprietário

- Moeda confirmada: USD. Os preços não foram alterados.
- Ebook, bônus e aplicativo ainda não existem; serão criados posteriormente.
- Somente homologação Stripe; vendas reais continuam fora do escopo.

## Evidência remota

- Site e rotas `/comprar?plan=basic`, `/comprar?plan=premium` e `/confirmacion`: HTTP 200.
- `/api/checkout/config` (basic e premium), `/api/checkout/precios` e `/api/checkout/estado` com UUID válido: HTTP 503.
- Criação de PaymentIntent sem Origin: HTTP 403, `origin`.
- Webhook sem assinatura: HTTP 503, `unavailable`; a configuração incompleta impede chegar à validação da assinatura.
- Worker da oferta: `STRIPE_MODE=test`, binding `BELLA_CHECKOUT` para `gokoco-tiktok`, entrypoint `OfertaEspanhaCheckout`.
- `STRIPE_PUBLISHABLE_KEY` tem prefixo de teste, mas apenas 10 caracteres: está incompleta. Nenhum valor foi incluído neste relatório.
- `STRIPE_SECRET_KEY` existe como secret criptografado. Sua validade e conta não foram verificadas; a Cloudflare não devolve o valor.
- `STRIPE_WEBHOOK_SECRET` ausente. Não foi salvo nesta revisão.
- O download do script por `/workers/scripts/gokoco-tiktok` retorna 404: o Worker usa o modelo de serviços/ambientes. O conteúdo foi lido com sucesso por `/workers/services/gokoco-tiktok/environments/production/content`.
- O conteúdo atual desse ambiente não contém `OfertaEspanhaCheckout` nem `oferta_espanha_checkout`. A extensão relatada anteriormente não está presente no conteúdo atual consultado.
- Os arquivos públicos `/admin`, `/admin.js` e `/js/admin-pricing.js` de bellamix-oficial.shop não contêm `oferta-espanha`. A integração do painel também não está comprovada/publicada nesses arquivos.

## Stripe

Navegador acessível, conta Receitas Gringa (`acct_1UdGBSC11MX8ABq8`), ambiente de teste. A lista de destinos estava vazia antes da criação.

Foi criado um único destino `Oferta ES — checkout teste`, ID `we_1UdfIMC11MX8ABq8gA1AaIVx`, ativo:

- URL: https://recetas-para-congelar-es.loja-oficial.workers.dev/api/checkout/stripe
- Escopo: própria conta.
- Formato: Instantâneo / Snapshot.
- API: 2026-10-28.endive.
- Eventos: `payment_intent.succeeded`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`.

O destino foi criado, mas não houve entrega de evento validada. O controle de revelação do segredo não forneceu um valor legível nas tentativas realizadas. Nenhum segredo foi copiado para arquivos, chat ou código. O segredo ainda deve ser transferido pela interface segura da Stripe para um Secret da Cloudflare.

## Supabase

Projeto Escova, `gezqdbzrqjhobahwaydm`, consultado somente para leitura:

- `oferta_espanha_checkout` e `oferta_espanha_orders` existem, com RLS ativo.
- Zero reservas e zero pedidos ES no momento da consulta.
- Função `oferta_espanha_record_payment`: EXECUTE somente para `service_role` e `postgres` nos grants consultados.
- Nenhuma linha `oferta-espanha:%` em `gokoco_product_prices`. O código de extensão preparado usa preços padrão quando não há linha; não é necessário semear preços para isso.
- Não foram recriadas tabelas nem reaplicadas migrações.

## Alterações locais desta revisão — não publicadas

- Corrigida a linha inválida com sequências literais `\n` no `.gitignore`, restaurando padrões de exclusão de arquivos de ambiente.
- Corrigidos textos espanhóis com codificação quebrada em `src/checkout.js`.
- Checkout deixa de prometer confirmação por e-mail: informa confirmação na própria página.
- As páginas `upsell/gracias.html` e `upsell/obrigado.html` deixam de afirmar pagamento aprovado e envio de livros. Explicam que a entrega está em preparação e que a página não comprova pagamento.
- Inseridos espaços junto aos `br` dos títulos do checkout; no celular, onde `br` fica oculto, as palavras não ficam coladas.
- Preparado `shared-stripe-rpc-entry.js`: reexporta o Worker original como default e adiciona apenas o entrypoint RPC. É uma preparação para revisão, não um pacote de publicação completo nem uma solução para o painel.

## Testes

- `npm test`: 5/5 passaram, com mocks; incluem preço no servidor, repetição idempotente, preservação de preço numa tentativa existente, assinatura e estado canônico de pagamento.
- `node --check`: checkout do servidor, checkout do navegador e script de confirmação passaram.
- Auditoria de URLs nos HTML/JS/CSS de `dist`: somente SDK Stripe como URL externa funcional; o namespace SVG em CSS não é uma chamada de rede. Não encontrados Cakto, MundPay ou carregadores de pixels nesses arquivos.
- Conferência visual do checkout publicado em desktop e viewport 390 × 844: layout abre, mas preço fica vazio e botão desabilitado por erro 503. Detectado e corrigido apenas localmente o espaçamento dos títulos móveis.
- Capturas em `.wrangler/auditoria/`, ignoradas pelo Git.

Não executados: compra simulada completa, recebimento de webhook real de teste, deduplicação real no banco, aparição de pedido no painel, edição e propagação de preço no painel. Preservação de pedidos anteriores foi testada somente com mocks; não havia pedidos ES no banco para comparar.

## Impacto e sequência para a próxima etapa

1. Corrigir a chave pública incompleta pela interface segura e conferir a chave secreta da mesma conta de teste. Não rotacionar nem criar credenciais sem necessidade.
2. Transferir o segredo do destino existente para `STRIPE_WEBHOOK_SECRET` da oferta. Salvar secrets pode gerar uma nova versão/deploy; não publicar código adicional sem pedido do proprietário.
3. Para restabelecer RPC, preparar um pacote a partir do conteúdo ATUAL do ambiente production do `gokoco-tiktok`, mantendo seu módulo original intacto e adicionando entrypoint e dependências. Preservar assets, bindings, variáveis, segredos, rotas e handlers agendados do Worker atual. Revisar antes de publicar: esse Worker atende outras ofertas.
4. A extensão RPC acessará as tabelas ES existentes com o service role já usado pelo backend. Nenhuma migração é necessária pelo estado observado. Reservas e pedidos serão escritos somente durante o teste autorizado de checkout.
5. Reconciliar o painel atual com os filtros, pedidos e preços ES. Não publicar o `shared-stripe-entry.js` antigo automaticamente: ele embute arquivos de painel de uma versão anterior.
6. Somente após autorização de publicação e verificação das chaves, executar cartão fictício, acompanhar entrega assinada, verificar uma única linha de pedido e testar preço/manipulação. Repetir visual após a publicação.
7. Construir e integrar produtos e entrega antes de qualquer liberação real. Manter USD e preservar valores já reservados.

O checkout ainda não está pronto. A próxima etapa depende de autorização específica para publicar a integração revisada no backend/painel e as correções da oferta, além da configuração segura das credenciais.
