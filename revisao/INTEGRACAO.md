# Stripe e Oferta Espanha

> Estado atual: consulte [PRODUCAO-2026-11-20.md](PRODUCAO-2026-11-20.md). Stripe está em live, com credencial restrita, conta habilitada e webhook configurado. Não foi feita cobrança real; a entrega automática dos produtos ainda não foi integrada. O [resultado de teste](RESULTADO-TESTE-2026-11-19.md) registra a compra fictícia completa. Os relatos abaixo são históricos.

O checkout /comprar tem identidade creme e verde, resumo do plano, nome, e-mail e Stripe Payment Element em espanhol. Os campos de cartão são servidos pela Stripe, com autenticação bancária quando exigida. A cobrança é avulsa em USD, preservando os preços existentes, inclusive o plano de 4,90. Usa a API Stripe 2026-10-28.endive.

## Estado após aprovação

A migração oferta_espanha_stripe_checkout foi aplicada ao Supabase Escova (gezqdbzrqjhobahwaydm). As duas tabelas têm RLS ativo e a função só está liberada ao service_role e ao proprietário. Foram validados pagamento, deduplicação e reembolso em uma transação revertida. Nenhum registro de teste permaneceu.

A publicação do Worker compartilhado foi bloqueada pela revisão automática. O motivo informado foi o alcance da substituição do código em produção, que atende pagamentos, rastreio e e-mail das lojas existentes, enquanto a aprovação foi interpretada como limitada à integração para testes. O Worker publicado não recebeu alterações. É necessária confirmação explícita da publicação no Worker compartilhado de produção.

A pasta principal Bella Mix está disponível apenas para leitura nesta sessão. A cópia integrada e compilada foi preparada em .wrangler/central-approved no projeto atual. O patch permanece como fonte das alterações para aplicação na pasta principal quando houver acesso de escrita.

A Stripe Receitas Gringa ainda oferece criar a primeira chave secreta. Nenhuma chave secreta foi criada ou extraída, e nenhum endpoint foi cadastrado. Os valores das chaves deverão ficar nos secrets do servidor. A configuração em produção e o teste ponta a ponta permanecem pendentes.

## Chaves e servidor

A conta Receitas Gringa foi localizada no painel. Nenhuma chave foi extraída ou gravada. .dev.vars.example contém os nomes sem valores. O script scripts/configure-stripe.ps1 solicita as chaves com entrada oculta e salva .dev.vars, ignorado pelo Git. Para Cloudflare, cadastre os mesmos nomes em Settings → Variables and Secrets do Worker recetas-para-congelar-es.

| Variável | Valor |
| --- | --- |
| STRIPE_MODE | test na homologação. live somente após autorização para ativação real. |
| STRIPE_PUBLISHABLE_KEY | pk_test_… ou pk_live_… da conta. |
| STRIPE_SECRET_KEY | sk_test_… ou sk_live_… da mesma conta e ambiente. |
| STRIPE_WEBHOOK_SECRET | whsec_… específico do endpoint e ambiente. |

Na Stripe, use o ambiente de teste e Workbench → Webhooks → Adicionar destino. Configure a URL HTTPS do ambiente de homologação terminando em /api/checkout/stripe. Eventos: payment_intent.succeeded, charge.refunded, charge.dispute.created e charge.dispute.closed. O servidor precisa estar publicado antes da validação de entrega. A criação do endpoint ainda está pendente.

O webhook de produção planejado é https://recetas-para-congelar-es.loja-oficial.workers.dev/api/checkout/stripe. Os produtos e preços são definidos no backend, dispensando criar seis produtos Stripe.

## Integração aprovada do painel e banco

O patch gokoco-oferta-espanha.patch acrescenta origem Oferta Espanha, filtros por plano, moeda USD e gateway Stripe ao painel existente. Exporta um serviço privado com price, quote, reserve, record e status, consumido pelo binding BELLA_CHECKOUT. Os dois Workers devem estar na mesma conta Cloudflare.

