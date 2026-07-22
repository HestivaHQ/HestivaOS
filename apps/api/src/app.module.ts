import { Module } from '@nestjs/common';
import { CustomersModule } from './customers/customers.module';
import { HealthController } from './health.controller';
import { PrismaService } from './prisma.service';
import { PropertiesModule } from './properties/properties.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';

@Module({
  imports: [CustomersModule, PropertiesModule, WorkOrdersModule],
  controllers: [HealthController],
  providers: [PrismaService],
})
export class AppModule {}
