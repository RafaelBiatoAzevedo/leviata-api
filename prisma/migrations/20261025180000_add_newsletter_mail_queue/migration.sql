-- CreateEnum
CREATE TYPE "NewsletterMailRecipientStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'SKIPPED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "NewsletterMailCampaign" (
    "id" TEXT NOT NULL,
    "newsletterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),

    CONSTRAINT "NewsletterMailCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterMailRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "NewsletterMailRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptAt" TIMESTAMPTZ(3),
    "sentAt" TIMESTAMPTZ(3),
    "messageId" TEXT,
    "errorCode" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "NewsletterMailRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterMailCampaign_newsletterId_key" ON "NewsletterMailCampaign"("newsletterId");

-- CreateIndex
CREATE INDEX "NewsletterMailRecipient_status_nextAttemptAt_idx" ON "NewsletterMailRecipient"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "NewsletterMailRecipient_lastAttemptAt_idx" ON "NewsletterMailRecipient"("lastAttemptAt");

-- CreateIndex
CREATE INDEX "NewsletterMailRecipient_sentAt_idx" ON "NewsletterMailRecipient"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterMailRecipient_campaignId_subscriberId_key" ON "NewsletterMailRecipient"("campaignId", "subscriberId");

-- AddForeignKey
ALTER TABLE "NewsletterMailCampaign" ADD CONSTRAINT "NewsletterMailCampaign_newsletterId_fkey" FOREIGN KEY ("newsletterId") REFERENCES "Newsletter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterMailRecipient" ADD CONSTRAINT "NewsletterMailRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "NewsletterMailCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterMailRecipient" ADD CONSTRAINT "NewsletterMailRecipient_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "NewsletterSubscriber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
