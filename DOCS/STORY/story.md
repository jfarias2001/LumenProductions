# Story — Content Engine (Lumen Digital)

> Log incremental de implementação. Leia SEMPRE antes de iniciar qualquer nova feature para ter o contexto atual do sistema.

---

## [2026-06-25] PRD-006 — Direção criativa rica gerada por IA

**Motivação:** a etapa Direção Criativa não tinha botão "Gerar com IA" direto e o pacote final entregava pouco (só formato/legenda/CTAs). O usuário pediu que a IA gere a "receita" da peça: para estático — elementos visuais, disposição na tela, fonte/tamanho/cores; para vídeo — decupagem, entonação e insights de edição.

**Entregue (PRD-006 / SPEC-006):**
- Shared: `AIDirectionOutputSchema` enriquecido (`typography`, `voiceTone`, `shotList`, `graphicElements` com layout/font/fontSize/colors) + `AIDirectionInputSchema` e tipos `Shot`/`GraphicElement`/`Typography`.
- Prisma: `CreativeDirection.productionPlan Json?` + migration `20260625000100_creative_production_plan` (aplica no boot).
- Backend: prompt de `direction()` reescrito (adapta-se a vídeo/estático); helper `persistDirection()`; nova rota `POST /ai/direction`; `deliverable.service` (UI + Markdown) expõe decupagem, entonação, tipografia e layout/fonte/cores.
- Frontend: `useAIDirection`; `DirecaoTab` com botão de IA + render rico; `FinalPackageView` com os mesmos blocos.

Revisão humana e gate inalterados. `tsc --noEmit` OK em api e web; shared rebuildado; `prisma generate` OK.

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

## [2026-06-24] Fase 3 — Copiloto conversacional por fase

**Base:** PRD-003 / SPEC-003. Motivação: a IA era um conjunto de **6 botões one-shot** (1 clique = 1 chamada → JSON nos campos). O usuário queria o oposto: **conversar com a IA ao longo da pipeline**, com prompts padrão por fase, construindo o material incrementalmente até um entregável final.

### Decisões (travadas com o usuário)
- **Thread por fase** (uma conversa por `card+stage`), com prompt padrão da fase carregado como sugestão.
- **Pipeline mantido** — as 18 etapas e os gates (`PipelineService.canTransition`) continuam intactos; muda a casca (chat) e a validação por IA segue como sugestão (humano no gate).
- **Entregável adaptado ao tipo** — card declara VÍDEO (roteiro + hooks + insights de edição) ou ESTÁTICO (copy + elementos gráficos/slides + paleta).

### Shared (`packages/shared`)
- Enum `ContentType` (VIDEO|ESTATICO); `CONVERSATIONAL_STAGES` + `isConversationalStage`; mapa `STAGE_GOAL` (objetivo da IA por fase).
- `contentType` em `CreateCardSchema`/`UpdateCardSchema`; novos schemas `AIDirectionOutputSchema`, `ConversationMessageInputSchema`, `ConsolidateInputSchema`, `CreatePromptTemplateSchema`/`Update…` + tipos inferidos.

### Backend (`apps/api`)
- **Prisma**: enum `ContentType`; `Card.contentType`; modelos `AIConversation` (única por `cardId+stage`), `AIMessage`, `PromptTemplate`; campos `editingInsights`/`graphicElements`/`palette`/`aiGenerated` em `CreativeDirection`. Migration `20260624000000_conversational_copilot` (additiva).
- **Provider**: novo método `chat()` com **streaming** (SSE via `stream: true` + `stream_options.include_usage`) além do `generateStructured` existente.
- **`ConversationService`**: `getOrCreate`, `buildSystemPrompt` (Regra de Ouro + objetivo da fase + contexto do card + entregáveis das fases anteriores, tudo como DADO), `sendMessage` (persiste user/assistant, registra `AIJob`), `transcript`.
- **`ai.service`**: funções existentes ganham parâmetro opcional `conversation`; nova `direction()` (adapta-se ao tipo); orquestrador **`consolidateStage(cardId, stage)`** que reusa structure/validate/angles/copy/direction/recycle a partir da transcrição e persiste nas entidades reais. Validação consolidada entra `aiSuggested=true` sem `reviewedById`.
- **`DeliverableService`**: `assemble(cardId)` monta o pacote por tipo + `toMarkdown` para export.
- **Rotas `conversations.ts`**: `GET/POST .../conversations/:stage` (POST = **SSE**), `.../consolidate`, `GET /cards/:id/deliverable(?format=md)`, CRUD `/prompt-templates` (escrita sob nova permissão `managePrompts` = ADMIN/GESTOR). SSE usa `reply.hijack()`.
- **Seed**: 12 `PromptTemplate` `builtIn` cobrindo as fases criativas.

### Frontend (`apps/web`)
- Hooks: `useConversation` (histórico + `useSendMessage` que consome o stream SSE via `fetch`+`ReadableStream` atualizando o texto em tempo real + `useConsolidate`), `usePromptTemplates`, `useDeliverable`.
- Componentes: `PhaseChat` (seletor de fase, chips de prompts padrão, bolhas user/IA, streaming, botão Consolidar, fallback "IA indisponível") e `FinalPackageView` (pacote por tipo + copiar Markdown).
- `CardDetail`: novas abas **✦ Copiloto IA** (default) e **📦 Pacote**; badge de tipo de conteúdo no header; aba Direção mostra insights de edição / elementos gráficos / paleta.
- `CreateCardModal`: seletor VÍDEO/ESTÁTICO. `labels.ts`: `CONTENT_TYPE_LABELS`.

### Estado atual
- Conversa por fase funcionando de ponta a ponta com streaming; consolidação grava nos campos do card; pacote final por tipo exportável. Sem `OPENAI_API_KEY` → fallback claro.
- `pnpm -r typecheck` OK nos 3 pacotes; `vite build` do web OK. Migration criada (aplicar com `prisma migrate deploy` + `db:seed` quando o Postgres estiver disponível).

### Próximos passos sugeridos
- Aplicar a migration no ambiente (Docker/Postgres) e rodar o seed.
- UI de **Configurações → Prompts** (CRUD já existe no backend).
- Mover chat para jobs/observabilidade assíncrona; permitir editar inline o entregável consolidado.

---

## [2026-06-24] Correções de UX do modal/copiloto

Ajustes pós-uso real do copiloto conversacional (sem novo PRD — correções/polimento sobre o PRD-003).

### Correções
- **Modal `CardDetail` embaçado e sem clique**: o painel era `position: static` enquanto o overlay `backdrop-blur` era `position: fixed`; num mesmo stacking context o overlay posicionado pintava por cima. Adicionado `relative` ao painel (mesmo padrão do `CreateCardModal`).
- **Consolidação quebrava no enum**: a IA devolvia o rótulo legível (ex.: "Consciente do problema…") em vez do valor do enum (`PROBLEMA|…`), e `z.nativeEnum` abortava toda a consolidação. Criado `coerceEnum` em `schemas.ts` (mapeia rótulo/frase → valor por match exato ou fragmentos-chave, sem acento/case-insensitive; cai para `undefined` se não casar). Aplicado a `pillar` e `awareness` em `AIStructureOutputSchema` e `AIProspectOutputSchema`.

### Melhorias de fluxo (PhaseChat)
- Prompt do copiloto reforçado: responde **sempre em texto natural**, nunca JSON cru no chat (a estruturação é só no Consolidar).
- Após consolidar: **resumo** dos campos gravados (por tipo de fase) + botão **"Avançar → próxima fase"** que move o card no board (consolidar → avançar). Erros de gate de qualidade aparecem inline.

### Estado
- `pnpm typecheck` OK em shared, api e web. Mudança em `packages/shared` exige rebuild do `dist` (feito no Docker durante o deploy).

---

## [2026-06-24] Fix: campos do sinal editáveis no detalhe do card

Correção/polimento (sem novo PRD) — destrava o gate *Sinais do Mercado → Ideias Brutas*.

### Problema
O gate `PipelineService.canTransition` exige `signalSource` e `signalContent` para sair de *Sinais do Mercado*. Esses campos só existiam no `CreateCardModal`; o `CardDetail` (aba *Template*) não os expunha. Um card já no board sem conteúdo de sinal ficava travado para sempre ("Transição bloqueada: Conteúdo do sinal é obrigatório.") sem nenhum lugar na UI para preenchê-los.

