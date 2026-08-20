import { ConflictException, NotFoundException } from '@nestjs/common';
import { CorrespondenceTemplateVersionStatus } from '@prisma/client';
import { CorrespondenceService } from './correspondence.service';

describe('CorrespondenceService', () => {
  const transaction = jest.fn();
  const prisma = { $transaction: transaction } as any;
  const service = new CorrespondenceService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('rejects a second draft for the same template', async () => {
    const tx = {
      correspondenceTemplate: { findUnique: jest.fn().mockResolvedValue({ id: 'template-1' }) },
      correspondenceTemplateVersion: {
        findFirst: jest.fn().mockResolvedValue({ id: 'draft-1', status: CorrespondenceTemplateVersionStatus.DRAFT }),
      },
    };
    transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));

    await expect(service.createVersion('template-1', { body: 'Next version' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('publishes a draft while retiring the previously published version atomically', async () => {
    const published = { id: 'draft-2', status: CorrespondenceTemplateVersionStatus.PUBLISHED };
    const tx = {
      correspondenceTemplateVersion: {
        findFirst: jest.fn().mockResolvedValue({ id: 'draft-2', templateId: 'template-1', status: CorrespondenceTemplateVersionStatus.DRAFT }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue(published),
      },
    };
    transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));

    await expect(service.publish('template-1', 'draft-2')).resolves.toEqual(published);
    expect(tx.correspondenceTemplateVersion.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { templateId: 'template-1', status: CorrespondenceTemplateVersionStatus.PUBLISHED },
      data: expect.objectContaining({ status: CorrespondenceTemplateVersionStatus.RETIRED }),
    }));
    expect(tx.correspondenceTemplateVersion.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'draft-2' },
      data: expect.objectContaining({ status: CorrespondenceTemplateVersionStatus.PUBLISHED }),
    }));
  });

  it('retires a published version inside the serialized lifecycle boundary', async () => {
    const retired = { id: 'version-1', status: CorrespondenceTemplateVersionStatus.RETIRED };
    const tx = {
      correspondenceTemplateVersion: {
        findFirst: jest.fn().mockResolvedValue({ id: 'version-1', templateId: 'template-1', status: CorrespondenceTemplateVersionStatus.PUBLISHED }),
        update: jest.fn().mockResolvedValue(retired),
      },
    };
    transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));

    await expect(service.retire('template-1', 'version-1')).resolves.toEqual(retired);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.correspondenceTemplateVersion.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'version-1' },
      data: expect.objectContaining({ status: CorrespondenceTemplateVersionStatus.RETIRED }),
    }));
  });

  it('does not publish a missing version', async () => {
    const tx = { correspondenceTemplateVersion: { findFirst: jest.fn().mockResolvedValue(null) } };
    transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));

    await expect(service.publish('template-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
