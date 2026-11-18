# Recetas Para Congelar — Landing Page + Funnel

Projeto de landing page em espanhol + funil de upsell/downsell para o e-book de receitas para congelar.  
Configurado para deploy como **Cloudflare Worker com Assets binding** (não é Pages).

---

## Estrutura do Projeto

```
recetas-para-congelar-es/
├── dist/                      # Arquivos estáticos prontos (não edite manualmente)
│   ├── index.html             # Landing page principal (ES, USD)
│   ├── styles.css             # CSS compilado
│   ├── page.js                # Lógica da landing page
│   └── upsell/
│       ├── index.html         # Upsell: plano 1 ano ($27)
│       ├── 6-meses.html       # Downsell 1: 6 meses ($17)
│       ├── 3-meses.html       # Downsell 2: 3 meses ($9.90)
│       ├── 1-mes.html         # Downsell 3: 1 mês ($4.90)
│       ├── gracias.html       # Página de entrega / obrigado
│       ├── funil.js           # Config centralizada do funil
│       └── style.css          # Estilos do funil
├── src/
│   └── worker.js              # Worker script (serve os assets)
├── wrangler.toml              # Config do Cloudflare Workers
├── package.json               # Scripts npm (dev / deploy)
└── .gitignore
```

---

## Pré-requisitos

- Node.js 18+
- Conta no Cloudflare com Workers habilitado
- Wrangler CLI (instalado via `npm install`)

---

## Deploy via GitHub → Cloudflare Workers

### 1. Instale as dependências localmente
```bash
npm install
```

### 2. Autentique no Cloudflare
```bash
npx wrangler login
```

### 3. Faça o deploy manual (opcional, para teste)
```bash
npm run deploy
```

### 4. Integração GitHub → Cloudflare (recomendado)

No painel do Cloudflare:

1. Acesse **Workers & Pages** → **Create** → **Workers**
2. Clique em **Connect to Git** → selecione este repositório
3. Configure:
   - **Build command:** `npm install`
   - **Deploy command:** `npx wrangler deploy`
4. O deploy será automático a cada push na branch `main`

> **Atenção:** Use a opção **Workers**, não Pages. A configuração já está pronta no `wrangler.toml`.

---

## Desenvolvimento Local

```bash
npm run dev
```

Acesse: `http://localhost:8787`

---

## Personalizações Necessárias Antes do Lançamento

### 🔗 Links de Checkout (obrigatório)
Substitua os URLs do Cakto pelos seus próprios links de pagamento:

- **Landing page:** [`dist/page.js`](dist/page.js) — linhas 21–24
- **Funil upsell:** [`dist/upsell/funil.js`](dist/upsell/funil.js) — linhas 7–18

### 🎥 Vídeo do Upsell (quando tiver o vídeo em espanhol)
Substitua o `src` do vídeo em:

- [`dist/upsell/index.html`](dist/upsell/index.html) — linha 27

---

## Funil de Vendas

```
Landing Page (index.html)
  ↓ Compra ($9.90 Básico / $19.90 Premium)
Upsell: Plano 1 Ano (upsell/index.html) — $27
  ↓ Recusa → Downsell 1: 6 Meses (upsell/6-meses.html) — $17
              ↓ Recusa → Downsell 2: 3 Meses (upsell/3-meses.html) — $9.90
                          ↓ Recusa → Downsell 3: 1 Mês (upsell/1-mes.html) — $4.90
                                      ↓ (qualquer caminho aceito)
                                      Página de Entrega (upsell/gracias.html)
```

---

## Domínio Personalizado

Após o deploy, configure seu domínio no painel Cloudflare:  
**Workers & Pages** → Selecione o Worker → **Settings** → **Domains & Routes** → **Add Custom Domain**
