import { describe, expect, it } from '@jest/globals';
import { johannesburgBusinessDate } from './work-orders.service';

describe('work order reference business date', () => {
  it('uses the Africa/Johannesburg boundary rather than UTC or scheduled date', () => {
    expect(johannesburgBusinessDate(new Date('2026-08-10T21:59:59Z'))).toBe('20260810');
    expect(johannesburgBusinessDate(new Date('2026-08-10T22:00:00Z'))).toBe('20260811');
  });
});
