/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Thematic` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Thematic` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Thematic" ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Thematic_slug_key" ON "Thematic"("slug");
