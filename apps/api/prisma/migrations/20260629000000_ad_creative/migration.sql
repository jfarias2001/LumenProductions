-- Vídeos de anúncio no calendário + criativo Meta Ads (PRD-009 / SPEC-009).
-- Aditiva e idempotente.
ALTER TABLE "Card" ADD COLUMN IF NOT EXISTS "isAd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Card" ADD COLUMN IF NOT EXISTS "adPlan" JSONB;
ALTER TABLE "EditorialCalendarItem" ADD COLUMN IF NOT EXISTS "isAd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EditorialCalendar" ADD COLUMN IF NOT EXISTS "adVideoCount" INTEGER;
