# CLAUDE.md — Content Engine (Lumen Digital)

## Workflow obrigatório antes de qualquer nova feature

1. **PRD-XXX** — crie um documento de produto em `DOCS/PRDS/` dando continuidade ao anterior (PRD-001, PRD-002, …).
2. **SPEC-XXX** — traduza o PRD em especificação técnica em `DOCS/SPECS/` com o mesmo número.
3. **Leia `DOCS/STORY/story.md`** — SEMPRE antes de iniciar a implementação, leia o story.md para entender o contexto atual do sistema e o que já foi implementado.
4. **Implemente** — com base na SPEC aprovada.
5. **Atualize `DOCS/STORY/story.md`** — ao final de cada feature implementada, registre um resumo do que foi feito.

## Estrutura do repositório

```
LumenProductions/
├── CLAUDE.md                  ← este arquivo
├── DOCS/
│   ├── PRDS/                  ← PRD-001.md, PRD-002.md, …
│   ├── SPECS/                 ← SPEC-001.md, SPEC-002.md, …
│   └── STORY/
│       └── story.md           ← log incremental de features implementadas
├── apps/
│   ├── api/                   ← Fastify + Prisma + BullMQ + Socket.io
│   └── web/                   ← React 18 + Vite + TanStack Query + dnd-kit
└── packages/
    └── shared/                ← enums, schemas Zod, tipos TS compartilhados
```

## Stack (SPEC-001 §4)

- **Monorepo pnpm** (workspaces)
- **TypeScript** em todo o stack
- **Backend:** Fastify, Prisma ORM, PostgreSQL 16, Redis, BullMQ, Socket.io, argon2, JWT, pino
- **Frontend:** React 18, Vite, React Router v6, TanStack Query, Zustand, Tailwind CSS, shadcn/ui, dnd-kit, React Hook Form + Zod, Recharts, socket.io-client
- **Compartilhado:** enums de domínio, schemas Zod, constantes de regras de negócio
- **Testes:** Vitest, React Testing Library, Playwright

## Regras gerais

- Todo novo card de conteúdo segue o pipeline de 18 estágios definido no SPEC-001 §7.
- Gates de qualidade (validação ≥13, revisão de retenção) são verificados **no backend** (`PipelineService.canTransition`).
- Chaves de IA (OpenAI) ficam **somente no backend** — nunca no cliente.
- Publicação é sempre **manual** — nunca automatizada por IA ou job.
- Métricas são inseridas **manualmente** na v1.
- Siga a **Regra de Ouro**: dor → falha do processo → mecanismo → posicionamento da Lumen.
- Idioma/locale: **pt-BR**, timezone `America/Sao_Paulo`.
