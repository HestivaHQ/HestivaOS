import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { OperationalDashboardService } from './operational-dashboard.service';

@Module({
  controllers: [DashboardController],
  providers: [
    PrismaService,
    OperationalDashboardService,
    { provide: DashboardService, useExisting: OperationalDashboardService },
  ],
})
export class DashboardModule {}
