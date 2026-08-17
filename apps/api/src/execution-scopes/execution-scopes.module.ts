import { Module } from '@nestjs/common'; import { PrismaService } from '../prisma.service'; import { ExecutionScopesController } from './execution-scopes.controller'; import { ExecutionScopesService } from './execution-scopes.service';
@Module({controllers:[ExecutionScopesController],providers:[ExecutionScopesService,PrismaService]}) export class ExecutionScopesModule {}
