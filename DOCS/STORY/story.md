# Story — Content Engine (Lumen Digital)

> Log incremental de implementação. Leia SEMPRE antes de iniciar qualquer nova feature para ter o contexto atual do sistema.

---

## [2026-06-23] Fase 0 — Fundação do monorepo

**Base:** SPEC-001 v1.0 (§15 Fase 0)

### O que foi feito

#### Estrutura do projeto
- Criado monorepo pnpm com workspaces: `apps/api`, `apps/web`, `packages/shared`.
- Configurado `pnpm-workspace.yaml` e `package.json` raiz com scripts globais.
- `tsconfig` base compartilhado com path aliases.

#### `packages/shared`
- Todos os **enums de domínio** do SPEC-001 §6.3: `Stage` (18 estágios), `Pillar` (7), `AwarenessLevel` (4), `ContentClass`, `SignalSource`, `AngleType`, `CreativeFormat`, `DerivedAssetType`, `Role`, `HookStatus`, `ValidationVerdict`.
- Constantes de regras: thresholds de validação (0–8 DESCARTAR, 9–12 MELHORAR_ANGULO, 13–18 SEGUIR_ROTEIRO), mix-alvo (60/25/15), metas semanais.
- Schemas Zod base para DTOs de autenticação e cards.

#### `apps/api`
- Fastify com `fastify-type-provider-zod`, plugins de CORS, helmet, rate-limit.
- **Prisma schema** completo: `User`, `Card`, `Validation`, `Angle`, `Hook`, `Script`, `CreativeDirection`, `CopyContent`, `Schedule`, `RetentionReview`, `CardChecklistItem`, `ChecklistTemplate`, `ChecklistTemplateItem`, `CardMetricSnapshot`, `DerivedAsset`, `CardStageHistory`, `Comment`, `ActivityLog`, `AIJob`, `AppSetting`.
- Autenticação: email/senha com **argon2id**, JWT access (15 min) + refresh token (cookie httpOnly, rotação, revogação).
- RBAC: middleware `requireRole` e `requirePermission` alinhado com matriz do SPEC-001 §12.3.
- Rotas: `/auth/*`, `/users`, `/board`, `/cards/:id` + todos os subrecursos do §10.
- **`PipelineService`**: `canTransition(card, to)` com todas as pré-condições do §7.3 — coração das regras de negócio, 100% testável unitariamente.
- `ValidationService`: cálculo de `total` e veredito automático no backend.
- `RetentionGateService`: lógica de `badCount ≥ 3 → retorno a EM_EDICAO`.
- Socket.io: namespace `/board`, eventos `card.created`, `card.moved`, `card.updated`, `card.archived`.
- Seed: papéis/usuário admin padrão, `AppSetting` singleton, templates de checklist para todas as etapas (§20.1).
- Docker Compose: api, web, postgres:16, redis.

#### `apps/web`
- React 18 + Vite + TypeScript.
- Roteamento React Router v6.
- TanStack Query (cache de servidor) + Zustand (estado de UI).
- Tailwind CSS + shadcn/ui configurados.
- Tela de **Login** (email/senha).
- **Board Kanban** com 18 colunas, scroll horizontal, drag-and-drop via dnd-kit com validação otimista (reverte e exibe motivo de gate bloqueado).
- **Card Detail** (drawer): abas por etapa — Template, Validação, Ângulos & Hooks, Roteiro, Direção Criativa, Checklists, Revisão de Retenção, Copy, Agendamento, Distribuição, Métricas, Reciclagem, Atividade/Comentários.
- Indicadores visuais de gate e mix fora do alvo.
- Socket.io-client conectado ao namespace `/board` para atualizações em tempo real.

### Estado atual do sistema
- Pipeline completo de 18 estágios funcional (sem IA).
- Autenticação e RBAC operacionais.
- Board com drag-and-drop respeitando gates.
- Seed com dados iniciais para desenvolvimento.

### Próximos passos sugeridos (SPEC-001 §15)
- **Fase 2:** Camada de IA — `AIProvider` (OpenAI), jobs BullMQ, 6 funções do §9.3, Regra de Ouro no system prompt.
- **Fase 3:** Analytics completo — dashboards de resultado, mix vs. alvo, ritmo semanal, reciclagem.

---

## [2026-06-23] Fix — Login travava em "Entrando…" (servidor HTTP não respondia)

**Sintoma:** ao fazer login, o botão ficava eternamente em "Entrando…" e a tela não avançava ("carrega e não anda"), sem nenhum erro.

**Causa:** em `apps/api/src/server.ts`, o código fazia `createServer(fastify.server)`, criando um **segundo** servidor HTTP sem nenhum handler do Fastify. Ele subia na porta 3001 sem erro e o Socket.io até conectava, mas toda requisição HTTP (incluindo `POST /api/v1/auth/login`) ficava pendurada sem resposta.

