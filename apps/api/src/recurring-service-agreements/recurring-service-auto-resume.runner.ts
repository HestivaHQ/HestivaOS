import { Injectable, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { RecurringServiceAgreementsService } from './recurring-service-agreements.service';

const AUTO_RESUME_INTERVAL_MS = 60_000;

@Injectable()
export class RecurringServiceAutoResumeRunner implements OnApplicationBootstrap, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(private readonly agreements: RecurringServiceAgreementsService) {}

  onApplicationBootstrap() {
    void this.runOnce();
    this.timer = setInterval(() => void this.runOnce(), AUTO_RESUME_INTERVAL_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async runOnce() {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.agreements.resumeDueAgreements();
      if (result.resumed || result.ended) {
        console.info(JSON.stringify({ event: 'recurring_auto_resume_reconciled', ...result }));
      }
    } catch (error) {
      console.error(JSON.stringify({ event: 'recurring_auto_resume_failed', message: error instanceof Error ? error.message : 'unknown error' }));
    } finally {
      this.running = false;
    }
  }
}
