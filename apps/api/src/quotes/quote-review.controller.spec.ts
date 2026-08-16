import { describe, expect, it, jest } from '@jest/globals';
import { UserRole } from '@prisma/client';
import { IS_PUBLIC_KEY } from '../users/public.decorator';
import { ROLES_KEY } from '../users/roles.decorator';
import { QuoteReviewController } from './quote-review.controller';
import type { QuoteReviewService } from './quote-review.service';

describe('QuoteReviewController authorization and delegation', () => {
  it('is ADMIN-only and does not bypass the global authentication guard', () => {
    expect(Reflect.getMetadata(ROLES_KEY, QuoteReviewController)).toEqual([UserRole.ADMIN]);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, QuoteReviewController)).not.toBe(true);
    for (const method of ['findAll', 'findOne', 'preflight', 'decline', 'recordResolution', 'accept'] as const) {
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, QuoteReviewController.prototype[method])).not.toBe(true);
    }
  });

  it('delegates list and detail review to the internal service', async () => {
    const service = { findAll: jest.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 20 })), findOne: jest.fn(async () => ({ id: 'quote-id' })) } as unknown as QuoteReviewService;
    const controller = new QuoteReviewController(service);
    await expect(controller.findAll(1, 20, 'Q-', undefined)).resolves.toEqual(expect.objectContaining({ total: 0 }));
    await expect(controller.findOne('quote-id')).resolves.toEqual({ id: 'quote-id' });
    expect(service.findAll).toHaveBeenCalledWith(1, 20, 'Q-', undefined);
    expect(service.findOne).toHaveBeenCalledWith('quote-id');
  });
});
