import { describe, expect, it } from '@jest/globals';
import type { PrismaService } from '../prisma.service';
import type { QuoteOperationalCostProvider } from './quote-operational-cost-source';
import { QuoteSubmissionService } from './quote-submission.service';

describe('QuoteSubmissionService replay response', () => {
  it('preserves resolver-provided immutable response data without invoking pricing', async () => {
    const service = new QuoteSubmissionService(
      {} as PrismaService,
      {} as QuoteOperationalCostProvider,
    );

    const pricing = {
      currency: 'ZAR',
      subtotalMinor: 80000,
      adjustmentsMinor: 0,
      totalMinor: 80000,
      lines: [{
        code: 'PRIMARY_REGULAR_HOME_CLEANING',
        label: 'Regular Home Cleaning',
        quantity: 1,
        unitAmountMinor: 80000,
        lineAmountMinor: 80000,
      }],
    };

    await expect(service.submit({} as never, async () => ({
      kind: 'REPLAY',
      quoteId: '5fcd12a2-d92a-4c92-95c6-21d1f7ed4869',
      quoteReference: 'Q-20260811-0001',
      response: { quoteStatus: 'SUBMITTED', pricing },
    }))).resolves.toEqual({
      quoteId: '5fcd12a2-d92a-4c92-95c6-21d1f7ed4869',
      quoteReference: 'Q-20260811-0001',
      quoteStatus: 'SUBMITTED',
      pricing,
      created: false,
      replay: true,
    });
  });
});
