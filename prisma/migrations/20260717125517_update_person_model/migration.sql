/*
  Warnings:

  - You are about to drop the column `firstName` on the `Person` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `Person` table. All the data in the column will be lost.
  - You are about to drop the column `link` on the `Person` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Person` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `Person` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `Person` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Person" DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "link",
ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lattesUrl" TEXT,
ADD COLUMN     "linkedinUrl" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "orcid" TEXT,
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "website" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Person_slug_key" ON "Person"("slug");
