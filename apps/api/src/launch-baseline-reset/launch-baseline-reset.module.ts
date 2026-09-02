import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database.module';
import { LaunchBaselineResetController } from './launch-baseline-reset.controller';
import { LaunchBaselineResetService } from './launch-baseline-reset.service';

@Module({
  imports: [DatabaseModule],
  controllers: [LaunchBaselineResetController],
  providers: [LaunchBaselineResetService],
})
export class LaunchBaselineResetModule {}
