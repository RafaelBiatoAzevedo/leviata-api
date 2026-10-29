import { Module } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { ANALYTICS_PROVIDER } from './analytics.contract';
import { AnalyticsConfig } from './analytics.config';
import {
  AnalyticsController,
  AnalyticsCollectController,
} from './analytics.controller';
import { AnalyticsCollector } from './analytics.collector';
import { AnalyticsService } from './analytics.service';
import { PostgresAnalyticsProvider } from './postgres-analytics.provider';

@Module({
  controllers: [AnalyticsController, AnalyticsCollectController],
  providers: [
    AnalyticsConfig,
    AnalyticsCollector,
    AnalyticsService,
    AdminGuard,
    { provide: ANALYTICS_PROVIDER, useClass: PostgresAnalyticsProvider },
  ],
})
export class AnalyticsModule {}