### Correção
- `CardDetail` → aba **Template**: adicionados **Fonte do sinal** (select de `SignalSource`) e **Conteúdo do sinal** (textarea) ao modo de edição; o `Salvar` envia via PATCH `/cards/:id` (campos já aceitos por `UpdateCardSchema`). Sem mudança de backend nem de schema do banco.

### Estado
- `tsc --noEmit` do web OK. Deploy: apenas rebuild do container `web` (sem migration).

---

## [2026-06-24] UX: detalhe do card vira fluxo focado por etapa (não mais "tudo de uma vez")

Correção/polimento (sem novo PRD) — reorganiza o `CardDetail`.

### Problema
O `CardDetail` renderizava **as 14 abas ao mesmo tempo**, independentemente do estágio do card. Resultado: já no primeiro estágio (Sinais do Mercado) era possível preencher roteiro, copy, métricas etc. — o oposto de um pipeline que evolui etapa a etapa. Relato do usuário: *"o card na primeira etapa eu já consigo preencher tudo… quero cada estágio uma coisa e vai evoluindo até o final"*.

### Solução — fluxo focado por etapa
- **Stepper das 18 fases** no topo do drawer: concluídas (✓, clicáveis para revisão), atual (destaque) e **futuras bloqueadas (🔒, não clicáveis)** — não dá mais para pular para frente e preencher tudo.
- O corpo mostra **apenas o painel da etapa em foco** (default = etapa atual do card), com um título + descrição do que fazer agora (`STAGE_META.job`) e o mapeamento estágio→seções:
  - Sinais → captura do sinal; Ideias Brutas → copiloto + fundamentos (título/persona/dor/pilar/consciência); Validadas → copiloto + validação; Ângulo/Hooks → copiloto + ângulos&hooks; Roteiro/Direção/Copy/Reciclar → copiloto + a seção respectiva; Pré-gravar/Distribuição → checklist; Gravado/Edição → **novo editor de link de mídia** (`rawFootageUrl`/`editedVideoUrl`) + checklist; Retenção → revisão; Agendado/Publicado → agendamento; Análise → métricas + **novo seletor de classificação** (`contentClass`).
- **Barra de avanço única** no rodapé (`AdvanceBar`), só quando a etapa em foco é a atual: mostra o requisito do gate (`STAGE_META.gate`) + botão "Avançar → próxima fase" usando `useTransitionCard`; erros de gate aparecem inline.
- **Alternância Fluxo / 📦 Pacote** no header (o `FinalPackageView` saiu de aba fixa para essa visão).
- `PhaseChat` ganhou prop `embedded`: quando embutido no fluxo, trava a fase na atual (sem seletor livre) e esconde o botão próprio de avançar (a `AdvanceBar` é o único ponto de avanço); mantém o Consolidar.
- `TemplateTab` agora tem `focus: 'signal' | 'idea'`; comentários viraram seção colapsável transversal.

### Estado
- `tsc --noEmit` do web OK. Sem mudança de backend/schema — deploy é só rebuild do `web`.

### Próximos passos sugeridos
- Editores inline ainda faltantes para fechar gates pela UI: confirmação humana da validação (`reviewedById`), formulário de agendamento (`schedule`), entrada de métricas (`metricSnapshots`) e revisão de retenção. Hoje algumas dessas etapas são leitura + IA.

---

## [2026-06-24] Fase 4 — Geração com IA por fase ("Gerar com IA")

**Base:** PRD-004 / SPEC-004. Motivação: o copiloto do PRD-003 era só **conversacional** (dialogar → Consolidar), o que pressupõe o usuário já ter algo. Relato: *"quero uma opção de gerar com IA — na parte de ideias brutas, quando não tenho ideias, gerar ideias baseadas em alguma informação, e assim nas outras etapas"*.

### Decisões (travadas com o usuário)
- **Ideias Brutas** → gera UMA ideia estruturada e **preenche o card atual** (não cria vários cards; isso continua sendo a prospecção do PRD-002).
- **UI** → botão **"✦ Gerar com IA"** dentro do copiloto (ao lado de "Consolidar"), com campo de contexto.
- **Cobertura** → todas as fases criativas (`CONVERSATIONAL_STAGES`).
- A geração é, na prática, um **"Consolidar" cuja fonte é o contexto digitado** em vez da transcrição da conversa.

### Shared (`packages/shared`)
- `GenerateStageInputSchema` (`context: string opcional`) + tipo `GenerateStageInput`. Sem mudança de enum.

### Backend (`apps/api`)
- `ai.service`: extraído `persistStageFromSource(cardId, stage, userId, source)` (o switch antes embutido em `consolidateStage`); `consolidateStage` agora só obtém a transcrição e delega. Novo `generateStage(cardId, stage, userId, context?)` — valida (contexto obrigatório só em IDEIAS_BRUTAS, `code: NEED_CONTEXT`), persiste via `persistStageFromSource` e registra a geração na conversa. Novo `summarizeResultForChat` (resumo legível por entidade).
- `conversation.service`: `appendGeneratedTurn` grava 2 `AIMessage` (pedido do usuário + resumo da IA) na thread da fase — o resumo vem pronto de `ai.service` (evita ciclo de import).
- `routes/conversations.ts`: `POST /cards/:id/conversations/:stage/generate` (`useAI`, valida `isConversationalStage`, body `GenerateStageInputSchema`). Sem chave → 503; falha → 502; emite `card.updated`.

### Frontend (`apps/web`)
- `useConversation`: `useGenerate(cardId, stage)` (invalida conversation/card/deliverable/board).
- `PhaseChat`: botão "✦ Gerar com IA" + painel colapsável com textarea de contexto (label avisa obrigatório em Ideias Brutas) e botão "Gerar"; o painel verde de sucesso passou a servir consolidar **ou** gerar (`summaryLines` reaproveitado); turnos gerados aparecem no histórico após a invalidação. Reset do painel ao trocar de fase.

### Estado atual
- Em cada fase criativa dá para **gerar do zero** a partir de um contexto (ou do próprio card) e o entregável é gravado nos campos reais; também vira turnos na conversa para refinar e consolidar depois. Validação gerada segue como sugestão (gates do `PipelineService` intactos). Sem `OPENAI_API_KEY` → fallback claro.
- `pnpm -r typecheck` OK nos 3 pacotes; `vite build` do web OK. **Sem migração** (reusa entidades existentes). Mudança em `packages/shared` exige rebuild do `dist` (feito).

### Próximos passos sugeridos
- Permitir "gerar" também a partir de um prompt template (chip → preenche o contexto da geração).
- Opção de regenerar substituindo (em vez de acumular) ângulos/derivados que usam `createMany`.

---

## [2026-06-25] Fase 5 — Base de Conhecimento da Empresa + Calendário Editorial com IA

**Base:** PRD-005 / SPEC-005. Motivação: a IA criava conteúdo sempre a partir de um input pontual, sem memória da empresa, e produzia um card por vez. Relato: *"quero gerar um calendário editorial — a IA monta uma sequência de posts/reels que se conectam para engajar — e ter uma parte alimentada onde subo todos os dados da empresa para ela se embasar antes de criar."*

### Decisões (travadas com o usuário)
- **Base de conhecimento** = **formulário estruturado** (sem upload de arquivos / RAG na v1).
- **Saída do calendário** = calendário datado **+ cada post pode virar card** no pipeline de 18 etapas.
- **Cadência** = **usuário define** período/frequência/tipos; a IA preenche respeitando o mix 60/25/15.

### Shared (`packages/shared`)
- Novos schemas Zod: `CompanyPersonaSchema`, `CompanyProfileSchema`, `GenerateCalendarInputSchema`, `AICalendarItemSchema`, `AICalendarOutputSchema` + tipos inferidos. Novos preprocessadores tolerantes `ContentTypeLoose`/`FormatLoose` reusando o `coerceEnum` (rótulo/frase → enum). Sem mudança de enum.

