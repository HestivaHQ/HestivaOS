import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, Logger } from '@nestjs/common';
import { BusinessProfileService } from './business-profile.service';

describe('BusinessProfileService', () => {
  const upsert = jest.fn<() => Promise<any>>();
  const service = new BusinessProfileService({ businessProfile: { upsert } } as never);
  beforeEach(() => { upsert.mockReset(); jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined); });
  afterEach(() => { jest.restoreAllMocks(); });

  it('creates and reads only the canonical profile', async () => {
    upsert.mockResolvedValue({ registeredName: null });
    await service.find();
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'hestiva' }, create: { id: 'hestiva' } }));
  });
  it('persists allowed trimmed fields and blank optional values', async () => {
    upsert.mockResolvedValue({ registeredName: 'Synthetic Co', tradingName: null });
    await expect(service.update('actor-id', { registeredName: '  Synthetic Co  ', tradingName: '  ', shareAccountNumber: false })).resolves.toEqual(expect.objectContaining({ registeredName: 'Synthetic Co' }));
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { registeredName: 'Synthetic Co', tradingName: null, shareAccountNumber: false } }));
  });
  it('rejects unknown fields and invalid email or unsafe website', async () => {
    await expect(service.update('actor', { secret: 'value' } as never)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update('actor', { businessEmail: 'invalid' })).rejects.toThrow('valid business email');
    await expect(service.update('actor', { website: 'javascript:alert(1)' })).rejects.toThrow('http or https');
    expect(upsert).not.toHaveBeenCalled();
  });
  it('logs changed field names without sensitive values', async () => {
    upsert.mockResolvedValue({ accountNumber: '123456' });
    const log = jest.spyOn(Logger.prototype, 'log');
    await service.update('actor', { accountNumber: '123456', taxNumber: 'TAX-SECRET' });
    expect(log).toHaveBeenCalledWith('business_profile_changed actorUserId=actor fields=accountNumber,taxNumber');
    expect(log.mock.calls.flat().join(' ')).not.toContain('123456');
    expect(log.mock.calls.flat().join(' ')).not.toContain('TAX-SECRET');
  });
});
