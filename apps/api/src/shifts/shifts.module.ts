import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';

@Module({
  controllers: [ShiftsController],
  providers: [ShiftsService, PrismaService],
  exports: [ShiftsService],
})
export class ShiftsModule {}