### Backend (`apps/api`)
- **Prisma**: modelos `CompanyProfile` (singleton), `EditorialCalendar`, `EditorialCalendarItem` (com `cardId @unique` p/ vínculo idempotente). Relação inversa `Card.calendarItem`. Migration `20260625000000_company_and_calendar` (aditiva).
- **`company.service`**: `getCompanyProfile`/`updateCompanyProfile` (upsert singleton) + `buildCompanyContext()` que monta um bloco compacto só com campos preenchidos (`''` se vazio).
- **`ai.service`**: `goldenRule()` passou a anexar a Base da empresa como DADO (default vazio → comportamento inalterado para as 7 funções existentes). Nova `generateCalendar(input, userId)` — Regra de Ouro + mix-alvo + sequência conectada (campo `connection` por item), registrada em `AIJob`.
- **`calendar.service`**: `generateAndSave` (chama a IA, **distribui as datas** no período via `dayOffsetsForWeek`, persiste calendar+itens), `list`/`getById`/`remove`, `sendItemToPipeline` (cria card em `IDEIAS_BRUTAS` + `CardStageHistory` + `emitBoard('card.created')`; **idempotente** — 2ª chamada devolve o card existente).
- **Rotas `calendar.ts`** (`/api/v1`): `GET/PUT /company-profile`, `GET /calendars`, `GET /calendars/:id`, `POST /calendars/generate` (503 sem chave / 502 em falha), `POST /calendars/:id/items/:itemId/send-to-pipeline`, `DELETE /calendars/:id`. Nova permissão `manageCompany` (ADMIN/GESTOR); geração sob `useAI`; envio ao pipeline sob `createCard`. Registrada no `server.ts`.

### Frontend (`apps/web`)
- Novo `AppHeader` compartilhado com **navegação Board · Base da Empresa · Calendário** (o header inline do Board foi extraído para ele).
- Hooks: `useCompany` (`useCompanyProfile`/`useSaveCompanyProfile`), `useCalendar` (`useCalendars`/`useCalendar`/`useGenerateCalendar`/`useSendCalendarItem`/`useDeleteCalendar`).
- **`/empresa`** (`CompanyProfilePage`): formulário estruturado (campos texto + personas + editores de lista para do's/don'ts/keywords/links); edição só ADMIN/GESTOR; aviso de que os dados embasam a IA.
- **`/calendario`** (`CalendarPage`): gerador (título/objetivo/início/semanas/posts-sem/tipos) com "✦ Gerar com IA" (fallback se IA off); lista de calendários; detalhe agrupado por semana com badge de pilar/formato/tipo, fio condutor, **indicador de mix vs. alvo** e botão "→ Enviar para o pipeline" por item (vira "✓ No pipeline").
- `labels.ts`: `FORMAT_LABELS` (CreativeFormat).

### Estado atual
- Base da empresa persiste e, quando preenchida, embasa todas as gerações de IA. Calendário editorial gera uma sequência datada e conectada; cada item vira card uma única vez. Sem `OPENAI_API_KEY` → fallback claro. Pipeline e gates (`PipelineService`) **inalterados**.
- `pnpm -r typecheck` OK nos 3 pacotes; `vite build` do web OK. Migration criada (aplicar com `prisma migrate deploy`); `dist` do shared rebuildado.

### Próximos passos sugeridos
- Editar inline os itens do calendário (título/pilar/data) antes de enviar ao pipeline.
- "Enviar todos para o pipeline" em lote.
- Upload de arquivos + RAG para a Base (fase seguinte, fora do escopo da v1).

---

## [2026-06-25] Fix: confirmação humana da validação (gate Ideias Validadas)

**Problema:** o gate `IDEIAS_VALIDADAS → ANGULO_DEFINIDO` exige `validation.reviewedById`, mas nenhum caminho da app gravava esse campo — "Validar com IA" cria sugestão (`reviewedById: null`) e o endpoint `PUT /cards/:id/validation` também não o setava, nem havia botão na UI. Gate ficava travado permanentemente.

**Correção:**
- `apps/api/src/routes/cards.ts` — `PUT /cards/:id/validation` agora grava `reviewedById: actor.sub` e `aiSuggested: false` (log `validation.confirmed`).
- `apps/web/src/hooks/useBoard.ts` — novo `useConfirmValidation(cardId)`.
- `apps/web/src/components/card/CardDetail.tsx` (`ValidacaoTab`) — botão **"✓ Confirmar validação"** quando há validação não revisada; badge "✓ confirmada por humano" após confirmar.

`tsc --noEmit` OK em web e api.

---

## [2026-06-25] Fix: controles interativos faltantes em todas as etapas do pipeline

**Problema:** vários gates do `PipelineService` exigiam ações humanas que a UI só *exibia*, sem permitir executar — travando o avanço. Auditoria de todas as etapas vs. endpoints (todos já existiam no backend).

**Correções no `CardDetail.tsx` (frontend apenas):**
- **Ângulos** (`AngulosTab`): clique seleciona/desseleciona ângulo (PATCH selected); adicionar ângulo manual.
- **Hooks** (`AngulosTab`): botões Escolher/Descartar (PATCH status); adicionar hook manual; contador X/5 mín e nº escolhidos.
- **Roteiro** (`RoteiroTab`): edição manual das 5 seções + duração (30–45s), PUT script.
- **Direção criativa** (`DirecaoTab`): seleção manual de formato (obrigatório) + notas, PUT creative.
- **Copy** (`CopyTab`): edição manual de legenda + variações de CTA, PUT copy.
- **Revisão de retenção** (`RetencaoTab`): formulário com `RETENTION_QUESTIONS` (bom/ruim) + notas, PUT retention-review; reprova ⇒ volta para edição (lógica do backend).
- **Agendamento** (`AgendamentoTab`): formulário completo + datetime-local → ISO, PUT schedule.
- **Métricas** (`MetricasTab`): formulário para registrar snapshot, POST metrics.
- Helper `useCardInvalidate` para invalidar card+board após cada ação.

Etapas com gate de checklist (PRONTO_PARA_GRAVAR, EM_EDICAO, EM_DISTRIBUICAO) já funcionavam via `ChecklistsTab` + templates do seed. `tsc --noEmit` OK no web.

---

## [2026-06-25] PRD-007 — Conteúdo nativo de Instagram + Auto-produção do calendário

**Motivação (relato do usuário):** (1) tudo é gravado/produzido **para o Instagram** e deve ser pensado assim; (2) ao gerar a direção de um conteúdo **estático**, a IA devolveu vários slides/cenas quando era **uma imagem única**; (3) pediu uma nova feature: **a partir do calendário, a IA já produz tudo** e deixa pronto para gravar/produzir.

**Decisões (travadas com o usuário):** imagem única vs. carrossel → IA decide por peça, **default imagem única**, override manual; escopo do "produzir tudo" → gera **todos os entregáveis e avança o card** o máximo que os gates permitirem; disparo → **somente em lote** (calendário inteiro).

### Shared (`packages/shared`)
- Novo enum `StaticFormat` (IMAGEM_UNICA | CARROSSEL). `staticFormat` opcional em `CreateCardSchema`/`UpdateCardSchema`. `StaticFormatLoose` (coerceEnum) + campo em `AICalendarItemSchema`.

### Backend (`apps/api`)
- **Prisma**: `Card.staticFormat`, `EditorialCalendarItem.staticFormat`, enum `StaticFormat`. Migration `20260626000000_static_format` (aditiva/idempotente).
- **`ai.service`**: `INSTAGRAM_CONTEXT` injetado em `direction`/`copy`/`generateCalendar`. `direction()` agora distingue **imagem única** (exatamente 1 `graphicElement`, proíbe slides) de **carrossel** (2–10 slides); vídeo inalterado. `generateCalendar()` pede `staticFormat` por item (prefere imagem única). Novos orquestradores **`autoProduceCard()`** (validação→ângulos/hooks com auto-seleção→roteiro/copy→direção) e **`advanceWhilePossible()`** (avança até o 1º gate bloqueado — para em *Ideias Validadas*, pois o gate seguinte exige `reviewedById`).
- **`calendar.service`**: `sendItemToPipeline`/`generateAndSave` propagam `staticFormat`. Novo **`autoProduceCalendar()`** — por item sem card: cria, `autoProduceCard`, `advanceWhilePossible`, vincula e emite `card.created`; idempotente; `try/catch` por item (retorna `{produced, skipped, failed, errors}`).
- **Rotas**: `POST /calendars/:id/auto-produce` (`useAI`; 503 sem chave, 502 em falha, 404 calendário inexistente).
- **`deliverable.service`**: Markdown usa "Imagem"/"Imagem única" quando há 1 elemento gráfico, "Slide N" quando ≥2.

