-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('VIDEO', 'ESTATICO');

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "contentType" "ContentType" NOT NULL DEFAULT 'VIDEO';

-- AlterTable
ALTER TABLE "CreativeDirection" ADD COLUMN     "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "editingInsights" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "graphicElements" JSONB,
ADD COLUMN     "palette" TEXT;

-- CreateTable
CREATE TABLE "AIConversation" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "stage" "Stage" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT,
    "aiJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL,
    "stage" "Stage" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "builtIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIConversation_cardId_idx" ON "AIConversation"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "AIConversation_cardId_stage_key" ON "AIConversation"("cardId", "stage");

-- CreateIndex
CREATE INDEX "AIMessage_conversationId_idx" ON "AIMessage"("conversationId");

-- CreateIndex
CREATE INDEX "PromptTemplate_stage_idx" ON "PromptTemplate"("stage");

-- AddForeignKey
ALTER TABLE "AIConversation" ADD CONSTRAINT "AIConversation_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIMessage" ADD CONSTRAINT "AIMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
