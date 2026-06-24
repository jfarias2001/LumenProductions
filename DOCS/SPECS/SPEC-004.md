# SPEC-004 — Geração com IA por fase

> Especificação técnica do PRD-004. Reaproveita ao máximo a infraestrutura do SPEC-003 (funções estruturadas, persistência do `consolidateStage`, conversa por fase). A geração é, na prática, um "Consolidar" cuja **fonte é um contexto fornecido pelo usuário** em vez da transcrição da conversa.

## 1. Visão geral

```
[PhaseChat] —"✦ Gerar com IA" + contexto—▶ POST /cards/:id/conversations/:stage/generate
                                                   │
                                          ai.service.generateStage(cardId, stage, userId, context)
                                                   │
                          ┌────────────────────────┼─────────────────────────┐
                          ▼                        ▼                          ▼
              persistStageFromSource     appendGeneratedTurn        emitBoard('card.updated')
              (mesma lógica do            (grava 2 AIMessages na
               consolidateStage, mas       thread da fase)
               fonte = contexto)
```

## 2. Shared (`packages/shared`)

### 2.1 `schemas.ts`
- Novo `GenerateStageInputSchema = z.object({ context: z.string().max(8000).optional() })`.
- Novo tipo inferido `GenerateStageInput`.

Nenhuma mudança de enum/constante (reusa `CONVERSATIONAL_STAGES`, `STAGE_GOAL`).

## 3. Backend (`apps/api`)

### 3.1 `services/ai.service.ts`
- **Refatorar** o `switch` interno do `consolidateStage` para uma função privada `persistStageFromSource(cardId, stage, userId, source)` — recebe o **texto-fonte** e roda a função estruturada + persistência correspondente (idêntico ao que o `consolidateStage` faz hoje, com `source` no lugar de `convo`).
  - `IDEIAS_BRUTAS` → `structure(source, cardId, userId)` (source = rawText).
  - demais → função da fase com `source` no parâmetro `conversation`.
- `consolidateStage(cardId, stage, userId)`: passa a obter `transcript`, validar não-vazio e delegar a `persistStageFromSource(..., convo)` (comportamento inalterado).
- Novo `generateStage(cardId, stage, userId, context?)`:
  1. `source = (context ?? '').trim()`.
  2. Se `stage === IDEIAS_BRUTAS && !source` → lança `Error('Informe uma informação de partida para gerar a ideia.')` com `code: 'NEED_CONTEXT'`.
  3. `result = await persistStageFromSource(cardId, stage, userId, source)`.
  4. `await appendGeneratedTurn(cardId, stage, userId, context, result)` (registra na conversa).
  5. retorna `result` (mesmo shape `ConsolidateResult`).
- Novo helper `summarizeResultForChat(result): string` — texto curto e legível por entidade (reusa o mapeamento de `summaryLines` do front, no servidor) para o turno da IA.

### 3.2 `services/conversation.service.ts`
- Novo `appendGeneratedTurn(cardId, stage, userId, context, result)`:
  - `getOrCreate(cardId, stage)`.
  - cria `AIMessage role=user` com `"✦ Gerar com IA" + (context ? " — baseado em: " + context : "")`.
  - cria `AIMessage role=assistant` com o resumo de `summarizeResultForChat` (importado de `ai.service` ou passado como string já pronta para evitar ciclo de import — passamos a string pronta).
  - `touch` no `updatedAt` da conversa.
- Para evitar ciclo de import (`ai.service` ↔ `conversation.service`), `appendGeneratedTurn` recebe **o texto-resumo já pronto** (`assistantText: string`) — quem monta o resumo é `ai.service`.

### 3.3 `routes/conversations.ts`
- Novo `POST /cards/:cardId/conversations/:stage/generate` (`requirePermission('useAI')`):
  - valida `stage` (`parseStage`) e `isConversationalStage`.
  - `body = GenerateStageInputSchema.parse(request.body)`.
  - se `!getAIProvider().enabled` → 503 `AI_NOT_CONFIGURED`.
  - `result = await generateStage(cardId, stage, request.actor.sub, body.context)`.
  - `emitBoard('card.updated', { id: cardId })`; `reply.send(result)`.
  - erros via `aiError` (NEED_CONTEXT vira 502 com a mensagem; aceitável).

## 4. Frontend (`apps/web`)

### 4.1 `hooks/useConversation.ts`
- Novo `useGenerate(cardId, stage)` — `useMutation` que faz `POST /cards/:id/conversations/:stage/generate` com `{ context }`; em `onSuccess` invalida `['conversation', cardId, stage]`, `['card', cardId]`, `['deliverable', cardId]`, `['board']`.

### 4.2 `components/card/PhaseChat.tsx`
- Botão **"✦ Gerar com IA"** no cabeçalho (ao lado de "Consolidar"). Alterna um painel com:
  - `textarea` de contexto (placeholder: "Baseado em qual informação? Ex.: tema, transcrição, dado de mercado…"; em *Ideias Brutas* o label avisa que é obrigatório).
  - botão **"Gerar"** (desabilitado enquanto pendente; em *Ideias Brutas* exige contexto não-vazio).
- Reusa o painel verde de "Consolidado nos campos do card" para exibir o resumo: como a invalidação recarrega a conversa, os turnos gerados também aparecem no histórico. O `summaryLines` é reaproveitado para o resultado da geração.
- Fallback "IA indisponível" reaproveita o estado de erro existente.

## 5. Compatibilidade / migração

- **Sem migração de banco** — nenhuma mudança de schema Prisma. Reusa `AIConversation`/`AIMessage`/entidades existentes.
- Mudança em `packages/shared` exige rebuild do `dist` (como nas specs anteriores).
- Deploy: rebuild de `api` e `web`.

## 6. Testes / verificação

- `pnpm -r typecheck` nos 3 pacotes.
- `vite build` do web.
- Manual: em cada fase, gerar com/sem contexto e conferir persistência + turnos na conversa.
