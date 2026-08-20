import { Module } from '@nestjs/common';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { TechnicianInterruptionsController } from './technician-interruptions.controller';
import { TechnicianJobsController } from './technician-jobs.controller';
import { TechnicianJobsService } from './technician-jobs.service';
import { TechnicianIncidentsController } from './technician-incidents.controller';

@Module({ imports: [WorkOrdersModule], controllers: [TechnicianJobsController, TechnicianInterruptionsController, TechnicianIncidentsController], providers: [TechnicianJobsService] })
export class TechnicianJobsModule {}
