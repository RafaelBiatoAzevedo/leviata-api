-- Preserve existing meetings and seminars in the portal listing.
ALTER TABLE "Meeting" ADD COLUMN "isInternal" BOOLEAN NOT NULL DEFAULT true;
