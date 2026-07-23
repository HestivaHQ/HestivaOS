import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TechniciansController } from './technicians.controller';
import { TechniciansService } from './technicians.service';

@Module({
  controllers: [TechniciansController],
  providers: [TechniciansService, PrismaService],
  exports: [TechniciansService],
})
export class TechniciansModule {}
