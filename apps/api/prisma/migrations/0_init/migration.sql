-- CreateEnum
CREATE TYPE "Stage" AS ENUM ('SINAIS_MERCADO', 'IDEIAS_BRUTAS', 'IDEIAS_VALIDADAS', 'ANGULO_DEFINIDO', 'HOOKS_EM_TESTE', 'ROTEIRO', 'DIRECAO_CRIATIVA', 'PRONTO_PARA_GRAVAR', 'GRAVADO', 'EM_EDICAO', 'REVISAO_RETENCAO', 'COPY_LEGENDA_CTA', 'AGENDADO', 'PUBLICADO', 'EM_DISTRIBUICAO', 'ANALISE', 'ESCALAR_RECICLAR', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "Pillar" AS ENUM ('DOR_DONO_AGENCIA', 'QUEBRA_CRENCA', 'OPORTUNIDADE_TICKET', 'PRODUTO_MECANISMO', 'PROVA_BASTIDORES', 'OBJECOES', 'AUTORIDADE');

-- CreateEnum
CREATE TYPE "AwarenessLevel" AS ENUM ('PROBLEMA', 'NOVA_PERSPECTIVA', 'IDENTIFICACAO', 'INTENCAO');

-- CreateEnum
CREATE TYPE "ContentClass" AS ENUM ('VIRAL', 'AUTORIDADE', 'VENDEDOR', 'FRACO');

-- CreateEnum
CREATE TYPE "SignalSource" AS ENUM ('WHATSAPP_LEAD', 'OBJECAO_CALL', 'COMENTARIO_INSTAGRAM', 'ANUNCIO_CONCORRENTE', 'PRINT_CONVERSA', 'RECLAMACAO_LEADS_RUINS');

-- CreateEnum
CREATE TYPE "AngleType" AS ENUM ('DOR', 'CULPA_TRANSFERIDA', 'OPORTUNIDADE', 'MEDO', 'AUTORIDADE');

-- CreateEnum
CREATE TYPE "CreativeFormat" AS ENUM ('PESSOA_FALANDO', 'PRINTS_PROCESSO', 'POV_DONO_AGENCIA', 'ANTES_DEPOIS', 'CHECKLIST', 'STORYTELLING', 'COMPARATIVO', 'TREND_ADAPTADA', 'SIMULACAO_CONVERSA', 'DEMONSTRACAO_PRODUTO');

-- CreateEnum
CREATE TYPE "DerivedAssetType" AS ENUM ('CARROSSEL', 'STORY', 'ANUNCIO', 'EMAIL', 'CORTE_SHORTS', 'POST_LINKEDIN', 'SCRIPT_SDR', 'HOOK_NOVO');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'GESTOR', 'ESTRATEGISTA', 'ROTEIRISTA', 'GRAVACAO', 'EDITOR', 'REVISOR_RETENCAO');

-- CreateEnum
CREATE TYPE "HookStatus" AS ENUM ('EM_TESTE', 'ESCOLHIDO', 'DESCARTADO');

