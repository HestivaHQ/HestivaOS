import { Module } from '@nestjs/common'; import { ExecutionScopesController } from './execution-scopes.controller'; import { ExecutionScopesService } from './execution-scopes.service';
@Module({controllers:[ExecutionScopesController],providers:[ExecutionScopesService]}) export class ExecutionScopesModule {}
