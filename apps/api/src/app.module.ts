import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BusinessListsModule } from './business-lists/business-lists.module';
import { BusinessProfileModule } from './business-profile/business-profile.module';
import { CleaningJobTemplatesModule } from './cleaning-job-templates/cleaning-job-templates.module';
import { CrewsModule } from './crews/crews.module';
import { CustomerCleanupModule } from './customer-cleanup/customer-cleanup.module';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EmployeesModule } from './employees/employees.module';
import { HealthController } from './health.controller';
import { RequestLoggingMiddleware } from './monitoring/request-logging.middleware';
import { PrismaService } from './prisma.service';
import { PropertiesModule } from './properties/properties.module';
import { ServicesModule } from './services/services.module';
import { ShiftsModule } from './shifts/shifts.module';
import { TechniciansModule } from './technicians/technicians.module';
import { UsersModule } from './users/users.module';
import { WorkOrderChecklistsModule } from './work-order-checklists/work-order-checklists.module';
import { WorkOrderCustomerSignOffsModule } from './work-order-customer-sign-offs/work-order-customer-sign-offs.module';
import { WorkOrderPhotosModule } from './work-order-photos/work-order-photos.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';
import { SupabaseAuthGuard } from './users/supabase-auth.guard';

@Module({
  imports: [BusinessListsModule, BusinessProfileModule, CustomerCleanupModule, EmployeesModule, UsersModule, CustomersModule, PropertiesModule, ServicesModule, CleaningJobTemplatesModule, WorkOrdersModule, WorkOrderChecklistsModule, WorkOrderPhotosModule, WorkOrderCustomerSignOffsModule, DashboardModule, TechniciansModule, CrewsModule, ShiftsModule],
  controllers: [HealthController],
  providers: [PrismaService, { provide: APP_GUARD, useClass: SupabaseAuthGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
