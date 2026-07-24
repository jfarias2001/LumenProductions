-- BOARD V2 + prompts editáveis (PRD-017 / SPEC-017). Aditiva e idempotente.

-- Enum das colunas do BOARD V2.
DO $$ BEGIN
    CREATE TYPE "V2Stage" AS ENUM ('RASCUNHO', 'COPY_PRONTA', 'APROVADO', 'PUBLICADO', 'ARQUIVADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Guias editáveis no AppSetting (vazio = usa o padrão do código).
ALTER TABLE "AppSetting" ADD COLUMN IF NOT EXISTS "brandVoiceGuide" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AppSetting" ADD COLUMN IF NOT EXISTS "creativeStructureGuide" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AppSetting" ADD COLUMN IF NOT EXISTS "hooksGuide" TEXT NOT NULL DEFAULT '';

-- Card do BOARD V2.
CREATE TABLE IF NOT EXISTS "V2Card" (
    "id" TEXT NOT NULL,
    "stage" "V2Stage" NOT NULL DEFAULT 'COPY_PRONTA',
    "idea" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "focus" TEXT NOT NULL DEFAULT '',
    "copy" TEXT NOT NULL DEFAULT '',
    "ctas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customPromptId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "V2Card_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "V2Card_stage_idx" ON "V2Card"("stage");

-- Prompt personalizado reutilizável.
CREATE TABLE IF NOT EXISTS "CustomPrompt" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomPrompt_pkey" PRIMARY KEY ("id")
);
