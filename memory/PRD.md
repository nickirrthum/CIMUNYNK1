# Comunynk Cashflow — PRD

## Problema original (verbatim)
> personalize esse cashflow com esse padrão de idv, e essa logo tambem. Bem como os gráficos e dashboard. Só para ter uma ideia, o CMYK é das cores primárias da impressora então altere. Prompt negativo: nao altere a estrutura do sistema

## Choices do usuário
- Tema base: **claro** (paper / cinza-claro)
- Logo: **tipográfico COMUNYNK + ink-square (full)** — combinado
- Paleta gráficos: **CMYK suavizado** (legível em telas)
- Extras: textura de papel sutil + listras diagonais CMYK + registration mark nos cards

## Tech stack (preservado — sem alterações estruturais)
- Frontend: React 18 + Vite + Tailwind + ECharts + Recharts
- Backend: Node/Express + PostgreSQL (Railway) + bcrypt + JWT
- Identidade visual: CMYK (Cyan #22B8E6, Magenta #E5379B, Yellow #F5C518/#E0B617, Key #2A2A2E)

## O que foi implementado nesta sessão (20/05/2026)
1. **Design system Comunynk** em `tailwind.config.js` + `src/index.css`
   - Tokens `cmyk-c/m/y/k`, paleta `ink`, fundos `paper`/`paperDark`
   - Fontes: **Manrope** (texto) + **Archivo Black** (wordmark) + **JetBrains Mono**
   - Utilitários: `.paper-bg`, `.cmyk-stripe`, `.cmyk-stripe-soft`, `.cmyk-stripe-thin`, `.card-print` (com registration mark + crosshair via ::before/::after), `.wordmark-comunynk`, `.ink-square`, `.reg-mark`, `.cmyk-loader`
   - Scrollbar com gradiente CMYK; `::selection` amarelo
2. **Componente `<ComunynkLogo />`** (`src/components/ComunynkLogo.jsx`) — reutilizável (variant `full`/`wordmark`/`mark`, tamanhos `sm`/`md`/`lg`/`xl`)
3. **Sidebar** (`src/components/Sidebar.jsx`) — light theme com faixa CMYK no topo, registration mark, indicadores coloridos por seção (Financeiro = cyan/magenta, Gráfica = yellow), avatar ink-square
4. **Layout / mobile topbar** (`src/components/Layout.jsx`) — fundo `paper-bg`, logo no header mobile, faixa CMYK
5. **Login** (`src/pages/Login.jsx`) — completamente reformulada com logo grande, listras diagonais nos cantos, registration mark girando, card com top-stripe CMYK, inputs com focus cyan/magenta, loader CMYK
6. **Dashboard** (`src/pages/Dashboard.jsx`)
   - Paleta de gráficos migrada para CMYK suavizado (Receitas=cyan, Despesas=magenta-soft, custos em magenta tracejado)
   - `ChartCard` agora usa `card-print` (registration mark + crosshair no canto)
   - Header com reg-mark + chips coloridos CMYK
   - Loading com `cmyk-loader`
   - Section divider "Gráfica" com pontos CMYK
7. **`index.html`** — título "Comunynk · Cashflow", favicon SVG com 4 quadrantes CMYK, fontes carregadas

## Não foi alterado (respeitando "prompt negativo")
- Rotas, endpoints, esquema do banco (PostgreSQL)
- Lógica de auth (JWT + bcrypt) e seeds
- Lógica de negócio (receitas, despesas, orçamentos, caixa, produtos)
- Estrutura de pastas, dependências, scripts de start
- Funcionalidades existentes do dashboard, filtros, modais

## Observação de execução
- Backend exige `DATABASE_URL` (PostgreSQL Railway) configurada em produção. Em ambiente local de preview a UI foi validada via dev server (Vite) e build de produção (`yarn build` ✓ sem erros).
- Login renderizado e validado visualmente via screenshot. As demais páginas mantêm seus comportamentos originais; a personalização foi aplicada via tokens globais (tailwind + index.css) + componentes base, então herdam a identidade automaticamente.

## Credenciais de teste (seed do backend)
- Admin:  `admin@cashflow.com` / `admin123`
- Viewer: `viewer@cashflow.com` / `viewer123`

## Backlog / próximos passos sugeridos
- P1: aplicar `card-print` aos cards de KPI (MetricCard) e às páginas Receitas/Despesas/Quotes para consistência total
- P2: variação dark de algumas telas administrativas
- P2: trocar emojis residuais em SVGs por ícones da identidade
- P2: gerar PDF de orçamento com o cabeçalho Comunynk + faixa CMYK
