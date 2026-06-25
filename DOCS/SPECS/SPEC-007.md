# SPEC-007 — Conteúdo nativo de Instagram + Auto-produção do calendário

Implementa o PRD-007. Aditivo: pipeline de 18 estágios e gates (`PipelineService`) **inalterados**.

## 1. Shared (`packages/shared`)

### 1.1 Enum `StaticFormat`
```ts
export enum StaticFormat {
  IMAGEM_UNICA = 'IMAGEM_UNICA',
  CARROSSEL = 'CARROSSEL',
}
```

### 1.2 Schemas
- `CreateCardSchema`/`UpdateCardSchema`: `staticFormat: z.nativeEnum(StaticFormat).optional()`.
- `AICalendarItemSchema`: `staticFormat` tolerante (`StaticFormatLoose` via `coerceEnum`), opcional.
- `GraphicElementSchema`: inalterado (já cobre 1 elemento).

## 2. Prisma + migration
- `Card.staticFormat StaticFormat?`
- `EditorialCalendarItem.staticFormat StaticFormat?`
- `enum StaticFormat { IMAGEM_UNICA CARROSSEL }`
- Migration `20260626000000_static_format` (aditiva, idempotente): cria o enum e as colunas com `IF NOT EXISTS`.

## 3. Backend — `ai.service`

### 3.1 Instagram em todas as gerações
Helper `INSTAGRAM_CONTEXT` injetado nos prompts de `direction`, `copy` e `generateCalendar`: "O conteúdo é publicado no Instagram (Reels verticais 9:16 para vídeo; feed 4:5/1:1 para imagem; carrossel até 10 cards). Produza pensando nesse contexto."

### 3.2 `direction()` — imagem única vs. carrossel
- Lê `card.staticFormat` (default `IMAGEM_UNICA` quando estático e nulo).
- **IMAGEM_UNICA:** instrui a IA a entregar **exatamente UM** `graphicElement`, descrevendo a composição da **imagem única** (headline, corpo, visual, layout, fonte, tamanho, cores). Proíbe slides/sequência.
- **CARROSSEL:** mantém o slide a slide (2–10 itens).
- **VÍDEO:** inalterado (decupagem/voiceTone/edição).

### 3.3 Auto-produção — `autoProduceCard(cardId, userId)`
Orquestrador que preenche todas as entidades criativas de um card recém-criado:
1. `validate` → `Validation` (upsert; `aiSuggested=true`, `reviewedById=null`).
2. `angles` → cria `Angle[]` e `Hook[]`; **auto-seleciona** o 1º ângulo (`selected=true`) e marca os primeiros até `MIN_HOOKS_TO_ADVANCE` hooks como `ESCOLHIDO` (prepara gates a jusante).
3. `copy` → `Script` + `CopyContent` (+ `screenTexts`). Lê ângulo selecionado + hooks escolhidos do passo 2.
4. `direction` → `CreativeDirection` (respeita `staticFormat`).
Cada chamada já registra `AIJob`. Erros propagam para o item (tratados em lote).

### 3.4 Auto-avanço — `advanceWhilePossible(cardId, userId)`
Carrega o snapshot do card e, em loop pela `STAGE_ORDER`, tenta `pipelineService.canTransition` para o próximo estágio; enquanto permitido, grava `stage` + `CardStageHistory` (fecha a anterior) e emite `card.moved`. Para no primeiro gate bloqueado (na prática, *Ideias Validadas* → *Ângulo* exige `reviewedById`). Reusa a lógica de transição do `routes/cards.ts` (extraída para um helper compartilhável).

## 4. Backend — `calendar.service`
- `sendItemToPipeline`: passa `staticFormat: item.staticFormat` ao criar o card.
- Novo `autoProduceCalendar(calendarId, userId)`:
  - Carrega itens; para cada **sem `cardId`**: cria o card (mesma criação do `sendItemToPipeline`, sem emitir `card.created` ainda), roda `autoProduceCard`, depois `advanceWhilePossible`, vincula `item.cardId` e emite `card.created`.
  - `try/catch` por item: coleta `{ itemId, error }` e continua.
  - Retorna `{ produced, skipped, failed, errors }`.

## 5. Backend — rotas (`routes/calendar.ts`)
- `POST /calendars/:id/auto-produce` (`preHandler: useAI`): chama `autoProduceCalendar`. Sem chave → 503; falha geral → 502. Retorna o resumo.

## 6. Backend — `deliverable.service`
- Inalterado estruturalmente; o estático com 1 elemento já é suportado. (Apresentação ajustada no frontend/Markdown: 1 elemento = "Imagem".)
- `toMarkdown`: rótulo "Imagem" quando há 1 elemento gráfico, "Slide N" quando ≥2.

## 7. Frontend
- `labels.ts`: `STATIC_FORMAT_LABELS` (Imagem única / Carrossel).
- `CreateCardModal`: sub-seletor **Imagem única / Carrossel** quando tipo = Estático; envia `staticFormat`.
- `CardDetail` (`DirecaoTab`) e `FinalPackageView`: rótulo do elemento gráfico = "Imagem" quando há 1, "Slide N" quando ≥2.
- `useCalendar`: `useAutoProduceCalendar(calendarId)` (invalida `calendar`+`board`); `CalendarItem.staticFormat`.
- `CalendarPage`: botão **"✦ Produzir tudo com IA"** no topo do detalhe do calendário (desabilita se IA off), com resumo do resultado (produzidos/pulados/falhas).

## 8. Não-objetivos
- Jobs assíncronos (BullMQ) para a auto-produção — segue síncrono na v1 (igual às demais gerações).
- Geração de imagem/vídeo real (continua direção textual pronta para o time produzir).
