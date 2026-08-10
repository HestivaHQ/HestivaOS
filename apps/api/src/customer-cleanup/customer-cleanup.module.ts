import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CustomerCleanupController } from './customer-cleanup.controller';
import { CustomerCleanupService } from './customer-cleanup.service';

@Module({ controllers: [CustomerCleanupController], providers: [CustomerCleanupService, PrismaService] })
export class CustomerCleanupModule {}
