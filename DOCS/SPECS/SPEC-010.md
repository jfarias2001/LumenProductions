# SPEC-010 — Memória de conteúdo + avaliação por estrelas

Tradução técnica do PRD-010. Aditivo; pipeline e `PipelineService` intactos.

## 1. `packages/shared`
- `UpdateCardSchema`: novo `rating: z.number().int().min(1).max(5).nullable().optional()`.
- Rebuild do `dist`.

## 2. Prisma (`apps/api`)
- `Card.rating Int?`. Migration aditiva/idempotente `20260629000100_card_rating` (`ADD COLUMN IF NOT EXISTS "rating" INTEGER`).

## 3. Backend — `ai.service.ts`
- Novo **`buildIdeaMemory()`**: consulta
  - títulos recentes (`Card` + `EditorialCalendarItem`, ~60 cada, dedup, cap 80) → "Títulos já usados — NÃO repita";
  - cards `rating >= 4` (até 10) → "Modelos (4–5★) — siga o padrão";
  - cards `rating <= 2` (até 10) → "Evite (1–2★)".
  Retorna string (vazia se não houver nada). Trata tudo como DADO.
- Injeção via `dataBlock('Memória de conteúdo …', memory)` no **user prompt** de:
  - `generateCalendar` (principal);
  - `prospect`;
  - `structure` (estruturação da ideia bruta / IDEIAS_BRUTAS).
  Default sem dados → bloco vazio → comportamento idêntico ao atual.

## 4. Backend — bug de composição (já aplicado)
- `calendar.service.reconcileComposition(items, input)`: garante exatamente `input.adVideoCount` itens `isAd` (re-rotula sem perder narrativa; anúncio é sempre VÍDEO). Chamado em `generateAndSave` antes de `planDates`.

## 5. Backend — rota
- `PATCH /cards/:id` já repassa `UpdateCardSchema` ao Prisma → `rating` persiste sem novo handler.

## 6. Frontend (`apps/web`)
- `CardDetail.tsx`: componente **`StarRating`** no header (5 estrelas, clique grava `rating`; clicar na estrela já marcada limpa = `null`), via `updateCard.mutate({ rating })`.
- Tipo do card no front exibe `rating` (acesso tolerante `(card as { rating?: number }).rating`).

## 7. Não-objetivos
- Sem dashboard/relatório de notas (v1 só captura + realimenta a IA).
- Memória cobre **títulos** (decisão do usuário), não roteiro/legenda completos.
