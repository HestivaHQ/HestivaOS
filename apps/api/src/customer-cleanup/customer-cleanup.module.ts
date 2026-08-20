import { Module } from '@nestjs/common';
import { CustomerCleanupController } from './customer-cleanup.controller';
import { CustomerCleanupService } from './customer-cleanup.service';

@Module({ controllers: [CustomerCleanupController], providers: [CustomerCleanupService] })
export class CustomerCleanupModule {}
