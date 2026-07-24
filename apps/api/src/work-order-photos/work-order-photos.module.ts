import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WorkOrderPhotosController } from './work-order-photos.controller';
import { WorkOrderPhotosService } from './work-order-photos.service';

@Module({
  controllers: [WorkOrderPhotosController],
  providers: [PrismaService, WorkOrderPhotosService],
})
export class WorkOrderPhotosModule {}
