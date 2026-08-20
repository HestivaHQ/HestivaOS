import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { OperationalDashboardService } from './operational-dashboard.service';
import { SupervisorOperationsController } from './supervisor-operations.controller';
import { SupervisorOperationsService } from './supervisor-operations.service';

@Module({
  controllers: [DashboardController, SupervisorOperationsController],
  providers: [
    OperationalDashboardService,
    SupervisorOperationsService,
    { provide: DashboardService, useExisting: OperationalDashboardService },
  ],
})
export class DashboardModule {}
