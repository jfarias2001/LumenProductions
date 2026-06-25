-- Direção criativa rica (PRD-006): plano de produção estruturado.
-- VÍDEO: { typography, voiceTone, shotList }. ESTÁTICO usa graphicElements (Json) enriquecido.
ALTER TABLE "CreativeDirection" ADD COLUMN IF NOT EXISTS "productionPlan" JSONB;