### Frontend (`apps/web`)
- `labels.ts`: `STATIC_FORMAT_LABELS`. `CreateCardModal`: sub-seletor Imagem única/Carrossel quando Estático. `DirecaoTab` e `FinalPackageView`: rótulo "Imagem única" (1 elemento) vs "Slide N" (≥2). `useCalendar`: `CalendarItem.staticFormat` + `useAutoProduceCalendar`. `CalendarPage`: botão **"✦ Produzir tudo com IA"** (conta itens pendentes, desabilita se IA off/0 itens) + resumo do resultado; badge de formato estático no item.

### Estado atual
- Estático respeita imagem única (default) vs. carrossel; toda geração assume Instagram. Do calendário, um clique cria e produz todos os cards pendentes e os avança até a validação (revisão humana e gates do `PipelineService` **inalterados**). Sem `OPENAI_API_KEY` → fallback claro.
- `pnpm -r typecheck` OK nos 3 pacotes; `vite build` do web OK; `prisma generate` OK; `shared` rebuildado. Migration criada (aplicar com `prisma migrate deploy`).

### Próximos passos sugeridos
- Mover a auto-produção para **jobs BullMQ** (hoje síncrona; pode levar minutos em calendários grandes) com progresso em tempo real.
- Botão "produzir" por item individual (além do lote), se desejado.
- Permitir trocar imagem única↔carrossel direto no card/detalhe (hoje só no CreateCardModal e no calendário).

---

## [2026-06-26] UX: confirmar validação avança sozinho + remoção do chat conversacional

Correções/polimento (sem novo PRD) a partir de uso real.

### Problemas relatados
1. **Gate de validação travava sem saída.** Com veredito `MELHORAR_ANGULO` (total 9–12) o card não avançava de *Ideias Validadas → Ângulo Definido* e não havia ação para "melhorar" o que a IA pedia. O usuário queria que, **ao confirmar a validação, o card já seguisse automaticamente** para as próximas etapas.
2. **Chat conversacional pesava a UI** e era pouco usado — o usuário usa só a geração com IA.

### Correções
- **Gate (`pipeline.service.ts`)** — `IDEIAS_VALIDADAS → ANGULO_DEFINIDO` deixou de exigir `verdict === SEGUIR_ROTEIRO`. Agora **a confirmação humana (`reviewedById`) é o gate**: ao confirmar, o humano assume a validação e libera o avanço independentemente da nota da IA (o veredito numérico vira referência, não bloqueio). Removido o import não usado `ValidationVerdict`.
- **Auto-avanço (`CardDetail.tsx` → `ValidacaoTab`)** — o botão virou **"✓ Confirmar e avançar"**: após confirmar, dispara automaticamente a transição para a próxima fase (só quando o card está em `IDEIAS_VALIDADAS`). Texto do gate (`STAGE_META`) atualizado; mensagem inline se o avanço for bloqueado por algum gate.
- **Remoção do chat** — novo componente leve **`StageGenerator.tsx`** (só "✦ Gerar com IA": textarea de contexto + resultado + fallback de IA off) substitui o `PhaseChat` embutido no fluxo. **`PhaseChat.tsx` removido.** Hooks `useConversation`/`useSendMessage`/`useConsolidate`/`usePromptTemplates` ficaram sem uso na UI (endpoints de chat/consolidação permanecem no backend, sem custo).

### Estado
- `pnpm --filter api typecheck` e `pnpm --filter web typecheck` OK. Sem migração e sem mudança em `packages/shared`.

---

## [2026-06-26] Validação auto-corretiva + auto-produção até "Pronto para gravar"

Correções/polimento (sem novo PRD), continuação do item anterior. Relato do usuário: (1) a IA às vezes valida com nota baixa — quer que ela **se auto-corrija** até a nota mínima (voltando a exigir o mínimo de antes); (2) o **sistema não precisa mais de validação humana**; (3) ao gerar o **calendário**, todos os cards de criativo devem ir automaticamente até o **último estágio de criação antes de gravar** (PRONTO_PARA_GRAVAR).

### Backend (`apps/api`)
- **`ai.service.ts`** — nova `improveIdea(cardId, validation)`: reescreve a ideia mirando os 6 critérios fracos (reusa `AIStructureOutputSchema`). Novo orquestrador **`validateAndAutoCorrect(cardId, userId)`**: valida → se < SEGUIR_ROTEIRO (≥13), reescreve a ideia e revalida, até `MAX_VALIDATION_ATTEMPTS` (3); persiste a **melhor** tentativa (maior nota) e restaura os campos do card correspondentes a ela. Helper `scoresOf`. `autoProduceCard` passou a usar `validateAndAutoCorrect` no passo 1. `persistStageFromSource` (IDEIAS_VALIDADAS) e a rota `POST /ai/validate` também usam o auto-corretivo. `summarizeResultForChat` atualizado.
- **`pipeline.service.ts`** — gate `IDEIAS_VALIDADAS → ANGULO_DEFINIDO` voltou a exigir a **nota mínima** (`verdict === SEGUIR_ROTEIRO`), mas **passa sozinho** quando atingida (sem humano). Confirmação humana (`reviewedById`) continua como **override manual** para destravar nota baixa. Reimportados `ValidationVerdict`/`VALIDATION_THRESHOLDS`.
- **Auto-produção do calendário** — sem mudança de lógica: como o gate de validação agora passa automaticamente (via auto-correção), `advanceWhilePossible` leva cada card de IDEIAS_BRUTAS até **PRONTO_PARA_GRAVAR** (para só no gate de checklist de pré-produção, que é ação humana). Docstrings de `autoProduceCard`/`advanceWhilePossible` atualizadas.
- `routes/ai.ts`: removido import não usado `calculateValidation`.

### Frontend (`apps/web`)
- `CardDetail.tsx` (`ValidacaoTab`): a UI distingue **nota mínima atingida** (badge verde + "pode avançar, validação manual não é mais necessária") de **abaixo do mínimo** (painel de override discreto "Confirmar manualmente e avançar"). Texto do gate (`STAGE_META`) e hint do "Validar com IA" atualizados.

### Estado
- `pnpm --filter api typecheck` e `pnpm --filter web typecheck` OK. Sem migração e sem mudança em `packages/shared`.

---

## [2026-06-26] PRD-008 — Calendário por período + quantidade por tipo

**Motivação (relato do usuário):** *"quero poder definir no calendário período de dias e quantos posts/carrosséis/vídeos — isso me daria mais flexibilidade na escolha dos conteúdos."* O gerador trabalhava com `semanas × posts/semana` + checkboxes de tipo, amarrando a cadência a um ritmo semanal fixo e sem dizer quantas peças de cada formato.

**Decisões (travadas com o usuário):** período = **data início + data fim**; quantidades = **3 campos** (vídeos, posts/imagem única, carrosséis), total = soma; modo antigo **substituído totalmente** (sem semanas/posts-por-semana e sem checkboxes).

### Shared (`packages/shared`)
- `GenerateCalendarInputSchema` reescrito: `startDate` + `endDate` + `videoCount`/`postCount`/`carrosselCount` (`.min(0).max(60)`, default 0) + refines (total ≥1, total ≤60, fim ≥ início). Removidos `weeks`/`postsPerWeek`/`contentTypes`. `AICalendarItemSchema` mantido (campo `week` deixou de ser usado no planejamento).

### Backend (`apps/api`)
- **Prisma**: `EditorialCalendar` ganhou `endDate`/`videoCount`/`postCount`/`carrosselCount` e `weeks`/`postsPerWeek` viraram opcionais. Migration aditiva/idempotente `20260626000100_calendar_period` (add columns + drop NOT NULL).
- **`ai.service.generateCalendar`**: prompt usa `total = videoCount+postCount+carrosselCount` e o nº de dias do período; pede exatamente N vídeos / M posts (IMAGEM_UNICA) / K carrosséis (CARROSSEL), distribuídos no período, narrativa conectada e mix-alvo. JSON de saída sem `week`.
- **`calendar.service`**: `planDates` agora distribui uniformemente no intervalo `[startDate, endDate]` (`offset = round(i*spanDays/(total-1))`), preservando a ordem da IA; `generateAndSave` grava o período + contagens (fallback de `contentType` = VIDEO). `sendItemToPipeline`/`autoProduceCalendar` inalterados.

