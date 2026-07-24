import { Module } from '@nestjs/common';
import { CleaningJobTemplatesModule } from './cleaning-job-templates/cleaning-job-templates.module';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthController } from './health.controller';
import { PrismaService } from './prisma.service';
import { PropertiesModule } from './properties/properties.module';
import { ServicesModule } from './services/services.module';
import { TechniciansModule } from './technicians/technicians.module';
import { UsersModule } from './users/users.module';
import { WorkOrderChecklistsModule } from './work-order-checklists/work-order-checklists.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';

@Module({
  imports: [UsersModule, CustomersModule, PropertiesModule, ServicesModule, CleaningJobTemplatesModule, WorkOrdersModule, WorkOrderChecklistsModule, DashboardModule, TechniciansModule],
  controllers: [HealthController],
  providers: [PrismaService],
})
export class AppModule {}
