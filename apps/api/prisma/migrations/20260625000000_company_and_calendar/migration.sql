-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "companyName" TEXT NOT NULL DEFAULT '',
    "about" TEXT NOT NULL DEFAULT '',
    "offerings" TEXT NOT NULL DEFAULT '',
    "personas" JSONB NOT NULL DEFAULT '[]',
    "mainPains" TEXT NOT NULL DEFAULT '',
    "toneOfVoice" TEXT NOT NULL DEFAULT '',
    "differentiators" TEXT NOT NULL DEFAULT '',
    "proofCases" TEXT NOT NULL DEFAULT '',
    "dos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "donts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "links" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditorialCalendar" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "theme" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "weeks" INTEGER NOT NULL,
    "postsPerWeek" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EditorialCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditorialCalendarItem" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "pillar" "Pillar",
    "contentType" "ContentType" NOT NULL DEFAULT 'VIDEO',
    "format" "CreativeFormat",
    "persona" TEXT,
    "pain" TEXT,
    "promise" TEXT,
    "connection" TEXT,
    "cardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EditorialCalendarItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EditorialCalendarItem_cardId_key" ON "EditorialCalendarItem"("cardId");

-- CreateIndex
CREATE INDEX "EditorialCalendarItem_calendarId_idx" ON "EditorialCalendarItem"("calendarId");

-- AddForeignKey
ALTER TABLE "EditorialCalendarItem" ADD CONSTRAINT "EditorialCalendarItem_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "EditorialCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorialCalendarItem" ADD CONSTRAINT "EditorialCalendarItem_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;
