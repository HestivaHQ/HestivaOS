import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RecurringServiceAgreementsController } from './recurring-service-agreements.controller';
import { RecurringServiceAgreementsService } from './recurring-service-agreements.service';
@Module({ controllers: [RecurringServiceAgreementsController], providers: [RecurringServiceAgreementsService, PrismaService] })
export class RecurringServiceAgreementsModule {}
