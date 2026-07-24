# SPEC-017 — BOARD V2 + Copy Rápida + Prompts editáveis

Referência: PRD-017. Continuação do estado em `DOCS/STORY/story.md` (até PRD-016).

## 1. Shared (`packages/shared`)

- **enums.ts**: `enum V2Stage { RASCUNHO, COPY_PRONTA, APROVADO, PUBLICADO, ARQUIVADO }` + `V2_STAGE_ORDER = [RASCUNHO, COPY_PRONTA, APROVADO, PUBLICADO]`.
- **constants.ts**: `V2_STAGE_LABELS` (pt-BR). Mantém `GOLDEN_RULE_PROMPT`, `BRAND_VOICE_GUIDE`, `CREATIVE_STRUCTURE_GUIDE`, `HOOKS_GUIDE` como **fallback**.
- **schemas.ts** (novos):
  - `PromptChoiceSchema = { customPromptId?: string, customPromptText?: string(≤4000) }` (mesclado nos inputs de geração).
  - Funil: `V2IdeasInputSchema = { context?: string(≤2000) } & PromptChoice`; `V2TitlesInputSchema = { idea } & PromptChoice`; `V2FocusInputSchema = { idea, title } & PromptChoice`; `V2CopyInputSchema = { idea, title, focus } & PromptChoice`.
  - Outputs IA: `V2IdeasOutputSchema = { ideas: {idea, note?}[] (≥1) }`; `V2TitlesOutputSchema = { titles: string[] }`; `V2FocusOutputSchema = { focuses: {focus, description}[] }`; `V2CopyOutputSchema = { copy: string, ctas: string[] }`.
  - Copy rápida: `QuickCopyInputSchema = { prompt: string(1..4000) } & PromptChoice` → `V2CopyOutputSchema`.
  - Card V2: `V2CreateCardSchema = { idea, title, focus?, copy?, ctas?[], customPromptId? }`; `V2UpdateCardSchema = { stage?, title?, focus?, copy?, ctas? }`.
  - Prompts: `PromptSettingsSchema = { goldenRulePrompt?, brandVoiceGuide?, creativeStructureGuide?, hooksGuide? }` (partial, cada ≤20000); `CustomPromptSchema = { title(1..120), body(1..8000) }`, `UpdateCustomPromptSchema` (partial).

## 2. Prisma

- `enum V2Stage` (idem shared).
- `model V2Card { id, stage V2Stage @default(COPY_PRONTA), idea, title, focus String @default(""), copy String @default(""), ctas String[] @default([]), customPromptId?, createdById?, createdAt, updatedAt, @@index([stage]) }`.
- `model CustomPrompt { id, title, body, createdById?, createdAt, updatedAt }`.
- `AppSetting` +3 campos: `brandVoiceGuide String @default("")`, `creativeStructureGuide String @default("")`, `hooksGuide String @default("")`.
- **Migration** `20260721000000_board_v2_and_prompts` — idempotente: `DO $$ … CREATE TYPE "V2Stage" … EXCEPTION WHEN duplicate_object`; `CREATE TABLE IF NOT EXISTS` (V2Card, CustomPrompt); `ALTER TABLE "AppSetting" ADD COLUMN IF NOT EXISTS …`. Roda no boot (`prisma migrate deploy`).

## 3. Backend — prompts de-hardcoded

- **`src/services/promptKit.ts`** (novo): `getPromptKit(): { golden, brandVoice, creativeStructure, hooks }` — lê o `AppSetting` singleton; usa o valor do banco quando **não vazio**, senão a constante do `shared` (comportamento idêntico ao atual quando os campos estão vazios). `getPromptSettings()` (valores efetivos p/ a UI) e `updatePromptSettings(data)` (update do singleton).
- **`ai.service.ts`**: `goldenRule(kit?)` passa a aceitar o kit (evita re-leitura) e usa `kit.golden`. As funções que hoje inlinam `BRAND_VOICE_GUIDE` / `CREATIVE_STRUCTURE_GUIDE` / `HOOKS_GUIDE` (`prospect`, `structure`, `improveIdea`, `angles`, `copy`, `direction`, `adCreative`, `recycle`, `generateCalendar`) passam a obter `const kit = await getPromptKit()` e usar `kit.*`. `INSTAGRAM_CONTEXT`/`META_ADS_CONTEXT` seguem constantes locais.

## 4. Backend — funil V2 + copy rápida (IA)

