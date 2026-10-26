-- CreateEnum
CREATE TYPE "CommentTarget" AS ENUM ('THEMATIC', 'RESEARCH_INSTRUMENT', 'BOARD', 'JURY', 'MEETING', 'PRESENTED_WORK', 'RESEARCH');

-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('PENDING', 'APPROVED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'REMINDER', 'COMMENT');

-- CreateEnum
CREATE TYPE "NotificationResolution" AS ENUM ('APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "targetType" "CommentTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "fullName" VARCHAR(120) NOT NULL,
    "text" VARCHAR(300) NOT NULL,
    "status" "CommentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMPTZ(3),
    "approvedById" TEXT,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "targetTitle" TEXT,
    "targetPath" TEXT,
    "commentId" TEXT,
    "resolution" "NotificationResolution",
    "resolvedAt" TIMESTAMPTZ(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visibleAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRead" (
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRead_pkey" PRIMARY KEY ("notificationId","userId")
);

-- CreateIndex
CREATE INDEX "Comment_targetType_targetId_status_createdAt_idx" ON "Comment"("targetType", "targetId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_commentId_key" ON "Notification"("commentId");

-- CreateIndex
CREATE INDEX "Notification_visibleAt_createdAt_idx" ON "Notification"("visibleAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_type_resolution_idx" ON "Notification"("type", "resolution");

-- CreateIndex
CREATE INDEX "NotificationRead_userId_idx" ON "NotificationRead"("userId");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRead" ADD CONSTRAINT "NotificationRead_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRead" ADD CONSTRAINT "NotificationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
