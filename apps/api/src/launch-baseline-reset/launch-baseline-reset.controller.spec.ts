import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { LaunchBaselineResetController } from './launch-baseline-reset.controller';

describe('LaunchBaselineResetController', () => {
  const original = process.env.HESTIVA_LAUNCH_BASELINE_RESET_ENABLED;

  afterEach(() => {
    if (original === undefined) delete process.env.HESTIVA_LAUNCH_BASELINE_RESET_ENABLED;
    else process.env.HESTIVA_LAUNCH_BASELINE_RESET_ENABLED = original;
  });

  function harness() {
    const impact = jest.fn(async () => ({ ready: true, blockers: [], impactFingerprint: 'fingerprint' }));
    const reset = jest.fn(async () => ({ reset: true }));
    const controller = new LaunchBaselineResetController({ impact, reset } as never);
    return { controller, impact, reset };
  }

  it('keeps preview read-only but blocked when the pre-launch runtime gate is disabled', async () => {
    delete process.env.HESTIVA_LAUNCH_BASELINE_RESET_ENABLED;
    const { controller } = harness();
    await expect(controller.impact()).resolves.toMatchObject({ ready: false });
    const result = await controller.impact();
    expect(result.blockers.join(' ')).toContain('Launch-baseline reset is disabled');
  });

  it('rejects execution while the pre-launch runtime gate is disabled', () => {
    process.env.HESTIVA_LAUNCH_BASELINE_RESET_ENABLED = 'false';
    const { controller, reset } = harness();
    expect(() => controller.reset({ id: 'admin' } as never, { confirmationPhrase: 'x', impactFingerprint: 'y' })).toThrow(ConflictException);
    expect(reset).not.toHaveBeenCalled();
  });

  it('delegates preview and execution only when the runtime gate is explicitly true', async () => {
    process.env.HESTIVA_LAUNCH_BASELINE_RESET_ENABLED = 'true';
    const { controller, reset } = harness();
    await expect(controller.impact()).resolves.toMatchObject({ ready: true, blockers: [] });
    await expect(controller.reset({ id: 'admin' } as never, { confirmationPhrase: 'phrase', impactFingerprint: 'fingerprint' })).resolves.toEqual({ reset: true });
    expect(reset).toHaveBeenCalledWith('admin', { confirmationPhrase: 'phrase', impactFingerprint: 'fingerprint' });
  });
});
