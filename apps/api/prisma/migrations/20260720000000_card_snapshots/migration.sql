-- Pilha de snapshots por card — desfazer geração da IA (PRD-016 / SPEC-016).
-- Aditiva e idempotente.

CREATE TABLE IF NOT EXISTS "CardSnapshot" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "stage" "Stage" NOT NULL,
    "data" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CardSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CardSnapshot_cardId_createdAt_idx" ON "CardSnapshot"("cardId", "createdAt");

DO $$ BEGIN
    ALTER TABLE "CardSnapshot"
        ADD CONSTRAINT "CardSnapshot_cardId_fkey"
        FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