### Frontend (`apps/web`)
- `useCalendar`: `CalendarDetail`/`CalendarSummary` com `endDate`/`videoCount`/`postCount`/`carrosselCount`; `weeks`/`postsPerWeek` removidos.
- `CalendarPage`: form com **Início + Fim** e 3 campos numéricos **Vídeos/Posts/Carrosséis** (removidos semanas, posts/sem e checkboxes); validação de período e teto de 60; total exibido = soma. Detalhe agrupa "Semana N" derivada do período (a partir do `scheduledFor` × `startDate`); lista mostra total + intervalo de datas.

### Estado atual
- Calendário definido por período de datas + quantidade explícita por formato; a IA gera exatamente a composição pedida, conectada e dentro do mix. Auto-produção e envio ao pipeline inalterados; gates do `PipelineService` intactos. Sem `OPENAI_API_KEY` → fallback claro.
- `pnpm -r typecheck` OK nos 3 pacotes; `vite build` do web OK; `prisma generate` OK; `shared` rebuildado. Migration criada (aplicar com `prisma migrate deploy`).

---

## [2026-06-29] PRD-009 — Vídeos de anúncio no calendário + criativo Meta Ads

**Motivação (relato do usuário):** *"dentro do calendário, permitir colocar vídeos específicos para anúncio; a IA faz uma copy diferenciada focada em anúncio e dá insights de edição específica para anúncio — vídeos do sistema, músicas, efeitos, tom de voz etc., tudo focado em conversão no Facebook/Meta Ads."*

**Decisões (travadas com o usuário):** marcação **só no calendário** (o card herda `isAd` ao ir pro pipeline); gerador ganha um **4º campo "Vídeos de anúncio"** (+ toggle por item); o criativo de anúncio **substitui** o orgânico (gera só a versão de Ads).

### Shared (`packages/shared`)
- `CreateCardSchema`/`UpdateCardSchema`: `isAd` opcional. `GenerateCalendarInputSchema`: `adVideoCount` (0–60, default 0; total/refines incluem o bucket). `AICalendarItemSchema`: `isAd` via novo `BooleanLoose` (tolera "true"/"sim"/1). Novo `AIAdCreativeOutputSchema` (roteiro de conversão + copy de resposta direta `primaryText`/`headline`/`description`/`ctaButton`/`copyVariations` + direção de edição: `hook` 3s, `shotList`, `systemAssets`, `music`, `soundEffects`, `voiceTone`, `editingInsights`, `conversionTips`) + `AIAdCreativeInputSchema` e tipos. `dist` rebuildado.

### Backend (`apps/api`)
- **Prisma**: `Card.isAd`/`Card.adPlan Json?`, `EditorialCalendarItem.isAd`, `EditorialCalendar.adVideoCount`. Migration aditiva/idempotente `20260629000000_ad_creative`.
- **`ai.service`**: `META_ADS_CONTEXT` (tráfego frio/resposta direta). Nova `adCreative()` (diretor de performance + copywriter de resposta direta) e `persistAdCreative()` — preenche Script/CopyContent/CreativeDirection (gates passam) + grava o plano completo em `Card.adPlan`. `autoProduceCard` ramifica em `isAd` (gera o criativo de anúncio no lugar de copy+direction). `persistStageFromSource` roteia ROTEIRO/COPY/DIRECAO para o criativo de anúncio quando `isAd`. `generateCalendar` inclui `adVideoCount` no total e pede N vídeos com `isAd:true` focados em conversão. `summarizeResultForChat` ganhou o caso `adCreative`.
- **`calendar.service`**: propaga `isAd` por item, grava `adVideoCount`, herda `isAd` no card (send + auto-produce). Novo `setItemAd()`.
- **Rotas**: `PATCH /calendars/:id/items/:itemId` (`{isAd}`, perm. `createCard`) e `POST /ai/ad-creative` (503 sem chave / 502 falha; emite `card.updated`).
- **`deliverable.service`**: o pacote VÍDEO ganha `isAd`+`ad` (lê `Card.adPlan`); Markdown ganha seção "📣 Criativo de anúncio (Meta Ads)".

### Frontend (`apps/web`)
- `useCalendar`: `CalendarItem.isAd`, `adVideoCount` em detail/summary, input `adVideoCount`, novo `useSetItemAd`. `CalendarPage`: 4º campo "📣 Vídeos de anúncio" (total inclui o bucket), badge "📣 Anúncio" + toggle marcar/desmarcar no item. `useDeliverable`: `AdCreativePlan` + `isAd`/`ad` no VÍDEO. `FinalPackageView`: bloco "📣 Criativo de anúncio (Meta Ads)" no topo. `CardDetail`: badge de anúncio no header.

### Estado atual
- No calendário dá para definir N vídeos de anúncio (e marcar/desmarcar itens). Cada card de anúncio recebe copy de conversão + direção de edição p/ Meta Ads (vídeos do sistema, trilha, efeitos, tom de voz, dicas de conversão) no lugar do criativo orgânico, avançando pelos mesmos gates até PRONTO_PARA_GRAVAR. Pipeline e `PipelineService` **inalterados**. Sem `OPENAI_API_KEY` → fallback claro.
- `pnpm -r typecheck` OK nos 3 pacotes; `vite build` do web OK; `prisma generate` OK; `shared` rebuildado. Migration criada (aplicar com `prisma migrate deploy`).

### Próximos passos sugeridos
- Acervo real de "vídeos do sistema" (biblioteca de assets) para a IA referenciar de fato.
- Botão de regenerar criativo de anúncio direto no CardDetail (endpoint `POST /ai/ad-creative` já existe).
- Integração com a API do Meta para exportar/subir o criativo.

---

## [2026-06-29] PRD-010 — Memória de conteúdo + avaliação por estrelas + fix da composição do anúncio

**Motivação (relato do usuário):** (1) a IA **repetia ideias/títulos** entre gerações; (2) faltava um **sinal de qualidade** (estrelas) para a IA se aprimorar; (3) bug: ao pedir 3 vídeos de anúncio, vinham 4.

**Decisões (travadas com o usuário):** estrelas **no card** (peça final); memória anti-repetição = **só títulos**; realimentação da nota = **modelos (4–5★) + evitar (1–2★)**.

### Fix — composição do calendário determinística
- `calendar.service.reconcileComposition(items, input)`: depois da geração, garante **exatamente** `input.adVideoCount` itens marcados como anúncio (re-rotula sem perder a narrativa; anúncio é sempre VÍDEO, sem staticFormat). Chamado em `generateAndSave` antes de `planDates`. Resolve o "pedi 3, vieram 4".

### Shared (`packages/shared`)
- `UpdateCardSchema`: `rating` (1–5, nullable, opcional). `dist` rebuildado.

### Backend (`apps/api`)
- **Prisma**: `Card.rating Int?`. Migration aditiva/idempotente `20260629000100_card_rating`.
- **`ai.service`**: novo `buildIdeaMemory()` — títulos recentes (cards + itens de calendário, dedup, cap 80) como "JÁ USADO — não repita" + cards `rating>=4` como "modelos (siga)" + `rating<=2` como "evite", tudo como DADO. Helper `memoryBlock()` injeta no user prompt de `generateCalendar`, `prospect` e `structure` (geração de ideias). Sem histórico → bloco vazio (comportamento inalterado). Prompt do calendário reforça títulos únicos.
- **Rota**: `PATCH /cards/:id` já repassa `UpdateCardSchema` ao Prisma → `rating` persiste sem novo handler.

### Frontend (`apps/web`)
- `CardDetail.tsx`: componente **`StarRating`** no header (1–5; clicar na estrela marcada limpa a nota) via `updateCard.mutate({ rating })`.

### Estado atual
- Geração de ideias passa a evitar repetição (memória de títulos) e a aprender com as notas (4–5★ viram referência, 1–2★ viram "evite"). Estrelas no card persistem e realimentam a IA. Quantidade de anúncios agora é exata. Pipeline/`PipelineService` **inalterados**. Sem `OPENAI_API_KEY` → memória só compõe prompt; comportamento inalterado.
- `pnpm -r typecheck` OK nos 3 pacotes; `vite build` do web OK; `prisma generate` OK; `shared` rebuildado. Migrations criadas (aplicar com `prisma migrate deploy`).

