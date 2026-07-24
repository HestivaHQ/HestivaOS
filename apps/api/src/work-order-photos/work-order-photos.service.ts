import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { WorkOrderPhotoCategory } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type CreateWorkOrderPhotoInput = {
  category: WorkOrderPhotoCategory;
  url: string;
  storagePath: string;
  uploadedBy: string;
};

@Injectable()
export class WorkOrderPhotosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(workOrderId: string) {
    await this.assertWorkOrder(workOrderId);
    return this.prisma.workOrderPhoto.findMany({
      where: { workOrderId },
      orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(workOrderId: string, input: CreateWorkOrderPhotoInput) {
    await this.assertWorkOrder(workOrderId);
    if (!input.url?.trim() || !input.storagePath?.trim() || !input.uploadedBy?.trim()) {
      throw new BadRequestException('url, storagePath and uploadedBy are required.');
    }
    if (!Object.values(WorkOrderPhotoCategory).includes(input.category)) {
      throw new BadRequestException('A valid photo category is required.');
    }
    return this.prisma.workOrderPhoto.create({
      data: {
        workOrderId,
        category: input.category,
        url: input.url.trim(),
        storagePath: input.storagePath.trim(),
        uploadedBy: input.uploadedBy.trim(),
      },
    });
  }

  async remove(workOrderId: string, photoId: string) {
    const photo = await this.prisma.workOrderPhoto.findFirst({ where: { id: photoId, workOrderId } });
    if (!photo) throw new NotFoundException('Work order photo not found.');
    return this.prisma.workOrderPhoto.delete({ where: { id: photoId } });
  }

  private async assertWorkOrder(workOrderId: string) {
    const workOrder = await this.prisma.workOrder.findUnique({ where: { id: workOrderId }, select: { id: true } });
    if (!workOrder) throw new NotFoundException('Work order not found.');
  }
}
