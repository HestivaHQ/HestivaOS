import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AttentionController } from './attention.controller';
import { AttentionService } from './attention.service';

@Module({
  controllers: [AttentionController],
  providers: [AttentionService, PrismaService],
  exports: [AttentionService],
})
export class AttentionModule {}
