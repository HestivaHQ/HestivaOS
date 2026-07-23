import { Module } from '@nestjs/common';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthController } from './health.controller';
import { PrismaService } from './prisma.service';
import { PropertiesModule } from './properties/properties.module';
import { TechniciansModule } from './technicians/technicians.module';
import { UsersModule } from './users/users.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';

@Module({
  imports: [UsersModule, CustomersModule, PropertiesModule, WorkOrdersModule, DashboardModule, TechniciansModule],
  controllers: [HealthController],
  providers: [PrismaService],
})
export class AppModule {}
