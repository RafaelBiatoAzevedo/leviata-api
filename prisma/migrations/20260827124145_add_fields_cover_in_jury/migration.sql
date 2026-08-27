-- AlterTable
ALTER TABLE "Jury" ADD COLUMN     "coverPublicId" TEXT,
ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "meetingUrl" TEXT,
ADD COLUMN     "recordingUrl" TEXT,
ADD COLUMN     "registrationUrl" TEXT;

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "recordingUrl" TEXT;