**Correção:** Socket.io passou a ser anexado ao próprio servidor do Fastify (`new IOServer(fastify.server, …)`) e o start passou a usar `await fastify.listen(...)` em vez do `httpServer.listen(...)`. Removidos o import de `node:http` e o `fastify.ready()` redundante. Padrão recomendado para compartilhar o servidor entre Fastify e Socket.io.

**Validação:** `tsc --noEmit` OK.

---

## [2026-06-24] Fase 2 — Camada de IA (OpenAI real) + Redesign dark do board

**Base:** PRD-002 / SPEC-002. Motivação: o usuário relatou que o sistema "estava muito simples, só um Kanban sem interação" e que a IA não funcionava.

### Diagnóstico
- O board não tinha forma de **criar cards** pela UI (só os do seed) e metade das abas do card estava "em construção" → sensação de tela estática.
- Todas as rotas `/ai/*` eram **stubs 503** — a camada de IA nunca foi implementada.
- Bug latente: classes `.input-base`, `.btn-primary`, `.btn-ghost` eram usadas mas **não existiam** no CSS.

### Backend — camada de IA (SPEC-001 §9 implementada)
- `packages/shared`: novos **schemas Zod de saída** (`AIProspectOutputSchema`, `AIStructureOutputSchema`, `AIValidateOutputSchema`, `AIAnglesOutputSchema`, `AICopyOutputSchema`, `AIRecycleOutputSchema`) + tipos inferidos.
- `apps/api/src/lib/ai/provider.ts`: `AIProvider` abstrato + `OpenAIProvider` (SDK openai v4, `response_format: json_object` + validação Zod). `getAIProvider()` singleton; `enabled = !!OPENAI_API_KEY`. Erros tipados `AINotConfiguredError` / `AIOutputError`.
- `apps/api/src/services/ai.service.ts`: 6 funções (`prospect`, `structure`, `validate`, `angles`, `copy`, `recycle`). Cada uma injeta a **Regra de Ouro** (lida do `AppSetting`), trata texto do usuário como **dado** (anti prompt-injection) e registra o ciclo de vida em `AIJob` (status, tokens, custo estimado, resultado).
- `apps/api/src/routes/ai.ts`: stubs substituídos por handlers reais que **persistem** os resultados (prospect → novos cards em IDEIAS_BRUTAS; structure → patch no card; validate → `Validation` com `aiSuggested=true` e `reviewedById=null`, gate continua exigindo humano; angles → `Angle[]`+`Hook[]`; copy → `Script`+`CopyContent`; recycle → `DerivedAsset[]`). Novo `GET /ai/status`. Sem chave → 503; falha de IA → 502 (card segue editável).

### Frontend — redesign dark SaaS + IA no fluxo
- **Tema dark**: `tailwind.config.ts` (paletas `brand` índigo, `surface` escuras, `ai` roxo, shadows `glow`/`card`, animações) e `index.css` com classes `@layer components` (`.surface-card`, `.input-base`, `.label-base`, `.btn-primary`, `.btn-ghost`, `.btn-ai`, `.badge`). Corrige o bug das classes inexistentes.
- **Login** redesenhado (dark, glows, logo gradiente).
- **Board**: header dark com selo de status da IA, **toolbar** com busca + filtros (pilar/consciência/classe) ligados ao `useUIStore`, botão **+ Novo Card**, destaque da coluna-alvo no drag-over, toast de gate.
- Novos: `CreateCardModal`, `lib/labels.ts` (rótulos/cores pt-BR de enums), `hooks/useAI.ts` (status + 6 mutations), `hooks/useBoard` ganhou `useCreateCard`/`useArchiveCard`, `components/card/AICopilotButton.tsx` (loading + fallback "IA indisponível").
- **KanbanColumn/KanbanCard** restilizados (dark, badges coloridos, avatar do responsável, estado vazio).
- **CardDetail** reformulado: todas as abas antes "em construção" agora funcionam (Copy, Direção, Checklists interativo, Retenção, Agendamento, Reciclagem) e cada etapa relevante tem botão de **copiloto de IA** (Estruturar / Validar / Gerar ângulos & hooks / Gerar roteiro+copy / Gerar derivados). Botão de arquivar no header.

### Estado atual
- Pipeline + IA funcionando de ponta a ponta: criar card pela UI, mover, e usar IA em cada etapa (basta `OPENAI_API_KEY` no backend; sem ela a UI mostra fallback).
- Revisão humana preservada: validação por IA entra como sugestão; `PipelineService.canTransition` inalterado.
- `pnpm -r typecheck` OK nos 3 pacotes; `vite build` do web OK.

### Próximos passos sugeridos
- Mover chamadas de IA para **jobs BullMQ** assíncronos (hoje são síncronas com `AIJob` de registro).
- Ação de **Prospecção** na coluna Sinais (seleção múltipla de sinais → `POST /ai/prospect`).
- Edição inline de Direção/Copy/Agendamento (hoje algumas abas são leitura + IA).
- Fase 3: dashboards de analytics (mix vs. alvo, ritmo semanal).

---

*Atualize este arquivo ao concluir cada feature. Use o formato `[YYYY-MM-DD] Nome da fase/feature` como cabeçalho de seção.*