A migração oferta-espanha.sql cria duas tabelas com RLS e uma função restrita ao papel de serviço. Os pedidos Stripe usam identificadores pi_…. A referência da compra grava preço, plano, nome e e-mail antes de criar o PaymentIntent. A idempotência evita duplicação por repetição da mesma requisição. Referências com mais de 23 horas são recusadas. Os preços existentes ficam preservados nas tentativas iniciadas.

Esses arquivos substituem a preparação MundPay. A migração pressupõe que as tabelas oferta_espanha ainda não foram criadas. Se uma versão anterior foi aplicada, preparar uma migração incremental. O projeto principal ainda não recebeu o patch. A migração do banco já foi aplicada, conforme o estado registrado acima.

Após aprovação, aplicar patch e SQL em homologação, habilitar OFERTA_ESPANHA_ENABLED=true no Worker central e ativar o service binding comentado no wrangler.toml. O cadastro de preços depende da tabela gokoco_product_prices existente.

## Confirmação e pendências

O webhook verifica HMAC no corpo original, tolerância de 5 minutos, ambiente, valor, moeda e referência. Consulta o PaymentIntent canônico, com a cobrança expandida, para lidar com eventos atrasados. O navegador só mostra confirmação após a gravação do webhook.

São tratados pagamento aprovado, reembolso integral e contestação. Reembolsos parciais mantêm o pedido pago e precisam de acompanhamento na Stripe. A entrega de arquivos e o acesso ao app dependem dos seus arquivos ou da plataforma de entrega. O cálculo de IVA não foi implementado. A Stripe recebe exatamente o preço de venda salvo, sem acréscimos automáticos.

Ainda faltam chaves no servidor, endpoint Stripe, aplicação aprovada do patch e do SQL e validação ponta a ponta. A prévia visual automatizada foi bloqueada pela política do navegador para arquivos locais. O código do checkout e o build podem ser inspecionados localmente.

Referências
- https://docs.stripe.com/payments/payment-element
- https://docs.stripe.com/api/payment_intents/create
- https://docs.stripe.com/events/manage-webhook-endpoints
- https://docs.stripe.com/testing


## Limpeza da réplica — 19/11/2026

- Removido integralmente o carregador do Meta Pixel, incluindo a configuração opcional vazia.
- Removidas as chamadas ao Google Fonts de todas as páginas servidas. As fontes locais do sistema são usadas como alternativa.
- Auditoria de URLs em HTML/JS/CSS publicados: resta somente o SDK autorizado da Stripe; o identificador XML do SVG não é uma chamada externa.
- Links de compra usam /comprar no próprio domínio. Não há URLs de Cakto/MundPay nem destinatários externos de checkout nesses arquivos.
- Mantidos conteúdo e imagens locais da oferta; a limpeza de integrações não comprova direitos ou autoria do conteúdo replicado.
- wrangler.toml alinhado ao serviço BELLA_CHECKOUT / OfertaEspanhaCheckout e STRIPE_MODE=test.
- Site atualizado pela API da Cloudflare com sucesso, preservando assets e variáveis existentes. Nenhuma alteração adicional no backend compartilhado ou no banco nesta etapa.
- Cinco testes automatizados de checkout passaram, e page.js passou na verificação de sintaxe.
- Verificação HTTP pública nesta sessão impedida pela resolução DNS do ambiente. Não foi realizado teste visual após esta atualização.
- Pagamento ainda pendente: concluir endpoint webhook Stripe e guardar STRIPE_WEBHOOK_SECRET; revisar validade das chaves já cadastradas sem expô-las. Sem navegador disponível nesta sessão, não foi possível concluir a configuração na conta Stripe.
- Não houve cobrança real. Entrega do produto e moeda/preços finais precisam ser confirmados antes de vendas reais.
