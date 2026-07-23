import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';

@Module({
  controllers: [UsersController],
  providers: [UsersService, SupabaseAuthGuard, PrismaService],
})
export class UsersModule {}
