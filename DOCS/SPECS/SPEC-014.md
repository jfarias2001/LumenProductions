# SPEC-014 — Redesign visual "Lumen Glow"

**Base:** PRD-014. Mudanças **exclusivamente de frontend/estilo** (`apps/web`).
Sem alteração em `apps/api`, `packages/shared`, schema ou rotas.

## 1. Tokens — `apps/web/tailwind.config.ts`

### 1.1 Cores

- `surface` re-tintada para azul-violeta profundo (mais "noite", menos cinza):
  `950 #060714 · 900 #0a0c1b · 850 #0f1124 · 800 #151830 · 700 #1f2342 · 600 #2b3054 · 500 #3a4070`.
- `brand` (índigo elétrico, mantém a família da marca): ramp 50–900 baseada em `500 #6d6af8`.
- `ai` ganha ramp completa (300–700) violeta.
- Novo acento `glow` ciano (`#22d3ee` family) para detalhes de luz (dot IA ativa, links).

### 1.2 Tipografia

- `fontFamily.sans = Inter` (corpo), `fontFamily.display = 'Space Grotesk'` (títulos, marca,
  números de destaque). Fonte carregada no `index.html` (Google Fonts, weights 500–700).

### 1.3 Sombras / efeitos

- `shadow-card` (2 camadas), `shadow-card-hover` (elevação), `shadow-glow` (halo índigo),
  `shadow-glow-ai` (halo violeta), `shadow-inner-top` (realce de vidro: inset 0 1px 0 white/6%).

### 1.4 Animações

- Keyframes: `fade-in`, `fade-up` (8px), `slide-in`, `pulse-dot` (dot de status),
  `aurora` (drift lento dos blobs do login, 18s).

## 2. Base + classes — `apps/web/src/index.css`

- **Fundo aurora:** `body` com `background: radial-gradient(...) x3` (índigo 8% topo-esq,
  violeta 6% topo-dir, ciano 4% base) sobre `surface-950`, `background-attachment: fixed`.
- `.surface-card` → vidro: `bg-surface-850/80 backdrop-blur border border-white/[0.06]
  rounded-2xl shadow-card` + realce interno topo.
- `.btn-primary` → gradiente `brand-500→ai-500`, `hover:shadow-glow`, `active:scale-[0.98]`.
- `.btn-ai` → borda violeta luminosa, `hover:shadow-glow-ai`.
- `.btn-ghost` → hover `bg-white/5`.
- `.input-base` → `bg-surface-950/60`, borda `white/8`, foco com anel `brand-400/40` + borda acesa.
- `.badge` → `rounded-md ring-1 ring-inset ring-white/10`, `tabular-nums`.
- Novas: `.text-gradient` (texto em gradiente brand→ai→glow), `.glass-overlay`
  (backdrop dos modais: `bg-surface-950/70 backdrop-blur-md`).
- Scrollbar: 8px, thumb `surface-600/80` com hover `brand-500/50`.
- Seleção de texto: `::selection` em brand.

## 3. Componentes

### 3.1 `AppHeader.tsx`
Vidro (blur + borda inferior `white/6`); logo = orb gradiente com glow; nome do produto
em `font-display` com `.text-gradient` no "Engine"; navegação como pílulas — ativa com
`bg-white/8 text-white` + dot de acento; status da IA = dot pulsante (ciano ativo / cinza off);
usuário com avatar-inicial em anel gradiente.

### 3.2 `Login.tsx`
Dois blobs aurora animados (`animate-aurora`) + grid radial sutil; card de vidro
`max-w-sm` com logo orb maior; título em `font-display`; botão primário gradiente.

### 3.3 `Board.tsx`
Toolbar em vidro (`bg-surface-900/50 backdrop-blur`); contador de cards como chip;
toast de gate com ícone e glow rosa.

### 3.4 `KanbanColumn.tsx`
Nova const `STAGE_ACCENT` em `lib/labels.ts` (cor por estágio: texto/dot/hairline).
Coluna: `rounded-2xl bg-white/[0.02] border-white/[0.05]`; header com **dot** na cor do
estágio + hairline gradiente no topo; contador `font-display tabular-nums`; drop vazio
com área tracejada "solte aqui" quando em drag-over; estado `isOver` com halo brand.

### 3.5 `KanbanCard.tsx`
`border-l-[3px]` na cor do pilar (nova const `PILLAR_BORDER`); hover: `-translate-y-0.5
shadow-card-hover border-brand-400/40`; selo de formato com glyph (🎬/🖼️/🧩) discreto;
avatar do responsável com anel; dragging: `rotate-2 shadow-glow`.

### 3.6 `CardDetail.tsx` (somente shell) e `CreateCardModal.tsx`
Overlay `.glass-overlay`; drawer `bg-surface-900/95 backdrop-blur-xl border-white/8`;
modal usa `.surface-card` (herda vidro) — títulos em `font-display`.

### 3.7 `CalendarPage.tsx` (acabamento)
Células do mês: hoje com anel brand + fundo brand/8; células vazias `bg-white/[0.015]`;
títulos de seção em `font-display`.

## 4. Verificação

- `pnpm --filter web typecheck`
- `pnpm --filter web build` (vite build)
- Conferência visual das telas: Login, Board (drag-over, toast de gate), CardDetail,
  Calendário (geral + detalhe), Empresa.

## 5. Riscos

- Re-tintar `surface` muda todas as telas de uma vez — mitigado por manter a mesma escala
  de luminância dos tokens atuais (drop-in).
- `backdrop-blur` em muitas camadas pode custar FPS em máquinas fracas — usado só em
  header, toolbar, cards (blur pequeno) e overlays.
