import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SupabaseAdminService } from './supabase-admin.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, SupabaseAdminService, PrismaService],
})
export class UsersModule {}
