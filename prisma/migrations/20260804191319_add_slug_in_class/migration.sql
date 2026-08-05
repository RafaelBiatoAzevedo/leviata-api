/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Article` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `Board` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `Book` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `Jury` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `Meeting` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `News` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `Newsletter` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `PresentedWork` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `ResearchInstrument` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Article` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `Board` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `Book` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `Jury` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `Meeting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `News` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `Newsletter` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `PresentedWork` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `ResearchInstrument` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Board" ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Jury" ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "News" ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Newsletter" ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PresentedWork" ADD COLUMN     "slug" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ResearchInstrument" ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Board_slug_key" ON "Board"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Book_slug_key" ON "Book"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Jury_slug_key" ON "Jury"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_slug_key" ON "Meeting"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "News_slug_key" ON "News"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Newsletter_slug_key" ON "Newsletter"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PresentedWork_slug_key" ON "PresentedWork"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchInstrument_slug_key" ON "ResearchInstrument"("slug");
