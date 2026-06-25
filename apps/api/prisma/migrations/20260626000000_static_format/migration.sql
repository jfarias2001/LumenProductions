-- Conteúdo nativo de Instagram (PRD-007): distingue imagem única de carrossel no estático.
-- Aditiva e idempotente.
DO $$ BEGIN
  CREATE TYPE "StaticFormat" AS ENUM ('IMAGEM_UNICA', 'CARROSSEL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "Card" ADD COLUMN IF NOT EXISTS "staticFormat" "StaticFormat";
ALTER TABLE "EditorialCalendarItem" ADD COLUMN IF NOT EXISTS "staticFormat" "StaticFormat";
