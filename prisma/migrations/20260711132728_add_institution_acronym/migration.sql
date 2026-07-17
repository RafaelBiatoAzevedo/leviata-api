/*
  Warnings:

  - Added the required column `acronym` to the `Institution` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Institution" ADD COLUMN     "acronym" TEXT NOT NULL;
