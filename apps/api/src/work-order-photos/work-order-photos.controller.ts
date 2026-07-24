import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CreateWorkOrderPhotoInput, WorkOrderPhotosService } from './work-order-photos.service';

@Controller('work-orders/:workOrderId/photos')
export class WorkOrderPhotosController {
  constructor(private readonly photos: WorkOrderPhotosService) {}

  @Get()
  findAll(@Param('workOrderId', new ParseUUIDPipe()) workOrderId: string) {
    return this.photos.findAll(workOrderId);
  }

  @Post()
  create(@Param('workOrderId', new ParseUUIDPipe()) workOrderId: string, @Body() input: CreateWorkOrderPhotoInput) {
    return this.photos.create(workOrderId, input);
  }

  @Delete(':photoId')
  remove(
    @Param('workOrderId', new ParseUUIDPipe()) workOrderId: string,
    @Param('photoId', new ParseUUIDPipe()) photoId: string,
  ) {
    return this.photos.remove(workOrderId, photoId);
  }
}
