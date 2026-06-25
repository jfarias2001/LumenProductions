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

*Atualize este arquivo ao concluir cada feature. Use o formato `[YYYY-MM-DD] Nome da fase/feature` como cabeçalho de seção.*
