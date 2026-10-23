ALTER TABLE "Image" ADD COLUMN "newsId" TEXT;

CREATE INDEX "Image_newsId_idx" ON "Image"("newsId");

ALTER TABLE "Image" ADD CONSTRAINT "Image_newsId_fkey"
  FOREIGN KEY ("newsId") REFERENCES "News"("id") ON DELETE SET NULL ON UPDATE CASCADE;
