import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LabourCostingController } from './labour-costing.controller';
import { LabourCostingService } from './labour-costing.service';

@Module({
  controllers: [LabourCostingController],
  providers: [LabourCostingService, PrismaService],
})
export class LabourCostingModule {}