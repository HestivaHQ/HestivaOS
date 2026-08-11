import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type CustomerCleanupCounts = {
  customerDeleted: number;
  propertiesDeleted: number;
  recurringAgreementsDeleted: number;
  workOrdersDeleted: number;
  activitiesDeleted: number;
  checklistItemsDeleted: number;
  photosDeleted: number;
  signOffsDeleted: number;
  shiftsDetached: number;
};

@Injectable()
export class CustomerCleanupService {
  private readonly logger = new Logger(CustomerCleanupService.name);
  constructor(private readonly prisma: PrismaService) {}

  async impact(id: string) {
    return this.prisma.$transaction((tx) => this.readImpact(tx, id));
  }

  async remove(actorUserId: string, customerId: string, confirmationName?: string) {
    const counts = await this.prisma.$transaction(async (tx) => {
      const impact = await this.readImpact(tx, customerId);
      if (confirmationName !== impact.customerName) {
        throw new BadRequestException('Confirmation name must exactly match the Customer Contact name.');
      }
      const workOrderWhere = { customerId };
      const activitiesDeleted = await tx.workOrderActivity.deleteMany({ where: { workOrder: workOrderWhere } });
      const checklistItemsDeleted = await tx.workOrderChecklistItem.deleteMany({ where: { workOrder: workOrderWhere } });
      const photosDeleted = await tx.workOrderPhoto.deleteMany({ where: { workOrder: workOrderWhere } });
      const signOffsDeleted = await tx.workOrderCustomerSignOff.deleteMany({ where: { workOrder: workOrderWhere } });
      // Shifts are shared planning records: detach their customer-owned work-order link, but preserve the shift.
      const shiftsDetached = await tx.shift.updateMany({ where: { workOrder: workOrderWhere }, data: { workOrderId: null } });
      const workOrdersDeleted = await tx.workOrder.deleteMany({ where: workOrderWhere });
      const recurringAgreementsDeleted = await tx.recurringServiceAgreement.deleteMany({ where: { property: { customerId } } });
      const propertiesDeleted = await tx.property.deleteMany({ where: { customerId } });
      const customerDeleted = await tx.customer.deleteMany({ where: { id: customerId } });
      return {
        customerDeleted: customerDeleted.count,
        propertiesDeleted: propertiesDeleted.count,
        recurringAgreementsDeleted: recurringAgreementsDeleted.count,
        workOrdersDeleted: workOrdersDeleted.count,
        activitiesDeleted: activitiesDeleted.count,
        checklistItemsDeleted: checklistItemsDeleted.count,
        photosDeleted: photosDeleted.count,
        signOffsDeleted: signOffsDeleted.count,
        shiftsDetached: shiftsDetached.count,
      } satisfies CustomerCleanupCounts;
    });
    this.logger.warn(`admin_customer_cleanup actorUserId=${actorUserId} customerId=${customerId} counts=${JSON.stringify(counts)} timestamp=${new Date().toISOString()}`);
    return { ...counts, storageObjectsDeleted: false, possibleOrphanedStorage: counts.photosDeleted > 0 };
  }

  private async readImpact(tx: Prisma.TransactionClient, customerId: string) {
    const customer = await tx.customer.findUnique({ where: { id: customerId }, select: { contactName: true, name: true } });
    if (!customer) throw new NotFoundException('Customer not found.');
    const workOrderWhere = { customerId };
    const [properties, recurringAgreements, workOrders, activities, checklistItems, photos, signOffs, shifts] = await Promise.all([
      tx.property.count({ where: { customerId } }),
      tx.recurringServiceAgreement.count({ where: { property: { customerId } } }),
      tx.workOrder.count({ where: workOrderWhere }),
      tx.workOrderActivity.count({ where: { workOrder: workOrderWhere } }),
      tx.workOrderChecklistItem.count({ where: { workOrder: workOrderWhere } }),
      tx.workOrderPhoto.count({ where: { workOrder: workOrderWhere } }),
      tx.workOrderCustomerSignOff.count({ where: { workOrder: workOrderWhere } }),
      tx.shift.count({ where: { workOrder: workOrderWhere } }),
    ]);
    return {
      customerName: customer.contactName?.trim() || customer.name,
      customer: 1,
      properties,
      recurringAgreements,
      workOrders,
      activities,
      checklistItems,
      photos,
      signOffs,
      shiftsToDetach: shifts,
    };
  }
}
