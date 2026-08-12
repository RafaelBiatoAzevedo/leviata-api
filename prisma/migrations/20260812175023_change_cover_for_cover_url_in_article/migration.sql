/*
  Warnings:

  - You are about to drop the column `cover` on the `Article` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Article" DROP COLUMN "cover",
ADD COLUMN     "coverPublicId" TEXT,
ADD COLUMN     "coverUrl" TEXT;
