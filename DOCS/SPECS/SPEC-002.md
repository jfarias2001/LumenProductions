# SPEC-002 — Redesign do Board + Camada de IA (implementação da Fase 2)

> Especificação técnica do PRD-002. Reaproveita toda a base do SPEC-001 (modelo de dados, pipeline, RBAC). Aqui detalha-se a **camada de IA** (§9 do SPEC-001) e o **redesign do frontend**.

## 1. Camada de IA (backend)

### 1.1 Provider abstrato — `apps/api/src/lib/ai/provider.ts`
```ts
export interface AIProvider {
  generateStructured<T>(args: {
    system: string;
    user: string;
    schema: ZodSchema<T>;
    schemaName: string;
    model?: string;
    temperature?: number;
  }): Promise<{ data: T; usage: { inputTokens; outputTokens }; model: string }>;
  readonly enabled: boolean;
}
```
- `OpenAIProvider`: usa o SDK `openai` (v4). Saída estruturada via `response_format: { type: 'json_object' }` + parse/validação Zod (compatível com a versão instalada). `enabled = !!config.openaiApiKey`.
- `getAIProvider()`: singleton. Se sem chave, `enabled=false` → rotas respondem `503 AI_NOT_CONFIGURED` (fallback do PRD).

### 1.2 `AIService` — `apps/api/src/services/ai.service.ts`
Uma função por tarefa do SPEC-001 §9.3. Cada uma:
1. Carrega `goldenRulePrompt` do `AppSetting` (singleton) e o injeta no system prompt.
2. Monta o `user` prompt com os dados do card (texto colado tratado como **dado**, delimitado).
3. Chama `provider.generateStructured` com o schema de saída.
4. Cria um `AIJob` (`status=running`→`succeeded|failed`, tokens, `costEstimate`, `result`).
5. Retorna o dado validado; a rota persiste nas entidades-satélite.

Funções: `prospect`, `structure`, `validate`, `angles`, `copy`, `recycle`.

### 1.3 Schemas de saída — `packages/shared/src/schemas.ts`
Novos schemas Zod (saída): `AIProspectOutputSchema`, `AIStructureOutputSchema`, `AIValidateOutputSchema`, `AIAnglesOutputSchema`, `AICopyOutputSchema`, `AIRecycleOutputSchema`. Espelham as colunas "Saída estruturada" do SPEC-001 §9.3.

### 1.4 Rotas — `apps/api/src/routes/ai.ts`
Substituem os stubs. Guardadas por `requirePermission('useAI')`.
- `POST /ai/prospect` { signalIds } → cria N cards `IDEIAS_BRUTAS` a partir das ideias.
- `POST /ai/structure` { rawText, cardId? } → retorna campos; se `cardId`, aplica patch no card.
- `POST /ai/validate` { cardId } → upsert `Validation` com `aiSuggested=true` (NÃO seta `reviewedById`; gate continua exigindo humano).
- `POST /ai/angles` { cardId } → cria `Angle[]` + `Hook[]` (`aiGenerated=true`).
- `POST /ai/copy` { cardId } → upsert `Script` + `CopyContent` (`aiGenerated=true`).
- `POST /ai/recycle` { cardId } → cria `DerivedAsset[]` (`aiGenerated=true`).
- Emitem `card.updated`/`card.created` via Socket.io.

### 1.5 Resiliência
- Try/catch por chamada; em erro grava `AIJob.status=failed` + `error` e responde `502 AI_FAILED`. Card permanece editável manualmente.

## 2. Frontend — tema dark SaaS

### 2.1 Tokens (`tailwind.config.ts` + `index.css`)
- Paleta `surface` (900/800/700) escura, `brand` índigo (mantido), texto `slate`.
- Classes utilitárias em `@layer components`: `.btn-primary`, `.btn-ghost`, `.btn-ai`, `.input-base`, `.surface-card`, `.badge`. (Hoje `.input-base/.btn-*` são usadas mas **não existem** — serão criadas.)

### 2.2 Componentes
- `Board.tsx`: header dark com marca + usuário; **toolbar** (busca + selects de pilar/awareness/classe + botão **+ Novo Card**); colunas redesenhadas; toast de gate.
- `CreateCardModal.tsx` (novo): formulário com `react-hook-form`-free controlado simples → `POST /cards`.
- `BoardToolbar.tsx` (novo) ou inline: filtros ligados ao `useUIStore`.
- `KanbanColumn.tsx` / `KanbanCard.tsx`: superfícies dark, badges, contador, destaque de gate e de coluna-alvo no drag.
- `CardDetail.tsx`: drawer dark; cada aba com **botão de IA** (`AICopilotButton`) que chama o endpoint correspondente, mostra loading e aplica o resultado; completar abas em construção (Copy, Direção, Checklists, Retenção, Agendamento, Reciclagem) ao nível essencial.
- `hooks/useAI.ts` (novo): mutations TanStack Query para os 6 endpoints + invalidação do card/board.

### 2.3 Estados de IA na UI
- Botão de IA → spinner "Gerando…"; sucesso aplica e invalida queries; erro mostra inline "IA indisponível — preencha manualmente" (lendo `code` do erro).

## 3. Segurança
- Chave OpenAI só em env do backend. Nunca no bundle do front.
- `useAI` no RBAC já existe (SPEC-001 §12.3). Mantido.

## 4. Não implementado nesta SPEC
- Fila BullMQ assíncrona (chamadas são síncronas com `AIJob` de registro).
- OCR de prints / transcrição automática.
