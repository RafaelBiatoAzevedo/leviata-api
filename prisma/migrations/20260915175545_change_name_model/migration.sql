/*
  Warnings:

  - You are about to drop the `Research` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_PersonToResearch` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ResearchImages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ResearchSupports` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_PersonToResearch" DROP CONSTRAINT "_PersonToResearch_A_fkey";

-- DropForeignKey
ALTER TABLE "_PersonToResearch" DROP CONSTRAINT "_PersonToResearch_B_fkey";

-- DropForeignKey
ALTER TABLE "_ResearchImages" DROP CONSTRAINT "_ResearchImages_A_fkey";

-- DropForeignKey
ALTER TABLE "_ResearchImages" DROP CONSTRAINT "_ResearchImages_B_fkey";

-- DropForeignKey
ALTER TABLE "_ResearchSupports" DROP CONSTRAINT "_ResearchSupports_A_fkey";

-- DropForeignKey
ALTER TABLE "_ResearchSupports" DROP CONSTRAINT "_ResearchSupports_B_fkey";

-- DropTable
DROP TABLE "Research";

-- DropTable
DROP TABLE "_PersonToResearch";

-- DropTable
DROP TABLE "_ResearchImages";

-- DropTable
DROP TABLE "_ResearchSupports";

-- CreateTable
CREATE TABLE "Search" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "coverUrl" TEXT,
    "coverPublicId" TEXT,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "Search_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PersonToSearch" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PersonToSearch_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_SearchImages" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SearchImages_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_SearchSupports" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SearchSupports_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Search_slug_key" ON "Search"("slug");

-- CreateIndex
CREATE INDEX "_PersonToSearch_B_index" ON "_PersonToSearch"("B");

-- CreateIndex
CREATE INDEX "_SearchImages_B_index" ON "_SearchImages"("B");

-- CreateIndex
CREATE INDEX "_SearchSupports_B_index" ON "_SearchSupports"("B");

-- AddForeignKey
ALTER TABLE "_PersonToSearch" ADD CONSTRAINT "_PersonToSearch_A_fkey" FOREIGN KEY ("A") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PersonToSearch" ADD CONSTRAINT "_PersonToSearch_B_fkey" FOREIGN KEY ("B") REFERENCES "Search"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SearchImages" ADD CONSTRAINT "_SearchImages_A_fkey" FOREIGN KEY ("A") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SearchImages" ADD CONSTRAINT "_SearchImages_B_fkey" FOREIGN KEY ("B") REFERENCES "Search"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SearchSupports" ADD CONSTRAINT "_SearchSupports_A_fkey" FOREIGN KEY ("A") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SearchSupports" ADD CONSTRAINT "_SearchSupports_B_fkey" FOREIGN KEY ("B") REFERENCES "Search"("id") ON DELETE CASCADE ON UPDATE CASCADE;
