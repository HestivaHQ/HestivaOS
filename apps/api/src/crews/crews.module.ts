import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CrewsController } from './crews.controller';
import { CrewsService } from './crews.service';

@Module({
  controllers: [CrewsController],
  providers: [CrewsService, PrismaService],
  exports: [CrewsService],
})
export class CrewsModule {}