### Próximos passos sugeridos
- Memória opcional de roteiro/legenda completos (hoje só títulos, por decisão).
- Dashboard de notas (médias por pilar/formato) para enxergar o que funciona.

---

## [2026-06-29] Fix: composição exata do calendário + anúncio sempre apresentador (não animação)

Ajustes pós-uso real (sem novo PRD), sobre PRD-009/PRD-010.

### Problemas relatados
1. **Composição ignorada:** ao pedir N posts/carrosséis, o calendário vinha quase só com vídeos (a `reconcileComposition` só forçava a contagem de anúncios).
2. **Anúncio virava animação:** os vídeos de anúncio devem ser SEMPRE o **apresentador falando à câmera**, no máximo inserindo gravações de tela do sistema ou pequenas animações — nunca vídeo 100% animado.

### Correções (`apps/api`)
- **`calendar.service.reconcileComposition`** reescrita: agora garante DETERMINISTICAMENTE a composição completa (anúncios + vídeos + posts/IMAGEM_UNICA + carrosséis). Mantém o tipo escolhido pela IA quando há vaga, realoca o excedente aos tipos faltantes (ordem fixa), preserva a ordem (narrativa) e descarta itens além do total pedido. Helpers `kindOf`/`applyKind` (`Kind`). Anúncio sempre VÍDEO + `format` PESSOA_FALANDO.
- **`ai.service`**: `META_ADS_CONTEXT` ganhou "FORMATO OBRIGATÓRIO" — anúncio é sempre apresentador (UGC/talking-head), inserindo no máximo gravações de tela do sistema/prints/pequenas animações sobre a fala; "vídeos do sistema" = screen recordings do produto, não animações de banco. `adCreative` fixa `format` PESSOA_FALANDO e a decupagem em apresentador à câmera + inserts de tela. `persistAdCreative` força `format` PESSOA_FALANDO. `generateCalendar` reforça o bucket de anúncio como PESSOA_FALANDO.

`pnpm --filter api typecheck` OK. Sem migração e sem mudança de frontend.

---

## [2026-07-10] PRD-011 — Pipeline enxuto (18→9) + formato no dashboard + visualização de calendário

**Motivação (relato do usuário):** (1) mostrar o **formato da publicação no dashboard**; (2) criar uma **visualização de calendário**; (3) **excluir/mesclar etapas** do pipeline: Sinais do Mercado (excluir); Direção Criativa e Copy/Legenda/CTA (juntar com Roteiro); Gravado, Agendado, Em Distribuição, Análise, Escalar/Reciclar, Arquivado (excluir como coluna).

**Decisões (travadas na análise):** os valores do enum `Stage` são **mantidos no banco** (sem migração destrutiva; arquivar continua marcando `stage=ARQUIVADO`+`archivedAt`); o pipeline **ativo** passa a ser dirigido por um `STAGE_ORDER` de **9 etapas**; **Roteiro** absorve direção + copy (gate e geração de IA cobrem os três); a visualização de calendário é uma **grade mensal** dos itens datados do calendário editorial.

### Novo pipeline (9 etapas)
Ideias Brutas → Ideias Validadas → Ângulo Definido → Hooks em Teste → **Roteiro (roteiro+direção+copy)** → Pronto para Gravar → Em Edição → Revisão de Retenção → Publicado.

### Shared (`packages/shared`)
- `enums.ts`: `STAGE_ORDER` reduzido a 9 etapas; `CONVERSATIONAL_STAGES` = `[IDEIAS_BRUTAS, IDEIAS_VALIDADAS, ANGULO_DEFINIDO, HOOKS_EM_TESTE, ROTEIRO]`; `STAGE_GOAL[ROTEIRO]` reescrito (roteiro+direção+copy). Enum `Stage` mantém os 18 valores (compat). `constants.ts`: rótulo de `ROTEIRO` = "Roteiro & Copy". `dist` rebuildado.

### Backend (`apps/api`)
- **Prisma**: `Card.stage` default `SINAIS_MERCADO → IDEIAS_BRUTAS`. Migration `20260710000000_lean_pipeline` (idempotente): altera o default e **realoca** cards presos em etapas removidas para a etapa ativa mais próxima (SINAIS→IDEIAS_BRUTAS, DIRECAO→ROTEIRO, COPY→REVISAO_RETENCAO, GRAVADO→EM_EDICAO, AGENDADO/DISTRIBUICAO/ANALISE/RECICLAR→PUBLICADO; ARQUIVADO intacto).
- **`pipeline.service.ts`**: `checkPreconditions` reescrito para as novas adjacências. Gate **ROTEIRO→PRONTO_PARA_GRAVAR** funde os antigos (roteiro 5 seções + `creative.format` + `copy.caption`/CTA). **PRONTO→EM_EDICAO** = checklist pré-produção. **REVISAO_RETENCAO→PUBLICADO** = retenção aprovada. Mantido: `→ARQUIVADO` sempre; sem pular etapas.
- **`ai.service.ts`**: geração/consolidação da fase `ROTEIRO` passa a produzir também a **direção criativa** (`direction`+`persistDirection`) além de roteiro+copy. Auto-produção do calendário inalterada (com `STAGE_ORDER` menor, para em PRONTO_PARA_GRAVAR).
- **`seed.ts`**: removido o template de checklist da etapa removida `EM_DISTRIBUICAO`.

### Frontend (`apps/web`)
- **Dashboard**: `CardSummary` ganhou `contentType`/`staticFormat`/`isAd` (já retornados pelo `GET /board`); `KanbanCard` mostra selo de formato (**Reel** / **Imagem única** / **Carrossel**) + `📣 Anúncio`. Helper `publicationFormatLabel` em `labels.ts`.
- **`CardDetail`**: `STAGE_META` reescrito (Roteiro/Pronto/Em Edição/Retenção/Publicado); `StagePanel` da etapa Roteiro agrupa **Roteiro + Direção criativa + Copy** (novo `StageSection`); Em Edição ganhou campo opcional de captação bruta; Publicado é o fim do fluxo.
- **`CreateCardModal`**: estágio inicial `IDEIAS_BRUTAS` (opções: Ideias Brutas/Validadas); removida a captura de sinal.
- **`CalendarPage`**: no detalhe do calendário, alternância **📅 Calendário ↔ ☰ Lista**; nova `CalendarMonthView` (grade mensal 7 colunas, navegação de mês, peça no dia do `scheduledFor` com cor de pilar, selo de formato, `📣` e `✓` quando já no pipeline).

### Estado atual
- Board com 9 colunas e formato visível em cada card; card evolui Ideias Brutas → … → Publicado pelos novos gates; auto-produção do calendário leva até Pronto para Gravar; calendário editorial tem visão de grade mensal. Arquivar segue funcionando. `PipelineService` continua sendo o único ponto de gate.
- `pnpm --filter api typecheck`, `pnpm --filter web typecheck` e `vite build` do web OK; `prisma generate` OK; `dist` do shared rebuildado. Migration criada (aplicar com `prisma migrate deploy`).

---

## [2026-07-13] PRD-012 — Roteiros no modelo de negócio (white label / receita recorrente)

**Motivação (relato do usuário):** *"os roteiros que o sistema cria estão muito genéricos, falando de CRM e coisas básicas; precisam abordar o modelo de negócio da empresa — white label, nova opção de faturamento, receita recorrente para empresas."* O usuário forneceu o texto integral da landing page como fonte do posicionamento e perguntou se valia trocar o modelo de IA.

**Diagnóstico (a causa é contexto, não modelo):** (1) o `CompanyProfile` **nunca foi semeado** — o `seed.ts` só criava o `AppSetting` — então `buildCompanyContext()` voltava vazio e a IA gerava sem nenhum dado do modelo white label; (2) o `GOLDEN_RULE_PROMPT` mirava "dono de agência que recebe leads e converte pouco / nunca venda o CRM", empurrando o ângulo de conversão de leads da própria agência em vez da transformação de modelo (serviço → produto/assinatura white label).

**Decisões (travadas com o usuário):** corrigir **contexto agora, modelo depois** (sem trocar o `gpt-4o-mini`); carregar a base **via script de seed** que roda no banco atual.

