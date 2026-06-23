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

*Atualize este arquivo ao concluir cada feature. Use o formato `[YYYY-MM-DD] Nome da fase/feature` como cabeçalho de seção.*