Em `ai.service.ts` (reusa `run`, `goldenRule`, `getPromptKit`, `dataBlock`, `buildIdeaMemory`):
- `extraBlock(extra?)` — bloco "Instruções adicionais do usuário (siga junto com a Regra de Ouro)".
- `v2SuggestIdeas(context?, extra?, userId?)`, `v2SuggestTitles(idea, extra?, userId?)`, `v2SuggestFocus(idea, title, extra?, userId?)`, `v2ProduceCopy(idea, title, focus, extra?, userId?)`, `quickCopy(prompt, extra?, userId?)`. Cada uma injeta Regra de Ouro + guias (kit) + `extraBlock`, e registra `AIJob`.
- **`src/services/v2.service.ts`**: `resolveExtraPrompt({customPromptId?, customPromptText?})` (busca `CustomPrompt` por id e/ou concatena o texto inline) e CRUD de `V2Card`.

## 5. Backend — rotas (`/api/v1`)

- **`src/routes/v2.ts`** (novo): `POST /v2/ideas|titles|focus|copy` e `POST /v2/quick-copy` (`useAI`; 503 sem chave / 502 falha, resolvendo o extra prompt antes); `GET /v2/cards` (`viewBoard`), `POST /v2/cards` (`createCard`), `PATCH /v2/cards/:id` (`viewBoard`), `DELETE /v2/cards/:id` (`createCard`).
- **`src/routes/prompts.ts`** (novo): `GET /prompt-settings` (`viewBoard`), `PUT /prompt-settings` (`managePrompts`); `GET /custom-prompts` (`viewBoard`), `POST /custom-prompts` (`managePrompts`), `PATCH /custom-prompts/:id` (`managePrompts`), `DELETE /custom-prompts/:id` (`managePrompts`).
- Registrar ambos em `server.ts`.

## 6. Frontend (`apps/web`)

- **Nav/rotas**: `AppHeader` ganha **BOARD V2** (`/board-v2`), **Copy Rápida** (`/copy-rapida`), **Prompts** (`/prompts`). `App.tsx` registra as 3 rotas (protegidas).
- **Hooks**: `useV2.ts` (board, funil, quick copy, CRUD de card V2); `usePrompts.ts` (settings + custom prompts).
- **Labels**: `V2_STAGE_LABELS`/cores em `labels.ts`.
- **`PromptPicker.tsx`** (reutilizável): bloco recolhível "+ prompt personalizado (opcional)" — escolher um `CustomPrompt` salvo **ou** digitar na hora → devolve `{customPromptId?, customPromptText?}`. Deixa claro que soma à Regra de Ouro.
- **`BoardV2Page.tsx`**: header + toolbar com **"✦ Criar com IA"** (abre `FunnelWizard`) + Kanban das colunas V2 (dnd-kit muda `stage`) + `V2CardDetail` (drawer simples: editar título/foco/copy/CTAs, mudar coluna, excluir).
- **`FunnelWizard.tsx`**: modal de 4 passos (Ideias→Título→Foco→Copy) com `PromptPicker` no topo; cada passo chama a IA, lista as sugestões (radio/chips) e avança; passo final gera a copy e **Criar card** (`POST /v2/cards`).
- **`QuickCopyPage.tsx`**: textarea de prompt + `PromptPicker` + gerar → mostra copy + CTAs (copiar) + "salvar como card V2".
- **`PromptsPage.tsx`**: editores (textarea) da Regra de Ouro + 3 guias (salvar → `PUT /prompt-settings`; badge "usando padrão" quando vazio) + lista/CRUD de `CustomPrompt`. Edição sob `managePrompts` (ADMIN/GESTOR); leitura para todos.

## 7. Seed / compatibilidade

- `seed-knowledge.ts`/`seed.ts`: **sem alteração obrigatória** — `getPromptKit` cai nas constantes quando os campos do `AppSetting` estão vazios. (Opcional: pré-popular os guias fica fora do escopo; o fallback já cobre.)
- Sem mudança em `PipelineService`, gates, `Card` ou nas rotas existentes de card/calendário.

## 8. Verificação

- `pnpm --filter @content-engine/shared build`, `pnpm --filter api typecheck`, `pnpm --filter web typecheck`, `prisma generate`, `vite build`.
- Deploy: rebuild dos containers (migration no boot). Geração real depende de `OPENAI_API_KEY`.
- Fumaça: funil ponta a ponta cria card V2; drag muda coluna; copy rápida gera; editar Regra de Ouro/guias muda a geração; prompt personalizado soma às instruções.