-- CreateEnum
CREATE TYPE "ValidationVerdict" AS ENUM ('DESCARTAR', 'MELHORAR_ANGULO', 'SEGUIR_ROTEIRO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "stage" "Stage" NOT NULL DEFAULT 'SINAIS_MERCADO',
    "title" TEXT NOT NULL,
    "persona" TEXT,
    "pain" TEXT,
    "promise" TEXT,
    "awareness" "AwarenessLevel",
    "pillar" "Pillar",
    "ctaText" TEXT,
    "screenTexts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "primaryMetric" TEXT,
    "contentClass" "ContentClass",
    "signalSource" "SignalSource",
    "signalContent" TEXT,
    "signalLink" TEXT,
    "rawFootageUrl" TEXT,
    "editedVideoUrl" TEXT,
    "referenceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "assigneeId" TEXT,
    "parentCardId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Validation" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "dorQuente" INTEGER NOT NULL,
    "clareza" INTEGER NOT NULL,
    "contraste" INTEGER NOT NULL,
    "especificidadeAgencia" INTEGER NOT NULL,
    "potencialComentarios" INTEGER NOT NULL,
    "potencialComercial" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "verdict" "ValidationVerdict" NOT NULL,
    "aiSuggested" BOOLEAN NOT NULL DEFAULT false,
    "aiJustifications" JSONB,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Validation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Angle" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "type" "AngleType" NOT NULL,
    "text" TEXT NOT NULL,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Angle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hook" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" "HookStatus" NOT NULL DEFAULT 'EM_TESTE',
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Script" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "dor" TEXT NOT NULL,
    "quebra" TEXT NOT NULL,
    "mecanismo" TEXT NOT NULL,
    "beneficio" TEXT NOT NULL,
    "cta" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "strongPhrases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Script_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativeDirection" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "format" "CreativeFormat" NOT NULL,
    "visualNotes" TEXT,
    "referenceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreativeDirection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopyContent" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "ctaVariations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CopyContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "cta" TEXT NOT NULL,
    "primaryMetric" TEXT NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionReview" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "badCount" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "reviewerId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetentionReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistTemplate" (
    "id" TEXT NOT NULL,
    "stage" "Stage" NOT NULL,

    CONSTRAINT "ChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "ChecklistTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardChecklistItem" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "stage" "Stage" NOT NULL,
    "label" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "checkedById" TEXT,
    "checkedAt" TIMESTAMP(3),

    CONSTRAINT "CardChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardMetricSnapshot" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "retentionPct" DOUBLE PRECISION,
    "shares" INTEGER,
    "saves" INTEGER,
    "comments" INTEGER,
    "profileClicks" INTEGER,
    "directs" INTEGER,
    "newFollowers" INTEGER,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enteredById" TEXT,

    CONSTRAINT "CardMetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DerivedAsset" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "type" "DerivedAssetType" NOT NULL,
    "content" TEXT,
    "externalUrl" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DerivedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardStageHistory" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "stage" "Stage" NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitedAt" TIMESTAMP(3),
    "byUserId" TEXT,

    CONSTRAINT "CardStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "cardId" TEXT,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIJob" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "cardId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "costEstimate" DOUBLE PRECISION,
    "result" JSONB,
    "error" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "mixTargets" JSONB NOT NULL,
    "pillarGroupMap" JSONB NOT NULL,
    "weeklyTargets" JSONB NOT NULL,
    "goldenRulePrompt" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Card_stage_idx" ON "Card"("stage");

-- CreateIndex
CREATE INDEX "Card_assigneeId_idx" ON "Card"("assigneeId");

-- CreateIndex
CREATE INDEX "Card_pillar_idx" ON "Card"("pillar");

-- CreateIndex
CREATE INDEX "Card_archivedAt_idx" ON "Card"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Validation_cardId_key" ON "Validation"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "Script_cardId_key" ON "Script"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "CreativeDirection_cardId_key" ON "CreativeDirection"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "CopyContent_cardId_key" ON "CopyContent"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_cardId_key" ON "Schedule"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "RetentionReview_cardId_key" ON "RetentionReview"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistTemplate_stage_key" ON "ChecklistTemplate"("stage");

-- CreateIndex
CREATE INDEX "CardChecklistItem_cardId_stage_idx" ON "CardChecklistItem"("cardId", "stage");

-- CreateIndex
CREATE INDEX "CardMetricSnapshot_cardId_idx" ON "CardMetricSnapshot"("cardId");

-- CreateIndex
CREATE INDEX "CardStageHistory_cardId_idx" ON "CardStageHistory"("cardId");

-- CreateIndex
CREATE INDEX "Comment_cardId_idx" ON "Comment"("cardId");

-- CreateIndex
CREATE INDEX "ActivityLog_cardId_idx" ON "ActivityLog"("cardId");

-- CreateIndex
CREATE INDEX "ActivityLog_actorId_idx" ON "ActivityLog"("actorId");

-- CreateIndex
CREATE INDEX "AIJob_cardId_idx" ON "AIJob"("cardId");

-- CreateIndex
CREATE INDEX "AIJob_status_idx" ON "AIJob"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_token_idx" ON "RefreshToken"("token");

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_parentCardId_fkey" FOREIGN KEY ("parentCardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Validation" ADD CONSTRAINT "Validation_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Angle" ADD CONSTRAINT "Angle_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hook" ADD CONSTRAINT "Hook_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Script" ADD CONSTRAINT "Script_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeDirection" ADD CONSTRAINT "CreativeDirection_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopyContent" ADD CONSTRAINT "CopyContent_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetentionReview" ADD CONSTRAINT "RetentionReview_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistTemplateItem" ADD CONSTRAINT "ChecklistTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardChecklistItem" ADD CONSTRAINT "CardChecklistItem_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardMetricSnapshot" ADD CONSTRAINT "CardMetricSnapshot_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DerivedAsset" ADD CONSTRAINT "DerivedAsset_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardStageHistory" ADD CONSTRAINT "CardStageHistory_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIJob" ADD CONSTRAINT "AIJob_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

