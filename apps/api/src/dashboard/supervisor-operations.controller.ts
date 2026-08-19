import { Controller, Get } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../users/roles.decorator';
import { SupervisorOperationsService } from './supervisor-operations.service';

@Controller('supervisor/operations')
export class SupervisorOperationsController {
  constructor(private readonly operations: SupervisorOperationsService) {}

  @Get()
  @Roles(UserRole.SUPERVISOR)
  overview() { return this.operations.overview(); }
}
