# SPEC-011 — Pipeline enxuto + formato no dashboard + visualização de calendário

**PRD:** PRD-011 · **Data:** 2026-07-10

## 1. Estratégia geral

O enum `Stage` **mantém os 18 valores** (compat com o banco e com o arquivamento). O pipeline ativo passa a ser dirigido por um **`STAGE_ORDER` reduzido a 9 etapas**. As etapas removidas ficam inalcançáveis (não aparecem em board/stepper e nenhum gate leva a elas), mas continuam válidas como valor de coluna para dados legados e para `ARQUIVADO`.

## 2. `packages/shared`

### 2.1 `enums.ts`
- `STAGE_ORDER` = `[IDEIAS_BRUTAS, IDEIAS_VALIDADAS, ANGULO_DEFINIDO, HOOKS_EM_TESTE, ROTEIRO, PRONTO_PARA_GRAVAR, EM_EDICAO, REVISAO_RETENCAO, PUBLICADO]`.
- `CONVERSATIONAL_STAGES` = `[IDEIAS_BRUTAS, IDEIAS_VALIDADAS, ANGULO_DEFINIDO, HOOKS_EM_TESTE, ROTEIRO]` (Roteiro cobre direção+copy).
- `STAGE_GOAL[ROTEIRO]` reescrito para mencionar roteiro + direção + copy.
- Comentário explicando que os demais valores do enum são retidos por compat mas fora do pipeline ativo.

### 2.2 `constants.ts`
- `STAGE_LABELS` mantém todas as chaves (Record completo). Rótulo de `ROTEIRO` = "Roteiro & Copy" (comunica o merge).

> Rebuild do `dist` do shared após a mudança.

## 3. Backend (`apps/api`)

### 3.1 Prisma
- `Card.stage` default: `SINAIS_MERCADO` → **`IDEIAS_BRUTAS`**.
- Migration `20260710000000_lean_pipeline` (idempotente):
  - `ALTER TABLE "Card" ALTER COLUMN "stage" SET DEFAULT 'IDEIAS_BRUTAS';`
  - Realoca cards presos em etapas removidas (não toca em `ARQUIVADO`):
    - `SINAIS_MERCADO → IDEIAS_BRUTAS`
    - `DIRECAO_CRIATIVA → ROTEIRO`
    - `COPY_LEGENDA_CTA → REVISAO_RETENCAO`
    - `GRAVADO → EM_EDICAO`
    - `AGENDADO → PUBLICADO`
    - `EM_DISTRIBUICAO → PUBLICADO`
    - `ANALISE → PUBLICADO`
    - `ESCALAR_RECICLAR → PUBLICADO`

### 3.2 `pipeline.service.ts` — novos gates (por destino)
- `IDEIAS_VALIDADAS` (de IDEIAS_BRUTAS): título ≥ 3.
- `ANGULO_DEFINIDO` (de IDEIAS_VALIDADAS): validação `SEGUIR_ROTEIRO` **ou** `reviewedById` (override).
- `HOOKS_EM_TESTE` (de ANGULO_DEFINIDO): ≥ 1 ângulo selecionado.
- `ROTEIRO` (de HOOKS_EM_TESTE): ≥ 5 hooks e ≥ 1 `ESCOLHIDO`.
- **`PRONTO_PARA_GRAVAR` (de ROTEIRO):** roteiro com as 5 seções **+** `creative.format` definido **+** `copy.caption` e ≥ 1 `ctaVariations`. (funde os antigos gates ROTEIRO→DIRECAO, DIRECAO→PRONTO e COPY→AGENDADO).
- `EM_EDICAO` (de PRONTO_PARA_GRAVAR): checklist de PRONTO_PARA_GRAVAR completo.
- `REVISAO_RETENCAO` (de EM_EDICAO): checklist de EM_EDICAO completo **+** `editedVideoUrl`.
- **`PUBLICADO` (de REVISAO_RETENCAO):** `retentionReview.passed`.
- Mantém: `to === ARQUIVADO` sempre permitido; `from === ARQUIVADO` bloqueado; sem pular etapas.

### 3.3 `ai.service.ts`
- `persistStageFromSource` caso `ROTEIRO`/`COPY_LEGENDA_CTA`: além de `copy()` (script + legenda), passa a gerar `direction()` e persistir a direção (`persistDirection`). Card de anúncio continua roteado para `adCreative` (inalterado).
- `autoProduceCard`/`advanceWhilePossible`: sem mudança de lógica — como o `STAGE_ORDER` encurtou, a auto-produção do calendário leva o card até `PRONTO_PARA_GRAVAR` (para no gate de checklist).

### 3.4 `seed.ts`
- Remove o template de checklist da etapa removida `EM_DISTRIBUICAO` (mantém `PRONTO_PARA_GRAVAR` e `EM_EDICAO`).

### 3.5 Rotas
- Sem mudança. Board (`GET /board`) já retorna `contentType`/`staticFormat`/`isAd` (campos escalares via `include`). Arquivar (`POST /cards/:id/archive`) inalterado.

## 4. Frontend (`apps/web`)

### 4.1 Dashboard (formato da publicação)
- `hooks/useBoard.ts` `CardSummary`: `+ contentType, staticFormat, isAd`.
- `KanbanCard.tsx`: novo selo de formato — `Reel` (vídeo), `Imagem única`/`Carrossel` (estático) e `📣 Anúncio` quando `isAd`.

### 4.2 `CardDetail.tsx`
- `STAGE_META`: reescreve `ROTEIRO` (job/gate cobrindo roteiro+direção+copy), `PRONTO_PARA_GRAVAR`, `EM_EDICAO`, `REVISAO_RETENCAO` (próxima = Publicado), `PUBLICADO` (publicar manual). Chaves das etapas removidas permanecem (Record completo, inalcançáveis).
- `StagePanel`:
  - `ROTEIRO` → copiloto + `RoteiroTab` + `DirecaoTab` + `CopyTab` (com subtítulos).
  - `EM_EDICAO` → `MediaTab(rawFootageUrl, opcional)` + `MediaTab(editedVideoUrl)` + checklist.
  - `PUBLICADO` → confirmação/publicação (mantém `AgendamentoTab` como metadado opcional).

### 4.3 `CreateCardModal.tsx`
- `stage` inicial default `IDEIAS_BRUTAS`; `INITIAL_STAGES = [IDEIAS_BRUTAS, IDEIAS_VALIDADAS]`; remove o bloco de captura de sinal (não há mais etapa Sinais).

### 4.4 `CalendarPage.tsx` — visualização de calendário
- No `CalendarDetailView`, alternância **Lista ↔ Calendário**.
- Visão Calendário: **grade mensal** (7 colunas dom–sáb) com navegação de mês (‹ ›), célula por dia; cada peça no dia do seu `scheduledFor` mostrando título curto, cor de pilar, selo de formato e `📣` quando anúncio. Mês inicial = mês da `startDate` do calendário.

## 5. Validação
- `pnpm --filter api typecheck`, `pnpm --filter web typecheck`, `vite build` do web.
- `prisma generate` + migration criada (aplicar com `prisma migrate deploy`).
- Rebuild do `dist` do shared.