### Shared (`packages/shared`)
- `constants.ts`: `GOLDEN_RULE_PROMPT` reescrito para o modelo **white label / receita recorrente** — persona = dono de agência que vive só de serviço e quer recorrência; mecanismo = virar operação white label (revende plataforma própria com a marca do parceiro, Lumen nos bastidores, cobra o cliente e paga por cliente ativo → margem recorrente, vira dono de produto); proíbe tratar como "só mais um CRM" ou focar em "converter leads da própria agência"; mantém a sequência dor → falha do processo → mecanismo → Lumen e as guardas de JSON/anti-injection. `dist` rebuildado.

### Backend (`apps/api`)
- **Novo `src/prisma/company-knowledge.ts`**: `LUMEN_COMPANY_PROFILE` (tipado por `CompanyProfileInput`) — fonte única do perfil da Lumen a partir da LP: posicionamento white label, oferta (80+ features por objetivo: vender mais / reter / valor percebido / operar como SaaS + receita por assinatura), personas (dono de agência de serviço + **anti-persona** "não é público"), dores, tom de voz, diferenciais (implantação/marca/suporte vs. ferramenta barata), provas (+300 / +8k / +R$400k com ressalva), do's/don'ts, palavras-chave, contatos.
- **Novo `src/prisma/seed-knowledge.ts`** (standalone, idempotente — o script que o usuário roda): upsert do `CompanyProfile` singleton + upsert do `AppSetting.goldenRulePrompt` para a nova Regra de Ouro (o valor em uso vem do `AppSetting`, não da constante). `create` do `AppSetting` traz os defaults obrigatórios (mix/pillarGroup/weekly).
- **`seed.ts`**: importa `LUMEN_COMPANY_PROFILE` e faz upsert do `CompanyProfile` (instalações novas); `AppSetting` passou a **refrescar** `goldenRulePrompt` no `update` (antes `{}`).
- **`package.json`**: novo script `db:seed:knowledge`.
- Sem mudança em `ai.service`/provider/rotas/`pipeline.service`/schema/migrations — a base já é injetada por `buildCompanyContext()`.

### Frontend (`apps/web`)
- Sem mudança de código — a tela `/empresa` (`CompanyProfilePage`) passa a exibir o perfil populado e continua editável.

### Estado atual
- Após rodar `pnpm --filter api db:seed:knowledge`, a Base da Empresa fica preenchida com o modelo white label e a Regra de Ouro em uso reflete o novo enquadramento; novas gerações (ideia/roteiro/calendário/anúncio) passam a abordar white label, marca própria, margem recorrente e as provas, em vez de "CRM genérico". Pipeline, gates e schema **inalterados**; sem migração.
- `pnpm --filter @content-engine/shared build`, `pnpm --filter api typecheck` e `pnpm --filter web typecheck` OK. **Execução do seed + geração real são verificação de deploy** (dependem de Postgres e `OPENAI_API_KEY`, indisponíveis no ambiente de desenvolvimento).

### Próximos passos sugeridos
- Após reavaliar os roteiros, decidir se sobe o modelo das gerações criativas (roteiro/copy, anúncio, direção, calendário) para gpt-4o/gpt-4.1 — o provider (`AIProvider`) já aceita `model` por chamada; bastaria o `AI_DEFAULT_MODEL` ou um override por tarefa.
- Opcional: expor a edição da Regra de Ouro (`AppSetting.goldenRulePrompt`) na UI (hoje só via seed/banco).

---

## [2026-07-13] PRD-013 — Guia de hooks nos roteiros + visão geral do calendário

**Motivação (relato do usuário):** (1) incluir na geração o conhecimento de um artigo de referência sobre **aberturas de Reels** (koko.ag) para os hooks/roteiros pararem de sair fracos; (2) ao abrir a seção Calendário, um **único calendário geral** deve abrir mostrando os eventos de **todos os calendários** juntos.

### Shared (`packages/shared`)
- `constants.ts`: nova constante **`HOOKS_GUIDE`** — destilado do artigo: 5 categorias (pergunta provocativa, choque numérico, paradoxo, promessa específica, confissão), regra dos primeiros 3s (retenção 65–80% com hook estruturado vs. 18–28% sem), comprimento 10–18 palavras, e os 3 erros a evitar (apresentação no seg. 0, contexto antes da provocação, hook genérico). Exemplos adaptados ao dono de agência. `dist` rebuildado.

### Backend (`apps/api`)
- **`ai.service.ts`**: importa `HOOKS_GUIDE` e injeta no `system` das gerações que criam abertura — `angles()` (ângulos & hooks), `adCreative()` (hook de 3s do anúncio) e `generateCalendar()` (os títulos funcionam como hook). Os user prompts pedem para aplicar/variar as 5 categorias e respeitar o comprimento. `copy`/`direction` inalterados (consomem hooks, não os criam).
- **`calendar.service.ts`**: nova `listAllItems()` — todos os `EditorialCalendarItem` ordenados por `scheduledFor`, com `include: { calendar: { id, title } }`.
- **`routes/calendar.ts`**: `GET /calendars/items/all` (perm. `viewBoard`) — caminho de 3 segmentos, sem conflito com `/calendars/:id`.
- Sem mudança de schema/migration/pipeline/gates.

### Frontend (`apps/web`)
- **`hooks/useCalendar.ts`**: tipo `AllCalendarItem` (item + `calendar {id,title}`) e `useAllCalendarItems()` (`['calendar-items-all']`). As mutations (`generate`/`delete`/`send`/`setItemAd`/`autoProduce`) passam a invalidar também `['calendar-items-all']`.
- **`CalendarPage.tsx`**: `CalendarMonthView` generalizado (`startDate` opcional → default hoje; itens podem trazer `calendar.title` no tooltip). Novo `GeneralCalendarView` (grade mensal dos itens de todos os calendários, mês inicial = evento mais próximo de hoje, read-only). A lista ganhou a entrada **"📅 Geral (todos)"**; `selectedId` inicia `null` → a seção **abre na visão geral**. Selecionar um calendário mostra o detalhe (`CalendarDetailView`) como antes; "Geral" volta à visão unificada.

### Estado atual
- Hooks/roteiros, hook do anúncio e títulos do calendário passam a seguir o guia de aberturas. O Calendário abre numa grade mensal unificada com os eventos de todos os calendários; a navegação por calendário individual (com envio ao pipeline, marcar anúncio, produzir tudo) continua igual. Pipeline, gates e schema **inalterados**; sem migração.
- `pnpm --filter @content-engine/shared build`, `pnpm --filter api typecheck`, `pnpm --filter web typecheck` e `vite build` do web OK.

---

## [2026-07-13] PRD-014 — Redesign visual "Lumen Glow"

**Motivação (relato do usuário):** *"re-crie o visual do meu sistema, hoje é bem genérico — crie algo bonito."* O tema era o dark SaaS índigo padrão, sem identidade.

**Escopo:** somente frontend/estilo (`apps/web`) — nenhuma mudança de fluxo, rota, dado, backend ou gate.

### Direção de design
Identidade **"Lumen Glow"** (Lumen = luz): fundo **aurora** (gradientes radiais índigo/violeta/ciano fixos ao viewport sobre canvas azul-noite), superfícies de **vidro** (translucidez + borda white/6% + realce interno), tipografia display (**Space Grotesk** em títulos/marca via `h1–h4 { font-display }`; Inter no corpo), **cor semântica** (acento por estágio do pipeline e barra lateral por pilar nos cards) e **luz como feedback** (gradiente brand→ai no botão primário, glows no hover/foco/drag-over).

