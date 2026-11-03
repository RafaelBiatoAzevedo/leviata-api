CREATE TYPE "AdminActivityMailStatus" AS ENUM ('RECORDING', 'PENDING', 'SENDING', 'SENT', 'FAILED', 'UNKNOWN', 'ACTION_FAILED');

CREATE TABLE "AdminActivity" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "actorName" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'STARTED',
    "details" JSONB NOT NULL,
    "status" "AdminActivityMailStatus" NOT NULL DEFAULT 'RECORDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),
    "sentAt" TIMESTAMPTZ(3),
    "lastAttemptAt" TIMESTAMPTZ(3),
    "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,

    CONSTRAINT "AdminActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminActivity_status_nextAttemptAt_idx" ON "AdminActivity"("status", "nextAttemptAt");
CREATE INDEX "AdminActivity_actorId_createdAt_idx" ON "AdminActivity"("actorId", "createdAt");
