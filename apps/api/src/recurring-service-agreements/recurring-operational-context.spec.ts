import { describe, expect, it, jest } from '@jest/globals';
import { RecurringServiceAgreementsService } from './recurring-service-agreements.service';
import type { PrismaService } from '../prisma.service';

it('future recurring visits inherit stable context but never initial access or credentials', async () => {
  const agreement: any = {
    id: 'agreement-1', propertyId: 'property-1', serviceId: 'service-1', frequency: 'WEEKLY', status: 'ACTIVE',
    effectiveDate: new Date('2026-08-20'), endDate: null, weekday: 'THURSDAY', dayOfMonth: null,
    preferredTimeWindow: 'MORNING', recurringInstructions: 'Use eco products every visit', ecoFriendlyProducts: true,
    nextServiceDate: new Date('2026-08-20'), property: { customerId: 'customer-1' }, service: {}, addOns: [], workOrders: [],
  };
  const tx: any = {
    recurringServiceAgreement: { findUnique: jest.fn(async () => agreement), update: jest.fn(async () => agreement) },
    workOrderDailyCounter: { upsert: jest.fn(async () => ({ sequence: 1 })) },
    workOrder: { create: jest.fn(async ({ data }: any) => ({ id: 'work-order-1', ...data })) },
    workOrderActivity: { create: jest.fn(async () => ({})) },
  };
  const prisma = { $transaction: jest.fn(async (callback: any) => callback(tx)) } as unknown as PrismaService;
  await new RecurringServiceAgreementsService(prisma).generateNext('agreement-1', 'admin-1', new Date('2026-08-16T10:00:00Z'));
  const data = tx.workOrder.create.mock.calls[0][0].data;
  expect(data).toEqual(expect.objectContaining({ preferredTimeWindow: 'MORNING', ecoFriendlyProducts: true, description: 'Use eco products every visit' }));
  expect(data).not.toHaveProperty('temporaryAccessCredentials');
  expect(data).not.toHaveProperty('accessInstructions');
  expect(data).not.toHaveProperty('keyHandover');
});