### Mudanças
- **`tailwind.config.ts`**: `surface` re-tintada (azul-violeta profundo `#060714…#3a4070`), `brand` (índigo elétrico `#6d6af8`), ramp `ai` (violeta) e novo acento `glow` (ciano); `fontFamily.display`; sombras `card`/`card-hover`/`glow`/`glow-ai`/`inner-top`; keyframes `fade-up`/`aurora` (+`aurora-slow`).
- **`index.css`**: aurora no `body` (3 radial-gradients, `background-attachment: fixed`); `h1–h4` em display; `::selection`; scrollbar 8px com hover brand. Classes: `.surface-card` (vidro), `.glass-overlay` (backdrop de modais), `.btn-primary` (gradiente + glow + `active:scale`), `.btn-ai` (glow violeta), `.btn-ghost`, `.input-base` (foco com anel luminoso), `.badge` (`ring-inset` + `tabular-nums`), nova `.text-gradient`.
- **`index.html`**: fonte Space Grotesk (500–700).
- **`labels.ts`**: `STAGE_ACCENT` (dot + hairline por estágio das 9 etapas), `PILLAR_BORDER` (barra lateral por pilar), `publicationFormatGlyph` (▶/◻/▤).
- **`AppHeader`**: vidro com blur; logo orb gradiente com glow; "Content *Engine*" em display + text-gradient; navegação em pílulas (container `rounded-full`); status da IA com **dot pulsante** (ciano ativo); avatar-inicial com anel gradiente.
- **`Login`**: 3 blobs aurora animados (`animate-aurora`), card de vidro `animate-fade-up`, título display.
- **`Board`**: root sem fundo chapado (aurora do body aparece); toolbar de vidro; contagem de cards em chip; toast de gate com glow rosa.
- **`KanbanColumn`**: `rounded-2xl bg-white/2`, hairline gradiente + dot na cor do estágio, contador em display tabular, estado vazio tracejado que vira "solte aqui" no drag-over, halo brand no `isOver`.
- **`KanbanCard`**: borda esquerda 3px na cor do pilar, hover eleva (`-translate-y-0.5` + `shadow-card-hover`), glyph de formato, avatar com anel, dragging `rotate-2 shadow-glow`.
- **`CardDetail`** (shell): overlay `.glass-overlay`, drawer `bg-surface-900/95 backdrop-blur-xl`, rodapé de avanço com blur. **`CreateCardModal`**: overlay de vidro + `fade-up`.
- **`CalendarPage`/`CompanyProfilePage`**: roots transparentes; células do mês (hoje com anel brand, vazias `white/1.5%`); seleção da lista de calendários com `bg-brand-500/10`.

### Estado
- Sem mudança funcional: mesmas rotas, ações e gates; `PipelineService` intacto.
- `pnpm --filter web typecheck` e `vite build` OK (CSS 40 kB gzip 7.3 kB). Deploy = rebuild só do `web`.

---

## [2026-07-15] PRD-015 — Diretrizes de Marketing LumenCRM na geração de conteúdo

**Motivação (relato do usuário):** o usuário entregou o documento oficial **"Diretrizes de Marketing — LumenCRM"** (v1.0, consultoria de Everton Rosa, 14/07/2026) e pediu para *"implementar isso no sistema, para os roteiros, copys etc. prompts e tudo mais."* O próprio documento declara que sua função é ser a fonte única de verdade e **"alimentar e treinar a IA interna de marketing (sistema criado pelo João)"** — este Content Engine.

**Reconciliação com PRD-012:** as Diretrizes **evoluem** o posicionamento (não contradizem) — white label e receita recorrente seguem como substância; muda o enquadramento de venda: **produto real = processo comercial completo com IA** (IA que atende e agenda no WhatsApp + CRM que move o lead sozinho + follow-up automatizado + disparos + ligação com IA + e-mail); **porta de entrada = IA de atendimento white label** (o hype); **CRM = sustentação, nunca gancho**; dor central = o cliente da agência não converte → cancela → **LTV baixo/churn alto**; lógica econômica (R$1.500 tráfego → R$1.000+/mês processo comercial). Onde cada parte mora: posicionamento → `GOLDEN_RULE_PROMPT`; dados de marketing (ICP, dores, pilares, tom, provas, do's/don'ts, vocabulário) → `CompanyProfile` (editável em `/empresa`, semeado); instruções de "como escrever/produzir" → novas constantes-guia.

### Shared (`packages/shared`)
- `constants.ts`: **`GOLDEN_RULE_PROMPT` reescrito** para o posicionamento das Diretrizes (processo comercial com IA como produto real, IA de atendimento como porta de entrada, CRM como sustentação, dor "o cliente não vende → cancela → LTV baixo", lógica econômica, sequência dor → falha do processo → mecanismo → LumenCRM; mantém guardas de JSON/anti-injection). Novas constantes **`BRAND_VOICE_GUIDE`** (tom de voz §9 + o que NÃO falar §8 + vocabulário usa/evita) e **`CREATIVE_STRUCTURE_GUIDE`** (estrutura gancho 0–3s → desenvolvimento → prova → CTA + o que performa: tela do sistema/faturamento/vídeo falado dinâmico). `dist` rebuildado.

### Backend (`apps/api`)
- **`src/prisma/company-knowledge.ts`**: `LUMEN_COMPANY_PROFILE` reescrito a partir do documento — `companyName` `LumenCRM`; `about` (saída p/ o dono de agência, IA de atendimento como gancho, CRM sustentação); `offerings` (funil completo + as 4 mensagens centrais/pilares + lógica econômica + Instagram); `personas` (ICP primário/secundário/terciário perfil Everton + anti-persona); `mainPains` (mapa de dores negócio→operacional→emocional + desejos); `toneOfVoice` (6 atributos); `differentiators` (funil inteiro vs. GPT solto, a tela vende); `proofCases` (fechamento via follow-up automático, IA agendou às 20h, ~R$10k/mês do mentor, +300/+8k/+R$400k — com ressalva honesta); `dos`/`donts` (§7/§8/§9); `keywords` (vocabulário aprovado). Respeita os limites do `CompanyProfileSchema`.
- **`src/services/ai.service.ts`**: importa `BRAND_VOICE_GUIDE`/`CREATIVE_STRUCTURE_GUIDE` e injeta por função (matriz da SPEC): `BRAND_VOICE_GUIDE` em `prospect`, `structure`, `improveIdea`, `angles`, `copy`, `direction`, `adCreative`, `recycle`, `generateCalendar`; `CREATIVE_STRUCTURE_GUIDE` em `copy`, `direction`, `adCreative`. `validate` fica enxuta (só pontua). O user prompt de `copy` passou a explicitar que o roteiro (dor/quebra/mecanismo/beneficio/cta) É a estrutura gancho → desenvolvimento → prova (tela do sistema/número) → CTA de agendar call.
- **Sem alteração** em `seed.ts`/`seed-knowledge.ts` (já propagam `GOLDEN_RULE_PROMPT` e `LUMEN_COMPANY_PROFILE` por upsert), rotas, provider, `pipeline.service`, `calendar.service`, schema ou migrations.

### Frontend (`apps/web`)
- Sem mudança de código — a tela `/empresa` (`CompanyProfilePage`) exibe o perfil enriquecido, editável por ADMIN/GESTOR.

### Estado atual
- Toda geração (ideia, ângulos/hooks, roteiro/copy, direção, anúncio, calendário) passa a seguir as Diretrizes: liderar pela IA de atendimento white label / processo comercial com IA, usar o vocabulário aprovado e evitar o proibido ("chatbot", "revolucione", "otimize seu atendimento"), não liderar com "CRM", estruturar o criativo com gancho forte nos 3 primeiros segundos → prova na tela do sistema → CTA de call, falar com a agência (não o empresário final), sem guerra de preço. Pipeline, gates (`PipelineService`) e schema **inalterados**; sem migração.
- `pnpm --filter @content-engine/shared build`, `pnpm --filter api typecheck` e `pnpm --filter web typecheck` OK. **Deploy:** rebuild dos containers + rodar `pnpm --filter api db:seed:knowledge` (a Regra de Ouro em uso vem do `AppSetting`, não da constante). Geração real com `OPENAI_API_KEY` é verificação de deploy.

### Próximos passos sugeridos
- Expor a edição da Regra de Ouro (`AppSetting.goldenRulePrompt`) e das constantes-guia na UI (hoje via seed/código).
- Implementar as partes operacionais do documento que ficaram fora do escopo de geração: estrutura de campanhas de tráfego em camadas, métricas por camada, checklist de produção audiovisual.
- Reavaliar se vale subir o modelo das gerações criativas (roteiro/anúncio/direção/calendário) de `gpt-4o-mini` para gpt-4o/4.1 agora que o contexto está muito mais rico.

---

*Atualize este arquivo ao concluir cada feature. Use o formato `[YYYY-MM-DD] Nome da fase/feature` como cabeçalho de seção.*




# Por que a Lumen é a parceira que você precisa?

**Tipo:** Estático (post/carrossel)

**Formato:** PESSOA FALANDO

## Legenda
Transforme seu modelo de negócios e crie uma nova receita previsível com a Lumen. Não fique preso ao serviço!

## CTAs
- Entre em contato e descubra mais!
- Vamos conversar sobre como mudar seu jogo?
- Agende uma demonstração agora mesmo!
