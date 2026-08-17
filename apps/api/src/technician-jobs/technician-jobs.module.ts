import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TechnicianJobsController } from './technician-jobs.controller';
import { TechnicianJobsService } from './technician-jobs.service';

@Module({ controllers: [TechnicianJobsController], providers: [TechnicianJobsService, PrismaService] })
export class TechnicianJobsModule {}
