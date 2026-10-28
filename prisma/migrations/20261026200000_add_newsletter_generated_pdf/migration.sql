ALTER TABLE "Newsletter"
  ADD COLUMN "pdfContent" BYTEA,
  ADD COLUMN "pdfSourceHash" TEXT,
  ADD COLUMN "pdfGeneratedAt" TIMESTAMP(3);

ALTER TABLE "NewsletterMailCampaign" ADD COLUMN "pdfContent" BYTEA;
