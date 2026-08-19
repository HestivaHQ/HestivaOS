import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RecurringServiceAgreementsController } from './recurring-service-agreements.controller';
import { RecurringServiceAgreementsService } from './recurring-service-agreements.service';
import { RecurringServiceAutoResumeRunner } from './recurring-service-auto-resume.runner';
@Module({ controllers: [RecurringServiceAgreementsController], providers: [RecurringServiceAgreementsService, RecurringServiceAutoResumeRunner, PrismaService] })
export class RecurringServiceAgreementsModule {}
