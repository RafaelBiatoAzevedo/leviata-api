-- Preserve existing boards without inferring a type from their titles.
CREATE TYPE "BoardType" AS ENUM ('QUALIFICATION', 'DEFENSE');

ALTER TABLE "Board" ADD COLUMN "type" "BoardType";
