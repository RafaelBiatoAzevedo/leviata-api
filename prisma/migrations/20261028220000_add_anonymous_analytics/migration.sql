-- Additive migration. No existing content/authentication tables are changed.
CREATE TABLE "AnalyticsEvent" (
  "id" UUID NOT NULL,
  "day" DATE NOT NULL,
  "path" VARCHAR(150) NOT NULL,
  "source" VARCHAR(20) NOT NULL,
  "device" VARCHAR(20) NOT NULL,
  "browser" VARCHAR(20) NOT NULL,
  CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AnalyticsEvent_day_idx" ON "AnalyticsEvent"("day");

CREATE TABLE "AnalyticsMonth" (
  "month" VARCHAR(7) NOT NULL,
  "used" INTEGER NOT NULL DEFAULT 0,
  "capped" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "AnalyticsMonth_pkey" PRIMARY KEY ("month"),
  CONSTRAINT "AnalyticsMonth_used_nonnegative" CHECK ("used" >= 0)
);
