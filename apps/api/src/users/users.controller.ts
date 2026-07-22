import { Body, Controller, Post } from '@nestjs/common';
import { SyncUserInput, UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post('sync')
  sync(@Body() input: SyncUserInput) {
    return this.users.sync(input);
  }
}
