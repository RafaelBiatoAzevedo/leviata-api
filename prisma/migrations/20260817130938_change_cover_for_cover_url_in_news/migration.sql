/*
  Warnings:

  - You are about to drop the column `cover` on the `News` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "News" DROP COLUMN "cover",
ADD COLUMN     "coverPublicId" TEXT,
ADD COLUMN     "coverUrl" TEXT;
