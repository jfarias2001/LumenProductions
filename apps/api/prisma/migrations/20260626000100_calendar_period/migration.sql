-- Calendário por período + quantidade por tipo (PRD-008 / SPEC-008).
-- Substitui a cadência semanas × posts/semana por período (start/end) + contagens por tipo.
-- Aditiva e idempotente: novas colunas + afrouxa NOT NULL das colunas antigas.
ALTER TABLE "EditorialCalendar" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
ALTER TABLE "EditorialCalendar" ADD COLUMN IF NOT EXISTS "videoCount" INTEGER;
ALTER TABLE "EditorialCalendar" ADD COLUMN IF NOT EXISTS "postCount" INTEGER;
ALTER TABLE "EditorialCalendar" ADD COLUMN IF NOT EXISTS "carrosselCount" INTEGER;
ALTER TABLE "EditorialCalendar" ALTER COLUMN "weeks" DROP NOT NULL;
ALTER TABLE "EditorialCalendar" ALTER COLUMN "postsPerWeek" DROP NOT NULL;
