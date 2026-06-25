# SPEC-006 — Direção criativa rica gerada por IA

Implementa o PRD-006.

## 1. Shared (`packages/shared/src/schemas.ts`)
- `TypographySchema` `{ headingFont, bodyFont, notes }`.
- `GraphicElementSchema` (estático): `{ slide, headline, body, visual, layout, font, fontSize, colors }`.
- `ShotSchema` (vídeo): `{ scene, durationSec, visual, screenText, voiceover }`.
- `AIDirectionOutputSchema` enriquecido: `format, visualNotes, palette, typography, editingInsights, voiceTone, shotList, graphicElements`.
- `AIDirectionInputSchema` `{ cardId }`.
- Tipos exportados: `AIDirectionInput`, `GraphicElement`, `Shot`, `Typography`.

## 2. Banco (Prisma)
- `CreativeDirection.productionPlan Json?` — guarda `{ typography, voiceTone, shotList }` (estático usa `graphicElements` enriquecido).
- Migration `20260625000100_creative_production_plan` (`ADD COLUMN IF NOT EXISTS`), aplicada no boot via `prisma migrate deploy`.

## 3. Backend
- `ai.service.ts`:
  - `direction()` — prompt reescrito; instrui campos ricos adaptados ao `contentType`.
  - `persistDirection(cardId, out)` — upsert único (formato, notas, paleta, editingInsights, graphicElements, productionPlan, aiGenerated). Reutilizado pela rota e pela consolidação da conversa.
- `routes/ai.ts`: `POST /ai/direction` (guard `useAI`) → `direction()` + `persistDirection()` + `emitBoard`. 503/502 no padrão existente.
- `deliverable.service.ts`: `Deliverable` ganha `voiceTone`, `shotList`, `typography` (vídeo) e `typography` + `graphicElements` enriquecido (estático). `toMarkdown` imprime decupagem, entonação, tipografia e layout/fonte/cores por slide.

## 4. Frontend
- `hooks/useAI.ts`: `useAIDirection(cardId)`.
- `hooks/useDeliverable.ts`: tipos `GraphicElement`/`Shot`/`Typography` e `Deliverable` atualizados.
- `CardDetail.tsx` (`DirecaoTab`): botão "Gerar direção com IA" (hint por tipo) + render de decupagem, entonação, insights, elementos gráficos detalhados, tipografia e paleta. Edição manual de formato/notas preservada.
- `FinalPackageView.tsx`: renderiza os mesmos blocos ricos + `TypographySection`.

## 5. Validação
- `pnpm --filter @content-engine/shared build` OK; `prisma generate` OK; `tsc --noEmit` OK em api e web.
