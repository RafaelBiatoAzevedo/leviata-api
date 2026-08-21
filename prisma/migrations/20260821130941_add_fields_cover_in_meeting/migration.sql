/*
  Warnings:

  - You are about to drop the column `coverImage` on the `Meeting` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Meeting" DROP COLUMN "coverImage",
ADD COLUMN     "coverPublicId" TEXT,
ADD COLUMN     "coverUrl" TEXT;
