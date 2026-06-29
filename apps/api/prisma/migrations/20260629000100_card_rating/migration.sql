-- Avaliação por estrelas no card (PRD-010 / SPEC-010). Aditiva e idempotente.
ALTER TABLE "Card" ADD COLUMN IF NOT EXISTS "rating" INTEGER;
