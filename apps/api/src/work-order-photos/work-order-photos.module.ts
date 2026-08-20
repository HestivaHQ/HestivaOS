import { Module } from '@nestjs/common';
import { WorkOrderPhotosController } from './work-order-photos.controller';
import { WorkOrderPhotosService } from './work-order-photos.service';

@Module({
  controllers: [WorkOrderPhotosController],
  providers: [WorkOrderPhotosService],
})
export class WorkOrderPhotosModule {}
