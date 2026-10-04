ALTER TABLE "Image" ADD COLUMN "publicId" TEXT,
                    ADD COLUMN "title" TEXT;

CREATE UNIQUE INDEX "Image_publicId_key" ON "Image"("publicId");
