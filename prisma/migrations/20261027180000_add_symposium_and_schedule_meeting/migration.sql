ALTER TYPE "MeetingType" ADD VALUE 'SYMPOSIUM';

ALTER TABLE "Schedule" ADD COLUMN "meetingId" TEXT;

CREATE INDEX "Schedule_meetingId_idx" ON "Schedule"("meetingId");

ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_meetingId_fkey"
FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
