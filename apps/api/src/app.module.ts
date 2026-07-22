import { Module } from '@nestjs/common';
import { CustomersModule } from './customers/customers.module';
import { HealthController } from './health.controller';
import { PrismaService } from './prisma.service';

@Module({
  imports: [CustomersModule],
  controllers: [HealthController],
  providers: [PrismaService],
})
export class AppModule {}
